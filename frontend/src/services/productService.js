// frontend/src/services/productService.js
// 🔗 خدمة المنتجات - ربط كامل بين الواجهة الأمامية والـ Backend
// تعتمد على api.js الذي يعرّف axios مع baseURL = "/api"

import { api } from "./api";

/**
 * جلب قائمة المنتجات (للمستخدمين العامين أو البائع حسب الـ scope)
 *
 * params مثال:
 *  - { scope: "seller" } → منتجات البائع الحالي فقط (لوحة البائع)
 *  - { category: "..." } → فلترة حسب التصنيف
 *  - { page: 1, limit: 20 } → للصفحات
 *
 * يستدعي: GET /api/products
 */
export async function listProducts(params = {}) {
  const res = await api.get("/products", { params });
  return res.data;
}

/**
 * 🛠 جلب قائمة المنتجات من منظور الأدمن
 *
 * يستدعي: GET /api/admin/products
 * ويُستخدم في لوحة الأدمن لإدارة المنتجات.
 */
export async function listAdminProducts(params = {}) {
  const res = await api.get("/admin/products", { params });
  return res.data;
}

/**
 * 🔍 جلب تفاصيل منتج واحد للأدمن
 *
 * يستدعي: GET /api/admin/products/:id/details
 * ويعيد:
 *  {
 *    product: {
 *      id, name, description, price, stock,
 *      unitLabel, brand, variants, returnPolicy,
 *      category, storeName, images,
 *      rating, numReviews,
 *      status, isActive, adminLocked,
 *      statusDisplay, adminControlLabel,
 *      ordersCount, favoritesCount,
 *      createdAt, updatedAt
 *    }
 *  }
 */
export async function getAdminProductDetails(id) {
  const res = await api.get(`/admin/products/${id}/details`);
  return res.data;
}

/**
 * جلب منتج واحد بالتفصيل (للمسار العام)
 *
 * يستدعي: GET /api/products/:id
 */
export async function getProductById(id) {
  const res = await api.get(`/products/${id}`);
  return res.data;
}

/**
 * إنشاء منتج جديد للبائع الحالي أو للأدمن
 *
 * يتوافق مع البيانات القادمة من صفحة لوحة البائع (SellerDashboard):
 * {
 *   name: string,
 *   description: string,
 *   price: number,
 *   stock: number,
 *   unitLabel: string,
 *   categoryId: string,
 *   brand?: string,
 *   variants?: string,
 *   status: "active" | "inactive",
 *   returnPolicy?: string,
 *   images?: string[]   // مسارات الصور في /uploads/products
 * }
 *
 * endpoint في الباك إند:
 *   POST /api/products
 */
export async function createProduct(payload) {
  const res = await api.post("/products", payload);
  return res.data;
}

/**
 * تحديث حالة المنتج (نشط / غير نشط) في المسار العام (لوحة البائع مثلاً)
 *
 * يستدعي:
 *   PATCH /api/products/:id/status
 *   body: { status: "active" | "inactive" }
 */
export async function updateProductStatus(productId, payload) {
  const res = await api.patch(`/products/${productId}/status`, payload);
  return res.data;
}

/**
 * 🔐 تحديث حالة المنتج من لوحة الأدمن
 *
 * يستدعي:
 *   PUT /api/admin/products/:id/status
 *   body: { status: "active" | "inactive" }
 *
 * هذا المسار يتحكم أيضاً في:
 *  - isActive
 *  - adminLocked
 * حسب المنطق في adminController.js
 */
export async function updateProductStatusByAdmin(productId, status) {
  const res = await api.put(`/admin/products/${productId}/status`, {
    status,
  });
  return res.data;
}

/**
 * تحديث منتج كامل (تعديل البيانات)
 *
 * يستدعي: PUT /api/products/:id
 */
export async function updateProduct(productId, payload) {
  const res = await api.put(`/products/${productId}`, payload);
  return res.data;
}

/**
 * حذف منتج (المسار العام - يستخدم عادة من البائع)
 *
 * يستدعي: DELETE /api/products/:id
 */
export async function deleteProduct(productId) {
  const res = await api.delete(`/products/${productId}`);
  return res.data;
}

/**
 * 🗑️ حذف منتج نهائيًا من لوحة الأدمن
 *
 * يستدعي: DELETE /api/admin/products/:id
 */
export async function deleteProductAsAdmin(productId) {
  const res = await api.delete(`/admin/products/${productId}`);
  return res.data;
}

/**
 * 📸 رفع صور المنتجات
 *
 * يرسل FormData يحتوي على حقل "images" (ملف أو أكثر)
 * إلى المسار: POST /api/uploads/products
 * ويستقبل مصفوفة بالمسارات النهائية للصور ليتم حفظها داخل حقل images في المنتج
 *
 * مثال استخدام من React:
 *   const form = new FormData();
 *   files.forEach((file) => form.append("images", file));
 *   const { images } = await uploadProductImages(form);
 */
export async function uploadProductImages(formData) {
  const res = await api.post("/uploads/products", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return res.data; // { message, images: ["/uploads/products/....jpg", ...] }
}

/**
 * تصدير افتراضي (اختياري) للمحافظة على التوافق مع أي استيراد قديم:
 * import productService from "@/services/productService";
 */
const productService = {
  listProducts,
  listAdminProducts,
  getAdminProductDetails,
  getProductById,
  createProduct,
  updateProductStatus,
  updateProductStatusByAdmin,
  updateProduct,
  deleteProduct,
  deleteProductAsAdmin,
  uploadProductImages,
};

export default productService;
