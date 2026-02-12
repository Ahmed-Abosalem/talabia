// src/pages/Admin/sections/AdminNotificationsSection.jsx

import { useEffect, useState } from "react";
import { Bell, RefreshCw } from "lucide-react";
import {
  getAdminNotifications,
  createAdminNotification,
  deleteAdminNotification,
} from "@/services/adminService";
import { useApp } from "@/context/AppContext";

const emptyForm = {
  title: "",
  message: "",
  audience: "all",
};

export default function AdminNotificationsSection() {
  const { showToast } = useApp() || {};
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    loadNotifications();
  }, []);

  async function loadNotifications() {
    try {
      setLoading(true);
      setErrorMessage("");
      const data = await getAdminNotifications();
      const list = data?.notifications || data || [];
      setNotifications(Array.isArray(list) ? list : []);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "تعذر تحميل التنبيهات.";
      setErrorMessage(msg);
      showToast?.(msg, "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
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
      await loadNotifications();
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

  async function handleDelete(id) {
    const ok = window.confirm("هل أنت متأكد من حذف هذا التنبيه من السجل؟");
    if (!ok) return;
    try {
      await deleteAdminNotification(id);
      showToast?.("تم حذف التنبيه من السجل.", "success");
      await loadNotifications();
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "تعذر حذف التنبيه.";
      setErrorMessage(msg);
      showToast?.(msg, "error");
    }
  }

  return (
    <section className="admin-section-card">
      <div className="admin-section-header">
        <div className="admin-section-header-main">
          <div className="admin-section-icon">
            <Bell size={18} />
          </div>
          <div>
            <div className="admin-section-title">إدارة التنبيهات</div>
            <div className="admin-section-subtitle">
              إرسال تنبيهات للمستخدمين (مشتري، بائع، شركة شحن) وإدارة سجل
              الإشعارات المرسلة.
            </div>
          </div>
        </div>
        <div className="admin-section-actions">
          <button
            type="button"
            className="admin-button admin-button-ghost"
            onClick={loadNotifications}
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

      {/* نموذج إرسال تنبيه */}
      <form
        onSubmit={handleSubmit}
        className="admin-section-form"
        style={{
          marginTop: "0.8rem",
          marginBottom: "0.8rem",
          borderBottom: "1px solid #e5e7eb",
          paddingBottom: "0.7rem",
        }}
      >
        <div className="admin-profile-form-row">
          <div className="admin-profile-field">
            <label>عنوان التنبيه</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) =>
                setForm((f) => ({ ...f, title: e.target.value }))
              }
            />
          </div>
          <div className="admin-profile-field">
            <label>الفئة المستهدفة</label>
            <select
              value={form.audience}
              onChange={(e) =>
                setForm((f) => ({ ...f, audience: e.target.value }))
              }
              className="users-filter-select"
            >
              <option value="all">كل المستخدمين</option>
              <option value="buyers">المشترون فقط</option>
              <option value="sellers">البائعون فقط</option>
              <option value="shipping">شركات الشحن فقط</option>
            </select>
          </div>
        </div>

        <div className="admin-profile-field">
          <label>نص التنبيه</label>
          <textarea
            rows={3}
            value={form.message}
            onChange={(e) =>
              setForm((f) => ({ ...f, message: e.target.value }))
            }
            style={{
              resize: "vertical",
              minHeight: "80px",
              borderRadius: "10px",
              border: "1px solid #e5e7eb",
              padding: "0.5rem 0.7rem",
              fontSize: "0.85rem",
            }}
          />
        </div>

        <div className="admin-profile-actions" style={{ justifyContent: "flex-end" }}>
          <button
            type="submit"
            className="admin-profile-btn primary"
            disabled={saving}
          >
            {saving ? "جارٍ الإرسال..." : "إرسال التنبيه"}
          </button>
        </div>
      </form>

      {/* جدول التنبيهات */}
      <div className="users-table-wrapper">
        {loading ? (
          <div className="users-empty-state">جاري تحميل التنبيهات...</div>
        ) : notifications.length === 0 ? (
          <div className="users-empty-state">
            لا توجد تنبيهات في السجل حتى الآن.
          </div>
        ) : (
          <table className="users-table">
            <thead>
              <tr>
                <th>العنوان</th>
                <th>الفئة المستهدفة</th>
                <th>التاريخ</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {notifications.map((n) => (
                <tr key={n._id}>
                  <td>{n.title}</td>
                  <td>
                    {n.audience === "buyers"
                      ? "المشترون"
                      : n.audience === "sellers"
                      ? "البائعون"
                      : n.audience === "shipping"
                      ? "شركات الشحن"
                      : "كل المستخدمين"}
                  </td>
                  <td>
                    {n.createdAt
                      ? new Date(n.createdAt).toLocaleString("ar-SA")
                      : "-"}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="users-inline-button danger"
                      onClick={() => handleDelete(n._id)}
                    >
                      حذف من السجل
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
