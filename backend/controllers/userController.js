// ────────────────────────────────────────────────
// 📁 backend/controllers/userController.js
// التحكم في بيانات المستخدم في نظام طلبية (Talabia)
// ────────────────────────────────────────────────

import asyncHandler from "express-async-handler";
import User from "../models/User.js";
import Address from "../models/Address.js";
import generateToken from "../utils/generateToken.js";
import SupportTicket from "../models/SupportTicket.js"; // ✅ تذاكر الدعم

// ────────────────────────────────────────────────
// 🔐 تسجيل مستخدم جديد (مبسّط – يمكن أن يكون بديل احتياطي)
// ────────────────────────────────────────────────
export const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const normalizedEmail = (email || "").toLowerCase().trim();
  const normalizedName = (name || "").trim();

  if (!normalizedName || !normalizedEmail || !password) {
    res.status(400);
    throw new Error("الاسم، البريد الإلكتروني، وكلمة المرور حقول مطلوبة");
  }

  if (String(password).length < 6) {
    res.status(400);
    throw new Error("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
  }

  // توحيد الإيميل في البحث لمنع اختلاف حالة الأحرف
  const userExists = await User.findOne({ email: normalizedEmail });
  if (userExists) {
    res.status(400);
    throw new Error("المستخدم موجود بالفعل");
  }

  const user = await User.create({
    name: normalizedName,
    email: normalizedEmail,
    password,
  });

  if (user) {
    res.status(201).json({
      _id: user._id,
      name: user.name,
      fullName: user.name,
      email: user.email,
      phone: user.phone || "",
      role: user.role,
      country: user.country || "",
      token: generateToken(user._id),
    });
  } else {
    res.status(400);
    throw new Error("بيانات المستخدم غير صالحة");
  }
});

// ────────────────────────────────────────────────
// 🔑 تسجيل الدخول
// ────────────────────────────────────────────────
export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const normalizedEmail = (email || "").toLowerCase().trim();

  if (!normalizedEmail || !password) {
    res.status(400);
    throw new Error("البريد الإلكتروني وكلمة المرور مطلوبان");
  }

  // نفترض أن User.js يحتوي على دالة matchPassword
  const user = await User.findOne({ email: normalizedEmail }).select("+password");

  // ✅ منع تسجيل الدخول للحسابات الموقوفة (حرج قبل النشر لأن هذا مسار دخول بديل عن /api/auth/login)
  if (user && user.isActive === false) {
    res.status(403);
    throw new Error("هذا الحساب موقوف");
  }

  if (user && (await user.matchPassword(password))) {
    res.json({
      _id: user._id,
      name: user.name,
      fullName: user.name,
      email: user.email,
      phone: user.phone || "",
      role: user.role,
      country: user.country || "",
      token: generateToken(user._id),
    });
  } else {
    res.status(401);
    throw new Error("بيانات الدخول غير صحيحة");
  }
});

// ────────────────────────────────────────────────
// 🚪 تسجيل الخروج (اختياري – حسب استخدام الواجهة)
// ────────────────────────────────────────────────
export const logoutUser = asyncHandler(async (req, res) => {
  // إذا كنت تستخدم كوكيز JWT يمكن هنا مسح الكوكي
  // حالياً نرجع رسالة بسيطة
  res.json({ message: "تم تسجيل الخروج بنجاح" });
});

// ────────────────────────────────────────────────
// 👤 getMe – جلب بيانات المستخدم الحالي من التوكن
// ────────────────────────────────────────────────
export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("-password");
  if (!user) {
    res.status(404);
    throw new Error("المستخدم غير موجود");
  }

  res.json({
    _id: user._id,
    name: user.name,
    fullName: user.name,
    email: user.email,
    phone: user.phone || "",
    role: user.role,
    country: user.country || "",
  });
});

// ────────────────────────────────────────────────
// 📂 الملف الشخصي – عرض
// ────────────────────────────────────────────────
export const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("-password");

  if (!user) {
    res.status(404);
    throw new Error("المستخدم غير موجود");
  }

  const notificationPreferences =
    user.notificationPreferences || {
      email: true,
      sms: false,
      push: true,
    };

  res.json({
    _id: user._id,
    name: user.name,
    fullName: user.name,
    email: user.email,
    phone: user.phone || "",
    role: user.role,
    country: user.country || "",
    notificationPreferences,
  });
});

