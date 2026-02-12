// ────────────────────────────────────────────────
// 📁 backend/routes/sellerRoutes.js
// مسارات لوحة تحكم البائع في نظام طلبية (Talabia)
// ────────────────────────────────────────────────

import express from "express";
import {
  getSellerDashboard,
  getSellerStore,
  updateSellerStore,
  getSellerProducts,
  updateSellerOrderStatus,
  updateSellerOrderItemStatus,
} from "../controllers/sellerController.js";
import { protect } from "../middleware/authMiddleware.js";
import { allowRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

// ✅ كل مسارات البائع محمية بالبائع فقط
router.use(protect, allowRoles("seller"));

// 📊 لوحة التحكم
// GET /api/seller/dashboard
router.get("/dashboard", getSellerDashboard);

// 🏪 إعدادات المتجر
// GET /api/seller/store   → جلب بيانات المتجر للبائع الحالي
// PUT /api/seller/store   → إنشاء/تحديث إعدادات المتجر
router.get("/store", getSellerStore);
router.put("/store", updateSellerStore);

// 📦 منتجات البائع فقط
// GET /api/seller/products → قائمة منتجات البائع الحالي
router.get("/products", getSellerProducts);

// 🔄 تحديث حالة الطلب من جهة البائع (sellerStatus) على مستوى الطلب كاملًا
// PUT /api/seller/orders/:orderId/status
router.put("/orders/:orderId/status", updateSellerOrderStatus);

// 🔄 تحديث حالة "منتج واحد داخل الطلب" من جهة البائع (Item-based)
// PATCH /api/seller/orders/:orderId/items/:itemId/status
router.patch(
  "/orders/:orderId/items/:itemId/status",
  updateSellerOrderItemStatus
);

export default router;
