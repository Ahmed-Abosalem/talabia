// ────────────────────────────────────────────────
// 📁 admin/adminSellersController.js
// إدارة البائعين (Stores / Sellers)
// ────────────────────────────────────────────────

import asyncHandler from 'express-async-handler';
import Store from '../../models/Store.js';

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

  res.json({ store });
});
