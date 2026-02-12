// frontend/src/pages/Buyer/BuyerOrdersSection.jsx
// تبويب "طلباتي" في صفحة المشتري - عرض كل منتج داخل الطلب على حدة

import "./BuyerOrdersSection.css";

import { useEffect, useMemo, useState } from "react";
import { RefreshCcw, Trash2, Star, Store } from "lucide-react";

import { useApp } from "@/context/AppContext";
import {
  listBuyerOrders,
  hideOrderItemForBuyer,
  rateOrderItem,
} from "@/services/orderService";
import {
  ORDER_STATUS_CODES,
  normalizeOrderStatusCode,
  getOrderStatusLabel,
} from "@/config/orderStatus";

// ✅ مفاتيح منطقية داخلية للحالة (نفس فلسفة صفحة البائع)
const STATUS_KEYS = {
  NEW: "new",
  PROCESSING: "processing",
  READY_FOR_SHIPPING: "ready_for_shipping",
  IN_SHIPPING: "in_shipping",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
};

// ✅ قائمة الفلترة الآن متطابقة مع منطق الحالة الموحد (statusCode)
const STATUS_FILTERS = [
  { key: "ALL", label: "الكل" },
  {
    key: ORDER_STATUS_CODES.AT_SELLER_NEW,
    label: getOrderStatusLabel(ORDER_STATUS_CODES.AT_SELLER_NEW),
  },
  {
    key: ORDER_STATUS_CODES.AT_SELLER_PROCESSING,
    label: getOrderStatusLabel(ORDER_STATUS_CODES.AT_SELLER_PROCESSING),
  },
  {
    key: ORDER_STATUS_CODES.AT_SELLER_READY_TO_SHIP,
    label: getOrderStatusLabel(ORDER_STATUS_CODES.AT_SELLER_READY_TO_SHIP),
  },
  {
    key: ORDER_STATUS_CODES.IN_SHIPPING,
    label: getOrderStatusLabel(ORDER_STATUS_CODES.IN_SHIPPING),
  },
  {
    key: ORDER_STATUS_CODES.DELIVERED,
    label: getOrderStatusLabel(ORDER_STATUS_CODES.DELIVERED),
  },
  {
    key: ORDER_STATUS_CODES.CANCELLED_BY_SELLER,
    label: getOrderStatusLabel(ORDER_STATUS_CODES.CANCELLED_BY_SELLER),
  },
  {
    key: ORDER_STATUS_CODES.CANCELLED_BY_SHIPPING,
    label: getOrderStatusLabel(ORDER_STATUS_CODES.CANCELLED_BY_SHIPPING),
  },
  {
    key: ORDER_STATUS_CODES.CANCELLED_BY_ADMIN,
    label: getOrderStatusLabel(ORDER_STATUS_CODES.CANCELLED_BY_ADMIN),
  },
];

// تسميات لحالة الشحن (shippingStatus)
const SHIPPING_STATUS_LABELS = {
  pending_pickup: "قيد الاستلام من البائع",
  processing: "قيد التجهيز",
  on_the_way: "في الطريق",
  delivered: "تم التسليم",
  cancelled: "ملغاة",
};

// 🔗 دالة مساعدة لتكوين رابط الصورة بشكل صحيح
function resolveImageUrl(raw) {
  if (!raw) return null;

  // لو جاءتنا كائن صورة من نوع { url: "..." } نحاول استخراج url
  if (typeof raw === "object" && raw !== null) {
    if (typeof raw.url === "string") {
      return resolveImageUrl(raw.url);
    }
    return null;
  }

  if (typeof raw !== "string") return null;

  const trimmed = raw.trim();
  if (!trimmed) return null;

  // لو هو رابط كامل http أو https نستخدمه كما هو
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  // قاعدة الـ API من الإعدادات (كما في api.js)
  const baseUrl = import.meta.env.VITE_API_URL || "";

  // لو يبدأ بـ /uploads نلصقه مباشرة بعد الـ baseUrl
  if (trimmed.startsWith("/")) {
    return `${baseUrl}${trimmed}`;
  }

  // لو يبدأ بـ uploads أو products نحاول نضيف سلاش في البداية
  if (
    trimmed.startsWith("uploads/") ||
    trimmed.startsWith("products/") ||
    trimmed.startsWith("static/")
  ) {
    return `${baseUrl}/${trimmed}`;
  }

  // في الحالات الأخرى نرجعه كما هو (احتياط)
  return trimmed;
}

