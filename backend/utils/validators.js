// ────────────────────────────────────────────────
// 📁 backend/utils/validators.js
// أدوات التحقق من صحة البيانات في نظام طلبية (Talabia)
// ────────────────────────────────────────────────

// ✅ التحقق من البريد الإلكتروني
export const isValidEmail = (email) => {
  const regex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
  return regex.test(email);
};

// 🔑 التحقق من قوة كلمة المرور
export const isStrongPassword = (password) => {
  return password.length >= 6;
};

// 📞 التحقق من رقم الهاتف
export const isValidPhone = (phone) => {
  const regex = /^[0-9]{8,15}$/;
  return regex.test(phone);
};

// 🧾 التحقق من النصوص العامة
export const isNotEmpty = (value) => {
  return value && value.trim().length > 0;
};

// ────────────────────────────────────────────────
// ✅ تُستخدم في Controllers قبل إنشاء أو تعديل البيانات.
// ✅ تمنع إدخال بيانات غير صالحة إلى قاعدة البيانات.
// ────────────────────────────────────────────────
