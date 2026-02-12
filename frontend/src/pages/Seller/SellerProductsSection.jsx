// frontend/src/pages/Seller/SellerProductsSection.jsx
// قسم "إدارة المنتجات" في لوحة البائع - نسخة إنتاجية

import "./SellerProductsSection.css";

import { useState, useEffect, useMemo } from "react";
import {
  Package,
  Search,
  Filter,
  Image as ImageIcon,
  XCircle,
  Trash2,
  Pencil,
  CheckCircle2,
} from "lucide-react";

import { useApp } from "@/context/AppContext";
import { uploadProductImages } from "@/services/productService";
import { listCategories } from "@/services/categoryService";
import {
  getSellerProducts,
  createSellerProduct,
  updateSellerProduct,
  updateSellerProductStatus,
  deleteSellerProduct,
} from "@/services/sellerService";

import ImageCropper from "@/components/Media/ImageCropper";

/**
 * FIX (Mobile Images):
 * لا تستخدم localhost كافتراضي لأن الهاتف يعتبر localhost = الهاتف نفسه.
 * نستخدم hostname الحالي للموقع مع نفس بروتوكول الصفحة وعلى بورت 5000.
 */
const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  ``;

const resolveImageUrl = (imagePath) => {
  if (!imagePath) return "";

  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
    return imagePath;
  }

  let normalized = imagePath.trim();

  if (!normalized.startsWith("/")) {
    if (normalized.startsWith("uploads/")) {
      normalized = "/" + normalized;
    } else if (normalized.startsWith("ads/")) {
      normalized = "/uploads/" + normalized;
    } else if (normalized.startsWith("products/")) {
      normalized = "/uploads/" + normalized;
    } else {
      normalized = "/uploads/" + normalized;
    }
  }

  return `${API_BASE_URL}${normalized}`;
};

// مفاتيح آمنة (تدعم العربية)
const makeSafeKey = (value, fallbackPrefix = "opt") => {
  const base = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\u0600-\u06FF-]+/g, "");
  return base || `${fallbackPrefix}-${Date.now()}`;
};

const ensureUniqueKey = (baseKey, usedKeys) => {
  let key = baseKey;
  let i = 1;
  while (usedKeys.has(key)) {
    key = `${baseKey}-${i++}`;
  }
  usedKeys.add(key);
  return key;
};

const parseVariantsForEditor = (rawVariants) => {
  const out = { colors: [], sizes: [], text: "" };

  if (!rawVariants) return out;

  let obj = null;

  // variants قد تأتي نصًا أو JSON string
  if (typeof rawVariants === "string") {
    const s = rawVariants.trim();
    if (!s) return out;

    if (
      (s.startsWith("{") && s.endsWith("}")) ||
      (s.startsWith("[") && s.endsWith("]"))
    ) {
      try {
        obj = JSON.parse(s);
      } catch {
        // نص عادي
        out.text = s;
        return out;
      }
    } else {
      out.text = s;
      return out;
    }
  } else if (typeof rawVariants === "object") {
    obj = rawVariants;
  }

  if (!obj || typeof obj !== "object") return out;

  // إذا كان مصفوفة (غير متوقع) نعتبره نصًا لتفادي كسر البيانات
  if (Array.isArray(obj)) {
    out.text = JSON.stringify(obj);
    return out;
  }

  if (typeof obj.text === "string") {
    out.text = obj.text.trim();
  }

  const seenColorLabels = new Set();
  const seenSizeLabels = new Set();
  const usedColorKeys = new Set();
  const usedSizeKeys = new Set();

  if (Array.isArray(obj.colors)) {
    obj.colors.forEach((c, idx) => {
      let label = "";
      let hex = "";

      if (typeof c === "string") {
        label = c.trim();
      } else if (c && typeof c === "object") {
        label = String(c.label || c.name || c.title || "").trim();
        hex = String(c.hex || c.color || c.value || "").trim();
      }

      if (!label) return;

      const labelKey = label.toLowerCase();
      if (seenColorLabels.has(labelKey)) return;
      seenColorLabels.add(labelKey);

      const baseKey = String(
        (c && typeof c === "object" && c.key) ||
          makeSafeKey(label, `color-${idx + 1}`)
      );
      const key = ensureUniqueKey(baseKey, usedColorKeys);

      out.colors.push({
        key,
        label,
        hex: hex || "#e5e7eb",
      });
    });
  }

  if (Array.isArray(obj.sizes)) {
    obj.sizes.forEach((s, idx) => {
      let label = "";

      if (typeof s === "string") {
        label = s.trim();
      } else if (s && typeof s === "object") {
        label = String(s.label || s.name || s.title || "").trim();
      }

      if (!label) return;

      const labelKey = label.toLowerCase();
      if (seenSizeLabels.has(labelKey)) return;
      seenSizeLabels.add(labelKey);

      const baseKey = String(
        (s && typeof s === "object" && s.key) ||
          makeSafeKey(label, `size-${idx + 1}`)
      );
      const key = ensureUniqueKey(baseKey, usedSizeKeys);

      out.sizes.push({ key, label });
    });
  }

  return out;
};

