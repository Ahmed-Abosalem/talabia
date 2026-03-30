// src/pages/Admin/sections/AdminOrdersSection.jsx
// إدارة الطلبات في لوحة الأدمن – عرض على مستوى المنتج داخل الطلب (Item)
// مع نافذة منبثقة لتفاصيل الطلب، وفصل التنسيقات في ملف CSS مستقل

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardList, RefreshCw, X, Trash2, Settings2 } from "lucide-react";
import {
  getAdminOrders,
  updateOrderItemStatus,
  cancelOrderItemAsAdmin,
  deleteOrderPermanently,
  getMinOrderSettings,
  updateMinOrderSettings,
} from "@/services/adminService";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { listCategories } from "@/services/categoryService";
import { formatCurrency, formatDate, formatNumber } from "@/utils/formatters";

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
      return "الدفع بالبطاقة"; // Default for online card
    case "BANK_TRANSFER":
      return "الحوالة البنكية";
    case "WALLET":
      return "الدفع بالمحفظة";
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
    const bankTransferStatus = order.bankTransferStatus || "pending";
    const isPaid = order.isPaid || false;

    const paymentMethodUi =
      paymentSubMethod === "BANK_TRANSFER"
        ? "الحوالة البنكية"
        : paymentSubMethod === "CARD"
          ? "الدفع بالبطاقة"
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
        isPaid,
        bankTransferStatus,
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
  const navigate = useNavigate();
  const { showToast } = useApp() || {};
  const { user } = useAuth() || {}; // ✅ قراءة المستخدم الحالي للتحقق من هوية المدير الأعلى (isOwner)

  const [items, setItems] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyOrderId, setBusyOrderId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [categories, setCategories] = useState([]);

  // 🚨 حالة نافذة حذف الطلب نهائياً
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // حالة نافذة إدارة الطلب
  const [manageModalItem, setManageModalItem] = useState(null);

  // حالة الحد الأدنى للطلب
  const [minOrder, setMinOrder] = useState({ active: false, value: 0 });
  const [isSavingMinOrder, setIsSavingMinOrder] = useState(false);

  useEffect(() => {
    loadOrders();
    loadCategories();
    loadMinOrderSettings();
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

  async function loadMinOrderSettings() {
    try {
      const data = await getMinOrderSettings();
      setMinOrder({ active: !!data.active, value: Number(data.value) || 0 });
    } catch (err) {
      console.error("فشل جلب إعدادات الحد الأدنى للطلب", err);
    }
  }

  async function handleSaveMinOrder() {
    try {
      setIsSavingMinOrder(true);
      const res = await updateMinOrderSettings({
        active: minOrder.active,
        value: Number(minOrder.value) || 0,
      });
      showToast?.(res.message || "تم حفظ الإعدادات بنجاح", "success");
      setMinOrder({ active: res.active, value: res.value });
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "تعذر حفظ إعدادات الحد الأدنى للطلب";
      showToast?.(msg, "error");
    } finally {
      setIsSavingMinOrder(false);
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
    if (item.orderId && item.id) {
      navigate(`/admin/orders/${item.orderId}/items/${item.id}`);
    }
  }

  // ────────────────────────────────────────────────
  // 🚨 دوال حذف الطلب نهائياً
  // ────────────────────────────────────────────────
  function openDeleteDialog(item) {
    setOrderToDelete(item);
    setDeleteConfirmation("");
    setDeleteDialogOpen(true);
  }

  function closeDeleteDialog() {
    setDeleteDialogOpen(false);
    setOrderToDelete(null);
    setDeleteConfirmation("");
    setIsDeleting(false);
  }

  async function handleDeleteOrder() {
    if (!orderToDelete) return;

    const orderNumber =
      orderToDelete.orderNumber ||
      (orderToDelete.orderId ? String(orderToDelete.orderId).slice(-6) : "");

    // ✅ التحقق من إدخال التأكيد الصحيح (رقم الطلب أو "حذف نهائي")
    const isValid =
      deleteConfirmation.trim() === orderNumber ||
      deleteConfirmation.trim() === "حذف نهائي";

    if (!isValid) {
      showToast?.(
        "يرجى إدخال رقم الطلب أو كتابة 'حذف نهائي' للتأكيد",
        "error"
      );
      return;
    }

    try {
      setIsDeleting(true);
      await deleteOrderPermanently(orderToDelete.orderId);
      showToast?.("تم حذف الطلب نهائياً من النظام", "success");
      closeDeleteDialog();
      await loadOrders(); // إعادة تحميل الطلبات
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "تعذر حذف الطلب. تأكد من صلاحياتك.";
      showToast?.(msg, "error");
    } finally {
      setIsDeleting(false);
    }
  }

  const list = filteredItems();

  return (
    <section className="adm-section-panel">
      <div className="adm-section-inner-header">
        <div className="adm-section-icon">
          <ClipboardList size={18} />
        </div>
        <div className="adm-section-title-group">
          <div className="adm-section-title">إدارة الطلبات</div>
          <div className="adm-section-subtitle">
            عرض وإدارة الطلبات على مستوى كل منتج داخل الطلب، مع التحكم في الحالة
            الموحّدة وعرض شركة الشحن المسؤولة، ونافذة تفاصيل لكل عنصر.
          </div>
        </div>
        <div className="adm-section-actions">
          <button
            type="button"
            className="adm-btn outline"
            onClick={loadOrders}
            disabled={loading}
          >
            <RefreshCw size={14} />
            <span>تحديث</span>
          </button>
        </div>
      </div>

      {/* لوحة تحكم إعدادات الحد الأدنى للطلب */}
      <div className="adm-toolbar" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'flex-start', backgroundColor: '#fff', border: '1px solid var(--admin-border-light, #e2e8f0)', padding: '1.25rem', borderRadius: 'var(--admin-radius-lg)', marginBottom: '1.5rem', boxShadow: '0 2px 5px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%' }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--admin-text-dark)', margin: '0 0 0.25rem 0' }}>إعدادات الحد الأدنى للطلب</h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--admin-text-light)' }}>منع إتمام الطلبات التي تقل قيمتها الإجمالية عن الحد المحدد هنا.</p>
          </div>

          <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: '500', color: minOrder.active ? 'var(--admin-green, #10b981)' : 'var(--admin-text-light, #64748b)' }}>
              {minOrder.active ? "النظام مفعّل" : "النظام معطّل"}
            </span>
            <div style={{ position: 'relative', width: '44px', height: '24px', borderRadius: '24px', backgroundColor: minOrder.active ? 'var(--admin-green, #10b981)' : '#cbd5e1', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: minOrder.active ? '0 0 0 2px rgba(16, 185, 129, 0.2)' : 'none' }}>
              <input
                type="checkbox"
                checked={minOrder.active}
                onChange={(e) => setMinOrder({ ...minOrder, active: e.target.checked })}
                style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }}
              />
              <span style={{ position: 'absolute', top: '2px', left: minOrder.active ? '22px' : '2px', width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#fff', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }} />
            </div>
          </label>
        </div>

        {minOrder.active && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '100%', marginTop: '0.75rem', flexWrap: 'wrap', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: 'var(--admin-radius-md)', border: '1px dashed #ced4da' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.95rem', fontWeight: '500', color: "var(--admin-text-dark)" }}>قيمة الحد الأدنى (ر.ي):</label>
              <input
                type="number"
                min="0"
                className="adm-form-input"
                style={{ width: '150px', paddingRight: '10px', fontWeight: '600' }}
                value={minOrder.value}
                onChange={(e) => setMinOrder({ ...minOrder, value: e.target.value })}
              />
            </div>
            <button
              type="button"
              className="adm-btn primary"
              onClick={handleSaveMinOrder}
              disabled={isSavingMinOrder}
              style={{ fontWeight: "600", padding: "0.5rem 1.5rem" }}
            >
              {isSavingMinOrder ? "جاري الحفظ..." : "حفظ الحد الأدنى"}
            </button>
          </div>
        )}
      </div>

      <div className="adm-toolbar">
        <div className="adm-search-wrapper">
          <input
            className="adm-search-input"
            placeholder="بحث برقم الطلب أو المشتري أو المتجر أو المنتج..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="adm-filter-select"
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

      {errorMessage && <div className="adm-error-box">{errorMessage}</div>}

      <div className="adm-orders-list">
        {loading ? (
          <div className="adm-empty-state">
            <p>جاري تحميل الطلبات...</p>
          </div>
        ) : list.length === 0 ? (
          <div className="adm-empty-state">
            <p>لا توجد عناصر طلب مطابقة لخيارات البحث / التصفية.</p>
          </div>
        ) : (
          list.map((item) => {
            const statusValue =
              item.statusCode || ORDER_STATUS_CODES.AT_SELLER_NEW;
            const statusLabel = getOrderStatusLabel(statusValue);
            const isBusy = busyOrderId === item.orderId;

            const orderNumberText =
              item.orderNumber ||
              (item.orderId ? String(item.orderId).slice(-6) : "—");
            const itemIndexText =
              typeof item.itemIndex === "number" ? item.itemIndex : null;

            // Payment status badge
            const paymentRaw = (item.paymentMethodRaw || "").toUpperCase();
            let paymentStatusLabel = "بانتظار";
            let paymentBadgeClass = "payment-pending";

            if (paymentRaw === "WALLET") {
              paymentStatusLabel = "مدفوع";
              paymentBadgeClass = "payment-paid";
            } else if (item.paymentSubMethod === "CARD") {
              paymentStatusLabel = item.isPaid ? "مدفوع" : "بانتظار الدفع";
              paymentBadgeClass = item.isPaid ? "payment-paid" : "payment-pending";
            } else if (item.paymentSubMethod === "BANK_TRANSFER" || paymentRaw === "BANK_TRANSFER") {
              if (item.bankTransferStatus === "confirmed") {
                paymentStatusLabel = "مدفوع";
                paymentBadgeClass = "payment-paid";
              } else if (item.bankTransferStatus === "rejected") {
                paymentStatusLabel = "مرفوض";
                paymentBadgeClass = "payment-rejected";
              } else {
                paymentStatusLabel = "بانتظار المراجعة";
                paymentBadgeClass = "payment-pending";
              }
            } else if (paymentRaw === "COD" || paymentRaw === "CASH_ON_DELIVERY") {
              paymentStatusLabel = "عند الاستلام";
              paymentBadgeClass = "payment-cod";
            }

            return (
              <article className="adm-order-card" key={item.id}>
                {/* ──── Column 1: Image ──── */}
                <div
                  className="adm-order-col-image"
                  onClick={() => openDetails(item)}
                >
                  <div className="adm-order-image-wrapper">
                    {item.productImage ? (
                      <img
                        src={resolveProductImageSrc(item.productImage)}
                        alt={item.productName}
                        loading="lazy"
                        className="adm-order-card-img"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#cbd5e1",
                          fontSize: "2rem",
                        }}
                      >
                        📦
                      </div>
                    )}
                    <div className="adm-order-status-badge">
                      {statusLabel}
                    </div>
                    <div
                      className={`adm-order-payment-badge ${paymentBadgeClass}`}
                    >
                      {paymentStatusLabel}
                    </div>
                  </div>
                </div>

                {/* ──── Column 2: Product Info ──── */}
                <div className="adm-order-col-product">
                  <h3 className="adm-order-product-name">
                    {item.productName || "—"}
                  </h3>
                  <div className="adm-order-product-meta">
                    <p className="adm-order-product-detail">
                      <span className="label">التصنيف:</span>{" "}
                      {getCategoryLabel(item)}
                    </p>
                    <p className="adm-order-product-detail">
                      <span className="label">الكمية:</span>{" "}
                      <span className="adm-order-num-accent">
                        {formatNumber(item.qty ?? 1)}
                      </span>
                    </p>
                    <p className="adm-order-product-detail adm-order-price-highlight">
                      <span className="label">السعر:</span>{" "}
                      <span className="adm-order-num-accent">
                        {item.lineTotal != null
                          ? formatCurrency(item.lineTotal)
                          : "—"}
                      </span>
                    </p>
                    {/* Shipping company — visible on mobile only */}
                    <p className="adm-order-product-detail adm-order-mobile-shipping">
                      <span className="label">الشحن:</span>{" "}
                      {item.shippingCompanyName || "لم تُعيَّن بعد"}
                    </p>
                  </div>

                  {/* Financial Row — Admin Only */}
                  {(item.sellerAmount != null ||
                    item.platformCommission != null) && (
                      <div className="adm-order-financial-row">
                        {item.sellerAmount != null && (
                          <span className="adm-order-financial-tag seller-amount">
                            المتجر: {formatCurrency(item.sellerAmount)}
                          </span>
                        )}
                        {item.platformCommission != null && (
                          <span className="adm-order-financial-tag platform-commission">
                            العمولة: {formatCurrency(item.platformCommission)}
                          </span>
                        )}
                      </div>
                    )}

                  {/* Manage Order Button */}
                  <button
                    type="button"
                    className="adm-order-manage-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setManageModalItem(item);
                    }}
                  >
                    <Settings2 size={14} />
                    <span>إدارة الطلب</span>
                  </button>
                </div>

                {/* ──── Column 3: Order Metadata ──── */}
                <div className="adm-order-col-order">
                  <div className="adm-order-id-display">
                    <span className="adm-order-hash">#</span>
                    <span className="adm-order-num adm-order-num-accent">
                      {orderNumberText}
                    </span>
                    <span className="adm-order-divider">|</span>
                    <span className="adm-order-index adm-order-num-accent">
                      {itemIndexText || "01"}
                    </span>
                  </div>

                  <div className="adm-order-date-display">
                    {item.createdAt
                      ? formatDate(item.createdAt, {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                      })
                      : "—"}
                  </div>

                  <div className="adm-order-shipping-company">
                    {item.shippingCompanyName || "لم تُعَيّن شركة شحن"}
                  </div>

                  <div className="adm-order-payment-display adm-order-num-accent">
                    {item.paymentMethod || "—"}
                  </div>
                </div>

                {/* ──── Column 4: Seller ──── */}
                <div className="adm-order-col-seller">
                  <h4 className="adm-order-section-title">
                    البائع: {item.storeName || "—"}
                  </h4>
                  <p className="adm-order-address-text">
                    {item.storeAddress || "—"}
                  </p>
                  <div className="adm-order-contact-row">
                    <span className="adm-order-contact-text">
                      {item.storeEmail || "—"}
                    </span>
                    <span className="adm-order-contact-divider">|</span>
                    <span className="adm-order-contact-phone adm-order-num-accent">
                      {item.storePhone || "—"}
                    </span>
                  </div>
                </div>

                {/* ──── Column 5: Buyer ──── */}
                <div className="adm-order-col-buyer">
                  <h4 className="adm-order-section-title">
                    المشتري: {item.buyerName || "—"}
                  </h4>
                  <p className="adm-order-address-text">
                    {item.buyerAddress || "—"}
                  </p>
                  <div className="adm-order-contact-row">
                    <span className="adm-order-contact-text">
                      {item.buyerEmail || "—"}
                    </span>
                    <span className="adm-order-contact-divider">|</span>
                    <span className="adm-order-contact-phone adm-order-num-accent">
                      {item.buyerPhone || "—"}
                    </span>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>

      {/* ──────────────────────────────────────────────── */}
      {/* 🛠️ نافذة إدارة الطلب (Manage Order Modal)     */}
      {/* ──────────────────────────────────────────────── */}
      {manageModalItem && (() => {
        const mItem = manageModalItem;
        const mStatusValue = mItem.statusCode || ORDER_STATUS_CODES.AT_SELLER_NEW;
        const mOrderNum = mItem.orderNumber || (mItem.orderId ? String(mItem.orderId).slice(-6) : "—");
        const mIsBusy = busyOrderId === mItem.orderId;

        return (
          <div className="adm-modal-backdrop" onClick={() => setManageModalItem(null)}>
            <div className="adm-manage-modal" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="adm-manage-modal-header">
                <div className="adm-manage-modal-title">
                  <Settings2 size={18} />
                  <span>إدارة الطلب #{mOrderNum}</span>
                </div>
                <button
                  type="button"
                  className="adm-manage-modal-close"
                  onClick={() => setManageModalItem(null)}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Product Info */}
              <div className="adm-manage-modal-product">
                <span className="adm-manage-modal-product-name">{mItem.productName || "—"}</span>
                <span className="adm-manage-modal-product-price">
                  {mItem.lineTotal != null ? formatCurrency(mItem.lineTotal) : "—"}
                </span>
              </div>

              {/* Body */}
              <div className="adm-manage-modal-body">
                {/* Status Change Section */}
                <div className="adm-manage-section">
                  <label className="adm-manage-section-label">تغيير حالة الطلب</label>
                  <select
                    className="adm-manage-status-select"
                    defaultValue={mStatusValue}
                    onChange={(e) => {
                      handleStatusChange(mItem, e.target.value);
                      setManageModalItem(null);
                    }}
                    disabled={mIsBusy}
                  >
                    {Object.values(ORDER_STATUS_CODES).map((code) => (
                      <option key={code} value={code}>
                        {getOrderStatusLabel(code)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Delete Section — Owner Only */}
                {user?.isOwner === true && (
                  <div className="adm-manage-section adm-manage-danger-zone">
                    <label className="adm-manage-section-label danger">منطقة الخطر</label>
                    <button
                      type="button"
                      className="adm-manage-delete-btn"
                      onClick={() => {
                        setManageModalItem(null);
                        openDeleteDialog(mItem);
                      }}
                    >
                      <Trash2 size={15} />
                      <span>حذف الطلب نهائياً</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ──────────────────────────────────────────────── */}
      {/* 🚨 نافذة تحذير الحذف النهائي (Modal) */}
      {/* ──────────────────────────────────────────────── */}
      {deleteDialogOpen && orderToDelete && (
        <div className="adm-modal-backdrop" onClick={closeDeleteDialog}>
          <div className="adm-modal" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="adm-modal-header">
              <h2 className="adm-modal-title danger">
                <Trash2 size={20} />
                <span>تحذير خطير: حذف الطلب نهائياً</span>
              </h2>
            </div>
            <div className="adm-modal-body">
              <div className="adm-notice-box danger" style={{ marginBottom: 'var(--sp-3)' }}>
                <div className="adm-notice-content">
                  أنت على وشك حذف الطلب رقم: <strong>{orderToDelete.orderNumber || String(orderToDelete.orderId).slice(-6)}</strong>.
                  هذا الإجراء سيؤدي لحذف كافة البيانات المرتبطة نهائياً ولا يمكن التراجع عنه.
                </div>
              </div>

              <div className="adm-form-group">
                <label className="adm-form-label">للتأكيد، يرجى كتابة رقم الطلب أو عبارة "حذف نهائي":</label>
                <input
                  className="adm-form-input"
                  type="text"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder={`اكتب ${orderToDelete.orderNumber || String(orderToDelete.orderId).slice(-6)} أو حذف نهائي`}
                />
              </div>
            </div>
            <div className="adm-modal-footer">
              <button type="button" className="adm-btn ghost" onClick={closeDeleteDialog} disabled={isDeleting}>
                إلغاء
              </button>
              <button
                type="button"
                className="adm-btn danger"
                onClick={handleDeleteOrder}
                disabled={
                  isDeleting ||
                  (deleteConfirmation.trim() !== (orderToDelete.orderNumber || String(orderToDelete.orderId).slice(-6)) &&
                    deleteConfirmation.trim() !== "حذف نهائي")
                }
              >
                {isDeleting ? "جاري الحذف..." : "تأكيد الحذف النهائي"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
