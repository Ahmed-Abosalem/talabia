// frontend/src/pages/Seller/SellerOrdersSection.jsx
// تبويب "الطلبات" في لوحة البائع - عرض كل منتج داخل الطلب على حدة (حالة على مستوى المنتج)

import "./SellerOrdersSection.css";

import { useState, useEffect, useMemo } from "react";
import { ShoppingBag, Filter, Printer, CalendarDays } from "lucide-react";

import { useApp } from "@/context/AppContext";
import { listOrders } from "@/services/orderService";
import {
  updateSellerOrderStatus, // مسار قديم على مستوى الطلب - أبقيناه احتياطيًا
  updateSellerOrderItemStatus, // ✅ المسار الجديد على مستوى المنتج داخل الطلب
} from "@/services/sellerService";
import {
  ORDER_STATUS_CODES,
  normalizeOrderStatusCode,
  getOrderStatusLabel,
} from "@/config/orderStatus";

// مفاتيح منطقية داخلية للحالة على مستوى المنتج
const STATUS_KEYS = {
  NEW: "new",
  PROCESSING: "processing",
  READY_FOR_SHIPPING: "ready_for_shipping",
  IN_SHIPPING: "in_shipping",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
};

// تسميات احتياطية (في حال لم يوجد statusCode موحّد لأي سبب)
const STATUS_LABEL_FALLBACK = {
  [STATUS_KEYS.NEW]: "عند البائع طلب جديد",
  [STATUS_KEYS.PROCESSING]: "عند البائع قيد المعالجة",
  [STATUS_KEYS.READY_FOR_SHIPPING]: "عند البائع جاهز للشحن",
  [STATUS_KEYS.IN_SHIPPING]: "في الشحن",
  [STATUS_KEYS.DELIVERED]: "تم التسليم",
  [STATUS_KEYS.CANCELLED]: "ملغى",
};

// الحالات التي يمكن للبائع تغييرها (تظهر في القائمة المنسدلة لتحديث الحالة)
const SELLER_UPDATE_KEYS = [
  STATUS_KEYS.NEW,
  STATUS_KEYS.PROCESSING,
  STATUS_KEYS.READY_FOR_SHIPPING,
  STATUS_KEYS.CANCELLED,
];

// ثابت لحالة "كل الفلاتر"
const FILTER_ALL = "ALL";

// الحالات التي يمكن للبائع الانتقال إليها من كل حالة
function getAllowedNextStatusKeysForSeller(currentKey) {
  switch (currentKey) {
    case STATUS_KEYS.NEW:
      return [STATUS_KEYS.PROCESSING, STATUS_KEYS.CANCELLED];
    case STATUS_KEYS.PROCESSING:
      return [STATUS_KEYS.READY_FOR_SHIPPING, STATUS_KEYS.CANCELLED];
    case STATUS_KEYS.READY_FOR_SHIPPING:
      return [];
    default:
      return [];
  }
}

// ✅ تحويل الحالة النصية الخام إلى مفتاح داخلي (مُصحّح)
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

    // ✅ جاهز للشحن (عند البائع)
    case "ready_for_shipping":
    case "ready-for-shipping":
    case "جاهز للشحن":
      return STATUS_KEYS.READY_FOR_SHIPPING;

    // ⚠️ ملاحظة: "قيد الشحن" في البيانات القديمة قد تعني (جاهز للشحن) أو (في الشحن)
    // لكن إن وجد statusCode سيحسم الأمر.ينبقيها افتراضيًا جاهز للشحن كما كان عندك.
    case "قيد الشحن":
      return STATUS_KEYS.READY_FOR_SHIPPING;

    // ✅ في الشحن (عند شركة الشحن)
    case "في الشحن":
    case "in_shipping":
    case "on_the_way":
      return STATUS_KEYS.IN_SHIPPING;

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

// ربط مفاتيح الحالة بالكود الموحد
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