// تحويل حالة الشحن الخام من الباك إند إلى مفتاح + تسمية
function mapShippingStatus(rawStatus) {
  const v = (rawStatus || "").toString().toLowerCase().trim();
  if (!v) {
    return {
      key: null,
      label: "لم تبدأ بعد",
    };
  }

  let key;

  if (
    v === "pending_pickup" ||
    v.includes("pending_pickup") ||
    v.includes("انتظار") ||
    v.includes("استلام")
  ) {
    key = "pending_pickup";
  } else if (
    v === "on_the_way" ||
    v === "on the way" ||
    v.includes("طريق") ||
    v.includes("شحن")
  ) {
    key = "on_the_way";
  } else if (
    v === "delivered" ||
    v === "completed" ||
    v.includes("تسليم") ||
    v.includes("مكتمل")
  ) {
    key = "delivered";
  } else if (v === "cancelled" || v === "canceled" || v.includes("ملغ")) {
    key = "cancelled";
  } else {
    key = "processing";
  }

  return {
    key,
    label: SHIPPING_STATUS_LABELS[key] || "قيد التجهيز",
  };
}

// 🧠 تحويل النص الخام للحالة إلى مفتاح داخلي (نفس منطق البائع)
function mapRawStatusToKey(rawStatus) {
  if (!rawStatus) return STATUS_KEYS.NEW;

  const value = String(rawStatus).trim().toLowerCase();

  switch (value) {
    case "جديد":
    case "new":
      return STATUS_KEYS.NEW;

    case "قيد المعالجة":
    case "processing":
      return STATUS_KEYS.PROCESSING;

    case "قيد الشحن":
    case "in_shipping":
    case "ready_for_shipping":
      return STATUS_KEYS.READY_FOR_SHIPPING;

    case "مكتمل":
    case "completed":
    case "delivered":
      return STATUS_KEYS.DELIVERED;

    case "ملغى":
    case "ملغي":
    case "cancelled":
    case "canceled":
      return STATUS_KEYS.CANCELLED;

    default:
      return STATUS_KEYS.NEW;
  }
}

// ربط المفتاح الداخلي بالكود الموحد
function mapStatusKeyToCode(key) {
  switch (key) {
    case STATUS_KEYS.NEW:
      return ORDER_STATUS_CODES.AT_SELLER_NEW;
    case STATUS_KEYS.PROCESSING:
      return ORDER_STATUS_CODES.AT_SELLER_PROCESSING;
    case STATUS_KEYS.READY_FOR_SHIPPING:
      return ORDER_STATUS_CODES.AT_SELLER_READY_TO_SHIP;
    case STATUS_KEYS.IN_SHIPPING:
      return ORDER_STATUS_CODES.IN_SHIPPING;
    case STATUS_KEYS.DELIVERED:
      return ORDER_STATUS_CODES.DELIVERED;
    case STATUS_KEYS.CANCELLED:
      // من ناحية المشتري لا نعرف من ألغى إلا إذا استنتجناه من الطلب
      return ORDER_STATUS_CODES.CANCELLED_BY_SELLER;
    default:
      return null;
  }
}

