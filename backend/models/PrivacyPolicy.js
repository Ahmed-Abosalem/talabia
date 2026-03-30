// backend/models/PrivacyPolicy.js

import mongoose from "mongoose";

const privacyPolicySchema = new mongoose.Schema(
    {
        content: {
            type: String,
            required: true,
            trim: true,
        },
        lastUpdated: {
            type: Date,
            default: Date.now,
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        version: {
            type: Number,
            default: 1,
        },
    },
    {
        timestamps: true,
    }
);

// نريد فقط سجل واحد لسياسة الخصوصية
privacyPolicySchema.statics.getSinglePolicy = async function () {
    let policy = await this.findOne();
    if (!policy) {
        // إنشاء سياسة افتراضية إذا لم تكن موجودة
        policy = await this.create({
            content: getDefaultPrivacyContent(),
            lastUpdated: new Date(),
        });
    }
    return policy;
};

function getDefaultPrivacyContent() {
    return `سياسة الخصوصية

مرحباً بك في منصة طلبية. نحن نلتزم بحماية خصوصيتك وبياناتك الشخصية.

## جمع المعلومات

نقوم بجمع المعلومات التالية:
- الاسم الكامل
- البريد الإلكتروني
- رقم الهاتف
- عنوان التوصيل (للمشترين)
- معلومات المتجر (للبائعين)
- معلومات الشركة (لشركات الشحن)

## استخدام المعلومات

نستخدم معلوماتك للأغراض التالية:
- تقديم خدماتنا بشكل فعال
- معالجة الطلبات والمدفوعات
- التواصل معك بخصوص طلباتك
- تحسين تجربة المستخدم
- إرسال التحديثات والإشعارات المهمة

## حماية البيانات

نتخذ إجراءات أمنية صارمة لحماية بياناتك:
- تشفير البيانات الحساسة
- استخدام بروتوكولات أمان متقدمة
- تقييد الوصول إلى البيانات الشخصية
- مراقبة مستمرة للأنظمة

## مشاركة المعلومات

لن نشارك معلوماتك الشخصية مع أطراف ثالثة إلا في الحالات التالية:
- بموافقتك الصريحة
- لتنفيذ الخدمات المطلوبة (مثل الشحن)
- عند الطلب القانوني من الجهات المختصة

## حقوقك

لديك الحق في:
- الوصول إلى بياناتك الشخصية
- تعديل أو تحديث معلوماتك
- حذف حسابك وبياناتك
- الاعتراض على معالجة بياناتك

## الاتصال بنا

إذا كان لديك أي استفسارات حول سياسة الخصوصية، يرجى التواصل معنا عبر صفحة "تواصل معنا".

آخر تحديث: ${new Date().toLocaleDateString("ar-SA")}`;
}

const PrivacyPolicy = mongoose.model("PrivacyPolicy", privacyPolicySchema);

export default PrivacyPolicy;
