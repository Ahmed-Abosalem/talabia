// ────────────────────────────────────────────────
// 📁 backend/controllers/admin/adminWalletController.js
// إدارة المحافظ الإلكترونية (دور المدير)
// ✅ عرض جميع المحافظ
// ✅ تفعيل / إيقاف / إعادة تفعيل / قفل
// ✅ تغيير الكود السري
// ✅ الموافقة على الإيداع / السحب
// ✅ عرض سجل العمليات والإجراءات
// ✅ إعدادات المحفظة (حد المحاولات)
// ────────────────────────────────────────────────

import asyncHandler from "express-async-handler";
import Wallet, { WALLET_STATUS } from "../../models/Wallet.js";
import WalletTransaction, {
    WALLET_TX_TYPES,
    WALLET_TX_DIRECTIONS,
    WALLET_TX_STATUS,
} from "../../models/WalletTransaction.js";
import WalletActionLog, {
    WALLET_ACTION_TYPES,
} from "../../models/WalletActionLog.js";
import Notification from "../../models/Notification.js";
import SystemSettings from "../../models/SystemSettings.js";

// ────────────────────────────────────────────────
// 1️⃣ عرض جميع المحافظ
// GET /api/admin/wallets
// ────────────────────────────────────────────────
export const listWallets = asyncHandler(async (req, res) => {
    const { status } = req.query;
    const filter = {};
    if (status && Object.values(WALLET_STATUS).includes(status)) {
        filter.status = status;
    }

    const wallets = await Wallet.find(filter)
        .populate("buyer", "name email phone role")
        .sort({ createdAt: -1 })
        .lean();

    res.json(wallets);
});

// ────────────────────────────────────────────────
// 2️⃣ تفاصيل محفظة واحدة
// GET /api/admin/wallets/:id
// ────────────────────────────────────────────────
export const getWalletById = asyncHandler(async (req, res) => {
    const wallet = await Wallet.findById(req.params.id)
        .populate("buyer", "name email phone role")
        .lean();

    if (!wallet) {
        res.status(404);
        throw new Error("المحفظة غير موجودة");
    }

    res.json(wallet);
});

// ────────────────────────────────────────────────
// 3️⃣ تفعيل المحفظة (المشهد الثاني)
// PUT /api/admin/wallets/:id/activate
// ────────────────────────────────────────────────
export const activateWallet = asyncHandler(async (req, res) => {
    const wallet = await Wallet.findById(req.params.id);
    if (!wallet) {
        res.status(404);
        throw new Error("المحفظة غير موجودة");
    }

    if (wallet.status === WALLET_STATUS.ACTIVE) {
        res.status(400);
        throw new Error("المحفظة مفعّلة بالفعل");
    }

    wallet.status = WALLET_STATUS.ACTIVE;
    wallet.security.failedAttempts = 0;
    await wallet.save();

    // تسجيل الإجراء
    await WalletActionLog.create({
        wallet: wallet._id,
        action: WALLET_ACTION_TYPES.ACTIVATED,
        description: `تم تفعيل المحفظة بواسطة المدير`,
        performedBy: req.user.id,
        ipAddress: req.ip,
    });

    // إشعار المستخدم
    try {
        const userRole = wallet.buyer?.role || "buyer";
        const dashboardPath = userRole === "admin" ? "/admin" : `/${userRole}/wallet`;

        await Notification.create({
            user: wallet.buyer,
            title: "تم تفعيل محفظتك",
            message: "تم تفعيل محفظتك بنجاح. يمكنك الآن استخدامها للإيداع والدفع.",
            type: "system",
            link: dashboardPath,
        });
    } catch (err) {
        console.error("فشل إرسال إشعار التفعيل:", err);
    }

    res.json({ message: "تم تفعيل المحفظة بنجاح", status: wallet.status });
});

// ────────────────────────────────────────────────
// 4️⃣ إيقاف المحفظة
// PUT /api/admin/wallets/:id/suspend
// ────────────────────────────────────────────────
export const suspendWallet = asyncHandler(async (req, res) => {
    const wallet = await Wallet.findById(req.params.id);
    if (!wallet) {
        res.status(404);
        throw new Error("المحفظة غير موجودة");
    }

    wallet.status = WALLET_STATUS.SUSPENDED;
    await wallet.save();

    await WalletActionLog.create({
        wallet: wallet._id,
        action: WALLET_ACTION_TYPES.SUSPENDED,
        description: `تم إيقاف المحفظة بواسطة المدير`,
        performedBy: req.user.id,
        ipAddress: req.ip,
    });

    res.json({ message: "تم إيقاف المحفظة", status: wallet.status });
});

