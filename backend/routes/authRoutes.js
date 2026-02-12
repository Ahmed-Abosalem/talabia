// ────────────────────────────────────────────────
// 📁 backend/routes/authRoutes.js
// مسارات المصادقة للمستخدمين في نظام طلبية (Talabia)
// مع دعم رفع وثيقة الهوية للبائعين أثناء التسجيل
// ملاحظة: هذا المسار يستخدم الآن للتسجيل العام
// للمشتري والبائع فقط، حسب منطق registerUser.
// ────────────────────────────────────────────────

import express from 'express';
import {
  registerUser,
  loginUser,
  getCurrentUser,
  logoutUser,
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { uploadIdentityDocument } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// 🧩 التسجيل
// يدعم الآن:
// - الطلبات العادية application/json
// - أو multipart/form-data مع حقل ملف باسم idDocument للبائعين
// إذا تم إرسال ملف، سيتم حفظه في uploads/ids وربط مساره في authController
router.post(
  '/register',
  uploadIdentityDocument.single('idDocument'),
  registerUser
);

// 🔐 تسجيل الدخول
router.post('/login', loginUser);

// 👤 بيانات المستخدم الحالي
router.get('/me', protect, getCurrentUser);

// 🚪 تسجيل الخروج
router.post('/logout', protect, logoutUser);

export default router;

// ────────────────────────────────────────────────
// ✅ يستخدم Middleware للتحقق من JWT لمسار /me و /logout.
// ✅ مسار /register جاهز لاستخدامه من الواجهة مع أو بدون رفع وثيقة هوية.
// ✅ متكامل مع uploadMiddleware.js و authController.js ومنطق إدارة البائعين.
// ────────────────────────────────────────────────
