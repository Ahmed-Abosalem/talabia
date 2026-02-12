// ────────────────────────────────────────────────
// 📁 backend/middleware/authMiddleware.js
// التحقق من صلاحية المستخدم عبر JWT في نظام طلبية
// نسخة إنتاجية محسّنة (نهائية)
// ────────────────────────────────────────────────

import jwt from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import User from "../models/User.js";
import config from "../config/env.js";

// ✅ استخراج التوكن بشكل آمن (يتحمل مسافات زائدة)
function extractBearerToken(req) {
  const authHeader = req.headers.authorization || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
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
    throw new Error("جلسة غير صالحة أو منتهية");
  }
});
