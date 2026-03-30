// ────────────────────────────────────────────────
// 📁 backend/controllers/productController.js
// التحكم في المنتجات في نظام طلبية (Talabia)
// نسخة إنتاجية تراعي منطق تعدد البائعين وفصل الصلاحيات
// ────────────────────────────────────────────────

import asyncHandler from "express-async-handler";
import Product from "../models/Product.js";
import Store from "../models/Store.js";
import Category from "../models/Category.js";
import SystemSettings from "../models/SystemSettings.js";
import { getOrSetCache, invalidateCache } from "../utils/recommendationCache.js";
import { sanitizeHTML, sanitizeText } from "../utils/sanitize.js";

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ✅ تحديد مسار uploads بشكل ثابت وآمن (بدون الاعتماد على process.cwd)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// backend/controllers -> .. = backend -> uploads
const uploadsDir = path.join(__dirname, "..", "uploads");

// ✅ حذف صور المنتج المحلية بشكل آمن (بدون Path Traversal)
// - لا نحذف إلا الصور التي تبدأ بـ /uploads/products/
// - نحذف فقط الملفات التي تم “إزالتها” فعلاً عند التحديث
function safeDeleteLocalProductImages(imageUrls) {
  try {
    const urls = Array.isArray(imageUrls) ? imageUrls : [];
    const prefix = "/uploads/products/";

    for (const url of urls) {
      if (!url || typeof url !== "string") continue;

      // نحذف فقط المسارات المحلية داخل uploads/products
      if (!url.startsWith(prefix)) continue;

      // يمنع ../ أو أي محاولة Path Traversal
      const filename = path.basename(url);
      if (!filename) continue;

      const filePath = path.join(uploadsDir, "products", filename);

      fs.unlink(filePath, (err) => {
        // لا نكسر العملية لو الملف غير موجود
        if (err && err.code !== "ENOENT") {
          console.warn(
            "[PRODUCTS] Failed to delete product image:",
            err.message
          );
        }
      });
    }
  } catch (e) {
    // تجاهل أي خطأ غير متوقع لتفادي كسر الطلب
  }
}

// 🧩 دالة مساعدة لتحويل قيم images القادمة من الواجهة
// إلى الصيغة المتوقعة في الـ Schema (مثلاً: { url, alt })
function normalizeImages(images) {
  if (!Array.isArray(images)) return [];

  return images
    .map((img) => {
      if (!img) return null;

      // نص بسيط يمثل المسار أو الرابط
      if (typeof img === "string") {
        return { url: img };
      }

      // كائن يحتوي على حقل url أو path
      if (typeof img === "object") {
        if (img.url) {
          return {
            url: img.url,
            alt: img.alt || "",
            public_id: img.public_id || img.publicId || undefined,
          };
        }

        if (img.path) {
          return {
            url: img.path,
            alt: img.alt || "",
            public_id: img.public_id || img.publicId || undefined,
          };
        }
      }

      return null;
    })
    .filter(Boolean);
}

// 🧩 استخراج معرف المستخدم من الطلب
function getUserIdFromReq(req) {
  const raw = req.user?._id || req.user?.id;
  return raw ? raw.toString() : null;
}

// ────────────────────────────────────────────────
// 📦 جلب جميع المنتجات
// - للزائر/المشتري: يعيد المنتجات النشطة فقط وغير المحجوبة إداريًا
// - للأدمن: يمكنه رؤية كل المنتجات
// يدعم:
//   - ?category=... لتصفية المنتجات حسب التصنيف
//   - ?page=1&limit=20 اختيارياً (مع الاستمرار في إعادة Array فقط)
// ────────────────────────────────────────────────
// ────────────────────────────────────────────────
// 📦 جلب جميع المنتجات (محدث بنظام البحث الجديد)
// ────────────────────────────────────────────────
import { searchProducts } from "../services/searchService.js";

