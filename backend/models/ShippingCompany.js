// ────────────────────────────────────────────────
// 📁 backend/models/ShippingCompany.js
// نموذج شركات الشحن في منصة طلبية (Talabia)
// ────────────────────────────────────────────────

import mongoose from "mongoose";

const coverageAreaSchema = new mongoose.Schema(
  {
    city: { type: String, trim: true },
    region: { type: String, trim: true },
    country: { type: String, trim: true },
    deliveryTime: { type: String, trim: true }, // مثال: "1-3 أيام"
  },
  { _id: false }
);

const pricingSchema = new mongoose.Schema(
  {
    baseFee: { type: Number, default: 0 }, // سعر التوصيل الأساسي
    perKm: { type: Number, default: 0 }, // سعر إضافي لكل كيلومتر (اختياري)
    extraWeightFee: { type: Number, default: 0 }, // رسوم وزن إضافي (اختياري)
    currency: { type: String, default: "SAR" },
  },
  { _id: false }
);

// 🚚 مخطط شركة الشحن (Shipping Company Schema)
const shippingCompanySchema = new mongoose.Schema(
  {
    // الاسم التجاري للشركة
    name: {
      type: String,
      required: [true, "اسم الشركة مطلوب"],
      unique: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },

    // بيانات تواصل عامة
    email: {
      type: String,
      required: [true, "البريد الإلكتروني لشركة الشحن مطلوب"],
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "رقم الجوال لشركة الشحن مطلوب"],
      trim: true,
    },

    // شعار الشركة (اختياري) لإظهاره في الواجهات
    logo: {
      type: String,
      trim: true,
    },

    // مقر الشركة
    headquarters: {
      type: String,
      trim: true,
    },

    // مسؤول الشركة (للاتصال الإداري)
    contactName: {
      type: String,
      trim: true,
    },
    contactRelation: {
      type: String,
      trim: true, // مثال: صاحب الشركة، مدير العمليات...
    },

    // بيانات الوثيقة التعريفية
    documentType: {
      type: String,
      trim: true, // مثال: هوية وطنية، سجل تجاري...
    },
    documentNumber: {
      type: String,
      trim: true,
    },
    documentUrl: {
      type: String, // رابط صورة / PDF للوثيقة (اختياري)
      trim: true,
    },

    // ربط مع حساب المستخدم بدور shipper
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // تغطية المدن / المناطق
    coverageAreas: [coverageAreaSchema],

    // تسعير التوصيل
    pricing: pricingSchema,

    // نطاق عمل الشركة:
    // global          -> تخدم جميع البائعين في المنصة
    // seller-specific -> مرتبطة ببائعين (متاجر) محددين فقط
    scope: {
      type: String,
      enum: ["global", "seller-specific"],
      default: "global",
    },

    // قائمة المتاجر المرتبطة بهذه الشركة (عند scope = seller-specific)
    stores: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Store",
      },
    ],

    // تقييم عام (مستقبلاً من تقييمات الطلبات)
    rating: {
      average: { type: Number, default: 0 },
      count: { type: Number, default: 0 },
    },

    // حالة الشركة في النظام
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// ✅ إنشاء النموذج
const ShippingCompany = mongoose.model("ShippingCompany", shippingCompanySchema);

export default ShippingCompany;

// ────────────────────────────────────────────────
// ✅ يمثل جميع شركات الشحن المتعاقدة مع المنصة.
// ✅ يحتوي على بيانات التواصل، المسؤول، الوثائق، التسعير، ونطاق العمل.
// ✅ يمكن ربطه مباشرة مع الطلبات عبر Order.shippingCompany.
// ────────────────────────────────────────────────
