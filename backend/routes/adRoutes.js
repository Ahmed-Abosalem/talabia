// backend/routes/adRoutes.js

import express from "express";
import {
  createAd,
  getAdsAdmin,
  getAdByIdAdmin,
  updateAd,
  deleteAd,
  toggleAdStatus,
  reorderAds,
  getActiveAdsPublic,
} from "../controllers/adController.js";

// ✅ الحماية العامة (يتحقق من التوكن ويضع user على req)
import { protect } from "../middleware/authMiddleware.js";

// ✅ صلاحيات الأدمن الرسمية في المشروع
import { allowRoles, requireAdminPermission } from "../middleware/roleMiddleware.js";

// ✅ رافع صور الإعلانات (يحفظ داخل uploads/ads)
import { uploadAdImage } from "../middleware/uploadMiddleware.js";

const router = express.Router();

/**
 * 🔐 حماية مسارات الإعلانات الإدارية:
 * - يجب أن يكون المستخدم admin
 * - ويملك صلاحية قسم الإعلانات (ads) بمستوى partial على الأقل
 *
 * ملاحظة مهمة:
 * الكود القديم كان يحاول اكتشاف ميدل وير غير موجود (authorizeRoles/requireRole/default)
 * وإذا لم يجده كان يسمح بالمرور => ثغرة صلاحيات خطيرة.
 */
const adminAdsProtection = [
  protect,
  allowRoles("admin"),
  requireAdminPermission("ads", "partial"),
];

// ────────────────────────────────────────────────
// 🌍 مسار عام للواجهة الأمامية (بدون حماية):
// GET /api/ads?placement=home_main_banner&limit=3
// يعيد الإعلانات الفعّالة للصفحة الرئيسية (البانر).
// ────────────────────────────────────────────────
router.get("/", getActiveAdsPublic);

// ────────────────────────────────────────────────
// 👑 مسارات الأدمن (محمية بالكامل)
// ────────────────────────────────────────────────
router.use("/admin", ...adminAdsProtection);

/**
 * GET /api/ads/admin
 * قائمة الإعلانات مع فلترة وبحث وباجينيشن
 */
router.get("/admin", getAdsAdmin);

/**
 * GET /api/ads/admin/:id
 * جلب إعلان واحد للتعديل
 */
router.get("/admin/:id", getAdByIdAdmin);

/**
 * POST /api/ads/admin
 * إنشاء إعلان جديد (عنوان + صورة + فترة عرض + ترتيب + رابط + حالة)
 * body: multipart/form-data
 */
router.post("/admin", uploadAdImage.single("image"), createAd);

/**
 * PUT /api/ads/admin/:id
 * تعديل إعلان موجود (نفس الحقول + صورة اختيارية جديدة)
 * body: multipart/form-data
 */
router.put("/admin/:id", uploadAdImage.single("image"), updateAd);

/**
 * DELETE /api/ads/admin/:id
 * حذف إعلان
 */
router.delete("/admin/:id", deleteAd);

/**
 * PATCH /api/ads/admin/:id/status
 * تفعيل / تعطيل إعلان
 */
router.patch("/admin/:id/status", toggleAdStatus);

/**
 * PUT /api/ads/admin/reorder
 * إعادة ترتيب الإعلانات داخل نفس الـ placement
 * body: { placement: "home_main_banner", orderedIds: [id1, id2, ...] }
 */
router.put("/admin/reorder", reorderAds);

export default router;