// ربط الكود الموحد بمفتاح الحالة
function mapStatusCodeToKey(code) {
  switch (code) {
    case ORDER_STATUS_CODES.AT_SELLER_NEW:
      return STATUS_KEYS.NEW;
    case ORDER_STATUS_CODES.AT_SELLER_PROCESSING:
      return STATUS_KEYS.PROCESSING;
    case ORDER_STATUS_CODES.AT_SELLER_READY_TO_SHIP:
      return STATUS_KEYS.READY_FOR_SHIPPING;
    case ORDER_STATUS_CODES.IN_SHIPPING:
      return STATUS_KEYS.IN_SHIPPING;
    case ORDER_STATUS_CODES.DELIVERED:
      return STATUS_KEYS.DELIVERED;
    case ORDER_STATUS_CODES.CANCELLED_BY_SELLER:
    case ORDER_STATUS_CODES.CANCELLED_BY_SHIPPING:
    case ORDER_STATUS_CODES.CANCELLED_BY_ADMIN:
      return STATUS_KEYS.CANCELLED;
    default:
      return STATUS_KEYS.NEW;
  }
}

// اشتقاق حالة المنتج داخل الطلب من بياناته هو + بيانات الطلب
function deriveSellerItemState(order, item) {
  const explicitCodeCandidate =
    item.statusCode ||
    item.itemStatusCode ||
    item.unifiedStatusCode ||
    item.status_code;

  if (
    explicitCodeCandidate &&
    Object.values(ORDER_STATUS_CODES).includes(explicitCodeCandidate)
  ) {
    return {
      unifiedStatusCode: explicitCodeCandidate,
      statusKey: mapStatusCodeToKey(explicitCodeCandidate),
    };
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
    const orderCode = normalizeOrderStatusCode(order.raw || order);

    if (orderCode === ORDER_STATUS_CODES.CANCELLED_BY_SHIPPING) {
      unifiedStatusCode = ORDER_STATUS_CODES.CANCELLED_BY_SHIPPING;
    } else if (orderCode === ORDER_STATUS_CODES.CANCELLED_BY_ADMIN) {
      unifiedStatusCode = ORDER_STATUS_CODES.CANCELLED_BY_ADMIN;
    } else if (orderCode === ORDER_STATUS_CODES.CANCELLED_BY_SELLER) {
      unifiedStatusCode = ORDER_STATUS_CODES.CANCELLED_BY_SELLER;
    }
  }

  return {
    unifiedStatusCode,
    statusKey: key,
  };
}

// ✅ استخراج اختيار اللون/الحجم من عنصر الطلب بأكثر من احتمال (حتى لا نكسر الإنتاج)
function pickLabel(value) {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  if (typeof value === "object") {
    return String(value.label || value.name || value.title || value.value || "")
      .trim();
  }
  return "";
}

function extractColorSizeFromOrderItem(item) {
  if (!item) return { color: "", size: "" };

  const colorCandidates = [
    item.selectedColorLabel,
    item.selectedColor,
    item.colorLabel,
    item.color,
    item.variantColor,
    item.chosenColor,
    item.optionColor,
    item.selectedColorKey,
    item.options?.color,
    item.options?.selectedColor,
    item.selectedOptions?.color,
    item.selectedOptions?.selectedColor,
    item.variantsSelected?.color,
    item.variant?.color,
    item.selection?.color,
    item.meta?.color,
  ];

  const sizeCandidates = [
    item.selectedSizeLabel,
    item.selectedSize,
    item.sizeLabel,
    item.size,
    item.variantSize,
    item.chosenSize,
    item.optionSize,
    item.selectedSizeKey,
    item.options?.size,
    item.options?.selectedSize,
    item.selectedOptions?.size,
    item.selectedOptions?.selectedSize,
    item.variantsSelected?.size,
    item.variant?.size,
    item.selection?.size,
    item.meta?.size,
  ];

  let parsed = null;
  const rawVariants = item.variants || item.variantOptions || item.selectedVariants;
  if (typeof rawVariants === "string") {
    const s = rawVariants.trim();
    if (
      (s.startsWith("{") && s.endsWith("}")) ||
      (s.startsWith("[") && s.endsWith("]"))
    ) {
      try {
        parsed = JSON.parse(s);
      } catch {
        parsed = null;
      }
    }
  } else if (rawVariants && typeof rawVariants === "object") {
    parsed = rawVariants;
  }

  if (parsed && typeof parsed === "object") {
    colorCandidates.push(
      parsed.color,
      parsed.selectedColor,
      parsed.options?.color,
      parsed.selection?.color,
      parsed.colorLabel,
      parsed.colorName,
      parsed.selectedColorKey,
      parsed.colorKey
    );

    sizeCandidates.push(
      parsed.size,
      parsed.selectedSize,
      parsed.options?.size,
      parsed.selection?.size,
      parsed.sizeLabel,
      parsed.sizeName,
      parsed.selectedSizeKey,
      parsed.sizeKey
    );
  }

  const color = colorCandidates.map(pickLabel).find((v) => v) || "";
  const size = sizeCandidates.map(pickLabel).find((v) => v) || "";

  return { color, size };
}

