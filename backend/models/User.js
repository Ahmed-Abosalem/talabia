// ────────────────────────────────────────────────
// 📁 backend/models/User.js
// نموذج المستخدم الرئيسي في نظام طلبية (Talabia)
// مع دعم بيانات الهوية (KYC) للبائعين وغيرهم
// ────────────────────────────────────────────────

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// 🧩 مخطط المستخدم (User Schema)
const userSchema = new mongoose.Schema(
  {
    // البيانات الأساسية
    name: {
      type: String,
      required: [true, 'الاسم مطلوب'],
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    email: {
      type: String,
      required: [true, 'البريد الإلكتروني مطلوب'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'كلمة المرور مطلوبة'],
      minlength: 6,
    },
    role: {
      type: String,
      enum: ['admin', 'seller', 'buyer', 'shipper'],
      default: 'buyer',
      index: true,
    },
    phone: {
      type: String,
      trim: true,
    },

    // 🏠 عنوان عام (للمشتري أو البائع أو شركة الشحن)
    address: {
      type: String,
      trim: true,
    },

    // 🌍 الدولة والمدينة (تُستخدم مع الملف الشخصي للمستخدم – خاصة المشتري)
    country: {
      type: String,
      trim: true,
      default: '',
    },
    city: {
      type: String,
      trim: true,
      default: '',
    },
    district: {
      type: String,
      trim: true,
      default: '',
    },
    neighborhood: {
      type: String,
      trim: true,
      default: '',
    },
    addressDetails: {
      type: String,
      trim: true,
      default: '',
    },

    avatar: {
      type: String,
      default: '',
    },

    // 🧾 بيانات الهوية والتحقق (KYC) - مهم للبائعين وشركات الشحن
    nationality: {
      type: String,
      trim: true,
    },
    birthDate: {
      type: Date,
    },
    idType: {
      type: String,
      trim: true,
      // أمثلة: "هوية وطنية"، "إقامة"، "جواز سفر"، "سجل تجاري"، إلخ
    },
    idNumber: {
      type: String,
      trim: true,
    },
    idIssuer: {
      type: String,
      trim: true,
    },
    // مسار ملف وثيقة الهوية الذي يتم رفعه (داخل مجلد uploads)
    idDocumentUrl: {
      type: String,
      trim: true,
      default: '',
    },

    // 🏷️ المسمّى الوظيفي (يُستخدم مع موظفي الإدارة / المشرفين)
    title: {
      type: String,
      trim: true,
      default: '',
    },

    // 🔢 رقم الصلاحية / كود الموظف الإداري
    staffCode: {
      type: String,
      trim: true,
      default: '',
    },

    // 🎛️ صلاحيات المشرف (لكل قسم من أقسام لوحة التحكم)
    // القيم الممكنة لكل مفتاح:
    // - none   → لا صلاحية
    // - view   → عرض فقط
    // - partial→ إدارة جزئية
    // - full   → إدارة كاملة
    permissions: {
      type: Map,
      of: {
        type: String,
        enum: ['none', 'view', 'partial', 'full'],
      },
      default: undefined, // لن تُنشأ تلقائيًا إلا عند الحاجة
    },

    // 🔒 حالة الحساب (تفعيل / إيقاف)
    isActive: {
      type: Boolean,
      default: true,
    },

    // 👑 هل المستخدم هو مالك النظام (مدير النظام الأعلى)
    // هذا الحقل هو الذي يميّز بين:
    // - مالك المتجر/مدير النظام: role = 'admin' + isOwner = true
    // - موظف لوحة التحكم:        role = 'admin' + isOwner = false
    isOwner: {
      type: Boolean,
      default: false,
    },

    // ⏱️ آخر دخول / آخر ظهور (يُستخدم في "متصل الآن" و "آخر ظهور")
    lastLoginAt: {
      type: Date,
    },

    // ⚖️ الموافقة على الشروط والخصوصية
    agreedToTerms: {
      type: Boolean,
      default: false,
    },
    termsAcceptedAt: {
      type: Date,
    },

    // 💖 قائمة المفضلة (منتجات يحفظها المستخدم)
    favorites: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
      },
    ],
  },
  {
    timestamps: true,
  }
);

// 🔒 تشفير كلمة المرور قبل الحفظ
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// 🔐 التحقق من كلمة المرور
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// ✅ إنشاء النموذج
const User = mongoose.model('User', userSchema);

export default User;

// ────────────────────────────────────────────────
// ✅ يدعم جميع أنواع المستخدمين (admin, seller, buyer, shipper)
// ✅ إضافة حقول الهوية للتحقق من البائعين (KYC) + مسار ملف الوثيقة
// ✅ تشفير كلمة المرور تلقائيًا (بعد إصلاح الهوك)
// ✅ جاهز للتكامل مع صفحة إدارة البائعين لعرض بيانات الهوية والوثيقة
// ✅ الآن يدعم تمييز مالك النظام (isOwner) عن باقي الموظفين
// ✅ إضافة staffCode و lastLoginAt لدعم إدارة الموظفين ولوحة الأدمن
// ────────────────────────────────────────────────
