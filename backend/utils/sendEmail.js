// ────────────────────────────────────────────────
// 📁 backend/utils/sendEmail.js
// إرسال رسائل البريد الإلكتروني في نظام طلبية (Talabia)
// ────────────────────────────────────────────────

import nodemailer from 'nodemailer';
import config from '../config/env.js';

// 📧 إرسال البريد
const sendEmail = async (to, subject, htmlContent) => {
  try {
    const transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      auth: {
        user: config.email.user,
        pass: config.email.pass,
      },
    });

    const info = await transporter.sendMail({
      from: `"طلبية" <${config.email.from}>`,
      to,
      subject,
      html: htmlContent,
    });

    console.log(`📨 تم إرسال البريد بنجاح إلى: ${to} (ID: ${info.messageId})`);
  } catch (error) {
    console.error('❌ فشل إرسال البريد:', error);
  }
};

export default sendEmail;

// ────────────────────────────────────────────────
// ✅ يعتمد على إعدادات البريد في ملف env.js.
// ✅ جاهز لاستخدام HTML في الرسائل.
// ✅ يمكن تطويره لاحقًا لإرسال قوالب ديناميكية.
// ────────────────────────────────────────────────
