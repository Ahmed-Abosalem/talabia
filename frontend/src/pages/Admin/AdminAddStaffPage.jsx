import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ShieldCheck, ArrowRight, Save, AlertCircle, Eye, EyeOff } from "lucide-react";
import { createAdmin, updateAdminPermissions } from "@/services/adminService";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import "./adm-shared.css";
import "./sections/AdminSecuritySection.css"; // لبعض تنسيقات الصلاحيات لو وجدت
import "./AdminAddStaffPage.css";

const PERMISSION_GROUPS = [
    { id: "users", label: "إدارة المستخدمين" },
    { id: "sellers", label: "إدارة البائعين" },
    { id: "products", label: "إدارة المنتجات" },
    { id: "orders", label: "إدارة الطلبات" },
    { id: "shipping", label: "إدارة شركات الشحن" },
    { id: "payment", label: "إدارة خيارات الدفع" },
    { id: "ads", label: "إدارة الإعلانات" },
    { id: "categories", label: "إدارة الأقسام" },
    { id: "financial", label: "الإدارة المالية" },
    { id: "reports", label: "التقارير والإحصاءات" },
    { id: "notifications", label: "إدارة التنبيهات" },
    { id: "support", label: "إدارة التواصل" },
];

function createEmptyPermissions() {
    return Object.fromEntries(PERMISSION_GROUPS.map((g) => [g.id, "none"]));
}

