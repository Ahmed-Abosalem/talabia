import React, { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
    Users,
    Eye,
    UserCircle,
    Phone,
    MapPin,
    ShoppingBag,
    Truck,
    Activity,
    Calendar,
    Globe,
    Briefcase,
    IdCard,
    Mail,
    ArrowRight,
    Shield,
    Clock,
    ExternalLink,
    Store,
    RefreshCw,
    CheckCircle2,
    XCircle,
    Trash2,
    BellRing,
    AlertTriangle,
} from "lucide-react";
import { getAdminUserDetails, updateUserStatus, deleteUser } from "@/services/adminService";
import axios from "axios";
import { useApp } from "@/context/AppContext";
import { formatDate, resolveAssetUrl } from "@/utils/formatters";
import { useAuth } from "@/context/AuthContext";
import "./AdminUserDetailsPage.css";

// Utility formatting functions (reused from section for consistency)
// Note: formatDate is now imported from centralized formatters.js

function formatUnifiedAddress(address, fallbackCountry = "") {
    if (!address) return "غير متوفر";
    if (typeof address === "string") return address;

    // 1. الدولة (Country) - Handles variations across legacy and unified systems
    const country = (address.country || (address.city && (address.area || address.district) ? address.city : "") || fallbackCountry || "").trim();

    // 2. المدينة (City) - If 'city' was the country, 'area' is the city. Otherwise 'city' is city.
    const city = (address.country ? address.city : (address.area || (address.city && (address.district || address.street) ? address.city : ""))).trim();

    // 3. المديرية (District)
    const district = (address.district || address.directorate || address.area || "").trim();

    // 4. الحي (Neighborhood)
    const neighborhood = (address.neighborhood || address.street || address.quarter || "").trim();

    // 5. التفاصيل (Details)
    const details = (address.addressDetails || address.details || address.moreDetails || "").trim();

    // Sequence: الدولة - المدينة - المديرية - الحي - التفاصيل
    const rawParts = [country, city, district, neighborhood, details]
        .filter(Boolean)
        .map((p) => String(p).trim())
        .filter(Boolean);

    // Smart Deduplication: prevent "اليمن - اليمن" if both fields hold the same value
    const finalParts = [];
    rawParts.forEach(p => {
        if (finalParts.length === 0 || finalParts[finalParts.length - 1] !== p) {
            finalParts.push(p);
        }
    });

    return finalParts.join(" - ") || "غير متوفر";
}

// Map store status to labels and types
const STORE_STATUS_MAP = {
    pending: { label: "قيد المراجعة", type: "warning" },
    approved: { label: "مقبول / نشط", type: "success" },
    rejected: { label: "مرفوض", type: "danger" },
    suspended: { label: "موقوف مؤقتاً", type: "inactive" }
};

// Map internal ID types to Arabic labels (as used in Register.jsx)
const ID_TYPE_MAP = {
    national_id: "بطاقة شخصية",
    passport: "جواز سفر",
    residence_permit: "إقامة",
    national: "بطاقة شخصية" // Handling legacy or variations
};