// تحويل الطلب القادم من الـ API إلى شكل مناسب للواجهة (على مستوى الطلب)
function normalizeOrder(raw) {
  if (!raw) return null;

  const id = raw.id || raw._id || raw.orderId;
  if (!id) return null;

  const rawStatus =
    raw.status || raw.orderStatus || raw.state || raw.sellerStatus || "جديد";

  const unifiedStatusCode = normalizeOrderStatusCode(raw);

  return {
    id,
    code: raw.code || raw.orderCode || String(id).slice(-6),
    createdAt: raw.createdAt || raw.created_at,
    paymentMethod: raw.paymentMethod || raw.paymentType || "",
    rawStatus,
    unifiedStatusCode,
    items: raw.orderItems || raw.items || [],
    raw,
  };
}

function getPaymentMethodLabel(method) {
  if (!method) return "—";
  const value = String(method).toUpperCase();

  if (value === "COD") return "الدفع عند الاستلام";
  if (value === "ONLINE") return "دفع إلكتروني";
  if (value === "BANK_TRANSFER") return "تحويل بنكي";

  return method;
}

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  ``;

function resolveImageUrl(raw) {
  if (!raw) return null;

  if (typeof raw === "object" && raw !== null) {
    if (typeof raw.url === "string") {
      return resolveImageUrl(raw.url);
    }
    return null;
  }

  if (typeof raw !== "string") return null;

  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  const baseUrl = API_BASE_URL || "";

  if (trimmed.startsWith("/")) {
    return `${baseUrl}${trimmed}`;
  }

  if (
    trimmed.startsWith("uploads/") ||
    trimmed.startsWith("products/") ||
    trimmed.startsWith("static/")
  ) {
    return `${baseUrl}/${trimmed}`;
  }

  return trimmed;
}

function getStatusFallbackLabel(key) {
  return STATUS_LABEL_FALLBACK[key] || "غير معروف";
}

