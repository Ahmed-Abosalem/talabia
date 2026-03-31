// ────────────────────────────────────────────────
// 📁 admin/adminNotificationsController.js
// إدارة التنبيهات (حملات النظام + تنبيهات الموظفين + تنبيهات لمستخدم معيّن)
// ────────────────────────────────────────────────

import asyncHandler from 'express-async-handler';
import Notification from '../../models/Notification.js';
import User from '../../models/User.js';

// GET /api/admin/notifications
export const getAdminNotifications = asyncHandler(async (req, res) => {
  // نعرض فقط سجلات الحملات (التي تملك audience) مع pagination إنتاجي
  const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
  const limitRaw = Number.parseInt(req.query.limit, 10) || 20;
  const limit = Math.min(Math.max(limitRaw, 1), 100);
  const skip = (page - 1) * limit;

  const filter = { audience: { $exists: true, $ne: null } };

  const [notifications, total] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Notification.countDocuments(filter),
  ]);

  const totalPages = Math.max(Math.ceil(total / limit), 1);

  res.json({
    notifications,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  });
});

// POST /api/admin/notifications
// ملاحظة:
// - في حالة وجود adminId في الـ body → يتم إرسال تنبيه لموظف معيّن فقط.
// - في حالة وجود userId في الـ body → يتم إرسال تنبيه لمستخدم معيّن (مشتري، بائع، شركة شحن، أو أدمن عادي).
// - في حالة عدم وجود adminId أو userId → يتم التعامل معها كحملة عامة (audience) كما كان سابقًا.
export const createAdminNotification = asyncHandler(async (req, res) => {
  const { title, message, audience, adminId, userId } = req.body;

  if (!title || !title.trim() || !message || !message.trim()) {
    res.status(400);
    throw new Error('عنوان التنبيه ومحتواه حقول إلزامية.');
  }

  const cleanTitle = title.trim();
  const cleanMessage = message.trim();

  // 1️⃣ إذا تم تمرير adminId → إرسال تنبيه لموظف (أدمن) معيّن فقط
  if (adminId) {
    const admin = await User.findById(adminId).select(
      '_id role isOwner isActive'
    );

    if (!admin || admin.role !== 'admin' || admin.isOwner === true) {
      res.status(404);
      throw new Error('الموظف الإداري المستهدف غير موجود.');
    }

    // يمكن لاحقًا منع إرسال التنبيهات للحسابات الموقوفة إذا رغبت
    const userNotification = await Notification.create({
      user: admin._id,
      title: cleanTitle,
      message: cleanMessage,
      type: 'system',
      link: '',
      isRead: false,
    });

    return res.status(201).json({ notification: userNotification });
  }

  // 2️⃣ إذا تم تمرير userId → إرسال تنبيه لمستخدم معيّن (أيًا كان دوره)
  if (userId) {
    const targetUser = await User.findById(userId).select(
      '_id isActive'
    );

    if (!targetUser) {
      res.status(404);
      throw new Error('المستخدم المستهدف غير موجود.');
    }

    // ويمكن لاحقًا منع إرسال التنبيهات للحسابات الموقوفة إن رغبت
    const userNotification = await Notification.create({
      user: targetUser._id,
      title: cleanTitle,
      message: cleanMessage,
      type: 'system',
      link: '',
      isRead: false,
    });

    return res.status(201).json({ notification: userNotification });
  }

  // 3️⃣ في غير ذلك → حملة عامة
  const audienceMap = {
    all: 'all',
    buyers: 'buyers',
    sellers: 'sellers',
    shipping: 'shippers',
  };

  const normalizedAudience = audienceMap[audience] || 'all';

  // 3-أ: إنشاء سجل الحملة (يظهر في جدول AdminNotificationsSection)
  const notificationLog = await Notification.create({
    title: cleanTitle,
    message: cleanMessage,
    audience: normalizedAudience,
    type: 'system',
  });

  // 3-ب: تحديد المستخدمين المستهدفين
  const userFilter = { isActive: true };

  if (normalizedAudience === 'buyers') {
    userFilter.role = 'buyer';
  } else if (normalizedAudience === 'sellers') {
    userFilter.role = 'seller';
  } else if (normalizedAudience === 'shippers') {
    // السائقون بجمهور (shippers) يطابقون رتبة المستخدم (shipper) في قاعدة البيانات
    userFilter.role = 'shipper';
  }

  const targetUsers = await User.find(userFilter).select('_id');

  if (targetUsers.length > 0) {
    // 3-ج: إنشاء إشعار فردي لكل مستخدم
    const userNotifications = targetUsers.map((u) => ({
      user: u._id,
      title: cleanTitle,
      message: cleanMessage,
      type: 'system',
      link: '',
      isRead: false,
    }));

    await Notification.insertMany(userNotifications);
  }

  res.status(201).json({ notification: notificationLog });
});

// DELETE /api/admin/notifications/:id
export const deleteAdminNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.id);

  if (!notification || !notification.audience) {
    // نسمح بحذف فقط سجلات الحملات (التي تحتوي audience)
    res.status(404);
    throw new Error('سجل التنبيه غير موجود.');
  }

  await notification.deleteOne();
  res.json({ message: 'تم حذف التنبيه من سجل الأدمن بنجاح.' });
});
