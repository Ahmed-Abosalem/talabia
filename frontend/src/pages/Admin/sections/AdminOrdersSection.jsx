// src/pages/Admin/sections/AdminOrdersSection.jsx
// إدارة الطلبات في لوحة الأدمن – عرض على مستوى المنتج داخل الطلب (Item)
// مع نافذة منبثقة لتفاصيل الطلب، وفصل التنسيقات في ملف CSS مستقل

import { useEffect, useState } from "react";
import { ClipboardList, RefreshCw, X } from "lucide-react";
import {
  getAdminOrders,
  updateOrderItemStatus,
  cancelOrderItemAsAdmin,
} from "@/services/adminService";
import { useApp } from "@/context/AppContext";
import { listCategories } from "@/services/categoryService";

// ✅ المعجم الموحّد لحالات الطلب
import {
  ORDER_STATUS_CODES,
  normalizeOrderStatusCode,
  getOrderStatusLabel,
} from "@/config/orderStatus";

import "./AdminOrdersSection.css";

/**
 * ✅ تعديل إنتاجي آمن جداً:
 * بعض البيانات القديمة قد تخزّن صورة المنتج كـ "اسم ملف فقط" مثل:
 * file-123.jpg أو 4-123.png
 * وهذا يجعل المتصفح يحاول تحميلها من جذر الفرونت (مثل: http://localhost:5174/file-123.jpg)
 * فتفشل (TIMED_OUT).
 *
 * هذه الدالة توحّد رابط الصورة:
 * - إذا كان /uploads/... تتركه كما هو
 * - إذا كان رابط كامل وفيه /uploads/... تقصه لمسار نسبي ليستفيد من proxy
 * - إذا كان اسم ملف فقط → تحوله إلى /uploads/products/<filename>
 */
function resolveProductImageSrc(src) {
  if (!src) return "";

  const raw = String(src).trim();
  if (!raw) return "";

  // data/blob لا نغيّرها
  if (raw.startsWith("data:") || raw.startsWith("blob:")) return raw;

  // رابط كامل: إن كان يحتوي /uploads/ نحوله لمسار نسبي ليستفيد من proxy
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    const idx = raw.indexOf("/uploads/");
    if (idx !== -1) return raw.slice(idx);
    return raw;
  }

  // مسار uploads صحيح
  if (raw.startsWith("/uploads/")) return raw;
  if (raw.startsWith("uploads/")) return `/${raw}`;

  // مسار بدون /uploads كبادئة
  if (raw.startsWith("products/")) return `/uploads/${raw.replace(/^\/+/, "")}`;

  // ✅ اسم ملف فقط (المشكلة الأساسية)
  if (!raw.includes("/")) return `/uploads/products/${raw.replace(/^\/+/, "")}`;

  return raw;
}

/**
 * تنسيق عنوان مركّب من كائن عنوان
 */
function formatAddress(address) {
  if (!address) return "";
  if (typeof address === "string") return address;

  // ✅ توحيد ترتيب العنوان وفق ما اتفقنا عليه في التسجيل/صفحة البائع/شركة الشحن:
  // الدولة → المدينة → المديرية → الحي → بقية التفاصيل
  const country = (address.country || "").toString().trim();
  const city = (address.city || "").toString().trim();

  // بعض المصادر قد تُسميها district بدل area
  const directorate = (
    address.area ||
    address.district ||
    address.directorate ||
    address.municipality ||
    ""
  )
    .toString()
    .trim();

  // بعض المصادر قد تُسميها neighborhood بدل street
  const neighborhood = (
    address.street ||
    address.neighborhood ||
    address.quarter ||
    address.hay ||
    ""
  )
    .toString()
    .trim();

  const details = (
    address.details ||
    address.moreDetails ||
    address.addressLine ||
    ""
  )
    .toString()
    .trim();

  const parts = [country, city, directorate, neighborhood, details]
    .filter(Boolean)
    .map((p) => String(p).trim())
    .filter(Boolean);

  return parts.join(" - ");
}

