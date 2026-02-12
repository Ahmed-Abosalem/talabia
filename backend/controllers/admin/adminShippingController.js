// ────────────────────────────────────────────────
// 📁 admin/adminShippingController.js
// إدارة شركات الشحن
// ────────────────────────────────────────────────

import asyncHandler from 'express-async-handler';
import User from '../../models/User.js';
import ShippingCompany from '../../models/ShippingCompany.js';

// GET /api/admin/shipping-companies
export const getAdminShippingCompanies = asyncHandler(async (req, res) => {
  const companies = await ShippingCompany.find()
    .populate('user', 'name email phone role isActive')
    .populate('stores', 'name')
    .sort({ createdAt: -1 });

  res.json({ companies });
});

// POST /api/admin/shipping-companies
export const createShippingCompany = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    phone,
    password,
    logo,
    coverageAreas,
    pricing,
    headquarters,
    contactName,
    contactRelation,
    documentType,
    documentNumber,
    scope,
    storeIds,
    isActive,
  } = req.body;

  if (!name || !email || !phone || !password) {
    res.status(400);
    throw new Error(
      'الاسم، البريد الإلكتروني، رقم الهاتف، وكلمة المرور حقول إلزامية لإنشاء شركة الشحن.'
    );
  }

  const normalizedEmail = email.toLowerCase().trim();
  const normalizedName = name.trim();
  const normalizedPhone = phone.trim();

  // التأكد من عدم تكرار البريد في المستخدمين
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    res.status(400);
    throw new Error('يوجد مستخدم مرتبط بهذا البريد الإلكتروني بالفعل.');
  }

  // التأكد من عدم تكرار البريد في شركات الشحن
  const existingCompany = await ShippingCompany.findOne({ email: normalizedEmail });
  if (existingCompany) {
    res.status(400);
    throw new Error('يوجد شركة شحن مسجلة بهذا البريد الإلكتروني بالفعل.');
  }

  let user = null;
  let company = null;

  try {
    // 1) إنشاء مستخدم بدور shipper
    user = await User.create({
      name: normalizedName,
      email: normalizedEmail,
      password,
      role: 'shipper',
      phone: normalizedPhone,
      isActive: typeof isActive === 'boolean' ? isActive : true,
    });

    // 2) تحديد النطاق والمتاجر المرتبطة
    let finalScope = 'global';
    let stores = [];

    if (scope === 'seller-specific') {
      finalScope = 'seller-specific';
      if (Array.isArray(storeIds) && storeIds.length > 0) {
        stores = storeIds;
      }
    }

    // 3) إنشاء شركة شحن مربوطة بهذا المستخدم
    const companyPayload = {
      name: normalizedName,
      email: normalizedEmail,
      phone: normalizedPhone,
      logo: logo || '',
      user: user._id,
      isActive: typeof isActive === 'boolean' ? isActive : true,
      scope: finalScope,
    };

    if (stores.length > 0) {
      companyPayload.stores = stores;
    }

    // بيانات تعريفية إضافية
    if (headquarters && typeof headquarters === 'string') {
      companyPayload.headquarters = headquarters.trim();
    }
    if (contactName && typeof contactName === 'string') {
      companyPayload.contactName = contactName.trim();
    }
    if (contactRelation && typeof contactRelation === 'string') {
      companyPayload.contactRelation = contactRelation.trim();
    }
    if (documentType && typeof documentType === 'string') {
      companyPayload.documentType = documentType.trim();
    }
    if (documentNumber && typeof documentNumber === 'string') {
      companyPayload.documentNumber = documentNumber.trim();
    }

    if (Array.isArray(coverageAreas)) {
      companyPayload.coverageAreas = coverageAreas;
    }

    if (pricing && typeof pricing === 'object') {
      companyPayload.pricing = pricing;
    }

    company = await ShippingCompany.create(companyPayload);

    const safeCompany = await ShippingCompany.findById(company._id)
      .populate('user', 'name email phone role isActive')
      .populate('stores', 'name');

    res.status(201).json({ company: safeCompany });
  } catch (err) {
    // في حال فشل إنشاء الشركة بعد إنشاء المستخدم → نحاول تنظيف المستخدم
    if (user && user._id) {
      try {
        await User.findByIdAndDelete(user._id);
      } catch {
        // تجاهل خطأ التنظيف في هذا الموضع
      }
    }
    throw err;
  }
});

