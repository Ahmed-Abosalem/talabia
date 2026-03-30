// ────────────────────────────────────────────────
// 📁 backend/models/Category.js
// نموذج الأقسام الرئيسية في متجر طلبية (النسخة النهائية مع حقل العمولة)
// ────────────────────────────────────────────────

import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "اسم القسم مطلوب"],
      unique: true,
      trim: true,
      minlength: 2,
      maxlength: 50,
    },

    slug: {
      type: String,
      trim: true,
      lowercase: true,
      index: true,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    // 🔥 صورة القسم (مطلوبة لعرضها في الواجهة الرئيسية)
    image: {
      type: String,
      default: "",
      trim: true,
    },

    // 🔥 ترتيب القسم في الواجهة + يدعم السحب والإفلات
    sortOrder: {
      type: Number,
      default: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    // 🛡️ قسم محمي (مثل "الكل") لا يمكن حذفه
    isProtected: {
      type: Boolean,
      default: false,
    },

    // 💰 نسبة عمولة المنصة على هذا القسم
    // 0   → بدون عمولة
    // 0.1 → 10%
    // 0.2 → 20%
    commissionRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 1,
    },
  },
  {
    timestamps: true,
  }
);

const Category = mongoose.model("Category", categorySchema);

export default Category;

// ────────────────────────────────────────────────
// 🚀 جاهز لربطه مع المنتجات ولوحة تحكم الأدمن ومعرض الواجهة الرئيسية.
// لاحقًا سنستخدم commissionRate لحساب صافي إيراد البائع بعد خصم عمولة المنصة.
// ────────────────────────────────────────────────
