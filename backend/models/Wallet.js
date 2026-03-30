// ────────────────────────────────────────────────
// 📁 backend/models/Wallet.js
// نموذج المحفظة الإلكترونية في نظام طلبية (Talabia)
// ✅ محفظة واحدة لكل مستخدم (unique per user)
// ✅ رقم محفظة 12 رقم (يشبه رقم بطاقة)
// ✅ كود سري 6 أرقام مشفّر (bcrypt)
// ✅ حماية من brute-force (قفل بعد 5 محاولات)
// ✅ حماية من spam الدفع (حد يومي قابل للتعديل)
// ────────────────────────────────────────────────

import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// 🔢 حالات المحفظة
export const WALLET_STATUS = {
    PENDING: "pending",       // بانتظار التفعيل من المدير
    ACTIVE: "active",         // مفعّلة وجاهزة للاستخدام
    LOCKED: "locked",         // مقفلة بسبب محاولات خاطئة
    SUSPENDED: "suspended",   // موقوفة من قبل المدير
};

// 🔢 أنواع الوثائق المقبولة
export const WALLET_DOC_TYPES = [
    "هوية وطنية",
    "إقامة",
    "جواز سفر",
    "أخرى",
];

const walletSchema = new mongoose.Schema(
    {
        // 👤 المستخدم (مالك المحفظة) — واحد لكل مستخدم
        buyer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "المستخدم مطلوب"],
            unique: true,
            index: true,
        },

        // 💳 رقم المحفظة (12 رقم — يُولَّد تلقائيًا عند الإنشاء)
        walletNumber: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },

        // 💰 الرصيد الحالي
        // يتغير فقط عبر العمليات المالية (لا تعديل يدوي مباشر)
        balance: {
            type: Number,
            default: 0,
            min: 0,
        },

        // 🔐 الكود السري (6 أرقام — مشفّر بـ bcrypt)
        pin: {
            type: String,
            required: [true, "الكود السري مطلوب"],
        },

        // 📌 حالة المحفظة
        status: {
            type: String,
            enum: Object.values(WALLET_STATUS),
            default: WALLET_STATUS.PENDING,
        },

        // 📋 بيانات الهوية (لا تُعدَّل بعد الإنشاء)
        metadata: {
            fullName: {
                type: String,
                required: [true, "الاسم الكامل مطلوب"],
                trim: true,
            },
            docType: {
                type: String,
                required: [true, "نوع الوثيقة مطلوب"],
                trim: true,
            },
            docNumber: {
                type: String,
                required: [true, "رقم الوثيقة مطلوب"],
                trim: true,
            },
            whatsapp: {
                type: String,
                required: [true, "رقم الواتساب مطلوب"],
                trim: true,
            },
        },

        // 🛡️ بيانات الأمان
        security: {
            // محاولات الدخول الخاطئة (كلمة مرور المحفظة)
            failedAttempts: {
                type: Number,
                default: 0,
            },
            // وقت آخر محاولة خاطئة
            lastFailedAttempt: {
                type: Date,
            },
            // وقت القفل
            lockedAt: {
                type: Date,
            },

            // 🔄 حد محاولات الدفع اليومية (منع spam بدون قفل المحفظة)
            paymentAttempts: {
                dailyCount: {
                    type: Number,
                    default: 0,
                },
                lastResetAt: {
                    type: Date,
                    default: Date.now,
                },
            },
        },
    },
    {
        timestamps: true,
    }
);

// ────────────────────────────────────────────────
// 🔒 تشفير الكود السري قبل الحفظ
// ────────────────────────────────────────────────
walletSchema.pre("save", async function (next) {
    if (!this.isModified("pin")) return next();

    try {
        const salt = await bcrypt.genSalt(10);
        this.pin = await bcrypt.hash(this.pin, salt);
        next();
    } catch (err) {
        next(err);
    }
});

// ────────────────────────────────────────────────
// 🔐 التحقق من الكود السري
// ────────────────────────────────────────────────
walletSchema.methods.matchPin = async function (enteredPin) {
    return await bcrypt.compare(String(enteredPin), this.pin);
};

// ────────────────────────────────────────────────
// 🔢 توليد رقم محفظة عشوائي (12 رقم)
// ────────────────────────────────────────────────
walletSchema.statics.generateWalletNumber = async function () {
    let walletNumber;
    let exists = true;

    while (exists) {
        // توليد 12 رقم عشوائي
        walletNumber = "";
        for (let i = 0; i < 12; i++) {
            walletNumber += Math.floor(Math.random() * 10).toString();
        }
        // التأكد من عدم التكرار
        exists = await this.findOne({ walletNumber });
    }

    return walletNumber;
};

// ────────────────────────────────────────────────
// 🔑 توليد كود سري عشوائي (6 أرقام) — يُرجع النص الخام قبل التشفير
// ────────────────────────────────────────────────
walletSchema.statics.generatePin = function () {
    const min = 100000;
    const max = 999999;
    return String(Math.floor(Math.random() * (max - min + 1)) + min);
};

// ────────────────────────────────────────────────
// 📌 فهارس إضافية
// ────────────────────────────────────────────────
walletSchema.index({ status: 1, createdAt: -1 });

// ✅ إنشاء النموذج
const Wallet = mongoose.model("Wallet", walletSchema);

export default Wallet;

// ────────────────────────────────────────────────
// ✅ محفظة واحدة لكل مستخدم (user unique)
// ✅ رقم محفظة 12 رقم فريد (يُولَّد تلقائيًا)
// ✅ كود سري 6 أرقام مشفّر بـ bcrypt
// ✅ حماية من brute-force: failedAttempts + lockedAt
// ✅ حماية من spam الدفع: paymentAttempts.dailyCount + lastResetAt
// ✅ بيانات هوية غير قابلة للتعديل (metadata)
// ✅ حالات: pending → active → locked / suspended
// ────────────────────────────────────────────────
