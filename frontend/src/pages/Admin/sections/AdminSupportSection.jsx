import { useEffect, useState } from "react";
import { LifeBuoy, RefreshCw, User, Mail, Phone, Search, X, Send } from "lucide-react";
import {
  getAdminSupportTickets,
  updateSupportTicketStatus,
  replyToSupportTicket,
  deleteSupportTicket,
} from "@/services/adminService";
import { formatDate } from "@/utils/formatters";
import { useApp } from "@/context/AppContext";
import "./AdminSupportSection.css";

const STATUS_LABELS = {
  open: "مفتوحة",
  in_progress: "قيد المتابعة",
  resolved: "تم الحل",
  closed: "مهملة",
};

export default function AdminSupportSection() {
  const { showToast } = useApp() || {};
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  // لعرض تفاصيل التذكرة (الرسالة)
  const [selectedTicket, setSelectedTicket] = useState(null);

  // الرد على التذكرة
  const [replyTicket, setReplyTicket] = useState(null);
  const [replyText, setReplyText] = useState("");

  useEffect(() => {
    loadTickets();
  }, []);

  async function loadTickets() {
    try {
      setLoading(true);
      setErrorMessage("");
      const data = await getAdminSupportTickets();
      const list = data?.tickets || data || [];
      setTickets(Array.isArray(list) ? list : []);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "تعذر تحميل تذاكر الدعم.";
      setErrorMessage(msg);
      showToast?.(msg, "error");
    } finally {
      setLoading(false);
    }
  }

  const filtered = tickets.filter((t) => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const subject = (t.subject || "").toLowerCase();
      const user = (t.userName || "").toLowerCase();
      const email = (t.userEmail || "").toLowerCase();
      if (!subject.includes(q) && !user.includes(q) && !email.includes(q)) {
        return false;
      }
    }
    return true;
  });

  async function handleStatusChange(ticketId, newStatus) {
    try {
      setBusyId(ticketId);
      await updateSupportTicketStatus(ticketId, newStatus);
      showToast?.("تم تحديث حالة التذكرة.", "success");
      await loadTickets();
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "تعذر تحديث حالة التذكرة.";
      setErrorMessage(msg);
      showToast?.(msg, "error");
    } finally {
      setBusyId(null);
    }
  }

  function handleOpenDetails(ticket) {
    setSelectedTicket(ticket);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function handleCloseDetails() {
    setSelectedTicket(null);
  }

  function handleOpenReply(ticket) {
    setReplyTicket(ticket);
    // لو فيه رد سابق مخزون نعرضه، وإلا حقل فارغ
    setReplyText(ticket.adminReply || "");
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function handleCloseReply() {
    setReplyTicket(null);
    setReplyText("");
  }

  async function handleSubmitReply(e) {
    e?.preventDefault?.();

    if (!replyTicket) return;

    if (!replyText.trim()) {
      showToast?.("يرجى كتابة نص الرد قبل الإرسال.", "warning");
      return;
    }

    try {
      setBusyId(replyTicket._id);
      await replyToSupportTicket(replyTicket._id, replyText.trim());
      showToast?.("تم إرسال الرد وحفظه في التذكرة.", "success");
      await loadTickets();
      handleCloseReply();
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "تعذر إرسال الرد على التذكرة.";
      showToast?.(msg, "error");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDeleteTicket(ticket) {
    const confirmed = window.confirm(
      "هل أنت متأكد من حذف هذه التذكرة؟ هذا الإجراء لا يمكن التراجع عنه."
    );
    if (!confirmed) return;

    try {
      setBusyId(ticket._id);
      await deleteSupportTicket(ticket._id);
      showToast?.("تم حذف التذكرة بنجاح.", "success");
      await loadTickets();
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "تعذر حذف التذكرة.";
      showToast?.(msg, "error");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="adm-section-panel">
      <header className="adm-section-inner-header">
        <div className="adm-section-icon">
          <LifeBuoy size={22} />
        </div>
        <div className="adm-section-title-group">
          <h2 className="adm-section-title">الدعم الفني والتذاكر</h2>
          <p className="adm-section-subtitle">
            متابعة ومعالجة طلبات الدعم الواردة من العملاء والشركاء.
          </p>
        </div>
        <div className="adm-section-actions">
          <button
            type="button"
            className="adm-btn outline"
            onClick={loadTickets}
            disabled={loading}
          >
            <RefreshCw size={18} className={loading ? "spin" : ""} />
            <span>تحديث</span>
          </button>
        </div>
      </header>

      {errorMessage && (
        <div className="admin-error" style={{ marginBottom: "0.6rem" }}>
          {errorMessage}
        </div>
      )}

      <div className="adm-toolbar">
        <div className="adm-search-wrapper" style={{ flex: 1 }}>
          <Search size={16} className="adm-search-icon" />
          <input
            className="adm-search-input"
            placeholder="بحث بعنوان التذكرة، اسم المستخدم، أو البريد..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="adm-filter-group">
          <label className="adm-filter-label">الحالة:</label>
          <select
            className="adm-filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">كل الحالات</option>
            <option value="open">{STATUS_LABELS.open}</option>
            <option value="in_progress">{STATUS_LABELS.in_progress}</option>
            <option value="resolved">{STATUS_LABELS.resolved}</option>
            <option value="closed">{STATUS_LABELS.closed}</option>
          </select>
        </div>
      </div>

      <div className="adm-table-container">
        {loading ? (
          <div className="adm-loading-state">
            <RefreshCw size={24} className="spin" />
            <span>جاري التحميل...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="adm-empty-state">
            <LifeBuoy size={48} className="adm-text-soft" />
            <p>لا توجد تذاكر مطابقة لخيارات البحث.</p>
          </div>
        ) : (
          <table className="adm-table">
            <thead>
              <tr>
                <th>العنوان</th>
                <th>المستخدم</th>
                <th>الدور</th>
                <th>الحالة</th>
                <th>التاريخ</th>
                <th style={{ width: '280px' }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t._id}>
                  <td>
                    <div className="adm-table-main" onClick={() => handleOpenDetails(t)} style={{ cursor: 'pointer' }}>
                      <span className="adm-font-bold">{t.subject}</span>
                    </div>
                  </td>
                  <td>
                    <div className="adm-table-main">
                      <span className="adm-font-bold">{t.userName || "—"}</span>
                      <span className="adm-meta-text">{t.userEmail}</span>
                    </div>
                  </td>
                  <td>
                    <span className="adm-pill sm outline">
                      {t.userRole === "buyer" ? "مشتري" :
                        t.userRole === "seller" ? "بائع" :
                          t.userRole === "shipper" ? "شحن" :
                            t.userRole === "admin" ? "مدير" : "—"}
                    </span>
                  </td>
                  <td>
                    <select
                      className="adm-status-select"
                      value={t.status || "open"}
                      disabled={busyId === t._id}
                      onChange={(e) => handleStatusChange(t._id, e.target.value)}
                      data-status={t.status}
                    >
                      <option value="open">{STATUS_LABELS.open}</option>
                      <option value="in_progress">{STATUS_LABELS.in_progress}</option>
                      <option value="resolved">{STATUS_LABELS.resolved}</option>
                      <option value="closed">{STATUS_LABELS.closed}</option>
                    </select>
                  </td>
                  <td>
                    <span className="adm-text-soft" style={{ fontSize: '0.85rem' }}>
                      {t.createdAt ? formatDate(t.createdAt) : "—"}
                    </span>
                  </td>
                  <td>
                    <div className="adm-table-actions">
                      <button
                        type="button"
                        className="adm-btn outline sm"
                        onClick={() => handleOpenDetails(t)}
                      >
                        عرض
                      </button>
                      <button
                        type="button"
                        className="adm-btn primary sm"
                        onClick={() => handleOpenReply(t)}
                        disabled={busyId === t._id}
                      >
                        رد
                      </button>
                      <button
                        type="button"
                        className="adm-btn danger sm"
                        onClick={() => handleDeleteTicket(t)}
                        disabled={busyId === t._id}
                      >
                        حذف
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* نافذة عرض تفاصيل التذكرة */}
      {selectedTicket && (
        <div className="adm-modal-backdrop" onClick={handleCloseDetails}>
          <div className="adm-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="adm-modal-header">
              <h3 className="adm-modal-title">تفاصيل تذكرة الدعم</h3>
              <button type="button" className="adm-modal-close" onClick={handleCloseDetails}>
                <X size={20} />
              </button>
            </div>
            <div className="adm-modal-body">
              <div className="adm-info-grid">
                <div className="adm-info-point">
                  <span className="label">الموضوع:</span>
                  <span className="value adm-font-bold">{selectedTicket.subject}</span>
                </div>
                <div className="adm-info-point">
                  <span className="label">المستخدم:</span>
                  <span className="value">{selectedTicket.userName} ({selectedTicket.userEmail})</span>
                </div>
                <div className="adm-info-point full">
                  <span className="label">نص الرسالة:</span>
                  <div className="adm-text-box">
                    {selectedTicket.message}
                  </div>
                </div>
              </div>
            </div>
            <div className="adm-modal-footer">
              <button type="button" className="adm-btn outline" onClick={handleCloseDetails}>
                إغلاق
              </button>
              <button
                type="button"
                className="adm-btn primary"
                onClick={() => {
                  handleCloseDetails();
                  handleOpenReply(selectedTicket);
                }}
              >
                رد على التذكرة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة الرد على التذكرة */}
      {replyTicket && (
        <div className="adm-modal-backdrop" onClick={handleCloseReply}>
          <div className="adm-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="adm-modal-header">
              <h3 className="adm-modal-title">الرد على التذكرة</h3>
              <button type="button" className="adm-modal-close" onClick={handleCloseReply}>
                <X size={20} />
              </button>
            </div>
            <div className="adm-modal-body">
              <div className="adm-form-grid">
                <div className="adm-form-group">
                  <label className="adm-form-label">الرد (سيصل للمستخدم عبر البريد/الإشعارات)</label>
                  <textarea
                    className="adm-form-input"
                    rows={8}
                    style={{ resize: 'vertical' }}
                    value={replyText}
                    placeholder="اكتب ردك هنا..."
                    onChange={(e) => setReplyText(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="adm-modal-footer">
              <button
                type="button"
                className="adm-btn outline"
                onClick={handleCloseReply}
                disabled={busyId === replyTicket._id}
              >
                إلغاء
              </button>
              <button
                type="button"
                className="adm-btn primary"
                onClick={handleSubmitReply}
                disabled={busyId === replyTicket._id}
              >
                {busyId === replyTicket._id ? (
                  <>
                    <RefreshCw size={18} className="spin" />
                    <span>جاري الإرسال...</span>
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    <span>إرسال الرد</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
