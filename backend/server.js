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
import fs from "fs";

import helmet from "helmet";
import rateLimit from "express-rate-limit";
import expressMongoSanitize from "@exortek/express-mongo-sanitize";
import hpp from "hpp";
import compression from "compression";

import mongoose from "mongoose";
import connectDB from "./config/db.js";
import { notFound, errorHandler } from "./middleware/errorMiddleware.js";
import { runUploadsCleanup } from "./utils/uploadsCleanup.js";
import { protect } from "./middleware/authMiddleware.js";
import { allowRoles } from "./middleware/roleMiddleware.js";

// تحميل env (في الإنتاج ستأتي من Environment Variables، ووجود .env محلي فقط)
dotenv.config();

console.log("📂 Current Working Directory:", process.cwd());
console.log("🔑 MONGO_URI Loaded:", process.env.MONGO_URI ? "✅ YES" : "❌ NO");
if (process.env.MONGO_URI) {
  console.log("ℹ️  MONGO_URI Length:", process.env.MONGO_URI.length);
}


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
    max: 3000, // 3000 طلب لكل IP في 15 دقيقة (لتجنب حظر المستخدمين المتفاعلين)
    standardHeaders: true,
    legacyHeaders: false,
    // الحل الاحترافي: تخطي الحد للطلبات الموثوقة أو في بيئة التطوير المحلية
    skip: (req) => {
      if (!isProd && process.env.SKIP_RATE_LIMIT === "true") return true;
      // يمكن إضافة استثناءات أخرى هنا (مثل IDs معينة)
      return false;
    },
    message: {
      status: 429,
      message: "لقد تجاوزت حد الطلبات المسموح به. يرجى المحاولة لاحقاً بعد 15 دقيقة.",
    },
  })
);

// 🔒 Rate Limit مخصص: إنشاء الطلبات فقط (منع spam)
// يُطبَّق لاحقاً على: POST /api/orders فقط
// ملاحظة: لا نستخدم keyGenerator مخصص — express-rate-limit يتعامل مع IPv6 تلقائياً
const ordersCreateRateLimit = rateLimit({
  windowMs: 60 * 1000,   // 1 دقيقة
  max: 10,               // 10 طلبات كحد أقصى لكل IP في الدقيقة
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "طلبات كثيرة جداً. انتظر دقيقة ثم أعد المحاولة." },
});

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
      // 1. Allow non-browser requests (Postman, etc)
      if (!origin) return callback(null, true);

      // 2. Strict whitelist check
      if (allowedOrigins.includes(origin)) return callback(null, true);

      // 3. Capacitor/Mobile App Support
      const isCapacitor = origin === "capacitor://localhost" || origin === "http://localhost";
      if (isCapacitor) return callback(null, true);

      // 4. Dynamic Dev logic (Only if NOT in production)
      if (!isProd) {
        // Allow anything from localhost or common local IPs in dev mode for multi-device testing
        const isLocalhost = origin.startsWith("http://localhost:");
        const isLocalIp = /^http:\/\/192\.168\.\d+\.\d+(:\d+)?$/.test(origin);
        const isLocalIpAlt = /^http:\/\/172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+(:\d+)?$/.test(origin);
        const isLocalIpAlt2 = /^http:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/.test(origin);

        if (isLocalhost || isLocalIp || isLocalIpAlt || isLocalIpAlt2) {
          return callback(null, true);
        }
      }

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

// ✅ حماية وثائق الهوية: السماح فقط للأدمن بالوصول (حماية خصوصية البائعين)
app.use(
  "/uploads/ids",
  protect,
  allowRoles("admin"),
  express.static(idsDir)
);

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
// 🛡️ Enterprise Parity Health Check
// ────────────────────────────────────────────────
app.get("/api/health/parity", (req, res) => {
  try {
    const hashPath = path.join(process.cwd(), ".deploy_hash");
    let hash = "DEVELOPMENT_MODE";
    if (fs.existsSync(hashPath)) {
      hash = fs.readFileSync(hashPath, "utf-8").trim();
    }
    res.status(200).json({ status: "alive", parityHash: hash });
  } catch (error) {
    res.status(500).json({ status: "error", message: "Failed to read hash" });
  }
});

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

// ✅ NEW: Privacy Policy routes
import privacyPolicyRoutes from "./routes/privacyPolicyRoutes.js";

// ✅ NEW: Synonym routes (Search System)
import synonymRoutes from "./routes/synonymRoutes.js";

// ✅ NEW: System Settings
import systemSettingsRoutes from "./routes/systemSettingsRoutes.js";

// ✅ NEW: Payment Settings (public route — no auth required)
import { getPaymentSettings } from "./controllers/admin/adminPaymentController.js";

// ✅ NEW: Wallet routes (محفظتي)
import walletRoutes from "./routes/walletRoutes.js";
import adminWalletRoutes from "./routes/adminWalletRoutes.js";

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
// ✅ Orders — Rate Limit مخصص على إنشاء الطلبات فقط
// GET /api/orders/* بدون قيد إضافي
app.post("/api/orders", ordersCreateRateLimit, orderRoutes);
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

// ✅ NEW: mount privacy policy API
app.use("/api/privacy-policy", privacyPolicyRoutes);

// ✅ NEW: mount synonym API
app.use("/api/synonyms", synonymRoutes);

// ✅ NEW: mount wallet API (محفظتي — دور المشتري)
app.use("/api/wallet", walletRoutes);

// ✅ NEW: mount admin wallet management API (إدارة المحافظ — دور المدير)
app.use("/api/admin/wallets", adminWalletRoutes);

// ✅ NEW: System Settings (إعدادات عامة ومنها الحد الأدنى للطلب)
app.use("/api/settings", systemSettingsRoutes);

// ✅ NEW: إعدادات الدفع العامة (بدون توثيق — للمشترين في صفحة الدفع)
app.get("/api/settings/payment", getPaymentSettings);

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

// ✅ مسار مراقبة حالة قاعدة البيانات الفعلي
app.get("/api/health/db", (req, res) => {
  const states = {
    0: "Disconnected",
    1: "Connected",
    2: "Connecting",
    3: "Disconnecting",
  };
  const code = mongoose.connection.readyState;
  res.status(code === 1 ? 200 : 503).json({
    status: states[code] || "Unknown",
    dbHost: mongoose.connection.host || "None",
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

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${PORT} (${process.env.NODE_ENV})`);
  console.log(`📡 Accessible on all network interfaces (e.g., http://localhost:${PORT})`);
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
