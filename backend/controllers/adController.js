// backend/controllers/adController.js

import Ad from "../models/Ad.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

/**
 * 🔎 دالة مساعدة للتحقق من أن التاريخ ضمن الفترة المحددة للإعلان
 * نستخدم نفس المنطق لاحقاً في الاستعلامات العامة (الواجهة الأمامية)
 */
const buildDateRangeFilter = () => {
  const now = new Date();

  return {
    $and: [
      {
        $or: [{ startAt: null }, { startAt: { $lte: now } }],
      },
      {
        $or: [{ endAt: null }, { endAt: { $gte: now } }],
      },
    ],
  };
};

/**
 * 🧩 دالة مساعدة لبناء مسار الصورة من req.file.path كما حفظه multer
 *
 * ملاحظة مهمة:
 * - multer يعطي file.path مسارًا كاملاً على الجهاز مثل:
 *   "T:/اصلاح/backend/uploads/ads/xxx.jpg"
 *
 * نحن نريد تخزين مسار نسبي يمكن للفرونت استخدامه مع API_BASE_URL:
 *   "/uploads/ads/xxx.jpg"
 *
 * لذلك:
 * - نحول الباك سلاش إلى سلاش "/"
 * - نبحث عن "/uploads/" ونأخذ كل ما بعده
 * - نضمن أن الناتج يبدأ بـ "/"
 */
const buildImagePathFromFile = (file) => {
  if (!file || !file.path) return "";

  // توحيد مسار الويندوز إلى سلاشات أمامية
  let normalized = file.path.replace(/\\/g, "/");

  // استخراج الجزء الذي يبدأ من "/uploads/"
  const uploadsIndex = normalized.indexOf("/uploads/");
  if (uploadsIndex !== -1) {
    normalized = normalized.substring(uploadsIndex); // يبدأ من "/uploads/..."
  }

  // نتأكد أن يبدأ بـ "/"
  if (!normalized.startsWith("/")) {
    normalized = "/" + normalized;
  }

  return normalized;
};

// ✅ تحديد مسار uploads بشكل ثابت وآمن
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// backend/controllers -> .. = backend -> uploads
const uploadsDir = path.join(__dirname, "..", "uploads");

// ✅ حذف صورة الإعلان بشكل آمن (بدون Path Traversal)
function safeDeleteAdImage(imageUrl) {
  try {
    if (!imageUrl || typeof imageUrl !== "string") return;

    const prefix = "/uploads/ads/";
    if (!imageUrl.startsWith(prefix)) return;

    const filename = path.basename(imageUrl);
    const filePath = path.join(uploadsDir, "ads", filename);

    fs.unlink(filePath, (err) => {
      // لا نكسر العملية لو الملف غير موجود
      if (err && err.code !== "ENOENT") {
        console.warn("[ADS] Failed to delete ad image:", err.message);
      }
    });
  } catch (e) {
    // تجاهل أي خطأ غير متوقع
  }
}

/**
 * 👑 (أدمن) إنشاء إعلان جديد
 */
export const createAd = async (req, res) => {
  try {
    const {
      title,
      subtitle,
      description,
      type,
      placement,
      linkUrl,
      isActive,
      startAt,
      endAt,
      sortOrder,
      image, // في حال أرسلنا مسار الصورة نصاً من الواجهة
    } = req.body;

    if (!title || !placement) {
      return res.status(400).json({
        success: false,
        message: "العنوان ومكان الظهور (placement) حقول مطلوبة.",
      });
    }

    // 🔁 أولاً نحاول استخدام الصورة المرسلة نصاً (لو وجدت)
    let imagePath = image || "";

    // ✅ لو تم الرفع عبر multer نستخدم المسار الفعلي من req.file.path
    if (req.file) {
      imagePath = buildImagePathFromFile(req.file);
    }

    if (!imagePath) {
      return res.status(400).json({
        success: false,
        message: "صورة الإعلان مطلوبة.",
      });
    }

    // 👁‍🗨 تحويل بعض الحقول القادمة من form-data من نص إلى أنواع صحيحة
    let parsedIsActive = true;
    if (typeof isActive === "string") {
      parsedIsActive = isActive === "true";
    } else if (typeof isActive === "boolean") {
      parsedIsActive = isActive;
    }

    let parsedSortOrder = 0;
    if (typeof sortOrder === "string") {
      const n = Number(sortOrder);
      parsedSortOrder = Number.isNaN(n) ? 0 : n;
    } else if (typeof sortOrder === "number") {
      parsedSortOrder = sortOrder;
    }

    const ad = await Ad.create({
      title,
      subtitle,
      description,
      type,
      placement,
      linkUrl,
      isActive: parsedIsActive,
      startAt: startAt || null,
      endAt: endAt || null,
      sortOrder: parsedSortOrder,
      image: imagePath,
      createdBy: req.user?._id,
      updatedBy: req.user?._id,
    });

    return res.status(201).json({
      success: true,
      data: ad,
    });
  } catch (error) {
    console.error("Error in createAd:", error);
    return res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء إنشاء الإعلان.",
    });
  }
};

