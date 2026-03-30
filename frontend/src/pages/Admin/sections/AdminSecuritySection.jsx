import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  ShieldCheck,
  Plus,
  Power,
  Trash2,
  Bell,
  Edit3,
  Users,
  Wifi,
  Shield,
  Ban,
  Phone,
  Mail,
  IdCard,
  ListChecks,
  Eye,
  XCircle,
  RefreshCw,
  ChevronLeft,
} from "lucide-react";
import {
  getAdmins,
  createAdmin,
  updateAdminPermissions,
  toggleAdminStatus,
  deleteAdmin,
  sendAdminStaffNotification,
} from "@/services/adminService";
import { formatDate, formatNumber } from "@/utils/formatters";
import "./AdminSecuritySection.css";

// مجموعات الصلاحيات المسموح بها في إدارة الموظفين (بدون إدارة الموظفين نفسها)
const PERMISSION_GROUPS = [
  { id: "users", label: "إدارة المستخدمين" },
  { id: "sellers", label: "إدارة البائعين" },
  { id: "products", label: "إدارة المنتجات" },
  { id: "orders", label: "إدارة الطلبات" },
  { id: "shipping", label: "إدارة شركات الشحن" },
  { id: "payment", label: "إدارة خيارات الدفع" }, // ✅ NEW
  { id: "ads", label: "إدارة الإعلانات" },
  { id: "categories", label: "إدارة الأقسام" },
  { id: "financial", label: "الإدارة المالية" },
  { id: "reports", label: "التقارير والإحصاءات" },
  { id: "notifications", label: "إدارة التنبيهات" },
  { id: "support", label: "إدارة التواصل" },
];

// مستويات الصلاحية (موجودة للاستخدام المستقبلي إن أحببت)
const PERMISSION_LEVELS = [
  { key: "none", label: "لا صلاحية" },
  { key: "view", label: "عرض" },
  { key: "full", label: "تحرير" },
];

function createEmptyPermissions() {
  return Object.fromEntries(PERMISSION_GROUPS.map((g) => [g.id, "none"]));
}



function isAdminOnline(admin) {
  if (!admin?.lastLoginAt) return false;
  const last = new Date(admin.lastLoginAt).getTime();
  if (Number.isNaN(last)) return false;
  const diff = Date.now() - last;
  // يعتبر متصلاً إذا كان آخر دخول خلال آخر 15 دقيقة
  return diff <= 15 * 60 * 1000;
}

function summarizeTasks(permissions) {
  if (!permissions) return ["لا توجد صلاحيات محددة بعد."];

  const entries = Object.entries(permissions)
    .filter(([_, level]) => level && level !== "none")
    .map(([key, level]) => {
      const group = PERMISSION_GROUPS.find((g) => g.id === key);
      if (!group) return null;
      let levelLabel = "";
      if (level === "view") levelLabel = "عرض فقط";
      else if (level === "full" || level === "partial") levelLabel = "تحرير";
      else levelLabel = "صلاحية خاصة";
      return `• ${group.label} → ${levelLabel}`;
    })
    .filter(Boolean);

  if (!entries.length) return ["لا توجد صلاحيات محددة بعد."];

  if (entries.length <= 12) return entries;

  const head = entries.slice(0, 12);
  head.push(`+ ${entries.length - 12} قسم آخر`);
  return head;
}

function countTasks(permissions) {
  if (!permissions) return 0;
  return Object.values(permissions).filter(
    (level) => level && level !== "none"
  ).length;
}

