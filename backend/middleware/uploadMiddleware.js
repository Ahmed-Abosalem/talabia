// backend/middleware/uploadMiddleware.js
// ميدل وير موحّد لرفع الملفات (صور الأقسام، الإعلانات، المنتجات، وثائق الهوية)
// نسخة إنتاجية نهائية متوافقة مع منطق مشروع طلبية (Talabia)

import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { fileURLToPath } from "url";

// ✅ خريطة الامتدادات المسموحة حسب نوع الملف
const ALLOWED_IMAGE_MIMES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const ALLOWED_IMAGE_EXTS = [".jpg", ".jpeg", ".png", ".webp"];

const ALLOWED_ID_MIMES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/pdf",
];
const ALLOWED_ID_EXTS = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];

// 🧩 التأكد من وجود المجلد قبل الحفظ
function ensureFolderExists(folderPath) {
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
}

// 🧩 استخراج امتداد آمن ومطبع
function getSafeExt(originalname) {
  const ext = path.extname(originalname || "").toLowerCase().trim();
  // extname يعيد آخر امتداد فقط (مثال: a.jpg.exe => .exe) وهذا ممتاز للأمان
  if (!ext || !ext.startsWith(".")) return "";
  return ext;
}

// 🧩 إنشاء تخزين DiskStorage لمجلد معيّن تحت backend/uploads
function createDiskStorage(subfolder) {
  /**
   * Multer يكتب الملفات بشكل افتراضي في مسار نسبي من مسار التشغيل الحالي.
   * لضمان أن جميع الملفات تحفظ تحت backend/uploads/<subfolder> فإننا نحدد المسار نسبة إلى هذا الملف.
   */
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const uploadPath = path.join(__dirname, "..", "uploads", subfolder);

  ensureFolderExists(uploadPath);

  return multer.diskStorage({
    destination(req, file, cb) {
      cb(null, uploadPath);
    },
    filename(req, file, cb) {
      const ext = getSafeExt(file.originalname);

      const baseName = path
        .basename(file.originalname || "file", ext || "")
        .toLowerCase()
        // يسمح بحروف لاتينية/أرقام + العربية، ويحوّل الباقي إلى "-"
        .replace(/[^a-z0-9\u0600-\u06FF]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 40); // تقصير الاسم لتجنّب أسماء طويلة جداً

      // ✅ UUID أقوى من Math.random لتجنب التصادم
      const uniqueSuffix = crypto.randomUUID();
      const safeName = baseName || "file";

      // ملاحظة: الامتداد تم التحقق منه في fileFilter أدناه
      cb(null, `${safeName}-${uniqueSuffix}${ext}`);
    },
  });
}

// 🧩 فلترة الصور (JPG / PNG / WEBP) + تحقق امتداد
function imageFileFilter(req, file, cb) {
  const mime = (file.mimetype || "").toLowerCase();
  const ext = getSafeExt(file.originalname);

  if (!ALLOWED_IMAGE_MIMES.includes(mime) || !ALLOWED_IMAGE_EXTS.includes(ext)) {
    return cb(new Error("يُسمح فقط برفع الصور (JPG / PNG / WEBP)"));
  }

  return cb(null, true);
}

// 🧾 فلترة وثائق الهوية (صور + PDF) + تحقق امتداد
function identityFileFilter(req, file, cb) {
  const mime = (file.mimetype || "").toLowerCase();
  const ext = getSafeExt(file.originalname);

  if (!ALLOWED_ID_MIMES.includes(mime) || !ALLOWED_ID_EXTS.includes(ext)) {
    return cb(
      new Error("يُسمح فقط برفع صور (JPG / PNG / WEBP) أو ملفات PDF لوثائق الهوية")
    );
  }

  // حماية إضافية: لو PDF لازم يكون امتداده PDF (تجنب أسماء غريبة)
  if (mime === "application/pdf" && ext !== ".pdf") {
    return cb(new Error("ملف PDF يجب أن يكون امتداده .pdf"));
  }

  return cb(null, true);
}

// 🛠 دالة مساعدة لإنشاء Uploader جاهز
function createUploader({ subfolder, fileFilter, maxSizeMB = 3, maxFiles = 10 }) {
  return multer({
    storage: createDiskStorage(subfolder),
    fileFilter,
    limits: {
      // ✅ حجم الملف
      fileSize: maxSizeMB * 1024 * 1024,
      // ✅ عدد الملفات
      files: maxFiles,
      // ✅ حماية إضافية ضد spam في الحقول/الأجزاء
      fields: 50,
      fieldNameSize: 100,
      fieldSize: 1024 * 50, // 50KB للنصوص المصاحبة
      parts: 60,
      headerPairs: 200,
    },
  });
}

// 🟢 رفع صور الأقسام  → uploads/categories
export const uploadCategoryImage = createUploader({
  subfolder: "categories",
  fileFilter: imageFileFilter,
  maxSizeMB: 3,
  maxFiles: 1,
});

// 🟠 رفع صور الإعلانات → uploads/ads
export const uploadAdImage = createUploader({
  subfolder: "ads",
  fileFilter: imageFileFilter,
  maxSizeMB: 4,
  maxFiles: 3,
});

// 🔵 رفع صور المنتجات → uploads/products
export const uploadProductImage = createUploader({
  subfolder: "products",
  fileFilter: imageFileFilter,
  maxSizeMB: 4,
  maxFiles: 10,
});

// 🧾 رفع وثائق الهوية للبائع / شركة الشحن → uploads/ids
// ⚠️ مهم: يفضّل عدم تقديم هذا المسار كـ static بشكل عام في server.js
export const uploadIdentityDocument = createUploader({
  subfolder: "ids",
  fileFilter: identityFileFilter,
  maxSizeMB: 5,
  maxFiles: 2,
});

// 🧯 ميدل وير موحّد للتعامل مع أخطاء Multer وتحويلها لاستجابة JSON نظيفة
export function handleMulterError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    const msg =
      err.code === "LIMIT_FILE_SIZE"
        ? "حجم الملف أكبر من الحد المسموح به."
        : err.code === "LIMIT_FILE_COUNT" || err.code === "LIMIT_FILE_COUNT"
          ? "عدد الملفات أكبر من الحد المسموح به."
          : err.code === "LIMIT_UNEXPECTED_FILE"
            ? "تم إرسال ملف بحقل غير متوقع."
            : err.code === "LIMIT_PART_COUNT"
              ? "عدد أجزاء الطلب أكبر من المسموح."
              : err.code === "LIMIT_FIELD_COUNT"
                ? "عدد الحقول النصية أكبر من المسموح."
                : err.code === "LIMIT_FIELD_KEY"
                  ? "اسم أحد الحقول طويل جدًا."
                  : err.code === "LIMIT_FIELD_VALUE"
                    ? "قيمة أحد الحقول كبيرة جدًا."
                    : `خطأ في رفع الملف: ${err.message}`;

    return res.status(400).json({ message: msg });
  }

  if (err) {
    return res.status(400).json({
      message: err.message || "حدث خطأ أثناء رفع الملف.",
    });
  }

  return next();
}

// ✅ التصدير الافتراضي (للتوافق مع الكود القديم)
const upload = uploadCategoryImage;
export default upload;
