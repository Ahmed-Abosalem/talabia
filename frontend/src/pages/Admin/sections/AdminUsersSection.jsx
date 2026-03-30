import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Shield,
  RefreshCw,
  Eye,
  UserCircle,
  Phone,
  MapPin,
  ShoppingBag,
  Truck,
  Activity,
  Bell,
  Trash2,
  AlertTriangle,
  Check,
  Search,
  Copy,
  Mail,
  MoreVertical,
  PhoneCall,
  Calendar,
  Globe,
  Briefcase,
  IdCard,
  X,
  User,
  Send,
} from "lucide-react";
import {
  getAllUsers,
  updateUserRole,
  getAdminUserDetails,
  updateUserStatus,
  createAdminNotification,
  deleteUser, // ⬅️ جديد: خدمة الحذف
} from "@/services/adminService";
import { useApp } from "@/context/AppContext";
import useGrabScroll from "@/hooks/useGrabScroll";
import "./AdminUsersSection.css";

const ROLE_OPTIONS = [
  { value: "buyer", label: "مشتري" },
  { value: "seller", label: "بائع" },
  { value: "shipper", label: "شركة شحن" },
  { value: "admin", label: "مدير / مشرف" },
];

function formatDate(value) {
  if (!value) return "غير متوفر";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "غير متوفر";
  return d.toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatUnifiedAddress(address, fallbackCountry = "") {
  if (!address) return "غير متوفر";
  if (typeof address === "string") return address;

  const country = (address.country || fallbackCountry || "").toString().trim();
  const city = (address.city || "").toString().trim();
  const directorate = (
    address.area ||
    address.district ||
    address.directorate ||
    address.municipality ||
    ""
  )
    .toString()
    .trim();
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

  return parts.join(" - ") || "غير متوفر";
}


export default function AdminUsersSection() {
  const { showToast } = useApp(); // Initialize toast system
  const navigate = useNavigate();
  const scrollRef = useGrabScroll();
  const [users, setUsers] = useState([]);
  const [filteredRole, setFilteredRole] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [copiedId, setCopiedId] = useState(null); // Feedback for copy action

  // حالة مودال الحذف
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  function confirmDeleteUser(user) {
    setUserToDelete(user);
    setDeleteModalOpen(true);
    setDeleteError("");
  }

  async function handleDeleteUser() {
    if (!userToDelete) return;
    try {
      setIsDeleting(true);
      setDeleteError("");
      await deleteUser(userToDelete._id);
      showToast?.("تم حذف المستخدم وكافة بياناته بنجاح.", "success");
      // تحديث القائمة محلياً
      setUsers((prev) => prev.filter((u) => u._id !== userToDelete._id));
      setDeleteModalOpen(false);
      setUserToDelete(null);
    } catch (err) {
      const msg = err?.response?.data?.message || "تعذر حذف المستخدم.";
      setDeleteError(msg);
    } finally {
      setIsDeleting(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      setLoading(true);
      setErrorMessage("");
      const data = await getAllUsers();
      const list = Array.isArray(data) ? data : data.users || [];
      setUsers(list);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "تعذر تحميل قائمة المستخدمين. تأكد من أن الخادم يعمل وأن حساب الأدمن مسجّل الدخول.";
      setErrorMessage(msg);
      showToast?.(msg, "error");
    } finally {
      setLoading(false);
    }
  }

  const handleManualRefresh = async () => {
    await loadUsers();
    showToast?.("تم تحديث قائمة المستخدمين بنجاح.", "success");
  };

  function handleLocalRoleChange(userId, newRole) {
    setUsers((prev) =>
      prev.map((u) => (u._id === userId ? { ...u, role: newRole } : u))
    );
  }

  async function handleSaveUserRole(user) {
    try {
      setUpdatingId(user._id);
      setErrorMessage("");
      await updateUserRole(user._id, user.role);
      showToast?.("تم تحديث دور المستخدم بنجاح.", "success");
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "تعذر تحديث دور المستخدم. حاول مرة أخرى.";
      setErrorMessage(msg);
      showToast?.(msg, "error");
      loadUsers();
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleToggleStatus(user) {
    const currentActive = user.isActive === false ? false : true;
    const nextActive = !currentActive;

    try {
      setStatusUpdatingId(user._id);
      setErrorMessage("");
      const res = await updateUserStatus(user._id, nextActive);
      const updatedUser = res?.user || {};
      setUsers((prev) =>
        prev.map((u) => (u._id === user._id ? { ...u, ...updatedUser } : u))
      );
      showToast?.(
        nextActive
          ? "تم تفعيل حساب المستخدم بنجاح."
          : "تم إيقاف حساب المستخدم بنجاح.",
        "success"
      );
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "تعذر تحديث حالة المستخدم. حاول مرة أخرى.";
      setErrorMessage(msg);
      showToast?.(msg, "error");
      loadUsers();
    } finally {
      setStatusUpdatingId(null);
    }
  }

  function handleOpenDetails(userId) {
    navigate(`/admin/users/details/${userId}`);
  }

  function openNotifyModal(userId) {
    navigate(`/admin/users/notify/${userId}`);
  }

  const filteredUsers = users.filter((u) => {
    if (filteredRole !== "all" && u.role !== filteredRole) return false;

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const name = (u.name || "").toLowerCase();
      const email = (u.email || "").toLowerCase();
      const phone = (u.phone || "").toLowerCase();
      if (
        !name.includes(q) &&
        !email.includes(q) &&
        !phone.includes(q) &&
        !(u._id || "").toString().includes(q)
      ) {
        return false;
      }
    }

    return true;
  });

  // إجمالي المستخدمين بعد تطبيق الفلاتر والبحث
  const totalFilteredUsers = filteredUsers.length;

  return (
    <section className="adm-section-panel">
      {/* هيدر القسم */}
      <div className="adm-section-inner-header">
        <div className="adm-section-icon">
          <Users size={20} />
        </div>
        <div className="adm-section-title-group">
          <div className="adm-section-title">إدارة المستخدمين</div>
          <div className="adm-section-subtitle">
            عرض وإدارة جميع المستخدمين مع إمكانيات البحث، التصفية، تغيير الدور، وتفعيل أو إيقاف الحساب.
          </div>
        </div>
        <div className="adm-section-actions">
          <button
            type="button"
            className="adm-btn outline"
            onClick={handleManualRefresh}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? "spin" : ""} />
            <span>{loading ? "جاري..." : "تحديث"}</span>
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="adm-error-box">{errorMessage}</div>
      )}

      {/* شريط الأدوات (بحث + فلاتر + إجمالي) */}
      <div className="adm-toolbar">
        <div className="adm-search-wrapper">
          <Search size={16} className="adm-search-icon" />
          <input
            type="text"
            className="adm-search-input"
            placeholder="بحث بالاسم، البريد أو رقم المستخدم..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="adm-stat-mini">
          <div className="adm-stat-mini-icon"><Users size={16} /></div>
          <div>
            <div className="adm-stat-mini-label">إجمالي</div>
            <div className="adm-stat-mini-value">{totalFilteredUsers}</div>
          </div>
        </div>

        <select
          className="adm-filter-select"
          value={filteredRole}
          onChange={(e) => setFilteredRole(e.target.value)}
        >
          <option value="all">كل الأدوار</option>
          {ROLE_OPTIONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      {/* جدول المستخدمين */}
      <div className="adm-table-wrapper">
        {loading ? (
          <div className="adm-empty-state">
            <div className="adm-empty-state-icon">
              <RefreshCw size={24} className="spin" />
            </div>
            <p>جاري مزامنة بيانات المستخدمين من الخادم...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="adm-empty-state">
            <div className="adm-empty-state-icon">
              <Search size={24} />
            </div>
            <h3>لا توجد نتائج مطابقة</h3>
            <p>جرّب تعديل خيارات البحث أو التصفية للوصول إلى المستخدم المطلوب.</p>
            <button className="adm-btn outline" onClick={() => { setSearch(""); setFilteredRole("all"); }}>
              إعادة ضبط البحث
            </button>
          </div>
        ) : (
          <table className="adm-table">
            <thead>
              <tr>
                <th>المستخدم</th>
                <th>البريد الإلكتروني</th>
                <th>الجوال</th>
                <th>الدور</th>
                <th>الحالة</th>
                <th>تاريخ الإنشاء</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => {
                const isActive = user.isActive === false ? false : true;
                return (
                  <tr key={user._id}>
                    <td>
                      <div>
                        <div className="adm-user-name">{user.name || "بدون اسم"}</div>
                        <div className="adm-user-id-badge">
                          <span className="adm-user-id-text">{user._id}</span>
                          <button
                            className="adm-user-id-copy"
                            title="نسخ المعرف"
                            onClick={() => {
                              navigator.clipboard.writeText(user._id);
                              setCopiedId(user._id);
                              setTimeout(() => setCopiedId(null), 2000);
                            }}
                          >
                            {copiedId === user._id ? (
                              <Check size={10} style={{ color: "var(--adm-success)" }} />
                            ) : (
                              <Copy size={10} />
                            )}
                          </button>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="adm-cell-icon-text">
                        <Mail size={13} />
                        <span>{user.email}</span>
                      </div>
                    </td>
                    <td>
                      <div className="adm-cell-icon-text">
                        <PhoneCall size={13} />
                        <span>{user.phone || "-"}</span>
                      </div>
                    </td>
                    <td>
                      <select
                        className="adm-role-select"
                        value={user.role || "buyer"}
                        onChange={(e) =>
                          handleLocalRoleChange(user._id, e.target.value)
                        }
                      >
                        {ROLE_OPTIONS.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <span className={`adm-status-pill ${isActive ? "active" : "inactive"}`}>
                          <span className="adm-status-dot" />
                          {isActive ? "نشط" : "غير نشط"}
                        </span>
                        <button
                          type="button"
                          className="adm-btn outline"
                          style={{ padding: "4px 10px", fontSize: "0.78rem" }}
                          onClick={() => handleToggleStatus(user)}
                          onMouseDown={(e) => e.preventDefault()}
                          disabled={statusUpdatingId === user._id}
                        >
                          {statusUpdatingId === user._id ? (
                            <RefreshCw size={12} className="spin" />
                          ) : (
                            <span>{isActive ? "إيقاف" : "تفعيل"}</span>
                          )}
                        </button>
                      </div>
                    </td>
                    <td>{formatDate(user.createdAt)}</td>
                    <td>
                      <div className="adm-actions-row">
                        <button type="button" className="adm-icon-btn save"
                          onClick={() => handleSaveUserRole(user)}
                          onMouseDown={(e) => e.preventDefault()}
                          disabled={updatingId === user._id} title="حفظ الدور">
                          {updatingId === user._id ? <RefreshCw size={14} className="spin" /> : <Check size={14} />}
                        </button>
                        <div className="adm-actions-divider" />
                        <button type="button" className="adm-icon-btn"
                          onClick={() => handleOpenDetails(user._id)}
                          onMouseDown={(e) => e.preventDefault()}
                          title="عرض التفاصيل">
                          <Eye size={14} />
                        </button>
                        <button type="button" className="adm-icon-btn accent"
                          onClick={() => openNotifyModal(user._id)}
                          onMouseDown={(e) => e.preventDefault()}
                          title="إرسال تنبيه">
                          <Bell size={14} />
                        </button>
                        <button type="button" className="adm-icon-btn danger"
                          onClick={() => confirmDeleteUser(user)}
                          onMouseDown={(e) => e.preventDefault()}
                          title="حذف المستخدم">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>


      {/* مودال تأكيد الحذف */}
      {deleteModalOpen && userToDelete && (
        <div className="adm-modal-backdrop" onClick={() => setDeleteModalOpen(false)}>
          <div className="adm-modal" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="adm-modal-header">
              <h2 className="adm-modal-title danger">
                <Trash2 size={20} />
                <span>حذف الحساب نهائياً؟</span>
              </h2>
            </div>
            <div className="adm-modal-body">
              <div className="adm-notice-box danger">
                <div className="adm-notice-content">
                  أنت على وشك حذف حساب المستخدم <strong>{userToDelete.name}</strong>.
                  هذا الإجراء سيؤدي لحذف كافة البيانات المرتبطة (الطلبات، المتجر، العناوين) ولا يمكن التراجع عنه.
                </div>
              </div>
              {deleteError && (
                <div className="adm-error-box" style={{ marginTop: 'var(--sp-2)' }}>
                  <AlertTriangle size={14} />
                  <span>{deleteError}</span>
                </div>
              )}
            </div>
            <div className="adm-modal-footer">
              <button type="button" className="adm-btn ghost" onClick={() => setDeleteModalOpen(false)} disabled={isDeleting}>
                إلغاء
              </button>
              <button type="button" className="adm-btn danger" onClick={handleDeleteUser} disabled={isDeleting}>
                {isDeleting ? (
                  <><RefreshCw size={14} className="spin" /> <span>جاري الحذف...</span></>
                ) : (
                  <><Trash2 size={14} /><span>تأكيد الحذف النهائي</span></>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