/**
 * 👑 (أدمن) جلب الإعلانات مع فلترة وباجينيشن
 */
export const getAdsAdmin = async (req, res) => {
  try {
    const { placement, isActive, search, page = 1, limit = 20 } = req.query;

    const filter = {};

    if (placement) {
      filter.placement = placement;
    }

    if (isActive === "true" || isActive === "false") {
      filter.isActive = isActive === "true";
    }

    if (search) {
      const regex = new RegExp(search, "i");
      filter.$or = [{ title: regex }, { subtitle: regex }, { description: regex }];
    }

    const pageNumber = Number(page) || 1;
    const pageSize = Number(limit) || 20;
    const skip = (pageNumber - 1) * pageSize;

    const [items, total] = await Promise.all([
      Ad.find(filter)
        // ✅ ترتيب واضح: أولاً حسب المكان، ثم sortOrder، ثم الأحدث إنشاءً
        .sort({ placement: 1, sortOrder: 1, createdAt: -1 })
        .skip(skip)
        .limit(pageSize),
      Ad.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: items,
      pagination: {
        total,
        page: pageNumber,
        limit: pageSize,
        pages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error("Error in getAdsAdmin:", error);
    return res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء جلب الإعلانات.",
    });
  }
};

/**
 * 👑 (أدمن) جلب إعلان واحد للتعديل
 */
export const getAdByIdAdmin = async (req, res) => {
  try {
    const ad = await Ad.findById(req.params.id);

    if (!ad) {
      return res.status(404).json({
        success: false,
        message: "لم يتم العثور على الإعلان.",
      });
    }

    return res.json({
      success: true,
      data: ad,
    });
  } catch (error) {
    console.error("Error in getAdByIdAdmin:", error);
    return res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء جلب الإعلان.",
    });
  }
};

/**
 * 👑 (أدمن) تحديث إعلان
 */
export const updateAd = async (req, res) => {
  try {
    const {
      title,
      subtitle,
      description,
      type,
      placement,
      linkUrl,
      isActive,
      startAt,
      endAt,
      sortOrder,
      image,
    } = req.body;

    const ad = await Ad.findById(req.params.id);

    if (!ad) {
      return res.status(404).json({
        success: false,
        message: "لم يتم العثور على الإعلان.",
      });
    }

    if (title !== undefined) ad.title = title;
    if (subtitle !== undefined) ad.subtitle = subtitle;
    if (description !== undefined) ad.description = description;
    if (type !== undefined) ad.type = type;
    if (placement !== undefined) ad.placement = placement;
    if (linkUrl !== undefined) ad.linkUrl = linkUrl;

    if (isActive !== undefined) {
      if (typeof isActive === "string") {
        ad.isActive = isActive === "true";
      } else if (typeof isActive === "boolean") {
        ad.isActive = isActive;
      }
    }

    if (startAt !== undefined) ad.startAt = startAt || null;
    if (endAt !== undefined) ad.endAt = endAt || null;

    if (sortOrder !== undefined) {
      if (typeof sortOrder === "string") {
        const n = Number(sortOrder);
        ad.sortOrder = Number.isNaN(n) ? ad.sortOrder : n;
      } else if (typeof sortOrder === "number") {
        ad.sortOrder = sortOrder;
      }
    }

    // ✅ تحديث الصورة لو تم رفع جديدة أو إرجاع مسار جديد
    // مع حذف الصورة القديمة بشكل آمن لتجنب تراكم الملفات
    if (req.file) {
      const oldImage = ad.image;
      ad.image = buildImagePathFromFile(req.file);

      if (oldImage && oldImage !== ad.image) {
        safeDeleteAdImage(oldImage);
      }
    } else if (image !== undefined) {
      // لو تغيّر مسار الصورة نصًا، حاول حذف القديمة فقط إذا كانت من uploads/ads
      const oldImage = ad.image;
      ad.image = image;

      if (oldImage && oldImage !== ad.image) {
        safeDeleteAdImage(oldImage);
      }
    }

    ad.updatedBy = req.user?._id;

    await ad.save();

    return res.json({
      success: true,
      data: ad,
    });
  } catch (error) {
    console.error("Error in updateAd:", error);
    return res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء تحديث الإعلان.",
    });
  }
};