// ────────────────────────────────────────────────
// 5️⃣ إعادة تفعيل (فك القفل) — المشهد السابع
// PUT /api/admin/wallets/:id/reactivate
// ────────────────────────────────────────────────
export const reactivateWallet = asyncHandler(async (req, res) => {
    const wallet = await Wallet.findById(req.params.id);
    if (!wallet) {
        res.status(404);
        throw new Error("المحفظة غير موجودة");
    }

    // ✅ حفظ الحالة الأصلية قبل التعديل لتسجيل السجل بشكل صحيح
    const previousStatus = wallet.status;

    wallet.status = WALLET_STATUS.ACTIVE;
    wallet.security.failedAttempts = 0;
    wallet.security.lockedAt = undefined;
    await wallet.save();

    const action =
        previousStatus === WALLET_STATUS.LOCKED
            ? WALLET_ACTION_TYPES.UNLOCKED
            : WALLET_ACTION_TYPES.REACTIVATED;

    await WalletActionLog.create({
        wallet: wallet._id,
        action,
        description: `تم إعادة تفعيل المحفظة بواسطة المدير (الحالة السابقة: ${previousStatus})`,
        performedBy: req.user.id,
        ipAddress: req.ip,
    });

    // إشعار المستخدم
    try {
        const userRole = wallet.buyer?.role || "buyer";
        const dashboardPath = userRole === "admin" ? "/admin" : `/${userRole}/wallet`;

        await Notification.create({
            user: wallet.buyer,
            title: "تم إعادة تفعيل محفظتك",
            message: "تمت إعادة تفعيل محفظتك. يمكنك الدخول واستخدامها الآن.",
            type: "system",
            link: dashboardPath,
        });
    } catch (err) {
        console.error("فشل إرسال إشعار إعادة التفعيل:", err);
    }

    res.json({ message: "تم إعادة تفعيل المحفظة", status: WALLET_STATUS.ACTIVE });
});

// ────────────────────────────────────────────────
// 6️⃣ تغيير الكود السري — المشهد الثامن
// PUT /api/admin/wallets/:id/change-pin
// ────────────────────────────────────────────────
export const changeWalletPin = asyncHandler(async (req, res) => {
    const wallet = await Wallet.findById(req.params.id);
    if (!wallet) {
        res.status(404);
        throw new Error("المحفظة غير موجودة");
    }

    // توليد كلمة مرور جديدة
    const newPin = Wallet.generatePin();
    wallet.pin = newPin; // سيُشفَّر تلقائيًا
    wallet.security.failedAttempts = 0;
    await wallet.save();

    await WalletActionLog.create({
        wallet: wallet._id,
        action: WALLET_ACTION_TYPES.PIN_CHANGED,
        description: `تم إعادة تعيين كلمة مرور المحفظة بواسطة المدير`,
        performedBy: req.user.id,
        ipAddress: req.ip,
    });

    // نُرجع كلمة المرور الجديدة للمدير فقط (ليعطيها للمشتري عبر الواتساب)
    res.json({
        message: "تم إعادة تعيين كلمة مرور المحفظة بنجاح",
        newPin,
    });
});

