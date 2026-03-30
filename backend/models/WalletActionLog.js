// ────────────────────────────────────────────────
// 📁 backend/models/WalletActionLog.js
// سجل الإجراءات الإدارية للمحفظة (Audit Log) — غير قابل للحذف
// ✅ يسجّل كل إجراء إداري أو أمني (لا يؤثر على الرصيد)
// ✅ يشمل: إنشاء، تفعيل، إيقاف، قفل، تغيير كود، إلخ لنوعي المستخدمين (بائع/مشتري)
// ────────────────────────────────────────────────

import mongoose from "mongoose";

// 🔢 أنواع الإجراءات
export const WALLET_ACTION_TYPES = {
    CREATED: "wallet_created",               // إنشاء المحفظة
    ACTIVATED: "wallet_activated",           // تفعيل من المدير
    SUSPENDED: "wallet_suspended",           // إيقاف من المدير
    REACTIVATED: "wallet_reactivated",       // إعادة تفعيل
    LOCKED: "wallet_locked",                 // قفل تلقائي (محاولات خاطئة)
    UNLOCKED: "wallet_unlocked",             // إعادة فتح من المدير
    PIN_CHANGED: "pin_changed",             // تغيير الكود السري
    PAYMENT_LIMIT_EXCEEDED: "payment_limit_exceeded", // تجاوز حد المحاولات اليومية
    SETTINGS_UPDATED: "settings_updated",   // تعديل إعدادات المحفظة
    TRANSACTION_MANUAL: "transaction_manual", // إجراء عملية يدوية (إيداع/سحب) من المدير
};

const walletActionLogSchema = new mongoose.Schema(
    {
        // 🔗 المحفظة المرتبطة
        wallet: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Wallet",
            required: true,
            index: true,
        },

        // 🎯 نوع الإجراء
        action: {
            type: String,
            enum: Object.values(WALLET_ACTION_TYPES),
            required: [true, "نوع الإجراء مطلوب"],
        },

        // 📝 وصف الإجراء (نصي)
        description: {
            type: String,
            required: [true, "وصف الإجراء مطلوب"],
            trim: true,
            maxlength: 500,
        },

        // 👤 المنفّذ (المدير أو النظام)
        performedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },

        // 🏷️ هل الإجراء تلقائي (من النظام) أم يدوي (من المدير)
        isAutomatic: {
            type: Boolean,
            default: false,
        },

        // 🌐 عنوان IP (للأمان)
        ipAddress: {
            type: String,
            trim: true,
        },

        // 📋 بيانات إضافية (مرنة)
        extra: {
            type: mongoose.Schema.Types.Mixed,
        },
    },
    {
        timestamps: true,
    }
);

// ────────────────────────────────────────────────
// 📌 فهارس لتسريع الاستعلامات
// ────────────────────────────────────────────────
walletActionLogSchema.index({ wallet: 1, createdAt: -1 });
walletActionLogSchema.index({ action: 1, createdAt: -1 });

// ✅ إنشاء النموذج
const WalletActionLog = mongoose.model(
    "WalletActionLog",
    walletActionLogSchema
);

export default WalletActionLog;

// ────────────────────────────────────────────────
// ✅ سجل إجراءات غير قابل للحذف (Audit Log)
// ✅ لا يؤثر على الرصيد — فقط توثيق
// ✅ يدعم: إنشاء، تفعيل، إيقاف، قفل، تغيير كود
// ✅ يسجّل IP + المنفّذ + هل تلقائي أم يدوي
// ────────────────────────────────────────────────
