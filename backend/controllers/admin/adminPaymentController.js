// ────────────────────────────────────────────────
// 📁 backend/controllers/admin/adminPaymentController.js
// إدارة خيارات الدفع في نظام طلبية (Talabia)
// ────────────────────────────────────────────────

import SystemSettings from "../../models/SystemSettings.js";
import Order from "../../models/Order.js";

// ─────────────────────────────────────────────────
// 🔑 مفتاح الإعدادات في قاعدة البيانات
// ─────────────────────────────────────────────────
const PAYMENT_SETTINGS_KEY = "payment_settings";

// ─────────────────────────────────────────────────
// ⚙️ الإعدادات الافتراضية (أول تشغيل)
// ─────────────────────────────────────────────────
const DEFAULT_PAYMENT_SETTINGS = {
    cod: {
        enabled: true,
        label: "الدفع عند الاستلام",
    },
    card: {
        enabled: true,
        label: "الدفع بالبطاقة",
    },
    transfer: {
        enabled: true,
        label: "الحوالة البنكية",
        bankInfo:
            "اسم البنك: \nاسم المستفيد: \nرقم الحساب: \n\nملاحظات: يرجى ذكر رقم الطلب عند إجراء التحويل.",
    },
    wallet: {
        enabled: true,
        label: "الدفع بالمحفظة",
    },
};

// ─────────────────────────────────────────────────
// 🌐 GET /api/settings/payment  — عام (بدون توثيق)
// يُستخدم من Checkout.jsx لجلب الخيارات المفعّلة
// ─────────────────────────────────────────────────
export const getPaymentSettings = async (req, res) => {
    try {
        // 🔒 منع الـ Browser/Proxy من تخزين هذا الرد (304 Not Modified)
        // تغيير إعدادات الدفع يجب أن ينعكس فوراً لكل مستخدم
        res.set("Cache-Control", "no-store, no-cache, must-revalidate");
        res.set("Pragma", "no-cache");
        res.set("Expires", "0");

        const doc = await SystemSettings.findOne({ key: PAYMENT_SETTINGS_KEY });
        const settings = doc?.value ?? DEFAULT_PAYMENT_SETTINGS;

        // نُرجع فقط البيانات التي يحتاجها المشتري (بدون بيانات داخلية)
        const publicSettings = {
            cod: {
                enabled: settings.cod?.enabled ?? true,
                label: settings.cod?.label ?? "الدفع عند الاستلام",
            },
            card: {
                enabled: settings.card?.enabled ?? true,
                label: settings.card?.label ?? "الدفع بالبطاقة",
            },
            transfer: {
                enabled: settings.transfer?.enabled ?? true,
                label: settings.transfer?.label ?? "الحوالة البنكية",
                bankInfo: settings.transfer?.bankInfo ?? "",
            },
            wallet: {
                enabled: settings.wallet?.enabled ?? true,
                label: settings.wallet?.label ?? "الدفع بالمحفظة",
            },
        };

        res.status(200).json(publicSettings);
    } catch (error) {
        console.error("❌ getPaymentSettings error:", error);
        res.status(500).json({ message: "تعذّر جلب إعدادات الدفع." });
    }
};

// ─────────────────────────────────────────────────
// 🔒 GET /api/admin/payment-settings  — أدمن فقط
// ─────────────────────────────────────────────────
export const adminGetPaymentSettings = async (req, res) => {
    try {
        // 🔒 منع الـ 304 — لوحة الأدمن تحتاج أحدث بيانات دائماً
        res.set("Cache-Control", "no-store, no-cache, must-revalidate");
        res.set("Pragma", "no-cache");
        res.set("Expires", "0");

        const doc = await SystemSettings.findOne({ key: PAYMENT_SETTINGS_KEY });
        const settings = doc?.value ?? DEFAULT_PAYMENT_SETTINGS;

        res.status(200).json({
            settings,
            updatedAt: doc?.updatedAt ?? null,
            updatedBy: doc?.updatedBy ?? null,
        });
    } catch (error) {
        console.error("❌ adminGetPaymentSettings error:", error);
        res.status(500).json({ message: "تعذّر جلب إعدادات الدفع." });
    }
};

