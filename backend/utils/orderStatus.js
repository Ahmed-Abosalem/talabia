// ────────────────────────────────────────────────
// 📁 backend/utils/orderStatus.js
// نظام الحالة الموحدة للطلبات في طلبية (Talabia)
// ────────────────────────────────────────────────

// ✅ الأكواد الموحدة على مستوى النظام
export const ORDER_STATUS_CODES = {
  AT_SELLER_NEW: "AT_SELLER_NEW", // طلب جديد عند البائع
  AT_SELLER_PROCESSING: "AT_SELLER_PROCESSING", // قيد المعالجة عند البائع
  AT_SELLER_READY_TO_SHIP: "AT_SELLER_READY_TO_SHIP", // جاهز للتسليم لشركة الشحن
  IN_SHIPPING: "IN_SHIPPING", // في الطريق مع شركة الشحن
  DELIVERED: "DELIVERED", // تم التسليم
  CANCELLED_BY_SELLER: "CANCELLED_BY_SELLER", // ملغي من قبل البائع
  CANCELLED_BY_SHIPPING: "CANCELLED_BY_SHIPPING", // ملغي من قبل شركة الشحن
  CANCELLED_BY_ADMIN: "CANCELLED_BY_ADMIN", // ملغي من قبل الإدارة
};

// 🏷️ التسميات العربية العامة
// هنا عدلنا النصوص لتكون مطابقة تمامًا للوثيقة
// ونفس النصوص الموجودة في frontend/src/config/orderStatus.js
export const ORDER_STATUS_LABELS_AR = {
  [ORDER_STATUS_CODES.AT_SELLER_NEW]: "عند البائع طلب جديد",
  [ORDER_STATUS_CODES.AT_SELLER_PROCESSING]: "عند البائع قيد المعالجة",
  [ORDER_STATUS_CODES.AT_SELLER_READY_TO_SHIP]: "عند البائع جاهز للشحن",
  [ORDER_STATUS_CODES.IN_SHIPPING]: "في الشحن",
  [ORDER_STATUS_CODES.DELIVERED]: "تم التسليم",
  [ORDER_STATUS_CODES.CANCELLED_BY_SELLER]: "ملغى من قبل البائع",
  [ORDER_STATUS_CODES.CANCELLED_BY_SHIPPING]: "ملغى من قبل الشحن",
  [ORDER_STATUS_CODES.CANCELLED_BY_ADMIN]: "ملغى من قبل المدير",
};

// 🔁 تحويل الحالة العربية العامة القديمة إلى كود موحد (أفضل جهد)
export function mapLegacyArabicStatusToCode(status) {
  if (!status) return null;
  const s = String(status).trim();

  switch (s) {
    case "جديد":
      return ORDER_STATUS_CODES.AT_SELLER_NEW;
    case "قيد المعالجة":
      return ORDER_STATUS_CODES.AT_SELLER_PROCESSING;
    case "قيد الشحن":
      // على مستوى عام نعتبرها "في الشحن"
      return ORDER_STATUS_CODES.IN_SHIPPING;
    case "مكتمل":
      return ORDER_STATUS_CODES.DELIVERED;
    case "ملغى":
      // لا نعرف هنا سبب الإلغاء (بائع / شحن / أدمن)
      return null;
    default:
      return null;
  }
}

// 🔁 تحويل كود موحد → الحالة العربية العامة (حقل Order.status)
export function mapStatusCodeToLegacyArabic(code) {
  if (!code) return null;

  switch (code) {
    case ORDER_STATUS_CODES.AT_SELLER_NEW:
      return "جديد";
    case ORDER_STATUS_CODES.AT_SELLER_PROCESSING:
      return "قيد المعالجة";
    case ORDER_STATUS_CODES.AT_SELLER_READY_TO_SHIP:
      return "قيد الشحن"; // أقرب ما يكون بصريًا
    case ORDER_STATUS_CODES.IN_SHIPPING:
      return "قيد الشحن";
    case ORDER_STATUS_CODES.DELIVERED:
      return "مكتمل";
    case ORDER_STATUS_CODES.CANCELLED_BY_SELLER:
    case ORDER_STATUS_CODES.CANCELLED_BY_SHIPPING:
    case ORDER_STATUS_CODES.CANCELLED_BY_ADMIN:
      return "ملغى";
    default:
      return null;
  }
}

// 🧩 منطق البائع → كود موحد
export function mapSellerStatusKeyToCode(sellerStatusKey) {
  if (!sellerStatusKey) return null;
  const v = String(sellerStatusKey).trim().toLowerCase();

  switch (v) {
    case "new":
      return ORDER_STATUS_CODES.AT_SELLER_NEW;
    case "processing":
      return ORDER_STATUS_CODES.AT_SELLER_PROCESSING;
    case "ready_for_shipping":
    case "ready-for-shipping":
      return ORDER_STATUS_CODES.AT_SELLER_READY_TO_SHIP;
    case "cancelled":
      return ORDER_STATUS_CODES.CANCELLED_BY_SELLER;
    default:
      return null;
  }
}

