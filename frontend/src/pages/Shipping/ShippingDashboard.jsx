// ShippingDashboard.jsx - تصميم كرت الشحن وفق التصور الجديد مع الحفاظ على المنطق البرمجي

import "./ShippingDashboard.css";
import { useEffect, useMemo, useState } from "react";
import {
  MapPin,
  Phone,
  Mail,
  Building2,
  Calendar,
  AlertCircle,
  Filter,
  RefreshCw,
  CheckCircle2,
  Save,
  X,
  Printer,
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

function formatDateTime(value) {
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
    });
  } catch {
    return "";
  }
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
    return API_BASE_URL ? `${API_BASE_URL}/${trimmed}` : `/${trimmed}`;
  }

  // في باقي الحالات نعامله كمسار نسبي تحت الـ API
  return API_BASE_URL ? `${API_BASE_URL}/${trimmed}` : trimmed;
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
        } catch {}
        setTimeout(() => {
          try {
            URL.revokeObjectURL(url);
          } catch {}
        }, 2500);
      },
      { once: true }
    );
  } catch (err) {
    console.error("❌ Print window error:", err);
    if (showToast) showToast("تعذّر تجهيز نافذة الطباعة.", "error");
  }
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

    const orderId = order._id || order.id;
    const createdAt = order.createdAt || order.created_at || order.date;
    const dateFormatted = formatDateTime(createdAt) || order.date || "";

    const buyerName =
      order.buyer?.name ||
      order.shippingAddress?.fullName ||
      order.shippingAddress?.name ||
      "—";

    const city = order.shippingAddress?.city || "—";

    const paymentRaw = order.paymentMethod || order.payment_method;
    const paymentMethod =
      paymentRaw === "COD"
        ? "عند الاستلام"
        : paymentRaw === "Online"
        ? "دفع إلكتروني"
        : paymentRaw || "—";

    const baseStatus =
      order.status || order.orderStatus || order.state || "processing";

    const orderNumber =
      order.orderNumber ||
      order.code ||
      order.orderCode ||
      (orderId ? String(orderId).slice(-6) : "—");

    const items = order.orderItems || order.items || [];

    const orderShippingStatusRaw =
      order.shippingStatus || order.shipping_status || null;

    items.forEach((item, idx) => {
      if (!item) return;

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

      let createdAtDate = null;
      if (createdAt) {
        const d = new Date(createdAt);
        if (!Number.isNaN(d.getTime())) {
          createdAtDate = d;
        }
      }

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

      // 👇 عنوان البائع
      const rawStoreAddress =
        item.store?.address || order.store?.address || null;

      let sellerAddress = "—";

      if (rawStoreAddress) {
        if (typeof rawStoreAddress === "string") {
          sellerAddress = rawStoreAddress.trim() || "—";
        } else if (typeof rawStoreAddress === "object") {
          const sellerAddressParts = [
            rawStoreAddress.country,
            rawStoreAddress.city,
            rawStoreAddress.area,
            rawStoreAddress.street,
            rawStoreAddress.details,
          ].filter(Boolean);

          if (sellerAddressParts.length > 0) {
            sellerAddress = sellerAddressParts.join("، ");
          }
        }
      }

      if (sellerAddress === "—" && order.seller) {
        const fallbackParts = [];

        if (
          typeof order.seller.address === "string" &&
          order.seller.address.trim()
        ) {
          fallbackParts.push(order.seller.address.trim());
        }

        if (
          typeof order.seller.country === "string" &&
          order.seller.country.trim()
        ) {
          fallbackParts.push(order.seller.country.trim());
        }

        if (fallbackParts.length > 0) {
          sellerAddress = fallbackParts.join("، ");
        }
      }

      const buyerPhone =
        order.shippingAddress?.phone ||
        order.shippingAddress?.mobile ||
        order.buyer?.phone ||
        order.buyer?.mobile ||
        "—";

      const buyerEmail =
        order.buyer?.email || order.shippingAddress?.email || "—";

      const shippingAddressParts = [
        order.shippingAddress?.country,
        order.shippingAddress?.city,
        order.shippingAddress?.district ||
          order.shippingAddress?.neighborhood ||
          order.shippingAddress?.area,
        order.shippingAddress?.street,
        order.shippingAddress?.details ||
          order.shippingAddress?.additionalInfo,
      ].filter(Boolean);

      const shippingAddress =
        shippingAddressParts.length > 0
          ? shippingAddressParts.join("، ")
          : "—";

      const productDescription =
        item.product?.description ||
        item.description ||
        item.product?.shortDescription ||
        item.product?.details ||
        "";

      const productDimensions =
        item.product?.dimensions ||
        item.dimensions ||
        item.product?.size ||
        "";

      const productWeight =
        item.product?.weight || item.weight || item.product?.weightKg || "";

      // 👇 أولوية مصدر الصورة:
      // 1) الصورة المخزّنة في الـ orderItem (item.image / item.imageUrl)
      // 2) أول صورة من product.images
      // 3) حقول أخرى في product
      let rawProductImage = "";

      if (item.image) {
        rawProductImage = item.image;
      } else if (item.imageUrl) {
        rawProductImage = item.imageUrl;
      }

      if (
        !rawProductImage &&
        Array.isArray(item.product?.images) &&
        item.product.images.length > 0
      ) {
        const firstImg = item.product.images[0];
        if (typeof firstImg === "string") {
          rawProductImage = firstImg;
        } else if (firstImg && typeof firstImg === "object") {
          rawProductImage =
            firstImg.url ||
            firstImg.secure_url ||
            firstImg.path ||
            firstImg.location ||
            firstImg.imageUrl ||
            "";
        }
      }

      if (!rawProductImage) {
        rawProductImage =
          item.product?.mainImage ||
          item.product?.mainImageUrl ||
          item.product?.imageUrl ||
          item.product?.image ||
          "";
      }

      const productImage = buildProductImageUrl(rawProductImage);

      const shippingPrice =
        typeof order.shippingCost === "number"
          ? order.shippingCost
          : typeof order.shippingPrice === "number"
          ? order.shippingPrice
          : typeof item.shippingCost === "number"
          ? item.shippingCost
          : typeof item.shippingPrice === "number"
          ? item.shippingPrice
          : null;

      shipments.push({
        id: `${orderNumber}-${idx + 1}`,
        orderId,
        itemId,
        orderNumber,
        itemIndex: idx + 1,
        date: dateFormatted,
        createdAt: createdAtDate,
        city,
        buyerName,
        storeName,
        itemsCount: qty,
        unitPrice,
        total,
        paymentMethod,
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
      });
    });
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

