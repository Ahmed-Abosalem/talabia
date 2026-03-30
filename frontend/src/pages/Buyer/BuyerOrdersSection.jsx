// frontend/src/pages/Buyer/BuyerOrdersSection.jsx
// تبويب "طلباتي" في صفحة المشتري - عرض كل منتج داخل الطلب على حدة

import "./BuyerOrdersSection.css";

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Trash2,
  Star,
  Package,
  ArrowRight,
  RefreshCw,
  Search,
  Filter,
  Fingerprint,
} from "lucide-react";

import { useApp } from "@/context/AppContext";
import {
  listBuyerOrders,
  hideOrderItemForBuyer,
} from "@/services/orderService";
import { formatCurrency, formatDate, resolveAssetUrl } from "@/utils/formatters";
import { createProductReview, updateProductReview } from "@/services/reviewService"; // ✅ New Service
import ReviewModal from "@/components/ReviewModal"; // ✅ New Component

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

function getStatusLabelByKey(key) {
  return STATUS_FILTERS.find((f) => f.key === key)?.label || "الكل";
}

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
      return ORDER_STATUS_CODES.CANCELLED_BY_SELLER;
    default:
      return null;
  }
}

// ✅ اشتقاق الكود الموحّد لحالة المنتج داخل الطلب من order + item
function deriveBuyerItemUnifiedStatus(order, item) {
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
  let unifiedStatusCode = mapStatusKeyToCode(key);

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


function formatPaymentMethodUI(method, subMethod) {
  if (!method) return "—";
  const code = String(method).toUpperCase();
  const subCode = subMethod ? String(subMethod).toUpperCase() : "";

  if (subCode === "BANK_TRANSFER") return "الحوالة البنكية";
  if (subCode === "CARD") return "الدفع بالبطاقة";

  switch (code) {
    case "COD":
    case "CASH_ON_DELIVERY":
      return "الدفع عند الاستلام";
    case "WALLET":
      return "الدفع بالمحفظة";
    case "ONLINE":
      return "الدفع الإلكتروني";
    default:
      return method;
  }
}

function resolvePaymentStatusUI(order) {
  const method = order.paymentMethod || "";
  const subMethod = order.paymentSubMethod || "";
  const bankStatus = order.bankTransferStatus || "";
  const isPaid = order.isPaid || false;

  if (method === "COD" || method === "CASH_ON_DELIVERY") {
    return { label: "عند الاستلام", key: "cod" };
  }
  if (method === "Wallet") {
    return { label: "مدفوع", key: "paid" };
  }
  if (subMethod === "CARD") {
    return isPaid ? { label: "مدفوع", key: "paid" } : { label: "بانتظار الدفع", key: "pending" };
  }
  if (subMethod === "BANK_TRANSFER" || method === "Online") {
    if (bankStatus === "confirmed") return { label: "مدفوع", key: "paid" };
    if (bankStatus === "rejected") return { label: "مرفوض", key: "rejected" };
    return { label: "بانتظار المراجعة", key: "pending" };
  }
  return { label: "بانتظار", key: "pending" };
}

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
      if (item.hiddenForBuyer || item.isHiddenForBuyer) return;

      const product =
        item.product ||
        item.productId ||
        item.productInfo ||
        item.productData ||
        {};

      const itemId = item.id || item._id || item.itemId || item.orderItemId;
      const statusRaw =
        item.status ||
        item.itemStatus ||
        item.orderItemStatus ||
        orderStatusRaw;

      const unifiedStatusCode = deriveBuyerItemUnifiedStatus(order, item);
      const orderStatusKey = mapStatusCodeToBuyerKey(unifiedStatusCode, statusRaw);

      const quantity = item.quantity || item.qty || item.count || item.amount || 1;
      const unitPrice = item.unitPrice || item.price || item.unit_price || item.salePrice;
      const totalForItem =
        item.totalForItem ||
        item.lineTotal ||
        item.totalPrice ||
        (typeof unitPrice === "number" ? unitPrice * quantity : undefined);

      const deliveryCode = item.deliveryCode || item.delivery_code || null;
      const storeName = product.store?.name || product.storeName || fallbackStoreName || item.storeName;

      const rawImage =
        item.image ||
        item.imageUrl ||
        product.mainImageUrl ||
        product.imageUrl ||
        product.image ||
        (Array.isArray(product.images) && product.images.length ? product.images[0] : null);

      const imageUrl = resolveImageUrl(rawImage);

      const paymentMethodUI = formatPaymentMethodUI(order.paymentMethod, order.paymentSubMethod);
      const paymentStatusData = resolvePaymentStatusUI(order);

      items.push({
        key: `${orderId || "order"}-${index}`,
        orderId,
        orderNumber,
        statusCode: unifiedStatusCode || null,
        orderStatusKey,
        orderStatusLabel: getOrderStatusLabel(unifiedStatusCode),
        paymentMethodUI,
        paymentStatusLabel: paymentStatusData.label,
        paymentStatusKey: paymentStatusData.key,
        createdAt,
        deliveryCode,
        productName: product.name || product.title || item.productName || "منتج بدون اسم",
        productId: product._id || product.id || (typeof item.product === "string" ? item.product : null),
        isProductActive: typeof product.isActive === "boolean"
          ? product.isActive
          : typeof product.status === "string"
            ? product.status !== "inactive"
            : true,
        storeName,
        imageUrl,
        quantity,
        unitPrice,
        totalForItem,
        orderItemIndex: (index || 0) + 1,
        itemId,
        rating: item.rating?.value || 0,
        reviewComment: item.rating?.comment || "",
        isRated: item.isRated || !!item.review,
        reviewId: item.review || null,
        raw: { order, item, statusCode: unifiedStatusCode },
      });
    });
  }
  return items;
}

