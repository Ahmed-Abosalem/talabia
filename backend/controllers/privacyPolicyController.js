// backend/controllers/privacyPolicyController.js

import asyncHandler from "express-async-handler";
import PrivacyPolicy from "../models/PrivacyPolicy.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";

// @desc    Get privacy policy
// @route   GET /api/privacy-policy
// @access  Public
export const getPrivacyPolicy = asyncHandler(async (req, res) => {
    const policy = await PrivacyPolicy.getSinglePolicy();

    res.status(200).json({
        content: policy.content,
        lastUpdated: policy.lastUpdated,
        version: policy.version,
    });
});

// @desc    Update privacy policy (Admin only)
// @route   PUT /api/privacy-policy
// @access  Private/Admin
export const updatePrivacyPolicy = asyncHandler(async (req, res) => {
    const { content } = req.body;

    if (!content || content.trim() === "") {
        res.status(400);
        throw new Error("المحتوى مطلوب");
    }

    let policy = await PrivacyPolicy.findOne();

    if (!policy) {
        policy = await PrivacyPolicy.create({
            content: content.trim(),
            lastUpdated: new Date(),
            updatedBy: req.user._id,
            version: 1,
        });
    } else {
        policy.content = content.trim();
        policy.lastUpdated = new Date();
        policy.updatedBy = req.user._id;
        policy.version += 1;
        await policy.save();
    }

    res.status(200).json({
        message: "تم تحديث سياسة الخصوصية بنجاح",
        content: policy.content,
        lastUpdated: policy.lastUpdated,
        version: policy.version,
    });
});

// @desc    Send privacy policy update notification
// @route   POST /api/privacy-policy/notify
// @access  Private/Admin
export const sendPrivacyPolicyNotification = asyncHandler(async (req, res) => {
    const { targetAudience } = req.body;

    // targetAudience can be: "all", "buyer", "seller", "shipping", "admin"
    const validAudiences = ["all", "buyer", "seller", "shipping", "admin"];

    if (!targetAudience || !validAudiences.includes(targetAudience)) {
        res.status(400);
        throw new Error("يجب تحديد الفئة المستهدفة بشكل صحيح");
    }

    // بناء query للمستخدمين المستهدفين
    let userQuery = {};

    if (targetAudience !== "all") {
        userQuery.role = targetAudience;
    }

    // جلب المستخدمين المستهدفين
    const targetUsers = await User.find(userQuery).select("_id");

    if (targetUsers.length === 0) {
        res.status(404);
        throw new Error("لا يوجد مستخدمون في الفئة المحددة");
    }

    // إنشاء إشعار لكل مستخدم
    const notifications = targetUsers.map((user) => ({
        user: user._id,
        title: "تحديث سياسة الخصوصية",
        message: "تم تحديث سياسة الخصوصية. يرجى مراجعتها للاطلاع على التغييرات الجديدة.",
        type: "system", // ✅ تم التعديل من info إلى system ليتوافق مع الـ Enum
        link: "/privacy-policy",
    }));

    await Notification.insertMany(notifications);

    const audienceLabel = {
        all: "جميع المستخدمين",
        buyer: "المشترين",
        seller: "البائعين",
        shipping: "شركات الشحن",
        admin: "المديرين",
    };

    res.status(200).json({
        message: `تم إرسال ${notifications.length} إشعار إلى ${audienceLabel[targetAudience]}`,
        count: notifications.length,
        targetAudience: audienceLabel[targetAudience],
    });
});