export default function AdminUserDetailsPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showToast } = useApp() || {};
    const { token } = useAuth() || {};

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [data, setData] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);

    // حالة مودال الحذف
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState("");

    useEffect(() => {
        fetchDetails();

        // 🛡️ منع التظليل العشوائي عند الفتح بشكل قطعي ومكرر
        const clearSelection = () => {
            if (window.getSelection) {
                window.getSelection().removeAllRanges();
            }
        };

        clearSelection();
        const t1 = setTimeout(clearSelection, 30);
        const t2 = setTimeout(clearSelection, 100);
        const t3 = setTimeout(clearSelection, 300); // للتأكد تماماً بعد انتهاء الـ Animation

        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
            clearTimeout(t3);
        };
    }, [id]);

    // 📏 Real-time Header Height Tracking (Universal Admin Standard)
    const headerRef = useRef(null);
    const [headerHeight, setHeaderHeight] = useState(0);

    /* 🛡️ SYSTEM GUARD: DYNAMIC DISPLACEMENT PROTOCOL */
    useEffect(() => {
        if (!headerRef.current) return;
        const observer = new ResizeObserver((entries) => {
            for (let entry of entries) {
                setHeaderHeight(entry.target.offsetHeight);
            }
        });

        observer.observe(headerRef.current);
        return () => observer.disconnect();
    }, []);

    // 📍 Professional Data Normalization & Address Merger
    // Hooks must be called at the top level, before any conditional returns.
    const user = data?.user || {};
    const store = data?.store || null;
    const shippingCompany = data?.shippingCompany || null;
    const linkedShippers = data?.linkedShippingCompanies || [];
    const stats = data?.stats || {};

    const addresses = useMemo(() => {
        if (!data) return [];
        const list = [...(data?.addresses || [])];

        // Add Store Address if it exists (for Sellers)
        if (store?.address) {
            list.unshift({
                ...store.address,
                label: "عنوان المتجر الرئيسي",
                isBusiness: true,
                isDefault: true // Business address is primary for sellers
            });
        }

        // Add Shipping Company Address if it exists
        if (shippingCompany?.address) {
            list.unshift({
                ...shippingCompany.address,
                label: "مقر الشركة الرئيسي",
                isBusiness: true,
                isDefault: true
            });
        }

        return list;
    }, [data, store?.address, shippingCompany?.address]);

    async function fetchDetails() {
        try {
            setLoading(true);
            setError("");
            const res = await getAdminUserDetails(id);
            setData(res);
        } catch (err) {
            const msg = err?.response?.data?.message || "تعذر جلب تفاصيل المستخدم.";
            setError(msg);
            showToast?.(msg, "error");
        } finally {
            setLoading(false);
        }
    }

    async function handleToggleStatus() {
        if (!user._id) return;
        try {
            setActionLoading(true);
            const nextStatus = user.isActive === false; // toggle
            await updateUserStatus(user._id, nextStatus);
            showToast?.(`تم ${nextStatus ? 'تفعيل' : 'إلغاء تفعيل'} الحساب بنجاح`, "success");
            fetchDetails();
        } catch (err) {
            showToast?.("فشل تحديث حالة الحساب", "error");
        } finally {
            setActionLoading(false);
        }
    }

    function confirmDeleteUser() {
        setDeleteModalOpen(true);
        setDeleteError("");
    }

    async function executeDeleteUser() {
        try {
            setIsDeleting(true);
            setDeleteError("");
            await deleteUser(user._id);
            showToast?.("تم حذف المستخدم بنجاح", "success");
            setDeleteModalOpen(false);
            navigate("/admin?section=users");
        } catch (err) {
            const msg = err?.response?.data?.message || "تعذر حذف المستخدم";
            setDeleteError(msg);
            showToast?.(msg, "error");
        } finally {
            setIsDeleting(false);
        }
    }

    function handleViewIDDocument() {
        if (!user?.idDocumentUrl) return;
        const baseUrl = resolveAssetUrl(user.idDocumentUrl);
        // إرفاق التوكن في الرابط لتتمكن الـ Middleware من التحقق منه
        const urlWithToken = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}token=${token}`;
        window.open(urlWithToken, "_blank");
    }

    if (loading) {
        return (
            <div className="admin-page-loading">
                <RefreshCw size={24} className="spin" />
                <span>جاري تحميل تفاصيل المستخدم...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="admin-page-error">
                <div className="error-card">
                    <h2>تعذر تحميل البيانات</h2>
                    <p>{error}</p>
                    <button onClick={() => navigate("/admin?section=users")} className="back-link">
                        العودة لقائمة المستخدمين
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div 
            className="adm-page-root admin-user-details-page"
            style={{ "--adm-header-height": `${headerHeight}px` }}
        >
            {/* 🏔️ OFFICIAL COMPACT HEADER (10/10 Standard) */}
            <header className="adm-header" ref={headerRef}>
                <div className="adm-header-inner">
                    <div className="adm-header-right">
                        <button
                            onClick={() => navigate("/admin?section=users")}
                            className="adm-btn-back"
                            title="العودة"
                        >
                            <ArrowRight size={20} />
                        </button>
                        <div className="adm-header-titles">
                            <h1 className="adm-page-title">{user.name || "تفاصيل المستخدم"}</h1>
                            <div className="adm-header-meta">
                                <span className="adm-role-badge">
                                    {user.role === 'seller' ? 'حساب بائع' : user.role === 'shipper' ? 'حساب شحن' : 'حساب مشتري'}
                                </span>
                                <div className="adm-id-copy" onClick={() => {
                                    navigator.clipboard.writeText(user._id);
                                    showToast?.("تم نسخ المعرف الرقمي", "success");
                                }}>
                                    <span className="adm-id-label">المعرف الرقمي:</span>
                                    <span className="adm-id-value">{user._id}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="adm-header-left">
                        <div className={`adm-status-chip ${user.isActive !== false ? "active" : "inactive"}`}>
                            <span className="adm-status-dot"></span>
                            <span className="adm-status-text">
                                {user.isActive !== false ? "حساب نشط" : "حساب غير نشط"}
                            </span>
                        </div>
                    </div>
                </div>
            </header>

            <div className="adm-main-container">
                <main className="adm-details-grid">

                    {/* 👤 Card 1: Main Profile (Span 8) */}
                    <section className="adm-card span-8">
                        <div className="adm-card-header">
                            <UserCircle size={20} />
                            <h2>بيانات الحساب الأساسية</h2>
                        </div>
                        <div className="adm-card-body">
                            <div className="adm-info-grid">
                                <div className="adm-info-point">
                                    <span className="label">الاسم الكامل</span>
                                    <span className="value">{user.name || "—"}</span>
                                </div>
                                <div className="adm-info-point">
                                    <span className="label">الدور الوظيفي</span>
                                    <span className="value">{user.role || "buyer"}</span>
                                </div>
                                <div className="adm-info-point">
                                    <span className="label">البريد الإلكتروني</span>
                                    <span className="value monospace">{user.email}</span>
                                </div>
                                <div className="adm-info-point">
                                    <span className="label">رقم الهاتف</span>
                                    <span className="value">{user.phone || "—"}</span>
                                </div>
                            </div>

                            {/* ⚡ Pro Action Linking (Golden Standard) */}
                            <div className="adm-actions-group">
                                <button
                                    className={`adm-btn-mgmt ${user.isActive !== false ? 'danger' : 'primary'}`}
                                    onClick={handleToggleStatus}
                                    disabled={actionLoading}
                                >
                                    {user.isActive !== false ? <XCircle size={16} /> : <CheckCircle2 size={16} />}
                                    {user.isActive !== false ? "تعطيل الحساب" : "تفعيل الحساب"}
                                </button>

                                <button
                                    className="adm-btn-mgmt outline"
                                    onClick={() => navigate(`/admin/users/notify/${user._id}`)}
                                >
                                    <BellRing size={16} /> إرسال تنبيه
                                </button>

                                <button
                                    className="adm-btn-mgmt danger"
                                    onClick={confirmDeleteUser}
                                    disabled={actionLoading}
                                >
                                    <Trash2 size={16} /> حذف الحساب
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* 📊 Card 2: Stats Summary (Span 4) */}
                    <section className="adm-card span-4">
                        <div className="adm-card-header">
                            <Activity size={20} />
                            <h2>إحصائيات النشاط</h2>
                        </div>
                        <div className="adm-card-body">
                            <div className="adm-stats-list">
                                <div className="adm-stat-item">
                                    <span className="label">إجمالي الطلبات</span>
                                    <span className="value">{stats.totalOrders || stats.buyerOrdersCount || 0}</span>
                                </div>
                                <div className="adm-stat-item">
                                    <span className="label">إجمالي المشتريات</span>
                                    <span className="value price">{stats.totalSpent || 0} ر.س</span>
                                </div>
                                <div className="adm-stat-item muted">
                                    <span className="label">تاريخ الانضمام</span>
                                    <span className="value">{formatDate(user.createdAt)}</span>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* 🛡️ Card 3: KYC & Identity (Span 6) */}
                    <section className="adm-card span-6">
                        <div className="adm-card-header">
                            <Shield size={20} />
                            <h2>التوثيق والهوية</h2>
                        </div>
                        <div className="adm-card-body">
                            <div className="adm-info-grid">
                                <div className="adm-info-point">
                                    <span className="label">الجنسية</span>
                                    <span className="value">{user.nationality || "غير محدد"}</span>
                                </div>
                                <div className="adm-info-point">
                                    <span className="label">تاريخ الميلاد</span>
                                    <span className="value">{formatDate(user.birthDate)}</span>
                                </div>
                                <div className="adm-info-point">
                                    <span className="label">نوع الوثيقة</span>
                                    <span className="value">{ID_TYPE_MAP[user.idType] || user.idType || "غير محدد"}</span>
                                </div>
                                <div className="adm-info-point">
                                    <span className="label">رقم الوثيقة</span>
                                    <span className="value monospace">{user.idNumber || "—"}</span>
                                </div>
                                <div className="adm-info-point">
                                    <span className="label">جهة الإصدار</span>
                                    <span className="value">{user.idIssuer || "—"}</span>
                                </div>
                                {user.idDocumentUrl ? (
                                    <div className="adm-info-point span-2">
                                        <span className="label">المرفق الرقمي الموثق</span>
                                        <button
                                            onClick={handleViewIDDocument}
                                            className="adm-btn-mgmt primary full-width"
                                            disabled={actionLoading || !token}
                                        >
                                            <ExternalLink size={16} />
                                            {actionLoading ? "جاري التحميل..." : "فتح وثيقة الهوية الرسمية"}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="adm-info-point span-2">
                                        <p className="adm-empty-note">بانتظار رفع وثائق التوثيق الرسمية</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* 🏢 Card 4: Entities (Span 6) */}
                    {(store || shippingCompany) ? (
                        <section className="adm-card span-6">
                            <div className="adm-card-header">
                                <ShoppingBag size={20} />
                                <h2>الكيانات التجارية</h2>
                            </div>
                            <div className="adm-card-body">
                                <div className="adm-entities-list">
                                    {store && (
                                        <div className="adm-entity seller">
                                            <Store size={20} />
                                            <div className="entity-txt">
                                                <div className="entity-header-row">
                                                    <h3 className="name">{store.name}</h3>
                                                    {store.status && (
                                                        <span className={`adm-status-chip mini ${STORE_STATUS_MAP[store.status]?.type || 'neutral'}`}>
                                                            {STORE_STATUS_MAP[store.status]?.label || store.status}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="type">متجر بائع مستوف الشروط</p>
                                                {store.description && (
                                                    <p className="description">{store.description}</p>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    {shippingCompany && (
                                        <div className="adm-entity shipping">
                                            <Truck size={20} />
                                            <div className="entity-txt">
                                                <h3 className="name">{shippingCompany.name}</h3>
                                                <p className="type">شركة شحن معتمدة - {shippingCompany.scope === "global" ? "دولي" : "محلي"}</p>
                                            </div>
                                        </div>
                                    )}
                                    {linkedShippers.length > 0 && (
                                        <div className="adm-linked-shippers">
                                            <div className="linked-label">شركات الشحن المرتبطة بالمتجر ({linkedShippers.length})</div>
                                            <div className="linked-list">
                                                {linkedShippers.map((ls) => (
                                                    <div key={ls._id} className="linked-item">
                                                        <Truck size={12} />
                                                        <span>{ls.name}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>
                    ) : (
                        <section className="adm-card span-6 empty-state">
                            <div className="adm-card-header">
                                <ShoppingBag size={20} />
                                <h2>الكيانات التجارية</h2>
                            </div>
                            <div className="adm-card-body">
                                <p className="adm-empty-msg">هذا المستخدم لا يملك كيانات تجارية مرتبطة (متجر أو شركة شحن).</p>
                            </div>
                        </section>
                    )}

                    {/* 📍 Card 5: Addresses (Full Width) */}
                    <section className="adm-card span-12">
                        <div className="adm-card-header">
                            <MapPin size={20} />
                            <h2>عناوين الشحن والمواقع ({addresses.length})</h2>
                        </div>
                        <div className="adm-card-body">
                            {addresses.length > 0 ? (
                                <div className="adm-address-grid">
                                    {addresses.map((addr, idx) => (
                                        <div key={idx} className={`adm-address-item ${addr.isDefault ? 'default' : ''}`}>
                                            <div className="addr-tag">
                                                {addr.label || "عنوان إضافي"}
                                                {addr.isDefault && <span className="pill">افتراضي</span>}
                                            </div>
                                            <p className="addr-content">{formatUnifiedAddress(addr)}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="adm-empty-center">
                                    لم يتم تسجيل أي عناوين شحن لهذا الحساب حتى الآن.
                                </div>
                            )}
                        </div>
                    </section>
                </main>
            </div>

            {/* مودال تأكيد الحذف */}
            {deleteModalOpen && user && (
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
                                    أنت على وشك حذف حساب المستخدم <strong>{user.name}</strong>.
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
                            <button type="button" className="adm-btn danger" onClick={executeDeleteUser} disabled={isDeleting}>
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
        </div>
    );
}
