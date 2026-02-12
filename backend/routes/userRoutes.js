// ────────────────────────────────────────────────
// 📁 backend/routes/userRoutes.js
// المسارات الكاملة للمستخدمين في نظام طلبية (Talabia)
// ────────────────────────────────────────────────

import express from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  getMe,
  getUserProfile,
  updateUserProfile,
  deleteUserAccount,
  changePassword,
  getUserAddresses,
  createUserAddress,
  updateUserAddress,
  deleteUserAddress,
  updateNotificationPreferences,
  getUserWishlist,
  addProductToWishlist,
  removeProductFromWishlist,
  clearUserWishlist,
  // 🆕 تذاكر الدعم (إدارة التواصل من جهة المستخدم)
  createSupportTicket,
  getMySupportTickets,
} from "../controllers/userController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// ────────────────────────────────────────────────
// 🔐 مصادقة أساسية (قد تكون احتياطية بجانب authRoutes)
// ────────────────────────────────────────────────
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", protect, logoutUser);

// بيانات المستخدم من التوكن
router.get("/me", protect, getMe);

// ────────────────────────────────────────────────
// 📂 الملف الشخصي (عرض – تعديل – حذف)
// ────────────────────────────────────────────────
router
  .route("/profile")
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile)
  .delete(protect, deleteUserAccount);

// ────────────────────────────────────────────────
// 🔒 تغيير كلمة المرور
// ────────────────────────────────────────────────
router.put("/change-password", protect, changePassword);

// ────────────────────────────────────────────────
// 📦 عناوين الشحن
// ────────────────────────────────────────────────
router
  .route("/addresses")
  .get(protect, getUserAddresses)
  .post(protect, createUserAddress);

router
  .route("/addresses/:id")
  .put(protect, updateUserAddress)
  .delete(protect, deleteUserAddress);

// ────────────────────────────────────────────────
// 💖 قائمة المفضلة (Wishlist)
// ────────────────────────────────────────────────
router
  .route("/wishlist")
  .get(protect, getUserWishlist)
  .delete(protect, clearUserWishlist);

router.post("/wishlist/:productId", protect, addProductToWishlist);
router.delete("/wishlist/:productId", protect, removeProductFromWishlist);

// ────────────────────────────────────────────────
// 🔔 تفضيلات الإشعارات
// ────────────────────────────────────────────────
router.put(
  "/notification-preferences",
  protect,
  updateNotificationPreferences
);

// ────────────────────────────────────────────────
// 🆘 تذاكر الدعم (إدارة التواصل من جهة المستخدم)
// ────────────────────────────────────────────────

// إنشاء تذكرة دعم جديدة للمستخدم الحالي
router.post("/support-tickets", protect, createSupportTicket);

// جلب تذاكر الدعم الخاصة بالمستخدم الحالي
router.get("/support-tickets/my", protect, getMySupportTickets);

export default router;

// ────────────────────────────────────────────────
// ✅ المسارات الحساسة محمية بـ JWT (via protect)
// ────────────────────────────────────────────────