// ────────────────────────────────────────────────
// 7️⃣ الموافقة على الإيداع — المشهد الرابع (جانب المدير)
// PUT /api/admin/wallets/transactions/:txId/approve-deposit
// ────────────────────────────────────────────────
export const approveDeposit = asyncHandler(async (req, res) => {
    const tx = await WalletTransaction.findById(req.params.txId);

    if (!tx) {
        res.status(404);
        throw new Error("العملية غير موجودة");
    }

    if (tx.type !== WALLET_TX_TYPES.DEPOSIT) {
        res.status(400);
        throw new Error("هذه العملية ليست إيداع");
    }

    if (tx.status !== WALLET_TX_STATUS.PENDING) {
        res.status(400);
        throw new Error("هذه العملية تمت معالجتها مسبقًا");
    }

    // المدير يحدد المبلغ الفعلي المودع (قد يختلف عن ما ادعاه المستخدم)
    const actualAmount = Number(req.body.actualAmount);
    if (!Number.isFinite(actualAmount) || actualAmount <= 0) {
        res.status(400);
        throw new Error("يجب إدخال المبلغ الفعلي المودع (رقم أكبر من صفر)");
    }

    // تحديث الرصيد بشكل ذري — بالمبلغ الفعلي
    const wallet = await Wallet.findOneAndUpdate(
        { _id: tx.wallet, status: WALLET_STATUS.ACTIVE },
        { $inc: { balance: actualAmount } },
        { new: true }
    );

    if (!wallet) {
        res.status(400);
        throw new Error("المحفظة غير مفعّلة أو غير موجودة");
    }

    // تحديث العملية — نحفظ المبلغ الفعلي
    tx.amount = actualAmount;
    tx.status = WALLET_TX_STATUS.COMPLETED;
    tx.balanceAfter = wallet.balance;
    tx.processedBy = req.user.id;
    tx.processedAt = new Date();
    await tx.save();

    // إشعار المستخدم
    try {
        const userRole = wallet.buyer?.role || "buyer";
        const dashboardPath = userRole === "admin" ? "/admin" : `/${userRole}/wallet`;

        await Notification.create({
            user: wallet.buyer,
            title: "تم تأكيد الإيداع",
            message: `تم إيداع ${actualAmount} ريال في محفظتك. رصيدك الحالي: ${wallet.balance} ريال.`,
            type: "system",
            link: dashboardPath,
        });
    } catch (err) {
        console.error("فشل إرسال إشعار الإيداع:", err);
    }

    res.json({
        message: `تم تأكيد الإيداع بنجاح (${actualAmount} ريال). الرصيد الجديد: ${wallet.balance} ريال`,
        newBalance: wallet.balance,
    });
});

// ────────────────────────────────────────────────
// 8️⃣ رفض الإيداع
// PUT /api/admin/wallets/transactions/:txId/reject-deposit
// ────────────────────────────────────────────────
export const rejectDeposit = asyncHandler(async (req, res) => {
    const tx = await WalletTransaction.findById(req.params.txId);

    if (!tx || tx.type !== WALLET_TX_TYPES.DEPOSIT) {
        res.status(404);
        throw new Error("العملية غير موجودة أو ليست إيداع");
    }

    if (tx.status !== WALLET_TX_STATUS.PENDING) {
        res.status(400);
        throw new Error("هذه العملية تمت معالجتها مسبقًا");
    }

    tx.status = WALLET_TX_STATUS.REJECTED;
    tx.processedBy = req.user.id;
    tx.processedAt = new Date();
    tx.note = req.body.reason || "مرفوض من قبل الإدارة";
    await tx.save();

    // إشعار المستخدم
    try {
        const wallet = await Wallet.findById(tx.wallet).populate("buyer", "role");
        if (wallet) {
            const userRole = wallet.buyer?.role || "buyer";
            const dashboardPath = userRole === "admin" ? "/admin" : `/${userRole}/wallet`;

            await Notification.create({
                user: wallet.buyer,
                title: "طلب الإيداع مرفوض",
                message: `تم رفض طلب إيداع ${tx.amount} ريال. السبب: ${tx.note}`,
                type: "system",
                link: dashboardPath,
            });
        }
    } catch (err) {
        console.error("فشل إرسال إشعار رفض الإيداع:", err);
    }

    res.json({ message: "تم رفض طلب الإيداع" });
});

