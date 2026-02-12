// src/config/orderStatus.js
// ملف مركزي لتعريف حالات الطلب في الواجهة الأمامية (Talabia)
// هذا الملف متوافق مع backend/utils/orderStatus.js في الباك إند.
// وتم فيه توحيد النصوص العربية بحيث تكون نفسها في كل الواجهات
// (المشتري، البائع، شركة الشحن، الأدمن).

// 🧭 الأكواد الموحدة للحالة على مستوى النظام
export const ORDER_STATUS_CODES = {
  AT_SELLER_NEW: "AT_SELLER_NEW", // طلب جديد عند البائع
  AT_SELLER_PROCESSING: "AT_SELLER_PROCESSING", // قيد المعالجة عند البائع
  AT_SELLER_READY_TO_SHIP: "AT_SELLER_READY_TO_SHIP", // جاهز للشحن
  IN_SHIPPING: "IN_SHIPPING", // في الشحن
  DELIVERED: "DELIVERED", // تم التسليم
  CANCELLED_BY_SELLER: "CANCELLED_BY_SELLER", // ملغى من قبل البائع
  CANCELLED_BY_SHIPPING: "CANCELLED_BY_SHIPPING", // ملغى من قبل الشحن
  CANCELLED_BY_ADMIN: "CANCELLED_BY_ADMIN", // ملغى من قبل المدير
};

// 🏷️ النص العربي الموحد لكل حالة – المرجع الرسمي الوحيد للنصوص
// نفس الجمل تُستعمل في واجهات: المشتري، البائع، الشحن، الأدمن.
export const UNIFIED_STATUS_LABELS_AR = {
  [ORDER_STATUS_CODES.AT_SELLER_NEW]: "عند البائع طلب جديد",
  [ORDER_STATUS_CODES.AT_SELLER_PROCESSING]: "عند البائع قيد المعالجة",
  [ORDER_STATUS_CODES.AT_SELLER_READY_TO_SHIP]: "عند البائع جاهز للشحن",
  [ORDER_STATUS_CODES.IN_SHIPPING]: "في الشحن",
  [ORDER_STATUS_CODES.DELIVERED]: "تم التسليم",
  [ORDER_STATUS_CODES.CANCELLED_BY_SELLER]: "ملغى من قبل البائع",
  [ORDER_STATUS_CODES.CANCELLED_BY_SHIPPING]: "ملغى من قبل الشحن",
  [ORDER_STATUS_CODES.CANCELLED_BY_ADMIN]: "ملغى من قبل المدير",
};

// لأغراض التوافق الخلفي مع أي كود قديم يستخدم هذا الاسم
export const ORDER_STATUS_LABELS_AR = UNIFIED_STATUS_LABELS_AR;

// لأغراض التوافق الخلفي أيضًا، مع ضمان نفس النصوص الموحدة للمشتري
export const BUYER_STATUS_LABELS_AR = UNIFIED_STATUS_LABELS_AR;

// 🧩 دالة مساعدة لإرجاع الاسم العربي من الكود
// ملاحظة: لم نعد نغيّر النص حسب الدور، كل الأدوار ترى نفس النص الموحد.
export function getOrderStatusLabel(code /*, options = {} */) {
  if (!code) return "غير معروف";
  return UNIFIED_STATUS_LABELS_AR[code] || "غير معروف";
}

// 🧩 قائمة خيارات جاهزة للفلاتر في الواجهات المختلفة
// تستخدم نفس النصوص الموحدة من UNIFIED_STATUS_LABELS_AR
export const ORDER_STATUS_FILTER_OPTIONS = [
  { value: "ALL", label: "كل الحالات" },
  {
    value: ORDER_STATUS_CODES.AT_SELLER_NEW,
    label: UNIFIED_STATUS_LABELS_AR[ORDER_STATUS_CODES.AT_SELLER_NEW],
  },
  {
    value: ORDER_STATUS_CODES.AT_SELLER_PROCESSING,
    label: UNIFIED_STATUS_LABELS_AR[ORDER_STATUS_CODES.AT_SELLER_PROCESSING],
  },
  {
    value: ORDER_STATUS_CODES.AT_SELLER_READY_TO_SHIP,
    label: UNIFIED_STATUS_LABELS_AR[ORDER_STATUS_CODES.AT_SELLER_READY_TO_SHIP],
  },
  {
    value: ORDER_STATUS_CODES.IN_SHIPPING,
    label: UNIFIED_STATUS_LABELS_AR[ORDER_STATUS_CODES.IN_SHIPPING],
  },
  {
    value: ORDER_STATUS_CODES.DELIVERED,
    label: UNIFIED_STATUS_LABELS_AR[ORDER_STATUS_CODES.DELIVERED],
  },
  {
    value: ORDER_STATUS_CODES.CANCELLED_BY_SELLER,
    label: UNIFIED_STATUS_LABELS_AR[ORDER_STATUS_CODES.CANCELLED_BY_SELLER],
  },
  {
    value: ORDER_STATUS_CODES.CANCELLED_BY_SHIPPING,
    label: UNIFIED_STATUS_LABELS_AR[ORDER_STATUS_CODES.CANCELLED_BY_SHIPPING],
  },
  {
    value: ORDER_STATUS_CODES.CANCELLED_BY_ADMIN,
    label: UNIFIED_STATUS_LABELS_AR[ORDER_STATUS_CODES.CANCELLED_BY_ADMIN],
  },
];

