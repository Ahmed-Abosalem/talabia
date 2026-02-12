// ────────────────────────────────────────────────
// 📁 admin/adminSecurityController.js
// إدارة المشرفين (الأمان والصلاحيات / إدارة الموظفين)
// ────────────────────────────────────────────────

import asyncHandler from 'express-async-handler';
import User from '../../models/User.js';
import { normalizePermissions } from './adminHelpers.js';

// دالة مساعدة للتحقق أن المنفِّذ هو مدير النظام (مالك المتجر)
const assertOwner = (req, res) => {
  if (!req.user || req.user.role !== 'admin' || !req.user.isOwner) {
    res.status(403);
    throw new Error('هذه العملية متاحة لمدير النظام فقط.');
  }
};

// GET /api/admin/admins
export const getAdminStaffList = asyncHandler(async (req, res) => {
  // هذه العملية متاحة للمدير فقط
  assertOwner(req, res);

  // لا نعرض مدير النظام ضمن قائمة الموظفين
  const admins = await User.find({ role: 'admin', isOwner: { $ne: true } })
    .select('-password')
    .sort({ createdAt: -1 });

  res.json({ admins });
});

// POST /api/admin/admins
export const createAdminStaff = asyncHandler(async (req, res) => {
  // هذه العملية متاحة للمدير فقط
  assertOwner(req, res);

  const { name, email, password, title, permissions, phone, staffCode } =
    req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error('الاسم، البريد الإلكتروني، وكلمة المرور حقول إلزامية.');
  }

  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    res.status(400);
    throw new Error('هذا البريد الإلكتروني مستخدم بالفعل.');
  }

  const normalizedPermissions = normalizePermissions(permissions || {});

  const admin = await User.create({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password,
    role: 'admin',
    title: title?.trim() || '',
    phone: phone?.trim() || undefined,
    staffCode: staffCode?.toString().trim() || '',
    permissions: normalizedPermissions,
    isActive: true,
    // أي حساب يتم إنشاؤه من هنا هو "موظف" وليس مدير النظام
    isOwner: false,
  });

  const safeAdmin = await User.findById(admin._id).select('-password');

  res.status(201).json({ admin: safeAdmin });
});

// PUT /api/admin/admins/:id/permissions
// ✅ الآن: تحديث بيانات الموظف الإداري (الاسم/البريد/الهاتف/الكود/المسمى)
// ✅ بالإضافة إلى تحديث صلاحياته في آنٍ واحد
export const updateAdminStaffPermissions = asyncHandler(async (req, res) => {
  // هذه العملية متاحة للمدير فقط
  assertOwner(req, res);

  const admin = await User.findById(req.params.id);

  if (!admin || admin.role !== 'admin') {
    res.status(404);
    throw new Error('المشرف غير موجود');
  }

  // منع تعديل مدير النظام الأعلى من هنا
  if (admin.isOwner) {
    res.status(400);
    throw new Error('لا يمكن تعديل بيانات مدير النظام الأعلى من هنا.');
  }

  const {
    name,
    email,
    phone,
    staffCode,
    title,
    permissions,
  } = req.body;

  // التحقق من البريد الإلكتروني إن تم إرساله
  if (typeof email !== 'undefined') {
    const trimmedEmail = email.toLowerCase().trim();
    if (!trimmedEmail) {
      res.status(400);
      throw new Error('البريد الإلكتروني لا يمكن أن يكون فارغاً.');
    }

    // إذا تم تغييره، نتحقق من عدم تكراره
    if (trimmedEmail !== admin.email.toLowerCase()) {
      const existing = await User.findOne({
        email: trimmedEmail,
        _id: { $ne: admin._id },
      });
      if (existing) {
        res.status(400);
        throw new Error('هذا البريد الإلكتروني مستخدم بالفعل.');
      }
    }

    admin.email = trimmedEmail;
  }

  // التحقق من الاسم إن تم إرساله
  if (typeof name !== 'undefined') {
    if (!name.trim()) {
      res.status(400);
      throw new Error('الاسم لا يمكن أن يكون فارغاً.');
    }
    admin.name = name.trim();
  }

  // تحديث الهاتف إن تم إرساله
  if (typeof phone !== 'undefined') {
    admin.phone = phone ? phone.trim() : undefined;
  }

  // تحديث رقم الصلاحية إن تم إرساله
  if (typeof staffCode !== 'undefined') {
    admin.staffCode = staffCode?.toString().trim() || '';
  }

  // تحديث المسمّى الوظيفي إن تم إرساله
  if (typeof title !== 'undefined') {
    admin.title = title?.trim() || '';
  }

  // تحديث الصلاحيات:
  // - إذا أُرسلت صلاحيات جديدة: نطبّقها بعد normalizePermissions
  // - إذا لم تُرسل: نطبّق normalizePermissions على الموجودة (لضمان الشكل)
  const normalizedPermissions = normalizePermissions(
    typeof permissions !== 'undefined' ? permissions : (admin.permissions || {})
  );
  admin.permissions = normalizedPermissions;

  await admin.save();
  const safeAdmin = await User.findById(admin._id).select('-password');

  res.json({ admin: safeAdmin });
});

// PUT /api/admin/admins/:id/toggle-status
export const toggleAdminStaffStatus = asyncHandler(async (req, res) => {
  // هذه العملية متاحة للمدير فقط
  assertOwner(req, res);

  const admin = await User.findById(req.params.id);

  if (!admin || admin.role !== 'admin') {
    res.status(404);
    throw new Error('المشرف غير موجود');
  }

  // منع إيقاف مدير النظام الأعلى
  if (admin.isOwner) {
    res.status(400);
    throw new Error('لا يمكن إيقاف مدير النظام الأعلى.');
  }

  // منع إيقاف المشرف الحالي نفسه (حتى لو كان مديرًا أو موظفًا)
  if (admin._id.toString() === req.user._id.toString()) {
    res.status(400);
    throw new Error('لا يمكنك إيقاف حسابك أنت من هنا.');
  }

  admin.isActive = !admin.isActive;
  await admin.save();

  const safeAdmin = await User.findById(admin._id).select('-password');

  res.json({ admin: safeAdmin });
});

// DELETE /api/admin/admins/:id
export const deleteAdminStaff = asyncHandler(async (req, res) => {
  // هذه العملية متاحة للمدير فقط
  assertOwner(req, res);

  const admin = await User.findById(req.params.id);

  if (!admin || admin.role !== 'admin') {
    res.status(404);
    throw new Error('المشرف غير موجود');
  }

  // منع حذف مدير النظام الأعلى
  if (admin.isOwner) {
    res.status(400);
    throw new Error('لا يمكن حذف مدير النظام الأعلى.');
  }

  // منع حذف الحساب الحالي
  if (admin._id.toString() === req.user._id.toString()) {
    res.status(400);
    throw new Error('لا يمكنك حذف حسابك أنت.');
  }

  const adminCount = await User.countDocuments({ role: 'admin' });
  if (adminCount <= 1) {
    res.status(400);
    throw new Error('لا يمكن حذف آخر مشرف في النظام.');
  }

  await admin.deleteOne();

  res.json({ message: 'تم حذف المشرف بنجاح.' });
});
