import { useEffect, useState } from "react";
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
  Bell, // ⬅️ جديد: أيقونة التنبيه
} from "lucide-react";
import {
  getAllUsers,
  updateUserRole,
  getAdminUserDetails,
  updateUserStatus,
  createAdminNotification, // ⬅️ جديد: لإرسال تنبيه لمستخدم معيّن
} from "@/services/adminService";
import { useApp } from "@/context/AppContext";
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
  const { showToast } = useApp() || {};

  const [users, setUsers] = useState([]);
  const [filteredRole, setFilteredRole] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  // حالة مودال تفاصيل المستخدم
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsUserId, setDetailsUserId] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const [detailsData, setDetailsData] = useState(null);

  // حالة مودال تنبيه المستخدم
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [notifyTargetUser, setNotifyTargetUser] = useState(null);
  const [notifyTitle, setNotifyTitle] = useState("");
  const [notifyMessage, setNotifyMessage] = useState("");
  const [notifyLoading, setNotifyLoading] = useState(false);
  const [notifyError, setNotifyError] = useState("");

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

  async function handleOpenDetails(userId) {
    setDetailsOpen(true);
    setDetailsUserId(userId);
    setDetailsLoading(true);
    setDetailsError("");
    setDetailsData(null);

    try {
      const data = await getAdminUserDetails(userId);
      setDetailsData(data);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "تعذر جلب تفاصيل المستخدم. حاول مرة أخرى.";
      setDetailsError(msg);
      showToast?.(msg, "error");
    } finally {
      setDetailsLoading(false);
    }
  }

  function handleCloseDetails() {
    setDetailsOpen(false);
    setDetailsUserId(null);
    setDetailsData(null);
    setDetailsError("");
    setDetailsLoading(false);
  }

  // فتح مودال تنبيه المستخدم
  function openNotifyModal(user) {
    setNotifyTargetUser(user);
    setNotifyTitle("");
    setNotifyMessage("");
    setNotifyError("");
    setNotifyOpen(true);
  }

  function closeNotifyModal() {
    if (notifyLoading) return;
    setNotifyOpen(false);
    setNotifyTargetUser(null);
    setNotifyTitle("");
    setNotifyMessage("");
    setNotifyError("");
  }

  async function handleSendUserNotification() {
    if (!notifyTargetUser) {
      setNotifyError("لم يتم تحديد المستخدم المستهدف.");
      return;
    }

    const title = notifyTitle.trim();
    const message = notifyMessage.trim();

    if (!title || !message) {
      setNotifyError("عنوان التنبيه ونص الرسالة حقول إلزامية.");
      return;
    }

    try {
      setNotifyLoading(true);
      setNotifyError("");

      // ⬅️ نستخدم نفس الـ API العام للتنبيهات، مع userId لمستخدم معيّن
      await createAdminNotification({
        title,
        message,
        userId: notifyTargetUser._id,
      });

      showToast?.("تم إرسال التنبيه للمستخدم بنجاح.", "success");
      closeNotifyModal();
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "تعذر إرسال التنبيه لهذا المستخدم. تأكد من تفعيل مسار /api/admin/notifications.";
      setNotifyError(msg);
      showToast?.(msg, "error");
    } finally {
      setNotifyLoading(false);
    }
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

  const currentDetailsUser = detailsData?.user || null;
  const currentAddresses = detailsData?.addresses || [];
  const currentStore = detailsData?.store || null;
  const currentStores = detailsData?.stores || [];
  const currentShippingCompany = detailsData?.shippingCompany || null;
  const currentStats = detailsData?.stats || {};

  return (
    <section className="admin-section-card admin-users-section">
      {/* هيدر القسم */}
      <div className="admin-section-header">
        <div className="admin-section-header-main">
          <div className="admin-section-icon">
            <Users size={18} />
          </div>
          <div>
            <div className="admin-section-title">إدارة المستخدمين</div>
            <div className="admin-section-subtitle">
              عرض وإدارة جميع المستخدمين في طلبية مع إمكانيات البحث، التصفية،
              تغيير الدور، وتفعيل أو إيقاف الحساب، مع إمكانية إرسال تنبيه مباشر
              لمستخدم معيّن عند الحاجة.
            </div>
          </div>
        </div>
        <div className="admin-section-actions">
          <button
            type="button"
            className="admin-button admin-button-ghost"
            onClick={loadUsers}
            disabled={loading}
          >
            <RefreshCw size={14} />
            <span>تحديث القائمة</span>
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="admin-error users-error">{errorMessage}</div>
      )}

      {/* شريط الأدوات (بحث + فلاتر + إجمالي) */}
      <div className="users-toolbar">
        <div className="users-toolbar-left">
          <div className="users-search-wrapper">
            <input
              type="text"
              className="users-search-input"
              placeholder="بحث بالاسم، البريد، الجوال أو رقم المستخدم..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="users-toolbar-right">
          <div className="users-total-chip">
            <span>إجمالي المستخدمين:</span>
            <span className="users-total-chip-number">
              {totalFilteredUsers}
            </span>
          </div>

          <select
            className="users-filter-select"
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

          <div className="users-toolbar-hint">
            <Shield size={13} />
            <span>صلاحيات لوحة الأدمن تمنح فقط لدور المدير / المشرف.</span>
          </div>
        </div>
      </div>

      {/* جدول المستخدمين */}
      <div className="users-table-container">
        <div className="users-table-wrapper">
          {loading ? (
            <div className="users-empty-state">
              <RefreshCw size={16} className="spin" />
              <span>جاري تحميل قائمة المستخدمين...</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="users-empty-state">
              لا توجد نتائج مطابقة لخيارات البحث أو التصفية الحالية.
            </div>
          ) : (
            <table className="users-table">
              <thead>
                <tr>
                  <th className="col-user">المستخدم</th>
                  <th className="col-email">البريد الإلكتروني</th>
                  <th className="col-phone">الجوال</th>
                  <th className="col-role">الدور العام</th>
                  <th className="col-status">الحالة</th>
                  <th className="col-created">تاريخ الإنشاء</th>
                  <th className="col-actions">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => {
                  const isActive = user.isActive === false ? false : true;
                  return (
                    <tr key={user._id}>
                      <td className="cell-user">
                        <div className="user-main">
                          <div className="user-avatar">
                            <span>
                              {(user.name || "؟").charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="user-text">
                            <span className="user-name">
                              {user.name || "بدون اسم"}
                            </span>
                            <span className="user-id">
                              {user._id || "—"}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="cell-email">{user.email}</td>
                      <td className="cell-phone">{user.phone || "-"}</td>
                      <td className="cell-role">
                        <select
                          className="users-role-select"
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
                      <td className="cell-status">
                        <div className="users-status-wrapper">
                          <span
                            className={
                              "users-status-pill " +
                              (isActive ? "active" : "inactive")
                            }
                          >
                            <span className="users-status-dot" />
                            {isActive ? "نشط" : "غير نشط"}
                          </span>
                          <button
                            type="button"
                            className="users-inline-button secondary"
                            onClick={() => handleToggleStatus(user)}
                            disabled={statusUpdatingId === user._id}
                          >
                            {statusUpdatingId === user._id ? (
                              <>
                                <RefreshCw size={12} className="spin" />
                                <span>جارٍ التحديث</span>
                              </>
                            ) : (
                              <span>{isActive ? "إيقاف" : "تفعيل"}</span>
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="cell-created">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="cell-actions">
                        <div className="users-actions-group">
                          <button
                            type="button"
                            className="users-inline-button primary"
                            onClick={() => handleSaveUserRole(user)}
                            disabled={updatingId === user._id}
                          >
                            {updatingId === user._id ? (
                              <>
                                <RefreshCw size={12} className="spin" />
                                <span>جارٍ الحفظ</span>
                              </>
                            ) : (
                              "حفظ الدور"
                            )}
                          </button>
                          <button
                            type="button"
                            className="users-inline-button ghost"
                            onClick={() => handleOpenDetails(user._id)}
                          >
                            <Eye size={12} />
                            <span>تفاصيل</span>
                          </button>
                          <button
                            type="button"
                            className="users-inline-button ghost"
                            onClick={() => openNotifyModal(user)}
                          >
                            <Bell size={12} />
                            <span>تنبيه</span>
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
      </div>

      {/* مودال تفاصيل المستخدم */}
      {detailsOpen && (
        <div className="users-details-backdrop" onClick={handleCloseDetails}>
          <div
            className="users-details-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="users-details-header">
              <div className="users-details-header-main">
                <div className="users-details-avatar">
                  <UserCircle size={22} />
                </div>
                <div>
                  <div className="users-details-header-title">
                    تفاصيل المستخدم
                  </div>
                  <div className="users-details-header-subtitle">
                    عرض بيانات الحساب والعناوين والكيانات المرتبطة بالمستخدم.
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="users-details-close-btn"
                onClick={handleCloseDetails}
              >
                إغلاق
              </button>
            </div>

            <div className="users-details-body">
              {detailsLoading ? (
                <div className="users-empty-state users-empty-inline">
                  <RefreshCw size={16} className="spin" />
                  <span>جاري تحميل تفاصيل المستخدم...</span>
                </div>
              ) : detailsError ? (
                <div className="admin-error">{detailsError}</div>
              ) : !currentDetailsUser ? (
                <div className="users-empty-state users-empty-inline">
                  لم يتم العثور على تفاصيل لهذا المستخدم.
                </div>
              ) : (
                <>
                  <div className="users-details-grid">
                    {/* بطاقة بيانات الحساب الأساسية */}
                    <div className="users-details-card">
                      <div className="users-details-card-header">
                        <UserCircle size={15} />
                        <span>بيانات الحساب</span>
                      </div>
                      <div className="users-details-card-body">
                        {/* بيانات أساسية */}
                        <div className="users-details-field">
                          <span className="users-details-field-label">
                            الاسم الكامل
                          </span>
                          <span className="users-details-field-value">
                            {currentDetailsUser.name || "غير متوفر"}
                          </span>
                        </div>
                        <div className="users-details-field">
                          <span className="users-details-field-label">
                            البريد الإلكتروني
                          </span>
                          <span className="users-details-field-value">
                            {currentDetailsUser.email || "غير متوفر"}
                          </span>
                        </div>
                        <div className="users-details-field">
                          <span className="users-details-field-label">
                            رقم الجوال
                          </span>
                          <span className="users-details-field-value">
                            {currentDetailsUser.phone || "غير متوفر"}
                          </span>
                        </div>
                        <div className="users-details-field">
                          <span className="users-details-field-label">
                            الدولة
                          </span>
                          <span className="users-details-field-value">
                            {currentDetailsUser.country || "غير محددة"}
                          </span>
                        </div>
                        <div className="users-details-field">
                          <span className="users-details-field-label">
                            العنوان العام
                          </span>
                          <span className="users-details-field-value">
                            {currentDetailsUser.address || "غير متوفر"}
                          </span>
                        </div>
                        <div className="users-details-field">
                          <span className="users-details-field-label">
                            الدور
                          </span>
                          <span className="users-details-field-value">
                            {
                              (
                                ROLE_OPTIONS.find(
                                  (r) => r.value === currentDetailsUser.role
                                ) || {}
                              ).label || currentDetailsUser.role || "غير معروف"
                            }
                          </span>
                        </div>
                        <div className="users-details-field">
                          <span className="users-details-field-label">
                            الحالة
                          </span>
                          <span className="users-details-field-value">
                            {currentDetailsUser.isActive === false
                              ? "غير نشط"
                              : "نشط"}
                          </span>
                        </div>

                        {/* بيانات إضافية / وظيفية */}
                        <div className="users-details-field">
                          <span className="users-details-field-label">
                            المسمّى الوظيفي
                          </span>
                          <span className="users-details-field-value">
                            {currentDetailsUser.title || "غير مذكور"}
                          </span>
                        </div>

                        {/* بيانات الهوية والتحقق (KYC) */}
                        <div className="users-details-field">
                          <span className="users-details-field-label">
                            الجنسية
                          </span>
                          <span className="users-details-field-value">
                            {currentDetailsUser.nationality || "غير مذكورة"}
                          </span>
                        </div>
                        <div className="users-details-field">
                          <span className="users-details-field-label">
                            تاريخ الميلاد
                          </span>
                          <span className="users-details-field-value">
                            {formatDate(currentDetailsUser.birthDate)}
                          </span>
                        </div>
                        <div className="users-details-field">
                          <span className="users-details-field-label">
                            نوع وثيقة الهوية
                          </span>
                          <span className="users-details-field-value">
                            {currentDetailsUser.idType || "غير مذكور"}
                          </span>
                        </div>
                        <div className="users-details-field">
                          <span className="users-details-field-label">
                            رقم وثيقة الهوية
                          </span>
                          <span className="users-details-field-value">
                            {currentDetailsUser.idNumber || "غير مذكور"}
                          </span>
                        </div>
                        <div className="users-details-field">
                          <span className="users-details-field-label">
                            جهة إصدار الهوية
                          </span>
                          <span className="users-details-field-value">
                            {currentDetailsUser.idIssuer || "غير مذكورة"}
                          </span>
                        </div>
                        <div className="users-details-field">
                          <span className="users-details-field-label">
                            ملف وثيقة الهوية
                          </span>
                          <span className="users-details-field-value">
                            {currentDetailsUser.idDocumentUrl ? (
                              <a
                                href={currentDetailsUser.idDocumentUrl}
                                target="_blank"
                                rel="noreferrer"
                              >
                                عرض الوثيقة
                              </a>
                            ) : (
                              "غير مرفوعة"
                            )}
                          </span>
                        </div>

                        {/* بيانات تقنية */}
                        <div className="users-details-field">
                          <span className="users-details-field-label">
                            تاريخ إنشاء الحساب
                          </span>
                          <span className="users-details-field-value">
                            {formatDate(currentDetailsUser.createdAt)}
                          </span>
                        </div>
                        <div className="users-details-field">
                          <span className="users-details-field-label">
                            معرّف المستخدم
                          </span>
                          <span className="users-details-field-value users-details-id">
                            {currentDetailsUser._id}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* بطاقة إحصاءات سريعة */}
                    <div className="users-details-card">
                      <div className="users-details-card-header">
                        <Activity size={15} />
                        <span>إحصاءات سريعة</span>
                      </div>
                      <div className="users-details-card-body">
                        <div className="users-details-field">
                          <span className="users-details-field-label">
                            عدد طلباته كمشتري
                          </span>
                          <span className="users-details-field-value">
                            {currentStats.buyerOrdersCount ?? 0}
                          </span>
                        </div>
                        <div className="users-details-field">
                          <span className="users-details-field-label">
                            عدد طلبات متاجره
                          </span>
                          <span className="users-details-field-value">
                            {currentStats.sellerOrdersCount ?? 0}
                          </span>
                        </div>
                        <div className="users-details-field">
                          <span className="users-details-field-label">
                            عدد الطلبات عبر شركة الشحن
                          </span>
                          <span className="users-details-field-value">
                            {currentStats.shippingOrdersCount ?? 0}
                          </span>
                        </div>
                        <div className="users-details-field">
                          <span className="users-details-field-label">
                            عدد الإعلانات
                          </span>
                          <span className="users-details-field-value">
                            {currentStats.adsCount ?? 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* العناوين + المتجر + شركة الشحن */}
                  <div className="users-details-grid users-details-grid-secondary">
                    {/* عناوين الشحن */}
                    <div className="users-details-card">
                      <div className="users-details-card-header">
                        <MapPin size={15} />
                        <span>عناوين الشحن</span>
                      </div>
                      <div className="users-details-card-body">
                        {currentAddresses.length === 0 ? (
                          <div className="users-details-empty">
                            لا توجد عناوين مسجلة لهذا المستخدم.
                          </div>
                        ) : (
                          <ul className="users-details-list">
                            {currentAddresses.map((addr) => (
                              <li
                                key={addr._id}
                                className="users-details-address"
                              >
                                <div className="users-details-address-header">
                                  <span className="users-details-address-title">
                                    {addr.label || "عنوان بدون اسم"}
                                  </span>
                                  <span className="users-details-tag">
                                    {addr.isDefault ? "افتراضي" : "ثانوي"}
                                  </span>
                                </div>
                                <div className="users-details-address-line">
                                  {formatUnifiedAddress(addr, currentDetailsUser?.country) || "بدون تفاصيل عنوان"}
                                </div>
                                {addr.details && (
                                  <div className="users-details-address-details">
                                    {addr.details}
                                  </div>
                                )}
                                <div className="users-details-address-phone">
                                  <Phone size={12} />
                                  <span>
                                    {addr.phone ||
                                      currentDetailsUser.phone ||
                                      "غير متوفر"}
                                  </span>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>

                    {/* المتجر / شركة الشحن */}
                    <div className="users-details-card">
                      <div className="users-details-card-header">
                        <ShoppingBag size={15} />
                        <span>الكيانات المرتبطة</span>
                      </div>
                      <div className="users-details-card-body">
                        {/* متجر */}
                        {currentStore ? (
                          <div className="users-details-block">
                            <div className="users-details-block-title">
                              <ShoppingBag size={13} />
                              <span>متجر مرتبط (بائع)</span>
                            </div>
                            <div className="users-details-field">
                              <span className="users-details-field-label">
                                اسم المتجر
                              </span>
                              <span className="users-details-field-value">
                                {currentStore.name || "بدون اسم"}
                              </span>
                            </div>
                            <div className="users-details-field">
                              <span className="users-details-field-label">
                                حالة المتجر
                              </span>
                              <span className="users-details-field-value">
                                {currentStore.status || "غير محددة"}
                              </span>
                            </div>
                            <div className="users-details-field">
                              <span className="users-details-field-label">
                                عنوان المتجر
                              </span>
                              <span className="users-details-field-value">
                                {formatUnifiedAddress(currentStore.address) || "غير متوفر"}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="users-details-empty">
                            لا يوجد متجر مرتبط بهذا المستخدم.
                          </div>
                        )}

                        {currentStores.length > 1 && (
                          <div className="users-details-note">
                            عدد المتاجر المرتبطة: {currentStores.length}
                          </div>
                        )}

                        {/* شركة الشحن */}
                        {currentShippingCompany ? (
                          <div className="users-details-block">
                            <div className="users-details-block-title">
                              <Truck size={13} />
                              <span>شركة شحن مرتبطة</span>
                            </div>
                            <div className="users-details-field">
                              <span className="users-details-field-label">
                                اسم الشركة
                              </span>
                              <span className="users-details-field-value">
                                {currentShippingCompany.name || "بدون اسم"}
                              </span>
                            </div>
                            <div className="users-details-field">
                              <span className="users-details-field-label">
                                البريد الإلكتروني
                              </span>
                              <span className="users-details-field-value">
                                {currentShippingCompany.email || "غير متوفر"}
                              </span>
                            </div>
                            <div className="users-details-field">
                              <span className="users-details-field-label">
                                رقم الهاتف
                              </span>
                              <span className="users-details-field-value">
                                {currentShippingCompany.phone || "غير متوفر"}
                              </span>
                            </div>
                            <div className="users-details-field">
                              <span className="users-details-field-label">
                                المقر الرئيسي
                              </span>
                              <span className="users-details-field-value">
                                {currentShippingCompany.headquarters ||
                                  "غير مذكور"}
                              </span>
                            </div>
                            <div className="users-details-field">
                              <span className="users-details-field-label">
                                المسؤول
                              </span>
                              <span className="users-details-field-value">
                                {currentShippingCompany.contactName
                                  ? `${currentShippingCompany.contactName}${
                                      currentShippingCompany.contactRelation
                                        ? " – " +
                                          currentShippingCompany.contactRelation
                                        : ""
                                    }`
                                  : "غير محدد"}
                              </span>
                            </div>
                            <div className="users-details-field">
                              <span className="users-details-field-label">
                                نوع الوثيقة
                              </span>
                              <span className="users-details-field-value">
                                {currentShippingCompany.documentType ||
                                  "غير مذكور"}
                              </span>
                            </div>
                            <div className="users-details-field">
                              <span className="users-details-field-label">
                                رقم الوثيقة
                              </span>
                              <span className="users-details-field-value">
                                {currentShippingCompany.documentNumber ||
                                  "غير مذكور"}
                              </span>
                            </div>
                            <div className="users-details-field">
                              <span className="users-details-field-label">
                                ملف الوثيقة
                              </span>
                              <span className="users-details-field-value">
                                {currentShippingCompany.documentUrl ? (
                                  <a
                                    href={currentShippingCompany.documentUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    عرض الوثيقة
                                  </a>
                                ) : (
                                  "غير مرفوع"
                                )}
                              </span>
                            </div>
                            <div className="users-details-field">
                              <span className="users-details-field-label">
                                نطاق العمل
                              </span>
                              <span className="users-details-field-value">
                                {currentShippingCompany.scope === "global"
                                  ? "عالمي – تخدم جميع البائعين"
                                  : "مرتبطة ببائعين محددين"}
                              </span>
                            </div>
                            <div className="users-details-field">
                              <span className="users-details-field-label">
                                عدد مناطق التغطية
                              </span>
                              <span className="users-details-field-value">
                                {currentShippingCompany.coverageAreas
                                  ? currentShippingCompany.coverageAreas.length
                                  : 0}
                              </span>
                            </div>
                            <div className="users-details-field">
                              <span className="users-details-field-label">
                                التقييم العام
                              </span>
                              <span className="users-details-field-value">
                                {currentShippingCompany.rating &&
                                typeof currentShippingCompany.rating.average ===
                                  "number"
                                  ? `${currentShippingCompany.rating.average.toFixed(
                                      1
                                    )} من ${
                                      currentShippingCompany.rating.count || 0
                                    } تقييم`
                                  : "لا يوجد تقييم بعد"}
                              </span>
                            </div>
                            <div className="users-details-field">
                              <span className="users-details-field-label">
                                حالة الشركة
                              </span>
                              <span className="users-details-field-value">
                                {currentShippingCompany.isActive === false
                                  ? "غير مفعّلة"
                                  : "مفعّلة"}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="users-details-empty">
                            لا توجد شركة شحن مرتبطة بهذا المستخدم.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="users-details-footer">
              <button type="button" onClick={handleCloseDetails}>
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* مودال إرسال تنبيه لمستخدم معيّن */}
      {notifyOpen && notifyTargetUser && (
        <div className="users-details-backdrop" onClick={closeNotifyModal}>
          <div
            className="users-details-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="users-details-header">
              <div className="users-details-header-main">
                <div className="users-details-avatar">
                  <Bell size={20} />
                </div>
                <div>
                  <div className="users-details-header-title">
                    إرسال تنبيه للمستخدم
                  </div>
                  <div className="users-details-header-subtitle">
                    يمكن استخدام هذا التنبيه لإبلاغ المستخدم بمشكلة في شحن،
                    تحديث مهم، أو توضيح بخصوص طلب معيّن.
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="users-details-close-btn"
                onClick={closeNotifyModal}
                disabled={notifyLoading}
              >
                إغلاق
              </button>
            </div>

            <div className="users-details-body">
              <div className="users-details-target">
                <span>المستخدم المستهدف:</span>
                <strong>
                  {notifyTargetUser.name || "بدون اسم"} – {notifyTargetUser.email}
                </strong>
              </div>

              <div className="users-details-field">
                <span className="users-details-field-label">عنوان التنبيه *</span>
                <input
                  type="text"
                  className="users-search-input"
                  placeholder="مثال: بخصوص طلبك الأخير في حالة الشحن"
                  value={notifyTitle}
                  onChange={(e) => setNotifyTitle(e.target.value)}
                />
              </div>

              <div className="users-details-field">
                <span className="users-details-field-label">نص الرسالة *</span>
                <textarea
                  className="users-textarea"
                  rows={4}
                  placeholder="اكتب الرسالة التي ستظهر للمستخدم في مركز التنبيهات..."
                  value={notifyMessage}
                  onChange={(e) => setNotifyMessage(e.target.value)}
                />
              </div>

              {notifyError && (
                <div className="admin-error users-error">{notifyError}</div>
              )}
            </div>

            <div className="users-details-footer">
              <button
                type="button"
                onClick={closeNotifyModal}
                disabled={notifyLoading}
              >
                إلغاء
              </button>
              <button
                type="button"
                className="users-inline-button primary"
                onClick={handleSendUserNotification}
                disabled={notifyLoading}
              >
                {notifyLoading ? (
                  <>
                    <RefreshCw size={12} className="spin" />
                    <span>جارٍ الإرسال...</span>
                  </>
                ) : (
                  <>
                    <Bell size={12} />
                    <span>إرسال التنبيه</span>
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