/**
 * 👑 (أدمن) حذف إعلان
 */
export const deleteAd = async (req, res) => {
  try {
    const ad = await Ad.findById(req.params.id);

    if (!ad) {
      return res.status(404).json({
        success: false,
        message: "لم يتم العثور على الإعلان.",
      });
    }

    // ✅ حذف صورة الإعلان من السيرفر قبل حذف السجل
    if (ad.image) {
      safeDeleteAdImage(ad.image);
    }

    await ad.deleteOne();

    return res.json({
      success: true,
      message: "تم حذف الإعلان بنجاح.",
    });
  } catch (error) {
    console.error("Error in deleteAd:", error);
    return res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء حذف الإعلان.",
    });
  }
};

/**
 * 👑 (أدمن) تفعيل/تعطيل إعلان
 */
export const toggleAdStatus = async (req, res) => {
  try {
    const ad = await Ad.findById(req.params.id);

    if (!ad) {
      return res.status(404).json({
        success: false,
        message: "لم يتم العثور على الإعلان.",
      });
    }

    ad.isActive = !ad.isActive;
    ad.updatedBy = req.user?._id;

    await ad.save();

    return res.json({
      success: true,
      data: ad,
    });
  } catch (error) {
    console.error("Error in toggleAdStatus:", error);
    return res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء تحديث حالة الإعلان.",
    });
  }
};

/**
 * 👑 (أدمن) إعادة ترتيب الإعلانات داخل نفس الـ placement
 * body: { placement: "home_main_banner", orderedIds: [id1, id2, ...] }
 */
export const reorderAds = async (req, res) => {
  try {
    const { placement, orderedIds } = req.body;

    if (!placement || !Array.isArray(orderedIds) || orderedIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "الرجاء إرسال placement ومصفوفة orderedIds غير فارغة.",
      });
    }

    // 📌 نجلب كل الإعلانات في هذا الـ placement
    const adsInPlacement = await Ad.find({ placement }).sort({
      sortOrder: 1,
      createdAt: -1,
    });

    // نرتّبها في الذاكرة بناءً على orderedIds الواردة من الواجهة
    const idToAdMap = new Map(adsInPlacement.map((ad) => [String(ad._id), ad]));
    const orderedIdsSet = new Set(orderedIds.map(String));

    const finalOrder = [];

    // أولاً: الإعلانات التي جاءت في orderedIds (حسب ترتيبها الجديد)
    for (const id of orderedIds) {
      const ad = idToAdMap.get(String(id));
      if (ad) {
        finalOrder.push(ad);
      }
    }

    // ثانياً: أي إعلان آخر في نفس الـ placement لم يظهر في orderedIds نضعه في النهاية
    for (const ad of adsInPlacement) {
      const idStr = String(ad._id);
      if (!orderedIdsSet.has(idStr)) {
        finalOrder.push(ad);
      }
    }

    // 👇 نبني أوامر bulkWrite لتحديث sortOrder حسب الترتيب الجديد
    const bulkOps = finalOrder.map((ad, index) => ({
      updateOne: {
        filter: { _id: ad._id },
        update: { sortOrder: index + 1 }, // نستخدم 1..N بدلاً من 0..N-1
      },
    }));

    if (bulkOps.length > 0) {
      await Ad.bulkWrite(bulkOps);
    }

    const updatedAds = await Ad.find({ placement }).sort({
      sortOrder: 1,
      createdAt: -1,
    });

    return res.json({
      success: true,
      data: updatedAds,
    });
  } catch (error) {
    console.error("Error in reorderAds:", error);
    return res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء إعادة ترتيب الإعلانات.",
    });
  }
};

/**
 * 🌍 (واجهة أمامية) جلب الإعلانات الفعّالة فقط
 * مع فلترة بالتاريخ + المكان
 * Query: ?placement=home_main_banner&limit=5
 */
export const getActiveAdsPublic = async (req, res) => {
  try {
    const { placement, limit = 10 } = req.query;

    const filter = {
      isActive: true,
      ...buildDateRangeFilter(),
    };

    if (placement) {
      filter.placement = placement;
    }

    const pageSize = Number(limit) || 10;

    const ads = await Ad.find(filter)
      .sort({ sortOrder: 1, createdAt: -1 })
      .limit(pageSize);

    return res.json({
      success: true,
      data: ads,
    });
  } catch (error) {
    console.error("Error in getActiveAdsPublic:", error);
    return res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء جلب الإعلانات الفعّالة.",
    });
  }
};
