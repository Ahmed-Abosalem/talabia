// src/services/adminService.js
// خدمات لوحة التحكم (Admin) في مشروع طلبية Talabia
// هذا الملف إنتاجي ويحتوي على جميع استدعاءات الـ API الخاصة بالأدمن،
// مع تحديث كامل لجزء إدارة الإعلانات وإدارة الأقسام بما يتوافق مع مسارات الباك إند.

import { api } from "./api";

/**
 * 🟩 خدمات عامة للأدمن (Overview / Stats)
 *
 * الآن تدعم باراميترات اختيارية مثل:
 *  - { period: "all" | "day" | "7d" | "30d" }
 * وأي باراميترات أخرى مستقبلاً، مع الحفاظ على التوافق مع النداءات القديمة بدون باراميترات.
 */
export async function getAdminStats(params = {}) {
  const res = await api.get("/admin/stats", { params });
  return res.data; // يعيد كائن الإحصاءات الكامل من الباك إند (users, stores, orders, products, ordersSummary, financial, ...)
}

/**
 * 🟦 إدارة المستخدمين
 *  GET  /api/admin/users
 *  GET  /api/admin/users/:id
 *  PUT  /api/admin/users/:id/role    { role }
 *  PUT  /api/admin/users/:id/status  { isActive }
 */
export async function getAllUsers() {
  const res = await api.get("/admin/users");
  return res.data; // { users: [] }
}

export async function updateUserRole(id, role) {
  const res = await api.put(`/admin/users/${id}/role`, { role });
  return res.data; // { message, user }
}

// 🔹 جديد: جلب تفاصيل مستخدم معيّن للأدمن
export async function getAdminUserDetails(id) {
  const res = await api.get(`/admin/users/${id}`);
  return res.data; // { user, addresses, store, stores, shippingCompany, stats }
}

export async function updateUserStatus(id, isActive) {
  const res = await api.put(`/admin/users/${id}/status`, { isActive });
  return res.data; // { message, user }
}

// 🔹 جديد: حذف المستخدم نهائياً
export async function deleteUser(id) {
  const res = await api.delete(`/admin/users/${id}`);
  return res.data; // { message }
}

/**
 * 🟥 إدارة المشرفين (الأمان والصلاحيات)
 *  GET    /api/admin/admins
 *  POST   /api/admin/admins
 *  PUT    /api/admin/admins/:id/permissions
 *  PUT    /api/admin/admins/:id/toggle-status
 *  DELETE /api/admin/admins/:id
 */
export async function getAdmins() {
  const res = await api.get("/admin/admins");
  return res.data; // { admins: [] }
}

export async function createAdmin(payload) {
  // payload: { name, email, password, title, permissions }
  const res = await api.post("/admin/admins", payload);
  return res.data; // { admin }
}

// ✅ محدثة مع الحفاظ على التوافق:
// - النمط القديم: updateAdminPermissions(id, permissionsObject)
//   ⇒ يرسل { permissions: permissionsObject }
// - النمط الجديد: updateAdminPermissions(id, { name, email, phone, staffCode, title, permissions })
//   ⇒ يرسل الجسم كما هو
export async function updateAdminPermissions(id, payloadOrPermissions) {
  let payload = payloadOrPermissions;

  // إذا لم يُرسل شيء نهائياً
  if (!payload) {
    payload = {};
  }

  // توافق مع النمط القديم:
  // إذا كان كائنًا بسيطًا لا يحتوي على مفاتيح بيانات الموظف
  // ولا يحتوي على "permissions"، نعتبره هو كائن الصلاحيات فقط.
  if (
    payload &&
    typeof payload === "object" &&
    !Array.isArray(payload) &&
    !("permissions" in payload) &&
    !("name" in payload) &&
    !("email" in payload) &&
    !("phone" in payload) &&
    !("staffCode" in payload) &&
    !("title" in payload)
  ) {
    payload = { permissions: payloadOrPermissions };
  }

  const res = await api.put(`/admin/admins/${id}/permissions`, payload);
  return res.data; // { admin }
}

export async function toggleAdminStatus(id) {
  const res = await api.put(`/admin/admins/${id}/toggle-status`);
  return res.data; // { admin }
}