export const getProducts = asyncHandler(async (req, res) => {
  const role = req.user?.role || null;
  const { category, page, limit, search, sort } = req.query;

  // 1. إذا كان الأدمن، نستخدم المنطق القديم المباشر (لأن الأدمن يحتاج رؤية كل شيء، حتى غير النشط)
  // أو يمكننا تحديث الـ Service ليدعم الأدمن، لكن للسرعة والأمان نفصلهم حالياً.
  if (role === "admin") {
    // ... (سنبقي المنطق القديم للأدمن هنا أو نعيد كتابة جزء مبسط)
    // للأسف، دالة replace_file_content تستبدل النص بالكامل.
    // لذا سأعيد كتابة المنطق القديم للأدمن هنا باختصار، واستخدم السيرفس الجديد للعامة.

    let matchQuery = {};
    if (category && category !== "all") matchQuery.category = category;
    if (search && search.trim().length > 0) {
      const searchRegex = { $regex: search.trim(), $options: "i" };
      matchQuery.$or = [{ name: searchRegex }, { description: searchRegex }];
    }

    const products = await Product.find(matchQuery)
      .populate("store", "name status visibility")
      .sort({ createdAt: -1 })
      .limit(parseInt(limit) || 20);

    return res.json(products);
  }

  // 2. للعامة والمشترين والبائعين: نستخدم محرك البحث الذكي الجديد
  try {
    const products = await searchProducts({
      query: search,
      category,
      sort,
      limit: parseInt(limit) || 20,
      skip: 0
    });

    // إضافة لقطة إحصائية (اختياري)
    // console.log(`Search: "${search}" -> Found ${products.length} items`);

    res.json(products);
  } catch (error) {
    res.status(500);
    throw new Error("حدث خطأ أثناء البحث.");
  }
});


// ────────────────────────────────────────────────
// 🛍️ جلب منتج واحد بالتعرّف
// متاح للجميع (يُستخدم في صفحة تفاصيل المنتج)
// مع احترام منطق الحجب الإداري في الواجهات العامة
// ────────────────────────────────────────────────
export const getProductById = asyncHandler(async (req, res) => {
  // ✅ الحل النهائي لمشكلة ظهور ObjectId في breadcrumb:
  // نُرجع category ككائن (name/slug) بدل أن يرجع كنص ObjectId
  const product = await Product.findById(req.params.id)
    .populate("store", "name status visibility")
    .populate("category", "name slug")
    .populate("seller", "isActive");

  if (!product) {
    res.status(404);
    throw new Error("المنتج غير موجود.");
  }

  const role = req.user?.role || null;

  // إذا لم يكن المستخدم أدمن:
  // - نسمح لمالك المنتج (البائع) بمشاهدته دائماً للتعديل
  // - أما لغير المالك (المشترين):
  //    - لا نسمح بعرض منتج محجوب من الإدارة
  //    - ولا منتج غير نشط
  //    - ولا منتج تابع لبائع موقوف
  if (role !== "admin") {
    const userId = getUserIdFromReq(req);
    const isOwner =
      userId && product.seller && (product.seller._id || product.seller).toString() === userId;

    if (!isOwner) {
      const isActiveOk =
        product.isActive === true ||
        (!product.isActive &&
          (!product.status || product.status !== "inactive"));

      const notLocked = !product.adminLocked;

      const store = product.store;
      const storeStatusOk = !store?.status || store.status === "approved";
      const storeVisibilityOk =
        !store?.visibility || store.visibility !== "hidden";

      // 🔐 التحقق من حالة البائع
      const sellerActiveOk = product.seller?.isActive !== false;

      if (!isActiveOk || !notLocked || !storeStatusOk || !storeVisibilityOk || !sellerActiveOk) {
        res.status(404);
        throw new Error("المنتج غير متاح للعرض.");
      }

      // ✅ زيادة عداد المشاهدات (للمشترين فقط وليس البائع أو الأدمن)
      await Product.updateOne({ _id: req.params.id }, { $inc: { viewsCount: 1 } });
    }
  }

  res.json(product);
});

// ────────────────────────────────────────────────
// 🛒 تتبع الإضافة للسلة (Track Cart Addition)
// POST /api/products/:id/track-cart
// ────────────────────────────────────────────────
export const trackCartAddition = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error("المنتج غير موجود.");
  }

  await Product.updateOne({ _id: req.params.id }, { $inc: { addToCartCount: 1 } });

  res.json({ message: "تم تسجيل الإضافة للسلة بنجاح." });
});

