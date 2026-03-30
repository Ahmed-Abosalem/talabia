// ────────────────────────────────────────────────
// 📁 backend/models/Review.js
// نموذج التقييمات (Reviews) في منصة طلبية (Talabia)
// ────────────────────────────────────────────────

import mongoose from 'mongoose';

// ⭐ مخطط التقييم (Review Schema)
const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
    },

    // 🔗 ربط التقييم بالطلب ومصدره العنصر المحدد
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    orderItem: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    rating: {
      type: Number,
      required: [true, 'التقييم مطلوب'],
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    images: [
      {
        url: { type: String },
        public_id: { type: String },
      },
    ],
    isApproved: {
      type: Boolean,
      default: true,
    },
    // ✅ التحقق صارم: لا قيمة افتراضية True
    isVerifiedPurchase: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// 🔁 منع المستخدم من تقييم نفس المنتج أكثر من مرة
reviewSchema.index({ user: 1, product: 1 }, { unique: true });

// ✅ إنشاء النموذج
const Review = mongoose.model('Review', reviewSchema);

export default Review;

// ────────────────────────────────────────────────
// ✅ كل تقييم مرتبط بمستخدم ومنتج ومتجر.
// ✅ يدعم التقييم النصي والنجوم والصور.
// ✅ يحتوي على فحص لمنع التقييم المكرر.
// ✅ جاهز للربط مع Product وStore لتحديث المتوسط.
// ────────────────────────────────────────────────
