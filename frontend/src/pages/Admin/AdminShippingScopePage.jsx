import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Truck, ArrowRight, Search, Check, RefreshCw, X, Store, Trash2 } from "lucide-react";
import "./AdminShippingScopePage.css";

import { getAdminSellers } from "@/services/adminService";
import { useApp } from "@/context/AppContext";

const SellerCard = React.memo(({ seller, isChecked, onToggle }) => {
    const id = String(seller._id);
    const storeName = seller.name || seller.storeName || "متجر بدون اسم";
    const ownerName = seller.owner?.name;

    return (
        <label className={`shipping-scope-card ${isChecked ? 'active' : ''}`}>
            <input
                type="checkbox"
                hidden
                checked={isChecked}
                onChange={() => onToggle(id)}
            />
            <div className="card-check">
                {isChecked ? <Check size={12} strokeWidth={4} /> : null}
            </div>
            <div className="card-text">
                <div className="card-title">{storeName}</div>
                {ownerName && <div className="card-owner">{ownerName}</div>}
            </div>
        </label>
    );
});

export default function AdminShippingScopePage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { showToast } = useApp() || {};

    // Retrieve state passed from AdminAddShippingPage
    const { form, selectedIds = [], isEditing, editingId } = location.state || {};

    const [sellers, setSellers] = useState([]);
    const [sellersLoading, setSellersLoading] = useState(false);
    const [sellerSearch, setSellerSearch] = useState("");
    const [tempSelectedIds, setTempSelectedIds] = useState(new Set(selectedIds.map(String)));
    const searchTimeoutRef = useRef(null);

    // Load initial sellers
    useEffect(() => {
        loadSellers();
    }, []);

    const loadSellers = async (query = "") => {
        try {
            setSellersLoading(true);
            const data = await getAdminSellers({
                status: "approved",
                search: query.trim() || undefined,
                limit: query ? 100 : 50
            });
            const list = data?.sellers || data || [];
            setSellers(Array.isArray(list) ? list : []);
        } catch (err) {
            const msg = err?.response?.data?.message || err?.message || "تعذر تحميل قائمة البائعين.";
            showToast?.(msg, "error");
        } finally {
            setSellersLoading(false);
        }
    };

    // Debounced Search
    useEffect(() => {
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = setTimeout(() => {
            loadSellers(sellerSearch);
        }, 500);
        return () => clearTimeout(searchTimeoutRef.current);
    }, [sellerSearch]);

    const toggleSeller = (id) => {
        const strId = String(id);
        setTempSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(strId)) next.delete(strId);
            else next.add(strId);
            return next;
        });
    };

    const filteredSellers = useMemo(() => {
        const q = sellerSearch.trim().toLowerCase();
        if (!q) return sellers;
        return sellers.filter((s) => {
            const storeName = (s.name || s.storeName || "").toLowerCase();
            const ownerName = (s.owner?.name || "").toLowerCase();
            return storeName.includes(q) || ownerName.includes(q);
        });
    }, [sellers, sellerSearch]);

    const selectAllSellers = () => {
        const allIds = filteredSellers.map(s => String(s._id));
        setTempSelectedIds(prev => {
            const next = new Set(prev);
            allIds.forEach(id => next.add(id));
            return next;
        });
    };

    const clearAllSellers = () => {
        setTempSelectedIds(new Set());
    };

    const handleConfirm = () => {
        navigate("/admin/shipping/add", {
            state: {
                company: isEditing ? { ...location.state.company, _id: editingId } : null,
                returnedFromScope: true,
                updatedSelectedIds: Array.from(tempSelectedIds),
                preservedForm: form
            },
            replace: true
        });
    };

    const handleBack = () => {
        // Return without updating selected IDs, but preserving the form
        navigate("/admin/shipping/add", {
            state: {
                company: isEditing ? { ...location.state.company, _id: editingId } : null,
                returnedFromScope: false,
                preservedForm: form
            },
            replace: true
        });
    };

    if (!form && !location.state?.returnedFromScope) {
        // Safe-guard if someone lands here without state
        return (
            <div className="admin-page-error">
                <div className="error-card">
                    <h2>خطأ في الوصول</h2>
                    <p>يرجى العودة لصفحة إضافة شركة الشحن والبدء من هناك.</p>
                    <button onClick={() => navigate("/admin?section=shipping")} className="back-link">
                        العودة لشركات الشحن
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-user-details-page admin-shipping-scope-page">
            <header className="adm-header">
                <div className="adm-header-inner">
                    <div className="adm-header-right">
                        <button
                            onClick={handleBack}
                            className="adm-btn-back"
                            title="العودة بدون حفظ"
                        >
                            <ArrowRight size={20} />
                        </button>
                        <div className="adm-header-titles">
                            <h1 className="adm-page-title">تحديد نطاق البائعين</h1>
                            <div className="adm-header-meta">
                                <span className="adm-role-badge">إعدادات النطاق</span>
                                <div className="adm-id-copy">
                                    <span className="adm-id-label">تم اختيار:</span>
                                    <span className="adm-id-value">{tempSelectedIds.size} بائع</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="adm-header-left">
                        <div className={`adm-status-chip ${tempSelectedIds.size > 0 ? "active" : "inactive"}`}>
                            <span className="adm-status-dot"></span>
                            <span className="adm-status-text">
                                {tempSelectedIds.size > 0 ? "نطاق محدد" : "لا يوجد اختيار"}
                            </span>
                        </div>
                    </div>
                </div>
            </header>

            <div className="adm-main-container">
                <main className="adm-details-grid">
                    <section className="adm-card span-12">
                        <div className="adm-card-header">
                            <Store size={20} />
                            <h2>قائمة البائعين المعتمدين</h2>
                        </div>
                        <div className="adm-card-body">
                            <div className="scope-toolbar">
                                <div className="adm-search-wrapper">
                                    <Search size={16} className="adm-search-icon" />
                                    <input
                                        type="text"
                                        className="adm-search-input"
                                        placeholder="ابحث عن متجر أو صاحب متجر..."
                                        value={sellerSearch}
                                        onChange={(e) => setSellerSearch(e.target.value)}
                                    />
                                    {sellerSearch && (
                                        <button
                                            type="button"
                                            className="clear-search-btn"
                                            onClick={() => setSellerSearch("")}
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>

                                <div className="scope-bulk-actions">
                                    <button type="button" onClick={selectAllSellers} className="adm-btn-mgmt primary">
                                        <Check size={14} />
                                        <span>تحديد الكل</span>
                                    </button>
                                    <button type="button" onClick={clearAllSellers} className="adm-btn-mgmt danger">
                                        <Trash2 size={14} />
                                        <span>إلغاء الكل</span>
                                    </button>
                                </div>
                            </div>

                            <div className="shipping-scope-grid-container">
                                {sellersLoading ? (
                                    <div className="shipping-scope-loading">
                                        <RefreshCw size={20} className="spin" />
                                        <span>جاري تحميل البائعين...</span>
                                    </div>
                                ) : filteredSellers.length === 0 ? (
                                    <div className="shipping-scope-empty">
                                        <Search size={24} />
                                        <p>لا توجد نتائج مطابقة لبحثك</p>
                                    </div>
                                ) : (
                                    <div className="shipping-scope-grid">
                                        {filteredSellers.map((s) => (
                                            <SellerCard
                                                key={String(s._id)}
                                                seller={s}
                                                isChecked={tempSelectedIds.has(String(s._id))}
                                                onToggle={toggleSeller}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="adm-card-footer scope-footer">
                            <button type="button" className="adm-btn secondary" onClick={handleBack}>
                                إلغاء التغييرات
                            </button>
                            <button type="button" className="adm-btn accent" onClick={handleConfirm}>
                                تأكيد الاختيار ({tempSelectedIds.size})
                            </button>
                        </div>
                    </section>
                </main>
            </div>
        </div>
    );
}
