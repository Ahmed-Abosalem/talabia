// ────────────────────────────────────────────────
// 📁 backend/routes/shippingRoutes.js
// مسارات شركات الشحن في نظام طلبية (Talabia)
// ────────────────────────────────────────────────

import express from "express";
import {
  getShippingOrders,
  updateShippingStatus,
  updateShippingItemStatus,
  getShippingStats,
  confirmDeliveryWithCode,
  getDefaultShippingPricing,
} from "../controllers/shippingController.js";
import { protect } from "../middleware/authMiddleware.js";
import { allowRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

// 🔹 تسعير الشحن الافتراضي (للاستخدام في صفحة الدفع Checkout) — عام
router.get("/public/default-pricing", getDefaultShippingPricing);

// ✅ كل ما بعد هذا السطر خاص بشركات الشحن فقط
router.use(protect, allowRoles("shipper"));

// قائمة طلبات شركة الشحن (بدون إظهار deliveryCode)
router.get("/orders", getShippingOrders);

// ✅ تحديث حالة الشحن للطلب بالكامل (منطق قديم - Bulk)
router.put("/orders/:orderId/status", updateShippingStatus);

// ✅ تحديث حالة منتج واحد داخل الطلب (المنطق الجديد – Item-based)
router.patch("/orders/:orderId/items/:itemId/status", updateShippingItemStatus);

// ✅ تأكيد التسليم باستخدام كود التسليم لكل منتج داخل الطلب
// body: { deliveryCode: "123456" }
router.post(
  "/orders/:orderId/items/:itemId/confirm-delivery",
  confirmDeliveryWithCode
);

// إحصاءات شركة الشحن
router.get("/stats", getShippingStats);

export default router;

// ────────────────────────────────────────────────
// ملاحظات:
//  - GET   /public/default-pricing                     → عام (Checkout)
//  - GET   /orders                                     → طلبات الشحن (محمي)
//  - PUT   /orders/:orderId/status                      → قديم (محمي)
//  - PATCH /orders/:orderId/items/:itemId/status        → جديد (محمي)
//  - POST  /orders/:orderId/items/:itemId/confirm-delivery → تأكيد تسليم (محمي)
//  - GET   /stats                                      → إحصاءات (محمي)
// ────────────────────────────────────────────────
