// ────────────────────────────────────────────────
// 📁 admin/adminSellersController.js
// إدارة البائعين (Stores / Sellers)
// ────────────────────────────────────────────────

import mongoose from 'mongoose';
import asyncHandler from 'express-async-handler';
import Store from '../../models/Store.js';
import Product from '../../models/Product.js';
import Order from '../../models/Order.js';
import Notification from '../../models/Notification.js';

// GET /api/admin/sellers/:id
export const getAdminSellerById = asyncHandler(async (req, res) => {
  const store = await Store.findById(req.params.id).populate(
    'owner',
    'name email phone role isActive nationality birthDate idType idNumber idIssuer idDocumentUrl address'
  );

  if (!store) {
    res.status(404);
    throw new Error('المتجر غير موجود');
  }

  res.json({ seller: store });
});

// GET /api/admin/sellers
export const getAdminSellers = asyncHandler(async (req, res) => {
  const { status, search } = req.query;

  const filter = {};

  // فلترة حسب حالة المتجر إن أُرسلت وكانت من القيم المعروفة
  const allowedStatuses = ['pending', 'approved', 'rejected', 'suspended'];
  if (status && status !== 'all' && allowedStatuses.includes(status)) {
    filter.status = status;
  }

  // البحث بالاسم/اسم المتجر
  if (search && search.trim()) {
    const regex = new RegExp(search.trim(), 'i');
    filter.$or = [{ name: regex }];
  }

  const stores = await Store.find(filter)
    .populate(
      'owner',
      // بيانات الهوية + العنوان + رابط الوثيقة
      'name email phone role isActive nationality birthDate idType idNumber idIssuer idDocumentUrl address'
    )
    .sort({ createdAt: -1 });

  res.json({ sellers: stores });
});

// PUT /api/admin/sellers/:id/status
export const updateSellerStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const store = await Store.findById(req.params.id).populate('owner');

  if (!store) {
    res.status(404);
    throw new Error('المتجر غير موجود');
  }

  if (!status) {
    res.status(400);
    throw new Error('حقل الحالة (status) مطلوب');
  }

  const allowedStatuses = ['pending', 'approved', 'rejected', 'suspended'];
  if (!allowedStatuses.includes(status)) {
    res.status(400);
    throw new Error('قيمة الحالة غير صحيحة.');
  }

  store.status = status;

  // تفعيل/إيقاف المالك تبعاً للحالة
  if (store.owner) {
    if (status === 'approved') {
      store.owner.role = store.owner.role || 'seller';
      store.owner.isActive = true;
    } else if (status === 'suspended' || status === 'rejected') {
      store.owner.isActive = false;
    }
    await store.owner.save();
  }

  await store.save();

  // 🔔 إرسال إشعار للمالك بالتحديث اليدوي
  if (store.owner) {
    if (status === 'approved') {
      await Notification.create({
        user: store.owner._id,
        title: 'تم تفعيل حساب المتجر ✅',
        message: `تم إعادة تفعيل متجرك "${store.name}". يمكنك الآن ممارسة نشاطك التجاري كالمعتاد.`,
        type: 'system'
      });
    } else if (status === 'suspended') {
      await Notification.create({
        user: store.owner._id,
        title: 'تنبيه: تم إيقاف المتجر مؤقتاً ⚠️',
        message: `تم إيقاف متجرك "${store.name}" مؤقتاً من قبل الإدارة. يرجى التواصل مع الدعم الفني للمزيد من التفاصيل.`,
        type: 'system'
      });
    }
  }

  res.json({ store });
});

// PUT /api/admin/sellers/:id/approve
export const approveSeller = asyncHandler(async (req, res) => {
  const store = await Store.findById(req.params.id).populate('owner');

  if (!store) {
    res.status(404);
    throw new Error('المتجر غير موجود');
  }

  store.status = 'approved';
  store.rejectionReason = '';
  store.isActive = true;

  if (store.owner) {
    store.owner.role = store.owner.role || 'seller';
    store.owner.isActive = true;
    await store.owner.save();
  }

  await store.save();

  // 🔔 إرسال إشعار للمالك بالقبول
  if (store.owner) {
    await Notification.create({
      user: store.owner._id,
      title: 'تم تفعيل متجرك بنجاح 🎉',
      message: `تهانينا! تم قبول طلبك لتفعيل متجر "${store.name}". يمكنك الآن البدء بإضافة المنتجات والبيع عبر المنصة.`,
      type: 'system'
    });
  }

  res.json({ store });
});

// PUT /api/admin/sellers/:id/reject
export const rejectSeller = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const store = await Store.findById(req.params.id).populate('owner');

  if (!store) {
    res.status(404);
    throw new Error('المتجر غير موجود');
  }

  if (!reason || !reason.trim()) {
    res.status(400);
    throw new Error('يجب إدخال سبب الرفض.');
  }

  store.status = 'rejected';
  store.isActive = false;
  store.rejectionReason = reason.trim();

  if (store.owner) {
    store.owner.isActive = false;
    await store.owner.save();
  }

  await store.save();

  // 🔔 إرسال إشعار للمالك بالرفض مع السبب
  if (store.owner) {
    await Notification.create({
      user: store.owner._id,
      title: 'بخصوص طلب تفعيل المتجر ⚠️',
      message: `تم رفض طلبك لتفعيل متجر "${store.name}". سبب الرفض: ${reason.trim()}. يرجى معالجة الملاحظات وإعادة المحاولة.`,
      type: 'system'
    });
  }

  res.json({ store });
});

// GET /api/admin/sellers/:id/stats
export const getAdminSellerStats = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const store = await Store.findById(id);
  if (!store) {
    res.status(404);
    throw new Error('المتجر غير موجود');
  }

  // 1. إحصائيات المنتجات (Products) المجمعة بعملية واحدة
  const productStatsRaw = await Product.aggregate([
    { $match: { store: new mongoose.Types.ObjectId(id) } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        active: { $sum: { $cond: [{ $and: [{ $eq: ["$isActive", true] }, { $eq: ["$adminLocked", false] }] }, 1, 0] } },
        inactive: { $sum: { $cond: [{ $eq: ["$isActive", false] }, 1, 0] } },
        locked: { $sum: { $cond: [{ $eq: ["$adminLocked", true] }, 1, 0] } }
      }
    }
  ]);

  const productStats = productStatsRaw[0] || { total: 0, active: 0, inactive: 0, locked: 0 };
  delete productStats._id;

  // 2. إحصائيات الطلبات (Orders)
  const orderStatsRaw = await Order.aggregate([
    { $unwind: "$orderItems" },
    { $match: { "orderItems.store": new mongoose.Types.ObjectId(id) } },
    {
      $group: {
        _id: "$orderItems.statusCode",
        count: { $sum: 1 }
      }
    }
  ]);

  const orderStats = {};
  orderStatsRaw.forEach(item => {
    if (item._id) {
      orderStats[item._id] = item.count;
    }
  });

  res.json({
    products: productStats,
    orders: orderStats
  });
});