// ────────────────────────────────────────────────
// 9️⃣ الموافقة على السحب — المشهد التاسع (جانب المدير)
// PUT /api/admin/wallets/transactions/:txId/approve-withdrawal
// ────────────────────────────────────────────────
export const approveWithdrawal = asyncHandler(async (req, res) => {
    const tx = await WalletTransaction.findById(req.params.txId);

    if (!tx) {
        res.status(404);
        throw new Error("العملية غير موجودة");
    }

    if (tx.type !== WALLET_TX_TYPES.WITHDRAWAL) {
        res.status(400);
        throw new Error("هذه العملية ليست سحب");
    }

    if (tx.status !== WALLET_TX_STATUS.PENDING) {
        res.status(400);
        throw new Error("هذه العملية تمت معالجتها مسبقًا");
    }

    // خصم الرصيد بشكل ذري
    const wallet = await Wallet.findOneAndUpdate(
        {
            _id: tx.wallet,
            status: WALLET_STATUS.ACTIVE,
            balance: { $gte: tx.amount },
        },
        { $inc: { balance: -tx.amount } },
        { new: true }
    );

    if (!wallet) {
        res.status(400);
        throw new Error("المحفظة غير مفعّلة أو الرصيد غير كافٍ");
    }

    // تحديث العملية
    tx.status = WALLET_TX_STATUS.COMPLETED;
    tx.balanceAfter = wallet.balance;
    tx.processedBy = req.user.id;
    tx.processedAt = new Date();
    await tx.save();

    // إشعار المستخدم
    try {
        const userRole = wallet.buyer?.role || "buyer";
        const dashboardPath = userRole === "admin" ? "/admin" : `/${userRole}/wallet`;

        await Notification.create({
            user: wallet.buyer,
            title: "تم تأكيد السحب",
            message: `تم سحب ${tx.amount} ريال من محفظتك. رصيدك الحالي: ${wallet.balance} ريال.`,
            type: "system",
            link: dashboardPath,
        });
    } catch (err) {
        console.error("فشل إرسال إشعار السحب:", err);
    }

    res.json({
        message: `تم تأكيد السحب بنجاح. الرصيد الجديد: ${wallet.balance} ريال`,
        newBalance: wallet.balance,
    });
});

// ────────────────────────────────────────────────
// 🔟 رفض السحب
// PUT /api/admin/wallets/transactions/:txId/reject-withdrawal
// ────────────────────────────────────────────────
export const rejectWithdrawal = asyncHandler(async (req, res) => {
    const tx = await WalletTransaction.findById(req.params.txId);

    if (!tx || tx.type !== WALLET_TX_TYPES.WITHDRAWAL) {
        res.status(404);
        throw new Error("العملية غير موجودة أو ليست سحب");
    }

    if (tx.status !== WALLET_TX_STATUS.PENDING) {
        res.status(400);
        throw new Error("هذه العملية تمت معالجتها مسبقًا");
    }

    tx.status = WALLET_TX_STATUS.REJECTED;
    tx.processedBy = req.user.id;
    tx.processedAt = new Date();
    tx.note = req.body.reason || "مرفوض من قبل الإدارة";
    await tx.save();

    // إشعار المستخدم
    try {
        const wallet = await Wallet.findById(tx.wallet).populate("buyer", "role");
        if (wallet) {
            const userRole = wallet.buyer?.role || "buyer";
            const dashboardPath = userRole === "admin" ? "/admin" : `/${userRole}/wallet`;

            await Notification.create({
                user: wallet.buyer,
                title: "طلب السحب مرفوض",
                message: `تم رفض طلب سحب ${tx.amount} ريال. السبب: ${tx.note}`,
                type: "system",
                link: dashboardPath,
            });
        }
    } catch (err) {
        console.error("فشل إرسال إشعار رفض السحب:", err);
    }

    res.json({ message: "تم رفض طلب السحب" });
});

// ────────────────────────────────────────────────
// 1️⃣1️⃣ عرض عمليات محفظة معيّنة
// GET /api/admin/wallets/:id/transactions
// ────────────────────────────────────────────────
export const getWalletTransactions = asyncHandler(async (req, res) => {
    const transactions = await WalletTransaction.find({
        wallet: req.params.id,
    })
        .sort({ createdAt: -1 })
        .lean();

    res.json(transactions);
});

// ────────────────────────────────────────────────
// 1️⃣2️⃣ عرض سجل إجراءات محفظة معيّنة
// GET /api/admin/wallets/:id/action-logs
// ────────────────────────────────────────────────
export const getWalletActionLogs = asyncHandler(async (req, res) => {
    const logs = await WalletActionLog.find({
        wallet: req.params.id,
    })
        .populate("performedBy", "name email")
        .sort({ createdAt: -1 })
        .lean();

    res.json(logs);
});

// ────────────────────────────────────────────────
// 1️⃣3️⃣ عرض جميع العمليات المالية (لجميع المحافظ)
// GET /api/admin/wallets/transactions/all
// ────────────────────────────────────────────────
export const getAllWalletTransactions = asyncHandler(async (req, res) => {
    const { status, type } = req.query;
    const filter = {};

    if (status && Object.values(WALLET_TX_STATUS).includes(status)) {
        filter.status = status;
    }
    if (type && Object.values(WALLET_TX_TYPES).includes(type)) {
        filter.type = type;
    }

    const transactions = await WalletTransaction.find(filter)
        .populate({
            path: "wallet",
            select: "walletNumber metadata.fullName buyer",
            populate: { path: "buyer", select: "name email" },
        })
        .populate("processedBy", "name")
        .sort({ createdAt: -1 })
        .lean();

    res.json(transactions);
});

