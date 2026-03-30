// ────────────────────────────────────────────────
// 📁 backend/controllers/authController.js
// التحكم في المصادقة وتسجيل المستخدمين في نظام طلبية (Talabia)
// مع إنشاء متجر تلقائي للبائع عند التسجيل + دعم بيانات الهوية (KYC)
// ملاحظة: التسجيل العام عبر /auth/register يسمح فقط بدورَي
// "buyer" و "seller".
// أدوار "shipper" و "admin" تُنشأ لاحقًا عبر مسارات خاصة بالأدمن.
// ────────────────────────────────────────────────

import asyncHandler from "express-async-handler";
import bcrypt from "bcryptjs";

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import User from "../models/User.js";
import Store from "../models/Store.js";
import Address from "../models/Address.js";
import generateToken from "../utils/generateToken.js";

// ✅ تحديد مسار uploads بشكل ثابت وآمن
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// backend/controllers -> .. = backend -> uploads
const uploadsDir = path.join(__dirname, "..", "uploads");

// ✅ حذف وثيقة الهوية المرفوعة إذا فشل التسجيل (منع تراكم + حماية خصوصية)
function safeDeleteUploadedIdDocument(req) {
  try {
    const filename = req?.file?.filename;
    if (!filename) return;

    const safeName = path.basename(filename); // يمنع ../
    if (!safeName) return;

    const filePath = path.join(uploadsDir, "ids", safeName);

    fs.unlink(filePath, (err) => {
      if (err && err.code !== "ENOENT") {
        console.warn("[AUTH] Failed to delete uploaded idDocument:", err.message);
      }
    });
  } catch (e) {
    // تجاهل أي خطأ لمنع كسر الطلب
  }
}

