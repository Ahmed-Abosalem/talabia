import asyncHandler from 'express-async-handler';
import Notification from '../models/Notification.js';

// 🔔 جلب الإشعارات
export const getNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ user: req.user.id }).sort({ createdAt: -1 });
  res.json(notifications);
});

// 📨 إنشاء إشعار جديد للمستخدم الحالي
export const createNotification = asyncHandler(async (req, res) => {
  const { title, message, type, link } = req.body;

  const notification = await Notification.create({
    user: req.user.id,
    title,
    message,
    type,
    link,
  });

  res.status(201).json(notification);
});

// 📍 تحديد إشعار واحد كمقروء
export const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.id);

  if (!notification) {
    res.status(404);
    throw new Error('الإشعار غير موجود');
  }

  // تأكد أن الإشعار يخص المستخدم الحالي
  if (notification.user.toString() !== req.user.id.toString()) {
    res.status(403);
    throw new Error('غير مصرح لك بالوصول إلى هذا الإشعار');
  }

  notification.isRead = true;
  await notification.save();

  res.json({ message: 'تم تحديد الإشعار كمقروء' });
});

// 📚 تحديد كل إشعارات المستخدم الحالي كمقروءة
export const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { user: req.user.id, isRead: false },
    { $set: { isRead: true } }
  );

  res.json({ message: 'تم تحديد جميع الإشعارات كمقروءة' });
});
