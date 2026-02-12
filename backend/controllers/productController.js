// ────────────────────────────────────────────────
// 📁 backend/controllers/productController.js
// التحكم في المنتجات في نظام طلبية (Talabia)
// نسخة إنتاجية تراعي منطق تعدد البائعين وفصل الصلاحيات
// ────────────────────────────────────────────────

import asyncHandler from "express-async-handler";
import Product from "../models/Product.js";
import Store from "../models/Store.js";

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
export const getProducts = asyncHandler(async (req, res) => {
  const role = req.user?.role || null;
  const { category, page, limit } = req.query;

  let filter;

  if (role === "admin") {
    // الأدمن يمكن أن يرى كل المنتجات
    filter = {};
  } else {
    // الواجهة العامة (الصفحة الرئيسية / المشتري / الزائر):
    // نعتبر المنتج نشطاً إذا:
    //  - isActive === true
    //  أو
    //  - لا يوجد isActive لكن status ليست "inactive"
    filter = {
      $or: [
        { isActive: true },
        {
          $and: [
            {
              $or: [{ isActive: { $exists: false } }, { isActive: null }],
            },
            {
              $or: [
                { status: { $exists: false } },
                { status: { $ne: "inactive" } },
              ],
            },
          ],
        },
      ],
    };
  }

  if (category) {
    filter = { ...filter, category };
  }

  // ✅ لغير الأدمن: استثناء المنتجات المحجوبة من الإدارة
  if (role !== "admin") {
    filter = {
      ...filter,
      adminLocked: { $ne: true },
    };
  }

  const pageNum = page ? Math.max(parseInt(page, 10) || 1, 1) : 1;
  const limitNum = limit ? Math.max(parseInt(limit, 10) || 0, 0) : 0;

  let query = Product.find(filter)
    .populate("store", "name status visibility")
    .sort({ createdAt: -1 });

  if (limitNum > 0) {
    query = query.skip((pageNum - 1) * limitNum).limit(limitNum);
  }

  const products = await query.exec();

  // 🔍 فلترة إضافية على المتجر لغير الأدمن:
  // - status يجب أن يكون approved (إن وُجد)
  // - visibility لا تكون hidden (أو غير موجودة تُعتبر visible)
  let finalProducts = products;

  if (role !== "admin") {
    finalProducts = products.filter((p) => {
      const store = p.store;
      if (!store) return false;

      const statusOk = !store.status || store.status === "approved";
      const visibilityOk = !store.visibility || store.visibility !== "hidden";

      return statusOk && visibilityOk;
    });
  }

  // نعيد Array كما تتوقع الواجهة الأمامية (Home.jsx)
  res.json(finalProducts);
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
    .populate("category", "name slug");

  if (!product) {
    res.status(404);
    throw new Error("المنتج غير موجود.");
  }

  const role = req.user?.role || null;

  // إذا لم يكن المستخدم أدمن:
  // - لا نسمح بعرض منتج محجوب من الإدارة
  // - ولا منتج غير نشط
  if (role !== "admin") {
    const isActiveOk =
      product.isActive === true ||
      (!product.isActive &&
        (!product.status || product.status !== "inactive"));

    const notLocked = !product.adminLocked;

    const store = product.store;
    const storeStatusOk = !store?.status || store.status === "approved";
    const storeVisibilityOk =
      !store?.visibility || store.visibility !== "hidden";

    if (!isActiveOk || !notLocked || !storeStatusOk || !storeVisibilityOk) {
      res.status(404);
      throw new Error("المنتج غير متاح للعرض.");
    }
  }

  res.json(product);
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
    returnPolicy,
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

  // 🔒 تطبيع حالة المنتج لضمان تطابق status مع isActive
  const normalizedStatus = status === "inactive" ? "inactive" : "active";
  const isActive = normalizedStatus === "active";

  // تطبيع الصور لتوافق مخطط Product (images: [{ url, alt }])
  const normalizedImages = normalizeImages(images);

  const product = new Product({
    store: storeId,
    seller: userId,
    name,
    description,
    price,
    stock,
    category: finalCategory,
    images: normalizedImages,
    unitLabel,
    brand,
    variants,
    status: normalizedStatus,
    returnPolicy,
    isActive,
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
    returnPolicy,
  } = req.body;

  // ✅ منع البائع من تغيير حالة منتج محجوب من الإدارة
  if (!isAdmin && product.adminLocked && status !== undefined) {
    res.status(403);
    throw new Error(
      "لا يمكنك تغيير حالة هذا المنتج لأنه موقوف من الإدارة. تواصل مع الإدارة للمراجعة."
    );
  }

  if (name !== undefined) {
    product.name = name;
  }

  if (description !== undefined) {
    product.description = description;
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
    product.returnPolicy = returnPolicy;
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
    product.status = normalizedStatus;
    product.isActive = normalizedStatus === "active";

    // إذا كان من يغيّر هو الأدمن فقط، نحدّث adminLocked
    if (isAdmin) {
      product.adminLocked = normalizedStatus === "inactive";
    }
  }

  const updated = await product.save();
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

  product.status = normalizedStatus;
  product.isActive = normalizedStatus === "active";

  // ✅ إذا كان من يغيّر هو الأدمن، نضبط adminLocked
  if (isAdmin) {
    product.adminLocked = normalizedStatus === "inactive";
  }

  const updated = await product.save();
  res.json(updated);
});
