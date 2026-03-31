// ────────────────────────────────────────────────
// 📁 backend/services/searchService.js
// خدمة البحث المتقدمة (Core Search Engine Logic)
// ────────────────────────────────────────────────

import Product from "../models/Product.js";
import Synonym from "../models/Synonym.js";
import { prepareSearchQuery, processText } from "../utils/textProcessor.js";

// ────────────────────────────────────────────────
// ⚡ Cache Layer for Synonyms
// ────────────────────────────────────────────────
const synonymCache = new Map();

/**
 * تحديث واجهة المرادفات في الذاكرة
 * يتم استدعاء هذه الدالة عند بدء التشغيل وعند كل تحديث للمرادفات
 */
export async function reloadSynonyms() {
    try {
        const allSynonyms = await Synonym.find({ isActive: true }).lean();
        synonymCache.clear();

        allSynonyms.forEach(doc => {
            const terms = [doc.term, ...doc.synonyms];
            terms.forEach(term => {
                const others = terms.filter(t => t !== term);
                if (others.length > 0) {
                    if (!synonymCache.has(term)) {
                        synonymCache.set(term, new Set());
                    }
                    others.forEach(o => synonymCache.get(term).add(o));
                }
            });
        });
        console.log(`✅ Synonym Cache Reloaded: ${allSynonyms.length} groups.`);
    } catch (error) {
        console.error("❌ Failed to reload synonyms:", error);
    }
}

// Initial Load
// لا نستدعيها هنا مباشرة لتجنب مشاكل الـ imports الدائرية أو اتصال القاعدة لم يعمل بعد
// سنستدعيها في الـ server.js أو عند أول طلب، أو نتركها للـ controller

/**
 * جلب المرادفات لكلمة معينة مع دعم التطابق الجزئي (Partial Matching)
 * @param {string} token الكلمة
 * @returns {Promise<string[]>} قائمة المرادفات
 */
async function getSynonymsForToken(token) {
    if (synonymCache.size === 0) {
        await reloadSynonyms();
    }

    const results = new Set();
    const lowerToken = token.toLowerCase();

    for (const key of synonymCache.keys()) {
        const lowerKey = key.toLowerCase();
        // اذا كانت الكلمة المكتوبة جزء من المرادف أو العكس، اسحب كل المرادفات
        if (lowerKey.includes(lowerToken) || lowerToken.includes(lowerKey)) {
            // إضافة الكلمة المرجعية الأساسية
            results.add(key);
            // إضافة كافة المرادفات المرتبطة بها
            Array.from(synonymCache.get(key)).forEach(s => results.add(s));
        }
    }

    return Array.from(results);
}

/**
 * بناء Pipeline البحث المتقدم
 * @param {object} params معايير البحث (query, category, filters, etc.)
 */
