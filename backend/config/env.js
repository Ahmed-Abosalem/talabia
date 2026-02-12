// ────────────────────────────────────────────────
// 📁 backend/config/env.js
// تحميل المتغيرات البيئية وتصدير إعدادات النظام (Production-safe)
// ────────────────────────────────────────────────

import dotenv from "dotenv";

// 📦 تحميل المتغيرات من ملف .env (في الإنتاج غالبًا لن يوجد ملف .env وهذا طبيعي)
dotenv.config();

const isProd = process.env.NODE_ENV === "production";

// ✅ Helpers
function toNumber(value, fallback = undefined) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toString(value, fallback = "") {
  if (typeof value === "string") return value;
  if (value == null) return fallback;
  return String(value);
}

function parseCommaList(value) {
  return toString(value, "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function requireEnv(name, { allowEmpty = false } = {}) {
  const v = process.env[name];
  if (v === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  if (!allowEmpty && String(v).trim() === "") {
    throw new Error(`Environment variable ${name} must not be empty`);
  }
  return v;
}

// ────────────────────────────────────────────────
// 🔒 Enforce critical env vars in production
// ────────────────────────────────────────────────
if (isProd) {
  // قاعدة البيانات و JWT من أهم المتغيرات الحساسة في الإنتاج
  requireEnv("MONGO_URI");
  requireEnv("JWT_SECRET");

  // يفضّل جدًا تقييد CORS في الإنتاج (ولو تُدار في server.js)
  // إن كنت لا تريد فرضه الآن، يمكنك تعليق السطر التالي.
  requireEnv("ALLOWED_ORIGINS");
}

// ────────────────────────────────────────────────
// ⚙️ Build config
// ────────────────────────────────────────────────
const config = {
  env: process.env.NODE_ENV || "development",
  port: toNumber(process.env.PORT, 5000),

  // 🔐 قاعدة البيانات
  mongoURI: process.env.MONGO_URI,

  // 🔑 مفاتيح JWT
  // ⚠️ لا يوجد fallback في الإنتاج إطلاقًا (مفروض بالأعلى)
  // في التطوير فقط نضع قيمة افتراضية واضحة (تساعدك محليًا بدون تعطيل)
  jwtSecret: isProd ? process.env.JWT_SECRET : process.env.JWT_SECRET || "dev_secret_change_me",

  // 🌐 CORS Allowed Origins (يستخدمها server.js غالبًا)
  allowedOrigins: parseCommaList(process.env.ALLOWED_ORIGINS),

  // ☁️ إعدادات Cloudinary (اختيارية)
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },

  // 📧 إعدادات البريد الإلكتروني (اختيارية)
  email: {
    host: process.env.EMAIL_HOST,
    port: toNumber(process.env.EMAIL_PORT, 587),
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
    from: process.env.EMAIL_FROM,
  },
};

export default config;

// ────────────────────────────────────────────────
// ملاحظات أمنية مهمة:
// - لا تستخدم secret افتراضي في الإنتاج نهائيًا.
// - فصل الإعدادات عن الكود يتماشى مع 12-Factor.
// - الأسرار يجب إدارتها بشكل آمن وعدم تضمينها في المستودع.
// ────────────────────────────────────────────────
