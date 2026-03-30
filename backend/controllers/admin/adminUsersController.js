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
import Notification from '../../models/Notification.js';
import Review from '../../models/Review.js';
import SupportTicket from '../../models/SupportTicket.js';
import Transaction from '../../models/Transaction.js';
import Product from '../../models/Product.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// لتحديد مسار الملفات
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// backend/controllers/admin -> ../../.. -> uploads
const uploadsDir = path.join(__dirname, '..', '..', '..', 'uploads');

// دالة مساعدة لحذف ملف مادي من السيرفر
const safeDeleteFile = (relativePath) => {
  if (!relativePath) return;
  try {
    // نتأكد من المسار النسبي ونزيل أي بادئة /
    const cleanPath = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;

    // المسار الكامل للملف
    const filePath = path.join(uploadsDir, '..', cleanPath); // العودة لمجلد root ثم الدخول للمسار

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    // نتجاهل الخطأ إذا لم يتمكن من الحذف (قد يكون الملف غير موجود أصلاً)
    // console.error(`Failed to delete file: ${relativePath}`, err.message);
  }
};


// GET /api/admin/users
export const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select('-password').sort({ createdAt: -1 });
  res.json({ users });
});


// PUT /api/admin/users/:id/role
export const updateUserRole = asyncHandler(async (req, res) => {
  const targetUser = await User.findById(req.params.id);

  if (!targetUser) {
    res.status(404);
    throw new Error('المستخدم غير موجود');
  }

  const { role } = req.body;
  if (!role) {
    res.status(400);
    throw new Error('حقل الدور (role) مطلوب');
  }

  // 🛡️ حماية مالك النظام (Owner) من أي تغيير في صلا حياته
  if (targetUser.isOwner) {
    res.status(403);
    throw new Error('لا يمكن تغيير صلاحيات مالك النظام الأصلي.');
  }

  // 🛡️ حماية أدوار الأدمن (Admin)
  // لا يسمح إلا للمالك (isOwner: true) بترقية مستخدم إلى أدمن أو تعديل رتبة أدمن موجود
  const currentUser = req.user;
  const isOwnerAction = currentUser && currentUser.isOwner === true;

  if (!isOwnerAction) {
    // إذا لم يكن الفاعل هو المالك:
    // 1. يمنع ترقية أي شخص إلى أدمن
    if (role === 'admin') {
      res.status(403);
      throw new Error('وحده مالك النظام يمكنه منح صلاحية المشرف (Admin).');
    }
    // 2. يمنع تعديل رتبة أي مستخدم هو حالياً أدمن
    if (targetUser.role === 'admin') {
      res.status(403);
      throw new Error('لا تملك صلاحية تعديل رتب المشرفين الآخرين.');
    }
  }

  targetUser.role = role;
  await targetUser.save();

  res.json({
    message: 'تم تحديث صلاحية المستخدم بنجاح',
    user: {
      _id: targetUser._id,
      name: targetUser.name,
      email: targetUser.email,
      role: targetUser.role,
      isActive: targetUser.isActive,
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

  // 🏪 مزامنة حالة المتجر: إذا تم إيقاف البائع، يتم إيقاف متجره فوراً
  if (user.role === 'seller') {
    await Store.updateMany(
      { owner: user._id },
      { status: isActive ? "approved" : "suspended" }
    );
  }

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

  // شركات الشحن المرتبطة بمتاجر البائع (إن كان بائعاً)
  const linkedShippingCompanies = await ShippingCompany.find({
    stores: { $in: stores.map((s) => s._id) }
  }).lean();

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
    linkedShippingCompanies, // إضافة الشركات المرتبطة
    stats: {
      buyerOrdersCount,
      sellerOrdersCount,
      shippingOrdersCount,
      adsCount,
    },
  });
});

// DELETE /api/admin/users/:id (حذف شامل CASCADE DELETE)
export const deleteUserByAdmin = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    res.status(404);
    throw new Error('المستخدم غير موجود');
  }

  // 🛡️ حماية: منع حذف المالك أو المشرف الأعلى
  if (user.role === 'admin' && user.isOwner) {
    res.status(403);
    throw new Error('لا يمكن حذف مالك النظام.');
  }

  // 🛡️ حماية: منع الأدمن من حذف نفسه
  if (user._id.toString() === req.user._id.toString()) {
    res.status(400);
    throw new Error('لا يمكنك حذف حسابك بنفسك من هنا.');
  }


  // 🧹 1. حذف الملفات (Avatar, ID Document)
  if (user.avatar) safeDeleteFile(user.avatar);
  if (user.idDocumentUrl) safeDeleteFile(user.idDocumentUrl);

  // 🧹 2. حذف البيانات المرتبطة (Cascade Delete)

  // - العناوين
  await Address.deleteMany({ user: user._id });

  // - المتاجر (ومنتجاتها)
  const stores = await Store.find({ owner: user._id });
  for (const store of stores) {
    if (store.logo) safeDeleteFile(store.logo);
    if (store.cover) safeDeleteFile(store.cover);

    // حذف منتجات المتجر
    const products = await Product.find({ store: store._id });
    for (const product of products) {
      if (product.images && product.images.length) {
        product.images.forEach(img => safeDeleteFile(img));
      }
      await product.deleteOne();
    }

    // حذف المتجر نفسه
    await store.deleteOne();
  }

  // - شركة الشحن (إذا كان shipper)
  const shippingCompanies = await ShippingCompany.find({ user: user._id });
  for (const company of shippingCompanies) {
    if (company.logo) safeDeleteFile(company.logo);
    await company.deleteOne();
  }

  // - الطلبات (كمشتري)
  await Order.deleteMany({ buyer: user._id });

  // - الإشعارات
  await Notification.deleteMany({ user: user._id });

  // - التقييمات
  await Review.deleteMany({ user: user._id });

  // - تذاكر الدعم
  await SupportTicket.deleteMany({ user: user._id });

  // - الإعلانات
  const ads = await Ad.find({ createdBy: user._id });
  for (const ad of ads) {
    if (ad.image) safeDeleteFile(ad.image);
    await ad.deleteOne();
  }

  // - المعاملات المالية (Transaction)
  await Transaction.deleteMany({ user: user._id });

  // 🗑️ 3. حذف المستخدم نفسه
  await user.deleteOne();


  res.json({ message: 'تم حذف المستخدم وجميع بياناته بنجاح.' });
});