export async function buildSearchPipeline({
    query,
    category,
    filters = {},
    sort = "default",
    limit = 20,
    skip = 0
}) {
    const pipeline = [];
    const searchData = prepareSearchQuery(query);

    // 1. مرحلة الفلترة المبدئية (Match Stage)
    // ────────────────────────────────────────────────
    const matchStage = {
        $and: [
            { adminLocked: { $ne: true } },
            { stock: { $gt: 0 } },
            {
                $or: [
                    { isActive: true },
                    {
                        $and: [{ isActive: { $exists: false } }, { status: { $ne: "inactive" } }],
                    },
                ],
            },
            ...Object.keys(filters).map(key => ({ [key]: filters[key] }))
        ]
    };

    if (category && category !== "all") {
        matchStage.$and.push({ category: category });
    }

    // إذا كان هناك بحث نصي
    if (searchData) {
        // A. تجميع كل الكلمات وتوسيعها بالمرادفات
        let allSearchTerms = [...searchData.tokens];

        // جلب المرادفات لكل كلمة مع دعم الجزء من الكلمة (Parallel)
        const synonymPromises = searchData.tokens.map(token => getSynonymsForToken(token));
        const synonymsArray = await Promise.all(synonymPromises);

        // توحيد وإزالة التكرار
        const allExpandedTerms = [...new Set([...allSearchTerms, ...synonymsArray.flat()])];

        // هروب الأحرف الخاصة لبناء Regex آمن
        const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regexStr = allExpandedTerms.map(escapeRegExp).join("|");

        // توليد نسخة مطبعنة (normalized) من المصطلحات لمطابقة search_text المطبعن في DB
        const normalizedTerms = allExpandedTerms.map(t => processText(t).normalized).filter(Boolean);
        const normalizedRegexStr = [...new Set(normalizedTerms)].map(escapeRegExp).join("|");

        // البحث يعتمد على Regex المرن: الاسم والوصف بالنص الأصلي، search_text بالنص المطبعن
        matchStage.$and.push({
            $or: [
                { name: { $regex: regexStr, $options: "i" } },
                { description: { $regex: regexStr, $options: "i" } },
                { search_text: { $regex: normalizedRegexStr, $options: "i" } }
            ]
        });
    }

    pipeline.push({ $match: matchStage });

    // 2. مرحلة الحساب والترتيب الاحترافي (Relevance Scoring Engine)
    // ────────────────────────────────────────────────
    if (searchData) {
        const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        // نعيد توليد Regex للسياق الموسع لضمان كفاءة الكبح
        const allSynonyms = await Promise.all(searchData.tokens.map(t => getSynonymsForToken(t)));
        const allKeywords = [...new Set([...searchData.tokens, ...allSynonyms.flat()])];
        const expandedRegexStr = allKeywords.map(escapeRegExp).join("|");

        // حساب سكور التطابق الثلاثي
        pipeline.push({
            $addFields: {
                // 1. التطابق التام لاسم المنتج مع البحث الفعلي (تمنح أعلى وزن)
                exactTitleMatch: {
                    $cond: [
                        { $regexMatch: { input: "$name", regex: `^${escapeRegExp(searchData.normalized)}$`, options: "i" } },
                        20,
                        0
                    ]
                },
                // 2. تطابق جزئي أو كلي للاسم مع الكلمات المفتاحية والمرادفات
                titleMatch: {
                    $cond: [
                        { $regexMatch: { input: "$name", regex: expandedRegexStr, options: "i" } },
                        10,
                        0
                    ]
                },
                // 3. تطابق الوصف السياقي أو الـ search_text بشكل عام
                regexMatch: {
                    $cond: [
                        { $regexMatch: { input: "$search_text", regex: expandedRegexStr, options: "i" } },
                        5,
                        0
                    ]
                }
            }
        });

        // المعادلة النهائية للبحث الذكي + الأداء التجاري
        pipeline.push({
            $addFields: {
                finalRelevance: {
                    $add: [
                        "$exactTitleMatch",
                        "$titleMatch",
                        "$regexMatch",
                        { $cond: ["$isFeatured", 2, 0] }, // بونص بسيط للمميز
                        // تخفيف تأثير المبيعات والتقييم لكي لا يطغى على صلة البحث
                        { $multiply: [{ $log10: { $add: [{ $ifNull: ["$salesCount", 0] }, 1] } }, 1] },
                        { $multiply: [{ $ifNull: ["$rating", 0] }, 0.5] }
                    ]
                }
            }
        });
    } else {
        // إذا لم يوجد بحث، نعتمد على ترتيب البيزنس فقط
        pipeline.push({
            $addFields: {
                finalRelevance: {
                    $add: [
                        { $cond: ["$isFeatured", 10, 0] },
                        { $multiply: [{ $ifNull: ["$featuredOrder", 0] }, -1] },
                        { $multiply: [{ $log10: { $add: [{ $ifNull: ["$salesCount", 0] }, 1] } }, 2] },
                        { $ifNull: ["$performanceScore", 0] }
                    ] // Note: Removed pending missing values check unless explicitly set
                }
            }
        });
    }

    // 3. الترتيب النهائي (Sorting)
    // ────────────────────────────────────────────────
    let sortStage = {};

    if (sort === "default") {
        // 🚀 الفلسفة الهجينة الذكية:
        // نستخدم وزن الصلة التجاري (Relevance Score) كقلب نابض للصفحة الرئيسية وللبحث معاً
        // يتم حساب الوزن بمراعاة: بونص المميز الضخم + خوارزمية المبيعات اللوغاريتمية + نقطة جودة التاجر
        sortStage = { finalRelevance: -1, createdAt: -1 };
    } else {
        // الترتيبات الأخرى (السعر، الأحدث...)
        // مع الحفاظ على الفرز الثانوي بالصلة
        switch (sort) {
            case "price_asc": sortStage = { price: 1 }; break;
            case "price_desc": sortStage = { price: -1 }; break;
            case "best_selling": sortStage = { salesCount: -1 }; break;
            case "newest": sortStage = { createdAt: -1 }; break;
            case "oldest": sortStage = { createdAt: 1 }; break;
            // 🆕 Fix: Also set sort for featured
            case "featured": sortStage = { isFeatured: -1, featuredOrder: 1, createdAt: -1 }; break;
            default: sortStage = { finalRelevance: -1 };
        }
    }

    pipeline.push({ $sort: sortStage });

    // 4. Pagination & Projection
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limit });

    // تنظيف النتيجة من حقول التصنيف الداخلية
    pipeline.push({
        $project: {
            textScore: 0,
            exactTitleMatch: 0,
            regexMatch: 0,
            titleMatch: 0,
            finalRelevance: 0,
            search_text: 0
        }
    });

    return pipeline;
};

/**
 * تنفيذ البحث
 */
export async function searchProducts(params) {
    const pipeline = await buildSearchPipeline(params);

    // Populate Store Info and Category manually after aggregation
    // or use $lookup inside pipeline. Let's start with basic aggregation 
    // and use populate logic from controller if possible, 
    // but aggregate returns POJOs (Plain Objects).

    pipeline.splice(pipeline.length - 1, 0, {
        $lookup: {
            from: "stores",
            localField: "store",
            foreignField: "_id",
            as: "store_info"
        }
    });
    pipeline.splice(pipeline.length - 1, 0, {
        $unwind: {
            path: "$store_info",
            preserveNullAndEmptyArrays: true
        }
    });

    // جلب بيانات البائع (User) للتأكد من حالة حسابه
    pipeline.splice(pipeline.length - 1, 0, {
        $lookup: {
            from: "users",
            localField: "seller",
            foreignField: "_id",
            as: "seller_info"
        }
    });
    pipeline.splice(pipeline.length - 1, 0, {
        $unwind: {
            path: "$seller_info",
            preserveNullAndEmptyArrays: true
        }
    });

    // فلترة متاجر وبائعين موقوفين
    pipeline.splice(pipeline.length - 1, 0, {
        $match: {
            "store_info.status": { $in: ["approved", null] },
            "store_info.visibility": { $ne: "hidden" },
            "seller_info.isActive": { $ne: false } // حجب منتجات البائع الموقوف
        }
    });

    const products = await Product.aggregate(pipeline);

    if (params.query && products.length === 0) {
        // console.log(`🔍 Search for "${params.query}" returned 0. Pipeline:`, JSON.stringify(pipeline, null, 2));
    }

    // Populate Category (Optional, if needed by frontend)
    await Product.populate(products, { path: "category", select: "name slug image" });

    return products;
};