// 🧮 دالة مساعدة لاشتقاق statusCode من بيانات الطلب
// حتى لو كان الطلب قديمًا ولا يحتوي statusCode في الداتا.
export function normalizeOrderStatusCode(order) {
  if (!order) return null;

  // 1) لو الباك إند أرجع statusCode جاهزًا
  if (
    order.statusCode &&
    Object.values(ORDER_STATUS_CODES).includes(order.statusCode)
  ) {
    return order.statusCode;
  }

  // 2) محاولة من الحقول البرمجية (sellerStatus / shippingStatus) إن وُجدت
  const sellerStatus = (order.sellerStatus || "").toLowerCase();
  const shippingStatus = (order.shippingStatus || "").toLowerCase();
  const legacyStatus = (order.status || "").trim();

  // منطق الشحن له أولوية في الحالات النهائية
  if (shippingStatus === "delivered") {
    return ORDER_STATUS_CODES.DELIVERED;
  }
  if (
    shippingStatus === "cancelled_shipping" ||
    shippingStatus === "cancelled_ship"
  ) {
    return ORDER_STATUS_CODES.CANCELLED_BY_SHIPPING;
  }
  if (shippingStatus === "on_the_way") {
    return ORDER_STATUS_CODES.IN_SHIPPING;
  }

  // بعد ذلك منطق البائع
  if (sellerStatus === "ready_for_shipping") {
    return ORDER_STATUS_CODES.AT_SELLER_READY_TO_SHIP;
  }
  if (sellerStatus === "processing") {
    return ORDER_STATUS_CODES.AT_SELLER_PROCESSING;
  }
  if (sellerStatus === "new") {
    return ORDER_STATUS_CODES.AT_SELLER_NEW;
  }
  if (sellerStatus === "cancelled") {
    return ORDER_STATUS_CODES.CANCELLED_BY_SELLER;
  }

  // أخيرًا نحاول من النص العربي العام (للبيانات القديمة جدًا)
  switch (legacyStatus) {
    case "جديد":
      return ORDER_STATUS_CODES.AT_SELLER_NEW;
    case "قيد المعالجة":
      return ORDER_STATUS_CODES.AT_SELLER_PROCESSING;
    case "قيد الشحن":
      // نعتبرها أقرب إلى IN_SHIPPING
      return ORDER_STATUS_CODES.IN_SHIPPING;
    case "مكتمل":
      return ORDER_STATUS_CODES.DELIVERED;
    case "ملغى":
    case "ملغي":
      // لا نعرف مصدر الإلغاء (بائع/شحن/إدارة)
      return null;
    default:
      return null;
  }
}

// 🧩 دالة جاهزة للاستخدام في الواجهات:
// تعيد { code, label } جاهزَين للعرض
export function resolveOrderStatus(order /*, options = {} */) {
  const code = normalizeOrderStatusCode(order);

  // ✅ تحسين مهم: للبيانات القديمة جدًا التي تحتوي status="ملغى" فقط
  // بدل إظهار "غير معروف" نُظهر "ملغى" كعرض تاريخي (بدون تحديد الجهة)
  const legacyStatus = (order?.status || "").trim();
  if (!code && (legacyStatus === "ملغى" || legacyStatus === "ملغي")) {
    return { code: null, label: "ملغى" };
  }

  const label = getOrderStatusLabel(code);
  return { code, label };
}