// ────────────────────────────────────────────────
// 📂 الملف الشخصي – تعديل (الاسم / البريد / الجوال)
// يدعم fullName القادمة من الواجهة
// ────────────────────────────────────────────────
export const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(404);
    throw new Error("المستخدم غير موجود");
  }

  const fullName = req.body.fullName || req.body.name;
  const email = req.body.email;
  const phone = req.body.phone;
  const country = req.body.country;

  if (fullName) user.name = fullName;
  if (email) user.email = email;
  if (typeof phone !== "undefined") {
    user.phone = phone;
  }
  if (typeof country !== "undefined") {
    user.country = country;
  }

  // دعم تغيير كلمة المرور من هنا أيضاً (اختياري)
  if (req.body.password) {
    user.password = req.body.password;
  }

  const updatedUser = await user.save();

  res.json({
    _id: updatedUser._id,
    name: updatedUser.name,
    fullName: updatedUser.name,
    email: updatedUser.email,
    phone: updatedUser.phone || "",
    role: updatedUser.role,
    country: updatedUser.country || "",
  });
});

// ────────────────────────────────────────────────
// 🔒 تغيير كلمة المرور
// مستخدم من BuyerDashboard عبر userService.changePassword
// ────────────────────────────────────────────────
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    res.status(400);
    throw new Error("يجب إدخال كلمة المرور الحالية والجديدة");
  }

  const user = await User.findById(req.user._id).select("+password");

  if (!user) {
    res.status(404);
    throw new Error("المستخدم غير موجود");
  }

  const isMatch = await user.matchPassword(currentPassword);
  if (!isMatch) {
    res.status(400);
    throw new Error("كلمة المرور الحالية غير صحيحة");
  }

  user.password = newPassword;
  await user.save();

  res.json({ message: "تم تحديث كلمة المرور بنجاح" });
});

// ────────────────────────────────────────────────
// 📦 عناوين الشحن – جلب عناوين المستخدم الحالي
// مستخدم من BuyerDashboard (getAddresses)
// ────────────────────────────────────────────────
export const getUserAddresses = asyncHandler(async (req, res) => {
  const addresses = await Address.find({ user: req.user._id }).sort({
    isDefault: -1,
    createdAt: -1,
  });

  res.json(addresses);
});

// ────────────────────────────────────────────────
// 📦 عناوين الشحن – إضافة عنوان جديد
// مستخدم من BuyerDashboard (createAddress)
// ────────────────────────────────────────────────
export const createUserAddress = asyncHandler(async (req, res) => {
  const { label, city, area, street, details, isDefault } = req.body;

  if (!label) {
    res.status(400);
    throw new Error("يجب إدخال اسم للعنوان (مثلاً: المنزل، العمل)");
  }

  const addressData = {
    user: req.user._id,
    label,
    city: city || "",
    area: area || "",
    street: street || "",
    details: details || "",
    isDefault: !!isDefault,
  };

  // إذا تم اختيار هذا العنوان كافتراضي، نلغي الافتراضية عن البقية
  if (addressData.isDefault) {
    await Address.updateMany(
      { user: req.user._id },
      { $set: { isDefault: false } }
    );
  }

  const address = await Address.create(addressData);

  res.status(201).json(address);
});

// ────────────────────────────────────────────────
// 📦 عناوين الشحن – تعديل عنوان
// مستخدم من BuyerDashboard (updateAddress)
// ────────────────────────────────────────────────
export const updateUserAddress = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { label, city, area, street, details, isDefault } = req.body;

  const address = await Address.findOne({ _id: id, user: req.user._id });
  if (!address) {
    res.status(404);
    throw new Error("العنوان غير موجود");
  }

  if (label) address.label = label;
  if (typeof city !== "undefined") address.city = city;
  if (typeof area !== "undefined") address.area = area;
  if (typeof street !== "undefined") address.street = street;
  if (typeof details !== "undefined") address.details = details;

  if (typeof isDefault !== "undefined") {
    address.isDefault = !!isDefault;
    if (address.isDefault) {
      await Address.updateMany(
        { user: req.user._id, _id: { $ne: address._id } },
        { $set: { isDefault: false } }
      );
    }
  }

  const updated = await address.save();
  res.json(updated);
});

// ────────────────────────────────────────────────
// 📦 عناوين الشحن – حذف عنوان
// مستخدم من BuyerDashboard (deleteAddress)
// ────────────────────────────────────────────────
export const deleteUserAddress = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const address = await Address.findOne({ _id: id, user: req.user._id });

  if (!address) {
    res.status(404);
    throw new Error("العنوان غير موجود");
  }

  await address.deleteOne();
  res.json({ message: "تم حذف العنوان بنجاح" });
});

