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

    // ✅ التحسين الإنتاجي: استخدام findOneAndUpdate مع upsert لضمان الحفظ دائماً
    const policy = await PrivacyPolicy.findOneAndUpdate(
        {}, // البحث عن السجل الوحيد
        {
            content: content.trim(),
            lastUpdated: new Date(),
            updatedBy: req.user._id,
            $inc: { version: 1 } // زيادة الإصدار تلقائياً
        },
        { 
            new: true,      // إرجاع المستند المحدث
            upsert: true,   // إنشاؤه إذا لم يكن موجوداً
            setDefaultsOnInsert: true 
        }
    );

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

    // ✅ التحسين الإنتاجي: استخدام نظام البث (Broadcast) بدل التكرار على آلاف المستخدمين
    // هذا يمنع الـ Timeout ويجعل الإرسال فورياً مهما كان عدد المستخدمين
    const audienceMap = {
        all: "all",
        buyer: "buyers",
        seller: "sellers",
        shipping: "shippers", // ✅ تم التصحيح إلى الجمع ليتوافق مع الـ Enum في سجلات الإدارة
        admin: "admins", 
    };

    const audienceLabel = {
        all: "جميع المستخدمين",
        buyer: "المشترين",
        seller: "البائعين",
        shipping: "شركات الشحن",
        admin: "المديرين",
    };

    // 1. إنشاء سجل الحملة للإدارة (الـ Log الذي يظهر في لوحة الإشعارات العامة)
    await Notification.create({
        title: "تحديث سياسة الخصوصية",
        message: "تم تحديث سياسة الخصوصية. يرجى مراجعتها للاطلاع على التغييرات الجديدة.",
        type: "system",
        audience: audienceMap[targetAudience],
    });

    // 2. الفلترة لاستهداف المستخدمين الفعليين
    const userFilter = { isActive: true };
    if (targetAudience === "buyer") userFilter.role = "buyer";
    if (targetAudience === "seller") userFilter.role = "seller";
    if (targetAudience === "shipping") userFilter.role = "shipper";
    if (targetAudience === "admin") userFilter.role = "admin";
    // إذا كان all، نرسل للجميع بدون تحديد الـ role

    const targetUsers = await User.find(userFilter).select("_id");

    if (targetUsers.length > 0) {
        // 3. إنشاء إشعار فردي فعلي لكل مستخدم (لتظهر في حساباتهم)
        const userNotifications = targetUsers.map((u) => ({
            user: u._id,
            title: "تحديث سياسة الخصوصية",
            message: "تم تحديث سياسة الخصوصية. يرجى مراجعتها للاطلاع على التغييرات الجديدة.",
            type: "system",
            link: "/privacy-policy",
            isRead: false,
        }));

        await Notification.insertMany(userNotifications);
    }

    res.status(200).json({
        message: `تم إرسال إشعار التحديث بنجاح لمجموعة: ${audienceLabel[targetAudience]}`,
        success: true,
        targetAudience: audienceLabel[targetAudience],
    });
});
