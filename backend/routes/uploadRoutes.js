// backend/routes/uploadRoutes.js
// مسارات رفع الملفات (مخصصة هنا لصور المنتجات) في منصة طلبية (Talabia)
// تعتمد على uploadMiddleware.js (uploadProductImage + handleMulterError)
//
// ✅ تعديل حرج لمنع تراكم الصور:
// إضافة مسار حذف صور مرفوعة /api/uploads/products (DELETE)
// حتى يتم حذف الصور التي رُفعت ثم لم تُستخدم (Orphan uploads)

import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { protect } from "../middleware/authMiddleware.js";
import { allowRoles } from "../middleware/roleMiddleware.js";
import {
  uploadProductImage,
  handleMulterError,
} from "../middleware/uploadMiddleware.js";

const router = express.Router();

// ✅ تحديد مسار uploads بشكل ثابت
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// backend/routes -> .. = backend -> uploads
const uploadsDir = path.join(__dirname, "..", "uploads");

// ✅ حذف صور المنتجات المحلية فقط (حماية من Path Traversal)
// نقبل فقط المسارات التي تبدأ بـ /uploads/products/
function safeDeleteLocalProductImages(imageUrls) {
  const urls = Array.isArray(imageUrls) ? imageUrls : [];
  const prefix = "/uploads/products/";

  const deleted = [];
  const notFound = [];
  const failed = [];

  for (const url of urls) {
    try {
      if (!url || typeof url !== "string") continue;
      if (!url.startsWith(prefix)) {
        failed.push({ url, reason: "invalid_path_prefix" });
        continue;
      }

      // basename يمنع ../
      const filename = path.basename(url);
      if (!filename) {
        failed.push({ url, reason: "invalid_filename" });
        continue;
      }

      const filePath = path.join(uploadsDir, "products", filename);

      // unlinkSync هنا مقصود لأن المسار قصير وبدون I/O كبير
      // ولتجميع نتائج واضحة في الرد
      try {
        fs.unlinkSync(filePath);
        deleted.push(url);
      } catch (err) {
        if (err && err.code === "ENOENT") {
          notFound.push(url);
        } else {
          failed.push({ url, reason: err?.message || "unlink_failed" });
        }
      }
    } catch (e) {
      failed.push({ url, reason: "unexpected_error" });
    }
  }

  return { deleted, notFound, failed };
}

// 📸 رفع صور المنتجات
// يُستخدم من لوحة البائع / لوحة الأدمن لرفع صورة أو أكثر.
// - method: POST
// - url:   /api/uploads/products
// - body:  FormData فيه حقل "images" (ملفات متعددة)
router.post(
  "/products",
  protect,
  allowRoles("seller", "admin"),

  // ✅ حماية بسيطة: يجب أن يكون الطلب multipart/form-data
  (req, res, next) => {
    const ct = req.headers["content-type"] || "";
    if (!ct.toLowerCase().includes("multipart/form-data")) {
      return res.status(415).json({
        message: "نوع المحتوى غير مدعوم. استخدم multipart/form-data لرفع الملفات.",
      });
    }
    return next();
  },

  // ✅ حتى 5 صور في الطلب الواحد (متوافق مع منطق الواجهة)
  uploadProductImage.array("images", 5),

  // ✅ معالج أخطاء multer داخل سلسلة الراوت
  handleMulterError,

  (req, res) => {
    const files = req.files || [];

    if (!files.length) {
      return res.status(400).json({
        message: "لم يتم استقبال أي ملفات للرفع.",
      });
    }

    // نرجّع مسارات الصور كنسبية (كما كان سابقًا) حتى لا نكسر الواجهة
    const images = files.map((file) => `/uploads/products/${file.filename}`);

    return res.status(201).json({
      message: "تم رفع الصور بنجاح.",
      images,
    });
  }
);

// 🧹 حذف صور منتجات مرفوعة (حل تراكم الصور غير المستخدمة)
// - method: DELETE
// - url:   /api/uploads/products
// - body:  JSON { images: ["/uploads/products/a.jpg", ...] }
//
// ✅ هذا المسار لا يغير أي منطق موجود؛ فقط يضيف وسيلة تنظيف
router.delete(
  "/products",
  protect,
  allowRoles("seller", "admin"),
  express.json({ limit: "200kb" }),
  (req, res) => {
    const images = req.body?.images;

    if (!Array.isArray(images) || images.length === 0) {
      return res.status(400).json({
        message: "يجب إرسال مصفوفة images تحتوي على مسارات الصور المراد حذفها.",
      });
    }

    // حد أقصى منطقي لكل طلب (منع إساءة الاستخدام)
    if (images.length > 20) {
      return res.status(400).json({
        message: "عدد الصور كبير. الحد الأقصى للحذف في الطلب الواحد هو 20 صورة.",
      });
    }

    const result = safeDeleteLocalProductImages(images);

    return res.status(200).json({
      message: "تم تنفيذ عملية تنظيف الصور.",
      ...result,
    });
  }
);

export default router;