// 🧩 منطق الشحن → كود موحد
export function mapShippingStatusKeyToCode(shippingStatusKey) {
  if (!shippingStatusKey) return null;
  const v = String(shippingStatusKey).trim().toLowerCase();

  switch (v) {
    case "pending_pickup":
      // ما زال عند البائع فعليًا؛ لا نغيّر الكود إن وُجد
      return null;
    case "on_the_way":
      return ORDER_STATUS_CODES.IN_SHIPPING;
    case "delivered":
      return ORDER_STATUS_CODES.DELIVERED;
    case "cancelled_shipping":
    case "cancelled_ship":
      return ORDER_STATUS_CODES.CANCELLED_BY_SHIPPING;
    default:
      return null;
  }
}

// 🧩 إدخال الأدمن → كود موحد (يدعم الكود أو نص عربي)
export function mapAdminStatusInputToCode(input) {
  if (!input) return null;
  const v = String(input).trim();

  // لو أرسل الأدمن الكود نفسه
  if (Object.values(ORDER_STATUS_CODES).includes(v)) {
    return v;
  }

  // ✅ دعم كل صيغ الإلغاء المرتبطة بالأدمن/المدير
  if (
    v === "ملغي من قبل الإدارة" ||
    v === "ملغى من قبل الإدارة" ||
    v === "ملغي من قبل المدير" ||
    v === "ملغى من قبل المدير"
  ) {
    return ORDER_STATUS_CODES.CANCELLED_BY_ADMIN;
  }

  if (v === "تم التسليم" || v === "مكتمل") {
    return ORDER_STATUS_CODES.DELIVERED;
  }

  return null;
}

// ────────────────────────────────────────────────
// 🏗️ البناء المعماري الجديد (Single Source of Truth)
// ────────────────────────────────────────────────

/**
 * ✅ التزامن الذري (Atomic Synchronization)
 * تقوم بتحديث الكود البرمجي والنص العربي المرافق له في خطوة واحدة لضمان عدم التعارض.
 */
export function syncItemStatus(item, newCode) {
  if (!item || !newCode) return;
  if (!Object.values(ORDER_STATUS_CODES).includes(newCode)) {
    console.warn(`[STATUS] محاولة تعيين كود غير صالح: ${newCode}`);
    return;
  }

  item.statusCode = newCode;
  const legacy = mapStatusCodeToLegacyArabic(newCode);
  if (legacy) {
    item.itemStatus = legacy;
  }
}

/**
 * ✅ التزامن الذري على مستوى الطلب ككل
 */
export function syncOrderStatus(order, newCode) {
  if (!order || !newCode) return;
  if (!Object.values(ORDER_STATUS_CODES).includes(newCode)) {
    console.warn(`[STATUS] محاولة تعيين كود غير صالح للطلب: ${newCode}`);
    return;
  }

  order.statusCode = newCode;
  const legacy = mapStatusCodeToLegacyArabic(newCode);
  if (legacy) {
    order.status = legacy;
  }
}

/**
 * ✅ التأكد من نجاح التسليم
 */
export function isCompleted(item) {
  if (!item) return false;
  return (
    item.statusCode === ORDER_STATUS_CODES.DELIVERED ||
    item.itemStatus === "مكتمل" || // Legacy support
    item.status === "completed" // Legacy support
  );
}

/**
 * ✅ التأكد من إلغاء المنتج
 */
export function isCancelled(item) {
  if (!item) return false;
  return (
    [
      ORDER_STATUS_CODES.CANCELLED_BY_SELLER,
      ORDER_STATUS_CODES.CANCELLED_BY_SHIPPING,
      ORDER_STATUS_CODES.CANCELLED_BY_ADMIN,
    ].includes(item.statusCode) ||
    item.itemStatus === "ملغى" ||
    item.status === "cancelled" ||
    item.sellerStatus === "cancelled"
  );
}

/**
 * ✅ التأكد من انتهاء دورة حياة المنتج (نجاح أو فشل)
 */
export function isFinal(item) {
  return isCompleted(item) || isCancelled(item);
}

/**
 * ✅ هل المنتج قابل للتحصيل المالي؟
 * (يجب أن يكون اكتمل ولم يُلغَ)
 */
export function isBillable(item) {
  return isCompleted(item) && !isCancelled(item);
}

// 🧮 دالة مساعدة في حال أردنا إعادة احتساب الكود من كيان الطلب كاملًا
export function recomputeOrderStatusCode(order) {
  if (!order) return null;

  // لو محدد مسبقًا كإلغاء من الإدارة → نبقيه كما هو
  if (order.statusCode === ORDER_STATUS_CODES.CANCELLED_BY_ADMIN) {
    return ORDER_STATUS_CODES.CANCELLED_BY_ADMIN;
  }

  // نعطي أولوية لمنطق الشحن في الحالات النهائية
  const fromShipping = mapShippingStatusKeyToCode(order.shippingStatus);
  if (fromShipping === ORDER_STATUS_CODES.DELIVERED) return fromShipping;
  if (fromShipping === ORDER_STATUS_CODES.CANCELLED_BY_SHIPPING) return fromShipping;
  if (fromShipping === ORDER_STATUS_CODES.IN_SHIPPING) return fromShipping;

  // ثم منطق البائع
  const fromSeller = mapSellerStatusKeyToCode(order.sellerStatus);
  if (fromSeller) return fromSeller;

  // ثم الحالة العربية العامة القديمة
  const fromLegacy = mapLegacyArabicStatusToCode(order.status);
  if (fromLegacy) return fromLegacy;

  // أو نعيد ما كان مُخزنًا
  return order.statusCode || null;
}
