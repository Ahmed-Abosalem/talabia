// ────────────────────────────────────────────────
// 📁 admin/adminUsersController.js
// إدارة جميع المستخدمين + تفاصيل المستخدم للأدمن
// ────────────────────────────────────────────────

import asyncHandler from 'express-async-handler';
import User from '../../models/User.js';
import Store from '../../models/Store.js';
import Order from '../../models/Order.js';
import ShippingCompany from '../../models/ShippingCompany.js';
import Ad from '../../models/Ad.js';
import Address from '../../models/Address.js';

// GET /api/admin/users
export const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select('-password').sort({ createdAt: -1 });
  res.json({ users });
});

// PUT /api/admin/users/:id/role
export const updateUserRole = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    res.status(404);
    throw new Error('المستخدم غير موجود');
  }

  const { role } = req.body;
  if (!role) {
    res.status(400);
    throw new Error('حقل الدور (role) مطلوب');
  }

  user.role = role;
  await user.save();

  res.json({
    message: 'تم تحديث صلاحية المستخدم',
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    },
  });
});

// PUT /api/admin/users/:id/status
export const updateUserStatus = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    res.status(404);
    throw new Error('المستخدم غير موجود');
  }

  const { isActive } = req.body;

  if (typeof isActive !== 'boolean') {
    res.status(400);
    throw new Error('حقل الحالة (isActive) مطلوب ويجب أن يكون true أو false.');
  }

  // منع الأدمن من إيقاف نفسه (اختياري)
  if (user._id.toString() === req.user._id.toString()) {
    res.status(400);
    throw new Error('لا يمكنك تغيير حالة حسابك أنت من هنا.');
  }

  user.isActive = isActive;
  await user.save();

  const safeUser = await User.findById(user._id).select('-password');

  res.json({
    message: 'تم تحديث حالة المستخدم بنجاح.',
    user: safeUser,
  });
});

// GET /api/admin/users/:id (تفاصيل كاملة للأدمن)
export const getAdminUserDetails = asyncHandler(async (req, res) => {
  const userId = req.params.id;

  const user = await User.findById(userId).select('-password');

  if (!user) {
    res.status(404);
    throw new Error('المستخدم غير موجود');
  }

  // عناوين الشحن الخاصة بالمستخدم
  const addresses = await Address.find({ user: userId })
    .sort({ createdAt: -1 })
    .lean();

  // المتاجر المرتبطة بالمستخدم (إن كان بائعاً)
  const stores = await Store.find({ owner: userId }).lean();

  // شركة الشحن المرتبطة بالمستخدم (إن كان shipper)
  const shippingCompany = await ShippingCompany.findOne({ user: userId }).lean();

  // إحصائيات مختصرة
  const [buyerOrdersCount, sellerOrdersCount, shippingOrdersCount, adsCount] =
    await Promise.all([
      // عدد الطلبات التي قام بها كمشتري
      Order.countDocuments({ buyer: userId }),
      // عدد الطلبات المرتبطة بمتاجر يملكها هذا المستخدم (كبائع)
      stores.length
        ? Order.countDocuments({
            store: { $in: stores.map((s) => s._id) },
          })
        : 0,
      // عدد الطلبات المرتبطة بشركة الشحن الخاصة به
      shippingCompany
        ? Order.countDocuments({ shippingCompany: shippingCompany._id })
        : 0,
      // عدد الإعلانات التي أنشأها (إن وُجدت)
      Ad.countDocuments({ createdBy: userId }),
    ]);

  res.json({
    user,
    addresses,
    store: stores[0] || null,
    stores,
    shippingCompany: shippingCompany || null,
    stats: {
      buyerOrdersCount,
      sellerOrdersCount,
      shippingOrdersCount,
      adsCount,
    },
  });
});