export default function BuyerOrdersSection() {
  const navigate = useNavigate();
  const { showToast } = useApp() || {};

  const [items, setItems] = useState([]);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isBulkHiding, setIsBulkHiding] = useState(false);

  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedReviewItem, setSelectedReviewItem] = useState(null);
  const [isReviewSubmitting, setIsReviewSubmitting] = useState(false);

  async function loadOrders(options = { silent: false }) {
    const { silent } = options;
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const response = await listBuyerOrders();
      const normalized = normalizeOrdersResponse(response);
      setItems(normalized);
    } catch (error) {
      console.error("❌ تعذّر تحميل طلبات المشتري:", error);
      if (showToast) showToast("تعذّر تحميل طلباتك. حاول مرة أخرى.", "error");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    loadOrders({ silent: false });
  }, []);

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
      if (showToast) showToast("تم إخفاء الطلبات المعروضة من تبويب طلباتي.", "success");
      await loadOrders({ silent: true });
    } catch (error) {
      console.error("❌ تعذّر إخفاء العناصر للمشتري:", error);
      if (showToast) showToast("تعذّر إخفاء هذه الطلبات. حاول مرة أخرى.", "error");
    } finally {
      setIsBulkHiding(false);
    }
  }

  function handleOpenReviewModal(item) {
    // ✅ القيد الجديد: لا يمكن التقييم إلا بعد الاستلام
    if (item.statusCode !== ORDER_STATUS_CODES.DELIVERED) {
      if (showToast) {
        showToast("يمكنك تقييم المنتج فقط بعد استلام الطلب وتغيير حالته إلى 'تم التسليم'.", "info");
      }
      return;
    }

    setSelectedReviewItem(item);
    setIsReviewModalOpen(true);
  }

  function handleProductClick(item) {
    if (!item.productId) {
      if (showToast) showToast("عذراً، تفاصيل هذا المنتج غير متوفرة حالياً.", "error");
      return;
    }

    if (!item.isProductActive) {
      if (showToast) showToast("عذراً، هذا المنتج تم إيقافه مؤقتاً أو لم يعد متوفراً.", "info");
      return;
    }

    navigate(`/products/${item.productId}`);
  }

  async function handleSubmitReview({ rating, comment }) {
    if (!selectedReviewItem) return;
    setIsReviewSubmitting(true);
    try {
      const { itemId, orderId, product } = selectedReviewItem.raw?.item || {};
      const productId = product?._id || product;

      if (selectedReviewItem.isRated && selectedReviewItem.reviewId) {
        await updateProductReview(selectedReviewItem.reviewId, { rating, comment });
        showToast && showToast("تم تحديث تقييمك بنجاح.", "success");
      } else {
        await createProductReview({
          productId,
          rating,
          comment,
          orderId: selectedReviewItem.orderId,
          orderItemId: selectedReviewItem.itemId,
        });
        showToast && showToast("تم إضافة تقييمك بنجاح.", "success");
      }
      setIsReviewModalOpen(false);
      await loadOrders({ silent: true });
    } catch (error) {
      console.error("Review Submit Error:", error);
      const msg = error?.response?.data?.message || "تعذّر حفظ التقييم.";
      showToast && showToast(msg, "error");
    } finally {
      setIsReviewSubmitting(false);
    }
  }


  return (
    <div className="adm-page-root buyer-orders-section">
      <header className="adm-header">
        <div className="adm-header-inner">
          <div className="adm-header-right">
            <button onClick={() => navigate("/")} className="adm-btn-back" title="العودة للتسوق">
              <ArrowRight size={20} />
            </button>
            <h1 className="adm-page-title buyer-page-title">
              <Package size={24} />
              طلباتي
              <span className="adm-header-count">
                عدد الطلبات: <span className="count-num">{filteredItems.length}</span>
              </span>
            </h1>
          </div>
        </div>
      </header>

      <div className="adm-main-container">
        <main className="adm-details-grid">
          {/* Filters card */}
          <section className="adm-card span-12">
            <div className="adm-card-header">
              <Filter size={20} />
              <h2>خيارات العرض والفلترة</h2>
            </div>
            <div className="adm-card-body">
              {/* Row 1: Filter */}
              <div className="buyer-filter-row">
                <span className="filter-label">فلتر الحالة:</span>
                <select
                  className="adm-form-select"
                  value={filterStatus}
                  onChange={(e) => handleFilterChange(e.target.value)}
                >
                  {STATUS_FILTERS.map((f) => (
                    <option key={f.key} value={f.key}>{f.label}</option>
                  ))}
                </select>
              </div>

              {/* Row 2: Actions */}
              <div className="buyer-actions-row">
                <div className="adm-actions-group no-border">
                  <button type="button" className="adm-btn primary" onClick={handleRefresh} disabled={isLoading || isRefreshing} title="تحديث">
                    <RefreshCw size={16} className={isRefreshing ? "spin" : ""} />
                    تحديث
                  </button>
                  <button type="button" className="adm-btn danger" onClick={handleBulkHide} disabled={isLoading || isBulkHiding || !hasItems} title="تفريغ">
                    <Trash2 size={16} />
                    تفريغ
                  </button>
                </div>
              </div>
            </div>
          </section>

          <div className="span-12">

            {!items.length ? (
              <div className="adm-empty-center buyer-empty-state">
                <div className="empty-icon-wrap">
                  <Package size={48} />
                </div>
                <h3>لا توجد طلبات بعد</h3>
                <p>ابدأ التسوق الآن واكتشف منتجاتنا الرائعة!</p>
              </div>
            ) : !hasItems ? (
              <div className="adm-empty-center buyer-empty-state">
                <div className="empty-icon-wrap">
                  <Search size={48} />
                </div>
                <h3>لا توجد نتائج</h3>
                <p>لا توجد طلبات مطابقة لفلتر: <strong>{getStatusLabelByKey(filterStatus)}</strong></p>
              </div>
            ) : (
              <div className="buyer-orders-grid-flow">
                {filteredItems.map((item) => {
                  const statusKey = item.orderStatusKey;
                  return (
                    <article key={item.key} className="adm-card buyer-item-card">
                      {/* Column 1: Image + Badges */}
                      <div className="order-col-image">
                        <div className="order-image-aspect-wrapper" onClick={() => handleProductClick(item)}>
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.productName} className="order-card-img" />
                          ) : (
                            <div className="order-card-img-placeholder"><Package size={24} /></div>
                          )}
                          <div className="order-status-badge">{item.orderStatusLabel}</div>
                          <div className={`order-payment-badge payment-${item.paymentStatusKey}`}>
                            {item.paymentStatusLabel}
                          </div>
                        </div>
                      </div>

                      {/* Column 2: Product Info */}
                      <div className="order-col-product">
                        <h3 className="order-product-name" onClick={() => handleProductClick(item)}>{item.productName}</h3>
                        <div className="order-product-meta">
                          <p className="order-product-detail">
                            <span className="label">الكمية:</span> <span className="num-accent">{item.quantity}</span>
                          </p>
                          <p className="order-product-detail price-highlight">
                            <span className="label">السعر:</span> <span className="num-accent">{formatCurrency(item.totalForItem)}</span>
                          </p>
                          <p className="order-product-detail order-seller-name">
                            <span className="label">البائع:</span> {item.storeName}
                          </p>
                        </div>
                      </div>

                      {/* Column 3: Order Metadata */}
                      <div className="order-col-order">
                        <div className="order-id-display">
                          <span className="order-hash">#</span>
                          <span className="order-num num-accent">{item.orderNumber}</span>
                          <span className="order-divider">|</span>
                          <span className="order-index num-accent">{String(item.orderItemIndex).padStart(2, '0')}</span>
                        </div>
                        <div className="order-date-display">{formatDate(item.createdAt)}</div>
                        <div className="order-payment-display num-accent">
                          {item.paymentMethodUI}
                        </div>
                      </div>

                      {/* Column 4: Actions & Code */}
                      <div className="order-col-actions">
                        <div className="order-action-row">
                          <button className={`adm-btn buyer-btn-rating ${item.isRated ? 'is-rated' : ''}`} onClick={() => handleOpenReviewModal(item)}>
                            <Star size={16} fill={item.isRated ? "#ff7f00" : "none"} stroke={item.isRated ? "#ff7f00" : "currentColor"} />
                            {item.isRated ? "تعديل التقييم" : "تقييم المنتج"}
                          </button>

                          {item.deliveryCode && (
                            <div className="delivery-code-box">
                              <Fingerprint size={14} />
                              <span className="label">كود الاستلام:</span>
                              <span className="value monospace">{item.deliveryCode}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>

      <ReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        onSubmit={handleSubmitReview}
        isSubmitting={isReviewSubmitting}
        initialRating={selectedReviewItem?.rating || 0}
        initialComment={selectedReviewItem?.reviewComment || ""}
        productName={selectedReviewItem?.productName}
        mode={selectedReviewItem?.isRated ? "edit" : "create"}
      />
    </div>
  );
}
