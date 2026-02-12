// ────────────────────────────────────────────────
// 📁 backend/server.js
// 🚀 Talabia API - Production Ready Server
// ✅ CORS من ALLOWED_ORIGINS
// ✅ Hardening: helmet + rate limit + mongo sanitize + hpp + compression
// ✅ إصلاح حجب الصور بين 5173 و 5000 (NotSameOrigin)
// ✅ تنظيف تلقائي للـ Orphan uploads (كل 24 ساعة) - لا يحذف DB
// ────────────────────────────────────────────────

import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";

import helmet from "helmet";
import rateLimit from "express-rate-limit";
import expressMongoSanitize from "@exortek/express-mongo-sanitize";
import hpp from "hpp";
import compression from "compression";

import mongoose from "mongoose";
import connectDB from "./config/db.js";
import { notFound, errorHandler } from "./middleware/errorMiddleware.js";
import { runUploadsCleanup } from "./utils/uploadsCleanup.js";

// تحميل env (في الإنتاج ستأتي من Environment Variables، ووجود .env محلي فقط)
dotenv.config();

const isProd = process.env.NODE_ENV === "production";

// ────────────────────────────────────────────────
// 🔒 Guardrails (تحققات تشغيل بسيطة قبل البدء)
// ────────────────────────────────────────────────
if (isProd) {
  if (
    !process.env.JWT_SECRET ||
    String(process.env.JWT_SECRET).trim().length < 16
  ) {
    console.error(
      "❌ Missing/weak JWT_SECRET in production. Please set a strong JWT_SECRET (>= 16 chars)."
    );
    process.exit(1);
  }
}

// الاتصال بقاعدة البيانات
connectDB();

const app = express();

// لو خلف Proxy (Render / Nginx / Cloudflare…)
app.set("trust proxy", 1);

// لا تعرض X-Powered-By
app.disable("x-powered-by");

// ────────────────────────────────────────────────
// 🛡️ Security Hardening
// ────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
  })
);

app.use(expressMongoSanitize());
app.use(hpp());
app.use(compression());

// Rate limiting (خفيف ومناسب API)
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 دقيقة
    max: 300, // 300 طلب لكل IP في 15 دقيقة
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// ────────────────────────────────────────────────
// ⚙️ Body Parsers
// ────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ────────────────────────────────────────────────
// 🌐 CORS (Production Ready)
// ────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

// في التطوير لو ما ضبطت ALLOWED_ORIGINS نسمح للـ Vite افتراضيًا
if (!isProd && allowedOrigins.length === 0) {
  allowedOrigins.push("http://localhost:5173");
}

// ✅ في الإنتاج: ممنوع تشغيل CORS بشكل مفتوح
if (isProd && allowedOrigins.length === 0) {
  console.error(
    "❌ ALLOWED_ORIGINS is required in production. Refusing to start with open CORS."
  );
  process.exit(1);
}

app.use(
  cors({
    origin: (origin, callback) => {
      // طلبات بدون Origin (مثل Postman / Server-to-server) نسمح بها
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) return callback(null, true);

      const err = new Error("Not allowed by CORS");
      err.statusCode = 403;
      return callback(err);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 204,
  })
);

// ✅ تحويل أخطاء CORS لاستجابة JSON واضحة بدل 500
app.use((err, req, res, next) => {
  if (err && err.message === "Not allowed by CORS") {
    return res.status(err.statusCode || 403).json({
      message: "CORS: Origin غير مسموح به.",
    });
  }
  return next(err);
});

