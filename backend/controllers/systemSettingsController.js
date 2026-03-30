// ────────────────────────────────────────────────
// 📁 backend/controllers/systemSettingsController.js
// التحكم في إعدادات النظام العامة (مثل الحد الأدنى للطلب)
// ────────────────────────────────────────────────

import asyncHandler from "express-async-handler";
import SystemSettings from "../models/SystemSettings.js";

// ────────────────────────────────────────────────
// 🔧 الحد الأدنى للطلب (minOrderLimit)
// ────────────────────────────────────────────────

const MIN_ORDER_KEY = "minOrderLimit";

/**
 * GET /api/settings/min-order
 * جلب إعدادات الحد الأدنى للطلب (عامة — بدون حماية)
 */
export const getMinOrderSettings = asyncHandler(async (req, res) => {
    const setting = await SystemSettings.findOne({ key: MIN_ORDER_KEY }).lean();

    if (!setting) {
        return res.json({ active: false, value: 0 });
    }

    const active = !!setting.value?.active;
    const value = typeof setting.value?.value === "number" ? setting.value.value : 0;

    res.json({ active, value });
});

/**
 * PUT /api/settings/min-order
 * تحديث إعدادات الحد الأدنى للطلب (أدمن فقط)
 */
export const updateMinOrderSettings = asyncHandler(async (req, res) => {
    const { active, value } = req.body;

    if (typeof active !== "boolean") {
        res.status(400);
        throw new Error("حقل 'active' مطلوب ويجب أن يكون true أو false");
    }

    const numericValue = Number(value);
    if (active && (isNaN(numericValue) || numericValue < 0)) {
        res.status(400);
        throw new Error("قيمة الحد الأدنى يجب أن تكون رقمًا موجبًا");
    }

    const updated = await SystemSettings.findOneAndUpdate(
        { key: MIN_ORDER_KEY },
        {
            key: MIN_ORDER_KEY,
            value: {
                active: !!active,
                value: active ? numericValue : 0,
            },
            description: "إعدادات الحد الأدنى للطلب",
            updatedBy: req.user?._id || req.user?.id || undefined,
        },
        { upsert: true, new: true }
    );

    res.json({
        message: active
            ? `تم تفعيل الحد الأدنى للطلب بقيمة ${numericValue}`
            : "تم إلغاء نظام الحد الأدنى للطلب",
        active: updated.value.active,
        value: updated.value.value,
    });
});
