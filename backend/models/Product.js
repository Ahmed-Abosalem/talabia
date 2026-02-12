// ────────────────────────────────────────────────
// 📁 backend/models/Product.js
// نموذج المنتج في نظام طلبية (Talabia)
// ────────────────────────────────────────────────

import mongoose from 'mongoose';

// 🛍️ مخطط المنتج (Product Schema)
const productSchema = new mongoose.Schema(
  {
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // الاسم والوصف الأساسيان
    name: {
      type: String,
      required: [true, 'اسم المنتج مطلوب'],
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    description: {
      type: String,
      required: [true, 'وصف المنتج مطلوب'],
      trim: true,
      maxlength: 2000,
    },

    // السعر والمخزون
    price: {
      type: Number,
      required: [true, 'السعر مطلوب'],
      min: 0,
    },
    stock: {
      type: Number,
      required: [true, 'الكمية المتوفرة مطلوبة'],
      min: 0,
    },

    // التصنيف (قسم المنتج)
    // ⚠️ نخزن معرف القسم كنص (ObjectId بصيغة string) لكن نعرّفه كـ ref حتى نستطيع populate
    // هذا يحل مشكلة ظهور الـ ObjectId في الواجهة، مع إبقاء التوافق مع البيانات الحالية.
    category: {
      type: String,
      ref: "Category",
      required: [true, "التصنيف مطلوب"],
      trim: true,
    },

    // صور المنتج
    images: [
      {
        url: { type: String, required: true },
        public_id: { type: String },
      },
    ],

    // ⭐ التقييمات
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    numReviews: {
      type: Number,
      default: 0,
    },

    // 🧾 تفاصيل إضافية كما يعبّئها البائع في نموذج "إضافة منتج جديد"

    // وحدة المنتج (مثال: قطعة، كجم)
    unitLabel: {
      type: String,
      trim: true,
      default: 'قطعة',
    },

    // العلامة التجارية (اختياري)
    brand: {
      type: String,
      trim: true,
    },

    // الخيارات / النكهات / الأوزان (اختياري - نص حر مثل: 250 جم، 500 جم، 1 كجم)
    variants: {
      type: String,
      trim: true,
    },

    // سياسة الاسترجاع (اختياري)
    returnPolicy: {
      type: String,
      trim: true,
    },

    // ✅ حالة نصية للمنتج ("active" / "inactive")
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },

    // ✅ هل المنتج فعّال للعرض في المتجر؟
    isActive: {
      type: Boolean,
      default: true,
    },

    // ✅ هل المنتج موقوف / مقفول من الإدارة؟
    // إذا كان true لا يحق للبائع تفعيله مرة أخرى
    adminLocked: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// ✅ إنشاء النموذج
const Product = mongoose.model('Product', productSchema);

export default Product;

// ────────────────────────────────────────────────
// ✅ كل منتج مرتبط بمتجر وبائع محددين.
// ✅ يدعم صور متعددة لكل منتج.
// ✅ يحتوي على تقييمات وعدد مراجعات.
// ✅ يحتوي على:
//    - unitLabel, brand, variants, returnPolicy
//    - status (active / inactive)
//    - isActive (للتحكم في ظهوره)
//    - adminLocked (حجب إداري لا يمكن للبائع كسره)
// ────────────────────────────────────────────────