// PUT /api/admin/shipping-companies/:id
export const updateShippingCompany = asyncHandler(async (req, res) => {
  const company = await ShippingCompany.findById(req.params.id);

  if (!company) {
    res.status(404);
    throw new Error('شركة الشحن غير موجودة');
  }

  const {
    name,
    email,
    phone,
    logo,
    coverageAreas,
    pricing,
    isActive,
    headquarters,
    contactName,
    contactRelation,
    documentType,
    documentNumber,
    scope,
    storeIds,
  } = req.body;

  const userId = company.user;

  // سنجمع التحديثات التي تُطبق على المستخدم المرتبط أيضاً
  const userUpdate = {};

  // تحديث البريد الإلكتروني مع التأكد من عدم التكرار
  if (email && email.trim()) {
    const normalizedEmail = email.toLowerCase().trim();
    if (normalizedEmail !== company.email) {
      const existingUser = await User.findOne({
        email: normalizedEmail,
        _id: { $ne: userId },
      });

      if (existingUser) {
        res.status(400);
        throw new Error('يوجد مستخدم آخر مسجل بهذا البريد الإلكتروني.');
      }

      const existingCompany = await ShippingCompany.findOne({
        email: normalizedEmail,
        _id: { $ne: company._id },
      });

      if (existingCompany) {
        res.status(400);
        throw new Error('يوجد شركة شحن أخرى مسجلة بهذا البريد الإلكتروني.');
      }

      company.email = normalizedEmail;
      if (userId) {
        userUpdate.email = normalizedEmail;
      }
    }
  }

  // تحديث الاسم
  if (name && name.trim()) {
    company.name = name.trim();
    if (userId) {
      userUpdate.name = name.trim();
    }
  }

  // تحديث رقم الهاتف
  if (phone && phone.trim()) {
    company.phone = phone.trim();
    if (userId) {
      userUpdate.phone = phone.trim();
    }
  }

  // الشعار
  if (typeof logo !== 'undefined') {
    company.logo = logo || '';
  }

  // بيانات تعريفية
  if (typeof headquarters === 'string') {
    company.headquarters = headquarters.trim();
  }
  if (typeof contactName === 'string') {
    company.contactName = contactName.trim();
  }
  if (typeof contactRelation === 'string') {
    company.contactRelation = contactRelation.trim();
  }
  if (typeof documentType === 'string') {
    company.documentType = documentType.trim();
  }
  if (typeof documentNumber === 'string') {
    company.documentNumber = documentNumber.trim();
  }

  // مناطق التغطية
  if (Array.isArray(coverageAreas)) {
    company.coverageAreas = coverageAreas;
  }

  // تسعير الشحن
  if (pricing && typeof pricing === 'object') {
    company.pricing = {
      ...company.pricing?.toObject?.(),
      ...company.pricing,
      ...pricing,
    };
  }

  // تفعيل / إيقاف
  if (typeof isActive === 'boolean') {
    company.isActive = isActive;
    if (userId) {
      userUpdate.isActive = isActive;
    }
  }

  // نطاق العمل والمتاجر المرتبطة
  if (scope === 'global') {
    company.scope = 'global';
    company.stores = [];
  } else if (scope === 'seller-specific') {
    company.scope = 'seller-specific';
    if (Array.isArray(storeIds)) {
      company.stores = storeIds;
    }
  }

  // حفظ الشركة
  await company.save();

  // مزامنة بيانات المستخدم المرتبط إن وُجدت تحديثات له
  if (userId && Object.keys(userUpdate).length > 0) {
    await User.findByIdAndUpdate(userId, userUpdate);
  }

  const safeCompany = await ShippingCompany.findById(company._id)
    .populate('user', 'name email phone role isActive')
    .populate('stores', 'name');

  res.json({ company: safeCompany });
});

// PUT /api/admin/shipping-companies/:id/toggle
export const toggleShippingCompany = asyncHandler(async (req, res) => {
  const company = await ShippingCompany.findById(req.params.id);

  if (!company) {
    res.status(404);
    throw new Error('شركة الشحن غير موجودة');
  }

  company.isActive = !company.isActive;
  await company.save();

  if (company.user) {
    try {
      await User.findByIdAndUpdate(company.user, {
        isActive: company.isActive,
      });
    } catch {
      // لو فشل التحديث لا نمنع استجابة الشركة
    }
  }

  const safeCompany = await ShippingCompany.findById(company._id)
    .populate('user', 'name email phone role isActive')
    .populate('stores', 'name');

  res.json({ company: safeCompany });
});

// DELETE /api/admin/shipping-companies/:id
export const deleteShippingCompany = asyncHandler(async (req, res) => {
  const company = await ShippingCompany.findById(req.params.id);

  if (!company) {
    res.status(404);
    throw new Error('شركة الشحن غير موجودة');
  }

  const userId = company.user;

  // إيقاف حساب المستخدم المرتبط بدلاً من حذفه لإبقاء السجل محفوظاً
  if (userId) {
    try {
      await User.findByIdAndUpdate(userId, { isActive: false });
    } catch {
      // تجاهل الخطأ في تعطيل المستخدم
    }
  }

  await company.deleteOne();

  res.json({ message: 'تم حذف شركة الشحن بنجاح.' });
});