// ────────────────────────────────────────────────
// ➕ إنشاء منتج جديد (يُستدعى من لوحة البائع)
// POST /api/products
// ────────────────────────────────────────────────
export const createProduct = asyncHandler(async (req, res) => {
  const {
    name,
    description,
    price,
    stock,
    category,
    categoryId,
    images,
    unitLabel,
    brand,
    variants,
    status,
    returnPolicy, lowStockThreshold,
  } = req.body;

  const userId = getUserIdFromReq(req);

  if (!userId) {
    res.status(401);
    throw new Error("غير مصرح: يجب تسجيل الدخول أولاً.");
  }

  if (!name || !name.trim()) {
    res.status(400);
    throw new Error("اسم المنتج مطلوب.");
  }

  if (price == null || Number.isNaN(Number(price))) {
    res.status(400);
    throw new Error("السعر غير صالح.");
  }

  if (stock == null || Number.isNaN(Number(stock))) {
    res.status(400);
    throw new Error("المخزون غير صالح.");
  }

  const finalCategory = category || categoryId;
  if (!finalCategory) {
    res.status(400);
    throw new Error("التصنيف مطلوب.");
  }

  // محاولة استخدام store من المستخدم إن وُجد
  let storeId = req.user?.store || null;

  if (!storeId) {
    // البحث عن متجر مرتبط بهذا المستخدم
    const storeDoc =
      (await Store.findOne({ owner: userId })) ||
      (await Store.findOne({ seller: userId }));

    if (!storeDoc) {
      res.status(400);
      throw new Error("لا يمكن إنشاء منتج قبل إنشاء المتجر وربطه بالبائع.");
    }

    storeId = storeDoc._id;
  }

  // 🔒 تطبيق نظام الحماية: منع تفعيل المنتج إذا كان المخزون صفر
  const normalizedStatus = status === "inactive" ? "inactive" : "active";
  const isActive = normalizedStatus === "active";

  if (isActive && (stock == null || Number(stock) <= 0)) {
    res.status(400);
    throw new Error("نفدت الكمية، تم التعطيل آلياً. لتنشيط المنتج مجدداً يرجى تحديث المخزون أولاً.");
  }

  // تطبيع الصور لتوافق مخطط Product (images: [{ url, alt }])
  const normalizedImages = normalizeImages(images);

  const product = new Product({
    store: storeId,
    seller: userId,
    name: sanitizeText(name),
    description: sanitizeHTML(description),
    price,
    stock,
    category: finalCategory,
    images: normalizedImages,
    unitLabel,
    brand,
    variants,
    status: normalizedStatus,
    returnPolicy: sanitizeHTML(returnPolicy),
    isActive,
    lowStockThreshold: Number(lowStockThreshold) || 2, // القيمة الافتراضية
    adminLocked: false, // عند الإنشاء لا يكون محجوباً من الإدارة
  });

  const created = await product.save();
  res.status(201).json(created);
});

