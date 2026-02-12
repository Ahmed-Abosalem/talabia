// src/pages/Admin/sections/AdminSellersSection.jsx

import { useEffect, useState, useMemo } from "react";
import {
  Users,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Store,
  AlertCircle,
  Info,
} from "lucide-react";
import {
  getAdminSellers,
  approveSeller,
  rejectSeller,
  updateSellerStatus,
} from "@/services/adminService";
import { useApp } from "@/context/AppContext";

import "./AdminSellersSection.css";

const STATUS_LABELS = {
  pending: "في انتظار الموافقة",
  approved: "مقبول",
  rejected: "مرفوض",
  suspended: "موقوف مؤقتًا",
};

function getStatusMeta(status) {
  switch (status) {
    case "pending":
      return {
        label: STATUS_LABELS.pending,
        bg: "rgba(234, 179, 8, 0.12)",
        border: "rgba(234, 179, 8, 0.35)",
        color: "#92400e",
      };
    case "approved":
      return {
        label: STATUS_LABELS.approved,
        bg: "rgba(34, 197, 94, 0.12)",
        border: "rgba(34, 197, 94, 0.40)",
        color: "#166534",
      };
    case "rejected":
      return {
        label: STATUS_LABELS.rejected,
        bg: "rgba(239, 68, 68, 0.10)",
        border: "rgba(239, 68, 68, 0.35)",
        color: "#b91c1c",
      };
    case "suspended":
      return {
        label: STATUS_LABELS.suspended,
        bg: "rgba(148, 163, 184, 0.15)",
        border: "rgba(148, 163, 184, 0.45)",
        color: "#111827",
      };
    default:
      return {
        label: status || "غير معروف",
        bg: "rgba(148, 163, 184, 0.10)",
        border: "rgba(148, 163, 184, 0.35)",
        color: "#4b5563",
      };
  }
}