// ────────────────────────────────────────────────
// 1️⃣4️⃣ إعدادات المحفظة
// GET /api/admin/wallets/settings
// PUT /api/admin/wallets/settings
// ────────────────────────────────────────────────
export const getWalletSettings = asyncHandler(async (req, res) => {
    const [dailyLimit, depositInfo] = await Promise.all([
        SystemSettings.findOne({ key: "wallet_daily_payment_limit" }),
        SystemSettings.findOne({ key: "wallet_deposit_info" }),
    ]);

    res.json({
        walletDailyPaymentLimit: dailyLimit?.value ?? 30,
        walletDepositInfo: depositInfo?.value ?? "",
    });
});

export const updateWalletSettings = asyncHandler(async (req, res) => {
    const { walletDailyPaymentLimit, walletDepositInfo } = req.body;

    if (walletDailyPaymentLimit !== undefined) {
        const val = Number(walletDailyPaymentLimit);
        if (!Number.isFinite(val) || val < 1) {
            res.status(400);
            throw new Error("حد المحاولات يجب أن يكون رقمًا أكبر من صفر");
        }

        await SystemSettings.findOneAndUpdate(
            { key: "wallet_daily_payment_limit" },
            {
                key: "wallet_daily_payment_limit",
                value: val,
                description: "الحد الأقصى لمحاولات الدفع بالمحفظة خلال 24 ساعة",
                updatedBy: req.user.id,
            },
            { upsert: true, new: true }
        );
    }

    if (walletDepositInfo !== undefined) {
        await SystemSettings.findOneAndUpdate(
            { key: "wallet_deposit_info" },
            {
                key: "wallet_deposit_info",
                value: String(walletDepositInfo).trim(),
                description: "بيانات الإيداع البنكي التي تظهر للمستخدم عند طلب شحن المحفظة",
                updatedBy: req.user.id,
            },
            { upsert: true, new: true }
        );
    }

    res.json({ message: "تم تحديث إعدادات المحفظة بنجاح" });
});

// ────────────────────────────────────────────────
// 🗑️ حذف المحفظة نهائياً (مع التحقق من رقم المحفظة)
// DELETE /api/admin/wallets/:id
// ────────────────────────────────────────────────
export const deleteWallet = asyncHandler(async (req, res) => {
    const { walletNumber } = req.body;

    if (!walletNumber) {
        res.status(400);
        throw new Error("يجب إدخال رقم المحفظة للتأكيد");
    }

    const wallet = await Wallet.findById(req.params.id).populate("buyer", "name email");

    if (!wallet) {
        res.status(404);
        throw new Error("المحفظة غير موجودة");
    }

    // التحقق من رقم المحفظة المُدخل
    if (String(walletNumber).trim() !== String(wallet.walletNumber).trim()) {
        res.status(400);
        throw new Error("رقم المحفظة المُدخل غير مطابق. تأكد من إدخال الرقم الصحيح.");
    }

    const buyerId = wallet.buyer?._id;
    const buyerName = wallet.buyer?.name || "غير معروف";
    const wNum = wallet.walletNumber;

    // حذف جميع العمليات المالية المرتبطة
    await WalletTransaction.deleteMany({ wallet: wallet._id });

    // حذف جميع سجلات الإجراءات المرتبطة
    await WalletActionLog.deleteMany({ wallet: wallet._id });

    // حذف المحفظة
    await Wallet.findByIdAndDelete(wallet._id);

    // إشعار المستخدم
    if (buyerId) {
        try {
            const userRole = wallet.buyer?.role || "buyer";
            const dashboardPath = userRole === "admin" ? "/admin" : `/${userRole}/wallet`;

            await Notification.create({
                user: buyerId,
                title: "تم حذف محفظتك",
                message: `تم حذف محفظتك (${wNum}) بواسطة الإدارة. تواصل مع الدعم للمزيد من التفاصيل.`,
                type: "system",
                link: dashboardPath,
            });
        } catch (err) {
            console.error("فشل إرسال إشعار حذف المحفظة:", err);
        }
    }

    res.json({
        message: `تم حذف محفظة "${buyerName}" (${wNum}) نهائياً بنجاح`,
    });
});

