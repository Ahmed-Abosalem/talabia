// ────────────────────────────────────────────────
// 📁 backend/routes/systemSettingsRoutes.js
// مسارات إعدادات النظام (مثل الحد الأدنى للطلب)
// ────────────────────────────────────────────────

import express from "express";
import {
    getMinOrderSettings,
    updateMinOrderSettings,
} from "../controllers/systemSettingsController.js";
import { protect } from "../middleware/authMiddleware.js";
import { allowRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

// 🌐 عامة: جلب إعدادات الحد الأدنى (للمشترين في صفحة السلة)
router.get("/min-order", getMinOrderSettings);

// 🔒 أدمن فقط: تحديث إعدادات الحد الأدنى
router.put("/min-order", protect, allowRoles("admin"), updateMinOrderSettings);

export default router;
