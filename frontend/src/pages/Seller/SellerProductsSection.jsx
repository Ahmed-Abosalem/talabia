// frontend/src/pages/Seller/SellerProductsSection.jsx
// قسم "إدارة المنتجات" في لوحة البائع

import "./SellerProductsSection.css";

import { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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

import { resolveImageUrl } from "@/utils/assetUtils";
import { makeSafeKey, ensureUniqueKey } from "@/utils/formUtils";

const parseVariantsForEditor = (rawVariants) => {
  const out = { colors: [], sizes: [], text: "" };

  if (!rawVariants) return out;

  let obj = null;

  // variants قد تأتي نصًا أو كائن JSON
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
  const location = useLocation();
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [isProductsLoading, setIsProductsLoading] = useState(false);
  const [isSavingProduct, setIsSavingProduct] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);

  const [productForm, setProductForm] = useState(initialProductForm);
  const [productErrors, setProductErrors] = useState({});
  const [productSearch, setProductSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);


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

        // تصفية قسم "الكل" لأنه قسم تجميعي ولا يجب إسناد المنتجات إليه مباشرة
        const normalizedCats = rawCategories
          .filter((cat) => {
            const slug = (cat.slug || "").toLowerCase();
            const name = (cat.name || "").trim();
            return slug !== "all" && name !== "الكل";
          })
          .map((cat) => ({
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
              typeof p.category === "object" ? p.category?.name : (p.categoryName || ""),
            brand: p.brand || "",
            variants: p.variants || "",
            status: isActive ? "active" : "inactive",
            autoDeactivated: !!p.autoDeactivated,
            lowStockThreshold: p.lowStockThreshold ?? 2,
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


  const openCreateModal = () => {
    navigate("/seller/products/add");
  };



  const handleToggleProductStatus = async (product) => {
    const newStatus = product.status === "active" ? "inactive" : "active";

    setProducts((prev) =>
      prev.map((p) =>
        p.id === product.id
          ? {
            ...p,
            status: newStatus,
            autoDeactivated: false,
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

  const handleDeleteProductClick = (product) => {
    setProductToDelete(product);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;

    try {
      await deleteSellerProduct(productToDelete.id);
      setProducts((prev) => prev.filter((p) => p.id !== productToDelete.id));
      if (showToast) showToast("تم حذف المنتج بنجاح.", "success");
    } catch (error) {
      if (showToast) {
        const message =
          error?.response?.data?.message || error?.message || "تعذّر حذف المنتج.";
        showToast(message, "error");
      }
    } finally {
      setIsDeleteModalOpen(false);
      setProductToDelete(null);
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
      <div className="seller-layout-container seller-products-container">
        <div className="seller-hero-action">
          <div className="seller-hero-info">
            <h3>إدارة المنتجات</h3>
            <p>إضافة، تعديل، وتغيير حالة عرض منتجات متجرك بكل سهولة.</p>
          </div>
          <button
            type="button"
            className="seller-hero-btn"
            onClick={() => navigate("/seller/products/add")}
          >
            <Package size={20} />
            <span>إضافة منتج جديد</span>
          </button>
        </div>

        <div className="seller-tool-bar">
          <div className="seller-search-box">
            <input
              type="text"
              placeholder="ابحث باسم المنتج..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
            />
            <Search className="search-icon" size={20} />
          </div>

          <div className="seller-filter-group">
            <div className="seller-modern-select-wrap">
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">كل الحالات</option>
                <option value="active">نشط</option>
                <option value="inactive">غير نشط</option>
              </select>
              <Filter className="filter-icon" size={16} />
            </div>
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
          <div className="seller-products-grid">
            {[...Array(6)].map((_, i) => (
              <div key={`skel-${i}`} className="platinum-skeleton platinum-skeleton--card" style={{ height: "140px", marginBottom: "0.7rem" }} />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="seller-empty platinum-stagger">
            <div className="seller-empty-icon-box">
              <Package size={48} strokeWidth={1.5} />
            </div>
            <h3>ابدأ رحلة النجاح</h3>
            <p>
              لم تقم بإضافة أي منتجات حتى الآن. شارك منتجاتك مع عملائك وابدأ في تحقيق المبيعات اليوم!
            </p>
            <button
              type="button"
              className="seller-hero-btn"
              onClick={() => navigate("/seller/products/add")}
              style={{ marginTop: "1rem" }}
            >
              <Package size={20} />
              <span>إضافة أول منتج</span>
            </button>
          </div>
        ) : (
          <div className="seller-products-grid">
            {filteredProducts.map((product) => (
              <article key={product.id} className="seller-product-card">
                <div className="seller-product-layout">
                  <div className="seller-product-image-col">
                    <div className="seller-product-image-frame">
                      {product.images && product.images.length > 0 ? (
                        <img
                          src={resolveImageUrl(product.images[0])}
                          alt={product.name}
                          loading="lazy"
                        />
                      ) : (
                        <div className="seller-product-image-placeholder">
                          <ImageIcon size={24} />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="seller-product-upper">
                    <div className="seller-product-upper-main">
                      <div className="seller-product-title-block">
                        <h3 className="seller-product-name">{product.name}</h3>
                        <p className="seller-product-desc">
                          {product.description || "لا يوجد وصف"}
                        </p>
                        {product.brand && (
                          <span className="seller-product-line-sub">
                            {product.brand}
                          </span>
                        )}
                      </div>

                      <div className="seller-product-status-column">
                        <span
                          className={`seller-product-status-chip ${product.status === "active" ? "is-active" : "is-inactive"
                            }`}
                        >
                          {product.autoDeactivated ? "نفذ (تعطيل آلي)" : product.status === "active" ? "نشط" : "غير نشط"}
                        </span>
                        {product.status === "active" && product.stock <= product.lowStockThreshold && product.stock > 0 && (
                          <span className="seller-product-status-chip is-warning">
                            تحذير: مخزون منخفض
                          </span>
                        )}
                        <div className="seller-product-actions-icons">
                          <button
                            type="button"
                            className="seller-icon-circle-btn"
                            title="تعديل"
                            onClick={() => navigate(`/seller/products/edit/${product.id}`)}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            className="seller-icon-circle-btn seller-icon-circle-danger"
                            title="حذف"
                            onClick={() => handleDeleteProductClick(product)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="seller-product-lower">
                    <div className="seller-product-meta-strip">
                      <div className="seller-product-meta">
                        <span className="seller-meta-label">السعر</span>
                        <span className="seller-meta-value">
                          {product.price} ر.ي
                        </span>
                      </div>
                      <div className="seller-product-meta-divider" />
                      <div className="seller-product-meta">
                        <span className="seller-meta-label">المخزون</span>
                        <span className="seller-meta-value">
                          {product.stock} {product.unitLabel}
                        </span>
                      </div>
                      <div className="seller-product-meta-divider" />
                      <div className="seller-product-meta">
                        <span className="seller-meta-label">القسم</span>
                        <span className="seller-meta-value">
                          {product.categoryName || "—"}
                        </span>
                      </div>
                    </div>

                    <div className="seller-product-actions-line">
                      <button
                        type="button"
                        className={`seller-product-toggle-btn ${product.status === "active" ? "is-on" : "is-off"
                          }`}
                        onClick={() => handleToggleProductStatus(product)}
                      >
                        {product.status === "active" ? (
                          <>
                            <CheckCircle2 />
                            <span>مفعل للبيع</span>
                          </>
                        ) : (
                          <>
                            <XCircle />
                            <span>إيقاف مؤقت</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

      </div>

      {/* ─── Deletion Confirmation Modal ─── */}
      {isDeleteModalOpen && (
        <div className="seller-confirm-backdrop" onClick={() => setIsDeleteModalOpen(false)}>
          <div className="seller-confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="seller-confirm-body">
              <div className="seller-confirm-icon-box">
                <Trash2 size={28} />
              </div>
              <h3 className="seller-confirm-title">تأكيد حذف المنتج</h3>
              <p className="seller-confirm-text">
                هل أنت متأكد من رغبتك في حذف المنتج <span className="seller-confirm-target">"{productToDelete?.name}"</span>؟
                هذا الإجراء لا يمكن التراجع عنه.
              </p>
            </div>
            <div className="seller-confirm-footer">
              <button
                className="seller-confirm-btn seller-confirm-btn--cancel"
                onClick={() => setIsDeleteModalOpen(false)}
              >
                تراجع
              </button>
              <button
                className="seller-confirm-btn seller-confirm-btn--delete"
                onClick={handleConfirmDelete}
              >
                حذف الآن
              </button>
            </div>
          </div>
        </div>
      )}
    </section >
  );
}