export async function deleteAdmin(id) {
  const res = await api.delete(`/admin/admins/${id}`);
  return res.data; // { message }
}

/**
 * 🟧 إدارة البائعين (Sellers)
 *  GET  /api/admin/sellers
 *  PUT  /api/admin/sellers/:id/status   { status }
 *  PUT  /api/admin/sellers/:id/approve
 *  PUT  /api/admin/sellers/:id/reject   { reason }
 */
export async function getAdminSellers(params = {}) {
  const res = await api.get("/admin/sellers", { params });
  return res.data; // { sellers: [] }
}

export async function updateSellerStatus(id, status) {
  const res = await api.put(`/admin/sellers/${id}/status`, { status });
  return res.data; // { store }
}

export async function approveSeller(id) {
  const res = await api.put(`/admin/sellers/${id}/approve`);
  return res.data; // { store }
}

export async function rejectSeller(id, reason = "") {
  const res = await api.put(`/admin/sellers/${id}/reject`, { reason });
  return res.data; // { store }
}

// ✅ جديد: جلب بيانات بائع واحد بالتفصيل
export async function getAdminSellerById(id) {
  const res = await api.get(`/admin/sellers/${id}`);
  return res.data; // { seller: { ... } }
}

// ✅ جديد: جلب إحصائيات بائع معيّن (منتجات + طلبات)
export async function getAdminSellerStats(id) {
  const res = await api.get(`/admin/sellers/${id}/stats`);
  return res.data; // { products: {}, orders: {} }
}

/**
 * 🟪 إدارة المنتجات (Products)
 *  GET    /api/admin/products
 *  GET    /api/admin/products/:id/details   (تفاصيل + إحصاءات)
 *  PUT    /api/admin/products/:id/status    { status }
 *  DELETE /api/admin/products/:id
 */
export async function getAdminProducts(params = {}) {
  const res = await api.get("/admin/products", { params });
  return res.data; // { products: [] }
}

// ✅ جديد: جلب تفاصيل منتج واحد مع الإحصاءات لواجهة الأدمن
export async function getAdminProductDetails(id) {
  const res = await api.get(`/admin/products/${id}/details`);
  return res.data; // { product: { ... } }
}

export async function updateProductStatus(id, status) {
  const res = await api.put(`/admin/products/${id}/status`, { status });
  return res.data; // { product }
}

// ✅ جديد: تحديث حالة التميز للمنتج
export async function updateProductFeatureStatus(id, payload) {
  // payload: { isFeatured: boolean, featuredOrder?: number }
  const res = await api.put(`/admin/products/${id}/feature-status`, payload);
  return res.data; // { _id, isFeatured, featuredOrder, message }
}

export async function deleteProductAsAdmin(id) {
  const res = await api.delete(`/admin/products/${id}`);
  return res.data; // { message }
}

/**
 * 🟫 إدارة الطلبات (Orders)
 *  GET  /api/admin/orders
 *  PUT  /api/admin/orders/:id/status           { status, statusCode }
 *  PUT  /api/admin/orders/:id/cancel           { reason }
 */
export async function getAdminOrders(params = {}) {
  const res = await api.get("/admin/orders", { params });
  return res.data; // { orders: [] }
}

// ⬅️ نرسل status و statusCode معًا لدعم الأكواد الموحّدة
export async function updateOrderStatus(id, statusOrCode) {
  const payload = {};

  if (typeof statusOrCode === "string") {
    // ندعم إرسال الكود الموحّد مثل "IN_SHIPPING" أو النص العربي،
    // ونرسله في حقلَي status و statusCode معًا ليختار الباك ما يناسبه.
    payload.status = statusOrCode;
    payload.statusCode = statusOrCode;
  } else if (statusOrCode && typeof statusOrCode === "object") {
    Object.assign(payload, statusOrCode);
  }

  const res = await api.put(`/admin/orders/${id}/status`, payload);
  return res.data; // { order }
}

export async function cancelOrderAsAdmin(id, reason = "") {
  const res = await api.put(`/admin/orders/${id}/cancel`, { reason });
  return res.data; // { order }
}

/**
 * 🆕 تحديث حالة منتج واحد داخل الطلب من لوحة الأدمن (Item-based)
 *  PATCH /api/admin/orders/:orderId/items/:itemId/status          { status | statusCode }
 *  PATCH /api/admin/orders/:orderId/items/:itemId/cancel-by-admin { reason }
 */
