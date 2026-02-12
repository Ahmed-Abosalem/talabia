import { useEffect, useState } from "react";
import { LifeBuoy, RefreshCw, User, Mail, Phone } from "lucide-react";
import {
  getAdminSupportTickets,
  updateSupportTicketStatus,
  replyToSupportTicket,
  deleteSupportTicket,
} from "@/services/adminService";
import { useApp } from "@/context/AppContext";

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
    <section className="admin-section-card">
      <div className="admin-section-header">
        <div className="admin-section-header-main">
          <div className="admin-section-icon">
            <LifeBuoy size={18} />
          </div>
          <div>
            <div className="admin-section-title">الدعم الفني والتذاكر</div>
            <div className="admin-section-subtitle">
              متابعة طلبات الدعم من العملاء والبائعين وشركات الشحن وتحديث
              حالتها.
            </div>
          </div>
        </div>
        <div className="admin-section-actions">
          <button
            type="button"
            className="admin-button admin-button-ghost"
            onClick={loadTickets}
            disabled={loading}
          >
            <RefreshCw size={14} />
            <span>تحديث</span>
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="admin-error" style={{ marginBottom: "0.6rem" }}>
          {errorMessage}
        </div>
      )}

      <div className="users-toolbar" style={{ marginTop: "0.6rem" }}>
        <input
          className="users-search-input"
          placeholder="بحث بعنوان التذكرة أو اسم المستخدم أو البريد..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="users-filter-select"
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

      <div className="users-table-wrapper">
        {loading ? (
          <div className="users-empty-state">جاري تحميل تذاكر الدعم...</div>
        ) : filtered.length === 0 ? (
          <div className="users-empty-state">
            لا توجد تذاكر مطابقة لخيارات البحث / التصفية.
          </div>
        ) : (
          <table className="users-table">
            <thead>
              <tr>
                <th>العنوان</th>
                <th>المستخدم</th>
                <th>الدور</th>
                <th>الحالة</th>
                <th>تاريخ الإنشاء</th>
                <th>عرض التفاصيل</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t._id}>
                  <td>{t.subject}</td>
                  <td>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.25rem",
                      }}
                    >
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.35rem",
                        }}
                      >
                        <User size={14} />
                        <span>{t.userName || "-"}</span>
                      </span>
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.35rem",
                        }}
                      >
                        <Mail size={14} />
                        <span>{t.userEmail || "-"}</span>
                      </span>
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.35rem",
                        }}
                      >
                        <Phone size={14} />
                        <span>{t.userPhone || "-"}</span>
                      </span>
                    </div>
                  </td>
                  <td>
                    {(() => {
                      const role = t.userRole || "";

                      if (!role) return "-";
                      if (role === "buyer") return "مشتري";
                      if (role === "seller") return "بائع";
                      if (role === "shipper") return "شركة شحن";
                      if (role === "admin") return "مدير";

                      return "-";
                    })()}
                  </td>
                  <td>
                    <select
                      className="users-role-select"
                      value={t.status || "open"}
                      disabled={busyId === t._id}
                      onChange={(e) =>
                        handleStatusChange(t._id, e.target.value)
                      }
                    >
                      <option value="open">{STATUS_LABELS.open}</option>
                      <option value="in_progress">
                        {STATUS_LABELS.in_progress}
                      </option>
                      <option value="resolved">{STATUS_LABELS.resolved}</option>
                      <option value="closed">{STATUS_LABELS.closed}</option>
                    </select>
                  </td>
                  <td>
                    {t.createdAt
                      ? new Date(t.createdAt).toLocaleString("ar-SA")
                      : "-"}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="admin-button admin-button-ghost"
                      onClick={() => handleOpenDetails(t)}
                    >
                      عرض التفاصيل
                    </button>
                  </td>
                  <td>
                    <div
                      style={{
                        display: "flex",
                        gap: "0.4rem",
                        flexWrap: "wrap",
                      }}
                    >
                      {/* زر رد – جعل النص داكن حتى لا يختفي على الخلفية البيضاء */}
                      <button
                        type="button"
                        className="admin-button admin-button-secondary"
                        onClick={() => handleOpenReply(t)}
                        disabled={busyId === t._id}
                      >
                        <span style={{ color: "#111827" }}>رد</span>
                      </button>
                      {/* زر حذف – جعل النص أحمر داكن واضح */}
                      <button
                        type="button"
                        className="admin-button admin-button-danger"
                        onClick={() => handleDeleteTicket(t)}
                        disabled={busyId === t._id}
                      >
                        <span style={{ color: "#b91c1c" }}>حذف</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* نافذة عرض تفاصيل التذكرة – لعرض نص الرسالة فقط */}
      {selectedTicket && (
        <div
          className="admin-modal-overlay"
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15,23,42,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}
        >
          <div
            className="admin-modal"
            style={{
              width: "100%",
              maxWidth: "640px",
              maxHeight: "80vh",
              overflow: "hidden",
              borderRadius: "0.75rem",
              backgroundColor: "#ffffff",
              boxShadow: "0 20px 40px rgba(15,23,42,0.25)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div className="admin-modal-header">
              <h3>تفاصيل التذكرة</h3>
            </div>
            <div
              className="admin-modal-body"
              style={{
                padding: "0.75rem 1rem 1rem",
                overflowY: "auto",
              }}
            >
              <p>
                <strong>نص الرسالة:</strong>
              </p>
              <pre
                style={{
                  whiteSpace: "pre-wrap",
                  background: "#f9fafb",
                  padding: "0.75rem",
                  borderRadius: "0.5rem",
                  border: "1px solid #e5e7eb",
                  fontFamily: "inherit",
                  fontSize: "0.85rem",
                  marginTop: "0.5rem",
                }}
              >
                {selectedTicket.message || "-"}
              </pre>
            </div>
            <div className="admin-modal-footer">
              <button
                type="button"
                className="admin-button admin-button-secondary"
                onClick={handleCloseDetails}
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة الرد على التذكرة */}
      {replyTicket && (
        <div
          className="admin-modal-overlay"
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15,23,42,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}
        >
          <div
            className="admin-modal"
            style={{
              width: "100%",
              maxWidth: "640px",
              maxHeight: "80vh",
              overflow: "hidden",
              borderRadius: "0.75rem",
              backgroundColor: "#ffffff",
              boxShadow: "0 20px 40px rgba(15,23,42,0.25)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div className="admin-modal-header">
              <h3>الرد على التذكرة</h3>
            </div>
            <form
              className="admin-modal-body"
              onSubmit={handleSubmitReply}
              style={{
                padding: "0.75rem 1rem 1rem",
                overflowY: "auto",
              }}
            >
              <p style={{ marginBottom: "0.5rem" }}>
                <strong>العنوان:</strong> {replyTicket.subject || "-"}
              </p>
              <p style={{ marginBottom: "0.5rem" }}>
                <strong>المستخدم:</strong> {replyTicket.userName || "-"} (
                {replyTicket.userEmail || "-"})
              </p>

              <label
                htmlFor="admin-support-reply"
                style={{ display: "block", marginBottom: "0.25rem" }}
              >
                نص الرد
              </label>
              <textarea
                id="admin-support-reply"
                rows={5}
                style={{
                  width: "100%",
                  resize: "vertical",
                  padding: "0.5rem",
                  borderRadius: "0.5rem",
                  border: "1px solid #d1d5db",
                  fontFamily: "inherit",
                  fontSize: "0.9rem",
                }}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
              />

              <div
                className="admin-modal-footer"
                style={{ marginTop: "0.75rem" }}
              >
                <button
                  type="button"
                  className="admin-button admin-button-ghost"
                  onClick={handleCloseReply}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="admin-button admin-button-primary"
                  disabled={busyId === replyTicket._id}
                >
                  إرسال الرد
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
