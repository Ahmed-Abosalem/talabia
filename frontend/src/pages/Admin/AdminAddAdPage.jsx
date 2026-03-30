import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Megaphone, ArrowRight, Image as ImageIcon, UploadCloud, Link as LinkIcon, Calendar, Clock, Edit3, X, Crop as CropIcon, Check } from "lucide-react";
import Cropper from "react-easy-crop";
import getCroppedImg from "@/lib/canvasUtils";
import "./AdminAddAdPage.css";

import {
    createAdminAd,
    updateAdminAd
} from "@/services/adminService";
import { useApp } from "@/context/AppContext";

// نفس أسلوب الأقسام: عنوان يعالج استرجاع الصورة
const API_BASE_URL = "";
function resolveAdImage(image) {
    if (!image) return "";
    if (image.startsWith("http")) return image;
    return `${API_BASE_URL}${image}`;
}

const emptyForm = {
    id: null,
    title: "",
    subtitle: "",
    description: "",
    linkUrl: "",
    startAt: "",
    endAt: "",
    sortOrder: 1,
    isActive: true,
    imageFile: null,
    previewUrl: "",
};

export default function AdminAddAdPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { showToast } = useApp() || {};

    const editAd = location.state?.ad;
    const isEditing = !!editAd;

    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const fileInputRef = useRef(null);

    // Cropping State
    const [isCropping, setIsCropping] = useState(false);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [originalImageUrl, setOriginalImageUrl] = useState("");

    // ────────────────────────────────────────────────
    // Pre-fill form if editing
    // ────────────────────────────────────────────────
    useEffect(() => {
        if (!isEditing) {
            // Default sort order if creating new, ideally fetched but we default to 1
            setForm(prev => ({ ...prev, sortOrder: 1 }));
            return;
        }

        setForm({
            id: editAd._id,
            title: editAd.title || "",
            subtitle: editAd.subtitle || "",
            description: editAd.description || "",
            linkUrl: editAd.linkUrl || "",
            startAt: editAd.startAt ? editAd.startAt.slice(0, 16) : "",
            endAt: editAd.endAt ? editAd.endAt.slice(0, 16) : "",
            sortOrder: typeof editAd.sortOrder === "number" ? editAd.sortOrder : editAd.sortOrder || "",
            isActive: editAd.isActive !== false,
            imageFile: null,
            rawImageUrl: editAd.image ? resolveAdImage(editAd.image) : "",
            previewUrl: editAd.image ? resolveAdImage(editAd.image) : "",
            cropZoom: 1,
            cropOffsetX: 0,
            cropOffsetY: 0,
        });

        if (editAd.image) {
            setOriginalImageUrl(resolveAdImage(editAd.image));
        }
    }, [isEditing, editAd]);

    function handleInputChange(e) {
        const { name, value, type, checked } = e.target;
        setForm((prev) => {
            if (name === "sortOrder") {
                return { ...prev, [name]: value.replace(/[^\d]/g, "") };
            }
            if (type === "checkbox") {
                return { ...prev, [name]: checked };
            }
            return { ...prev, [name]: value };
        });
    }

    function handleImageChange(e) {
        const file = e.target.files?.[0];
        if (!file) {
            // Only clear tracking if they actively cleared it,
            // but for file inputs canceling usually sets to undefined
            return;
        }

        const rawUrl = URL.createObjectURL(file);

        // Open Cropper
        setOriginalImageUrl(rawUrl);
        setIsCropping(true);
        setCrop({ x: 0, y: 0 });
        setZoom(1);

        // Clear input to allow re-uploading the same file
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }

    function clearImage() {
        if (form.previewUrl && form.previewUrl.startsWith("blob:")) {
            URL.revokeObjectURL(form.previewUrl);
        }
        if (originalImageUrl && originalImageUrl.startsWith("blob:")) {
            URL.revokeObjectURL(originalImageUrl);
        }
        setForm(prev => ({
            ...prev,
            imageFile: null,
            rawImageUrl: "",
            previewUrl: ""
        }));
        setOriginalImageUrl("");
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }

    const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleSaveCrop = async () => {
        if (!originalImageUrl || !croppedAreaPixels) return;
        try {
            const croppedBlob = await getCroppedImg(originalImageUrl, croppedAreaPixels);
            if (!croppedBlob) {
                showToast?.("فشل في اقتصاص الصورة.", "error");
                return;
            }

            const croppedUrl = URL.createObjectURL(croppedBlob);

            setForm((prev) => {
                if (prev.previewUrl && prev.previewUrl.startsWith("blob:")) {
                    URL.revokeObjectURL(prev.previewUrl);
                }
                return {
                    ...prev,
                    imageFile: croppedBlob,
                    previewUrl: croppedUrl
                };
            });

            setIsCropping(false);
        } catch (e) {
            console.error("Failed to crop image", e);
            showToast?.("يوجد خطأ أثناء قص الصورة.", "error");
        }
    };

    // ────────────────────────────────────────────────
    // حفظ (إنشاء أو تعديل إعلان)
    // ────────────────────────────────────────────────
    async function handleSubmit(e) {
        e.preventDefault();

        if (!form.title.trim()) {
            showToast?.("عنوان الإعلان مطلوب.", "error");
            return;
        }

        if (!form.linkUrl.trim()) {
            showToast?.("رابط الإعلان مطلوب.", "error");
            return;
        }

        if (!isEditing && !form.imageFile) {
            showToast?.("صورة الإعلان مطلوبة عند الإنشاء.", "error");
            return;
        }

        // If they are cropping and forgot to hit save, just warn them
        if (isCropping) {
            showToast?.("الرجاء اعتماد القص قبل حفظ الإعلان.", "warning");
            return;
        }

        try {
            setSaving(true);

            const formData = new FormData();
            formData.append("title", form.title.trim());
            if (form.subtitle) formData.append("subtitle", form.subtitle.trim());
            if (form.description) formData.append("description", form.description.trim());
            if (form.sortOrder) formData.append("sortOrder", String(form.sortOrder));

            formData.append("isActive", form.isActive ? "true" : "false");

            if (form.linkUrl) formData.append("linkUrl", form.linkUrl.trim());

            formData.append("type", "banner");
            formData.append("placement", "home_main_banner");

            if (form.imageFile) {
                // Backend requires a valid image extension (JPG/PNG/WEBP). 
                // Since the frontend cropper outputs a JPEG blob, we append with .jpg extension.
                formData.append("image", form.imageFile, "banner.jpg");
            }

            if (form.startAt) formData.append("startAt", new Date(form.startAt).toISOString());
            if (form.endAt) formData.append("endAt", new Date(form.endAt).toISOString());

            if (isEditing && form.id) {
                await updateAdminAd(form.id, formData);
                showToast?.("تم تحديث الإعلان بنجاح.", "success");
            } else {
                await createAdminAd(formData);
                showToast?.("تم إنشاء الإعلان بنجاح.", "success");
            }

            navigate("/admin?section=ads");

        } catch (error) {
            console.error("خطأ في حفظ الإعلان:", error);
            const msg = error?.response?.data?.message || "حدث خطأ أثناء حفظ بيانات الإعلان.";
            showToast?.(msg, "error");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="admin-user-details-page">
            {/* 🏔️ OFFICIAL COMPACT HEADER (10/10 Standard) */}
            <header className="adm-header">
                <div className="adm-header-inner">
                    <div className="adm-header-right">
                        <button
                            onClick={() => navigate("/admin?section=ads")}
                            className="adm-btn-back"
                            title="العودة للإعلانات"
                        >
                            <ArrowRight size={20} />
                        </button>
                        <div className="adm-header-titles">
                            <h1 className="adm-page-title">{isEditing ? "تعديل بنر إعلاني" : "إضافة بنر إعلاني جديد"}</h1>
                            <div className="adm-header-meta">
                                <span className="adm-role-badge">إدارة الإعلانات - البانر الرئيسي</span>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* 📐 الحاوية الرئيسية المطلقة */}
            <div className="adm-main-container">
                <main className="adm-details-grid">

                    {/* 📸 Card 1: Image Upload (Span 12) */}
                    <section className="adm-card span-12 shadow-lg">
                        <div className="adm-card-header">
                            <ImageIcon size={20} />
                            <h2>بنر الإعلان المرئي</h2>
                        </div>
                        <div className="adm-card-body">
                            <div className="ad-image-uploader-wrapper">
                                {isCropping ? (
                                    <div className="banner-cropper-container">
                                        <div className="banner-cropper-area">
                                            <Cropper
                                                image={originalImageUrl}
                                                crop={crop}
                                                zoom={zoom}
                                                aspect={3 / 1}
                                                onCropChange={setCrop}
                                                onCropComplete={onCropComplete}
                                                onZoomChange={setZoom}
                                                showGrid={true}
                                                objectFit="vertical-cover"
                                            />
                                        </div>
                                        <div className="banner-cropper-actions">
                                            <div className="zoom-controls">
                                                <span className="adm-text-soft" style={{ marginLeft: '10px', fontSize: '0.9rem' }}>تكبير التقريب:</span>
                                                <input
                                                    type="range"
                                                    value={zoom}
                                                    min={1}
                                                    max={3}
                                                    step={0.1}
                                                    onChange={(e) => setZoom(e.target.value)}
                                                    className="zoom-slider"
                                                />
                                            </div>
                                            <div className="action-buttons">
                                                <button type="button" className="btn-cancel-crop" onClick={() => setIsCropping(false)}>
                                                    إلغاء
                                                </button>
                                                <button type="button" className="btn-save-crop" onClick={handleSaveCrop}>
                                                    <Check size={16} /> اعتماد القص
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ) : form.previewUrl ? (
                                    <div className="ad-image-preview-container">
                                        <img src={form.previewUrl} alt="Ad Preview" className="ad-image-preview" />
                                        <div className="ad-image-overlay-actions">
                                            <button
                                                type="button"
                                                className="adm-btn-mgmt outline"
                                                onClick={() => {
                                                    if (!originalImageUrl && form.previewUrl) setOriginalImageUrl(form.previewUrl);
                                                    setIsCropping(true);
                                                }}
                                            >
                                                <CropIcon size={16} /> تعديل القص
                                            </button>
                                            <button type="button" className="adm-btn-mgmt outline" onClick={() => fileInputRef.current?.click()}>
                                                <Edit3 size={16} /> تغيير الصورة
                                            </button>
                                            <button type="button" className="adm-btn-mgmt danger" onClick={clearImage}>
                                                <X size={16} /> إزالة
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="ad-empty-upload-zone" onClick={() => fileInputRef.current?.click()}>
                                        <UploadCloud size={48} className="adm-text-muted" />
                                        <h3>انقر لرفع صورة البنر الإعلاني</h3>
                                        <p className="adm-text-soft">صيغ مدعومة: JPG, PNG, WEBP. الأبعاد الموصى بها: 1200x400 بكسل.</p>
                                    </div>
                                )}
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden-file-input"
                                    ref={fileInputRef}
                                    onChange={handleImageChange}
                                />
                            </div>
                        </div>
                    </section>

                    {/* 📝 Card 2: Ad Details (Span 8) */}
                    <section className="adm-card span-8 shadow-lg">
                        <div className="adm-card-header">
                            <Megaphone size={20} />
                            <h2>تفاصيل ونص الإعلان</h2>
                        </div>
                        <div className="adm-card-body">
                            <div className="adm-form-grid">
                                <div className="adm-form-group full">
                                    <label className="adm-form-label">عنوان الإعلان الأساسي <span className="required">*</span></label>
                                    <input
                                        type="text"
                                        name="title"
                                        className="adm-form-input"
                                        placeholder="مثال: خصومات كبرى على الإلكترونيات..."
                                        value={form.title}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                                <div className="adm-form-group full">
                                    <label className="adm-form-label">العنوان المنطوق (فرعي)</label>
                                    <input
                                        type="text"
                                        name="subtitle"
                                        className="adm-form-input"
                                        placeholder="نص ترويجي داعم يظهر بخط أصغر..."
                                        value={form.subtitle}
                                        onChange={handleInputChange}
                                    />
                                </div>
                                <div className="adm-form-group full">
                                    <label className="adm-form-label">الرابط الوجهة (URL) <span className="required">*</span></label>
                                    <div className="adm-input-with-icon">
                                        <LinkIcon size={18} className="input-icon" />
                                        <input
                                            type="url"
                                            name="linkUrl"
                                            className="adm-form-input icon-padding"
                                            placeholder="https://talabia.com/offers"
                                            value={form.linkUrl}
                                            onChange={handleInputChange}
                                            required
                                            style={{ direction: 'ltr', textAlign: 'left' }}
                                        />
                                    </div>
                                    <p className="adm-help-text">الرابط الذي سينتقل إليه المستخدم عند الضغط على هذا البنر.</p>
                                </div>
                                <div className="adm-form-group full">
                                    <label className="adm-form-label">الوصف (اختياري)</label>
                                    <textarea
                                        name="description"
                                        className="adm-form-input"
                                        rows={3}
                                        placeholder="مزيد من التفاصيل..."
                                        value={form.description}
                                        onChange={handleInputChange}
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* ⚙️ Card 3: Publishing Settings (Span 4) */}
                    <section className="adm-card span-4 shadow-lg">
                        <div className="adm-card-header">
                            <Clock size={20} />
                            <h2>إعدادات النشر</h2>
                        </div>
                        <div className="adm-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>

                            <div className="adm-form-group full">
                                <label className="adm-form-label">تاريخ الظهور (اختياري)</label>
                                <div className="adm-input-with-icon">
                                    <Calendar size={18} className="input-icon" />
                                    <input
                                        type="datetime-local"
                                        name="startAt"
                                        className="adm-form-input icon-padding"
                                        value={form.startAt}
                                        onChange={handleInputChange}
                                    />
                                </div>
                            </div>

                            <div className="adm-form-group full">
                                <label className="adm-form-label">تاريخ الانتهاء المجدول (اختياري)</label>
                                <div className="adm-input-with-icon">
                                    <Calendar size={18} className="input-icon" />
                                    <input
                                        type="datetime-local"
                                        name="endAt"
                                        className="adm-form-input icon-padding"
                                        value={form.endAt}
                                        onChange={handleInputChange}
                                    />
                                </div>
                            </div>

                            <div className="adm-form-group hidden-on-mobile">
                                <label className="adm-form-label">ترتيب العرض</label>
                                <input
                                    type="number"
                                    name="sortOrder"
                                    min="1"
                                    className="adm-form-input"
                                    value={form.sortOrder}
                                    onChange={handleInputChange}
                                    placeholder="1"
                                />
                                <p className="adm-help-text">رقم الترتيب بين البنرات المعروضة.</p>
                            </div>

                            <div className="adm-toggle-group" style={{ marginTop: 'auto', paddingTop: 'var(--sp-3)', borderTop: '1px solid var(--adm-border)' }}>
                                <label className="adm-toggle-label">
                                    <input
                                        type="checkbox"
                                        name="isActive"
                                        checked={form.isActive}
                                        onChange={handleInputChange}
                                        className="adm-toggle-checkbox"
                                    />
                                    <div className="adm-toggle-switch"></div>
                                    <span className="adm-toggle-text">تفعيل إظهار الإعلان</span>
                                </label>
                            </div>

                        </div>
                    </section>

                    {/* Footer Controls span-12 */}
                    <div className="adm-card span-12" style={{ background: 'transparent', border: 'none', boxShadow: 'none', margin: 0, padding: 0 }}>
                        <div className="adm-actions-group" style={{ margin: 0, padding: 0, border: 'none', width: '100%' }}>
                            <button
                                type="button"
                                className="adm-btn-mgmt danger"
                                onClick={() => navigate("/admin?section=ads")}
                                disabled={saving}
                            >
                                إلغاء
                            </button>

                            <button
                                type="button"
                                className="adm-btn-mgmt primary"
                                onClick={handleSubmit}
                                disabled={saving || isCropping}
                            >
                                {saving ? "جاري الحفظ..." : isEditing ? "حفظ التعديلات" : "نشر الإعلان"}
                            </button>
                        </div>
                    </div>

                </main>
            </div>
        </div>
    );
}

