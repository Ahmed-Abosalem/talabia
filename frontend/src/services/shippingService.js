// frontend/src/services/shippingService.js

import { api } from "./api";

// ✅ توحيد تحويل مفاتيح الحالة في واجهة الشحن إلى ما يفهمه الباك
function mapShippingStatusKeyForBackend(statusKey) {
  // الواجهة تستخدم: cancelled / on_the_way
  // الباك يفضل: cancelled_ship / on_the_way
  if (!statusKey) return statusKey;

  if (statusKey === "cancelled") return "cancelled_ship";
  if (statusKey === "on_the_way") return "on_the_way";

  // اترك أي قيم أخرى كما هي (تحسبًا لامتدادات مستقبلية)
  return statusKey;
}

// (اختياري) لوحة معلومات عامة لشركة الشحن إن وُجد هذا المسار في الباك إند
export async function getShippingDashboard() {
  const res = await api.get("/shipping/dashboard");
  return res.data;
}

// ✅ جلب طلبات شركة الشحن من الباك إند
export async function getShippingOrders() {
  const res = await api.get("/shipping/orders");
  return res.data;
}

// ✅ تحديث حالة الشحن للطلب بالكامل (منطق قديم - Bulk على مستوى الطلب)
export async function updateShippingOrderStatus(orderId, statusKey) {
  const backendStatus = mapShippingStatusKeyForBackend(statusKey);

  const res = await api.put(`/shipping/orders/${orderId}/status`, {
    statusKey: backendStatus,
  });

  return res.data; // { message, order }
}

// ✅ تحديث حالة منتج واحد داخل الطلب (المنطق الجديد – Item-based)
export async function updateShippingOrderItemStatus(orderId, itemId, statusKey) {
  const backendStatus = mapShippingStatusKeyForBackend(statusKey);

  const res = await api.patch(
    `/shipping/orders/${orderId}/items/${itemId}/status`,
    { statusKey: backendStatus }
  );

  return res.data; // { message, order }
}

// ✅ تأكيد التسليم لمنتج واحد داخل الطلب عبر كود التسليم
export async function confirmDeliveryForItem(orderId, itemId, deliveryCode) {
  const res = await api.post(
    `/shipping/orders/${orderId}/items/${itemId}/confirm-delivery`,
    { deliveryCode }
  );
  return res.data; // { message, order }
}

// ✅ جلب تسعيرة الشحن الافتراضية (سعر التوصيل الأساسي) لاستخدامها في صفحة الدفع
export async function getDefaultShippingPricing() {
  const res = await api.get("/shipping/public/default-pricing");
  return res.data; // { baseFee, currency }
}
