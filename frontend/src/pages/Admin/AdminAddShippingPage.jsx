import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Truck, ArrowRight, Globe2, Plus, Edit3, ChevronDown, Check, Store } from "lucide-react";
import "./AdminAddShippingPage.css";

import {
    createShippingCompany,
    updateShippingCompany,
} from "@/services/adminService";
import { useApp } from "@/context/AppContext";

const INITIAL_FORM = {
    // مرحلة 1 - بيانات الشركة
    name: "",
    headquarters: "",
    scopeType: "all", // all | specific
    isActive: true,

    // مرحلة 2 - مسؤول الشركة
    contactName: "",
    contactRelation: "",
    documentType: "",
    documentNumber: "",
    documentFile: null,

    email: "",
    phone: "",

    // مرحلة 3 - الحساب والتسعير
    password: "",
    confirmPassword: "",
    baseFee: "",
    perKm: "",
    coverageCities: "",
};

// ────────────────────────────────────────────────
// Sub-components (Moved outside to prevent re-creation on every render)
// ────────────────────────────────────────────────

const StepHeader = ({ modalStep }) => {
    const steps = [
        { id: 1, label: "بيانات الشركة" },
        { id: 2, label: "مسؤول الشركة" },
        { id: 3, label: "الحساب والتسعير" },
    ];
    return (
        <div className="adm-stepper shipping-stepper">
            {steps.map((step) => (
                <div
                    key={step.id}
                    className={`adm-step ${modalStep === step.id ? 'active' : ''} ${modalStep > step.id ? 'done' : ''}`}
                >
                    <div className="adm-step-num">{step.id}</div>
                    <div className="adm-step-label">{step.label}</div>
                </div>
            ))}
        </div>
    );
};

// Removed SellerCard as it's now internal to the separate scope page

// Removed ScopeDrawer component as it's now a separate page

const ScopeSelector = ({
    form,
    setForm,
    selectedSellerIds,
    onOpenDrawer,
    scopeSummary
}) => {
    const isSpecific = form.scopeType === "specific";

    return (
        <div className="shipping-scope-module">
            <div className="adm-form-label-row">
                <label className="adm-form-label">نطاق عمل شركة الشحن</label>
            </div>

            <div className="shipping-scope-segmented">
                <button
                    type="button"
                    className={`segmented-item ${!isSpecific ? 'active' : ''}`}
                    onClick={() => setForm(f => ({ ...f, scopeType: 'all' }))}
                >
                    <Globe2 size={14} />
                    <span>جميع البائعين</span>
                </button>
                <button
                    type="button"
                    className={`segmented-item ${isSpecific ? 'active' : ''}`}
                    onClick={() => setForm(f => ({ ...f, scopeType: 'specific' }))}
                >
                    <Store size={14} />
                    <span>بائعين محددين</span>
                </button>
            </div>

            {!isSpecific ? (
                <div className="shipping-scope-notice success-lite">
                    <Check size={18} />
                    <div className="notice-txt">
                        هذه الشركة ستكون متاحة <strong>لجميع البائعين</strong> في المنصة دون استثناء.
                    </div>
                </div>
            ) : (
                <div className="shipping-scope-summary-box">
                    <div className="summary-content">
                        <span className="summary-title">نطاق البائعين المختارين</span>
                        <span className="summary-subtitle">{scopeSummary}</span>
                    </div>
                    <button type="button" className="adm-btn-mgmt primary" onClick={onOpenDrawer}>
                        <Store size={14} />
                        <span>تعديل النطاق</span>
                    </button>
                </div>
            )}
        </div>
    );
};

const StepOne = ({ form, setForm, scopeProps }) => (
    <div className="adm-form-grid">
        <div className="adm-form-group">
            <label className="adm-form-label">اسم شركة الشحن</label>
            <input
                type="text"
                className="adm-form-input"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="مثال: شركة الطلب السريع"
            />
        </div>
        <div className="adm-form-group">
            <label className="adm-form-label">مقر الشركة</label>
            <input
                type="text"
                className="adm-form-input"
                value={form.headquarters}
                onChange={(e) => setForm((f) => ({ ...f, headquarters: e.target.value }))}
                placeholder="مثال: الرياض – حي النرجس"
            />
        </div>

        <div className="adm-form-group full">
            <ScopeSelector {...scopeProps} form={form} setForm={setForm} />
        </div>

        <div className="adm-form-group">
            <label className="adm-form-label">الحالة</label>
            <select
                className="adm-form-select"
                value={form.isActive ? "active" : "inactive"}
                onChange={(e) =>
                    setForm((f) => ({
                        ...f,
                        isActive: e.target.value === "active",
                    }))
                }
            >
                <option value="active">نشط</option>
                <option value="inactive">غير نشط</option>
            </select>
        </div>
    </div>
);

