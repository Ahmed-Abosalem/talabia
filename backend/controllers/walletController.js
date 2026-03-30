// ────────────────────────────────────────────────
// 📁 backend/controllers/walletController.js
// وحدة التحكم بالمحفظة الإلكترونية (دور المستخدم)
// ✅ إنشاء المحفظة (Setup)
// ✅ التحقق من الكود والدخول (Verify PIN)
// ✅ جلب تفاصيل المحفظة (بعد فك القفل)
// ✅ طلب إيداع / سحب
// ✅ جلب سجل العمليات
// ✅ الدفع من المحفظة (مع Checkout)
// ────────────────────────────────────────────────

import asyncHandler from "express-async-handler";
import Wallet, { WALLET_STATUS } from "../models/Wallet.js";
import WalletTransaction, {
    WALLET_TX_TYPES,
    WALLET_TX_DIRECTIONS,
    WALLET_TX_STATUS,
} from "../models/WalletTransaction.js";
import WalletActionLog, {
    WALLET_ACTION_TYPES,
} from "../models/WalletActionLog.js";
import Notification from "../models/Notification.js";
import SystemSettings from "../models/SystemSettings.js";

// ────────────────────────────────────────────────
// 🔧 دوال مساعدة
// ────────────────────────────────────────────────

// جلب الحد الأقصى لمحاولات الدفع اليومية من إعدادات النظام
async function getDailyPaymentLimit() {
    try {
        const setting = await SystemSettings.findOne({
            key: "wallet_daily_payment_limit",
        });
        return setting?.value ?? 30; // القيمة الافتراضية = 30
    } catch {
        return 30;
    }
}

// التحقق من حد المحاولات اليومية وإعادة الضبط إذا مرّ 24 ساعة
function checkAndResetDailyAttempts(wallet) {
    const now = new Date();
    const lastReset = wallet.security.paymentAttempts.lastResetAt;
    const hoursDiff = (now - new Date(lastReset)) / (1000 * 60 * 60);

    if (hoursDiff >= 24) {
        wallet.security.paymentAttempts.dailyCount = 0;
        wallet.security.paymentAttempts.lastResetAt = now;
    }
}

// ────────────────────────────────────────────────
// 1️⃣ إنشاء المحفظة (المشهد الأول)
// POST /api/wallet/setup
// ────────────────────────────────────────────────
export const setupWallet = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    // التحقق من عدم وجود محفظة مسبقة
    const existing = await Wallet.findOne({ buyer: userId });
    if (existing) {
        res.status(400);
        throw new Error("لديك محفظة بالفعل");
    }

    const { fullName, docType, docNumber, whatsapp, pin } = req.body;

    // التحقق من البيانات المطلوبة
    if (!fullName || !docType || !docNumber || !whatsapp || !pin) {
        res.status(400);
        throw new Error("جميع الحقول مطلوبة: الاسم، نوع الوثيقة، رقم الوثيقة، رقم الواتساب، كلمة مرور المحفظة");
    }

    // التحقق من أن كلمة المرور 6 أرقام
    if (!/^\d{6}$/.test(String(pin))) {
        res.status(400);
        throw new Error("كلمة مرور المحفظة يجب أن تكون 6 أرقام");
    }

    // توليد رقم المحفظة
    const walletNumber = await Wallet.generateWalletNumber();

    // إنشاء المحفظة بكلمة المرور التي اختارها المستخدم
    const wallet = await Wallet.create({
        buyer: userId,
        walletNumber,
        pin: String(pin), // سيُشفَّر تلقائيًا في pre-save hook
        status: WALLET_STATUS.ACTIVE,
        metadata: {
            fullName: fullName.trim(),
            docType: docType.trim(),
            docNumber: docNumber.trim(),
            whatsapp: whatsapp.trim(),
        },
    });

    // تسجيل إجراء الإنشاء في سجل الإجراءات
    await WalletActionLog.create({
        wallet: wallet._id,
        action: WALLET_ACTION_TYPES.CREATED,
        description: `تم إنشاء محفظة جديدة بواسطة المستخدم "${fullName}"`,
        performedBy: userId,
        isAutomatic: false,
        ipAddress: req.ip,
    });

    // إرسال إشعار للمديرين (جميع الأدمنز)
    try {
        const User = (await import("../models/User.js")).default;
        const admins = await User.find({ role: "admin", isActive: true }).select("_id");
        const notifications = admins.map((admin) => ({
            user: admin._id,
            title: "محفظة جديدة تم إنشاؤها",
            message: `المستخدم "${fullName}" أنشأ محفظة جديدة بنجاح وتم تفعيلها تلقائياً.`,
            type: "system",
            link: "/admin",
        }));
        if (notifications.length > 0) {
            await Notification.insertMany(notifications);
        }
    } catch (err) {
        console.error("فشل إرسال إشعار المحفظة الجديدة للمديرين:", err);
    }

    res.status(201).json({
        message: "مبروك! تم إنشاء محفظتك بنجاح وهي جاهزة للاستخدام.",
        status: wallet.status,
    });
});

