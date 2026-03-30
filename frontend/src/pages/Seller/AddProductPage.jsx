// frontend/src/pages/Seller/AddProductPage.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowRight, Package, XCircle } from "lucide-react";
import "./AddProductPage.css";

import { useApp } from "@/context/AppContext";
import { uploadProductImages, getProductById } from "@/services/productService";
import { listCategories } from "@/services/categoryService";
import { createSellerProduct, updateSellerProduct } from "@/services/sellerService";

import ImageCropper from "@/components/Media/ImageCropper";

import { resolveImageUrl } from "@/utils/assetUtils";
import { makeSafeKey, ensureUniqueKey } from "@/utils/formUtils";

const initialProductForm = {
    name: "",
    description: "",
    price: "",
    stock: "",
    unitLabel: "قطعة",
    categoryId: "",
    brand: "",
    variants: "",
    status: "active",
    returnPolicy: "",
    lowStockThreshold: 2,
};

export default function AddProductPage() {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditMode = Boolean(id);
    const { showToast } = useApp() || {};

    const [categories, setCategories] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const [productForm, setProductForm] = useState(initialProductForm);
    const [productErrors, setProductErrors] = useState({});
    const [imageItems, setImageItems] = useState([]);

    // نظام الألوان/الأحجام
    const [variantColors, setVariantColors] = useState([]); // [{key,label,hex}]
    const [variantSizes, setVariantSizes] = useState([]); // [{key,label}]
    const [colorLabelInput, setColorLabelInput] = useState("");
    const [colorHexInput, setColorHexInput] = useState("#111827");
    const [sizeLabelInput, setSizeLabelInput] = useState("");

    useEffect(() => {
        async function load() {
            try {
                // 1. Load Categories
                const categoriesRes = await listCategories();
                const rawCategories = Array.isArray(categoriesRes)
                    ? categoriesRes
                    : Array.isArray(categoriesRes?.categories)
                        ? categoriesRes.categories
                        : [];

                const normalizedCats = rawCategories
                    .filter((cat) => (cat.slug || "").toLowerCase() !== "all")
                    .map((cat) => ({ id: cat._id, name: cat.name }));

                setCategories(normalizedCats);

                // 2. If Edit Mode, Load Product Data
                if (isEditMode && id) {
                    const productData = await getProductById(id);
                    const p = productData.product || productData;

                    // Parse Variants
                    let loadedColors = [];
                    let loadedSizes = [];
                    if (p.variants) {
                        try {
                            const parsed = typeof p.variants === 'string' ? JSON.parse(p.variants) : p.variants;
                            if (parsed.colors) loadedColors = parsed.colors;
                            if (parsed.sizes) loadedSizes = parsed.sizes;
                        } catch (e) {
                            console.error("Error parsing variants", e);
                        }
                    }

                    // Parse Images
                    const loadedImages = (p.images || []).map((img, idx) => {
                        const url = typeof img === 'string' ? img : (img.url || "");
                        return {
                            id: `existing-${idx}`,
                            file: null,
                            url: resolveImageUrl(url),
                            originalPath: url, // Store original path for saving
                            isExisting: true
                        };
                    });

                    setProductForm({
                        name: p.name || "",
                        description: p.description || "",
                        price: p.price || "",
                        stock: p.stock || "",
                        unitLabel: p.unitLabel || "قطعة",
                        categoryId: p.category?._id || p.category || "",
                        brand: p.brand || "",
                        status: p.status || "active",
                        returnPolicy: p.returnPolicy || "",
                        lowStockThreshold: p.lowStockThreshold || 2,
                    });
                    setVariantColors(loadedColors);
                    setVariantSizes(loadedSizes);
                    setImageItems(loadedImages);
                }

            } catch (error) {
                if (showToast) showToast("تعذّر تحميل البيانات.", "error");
            } finally {
                setIsLoading(false);
            }
        }
        load();
    }, [id, isEditMode, showToast]);

    const handleFieldChange = (field, value) => {
        setProductForm((prev) => ({ ...prev, [field]: value }));
        if (productErrors[field]) {
            setProductErrors((prev) => {
                const next = { ...prev };
                delete next[field];
                return next;
            });
        }
    };

    const addColor = () => {
        const label = colorLabelInput.trim();
        if (!label) return;
        if (variantColors.some(c => c.label.toLowerCase() === label.toLowerCase())) {
            if (showToast) showToast("هذا اللون مضاف مسبقًا.", "error");
            return;
        }
        const key = ensureUniqueKey(makeSafeKey(label, "color"), new Set(variantColors.map(c => c.key)));
        setVariantColors(prev => [...prev, { key, label, hex: colorHexInput || "#e5e7eb" }]);
        setColorLabelInput("");
    };

    const removeColor = (key) => setVariantColors(prev => prev.filter(c => c.key !== key));

    const addSize = () => {
        const label = sizeLabelInput.trim();
        if (!label) return;
        if (variantSizes.some(s => s.label.toLowerCase() === label.toLowerCase())) {
            if (showToast) showToast("هذا الحجم مضاف مسبقًا.", "error");
            return;
        }
        const key = ensureUniqueKey(makeSafeKey(label, "size"), new Set(variantSizes.map(s => s.key)));
        setVariantSizes(prev => [...prev, { key, label }]);
        setSizeLabelInput("");
    };

    const removeSize = (key) => setVariantSizes(prev => prev.filter(s => s.key !== key));

    const validate = () => {
        const errors = {};
        if (!productForm.name.trim()) errors.name = "اسم المنتج مطلوب";
        if (!productForm.price || isNaN(productForm.price) || Number(productForm.price) <= 0) errors.price = "السعر غير صالح";
        if (!productForm.stock || isNaN(productForm.stock) || Number(productForm.stock) < 0) errors.stock = "المخزون غير صالح";
        if (!productForm.categoryId) errors.categoryId = "يجب اختيار تصنيف";
        if (!productForm.description.trim()) errors.description = "وصف المنتج مطلوب";
        setProductErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        try {
            setIsSaving(true);
            let uploadedImages = [];

            // 1. Upload NEW images only
            const newFileItems = imageItems.filter(img => img.file && !img.isExisting);

            if (newFileItems.length) {
                const formData = new FormData();
                newFileItems.forEach((img, index) => {
                    const filename = `product-${Date.now()}-${index}.jpg`;
                    formData.append("images", img.file, filename);
                });
                const uploadRes = await uploadProductImages(formData);
                if (Array.isArray(uploadRes?.images)) uploadedImages = uploadRes.images;
            }

            // 2. Combine with Existing images (if Edit Mode)
            const existingImages = imageItems
                .filter(img => img.isExisting && !img.isCropped)
                .map(img => img.originalPath); // Use originalPath for existing non-cropped images

            const finalImages = [...existingImages, ...uploadedImages];

            const variantsPayload = (variantColors.length > 0 || variantSizes.length > 0)
                ? JSON.stringify({
                    colors: variantColors,
                    sizes: variantSizes
                })
                : undefined;

            const payload = {
                ...productForm,
                price: Number(productForm.price),
                stock: Number(productForm.stock),
                category: productForm.categoryId,
                variants: variantsPayload,
                images: finalImages,
                lowStockThreshold: Number(productForm.lowStockThreshold) || 2
            };

            if (isEditMode) {
                await updateSellerProduct(id, payload);
                if (showToast) showToast("تم تحديث المنتج بنجاح.", "success");
            } else {
                await createSellerProduct(payload);
                if (showToast) showToast("تم إضافة المنتج بنجاح.", "success");
            }
            navigate("/seller/products");
        } catch (error) {
            const action = isEditMode ? "تحديث" : "إضافة";
            if (showToast) showToast(error?.response?.data?.message || `تعذّر ${action} المنتج.`, "error");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <section className="seller-section">
            <div className="seller-layout-container">
                <header className="seller-hero-action">
                    <div className="seller-hero-info">
                        <div className="add-product-title-group">
                            <h2>{isEditMode ? "تعديل بيانات المنتج" : "إضافة منتج جديد"}</h2>
                            <p>{isEditMode ? "قم بتعديل بيانات المنتج وحفظ التغييرات." : "أدخل بيانات المنتج بدقة لضمان أفضل عرض للعملاء."}</p>
                        </div>
                    </div>
                    {!isLoading && (
                        <>
                            <button
                                type="button"
                                className="modern-back-btn"
                                onClick={() => navigate("/seller/products")}
                            >
                                <ArrowRight size={18} />
                                <span>رجوع للقائمة</span>
                            </button>
                            <button
                                className="seller-add-btn-large"
                                onClick={handleSubmit}
                                disabled={isSaving || isLoading}
                                style={{ marginRight: 'auto', marginLeft: '1rem' }}
                            >
                                {isSaving ? "جارٍ الحفظ..." : isEditMode ? "حفظ التعديلات" : "إضافة المنتج"}
                            </button>
                        </>
                    )}
                </header>

                {isLoading ? (
                    <div className="add-product-card">
                        <div className="platinum-skeleton" style={{ width: "100%", height: "500px", borderRadius: "8px" }} />
                    </div>
                ) : (
                    <form className="add-product-card" onSubmit={handleSubmit} noValidate>
                        <div className="seller-form-grid">
                            <div className="seller-form-field">
                                <label>اسم المنتج <span className="required">*</span></label>
                                <input type="text" value={productForm.name} onChange={(e) => handleFieldChange("name", e.target.value)} />
                                {productErrors.name && <p className="seller-field-error">{productErrors.name}</p>}
                            </div>

                            <div className="seller-form-field">
                                <label>التصنيف <span className="required">*</span></label>
                                <select value={productForm.categoryId} onChange={(e) => handleFieldChange("categoryId", e.target.value)}>
                                    <option value="">اختر التصنيف...</option>
                                    {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                                </select>
                                {productErrors.categoryId && <p className="seller-field-error">{productErrors.categoryId}</p>}
                            </div>

                            <div className="seller-form-field">
                                <label>السعر <span className="required">*</span></label>
                                <input type="number" value={productForm.price} onChange={(e) => handleFieldChange("price", e.target.value)} />
                                {productErrors.price && <p className="seller-field-error">{productErrors.price}</p>}
                            </div>

                            <div className="seller-form-field">
                                <label>المخزون <span className="required">*</span></label>
                                <input type="number" value={productForm.stock} onChange={(e) => handleFieldChange("stock", e.target.value)} />
                                {productErrors.stock && <p className="seller-field-error">{productErrors.stock}</p>}
                            </div>

                            <div className="seller-form-field">
                                <label>تنبيه نقص المخزون (الحد الأدنى)</label>
                                <input
                                    type="number"
                                    value={productForm.lowStockThreshold}
                                    onChange={(e) => handleFieldChange("lowStockThreshold", e.target.value)}
                                    placeholder="مثال: 2"
                                />
                                <p className="seller-field-hint">سيصلك تنبيه عندما يصل المخزون لهذا الرقم.</p>
                            </div>

                            <div className="seller-form-field seller-form-field-full">
                                <label>ألوان المنتج (اختياري)</label>
                                <div className="seller-variant-editor">
                                    <div className="seller-variant-input-row">
                                        <input type="text" value={colorLabelInput} onChange={(e) => setColorLabelInput(e.target.value)} placeholder="مثال: أسود" />
                                        <input className="seller-variant-color-picker" type="color" value={colorHexInput} onChange={(e) => setColorHexInput(e.target.value)} />
                                        <button type="button" className="seller-variant-add-btn" onClick={addColor}>إضافة</button>
                                    </div>
                                    {variantColors.length > 0 && (
                                        <div className="seller-variant-chips">
                                            {variantColors.map(c => (
                                                <span key={c.key} className="seller-variant-chip">
                                                    <span className="seller-variant-chip-dot" style={{ backgroundColor: c.hex }} />
                                                    <span>{c.label}</span>
                                                    <button type="button" onClick={() => removeColor(c.key)}>×</button>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="seller-form-field seller-form-field-full">
                                <label>أحجام المنتج (اختياري)</label>
                                <div className="seller-variant-editor">
                                    <div className="seller-variant-input-row">
                                        <input type="text" value={sizeLabelInput} onChange={(e) => setSizeLabelInput(e.target.value)} placeholder="مثال: XL" />
                                        <button type="button" className="seller-variant-add-btn" onClick={addSize}>إضافة</button>
                                    </div>
                                    {variantSizes.length > 0 && (
                                        <div className="seller-variant-chips">
                                            {variantSizes.map(s => (
                                                <span key={s.key} className="seller-variant-chip">
                                                    <span>{s.label}</span>
                                                    <button type="button" onClick={() => removeSize(s.key)}>×</button>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="seller-form-field seller-form-field-full">
                                <label>وصف المنتج <span className="required">*</span></label>
                                <textarea rows={4} value={productForm.description} onChange={(e) => handleFieldChange("description", e.target.value)} />
                                {productErrors.description && <p className="seller-field-error">{productErrors.description}</p>}
                            </div>

                            <div className="seller-form-field seller-form-field-full">
                                <ImageCropper
                                    value={imageItems}
                                    onChange={setImageItems}
                                    multiple={true}
                                    label={
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                            <span>صور المنتج</span>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#64748b' }}>
                                                (مقياس 4:5 المعتمد في المتجر - القالب الذهبي)
                                            </span>
                                        </div>
                                    }
                                />
                            </div>
                        </div>

                        <footer className="add-product-footer">
                            <button type="button" className="seller-btn-ghost" onClick={() => navigate("/seller/products")}>إلغاء</button>
                            <button type="submit" className="seller-btn-primary" disabled={isSaving}>
                                {isSaving ? "جارٍ الحفظ..." : "حفظ المنتج المضاف"}
                            </button>
                        </footer>
                    </form>
                )}
            </div>
        </section>
    );
}
