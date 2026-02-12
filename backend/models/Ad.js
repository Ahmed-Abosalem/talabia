// backend/models/Ad.js
import mongoose from "mongoose";

const adSchema = new mongoose.Schema(
  {
    // عنوان الإعلان الظاهر على البانر
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    // نص فرعي اختياري (سطر ثاني صغير)
    subtitle: {
      type: String,
      trim: true,
      maxlength: 200,
    },

    // وصف أطول (لن تحتاجه دائماً في الواجهة، لكن مفيد للإدارة)
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },

    // نوع الإعلان (للاستخدام المستقبلي لو توسعنا)
    type: {
      type: String,
      enum: ["banner", "sidebar", "popup", "custom"],
      default: "banner",
      index: true,
    },

    // مكان ظهور الإعلان في الموقع
    // سنستخدم هذا في الهوم: "home_main_banner"
    placement: {
      type: String,
      required: true,
      index: true,
      enum: [
        "home_main_banner",     // البانر الرئيسي في الصفحة الرئيسية
        "home_secondary_banner",// بانر ثانوي (مستقبلاً)
        "category_header",      // رأس صفحة قسم
        "product_sidebar",      // إعلان جانبي في صفحة منتج
      ],
    },

    // رابط عند الضغط على الإعلان (يمكن يكون داخلي أو خارجي)
    linkUrl: {
      type: String,
      trim: true,
      default: "",
    },

    // مسار صورة الإعلان (نفس فكرة الأقسام: /uploads/ads/xxx.jpg)
    image: {
      type: String,
      required: true,
      trim: true,
    },

    // هل الإعلان مفعّل أم لا
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    // تاريخ بداية ونهاية العرض (للاعلانات الموسمية)
    startAt: {
      type: Date,
      default: null,
      index: true,
    },
    endAt: {
      type: Date,
      default: null,
      index: true,
    },

    // ترتيب الظهور داخل نفس الـ placement
    sortOrder: {
      type: Number,
      default: 0,
      index: true,
    },

    // من أنشأ الإعلان (أدمن)
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    // يضيف createdAt و updatedAt تلقائياً
    // https://mongoosejs.com/docs/timestamps.html
    timestamps: true,
  }
);

const Ad = mongoose.model("Ad", adSchema);

export default Ad;