// 🧩 تسجيل مستخدم جديد
// يدعم التسجيل العام للأدوار: (مشتري / بائع) فقط عبر هذه الواجهة.
// إذا كان الدور "بائع" يتم إنشاء متجر مرتبط به تلقائيًا بحالة pending
// كما يتم حفظ بيانات الهوية (KYC) في سجل المستخدم.
export const registerUser = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    password,
    role,
    phone,
    // بيانات المتجر للبائع
    storeName,
    storeAddress,
    storeDescription,
    storeCountry,
    storeCity,
    storeDistrict,
    storeNeighborhood,
    storeAddressDetails,
    // بيانات هوية اختيارية للبائع/شركة الشحن
    nationality,
    birthDate,
    idType,
    idNumber,
    idIssuer,
    idDocumentUrl,
    // بيانات إضافية للشحن (اختياري مستقبلاً)
    position,
    companyName,
    companyAddress,
    companyScope,
    // بيانات عنوان المشتري (اختيارية – تُخزن في User fields + address string)
    country,
    state,
    city,
    district,     // ← جديد للمشتري
    neighborhood, // ← جديد للمشتري
    addressDetails, // ← جديد للمشتري
    addressLine,
    // الموافقة على الشروط
    agreedToTerms,
  } = req.body;

  const normalizedEmail = email?.toLowerCase().trim();

  if (!normalizedEmail || !password || !name) {
    res.status(400);
    throw new Error("الاسم، البريد الإلكتروني، وكلمة المرور حقول مطلوبة");
  }

  // تحسين بسيط: متطلبات كلمة مرور دنيا
  if (String(password).length < 6) {
    res.status(400);
    throw new Error("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
  }

  // التحقق من وجود المستخدم مسبقًا (بناءً على البريد)
  const userExists = await User.findOne({ email: normalizedEmail });
  if (userExists) {
    // ✅ مهم: إذا كان هناك ملف هوية مرفوع ضمن نفس الطلب، احذفه لأن التسجيل سيفشل
    safeDeleteUploadedIdDocument(req);
    res.status(400);
    throw new Error("المستخدم موجود بالفعل");
  }

  // 🔒 تحديد الدور النهائي المسموح به من واجهة التسجيل العامة
  // - المسموح: buyer, seller
  // - الممنوع: shipper, admin, وأي قيم أخرى غير معروفة
  const requestedRole = (role || "buyer").toString().trim().toLowerCase();

  let finalRole;
  if (requestedRole === "seller") {
    finalRole = "seller";
  } else if (requestedRole === "buyer" || !requestedRole) {
    finalRole = "buyer";
  } else {
    // ✅ إن كان هناك ملف مرفوع والتسجيل سيرفض: احذف الملف
    safeDeleteUploadedIdDocument(req);
    res.status(400);
    throw new Error("لا يمكن التسجيل بهذا الدور من واجهة التسجيل العامة");
  }

  // 🔧 تجهيز العنوان الكامل من أجزاء منفصلة (للمستخدم نفسه – خاصة المشتري)
  const addressParts = [
    addressDetails,
    neighborhood,
    district,
    city,
    state,
    country,
    addressLine
  ]
    .map((part) => (part ? part.toString().trim() : ""))
    .filter(Boolean);
  const fullAddress = addressParts.length ? addressParts.join(" - ") : undefined;

  // 🔧 تحويل تاريخ الميلاد إلى Date (إن أمكن)
  let birthDateValue;
  if (birthDate) {
    const parsed = new Date(birthDate);
    if (!Number.isNaN(parsed.getTime())) {
      birthDateValue = parsed;
    }
  }

  // 🔧 رابط وثيقة الهوية: يدعم حالتين
  // 1) قد يأتي من req.file إذا تم ربط مسار التسجيل مع uploadIdentityDocument
  // 2) أو من body كـ idDocumentUrl (في حال رفع مستقل مسبقًا)
  let computedIdDocumentUrl;
  if (req.file && req.file.filename) {
    computedIdDocumentUrl = `/uploads/ids/${req.file.filename}`;
  } else if (typeof idDocumentUrl === "string" && idDocumentUrl.trim() !== "") {
    computedIdDocumentUrl = idDocumentUrl.trim();
  }

  let user;

  try {
    // إنشاء المستخدم الجديد مع بيانات الهوية والعنوان
    user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: finalRole, // ← استخدام الدور النهائي الآمن (buyer | seller فقط)
      phone: phone?.trim() || undefined,
      address: fullAddress,
      country: country?.trim() || undefined,
      city: city?.trim() || undefined,
      district: district?.trim() || undefined,
      neighborhood: neighborhood?.trim() || undefined,
      addressDetails: addressDetails?.trim() || undefined,
      nationality: nationality?.trim() || undefined,
      birthDate: birthDateValue,
      idType: idType?.trim() || undefined,
      idNumber: idNumber?.trim() || undefined,
      idIssuer: idIssuer?.trim() || undefined,
      idDocumentUrl: computedIdDocumentUrl || undefined,
      agreedToTerms: agreedToTerms === 'true' || agreedToTerms === true,
      termsAcceptedAt: (agreedToTerms === 'true' || agreedToTerms === true) ? new Date() : undefined,
      // title, permissions, isActive تستخدم القيم الافتراضية من المخطط
    });

    // إذا كان المستخدم بائعًا → إنشاء متجر مرتبط به بحالة pending
    if (user.role === "seller") {
      const safeStoreNameBase = storeName?.trim() || "";
      let finalStoreName = safeStoreNameBase;

      if (!finalStoreName) {
        // fallback على اسم المستخدم
        finalStoreName = user.name ? `متجر ${user.name}` : "متجر جديد";
      }

      // توليد slug بسيط من اسم المتجر أو من معرف المستخدم
      const normalizedSlugSource = finalStoreName
        .toString()
        .toLowerCase()
        .replace(/[^a-z0-9\u0600-\u06FF\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "");

      let slug = normalizedSlugSource || `store-${user._id.toString()}`;

      // ✅ منع تعارض slug (حل صغير يمنع فشل التسجيل بسبب slug مكرر)
      // نجرب 3 مرات فقط ثم نكمل بإضافة جزء من userId
      for (let i = 0; i < 3; i++) {
        const exists = await Store.findOne({ slug }).select("_id");
        if (!exists) break;
        slug = `${slug}-${String(user._id).slice(-6)}`;
      }

      // 🔧 تجهيز عنوان المتجر في كائن متوافق مع Store.address
      const normalizedStoreCountry =
        typeof storeCountry === "string" ? storeCountry.trim() : "";
      const normalizedStoreCity =
        typeof storeCity === "string" ? storeCity.trim() : "";
      const normalizedStoreDistrict =
        typeof storeDistrict === "string" ? storeDistrict.trim() : "";
      const normalizedStoreNeighborhood =
        typeof storeNeighborhood === "string" ? storeNeighborhood.trim() : "";
      const normalizedStoreDetails =
        (typeof storeAddressDetails === "string"
          ? storeAddressDetails.trim()
          : "") ||
        (typeof storeAddress === "string" ? storeAddress.trim() : "") ||
        fullAddress ||
        "";

      const hasAnyAddressPart =
        normalizedStoreCountry ||
        normalizedStoreCity ||
        normalizedStoreDistrict ||
        normalizedStoreNeighborhood ||
        normalizedStoreDetails;

      const storeAddressDoc = hasAnyAddressPart
        ? {
          country: normalizedStoreCountry || undefined,
          city: normalizedStoreCity || undefined,
          area: normalizedStoreDistrict || undefined, // ← المديرية
          street: normalizedStoreNeighborhood || undefined, // ← الحي
          details: normalizedStoreDetails || undefined, // ← بقية التفاصيل
        }
        : undefined;

      await Store.create({
        owner: user._id,
        name: finalStoreName,
        slug,
        description: storeDescription?.trim() || "",
        phone: user.phone?.trim() || undefined, // ربط هاتف المتجر بهاتف البائع
        email: user.email, // ربط إيميل المتجر بإيميل البائع
        address: storeAddressDoc,
        status: "pending",
        isActive: true,
      });
    }

    // ✅ إذا كان المستخدم مشتريًا ولدى بيانات عنوان -> إنشاء عنوان افتراضي في موديل Address
    if (user.role === "buyer" && (country || city || district || neighborhood || addressDetails)) {
      await Address.create({
        user: user._id,
        label: "العنوان المسجل",
        city: country?.trim() || "", // المستخدم كدولة
        area: city?.trim() || "",    // المستخدم كمدينة
        district: district?.trim() || "",
        street: neighborhood?.trim() || "", // المستخدم كحي
        details: addressDetails?.trim() || "",
        isDefault: true,
      });
    }

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    });
  } catch (err) {
    // ✅ إذا فشل التسجيل لأي سبب وكان هناك ملف هوية مرفوع: احذفه فورًا
    safeDeleteUploadedIdDocument(req);

    // في حال فشل إنشاء المتجر (أو أي خطأ بعد إنشاء المستخدم)
    // نحاول تنظيف المستخدم حتى لا يبقى بدون متجر في حالة بائع
    if (user && user._id) {
      try {
        await User.findByIdAndDelete(user._id);
      } catch (cleanupErr) {
        // يمكن تسجيل الخطأ في نظام مراقبة في الإنتاج
      }
    }
    throw err;
  }
});