export default function AdminAddStaffPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { showToast } = useApp() || {};
    const { user, role } = useAuth();

    const isOwner = user && role === "admin" && user.isOwner;

    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(location.state?.admin ? "permissions" : "personal"); // personal | permissions
    const [errorMessage, setErrorMessage] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const adminToEdit = location.state?.admin || null;
    const isEditMode = !!adminToEdit;

    const [form, setForm] = useState({
        name: "",
        email: "",
        phone: "",
        staffCode: "",
        password: "",
        title: "",
        permissions: createEmptyPermissions(),
    });

    useEffect(() => {
        if (!isOwner) {
            navigate("/admin?section=security");
            if (showToast) showToast("لا تملك صلاحية إدارة الموظفين", "error");
            return;
        }

        if (isEditMode) {
            setStep("permissions");
            setShowPassword(false);
            const base = createEmptyPermissions();
            const perms = adminToEdit.permissions || {};
            const normalized = {};

            PERMISSION_GROUPS.forEach((g) => {
                let val = perms[g.id] || "none";
                if (val === "partial") val = "view";
                if (!["none", "view", "full"].includes(val)) val = "none";
                normalized[g.id] = val;
            });

            setForm({
                name: adminToEdit.name || "",
                email: adminToEdit.email || "",
                phone: adminToEdit.phone || "",
                staffCode: adminToEdit.staffCode || "",
                password: "", // لا نعرض كلمة المرور عند التعديل
                title: adminToEdit.title || "",
                permissions: { ...base, ...normalized },
            });
        }
    }, [isOwner, isEditMode, adminToEdit, navigate, showToast]);

    const validateEmail = (email) => /\S+@\S+\.\S+/.test(email);

    const getPersonalValidationError = () => {
        if (!form.name.trim() || !form.email.trim() || (!isEditMode && !form.password)) {
            return "الاسم، البريد، وكلمة المرور حقول إلزامية.";
        }

        if (!validateEmail(form.email.trim())) {
            return "صيغة البريد الإلكتروني غير صحيحة.";
        }

        if (!isEditMode && form.password.length < 6) {
            return "كلمة المرور يجب ألا تقل عن 6 رموز.";
        }

        return "";
    };

    const handleNextToPermissions = () => {
        if (loading) return;

        if (isEditMode) {
            setErrorMessage("");
            setStep("permissions");
            return;
        }

        const err = getPersonalValidationError();
        if (err) {
            setErrorMessage(err);
            setStep("personal");
            return;
        }

        setErrorMessage("");
        setStep("permissions");
    };

    const handleChange = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const togglePermission = (groupId, targetLevel) => {
        setForm((prev) => {
            const current = prev.permissions?.[groupId] || "none";
            let next = targetLevel;
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

    const clearPermissions = () => {
        setForm((prev) => ({ ...prev, permissions: createEmptyPermissions() }));
    };

    const setAllPermissions = (level) => {
        setForm((prev) => ({
            ...prev,
            permissions: Object.fromEntries(PERMISSION_GROUPS.map((g) => [g.id, level])),
        }));
    };

    const handleSave = async () => {
        setErrorMessage("");

        const err = getPersonalValidationError();
        if (err) {
            setErrorMessage(err);
            setStep("personal");
            return;
        }

        try {
            setLoading(true);

            if (isEditMode) {
                const payload = { permissions: form.permissions };
                await updateAdminPermissions(adminToEdit._id, payload);
                if (showToast) showToast("تم تحديث صلاحيات الموظف بنجاح.", "success");
            } else {
                const payload = {
                    name: form.name.trim(),
                    email: form.email.trim(),
                    phone: form.phone.trim(),
                    staffCode: form.staffCode.trim(),
                    password: form.password,
                    title: form.title.trim(),
                    permissions: form.permissions,
                };
                await createAdmin(payload);
                if (showToast) showToast("تم إضافة الموظف الإداري بنجاح.", "success");
            }

            navigate("/admin?section=security");
        } catch (err) {
            const msg = err?.response?.data?.message || err?.message || "تعذر حفظ الموظف الإداري.";
            setErrorMessage(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="adm-page-root">
            {/* 🏔️ الهيدر الزجاجي */}
            <header className="adm-header">
                <div className="adm-header-inner">
                    <div className="adm-header-right">
                        <button
                            type="button"
                            onClick={() => navigate("/admin?section=security")}
                            className="adm-btn-back"
                            title="العودة لإدارة الموظفين"
                        >
                            <ArrowRight size={20} />
                        </button>
                        <div className="adm-header-titles">
                            <div className="adm-role-badge">إدارة الموظفين</div>
                            <h1 className="adm-page-title">
                                {isEditMode ? "تعديل صلاحيات موظف" : "إضافة موظف إداري جديد"}
                            </h1>
                        </div>
                    </div>
                    <div className="adm-header-left">
                        {/* Actions moved to card footer for better UX */}
                    </div>
                </div>
            </header>

            {/* 📐 حاوية المحتوى */}
            <div className="adm-main-container">
                <div className="adm-details-grid">

                    {/* Step Navigation Sidebar */}
                    <div className="adm-card shadow-lg" style={{ gridColumn: "span 3", alignSelf: "start" }}>
                        <div className="adm-card-header">
                            <ShieldCheck size={20} />
                            <h2>خطوات الإعداد</h2>
                        </div>
                        <div className="adm-card-body" style={{ padding: "0" }}>
                            <div className="adm-tabs-vertical">
                                <button
                                    style={{
                                        width: "100%", textAlign: "right", padding: "16px",
                                        background: step === "personal" ? "var(--adm-bg)" : "transparent",
                                        border: "none", borderRight: step === "personal" ? "4px solid var(--adm-primary)" : "4px solid transparent",
                                        fontWeight: step === "personal" ? "bold" : "normal", cursor: "pointer", display: "block"
                                    }}
                                    onClick={() => {
                                        setErrorMessage("");
                                        setStep("personal");
                                    }}
                                >
                                    1. البيانات الشخصية
                                </button>
                                <button
                                    style={{
                                        width: "100%", textAlign: "right", padding: "16px",
                                        background: step === "permissions" ? "var(--adm-bg)" : "transparent",
                                        border: "none", borderRight: step === "permissions" ? "4px solid var(--adm-primary)" : "4px solid transparent",
                                        fontWeight: step === "permissions" ? "bold" : "normal", cursor: "pointer", display: "block"
                                    }}
                                    onClick={handleNextToPermissions}
                                >
                                    2. تحديد الصلاحيات
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="adm-card shadow-lg" style={{ gridColumn: "span 9" }}>
                        <div className="adm-card-header">
                            <h2>{step === "personal" ? "البيانات الأساسية" : "صلاحيات الوصول"}</h2>
                        </div>
                        <div className="adm-card-body">
                            {errorMessage && (
                                <div className="adm-error-box adm-staff-error" style={{ marginBottom: "1.5rem" }}>
                                    <AlertCircle size={18} />
                                    <span>{errorMessage}</span>
                                </div>
                            )}

                            {step === "personal" && (
                                <div className="adm-grid-row">
                                    <div className="adm-notice-box info" style={{ gridColumn: "1 / -1", marginBottom: 'var(--sp-3)' }}>
                                        <div className="adm-notice-content">
                                            {isEditMode
                                                ? "تعديل البيانات الأساسية للموظف غير متاح هنا حاليا باستثناء الصلاحيات، راجع صفحة الأمان. (هذا الإصدار يركز على الصلاحيات)"
                                                : "يرجى تعبئة بيانات الموظف الأساسية. كلمة المرور تُطلب لإنشاء الحساب لأول مرة."}
                                        </div>
                                    </div>

                                    <div className="adm-form-group">
                                        <label className="adm-form-label">الاسم الكامل *</label>
                                        <input
                                            className="adm-form-input"
                                            type="text"
                                            value={form.name}
                                            onChange={(e) => handleChange("name", e.target.value)}
                                            placeholder="مثال: هلال محمد عبدالله"
                                            disabled={isEditMode}
                                            required
                                        />
                                    </div>
                                    <div className="adm-form-group">
                                        <label className="adm-form-label">المسمى الوظيفي *</label>
                                        <input
                                            className="adm-form-input"
                                            type="text"
                                            value={form.title}
                                            onChange={(e) => handleChange("title", e.target.value)}
                                            placeholder="مثال: مدير عمليات، موظف مالي..."
                                            disabled={isEditMode}
                                            required
                                        />
                                    </div>
                                    <div className="adm-form-group">
                                        <label className="adm-form-label">البريد الإلكتروني *</label>
                                        <input
                                            className="adm-form-input"
                                            type="email"
                                            dir="ltr"
                                            value={form.email}
                                            onChange={(e) => handleChange("email", e.target.value)}
                                            placeholder="staff@talabia.com"
                                            disabled={isEditMode}
                                            required
                                        />
                                    </div>
                                    <div className="adm-form-group">
                                        <label className="adm-form-label">رقم الهاتف ضابط التوظيف</label>
                                        <input
                                            className="adm-form-input"
                                            type="text"
                                            dir="ltr"
                                            value={form.phone}
                                            onChange={(e) => handleChange("phone", e.target.value)}
                                            placeholder="+966xxxxxxxxx"
                                            disabled={isEditMode}
                                        />
                                    </div>
                                    <div className="adm-form-group">
                                        <label className="adm-form-label">كود الموظف التعريفي</label>
                                        <input
                                            className="adm-form-input"
                                            type="text"
                                            dir="ltr"
                                            value={form.staffCode}
                                            onChange={(e) => handleChange("staffCode", e.target.value)}
                                            placeholder="EMP-001"
                                            disabled={isEditMode}
                                        />
                                    </div>
                                    {!isEditMode && (
                                        <div className="adm-form-group">
                                            <label className="adm-form-label">كلمة المرور الابتدائية *</label>

                                            <div className="adm-staff-password-wrap">
                                                <input
                                                    className="adm-form-input adm-staff-password-input"
                                                    type={showPassword ? "text" : "password"}
                                                    dir="ltr"
                                                    value={form.password}
                                                    onChange={(e) => handleChange("password", e.target.value)}
                                                    placeholder="كلمة مرور مؤقتة..."
                                                    autoComplete="new-password"
                                                    required
                                                />
                                                <button
                                                    type="button"
                                                    className="adm-staff-password-toggle"
                                                    onClick={() => setShowPassword((v) => !v)}
                                                    aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                                                    disabled={loading}
                                                >
                                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                                </button>
                                            </div>

                                            <p className="adm-form-hint">يُنصح الموظف بتغييرها بعد الدخول الأول.</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {step === "permissions" && (
                                <div className="adm-form">
                                    <div className="adm-notice-box info" style={{ marginBottom: 'var(--sp-4)' }}>
                                        <div className="adm-notice-content">
                                            حدد ما يمكن لهذا الموظف رؤيته أو إدارته داخل لوحة تحكم المنصة.
                                            صلاحية "تحرير" تشمل العرض تلقائياً، وصلاحية "عرض فقط" تعني تصفحاً بلا قدرة على التعديل.
                                        </div>
                                    </div>

                                    <div className="adm-toolbar" style={{ justifyContent: 'space-between', marginBottom: 'var(--sp-4)' }}>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                                type="button"
                                                className="adm-btn-mgmt primary sm"
                                                onClick={() => setAllPermissions("full")}
                                            >
                                                منح كل الصلاحيات (Full)
                                            </button>
                                            <button
                                                type="button"
                                                className="adm-btn-mgmt outline sm"
                                                onClick={() => setAllPermissions("view")}
                                            >
                                                الكل (عرض فقط)
                                            </button>
                                            <button
                                                type="button"
                                                className="adm-btn-mgmt danger sm"
                                                onClick={clearPermissions}
                                            >
                                                إلغاء الكل (None)
                                            </button>
                                        </div>
                                    </div>

                                    <div
                                        className="adm-table-wrapper adm-staff-permissions-table"
                                        style={{ maxHeight: "460px", overflowY: "auto" }}
                                    >
                                        <table className="adm-table mini">
                                            <thead>
                                                <tr>
                                                    <th>الإدارة</th>
                                                    <th style={{ width: "80px", textAlign: "center" }}>عرض</th>
                                                    <th style={{ width: "80px", textAlign: "center" }}>تحرير</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {PERMISSION_GROUPS.map((group) => {
                                                    const val = form.permissions[group.id] || "none";
                                                    const isView = val === "view";
                                                    const isFull = val === "full";

                                                    return (
                                                        <tr key={group.id}>
                                                            <td>
                                                                <div style={{ display: "flex", alignItems: "center", gap: "10px", justifyContent: "space-between" }}>
                                                                    <strong style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                                        <ShieldCheck size={16} />
                                                                        {group.label}
                                                                    </strong>
                                                                    <span
                                                                        className={`adm-status-chip ${val === "full" ? "active" : val === "view" ? "warning" : "muted"}`}
                                                                        style={{ fontSize: "0.75rem", padding: "2px 8px" }}
                                                                    >
                                                                        {val === "full" ? "تحرير" : val === "view" ? "عرض فقط" : "لا صلاحية"}
                                                                    </span>
                                                                </div>
                                                            </td>

                                                            <td style={{ textAlign: "center" }}>
                                                                <input
                                                                    type="checkbox"
                                                                    className="adm-form-checkbox"
                                                                    checked={isView}
                                                                    onChange={() => togglePermission(group.id, "view")}
                                                                    disabled={loading}
                                                                />
                                                            </td>

                                                            <td style={{ textAlign: "center" }}>
                                                                <input
                                                                    type="checkbox"
                                                                    className="adm-form-checkbox"
                                                                    checked={isFull}
                                                                    onChange={() => togglePermission(group.id, "full")}
                                                                    disabled={loading}
                                                                />
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 🔘 أزرار التحكم - منقولة من الهيدر لسهولة الوصول */}
                        <div className="adm-card-footer adm-staff-footer">
                            <button
                                type="button"
                                className="adm-btn outline"
                                onClick={() => navigate("/admin?section=security")}
                                disabled={loading}
                            >
                                إلغاء
                            </button>

                            {step === "permissions" ? (
                                <button
                                    type="button"
                                    className="adm-btn primary"
                                    onClick={handleSave}
                                    disabled={loading}
                                >
                                    <Save size={18} />
                                    <span>{loading ? "جارٍ الحفظ..." : "تأكيد وحفظ"}</span>
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    className="adm-btn primary"
                                    onClick={handleNextToPermissions}
                                >
                                    التالي: الصلاحيات
                                    <ArrowRight size={18} style={{ transform: 'rotate(180deg)', marginRight: '8px' }} />
                                </button>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