// ✅ اشتقاق الكود الموحّد لحالة المنتج داخل الطلب من order + item
function deriveBuyerItemUnifiedStatus(order, item) {
  // 1) لو المنتج يحمل statusCode صريحًا
  const explicitCodeCandidate =
    item.statusCode ||
    item.itemStatusCode ||
    item.unifiedStatusCode ||
    item.status_code;

  if (
    explicitCodeCandidate &&
    Object.values(ORDER_STATUS_CODES).includes(explicitCodeCandidate)
  ) {
    return explicitCodeCandidate;
  }

  // 2) من الحالة النصية على مستوى المنتج/الطلب
  const rawStatus =
    item.itemStatus ||
    item.status ||
    item.sellerStatus ||
    item.shippingStatus ||
    order.sellerStatus ||
    order.shippingStatus ||
    order.status ||
    order.rawStatus ||
    "";

  const key = mapRawStatusToKey(rawStatus);

  // 3) اشتقاق الكود الموحد من المفتاح النصي
  let unifiedStatusCode = mapStatusKeyToCode(key);

  // 4) حالات الإلغاء: نحاول الاستفادة من statusCode على مستوى الطلب عند الحاجة
  if (key === STATUS_KEYS.CANCELLED) {
    const orderCode = normalizeOrderStatusCode(order);

    if (orderCode === ORDER_STATUS_CODES.CANCELLED_BY_SHIPPING) {
      unifiedStatusCode = ORDER_STATUS_CODES.CANCELLED_BY_SHIPPING;
    } else if (orderCode === ORDER_STATUS_CODES.CANCELLED_BY_ADMIN) {
      unifiedStatusCode = ORDER_STATUS_CODES.CANCELLED_BY_ADMIN;
    } else if (orderCode === ORDER_STATUS_CODES.CANCELLED_BY_SELLER) {
      unifiedStatusCode = ORDER_STATUS_CODES.CANCELLED_BY_SELLER;
    }
  }

  return unifiedStatusCode;
}

// تحويل الكود الموحّد + الحالة الخام إلى مفتاح داخلي من منظور المشتري
// (processing / shipping / completed / cancelled) لأغراض CSS والتقييم فقط
function mapStatusCodeToBuyerKey(statusCode, rawStatus) {
  if (statusCode) {
    switch (statusCode) {
      case ORDER_STATUS_CODES.DELIVERED:
        return "completed";
      case ORDER_STATUS_CODES.AT_SELLER_NEW:
      case ORDER_STATUS_CODES.AT_SELLER_PROCESSING:
        return "processing";
      case ORDER_STATUS_CODES.AT_SELLER_READY_TO_SHIP:
      case ORDER_STATUS_CODES.IN_SHIPPING:
        return "shipping";
      case ORDER_STATUS_CODES.CANCELLED_BY_SELLER:
      case ORDER_STATUS_CODES.CANCELLED_BY_SHIPPING:
      case ORDER_STATUS_CODES.CANCELLED_BY_ADMIN:
        return "cancelled";
      default:
        break;
    }
  }

  // في حال الطلب قديم ولا يحتوي statusCode، نستخدم المنطق السابق كاحتياط
  const v = (rawStatus || "").toString().toLowerCase().trim();

  if (!v) return "processing";

  if (
    v === "new" ||
    v === "pending" ||
    v === "processing" ||
    v.includes("تجهيز")
  ) {
    return "processing";
  }

  if (
    v === "ready_for_shipping" ||
    v === "in_shipping" ||
    v === "shipping" ||
    v.includes("شحن")
  ) {
    return "shipping";
  }

  if (v === "delivered" || v === "completed" || v.includes("مكتمل")) {
    return "completed";
  }

  if (v === "cancelled" || v === "canceled" || v.includes("ملغ")) {
    return "cancelled";
  }

  return "processing";
}

function getStatusLabelByKey(key) {
  if (key === "ALL") return "كل الحالات";
  // باقي القيم هي statusCode موحد ⇒ نرجع النص من الملف الموحّد
  return getOrderStatusLabel(key);
}

function safeFormatDate(value) {
  if (!value) return "";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString("ar-SA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "";
  }
}