// 🔐 تسجيل الدخول
export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const normalizedEmail = email?.toLowerCase().trim();
  if (!normalizedEmail || !password) {
    res.status(400);
    throw new Error("البريد الإلكتروني وكلمة المرور مطلوبان");
  }

  // ✅ مهم: لو password في Schema عاملين له select:false
  // لازم نستخدم select('+password') حتى لا تكون undefined
  const user = await User.findOne({ email: normalizedEmail }).select("+password");
  if (!user) {
    res.status(404);
    throw new Error("لا يوجد مستخدم بهذا البريد الإلكتروني");
  }

  // ✅ منع تسجيل الدخول للحسابات الموقوفة (إن كان الحقل موجودًا)
  if (user.isActive === false) {
    res.status(403);
    throw new Error("هذا الحساب موقوف");
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    res.status(401);
    throw new Error("كلمة المرور غير صحيحة");
  }

  // ⏱️ تحديث آخر دخول / آخر ظهور
  await User.findByIdAndUpdate(user._id, { lastLoginAt: new Date() });

  // جلب نسخة آمنة بدون كلمة المرور
  const safeUser = await User.findById(user._id).select("-password");

  res.json({
    user: safeUser,
    token: generateToken(user._id),
  });
});

// 👤 جلب بيانات المستخدم الحالي
export const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select("-password");
  if (user) {
    res.json(user);
  } else {
    res.status(404);
    throw new Error("المستخدم غير موجود");
  }
});

// ✅ تسجيل الخروج (اختياري للواجهة)
export const logoutUser = asyncHandler(async (req, res) => {
  res.status(200).json({ message: "تم تسجيل الخروج بنجاح" });
});
