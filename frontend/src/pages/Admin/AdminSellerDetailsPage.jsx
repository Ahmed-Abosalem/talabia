import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    ArrowRight,
    Store,
    IdCard,
    CheckCircle2,
    XCircle,
    AlertCircle,
    RefreshCw,
    MapPin,
    FileText,
    ExternalLink
} from "lucide-react";
import {
    getAdminSellers,
    getAdminSellerById,
    approveSeller,
    rejectSeller,
    updateSellerStatus,
    getAdminSellerStats
} from "@/services/adminService";
import {
    ORDER_STATUS_CODES,
    UNIFIED_STATUS_LABELS_AR
} from "@/config/orderStatus";
import {
    Package,
    TrendingUp,
    ShieldAlert,
    Clock3,
    CheckCircle,
    Ban,
    Lock,
    Truck
} from "lucide-react";
import { resolveAssetUrl } from "@/utils/formatters";
import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";
import "./AdminSellerDetailsPage.css";

const AdminSellerDetailsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showToast } = useApp() || {};
    const { token } = useAuth() || {};

    const [seller, setSeller] = useState(null);
    const [stats, setStats] = useState({ products: {}, orders: {} });
    const [loading, setLoading] = useState(true);
    const [statsLoading, setStatsLoading] = useState(false);
    const [busyAction, setBusyAction] = useState(null);
    const [error, setError] = useState("");

    const loadData = async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            setStatsLoading(true);

            // 🚀 جلب البيانات بشكل متوازي لسرعة قصوى وتقليل الـ TTI
            const [sellerRes, statsRes] = await Promise.all([
                getAdminSellerById(id),
                getAdminSellerStats(id)
            ]);

            if (sellerRes?.seller) {
                setSeller(sellerRes.seller);
                setError("");
            } else {
                setError("لم يتم العثور على بيانات البائع.");
            }

            if (statsRes) {
                setStats(statsRes);
            }
        } catch (err) {
            console.error("Error loading data:", err);
            setError("فشل تحميل البيانات. يرجى التأكد من اتصالك.");
        } finally {
            if (!silent) setLoading(false);
            setStatsLoading(false);
        }
    };

    useEffect(() => {
        if (id) {
            loadData();
        }
    }, [id]);

    const handleApprove = async () => {
        try {
            setBusyAction("approve");
            await approveSeller(id);
            showToast?.("تم قبول المتجر وتفعيله بنجاح", "success");
            loadData(true); // تحديث البيانات في الخلفية
        } catch (err) {
            showToast?.("تعذر قبول المتجر", "error");
        } finally {
            setBusyAction(null);
        }
    };

    const handleReject = async () => {
        const reason = window.prompt("سبب الرفض (إجباري):");
        if (!reason || !reason.trim()) {
            showToast?.("يجب إدخال سبب للرفض", "error");
            return;
        }
        try {
            setBusyAction("reject");
            await rejectSeller(id, reason.trim());
            showToast?.("تم رفض طلب البائع", "success");
            loadData(true);
        } catch (err) {
            showToast?.("تعذر رفض الطلب", "error");
        } finally {
            setBusyAction(null);
        }
    };

    const handleSuspend = async () => {
        try {
            setBusyAction("suspend");
            await updateSellerStatus(id, "suspended");
            showToast?.("تم إيقاف المتجر مؤقتاً", "success");
            loadData(true);
        } catch (err) {
            showToast?.("تعذر إيقاف المتجر", "error");
        } finally {
            setBusyAction(null);
        }
    };

    const handleActivate = async () => {
        try {
            setBusyAction("activate");
            await updateSellerStatus(id, "approved");
            showToast?.("تم إعادة تفعيل المتجر", "success");
            loadData(true);
        } catch (err) {
            showToast?.("تعذر تفعيل المتجر", "error");
        } finally {
            setBusyAction(null);
        }
    };

    if (loading) {
        return (
            <div className="adm-loading">
                <RefreshCw className="spin" size={32} />
                <span>جاري تحميل بيانات البائع...</span>
            </div>
        );
    }

    if (error || !seller) {
        return (
            <div className="adm-loading">
                <AlertCircle size={40} />
                <p>{error || "حدث خطأ ما"}</p>
                <button onClick={() => navigate("/admin?section=sellers")} className="adm-btn outline">
                    العودة للقائمة
                </button>
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────
    // 🛠️ Helpers & Mappings
    // ─────────────────────────────────────────────────────────
    const ID_TYPE_MAP = {
        'national_id': 'بطاقة هوية وطنية',
        'national': 'هوية وطنية',
        'residence': 'هوية مقيم / إقامة',
        'passport': 'جواز سفر',
    };

    const formatUnifiedAddress = (addr) => {
        if (!addr || typeof addr === 'string') return addr || "لم يتم تحديد العنوان";
        const parts = [
            addr.country,
            addr.city,
            addr.area,    // المديرية
            addr.street,  // الحي
            addr.details  // بقية التفاصيل
        ].filter(p => p && p.trim() !== "");

        return parts.length > 0 ? parts.join(" - ") : "لم يتم تحديد العنوان";
    };

    const owner = seller.owner || {};

    // حالة المتجر: تحديد اللون والتسمية
    const statusMeta =
        seller.status === "pending" ? { label: "قيد الانتظار", cls: "pending" } :
            seller.status === "approved" ? { label: "نشط ومعتمد", cls: "active" } :
                seller.status === "suspended" ? { label: "موقوف مؤقتاً", cls: "warning" } :
                    { label: "مرفوض", cls: "inactive" };

    // رابط الوثيقة - تحسين المنطق لضمان العمل في كل البيئات باستخدام المبدأ الموحد (Authenticated Link)
    const rawDocUrl = seller.idDocumentUrl || seller.idDocument || owner.idDocumentUrl;
    const resolvedDocUrl = rawDocUrl ? resolveAssetUrl(rawDocUrl) : null;
    const authenticatedDocUrl = resolvedDocUrl
        ? `${resolvedDocUrl}${resolvedDocUrl.includes('?') ? '&' : '?'}token=${token}`
        : null;

    return (
        <div className="admin-seller-details-page adm-page-root">

            {/* 🏔️ الهيدر الزجاجي الرسمي (Golden Standard) */}
            <header className="adm-header">
                <div className="adm-header-inner">
                    <div className="adm-header-right">
                        <button
                            onClick={() => navigate("/admin?section=sellers")}
                            className="adm-btn-back"
                            title="العودة لقائمة البائعين"
                        >
                            <ArrowRight size={20} />
                        </button>
                        <div className="adm-header-titles">
                            <div className="adm-role-badge">إدارة البائعين</div>
                            <h1 className="adm-page-title">{seller.name || owner.name || "تفاصيل البائع"}</h1>
                            <div className="adm-header-meta-group">
                                <div
                                    className="adm-id-copy-header adm-header-meta"
                                    onClick={() => {
                                        if (seller._id) {
                                            navigator.clipboard.writeText(seller._id);
                                            showToast?.("تم نسخ المعرف الرقمي", "success");
                                        }
                                    }}
                                    title="نسخ المعرف"
                                >
                                    <span className="adm-id-label">معرف المتجر:</span>
                                    <span className="adm-id-value monospace">{seller._id}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="adm-header-left">
                        <div className={`adm-status-chip ${statusMeta.cls}`}>
                            <span className="adm-status-dot"></span>
                            <span className="adm-status-text">{statusMeta.label}</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* 📐 حاوية المحتوى الرئيسية */}
            <main className="adm-main-container">
                <div className="adm-details-grid">

                    {/* 👤 كرت 1: البيانات الشخصية للبائع (4 أعمدة) */}
                    <aside className="adm-card adm-seller-profile-card">
                        <div className="adm-card-header">
                            <IdCard size={20} />
                            <h2>بيانات المالك الشخصية</h2>
                        </div>
                        <div className="adm-card-body">
                            <div className="adm-info-grid" style={{ gridTemplateColumns: "1fr" }}>
                                <div className="adm-info-point">
                                    <span className="label">اسم المالك</span>
                                    <span className="value">{owner.name || "غير متوفر"}</span>
                                </div>
                                <div className="adm-info-point">
                                    <span className="label">البريد الإلكتروني</span>
                                    <span className="value monospace">{owner.email || "—"}</span>
                                </div>
                                <div className="adm-info-point">
                                    <span className="label">رقم التواصل</span>
                                    <span className="value monospace">{owner.phone || "—"}</span>
                                </div>
                                <div className="adm-info-point">
                                    <span className="label">الجنسية</span>
                                    <span className="value">{owner.nationality || "غير محدد"}</span>
                                </div>
                                <div className="adm-info-point">
                                    <span className="label">تاريخ الميلاد</span>
                                    <span className="value">
                                        {owner.birthDate
                                            ? new Date(owner.birthDate).toLocaleDateString("ar-SA")
                                            : "غير متوفر"}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </aside>

                    {/* 📋 كرت 2: التحقق + بيانات المتجر (8 أعمدة) */}
                    <div className="adm-card adm-seller-verification-card">
                        <div className="adm-card-header">
                            <FileText size={20} />
                            <h2>بيانات الهوية والتوثيق</h2>
                        </div>
                        <div className="adm-card-body">
                            <div className="adm-info-grid three-cols">
                                <div className="adm-info-point">
                                    <span className="label">نوع الوثيقة</span>
                                    <span className="value">
                                        {ID_TYPE_MAP[owner.idType] || owner.idType || "غير محدد"}
                                    </span>
                                </div>
                                <div className="adm-info-point">
                                    <span className="label">رقم الوثيقة</span>
                                    <span className="value monospace">{owner.idNumber || "—"}</span>
                                </div>
                                <div className="adm-info-point">
                                    <span className="label">جهة الإصدار</span>
                                    <span className="value">{owner.idIssuer || "—"}</span>
                                </div>
                            </div>

                            {/* صندوق معاينة الوثيقة */}
                            <div className="adm-doc-preview-box">
                                <div className="adm-doc-icon">
                                    <IdCard size={28} />
                                </div>
                                <div className="adm-doc-meta">
                                    <h3>وثيقة الهوية الرسمية</h3>
                                    <p>تحقق من سلامة البيانات ومطابقتها للأصل قبل الاعتماد.</p>
                                </div>
                                {authenticatedDocUrl ? (
                                    <a
                                        href={authenticatedDocUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="adm-btn-view-doc"
                                        onMouseDown={(e) => e.preventDefault()}
                                    >
                                        <ExternalLink size={16} />
                                        عرض الوثيقة
                                    </a>
                                ) : (
                                    <span className="adm-no-doc-note">لا توجد وثيقة مرفوعة</span>
                                )}
                            </div>
                        </div>

                        {/* قسم بيانات المتجر */}
                        <div className="adm-card-section-header">
                            <Store size={20} />
                            <h2>بيانات المتجر التجاري</h2>
                        </div>
                        <div className="adm-card-body">
                            <div className="adm-info-grid">
                                <div className="adm-info-point full">
                                    <span className="label">اسم المتجر</span>
                                    <span className="value" style={{ fontSize: "1.1rem", color: "var(--adm-primary)" }}>
                                        {seller.name || "—"}
                                    </span>
                                </div>
                                <div className="adm-info-point full">
                                    <span className="label">وصف المتجر</span>
                                    <p className="adm-value-para">{seller.description || "لا يوجد وصف حالياً لهذا المتجر."}</p>
                                </div>
                                <div className="adm-info-point">
                                    <span className="label">عنوان المتجر الرئيسي (موحد)</span>
                                    <div className="adm-value-with-icon">
                                        <MapPin size={14} />
                                        <span>{formatUnifiedAddress(seller.address)}</span>
                                    </div>
                                </div>
                                <div className="adm-info-point">
                                    <span className="label">تاريخ الانضمام للنظام</span>
                                    <span className="value">
                                        {seller.createdAt ? new Date(seller.createdAt).toLocaleDateString("ar-SA") : "-"}
                                    </span>
                                </div>
                                {seller.rejectionReason && (
                                    <div className="adm-info-point full adm-rejection-box">
                                        <div className="label">ملاحظات الرفض / الإيقاف:</div>
                                        <p className="adm-value-para">{seller.rejectionReason}</p>
                                    </div>
                                )}
                            </div>
                        </div>


                        {/* ذيل الكرت: أزرار الإجراءات (مركزة ومحمية) */}
                        <div className="adm-actions-group adm-actions-center-group">
                            {seller.status === "pending" && (
                                <>
                                    <button
                                        className="adm-btn-mgmt danger"
                                        onClick={handleReject}
                                        disabled={!!busyAction}
                                    >
                                        <XCircle size={18} />
                                        رفض الطلب
                                    </button>
                                    <button
                                        className="adm-btn-mgmt primary"
                                        onClick={handleApprove}
                                        disabled={!!busyAction}
                                    >
                                        <CheckCircle2 size={18} />
                                        {busyAction === "approve" ? "جاري القبول..." : "اعتماد وتفعيل المتجر"}
                                    </button>
                                </>
                            )}
                            {seller.status === "approved" && (
                                <button
                                    className="adm-btn-mgmt suspend"
                                    onClick={handleSuspend}
                                    disabled={!!busyAction}
                                >
                                    <AlertCircle size={18} />
                                    إيقاف المتجر مؤقتاً
                                </button>
                            )}
                            {seller.status === "suspended" && (
                                <button
                                    className="adm-btn-mgmt primary"
                                    onClick={handleActivate}
                                    disabled={!!busyAction}
                                >
                                    <RefreshCw size={18} className={busyAction === "activate" ? "spin" : ""} />
                                    إعادة تفعيل المتجر
                                </button>
                            )}
                            {seller.status === "rejected" && (
                                <button
                                    className="adm-btn-mgmt primary"
                                    onClick={handleApprove}
                                    disabled={!!busyAction}
                                >
                                    <CheckCircle2 size={18} />
                                    إعادة قبول المتجر
                                </button>
                            )}
                        </div>
                    </div>
                </div> {/* End of adm-details-grid */}

                {/* 📊 قسم إحصائيات المنتجات والطلبات (احترافي ومستقل) */}
                <div className="adm-stats-sections-grid">
                    {/* ملخص المنتجات */}
                    <div className="adm-card adm-stats-card">
                        <div className="adm-card-header">
                            <div className="header-title">
                                <Package size={20} className="primary" />
                                <h2>ملخص المنتجات</h2>
                            </div>
                            {statsLoading && <div className="adm-loader-mini"></div>}
                        </div>
                        <div className="adm-stats-content">
                            <div className="adm-stats-main-grid">
                                <div className="adm-stat-item total">
                                    <span className="label">إجمالي المنتجات</span>
                                    <span className="value">{stats.products?.total || 0}</span>
                                </div>
                                <div className="adm-stat-item active">
                                    <span className="label">النشطة</span>
                                    <span className="value">{stats.products?.active || 0}</span>
                                </div>
                                <div className="adm-stat-item inactive">
                                    <span className="label">غير النشطة</span>
                                    <span className="value">{stats.products?.inactive || 0}</span>
                                </div>
                                <div className="adm-stat-item locked">
                                    <span className="label">موقوف إدارياً</span>
                                    <span className="value">{stats.products?.locked || 0}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ملخص الطلبات */}
                    <div className="adm-card adm-stats-card">
                        <div className="adm-card-header">
                            <div className="header-title">
                                <TrendingUp size={20} className="accent" />
                                <h2>ملخص الطلبات (عناصر)</h2>
                            </div>
                        </div>
                        <div className="adm-stats-content">
                            <div className="adm-stats-orders-grid">
                                <div className="adm-order-stat-box new">
                                    <div className="box-icon"><Clock3 size={14} /></div>
                                    <div className="box-data">
                                        <span className="label">{UNIFIED_STATUS_LABELS_AR[ORDER_STATUS_CODES.AT_SELLER_NEW]}</span>
                                        <span className="value">{stats.orders?.[ORDER_STATUS_CODES.AT_SELLER_NEW] || 0}</span>
                                    </div>
                                </div>
                                <div className="adm-order-stat-box processing">
                                    <div className="box-icon"><RefreshCw size={14} /></div>
                                    <div className="box-data">
                                        <span className="label">{UNIFIED_STATUS_LABELS_AR[ORDER_STATUS_CODES.AT_SELLER_PROCESSING]}</span>
                                        <span className="value">{stats.orders?.[ORDER_STATUS_CODES.AT_SELLER_PROCESSING] || 0}</span>
                                    </div>
                                </div>
                                <div className="adm-order-stat-box ready">
                                    <div className="box-icon"><CheckCircle size={14} /></div>
                                    <div className="box-data">
                                        <span className="label">{UNIFIED_STATUS_LABELS_AR[ORDER_STATUS_CODES.AT_SELLER_READY_TO_SHIP]}</span>
                                        <span className="value">{stats.orders?.[ORDER_STATUS_CODES.AT_SELLER_READY_TO_SHIP] || 0}</span>
                                    </div>
                                </div>
                                <div className="adm-order-stat-box shipping">
                                    <div className="box-icon"><Package size={14} /></div>
                                    <div className="box-data">
                                        <span className="label">{UNIFIED_STATUS_LABELS_AR[ORDER_STATUS_CODES.IN_SHIPPING]}</span>
                                        <span className="value">{stats.orders?.[ORDER_STATUS_CODES.IN_SHIPPING] || 0}</span>
                                    </div>
                                </div>
                                <div className="adm-order-stat-box delivered">
                                    <div className="box-icon"><CheckCircle2 size={14} /></div>
                                    <div className="box-data">
                                        <span className="label">{UNIFIED_STATUS_LABELS_AR[ORDER_STATUS_CODES.DELIVERED]}</span>
                                        <span className="value">{stats.orders?.[ORDER_STATUS_CODES.DELIVERED] || 0}</span>
                                    </div>
                                </div>
                                <div className="adm-order-stat-box cancelled-seller">
                                    <div className="box-icon"><Ban size={14} /></div>
                                    <div className="box-data">
                                        <span className="label">{UNIFIED_STATUS_LABELS_AR[ORDER_STATUS_CODES.CANCELLED_BY_SELLER]}</span>
                                        <span className="value">{stats.orders?.[ORDER_STATUS_CODES.CANCELLED_BY_SELLER] || 0}</span>
                                    </div>
                                </div>
                                <div className="adm-order-stat-box cancelled-shipping">
                                    <div className="box-icon"><Truck size={14} /></div>
                                    <div className="box-data">
                                        <span className="label">{UNIFIED_STATUS_LABELS_AR[ORDER_STATUS_CODES.CANCELLED_BY_SHIPPING]}</span>
                                        <span className="value">{stats.orders?.[ORDER_STATUS_CODES.CANCELLED_BY_SHIPPING] || 0}</span>
                                    </div>
                                </div>
                                <div className="adm-order-stat-box cancelled-admin">
                                    <div className="box-icon"><ShieldAlert size={14} /></div>
                                    <div className="box-data">
                                        <span className="label">{UNIFIED_STATUS_LABELS_AR[ORDER_STATUS_CODES.CANCELLED_BY_ADMIN]}</span>
                                        <span className="value">{stats.orders?.[ORDER_STATUS_CODES.CANCELLED_BY_ADMIN] || 0}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AdminSellerDetailsPage;