export default function SellerOrdersSection() {
  const { showToast } = useApp() || {};

  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const [filterStatus, setFilterStatus] = useState(FILTER_ALL);
  const [searchTerm, setSearchTerm] = useState("");
  const [updatingItemKey, setUpdatingItemKey] = useState(null);

  async function reloadSellerOrders() {
    try {
      const response = await listOrders({ scope: "seller" });
      const payload = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response)
        ? response
        : [];

      const normalized = payload.map(normalizeOrder).filter((o) => o && o.id);
      setOrders(normalized);
    } catch (error) {
      if (showToast) {
        showToast("تعذّر إعادة تحميل الطلبات بعد التحديث.", "error");
      }
    }
  }

  // ✅ إدخال/استبدال طلب محدث داخل state (بدون reload كامل)
  function upsertUpdatedOrder(updatedRaw) {
    const normalized = normalizeOrder(updatedRaw);
    if (!normalized || !normalized.id) return false;

    setOrders((prev) => {
      const idx = prev.findIndex((o) => String(o.id) === String(normalized.id));
      if (idx === -1) return [normalized, ...prev];
      const next = [...prev];
      next[idx] = normalized;
      return next;
    });

    return true;
  }

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        setIsLoading(true);
        const response = await listOrders({ scope: "seller" });

        const payload = Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response)
          ? response
          : [];

        const normalized = payload.map(normalizeOrder).filter((o) => o && o.id);

        if (isMounted) setOrders(normalized);
      } catch (error) {
        if (isMounted && showToast) {
          showToast("تعذّر تحميل الطلبات. حاول مرة أخرى.", "error");
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [showToast]);

  const sellerItems = useMemo(() => {
    const rows = [];

    for (const order of orders || []) {
      const baseOrderId = order.id;
      const orderCode = order.code;
      const createdAt = order.createdAt;
      const paymentMethod = order.paymentMethod;

      const itemsArray = order.items || order.orderItems || [];

      itemsArray.forEach((item, index) => {
        if (!item) return;

        const itemId =
          item._id || item.id || item.itemId || `${baseOrderId}-${index}`;

        const productName =
          (item.product && item.product.name) || item.name || "منتج بدون اسم";

        const quantity =
          typeof item.qty === "number"
            ? item.qty
            : typeof item.quantity === "number"
            ? item.quantity
            : 1;

        const price =
          typeof item.price === "number"
            ? item.price
            : typeof item.unitPrice === "number"
            ? item.unitPrice
            : 0;

        const lineTotal =
          typeof price === "number" && typeof quantity === "number"
            ? price * quantity
            : 0;

        const { unifiedStatusCode, statusKey } = deriveSellerItemState(order, item);

        const rawImage =
          item.image ||
          item.imageUrl ||
          (item.product &&
            (item.product.mainImageUrl ||
              item.product.imageUrl ||
              item.product.image ||
              (Array.isArray(item.product.images) &&
                item.product.images.length > 0 &&
                item.product.images[0]) ||
              item.product.thumbnail));

        const imageUrl = resolveImageUrl(rawImage);

        const { color, size } = extractColorSizeFromOrderItem(item);

        rows.push({
          key: `${baseOrderId}__${itemId}`,
          orderId: baseOrderId,
          itemId,
          orderCode,
          indexInOrder: index + 1,
          createdAt,
          paymentMethod,
          statusKey,
          unifiedStatusCode,
          productName,
          quantity,
          price,
          lineTotal,
          imageUrl,

          selectedColor: color || "",
          selectedSize: size || "",

          rawOrder: order.raw,
          rawItem: item,
        });
      });
    }

    return rows;
  }, [orders]);

  const filteredItems = useMemo(() => {
    let result = sellerItems;

    if (filterStatus !== FILTER_ALL) {
      result = result.filter((item) => {
        const effectiveCode =
          item.unifiedStatusCode || mapStatusKeyToCode(item.statusKey);
        return effectiveCode === filterStatus;
      });
    }

    const term = searchTerm.trim().toLowerCase();
    if (term) {
      result = result.filter((item) => {
        const code = item.orderCode ? String(item.orderCode).toLowerCase() : "";
        const product = item.productName ? item.productName.toLowerCase() : "";
        return code.includes(term) || product.includes(term);
      });
    }

    return result;
  }, [sellerItems, filterStatus, searchTerm]);

  const hasActiveFilter =
    filterStatus !== FILTER_ALL || searchTerm.trim().length > 0;

  // ✅ تحديث حالة منتج واحد داخل الطلب + تحديث state مباشرة إن أمكن
  async function handleStatusUpdate(item, newStatusKey) {
    if (!item || !newStatusKey || newStatusKey === item.statusKey) return;

    const allowed = getAllowedNextStatusKeysForSeller(item.statusKey);
    if (!allowed.includes(newStatusKey)) {
      if (showToast) {
        showToast("لا يمكنك تغيير حالة الطلب إلى هذه الحالة.", "error");
      }
      return;
    }

    setUpdatingItemKey(item.key);

    try {
      let res = null;

      if (item.orderId && item.itemId) {
        res = await updateSellerOrderItemStatus(item.orderId, item.itemId, newStatusKey);
      } else if (item.orderId) {
        res = await updateSellerOrderStatus(item.orderId, newStatusKey);
      } else {
        throw new Error("orderId/itemId مفقود");
      }

      if (showToast) showToast("تم تحديث حالة المنتج داخل الطلب بنجاح.", "success");

      // ✅ الأفضل: لو الباك رجع order محدث نحدّث state مباشرة
      const updatedOrderRaw = res?.order;
      const applied = updatedOrderRaw ? upsertUpdatedOrder(updatedOrderRaw) : false;

      // ✅ fallback آمن لو لم يرجع order لأي سبب
      if (!applied) {
        await reloadSellerOrders();
      }
    } catch (error) {
      if (showToast) showToast("تعذّر تحديث حالة الطلب.", "error");
    } finally {
      setUpdatingItemKey(null);
    }
  }

  function resetFilters() {
    setFilterStatus(FILTER_ALL);
    setSearchTerm("");
  }

  function handlePrintItem(item) {
    try {
      const lineTotalLabel =
        typeof item.lineTotal === "number" && item.lineTotal > 0
          ? `${item.lineTotal} ر.ي`
          : "—";

      const effectiveStatusCode =
        item.unifiedStatusCode || mapStatusKeyToCode(item.statusKey);
      const labelFromCode =
        effectiveStatusCode && getOrderStatusLabel(effectiveStatusCode);
      const statusLabel = labelFromCode || getStatusFallbackLabel(item.statusKey);

      const paymentLabel = getPaymentMethodLabel(item.paymentMethod);

      const createdAtText = item.createdAt
        ? new Date(item.createdAt).toLocaleString("ar-SA")
        : "";

      const colorLine = item.selectedColor ? item.selectedColor : "—";
      const sizeLine = item.selectedSize ? item.selectedSize : "—";

      const win = window.open("", "_blank", "noopener,noreferrer");
      if (!win) {
        if (showToast) showToast("تعذّر فتح نافذة الطباعة.", "error");
        return;
      }

      win.document.write(`
        <html dir="rtl" lang="ar">
          <head>
            <meta charset="UTF-8" />
            <title>بيانات المنتج في الطلب #${item.orderCode}</title>
            <style>
              body {
                font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                padding: 24px;
                background: #f9fafb;
                color: #111827;
              }
              h1 { font-size: 20px; margin-bottom: 16px; text-align: center; }
              h2 { font-size: 16px; margin: 16px 0 8px; }
              .section {
                background: #ffffff;
                border-radius: 12px;
                padding: 16px 18px;
                margin-bottom: 12px;
                border: 1px solid #e5e7eb;
              }
              .row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 6px;
                font-size: 14px;
              }
              .label { font-weight: 600; }
              .value { max-width: 65%; text-align: left; direction: rtl; }
              .small {
                font-size: 13px;
                color: #6b7280;
                text-align: center;
                margin-top: 20px;
              }
            </style>
          </head>
          <body>
            <h1>بيانات المنتج في الطلب #${item.orderCode}</h1>

            <div class="section">
              <h2>معلومات عامة</h2>
              <div class="row">
                <span class="label">رقم الطلب:</span>
                <span class="value">#${item.orderCode}</span>
              </div>
              <div class="row">
                <span class="label">المنتج رقم:</span>
                <span class="value">${item.indexInOrder} من هذا الطلب</span>
              </div>
              ${
                createdAtText
                  ? `
              <div class="row">
                <span class="label">تاريخ إنشاء الطلب:</span>
                <span class="value">${createdAtText}</span>
              </div>`
                  : ""
              }
              <div class="row">
                <span class="label">الحالة الحالية:</span>
                <span class="value">${statusLabel}</span>
              </div>
            </div>

            <div class="section">
              <h2>تفاصيل المنتج</h2>
              <div class="row">
                <span class="label">اسم المنتج:</span>
                <span class="value">${item.productName || "منتج بدون اسم"}</span>
              </div>
              <div class="row">
                <span class="label">اللون:</span>
                <span class="value">${colorLine}</span>
              </div>
              <div class="row">
                <span class="label">الحجم:</span>
                <span class="value">${sizeLine}</span>
              </div>
              <div class="row">
                <span class="label">الكمية:</span>
                <span class="value">${item.quantity}</span>
              </div>
              <div class="row">
                <span class="label">سعر الوحدة:</span>
                <span class="value">${item.price ? item.price + " ر.ي" : "—"}</span>
              </div>
              <div class="row">
                <span class="label">إجمالي هذا المنتج:</span>
                <span class="value">${lineTotalLabel}</span>
              </div>
              <div class="row">
                <span class="label">طريقة الدفع:</span>
                <span class="value">${paymentLabel}</span>
              </div>
            </div>

            <p class="small">يمكنك حفظ هذه الصفحة كملف PDF من مربع الحوار الخاص بالطباعة في المتصفح.</p>
            <script>window.print();</script>
          </body>
        </html>
      `);

      win.document.close();
    } catch (error) {
      if (showToast) showToast("تعذّرت طباعة بيانات المنتج.", "error");
    }
  }

  return (
    <section className="seller-section">
      <div className="seller-section-header">
        <div>
          <h2>الطلبات</h2>
          <p>متابعة طلبات العملاء المرتبطة بمنتجات متجرك، منتجًا منتجًا.</p>
        </div>

        <div className="seller-header-actions">
          <div className="seller-search">
            <input
              type="text"
              placeholder="بحث برقم الطلب أو اسم المنتج..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="seller-select">
            <Filter size={14} />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value={FILTER_ALL}>كل الحالات</option>

              <option value={ORDER_STATUS_CODES.AT_SELLER_NEW}>
                {getOrderStatusLabel(ORDER_STATUS_CODES.AT_SELLER_NEW)}
              </option>
              <option value={ORDER_STATUS_CODES.AT_SELLER_PROCESSING}>
                {getOrderStatusLabel(ORDER_STATUS_CODES.AT_SELLER_PROCESSING)}
              </option>
              <option value={ORDER_STATUS_CODES.AT_SELLER_READY_TO_SHIP}>
                {getOrderStatusLabel(ORDER_STATUS_CODES.AT_SELLER_READY_TO_SHIP)}
              </option>
              <option value={ORDER_STATUS_CODES.IN_SHIPPING}>
                {getOrderStatusLabel(ORDER_STATUS_CODES.IN_SHIPPING)}
              </option>
              <option value={ORDER_STATUS_CODES.DELIVERED}>
                {getOrderStatusLabel(ORDER_STATUS_CODES.DELIVERED)}
              </option>
              <option value={ORDER_STATUS_CODES.CANCELLED_BY_SELLER}>
                {getOrderStatusLabel(ORDER_STATUS_CODES.CANCELLED_BY_SELLER)}
              </option>
              <option value={ORDER_STATUS_CODES.CANCELLED_BY_SHIPPING}>
                {getOrderStatusLabel(ORDER_STATUS_CODES.CANCELLED_BY_SHIPPING)}
              </option>
              <option value={ORDER_STATUS_CODES.CANCELLED_BY_ADMIN}>
                {getOrderStatusLabel(ORDER_STATUS_CODES.CANCELLED_BY_ADMIN)}
              </option>
            </select>
          </div>
        </div>
      </div>

      {hasActiveFilter && (
        <div className="seller-filters-info">
          <span>تصفية مفعّلة على الطلبات.</span>
          <button
            type="button"
            className="seller-link-reset"
            onClick={resetFilters}
          >
            إعادة التعيين
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="seller-empty">
          <div className="seller-empty-icon">
            <ShoppingBag size={22} />
          </div>
          <h3>جارٍ تحميل الطلبات...</h3>
          <p>يرجى الانتظار لحظات حتى يتم جلب بيانات الطلبات.</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="seller-empty">
          <div className="seller-empty-icon">
            <ShoppingBag size={22} />
          </div>
          <h3>لا توجد طلبات حالياً</h3>
          <p>ستظهر هنا الطلبات المرتبطة بمنتجات متجرك فور بدء عمليات الشراء من العملاء.</p>
        </div>
      ) : (
        <div className="seller-orders-list">
          {filteredItems.map((item) => {
            const lineTotalLabel =
              typeof item.lineTotal === "number" && item.lineTotal > 0
                ? `${item.lineTotal} ر.ي`
                : "—";

            const createdAtText = item.createdAt
              ? new Date(item.createdAt).toLocaleString("ar-SA")
              : "";

            const effectiveStatusCode =
              item.unifiedStatusCode || mapStatusKeyToCode(item.statusKey);
            const statusLabelFromCode =
              effectiveStatusCode && getOrderStatusLabel(effectiveStatusCode);
            const effectiveStatusLabel =
              statusLabelFromCode || getStatusFallbackLabel(item.statusKey);

            const allowedNextKeys = getAllowedNextStatusKeysForSeller(item.statusKey);
            const canSellerChangeStatus = allowedNextKeys.length > 0;

            const hasVariantInfo = Boolean(item.selectedColor || item.selectedSize);

            return (
              <article key={item.key} className="seller-order-card">
                <div className="seller-order-header-row">
                  <div className="seller-order-pill seller-order-pill--code">
                    <span>رقم الطلب</span>
                    <span>#{item.orderCode}</span>
                  </div>

                  {createdAtText && (
                    <div className="seller-order-pill seller-order-pill--date">
                      <CalendarDays size={14} />
                      <span>{createdAtText}</span>
                    </div>
                  )}
                </div>

                <div className="seller-order-card-inner">
                  <div className="seller-order-main-row seller-order-main-row--single">
                    <div className="seller-order-column seller-order-column--product seller-order-column--full">
                      <div className="seller-order-column-header">
                        <span className="seller-header-stick" />
                        <span>تفاصيل المنتج</span>
                        <span className="seller-order-sub-index">
                          المنتج رقم {item.indexInOrder} من هذا الطلب
                        </span>
                      </div>

                      <div className="seller-order-product-main">
                        <div className="seller-order-product-media">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.productName || "صورة المنتج"}
                            />
                          ) : (
                            <div className="seller-order-product-placeholder">
                              <ShoppingBag size={22} />
                            </div>
                          )}
                        </div>

                        <div className="seller-order-product-text">
                          <div className="seller-order-product-name">
                            <span className="seller-order-product-name-label">اسم المنتج:</span>
                            <span>{item.productName}</span>
                          </div>

                          {hasVariantInfo && (
                            <div className="seller-order-variants-row">
                              {item.selectedColor ? (
                                <span className="seller-order-variant-chip">
                                  <span className="seller-order-variant-label">اللون:</span>
                                  <span className="seller-order-variant-value">
                                    {item.selectedColor}
                                  </span>
                                </span>
                              ) : null}

                              {item.selectedSize ? (
                                <span className="seller-order-variant-chip">
                                  <span className="seller-order-variant-label">الحجم:</span>
                                  <span className="seller-order-variant-value">
                                    {item.selectedSize}
                                  </span>
                                </span>
                              ) : null}
                            </div>
                          )}

                          <div className="seller-order-product-meta-row">
                            <div className="seller-order-meta-item">
                              <span className="seller-meta-label">الكمية</span>
                              <span className="seller-meta-value">{item.quantity}</span>
                            </div>
                            <div className="seller-order-meta-item">
                              <span className="seller-meta-label">سعر الواحدة</span>
                              <span className="seller-meta-value">
                                {item.price ? `${item.price} ر.ي` : "—"}
                              </span>
                            </div>
                            <div className="seller-order-meta-item">
                              <span className="seller-meta-label">إجمالي المنتج</span>
                              <span className="seller-meta-value">{lineTotalLabel}</span>
                            </div>
                          </div>

                          <div className="seller-order-payment">
                            <span className="seller-meta-label">طريقة الدفع:</span>
                            <span className="seller-meta-value">
                              {getPaymentMethodLabel(item.paymentMethod)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="seller-order-bottom-row">
                    <div className="seller-order-bottom-actions">
                      <div className="seller-order-status-pill-wrapper">
                        <span className="seller-meta-label">حالة الطلب</span>
                        <span className="seller-order-status-pill">{effectiveStatusLabel}</span>
                      </div>

                      <div className="seller-order-status-update">
                        <span className="seller-meta-label">تحديث حالة الطلب</span>
                        <select
                          className="seller-order-status-select"
                          value={item.statusKey}
                          onChange={(e) => handleStatusUpdate(item, e.target.value)}
                          disabled={updatingItemKey === item.key || !canSellerChangeStatus}
                        >
                          <option value="">اختر الحالة</option>
                          {SELLER_UPDATE_KEYS.map((key) => {
                            const isCurrent = key === item.statusKey;
                            const allowedNextKeys = getAllowedNextStatusKeysForSeller(item.statusKey);
                            const isSelectable = isCurrent || allowedNextKeys.includes(key);

                            const optionCode = mapStatusKeyToCode(key);
                            const optionLabel =
                              (optionCode && getOrderStatusLabel(optionCode)) ||
                              STATUS_LABEL_FALLBACK[key] ||
                              "غير معروف";

                            return (
                              <option key={key} value={key} disabled={!isSelectable}>
                                {optionLabel}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="seller-order-print-btn"
                      onClick={() => handlePrintItem(item)}
                    >
                      <Printer size={14} />
                      <span>طباعة السند</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
