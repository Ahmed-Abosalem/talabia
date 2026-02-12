// ────────────────────────────────────────────────
// 📁 backend/routes/notificationRoutes.js
// مسارات الإشعارات في نظام طلبية (Talabia)
// ────────────────────────────────────────────────

import express from 'express';
import {
  getNotifications,
  createNotification,
  markAsRead,
  markAllAsRead,
} from '../controllers/notificationController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// جلب كل إشعارات المستخدم الحالي
router.get('/', protect, getNotifications);

// إنشاء إشعار جديد للمستخدم الحالي (تستخدم غالباً للاختبار/التطوير)
router.post('/', protect, createNotification);

// تحديد إشعار واحد كمقروء
router.put('/:id/read', protect, markAsRead);

// تحديد كل إشعارات المستخدم الحالي كمقروءة
router.put('/mark-all-read', protect, markAllAsRead);

export default router;

// ────────────────────────────────────────────────
// ✅ تربط بين واجهة React ونظام الإشعارات.
// ✅ تدعم تحديد إشعار واحد أو جميع الإشعارات كمقروءة.
// ────────────────────────────────────────────────