// ────────────────────────────────────────────────
// ✏️ تحديث منتج (بيانات عامة)
// PUT /api/products/:id
// يُسمح للبائع مالك المنتج أو للأدمن
// + حذف الصور التي لم تعد مستخدمة لمنع تراكم الملفات
// ────────────────────────────────────────────────
export const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error("المنتج غير موجود.");
  }

  const userId = getUserIdFromReq(req);
  const role = req.user?.role;

  const isAdmin = role === "admin";
  const isOwner =
    userId && product.seller && product.seller.toString() === userId;

  if (!isAdmin && !isOwner) {
    res.status(403);
    throw new Error("غير مصرح لك بتحديث هذا المنتج.");
  }

  const {
    name,
    description,
    price,
    stock,
    category,
    categoryId,
    images,
    unitLabel,
    brand,
    variants,
    status,
    returnPolicy, lowStockThreshold,
  } = req.body;

  // ✅ منع البائع من تغيير حالة منتج محجوب من الإدارة
  if (!isAdmin && product.adminLocked && status !== undefined) {
    res.status(403);
    throw new Error(
      "لا يمكنك تغيير حالة هذا المنتج لأنه موقوف من الإدارة. تواصل مع الإدارة للمراجعة."
    );
  }

  if (name !== undefined) {
    product.name = sanitizeText(name);
  }

  if (description !== undefined) {
    product.description = sanitizeHTML(description);
  }

  if (price !== undefined) {
    if (Number.isNaN(Number(price))) {
      res.status(400);
      throw new Error("السعر غير صالح.");
    }
    product.price = price;
  }

  if (stock !== undefined) {
    if (Number.isNaN(Number(stock))) {
      res.status(400);
      throw new Error("المخزون غير صالح.");
    }
    product.stock = stock;

    // ✅ إعادة ضبط علم التنبيه إذا أصبح المخزون كافياً بعد التحديث
    if (product.stock > product.lowStockThreshold) {
      product.lowStockNotified = false;
    }
  }

  const finalCategory = category || categoryId;
  if (finalCategory) {
    product.category = finalCategory;
  }

  if (unitLabel !== undefined) {
    product.unitLabel = unitLabel;
  }

  if (brand !== undefined) {
    product.brand = brand;
  }

  if (variants !== undefined) {
    product.variants = variants;
  }

  if (returnPolicy !== undefined) {
    product.returnPolicy = sanitizeHTML(returnPolicy);
  }

  if (lowStockThreshold !== undefined) {
    product.lowStockThreshold = Number(lowStockThreshold);
  }

  // ✅ صور المنتج: احذف الصور التي تمت إزالتها فعلياً من المنتج
  if (images !== undefined) {
    const oldUrls = Array.isArray(product.images)
      ? product.images.map((x) => x?.url).filter(Boolean)
      : [];

    const normalized = normalizeImages(images);
    const newUrls = normalized.map((x) => x?.url).filter(Boolean);

    // الصور المحذوفة = القديمة - الجديدة
    const removed = oldUrls.filter((u) => !newUrls.includes(u));

    // نحدّث DB أولاً
    product.images = normalized;

    // ثم نحذف الملفات غير المستخدمة (داخل uploads/products فقط)
    if (removed.length > 0) {
      safeDeleteLocalProductImages(removed);
    }
  }

  // ✅ توحيد منطق status + isActive
  if (status !== undefined) {
    const normalizedStatus = status === "inactive" ? "inactive" : "active";
    const newIsActive = normalizedStatus === "active";

    // 🔒 حماية: منع التفعيل اليدوي إذا كان المخزون صفر
    if (newIsActive && (product.stock <= 0 && (stock === undefined || Number(stock) <= 0))) {
      res.status(400);
      throw new Error("نفدت الكمية، تم التعطيل آلياً. لتنشيط المنتج مجدداً يرجى تحديث المخزون أولاً.");
    }

    product.status = normalizedStatus;
    product.isActive = newIsActive;
    // ✅ أي تدخل يدوي في الحالة يُلغي علم "التعطيل التلقائي"
    product.autoDeactivated = false;

    // إذا أصبح المخزون كافيًا، يمكننا إعادة ضبط علم التنبيه أيضًا
    if (product.isActive && product.stock > product.lowStockThreshold) {
      product.lowStockNotified = false;
    }

    // إذا كان من يغيّر هو الأدمن فقط، نحدّث adminLocked
    if (isAdmin) {
      product.adminLocked = normalizedStatus === "inactive";
    }
  }

  const updated = await product.save();
  invalidateCache(req.params.id);
  res.json(updated);
});

// ────────────────────────────────────────────────
// 🗑️ حذف منتج
// DELETE /api/products/:id
// يُسمح للبائع مالك المنتج أو للأدمن
// + حذف صور المنتج من السيرفر لتجنب تراكم الملفات
// ────────────────────────────────────────────────
export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error("المنتج غير موجود.");
  }

  const userId = getUserIdFromReq(req);
  const role = req.user?.role;

  const isAdmin = role === "admin";
  const isOwner =
    userId && product.seller && product.seller.toString() === userId;

  if (!isAdmin && !isOwner) {
    res.status(403);
    throw new Error("غير مصرح لك بحذف هذا المنتج.");
  }

  // ✅ حذف جميع صور المنتج من السيرفر (ضمن uploads/products فقط)
  const urlsToDelete = Array.isArray(product.images)
    ? product.images.map((x) => x?.url).filter(Boolean)
    : [];

  if (urlsToDelete.length > 0) {
    safeDeleteLocalProductImages(urlsToDelete);
  }

  await product.deleteOne();
  invalidateCache(req.params.id);
  res.json({ message: "تم حذف المنتج بنجاح." });
});