/**
 * تنسيق طريقة الدفع إلى نص عربي مقروء
 */
function formatPaymentMethod(method) {
  if (!method) return "";
  const code = String(method).toUpperCase();

  switch (code) {
    case "COD":
    case "CASH_ON_DELIVERY":
      return "الدفع عند الاستلام";
    case "ONLINE":
    case "CARD":
    case "CREDIT_CARD":
      return "دفع إلكتروني";
    case "BANK_TRANSFER":
      return "تحويل بنكي";
    default:
      // في حال كانت قيمة أخرى، نرجعها كما هي
      return method;
  }
}

/**
 * تحويل قائمة الطلبات الخام من الـ API إلى عناصر مسطّحة على مستوى المنتج داخل الطلب
 * كل عنصر يمثل: "منتج داخل طلب" مع كل البيانات اللازمة للعرض
 */
function normalizeAdminOrdersFromApi(rawOrders) {
  if (!Array.isArray(rawOrders)) return [];

  const items = [];

  rawOrders.forEach((order) => {
    if (!order) return;

    const orderId = order._id || order.id || order.orderId;
    const createdAt = order.createdAt || order.date || null;

    const buyerName =
      order.buyer?.name ||
      order.buyerName ||
      order.shippingAddress?.fullName ||
      order.shippingAddress?.name ||
      "";
    const buyerPhone =
      order.buyer?.phone ||
      order.shippingAddress?.phone ||
      order.shippingAddress?.phoneNumber ||
      order.shippingAddress?.mobile ||
      "";
    const buyerEmail = order.buyer?.email || order.buyerEmail || "";
    const buyerAddress = formatAddress(order.shippingAddress);

    const storeId = order.store?._id || order.store || null;
    const storeName =
      order.store?.name || order.storeName || order.seller?.storeName || "";
    const storePhone =
      order.store?.phone || order.seller?.phone || order.sellerPhone || "";
    const storeEmail =
      order.store?.email || order.seller?.email || order.sellerEmail || "";
    const storeAddress = formatAddress(order.store?.address);

    const shippingCompanyId =
      order.shippingCompany?._id || order.shippingCompany || null;
    const shippingCompanyName =
      order.shippingCompany?.name || order.shippingCompanyName || "";

    const paymentMethodRaw =
      order.paymentMethod ||
      order.payment_method ||
      order.paymentType ||
      "";
    const paymentMethod = formatPaymentMethod(paymentMethodRaw);

    const paymentSubMethodRaw = order.paymentSubMethod || order.payment_sub_method || "";
    const paymentSubMethod = paymentSubMethodRaw ? String(paymentSubMethodRaw).toUpperCase() : "";
    const bankTransferSenderName = order.bankTransferSenderName || order.bank_transfer_sender_name || "";
    const bankTransferReferenceNumber = order.bankTransferReferenceNumber || order.bank_transfer_reference_number || "";

    const paymentMethodUi =
      paymentSubMethod === "BANK_TRANSFER"
        ? "تحويل بنكي"
        : paymentSubMethod === "CARD"
        ? "دفع إلكتروني"
        : paymentMethod;


    const baseStatusCode =
      order.statusCode || normalizeOrderStatusCode(order) || null;

    const shippingPrice =
      order.shippingPrice != null ? Number(order.shippingPrice) : null;

    // رقم الطلب المختصر الموحّد (آخر 6 خانات أو حقل كود جاهز)
    const rawOrderIdForCode = order.id || order._id || order.orderId;
    const orderNumber =
      order.orderNumber ||
      order.code ||
      order.orderCode ||
      (rawOrderIdForCode ? String(rawOrderIdForCode).slice(-6) : "");

    const orderItems = Array.isArray(order.orderItems) ? order.orderItems : [];

    orderItems.forEach((item, index) => {
      if (!item) return;

      const itemId = item._id || item.id || `${orderId}-${index + 1}`;

      const statusCode = item.statusCode || baseStatusCode || null;

      const qty = item.qty ?? 1;
      const unitPrice = item.price ?? 0;
      const lineTotal = qty * unitPrice;

      const productName =
        item.name || item.productName || item.product?.name || "";
      const productImage =
        item.image || item.product?.mainImage || item.product?.image || "";

      // محاولة استخراج التصنيف بأكثر من شكل (اسم + معرّف)
      let productCategory = "";
      let productCategoryId = "";

      const catFromProduct =
        item.product?.category != null ? item.product.category : item.category;

      if (catFromProduct) {
        if (typeof catFromProduct === "string") {
          // في هذه الحالة غالبًا هذا هو المعرّف (ID) للقسم
          productCategoryId = catFromProduct;
        } else if (typeof catFromProduct === "object") {
          productCategoryId = catFromProduct._id || catFromProduct.id || "";
          productCategory = catFromProduct.name || catFromProduct.title || "";
        }
      }

      // fallback من حقول إضافية إن وُجدت
      if (!productCategory && item.categoryName) {
        productCategory = item.categoryName;
      }
      if (!productCategoryId && item.categoryId) {
        productCategoryId = item.categoryId;
      }

      if (!productCategory) {
        productCategory = "غير محدد";
      }

      const productDescription =
        item.product?.description || item.description || "";

      const sellerAmount =
        item.sellerAmount != null ? Number(item.sellerAmount) : null;
      const platformCommission =
        item.platformCommission != null ? Number(item.platformCommission) : null;

      const compositeNumber =
        orderNumber && orderNumber !== ""
          ? `${orderNumber}-${index + 1}`
          : orderId
          ? `${orderId}-${index + 1}`
          : `${index + 1}`;

      items.push({
        id: itemId,
        orderId,
        orderNumber,
        itemIndex: index + 1,
        compositeNumber,
        createdAt,
        buyerName,
        buyerPhone,
        buyerEmail,
        buyerAddress,
        storeId,
        storeName,
        storePhone,
        storeEmail,
        storeAddress,
        productName,
        productImage,
        productCategory,
        productCategoryId,
        productDescription,
        qty,
        unitPrice,
        lineTotal,
        shippingCompanyId,
        shippingCompanyName,
        paymentMethod: paymentMethodUi,
        paymentMethodRaw,
        paymentSubMethod,
        bankTransferSenderName,
        bankTransferReferenceNumber,

        shippingPrice,
        sellerAmount,
        platformCommission,
        statusCode,
      });
    });
  });

  // ترتيب تنازلي حسب تاريخ إنشاء الطلب
  items.sort((a, b) => {
    const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return db - da;
  });

  return items;
}