export async function updateOrderItemStatus(orderId, itemId, statusOrCode) {
  const payload = {};

  if (typeof statusOrCode === "string") {
    payload.status = statusOrCode;
    payload.statusCode = statusOrCode;
  } else if (statusOrCode && typeof statusOrCode === "object") {
    Object.assign(payload, statusOrCode);
  }

  const res = await api.patch(
    `/admin/orders/${orderId}/items/${itemId}/status`,
    payload
  );
  return res.data; // { order }
}

export async function cancelOrderItemAsAdmin(orderId, itemId, reason = "") {
  const res = await api.patch(
    `/admin/orders/${orderId}/items/${itemId}/cancel-by-admin`,
    { reason }
  );
  return res.data; // { order }
}

/**
 * 🚨 حذف الطلب نهائياً من النظام (Super Admin فقط)
 *  DELETE /api/admin/orders/:id
 *  ⚠️ تحذير: هذه العملية خطيرة ولا يمكن التراجع عنها
 */
export async function deleteOrderPermanently(orderId) {
  const res = await api.delete(`/admin/orders/${orderId}`);
  return res.data; // { success, message, deletedOrder }
}

/**
 * 🟦 شركات الشحن (Shipping Companies)
 *  GET    /api/admin/shipping-companies
 *  POST   /api/admin/shipping-companies
 *  PUT    /api/admin/shipping-companies/:id
 *  PUT    /api/admin/shipping-companies/:id/toggle
 *  DELETE /api/admin/shipping-companies/:id
 */
export async function getAdminShippingCompanies() {
  const res = await api.get("/admin/shipping-companies");
  return res.data; // { companies: [] }
}

export async function createShippingCompany(payload) {
  const res = await api.post("/admin/shipping-companies", payload);
  return res.data; // { company }
}

export async function updateShippingCompany(id, payload) {
  const res = await api.put(`/admin/shipping-companies/${id}`, payload);
  return res.data; // { company }
}

export async function toggleShippingCompany(id) {
  const res = await api.put(`/admin/shipping-companies/${id}/toggle`);
  return res.data; // { company }
}

export async function deleteShippingCompany(id) {
  const res = await api.delete(`/admin/shipping-companies/${id}`);
  return res.data; // { message }
}

/**
 * 💰 الإدارة المالية (Financial)
 *
 *  GET  /api/admin/financial-summary
 *  GET  /api/admin/transactions
 *  GET  /api/admin/financial/accounts
 *  POST /api/admin/financial/settle
 */

// ✅ تعديل: نستقبل باراميترات (from/to...) لفلترة الملخص
export async function getAdminFinancialSummary(params = {}) {
  const res = await api.get("/admin/financial-summary", { params });
  return res.data; // { totalTransactions, totalTransactionAmount, ... }
}

export async function getAdminTransactions(params = {}) {
  const res = await api.get("/admin/transactions", { params });
  return res.data; // { transactions, pagination }
}

// ✅ جديد: جلب جدول الحسابات (بائعون / شركات شحن) للرؤوس الأساسية في الإدارة المالية
export async function getAdminFinancialAccounts(params = {}) {
  const res = await api.get("/admin/financial/accounts", { params });
  return res.data; // { accounts: [] }
}

// ✅ جديد: إنشاء عملية تسوية (إرسال / استرجاع / توريد) لحساب معين
export async function createAdminFinancialSettlement(payload) {
  // payload: { role, partyId, operationType, amount, note, paymentMethod }
  const res = await api.post("/admin/financial/settle", payload);
  return res.data; // { message, transaction }
}

/**
 * 📊 التقارير (Reports)
 *  GET /api/admin/reports/overview
 *  GET /api/admin/reports/sales-by-category
 */
export async function getAdminReports(params = {}) {
  const res = await api.get("/admin/reports/overview", { params });
  return res.data;
}

export async function getAdminReportsOverview(params = {}) {
  const res = await api.get("/admin/reports/overview", { params });
  return res.data;
}

export async function getAdminSalesByCategory(params = {}) {
  const res = await api.get("/admin/reports/sales-by-category", { params });
  return res.data;
}