// ────────────────────────────────────────────────
// 🔔 تفضيلات الإشعارات
// مستخدم من BuyerDashboard (updateNotificationPreferences)
// نخزّنها داخل حقل notificationPreferences في كيان User
// ────────────────────────────────────────────────
export const updateNotificationPreferences = asyncHandler(
  async (req, res) => {
    const prefs = {
      email: !!req.body.email,
      sms: !!req.body.sms,
      push: !!req.body.push,
    };

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          notificationPreferences: prefs,
        },
      },
      {
        new: true,
        runValidators: false,
        strict: false, // حتى لو الحقل غير معرف في الـ Schema لا يحصل خطأ
      }
    ).select("-password");

    if (!user) {
      res.status(404);
      throw new Error("المستخدم غير موجود");
    }

    res.json({
      _id: user._id,
      name: user.name,
      fullName: user.name,
      email: user.email,
      phone: user.phone || "",
      role: user.role,
      country: user.country || "",
      notificationPreferences: user.notificationPreferences || prefs,
    });
  }
);

// ────────────────────────────────────────────────
// ❌ حذف الحساب
// ────────────────────────────────────────────────
export const deleteUserAccount = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error("المستخدم غير موجود");
  }
  await user.deleteOne();
  res.json({ message: "تم حذف الحساب بنجاح" });
});

// ────────────────────────────────────────────────
// 💖 قائمة المفضلة (Wishlist)
// ────────────────────────────────────────────────

// جلب قائمة المفضلة للمستخدم الحالي
export const getUserWishlist = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate("favorites")
    .select("favorites");

  if (!user) {
    res.status(404);
    throw new Error("المستخدم غير موجود");
  }

  res.json(user.favorites || []);
});

// إضافة منتج إلى المفضلة
export const addProductToWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  if (!productId) {
    res.status(400);
    throw new Error("معرف المنتج مطلوب");
  }

  const user = await User.findById(req.user._id).select("favorites");

  if (!user) {
    res.status(404);
    throw new Error("المستخدم غير موجود");
  }

  const exists =
    user.favorites &&
    user.favorites.some((favId) => favId.toString() === productId);

  if (!exists) {
    user.favorites = user.favorites || [];
    user.favorites.push(productId);
    await user.save();
  }

  await user.populate("favorites");

  res.status(201).json(user.favorites);
});

// إزالة منتج من المفضلة
export const removeProductFromWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  if (!productId) {
    res.status(400);
    throw new Error("معرف المنتج مطلوب");
  }

  const user = await User.findById(req.user._id).select("favorites");

  if (!user) {
    res.status(404);
    throw new Error("المستخدم غير موجود");
  }

  user.favorites = (user.favorites || []).filter(
    (favId) => favId.toString() !== productId
  );

  await user.save();
  await user.populate("favorites");

  res.json(user.favorites);
});

// تفريغ قائمة المفضلة بالكامل
export const clearUserWishlist = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("favorites");

  if (!user) {
    res.status(404);
    throw new Error("المستخدم غير موجود");
  }

  user.favorites = [];
  await user.save();

  res.json({ message: "تم تفريغ قائمة المفضلة بنجاح" });
});

// ────────────────────────────────────────────────
// 🆘 تذاكر الدعم (إدارة التواصل من جهة المستخدم)
// ────────────────────────────────────────────────

// إنشاء تذكرة دعم جديدة
export const createSupportTicket = asyncHandler(async (req, res) => {
  const { subject, message, priority } = req.body;

  if (!subject || !subject.trim() || !message || !message.trim()) {
    res.status(400);
    throw new Error("يجب إدخال عنوان التذكرة ونص الرسالة");
  }

  const allowedPriorities = ["low", "normal", "high"];
  const finalPriority = allowedPriorities.includes(priority)
    ? priority
    : "normal";

  const ticket = await SupportTicket.create({
    user: req.user._id,
    subject: subject.trim(),
    message: message.trim(),
    priority: finalPriority,
    status: "in_progress", // ✅ تبدأ قيد المتابعة
  });

  res.status(201).json(ticket);
});

// جلب تذاكر الدعم الخاصة بالمستخدم الحالي
export const getMySupportTickets = asyncHandler(async (req, res) => {
  const tickets = await SupportTicket.find({ user: req.user._id }).sort({
    createdAt: -1,
  });

  res.json(tickets);
});

// ────────────────────────────────────────────────
// ✅ الكود جاهز للإنتاج، متكامل مع JWT وميدلوير الحماية.
// ────────────────────────────────────────────────
