// frontend/src/services/adService.js
// خدمة الإعلانات للواجهة الأمامية (الزائر والمشتري)
// مسؤولة عن جلب الإعلانات/البنرات من الباك إند للاستخدام في الصفحة الرئيسية وغيرها.

import { api } from "./api";

/**
 * جلب الإعلانات المفعّلة لموضع معيّن (placement) مع إمكانية تحديد limit.
 * يُستخدم هذا الأسلوب داخليًا من دوال أكثر تخصّصًا مثل getHomeBannerAds.
 *
 * الباك إند يتوقّع مسارًا عامًا مثل:
 *   GET /api/ads?placement=home_main_banner&limit=3
 */
export async function getAds(params = {}) {
  const res = await api.get("/ads", { params });

  // نحاول دعم أكثر من شكل لهيكل الاستجابة حتى لا ينكسر الكود لو تغيّر الباك إند قليلاً
  // الأمثلة المحتملة:
  // 1) { success: true, data: [ ...ads ] }
  // 2) { ads: [ ...ads ] }
  // 3) [ ...ads ] مباشرة

  const raw = res.data;

  if (Array.isArray(raw)) return raw;

  if (Array.isArray(raw?.data)) return raw.data;

  if (Array.isArray(raw?.ads)) return raw.ads;

  // إن لم نستطع التعرّف على البنية، نعيده كما هو ليتعامل معه منادِي الدالة.
  return raw;
}

/**
 * جلب الإعلانات الخاصة بالبانر الرئيسي في الصفحة الرئيسية.
 * - افتراضيًا placement = "home_main_banner".
 * - يمكن تحديد limit (عدد الشرائح في السلايدر)، الافتراضي 3.
 *
 * مثال الاستخدام في Home.jsx:
 *   const ads = await getHomeBannerAds();
 */
export async function getHomeBannerAds({ limit = 3 } = {}) {
  const ads = await getAds({ placement: "home_main_banner", limit });

  // نضمن أن النتيجة مصفوفة مرتبة حسب sortOrder إن توفّر
  if (!Array.isArray(ads)) return [];

  return [...ads].sort((a, b) => {
    const aOrder = typeof a.sortOrder === "number" ? a.sortOrder : 0;
    const bOrder = typeof b.sortOrder === "number" ? b.sortOrder : 0;

    if (aOrder !== bOrder) return aOrder - bOrder;

    // ترتيب احتياطي بالعنوان إذا تساوى sortOrder
    return (a.title || "").localeCompare(b.title || "", "ar");
  });
}
