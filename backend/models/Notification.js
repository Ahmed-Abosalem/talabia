// ────────────────────────────────────────────────
// 📁 backend/models/Notification.js
// نموذج الإشعارات في نظام طلبية (Talabia)
// يدعم الآن:
// 1) إشعار مرتبط بمستخدم (user) → لواجهة الإشعارات.
// 2) سجل حملة أدمن (audience) بدون user → يظهر في لوحة الأدمن.
// ────────────────────────────────────────────────

import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    // إذا كان الإشعار موجّهًا لمستخدم معيّن
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: function () {
        // يكون required فقط إذا لم يوجد audience (أي ليس حملة عامة)
        return !this.audience;
      },
    },

    // إذا كان الإشعار حملة عامة من الأدمن
    // all / buyers / sellers / shipping
    audience: {
      type: String,
      enum: ['all', 'buyers', 'sellers', 'shippers'],
      default: undefined,
    },

    title: {
      type: String,
      required: [true, 'عنوان الإشعار مطلوب'],
      trim: true,
      maxlength: 100,
    },
    message: {
      type: String,
      required: [true, 'نص الإشعار مطلوب'],
      trim: true,
      maxlength: 500,
    },
    type: {
      type: String,
      enum: ['order', 'product', 'system', 'general', 'support'],
      default: 'general',
    },
    link: {
      type: String,
      default: '',
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// فهارس استعلامات شائعة لتحسين الأداء عند تضخم البيانات
notificationSchema.index({ audience: 1, createdAt: -1 });
notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;

// ────────────────────────────────────────────────
// ✅ يدعم إشعارات المستخدمين + سجلات حملات الأدمن.
// ✅ لا تتأثر إشعارات المستخدم الحالية (لأن user ما زال مطلوبًا
//    في حال عدم وجود audience).
// ✅ تم إضافة نوع "support" لتمييز ردود الدعم الفني في مركز التنبيهات.
// ────────────────────────────────────────────────