// ────────────────────────────────────────────────
// 🔁 تحديث حالة المنتج (نشط / غير نشط)
// PATCH /api/products/:id/status
// يُسمح للبائع مالك المنتج أو للأدمن
// مع توحيد status و isActive
// مع احترام adminLocked (حجب من الإدارة)
// ────────────────────────────────────────────────
export const updateProductStatus = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error("المنتج غير موجود");
  }

  const userId = getUserIdFromReq(req);
  const role = req.user?.role;

  const isAdmin = role === "admin";
  const isOwner =
    userId && product.seller && product.seller.toString() === userId;

  if (!isAdmin && !isOwner) {
    res.status(403);
    throw new Error("غير مصرح لك بتحديث حالة هذا المنتج.");
  }

  // ✅ إذا كان المنتج مقفولاً إداريًا، يمنع البائع من أي تغيير في الحالة
  if (!isAdmin && product.adminLocked) {
    res.status(403);
    throw new Error(
      "لا يمكنك تغيير حالة هذا المنتج لأنه موقوف من الإدارة. تواصل مع الإدارة للمراجعة."
    );
  }

  const { status } = req.body;

  if (typeof status !== "string") {
    res.status(400);
    throw new Error("حالة المنتج غير صالحة.");
  }

  // نفس منطق التطبيع المستخدم في createProduct
  const normalizedStatus = status === "inactive" ? "inactive" : "active";

  // 🔒 حماية: منع التفعيل اليدوي إذا كان المخزون صفر
  if (normalizedStatus === "active" && product.stock <= 0) {
    res.status(400);
    throw new Error("نفدت الكمية، تم التعطيل آلياً. لتنشيط المنتج مجدداً يرجى تحديث المخزون أولاً.");
  }

  product.status = normalizedStatus;
  product.isActive = normalizedStatus === "active";

  // ✅ أي تدخل يدوي في الحالة يُلغي علم "التعطيل التلقائي" (Auto-Deactivation Reset)
  product.autoDeactivated = false;

  // ✅ إذا كان من يغيّر هو الأدمن، نضبط adminLocked
  if (isAdmin) {
    product.adminLocked = normalizedStatus === "inactive";
  }

  const updated = await product.save();
  res.json(updated);
});

// ────────────────────────────────────────────────
// 🧠 محرك التوصيات المتقدم (Enterprise Recommendation Engine)
// GET /api/products/:id/recommendations
// ────────────────────────────────────────────────
export const getProductRecommendations = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const data = await getOrSetCache(id, async () => {
      const targetProduct = await Product.findById(id).populate("category", "name slug");
      if (!targetProduct) {
        const fallback = await Product.find({ isActive: true, adminLocked: false, stock: { $gt: 0 } }).limit(10).populate("category", "name slug");
        return { similar: fallback, seller: [], trending: [] };
      }

      const weightsConfig = await SystemSettings.findOne({ key: "recommendation_weights" });
      const weights = weightsConfig?.value || {
        matchQuality: 0.4,
        salesPerformance: 0.3,
        vendorRating: 0.2,
        newness: 0.1,
        priceSensitivity: 0.5,
      };

      let candidates = [];
      let levelsTried = 0;

      const getQueryForLevel = (level) => {
        const baseMatch = { _id: { $ne: targetProduct._id }, isActive: true, adminLocked: false, stock: { $gt: 0 } };
        switch (level) {
          case 0: return { ...baseMatch, category: String(targetProduct.category?._id || targetProduct.category), price: { $gte: targetProduct.price * 0.8, $lte: targetProduct.price * 1.2 }, rating: { $gte: 3.5 } };
          case 1: return { ...baseMatch, category: String(targetProduct.category?._id || targetProduct.category), price: { $gte: targetProduct.price * 0.5, $lte: targetProduct.price * 2.0 } };
          default: return baseMatch;
        }
      };

      while (candidates.length < 12 && levelsTried < 3) {
        candidates = await Product.find(getQueryForLevel(levelsTried)).limit(30).populate("category", "name slug").populate("store", "name status");
        levelsTried++;
      }

      const scoredProducts = candidates.map((p) => {
        const priceDiff = Math.abs(p.price - targetProduct.price);
        const priceScore = Math.max(0, 1 - priceDiff / (targetProduct.price || 1));
        const nameMatch = p.name.split(" ").some((w) => targetProduct.name.includes(w)) ? 1 : 0;
        const finalScore = priceScore * weights.priceSensitivity + nameMatch * weights.matchQuality + (p.rating / 5) * weights.vendorRating + Math.min(1, (p.salesCount || 0) / 100) * weights.salesPerformance;
        return { ...p._doc, _recScore: finalScore };
      });

      const sorted = scoredProducts.sort((a, b) => b._recScore - a._recScore);
      const sellerProducts = await Product.find({ store: targetProduct.store, _id: { $ne: targetProduct._id }, isActive: true, adminLocked: false, stock: { $gt: 0 } }).limit(12).populate("category", "name slug");
      const trending = await Product.find({ category: String(targetProduct.category?._id || targetProduct.category), _id: { $ne: targetProduct._id }, isActive: true, adminLocked: false, stock: { $gt: 0 } }).sort({ salesCount: -1 }).limit(12).populate("category", "name slug");

      return { similar: sorted.slice(0, 12), seller: sellerProducts, trending, meta: { levelsUsed: levelsTried, weightsUsed: weights } };
    });

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: "خطأ في محرك التوصيات" });
  }
});