function formatCurrency(value) {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  return `${value.toLocaleString("ar-SA")} ر.ي`;
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
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>ملصق شحن - طلب #${orderNumber}</title>
      <style>
        /* مقاس مناسب لملصق شحن (A6) */
        @page { size: A6 portrait; margin: 10mm; }

        body {
          font-family: system-ui, -apple-system, "Segoe UI", Tahoma, Arial, sans-serif;
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
              ${
                productImage
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

export default function ShippingDashboard() {
  const { showToast } = useApp() || {};

  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedOrderForStatus, setSelectedOrderForStatus] = useState(null);
  const [selectedStatusValue, setSelectedStatusValue] = useState("");

  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [selectedShipmentForConfirm, setSelectedShipmentForConfirm] =
    useState(null);
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

      if (showToast && !silent) {
        showToast("تم تحميل طلبات الشحن بنجاح.", "success");
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

undefined

  useEffect(() => {
    loadShippingOrders({ silent: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredOrders = useMemo(
    () => orders.filter((order) => matchesOrderFilter(order, statusFilter)),
    [orders, statusFilter]
  );

  const openStatusModal = (order) => {
    setSelectedOrderForStatus(order);

    // ✅ إصلاح حرج: اجعل القيمة المختارة ضمن الخيارات المسموحة فقط
    const current = order?.status || "";
    const initial = SHIPPING_ALLOWED_KEYS.includes(current)
      ? current
      : SHIPPING_ALLOWED_KEYS[0] || "on_the_way";

    setSelectedStatusValue(initial);
    setStatusModalOpen(true);
  };

  const closeStatusModal = () => {
    setStatusModalOpen(false);
    setSelectedOrderForStatus(null);
  };

  const handleStatusSave = async () => {
    if (!selectedOrderForStatus) {
      closeStatusModal();
      return;
    }

    // ✅ إصلاح حرج: لا ترسل قيم غير مسموحة للباك
    if (!STATUS_KEY_TO_CODE[selectedStatusValue]) {
      if (showToast) showToast("اختر حالة صحيحة من الخيارات المتاحة.", "warning");
      return;
    }

    try {
      // ✅ المنطق الجديد: تحديث حالة "منتج واحد داخل الطلب" باستخدام orderId + itemId
      let res = null;

      if (selectedOrderForStatus.orderId && selectedOrderForStatus.itemId) {
        res = await updateShippingOrderItemStatus(
          selectedOrderForStatus.orderId,
          selectedOrderForStatus.itemId,
          selectedStatusValue
        );
      } else if (selectedOrderForStatus.orderId) {
        // احتياط: لو لم يتوفر itemId لأي سبب نادر، نستخدم المسار القديم على مستوى الطلب كاملًا
        res = await updateShippingOrderStatus(
          selectedOrderForStatus.orderId,
          selectedStatusValue
        );
      } else {
        throw new Error(
          "لا توجد بيانات كافية لتحديث حالة هذه الشحنة (orderId/itemId مفقود)."
        );
      }

      // ✅ لو الباك رجّع order محدث: ندمجه داخل state
      const updatedOrderRaw =
        res?.order || res?.data?.order || null;

      if (updatedOrderRaw) {
        setOrders((prev) => mergeShipmentsFromUpdatedOrder(prev, updatedOrderRaw));
      } else {
        // fallback سلوكك السابق
        setOrders((prev) =>
          prev.map((o) => {
            if (o.id !== selectedOrderForStatus.id) return o;
            const newCode =
              STATUS_KEY_TO_CODE[selectedStatusValue] || o.statusCode || null;
            return {
              ...o,
              status: selectedStatusValue,
              statusCode: newCode,
            };
          })
        );
      }

      if (showToast) {
        showToast("تم تحديث حالة هذا المنتج داخل الطلب بنجاح.", "success");
      }
    } catch (error) {
      console.error("❌ تعذّر تحديث حالة المنتج داخل الطلب:", error);
      if (showToast) {
        showToast(
          "تعذّر تحديث حالة المنتج داخل الطلب، حاول مرة أخرى.",
          "error"
        );
      }
    } finally {
      closeStatusModal();
    }
  };

  const openConfirmModal = (shipment) => {
    setSelectedShipmentForConfirm(shipment);
    setDeliveryCodeInput("");
    setConfirmModalOpen(true);
  };

  const closeConfirmModal = () => {
    setConfirmModalOpen(false);
    setSelectedShipmentForConfirm(null);
    setDeliveryCodeInput("");
  };

  const handleConfirmDelivery = async () => {
    if (!selectedShipmentForConfirm) {
      closeConfirmModal();
      return;
    }

    if (!deliveryCodeInput.trim()) {
      if (showToast) {
        showToast("الرجاء إدخال كود التسليم.", "warning");
      }
      return;
    }

    if (
      !selectedShipmentForConfirm.orderId ||
      !selectedShipmentForConfirm.itemId
    ) {
      if (showToast) {
        showToast(
          "لا يمكن تأكيد التسليم لهذه الشحنة لعدم توفر بيانات كافية من الخادم.",
          "warning"
        );
      }
      closeConfirmModal();
      return;
    }

    setIsConfirmSubmitting(true);

    try {
      const res = await confirmDeliveryForItem(
        selectedShipmentForConfirm.orderId,
        selectedShipmentForConfirm.itemId,
        deliveryCodeInput.trim()
      );

      if (showToast) {
        showToast("تم تأكيد تسليم المنتج بنجاح.", "success");
      }

      // ✅ لو الباك رجّع order محدث: ندمجه داخل state
      const updatedOrderRaw =
        res?.order || res?.data?.order || null;

      if (updatedOrderRaw) {
        setOrders((prev) => mergeShipmentsFromUpdatedOrder(prev, updatedOrderRaw));
      } else {
        // fallback سلوكك السابق
        setOrders((prev) =>
          prev.map((o) =>
            o.id === selectedShipmentForConfirm.id
              ? {
                  ...o,
                  status: "delivered",
                  statusCode: ORDER_STATUS_CODES.DELIVERED,
                }
              : o
          )
        );
      }

      closeConfirmModal();
    } catch (error) {
      console.error("❌ تعذّر تأكيد التسليم:", error);
      if (showToast) {
        showToast(
          "كود التسليم غير صحيح أو حدث خطأ أثناء التأكيد. حاول مرة أخرى.",
          "error"
        );
      }
    } finally {
      setIsConfirmSubmitting(false);
    }
  };

  // ✅ طباعة ملصق الشحن (PDF من نافذة الطباعة)
  const handlePrintLabel = (shipment) => {
    try {
      if (!shipment) return;

      const html = buildPrintLabelHtml(shipment);

      if (!html || typeof html !== "string" || html.trim().length < 50) {
        console.error("❌ Print HTML is empty/invalid");
        if (showToast) showToast("تعذّر إنشاء قالب الطباعة.", "error");
        return;
      }

      // ✅ حل ثابت: فتح صفحة HTML عبر Blob URL (بدل about:blank + document.write)
      openPrintWindowWithBlob(html, showToast);
    } catch (err) {
      console.error("❌ تعذّر طباعة الملصق:", err);
      if (showToast) showToast("تعذّر تجهيز كرت الطباعة.", "error");
    }
  };

  return (
    <div className="page-container shipping-page">
      <OrdersTab
        orders={filteredOrders}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        openStatusModal={openStatusModal}
        openConfirmModal={openConfirmModal}
        onPrintLabel={handlePrintLabel}
        isLoading={isLoading || isRefreshing}
        onRefresh={() => loadShippingOrders({ silent: true })}
      />

      {statusModalOpen && selectedOrderForStatus && (
        <StatusModal
          order={selectedOrderForStatus}
          selectedStatus={selectedStatusValue}
          setSelectedStatus={setSelectedStatusValue}
          onClose={closeStatusModal}
          onSave={handleStatusSave}
        />
      )}

      {confirmModalOpen && selectedShipmentForConfirm && (
        <ConfirmDeliveryModal
          shipment={selectedShipmentForConfirm}
          deliveryCode={deliveryCodeInput}
          setDeliveryCode={setDeliveryCodeInput}
          onClose={closeConfirmModal}
          onConfirm={handleConfirmDelivery}
          isSubmitting={isConfirmSubmitting}
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
  openStatusModal,
  openConfirmModal,
  onPrintLabel,
  isLoading,
  onRefresh,
}) {
  return (
    <section className="shipping-orders-section">
      <div className="shipping-orders-header">
        <div>
          <h2 className="shipping-orders-title">طلبات الشحن</h2>
          <p className="shipping-orders-subtitle">
            إدارة وتتبع جميع الطلبات المسندة إلى شركة الشحن.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
          <button
            type="button"
            className="shipping-orders-back-btn"
            onClick={onRefresh}
            disabled={isLoading}
          >
            <RefreshCw size={14} />
            <span>{isLoading ? "جار التحديث..." : "تحديث الطلبات"}</span>
          </button>
        </div>
      </div>

      <div className="shipping-orders-filters">
        <div className="shipping-status-filter">
          <span className="shipping-status-filter-label">
            <Filter size={14} />
            <span>تصفية حسب حالة الطلب</span>
          </span>
          <div className="shipping-status-select-wrapper">
            <select
              className="shipping-status-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">إجمالي الشحنات</option>
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

      <div className="shipping-orders-list">
        {isLoading ? (
          <div className="shipping-orders-empty">
            <AlertCircle size={18} />
            <span>جار تحميل طلبات الشحن...</span>
          </div>
        ) : orders.length === 0 ? (
          <div className="shipping-orders-empty">
            <AlertCircle size={18} />
            <span>لا توجد طلبات بهذه الحالة حالياً.</span>
          </div>
        ) : (
          orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              openStatusModal={openStatusModal}
              openConfirmModal={openConfirmModal}
              onPrintLabel={onPrintLabel}
            />
          ))
        )}
      </div>
    </section>
  );
}

/* ---------- كرت الطلب ---------- */

function OrderCard({ order, openStatusModal, openConfirmModal, onPrintLabel }) {
  const unifiedLabel = order.statusCode
    ? getOrderStatusLabel(order.statusCode)
    : "غير محدد";

  const visualKey = mapUnifiedStatusCodeToVisualKey(
    order.statusCode,
    order.rawStatusText
  );
  const conf = statusConfig[visualKey] || {};

  const isDemo = !order.orderId || !order.itemId;

  const shippingPriceDisplay =
    typeof order.shippingPrice === "number"
      ? `${order.shippingPrice.toLocaleString()} ر.ي`
      : "—";

  const unitPriceDisplay =
    typeof order.unitPrice === "number"
      ? `${order.unitPrice.toLocaleString()} ر.ي`
      : "—";

  const totalDisplay =
    typeof order.total === "number"
      ? `${order.total.toLocaleString()} ر.ي`
      : "—";

  const orderNumberText = order.orderNumber || order.id;
  const itemIndexText =
    typeof order.itemIndex === "number" ? order.itemIndex : null;

  // تجميع تفاصيل المنتج (الوصف + الأبعاد + الوزن)
  let productFullDescription = order.productDescription || "";
  const extraPieces = [];
  if (order.productDimensions) {
    extraPieces.push(`الأبعاد: ${order.productDimensions}`);
  }
  if (order.productWeight) {
    extraPieces.push(`الوزن: ${order.productWeight}`);
  }
  if (extraPieces.length > 0) {
    const extra = extraPieces.join(" - ");
    productFullDescription = productFullDescription
      ? `${productFullDescription} (${extra})`
      : extra;
  }

  return (
    <article className="shipping-order-card">
      {/* الشريط العلوي: رقم الطلب + رقم المنتج | التاريخ | حالة الطلب */}
      <div className="shipping-order-top-row">
        {/* يمين: رقم الطلب + رقم المنتج */}
        <div className="shipping-order-top-col shipping-order-top-col-id">
          <div className="shipping-order-id-line">
            <span className="shipping-order-id-label">رقم الطلب</span>
            <span className="shipping-order-id-value">#{orderNumberText}</span>
            {itemIndexText && (
              <>
                <span className="shipping-order-id-separator" />
                <span className="shipping-order-item-index">{itemIndexText}</span>
              </>
            )}
          </div>
        </div>

        {/* الوسط: التاريخ */}
        <div className="shipping-order-top-col shipping-order-top-col-date">
          <div className="shipping-order-date-rect">
            <Calendar size={13} />
            <span>{order.date}</span>
          </div>
        </div>

        {/* اليسار: حالة الطلب (مستطيل ناعم) */}
        <div className="shipping-order-top-col shipping-order-top-col-status">
          <span
            className={
              "shipping-status-chip shipping-status-chip-lg " +
              (conf.colorClass || "")
            }
          >
            {unifiedLabel}
          </span>
        </div>
      </div>

      {/* الجسم الرئيسي للكرت */}
      <div className="shipping-order-main-layout">
        <div className="shipping-order-details-grid shipping-order-details-grid-main">
          {/* بيانات المشتري */}
          <section className="shipping-order-section shipping-order-section-card">
            <h4 className="shipping-order-section-title">بيانات المشتري</h4>
            <div className="shipping-order-section-body">
              <div className="shipping-order-person-name">
                {order.buyerName || "—"}
              </div>
              <div className="shipping-order-person-address">
                {order.shippingAddress || "—"}
              </div>
              <div className="shipping-order-inline-row">
                <span className="shipping-order-inline-item">
                  <Phone size={13} />
                  <span>{order.buyerPhone || "—"}</span>
                </span>
                <span className="shipping-order-inline-item">
                  <Mail size={13} />
                  <span>{order.buyerEmail || "—"}</span>
                </span>
              </div>
            </div>
          </section>

          {/* بيانات البائع */}
          <section className="shipping-order-section shipping-order-section-card">
            <h4 className="shipping-order-section-title">بيانات البائع</h4>
            <div className="shipping-order-section-body">
              <div className="shipping-order-person-name">
                {order.storeName || "—"}
              </div>
              <div className="shipping-order-person-address">
                {order.sellerAddress || "—"}
              </div>
              <div className="shipping-order-inline-row">
                <span className="shipping-order-inline-item">
                  <Phone size={13} />
                  <span>{order.sellerPhone || "—"}</span>
                </span>
                <span className="shipping-order-inline-item">
                  <Mail size={13} />
                  <span>{order.sellerEmail || "—"}</span>
                </span>
              </div>
            </div>
          </section>

          {/* بطاقة المنتج */}
          <section className="shipping-order-section shipping-order-section-card shipping-order-section-product">
            <h4 className="shipping-order-section-title">معلومات السلعة</h4>

            <div className="shipping-order-product-layout">
              {order.productImage && (
                <div className="shipping-order-product-image-wrapper">
                  <img
                    src={order.productImage}
                    alt={order.productName || "المنتج"}
                    className="shipping-order-product-image"
                  />
                </div>
              )}

              <div className="shipping-order-product-info">
                {/* الكمية: الرقم قريب من الكلمة */}
                <div className="shipping-order-qty-row">
                  <span className="shipping-order-qty-label">الكمية:</span>
                  <span className="shipping-order-qty-value">{order.itemsCount}</span>
                </div>

                <div className="shipping-order-product-name">
                  {order.productName || "—"}
                </div>

                <div className="shipping-order-product-desc">
                  {productFullDescription || "—"}
                </div>

                <div className="shipping-order-product-price">
                  {totalDisplay !== "—" ? totalDisplay : unitPriceDisplay}
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* رسوم الشحن + طريقة الدفع + الشريط السفلي */}
        <section className="shipping-order-section shipping-order-section-shippingwide">
          {/* تم حذف عنوان "معلومات الشحن" حتى يصغر الفراغ */}
          <div className="shipping-order-shipping-info-row">
            <div className="shipping-order-field-row">
              <span className="shipping-order-field-label">رسوم الشحن</span>
              <span className="shipping-order-field-value">{shippingPriceDisplay}</span>
            </div>

            <div className="shipping-order-field-row">
              <span className="shipping-order-field-label">طريقة الدفع</span>
              <span className="shipping-order-field-value">
                {order.paymentMethod || "—"}
              </span>
            </div>
          </div>

          <div className="shipping-order-footer-bar">
            {/* يسار: زر تأكيد التسليم + زر الطباعة */}
            <div className="shipping-order-footer-left">
              <button
                type="button"
                className="shipping-order-action-btn primary"
                onClick={() => openConfirmModal(order)}
                disabled={isDemo}
                title={
                  isDemo
                    ? "هذه الشحنة لا تحتوي على بيانات كافية لتأكيد التسليم من الخادم."
                    : "تأكيد التسليم لهذا المنتج عبر كود التسليم من المشتري."
                }
              >
                <CheckCircle2 size={14} />
                <span>تأكيد التسليم</span>
              </button>

              <button
                type="button"
                className="shipping-order-action-btn secondary"
                onClick={() => onPrintLabel?.(order)}
                disabled={false}
                title={
                  isDemo
                    ? "طباعة ملصق الشحن (قد تنقص بعض البيانات القادمة من الخادم)."
                    : "طباعة ملصق الشحن (يمكن حفظه PDF من نافذة الطباعة)."
                }
              >
                <Printer size={14} />
                <span>طباعة الكرت</span>
              </button>
            </div>

            {/* يمين: تغيير حالة الطلب */}
            <div className="shipping-order-footer-right">
              <button
                type="button"
                className="shipping-order-status-dropdown"
                onClick={() => openStatusModal(order)}
              >
                <span className="shipping-order-status-dropdown-label">
                  تغيير حالة الطلب
                </span>
                <span
                  className={
                    "shipping-status-chip shipping-status-chip-sm " +
                    (conf.colorClass || "")
                  }
                >
                  {unifiedLabel}
                </span>
              </button>
            </div>
          </div>
        </section>
      </div>
    </article>
  );
}

/* ---------- مودال تحديث الحالة ---------- */

function StatusModal({ order, selectedStatus, setSelectedStatus, onClose, onSave }) {
  return (
    <div className="shipping-modal-backdrop">
      <div className="shipping-modal">
        <div className="shipping-modal-header">
          <h3>تحديث حالة الشحنة</h3>
          <button type="button" className="shipping-modal-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <p className="shipping-modal-subtitle">
          رقم الشحنة: <strong>{order.id}</strong>
        </p>

        <div className="shipping-modal-body">
          <div className="shipping-modal-status-options">
            {SHIPPING_STATUS_ACTIONS.map((action) => {
              const statusKey = action.key;
              const conf = statusConfig[statusKey] || {};
              const label = getOrderStatusLabel(action.code);
              return (
                <label
                  key={statusKey}
                  className={
                    "shipping-modal-status-option" +
                    (selectedStatus === statusKey
                      ? " shipping-modal-status-option-active"
                      : "")
                  }
                >
                  <input
                    type="radio"
                    name="shipmentStatus"
                    value={statusKey}
                    checked={selectedStatus === statusKey}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                  />
                  <span className={"shipping-status-chip " + (conf.colorClass || "")}>
                    {label}
                  </span>
                </label>
              );
            })}
          </div>
          <p className="shipping-modal-note">
            يمكن لشركة الشحن تعديل الحالة فقط إلى <strong>في الشحن</strong> و{" "}
            <strong>ملغى من قبل الشحن</strong>. أما الحالات التي تبدأ بـ{" "}
            <strong>عند البائع</strong> فهي من صلاحية البائع، و{" "}
            <strong>ملغى من قبل المدير</strong> من صلاحية المدير فقط. حالة{" "}
            <strong>تم التسليم</strong> لا يمكن الوصول إليها إلا من خلال تأكيد كود
            التسليم.
          </p>
        </div>

        <div className="shipping-modal-footer">
          <button type="button" className="shipping-modal-btn ghost" onClick={onClose}>
            إلغاء
          </button>
          <button type="button" className="shipping-modal-btn primary" onClick={onSave}>
            <Save size={15} />
            <span>حفظ التغييرات</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- مودال تأكيد التسليم ---------- */

function ConfirmDeliveryModal({
  shipment,
  deliveryCode,
  setDeliveryCode,
  onClose,
  onConfirm,
  isSubmitting,
}) {
  return (
    <div className="shipping-modal-backdrop">
      <div className="shipping-modal">
        <div className="shipping-modal-header">
          <h3>تأكيد تسليم المنتج</h3>
          <button type="button" className="shipping-modal-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <p className="shipping-modal-subtitle">
          رقم الطلب: <strong>{shipment.id}</strong>
          {shipment.productName && (
            <>
              {" "}
              · المنتج: <strong>{shipment.productName}</strong>
            </>
          )}
        </p>

        <div className="shipping-modal-body">
          <div className="shipping-profile-field">
            <div className="shipping-profile-field-label-row">
              <span className="shipping-profile-field-label">
                أدخل كود التسليم الذي يظهر في صفحة طلبات المشتري
              </span>
            </div>
            <input
              type="text"
              className="shipping-profile-input"
              value={deliveryCode}
              onChange={(e) => setDeliveryCode(e.target.value)}
              placeholder="مثال: 123456"
              inputMode="numeric"
            />
          </div>
          <p className="shipping-modal-note">
            لا يتم عرض كود التسليم في لوحة شركة الشحن لأسباب أمنية، يجب أن تحصل
            عليه مباشرة من المشتري عند التسليم، ثم تدخله هنا لتأكيد استلامه للمنتج.
          </p>
        </div>

        <div className="shipping-modal-footer">
          <button
            type="button"
            className="shipping-modal-btn ghost"
            onClick={onClose}
            disabled={isSubmitting}
          >
            إلغاء
          </button>
          <button
            type="button"
            className="shipping-modal-btn primary"
            onClick={onConfirm}
            disabled={isSubmitting}
          >
            <CheckCircle2 size={15} />
            <span>{isSubmitting ? "جار التأكيد..." : "تأكيد التسليم"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
