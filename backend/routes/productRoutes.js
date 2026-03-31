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
  trackCartAddition,
  getProductRecommendations,
} from "../controllers/productController.js";
import { protect, optionalProtect } from "../middleware/authMiddleware.js";
import {
  uploadProductImage,
  handleMulterError,
} from "../middleware/uploadMiddleware.js";

const router = express.Router();

// 📦 جلب قائمة المنتجات
// - عام (بدون توثيق): يستخدمه واجهة المشتري والصفحة الرئيسية
// - لو تم استدعاؤه من الأدمن مع توثيق مناسب يمكنه رؤية المنتجات الموقوفة أيضاً
router.get("/", getProducts);

// 🛍️ جلب منتج واحد بالتعرّف (للجميع)
router.get("/:id", optionalProtect, getProductById);

// 🧠 محرك التوصيات المتقدم
router.get("/:id/recommendations", getProductRecommendations);

// ➕ إنشاء منتج جديد (فقط للبائع أو الأدمن)
// يستخدمه SellerDashboard عبر productService / sellerService
router.post(
  "/",
  protect,
  allowRoles("seller", "admin"),
  uploadProductImage.array("images", 10),
  handleMulterError,
  createProduct
);

// ✏️ تحديث منتج كامل (اسم، وصف، سعر، صور، ...)
router.put(
  "/:id",
  protect,
  allowRoles("seller", "admin"),
  uploadProductImage.array("images", 10),
  handleMulterError,
  updateProduct
);

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