// ─────────────────────────────────────────────────
// 🔒 PUT /api/admin/payment-settings  — أدمن فقط
// Body: { cod: { enabled }, card: { enabled }, transfer: { enabled, bankInfo } }
// ─────────────────────────────────────────────────
export const adminUpdatePaymentSettings = async (req, res) => {
    console.log("➡️ [ADMIN] updatePaymentSettings request received. Body:", JSON.stringify(req.body));
    try {
        const { cod, card, transfer, wallet } = req.body;

        // جلب الإعدادات الحالية للدمج
        const existing = await SystemSettings.findOne({
            key: PAYMENT_SETTINGS_KEY,
        });
        const current = existing?.value ?? DEFAULT_PAYMENT_SETTINGS;

        // بناء الإعدادات الجديدة بشكل آمن (نمنع حذف حقول غير مرسلة)
        const newSettings = {
            cod: {
                ...current.cod,
                ...(cod !== undefined && { enabled: Boolean(cod.enabled) }),
                ...(cod?.label !== undefined && { label: String(cod.label).trim() }),
            },
            card: {
                ...current.card,
                ...(card !== undefined && { enabled: Boolean(card.enabled) }),
                ...(card?.label !== undefined && { label: String(card.label).trim() }),
            },
            transfer: {
                ...current.transfer,
                ...(transfer !== undefined && {
                    enabled: Boolean(transfer.enabled),
                }),
                ...(transfer?.label !== undefined && {
                    label: String(transfer.label).trim(),
                }),
                ...(transfer?.bankInfo !== undefined && {
                    bankInfo: String(transfer.bankInfo).trim(),
                }),
            },
            wallet: {
                ...current.wallet,
                ...(wallet !== undefined && { enabled: Boolean(wallet.enabled) }),
                ...(wallet?.label !== undefined && { label: String(wallet.label).trim() }),
            },
        };

        // التحقق: يجب أن يكون خيار واحد على الأقل مفعّلاً
        const anyEnabled =
            newSettings.cod.enabled ||
            newSettings.card.enabled ||
            newSettings.transfer.enabled ||
            newSettings.wallet.enabled;

        if (!anyEnabled) {
            return res.status(400).json({
                message: "يجب تفعيل خيار دفع واحد على الأقل.",
            });
        }

        // حفظ في قاعدة البيانات — نستخدم $set صراحةً لضمان العمل في كل إصدارات Mongoose
        const updated = await SystemSettings.findOneAndUpdate(
            { key: PAYMENT_SETTINGS_KEY },
            {
                $set: {
                    value: newSettings,
                    description: "إعدادات خيارات الدفع المتاحة للمشترين",
                    updatedBy: req.user?._id ?? null,
                },
                $setOnInsert: {
                    key: PAYMENT_SETTINGS_KEY,
                },
            },
            { upsert: true, new: true }
        );

        // ✅ إثبات الحفظ الفعلي في DB
        console.log("✅ [DB] payment_settings saved:", JSON.stringify({
            cod_enabled: updated.value.cod?.enabled,
            card_enabled: updated.value.card?.enabled,
            transfer_enabled: updated.value.transfer?.enabled,
            _id: updated._id,
            updatedAt: updated.updatedAt,
        }));

        res.status(200).json({
            message: "تم حفظ إعدادات الدفع بنجاح.",
            settings: updated.value,
        });
    } catch (error) {
        console.error("❌ adminUpdatePaymentSettings error:", error);
        res.status(500).json({ message: "تعذّر حفظ إعدادات الدفع." });
    }
};

