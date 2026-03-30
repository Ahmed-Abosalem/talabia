import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    Package,
    Eye,
    EyeOff,
    ShoppingBag,
    ArrowRight,
    Shield,
    Clock,
    ExternalLink,
    Store,
    RefreshCw,
    CheckCircle2,
    XCircle,
    Trash2,
    Layers,
    Star,
    Heart,
    Image as ImageIcon,
    ListChecks,
    AlertCircle,
    Activity,
    Tag,
    Globe,
    DollarSign,
    Box,
    Calendar,
    Copy
} from "lucide-react";
import {
    getAdminProductDetails,
    updateProductStatus,
    deleteProductAsAdmin,
    updateProductFeatureStatus
} from "@/services/adminService";
import { useApp } from "@/context/AppContext";
import { formatDate, formatCurrency, formatNumber, resolveAssetUrl } from "@/utils/formatters";
import "./AdminProductDetailsPage.css";

export default function AdminProductDetailsPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showToast } = useApp() || {};

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [product, setProduct] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [isTogglingFeatured, setIsTogglingFeatured] = useState(false); // Independent loader for featured toggle
    const [featuredOrderVal, setFeaturedOrderVal] = useState("");
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    useEffect(() => {
        fetchDetails();
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

    async function fetchDetails() {
        try {
            setLoading(true);
            setError("");
            const res = await getAdminProductDetails(id);
            setProduct(res.product);
            setFeaturedOrderVal(res.product?.featuredOrder || "");
        } catch (err) {
            const msg = err?.response?.data?.message || "تعذر جلب تفاصيل المنتج.";
            setError(msg);
            showToast?.(msg, "error");
        } finally {
            setLoading(false);
        }
    }

    async function handleToggleStatus() {
        if (!product?._id) return;

        // Safeguard: Cannot activate out-of-stock products that were auto-deactivated
        if (product.autoDeactivated && !product.adminLocked) {
            showToast?.("لا يمكن تفعيل منتج تم تعطيله آلياً بسبب نفاد المخزون.", "info");
            return;
        }

        try {
            setActionLoading(true);

            // Backend updateProductStatus logic:
            // "inactive" -> adminLocked: true, isActive: false
            // "active" -> adminLocked: false, isActive: true
            const nextStatusRequest = product.adminLocked ? "active" : "inactive";

            await updateProductStatus(product._id, nextStatusRequest);

            showToast?.(
                nextStatusRequest === "active"
                    ? "تم إلغاء الحجب وتفعيل المنتج"
                    : "تم حجب المنتج من قبل الإدارة",
                "success"
            );
            fetchDetails();
        } catch (err) {
            showToast?.("فشل تحديث حالة المنتج", "error");
        } finally {
            setActionLoading(false);
        }
    }

    async function handleDelete() {
        try {
            setActionLoading(true);
            await deleteProductAsAdmin(product._id);
            showToast?.("تم حذف المنتج بنجاح", "success");
            navigate("/admin?section=products");
        } catch (err) {
            showToast?.("تعذر حذف المنتج", "error");
        } finally {
            setActionLoading(false);
        }
    }

    async function handleToggleFeatured() {
        try {
            setIsTogglingFeatured(true);
            const nextFeatured = !product.isFeatured;
            const payload = { isFeatured: nextFeatured };
            if (nextFeatured) {
                const num = parseInt(featuredOrderVal, 10);
                if (!isNaN(num)) payload.featuredOrder = num;
            }
            await updateProductFeatureStatus(product._id, payload);
            showToast?.(nextFeatured ? "بُشرى! أصبح المنتج مميزاً الآن ⭐" : "تم إزالة التميز عن المنتج ✖️", "success");
            await fetchDetails();
        } catch (err) {
            showToast?.("عذراً، فشل تحديث حالة التميز", "error");
        } finally {
            setIsTogglingFeatured(false);
        }
    }

    async function handleSaveFeaturedOrder() {
        if (!product?.isFeatured) return;
        const numVal = parseInt(featuredOrderVal, 10);
        if (isNaN(numVal)) {
            showToast?.("يرجى إدخال رقم صحيح لترتيب التميز", "error");
            return;
        }

        try {
            setActionLoading(true);
            await updateProductFeatureStatus(product._id, {
                isFeatured: true,
                featuredOrder: numVal
            });
            showToast?.("تم حفظ ترتيب التميز بنجاح", "success");
            fetchDetails();
        } catch (err) {
            showToast?.("فشل حفظ ترتيب التميز", "error");
        } finally {
            setActionLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="admin-page-loading">
                <RefreshCw size={24} className="spin" />
                <span>جاري تحميل تفاصيل المنتج...</span>
            </div>
        );
    }

    if (error || !product) {
        return (
            <div className="admin-page-error">
                <div className="error-card">
                    <AlertCircle size={40} className="error-icon" />
                    <h2>تعذر تحميل البيانات</h2>
                    <p>{error || "المنتج غير موجود"}</p>
                    <button onClick={() => navigate("/admin?section=products")} className="back-link">
                        العودة لقائمة المنتجات
                    </button>
                </div>
            </div>
        );
    }

    // Get status config for display
    const getStatusConfig = () => {
        if (product.adminLocked) return { label: "محجوب إدارياً", cls: "inactive", icon: <Shield size={14} /> };
        if (product.autoDeactivated) return { label: "مخفي (انتهاء صلاحية)", cls: "warning", icon: <Clock size={14} /> };
        if (product.isActive) return { label: "نشط", cls: "active", icon: <CheckCircle2 size={14} /> };
        return { label: "غير نشط (بواسطة البائع)", cls: "inactive", icon: <XCircle size={14} /> };
    };

    const status = getStatusConfig();

    return (
        <div 
            className="adm-page-root admin-product-details-page"
            style={{ "--adm-header-height": `${headerHeight}px` }}
        >
            <header className="adm-header" ref={headerRef}>
                <div className="adm-header-inner">
                    <div className="adm-header-right">
                        <button
                            onClick={() => navigate("/admin?section=products")}
                            className="adm-btn-back"
                            title="العودة"
                        >
                            <ArrowRight size={20} />
                        </button>
                        <div className="adm-header-titles">
                            <h1 className="adm-page-title">{product.name}</h1>
                            <div className="adm-header-meta">
                                <span className="adm-category-badge">
                                    <Tag size={12} />
                                    {product.category?.name || "بدون تصنيف"}
                                </span>
                                {product.isFeatured && (
                                    <span className="adm-featured-badge">
                                        <Star size={12} fill="currentColor" />
                                        مميز #{product.featuredOrder}
                                    </span>
                                )}
                                <div className="adm-id-pill" onClick={() => {
                                    navigator.clipboard.writeText(product._id);
                                    showToast?.("تم نسخ المعرف الرقمي", "success");
                                }}>
                                    <span className="id-txt">المعرف الرقمي: {product._id}</span>
                                    <Copy size={12} className="copy-icon" />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="adm-header-left">
                        <div className={`adm-status-chip ${status.cls}`}>
                            <span className="adm-status-dot"></span>
                            <span className="adm-status-text">{status.label}</span>
                        </div>
                    </div>
                </div>
            </header>

            <div className="adm-main-container">
                <main className="adm-details-grid">
                    {/* Card 1: Essential Info & Actions (Span 8) */}
                    <section className="adm-card span-8">
                        <div className="adm-card-header">
                            <Package size={20} />
                            <h2>البيانات الأساسية والتسعير</h2>
                        </div>
                        <div className="adm-card-body">
                            <div className="adm-info-grid">
                                <div className="adm-info-point">
                                    <div className="point-label">
                                        <Package size={14} />
                                        <span>اسم المنتج</span>
                                    </div>
                                    <span className="value">{product.name}</span>
                                </div>
                                <div className="adm-info-point">
                                    <div className="point-label">
                                        <Tag size={14} />
                                        <span>التصنيف</span>
                                    </div>
                                    <span className="value">{product.category?.name || "بدون تصنيف"}</span>
                                </div>
                                <div className="adm-info-point">
                                    <div className="point-label">
                                        <Globe size={14} />
                                        <span>العلامة التجارية</span>
                                    </div>
                                    <span className="value">{product.brand || "بدون ماركة"}</span>
                                </div>
                                <div className="adm-info-point">
                                    <div className="point-label">
                                        <DollarSign size={14} />
                                        <span>السعر الأساسي</span>
                                    </div>
                                    <span className="value price-highlight">{formatCurrency(product.price)}</span>
                                </div>
                                <div className="adm-info-point">
                                    <div className="point-label">
                                        <Box size={14} />
                                        <span>المخزون الحالي</span>
                                    </div>
                                    <span className="value">{formatNumber(product.stock)} {product.unitLabel || "وحدة"}</span>
                                </div>
                                <div className="adm-info-point">
                                    <div className="point-label">
                                        <Shield size={14} />
                                        <span>المستوى الحرج</span>
                                    </div>
                                    <span className="value">{product.lowStockThreshold || 0}</span>
                                </div>
                                <div className="adm-info-point">
                                    <div className="point-label">
                                        <Calendar size={14} />
                                        <span>تاريخ الإضافة</span>
                                    </div>
                                    <span className="value">{formatDate(product.createdAt)}</span>
                                </div>
                                <div className="adm-info-point">
                                    <div className="point-label">
                                        <Heart size={14} />
                                        <span>المفضلة</span>
                                    </div>
                                    <span className="value">{formatNumber(product.favoritesCount || 0)} مرة</span>
                                </div>
                                <div className="adm-info-point">
                                    <div className="point-label">
                                        <ShoppingBag size={14} />
                                        <span>الإضافة للسلة</span>
                                    </div>
                                    <span className="value">{formatNumber(product.addToCartCount || 0)} مرة</span>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Card 2: Stats Summary (Span 4) */}
                    <section className="adm-card span-4">
                        <div className="adm-card-header">
                            <Activity size={20} />
                            <h2>إحصائيات التفاعل</h2>
                        </div>
                        <div className="adm-card-body">
                            <div className="adm-stats-list">
                                <div className="adm-stat-item">
                                    <span className="label">المشاهدات</span>
                                    <span className="value">{formatNumber(product.viewsCount)}</span>
                                </div>
                                <div className="adm-stat-item">
                                    <span className="label">المبيعات</span>
                                    <span className="value">{formatNumber(product.salesCount || 0)}</span>
                                </div>
                                <div className="adm-stat-item">
                                    <span className="label">الطلبات المرتبطة</span>
                                    <span className="value">{formatNumber(product.ordersCount || 0)}</span>
                                </div>
                                <div className="adm-stat-item muted">
                                    <span className="label">التقييم العام</span>
                                    <span className="value" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Star size={14} fill="#fbbf24" color="#fbbf24" />
                                        {product.rating?.toFixed(1) || "0.0"} ({product.numReviews || 0})
                                    </span>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Card 3: Images (Span 6) */}
                    <section className="adm-card span-6">
                        <div className="adm-card-header">
                            <ImageIcon size={20} />
                            <h2>معرض صور المنتج ({product.images?.length || 0})</h2>
                        </div>
                        <div className="adm-card-body">
                            <div className="adm-images-gallery">
                                {product.images?.length > 0 ? (
                                    product.images.map((img, idx) => (
                                        <div key={idx} className="adm-gallery-item">
                                            <img src={resolveAssetUrl(typeof img === 'string' ? img : img.url)} alt="" loading="lazy" />
                                        </div>
                                    ))
                                ) : (
                                    <div className="adm-empty-note">لا توجد صور لهذا المنتج</div>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* Card 4: Store/Seller Info (Span 6) */}
                    <section className="adm-card span-6">
                        <div className="adm-card-header">
                            <Store size={20} />
                            <h2>الكيانات المرتبطة (البائع)</h2>
                        </div>
                        <div className="adm-card-body">
                            <div className="adm-entities-list">
                                <div className="adm-entity seller">
                                    <Store size={20} />
                                    <div className="entity-txt">
                                        <div className="entity-header-row">
                                            <h3 className="name">{product.storeName}</h3>
                                            <span className="adm-status-chip mini neutral monospace" style={{ padding: '2px 6px', fontSize: '0.65rem' }}>{product.storeId || "—"}</span>
                                        </div>
                                        <p className="type">صاحب المتجر: {product.seller?.name || "—"}</p>
                                    </div>
                                </div>
                                <button
                                    className="adm-btn-mgmt outline full-width"
                                    style={{ marginTop: '1rem', height: '40px' }}
                                    onClick={() => {
                                        const sellerId = product.seller?._id || product.seller;
                                        if (sellerId) navigate(`/admin/users/details/${sellerId}`);
                                        else showToast?.("معرف البائع غير متوفر", "warning");
                                    }}
                                >
                                    <ExternalLink size={16} /> عرض ملف البائع
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* Card 5: Description & Technical details (Span 12) */}
                    <section className="adm-card span-12">
                        <div className="adm-card-header">
                            <ListChecks size={20} />
                            <h2>الوصف والمواصفات</h2>
                        </div>
                        <div className="adm-card-body">
                            <div className="adm-desc-box">
                                <h4 className="sub-label">وصف المنتج الكامل</h4>
                                <p className="desc-text">{product.description || "لا يوجد وصف."}</p>
                            </div>

                            {Array.isArray(product.variants) && product.variants.length > 0 && (
                                <div className="adm-desc-box" style={{ marginBottom: 0 }}>
                                    <h4 className="sub-label">خيارات المنتج (Variants)</h4>
                                    <div className="adm-variants-grid">
                                        {product.variants.map((v, i) => (
                                            <div key={i} className="adm-variant-chip">
                                                <span className="v-key">{v.name}:</span>
                                                <span className="v-val">{Array.isArray(v.values) ? v.values.join(", ") : v.values}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Card 6: Administrative Controls (Full Width) */}
                    <section className="adm-card span-12 adm-mgmt-card">
                        <div className="adm-card-header">
                            <Layers size={20} />
                            <h2>الإجراءات الإدارية والتحكم بالمنتج</h2>
                        </div>
                        <div className="adm-card-body">
                            <div className="adm-mgmt-grid">
                                {/* Section: Visibility */}
                                <div className="adm-mgmt-block">
                                    <h3 className="adm-block-title">الظهور والاكتشاف</h3>
                                    <div className="adm-actions-flex">
                                        <button
                                            className={`adm-btn-mgmt ${product.isActive ? 'danger' : 'primary'}`}
                                            onClick={handleToggleStatus}
                                            disabled={actionLoading}
                                        >
                                            {product.isActive ? <EyeOff size={18} /> : <Eye size={18} />}
                                            <span className="btn-text">
                                                {product.isActive ? "حجب / إخفاء المنتج" : "تفعيل المنتج للعلن"}
                                            </span>
                                        </button>

                                        <button
                                            className={`adm-btn-featured-toggle ${product.isFeatured ? 'featured-active' : ''}`}
                                            onClick={handleToggleFeatured}
                                            disabled={isTogglingFeatured || actionLoading}
                                        >
                                            {isTogglingFeatured ? (
                                                <RefreshCw size={18} className="spin" />
                                            ) : (
                                                <Star size={18} fill={product.isFeatured ? "currentColor" : "none"} />
                                            )}
                                            <span className="btn-text">
                                                {product.isFeatured ? "حذف من المميزة" : "إضافة للمميزة"}
                                            </span>
                                        </button>
                                    </div>
                                </div>

                                {/* Section: Featured Config (Only if featured) */}
                                {product.isFeatured && (
                                    <div className="adm-mgmt-block featured-block">
                                        <h3 className="adm-block-title">إعدادات القائمة المميزة</h3>
                                        <div className="adm-featured-config-bar">
                                            <div className="input-group">
                                                <Star size={14} className="icon" />
                                                <label>ترتيب المنتج:</label>
                                                <input
                                                    type="number"
                                                    className="adm-input-slim"
                                                    value={featuredOrderVal}
                                                    onChange={(e) => setFeaturedOrderVal(e.target.value)}
                                                    disabled={actionLoading}
                                                    min="1"
                                                />
                                            </div>
                                            {(featuredOrderVal !== String(product.featuredOrder)) && (
                                                <button
                                                    className="adm-btn-mgmt primary compact"
                                                    onClick={handleSaveFeaturedOrder}
                                                    disabled={actionLoading}
                                                >
                                                    <RefreshCw size={14} className={actionLoading ? 'spin' : ''} />
                                                    <span className="btn-text">تحديث الترتيب</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Section: Danger Zone */}
                                <div className="adm-mgmt-block danger-zone">
                                    <h3 className="adm-block-title">إجراءات حماية البيانات</h3>
                                    <div className="adm-actions-flex">
                                        <button
                                            className="adm-btn-mgmt danger"
                                            onClick={() => setShowDeleteModal(true)}
                                            disabled={actionLoading}
                                        >
                                            <Trash2 size={18} />
                                            <span className="btn-text">حذف المنتج نهائياً من النظام</span>
                                        </button>
                                    </div>
                                    <p className="adm-block-hint">سيتم مسح كافة البيانات المرتبطة بهذا المنتج ولا يمكن التراجع.</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* 🛡️ PREMIUM DELETION MODAL */}
                    {showDeleteModal && (
                        <div className="adm-modal-overlay">
                            <div className="adm-modal-content destructive animate-pop">
                                <div className="adm-modal-header">
                                    <div className="modal-icon-circle danger">
                                        <AlertCircle size={32} />
                                    </div>
                                    <h2>تأكيد حذف المنتج؟</h2>
                                    <p>أنت على وشك حذف المنتج <strong>"{product.name}"</strong> بشكل نهائي من قاعدة البيانات.</p>
                                </div>
                                <div className="adm-modal-footer">
                                    <button
                                        className="adm-btn-mgmt danger"
                                        onClick={handleDelete}
                                        disabled={actionLoading}
                                    >
                                        {actionLoading ? <RefreshCw className="spin" size={18} /> : <span className="btn-text">نعم، حذف المنتج</span>}
                                    </button>
                                    <button
                                        className="adm-btn-mgmt outline"
                                        onClick={() => setShowDeleteModal(false)}
                                        disabled={actionLoading}
                                    >
                                        <span className="btn-text">تراجع</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div >
    );
}