export default function AdminOrdersSection() {
  const { showToast } = useApp() || {};

  const [items, setItems] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyOrderId, setBusyOrderId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [categories, setCategories] = useState([]);

  const [selectedItem, setSelectedItem] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  useEffect(() => {
    loadOrders();
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadOrders() {
    try {
      setLoading(true);
      setErrorMessage("");
      const data = await getAdminOrders();
      const rawOrders = Array.isArray(data?.orders)
        ? data.orders
        : Array.isArray(data)
        ? data
        : [];

      const normalizedItems = normalizeAdminOrdersFromApi(rawOrders);
      setItems(normalizedItems);
    } catch (err) {
      const msg =
        err?.response?.data?.message || err?.message || "تعذّر تحميل الطلبات.";
      setErrorMessage(msg);
      showToast?.(msg, "error");
    } finally {
      setLoading(false);
    }
  }

  // تحميل الأقسام لتحويل الـ ID إلى اسم القسم
  async function loadCategories() {
    try {
      const data = await listCategories();
      const rawCategories = Array.isArray(data?.categories)
        ? data.categories
        : Array.isArray(data)
        ? data
        : [];

      setCategories(Array.isArray(rawCategories) ? rawCategories : []);
    } catch (err) {
      const msg =
        err?.response?.data?.message || err?.message || "تعذّر تحميل الأقسام.";
      showToast?.(msg, "error");
    }
  }

  // تحويل بيانات التصنيف إلى اسم عربي واضح للعرض
  function getCategoryLabel(item) {
    if (!item) return "غير محدد";

    const rawName = item.productCategory;
    const rawId = item.productCategoryId;

    // لو عندنا اسم جاهز وليس مجرد "غير محدد"
    if (rawName && rawName !== "غير محدد") {
      // لو الاسم نفسه يطابق ID من 24 خانة، نحاول استبداله بالاسم من الأقسام
      const isLikelyId =
        typeof rawName === "string" &&
        rawName.length === 24 &&
        /^[0-9a-fA-F]+$/.test(rawName);

      if (!isLikelyId) {
        return rawName;
      }
    }

    const idToMatch = rawId || rawName;

    if (idToMatch && Array.isArray(categories) && categories.length > 0) {
      const match = categories.find((cat) => {
        const catId = cat._id || cat.id || cat.value;
        return catId && String(catId) === String(idToMatch);
      });

      if (match && (match.name || match.title)) {
        return match.name || match.title;
      }
    }

    if (rawName && rawName !== "") {
      return rawName;
    }

    return "غير محدد";
  }

  function filteredItems() {
    const trimmedSearch = search.trim().toLowerCase();

    return items.filter((item) => {
      if (
        statusFilter !== "all" &&
        statusFilter &&
        item.statusCode &&
        item.statusCode !== statusFilter
      ) {
        return false;
      }

      if (trimmedSearch) {
        const haystack = [
          item.compositeNumber,
          item.orderNumber,
          item.orderId,
          item.buyerName,
          item.storeName,
          item.productName,
          item.paymentMethod,
          item.paymentMethodRaw,
          item.shippingCompanyName,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(trimmedSearch)) {
          return false;
        }
      }

      return true;
    });
  }

  async function handleStatusChange(item, newStatusCode) {
    const orderId = item.orderId;
    const itemId = item.id;
    if (!orderId || !itemId) return;

    try {
      setBusyOrderId(orderId);

      if (newStatusCode === ORDER_STATUS_CODES.CANCELLED_BY_ADMIN) {
        const reason =
          window.prompt("سبب إلغاء هذا المنتج داخل الطلب (اختياري):") || "";
        const ok = window.confirm("هل أنت متأكد من إلغاء هذا المنتج فقط داخل الطلب؟");
        if (!ok) {
          setBusyOrderId(null);
          return;
        }

        await cancelOrderItemAsAdmin(orderId, itemId, reason);
        showToast?.("تم إلغاء هذا المنتج داخل الطلب.", "success");
      } else {
        await updateOrderItemStatus(orderId, itemId, newStatusCode);
        showToast?.("تم تحديث حالة هذا المنتج داخل الطلب.", "success");
      }

      await loadOrders();
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "تعذّر تحديث حالة المنتج داخل الطلب أو إلغاؤه.";
      setErrorMessage(msg);
      showToast?.(msg, "error");
    } finally {
      setBusyOrderId(null);
    }
  }

  function openDetails(item) {
    setSelectedItem(item);
    setIsDetailsOpen(true);
  }

  function closeDetails() {
    setIsDetailsOpen(false);
    setSelectedItem(null);
  }

  const list = filteredItems();

  return (
    <section className="admin-orders-section">
      <div className="admin-orders-header">
        <div className="admin-orders-header-main">
          <div className="admin-orders-icon">
            <ClipboardList size={18} />
          </div>
          <div>
            <div className="admin-orders-title">إدارة الطلبات</div>
            <div className="admin-orders-subtitle">
              عرض وإدارة الطلبات على مستوى كل منتج داخل الطلب، مع التحكم في الحالة
              الموحّدة وعرض شركة الشحن المسؤولة، ونافذة تفاصيل لكل عنصر.
            </div>
          </div>
        </div>
        <div className="admin-orders-actions">
          <button
            type="button"
            className="admin-orders-btn admin-orders-btn-ghost"
            onClick={loadOrders}
            disabled={loading}
          >
            <RefreshCw size={14} />
            <span>تحديث</span>
          </button>
        </div>
      </div>

      <div className="admin-orders-toolbar">
        <input
          className="admin-orders-search"
          placeholder="بحث برقم الطلب أو المشتري أو المتجر أو المنتج..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          className="admin-orders-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">كل الحالات</option>
          {Object.values(ORDER_STATUS_CODES).map((code) => (
            <option key={code} value={code}>
              {getOrderStatusLabel(code)}
            </option>
          ))}
        </select>
      </div>

      {errorMessage && <div className="admin-orders-error">{errorMessage}</div>}

      <div className="admin-orders-table-wrapper">
        {loading ? (
          <div className="admin-orders-empty-state">جاري تحميل الطلبات...</div>
        ) : list.length === 0 ? (
          <div className="admin-orders-empty-state">
            لا توجد عناصر طلب مطابقة لخيارات البحث / التصفية.
          </div>
        ) : (
          <table className="admin-orders-table">
            <thead>
              <tr>
                <th>رقم الطلب / العنصر</th>
                <th>المشتري</th>
                <th>المتجر</th>
                <th>المنتج</th>
                <th>الكمية</th>
                <th>شركة الشحن</th>
                <th>حالة الطلب</th>
                <th>إجمالي هذا المنتج</th>
                <th>تاريخ الإنشاء</th>
              </tr>
            </thead>
            <tbody>
              {list.map((item) => {
                const statusValue =
                  item.statusCode || ORDER_STATUS_CODES.AT_SELLER_NEW;

                const isBusy = busyOrderId === item.orderId;

                return (
                  <tr
                    key={item.id}
                    onClick={() => openDetails(item)}
                    style={{ cursor: "pointer" }}
                  >
                    <td>
                      <div className="admin-orders-order-id">
                        <span className="admin-orders-order-code">
                          #
                          {item.orderNumber ||
                            (item.orderId
                              ? String(item.orderId).slice(-6)
                              : "—")}
                        </span>
                        {typeof item.itemIndex === "number" && (
                          <>
                            <span className="shipping-order-id-separator" />
                            <span className="admin-orders-order-item-index">
                              {item.itemIndex}
                            </span>
                          </>
                        )}
                      </div>
                    </td>

                    <td>
                      <div className="admin-orders-cell-main">
                        <div className="admin-orders-cell-title">
                          {item.buyerName || "—"}
                        </div>
                        {(item.buyerPhone || item.buyerEmail) && (
                          <div className="admin-orders-cell-sub">
                            {item.buyerPhone && <span>📞 {item.buyerPhone}</span>}
                            {item.buyerPhone && item.buyerEmail && " · "}
                            {item.buyerEmail && <span>✉️ {item.buyerEmail}</span>}
                          </div>
                        )}
                      </div>
                    </td>

                    <td>
                      <div className="admin-orders-cell-main">
                        <div className="admin-orders-cell-title">
                          {item.storeName || "—"}
                        </div>
                        {(item.storePhone || item.storeEmail) && (
                          <div className="admin-orders-cell-sub">
                            {item.storePhone && <span>📞 {item.storePhone}</span>}
                            {item.storePhone && item.storeEmail && " · "}
                            {item.storeEmail && <span>✉️ {item.storeEmail}</span>}
                          </div>
                        )}
                      </div>
                    </td>

                    <td>
                      <div className="admin-orders-product-cell">
                        {item.productImage && (
                          <img
                            src={resolveProductImageSrc(item.productImage)}
                            alt={item.productName}
                            className="admin-orders-product-thumb"
                            onError={(e) => {
                              // ✅ يمنع تكرار أخطاء التحميل ويُخفي الصورة إذا كانت قيمة قديمة خاطئة
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        )}
                        <div>
                          <div className="admin-orders-cell-title">
                            {item.productName || "—"}
                          </div>
                          <div className="admin-orders-cell-sub">
                            {getCategoryLabel(item)}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td>{item.qty ?? 1}</td>

                    <td>
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "0.22rem 0.7rem",
                          borderRadius: "0.6rem",
                          border: "1px solid #e2e8f0",
                          backgroundColor: "#f8fafc",
                          fontSize: "0.8rem",
                          color: "#0f172a",
                          minWidth: "130px",
                          justifyContent: "center",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.shippingCompanyName || "لم تُعيَّن شركة شحن بعد"}
                      </div>
                    </td>

                    <td
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      <select
                        className="admin-orders-select"
                        value={statusValue}
                        onChange={(e) => handleStatusChange(item, e.target.value)}
                        disabled={isBusy}
                      >
                        {Object.values(ORDER_STATUS_CODES).map((code) => (
                          <option key={code} value={code}>
                            {getOrderStatusLabel(code)}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td>
                      {item.lineTotal != null ? `${item.lineTotal} ر.ي` : "—"}
                    </td>

                    <td>
                      {item.createdAt
                        ? new Date(item.createdAt).toLocaleDateString("ar-SA")
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {isDetailsOpen && selectedItem && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15,23,42,0.45)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
          }}
          onClick={closeDetails}
        >
          <div
            style={{
              width: "min(950px, 96vw)",
              maxHeight: "90vh",
              backgroundColor: "#ffffff",
              borderRadius: "1rem",
              padding: "1.4rem 1.6rem",
              overflowY: "auto",
              boxShadow:
                "0 18px 45px rgba(15,23,42,0.18), 0 0 0 1px rgba(148,163,184,0.35)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "1rem",
                marginBottom: "1rem",
              }}
            >
              <div>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.45rem",
                    marginBottom: "0.25rem",
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "0.15rem 0.6rem",
                      borderRadius: "0.7rem",
                      background: "#eff6ff",
                      color: "#1d4ed8",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      gap: "0.35rem",
                    }}
                  >
                    <span>
                      #
                      {selectedItem.orderNumber ||
                        (selectedItem.orderId
                          ? String(selectedItem.orderId).slice(-6)
                          : "—")}
                    </span>
                    {typeof selectedItem.itemIndex === "number" && (
                      <>
                        <span
                          style={{
                            width: "1px",
                            height: "0.9rem",
                            backgroundColor: "rgba(148,163,184,0.9)",
                          }}
                        />
                        <span>{selectedItem.itemIndex}</span>
                      </>
                    )}
                  </span>
                  <span
                    style={{
                      fontSize: "0.8rem",
                      color: "#64748b",
                    }}
                  >
                    {selectedItem.createdAt
                      ? new Date(selectedItem.createdAt).toLocaleString("ar-SA")
                      : "—"}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: "1.02rem",
                    fontWeight: 700,
                    color: "#0f172a",
                    marginBottom: "0.15rem",
                  }}
                >
                  تفاصيل العنصر في الطلب
                </div>
                <div
                  style={{
                    fontSize: "0.85rem",
                    color: "#64748b",
                  }}
                >
                  مراجعة تفاصيل المشتري والمتجر والمنتج والبيانات المالية، مع إمكانية
                  ضبط حالة الطلب الموحدة.
                </div>
              </div>
              <button
                type="button"
                onClick={closeDetails}
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  borderRadius: "999px",
                  padding: "0.25rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#64748b",
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* حالة الطلب + شركة الشحن + طريقة الدفع */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1.3fr) minmax(0, 1.1fr)",
                gap: "0.9rem",
                marginBottom: "1rem",
              }}
            >
              <div
                style={{
                  borderRadius: "0.9rem",
                  border: "1px solid #e2e8f0",
                  padding: "0.75rem 0.9rem",
                  background: "#f8fafc",
                }}
              >
                <div
                  style={{
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    color: "#475569",
                    marginBottom: "0.45rem",
                  }}
                >
                  حالة الطلب (الموحّدة)
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <select
                    style={{
                      minWidth: "210px",
                      padding: "0.35rem 0.7rem",
                      borderRadius: "999px",
                      border: "1px solid #e2e8f0",
                      fontSize: "0.84rem",
                      background: "#ffffff",
                      color: "#0f172a",
                    }}
                    value={selectedItem.statusCode || ORDER_STATUS_CODES.AT_SELLER_NEW}
                    onChange={(e) => handleStatusChange(selectedItem, e.target.value)}
                    disabled={busyOrderId === selectedItem.orderId}
                  >
                    {Object.values(ORDER_STATUS_CODES).map((code) => (
                      <option key={code} value={code}>
                        {getOrderStatusLabel(code)}
                      </option>
                    ))}
                  </select>
                  <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
                    عند اختيار{" "}
                    <strong>{getOrderStatusLabel(ORDER_STATUS_CODES.CANCELLED_BY_ADMIN)}</strong>{" "}
                    سيتم طلب سبب إلغاء هذا المنتج فقط داخل الطلب.
                  </div>
                </div>
              </div>

              <div
                style={{
                  borderRadius: "0.9rem",
                  border: "1px solid #e2e8f0",
                  padding: "0.75rem 0.9rem",
                  background: "#f8fafc",
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1fr)",
                  gap: "0.5rem",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      color: "#475569",
                      marginBottom: "0.35rem",
                    }}
                  >
                    شركة الشحن
                  </div>
                  <div
                    style={{
                      padding: "0.35rem 0.7rem",
                      borderRadius: "0.6rem",
                      border: "1px solid #e2e8f0",
                      backgroundColor: "#f8fafc",
                      fontSize: "0.84rem",
                      color: "#0f172a",
                      display: "inline-flex",
                      minWidth: "210px",
                    }}
                  >
                    {selectedItem.shippingCompanyName || "لم تُعيَّن شركة شحن بعد"}
                  </div>
                </div>

                <div>
                  <div
                    style={{
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      color: "#475569",
                      marginBottom: "0.25rem",
                    }}
                  >
                    طريقة الدفع
                  </div>
                  <div style={{ fontSize: "0.84rem", color: "#0f172a" }}>
                    {selectedItem.paymentMethod || "—"}
                    {selectedItem.paymentSubMethod === "BANK_TRANSFER" && (
                      <div style={{ marginTop: "0.35rem", fontSize: "0.82rem", color: "#334155", lineHeight: 1.6 }}>
                        <div>اسم المرسل: <strong>{selectedItem.bankTransferSenderName || "—"}</strong></div>
                        <div>رقم الحوالة: <strong>{selectedItem.bankTransferReferenceNumber || "—"}</strong></div>
                      </div>
                    )}

                  </div>
                </div>
              </div>
            </div>

            {/* المشتري والمتجر */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 1.1fr)",
                gap: "0.9rem",
                marginBottom: "1rem",
              }}
            >
              <div
                style={{
                  borderRadius: "0.9rem",
                  border: "1px solid #e2e8f0",
                  padding: "0.75rem 0.9rem",
                }}
              >
                <div
                  style={{
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    color: "#475569",
                    marginBottom: "0.45rem",
                  }}
                >
                  بيانات المشتري
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.25rem",
                    fontSize: "0.85rem",
                    color: "#0f172a",
                  }}
                >
                  <div>
                    <strong>الاسم:</strong> {selectedItem.buyerName || "—"}
                  </div>
                  <div>
                    <strong>الجوال:</strong> {selectedItem.buyerPhone || "—"}
                  </div>
                  <div>
                    <strong>الإيميل:</strong> {selectedItem.buyerEmail || "—"}
                  </div>
                  <div>
                    <strong>العنوان:</strong> {selectedItem.buyerAddress || "—"}
                  </div>
                </div>
              </div>

              <div
                style={{
                  borderRadius: "0.9rem",
                  border: "1px solid #e2e8f0",
                  padding: "0.75rem 0.9rem",
                }}
              >
                <div
                  style={{
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    color: "#475569",
                    marginBottom: "0.45rem",
                  }}
                >
                  بيانات المتجر (البائع)
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.25rem",
                    fontSize: "0.85rem",
                    color: "#0f172a",
                  }}
                >
                  <div>
                    <strong>اسم المتجر:</strong> {selectedItem.storeName || "—"}
                  </div>
                  <div>
                    <strong>الجوال:</strong> {selectedItem.storePhone || "—"}
                  </div>
                  <div>
                    <strong>الإيميل:</strong> {selectedItem.storeEmail || "—"}
                  </div>
                  <div>
                    <strong>العنوان:</strong> {selectedItem.storeAddress || "—"}
                  </div>
                </div>
              </div>
            </div>

            {/* بيانات المنتج */}
            <div
              style={{
                borderRadius: "0.9rem",
                border: "1px solid #e2e8f0",
                padding: "0.85rem 0.9rem",
                marginBottom: "1rem",
              }}
            >
              <div
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: "#475569",
                  marginBottom: "0.5rem",
                }}
              >
                بيانات المنتج داخل الطلب
              </div>
              <div style={{ display: "flex", gap: "0.9rem", alignItems: "flex-start" }}>
                {selectedItem.productImage && (
                  <img
                    src={resolveProductImageSrc(selectedItem.productImage)}
                    alt={selectedItem.productName}
                    style={{
                      width: "78px",
                      height: "78px",
                      borderRadius: "0.9rem",
                      objectFit: "cover",
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      flexShrink: 0,
                    }}
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                )}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.35rem",
                    fontSize: "0.85rem",
                    color: "#0f172a",
                  }}
                >
                  <div>
                    <strong>اسم المنتج:</strong> {selectedItem.productName || "—"}
                  </div>
                  <div>
                    <strong>التصنيف:</strong> {getCategoryLabel(selectedItem)}
                  </div>
                  <div>
                    <strong>الكمية:</strong> {selectedItem.qty ?? 1}
                  </div>
                  <div>
                    <strong>الوصف:</strong> {selectedItem.productDescription || "—"}
                  </div>
                </div>
              </div>
            </div>

            {/* التفاصيل المالية */}
            <div
              style={{
                borderRadius: "0.9rem",
                border: "1px solid #e2e8f0",
                padding: "0.85rem 0.9rem",
              }}
            >
              <div
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: "#475569",
                  marginBottom: "0.5rem",
                }}
              >
                التفاصيل المالية لهذا المنتج داخل الطلب
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                  gap: "0.6rem",
                  fontSize: "0.84rem",
                  color: "#0f172a",
                }}
              >
                <div>
                  <div style={{ fontSize: "0.78rem", color: "#64748b", marginBottom: "0.18rem" }}>
                    سعر الوحدة
                  </div>
                  <div>
                    {selectedItem.unitPrice != null ? `${selectedItem.unitPrice} ر.ي` : "—"}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: "0.78rem", color: "#64748b", marginBottom: "0.18rem" }}>
                    إجمالي هذا المنتج
                  </div>
                  <div>
                    {selectedItem.lineTotal != null ? `${selectedItem.lineTotal} ر.ي` : "—"}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: "0.78rem", color: "#64748b", marginBottom: "0.18rem" }}>
                    مبلغ البائع
                  </div>
                  <div>
                    {selectedItem.sellerAmount != null ? `${selectedItem.sellerAmount} ر.ي` : "—"}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: "0.78rem", color: "#64748b", marginBottom: "0.18rem" }}>
                    عمولة المنصة
                  </div>
                  <div>
                    {selectedItem.platformCommission != null
                      ? `${selectedItem.platformCommission} ر.ي`
                      : "—"}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: "0.78rem", color: "#64748b", marginBottom: "0.18rem" }}>
                    رسوم الشحن (على مستوى الطلب)
                  </div>
                  <div>
                    {selectedItem.shippingPrice != null ? `${selectedItem.shippingPrice} ر.ي` : "—"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
