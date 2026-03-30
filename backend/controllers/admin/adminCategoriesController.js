// ────────────────────────────────────────────────
// 📁 admin/adminCategoriesController.js
// إدارة الأقسام (Categories)
// ────────────────────────────────────────────────

import asyncHandler from "express-async-handler";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Category from "../../models/Category.js";
import Product from "../../models/Product.js";
import { normalizeCommissionRate } from "./adminHelpers.js";
import { sanitizeHTML, sanitizeText } from "../../utils/sanitize.js";

// ✅ تحديد مسار uploads بشكل ثابت وآمن (بدون الاعتماد على process.cwd)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// backend/controllers/admin -> ../.. = backend -> uploads
const uploadsDir = path.join(__dirname, "..", "..", "uploads");

// ✅ حذف صورة القسم بشكل آمن (بدون Path Traversal)
function safeDeleteCategoryImage(imageUrl) {
  try {
    if (!imageUrl || typeof imageUrl !== "string") return;

    // يجب أن تكون من مسار الأقسام فقط
    // مثال: /uploads/categories/abc.jpg
    const prefix = "/uploads/categories/";
    if (!imageUrl.startsWith(prefix)) return;

    // نأخذ اسم الملف فقط (يحبط أي محاولة ../)
    const filename = path.basename(imageUrl);

    // نبني المسار داخل uploads/categories فقط
    const filePath = path.join(uploadsDir, "categories", filename);

    fs.unlink(filePath, (err) => {
      // لا نكسر العملية لو الملف غير موجود أو فشل الحذف
      // لكن نطبع تحذيرًا بسيطًا (يمكن إزالة console.warn لو رغبت)
      if (err && err.code !== "ENOENT") {
        console.warn("[CATEGORIES] Failed to delete old category image:", err.message);
      }
    });
  } catch (e) {
    // تجاهل أي خطأ غير متوقع لتفادي كسر الطلب
  }
}

// GET /api/admin/categories
// GET /api/admin/categories
export const getAdminCategories = asyncHandler(async (req, res) => {
  // 🧹 1. تنظيف التكرار وضمان وجود قسم "الكل" واحد فقط
  const allCategories = await Category.find({
    $or: [{ slug: 'all' }, { name: 'الكل' }]
  }).sort({ createdAt: 1 });

  let finalAllCategory = null;

  if (allCategories.length > 0) {
    // نفضل الذي لديه slug='all'
    finalAllCategory = allCategories.find(c => c.slug === 'all');

    if (!finalAllCategory) {
      // نأخذ الأول ونعتمده
      finalAllCategory = allCategories[0];
      finalAllCategory.slug = 'all';
      finalAllCategory.isProtected = true;
      finalAllCategory.sortOrder = -999;
      finalAllCategory.isActive = true;
      await finalAllCategory.save();
    } else {
      // تأكد من خصائص الحماية
      let needSave = false;
      if (!finalAllCategory.isProtected) { finalAllCategory.isProtected = true; needSave = true; }
      if (finalAllCategory.sortOrder !== -999) { finalAllCategory.sortOrder = -999; needSave = true; }
      if (!finalAllCategory.isActive) { finalAllCategory.isActive = true; needSave = true; }
      if (needSave) await finalAllCategory.save();
    }

    // معالجة المكررين
    const duplicates = allCategories.filter(c => c._id.toString() !== finalAllCategory._id.toString());
    for (const dup of duplicates) {
      const count = await Product.countDocuments({ category: dup._id });
      if (count > 0) {
        // إذا كان مرتبطاً بمنتجات، نغير اسمه فقط لتمييزه
        dup.name = `${dup.name} (قديم ${Date.now().toString().slice(-4)})`;
        dup.slug = `old-all-${dup._id}`;
        dup.isProtected = false;
        await dup.save();
      } else {
        // حذف إن لم يكن مرتبطاً
        await dup.deleteOne();
      }
    }
  } else {
    // إنشاء جديد
    await Category.create({
      name: 'الكل',
      slug: 'all',
      sortOrder: -999,
      isProtected: true,
      isActive: true, // إجباري
      commissionRate: 0,
      description: 'القسم الرئيسي لجميع المنتجات'
    });
  }

  // 2. جلب القائمة النهائية
  const categories = await Category.find().sort({ sortOrder: 1, name: 1 });

  // 3. حساب المنتجات
  const categoriesWithCounts = await Promise.all(
    categories.map(async (category) => {
      let productCount;
      if (category.slug === 'all' || category.isProtected) {
        productCount = await Product.countDocuments({});
      } else {
        productCount = await Product.countDocuments({ category: category._id });
      }
      return { ...category.toObject(), productCount };
    })
  );

  res.json({ categories: categoriesWithCounts });
});

