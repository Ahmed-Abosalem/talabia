// src/pages/Admin/sections/AdminNotificationsSection.jsx

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, RefreshCw, Send, History, Trash2, Users, Store, Truck, AlertTriangle } from "lucide-react";
import {
  getAdminNotifications,
  createAdminNotification,
  deleteAdminNotification,
} from "@/services/adminService";
import { formatDate } from "@/utils/formatters";
import { useApp } from "@/context/AppContext";
import "./AdminNotificationsSection.css";

const emptyForm = {
  title: "",
  message: "",
  audience: "all",
};

const AUDIENCE_MAP = {
  all: { label: "كل المستخدمين", icon: Users },
  buyers: { label: "المشترون", icon: Users },
  sellers: { label: "البائعون", icon: Store },
  shipping: { label: "شركات الشحن", icon: Truck },
};

export default function AdminNotificationsSection({ onSendNotification }) {
  const navigate = useNavigate();
  const { showToast } = useApp() || {};
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [errorMessage, setErrorMessage] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const mountedRef = useRef(false);
  const requestIdRef = useRef(0);

  // حالة مودال الحذف
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [notifToDelete, setNotifToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    loadNotifications(page, { silent: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  async function loadNotifications(targetPage = page, options = {}) {
    const { silent = false } = options;
    const requestId = ++requestIdRef.current;
    try {
      if (silent) setRefreshing(true);
      else setLoading(true);
      if (mountedRef.current) setErrorMessage("");
      const data = await getAdminNotifications({ page: targetPage, limit: 20 });
      if (!mountedRef.current || requestId !== requestIdRef.current) return;
      const list = data?.notifications || data || [];
      setNotifications(Array.isArray(list) ? list : []);
      const nextPagination = data?.pagination;
      if (nextPagination && typeof nextPagination === "object") {
        setPagination({
          page: Number(nextPagination.page) || 1,
          limit: Number(nextPagination.limit) || 20,
          total: Number(nextPagination.total) || 0,
          totalPages: Number(nextPagination.totalPages) || 1,
          hasNextPage: !!nextPagination.hasNextPage,
          hasPrevPage: !!nextPagination.hasPrevPage,
        });
      } else {
        const total = Array.isArray(list) ? list.length : 0;
        setPagination({
          page: 1,
          limit: total || 20,
          total,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        });
      }
    } catch (err) {
      if (!mountedRef.current || requestId !== requestIdRef.current) return;
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "تعذر تحميل التنبيهات.";
      setErrorMessage(msg);
      showToast?.(msg, "error");
    } finally {
      if (!mountedRef.current || requestId !== requestIdRef.current) return;
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (saving) return;
    try {
      setSaving(true);
      const payload = {
        title: form.title.trim(),
        message: form.message.trim(),
        audience: form.audience,
      };

      if (!payload.title || !payload.message) {
        showToast?.("عنوان التنبيه ومحتواه حقول إلزامية.", "error");
        return;
      }

      await createAdminNotification(payload);
      showToast?.("تم إرسال التنبيه للمستخدمين المستهدفين.", "success");
      setForm(emptyForm);
      if (page !== 1) setPage(1);
      else await loadNotifications(1, { silent: true });
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "تعذر إنشاء التنبيه.";
      setErrorMessage(msg);
      showToast?.(msg, "error");
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(notif) {
    setNotifToDelete(notif);
    setDeleteModalOpen(true);
  }

  async function handleDelete() {
    if (!notifToDelete || isDeleting) return;
    try {
      setIsDeleting(true);
      await deleteAdminNotification(notifToDelete._id);
      showToast?.("تم حذف التنبيه من السجل.", "success");
      const nextTotal = Math.max((pagination.total || 1) - 1, 0);
      const nextTotalPages = Math.max(Math.ceil(nextTotal / (pagination.limit || 20)), 1);
      const nextPage = Math.min(page, nextTotalPages);
      setDeleteModalOpen(false);
      setNotifToDelete(null);
      if (nextPage !== page) setPage(nextPage);
      else await loadNotifications(nextPage, { silent: true });
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "تعذر حذف التنبيه.";
      showToast?.(msg, "error");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <section className="adm-section-panel notif-page-root">
      {/* 🏔️ Section Header */}
      <div className="adm-section-inner-header">
        <div className="adm-section-icon">
          <Bell size={18} />
        </div>
        <div className="adm-section-title-group">
          <div className="adm-section-title">إدارة التنبيهات</div>
          <div className="adm-section-subtitle">
            إرسال تنبيهات للمستخدمين وإدارة سجل الإشعارات المرسلة.
          </div>
        </div>
        <div className="adm-section-actions">
          <button
            type="button"
            className="adm-btn primary"
            onClick={() => {
              if (onSendNotification) onSendNotification();
              else navigate("/admin/notify-all");
            }}
          >
            <Bell size={14} />
            <span>إرسال تنبيه للكل</span>
          </button>
          <button
            type="button"
            className="adm-btn outline"
            onClick={() => loadNotifications(page, { silent: true })}
            disabled={loading || refreshing}
          >
            <RefreshCw size={14} className={loading || refreshing ? "spin" : ""} />
            <span>تحديث</span>
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="adm-error-box" style={{ margin: "var(--sp-2) 0" }}>
          <AlertTriangle size={14} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 📐 Card Grid Layout (Gold Standard) */}
      <div className="notif-grid">

        {/* ✉️ Card 1: Create New Notification */}
        <section className="adm-card notif-card-create">
          <div className="adm-card-header">
            <Send size={20} />
            <h2>إرسال تنبيه جديد</h2>
          </div>
          <div className="adm-card-body">
            <form onSubmit={handleSubmit} className="notif-form">
              <div className="adm-form-row">
                <div className="adm-form-group">
                  <label className="adm-form-label">عنوان التنبيه</label>
                  <input
                    className="adm-form-input"
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="مثال: تحديث جديد في سياسة الشحن..."
                  />
                </div>
                <div className="adm-form-group">
                  <label className="adm-form-label">الفئة المستهدفة</label>
                  <select
                    className="adm-form-select"
                    value={form.audience}
                    onChange={(e) => setForm((f) => ({ ...f, audience: e.target.value }))}
                  >
                    <option value="all">كل المستخدمين</option>
                    <option value="buyers">المشترون فقط</option>
                    <option value="sellers">البائعون فقط</option>
                    <option value="shipping">شركات الشحن فقط</option>
                  </select>
                </div>
              </div>

              <div className="adm-form-group">
                <label className="adm-form-label">نص التنبيه</label>
                <textarea
                  className="adm-form-textarea"
                  rows={4}
                  value={form.message}
                  onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                  placeholder="اكتب تفاصيل التنبيه هنا..."
                />
              </div>

              <div className="notif-form-actions">
                <button type="submit" className="adm-btn primary" disabled={saving}>
                  {saving ? <RefreshCw size={14} className="spin" /> : <Send size={14} />}
                  <span>{saving ? "جارٍ الإرسال..." : "إرسال التنبيه"}</span>
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* 📜 Card 2: Notification History */}
        <section className="adm-card notif-card-history">
          <div className="adm-card-header">
            <History size={20} />
            <h2>سجل التنبيهات المرسلة ({notifications.length})</h2>
          </div>
          <div className="adm-card-body notif-history-body">
            {loading ? (
              <div className="adm-empty-state">
                <div className="adm-empty-state-icon"><RefreshCw size={24} className="spin" /></div>
                <p>جاري تحميل التنبيهات...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="adm-empty-state">
                <div className="adm-empty-state-icon"><Bell size={24} /></div>
                <h3>لا توجد تنبيهات</h3>
                <p>سجل التنبيهات الخاص بك فارغ حالياً.</p>
              </div>
            ) : (
              <div className="notif-history-list">
                {notifications.map((n) => {
                  const audienceInfo = AUDIENCE_MAP[n.audience] || AUDIENCE_MAP.all;
                  const AudienceIcon = audienceInfo.icon;
                  return (
                    <div key={n._id} className="notif-history-item">
                      <div className="notif-history-item-main">
                        <div className="notif-history-title">{n.title}</div>
                        <div className="notif-history-meta">
                          <span className="adm-status-chip mini info">
                            <AudienceIcon size={12} />
                            {audienceInfo.label}
                          </span>
                          <span className="notif-history-date">
                            {n.createdAt ? formatDate(n.createdAt) : "—"}
                          </span>
                        </div>
                        {n.message && (
                          <p className="notif-history-message">{n.message}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        className="adm-icon-btn danger"
                        onClick={() => confirmDelete(n)}
                        aria-label={`حذف التنبيه ${n.title || ""}`}
                        title="حذف من السجل"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* 🗑️ Delete Confirmation Modal */}
      {deleteModalOpen && notifToDelete && (
        <div className="adm-modal-backdrop" onClick={() => setDeleteModalOpen(false)}>
          <div className="adm-modal" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="adm-modal-header">
              <h2 className="adm-modal-title danger">
                <Trash2 size={20} />
                <span>حذف التنبيه من السجل؟</span>
              </h2>
            </div>
            <div className="adm-modal-body">
              <div className="adm-notice-box danger">
                <div className="adm-notice-content">
                  أنت على وشك حذف التنبيه <strong>"{notifToDelete.title}"</strong> من السجل.
                  هذا الإجراء لا يمكن التراجع عنه.
                </div>
              </div>
            </div>
            <div className="adm-modal-footer">
              <button type="button" className="adm-btn ghost" onClick={() => setDeleteModalOpen(false)} disabled={isDeleting}>
                إلغاء
              </button>
              <button type="button" className="adm-btn danger" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? (
                  <><RefreshCw size={14} className="spin" /> <span>جاري الحذف...</span></>
                ) : (
                  <><Trash2 size={14} /><span>تأكيد الحذف</span></>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {!loading && pagination.totalPages > 1 && (
        <div className="adm-pagination" style={{ marginTop: "var(--sp-2)" }}>
          <button
            type="button"
            className="adm-page-btn"
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
            disabled={!pagination.hasPrevPage}
            aria-label="الصفحة السابقة"
          >
            ‹
          </button>
          <span className="adm-page-btn active" aria-live="polite">
            {pagination.page} / {pagination.totalPages}
          </span>
          <button
            type="button"
            className="adm-page-btn"
            onClick={() =>
              setPage((p) => Math.min(p + 1, Math.max(pagination.totalPages, 1)))
            }
            disabled={!pagination.hasNextPage}
            aria-label="الصفحة التالية"
          >
            ›
          </button>
        </div>
      )}
    </section>
  );
}
