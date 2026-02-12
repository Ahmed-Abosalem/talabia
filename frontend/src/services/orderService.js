// src/services/orderService.js
// خدمة الطلبات في الواجهة الأمامية لمنصة طلبية (Talabia)
// تغطي جميع الأدوار: المشتري، البائع، شركة الشحن، الأدمن

import { api } from "./api";

//
// 🧩 ملاحظات عامة
// - جميع الدوال تستخدم async/await وتعيد فقط res.data.
// - لا توجد بيانات وهمية، الاعتماد كليًا على الـ API الخلفي.
// - يتم تمرير scope والبارامترات الأخرى للباك إند كما هي.
// - updateOrderStatus يدعم:
//   - updateOrderStatus(id, "new_status")
//   - أو updateOrderStatus(id, { status: "new_status", ... })
//

// جلب قائمة الطلبات (دالة عامة)
// params يمكن أن تحتوي على:
// - scope: "buyer" | "seller" | "admin" | "shipping"
// - status: حالة الطلب (new, processing, ready_for_shipping, in_shipping, delivered, cancelled)
// - page, limit, sort, buyerId, sellerId, shippingCompanyId ... حسب ما يدعمه الباك إند
export async function listOrders(params = {}) {
  const res = await api.get("/orders", { params });
  return res.data;
}

// 🧑‍💼 الأدمن: جلب جميع الطلبات مع إمكانية التصفية
export async function listAdminOrders(params = {}) {
  const res = await api.get("/orders", {
    params: {
      scope: "admin",
      ...params,
    },
  });
  return res.data;
}

// 👤 المشتري: جلب طلبات المشتري الحالي
export async function listBuyerOrders(params = {}) {
  const res = await api.get("/orders", {
    params: {
      scope: "buyer",
      ...params,
    },
  });
  return res.data;
}

// 🏪 البائع: جلب طلبات مرتبطة بمنتجات متجر البائع الحالي
// تُستخدم في SellerOrdersSection و/أو SellerDashboard
export async function listSellerOrders(params = {}) {
  const res = await api.get("/orders", {
    params: {
      scope: "seller",
      ...params,
    },
  });
  return res.data;
}

// 🚚 شركة الشحن: جلب الطلبات المرتبطة بشركة الشحن الحالية
export async function listShippingOrders(params = {}) {
  const res = await api.get("/orders", {
    params: {
      scope: "shipping",
      ...params,
    },
  });
  return res.data;
}

// جلب تفاصيل طلب واحد
// يمكن تمرير params إضافية إذا احتاج الباك إند (مثل تضمين العلاقات، إلخ)
export async function getOrderById(id, params = {}) {
  const res = await api.get(`/orders/${id}`, { params });
  return res.data;
}

// إنشاء طلب جديد (المشتري - من صفحة السلة/إتمام الشراء)
// payload يحتوي على بيانات الطلب كاملة كما يتوقعها الباك إند
export async function createOrder(payload) {
  const res = await api.post("/orders", payload);
  return res.data;
}

// تحديث حالة الطلب (بائع / شركة شحن / أدمن)
// يدعم:
// - updateOrderStatus(id, "processing")
// - updateOrderStatus(id, { status: "processing", note: "..." })
export async function updateOrderStatus(id, statusOrPayload) {
  let payload;

  if (typeof statusOrPayload === "string") {
    payload = { status: statusOrPayload };
  } else if (statusOrPayload && typeof statusOrPayload === "object") {
    payload = { ...statusOrPayload };
  } else {
    payload = {};
  }

  const res = await api.put(`/orders/${id}/status`, payload);
  return res.data;
}

// طلب إلغاء من طرف المشتري (إن كانت موجودة في الباك إند)
// لا تلغي الطلب مباشرة، بل تسجّل طلب إلغاء ليوافق عليه الأدمن أو النظام
export async function requestOrderCancellation(id, reason) {
  const res = await api.post(`/orders/${id}/cancellation-request`, {
    reason,
  });
  return res.data;
}

// تحديث معلومات الشحن (مفيد لشركة الشحن أو الأدمن)
// payload قد يحتوي على رقم التتبع، شركة الشحن، تاريخ متوقع، إلخ
export async function updateShippingInfo(id, payload) {
  const res = await api.put(`/orders/${id}/shipping`, payload);
  return res.data;
}

// ────────────────────────────────────────────────
// 🔹 دوال على مستوى "عنصر الطلب" (Order Item)
// - تحديث حالة منتج داخل الطلب
// - تقييم منتج داخل الطلب
// - إخفاء منتج من واجهة المشتري
// ────────────────────────────────────────────────

// تحديث حالة منتج داخل طلب (بائع / شاحن / أدمن)
// يدعم:
// - updateOrderItemStatus(orderId, itemId, "مكتمل")
// - updateOrderItemStatus(orderId, itemId, { status: "مكتمل", note: "..." })
export async function updateOrderItemStatus(
  orderId,
  itemId,
  statusOrPayload
) {
  let payload;

  if (typeof statusOrPayload === "string") {
    payload = { status: statusOrPayload };
  } else if (statusOrPayload && typeof statusOrPayload === "object") {
    payload = { ...statusOrPayload };
  } else {
    payload = {};
  }

  const res = await api.put(
    `/orders/${orderId}/items/${itemId}/status`,
    payload
  );
  return res.data;
}

// تقييم منتج داخل الطلب (المشتري)
// مثال: rateOrderItem(orderId, itemId, 5, "منتج ممتاز")
export async function rateOrderItem(orderId, itemId, value, comment = "") {
  const res = await api.post(
    `/orders/${orderId}/items/${itemId}/rating`,
    {
      value,
      comment,
    }
  );
  return res.data;
}

// إخفاء منتج من واجهة "طلباتي" للمشتري (لا يُحذف من النظام)
export async function hideOrderItemForBuyer(orderId, itemId) {
  const res = await api.put(
    `/orders/${orderId}/items/${itemId}/hide-for-buyer`
  );
  return res.data;
}

// تصدير كائن خدمة موحّد لاستخدامه حيثما يلزم
const orderService = {
  // الأساسيات العامة
  listOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,

  // لكل دور
  listAdminOrders,
  listBuyerOrders,
  listSellerOrders,
  listShippingOrders,

  // عمليات إضافية
  requestOrderCancellation,
  updateShippingInfo,

  // على مستوى عنصر الطلب
  updateOrderItemStatus,
  rateOrderItem,
  hideOrderItemForBuyer,
};

export default orderService;