// ────────────────────────────────────────────────
// 2️⃣ جلب حالة المحفظة (هل موجودة؟ ما حالتها؟)
// GET /api/wallet/status
// ────────────────────────────────────────────────
export const getWalletStatus = asyncHandler(async (req, res) => {
    const wallet = await Wallet.findOne({ buyer: req.user.id }).select(
        "status walletNumber balance metadata.fullName"
    );

    if (!wallet) {
        return res.json({ exists: false });
    }

    res.json({
        exists: true,
        status: wallet.status,
        walletNumber: wallet.walletNumber || "",
        balance: wallet.balance || 0,
        fullName: wallet.metadata?.fullName || "",
    });
});

// ────────────────────────────────────────────────
// 3️⃣ التحقق من الكود والدخول (المشهد الثالث)
// POST /api/wallet/verify
// ────────────────────────────────────────────────
export const verifyWalletPin = asyncHandler(async (req, res) => {
    const { pin } = req.body;

    if (!pin) {
        res.status(400);
        throw new Error("الكود السري مطلوب");
    }

    const wallet = await Wallet.findOne({ buyer: req.user.id });

    if (!wallet) {
        res.status(404);
        throw new Error("لا توجد محفظة مرتبطة بحسابك");
    }

    // التحقق من أن المحفظة مفعّلة
    if (wallet.status === WALLET_STATUS.PENDING) {
        res.status(403);
        throw new Error("المحفظة لم تُفعَّل بعد. يرجى التواصل مع الإدارة.");
    }

    if (wallet.status === WALLET_STATUS.LOCKED) {
        res.status(403);
        throw new Error("المحفظة مقفلة بسبب محاولات دخول خاطئة. تواصل مع الإدارة.");
    }

    if (wallet.status === WALLET_STATUS.SUSPENDED) {
        res.status(403);
        throw new Error("المحفظة موقوفة. تواصل مع الإدارة.");
    }

    // التحقق من الكود
    const isMatch = await wallet.matchPin(String(pin));

    if (!isMatch) {
        // زيادة عداد المحاولات الخاطئة
        wallet.security.failedAttempts += 1;
        wallet.security.lastFailedAttempt = new Date();

        // قفل بعد 5 محاولات
        if (wallet.security.failedAttempts >= 5) {
            wallet.status = WALLET_STATUS.LOCKED;
            wallet.security.lockedAt = new Date();

            // تسجيل حدث القفل
            await WalletActionLog.create({
                wallet: wallet._id,
                action: WALLET_ACTION_TYPES.LOCKED,
                description: `تم قفل المحفظة تلقائيًا بعد ${wallet.security.failedAttempts} محاولات خاطئة`,
                isAutomatic: true,
                ipAddress: req.ip,
            });

            await wallet.save();

            res.status(403);
            throw new Error("تم إيقاف المحفظة بسبب محاولات دخول خاطئة.");
        }

        await wallet.save();

        const remaining = 5 - wallet.security.failedAttempts;
        res.status(401);
        throw new Error(`كود خاطئ. المحاولات المتبقية: ${remaining}`);
    }

    // ✅ الكود صحيح — إعادة تصفير المحاولات
    wallet.security.failedAttempts = 0;
    await wallet.save();

    res.json({
        success: true,
        walletId: wallet._id,
        walletNumber: wallet.walletNumber,
        balance: wallet.balance,
        fullName: wallet.metadata?.fullName || "",
    });
});