/**
 * 📣 الإعلانات (Ads)
 *
 * مسارات الأدمن في الباك إند (adRoutes):
 *  GET    /api/ads/admin                   -> قائمة الإعلانات مع فلترة / بحث
 *  POST   /api/ads/admin                   -> إنشاء إعلان جديد (multipart/form-data)
 *  PUT    /api/ads/admin/:id               -> تعديل إعلان (multipart/form-data)
 *  PATCH  /api/ads/admin/:id/status        -> تفعيل / تعطيل إعلان
 *  PUT    /api/ads/admin/reorder           -> إعادة ترتيب الإعلانات بالسحب والإفلات
 */
export async function getAdminAds(params = {}) {
  const res = await api.get("/ads/admin", { params });
  return res.data; // { success, data, pagination } أو شكل مشابه حسب الباك إند
}

// إنشاء إعلان جديد (عنوان + صورة + فترة عرض + ترتيب + رابط + حالة)
export async function createAdminAd(formData) {
  const res = await api.post("/ads/admin", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return res.data; // { success, data: ad }
}

// تعديل إعلان قائم (نفس الحقول مع إمكانية تغيير الصورة)
export async function updateAdminAd(id, formData) {
  const res = await api.put(`/ads/admin/${id}`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return res.data; // { success, data: ad }
}

// تفعيل / تعطيل إعلان واحد
export async function toggleAdminAdStatus(id) {
  const res = await api.patch(`/ads/admin/${id}/status`);
  return res.data; // { success, data: ad }
}

// حذف إعلان
export async function deleteAdminAd(id) {
  const res = await api.delete(`/ads/admin/${id}`);
  return res.data; // { success, message }
}

// إعادة ترتيب الإعلانات داخل نفس الـ placement (مثلاً home_main_banner)
export async function reorderAdminAds(placement, orderedIds) {
  const res = await api.put("/ads/admin/reorder", {
    placement,
    orderedIds,
  });
  return res.data; // { success, data: updatedAds }
}

/**
 * 🧩 إدارة الأقسام (Categories)
 *  GET    /api/admin/categories
 *  POST   /api/admin/categories         (multipart/form-data)
 *  PUT    /api/admin/categories/:id     (multipart/form-data)
 *  DELETE /api/admin/categories/:id
 */
export async function getAdminCategories() {
  const res = await api.get("/admin/categories");
  return res.data; // { categories: [] }
}

// إنشاء قسم جديد (اسم + وصف + ترتيب + صورة + نسبة العمولة + حالة التفعيل)
export async function createAdminCategory({
  name,
  description,
  sortOrder,
  imageFile,
  commissionRate,
  isActive,
}) {
  const formData = new FormData();

  if (name) formData.append("name", name);
  if (description) formData.append("description", description);
  if (typeof sortOrder !== "undefined" && sortOrder !== null) {
    formData.append("sortOrder", sortOrder);
  }
  // 👇 إرسال نسبة عمولة المنصة لهذا القسم
  if (
    typeof commissionRate !== "undefined" &&
    commissionRate !== null &&
    commissionRate !== ""
  ) {
    formData.append("commissionRate", commissionRate);
  }
  // 👇 حالة التفعيل (اختياري)
  if (typeof isActive !== "undefined") {
    formData.append("isActive", isActive);
  }
  if (imageFile) {
    formData.append("image", imageFile);
  }

  const res = await api.post("/admin/categories", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return res.data; // { category }
}

// تعديل قسم موجود (مع إمكانية تغيير الصورة والعمولة والحالة)
export async function updateAdminCategory(
  id,
  { name, description, sortOrder, imageFile, commissionRate, isActive }
) {
  const formData = new FormData();

  if (name) formData.append("name", name);
  if (typeof description !== "undefined") {
    formData.append("description", description);
  }
  if (typeof sortOrder !== "undefined" && sortOrder !== null) {
    formData.append("sortOrder", sortOrder);
  }
  // 👇 إرسال نسبة عمولة المنصة عند التعديل أيضًا
  if (
    typeof commissionRate !== "undefined" &&
    commissionRate !== null &&
    commissionRate !== ""
  ) {
    formData.append("commissionRate", commissionRate);
  }
  // 👇 حالة التفعيل (اختياري)
  if (typeof isActive !== "undefined") {
    formData.append("isActive", isActive);
  }
  if (imageFile) {
    formData.append("image", imageFile);
  }

  const res = await api.put(`/admin/categories/${id}`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return res.data; // { category }
}

export async function deleteAdminCategory(id) {
  const res = await api.delete(`/admin/categories/${id}`);
  return res.data; // { message }
}

/**
 * 🔔 التنبيهات (Notifications)
 *  GET    /api/admin/notifications
 *  POST   /api/admin/notifications
 *  DELETE /api/admin/notifications/:id
 */
export async function getAdminNotifications(params = {}) {
  const res = await api.get("/admin/notifications", { params });
  return res.data; // { notifications: [] }
}

export async function createAdminNotification(payload) {
  const res = await api.post("/admin/notifications", payload);
  return res.data; // { notification }
}

// ✅ جديد: إرسال تنبيه لموظف إداري معيّن (staff admin)
// يستخدم نفس المسار، لكن يمرّر adminId لتفعيله كتنبيه فردي.
export async function sendAdminStaffNotification(adminId, payload) {
  const res = await api.post("/admin/notifications", {
    adminId,
    ...payload, // { title, message, ... }
  });
  return res.data; // { notification }
}

export async function deleteAdminNotification(id) {
  const res = await api.delete(`/admin/notifications/${id}`);
  return res.data; // { message }
}

/**
 * 🆘 الدعم الفني (Support Tickets)
 *  GET    /api/admin/support-tickets
 *  PUT    /api/admin/support-tickets/:id/status   { status }
 *  PUT    /api/admin/support-tickets/:id/reply    { reply }
 *  DELETE /api/admin/support-tickets/:id
 */
export async function getAdminSupportTickets(params = {}) {
  const res = await api.get("/admin/support-tickets", { params });
  return res.data; // { tickets: [] }
}

export async function updateSupportTicketStatus(id, status) {
  const res = await api.put(`/admin/support-tickets/${id}/status`, { status });
  return res.data; // { ticket }
}

// ✅ الرد على التذكرة
export async function replyToSupportTicket(id, reply) {
  const res = await api.put(`/admin/support-tickets/${id}/reply`, { reply });
  return res.data; // { ticket }
}

// ✅ حذف التذكرة
export async function deleteSupportTicket(id) {
  const res = await api.delete(`/admin/support-tickets/${id}`);
  return res.data; // { message }
}

/**
 * 💳 إدارة خيارات الدفع (Payment Settings)
 *  GET  /api/admin/payment-settings
 *  PUT  /api/admin/payment-settings   { cod, card, transfer }
 *  GET  /api/admin/bank-transfers
 */

// جلب إعدادات الدفع الحالية للأدمن
export async function getAdminPaymentSettings(params = "") {
  const res = await api.get(`/admin/payment-settings${params}`);
  return res.data; // { settings, updatedAt, updatedBy }
}

// تحديث إعدادات الدفع (استخدام POST للتوافق الأقصى)
export async function updateAdminPaymentSettings(payload) {
  const res = await api.post("/admin/payment-settings", payload);
  return res.data; // { message, settings }
}

// جلب قائمة الطلبات المدفوعة بالحوالة البنكية (مع بيانات المرسل)
export async function getAdminBankTransfers(params = {}) {
  const res = await api.get("/admin/bank-transfers", { params });
  return res.data; // { data: [], pagination: {} }
}

// ✅ تحديث حالة تأكيد الحوالة (pending | confirmed | rejected)
export async function updateAdminBankTransferStatus(orderId, status) {
  // نستخدم POST لضمان التوافق مع البيئات المحلية التي قد تمنع PATCH
  const res = await api.post(`/admin/bank-transfers/${orderId}/status`, { status });
  return res.data; // { message, orderId, bankTransferStatus }
}

/**
 * ⚙️ إعدادات النظام العامة (System Settings)
 * GET /api/settings/min-order
 * PUT /api/settings/min-order    { active, value }
 */
export async function getMinOrderSettings() {
  const res = await api.get("/settings/min-order");
  return res.data; // { active (boolean), value (number) }
}

export async function updateMinOrderSettings(payload) {
  const res = await api.put("/settings/min-order", payload);
  return res.data; // { message, active, value }
}