const initialProductForm = {
  name: "",
  description: "",
  price: "",
  stock: "",
  // ✅ مخفي الآن، لكن نُبقيه لضمان عدم كسر الباك/التحقق
  unitLabel: "قطعة",
  categoryId: "",
  // ✅ مخفي الآن (يُحفظ/يُمرر كما هو)
  brand: "",
  // ✅ مخفي الآن (نستبدله بنظام ألوان/أحجام عبر variants JSON عند الحاجة)
  variants: "",
  status: "active",
  // ✅ مخفي الآن (يُحفظ/يُمرر كما هو)
  returnPolicy: "",
};

export default function SellerProductsSection() {
  const { showToast } = useApp() || {};

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [isProductsLoading, setIsProductsLoading] = useState(false);
  const [isSavingProduct, setIsSavingProduct] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const isEditMode = Boolean(editingProductId);

  const [productForm, setProductForm] = useState(initialProductForm);
  const [productErrors, setProductErrors] = useState({});
  const [productSearch, setProductSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [imageItems, setImageItems] = useState([]);

  // ✅ روابط معاينة تظهر للبائع نفس قصّ الصور في صفحات المشتري
  const [sellerPreviewUrls, setSellerPreviewUrls] = useState([]);

  // ✅ معاينة "كما ستظهر للمشتري": نولّد روابط للصور (يدعم صور مرفوعة جديدة + صور موجودة)
  useEffect(() => {
    const urls = (Array.isArray(imageItems) ? imageItems : [])
      .map((it) => {
        if (!it) return "";
        if (typeof it.url === "string" && it.url.trim()) return it.url;
        if (typeof it.dataUrl === "string" && it.dataUrl.trim()) return it.dataUrl;
        if (typeof it.preview === "string" && it.preview.trim()) return it.preview;
        if (it.file instanceof File) return URL.createObjectURL(it.file);
        return "";
      })
      .filter(Boolean);

    setSellerPreviewUrls(urls);

    return () => {
      // إلغاء روابط blob لتفادي تسريب الذاكرة
      urls.forEach((u) => {
        if (typeof u === "string" && u.startsWith("blob:")) {
          try {
            URL.revokeObjectURL(u);
          } catch {
            // ignore
          }
        }
      });
    };
  }, [imageItems]);

  // ✅ نظام الألوان/الأحجام (يُحفظ داخل variants بصيغة JSON عند الحاجة)
  const [variantColors, setVariantColors] = useState([]); // [{key,label,hex}]
  const [variantSizes, setVariantSizes] = useState([]); // [{key,label}]
  const [colorLabelInput, setColorLabelInput] = useState("");
  const [colorHexInput, setColorHexInput] = useState("#111827");
  const [sizeLabelInput, setSizeLabelInput] = useState("");
  const [legacyVariantsText, setLegacyVariantsText] = useState(""); // للحفاظ على بيانات variants القديمة (بدون عرضها)

  const resetVariantEditors = () => {
    setVariantColors([]);
    setVariantSizes([]);
    setColorLabelInput("");
    setColorHexInput("#111827");
    setSizeLabelInput("");
    setLegacyVariantsText("");
  };

  const addColor = () => {
    const label = colorLabelInput.trim();
    if (!label) return;

    const exists = variantColors.some(
      (c) => c.label.toLowerCase() === label.toLowerCase()
    );
    if (exists) {
      if (showToast) showToast("هذا اللون مضاف مسبقًا.", "error");
      return;
    }

    const baseKey = makeSafeKey(label, "color");
    const used = new Set(variantColors.map((c) => c.key));
    const key = ensureUniqueKey(baseKey, used);

    setVariantColors((prev) => [
      ...prev,
      {
        key,
        label,
        hex: (colorHexInput || "").trim() || "#e5e7eb",
      },
    ]);

    setColorLabelInput("");
  };

  const removeColor = (key) => {
    setVariantColors((prev) => prev.filter((c) => c.key !== key));
  };

  const addSize = () => {
    const label = sizeLabelInput.trim();
    if (!label) return;

    const exists = variantSizes.some(
      (s) => s.label.toLowerCase() === label.toLowerCase()
    );
    if (exists) {
      if (showToast) showToast("هذا الحجم مضاف مسبقًا.", "error");
      return;
    }

    const baseKey = makeSafeKey(label, "size");
    const used = new Set(variantSizes.map((s) => s.key));
    const key = ensureUniqueKey(baseKey, used);

    setVariantSizes((prev) => [...prev, { key, label }]);
    setSizeLabelInput("");
  };

  const removeSize = (key) => {
    setVariantSizes((prev) => prev.filter((s) => s.key !== key));
  };

  // ───────────────── تحميل الأقسام والمنتجات ─────────────────
  useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      try {
        setIsProductsLoading(true);

        const [categoriesRes, productsRes] = await Promise.all([
          listCategories(),
          getSellerProducts(),
        ]);

        const rawCategories = Array.isArray(categoriesRes)
          ? categoriesRes
          : Array.isArray(categoriesRes?.categories)
          ? categoriesRes.categories
          : [];

        const normalizedCats = rawCategories.map((cat) => ({
          id: cat._id,
          name: cat.name,
        }));

        const rawProducts = Array.isArray(productsRes)
          ? productsRes
          : Array.isArray(productsRes?.products)
          ? productsRes.products
          : [];

        const normalizedProducts = rawProducts.map((p) => {
          const images = Array.isArray(p.images)
            ? p.images
                .map((img) => (typeof img === "string" ? img : img.url))
                .filter(Boolean)
            : [];

          const isActive =
            typeof p.isActive === "boolean"
              ? p.isActive
              : typeof p.status === "string"
              ? p.status !== "inactive"
              : true;

          return {
            id: p._id,
            name: p.name || "",
            description: p.description || "",
            price: p.price ?? 0,
            stock: p.stock ?? 0,
            unitLabel: p.unitLabel || "",
            categoryId:
              typeof p.category === "string" ? p.category : p.category?._id || "",
            categoryName:
              typeof p.category === "string" ? "" : p.category?.name || "",
            brand: p.brand || "",
            variants: p.variants || "",
            status: isActive ? "active" : "inactive",
            returnPolicy: p.returnPolicy || "",
            images,
          };
        });

        if (!isMounted) return;

        setCategories(normalizedCats);
        setProducts(normalizedProducts);
      } catch (error) {
        if (isMounted && showToast) {
          const message =
            error?.response?.data?.message ||
            error?.message ||
            "تعذّر تحميل منتجات المتجر.";
          showToast(message, "error");
        }
      } finally {
        if (isMounted) {
          setIsProductsLoading(false);
        }
      }
    }

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, [showToast]);

  // ───────────────── حقول النموذج ─────────────────
  const handleProductFieldChange = (field, value) => {
    setProductForm((prev) => ({ ...prev, [field]: value }));
    if (productErrors[field]) {
      setProductErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const openCreateModal = () => {
    setEditingProductId(null);
    setProductForm({ ...initialProductForm, unitLabel: "قطعة" });
    setProductErrors({});
    setImageItems([]);
    resetVariantEditors();
    setIsModalOpen(true);
  };

  const openEditModal = (product) => {
    setEditingProductId(product.id);

    // ✅ تفكيك variants القديمة (إن كانت JSON) لاستخراج الألوان/الأحجام + حفظ النص القديم بدون عرض
    const parsed = parseVariantsForEditor(product.variants);

    setVariantColors(parsed.colors || []);
    setVariantSizes(parsed.sizes || []);
    setLegacyVariantsText(parsed.text || "");
    setColorLabelInput("");
    setColorHexInput("#111827");
    setSizeLabelInput("");

    setProductForm({
      name: product.name || "",
      description: product.description || "",
      price: product.price != null ? String(product.price) : "",
      stock: product.stock != null ? String(product.stock) : "",
      unitLabel: (product.unitLabel && product.unitLabel.trim()) || "قطعة",
      categoryId: product.categoryId || "",
      brand: product.brand || "",
      variants: product.variants || "",
      status: product.status || "inactive",
      returnPolicy: product.returnPolicy || "",
    });

    setProductErrors({});

    const previews =
      Array.isArray(product.images) && product.images.length
        ? product.images.map((url) => ({
            file: null,
            url: resolveImageUrl(url),
            originalUrl: url,
            zoom: 1,
            offsetX: 0,
            offsetY: 0,
          }))
        : [];
    setImageItems(previews);

    setIsModalOpen(true);
  };

  const validateProductForm = () => {
    const errors = {};

    if (!productForm.name.trim()) errors.name = "اسم المنتج مطلوب";

    const priceValue = Number(productForm.price);
    if (!productForm.price || Number.isNaN(priceValue) || priceValue <= 0) {
      errors.price = "السعر غير صالح";
    }

    const stockValue = Number(productForm.stock);
    if (!productForm.stock || Number.isNaN(stockValue) || stockValue < 0) {
      errors.stock = "المخزون غير صالح";
    }

    if (!productForm.categoryId) errors.categoryId = "يجب اختيار تصنيف للمنتج";

    if (!productForm.description.trim()) {
      errors.description = "وصف مختصر للمنتج مطلوب";
    }

    setProductErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    if (!validateProductForm()) return;

    try {
      setIsSavingProduct(true);

      const newFileItems = imageItems.filter((img) => img.file);
      let uploadedImages = [];
      if (newFileItems.length) {
        const formData = new FormData();
        newFileItems.forEach((img) => {
          formData.append("images", img.file);
        });

        const uploadResponse = await uploadProductImages(formData);
        if (Array.isArray(uploadResponse?.images)) {
          uploadedImages = uploadResponse.images;
        }
      }

      const existingUrls = imageItems
        .filter((img) => !img.file && (img.originalUrl || img.url))
        .map((img) => img.originalUrl || img.url);

      const mergedImages = [...existingUrls, ...uploadedImages];

      // ✅ بناء variants: JSON فقط عندما يوجد ألوان/أحجام — وإلا نحافظ على النص القديم إن وجد
      const legacyText = (legacyVariantsText || "").trim();
      const colorsPayload = (variantColors || []).map((c) => ({
        key: c.key,
        label: c.label,
        hex: c.hex,
      }));
      const sizesPayload = (variantSizes || []).map((s) => ({
        key: s.key,
        label: s.label,
      }));

      let variantsValue = undefined;

      if (colorsPayload.length > 0 || sizesPayload.length > 0) {
        const obj = {};
        if (legacyText) obj.text = legacyText;
        if (colorsPayload.length > 0) obj.colors = colorsPayload;
        if (sizesPayload.length > 0) obj.sizes = sizesPayload;
        variantsValue = JSON.stringify(obj);
      } else {
        variantsValue = legacyText || undefined;
      }

      const basePayload = {
        name: productForm.name.trim(),
        description: productForm.description.trim(),
        price: Number(productForm.price),
        stock: Number(productForm.stock),
        unitLabel: (productForm.unitLabel || "").trim() || "قطعة",
        category: productForm.categoryId,
        brand: productForm.brand.trim() || undefined,
        variants: variantsValue,
        status: productForm.status,
        returnPolicy: productForm.returnPolicy.trim() || undefined,
      };

      const payload =
        mergedImages.length > 0 ? { ...basePayload, images: mergedImages } : basePayload;

      if (isEditMode && editingProductId) {
        await updateSellerProduct(editingProductId, payload);
      } else {
        await createSellerProduct(payload);
      }

      const refreshed = await getSellerProducts();
      const raw = Array.isArray(refreshed)
        ? refreshed
        : Array.isArray(refreshed?.products)
        ? refreshed.products
        : [];

      const normalizedProducts = raw.map((p) => {
        const images = Array.isArray(p.images)
          ? p.images
              .map((img) => (typeof img === "string" ? img : img.url))
              .filter(Boolean)
          : [];

        const isActive =
          typeof p.isActive === "boolean"
            ? p.isActive
            : typeof p.status === "string"
            ? p.status !== "inactive"
            : true;

        return {
          id: p._id,
          name: p.name || "",
          description: p.description || "",
          price: p.price ?? 0,
          stock: p.stock ?? 0,
          unitLabel: p.unitLabel || "",
          categoryId:
            typeof p.category === "string" ? p.category : p.category?._id || "",
          categoryName: typeof p.category === "string" ? "" : p.category?.name || "",
          brand: p.brand || "",
          variants: p.variants || "",
          status: isActive ? "active" : "inactive",
          returnPolicy: p.returnPolicy || "",
          images,
        };
      });

      setProducts(normalizedProducts);

      setIsModalOpen(false);
      setEditingProductId(null);
      setProductForm({ ...initialProductForm, unitLabel: "قطعة" });
      setProductErrors({});
      setImageItems([]);
      resetVariantEditors();

      if (showToast) {
        showToast(
          isEditMode ? "تم تحديث بيانات المنتج بنجاح." : "تم إضافة المنتج بنجاح.",
          "success"
        );
      }
    } catch (error) {
      if (showToast) {
        const message =
          error?.response?.data?.message || error?.message || "تعذّر حفظ بيانات المنتج.";
        showToast(message, "error");
      }
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleModalCancel = () => {
    setIsModalOpen(false);
    setEditingProductId(null);
    setProductForm({ ...initialProductForm, unitLabel: "قطعة" });
    setProductErrors({});
    setImageItems([]);
    resetVariantEditors();
  };

  const handleToggleProductStatus = async (product) => {
    const newStatus = product.status === "active" ? "inactive" : "active";

    setProducts((prev) =>
      prev.map((p) =>
        p.id === product.id
          ? {
              ...p,
              status: newStatus,
            }
          : p
      )
    );

    try {
      await updateSellerProductStatus(product.id, newStatus);
      if (showToast) showToast("تم تحديث حالة المنتج.", "success");
    } catch (error) {
      setProducts((prev) =>
        prev.map((p) =>
          p.id === product.id
            ? {
                ...p,
                status: product.status,
              }
            : p
        )
      );

      if (showToast) {
        const message =
          error?.response?.data?.message || error?.message || "تعذّر تحديث حالة المنتج.";
        showToast(message, "error");
      }
    }
  };

  const handleDeleteProductClick = async (product) => {
    const confirmed = window.confirm(`هل أنت متأكد من رغبتك في حذف المنتج "${product.name}"؟`);
    if (!confirmed) return;

    try {
      await deleteSellerProduct(product.id);
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
      if (showToast) showToast("تم حذف المنتج بنجاح.", "success");
    } catch (error) {
      if (showToast) {
        const message =
          error?.response?.data?.message || error?.message || "تعذّر حذف المنتج.";
        showToast(message, "error");
      }
    }
  };

  const filteredProducts = useMemo(() => {
    const search = productSearch.trim().toLowerCase();

    return products.filter((product) => {
      const matchesSearch = search
        ? product.name.toLowerCase().includes(search) ||
          (product.brand && product.brand.toLowerCase().includes(search))
        : true;

      const matchesStatus = statusFilter === "all" ? true : product.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [products, productSearch, statusFilter]);

  const hasFilters = productSearch.trim().length > 0 || statusFilter !== "all";

  // ───────────────── JSX ─────────────────
  return (
    <section className="seller-section">
      <div className="seller-section-header">
        <div>
          <h2>منتجات المتجر</h2>
          <p>إدارة المنتجات الخاصة بمتجرك: إضافة، تعديل، وتغيير حالة العرض.</p>
        </div>
        <div className="seller-header-actions">
          <button type="button" className="seller-btn-primary" onClick={openCreateModal}>
            <Package size={16} />
            <span>إضافة منتج جديد</span>
          </button>
        </div>
      </div>

      <div className="seller-toolbar">
        <div className="seller-search">
          <Search size={16} />
          <input
            type="text"
            placeholder="ابحث باسم المنتج..."
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
          />
        </div>

        <div className="seller-select">
          <Filter size={14} />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">كل الحالات</option>
            <option value="active">نشط</option>
            <option value="inactive">غير نشط</option>
          </select>
        </div>
      </div>

      {hasFilters && (
        <div className="seller-filter-summary">
          <span>تصفية مفعّلة</span>
          <button
            type="button"
            className="seller-filter-reset"
            onClick={() => {
              setProductSearch("");
              setStatusFilter("all");
            }}
          >
            إعادة التعيين
          </button>
        </div>
      )}

      {isProductsLoading ? (
        <div className="seller-loading">جارٍ تحميل المنتجات...</div>
      ) : filteredProducts.length === 0 ? (
        <div className="seller-empty">
          <div className="seller-empty-icon">
            <Package size={22} />
          </div>
          <h3>لا توجد منتجات مضافة بعد</h3>
          <p>
            يمكنك البدء بإضافة أول منتج لمتجرك من خلال الضغط على زر{" "}
            <strong>إضافة منتج جديد</strong>.
          </p>
        </div>
      ) : (
        <div className="seller-products-grid">
          {filteredProducts.map((product) => {
            const thumbUrl =
              product.images && product.images.length ? resolveImageUrl(product.images[0]) : "";

            const categoryLabel =
              product.categoryName || categories.find((c) => c.id === product.categoryId)?.name || "";

            const unitLabel =
              product.unitLabel && product.unitLabel.trim().length ? product.unitLabel.trim() : "قطعة";

            const isActive = product.status === "active";
            const statusLabel = isActive ? "نشط" : "غير نشط";

            return (
              <article key={product.id} className="seller-product-card">
                <div className="seller-product-layout">
                  {/* عمود الصورة (يمتد على كامل ارتفاع الكرت) */}
                  <div className="seller-product-image-col">
                    <div className="seller-product-image-frame">
                      {thumbUrl ? (
                        <img src={thumbUrl} alt={product.name} loading="lazy" />
                      ) : (
                        <div className="seller-product-image-placeholder">
                          <ImageIcon size={18} />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* النصف العلوي: اسم + وصف + حالة + (تحتها التعديل/الحذف) */}
                  <div className="seller-product-upper">
                    <div className="seller-product-upper-main">
                      <div className="seller-product-title-block">
                        <h3 className="seller-product-name">{product.name}</h3>
                        {product.description && <p className="seller-product-desc">{product.description}</p>}
                        {categoryLabel && <div className="seller-product-line-sub">{categoryLabel}</div>}
                      </div>

                      <div className="seller-product-status-column">
                        <span
                          className={
                            "seller-product-status-chip" + (isActive ? " is-active" : " is-inactive")
                          }
                        >
                          {statusLabel}
                        </span>

                        <div className="seller-product-actions-icons">
                          <button
                            type="button"
                            className="seller-icon-circle-btn seller-icon-circle-danger"
                            onClick={() => handleDeleteProductClick(product)}
                            aria-label="حذف المنتج"
                          >
                            <Trash2 size={14} />
                          </button>

                          <button
                            type="button"
                            className="seller-icon-circle-btn"
                            onClick={() => openEditModal(product)}
                            aria-label="تعديل المنتج"
                          >
                            <Pencil size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* النصف السفلي: السعر + المخزون + زر تفعيل العرض فقط */}
                  <div className="seller-product-lower">
                    <div className="seller-product-meta-strip">
                      <div className="seller-product-meta">
                        <span className="seller-meta-label">السعر</span>
                        <span className="seller-meta-value">
                          {Number(product.price).toLocaleString("ar-SA")} ر.ي
                        </span>
                      </div>

                      <span className="seller-product-meta-divider" />

                      <div className="seller-product-meta">
                        <span className="seller-meta-label">المخزون</span>
                        <span className="seller-meta-value">
                          {Number(product.stock).toLocaleString("ar-SA")} {unitLabel}
                        </span>
                      </div>
                    </div>

                    <div className="seller-product-actions-line">
                      <button
                        type="button"
                        className={"seller-product-toggle-btn" + (isActive ? " is-on" : " is-off")}
                        onClick={() => handleToggleProductStatus(product)}
                      >
                        <CheckCircle2 size={14} />
                        <span>{isActive ? "إيقاف العرض" : "تفعيل العرض"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* مودال إضافة / تعديل منتج */}
      {isModalOpen && (
        <div className="seller-modal-backdrop">
          <div className="seller-modal">
            <header className="seller-modal-header">
              <div>
                <h3>{isEditMode ? "تعديل المنتج" : "إضافة منتج جديد"}</h3>
                <p>
                  {isEditMode
                    ? "قم بتحديث بيانات المنتج كما ستظهر للمشتري في المتجر."
                    : "أدخل بيانات المنتج كما ستظهر للمشتري في المتجر."}
                </p>
              </div>
              <button
                type="button"
                className="seller-icon-btn"
                onClick={handleModalCancel}
                aria-label="إغلاق"
              >
                <XCircle size={18} />
              </button>
            </header>

            <form className="seller-modal-body" onSubmit={handleProductSubmit} noValidate>
              <div className="seller-form-grid">
                <div className="seller-form-field">
                  <label>
                    اسم المنتج <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    value={productForm.name}
                    onChange={(e) => handleProductFieldChange("name", e.target.value)}
                  />
                  {productErrors.name && <p className="seller-field-error">{productErrors.name}</p>}
                </div>

                <div className="seller-form-field">
                  <label>
                    التصنيف (القسم) <span className="required">*</span>
                  </label>
                  <select
                    value={productForm.categoryId}
                    onChange={(e) => handleProductFieldChange("categoryId", e.target.value)}
                  >
                    <option value="">اختر التصنيف...</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  {productErrors.categoryId && (
                    <p className="seller-field-error">{productErrors.categoryId}</p>
                  )}
                </div>

                <div className="seller-form-field">
                  <label>
                    السعر <span className="required">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={productForm.price}
                    onChange={(e) => handleProductFieldChange("price", e.target.value)}
                  />
                  {productErrors.price && <p className="seller-field-error">{productErrors.price}</p>}
                </div>

                <div className="seller-form-field">
                  <label>
                    المخزون <span className="required">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={productForm.stock}
                    onChange={(e) => handleProductFieldChange("stock", e.target.value)}
                  />
                  {productErrors.stock && <p className="seller-field-error">{productErrors.stock}</p>}
                </div>

                {/* ✅ ألوان المنتج */}
                <div className="seller-form-field seller-form-field-full">
                  <label>ألوان المنتج (اختياري)</label>

                  <div className="seller-variant-editor">
                    <div className="seller-variant-input-row">
                      <input
                        type="text"
                        value={colorLabelInput}
                        onChange={(e) => setColorLabelInput(e.target.value)}
                        placeholder="اسم اللون (مثال: أسود)"
                      />

                      <input
                        className="seller-variant-color-picker"
                        type="color"
                        value={colorHexInput}
                        onChange={(e) => setColorHexInput(e.target.value)}
                        aria-label="اختيار لون"
                        title="اختيار لون"
                      />

                      <button type="button" className="seller-variant-add-btn" onClick={addColor}>
                        إضافة
                      </button>
                    </div>

                    {variantColors.length > 0 && (
                      <div className="seller-variant-chips" aria-label="ألوان مضافة">
                        {variantColors.map((c) => (
                          <span key={c.key} className="seller-variant-chip">
                            <span
                              className="seller-variant-chip-dot"
                              style={{ backgroundColor: c.hex || "#e5e7eb" }}
                            />
                            <span className="seller-variant-chip-text">{c.label}</span>
                            <button
                              type="button"
                              className="seller-variant-chip-remove"
                              onClick={() => removeColor(c.key)}
                              aria-label={`حذف لون ${c.label}`}
                              title="حذف"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    <p className="seller-variant-hint">
                      ستظهر هذه الألوان للمشتري في صفحة تفاصيل المنتج.
                    </p>
                  </div>
                </div>

                {/* ✅ أحجام المنتج */}
                <div className="seller-form-field seller-form-field-full">
                  <label>أحجام المنتج (اختياري)</label>

                  <div className="seller-variant-editor">
                    <div className="seller-variant-input-row">
                      <input
                        type="text"
                        value={sizeLabelInput}
                        onChange={(e) => setSizeLabelInput(e.target.value)}
                        placeholder="اسم الحجم (مثال: S / M / L أو 42)"
                      />

                      <button type="button" className="seller-variant-add-btn" onClick={addSize}>
                        إضافة
                      </button>
                    </div>

                    {variantSizes.length > 0 && (
                      <div className="seller-variant-chips" aria-label="أحجام مضافة">
                        {variantSizes.map((s) => (
                          <span key={s.key} className="seller-variant-chip">
                            <span className="seller-variant-chip-text">{s.label}</span>
                            <button
                              type="button"
                              className="seller-variant-chip-remove"
                              onClick={() => removeSize(s.key)}
                              aria-label={`حذف حجم ${s.label}`}
                              title="حذف"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    <p className="seller-variant-hint">
                      استخدم الأحجام فقط إذا كان المنتج يتطلب ذلك.
                    </p>
                  </div>
                </div>

                <div className="seller-form-field">
                  <label>حالة المنتج</label>
                  <select
                    value={productForm.status}
                    onChange={(e) => handleProductFieldChange("status", e.target.value)}
                  >
                    <option value="active">نشط (يظهر في المتجر)</option>
                    <option value="inactive">غير نشط (مخفي عن المشترين)</option>
                  </select>
                </div>

                <div className="seller-form-field seller-form-field-full">
                  <label>
                    وصف المنتج <span className="required">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={productForm.description}
                    onChange={(e) => handleProductFieldChange("description", e.target.value)}
                    placeholder="اكتب وصفًا موجزًا وواضحًا عن المنتج..."
                  />
                  {productErrors.description && (
                    <p className="seller-field-error">{productErrors.description}</p>
                  )}
                </div>

                <div className="seller-form-field seller-form-field-full">
                  <div className="seller-image-cropper-scope">
                    <ImageCropper
                      value={imageItems}
                      onChange={setImageItems}
                      multiple={true}
                      label="صور المنتج"
                      helperText={
                        isEditMode
                          ? "يمكنك رفع صورة جديدة أو أكثر مع تكبيرها وتحريكها داخل الإطار. إذا لم تغيّر الصور ستبقى الصور الحالية كما هي."
                          : "يمكنك رفع صورة أو أكثر، مع تكبيرها وتحريكها داخل الإطار قبل الحفظ."
                      }
                    />
                  </div>

                  {sellerPreviewUrls.length > 0 && (
                    <div className="seller-buyer-preview-block">
                      <div className="seller-buyer-preview-title">
                        معاينة الصورة كما ستظهر للمشتري
                      </div>

                      <div className="seller-buyer-preview-grid">
                        {sellerPreviewUrls.map((src, idx) => (
                          <div className="seller-buyer-preview-item" key={`${idx}-${src}`}>
                            <img src={src} alt={`معاينة ${idx + 1}`} loading="lazy" />
                          </div>
                        ))}
                      </div>

                      <p className="seller-buyer-preview-hint">
                        هذه المعاينة تستخدم نفس أسلوب كروت المنتجات: قصّ تلقائي (cover) بدون فراغات.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <footer className="seller-modal-footer">
                <button type="button" className="seller-btn-ghost" onClick={handleModalCancel}>
                  إلغاء
                </button>
                <button type="submit" className="seller-btn-primary" disabled={isSavingProduct}>
                  {isSavingProduct
                    ? isEditMode
                      ? "جارٍ تحديث المنتج..."
                      : "جارٍ حفظ المنتج..."
                    : isEditMode
                    ? "تحديث المنتج"
                    : "حفظ المنتج"}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
