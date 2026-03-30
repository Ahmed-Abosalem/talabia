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

    // ✅ نظام الترتيب والتميز الإداري (Smart Ranking)
    isFeatured: {
      type: Boolean,
      default: false,
    },
    featuredOrder: {
      type: Number,
      default: 0,
    },

    // 📈 مقاييس الأداء (Performance Metrics)
    viewsCount: {
      type: Number,
      default: 0,
    },
    salesCount: {
      type: Number,
      default: 0,
    },
    addToCartCount: {
      type: Number,
      default: 0,
    },

    // ⚡ حقل مخزن (Cached) لسرعة الترتيب
    performanceScore: {
      type: Number,
      default: 0,
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

    // 🛡️ نظام المخزون الديناميكي
    lowStockThreshold: {
      type: Number,
      default: 2,
      min: [0, 'حد التنبيه لا يمكن أن يكون سالباً'],
    },
    lowStockNotified: {
      type: Boolean,
      default: false,
    },
    autoDeactivated: {
      type: Boolean,
      default: false,
    },

    // 🔍 حقول البحث المتقدم (New Search System)
    // يتم تعبئتها تلقائياً عبر pre-save hook
    search_text: {
      type: String,
      trim: true,
      select: false, // لا نريد إرجاعها في الاستعلامات العادية
    },
    keywords: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// ────────────────────────────────────────────────
// ⚡ الفهارس (Indexes)
// ────────────────────────────────────────────────

// 1. الفهرس النصي المتقدم (يغطي الاسم، الوصف، الكلمات المفتاحية، الماركة)
productSchema.index(
  {
    name: 'text',
    search_text: 'text',
    keywords: 'text',
    brand: 'text',
    description: 'text',
  },
  {
    weights: {
      name: 10,         // الاسم هو الأهم
      search_text: 8,   // النص المعالج يأتي ثانياً
      keywords: 6,      // الكلمات المفتاحية (والمرادفات)
      brand: 5,         // الماركة
      description: 2,   // الوصف (أقل أهمية)
    },
    name: 'AdvancedProductSearchIndex',
    default_language: 'none', // لتعطيل الـ Stemming الافتراضي غير المناسب للعربية
  }
);

// 2. فهرس للحقول التي نستخدمها في الفلترة مع البحث
productSchema.index({ status: 1, isActive: 1, stock: 1 });
productSchema.index({ category: 1 });
productSchema.index({ finalSortScore: -1 });

// ⚡ 3. فهارس متقدمة لمحرك التوصيات (Enterprise Recommendation Indexes)
// تحسين أداء البحث عن المنتجات المشابهة (Similar Products)
productSchema.index({ isActive: 1, adminLocked: 1, category: 1, price: 1, rating: 1, stock: 1 });
// تحسين أداء البحث عن منتجات نفس المتجر (Store Synergy)
productSchema.index({ isActive: 1, adminLocked: 1, store: 1, stock: 1 });
// تحسين أداء البحث عن المنتجات الأكثر مبيعاً في القسم (Trending)
productSchema.index({ isActive: 1, adminLocked: 1, category: 1, salesCount: -1 });

// ────────────────────────────────────────────────
// 🎣 Hooks (Pre-save)
// ────────────────────────────────────────────────
import { processText } from '../utils/textProcessor.js';

productSchema.pre('save', function (next) {
  // تحديث حقل البحث فقط إذا تغيرت الحقول المؤثرة
  if (
    this.isModified('name') ||
    this.isModified('description') ||
    this.isModified('brand') ||
    this.isModified('category') ||
    this.isModified('unitLabel')
  ) {
    // تجميع النص الخام من كل الحقول المهمة
    const rawTextParts = [
      this.name,
      this.brand,
      // يمكن إضافة اسم التصنيف هنا إذا كان متوفراً (غالباً ObjectId، لذا نعتمد على الـ tokens للحظة)
      this.description,
      this.unitLabel
    ].filter(Boolean);

    const fullText = rawTextParts.join(' ');

    // معالجة النص باستخدام الـ Utility الخاصة بنا
    const { normalized, tokens } = processText(fullText);

    this.search_text = normalized;

    // يمكننا تخزين التوكنز ككلمات مفتاحية إضافية إذا أردنا
    // لكن حالياً نكتفي بتخزينها في search_text للبحث
    // ونترك keywords للإدخال اليدوي أو المرادفات
  }

  next();
});

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
