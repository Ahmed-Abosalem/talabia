// src/services/api.js

import axios from "axios";

// 📌 تحديد عنوان الخادم (Backend Base URL)
// ✅ Note: capacitor.config.json has server.url = "https://www.talabia.net/"
// This means the Android WebView loads from the production domain directly.
// So "/api" (relative) resolves to https://www.talabia.net/api — which is correct.
// We keep Capacitor detection as a safety net for future local-dev scenarios.
const isNative = (() => {
  try {
    return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  } catch {
    return false;
  }
})();

const productionAPI = "https://www.talabia.net/api";
const defaultBaseURL = isNative ? productionAPI : "/api";
const baseURL = import.meta.env.VITE_API_BASE_URL || defaultBaseURL;
  // Removed debug log for production



/* ------------------------------------------------
   📌 إنشاء Instance ثابت للتعامل مع الخادم
   ------------------------------------------------
   ✅ ملاحظة مهمة بخصوص رفع الملفات (FormData)
   - لا نحدد هنا الـ Content-Type يدويًا.
   - إذا أرسلنا كائنًا عاديًا → Axios يضبط "application/json" تلقائيًا.
   - إذا أرسلنا FormData →
     Axios يضبط "multipart/form-data" بالـ boundary تلقائيًا.
---------------------------------------------------- */
const apiInstance = axios.create({
  baseURL,
  withCredentials: true, // مهم جدًا لدعم الكوكي مستقبلاً
  // ❌ لا نضع headers: { "Content-Type": "application/json" } هنا
  // حتى لا نكسر طلبات FormData التي تحتوي على ملفات.
});

/* ------------------------------------------------
   📌 إضافة التوكن (JWT) لكل طلب تلقائيًا
---------------------------------------------------- */
apiInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("talabia_token");

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

/* ------------------------------------------------
   📌 التعامل مع الاستجابات والأخطاء
---------------------------------------------------- */
apiInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;

    // 🟥 الجلسة انتهت أو التوكن غير صالح
    if (status === 401) {
      localStorage.removeItem("talabia_token");
      localStorage.removeItem("talabia-auth");
      // يمكن مستقبلاً: redirect إلى صفحة تسجيل الدخول
    }

    // 🚷 تجاوز حد الطلبات
    if (status === 429) {
      // 🕊️ Clean PWA Install Log
      // هنا يمكننا منع الطلبات القادمة لفترة أو إظهار رسالة عامة
    }

    return Promise.reject(error);
  }
);

/* ------------------------------------------------
   📌 التصدير النهائي
   ------------------------------------------------
   - export const api  → للاستخدام القديم:
       import { api } from "./api";
   - export default    → للاستخدام الجديد:
       import api from "./api";
---------------------------------------------------- */
export const api = apiInstance;
export default apiInstance;
