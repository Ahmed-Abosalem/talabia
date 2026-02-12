// src/services/api.js

import axios from "axios";

/* ------------------------------------------------
   📌 تحديد عنوان الخادم (Backend Base URL)
   ------------------------------------------------
   ✅ الخيار الاحترافي في الإنتاج:
   - إذا تم وضع VITE_API_BASE_URL في ملف .env
     سيتم استخدامه مباشرة (لما يكون الـ API على دومين/منفذ مختلف).
   - وإلا: نستخدم "/api" (Same-origin)
     وهذا يعمل في DEV عبر Vite Proxy،
     ويعمل في PROD عبر Reverse Proxy (Nginx/Apache/Node) بدون مشاكل CORS.
   ❌ نتجنب تمامًا fallback إلى localhost لأنه يكسر على الهاتف/الأجهزة الأخرى.
---------------------------------------------------- */
const baseURL = import.meta.env.VITE_API_BASE_URL || "/api";

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