// ✅ تحويل استجابة الـ API إلى مصفوفة عناصر مسطّحة (كل منتج داخل الطلب كعنصر مستقل)
// ✅ الحالة الآن تُحسب على مستوى المنتج (item) بنفس منطق صفحة البائع
function normalizeOrdersResponse(rawResponse) {
  const possible =
    Array.isArray(rawResponse) && rawResponse.length
      ? rawResponse
      : Array.isArray(rawResponse?.orders)
      ? rawResponse.orders
      : Array.isArray(rawResponse?.data?.orders)
      ? rawResponse.data.orders
      : Array.isArray(rawResponse?.data)
      ? rawResponse.data
      : [];

  const items = [];

  for (const order of possible) {
    if (!order) continue;

    const orderId = order.id || order._id || order.orderId;
    const orderNumber =
      order.orderNumber ||
      order.code ||
      order.orderCode ||
      (orderId ? String(orderId).slice(-6) : "—");

    const orderStatusRaw = order.status || order.orderStatus || order.state;
    const paymentStatus =
      order.paymentStatus ||
      order.payment_state ||
      order.payment_state_key ||
      order.paymentStatusKey;

    const createdAt = order.createdAt || order.created_at || order.date;

    const fallbackStoreName =
      order.store?.name ||
      order.storeName ||
      order.sellerStoreName ||
      order.seller?.storeName;

    const orderItems =
      order.items || order.orderItems || order.products || order.lines || [];

    orderItems.forEach((item, index) => {
      if (!item) return;

      // إخفاء المنتج للمشتري
      if (item.hiddenForBuyer || item.isHiddenForBuyer) return;

      const product =
        item.product ||
        item.productId ||
        item.productInfo ||
        item.productData ||
        {};

      // رقم تعريف العنصر (itemId) لاستخدامه مع API
      const itemId = item.id || item._id || item.itemId || item.orderItemId;

      const statusRaw =
        item.status ||
        item.itemStatus ||
        item.orderItemStatus ||
        orderStatusRaw;

      // ✅ اشتقاق الحالة الموحدة على مستوى الـ item بنفس منطق البائع
      const unifiedStatusCode = deriveBuyerItemUnifiedStatus(order, item);

      // مفتاح داخلي فقط لأغراض التصميم (لا يظهر كنص في الواجهة)
      const orderStatusKey = mapStatusCodeToBuyerKey(
        unifiedStatusCode,
        statusRaw
      );

      const quantity =
        item.quantity || item.qty || item.count || item.amount || 1;

      const unitPrice =
        item.unitPrice || item.price || item.unit_price || item.salePrice;

      const totalForItem =
        item.totalForItem ||
        item.lineTotal ||
        item.totalPrice ||
        (typeof unitPrice === "number" ? unitPrice * quantity : undefined);

      // كود التسليم الخاص بهذا المنتج
      const deliveryCode = item.deliveryCode || item.delivery_code || null;

      const storeName =
        product.store?.name ||
        product.storeName ||
        fallbackStoreName ||
        item.storeName;

      // نحاول جميع الاحتمالات الممكنة للصورة
      const rawImage =
        item.image || // ما خزّناه من الباك إند في orderItems.image
        item.imageUrl ||
        product.mainImageUrl ||
        product.imageUrl ||
        product.image ||
        (Array.isArray(product.images) && product.images.length
          ? product.images[0]
          : null) ||
        product.thumbnail;

      const imageUrl = resolveImageUrl(rawImage);

      // قراءة حالة الشحن (من العنصر أو الطلب) وتطبيعها
      const shippingStatusRaw =
        item.shippingStatus ||
        item.shipping_status ||
        order.shippingStatus ||
        order.shipping_status ||
        null;

      const { key: shippingStatusKey, label: shippingStatusLabel } =
        mapShippingStatus(shippingStatusRaw);

      items.push({
        key: `${orderId || "order"}-${index}`,
        orderId,
        orderNumber,
        // ✅ نخزن statusCode الموحّد لكل منتج داخل الطلب
        statusCode: unifiedStatusCode || null,
        orderStatusKey, // فقط للـ CSS والـ Rating
        // 👇 النص المعروض للحالة مأخوذ من الملف الموحّد (نفس النص لكل الأدوار)
        orderStatusLabel: getOrderStatusLabel(unifiedStatusCode),
        paymentStatus,
        paymentStatusLabel: paymentStatus,
        createdAt,
        deliveryCode,
        productName:
          product.name || product.title || item.productName || "منتج بدون اسم",
        storeName,
        imageUrl,
        quantity,
        unitPrice,
        totalForItem,
        orderItemIndex: (index || 0) + 1,
        itemId,
        shippingStatusKey,
        shippingStatusLabel,
        rating: item.rating || item.reviewRating,
        raw: {
          order,
          item,
          statusCode: unifiedStatusCode,
        },
      });
    });
  }

  return items;
}