// ────────────────────────────────────────────────
// 4️⃣ جلب تفاصيل المحفظة (بعد الدخول)
// GET /api/wallet/details
// ────────────────────────────────────────────────
export const getWalletDetails = asyncHandler(async (req, res) => {
    const wallet = await Wallet.findOne({ buyer: req.user.id }).select(
        "walletNumber balance metadata.fullName status"
    );

    if (!wallet) {
        res.status(404);
        throw new Error("لا توجد محفظة مرتبطة بحسابك");
    }

    res.json({
        walletNumber: wallet.walletNumber,
        balance: wallet.balance,
        fullName: wallet.metadata?.fullName || "",
        status: wallet.status,
    });
});

// ────────────────────────────────────────────────
// 5️⃣ طلب إيداع (المشهد الرابع)
// POST /api/wallet/deposit
// ────────────────────────────────────────────────
export const requestDeposit = asyncHandler(async (req, res) => {
    const { senderName, transactionRef, amount } = req.body;

    if (!senderName || !transactionRef || !amount) {
        res.status(400);
        throw new Error("جميع الحقول مطلوبة: اسم المحوّل، رقم الحوالة، المبلغ");
    }

    const numAmount = Number(amount);
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
        res.status(400);
        throw new Error("المبلغ يجب أن يكون رقمًا موجبًا");
    }

    const wallet = await Wallet.findOne({ buyer: req.user.id });
    if (!wallet || wallet.status !== WALLET_STATUS.ACTIVE) {
        res.status(403);
        throw new Error("المحفظة غير مفعّلة أو غير موجودة");
    }

    // إنشاء عملية إيداع بحالة "pending"
    const tx = await WalletTransaction.create({
        wallet: wallet._id,
        type: WALLET_TX_TYPES.DEPOSIT,
        direction: WALLET_TX_DIRECTIONS.CREDIT,
        amount: numAmount,
        balanceBefore: wallet.balance,
        balanceAfter: wallet.balance, // لن يتغير حتى يوافق المدير
        status: WALLET_TX_STATUS.PENDING,
        reference: WalletTransaction.generateReference(),
        note: "طلب إيداع بانتظار موافقة الإدارة",
        transferDetails: {
            senderName: senderName.trim(),
            transactionRef: transactionRef.trim(),
            amount: numAmount,
        },
    });

    // إشعار المدير
    try {
        const User = (await import("../models/User.js")).default;
        const admins = await User.find({ role: "admin", isActive: true }).select("_id");
        const notifications = admins.map((admin) => ({
            user: admin._id,
            title: "طلب إيداع جديد",
            message: `طلب إيداع ${numAmount} ريال من "${wallet.metadata.fullName}" بانتظار الموافقة.`,
            type: "system",
            link: "/admin",
        }));
        if (notifications.length > 0) {
            await Notification.insertMany(notifications);
        }
    } catch (err) {
        console.error("فشل إرسال إشعار الإيداع:", err);
    }

    res.status(201).json({
        message: "تم إرسال طلب الإيداع إلى الإدارة بنجاح. سيظهر المبلغ المودع في رصيد محفظتك فور تحقق الإدارة من الإيداع الفعلي.",
        reference: tx.reference,
    });
});