// Logging فقط في dev (أو غير test/production)
if (process.env.NODE_ENV !== "test" && process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// ────────────────────────────────────────────────
// 🗂️ Static Files (Uploads)
// ────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsRoot = path.join(__dirname, "uploads");
const idsDir = path.join(uploadsRoot, "ids");

// ✅ حماية حرجة: منع الوصول العام لوثائق الهوية
app.use("/uploads/ids", (req, res) => {
  return res.status(404).json({ message: "Not found" });
});

// ✅ خدمة بقية الملفات المرفوعة مع Header يمنع حجب الصور عبر المتصفح
app.use(
  "/uploads",
  (req, res, next) => {
    // منع أي محاولة للوصول إلى ids عبر /uploads (double safety)
    const requested = path.normalize(path.join(uploadsRoot, req.path));
    if (requested.startsWith(idsDir)) {
      return res.status(404).json({ message: "Not found" });
    }

    // صور: اجعلها قابلة للكاش لتحسين الأداء (يمكن تعديل المدة)
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    if (req.method === "GET") {
      res.setHeader("Cache-Control", "public, max-age=604800, immutable"); // 7 أيام
    }
    next();
  },
  express.static(uploadsRoot)
);

// ────────────────────────────────────────────────
// 🧹 Uploads Orphan Cleanup (Professional, 24h TTL)
// ────────────────────────────────────────────────
// ✅ يحذف فقط ملفات داخل backend/uploads/**
// ✅ لا يحذف أي شيء من قاعدة البيانات
// ✅ لا يحذف ملف إذا كان هناك مرجع له في DB
// ✅ لا يحذف ملفات أحدث من 24 ساعة (هامش أمان)
const CLEANUP_TTL_HOURS = 24;
const CLEANUP_INTERVAL_HOURS = 24;

// يمكن تعطيله عند الحاجة: UPLOAD_CLEANUP_ENABLED=false
const cleanupEnabled =
  (process.env.UPLOAD_CLEANUP_ENABLED ||
    (isProd ? "true" : "false")).toString().toLowerCase() === "true";

async function runCleanupOnce() {
  try {
    const report = await runUploadsCleanup({
      uploadsRootAbs: uploadsRoot,
      olderThanHours: CLEANUP_TTL_HOURS,
      dryRun: false,
    });
    console.log("🧹 Uploads cleanup report:", JSON.stringify(report));
  } catch (e) {
    console.error("❌ Uploads cleanup failed:", e?.message || e);
  }
}

function scheduleUploadsCleanup() {
  if (!cleanupEnabled) return;

  // تشغيل أول مرة
  runCleanupOnce();

  // تشغيل دوري كل 24 ساعة
  const intervalMs = CLEANUP_INTERVAL_HOURS * 60 * 60 * 1000;
  const t = setInterval(runCleanupOnce, intervalMs);

  // لا تمنع إيقاف السيرفر
  if (typeof t.unref === "function") t.unref();
}

// ضمان التشغيل حتى لو الاتصال تم قبل تركيب listener
if (mongoose.connection.readyState === 1) {
  scheduleUploadsCleanup();
} else {
  mongoose.connection.once("connected", () => {
    scheduleUploadsCleanup();
  });
}

// ────────────────────────────────────────────────
// 📁 Routes
// ────────────────────────────────────────────────
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import storeRoutes from "./routes/storeRoutes.js";
import shippingRoutes from "./routes/shippingRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import adRoutes from "./routes/adRoutes.js";
import sellerRoutes from "./routes/sellerRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";

// ✅ NEW: Reviews routes
import reviewRoutes from "./routes/reviewRoutes.js";

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/stores", storeRoutes);
app.use("/api/shipping", shippingRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/ads", adRoutes);
app.use("/api/seller", sellerRoutes);
app.use("/api/uploads", uploadRoutes);

// ✅ NEW: mount reviews API
app.use("/api/reviews", reviewRoutes);

// ────────────────────────────────────────────────
// 🧪 Health
// ────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.status(200).json({
    message:
      "🚀 Talabia API is running (" +
      (process.env.NODE_ENV || "development") +
      ")",
    version: "1.0.0",
    status: "active",
  });
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    time: new Date().toISOString(),
  });
});

// ────────────────────────────────────────────────
// ❌ Errors
// ────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ────────────────────────────────────────────────
// 🟢 Start
// ────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, "127.0.0.1", () => {
  console.log(`✅ Server running on port ${PORT} (${process.env.NODE_ENV})`);
  console.log(`📡 Version: 1.0.0 | ${new Date().toISOString()}`);
});

// ✅ Graceful shutdown
process.on("SIGTERM", () => {
  server.close(() => {
    console.log("🛑 SIGTERM received: server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  server.close(() => {
    console.log("🛑 SIGINT received: server closed");
    process.exit(0);
  });
});

// ✅ Prevent silent crashes
process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Rejection:", err);
  server.close(() => process.exit(1));
});

// ✅ Optional: Prevent hard crashes from uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
  server.close(() => process.exit(1));
});
