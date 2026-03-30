import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
    Grid3X3,
    ArrowRight,
    Image as ImageIcon,
    RefreshCw,
    X
} from "lucide-react";
import {
    createAdminCategory,
    updateAdminCategory,
} from "@/services/adminService";
import { useApp } from "@/context/AppContext";
import "./adm-shared.css";
// نستورد CSS الأقسام للحصول على تنسيقات محرر الصور (adm-image-editor)
import "./sections/AdminCategoriesSection.css";

const API_BASE_URL = "";

function resolveCategoryImage(image) {
    if (!image) return "";
    if (image.startsWith("http")) return image;
    return `${API_BASE_URL}${image}`;
}

const emptyForm = {
    id: null,
    name: "",
    sortOrder: "",
    imageFile: null,
    rawImageUrl: "",
    previewUrl: "",
    cropZoom: 1,
    cropOffsetX: 0,
    cropOffsetY: 0,
    commissionRate: "",
    isProtected: false,
    slug: "",
};

export default function AdminAddCategoryPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { showToast } = useApp() || {};

    const [form, setForm] = useState(emptyForm);
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    // Initialize from location state if editing
    useEffect(() => {
        if (location.state && location.state.category) {
            const category = location.state.category;
            setIsEditing(true);
            setForm({
                id: category._id,
                name: category.name || "",
                sortOrder: typeof category.sortOrder === "number" ? category.sortOrder : category.sortOrder || "",
                imageFile: null,
                rawImageUrl: category.image ? resolveCategoryImage(category.image) : "",
                previewUrl: category.image ? resolveCategoryImage(category.image) : "",
                cropZoom: 1,
                cropOffsetX: 0,
                cropOffsetY: 0,
                commissionRate: typeof category.commissionRate === "number" ? String(Math.round(category.commissionRate * 100)) : "",
                isProtected: category.isProtected || category.slug === 'all',
                slug: category.slug || "",
            });
        }
    }, [location.state]);

    function handleInputChange(e) {
        const { name, value } = e.target;
        setForm((prev) => {
            if (name === "sortOrder") {
                return { ...prev, [name]: value.replace(/[^\d]/g, "") };
            }
            if (name === "commissionRate") {
                return { ...prev, [name]: value.replace(/[^\d.]/g, "") };
            }
            return { ...prev, [name]: value };
        });
    }

    function handleImageChange(e) {
        const file = e.target.files?.[0];
        if (!file) {
            if (form.rawImageUrl && form.rawImageUrl.startsWith("blob:")) {
                URL.revokeObjectURL(form.rawImageUrl);
            }
            setForm((prev) => ({
                ...prev,
                imageFile: null,
                rawImageUrl: "",
                previewUrl: "",
                cropZoom: 1,
                cropOffsetX: 0,
                cropOffsetY: 0,
            }));
            return;
        }
        const rawUrl = URL.createObjectURL(file);
        if (form.rawImageUrl && form.rawImageUrl.startsWith("blob:")) {
            URL.revokeObjectURL(form.rawImageUrl);
        }
        setForm((prev) => ({
            ...prev,
            imageFile: file,
            rawImageUrl: rawUrl,
            previewUrl: rawUrl,
            cropZoom: 1,
            cropOffsetX: 0,
            cropOffsetY: 0,
        }));
    }

    function handleCropChange(field, value) {
        setForm((prev) => ({ ...prev, [field]: value }));
    }

    function resetCrop() {
        setForm((prev) => ({ ...prev, cropZoom: 1, cropOffsetX: 0, cropOffsetY: 0 }));
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (!form.name.trim()) {
            setErrorMessage("اسم القسم مطلوب.");
            return;
        }
        let normalizedCommission = null;
        if (form.commissionRate !== "") {
            const num = Number(form.commissionRate);
            if (!Number.isNaN(num) && num >= 0) {
                normalizedCommission = num / 100;
            }
        }
        try {
            setSaving(true);
            setErrorMessage("");
            const payload = {
                name: form.name.trim(),
                sortOrder: form.sortOrder ? Number(form.sortOrder) : undefined, // Let backend handle sortOrder if not provided
                description: "",
                imageFile: form.imageFile || undefined,
                cropZoom: form.cropZoom,
                cropOffsetX: form.cropOffsetX,
                cropOffsetY: form.cropOffsetY,
            };
            if (normalizedCommission !== null) {
                payload.commissionRate = normalizedCommission;
            }

            if (isEditing && form.id) {
                await updateAdminCategory(form.id, payload);
                if (showToast) showToast("تم تحديث القسم بنجاح.", "success");
            } else {
                await createAdminCategory(payload);
                if (showToast) showToast("تم إنشاء القسم بنجاح.", "success");
            }
            navigate("/admin?section=categories");
        } catch (error) {
            console.error("خطأ في حفظ القسم:", error);
            const msg = error?.response?.data?.message || "حدث خطأ أثناء حفظ بيانات القسم.";
            setErrorMessage(msg);
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="adm-page-root">
            <header className="adm-header">
                <div className="adm-header-inner">
                    <div className="adm-header-right">
                        <button
                            onClick={() => navigate("/admin?section=categories")}
                            className="adm-btn-back"
                            title="العودة للأقسام"
                            type="button"
                        >
                            <ArrowRight size={20} />
                        </button>
                        <div className="adm-header-titles">
                            <div className="adm-role-badge">إدارة الأقسام</div>
                            <h1 className="adm-page-title">{isEditing ? "تعديل القسم" : "إضافة قسم جديد"}</h1>
                        </div>
                    </div>
                </div>
            </header>

            <div className="adm-main-container">
                <form className="adm-details-grid" onSubmit={handleSubmit}>
                    <div className="adm-card shadow-lg adm-cat-form-col-8">
                        <div className="adm-card-header">
                            <Grid3X3 size={20} />
                            <h2>بيانات القسم</h2>
                        </div>
                        <div className="adm-card-body">
                            {errorMessage && (
                                <div className="adm-error-box" style={{ marginBottom: '1rem' }}>
                                    <X size={16} />
                                    <span>{errorMessage}</span>
                                </div>
                            )}

                            <div className="adm-info-grid" style={{ gridTemplateColumns: "1fr" }}>
                                <div className="adm-info-point">
                                    <label className="adm-form-label">اسم القسم *</label>
                                    <input
                                        className="adm-form-input"
                                        type="text"
                                        name="name"
                                        placeholder="مثال: الإلكترونيات، الأجهزة المنزلية..."
                                        value={form.name}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>

                                {!(form.isProtected || form.slug === 'all') && (
                                    <div className="adm-info-point">
                                        <label className="adm-form-label">ترتيب العرض</label>
                                        <input
                                            className="adm-form-input"
                                            type="text"
                                            name="sortOrder"
                                            placeholder="مثال: 1"
                                            value={form.sortOrder}
                                            onChange={handleInputChange}
                                        />
                                        <small className="adm-form-hint">يتحكم في موضع القسم في القائمة.</small>
                                    </div>
                                )}

                                {!(form.isProtected || form.slug === 'all') && (
                                    <div className="adm-info-point">
                                        <label className="adm-form-label">نسبة عمولة المنصة لهذا القسم (%)</label>
                                        <input
                                            className="adm-form-input"
                                            type="number"
                                            name="commissionRate"
                                            placeholder="مثال: 10 تعني 10٪"
                                            min="0"
                                            max="100"
                                            step="0.1"
                                            value={form.commissionRate}
                                            onChange={handleInputChange}
                                        />
                                        <small className="adm-form-hint">اتركها 0 إن لم تكن هناك عمولة خاصة لهذا القسم.</small>
                                    </div>
                                )}

                                <div className="adm-info-point">
                                    <label className="adm-form-label">أيقونة / صورة القسم</label>
                                    <label className="adm-btn outline" style={{ width: '100%', cursor: 'pointer', justifyContent: 'center' }}>
                                        <ImageIcon size={16} />
                                        <span>{form.imageFile ? form.imageFile.name : form.rawImageUrl ? "تغيير الصورة" : "اختر صورة"}</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageChange}
                                            hidden
                                        />
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="adm-card shadow-lg adm-cat-form-col-4">
                        <div className="adm-card-header">
                            <ImageIcon size={20} />
                            <h2>معاينة واقتصاص الصورة</h2>
                        </div>
                        <div className="adm-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%', minHeight: '400px' }}>
                            <div className="adm-image-editor" style={{ width: '100%', flex: 1 }}>
                                <div className="adm-editor-preview">
                                    {form.previewUrl ? (
                                        <>
                                            <img
                                                src={form.previewUrl}
                                                alt="معاينة"
                                                style={{
                                                    transform: `translate(${form.cropOffsetX}%, ${form.cropOffsetY}%) scale(${form.cropZoom})`,
                                                }}
                                            />
                                            <div className="adm-editor-grid" />
                                        </>
                                    ) : (
                                        <div className="adm-editor-empty">
                                            <ImageIcon size={32} />
                                            <span>لم يتم اختيار صورة بعد</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {form.previewUrl && (
                                <div className="adm-editor-controls" style={{ width: '100%' }}>
                                    <div className="adm-control-group">
                                        <label>التكبير</label>
                                        <input
                                            type="range"
                                            min={1}
                                            max={3}
                                            step={0.01}
                                            value={form.cropZoom}
                                            onChange={(e) => handleCropChange("cropZoom", Number(e.target.value))}
                                        />
                                    </div>
                                    <div className="adm-control-group">
                                        <label>أفقي</label>
                                        <input
                                            type="range"
                                            min={-50}
                                            max={50}
                                            step={1}
                                            value={form.cropOffsetX}
                                            onChange={(e) => handleCropChange("cropOffsetX", Number(e.target.value))}
                                        />
                                    </div>
                                    <div className="adm-control-group">
                                        <label>عمودي</label>
                                        <input
                                            type="range"
                                            min={-50}
                                            max={50}
                                            step={1}
                                            value={form.cropOffsetY}
                                            onChange={(e) => handleCropChange("cropOffsetY", Number(e.target.value))}
                                        />
                                    </div>
                                    <button type="button" className="adm-btn ghost sm" style={{ marginTop: 'auto', width: '100%', justifyContent: 'center' }} onClick={resetCrop}>
                                        <RefreshCw size={14} />
                                        <span>إعادة الضبط</span>
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="adm-card-footer" style={{ borderTop: "1px solid var(--adm-border)", paddingTop: "1rem", flexWrap: "wrap", gap: "10px" }}>
                            <button
                                type="button"
                                className="adm-btn-mgmt outline"
                                onClick={() => navigate("/admin?section=categories")}
                                disabled={saving}
                                style={{ flex: 1, justifyContent: "center" }}
                            >
                                إلغاء
                            </button>
                            <button
                                type="submit"
                                className="adm-btn-mgmt primary"
                                disabled={saving}
                                style={{ flex: 1, justifyContent: "center" }}
                            >
                                {saving ? "جاري الحفظ..." : isEditing ? "حفظ التعديلات" : "إضافة القسم"}
                            </button>
                        </div>
                    </div>

                </form>
            </div>
        </div>
    );
}