export default function AdminSellersSection() {
  const { showToast } = useApp() || {};
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  const [selectedSeller, setSelectedSeller] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    loadSellers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadSellers() {
    try {
      setLoading(true);
      setErrorMessage("");
      const data = await getAdminSellers();
      const list = data?.sellers || data || [];
      setSellers(Array.isArray(list) ? list : []);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "تعذر تحميل البائعين. تأكد من إعداد مسار /api/admin/sellers.";
      setErrorMessage(msg);
      showToast?.(msg, "error");
    } finally {
      setLoading(false);
    }
  }

  function openDetails(seller) {
    setSelectedSeller(seller);
    setDetailsOpen(true);
  }

  function closeDetails() {
    setDetailsOpen(false);
    setSelectedSeller(null);
  }

  function filterList() {
    return sellers.filter((s) => {
      if (filterStatus !== "all" && s.status !== filterStatus) return false;

      if (search.trim()) {
        const q = search.trim().toLowerCase();

        const sellerName = (s?.owner?.name || s.name || "").toLowerCase();
        const sellerEmail = (s?.owner?.email || s.email || "").toLowerCase();
        const sellerPhone = (s?.owner?.phone || "").toLowerCase();
        const storeName = (s.name || s.storeName || "").toLowerCase();
        const id = (s._id || "").toString().toLowerCase();

        if (
          !sellerName.includes(q) &&
          !sellerEmail.includes(q) &&
          !sellerPhone.includes(q) &&
          !storeName.includes(q) &&
          !id.includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }

  async function handleApprove(sellerId) {
    try {
      setBusyId(sellerId);
      await approveSeller(sellerId);
      showToast?.("تم قبول البائع بنجاح.", "success");
      await loadSellers();
    } catch (err) {
      const msg =
        err?.response?.data?.message || err?.message || "تعذر قبول البائع.";
      setErrorMessage(msg);
      showToast?.(msg, "error");
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(sellerId) {
    const reason = window.prompt("سبب الرفض (إجباري):") || "";

    if (!reason.trim()) {
      const msg = "يجب إدخال سبب للرفض قبل المتابعة.";
      setErrorMessage(msg);
      showToast?.(msg, "error");
      return;
    }

    try {
      setBusyId(sellerId);
      await rejectSeller(sellerId, reason.trim());
      showToast?.("تم رفض طلب البائع.", "success");
      await loadSellers();
    } catch (err) {
      const msg =
        err?.response?.data?.message || err?.message || "تعذر رفض البائع.";
      setErrorMessage(msg);
      showToast?.(msg, "error");
    } finally {
      setBusyId(null);
    }
  }

  async function handleSuspend(sellerId) {
    try {
      setBusyId(sellerId);
      await updateSellerStatus(sellerId, "suspended");
      showToast?.("تم إيقاف البائع مؤقتًا.", "success");
      await loadSellers();
    } catch (err) {
      const msg =
        err?.response?.data?.message || err?.message || "تعذر إيقاف البائع.";
      setErrorMessage(msg);
      showToast?.(msg, "error");
    } finally {
      setBusyId(null);
    }
  }

  async function handleActivate(sellerId) {
    try {
      setBusyId(sellerId);
      await updateSellerStatus(sellerId, "approved");
      showToast?.("تم إعادة تفعيل البائع والمتجر.", "success");
      await loadSellers();
    } catch (err) {
      const msg =
        err?.response?.data?.message || err?.message || "تعذر تفعيل البائع.";
      setErrorMessage(msg);
      showToast?.(msg, "error");
    } finally {
      setBusyId(null);
    }
  }

  const list = filterList();

  const stats = useMemo(() => {
    const total = sellers.length;
    const pending = sellers.filter((s) => s.status === "pending").length;
    const approved = sellers.filter((s) => s.status === "approved").length;
    const suspended = sellers.filter((s) => s.status === "suspended").length;
    const rejected = sellers.filter((s) => s.status === "rejected").length;

    return { total, pending, approved, suspended, rejected };
  }, [sellers]);

  const renderDetailsModal = () => {
    if (!detailsOpen || !selectedSeller) return null;

    const owner = selectedSeller.owner || {};
    const store = selectedSeller;

    const statusMeta = getStatusMeta(store.status);
    const nationality = owner.nationality;
    const birthDate = owner.birthDate;
    const idType = owner.idType;
    const idNumber = owner.idNumber;
    const idIssuer = owner.idIssuer;

    // 🔠 ترجمة نوع الوثيقة إلى العربية
    const idTypeMap = {
      national: "هوية وطنية",
      residence: "هوية مقيم",
      passport: "جواز سفر",
    };
    const idTypeLabel = idTypeMap[idType] || (idType || "");

    // 🔗 تجهيز رابط وثيقة الهوية (مع دعم dev/prod)
    const rawIdDocumentUrl =
      owner.idDocumentUrl || store.idDocumentUrl || store.idDocument;

    let documentHref = "";
    if (rawIdDocumentUrl) {
      if (rawIdDocumentUrl.startsWith("http")) {
        documentHref = rawIdDocumentUrl;
      } else {
        let apiOrigin = "";
        const apiBase = import.meta.env.VITE_API_BASE_URL || "";

        if (apiBase) {
          apiOrigin = apiBase.replace(/\/api\/?$/, "").replace(/\/$/, "");
        }

        // Fallback ذكي لبيئة التطوير
        if (!apiOrigin && typeof window !== "undefined") {
          if (window.location.port === "5173") {
            // الفرونت على 5173 → نفترض الباك على 5000
            apiOrigin = "";
          } else {
            apiOrigin = window.location.origin;
          }
        }

        const normalizedPath = rawIdDocumentUrl.startsWith("/")
          ? rawIdDocumentUrl
          : `/${rawIdDocumentUrl}`;

        documentHref = `${apiOrigin}${normalizedPath}`;
      }
    }

    const createdAt = store.createdAt || owner.createdAt;

    // عنوان المتجر: معالجة address ككائن أو نص
    let storeAddress = "";
    if (store.address) {
      if (typeof store.address === "string") {
        storeAddress = store.address;
      } else if (typeof store.address === "object") {
        const { country, city, area, street, details } = store.address || {};
        const parts = [country, city, area, street, details]
          .map((p) => (p ? String(p).trim() : ""))
          .filter(Boolean);
        storeAddress = parts.join(" - ");
      }
    }
    if (!storeAddress) {
      storeAddress =
        store.fullAddress ||
        store.location?.fullAddress ||
        store.location?.addressLine ||
        store.location?.city ||
        "";
    }

    const formatDate = (value) => {
      if (!value) return "غير متوفر";
      try {
        return new Date(value).toLocaleDateString("ar-SA");
      } catch {
        return value;
      }
    };

    const field = (label, value, opts = {}) => {
      const display =
        value === undefined || value === null || value === ""
          ? "غير متوفر"
          : value;

      const wrapperClass = opts.full
        ? "admin-sellers-field admin-sellers-field-full"
        : "admin-sellers-field";

      return (
        <div className={wrapperClass}>
          <span className="admin-sellers-field-label">{label}</span>
          <span className="admin-sellers-field-value">{display}</span>
        </div>
      );
    };

    return (
      <div className="admin-sellers-modal-backdrop" onClick={closeDetails}>
        <div
          className="admin-sellers-modal"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="admin-sellers-modal-header">
            <div className="admin-sellers-modal-header-main">
              <div className="admin-sellers-modal-header-icon">
                <Users size={18} />
              </div>
              <div>
                <div className="admin-sellers-modal-title">
                  تفاصيل البائع والمتجر
                </div>
                <div className="admin-sellers-modal-subtitle">
                  راجع بيانات البائع والمتجر قبل الموافقة أو الرفض.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={closeDetails}
              className="admin-sellers-modal-close"
            >
              إغلاق ✕
            </button>
          </div>

          {/* Status badge */}
          <div className="admin-sellers-status-row">
            <span
              className="admin-sellers-status-chip"
              style={{
                backgroundColor: statusMeta.bg,
                border: `1px solid ${statusMeta.border}`,
                color: statusMeta.color,
              }}
            >
              <Info size={13} />
              {statusMeta.label}
            </span>

            <span className="admin-sellers-meta">
              <AlertCircle size={13} />
              تاريخ إنشاء الحساب: {formatDate(createdAt)}
            </span>
          </div>

          {/* Sections */}
          <div className="admin-sellers-sections">
            {/* Seller personal info */}
            <div className="admin-sellers-section-block">
              <div className="admin-sellers-section-block-header">
                <span className="admin-sellers-step-badge admin-sellers-step-badge-1">
                  1
                </span>
                <span className="admin-sellers-section-block-title">
                  بيانات البائع الشخصية
                </span>
              </div>

              <div className="admin-sellers-fields">
                {field("اسم البائع", owner.name)}
                {field("البريد الإلكتروني", owner.email)}
                {field("رقم الجوال", owner.phone)}
                {field("الجنسية", nationality)}
                {field(
                  "تاريخ الميلاد",
                  birthDate ? formatDate(birthDate) : ""
                )}
              </div>
            </div>

            {/* Identity info */}
            <div className="admin-sellers-section-block">
              <div className="admin-sellers-section-block-header">
                <span className="admin-sellers-step-badge admin-sellers-step-badge-2">
                  2
                </span>
                <span className="admin-sellers-section-block-title">
                  بيانات الهوية والتحقق
                </span>
              </div>

              <div className="admin-sellers-fields">
                {field("نوع الوثيقة", idTypeLabel)}
                {field("رقم الوثيقة", idNumber)}
                {field("جهة الإصدار", idIssuer)}
                {field(
                  "رابط وثيقة الهوية",
                  documentHref ? (
                    <a
                      href={documentHref}
                      target="_blank"
                      rel="noreferrer"
                      className="admin-sellers-link"
                    >
                      فتح الوثيقة في نافذة جديدة
                    </a>
                  ) : (
                    ""
                  ),
                  { full: true }
                )}
              </div>
            </div>

            {/* Store info */}
            <div className="admin-sellers-section-block">
              <div className="admin-sellers-section-block-header">
                <span className="admin-sellers-step-badge admin-sellers-step-badge-3">
                  3
                </span>
                <span className="admin-sellers-section-block-title">
                  بيانات المتجر
                </span>
              </div>

              <div className="admin-sellers-fields">
                {field("اسم المتجر", store.name)}
                {field("وصف المتجر", store.description, { full: true })}
                {field("عنوان المتجر", storeAddress)}
                {field("حالة المتجر", statusMeta.label)}
                {field("سبب الرفض / الملاحظات", store.rejectionReason, {
                  full: true,
                })}
              </div>
            </div>
          </div>

          {/* Footer actions (inside modal) */}
          <div className="admin-sellers-modal-footer">
            {store.status === "pending" && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    handleApprove(store._id);
                    closeDetails();
                  }}
                  disabled={busyId === store._id}
                  className="admin-sellers-modal-approve-button"
                >
                  قبول الطلب
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleReject(store._id);
                    closeDetails();
                  }}
                  disabled={busyId === store._id}
                  className="admin-sellers-modal-reject-button"
                >
                  رفض الطلب
                </button>
              </>
            )}
            {store.status === "approved" && (
              <button
                type="button"
                onClick={() => {
                  handleSuspend(store._id);
                  closeDetails();
                }}
                disabled={busyId === store._id}
                className="admin-sellers-modal-suspend-button"
              >
                إيقاف مؤقت
              </button>
            )}
            {store.status === "suspended" && (
              <button
                type="button"
                onClick={() => {
                  handleActivate(store._id);
                  closeDetails();
                }}
                disabled={busyId === store._id}
                className="admin-sellers-modal-reactivate-button"
              >
                إعادة تفعيل المتجر
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <section className="admin-section-card admin-sellers-section">
      {/* ====== Header ====== */}
      <div className="admin-section-header">
        <div className="admin-section-header-main">
          <div className="admin-section-icon">
            <Users size={18} />
          </div>
          <div>
            <div className="admin-section-title">إدارة البائعين</div>
            <div className="admin-section-subtitle">
              مراجعة طلبات الانضمام كبائع، وتفعيل أو إيقاف المتاجر حسب سياسة
              المنصة.
            </div>
          </div>
        </div>
        <div className="admin-section-actions">
          <button
            type="button"
            className="admin-button admin-button-ghost admin-sellers-refresh-button"
            onClick={loadSellers}
            disabled={loading}
          >
            <RefreshCw size={14} />
            <span>تحديث القائمة</span>
          </button>
        </div>
      </div>

      {/* ====== KPI Row ====== */}
      <div className="admin-sellers-kpis">
        <div className="admin-sellers-kpi-card admin-sellers-kpi-total">
          <div className="admin-sellers-kpi-header">
            <span className="admin-sellers-kpi-label admin-sellers-kpi-label-total">
              إجمالي البائعين
            </span>
            <Users
              size={16}
              className="admin-sellers-kpi-icon admin-sellers-kpi-icon-total"
            />
          </div>
          <div className="admin-sellers-kpi-value admin-sellers-kpi-value-total">
            {stats.total}
          </div>
        </div>

        <div className="admin-sellers-kpi-card admin-sellers-kpi-pending">
          <div className="admin-sellers-kpi-header">
            <span className="admin-sellers-kpi-label admin-sellers-kpi-label-pending">
              طلبات جديدة
            </span>
            <AlertCircle
              size={16}
              className="admin-sellers-kpi-icon admin-sellers-kpi-icon-pending"
            />
          </div>
          <div className="admin-sellers-kpi-value admin-sellers-kpi-value-pending">
            {stats.pending}
          </div>
        </div>

        <div className="admin-sellers-kpi-card admin-sellers-kpi-approved">
          <div className="admin-sellers-kpi-header">
            <span className="admin-sellers-kpi-label admin-sellers-kpi-label-approved">
              بائعون مقبولون
            </span>
            <CheckCircle2
              size={16}
              className="admin-sellers-kpi-icon admin-sellers-kpi-icon-approved"
            />
          </div>
          <div className="admin-sellers-kpi-value admin-sellers-kpi-value-approved">
            {stats.approved}
          </div>
        </div>

        <div className="admin-sellers-kpi-card admin-sellers-kpi-blocked">
          <div className="admin-sellers-kpi-header">
            <span className="admin-sellers-kpi-label admin-sellers-kpi-label-blocked">
              موقوفون / مرفوضون
            </span>
            <Store
              size={16}
              className="admin-sellers-kpi-icon admin-sellers-kpi-icon-blocked"
            />
          </div>
          <div className="admin-sellers-kpi-value admin-sellers-kpi-value-blocked">
            {stats.suspended + stats.rejected}
          </div>
        </div>
      </div>

      {/* ====== Toolbar ====== */}
      <div className="users-toolbar admin-sellers-toolbar">
        <div className="admin-sellers-search-container">
          <div className="admin-sellers-search-input-wrapper">
            <input
              className="users-search-input admin-sellers-search-input"
              placeholder="بحث باسم البائع أو المتجر أو البريد..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <span className="admin-sellers-search-icon">
              <Users size={16} />
            </span>
          </div>
        </div>

        <div className="admin-sellers-filters">
          <select
            className="users-filter-select admin-sellers-filter-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">كل الحالات</option>
            <option value="pending">في الانتظار</option>
            <option value="approved">مقبول</option>
            <option value="rejected">مرفوض</option>
            <option value="suspended">موقوف مؤقتًا</option>
          </select>
        </div>
      </div>

      {errorMessage && (
        <div className="admin-error admin-sellers-error">{errorMessage}</div>
      )}

      {/* ====== Table ====== */}
      <div className="users-table-wrapper">
        {loading ? (
          <div className="users-empty-state admin-sellers-empty">
            جاري تحميل البائعين...
          </div>
        ) : list.length === 0 ? (
          <div className="users-empty-state admin-sellers-empty admin-sellers-empty-muted">
            لا توجد بائعين مطابقين لخيارات البحث / التصفية الحالية.
          </div>
        ) : (
          <table className="users-table">
            <thead>
              <tr>
                <th>البائع</th>
                <th>المتجر</th>
                <th>الحالة</th>
                <th>تاريخ الانضمام</th>
                <th style={{ textAlign: "center" }}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {list.map((s) => {
                const sellerName = s?.owner?.name || s.name || "-";
                const sellerEmail = s?.owner?.email || s.email || "-";
                const storeName = s.name || s.storeName || "-";
                const statusMeta = getStatusMeta(s.status);

                return (
                  <tr key={s._id}>
                    <td>
                      <button
                        type="button"
                        onClick={() => openDetails(s)}
                        className="admin-sellers-name-button"
                      >
                        <div className="admin-sellers-name-wrapper">
                          <span className="admin-sellers-name">
                            {sellerName}
                          </span>
                          <span className="admin-sellers-email">
                            {sellerEmail}
                          </span>
                        </div>
                      </button>
                    </td>
                    <td>
                      <div className="admin-sellers-store-wrapper">
                        <span className="admin-sellers-store-icon">
                          <Store size={14} />
                        </span>
                        <span className="admin-sellers-store-name">
                          {storeName}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span
                        className="admin-sellers-status-badge"
                        style={{
                          backgroundColor: statusMeta.bg,
                          border: `1px solid ${statusMeta.border}`,
                          color: statusMeta.color,
                        }}
                      >
                        {statusMeta.label}
                      </span>
                    </td>
                    <td>
                      {s.createdAt
                        ? new Date(s.createdAt).toLocaleDateString("ar-SA")
                        : "-"}
                    </td>
                    <td>
                      <div className="admin-sellers-actions">
                        <button
                          type="button"
                          className="users-inline-button admin-sellers-inline-button"
                          onClick={() => openDetails(s)}
                        >
                          تفاصيل
                        </button>

                        {s.status === "pending" && (
                          <>
                            <button
                              type="button"
                              className="users-inline-button primary admin-sellers-inline-button admin-sellers-inline-button-primary"
                              onClick={() => handleApprove(s._id)}
                              disabled={busyId === s._id}
                            >
                              <CheckCircle2 size={12} />
                              قبول
                            </button>
                            <button
                              type="button"
                              className="users-inline-button admin-sellers-inline-button"
                              onClick={() => handleReject(s._id)}
                              disabled={busyId === s._id}
                            >
                              <XCircle size={12} />
                              رفض
                            </button>
                          </>
                        )}
                        {s.status === "approved" && (
                          <button
                            type="button"
                            className="users-inline-button admin-sellers-inline-button"
                            onClick={() => handleSuspend(s._id)}
                            disabled={busyId === s._id}
                          >
                            إيقاف مؤقت
                          </button>
                        )}
                        {s.status === "suspended" && (
                          <button
                            type="button"
                            className="users-inline-button primary admin-sellers-inline-button"
                            onClick={() => handleActivate(s._id)}
                            disabled={busyId === s._id}
                          >
                            إعادة تفعيل
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {renderDetailsModal()}
    </section>
  );
}