const StepTwo = ({ form, setForm }) => (
    <div className="adm-form-grid">
        <div className="adm-form-group">
            <label className="adm-form-label">اسم مسؤول الشركة</label>
            <input
                type="text"
                className="adm-form-input"
                value={form.contactName}
                onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))}
                placeholder="مثال: أحمد علي"
            />
        </div>
        <div className="adm-form-group">
            <label className="adm-form-label">صلته بالشركة</label>
            <input
                type="text"
                className="adm-form-input"
                value={form.contactRelation}
                onChange={(e) => setForm((f) => ({ ...f, contactRelation: e.target.value }))}
                placeholder="مثال: صاحب الشركة"
            />
        </div>

        <div className="adm-form-group">
            <label className="adm-form-label">نوع الوثيقة</label>
            <input
                type="text"
                className="adm-form-input"
                value={form.documentType}
                onChange={(e) => setForm((f) => ({ ...f, documentType: e.target.value }))}
                placeholder="مثال: هوية وطنية"
            />
        </div>
        <div className="adm-form-group">
            <label className="adm-form-label">رقم الوثيقة</label>
            <input
                type="text"
                className="adm-form-input"
                value={form.documentNumber}
                onChange={(e) => setForm((f) => ({ ...f, documentNumber: e.target.value }))}
                placeholder="أدخل رقم الوثيقة"
            />
        </div>

        <div className="adm-form-group">
            <label className="adm-form-label">البريد الإلكتروني</label>
            <input
                type="email"
                className="adm-form-input"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="example@shipping.com"
            />
        </div>
        <div className="adm-form-group">
            <label className="adm-form-label">رقم الجوال</label>
            <input
                type="tel"
                className="adm-form-input"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="05XXXXXXXX"
            />
        </div>
    </div>
);

const StepThree = ({ form, setForm, isEditing }) => (
    <div className="adm-form-grid">
        <div className="adm-form-group">
            <label className="adm-form-label">كلمة السر</label>
            <input
                type="password"
                className="adm-form-input"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder={isEditing ? "اتركها فارغة للإبقاء" : "كلمة المرور"}
            />
        </div>
        <div className="adm-form-group">
            <label className="adm-form-label">تأكيد كلمة السر</label>
            <input
                type="password"
                className="adm-form-input"
                value={form.confirmPassword}
                onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                placeholder="أعد إدخال كلمة المرور"
            />
        </div>

        <div className="adm-form-group">
            <label className="adm-form-label">سعر التوصيل الأساسي (ر.ي)</label>
            <input
                type="number"
                className="adm-form-input"
                min="0"
                value={form.baseFee}
                onChange={(e) => setForm((f) => ({ ...f, baseFee: e.target.value }))}
                placeholder="مثال: 20"
            />
        </div>
        <div className="adm-form-group">
            <label className="adm-form-label">سعر لكل كيلومتر (اختياري)</label>
            <input
                type="number"
                className="adm-form-input"
                min="0"
                value={form.perKm}
                onChange={(e) => setForm((f) => ({ ...f, perKm: e.target.value }))}
                placeholder="مثال: 1"
            />
        </div>

        <div className="adm-form-group full">
            <label className="adm-form-label">المدن المغطاة</label>
            <input
                type="text"
                className="adm-form-input"
                value={form.coverageCities}
                onChange={(e) => setForm((f) => ({ ...f, coverageCities: e.target.value }))}
                placeholder="مثال: الرياض، جدة، الدمام"
            />
        </div>
    </div>
);