// ────────────────────────────────────────────────
// 6️⃣ طلب سحب (المشهد التاسع)
// POST /api/wallet/withdraw
// ────────────────────────────────────────────────
export const requestWithdrawal = asyncHandler(async (req, res) => {
    const { bankName, accountNumber, accountHolder, amount } = req.body;

    if (!bankName || !accountNumber || !accountHolder || !amount) {
        res.status(400);
        throw new Error(
            "جميع الحقول مطلوبة: اسم البنك، رقم الحساب، اسم المستفيد، المبلغ"
        );
    }

    const numAmount = Number(amount);
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
        res.status(400);
        throw new Error("المبلغ يجب أن يكون رقمًا موجبًا");
    }

    const wallet = await Wallet.findOne({ buyer: req.user.id });
    if (!wallet || wallet.status !== WALLET_STATUS.ACTIVE) {
        res.status(403);
        throw new Error("المحفظة غير مفعّلة أو غير موجودة");
    }

    if (wallet.balance < numAmount) {
        res.status(400);
        throw new Error("الرصيد غير كافٍ");
    }

    // إنشاء عملية سحب بحالة "pending"
    const tx = await WalletTransaction.create({
        wallet: wallet._id,
        type: WALLET_TX_TYPES.WITHDRAWAL,
        direction: WALLET_TX_DIRECTIONS.DEBIT,
        amount: numAmount,
        balanceBefore: wallet.balance,
        balanceAfter: wallet.balance, // لن يتغير حتى يوافق المدير
        status: WALLET_TX_STATUS.PENDING,
        reference: WalletTransaction.generateReference(),
        note: "طلب سحب بانتظار موافقة الإدارة",
        transferDetails: {
            bankName: bankName.trim(),
            accountNumber: accountNumber.trim(),
            accountHolder: accountHolder.trim(),
            amount: numAmount,
        },
    });

    // إشعار المدير
    try {
        const User = (await import("../models/User.js")).default;
        const admins = await User.find({ role: "admin", isActive: true }).select("_id");
        const notifications = admins.map((admin) => ({
            user: admin._id,
            title: "طلب سحب جديد",
            message: `طلب سحب ${numAmount} ريال من "${wallet.metadata.fullName}" بانتظار التحويل.`,
            type: "system",
            link: "/admin",
        }));
        if (notifications.length > 0) {
            await Notification.insertMany(notifications);
        }
    } catch (err) {
        console.error("فشل إرسال إشعار السحب:", err);
    }

    res.status(201).json({
        message: "تم إرسال طلب السحب بنجاح. سيتم مراجعته من قبل الإدارة.",
        reference: tx.reference,
    });
});

// ────────────────────────────────────────────────
// 7️⃣ جلب سجل العمليات المالية
// GET /api/wallet/transactions
// ────────────────────────────────────────────────
export const getWalletTransactions = asyncHandler(async (req, res) => {
    const wallet = await Wallet.findOne({ buyer: req.user.id });
    if (!wallet) {
        res.status(404);
        throw new Error("لا توجد محفظة مرتبطة بحسابك");
    }

    const transactions = await WalletTransaction.find({ wallet: wallet._id })
        .sort({ createdAt: -1 })
        .lean();

    res.json(transactions);
});

// ────────────────────────────────────────────────
// 8️⃣ الدفع من المحفظة (المشهد الخامس) — Atomic
// POST /api/wallet/pay
// يُستدعى من orderController عند اختيار الدفع بالمحفظة
// ────────────────────────────────────────────────
export const processWalletPayment = async (walletNumber, pin, amount, orderId, buyerId, ip) => {
    // 1. البحث عن المحفظة برقمها
    const wallet = await Wallet.findOne({ walletNumber, buyer: buyerId });

    if (!wallet) {
        const error = new Error("رقم المحفظة غير صحيح");
        error.statusCode = 400;
        throw error;
    }

    // 2. التحقق من الحالة
    if (wallet.status !== WALLET_STATUS.ACTIVE) {
        const statusMessages = {
            [WALLET_STATUS.PENDING]: "المحفظة لم تُفعَّل بعد",
            [WALLET_STATUS.LOCKED]: "المحفظة مقفلة. تواصل مع الإدارة",
            [WALLET_STATUS.SUSPENDED]: "المحفظة موقوفة",
        };
        const error = new Error(
            statusMessages[wallet.status] || "المحفظة غير متاحة"
        );
        error.statusCode = 403;
        throw error;
    }

    // 3. التحقق من حد المحاولات اليومية
    checkAndResetDailyAttempts(wallet);
    const dailyLimit = await getDailyPaymentLimit();

    if (wallet.security.paymentAttempts.dailyCount >= dailyLimit) {
        // تسجيل تجاوز الحد
        await WalletActionLog.create({
            wallet: wallet._id,
            action: WALLET_ACTION_TYPES.PAYMENT_LIMIT_EXCEEDED,
            description: `تم تجاوز حد المحاولات اليومية (${dailyLimit} محاولة)`,
            isAutomatic: true,
            ipAddress: ip,
        });

        await wallet.save();

        const error = new Error(
            "تم تجاوز الحد الأقصى لمحاولات الدفع اليومية. حاول بعد 24 ساعة."
        );
        error.statusCode = 429;
        throw error;
    }

    // 4. (العداد اليومي يُحدّث ذريًا في الخطوة 7)

    // 5. التحقق من الكود
    const isMatch = await wallet.matchPin(String(pin));
    if (!isMatch) {
        // نحفظ عداد المحاولات اليومية يدويًا هنا لأن الدفع لم يتم
        wallet.security.paymentAttempts.dailyCount += 1;
        await wallet.save();
        const error = new Error("كلمة مرور المحفظة غير صحيحة");
        error.statusCode = 400;
        throw error;
    }

    // 6. التحقق من الرصيد
    if (wallet.balance < amount) {
        wallet.security.paymentAttempts.dailyCount += 1;
        await wallet.save();
        const error = new Error("رصيد المحفظة غير كافٍ");
        error.statusCode = 400;
        throw error;
    }

    // 7. ✅ الخصم الذري + تحديث العداد (عملية ذرية واحدة — بدون save ثانٍ)
    const updatedWallet = await Wallet.findOneAndUpdate(
        {
            _id: wallet._id,
            balance: { $gte: amount },
            status: WALLET_STATUS.ACTIVE,
        },
        {
            $inc: {
                balance: -amount,
                "security.paymentAttempts.dailyCount": 1,
            },
        },
        { new: true }
    );

    if (!updatedWallet) {
        const error = new Error(
            "فشل الخصم — الرصيد غير كافٍ أو المحفظة غير متاحة"
        );
        error.statusCode = 400;
        throw error;
    }

    // 9. تسجيل العملية في السجل المالي
    const tx = await WalletTransaction.create({
        wallet: wallet._id,
        type: WALLET_TX_TYPES.PAYMENT,
        direction: WALLET_TX_DIRECTIONS.DEBIT,
        amount,
        balanceBefore: wallet.balance,
        balanceAfter: updatedWallet.balance,
        status: WALLET_TX_STATUS.COMPLETED,
        reference: WalletTransaction.generateReference(),
        note: `دفع مقابل الطلب`,
        orderId,
    });

    return {
        success: true,
        newBalance: updatedWallet.balance,
        reference: tx.reference,
    };
};

