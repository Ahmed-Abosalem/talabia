// ────────────────────────────────────────────────
// 📁 backend/middleware/authMiddleware.js
// التحقق من صلاحية المستخدم عبر JWT في نظام طلبية
// نسخة إنتاجية محسّنة (نهائية)
// ────────────────────────────────────────────────

import jwt from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import User from "../models/User.js";
import config from "../config/env.js";

// ✅ استخراج التوكن بشكل آمن (يدعم الهيدر أو Query Params للروابط المباشرة)
function extractBearerToken(req) {
  let token = null;

  // 1. البحث في الهيدر (الطريقة القياسية للـ API)
  const authHeader = req.headers.authorization || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (match) {
    token = match[1].trim();
  }
  // 2. البحث في Query Params بطريقة تتجاوز expressMongoSanitize
  // لأن مكتبة expressMongoSanitize تقوم بحذف النقاط (.) من التوكن فتجعله تالفاً (jwt malformed)
  else if (req.originalUrl && req.originalUrl.includes("token=")) {
    try {
      const urlObj = new URL(req.originalUrl, `http://localhost`);
      token = urlObj.searchParams.get("token") || (req.query.token ? req.query.token.toString() : "");
    } catch (e) {
      if (req.query && req.query.token) {
        token = req.query.token.toString().trim();
      }
    }
  } else if (req.query && req.query.token) {
    token = req.query.token.toString().trim();
  }

  // تنظيف وحماية من علامات التنصيص الزائدة (إذا خُزّن التوكن كـ JSON String)
  if (token && token.startsWith('"') && token.endsWith('"')) {
    token = token.slice(1, -1).trim();
  }
  if (token && token.startsWith("'") && token.endsWith("'")) {
    token = token.slice(1, -1).trim();
  }

  // تنظيف البادئة: إذا كان التوكن يبدأ بـ Bearer
  if (token && token.toLowerCase().startsWith("bearer ")) {
    token = token.slice(7).trim();
  }

  // حماية إضافية: استبعاد القيم النصية غير المنطقية
  if (token === "undefined" || token === "null" || !token) {
    return null;
  }

  return token;
}

// 🔐 التحقق من التوكن
export const protect = asyncHandler(async (req, res, next) => {
  const token = extractBearerToken(req);

  if (!token) {
    res.status(401);
    throw new Error("لا يوجد صلاحية للوصول - مفقود التوكن");
  }

  try {
    // ✅ تقييد الخوارزمية (أفضل ممارسة أمنية)
    const decoded = jwt.verify(token, config.jwtSecret, {
      algorithms: ["HS256"],
    });

    if (!decoded?.id) {
      res.status(401);
      throw new Error("توكن غير صالح");
    }

    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      res.status(401);
      throw new Error("المستخدم غير موجود أو الجلسة منتهية");
    }

    // ✅ منع الحسابات الموقوفة (إن كان عندك هذا الحقل)
    if (user.isActive === false) {
      res.status(403);
      throw new Error("هذا الحساب موقوف");
    }

    req.user = user;
    return next();
  } catch (error) {
    res.status(401);
    throw new Error(`جلسة غير صالحة أو منتهية: ${error.message}`);
  }
});

// 👑 التحقق من رتبة المدير (Admin Only)
export const admin = asyncHandler(async (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    return next();
  } else {
    res.status(403);
    throw new Error("غير مصرح - للمديرين فقط");
  }
});

// ℹ️ محاولة التحقق من التوكن (بدون إحباط الطلب إذا لم يوجد)
// يستخدم في المسارات العامة التي يتغير سلوكها إذا كان المستخدم هو المالك
export const optionalProtect = asyncHandler(async (req, res, next) => {
  const token = extractBearerToken(req);

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret, {
      algorithms: ["HS256"],
    });

    if (decoded?.id) {
      const user = await User.findById(decoded.id).select("-password");
      if (user && user.isActive !== false) {
        req.user = user;
      }
    }
  } catch (error) {
    // نتجاهل الخطأ في التعرف الاختياري
  }

  return next();
});
