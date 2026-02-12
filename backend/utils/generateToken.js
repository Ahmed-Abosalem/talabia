// ────────────────────────────────────────────────
// 📁 backend/utils/generateToken.js
// توليد رموز JWT الآمنة في نظام طلبية (Talabia)
// ────────────────────────────────────────────────

import jwt from "jsonwebtoken";
import config from "../config/env.js";

// 🔑 توليد التوكن (مقيد بخوارزمية واحدة)
const generateToken = (id) => {
  return jwt.sign({ id }, config.jwtSecret, {
    expiresIn: "30d",
    algorithm: "HS256",
  });
};

export default generateToken;

// ────────────────────────────────────────────────
// ✅ يُستخدم في authController.js.
// ✅ مدة صلاحية التوكن: 30 يومًا.
// ✅ algorithm: HS256 (متوافق مع authMiddleware.js الذي يقيّد verify على HS256).
// ────────────────────────────────────────────────
