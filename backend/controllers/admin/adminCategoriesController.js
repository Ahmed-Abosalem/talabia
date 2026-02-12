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
export const getAdminCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find().sort({ sortOrder: 1, name: 1 });

  // إضافة عدد المنتجات لكل قسم
  const categoriesWithCounts = await Promise.all(
    categories.map(async (category) => {
      const productCount = await Product.countDocuments({ category: category._id });
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
    name: name.trim(),
    slug:
      slug?.trim() ||
      name
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-"),
    description: description?.trim() || "",
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

  // معالجة الصورة الجديدة إن وُجدت
  let newImagePath = category.image;

  if (req.file) {
    newImagePath = `/uploads/categories/${req.file.filename}`;

    // ✅ حذف الصورة القديمة بشكل آمن
    if (category.image) {
      safeDeleteCategoryImage(category.image);
    }
  }

  if (name && name.trim()) {
    category.name = name.trim();
  }

  if (slug && slug.trim()) {
    category.slug = slug.trim().toLowerCase();
  } else if (!category.slug && category.name) {
    category.slug = category.name.toLowerCase().replace(/\s+/g, "-");
  }

  if (typeof description !== "undefined") {
    category.description = description;
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

  category.image = newImagePath;

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

  // ✅ حذف صورة القسم بشكل آمن
  if (category.image) {
    safeDeleteCategoryImage(category.image);
  }

  await category.deleteOne();
  res.json({ message: "تم حذف القسم بنجاح." });
});