// ─────────────────────────────────────────────────
// 🔒 GET /api/admin/bank-transfers  — أدمن فقط
// جلب الطلبات التي دفعت بالحوالة البنكية
// ─────────────────────────────────────────────────
export const adminGetBankTransfers = async (req, res) => {
    // 🔒 منع التخزين المؤقت لضمان رؤية أحدث الحالات من الـ DB
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
        const skip = (page - 1) * limit;

        // فلاتر اختيارية
        const searchQuery = req.query.search?.trim() || "";

        // بناء فلتر البحث
        const matchQuery = {
            paymentSubMethod: "BANK_TRANSFER",
        };

        if (searchQuery) {
            matchQuery.$or = [
                { bankTransferSenderName: { $regex: searchQuery, $options: "i" } },
                {
                    bankTransferReferenceNumber: { $regex: searchQuery, $options: "i" },
                },
                // ✅ البحث برقم الطلب (المعرّف المختصر)
                {
                    $expr: {
                        $regexMatch: {
                            input: { $toString: "$_id" },
                            regex: searchQuery,
                            options: "i",
                        },
                    },
                },
            ];
        }

        const [orders, total] = await Promise.all([
            Order.find(matchQuery)
                .populate("buyer", "fullName email phone")
                .select(
                    "_id createdAt totalPrice shippingPrice paymentSubMethod " +
                    "bankTransferSenderName bankTransferReferenceNumber " +
                    "status buyer shippingAddress bankTransferStatus"
                )
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Order.countDocuments(matchQuery),
        ]);

        // تنسيق البيانات للعرض
        const data = orders.map((order) => ({
            _id: order._id,
            // ✅ توحيد رقم الطلب: 6 خانات (lowercase) ليتطابق تماماً مع ما يراه المشتري
            orderRef: order._id.toString().slice(-6),
            createdAt: order.createdAt,
            totalPrice: order.totalPrice,
            shippingPrice: order.shippingPrice,
            status: order.status,
            bankTransferStatus: order.bankTransferStatus || "pending",
            buyer: {
                // ✅ نُفضل الاسم المكتوب في العنوان (كما أدخله المشتري عند الدفع)
                fullName: order.shippingAddress?.fullName || order.buyer?.fullName || "—",
                email: order.buyer?.email || "—",
                phone: order.shippingAddress?.phone || order.buyer?.phone || "—",
            },
            bankTransferSenderName: order.bankTransferSenderName || "—",
            bankTransferReferenceNumber: order.bankTransferReferenceNumber || "—",
        }));

        res.status(200).json({
            data,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("❌ adminGetBankTransfers error:", error);
        res.status(500).json({ message: "تعذّر جلب بيانات الحوالات البنكية." });
    }
};

// ─────────────────────────────────
// ✅ PATCH /api/admin/bank-transfers/:id/status  — أدمن فقط
// تحديث حالة تأكيد الحوالة البنكية: pending | confirmed | rejected
// ─────────────────────────────────
export const adminUpdateBankTransferStatus = async (req, res) => {
    console.log(`➡️ [ADMIN] Update Transfer Status. ID: ${req.params.id}, NewStatus: ${req.body.status}`);
    try {
        const { id } = req.params;
        const { status } = req.body;

        // التحقق: قيمة سليمة فقط
        const VALID = ["pending", "confirmed", "rejected"];
        if (!status || !VALID.includes(status)) {
            return res.status(400).json({
                message: `قيمة غير صالحة. القيم المقبولة: ${VALID.join(", ")}.`,
            });
        }

        const updateFields = {
            bankTransferStatus: status,
        };

        // إذا تم التأكيد، نحدّث حالة الدفع العامة
        if (status === "confirmed") {
            updateFields.isPaid = true;
            updateFields.paidAt = new Date();
        }

        const updatedOrder = await Order.findOneAndUpdate(
            { _id: id, paymentSubMethod: "BANK_TRANSFER" },
            { $set: updateFields },
            { new: true, runValidators: true }
        );

        if (!updatedOrder) {
            console.log(`⚠️ [ADMIN] Order not found for status update: ${id}`);
            return res.status(404).json({
                message: "الحوالة غير موجودة أو ليست حوالة بنكية.",
            });
        }

        console.log(`✅ [DB] Status updated via findOneAndUpdate for Order ${updatedOrder._id}: ${updatedOrder.bankTransferStatus}`);

        res.status(200).json({
            message: "تم تحديث حالة الحوالة بنجاح.",
            orderId: updatedOrder._id,
            bankTransferStatus: updatedOrder.bankTransferStatus,
        });
    } catch (error) {
        console.error("❌ adminUpdateBankTransferStatus error:", error);
        res.status(500).json({ message: "تعذّر تحديث حالة الحوالة." });
    }
};