export default function AdminAddShippingPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { showToast } = useApp() || {};

    // Retrieve company data if passed for editing
    const editCompany = location.state?.company;
    const isEditing = !!editCompany;
    const editingId = editCompany?._id;

    const [modalStep, setModalStep] = useState(1);
    const [form, setForm] = useState(INITIAL_FORM);
    const [saving, setSaving] = useState(false);

    const [selectedSellerIds, setSelectedSellerIds] = useState(new Set());

    // Removed drawer-related status
    const searchTimeoutRef = useRef(null);

    // ────────────────────────────────────────────────
    // Pre-fill form if editing
    // ────────────────────────────────────────────────
    useEffect(() => {
        if (!isEditing) return;

        const scopeType = editCompany.scope === "seller-specific" ? "specific" : "all";

        let coverageCities = "";
        if (Array.isArray(editCompany.coverageAreas) && editCompany.coverageAreas.length) {
            coverageCities = editCompany.coverageAreas
                .map((c) => c.city)
                .filter(Boolean)
                .join("، ");
        }

        const pricing = editCompany.pricing || {};
        const baseFee =
            typeof pricing.baseFee === "number" && pricing.baseFee > 0
                ? String(pricing.baseFee)
                : "";
        const perKm =
            typeof pricing.perKm === "number" && pricing.perKm > 0
                ? String(pricing.perKm)
                : "";

        let sellerIdsSet = new Set();
        if (scopeType === "specific") {
            const fromStoreIds = Array.isArray(editCompany.storeIds) ? editCompany.storeIds : [];
            const fromStores =
                Array.isArray(editCompany.stores) && editCompany.stores.length
                    ? editCompany.stores.map((s) => s._id)
                    : [];
            const allIds = [...fromStoreIds, ...fromStores]
                .filter(Boolean)
                .map((id) => String(id));
            sellerIdsSet = new Set(allIds);
        }

        setForm({
            name: editCompany.name || "",
            headquarters: editCompany.headquarters || "",
            scopeType,
            isActive: editCompany.isActive !== false,

            contactName: editCompany.contactName || "",
            contactRelation: editCompany.contactRelation || "",
            documentType: editCompany.documentType || "",
            documentNumber: editCompany.documentNumber || "",
            documentFile: null,

            email: editCompany.email || "",
            phone: editCompany.phone || "",

            password: "",
            confirmPassword: "",
            baseFee,
            perKm,
            coverageCities,
        });

        setSelectedSellerIds(sellerIdsSet);
    }, [isEditing, editCompany]);

    // ────────────────────────────────────────────────
    // استعادة البيانات عند العودة من صفحة تحديد النطاق
    // ────────────────────────────────────────────────
    useEffect(() => {
        if (location.state?.returnedFromScope) {
            const { updatedSelectedIds, preservedForm } = location.state;
            setForm(preservedForm);
            setSelectedSellerIds(new Set(updatedSelectedIds.map(String)));
            setModalStep(1); // العودة للخطوة الأولى حيث يوجد النطاق

            if (location.state.returnedFromScope === true) {
                showToast?.(`تم تحديث قائمة البائعين (${updatedSelectedIds.length} بائع)`, "success");
            }
        }
    }, [location.state]);


    // ────────────────────────────────────────────────
    // تحميل البائعين بنطاق العمل (مع دعم البحث للسلاسل الضخمة)
    // ────────────────────────────────────────────────
    // Removed local loadSellers logic as it moved to separate page

    // ────────────────────────────────────────────────
    // التحكم في الدرج الجانبي (Drawer Control)
    // ────────────────────────────────────────────────
    const handleManageScope = () => {
        navigate("/admin/shipping/select-scope", {
            state: {
                form,
                selectedIds: Array.from(selectedSellerIds),
                isEditing,
                editingId,
                company: editCompany
            }
        });
    };

    // ────────────────────────────────────────────────
    // فلترة البائعين (Client-side Backup)
    // ────────────────────────────────────────────────
    // Memoized summary for the main page
    const scopeSummary = useMemo(() => {
        if (form.scopeType === "all") return "جميع البائعين في المنصة";
        if (selectedSellerIds.size === 0) return "لم يتم اختيار بائعين بعد";

        const count = selectedSellerIds.size;
        return `تم اختيار عدد (${count}) بائع محدد`;
    }, [form.scopeType, selectedSellerIds]);

    // ────────────────────────────────────────────────
    // حفظ (إضافة / تعديل) شركة الشحن
    // ────────────────────────────────────────────────
    async function handleSubmit(e) {
        e?.preventDefault();

        try {
            if (!form.name.trim()) {
                showToast?.("اسم شركة الشحن مطلوب.", "error");
                setModalStep(1); return;
            }
            if (!form.email.trim()) {
                showToast?.("البريد الإلكتروني للشركة مطلوب.", "error");
                setModalStep(2); return;
            }
            if (!form.phone.trim()) {
                showToast?.("رقم الجوال للشركة مطلوب.", "error");
                setModalStep(2); return;
            }

            if (!isEditing) {
                if (!form.password.trim()) {
                    showToast?.("كلمة المرور مطلوبة لإنشاء حساب الشاحن.", "error");
                    setModalStep(3); return;
                }
                if (form.password !== form.confirmPassword) {
                    showToast?.("كلمتا المرور غير متطابقتين.", "error");
                    setModalStep(3); return;
                }
            }

            let scope = "global";
            let storeIds = [];
            if (form.scopeType === "specific") {
                if (selectedSellerIds.size === 0) {
                    showToast?.("اختر بائعًا واحدًا على الأقل أو فعّل خيار جميع البائعين.", "error");
                    setModalStep(1); return;
                }
                scope = "seller-specific";
                storeIds = Array.from(selectedSellerIds);
            }

            setSaving(true);

            const coverageAreas = form.coverageCities
                .split(/[,،]/)
                .map((c) => c.trim())
                .filter(Boolean)
                .map((city) => ({ city, deliveryTime: "1-3 أيام" }));

            const payload = {
                name: form.name.trim(),
                email: form.email.trim().toLowerCase(),
                phone: form.phone.trim(),

                headquarters: form.headquarters.trim() || undefined,
                contactName: form.contactName.trim() || undefined,
                contactRelation: form.contactRelation.trim() || undefined,
                documentType: form.documentType.trim() || undefined,
                documentNumber: form.documentNumber.trim() || undefined,

                isActive: !!form.isActive,
                scope,
                storeIds,

                logo: "",
                coverageAreas,
                pricing: {
                    baseFee: form.baseFee ? Number(form.baseFee) : 0,
                    perKm: form.perKm ? Number(form.perKm) : 0,
                    extraWeightFee: 0,
                },
            };

            let res;
            if (!isEditing) {
                payload.password = form.password.trim();
                res = await createShippingCompany(payload);
            } else {
                res = await updateShippingCompany(editingId, payload);
            }

            if (res?.company) {
                showToast?.(isEditing ? "تم تحديث شركة الشحن بنجاح." : "تم إضافة شركة الشحن بنجاح.", "success");
            } else {
                showToast?.(isEditing ? "تم حفظ بيانات شركة الشحن." : "تم حفظ شركة الشحن.", "success");
            }

            navigate("/admin?section=shipping");
        } catch (err) {
            const msg = err?.response?.data?.message || err?.message || "حدث خطأ أثناء حفظ شركة الشحن.";
            showToast?.(msg, "error");
        } finally {
            setSaving(false);
        }
    }

    const renderStepContent = () => {
        switch (modalStep) {
            case 1: return (
                <StepOne
                    form={form}
                    setForm={setForm}
                    scopeProps={{
                        selectedSellerIds,
                        onOpenDrawer: handleManageScope,
                        scopeSummary
                    }}
                />
            );
            case 2: return <StepTwo form={form} setForm={setForm} />;
            case 3: return <StepThree form={form} setForm={setForm} isEditing={isEditing} />;
            default: return null;
        }
    };

    return (
        <div className="admin-user-details-page">
            <header className="adm-header">
                <div className="adm-header-inner">
                    <div className="adm-header-right">
                        <button
                            onClick={() => navigate("/admin?section=shipping")}
                            className="adm-btn-back"
                            title="العودة لشركات الشحن"
                        >
                            <ArrowRight size={20} />
                        </button>
                        <div className="adm-header-titles">
                            <h1 className="adm-page-title">{isEditing ? "تعديل بيانات شركة شحن" : "إضافة شركة شحن جديدة"}</h1>
                            <div className="adm-header-meta">
                                <span className="adm-role-badge">إدارة الشحن</span>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <div className="adm-main-container">
                <main className="adm-details-grid">
                    <section className="adm-card span-12">
                        <div className="adm-card-header shipping-add-card-header">
                            <div className="adm-card-title-row">
                                {isEditing ? <Edit3 size={20} /> : <Plus size={20} />}
                                <h2>
                                    {isEditing ? "تعديل بيانات الشركة" : "إنشاء سجل شركة جديد"}
                                </h2>
                            </div>
                            <StepHeader modalStep={modalStep} />
                        </div>

                        <div className="adm-card-body shipping-add-card-body">
                            {renderStepContent()}
                        </div>

                        <div className="adm-card-footer shipping-add-actions">
                            <button
                                type="button"
                                className="adm-btn secondary"
                                onClick={() => navigate("/admin?section=shipping")}
                                disabled={saving}
                            >
                                إلغاء
                            </button>

                            <div className="adm-actions-right">
                                {modalStep > 1 && (
                                    <button
                                        type="button"
                                        className="adm-btn secondary"
                                        onClick={() => setModalStep((s) => Math.max(1, s - 1))}
                                        disabled={saving}
                                    >
                                        الخطوة السابقة
                                    </button>
                                )}

                                {modalStep < 3 && (
                                    <button
                                        type="button"
                                        className="adm-btn primary"
                                        onClick={() => setModalStep((s) => Math.min(3, s + 1))}
                                        disabled={saving}
                                    >
                                        <span>الخطوة التالية</span>
                                        <ArrowRight size={16} style={{ transform: 'rotate(180deg)' }} />
                                    </button>
                                )}

                                {modalStep === 3 && (
                                    <button
                                        type="button"
                                        className="adm-btn accent"
                                        onClick={handleSubmit}
                                        disabled={saving}
                                    >
                                        {saving ? "جارٍ الحفظ..." : isEditing ? "حفظ التعديلات" : "حفظ شركة الشحن"}
                                    </button>
                                )}
                            </div>
                        </div>
                    </section>
                </main>
            </div>


        </div>
    );
}