export default function AdminSecuritySection() {
  const navigate = useNavigate();
  const { user, role } = useAuth();

  // المالك الحقيقي للمنصة فقط
  const isOwner = user && role === "admin" && user.isOwner;
  const canView = isOwner;
  const canEdit = isOwner;

  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [searchQuery, setSearchQuery] = useState("");

  // مودال عرض المهام (تلخيص الصلاحيات)
  const [tasksModalAdmin, setTasksModalAdmin] = useState(null);

  // مودال تنبيه الموظف
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notificationTargetAdmin, setNotificationTargetAdmin] = useState(null);
  const [notificationTitle, setNotificationTitle] = useState("");
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationSending, setNotificationSending] = useState(false);
  const [notificationError, setNotificationError] = useState("");
  const [notificationSuccess, setNotificationSuccess] = useState("");

  useEffect(() => {
    // لو ليس مالكًا، لا نحاول حتى الاتصال بالـ API
    if (!canView) {
      setLoading(false);
      return;
    }

    async function loadAdmins() {
      try {
        setLoading(true);
        setErrorMessage("");
        const data = await getAdmins();
        const list = data?.admins || data || [];
        setAdmins(Array.isArray(list) ? list : []);
      } catch (err) {
        setErrorMessage(
          "تعذر تحميل قائمة الموظفين الإداريين. تأكد من أن الخادم يعمل وأن حساب مدير النظام مسجل الدخول."
        );
      } finally {
        setLoading(false);
      }
    }
    loadAdmins();
  }, [canView]);

  // فتح نافذة إضافة موظف جديد
  const openCreateModal = () => {
    if (!canEdit) {
      setErrorMessage("لا تملك صلاحية إضافة موظفين إداريين.");
      return;
    }
    navigate("/admin/security/add-staff");
  };

  // فتح نافذة التعديل لنفس نافذة الإضافة، مع تعبئة البيانات
  const openEditAdminModal = (admin) => {
    if (!canEdit) {
      setErrorMessage("لا تملك صلاحية تعديل موظفين إداريين.");
      return;
    }
    if (!admin) return;
    navigate("/admin/security/add-staff", { state: { admin } });
  };

  const handleToggleStatus = async (adminId) => {
    if (!canEdit) {
      setErrorMessage("لا تملك صلاحية إيقاف أو تفعيل حسابات الموظفين.");
      return;
    }
    try {
      const res = await toggleAdminStatus(adminId);
      const updated = res?.admin || res;
      setAdmins((prev) =>
        prev.map((a) => (a._id === updated._id ? updated : a))
      );
      setSuccessMessage("تم تحديث حالة حساب الموظف بنجاح.");
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "تعذر تغيير حالة الموظف الإداري. تأكد من مسار /api/admin/admins/:id/toggle-status.";
      setErrorMessage(msg);
    }
  };

  const handleDeleteAdmin = async (adminId) => {
    if (!canEdit) {
      setErrorMessage("لا تملك صلاحية حذف موظفين إداريين.");
      return;
    }
    const ok = window.confirm(
      "هل أنت متأكد من حذف هذا الموظف الإداري؟ لا يمكن التراجع عن هذه العملية."
    );
    if (!ok) return;
    try {
      await deleteAdmin(adminId);
      setAdmins((prev) => prev.filter((a) => a._id !== adminId));
      setSuccessMessage("تم حذف الموظف الإداري بنجاح.");
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "تعذر حذف الموظف الإداري. تأكد من مسار DELETE /api/admin/admins/:id.";
      setErrorMessage(msg);
    }
  };

  const openTasksModal = (admin) => {
    setTasksModalAdmin(admin);
  };

  const closeTasksModal = () => {
    setTasksModalAdmin(null);
  };

  // فتح مودال تنبيه الموظف
  const openNotificationModal = (admin) => {
    if (!canEdit) {
      setErrorMessage("لا تملك صلاحية إرسال تنبيهات للموظفين.");
      return;
    }
    if (!admin) return;

    setNotificationTargetAdmin(admin);
    setNotificationTitle("");
    setNotificationMessage("");
    setNotificationError("");
    setNotificationSuccess("");
    setShowNotificationModal(true);
  };

  const closeNotificationModal = () => {
    if (notificationSending) return;
    setShowNotificationModal(false);
    setNotificationTargetAdmin(null);
    setNotificationTitle("");
    setNotificationMessage("");
    setNotificationError("");
    setNotificationSuccess("");
  };

  const handleSendNotification = async () => {
    if (!canEdit) {
      setNotificationError("لا تملك صلاحية إرسال تنبيهات للموظفين.");
      return;
    }
    if (!notificationTargetAdmin) {
      setNotificationError("لم يتم تحديد الموظف المستهدف.");
      return;
    }

    const title = notificationTitle.trim();
    const message = notificationMessage.trim();

    if (!title || !message) {
      setNotificationError("عنوان التنبيه ونص الرسالة حقول إلزامية.");
      return;
    }

    try {
      setNotificationSending(true);
      setNotificationError("");
      setNotificationSuccess("");
      setErrorMessage("");
      setSuccessMessage("");

      await sendAdminStaffNotification(notificationTargetAdmin._id, {
        title,
        message,
      });

      const name = notificationTargetAdmin.name || "";
      const successText =
        name.trim().length > 0
          ? `تم إرسال التنبيه للموظف "${name}" بنجاح.`
          : "تم إرسال التنبيه للموظف بنجاح.";

      setNotificationSuccess(successText);
      setSuccessMessage(successText);

      // إغلاق المودال بعد الإرسال الناجح
      setShowNotificationModal(false);
      setNotificationTargetAdmin(null);
      setNotificationTitle("");
      setNotificationMessage("");
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "تعذر إرسال التنبيه للموظف. تأكد من تفعيل مسار /api/admin/notifications.";
      setNotificationError(msg);
    } finally {
      setNotificationSending(false);
    }
  };

  const totalAdmins = admins.length;
  const activeAdmins = admins.filter((a) => a.isActive !== false).length;
  const suspendedAdmins = admins.filter((a) => a.isActive === false).length;
  const onlineAdmins = admins.filter((a) => isAdminOnline(a)).length;

  const filteredAdmins = admins.filter((admin) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    const name = admin.name?.toLowerCase() || "";
    const email = admin.email?.toLowerCase() || "";
    const phone = (admin.phone || "").toString().toLowerCase();
    const staffCode = (admin.staffCode || "").toString().toLowerCase();
    return (
      name.includes(q) ||
      email.includes(q) ||
      phone.includes(q) ||
      staffCode.includes(q)
    );
  });

  const renderAddPersonalStep = () => (
    <div className="adm-form">
      <div className="adm-notice-box info" style={{ marginBottom: 'var(--sp-3)' }}>
        <div className="adm-notice-content">
          {isEditMode
            ? "تعديل البيانات الأساسية للموظف. ملاحظة: الرمز السري يتطلب مساراً مستقلاً حالياً."
            : "يرجى تعبئة بيانات الموظف الأساسية قبل الانتقال لتحديد الصلاحيات."}
        </div>
      </div>

      <div className="adm-form-row">
        <div className="adm-form-group">
          <label className="adm-form-label">الاسم الكامل *</label>
          <input
            className="adm-form-input"
            type="text"
            value={newAdmin.name}
            onChange={(e) => handleNewAdminChange("name", e.target.value)}
            placeholder="مثال: هلال محمد عبدالله"
          />
        </div>
        <div className="adm-form-group">
          <label className="adm-form-label">المسمى الوظيفي *</label>
          <input
            className="adm-form-input"
            type="text"
            value={newAdmin.title}
            onChange={(e) => handleNewAdminChange("title", e.target.value)}
            placeholder="مثال: مدير عمليات، موظف مالي..."
          />
        </div>
      </div>

      <div className="adm-form-row">
        <div className="adm-form-group">
          <label className="adm-form-label">البريد الإلكتروني *</label>
          <input
            className="adm-form-input"
            type="email"
            value={newAdmin.email}
            onChange={(e) => handleNewAdminChange("email", e.target.value)}
            placeholder="email@company.com"
          />
        </div>
        <div className="adm-form-group">
          <label className="adm-form-label">رقم الهاتف *</label>
          <input
            className="adm-form-input"
            type="text"
            value={newAdmin.phone}
            onChange={(e) => handleNewAdminChange("phone", e.target.value)}
            placeholder="+9665XXXXXXXX"
          />
        </div>
      </div>

      <div className="adm-form-row">
        <div className="adm-form-group">
          <label className="adm-form-label">الرمز السري {isEditMode ? "(محمي)" : "*"}</label>
          <input
            className="adm-form-input"
            type="password"
            value={newAdmin.password}
            onChange={(e) => handleNewAdminChange("password", e.target.value)}
            placeholder={isEditMode ? "••••••••" : "••••••••"}
            disabled={isEditMode}
          />
        </div>
        <div className="adm-form-group">
          <label className="adm-form-label">رقم الصلاحية (System ID)</label>
          <input
            className="adm-form-input"
            type="text"
            value={newAdmin.staffCode}
            onChange={(e) => handleNewAdminChange("staffCode", e.target.value)}
            placeholder="A83921 أو رقم داخلي"
          />
        </div>
      </div>
    </div>
  );

  const renderAddPermissionsStep = () => (
    <div className="adm-form">
      <div className="adm-notice-box info" style={{ marginBottom: 'var(--sp-2)' }}>
        <div className="adm-notice-content">
          حدد مستوى الصلاحية لكل قسم. "عرض" تتيح المطالعة فقط، و"تحرير" تتيح القيام بالإجراءات.
        </div>
      </div>

      <div className="adm-table-wrapper" style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid var(--adm-border)', borderRadius: 'var(--rad-md)' }}>
        <table className="adm-table mini">
          <thead>
            <tr>
              <th>الإدارة</th>
              <th style={{ width: '80px', textAlign: 'center' }}>عرض</th>
              <th style={{ width: '80px', textAlign: 'center' }}>تحرير</th>
              <th style={{ width: '40px', textAlign: 'center' }}>
                <button type="button" className="adm-icon-btn danger" onClick={clearNewPermissions} title="إلغاء الكل">
                  <XCircle size={14} />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {PERMISSION_GROUPS.map((group) => {
              const level = newAdmin.permissions[group.id] || "none";
              const isView = level === "view";
              const isFull = level === "full";

              return (
                <tr key={group.id}>
                  <td style={{ fontWeight: 600 }}>{group.label}</td>
                  <td style={{ textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      className="adm-form-checkbox"
                      checked={isView}
                      onChange={() => toggleNewAdminPermission(group.id, "view")}
                    />
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      className="adm-form-checkbox"
                      checked={isFull}
                      onChange={() => toggleNewAdminPermission(group.id, "full")}
                    />
                  </td>
                  <td></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ─────────────────────────────
  // الواجهة
  // ─────────────────────────────
  return (
    <section className="adm-section-panel">
      <div className="adm-section-inner-header">
        <div className="adm-section-icon">
          <ShieldCheck size={18} />
        </div>
        <div className="adm-section-title-group">
          <div className="adm-section-title">إدارة الموظفين</div>
          <div className="adm-section-subtitle">
            عرض موظفي لوحة التحكم، متابعة حالة الاتصال، وتحديد الصلاحيات لكل موظف بدقة. متاحة لمالك المنصة فقط.
          </div>
        </div>
        {canView && canEdit && (
          <div className="adm-section-actions">
            <button type="button" className="adm-btn primary" onClick={openCreateModal}>
              <Plus size={14} />
              <span>إضافة موظف جديد</span>
            </button>
          </div>
        )}
      </div>

      {!canView && (
        <div className="adm-notice-box danger">
          <div className="adm-notice-content">
            لا تملك صلاحية الوصول إلى إدارة الموظفين. هذه الإدارة مخصّصة لمالك المنصة فقط.
          </div>
        </div>
      )}

      {canView && (
        <>
          <div className="adm-stats-grid">
            <div className="adm-stat-card">
              <div className="adm-stat-icon"><Users size={18} /></div>
              <div className="adm-stat-label">إجمالي الموظفين</div>
              <div className="adm-stat-value">{formatNumber(totalAdmins)}</div>
            </div>
            <div className="adm-stat-card">
              <div className="adm-stat-icon"><Wifi size={18} /></div>
              <div className="adm-stat-label">متصل الآن</div>
              <div className="adm-stat-value">{formatNumber(onlineAdmins)}</div>
            </div>
            <div className="adm-stat-card">
              <div className="adm-stat-icon"><Shield size={18} /></div>
              <div className="adm-stat-label">حسابات نشطة</div>
              <div className="adm-stat-value">{activeAdmins}</div>
            </div>
            <div className="adm-stat-card">
              <div className="adm-stat-icon"><Ban size={18} /></div>
              <div className="adm-stat-label">حسابات موقوفة</div>
              <div className="adm-stat-value">{suspendedAdmins}</div>
            </div>
          </div>

          <div className="adm-toolbar">
            <div className="adm-search-wrapper">
              <input
                className="adm-search-input"
                type="text"
                placeholder="بحث بالاسم، البريد، الهاتف، أو رقم الصلاحية..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {(errorMessage || successMessage) && (
            <div style={{ marginBottom: 'var(--sp-3)' }}>
              {errorMessage && <div className="adm-error-box">{errorMessage}</div>}
              {successMessage && <div className="adm-notice-box success">{successMessage}</div>}
            </div>
          )}

          <div className="adm-table-wrapper">
            {loading ? (
              <div className="adm-empty-state">
                <RefreshCw size={24} className="spin" />
                <p>جاري تحميل بيانات الموظفين...</p>
              </div>
            ) : filteredAdmins.length === 0 ? (
              <div className="adm-empty-state">
                <Users size={24} />
                <h3>لا توجد نتائج</h3>
                <p>لا يوجد موظفون إداريون يطابقون نتائج البحث الحالية.</p>
              </div>
            ) : (
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>الموظف والوظيفة</th>
                    <th>بيانات الاتصال</th>
                    <th>الحالة والنشاط</th>
                    <th style={{ textAlign: 'center' }}>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAdmins.map((admin) => {
                    const tasksCount = countTasks(admin.permissions);
                    const online = isAdminOnline(admin);
                    const isActive = admin.isActive !== false;

                    return (
                      <tr key={admin._id}>
                        <td>
                          <div className="adm-user-cell">
                            <div className="adm-avatar-circle small">
                              {admin.name?.trim()?.charAt(0) || "م"}
                            </div>
                            <div>
                              <div className="adm-user-name">{admin.name}</div>
                              <div className="adm-user-email">{admin.title || "بدون مسمّى وظيفي"}</div>
                              <button
                                type="button"
                                className="adm-status-chip info"
                                style={{ marginTop: '4px', cursor: 'pointer', border: 'none' }}
                                onClick={() => openTasksModal(admin)}
                              >
                                <ListChecks size={12} />
                                <span>{tasksCount} مهام</span>
                              </button>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div className="adm-info-list mini">
                            <div className="adm-info-unit">
                              <Phone size={12} />
                              <span>{admin.phone || "-"}</span>
                            </div>
                            <div className="adm-info-unit">
                              <Mail size={12} />
                              <span>{admin.email}</span>
                            </div>
                            {admin.staffCode && (
                              <div className="adm-info-unit">
                                <IdCard size={12} />
                                <span className="adm-code">{admin.staffCode}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span className={`adm-status-chip ${isActive ? 'active' : 'danger'}`}>
                              {isActive ? "نشط" : "موقوف"}
                            </span>
                            <span className={`adm-status-chip ${online ? 'success' : 'muted'}`}>
                              {online ? "متصل الآن" : admin.lastLoginAt ? `نشط: ${formatDate(admin.lastLoginAt)}` : "لا يوجد نشاط"}
                            </span>
                          </div>
                        </td>

                        <td>
                          <div className="adm-actions-row center">
                            {canEdit && (
                              <>
                                <button type="button" className="adm-icon-btn" onClick={() => openEditAdminModal(admin)} title="تعديل">
                                  <Edit3 size={14} />
                                </button>
                                <button type="button" className="adm-icon-btn accent" onClick={() => openNotificationModal(admin)} title="تنبيه">
                                  <Bell size={14} />
                                </button>
                                <button type="button" className={`adm-icon-btn ${isActive ? 'warning' : 'success'}`} onClick={() => handleToggleStatus(admin._id)} title={isActive ? "إيقاف" : "تفعيل"}>
                                  <Power size={14} />
                                </button>
                                <button type="button" className="adm-icon-btn danger" onClick={() => handleDeleteAdmin(admin._id)} title="حذف">
                                  <Trash2 size={14} />
                                </button>
                              </>
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
          {tasksModalAdmin && (
            <div className="adm-modal-backdrop" onClick={closeTasksModal}>
              <div className="adm-modal" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
                <div className="adm-modal-header">
                  <h2 className="adm-modal-title">
                    <ListChecks size={20} />
                    <span>المهام الموكلة: {tasksModalAdmin.name}</span>
                  </h2>
                </div>
                <div className="adm-modal-body">
                  <div className="adm-notice-box info" style={{ marginBottom: 'var(--sp-3)' }}>
                    <div className="adm-notice-content">
                      هذه قائمة مختصرة بالصلاحيات والمهام المرتبطة بهذا الموظف الإداري.
                    </div>
                  </div>
                  <ul className="adm-list">
                    {summarizeTasks(tasksModalAdmin.permissions).map((line, idx) => (
                      <li key={idx} className="adm-list-item">{line}</li>
                    ))}
                  </ul>
                </div>
                <div className="adm-modal-footer">
                  <button type="button" className="adm-btn ghost" onClick={closeTasksModal}>إغلاق</button>
                </div>
              </div>
            </div>
          )}

          {showNotificationModal && notificationTargetAdmin && (
            <div className="adm-modal-backdrop" onClick={closeNotificationModal}>
              <div className="adm-modal" style={{ maxWidth: '540px' }} onClick={(e) => e.stopPropagation()}>
                <div className="adm-modal-header">
                  <h2 className="adm-modal-title">
                    <Bell size={20} />
                    <span>تنبيه موظف: {notificationTargetAdmin.name}</span>
                  </h2>
                </div>
                <div className="adm-modal-body">
                  <div className="adm-form">
                    <div className="adm-form-group">
                      <label className="adm-form-label">عنوان التنبيه *</label>
                      <input
                        className="adm-form-input"
                        type="text"
                        value={notificationTitle}
                        onChange={(e) => setNotificationTitle(e.target.value)}
                        placeholder="مثال: تنبيه بخصوص متابعة التذاكر"
                      />
                    </div>

                    <div className="adm-form-group">
                      <label className="adm-form-label">نص الرسالة *</label>
                      <textarea
                        className="adm-form-textarea"
                        rows={4}
                        value={notificationMessage}
                        onChange={(e) => setNotificationMessage(e.target.value)}
                        placeholder="اكتب نص التنبيه الذي سيصل للموظف..."
                      />
                    </div>
                  </div>

                  {notificationError && (
                    <div className="adm-error-box" style={{ marginTop: 'var(--sp-2)' }}>
                      <RefreshCw size={14} />
                      <span>{notificationError}</span>
                    </div>
                  )}
                  {notificationSuccess && (
                    <div className="adm-notice-box success" style={{ marginTop: 'var(--sp-2)' }}>
                      <div className="adm-notice-content">{notificationSuccess}</div>
                    </div>
                  )}
                </div>

                <div className="adm-modal-footer">
                  <button type="button" className="adm-btn ghost" onClick={closeNotificationModal} disabled={notificationSending}>إلغاء</button>
                  <button type="button" className="adm-btn primary" onClick={handleSendNotification} disabled={notificationSending}>
                    {notificationSending ? <RefreshCw size={14} className="spin" /> : <Bell size={14} />}
                    <span>{notificationSending ? "جارٍ الإرسال..." : "إرسال التنبيه"}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
