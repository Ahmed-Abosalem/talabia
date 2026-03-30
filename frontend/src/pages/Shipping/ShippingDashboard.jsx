// ShippingDashboard.jsx - تصميم كرت الشحن وفق التصور الجديد مع الحفاظ على المنطق البرمجي

import "./ShippingDashboard.css";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Filter,
  RefreshCw,
  X,
  Printer,
  Truck,
  Settings2,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import {
  getShippingOrders,
  confirmDeliveryForItem,
  updateShippingOrderStatus, // قديم (تحديث الطلب كاملًا) - نستخدمه كاحتياط
  updateShippingOrderItemStatus, // جديد (تحديث منتج واحد داخل الطلب)
} from "@/services/shippingService";
import {
  ORDER_STATUS_CODES,
  normalizeOrderStatusCode,
  getOrderStatusLabel,
} from "@/config/orderStatus";
import { formatDate, formatCurrency, formatNumber } from "@/utils/formatters";

/**
 * الحالات البصرية داخل لوحة الشحن (للألوان فقط)
 */
const statusConfig = {
  pending_pickup: {
    label: "قيد الاستلام من البائع",
    colorClass: "status-chip-pending",
  },
  processing: {
    label: "قيد التجهيز",
    colorClass: "status-chip-processing",
  },
  on_the_way: {
    label: "في الشحن",
    colorClass: "status-chip-onway",
  },
  delivered: {
    label: "تم التسليم",
    colorClass: "status-chip-delivered",
  },
  cancelled: {
    label: "ملغى",
    colorClass: "status-chip-cancelled",
  },
};

/**
 * الحالات التي يمكن لشركة الشحن تغيير الطلب إليها (صلاحيات الشحن فقط)
 */
const SHIPPING_STATUS_ACTIONS = [
  {
    key: "on_the_way",
    code: ORDER_STATUS_CODES.IN_SHIPPING,
  },
  {
    key: "cancelled",
    code: ORDER_STATUS_CODES.CANCELLED_BY_SHIPPING,
  },
];

const STATUS_KEY_TO_CODE = SHIPPING_STATUS_ACTIONS.reduce((acc, action) => {
  acc[action.key] = action.code;
  return acc;
}, {});

const SHIPPING_ALLOWED_KEYS = Object.keys(STATUS_KEY_TO_CODE);

/** تحويل حالة النص الخام إلى مفتاح بصري */
function mapBackendStatusToShippingStatus(rawStatus) {
  const v = (rawStatus || "").toString().toLowerCase().trim();
  if (!v) return "processing";

  if (v.includes("جاهز")) return "pending_pickup";
  if (v.includes("جديد")) return "processing";

  if (v.includes("pending") || v.includes("new") || v.includes("استلام")) {
    return "pending_pickup";
  }

  if (
    v.includes("on_the_way") ||
    v.includes("on the way") ||
    v.includes("شحن") ||
    v.includes("في الطريق") ||
    v.includes("shipping")
  ) {
    return "on_the_way";
  }

  if (v.includes("delivered") || v.includes("مكتمل") || v.includes("completed")) {
    return "delivered";
  }

  if (v.includes("cancel") || v.includes("ملغ")) {
    return "cancelled";
  }

  return "processing";
}

/** تحويل الكود الموحّد إلى المفتاح البصري (للألوان فقط) */
function mapUnifiedStatusCodeToVisualKey(unifiedStatusCode, rawStatusText) {
  if (unifiedStatusCode) {
    switch (unifiedStatusCode) {
      case ORDER_STATUS_CODES.AT_SELLER_NEW:
      case ORDER_STATUS_CODES.AT_SELLER_PROCESSING:
        return "processing";
      case ORDER_STATUS_CODES.AT_SELLER_READY_TO_SHIP:
        return "pending_pickup";
      case ORDER_STATUS_CODES.IN_SHIPPING:
        return "on_the_way";
      case ORDER_STATUS_CODES.DELIVERED:
        return "delivered";
      case ORDER_STATUS_CODES.CANCELLED_BY_SELLER:
      case ORDER_STATUS_CODES.CANCELLED_BY_SHIPPING:
      case ORDER_STATUS_CODES.CANCELLED_BY_ADMIN:
        return "cancelled";
      default:
        break;
    }
  }

  return mapBackendStatusToShippingStatus(rawStatusText || "");
}