function RatingStars({ value = 0, onChange, disabled }) {
  const stars = [1, 2, 3, 4, 5];

  return (
    <div className="buyer-rating-stars" aria-label="تقييم المنتج">
      {stars.map((star) => {
        const filled = star <= value;
        return (
          <button
            key={star}
            type="button"
            className={`buyer-rating-star-btn${
              filled ? " buyer-rating-star-btn--filled" : ""
            }`}
            onClick={() => !disabled && onChange && onChange(star)}
            disabled={disabled}
          >
            <Star
              size={16}
              className={`buyer-rating-star${
                filled ? " buyer-rating-star--filled" : ""
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}

export default function BuyerOrdersSection() {
  const { showToast } = useApp() || {};

  const [items, setItems] = useState([]);
  // ✅ الفلتر الآن يبدأ بـ "ALL"
  const [filterStatus, setFilterStatus] = useState("ALL");

  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isBulkHiding, setIsBulkHiding] = useState(false);

  const [ratingDrafts, setRatingDrafts] = useState({});
  const [ratingSubmittingKey, setRatingSubmittingKey] = useState(null);

  async function loadOrders(options = { silent: false }) {
    const { silent } = options;

    if (!silent) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      const response = await listBuyerOrders();
      const normalized = normalizeOrdersResponse(response);
      setItems(normalized);
    } catch (error) {
      console.error("❌ تعذّر تحميل طلبات المشتري:", error);
      if (showToast) {
        showToast("تعذّر تحميل طلباتك. حاول مرة أخرى.", "error");
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    (async () => {
      await loadOrders({ silent: false });
    })();
  }, []);

  // ✅ الفلترة الآن تتم عبر statusCode الموحّد لكل منتج
  const filteredItems = useMemo(() => {
    if (filterStatus === "ALL") return items;
    return items.filter((item) => item.statusCode === filterStatus);
  }, [items, filterStatus]);

  const hasItems = filteredItems.length > 0;

  function handleFilterChange(key) {
    setFilterStatus(key);
  }

  async function handleRefresh() {
    await loadOrders({ silent: true });
  }

  async function handleBulkHide() {
    if (!hasItems) return;

    setIsBulkHiding(true);

    try {
      await Promise.all(
        filteredItems
          .filter((item) => item.itemId)
          .map((item) => hideOrderItemForBuyer(item.orderId, item.itemId))
      );

      if (showToast) {
        showToast("تم إخفاء الطلبات المعروضة من تبويب طلباتي.", "success");
      }

      await loadOrders({ silent: true });
    } catch (error) {
      console.error("❌ تعذّر إخفاء العناصر للمشتري:", error);
      if (showToast) {
        showToast("تعذّر إخفاء هذه الطلبات. حاول مرة أخرى.", "error");
      }
    } finally {
      setIsBulkHiding(false);
    }
  }

  function handleRatingChange(item, value) {
    if (!item) return;
    setRatingDrafts((prev) => ({
      ...prev,
      [item.key]: value,
    }));
  }

  async function handleSubmitRating(item) {
    if (!item) return;

    const ratingValue =
      ratingDrafts[item.key] != null ? ratingDrafts[item.key] : item.rating;

    if (!ratingValue || ratingValue < 1 || ratingValue > 5) {
      if (showToast) {
        showToast("الرجاء اختيار تقييم من 1 إلى 5 نجوم.", "warning");
      }
      return;
    }

    if (!item.itemId) {
      if (showToast) {
        showToast(
          "لا يمكن إرسال التقييم لهذا المنتج لعدم توفر رقم التعريف الداخلي له.",
          "error"
        );
      }
      return;
    }

    setRatingSubmittingKey(item.key);

    try {
      await rateOrderItem(item.orderId, item.itemId, ratingValue);

      if (showToast) {
        showToast("تم إرسال تقييمك بنجاح.", "success");
      }

      await loadOrders({ silent: true });
    } catch (error) {
      console.error("❌ تعذّر إرسال التقييم:", error);
      if (showToast) {
        showToast("تعذّر إرسال التقييم. حاول مرة أخرى.", "error");
      }
    } finally {
      setRatingSubmittingKey(null);
    }
  }

  return (
    <section className="buyer-orders-section">
      <header className="buyer-orders-header">
        <div className="buyer-orders-header-right">
          {/* فلتر الحالة: قائمة منسدلة متطابقة مع نصوص الحالة الموحدة */}
          <div className="buyer-orders-filters">
            <select
              className="buyer-orders-filter-select"
              value={filterStatus}
              onChange={(e) => handleFilterChange(e.target.value)}
            >
              {STATUS_FILTERS.map((filter) => (
                <option key={filter.key} value={filter.key}>
                  {filter.label}
                </option>
              ))}
            </select>
          </div>

          {/* أزرار الآكشن: تحديث + مسح (أيقونات فقط) */}
          <div className="buyer-orders-header-actions">
            <button
              type="button"
              className="buyer-orders-header-btn buyer-orders-header-btn--icon"
              onClick={handleRefresh}
              disabled={isLoading || isRefreshing}
              title="تحديث الطلبات"
            >
              <RefreshCcw size={16} />
            </button>

            <button
              type="button"
              className="buyer-orders-header-btn buyer-orders-header-btn--icon buyer-orders-header-btn--danger"
              onClick={handleBulkHide}
              disabled={isLoading || isBulkHiding || !hasItems}
              title="مسح الطلبات المعروضة من واجهتي"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* محتوى الطلبات */}
      {isLoading && !items.length ? (
        <div className="buyer-orders-empty">جاري تحميل طلباتك...</div>
      ) : !items.length ? (
        <div className="buyer-orders-empty">لا توجد طلبات حتى الآن.</div>
      ) : !hasItems ? (
        <div className="buyer-orders-empty">
          لا توجد طلبات مطابقة للحالة الحالية (
          {getStatusLabelByKey(filterStatus)}).
        </div>
      ) : (
        <div className="buyer-orders-list">
          {filteredItems.map((item) => {
            const statusModifier =
              item.orderStatusKey === "shipping"
                ? "buyer-order-status-pill--shipping"
                : item.orderStatusKey === "completed"
                ? "buyer-order-status-pill--completed"
                : item.orderStatusKey === "cancelled"
                ? "buyer-order-status-pill--cancelled"
                : "buyer-order-status-pill--processing";

            return (
              <article key={item.key} className="buyer-order-card">
                {/* الهيدر داخل الكرت */}
                <header className="buyer-order-header">
                  <div className="buyer-order-header-main">
                    <span className="buyer-order-header-main-text">
                      طلب:{" "}
                      <span className="buyer-order-header-strong">
                        {item.orderNumber ?? "—"}
                      </span>
                    </span>

                    <span className="buyer-order-header-separator" />

                    <span className="buyer-order-header-main-text">
                      <span className="buyer-order-header-strong">
                        {item.orderItemIndex ?? 1}
                      </span>
                    </span>
                  </div>

                  <div className="buyer-order-header-meta">
                    {item.createdAt && (
                      <span className="buyer-order-date">
                        {safeFormatDate(item.createdAt)}
                      </span>
                    )}
                  </div>
                </header>

                {/* خط فاصل بين الهيدر وبقية الكرت */}
                <div className="buyer-order-divider" />

                {/* القسم الأوسط: صورة + اسم المنتج + حالة المنتج + اسم المتجر + حالة الدفع */}
                <div className="buyer-order-main">
                  <div className="buyer-order-product-image">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.productName || "صورة المنتج"}
                      />
                    ) : (
                      <span className="buyer-order-product-placeholder">
                        بدون صورة
                      </span>
                    )}
                  </div>

                  <div className="buyer-order-product-info">
                    {/* اسم المنتج + حالة الطلب في سطر واحد */}
                    <div className="buyer-order-product-top">
                      <h3 className="buyer-order-product-name">
                        {item.productName || "منتج بدون اسم"}
                      </h3>

                      <span
                        className={`buyer-order-status-pill ${statusModifier}`}
                      >
                        <span className="buyer-order-status-text">
                          {item.orderStatusLabel}
                        </span>
                      </span>
                    </div>

                    {/* اسم المتجر */}
                    {item.storeName && (
                      <div className="buyer-order-store-row">
                        <Store size={14} className="buyer-order-store-icon" />
                        <span className="buyer-order-store-name">
                          {item.storeName}
                        </span>
                      </div>
                    )}

                    {/* حالة الدفع تحت اسم المتجر */}
                    <div className="buyer-order-payment-inline">
                      <span className="buyer-order-payment-label">
                        حالة الدفع:
                      </span>
                      <span className="buyer-order-payment-value">
                        {item.paymentStatusLabel || "غير مدفوع بعد"}
                      </span>
                    </div>

                    {/* حالة الشحن (مع إخفاء pending_pickup كما اتفقنا) */}
                    {item.shippingStatusLabel &&
                      item.shippingStatusKey &&
                      item.shippingStatusKey !== "pending_pickup" && (
                        <div className="buyer-order-shipping-inline">
                          <span className="buyer-order-shipping-label">
                            حالة الشحن:
                          </span>
                          <span className="buyer-order-shipping-value">
                            {item.shippingStatusLabel}
                          </span>
                        </div>
                      )}
                  </div>
                </div>

                {/* الفوتر: الكمية – سعر الواحدة – إجمالي المنتج – كود التسليم */}
                <footer className="buyer-order-footer">
                  <div className="buyer-order-meta-item">
                    <span className="buyer-meta-label">الكمية</span>
                    <span className="buyer-meta-value">
                      {item.quantity ?? "—"}
                    </span>
                  </div>

                  <div className="buyer-order-meta-item">
                    <span className="buyer-meta-label">سعر الواحدة</span>
                    <span className="buyer-meta-value">
                      {typeof item.unitPrice === "number"
                        ? `${item.unitPrice} ر.ي`
                        : "—"}
                    </span>
                  </div>

                  <div className="buyer-order-meta-item">
                    <span className="buyer-meta-label">إجمالي المنتج</span>
                    <span className="buyer-meta-value">
                      {typeof item.totalForItem === "number"
                        ? `${item.totalForItem} ر.ي`
                        : "—"}
                    </span>
                  </div>

                  <div className="buyer-order-meta-item buyer-order-meta-item--code">
                    <span className="buyer-meta-label">كود التسليم</span>
                    <span className="buyer-meta-value buyer-meta-value--code">
                      {item.deliveryCode ?? "—"}
                    </span>
                  </div>
                </footer>

                {/* التقييم (للطلبات المكتملة فقط) */}
                {item.orderStatusKey === "completed" && (
                  <div className="buyer-order-rating">
                    <span className="buyer-order-rating-label">
                      تقييم المنتج:
                    </span>

                    <RatingStars
                      value={
                        ratingDrafts[item.key] != null
                          ? ratingDrafts[item.key]
                          : item.rating || 0
                      }
                      onChange={(value) => handleRatingChange(item, value)}
                      disabled={ratingSubmittingKey === item.key}
                    />

                    <button
                      type="button"
                      className="buyer-order-rating-submit"
                      onClick={() => handleSubmitRating(item)}
                      disabled={ratingSubmittingKey === item.key}
                    >
                      {ratingSubmittingKey === item.key
                        ? "جاري الإرسال..."
                        : "إرسال التقييم"}
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
