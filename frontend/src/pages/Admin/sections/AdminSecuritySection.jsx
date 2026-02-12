import { useEffect, useState } from "react";
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
} from "lucide-react";
import {
  getAdmins,
  createAdmin,
  updateAdminPermissions,
  toggleAdminStatus,
  deleteAdmin,
  sendAdminStaffNotification,
} from "@/services/adminService";
import "./AdminSecuritySection.css";

// مجموعات الصلاحيات المسموح بها في إدارة الموظفين (بدون إدارة الموظفين نفسها)
const PERMISSION_GROUPS = [
  { id: "users", label: "إدارة المستخدمين" },
  { id: "sellers", label: "إدارة البائعين" },
  { id: "products", label: "إدارة المنتجات" },
  { id: "orders", label: "إدارة الطلبات" },
  { id: "shipping", label: "إدارة شركات الشحن" },
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

function formatDateTime(value) {
  if (!value) return "غير متوفر حاليًا";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "غير متوفر حاليًا";
  return d.toLocaleString("ar-SA");
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

  // مودال الإضافة / التعديل (نفس النافذة)
  const [showAddModal, setShowAddModal] = useState(false);
  const [addSaving, setAddSaving] = useState(false);
  const [addStep, setAddStep] = useState("personal"); // personal | permissions
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingAdminId, setEditingAdminId] = useState(null);
  const [newAdmin, setNewAdmin] = useState({
    name: "",
    email: "",
    phone: "",
    staffCode: "",
    password: "",
    title: "",
    permissions: createEmptyPermissions(),
  });

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

  const validateEmail = (email) => /\S+@\S+\.\S+/.test(email);

  const handleNewAdminChange = (field, value) => {
    setNewAdmin((prev) => ({ ...prev, [field]: value }));
  };

  // تبديل صلاحية إدارة معينة (عرض / تحرير / لا شيء) في خطوة الإضافة/التعديل
  const toggleNewAdminPermission = (groupId, targetLevel) => {
    setNewAdmin((prev) => {
      const current = prev.permissions?.[groupId] || "none";
      let next = targetLevel;
      // الضغط مرة ثانية على نفس المستوى يلغي الصلاحية
      if (current === targetLevel) {
        next = "none";
      }
      return {
        ...prev,
        permissions: {
          ...prev.permissions,
          [groupId]: next,
        },
      };
    });
  };

  const clearNewPermissions = () => {
    setNewAdmin((prev) => ({
      ...prev,
      permissions: createEmptyPermissions(),
    }));
  };

  const setAllNewPermissions = (level) => {
    setNewAdmin((prev) => ({
      ...prev,
      permissions: Object.fromEntries(
        PERMISSION_GROUPS.map((g) => [g.id, level])
      ),
    }));
  };

  // إنشاء موظف جديد
  const handleCreateAdmin = async () => {
    setErrorMessage("");
    setSuccessMessage("");

    if (!canEdit) {
      setErrorMessage("لا تملك صلاحية إضافة موظفين إداريين.");
      return;
    }

    if (!newAdmin.name.trim() || !newAdmin.email.trim() || !newAdmin.password) {
      setErrorMessage("الاسم، البريد، وكلمة المرور حقول إلزامية.");
      setAddStep("personal");
      return;
    }

    if (!validateEmail(newAdmin.email.trim())) {
      setErrorMessage("صيغة البريد الإلكتروني غير صحيحة.");
      setAddStep("personal");
      return;
    }

    if (newAdmin.password.length < 6) {
      setErrorMessage("كلمة المرور يجب ألا تقل عن 6 رموز.");
      setAddStep("personal");
      return;
    }

    try {
      setAddSaving(true);
      const payload = {
        name: newAdmin.name.trim(),
        email: newAdmin.email.trim(),
        phone: newAdmin.phone.trim(),
        staffCode: newAdmin.staffCode.trim(),
        password: newAdmin.password,
        title: newAdmin.title.trim(),
        permissions: newAdmin.permissions,
      };

      const res = await createAdmin(payload);
      const created = res?.admin || res;

      setAdmins((prev) => [...prev, created]);
      setShowAddModal(false);
      setIsEditMode(false);
      setEditingAdminId(null);
      setNewAdmin({
        name: "",
        email: "",
        phone: "",
        staffCode: "",
        password: "",
        title: "",
        permissions: createEmptyPermissions(),
      });
      setAddStep("personal");
      setSuccessMessage("تم إنشاء الموظف الإداري بنجاح.");
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "تعذر إنشاء الموظف الإداري الجديد. تأكد من تفعيل مسار /api/admin/admins.";
      setErrorMessage(msg);
    } finally {
      setAddSaving(false);
    }
  };

  // حفظ في وضع التعديل أو الإضافة
  const handleSaveAdmin = async () => {
    setErrorMessage("");
    setSuccessMessage("");

    // وضع التعديل: نحدّث بيانات الموظف + صلاحياته
    if (isEditMode) {
      if (!canEdit) {
        setErrorMessage("لا تملك صلاحية تعديل صلاحيات وبيانات الموظفين.");
        return;
      }
      if (!editingAdminId) return;

      // تحقق بسيط من الاسم والبريد
      if (!newAdmin.name.trim() || !newAdmin.email.trim()) {
        setErrorMessage("الاسم والبريد الإلكتروني حقول إلزامية.");
        setAddStep("personal");
        return;
      }

      if (!validateEmail(newAdmin.email.trim())) {
        setErrorMessage("صيغة البريد الإلكتروني غير صحيحة.");
        setAddStep("personal");
        return;
      }

      try {
        setAddSaving(true);

        const payload = {
          name: newAdmin.name.trim(),
          email: newAdmin.email.trim(),
          phone: newAdmin.phone.trim(),
          staffCode: newAdmin.staffCode.trim(),
          title: newAdmin.title.trim(),
          permissions: newAdmin.permissions,
        };

        const res = await updateAdminPermissions(editingAdminId, payload);
        const updated = res?.admin || res;

        setAdmins((prev) =>
          prev.map((a) => (a._id === updated._id ? updated : a))
        );
        setShowAddModal(false);
        setIsEditMode(false);
        setEditingAdminId(null);
        setNewAdmin({
          name: "",
          email: "",
          phone: "",
          staffCode: "",
          password: "",
          title: "",
          permissions: createEmptyPermissions(),
        });
        setAddStep("personal");
        setSuccessMessage("تم تحديث بيانات وصلاحيات الموظف الإداري بنجاح.");
      } catch (err) {
        const msg =
          err?.response?.data?.message ||
          err?.message ||
          "تعذر حفظ بيانات الموظف الإداري. تأكد من مسار /api/admin/admins/:id/permissions.";
        setErrorMessage(msg);
      } finally {
        setAddSaving(false);
      }
      return;
    }

    // وضع الإضافة
    await handleCreateAdmin();
  };

  // فتح نافذة إضافة موظف جديد
  const openCreateModal = () => {
    if (!canEdit) {
      setErrorMessage("لا تملك صلاحية إضافة موظفين إداريين.");
      return;
    }
    setIsEditMode(false);
    setEditingAdminId(null);
    setNewAdmin({
      name: "",
      email: "",
      phone: "",
      staffCode: "",
      password: "",
      title: "",
      permissions: createEmptyPermissions(),
    });
    setErrorMessage("");
    setSuccessMessage("");
    setAddStep("personal");
    setShowAddModal(true);
  };

  // فتح نافذة التعديل لنفس نافذة الإضافة، مع تعبئة البيانات
  const openEditAdminModal = (admin) => {
    if (!canEdit) {
      setErrorMessage("لا تملك صلاحية تعديل موظفين إداريين.");
      return;
    }
    if (!admin) return;
    const base = createEmptyPermissions();
    const perms = admin.permissions || {};
    const normalized = {};

    PERMISSION_GROUPS.forEach((g) => {
      let val = perms[g.id] || "none";
      if (val === "partial") val = "view";
      if (!["none", "view", "full"].includes(val)) val = "none";
      normalized[g.id] = val;
    });

    setIsEditMode(true);
    setEditingAdminId(admin._id);
    setNewAdmin({
      name: admin.name || "",
      email: admin.email || "",
      phone: admin.phone || "",
      staffCode: admin.staffCode || "",
      password: "",
      title: admin.title || "",
      permissions: { ...base, ...normalized },
    });
    setErrorMessage("");
    setSuccessMessage("");
    setAddStep("personal");
    setShowAddModal(true);
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

  // خطوة البيانات الشخصية في المودال
  const renderAddPersonalStep = () => (
    <div className="admin-add-step-wrapper">
      <div className="admin-modal-title-block">
        <div className="admin-modal-title">
          {isEditMode ? "تعديل بيانات الموظف الإداري" : "إضافة موظف جديد"}
        </div>
        <div className="admin-modal-subtitle">
          {isEditMode
            ? "يمكنك تعديل بيانات الموظف الإداري وصلاحياته من خلال هذه النافذة، باستثناء كلمة المرور التي سيتم تخصيص مسار مستقل لها لاحقًا."
            : "يرجى تعبئة بيانات الموظف الذي سيعمل عن بُعد، ثم الانتقال لتحديد الصلاحيات على إدارات لوحة التحكم."}
        </div>
      </div>

      <div className="admin-add-personal-grid">
        <div className="admin-field">
          <label>الاسم الكامل *</label>
          <input
            type="text"
            value={newAdmin.name}
            onChange={(e) => handleNewAdminChange("name", e.target.value)}
            placeholder="مثال: هلال محمد عبدالله"
          />
        </div>

        <div className="admin-field">
          <label>المسمى الوظيفي *</label>
          <input
            type="text"
            value={newAdmin.title}
            onChange={(e) => handleNewAdminChange("title", e.target.value)}
            placeholder="مثال: مدير عمليات، موظف مالي..."
          />
        </div>

        <div className="admin-field">
          <label>البريد الإلكتروني *</label>
          <input
            type="email"
            value={newAdmin.email}
            onChange={(e) => handleNewAdminChange("email", e.target.value)}
            placeholder="email@company.com"
          />
        </div>

        <div className="admin-field">
          <label>رقم الهاتف *</label>
          <input
            type="text"
            value={newAdmin.phone}
            onChange={(e) => handleNewAdminChange("phone", e.target.value)}
            placeholder="+9665XXXXXXXX"
          />
        </div>

        <div className="admin-field">
          <label>الرمز السري {isEditMode ? "(غير قابل للتعديل هنا)" : "*"}</label>
          <input
            type="password"
            value={newAdmin.password}
            onChange={(e) => handleNewAdminChange("password", e.target.value)}
            placeholder={
              isEditMode
                ? "لا يمكن تعديل كلمة المرور من هذه النافذة حالياً"
                : "••••••••"
            }
            disabled={isEditMode}
          />
        </div>

        <div className="admin-field">
          <label>رقم الصلاحية (System ID)</label>
          <input
            type="text"
            value={newAdmin.staffCode}
            onChange={(e) =>
              handleNewAdminChange("staffCode", e.target.value)
            }
            placeholder="A83921 أو رقم داخلي آخر"
          />
        </div>
      </div>

      <div className="admin-modal-note">
        {isEditMode
          ? "ملاحظة: تعديل بيانات الموظف (الاسم، البريد، الهاتف، المسمّى، رقم الصلاحية) يتم حفظه مع الصلاحيات من خلال هذه النافذة. كلمة المرور ستظل كما هي حتى يتم إنشاء مسار مخصص لتعديلها."
          : "ملاحظة: الرمز السري يتم حفظه بشكل مشفر في قاعدة البيانات، ولن يظهر بعد حفظ الموظف."}
      </div>
    </div>
  );

  // خطوة جدول الصلاحيات في المودال
  const renderAddPermissionsStep = () => (
    <div className="admin-add-step-wrapper">
      <div className="admin-modal-title-block">
        <div className="admin-modal-title">قائمة الصلاحيات</div>
        <div className="admin-modal-subtitle">
          جدول الصلاحيات التالي يحدد دور الموظف في كل إدارة من إدارات لوحة
          التحكم. يمكنك اختيار "عرض" أو "تحرير" لكل إدارة، والضغط مرة ثانية
          على نفس الخيار يلغي الصلاحية.
        </div>
      </div>

      <div className="admin-permissions-matrix">
        <div className="admin-permissions-matrix-header">
          <span>يمكنك التحكم في الصلاحيات لكل إدارة من الإدارات التالية.</span>
          <div className="admin-permissions-matrix-header-icons">
            <button
              type="button"
              className="admin-icon-button"
              title="تعيين الكل على العرض"
              onClick={() => setAllNewPermissions("view")}
            >
              <Eye size={16} />
            </button>
            <button
              type="button"
              className="admin-icon-button"
              title="تعيين الكل على التحرير"
              onClick={() => setAllNewPermissions("full")}
            >
              <Edit3 size={16} />
            </button>
            <button
              type="button"
              className="admin-icon-button"
              title="إلغاء تحديد الكل"
              onClick={clearNewPermissions}
            >
              <XCircle size={16} />
            </button>
          </div>
        </div>

        <div className="admin-permissions-matrix-table-wrapper">
          <table className="admin-permissions-matrix-table">
            <thead>
              <tr>
                <th style={{ width: "40%" }}>الإدارة</th>
                <th>عرض</th>
                <th>تحرير</th>
              </tr>
            </thead>
            <tbody>
              {PERMISSION_GROUPS.map((group) => {
                const level = newAdmin.permissions[group.id] || "none";
                const isView = level === "view";
                const isFull = level === "full";

                return (
                  <tr key={group.id}>
                    <td className="admin-permission-group-cell">
                      <span className="admin-permission-group-title">
                        {group.label}
                      </span>
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={isView}
                        onChange={() =>
                          toggleNewAdminPermission(group.id, "view")
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={isFull}
                        onChange={() =>
                          toggleNewAdminPermission(group.id, "full")
                        }
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // ─────────────────────────────
  // الواجهة
  // ─────────────────────────────
  return (
    <section className="admin-section-card">
      {/* رأس القسم */}
      <div className="admin-section-header">
        <div className="admin-section-header-main">
          <div className="admin-section-icon">
            <ShieldCheck size={18} />
          </div>
          <div>
            <div className="admin-section-title">إدارة الموظفين</div>
            <div className="admin-section-subtitle">
              عرض موظفي لوحة التحكم، متابعة حالة الاتصال، وتحديد الصلاحيات
              لكل موظف بدقة. هذه الإدارة متاحة لمالك المنصة فقط.
            </div>
          </div>
        </div>
      </div>

      {/* لو لم يكن المستخدِم مالك المنصة */}
      {!canView && (
        <div className="admin-empty-state admin-empty-state--spaced">
          لا تملك صلاحية الوصول إلى إدارة الموظفين. هذه الإدارة مخصّصة لمالك
          المنصة فقط.
        </div>
      )}

      {canView && (
        <>
          {/* كروت الإحصائيات */}
          <div className="admin-staff-overview-cards">
            <div className="admin-staff-stat-card">
              <div className="admin-staff-stat-inner">
                <div className="admin-staff-stat-icon users">
                  <Users size={18} />
                </div>
                <div>
                  <div className="admin-staff-stat-value">{totalAdmins}</div>
                  <div className="admin-staff-stat-label">إجمالي الموظفين</div>
                </div>
              </div>
            </div>
            <div className="admin-staff-stat-card">
              <div className="admin-staff-stat-inner">
                <div className="admin-staff-stat-icon online">
                  <Wifi size={18} />
                </div>
                <div>
                  <div className="admin-staff-stat-value">{onlineAdmins}</div>
                  <div className="admin-staff-stat-label">متصل الآن</div>
                </div>
              </div>
            </div>
            <div className="admin-staff-stat-card">
              <div className="admin-staff-stat-inner">
                <div className="admin-staff-stat-icon active">
                  <Shield size={18} />
                </div>
                <div>
                  <div className="admin-staff-stat-value">{activeAdmins}</div>
                  <div className="admin-staff-stat-label">حسابات نشطة</div>
                </div>
              </div>
            </div>
            <div className="admin-staff-stat-card">
              <div className="admin-staff-stat-inner">
                <div className="admin-staff-stat-icon suspended">
                  <Ban size={18} />
                </div>
                <div>
                  <div className="admin-staff-stat-value">
                    {suspendedAdmins}
                  </div>
                  <div className="admin-staff-stat-label">حسابات موقوفة</div>
                </div>
              </div>
            </div>
          </div>

          {/* شريط البحث وأزرار الأدوات */}
          <div className="admin-staff-toolbar">
            <div className="admin-staff-search">
              <input
                type="text"
                placeholder="بحث بالاسم، البريد، الهاتف، أو رقم الصلاحية..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="admin-staff-toolbar-actions">
              <button
                type="button"
                className="admin-button admin-button-rect admin-button-outline"
                onClick={() => {
                  // مساحة لتصفية متقدمة لاحقًا
                }}
              >
                تصفية
              </button>
              {canEdit && (
                <button
                  type="button"
                  className="admin-button admin-button-primary-rect admin-button-rect"
                  onClick={openCreateModal}
                >
                  <Plus size={14} />
                  <span>إضافة موظف جديد</span>
                </button>
              )}
            </div>
          </div>

          {errorMessage && (
            <div className="admin-error admin-error--spaced">
              {errorMessage}
            </div>
          )}
          {successMessage && (
            <div className="admin-success admin-success--spaced">
              {successMessage}
            </div>
          )}

          {/* جدول الموظفين */}
          {loading ? (
            <div className="admin-empty-state admin-empty-state--spaced">
              جاري تحميل بيانات الموظفين الإداريين...
            </div>
          ) : filteredAdmins.length === 0 ? (
            <div className="admin-empty-state admin-empty-state--spaced">
              لا يوجد موظفون إداريون يطابقون نتائج البحث الحالية.
            </div>
          ) : (
            <div className="admin-staff-table-wrapper">
              <table className="admin-staff-table">
                <thead>
                  <tr>
                    <th>الموظف والوظيفة</th>
                    <th>بيانات الاتصال والصلاحية</th>
                    <th>الحالة والنشاط</th>
                    <th>لوحة التحكم والإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAdmins.map((admin) => {
                    const tasksCount = countTasks(admin.permissions);
                    const online = isAdminOnline(admin);
                    const isActive = admin.isActive !== false;

                    return (
                      <tr key={admin._id}>
                        {/* الموظف والوظيفة */}
                        <td>
                          <div className="admin-staff-name-row">
                            <span className="admin-avatar-circle">
                              {admin.name?.trim()?.charAt(0) || "م"}
                            </span>
                            <div>
                              <div className="admin-staff-name">
                                {admin.name}
                              </div>
                              <div className="admin-staff-title">
                                {admin.title || "لم يتم تحديد مسمّى وظيفي."}
                              </div>

                              <button
                                type="button"
                                className="admin-staff-tasks-chip"
                                onClick={() => openTasksModal(admin)}
                              >
                                <ListChecks size={13} />
                                <span>
                                  {tasksCount > 0
                                    ? `${tasksCount} مهام موكلة`
                                    : "لا توجد مهام"}
                                </span>
                              </button>
                            </div>
                          </div>
                        </td>

                        {/* بيانات الاتصال والصلاحية */}
                        <td>
                          <div className="admin-staff-contact-item">
                            <Phone size={13} />
                            <span>
                              {admin.phone || "لا يوجد رقم هاتف مسجّل"}
                            </span>
                          </div>
                          <div className="admin-staff-contact-item">
                            <Mail size={13} />
                            <span>{admin.email}</span>
                          </div>
                          <div className="admin-staff-contact-item">
                            <IdCard size={13} />
                            <span className="admin-staff-code-badge">
                              {admin.staffCode || "غير محدّد"}
                            </span>
                          </div>
                        </td>

                        {/* الحالة والنشاط */}
                        <td>
                          <div className="admin-status-badges">
                            <span
                              className={
                                "admin-status-badge " +
                                (isActive
                                  ? "admin-status-badge-active"
                                  : "admin-status-badge-inactive")
                              }
                            >
                              {isActive ? "نشط" : "موقوف"}
                            </span>

                            <span
                              className={
                                "admin-status-badge admin-status-badge-activity " +
                                (online
                                  ? "admin-status-badge-online"
                                  : "admin-status-badge-offline")
                              }
                            >
                              {online
                                ? "متصل الآن"
                                : admin.lastLoginAt
                                ? `آخر ظهور: ${formatDateTime(
                                    admin.lastLoginAt
                                  )}`
                                : "لا يوجد نشاط مسجّل"}
                            </span>
                          </div>
                        </td>

                        {/* لوحة التحكم والإجراءات */}
                        <td>
                          {canEdit ? (
                            <div className="admin-staff-actions-list">
                              <button
                                type="button"
                                className="admin-staff-action-link"
                                onClick={() => openEditAdminModal(admin)}
                              >
                                <Edit3 size={13} />
                                <span>تعديل</span>
                              </button>

                              <button
                                type="button"
                                className="admin-staff-action-link"
                                onClick={() => openNotificationModal(admin)}
                              >
                                <Bell size={13} />
                                <span>تنبيه</span>
                              </button>

                              <button
                                type="button"
                                className="admin-staff-action-link admin-staff-action-warning"
                                onClick={() => handleToggleStatus(admin._id)}
                              >
                                <Power size={13} />
                                <span>{isActive ? "إيقاف" : "تفعيل"}</span>
                              </button>

                              <button
                                type="button"
                                className="admin-staff-action-link admin-staff-action-danger"
                                onClick={() => handleDeleteAdmin(admin._id)}
                              >
                                <Trash2 size={13} />
                                <span>حذف</span>
                              </button>
                            </div>
                          ) : (
                            <span className="admin-table-note">
                              عرض فقط (لا صلاحيات تعديل)
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* مودال إضافة / تعديل موظف */}
          {showAddModal && (
            <div className="admin-modal-backdrop">
              <div className="admin-modal">
                <div className="admin-add-main admin-add-main--wizard">
                  {/* شريط الخطوات أعلى النافذة */}
                  <div className="admin-add-stepper">
                    <button
                      type="button"
                      className={
                        "admin-add-step-pill " +
                        (addStep === "personal" ? "active" : "done")
                      }
                      onClick={() => setAddStep("personal")}
                    >
                      <span className="admin-add-step-number">1</span>
                      <span>البيانات الشخصية</span>
                    </button>
                    <button
                      type="button"
                      className={
                        "admin-add-step-pill " +
                        (addStep === "permissions" ? "active" : "")
                      }
                      onClick={() => setAddStep("permissions")}
                    >
                      <span className="admin-add-step-number">2</span>
                      <span>جدول الصلاحيات</span>
                    </button>
                  </div>

                  {/* جسم النافذة */}
                  <div className="admin-modal-body">
                    {addStep === "personal"
                      ? renderAddPersonalStep()
                      : renderAddPermissionsStep()}

                    {errorMessage && (
                      <div className="admin-error admin-error--top">
                        {errorMessage}
                      </div>
                    )}
                  </div>
                </div>

                {/* أزرار أسفل المودال */}
                <div className="admin-modal-actions">
                  <button
                    type="button"
                    className="admin-button admin-button-ghost"
                    onClick={() => {
                      setShowAddModal(false);
                      setIsEditMode(false);
                      setEditingAdminId(null);
                      setAddStep("personal");
                    }}
                    disabled={addSaving}
                  >
                    إلغاء
                  </button>

                  {addStep === "permissions" && (
                    <button
                      type="button"
                      className="admin-button admin-button-outline"
                      onClick={() => setAddStep("personal")}
                      disabled={addSaving}
                    >
                      السابق
                    </button>
                  )}

                  <button
                    type="button"
                    className="admin-button admin-button-primary-rect"
                    onClick={
                      addStep === "personal"
                        ? () => setAddStep("permissions")
                        : handleSaveAdmin
                    }
                    disabled={addSaving}
                  >
                    {addSaving
                      ? "جارٍ الحفظ..."
                      : addStep === "personal"
                      ? "التالي"
                      : isEditMode
                      ? "حفظ التغييرات"
                      : "حفظ الموظف"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* مودال عرض المهام الموكلة */}
          {tasksModalAdmin && (
            <div className="admin-modal-backdrop">
              <div className="admin-modal">
                <div className="admin-modal-header">
                  <div>
                    <div className="admin-modal-title">
                      المهام الموكلة للموظف: {tasksModalAdmin.name}
                    </div>
                    <div className="admin-modal-subtitle">
                      هذه قائمة مختصرة بالصلاحيات والمهام المرتبطة بهذا الموظف
                      الإداري.
                    </div>
                  </div>
                </div>
                <div className="admin-modal-body">
                  <ul className="admin-staff-tasks-list">
                    {summarizeTasks(tasksModalAdmin.permissions).map(
                      (line, idx) => (
                        <li key={idx}>{line}</li>
                      )
                    )}
                  </ul>
                </div>
                <div className="admin-modal-actions">
                  <button
                    type="button"
                    className="admin-button admin-button-ghost"
                    onClick={closeTasksModal}
                  >
                    إغلاق
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* مودال إرسال تنبيه لموظف معيّن */}
          {showNotificationModal && notificationTargetAdmin && (
            <div className="admin-modal-backdrop">
              <div className="admin-modal">
                <div className="admin-modal-header">
                  <div>
                    <div className="admin-modal-title">
                      إرسال تنبيه للموظف: {notificationTargetAdmin.name}
                    </div>
                    <div className="admin-modal-subtitle">
                      يمكنك من خلال هذه النافذة إرسال تنبيه فوري لهذا الموظف،
                      سيظهر في مركز التنبيهات الخاص به.
                    </div>
                  </div>
                </div>

                <div className="admin-modal-body">
                  <div className="admin-field">
                    <label>عنوان التنبيه *</label>
                    <input
                      type="text"
                      value={notificationTitle}
                      onChange={(e) =>
                        setNotificationTitle(e.target.value)
                      }
                      placeholder="مثال: تنبيه بخصوص متابعة التذاكر"
                    />
                  </div>

                  <div className="admin-field">
                    <label>نص الرسالة *</label>
                    <textarea
                      rows={4}
                      value={notificationMessage}
                      onChange={(e) =>
                        setNotificationMessage(e.target.value)
                      }
                      placeholder="اكتب نص التنبيه الذي سيصل للموظف..."
                    />
                  </div>

                  {notificationError && (
                    <div className="admin-error admin-error--top">
                      {notificationError}
                    </div>
                  )}
                  {notificationSuccess && (
                    <div className="admin-success admin-success--top">
                      {notificationSuccess}
                    </div>
                  )}
                </div>

                <div className="admin-modal-actions">
                  <button
                    type="button"
                    className="admin-button admin-button-ghost"
                    onClick={closeNotificationModal}
                    disabled={notificationSending}
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    className="admin-button admin-button-primary-rect"
                    onClick={handleSendNotification}
                    disabled={notificationSending}
                  >
                    {notificationSending ? "جارٍ الإرسال..." : "إرسال التنبيه"}
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
