// ────────────────────────────────────────────────
// 📁 backend/models/Transaction.js
// نموذج المعاملات المالية في نظام طلبية (Talabia)
// ────────────────────────────────────────────────

import mongoose from "mongoose";

// 🔢 ثوابت لأنواع الأدوار (من منظور الحساب المالي)
export const TRANSACTION_ROLES = ["SELLER", "SHIPPING", "PLATFORM", "SALES"];

// 🔢 ثوابت لأنواع العمليات المالية
export const TRANSACTION_TYPES = [
  "ORDER_EARNING_SELLER",
  "ORDER_EARNING_SHIPPING",
  "ORDER_EARNING_PLATFORM",
  "PAYOUT",
  "REFUND",
  "SUPPLY",
];

// 🔢 حالة المعاملة (مالية، ليست حالة الطلب)
export const TRANSACTION_STATUS = ["PENDING", "COMPLETED", "CANCELLED"];

// 🔢 اتجاه المعاملة من وجهة نظر المنصة
export const TRANSACTION_DIRECTIONS = ["CREDIT", "DEBIT"];

// 🔢 وسائل الدفع
export const TRANSACTION_PAYMENT_METHODS = ["COD", "ONLINE", "WALLET", "BANK_TRANSFER", "OTHER"];

// 💳 مخطط المعاملة (Transaction Schema)
const transactionSchema = new mongoose.Schema(
  {
    // 🧾 الطلب المرتبط (اختياري، لكن مهم لمستحقات الطلبات)
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    },

    // 👤 المشتري (اختياري، للرجوع للمشتري عند الحاجة)
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // 🏬 البائع (المتجر) المرتبط بالمعاملة (إن وجِد)
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
    },

    // 🚚 شركة الشحن المرتبطة بالمعاملة (إن وجِدت)
    shippingCompany: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ShippingCompany",
    },

    // 🧭 الدور العام لهذه المعاملة
    role: {
      type: String,
      enum: TRANSACTION_ROLES,
      required: true,
    },

    // 🎯 نوع العملية المالية
    type: {
      type: String,
      enum: TRANSACTION_TYPES,
      required: true,
    },

    // 💰 قيمة المعاملة (موجب دائمًا)
    amount: {
      type: Number,
      required: [true, "قيمة المعاملة مطلوبة"],
      min: 0,
    },

    // 💱 العملة
    currency: {
      type: String,
      default: "SAR",
    },

    // 🔀 اتجاه المعاملة من وجهة نظر المنصة
    direction: {
      type: String,
      enum: TRANSACTION_DIRECTIONS,
      required: true,
    },

    // ⏱ حالة المعاملة (مالية)
    status: {
      type: String,
      enum: TRANSACTION_STATUS,
      default: "PENDING",
    },

    // 💳 وسيلة الدفع
    paymentMethod: {
      type: String,
      enum: TRANSACTION_PAYMENT_METHODS,
      default: "COD",
    },

    // 🧾 رقم مرجعي
    reference: {
      type: String,
      trim: true,
    },

    // 📝 وصف / ملاحظة للمعاملة
    note: {
      type: String,
      trim: true,
      maxlength: 300,
    },

    // 📅 وقت المعالجة الفعلية
    processedAt: {
      type: Date,
    },

    // ✅ مفتاح مصدر لمنع التكرار (Idempotency Key)
    // مثال:
    // order:<orderId>:type:ORDER_EARNING_SELLER:role:SELLER:store:<storeId>
    sourceKey: {
      type: String,
      trim: true,
      // ⚠️ لا نضع index: true هنا حتى لا يتكرر مع schema.index()
    },
  },
  {
    timestamps: true,
  }
);

// 📌 فهارس مفيدة للبحث والترشيح في الإدارة المالية
transactionSchema.index({ role: 1, status: 1, createdAt: -1 });
transactionSchema.index({ store: 1, createdAt: -1 });
transactionSchema.index({ shippingCompany: 1, createdAt: -1 });
transactionSchema.index({ order: 1 });
transactionSchema.index({ paymentMethod: 1 });

// ✅ تحسين للأدمن: فلترة حسب role/type/status مع أحدثية
transactionSchema.index({ role: 1, type: 1, status: 1, createdAt: -1 });

// ✅ حماية من التكرار (سارية فقط لو sourceKey موجود)
transactionSchema.index({ sourceKey: 1 }, { unique: true, sparse: true });

// 🔁 دوال ثابتة (اختيارية)
transactionSchema.statics.ROLES = TRANSACTION_ROLES;
transactionSchema.statics.TYPES = TRANSACTION_TYPES;
transactionSchema.statics.STATUS = TRANSACTION_STATUS;
transactionSchema.statics.DIRECTIONS = TRANSACTION_DIRECTIONS;
transactionSchema.statics.PAYMENT_METHODS = TRANSACTION_PAYMENT_METHODS;

// ✅ إنشاء النموذج
const Transaction = mongoose.model("Transaction", transactionSchema);

export default Transaction;
