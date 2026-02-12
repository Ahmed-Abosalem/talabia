// frontend/src/services/sellerService.js
// خدمة خاصة بمسارات البائع (Seller) في مشروع طلبية (Talabia)
// تربط الواجهة الأمامية بمسارات:
// - /api/seller/dashboard
// - /api/seller/store
// - /api/seller/products
// - /api/seller/orders/:orderId/status (تحديث حالة الطلب من جهة البائع على مستوى الطلب)
// - /api/seller/orders/:orderId/items/:itemId/status (تحديث حالة منتج واحد داخل الطلب - جديد)
// إضافةً إلى بعض العمليات المشتركة على المنتجات عبر /api/products

import api from "./api";

// 🧩 دالة مساعدة لاستخراج data مباشرة
function extractData(response) {
  return response?.data ?? response;
}

// ────────────────────────────────────────────────
// 📊 لوحة تحكم البائع
// GET /api/seller/dashboard
// الآن تدعم تمربر فلاتر زمنية اختيارية عبر params:
//   getSellerDashboard()                      → كل الوقت
//   getSellerDashboard({ from, to })          → مع فلتر زمني
// ────────────────────────────────────────────────

export async function getSellerDashboard(params = {}) {
  const res = await api.get("/seller/dashboard", { params });
  return extractData(res);
}

// ────────────────────────────────────────────────
// 🏪 إعدادات المتجر
// GET /api/seller/store
// PUT /api/seller/store
// ────────────────────────────────────────────────

export async function getSellerStore() {
  const res = await api.get("/seller/store");
  return extractData(res);
}

export async function updateSellerStore(payload) {
  const res = await api.put("/seller/store", payload);
  return extractData(res);
}

// ────────────────────────────────────────────────
// 📦 منتجات البائع فقط
// GET /api/seller/products → قائمة منتجات البائع الحالي
// ────────────────────────────────────────────────

export async function getSellerProducts(params = {}) {
  const res = await api.get("/seller/products", { params });
  return extractData(res);
}

// لإنشاء منتج جديد للبائع نستخدم نفس مسار المنتجات العام
// مع حماية الصلاحيات في الباك إند (seller / admin فقط):
// POST /api/products
export async function createSellerProduct(payload) {
  const res = await api.post("/products", payload);
  return extractData(res);
}

// لتحديث منتج بشكل كامل (اسم، وصف، سعر، ...)
// PUT /api/products/:id
export async function updateSellerProduct(productId, payload) {
  const res = await api.put(`/products/${productId}`, payload);
  return extractData(res);
}

// 🔁 تحديث حالة منتج (نشط / غير نشط)
// PATCH /api/products/:id/status
export async function updateSellerProductStatus(productId, status) {
  const res = await api.patch(`/products/${productId}/status`, { status });
  return extractData(res);
}

// 🗑️ حذف منتج للبائع الحالي (أو للأدمن)
// DELETE /api/products/:id
export async function deleteSellerProduct(productId) {
  const res = await api.delete(`/products/${productId}`);
  return extractData(res);
}

// ────────────────────────────────────────────────
// 🔄 تحديث حالة طلب من جهة البائع (sellerStatus) على مستوى الطلب كاملًا
// يوفر واجهة بسيطة:
//   updateSellerOrderStatus(orderId, "processing")
//   updateSellerOrderStatus(orderId, { status: "processing" })
// ────────────────────────────────────────────────

export async function updateSellerOrderStatus(orderId, statusOrPayload) {
  if (!orderId) {
    throw new Error("orderId مطلوب لتحديث حالة الطلب.");
  }

  let payload;
  if (
    typeof statusOrPayload === "string" ||
    typeof statusOrPayload === "number"
  ) {
    payload = { status: String(statusOrPayload) };
  } else if (statusOrPayload && typeof statusOrPayload === "object") {
    payload = statusOrPayload;
  } else {
    throw new Error(
      "statusOrPayload يجب أن يكون نصًا يمثل الحالة أو كائنًا يحتوي على الحقول اللازمة."
    );
  }

  const res = await api.put(`/seller/orders/${orderId}/status`, payload);
  return extractData(res);
}

// ────────────────────────────────────────────────
// 🔄 تحديث حالة "منتج واحد داخل الطلب" من جهة البائع (Item-based)
// PATCH /api/seller/orders/:orderId/items/:itemId/status
//
// أمثلة استخدام من الواجهة:
//   updateSellerOrderItemStatus(orderId, itemId, "processing")
//   updateSellerOrderItemStatus(orderId, itemId, { status: "ready_for_shipping" })
// ────────────────────────────────────────────────

export async function updateSellerOrderItemStatus(
  orderId,
  itemId,
  statusOrPayload
) {
  if (!orderId || !itemId) {
    throw new Error(
      "orderId و itemId مطلوبان لتحديث حالة المنتج داخل الطلب."
    );
  }

  let payload;
  if (
    typeof statusOrPayload === "string" ||
    typeof statusOrPayload === "number"
  ) {
    payload = { status: String(statusOrPayload) };
  } else if (statusOrPayload && typeof statusOrPayload === "object") {
    payload = statusOrPayload;
  } else {
    throw new Error(
      "statusOrPayload يجب أن يكون نصًا يمثل الحالة أو كائنًا يحتوي على الحقول اللازمة."
    );
  }

  const res = await api.patch(
    `/seller/orders/${orderId}/items/${itemId}/status`,
    payload
  );
  return extractData(res);
}

// تجميع دوال الخدمة في كائن افتراضي (لمن يفضّل الاستيراد الافتراضي)
const sellerService = {
  getSellerDashboard,
  getSellerStore,
  updateSellerStore,
  getSellerProducts,
  createSellerProduct,
  updateSellerProduct,
  updateSellerProductStatus,
  deleteSellerProduct,
  updateSellerOrderStatus,
  updateSellerOrderItemStatus,
};

export default sellerService;
