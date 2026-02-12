// backend/models/Store.js
// نموذج المتجر (البائع) بعد توحيد حالات الحالة (status) ليخدم لوحة إدارة البائعين

import mongoose from "mongoose";

const { Schema } = mongoose;

const storeSchema = new Schema(
  {
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // الاسم والعلامة التعريفية للمتجر
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    // وصف مختصر عن المتجر
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
    },

    // صور وهوية المتجر
    logo: {
      type: String, // مثال: "/uploads/stores/logos/123.jpg"
      default: "",
      trim: true,
    },
    coverImage: {
      type: String, // مثال: "/uploads/stores/covers/123.jpg"
      default: "",
      trim: true,
    },

    // بيانات تواصل أساسية
    phone: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    address: {
      country: { type: String, trim: true },
      city: { type: String, trim: true },
      area: { type: String, trim: true },
      street: { type: String, trim: true },
      details: { type: String, trim: true },
    },

    // حالة المتجر لاستخدامها في إدارة البائعين:
    // pending  → طلب جديد ينتظر مراجعة الأدمن
    // approved → متجر فعّال ويظهر في المنصة
    // rejected → مرفوض (مع سبب الرفض)
    // suspended → كان مفعّل وتم إيقافه مؤقتاً
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "suspended"],
      default: "pending",
      index: true,
    },

    // حالة الظهور التي يتحكم بها البائع من لوحة "إعدادات المتجر"
    // visible → المتجر ظاهر للعملاء
    // hidden  → المتجر مخفي مؤقتاً لكنه ما زال مفعلاً في النظام
    visibility: {
      type: String,
      enum: ["visible", "hidden"],
      default: "visible",
      index: true,
    },

    // سبب الرفض (يُملأ عند رفض الطلب)
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },

    // تفعيل عام للمتجر (يمكن استخدامه لاحقاً بجانب status إن لزم)
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    // بعض الحقول الإحصائية (إختيارية، يمكن ملؤها لاحقاً)
    ratingAverage: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    ratingCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // روابط اجتماعية اختيارية
    socialLinks: {
      instagram: { type: String, trim: true },
      twitter: { type: String, trim: true },
      snapchat: { type: String, trim: true },
      tiktok: { type: String, trim: true },
      website: { type: String, trim: true },
    },

    // مرجع للأدمن الذي أنشأ أو راجع الطلب (اختياري)
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Store", storeSchema);