// ────────────────────────────────────────────────
// 🔧 إجراء عملية يدوية (إيداع / سحب مباشر من قبل الإدارة)
// POST /api/admin/wallets/:id/manual-transaction
// ────────────────────────────────────────────────
export const issueManualWalletTransaction = asyncHandler(async (req, res) => {
    const { amount, type, note, orderId } = req.body;

    if (!amount || !type || !note) {
        res.status(400);
        throw new Error("المبلغ، نوع العملية (إيداع/سحب)، والملاحظات مطلوبة");
    }

    const numAmount = Number(amount);
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
        res.status(400);
        throw new Error("المبلغ يجب أن يكون رقماً موجباً");
    }

    if (![WALLET_TX_TYPES.DEPOSIT, WALLET_TX_TYPES.WITHDRAWAL, WALLET_TX_TYPES.REFUND].includes(type)) {
        res.status(400);
        throw new Error("نوع العملية غير صالح");
    }

    const wallet = await Wallet.findById(req.params.id);
    if (!wallet) {
        res.status(404);
        throw new Error("المحفظة غير موجودة");
    }

    // في حالة السحب، نتحقق من الرصيد
    if (type === WALLET_TX_TYPES.WITHDRAWAL && wallet.balance < numAmount) {
        res.status(400);
        throw new Error("الرصيد غير كافٍ لإجراء عملية السحب اليدوية");
    }

    const direction = (type === WALLET_TX_TYPES.DEPOSIT || type === WALLET_TX_TYPES.REFUND) 
        ? WALLET_TX_DIRECTIONS.CREDIT 
        : WALLET_TX_DIRECTIONS.DEBIT;

    const balanceChange = (direction === WALLET_TX_DIRECTIONS.CREDIT) ? numAmount : -numAmount;

    // التحديث الذري للرصيد
    const updatedWallet = await Wallet.findOneAndUpdate(
        { _id: wallet._id, balance: { $gte: (direction === WALLET_TX_DIRECTIONS.DEBIT ? numAmount : 0) } },
        { $inc: { balance: balanceChange } },
        { new: true }
    ).populate("buyer", "name email role");

    if (!updatedWallet) {
        res.status(400);
        throw new Error("فشل تحديث الرصيد (ربما الرصيد غير كافٍ)");
    }

    // تسجيل العملية المالية
    const tx = await WalletTransaction.create({
        wallet: wallet._id,
        type,
        direction,
        amount: numAmount,
        balanceBefore: wallet.balance,
        balanceAfter: updatedWallet.balance,
        status: WALLET_TX_STATUS.COMPLETED,
        reference: WalletTransaction.generateReference(),
        note: note.trim(),
        orderId: orderId || undefined,
        processedBy: req.user.id,
        processedAt: new Date(),
    });

    // تسجيل الإجراء في سجل الإجراءات
    await WalletActionLog.create({
        wallet: wallet._id,
        action: WALLET_ACTION_TYPES.TRANSACTION_MANUAL,
        description: `عملية يدوية (${type === WALLET_TX_TYPES.DEPOSIT ? 'إيداع' : type === WALLET_TX_TYPES.WITHDRAWAL ? 'سحب' : 'استرجاع'}): ${note}`,
        performedBy: req.user.id,
        ipAddress: req.ip,
    });

    // إشعار المشتري
    try {
        const userRole = updatedWallet.buyer?.role || "buyer";
        const dashboardPath = userRole === "admin" ? "/admin" : `/${userRole}/wallet`;

        await Notification.create({
            user: updatedWallet.buyer,
            title: direction === WALLET_TX_DIRECTIONS.CREDIT ? "تم إيداع مبلغ في محفظتك" : "تم خصم مبلغ من محفظتك",
            message: `تم إجراء عملية (${type === WALLET_TX_TYPES.DEPOSIT ? 'إيداع' : type === WALLET_TX_TYPES.WITHDRAWAL ? 'سحب' : 'استرجاع'}) يدوياً بمبلغ ${numAmount} ريال. رصيدك الحالي: ${updatedWallet.balance} ريال.`,
            type: "system",
            link: dashboardPath,
        });
    } catch (err) {
        console.error("فشل إرسال إشعار العملية اليدوية:", err);
    }

    res.json({
        message: "تم إجراء العملية اليدوية بنجاح",
        newBalance: updatedWallet.balance,
        transaction: tx,
    });
});