// ────────────────────────────────────────────────
// 9️⃣ جلب بيانات الإيداع البنكي (تظهر للمستخدم عند صفحة الإيداع)
// GET /api/wallet/deposit-info
// ────────────────────────────────────────────────
export const getDepositInfo = asyncHandler(async (req, res) => {
    const setting = await SystemSettings.findOne({
        key: "wallet_deposit_info",
    });

    res.json({
        depositInfo: setting?.value ?? "",
    });
});

// ────────────────────────────────────────────────
// 🔑 تغيير كلمة مرور المحفظة (من قبل المستخدم)
// PUT /api/wallet/change-password
// ────────────────────────────────────────────────
export const changeWalletPassword = asyncHandler(async (req, res) => {
    const { oldPin, newPin } = req.body;

    if (!oldPin || !newPin) {
        res.status(400);
        throw new Error("كلمة المرور الحالية والجديدة مطلوبتان");
    }

    if (!/^\d{6}$/.test(String(newPin))) {
        res.status(400);
        throw new Error("كلمة المرور الجديدة يجب أن تكون 6 أرقام");
    }

    if (String(oldPin) === String(newPin)) {
        res.status(400);
        throw new Error("كلمة المرور الجديدة يجب أن تختلف عن الحالية");
    }

    const wallet = await Wallet.findOne({ buyer: req.user.id });

    if (!wallet) {
        res.status(404);
        throw new Error("لا توجد محفظة مرتبطة بحسابك");
    }

    if (wallet.status !== WALLET_STATUS.ACTIVE) {
        res.status(403);
        throw new Error("المحفظة غير مفعّلة");
    }

    // التحقق من كلمة المرور الحالية
    const isMatch = await wallet.matchPin(String(oldPin));
    if (!isMatch) {
        res.status(400);
        throw new Error("كلمة المرور الحالية غير صحيحة");
    }

    // تعيين كلمة المرور الجديدة
    wallet.pin = String(newPin); // سيُشفَّر تلقائيًا في pre-save hook
    wallet.security.failedAttempts = 0;
    await wallet.save();

    // تسجيل الإجراء
    await WalletActionLog.create({
        wallet: wallet._id,
        action: WALLET_ACTION_TYPES.PIN_CHANGED,
        description: "تم تغيير كلمة مرور المحفظة بواسطة المستخدم",
        performedBy: req.user.id,
        isAutomatic: false,
        ipAddress: req.ip,
    });

    res.json({ message: "تم تغيير كلمة مرور المحفظة بنجاح" });
});
