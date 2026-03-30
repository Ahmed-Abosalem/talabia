// src/pages/Admin/sections/AdminSellersSection.jsx

import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Store,
  AlertCircle,
  Info,
  Search,
} from "lucide-react";
import {
  getAdminSellers,
  approveSeller,
  rejectSeller,
  updateSellerStatus,
} from "@/services/adminService";
import { useApp } from "@/context/AppContext";
import useGrabScroll from "@/hooks/useGrabScroll";

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
      return { label: STATUS_LABELS.pending, cls: "pending" };
    case "approved":
      return { label: STATUS_LABELS.approved, cls: "active" };
    case "rejected":
      return { label: STATUS_LABELS.rejected, cls: "inactive" };
    case "suspended":
      return { label: STATUS_LABELS.suspended, cls: "warning" };
    default:
      return { label: status || "غير معروف", cls: "" };
  }
}

export default function AdminSellersSection() {
  const navigate = useNavigate();
  const { showToast } = useApp() || {};
  const scrollRef = useGrabScroll();
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    loadSellers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadSellers() {
    try {
      setLoading(true);
      const data = await getAdminSellers();
      const list = data?.sellers || data || [];
      setSellers(Array.isArray(list) ? list : []);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "تعذر تحميل البائعين.";
      showToast?.(msg, "error");
    } finally {
      setLoading(false);
    }
  }

  function openDetails(seller) {
    navigate(`/admin/sellers/details/${seller._id}`);
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
      showToast?.(msg, "error");
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(sellerId) {
    const reason = window.prompt("سبب الرفض (إجباري):") || "";

    if (!reason.trim()) {
      showToast?.("يجب إدخال سبب للرفض قبل المتابعة.", "error");
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


  return (
    <section className="adm-section-panel">
      {/* ====== Header ====== */}
      <div className="adm-section-inner-header">
        <div className="adm-section-icon">
          <Users size={18} />
        </div>
        <div className="adm-section-title-group">
          <div className="adm-section-title">إدارة البائعين</div>
          <div className="adm-section-subtitle">
            مراجعة طلبات الانضمام كبائع، وتفعيل أو إيقاف المتاجر حسب سياسة المنصة.
          </div>
        </div>
        <div className="adm-section-actions">
          <button
            type="button"
            className="adm-btn outline"
            onClick={loadSellers}
            disabled={loading}
          >
            <RefreshCw size={14} />
            <span>تحديث القائمة</span>
          </button>
        </div>
      </div>

      {/* ====== KPI Stats Grid ====== */}
      <div className="adm-stats-grid">
        <div className="adm-stat-card">
          <div className="adm-stat-icon"><Users size={18} /></div>
          <div className="adm-stat-label">إجمالي البائعين</div>
          <div className="adm-stat-value">{stats.total}</div>
        </div>
        <div className="adm-stat-card pending">
          <div className="adm-stat-icon"><AlertCircle size={18} /></div>
          <div className="adm-stat-label">طلبات جديدة</div>
          <div className="adm-stat-value">{stats.pending}</div>
        </div>
        <div className="adm-stat-card approved">
          <div className="adm-stat-icon"><CheckCircle2 size={18} /></div>
          <div className="adm-stat-label">بائعون مقبولون</div>
          <div className="adm-stat-value">{stats.approved}</div>
        </div>
        <div className="adm-stat-card danger">
          <div className="adm-stat-icon"><XCircle size={18} /></div>
          <div className="adm-stat-label">موقوفون / مرفوضون</div>
          <div className="adm-stat-value">{stats.suspended + stats.rejected}</div>
        </div>
      </div>

      {/* ====== Toolbar ====== */}
      <div className="adm-toolbar">
        <div className="adm-search-wrapper">
          <div className="adm-search-icon">
            <Search size={18} />
          </div>
          <input
            className="adm-search-input"
            placeholder="بحث باسم البائع أو المتجر أو البريد..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="adm-filter-select"
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



      {/* ====== Table ====== */}
      <div className="adm-table-wrapper" ref={scrollRef}>
        {loading ? (
          <div className="adm-empty-state">
            <div className="adm-empty-state-icon"><RefreshCw size={24} className="spin" /></div>
            <p>جاري تحميل البائعين...</p>
          </div>
        ) : list.length === 0 ? (
          <div className="adm-empty-state">
            <div className="adm-empty-state-icon"><Info size={24} /></div>
            <h3>لا توجد بائعين مطابقين</h3>
            <p>جرّب تعديل خيارات البحث / التصفية للحصول على نتائج.‏</p>
          </div>
        ) : (
          <table className="adm-table">
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
                        className="adm-sellers-name-btn"
                      >
                        <span className="adm-sellers-name">{sellerName}</span>
                        <span className="adm-sellers-email">{sellerEmail}</span>
                      </button>
                    </td>
                    <td>
                      <div className="adm-sellers-store-cell">
                        <Store size={14} />
                        <span>{storeName}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`adm-status-chip mini ${statusMeta.cls}`}>
                        <span className="adm-status-dot"></span>
                        {statusMeta.label}
                      </span>
                    </td>
                    <td>
                      {s.createdAt
                        ? new Date(s.createdAt).toLocaleDateString("ar-SA")
                        : "-"}
                    </td>
                    <td>
                      <div className="adm-sellers-actions-row">
                        <button type="button" className="adm-btn outline"
                          style={{ padding: "4px 12px", fontSize: "0.78rem" }}
                          onClick={() => openDetails(s)}>
                          تفاصيل
                        </button>

                        {s.status === "pending" && (
                          <>
                            <button type="button" className="adm-btn primary"
                              style={{ padding: "4px 12px", fontSize: "0.78rem" }}
                              onClick={() => handleApprove(s._id)} disabled={busyId === s._id}>
                              <CheckCircle2 size={12} />قبول
                            </button>
                            <button type="button" className="adm-btn danger"
                              style={{ padding: "4px 12px", fontSize: "0.78rem" }}
                              onClick={() => handleReject(s._id)} disabled={busyId === s._id}>
                              <XCircle size={12} />رفض
                            </button>
                          </>
                        )}
                        {s.status === "approved" && (
                          <button type="button" className="adm-btn outline"
                            style={{ padding: "4px 12px", fontSize: "0.78rem" }}
                            onClick={() => handleSuspend(s._id)} disabled={busyId === s._id}>
                            إيقاف مؤقت
                          </button>
                        )}
                        {s.status === "suspended" && (
                          <button type="button" className="adm-btn primary"
                            style={{ padding: "4px 12px", fontSize: "0.78rem" }}
                            onClick={() => handleActivate(s._id)} disabled={busyId === s._id}>
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

    </section >
  );
}
