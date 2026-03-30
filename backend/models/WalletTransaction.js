// ────────────────────────────────────────────────
// 📁 backend/models/WalletTransaction.js
// سجل العمليات المالية للمحفظة (Ledger) — غير قابل للحذف
// ✅ يسجّل كل تغيير في الرصيد (إيداع، سحب، دفع، استرجاع)
// ✅ كل عملية تحتفظ بالرصيد قبل وبعد (balanceBefore / balanceAfter)
// ✅ مصدر الحقيقة الوحيد لحركة الأموال داخل المحفظة
// ────────────────────────────────────────────────

import mongoose from "mongoose";

// 🔢 أنواع العمليات المالية
export const WALLET_TX_TYPES = {
    DEPOSIT: "deposit",         // إيداع (بعد موافقة المدير)
    WITHDRAWAL: "withdrawal",   // سحب (بعد موافقة المدير)
    PAYMENT: "payment",         // دفع (تلقائي — بدون تدخل المدير)
    REFUND: "refund",           // استرجاع (مستقبلاً لطلبات الإرجاع)
};

// 🔢 اتجاه العملية
export const WALLET_TX_DIRECTIONS = {
    CREDIT: "credit",   // زيادة الرصيد (إيداع / استرجاع)
    DEBIT: "debit",     // خصم الرصيد (دفع / سحب)
};

// 🔢 حالة العملية
export const WALLET_TX_STATUS = {
    PENDING: "pending",       // بانتظار الموافقة (إيداع / سحب)
    COMPLETED: "completed",   // تمت بنجاح
    REJECTED: "rejected",     // مرفوضة
};

const walletTransactionSchema = new mongoose.Schema(
    {
        // 🔗 المحفظة المرتبطة
        wallet: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Wallet",
            required: true,
            index: true,
        },

        // 🎯 نوع العملية
        type: {
            type: String,
            enum: Object.values(WALLET_TX_TYPES),
            required: [true, "نوع العملية مطلوب"],
        },

        // 🔀 اتجاه العملية (credit / debit)
        direction: {
            type: String,
            enum: Object.values(WALLET_TX_DIRECTIONS),
            required: true,
        },

        // 💰 قيمة العملية (دائمًا موجبة)
        amount: {
            type: Number,
            required: [true, "قيمة العملية مطلوبة"],
            min: [0.01, "قيمة العملية يجب أن تكون أكبر من صفر"],
        },

        // 💱 العملة
        currency: {
            type: String,
            default: "SAR",
        },

        // 📊 الرصيد قبل وبعد العملية (للسجل المالي)
        balanceBefore: {
            type: Number,
            required: true,
        },
        balanceAfter: {
            type: Number,
            required: true,
        },

        // ⏱ حالة العملية
        status: {
            type: String,
            enum: Object.values(WALLET_TX_STATUS),
            default: WALLET_TX_STATUS.PENDING,
        },

        // 🧾 رقم مرجعي فريد للعملية (يُولَّد تلقائيًا)
        reference: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },

        // 📝 ملاحظة أو سبب
        note: {
            type: String,
            trim: true,
            maxlength: 500,
        },

        // 🔗 الطلب المرتبط (في حالة الدفع أو الاسترجاع)
        orderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Order",
        },

        // 📋 بيانات إضافية (للإيداع والسحب)
        transferDetails: {
            // إيداع: اسم المحوّل + رقم الحوالة
            senderName: { type: String, trim: true },
            transactionRef: { type: String, trim: true },
            amount: { type: Number },

            // سحب: بيانات الحساب البنكي للمستفيد
            bankName: { type: String, trim: true },
            accountNumber: { type: String, trim: true },
            accountHolder: { type: String, trim: true },
        },

        // 👤 المدير الذي وافق / رفض (للعمليات اليدوية)
        processedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },

        // 📅 وقت المعالجة الفعلية
        processedAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

// ────────────────────────────────────────────────
// 🔑 توليد رقم مرجعي فريد
// ────────────────────────────────────────────────
walletTransactionSchema.statics.generateReference = function () {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `WT-${timestamp}-${random}`;
};

// ────────────────────────────────────────────────
// 📌 فهارس لتسريع الاستعلامات
// ────────────────────────────────────────────────
walletTransactionSchema.index({ wallet: 1, createdAt: -1 });
walletTransactionSchema.index({ type: 1, status: 1, createdAt: -1 });
walletTransactionSchema.index({ status: 1, createdAt: -1 });
walletTransactionSchema.index({ orderId: 1 });

// ✅ إنشاء النموذج
const WalletTransaction = mongoose.model(
    "WalletTransaction",
    walletTransactionSchema
);

export default WalletTransaction;

// ────────────────────────────────────────────────
// ✅ سجل مالي غير قابل للحذف (Immutable Ledger)
// ✅ كل عملية تحفظ الرصيد قبل وبعد
// ✅ يدعم: إيداع، سحب، دفع، استرجاع
// ✅ رقم مرجعي فريد لكل عملية
// ✅ بيانات التحويل البنكي مضمّنة (للإيداع والسحب)
// ✅ ربط بالطلب (للدفع والاسترجاع)
// ────────────────────────────────────────────────