function escapeHtml(input) {
  if (input === null || input === undefined) return "";
  return String(input)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// 🔗 قاعدة الـ API من بيئة Vite
const API_BASE_URL = import.meta.env.VITE_API_URL || "";

function buildProductImageUrl(image) {
  if (!image) return "";

  // لو الصورة كائن { url, path, ... }
  if (typeof image === "object" && image !== null) {
    const nested =
      image.url ||
      image.secure_url ||
      image.path ||
      image.location ||
      image.imageUrl ||
      "";
    if (!nested) return "";
    return buildProductImageUrl(nested);
  }

  if (typeof image !== "string") return "";
  const trimmed = image.trim();
  if (!trimmed) return "";

  // رابط كامل http/https
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  // مسار يبدأ بـ /
  if (trimmed.startsWith("/")) {
    return API_BASE_URL ? `${API_BASE_URL}${trimmed}` : trimmed;
  }

  // مسار نسبي داخل uploads / products / static
  if (
    trimmed.startsWith("uploads/") ||
    trimmed.startsWith("products/") ||
    trimmed.startsWith("static/")
  ) {
    const p = trimmed.startsWith("uploads/") ? `/${trimmed}` : `/uploads/${trimmed}`;
    return API_BASE_URL ? `${API_BASE_URL}${p}` : p;
  }

  // في باقي الحالات نعامله كمسار نسبي تحت الـ API
  const final = trimmed.startsWith("/") ? trimmed : `/uploads/${trimmed}`;
  return API_BASE_URL ? `${API_BASE_URL}${final}` : final;
}

/**
 * ✅ ضمان أن رابط الصورة المستخدم داخل صفحة الطباعة هو رابط مطلق
 * لأن صفحات blob: قد لا تُحمّل المسارات النسبية بشكل صحيح.
 */
function makeAbsoluteUrlForPrint(url) {
  if (!url || typeof url !== "string") return "";
  const u = url.trim();
  if (!u) return "";

  if (/^https?:\/\//i.test(u) || u.startsWith("data:") || u.startsWith("blob:")) {
    return u;
  }

  // protocol-relative //example.com/img.jpg
  if (u.startsWith("//")) {
    try {
      return `${window.location.protocol}${u}`;
    } catch {
      return u;
    }
  }

  // ✅ إذا عندنا API_BASE_URL فهذه هي القاعدة الصحيحة للصور من الباك
  if (API_BASE_URL) {
    if (u.startsWith("/")) return `${API_BASE_URL}${u}`;
    return `${API_BASE_URL}/${u.replace(/^\.?\//, "")}`;
  }

  // fallback: نفس الدومين الحالي (قد ينجح لو الفرونت والباك على نفس الدومين)
  try {
    const origin = window.location.origin;

    if (u.startsWith("/")) return `${origin}${u}`;

    // نسبية بدون /
    return `${origin}/${u.replace(/^\.?\//, "")}`;
  } catch {
    return u;
  }
}

/**
 * ✅ فتح صفحة الطباعة بطريقة ثابتة عبر Blob URL (بدل document.write على about:blank)
 */
function openPrintWindowWithBlob(html, showToast) {
  try {
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const win = window.open(url, "_blank"); // بدون noopener/noreferrer لتفادي سلوك about:blank الفارغ
    if (!win) {
      URL.revokeObjectURL(url);
      if (showToast) {
        showToast("تعذّر فتح نافذة الطباعة. رجاءً فعّل النوافذ المنبثقة.", "error");
      }
      return;
    }

    // نحرر الرابط بعد تحميل الصفحة بفترة قصيرة
    win.addEventListener(
      "load",
      () => {
        try {
          win.focus?.();
        } catch { }
        setTimeout(() => {
          try {
            URL.revokeObjectURL(url);
          } catch { }
        }, 2500);
      },
      { once: true }
    );
  } catch (err) {
    console.error("❌ Print window error:", err);
    if (showToast) showToast("تعذّر تجهيز نافذة الطباعة.", "error");
  }
}


// ─────────────────────────────────────────────────
// 💳 دالة تحويل بيانات الدفع إلى حالة موحدة للعرض
// ─────────────────────────────────────────────────
function resolvePaymentStatus({ paymentMethod, paymentSubMethod, bankTransferStatus, isPaid }) {
  // كاش عند الاستلام → حالة موحدة "عند الاستلام"
  if (!paymentMethod || paymentMethod === "COD") return "cod";

  // ✅ دفع بالمحفظة → دائماً "مدفوع" لأنه خُصم مسبقاً
  if (paymentMethod === "Wallet") return "paid";

  // دفع بالبطاقة الإلكترونية
  if (paymentSubMethod === "CARD") {
    return isPaid ? "paid" : "pending_payment";
  }

  // حوالة بنكية → تعتمد على قرار الأدمن
  if (paymentSubMethod === "BANK_TRANSFER" || paymentMethod === "Online") {
    if (bankTransferStatus === "confirmed") return "paid";
    if (bankTransferStatus === "rejected") return "rejected";
    return "pending_review";
  }

  return "pending";
}

/**
 * 🛠️ مساعد لتطبيع بيانات منتج واحد داخل الطلب (Item mapping)
 * تم فصله لتحسين القراءة وإضافة معالجة دفاعية (Defensive Handling)
 */
function normalizeShippingOrderItem({ item, order, orderId, orderNumber, idx, dateFormatted, createdAtDate, orderShippingStatusRaw, baseStatus }) {
  const itemId = item._id || item.id;

  const itemStatusRaw =
    item.shippingStatus ||
    item.shipping_status ||
    item.itemStatus ||
    item.status ||
    orderShippingStatusRaw ||
    baseStatus;

  const rawStatusText = (itemStatusRaw || "").toString();

  const unifiedStatusCode = normalizeOrderStatusCode({
    statusCode:
      item.statusCode ||
      item.status_code ||
      order.statusCode ||
      order.status_code,
    sellerStatus:
      item.sellerStatus ||
      item.seller_status ||
      order.sellerStatus ||
      order.seller_status,
    shippingStatus:
      item.shippingStatus ||
      item.shipping_status ||
      orderShippingStatusRaw,
    status: itemStatusRaw,
    legacyStatus:
      item.legacyStatus || order.legacyStatus || order.status || null,
  });

  const visualStatusKey = mapUnifiedStatusCodeToVisualKey(
    unifiedStatusCode,
    rawStatusText
  );

  const qty = item.qty || item.quantity || 1;
  const unitPrice =
    typeof item.price === "number"
      ? item.price
      : typeof item.unitPrice === "number"
        ? item.unitPrice
        : 0;
  const total = unitPrice * qty;

  const storeName =
    item.store?.name || order.store?.name || order.storeName || "—";

  const productName =
    item.name || item.productName || item.product?.name || "منتج";

  // بيانات البائع (تواصل وعنوان)
  const sellerPhone =
    item.store?.phone ||
    order.store?.phone ||
    order.seller?.phone ||
    order.sellerPhone ||
    order.storePhone ||
    "—";

  const sellerEmail =
    item.store?.email ||
    order.store?.email ||
    order.seller?.email ||
    order.sellerEmail ||
    "—";

  const rawStoreAddress = item.store?.address || order.store?.address || null;
  let sellerAddress = "—";

  if (rawStoreAddress) {
    if (typeof rawStoreAddress === "string") {
      sellerAddress = rawStoreAddress.trim() || "—";
    } else if (typeof rawStoreAddress === "object") {
      const parts = [
        rawStoreAddress.country,
        rawStoreAddress.city,
        rawStoreAddress.area,
        rawStoreAddress.street,
        rawStoreAddress.details,
      ].filter(Boolean);
      if (parts.length > 0) sellerAddress = parts.join("، ");
    }
  }

  if (sellerAddress === "—" && order.seller) {
    const fallbackParts = [];
    if (typeof order.seller.address === "string") fallbackParts.push(order.seller.address.trim());
    if (typeof order.seller.country === "string") fallbackParts.push(order.seller.country.trim());
    if (fallbackParts.length > 0) sellerAddress = fallbackParts.join("، ");
  }

  // بيانات المشتري
  const buyerPhone =
    order.shippingAddress?.phone ||
    order.shippingAddress?.mobile ||
    order.buyer?.phone ||
    order.buyer?.mobile ||
    "—";

  const buyerEmail = order.buyer?.email || order.shippingAddress?.email || "—";

  const shippingAddressParts = [
    order.shippingAddress?.country,
    order.shippingAddress?.city,
    order.shippingAddress?.district,
    order.shippingAddress?.neighborhood,
    order.shippingAddress?.street || order.shippingAddress?.details || order.shippingAddress?.additionalInfo,
  ].filter(Boolean);

  const shippingAddress = shippingAddressParts.length > 0 ? shippingAddressParts.join("، ") : "—";

  // تفاصيل المنتج
  const productDescription = item.product?.description || item.description || "";
  const productDimensions = item.product?.dimensions || item.dimensions || "";
  const productWeight = item.product?.weight || item.weight || item.product?.weightKg || "";

  // معالجة الصورة
  let rawImg = item.image || item.imageUrl || "";
  if (!rawImg && Array.isArray(item.product?.images) && item.product.images.length > 0) {
    const first = item.product.images[0];
    rawImg = typeof first === "string" ? first : (first?.url || first?.secure_url || first?.path || "");
  }
  if (!rawImg) rawImg = item.product?.mainImage || item.product?.imageUrl || "";

  const productImage = buildProductImageUrl(rawImg);

  const shippingPrice =
    typeof order.shippingCost === "number" ? order.shippingCost :
      typeof order.shippingPrice === "number" ? order.shippingPrice : null;

  // ─── حالة الدفع: تُستمد من بيانات الطلب الأصلي ───
  const paymentStatusKey = resolvePaymentStatus({
    paymentMethod: order.paymentMethod,
    paymentSubMethod: order.paymentSubMethod,
    bankTransferStatus: order.bankTransferStatus,
    isPaid: order.isPaid,
  });

  return {
    id: `${orderNumber}-${idx + 1}`,
    orderId,
    itemId,
    orderNumber,
    itemIndex: idx + 1,
    date: dateFormatted,
    createdAt: createdAtDate,
    city: order.shippingAddress?.city || "—",
    buyerName: order.buyer?.name || order.shippingAddress?.fullName || "—",
    storeName,
    itemsCount: qty,
    unitPrice,
    total,
    paymentMethod: order.paymentMethod === "COD" ? "الدفع عند الاستلام" : order.paymentMethod === "Wallet" ? "الدفع بالمحفظة" : order.paymentMethod === "Online" ? (order.paymentSubMethod === "BANK_TRANSFER" ? "الحوالة البنكية" : "الدفع بالبطاقة") : order.paymentMethod || "—",
    paymentStatusKey, // 🆕 حالة الدفع الموحدة: "paid" | "pending" | "unpaid"
    status: visualStatusKey,
    statusCode: unifiedStatusCode || null,
    productName,
    rawStatusText,
    sellerPhone,
    sellerEmail,
    sellerAddress,
    buyerPhone,
    buyerEmail,
    shippingAddress,
    productDescription,
    productDimensions,
    productWeight,
    productImage,
    shippingPrice,
  };
}

/**
 * تطبيع استجابة /shipping/orders إلى مصفوفة "شحنات" مسطّحة
 * كل عنصر في المصفوفة = منتج واحد داخل طلب (Item)
 */
function normalizeShippingOrdersFromApi(raw) {
  if (!Array.isArray(raw)) return [];

  const shipments = [];

  raw.forEach((order) => {
    if (!order) return;

    try {
      const orderId = order._id || order.id;
      const createdAt = order.createdAt || order.created_at || order.date;
      const dateFormatted = createdAt ? formatDate(createdAt) : (order.date || "");

      let createdAtDate = null; // ✅ إصلاح: تعريف المتغير بشكل صحيح لتفادي ReferenceError
      if (createdAt) {
        const d = new Date(createdAt);
        if (!Number.isNaN(d.getTime())) {
          createdAtDate = d;
        }
      }

      const baseStatus = order.status || order.orderStatus || "processing";
      const orderNumber = order.orderNumber || (orderId ? String(orderId).slice(-6) : "—");
      const items = order.orderItems || order.items || [];
      const orderShippingStatusRaw = order.shippingStatus || null;

      items.forEach((item, idx) => {
        if (!item) return;
        try {
          const normalized = normalizeShippingOrderItem({
            item,
            order,
            orderId,
            orderNumber,
            idx,
            dateFormatted,
            createdAtDate,
            orderShippingStatusRaw,
            baseStatus,
          });
          shipments.push(normalized);
        } catch (itemErr) {
          console.error(`❌ Error normalizing item ${idx} for order ${orderId}:`, itemErr);
        }
      });
    } catch (orderErr) {
      console.error(`❌ Error normalizing order:`, orderErr);
    }
  });

  return shipments;
}


// ✅ دمج شحنات Order محدث داخل state بدون إعادة تحميل كامل
function mergeShipmentsFromUpdatedOrder(prevShipments, updatedOrderRaw) {
  if (!updatedOrderRaw) return prevShipments;

  const updated = normalizeShippingOrdersFromApi([updatedOrderRaw]);
  if (!updated.length) return prevShipments;

  const map = new Map();
  updated.forEach((s) => {
    const key = `${String(s.orderId)}__${String(s.itemId || "")}`;
    map.set(key, s);
  });

  // استبدال العناصر الموجودة بنفس orderId+itemId والحفاظ على ترتيب القائمة
  const next = prevShipments.map((s) => {
    const key = `${String(s.orderId)}__${String(s.itemId || "")}`;
    return map.has(key) ? map.get(key) : s;
  });

  // إضافة أي عناصر جديدة لم تكن موجودة
  const existingKeys = new Set(
    prevShipments.map((s) => `${String(s.orderId)}__${String(s.itemId || "")}`)
  );
  updated.forEach((s) => {
    const key = `${String(s.orderId)}__${String(s.itemId || "")}`;
    if (!existingKeys.has(key)) next.unshift(s);
  });

  return next;
}

function matchesOrderFilter(order, filterKey) {
  if (!order) return false;
  if (filterKey === "all") return true;
  if (!order.statusCode) return false;
  return order.statusCode === filterKey;
}



function buildPrintLabelHtml(shipment) {
  const orderNumber = escapeHtml(shipment.orderNumber || shipment.id || "—");
  const itemIndex =
    typeof shipment.itemIndex === "number" ? shipment.itemIndex : null;

  const date = escapeHtml(shipment.date || "");
  const buyerName = escapeHtml(shipment.buyerName || "—");
  const buyerPhone = escapeHtml(shipment.buyerPhone || "—");
  const shippingAddress = escapeHtml(shipment.shippingAddress || "—");

  const storeName = escapeHtml(shipment.storeName || "—");
  const sellerPhone = escapeHtml(shipment.sellerPhone || "—");
  const sellerAddress = escapeHtml(shipment.sellerAddress || "—");

  const productName = escapeHtml(shipment.productName || "—");
  const qty = escapeHtml(shipment.itemsCount ?? "—");

  const payment = escapeHtml(shipment.paymentMethod || "—");
  const shippingFee = formatCurrency(shipment.shippingPrice);
  const total = formatCurrency(shipment.total);

  // ✅ تحويل رابط الصورة إلى absolute حتى يعمل داخل صفحة الطباعة (blob)
  const safeProductImage = shipment.productImage
    ? makeAbsoluteUrlForPrint(shipment.productImage)
    : "";
  const productImage = safeProductImage ? escapeHtml(safeProductImage) : "";

  // ملاحظة: الطباعة = المستخدم يختار "Save as PDF" من نافذة المتصفح
  return `
  <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8" />
      <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap" rel="stylesheet">
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>ملصق شحن - طلب #${orderNumber}</title>
      <style>
        /* مقاس مناسب لملصق شحن (A6) */
        @page { size: A6 portrait; margin: 10mm; }

        body {
          font-family: "Tajawal", system-ui, -apple-system, sans-serif;
          margin: 0;
          color: #0f172a;
        }

        .label {
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          padding: 12px 12px 10px;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          padding-bottom: 8px;
          border-bottom: 1px solid #e5e7eb;
        }

        .brand {
          font-weight: 900;
          font-size: 14px;
          letter-spacing: 0.2px;
        }

        .meta {
          text-align: left;
          font-size: 11px;
          color: #475569;
        }

        .orderNo {
          margin-top: 10px;
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 10px;
        }

        .orderNo .big {
          font-size: 22px;
          font-weight: 900;
          letter-spacing: 0.6px;
        }

        .orderNo .sub {
          font-size: 11px;
          color: #475569;
          white-space: nowrap;
        }

        .grid {
          margin-top: 10px;
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
        }

        .box {
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 10px;
          background: #f9fafb;
        }

        .title {
          font-size: 12px;
          font-weight: 800;
          margin-bottom: 6px;
          color: #111827;
        }

        .row {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          font-size: 12px;
          line-height: 1.45;
        }

        .row .k { color: #6b7280; white-space: nowrap; }
        .row .v { font-weight: 700; text-align: left; }

        .address {
          margin-top: 6px;
          font-size: 12px;
          line-height: 1.5;
          color: #111827;
          font-weight: 650;
        }

        .product {
          display: grid;
          grid-template-columns: ${productImage ? "64px 1fr" : "1fr"};
          gap: 10px;
          align-items: start;
        }

        .thumb {
          width: 64px;
          height: 64px;
          border-radius: 12px;
          overflow: hidden;
          background: #e5e7eb;
          border: 1px solid #e5e7eb;
        }

        .thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .productName {
          font-size: 13px;
          font-weight: 900;
          margin: 0 0 6px;
        }

        .footer {
          margin-top: 10px;
          display: flex;
          justify-content: space-between;
          gap: 10px;
          font-size: 11px;
          color: #475569;
        }

        .hint {
          margin-top: 6px;
          font-size: 10px;
          color: #64748b;
        }

        @media print {
          .hint { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="label">
        <div class="header">
          <div class="brand">Talabia — ملصق شحن</div>
          <div class="meta">
            ${date ? `<div>${date}</div>` : ""}
            <div>طريقة الدفع: ${payment}</div>
          </div>
        </div>

        <div class="orderNo">
          <div class="big">#${orderNumber}</div>
          <div class="sub">${itemIndex ? `المنتج رقم: ${itemIndex}` : ""}</div>
        </div>

        <div class="grid">
          <div class="box">
            <div class="title">بيانات المستلم</div>
            <div class="row">
              <span class="k">الاسم:</span>
              <span class="v">${buyerName}</span>
            </div>
            <div class="row">
              <span class="k">الجوال:</span>
              <span class="v">${buyerPhone}</span>
            </div>
            <div class="address">${shippingAddress}</div>
          </div>

          <div class="box">
            <div class="title">معلومات السلعة</div>
            <div class="product">
              ${productImage
      ? `<div class="thumb"><img src="${productImage}" alt="product" /></div>`
      : ``
    }
              <div>
                <div class="productName">${productName}</div>
                <div class="row">
                  <span class="k">الكمية:</span>
                  <span class="v">${qty}</span>
                </div>
                <div class="row">
                  <span class="k">الإجمالي:</span>
                  <span class="v">${escapeHtml(total)}</span>
                </div>
                <div class="row">
                  <span class="k">رسوم الشحن:</span>
                  <span class="v">${escapeHtml(shippingFee)}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="box">
            <div class="title">بيانات البائع (للاستلام/المرتجع)</div>
            <div class="row">
              <span class="k">المتجر:</span>
              <span class="v">${storeName}</span>
            </div>
            <div class="row">
              <span class="k">الجوال:</span>
              <span class="v">${sellerPhone}</span>
            </div>
            <div class="address">${sellerAddress}</div>
          </div>
        </div>

        <div class="footer">
          <span>يرجى لصق الملصق خارج الكرتون</span>
          <span>Talabia</span>
        </div>

        <div class="hint">لحفظه PDF: من نافذة الطباعة اختر "Save as PDF".</div>
      </div>

      <script>
        (function() {
          // ننتظر تحميل الصور قبل الطباعة (لتجنب طباعة مربع فارغ مكان الصورة)
          const imgs = Array.from(document.images || []);
          if (imgs.length === 0) {
            setTimeout(() => window.print(), 100);
            return;
          }
          let done = 0;
          const tick = () => {
            done++;
            if (done >= imgs.length) setTimeout(() => window.print(), 150);
          };
          imgs.forEach((img) => {
            if (img.complete) tick();
            else {
              img.onload = tick;
              img.onerror = tick;
            }
          });
        })();
      </script>
    </body>
  </html>
  `;
}
// ─────────────────────────────────────────────────
// 💳 فلترة حالة الدفع – مستقلة تماماً عن فلترة الشحن
// ─────────────────────────────────────────────────
function matchesPaymentFilter(order, filter) {
  if (!filter || filter === "all") return true;
  return (order.paymentStatusKey || "pending") === filter;
}

export default function ShippingDashboard() {
  const { showToast } = useApp() || {};

  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all"); // 🆕 فلتر حالة الدفع
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [manageModalOpen, setManageModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const [selectedStatusValue, setSelectedStatusValue] = useState("");
  const [deliveryCodeInput, setDeliveryCodeInput] = useState("");
  const [isConfirmSubmitting, setIsConfirmSubmitting] = useState(false);

  async function loadShippingOrders(options = { silent: false }) {
    const { silent } = options;
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const data = await getShippingOrders();
      const normalized = normalizeShippingOrdersFromApi(data);
      setOrders(normalized);

      if (showToast) {
        if (!silent) {
          showToast("تم تحميل طلبات الشحن بنجاح.", "success");
        } else {
          showToast("تم تحديث البيانات بنجاح.", "success");
        }
      }
    } catch (error) {
      console.error("❌ تعذّر تحميل طلبات الشحن:", error);
      if (showToast) {
        showToast("تعذّر تحميل طلبات الشحن من الخادم.", "error");
      }
      setOrders([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    loadShippingOrders({ silent: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          matchesOrderFilter(order, statusFilter) &&   // فلتر الشحن
          matchesPaymentFilter(order, paymentFilter)   // فلتر الدفع
      ),
    [orders, statusFilter, paymentFilter]
  );

  const openManageModal = (order) => {
    setSelectedOrder(order);
    const current = order?.status || "";
    const initial = SHIPPING_ALLOWED_KEYS.includes(current)
      ? current
      : SHIPPING_ALLOWED_KEYS[0] || "on_the_way";

    setSelectedStatusValue(initial);
    setDeliveryCodeInput("");
    setManageModalOpen(true);
  };

  const closeManageModal = () => {
    setManageModalOpen(false);
    setSelectedOrder(null);
  };



  const handleStatusSave = async () => {
    if (!selectedOrder) {
      closeManageModal();
      return;
    }

    if (!STATUS_KEY_TO_CODE[selectedStatusValue]) {
      if (showToast) showToast("اختر حالة صحيحة من الخيارات المتاحة.", "warning");
      return;
    }

    try {
      let res = null;
      if (selectedOrder.orderId && selectedOrder.itemId) {
        res = await updateShippingOrderItemStatus(
          selectedOrder.orderId,
          selectedOrder.itemId,
          selectedStatusValue
        );
      } else if (selectedOrder.orderId) {
        res = await updateShippingOrderStatus(
          selectedOrder.orderId,
          selectedStatusValue
        );
      } else {
        throw new Error("بيانات الشحنة غير مكتملة.");
      }

      const updatedOrderRaw = res?.order || res?.data?.order || null;

      if (updatedOrderRaw) {
        setOrders((prev) => mergeShipmentsFromUpdatedOrder(prev, updatedOrderRaw));
      } else {
        setOrders((prev) =>
          prev.map((o) => {
            if (o.id !== selectedOrder.id) return o;
            const newCode = STATUS_KEY_TO_CODE[selectedStatusValue] || o.statusCode || null;
            return {
              ...o,
              status: selectedStatusValue,
              statusCode: newCode,
            };
          })
        );
      }

      if (showToast) {
        showToast("تم تحديث الحالة بنجاح.", "success");
      }
    } catch (error) {
      console.error("❌ تعذّر تحديث الحالة:", error);
      if (showToast) showToast("تعذّر تحديث الحالة، حاول مرة أخرى.", "error");
    }
  };

  const handleConfirmDelivery = async () => {
    if (!selectedOrder) {
      closeManageModal();
      return;
    }

    if (!deliveryCodeInput.trim()) {
      if (showToast) showToast("الرجاء إدخال كود التسليم.", "warning");
      return;
    }

    setIsConfirmSubmitting(true);

    try {
      const res = await confirmDeliveryForItem(
        selectedOrder.orderId,
        selectedOrder.itemId,
        deliveryCodeInput.trim()
      );

      if (showToast) showToast("تم تأكيد تسليم المنتج بنجاح.", "success");

      const updatedOrderRaw = res?.order || res?.data?.order || null;

      if (updatedOrderRaw) {
        setOrders((prev) => mergeShipmentsFromUpdatedOrder(prev, updatedOrderRaw));
      } else {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === selectedOrder.id
              ? { ...o, status: "delivered", statusCode: ORDER_STATUS_CODES.DELIVERED }
              : o
          )
        );
      }
    } catch (error) {
      console.error("❌ تعذّر تأكيد التسليم:", error);
      if (showToast) showToast("كود التسليم غير صحيح.", "error");
    } finally {
      setIsConfirmSubmitting(false);
    }
  };

  const handlePrintLabel = (shipment) => {
    try {
      if (!shipment) return;
      const html = buildPrintLabelHtml(shipment);
      openPrintWindowWithBlob(html, showToast);
    } catch (err) {
      console.error("❌ تعذّر طباعة الملصق:", err);
    }
  };

  return (
    <div className="shipping-page">
      <OrdersTab
        orders={filteredOrders}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        paymentFilter={paymentFilter}
        setPaymentFilter={setPaymentFilter}
        openManageModal={openManageModal}
        isLoading={isLoading}
        isRefreshing={isRefreshing}
        onRefresh={() => loadShippingOrders({ silent: true })}
      />

      {manageModalOpen && selectedOrder && (
        <ManageOrderModal
          order={selectedOrder}
          selectedStatus={selectedStatusValue}
          setSelectedStatus={setSelectedStatusValue}
          deliveryCode={deliveryCodeInput}
          setDeliveryCode={setDeliveryCodeInput}
          onClose={closeManageModal}
          onSaveStatus={handleStatusSave}
          onConfirmDelivery={handleConfirmDelivery}
          onPrint={() => handlePrintLabel(selectedOrder)}
          isConfirmSubmitting={isConfirmSubmitting}
        />
      )}
    </div>
  );
}

/* ======================= مكونات فرعية ======================= */

function OrdersTab({
  orders,
  statusFilter,
  setStatusFilter,
  paymentFilter,
  setPaymentFilter,
  openManageModal,
  isLoading,
  isRefreshing,
  onRefresh,
}) {
  return (
    <section className="shipping-orders-section">
      {/* 💳 الهيدر الموحد الجديد (Unified Header Card) */}
      <div className="shipping-header-card">
        <div className="shipping-header-top">
          <div className="shipping-title-group">
            <div className="shipping-icon-badge">
              <Truck size={22} />
            </div>
            <div>
              <h2 className="shipping-orders-title">طلبات الشحن</h2>
              <p className="shipping-orders-subtitle">إدارة وتتبع الشحنات المسندة</p>
            </div>
          </div>

          <button
            type="button"
            className="shipping-refresh-btn"
            onClick={onRefresh}
            disabled={isLoading || isRefreshing}
          >
            <RefreshCw size={12} className={(isLoading || isRefreshing) ? "spin-refresh" : ""} />
            <span>{(isLoading || isRefreshing) ? "جارِ التحديث..." : "تحديث"}</span>
          </button>
        </div>

        <div className="shipping-header-filters">
          <div className="filter-item">
            <label className="filter-label">حالة الطلب</label>
            <div className="filter-select-wrapper">
              <select
                className="filter-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">كل الحالات</option>
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

          <div className="filter-item">
            <label className="filter-label">حالة الدفع</label>
            <div className="filter-select-wrapper">
              <select
                className="filter-select"
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
              >
                <option value="all">كل المدفوعات</option>
                <option value="paid">🟢 مدفوع</option>
                <option value="pending">🟡 بانتظار</option>
                <option value="unpaid">🔴 غير مدفوع</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="shipping-orders-list">
        {isLoading ? (
          <div className="shipping-orders-loading">جارِ التحميل...</div>
        ) : orders.length === 0 ? (
          <div className="shipping-orders-empty">لا توجد طلبات للعرض.</div>
        ) : (
          orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              openManageModal={openManageModal}
            />
          ))
        )}
      </div>
    </section>
  );
}

/* ---------- كرت الطلب ---------- */

function OrderCard({ order, openManageModal }) {
  const navigate = useNavigate();
  const unifiedLabel = order.statusCode
    ? getOrderStatusLabel(order.statusCode)
    : "غير محدد";

  const visualKey = mapUnifiedStatusCodeToVisualKey(
    order.statusCode,
    order.rawStatusText
  );
  const conf = statusConfig[visualKey] || {};

  const shippingPriceDisplay =
    typeof order.shippingPrice === "number"
      ? `${order.shippingPrice.toLocaleString()} ر.ي`
      : "—";

  const totalDisplay =
    typeof order.total === "number"
      ? `${order.total.toLocaleString()} ر.ي`
      : "—";

  const orderNumberText = order.orderNumber || order.id;
  const itemIndexText =
    typeof order.itemIndex === "number" ? order.itemIndex : null;

  // 💳 تحويل paymentStatusKey إلى تسمية يونيكود عربية
  const PAYMENT_STATUS_LABELS = {
    paid: "مدفوع",
    pending: "بانتظار",
    pending_payment: "بانتظار الدفع",
    pending_review: "بانتظار المراجعة",
    rejected: "مرفوض",
    unpaid: "غير مدفوع",
    cod: "عند الاستلام",
  };
  const paymentKey = order.paymentStatusKey || "pending";
  const paymentLabel = PAYMENT_STATUS_LABELS[paymentKey] || "بانتظار";

  return (
    <article className="shipping-order-card">
      {/* العمود الأول: الصورة */}
      <div className="order-col-image" style={{ cursor: "pointer" }}>
        <div
          className="order-image-aspect-wrapper"
          onClick={() =>
            navigate(`/shipping/orders/${order.orderId}/items/${order.itemId}`)
          }
        >
          <img
            src={order.productImage}
            alt={order.productName}
            className="order-card-img"
          />
          <div className="order-status-badge">{unifiedLabel}</div>
          <div className={`order-payment-badge payment-${paymentKey}`}>
            {paymentLabel}
          </div>
        </div>
      </div>

      {/* العمود الثاني: بيانات المنتج + زر الإدارة */}
      <div className="order-col-product">
        <h3 className="order-product-name">{order.productName || "—"}</h3>
        <div className="order-product-meta">
          <p className="order-product-detail">
            <span className="label">الكمية:</span> <span className="num-accent">{order.itemsCount}</span>
          </p>
          <p className="order-product-detail price-highlight">
            <span className="label">السعر:</span> <span className="num-accent">{totalDisplay}</span>
          </p>
          {/* آخر صف: رسوم الشحن + زر الإدارة في نفس الصف */}
          <div className="order-product-actions-row">
            <p className="order-product-detail order-shipping-fee">
              <span className="label">الشحن:</span> <span className="num-accent">{shippingPriceDisplay}</span>
            </p>
            <button
              type="button"
              className="order-manage-btn order-manage-btn--mobile"
              onClick={() => openManageModal(order)}
            >
              إدارة الطلب
            </button>
          </div>
        </div>
      </div>

      {/* العمود الثالث: بيانات الطلب المضغوطة */}
      <div className="order-col-order">
        <div className="order-id-display">
          <span className="order-hash">#</span>
          <span className="order-num num-accent">{orderNumberText}</span>
          <span className="order-divider">|</span>
          <span className="order-index num-accent">{itemIndexText || "01"}</span>
        </div>
        <div className="order-date-display">{order.date}</div>
        <div className="order-payment-display num-accent">
          {order.paymentMethod || "—"}
        </div>
        {/* زر الإدارة يُخفى هنا على الموبايل - يظهر أعلى في القسم الأول */}
        <button
          type="button"
          className="order-manage-btn order-manage-btn--desktop"
          onClick={() => openManageModal(order)}
        >
          <Settings2 size={14} />
          <span>إدارة الطلب</span>
        </button>
      </div>

      {/* العمود الرابع: بيانات البائع */}
      <div className="order-col-seller">
        <h4 className="card-section-title">البائع: {order.storeName || "—"}</h4>
        <p className="order-address-text">{order.sellerAddress || "—"}</p>
        <div className="order-contact-row">
          <span className="order-contact-text">{order.sellerEmail || "—"}</span>
          <span className="contact-divider">|</span>
          <span className="order-contact-phone num-accent">{order.sellerPhone || "—"}</span>
        </div>
      </div>

      {/* العمود الخامس: بيانات المشتري */}
      <div className="order-col-buyer">
        <h4 className="card-section-title">المشتري: {order.buyerName || "—"}</h4>
        <p className="order-address-text">{order.shippingAddress || "—"}</p>
        <div className="order-contact-row">
          <span className="order-contact-text">{order.buyerEmail || "—"}</span>
          <span className="contact-divider">|</span>
          <span className="order-contact-phone num-accent">{order.buyerPhone || "—"}</span>
        </div>
      </div>
    </article>
  );
}

/* ---------- نافذة إدارة الطلب الموحدة ---------- */

function ManageOrderModal({
  order,
  selectedStatus,
  setSelectedStatus,
  deliveryCode,
  setDeliveryCode,
  onClose,
  onSaveStatus,
  onConfirmDelivery,
  onPrint,
  isConfirmSubmitting,
}) {
  return (
    <div className="shipping-modal-backdrop" onClick={onClose}>
      <div className="shipping-modal manage-modal" onClick={(e) => e.stopPropagation()}>
        <div className="shipping-modal-header">
          <h3>إدارة الطلب #<span>{order.orderNumber || order.id}</span></h3>
          <button type="button" className="shipping-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="shipping-modal-body">
          {/* القسم الأول: حالة الطلب */}
          <section className="manage-section">
            <h4 className="manage-section-title">القسم الأول: حالة الطلب</h4>
            <div className="status-options-grid">
              {SHIPPING_STATUS_ACTIONS.map((action) => (
                <label
                  key={action.key}
                  className={`status-radio-label ${selectedStatus === action.key ? "active" : ""}`}
                >
                  <input
                    type="radio"
                    name="orderStatus"
                    value={action.key}
                    checked={selectedStatus === action.key}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                  />
                  <span>{getOrderStatusLabel(action.code)}</span>
                </label>
              ))}
              <button type="button" className="manage-action-btn primary" onClick={onSaveStatus}>
                حفظ
              </button>
            </div>
          </section>

          <hr className="manage-divider" />

          {/* القسم الثاني: تأكيد التسليم */}
          <section className="manage-section">
            <h4 className="manage-section-title">القسم الثاني: تأكيد التسليم</h4>
            <div className="delivery-confirm-row">
              <input
                type="text"
                className="delivery-code-input"
                placeholder="حقل إدخال كود..."
                value={deliveryCode}
                onChange={(e) => setDeliveryCode(e.target.value)}
              />
              <button
                type="button"
                className="manage-action-btn success"
                onClick={onConfirmDelivery}
                disabled={isConfirmSubmitting}
              >
                {isConfirmSubmitting ? "جارِ التأكيد..." : "تأكيد التسليم"}
              </button>
            </div>
            {order.status === "delivered" && (
              <p className="status-success-text">✔ تم التسليم</p>
            )}
          </section>

          <hr className="manage-divider" />

          {/* القسم الثالث: الطباعة */}
          <section className="manage-section">
            <h4 className="manage-section-title">القسم الثالث: الطباعة</h4>
            <button type="button" className="print-large-btn" onClick={onPrint}>
              <Printer size={20} />
              <span>🖨 طباعة الكرت</span>
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
