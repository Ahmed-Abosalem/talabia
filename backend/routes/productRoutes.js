// ────────────────────────────────────────────────
// 📁 backend/routes/productRoutes.js
// مسارات المنتجات في نظام طلبية (Talabia)
// تربط بين ProductController والواجهة الأمامية (Buyer / Seller / Admin)
// ────────────────────────────────────────────────

import express from "express";
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  updateProductStatus,
} from "../controllers/productController.js";
import { protect } from "../middleware/authMiddleware.js";
import { allowRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

// 📦 جلب قائمة المنتجات
// - عام (بدون توثيق): يستخدمه واجهة المشتري والصفحة الرئيسية
// - لو تم استدعاؤه من الأدمن مع توثيق مناسب يمكنه رؤية المنتجات الموقوفة أيضاً
router.get("/", getProducts);

// 🛍️ جلب منتج واحد بالتعرّف (للجميع)
router.get("/:id", getProductById);

// ➕ إنشاء منتج جديد (فقط للبائع أو الأدمن)
// يستخدمه SellerDashboard عبر productService / sellerService
router.post("/", protect, allowRoles("seller", "admin"), createProduct);

// ✏️ تحديث منتج كامل (اسم، وصف، سعر، صور، ...)
router.put("/:id", protect, allowRoles("seller", "admin"), updateProduct);

// 🔁 تحديث حالة المنتج (نشط / غير نشط)
// يُستدعى من الواجهة:
// PATCH /api/products/:id/status
router.patch(
  "/:id/status",
  protect,
  allowRoles("seller", "admin"),
  updateProductStatus
);

// 🗑️ حذف منتج
router.delete("/:id", protect, allowRoles("seller", "admin"), deleteProduct);

export default router;
