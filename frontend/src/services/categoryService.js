// frontend/src/services/categoryService.js
// 🔗 خدمة الأقسام (Category Service)
// ربط عصري ونهائي بين الواجهة الأمامية ونظام الأقسام في الـ Backend
// تعتمد على api.js الذي يعرّف axios مع baseURL = "/api"

import { api } from "./api";

/**
 * جلب قائمة الأقسام (الاستخدام القياسي في الواجهة)
 *
 * تُستخدم في صفحات مثل:
 * - الصفحة الرئيسية
 * - لوحة البائع (لاختيار تصنيف المنتج)
 * - أي مكان يحتاج قائمة الأقسام
 *
 * يستدعي افتراضياً:
 *   GET /api/categories
 *
 * يمكن تمرير بارامترات اختيارية للفلترة أو الترتيب مثل:
 *   { active: true }
 *   { page: 1, limit: 20 }
 */
export async function listCategories(params = {}) {
  const res = await api.get("/categories", { params });
  // يمكن أن يعود الشكل إما كمصفوفة مباشرة أو ككائن يحتوي على مصفوفة
  // مثال: [ ... ] أو { categories: [ ... ] }
  // نعيد res.data كما هي، ونعتمد على الطبقة الأعلى (مثل SellerDashboard)
  // في تطبيع الشكل (normalize) كما فعلنا هناك.
  return res.data;
}

/**
 * جلب جميع الأقسام العامة (توافقًا مع الكود القديم)
 *
 * في الملف السابق كان اسم الدالة getCategories ويُستخدم لنفس الغرض تقريبًا،
 * لذلك نُبقي عليها لتجنّب كسر أي استيرادات قديمة:
 *   import { getCategories } from "@/services/categoryService";
 *
 * تحت الغطاء تستدعي listCategories للحفاظ على منطق واحد.
 */
export async function getCategories(params = {}) {
  return listCategories(params);
}

/**
 * جلب قسم واحد بالتفصيل
 *
 * يستدعي:
 *   GET /api/categories/:id
 */
export async function getCategoryById(id) {
  const res = await api.get(`/categories/${id}`);
  return res.data;
}

/**
 * إنشاء قسم جديد (غالبًا من لوحة الأدمن)
 *
 * endpoint متوقَّع:
 *   POST /api/categories
 */
export async function createCategory(payload) {
  const res = await api.post("/categories", payload);
  return res.data;
}

/**
 * تحديث قسم
 *
 * endpoint متوقَّع:
 *   PUT /api/categories/:id
 */
export async function updateCategory(id, payload) {
  const res = await api.put(`/categories/${id}`, payload);
  return res.data;
}

/**
 * حذف قسم
 *
 * endpoint متوقَّع:
 *   DELETE /api/categories/:id
 */
export async function deleteCategory(id) {
  const res = await api.delete(`/categories/${id}`);
  return res.data;
}

/**
 * تصدير افتراضي للحفاظ على أي استيرادات قديمة من نوع:
 *   import categoryService from "@/services/categoryService";
 */
const categoryService = {
  listCategories,
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};

export default categoryService;