// POST /api/admin/categories
export const createAdminCategory = asyncHandler(async (req, res) => {
  const { name, slug, description, sortOrder, commissionRate, isActive } = req.body;

  if (!name || !name.trim()) {
    res.status(400);
    throw new Error("اسم القسم مطلوب");
  }

  const exists = await Category.findOne({ name: name.trim() });
  if (exists) {
    res.status(400);
    throw new Error("هذا القسم موجود بالفعل");
  }

  const image = req.file ? `/uploads/categories/${req.file.filename}` : "";

  const normalizedCommission = normalizeCommissionRate(commissionRate);

  // معالجة حالة التفعيل إن أُرسلت، وإلا نترك القيمة الافتراضية (true)
  let activeValue = true;
  if (typeof isActive !== "undefined") {
    if (isActive === "false" || isActive === "0" || isActive === false) {
      activeValue = false;
    } else {
      activeValue = true;
    }
  }

  const category = await Category.create({
    name: sanitizeText(name),
    slug:
      slug?.trim() ||
      name
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-"),
    description: sanitizeHTML(description) || "",
    sortOrder: typeof sortOrder === "number" ? sortOrder : Number(sortOrder) || 0,
    image,
    commissionRate: typeof normalizedCommission === "number" ? normalizedCommission : 0,
    isActive: activeValue,
  });

  res.status(201).json({ category });
});

// PUT /api/admin/categories/:id
export const updateAdminCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    res.status(404);
    throw new Error("القسم غير موجود");
  }

  const { name, slug, description, sortOrder, commissionRate, isActive } = req.body;

  // 🛡️ منطق خاص للقسم المحمي "الكل"
  if (category.isProtected || category.slug === 'all') {
    // مسموح فقط بتعديل الاسم والصورة
    if (name && name.trim()) {
      category.name = sanitizeText(name);
    }
    // باقي الحقول: نثبت القيم الأصلية أو نتجاهل التغييرات
    category.sortOrder = -999;
    category.isActive = true;
    category.commissionRate = 0;
    // الـ slug لا يتغير
  } else {
    // المنطق العادي لباقي الأقسام
    if (name && name.trim()) {
      category.name = name.trim();
    }
    if (slug && slug.trim()) {
      category.slug = slug.trim().toLowerCase();
    } else if (!category.slug && category.name) {
      category.slug = category.name.toLowerCase().replace(/\s+/g, "-");
    }

    if (typeof description !== "undefined") {
      category.description = sanitizeHTML(description);
    }

    if (typeof sortOrder !== "undefined") {
      category.sortOrder = typeof sortOrder === "number" ? sortOrder : Number(sortOrder) || 0;
    }

    // تحديث نسبة العمولة إن أرسلت
    if (typeof commissionRate !== "undefined") {
      const normalizedCommission = normalizeCommissionRate(commissionRate);
      if (typeof normalizedCommission === "number") {
        category.commissionRate = normalizedCommission;
      }
    }

    // 🔥 تفعيل / تعطيل القسم
    if (typeof isActive !== "undefined") {
      if (isActive === "false" || isActive === "0" || isActive === false) {
        category.isActive = false;
      } else if (isActive === "true" || isActive === "1" || isActive === true) {
        category.isActive = true;
      }
    }
  }

  // معالجة الصورة الجديدة إن وُجدت (مسموح للجميع بما فيه المحمي)
  if (req.file) {
    const newImagePath = `/uploads/categories/${req.file.filename}`;

    // ✅ حذف الصورة القديمة بشكل آمن
    if (category.image) {
      safeDeleteCategoryImage(category.image);
    }
    category.image = newImagePath;
  }

  await category.save();

  res.json({ category });
});

// DELETE /api/admin/categories/:id
export const deleteAdminCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    res.status(404);
    throw new Error("القسم غير موجود");
  }

  // 🛡️ حماية: منع حذف أي قسم محلي (system-locked)
  // سواء تم تحديده بـ isProtected أو بالـ slug الخاص بقسم "الكل"
  if (category.isProtected || category.slug === 'all') {
    res.status(403);
    throw new Error("عذرًا، لا يمكن حذف هذا القسم لأنه قسم أساسي في النظام.");
  }

  // ✅ حذف صورة القسم بشكل آمن
  if (category.image) {
    safeDeleteCategoryImage(category.image);
  }

  await category.deleteOne();
  res.json({ message: "تم حذف القسم بنجاح." });
});
