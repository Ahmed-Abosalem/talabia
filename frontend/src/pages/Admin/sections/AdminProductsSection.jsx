// frontend/src/pages/Admin/sections/AdminProductsSection.jsx
// قسم إدارة المنتجات في لوحة الأدمن لمنصة طلبية (Talabia)
// منطق + JSX فقط (التنسيقات في ملف CSS مستقل)

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Package,
  Store,
  Layers,
  Search,
  Filter,
  Eye,
  EyeOff,
  Trash2,
  RefreshCw,
  X,
  Star,
  ShoppingBag,
  Heart,
  Clock,
  XCircle,
  ListChecks,
  Image as ImageIcon,
} from "lucide-react";
// ✅ تعديل هنا: استخدام خدمات الأدمن بدلاً من productService
import {
  getAdminProducts as listAdminProducts,
  getAdminProductDetails,
  updateProductStatus as updateProductStatusByAdmin,
  updateProductFeatureStatus, // ✅ استيراد الدالة الجديدة
  deleteProductAsAdmin,
} from "@/services/adminService";
import { listCategories } from "@/services/categoryService";
import { formatCurrency, formatDate, formatNumber } from "@/utils/formatters";
import { useApp } from "@/context/AppContext";
import useGrabScroll from "@/hooks/useGrabScroll";

import "./AdminProductsSection.css";

// نفس منطق حل الصور المستخدم في لوحة البائع
const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "";

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



export default function AdminProductsSection() {
  const { showToast } = useApp() || {};
  const navigate = useNavigate();
  const scrollRef = useGrabScroll();

  const [isLoading, setIsLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  // ✅ باراميترات الصفحات (Pagination Status)
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterFeatured, setFilterFeatured] = useState("all");
  const [sortBySales, setSortBySales] = useState("none");

  const [togglingIds, setTogglingIds] = useState({});
  const [togglingFeatureIds, setTogglingFeatureIds] = useState({}); // loading state for feature toggle
  const [deletingIds, setDeletingIds] = useState({});

  // حالة للتعديل السريع لترتيب المميز
  const [editingOrderProductId, setEditingOrderProductId] = useState(null);
  const [editingOrderValue, setEditingOrderValue] = useState("");

  // نافذة التفاصيل
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setIsLoading(true);

        // ✅ إرسال كافة باراميترات الفلترة والبحث للسيرفر (Server-side Filtering & Pagination)
        const params = {
          page: currentPage,
          limit: 20,
        };

        if (searchQuery.trim()) params.search = searchQuery.trim();
        if (filterStatus !== "all") params.status = filterStatus;
        if (filterCategory) params.storeId = filterCategory; // في السيرفر storeId يستخدم كبديل للقسم حالياً أو للتوسعة
        if (filterCategory) params.category = filterCategory;

        if (filterFeatured !== "all") {
          params.featured = filterFeatured === "true";
        }

        const [productsRes, categoriesRes] = await Promise.all([
          listAdminProducts(params),
          listCategories(),
        ]);

        if (!isMounted) return;

        const rawProducts = Array.isArray(productsRes)
          ? productsRes
          : Array.isArray(productsRes?.products)
            ? productsRes.products
            : [];

        const mappedProducts = rawProducts.map((p) => {
          const imageUrls = Array.isArray(p.images)
            ? p.images
              .map((img) => (typeof img === "string" ? img : img?.url))
              .filter(Boolean)
            : [];

          const rawStatus =
            typeof p.status === "string"
              ? p.status
              : p.isActive === false
                ? "inactive"
                : "active";

          const isActive =
            typeof p.isActive === "boolean"
              ? p.isActive
              : rawStatus === "active";

          const adminLocked = !!p.adminLocked;
          const autoDeactivated = !!p.autoDeactivated;

          let statusLabel = "";
          if (adminLocked) {
            statusLabel = "محجوب من الإدارة";
          } else if (autoDeactivated) {
            statusLabel = "نفذ (تعطيل آلي)";
          } else if (!isActive) {
            statusLabel = "مخفي من البائع";
          } else {
            statusLabel = "نشط";
          }

          return {
            id: p._id,
            name: p.name || "",
            description: p.description || "",
            price: p.price ?? 0,
            stock: p.stock ?? 0,
            unitLabel: p.unitLabel || "",
            categoryId:
              typeof p.category === "string"
                ? p.category
                : p.category?._id || "",
            categoryName:
              typeof p.category === "string" ? "" : p.category?.name || "",
            brand: p.brand || "",
            variants: p.variants || "",
            returnPolicy: p.returnPolicy || "",
            rating: typeof p.rating === "number" ? p.rating : 0,
            numReviews: typeof p.numReviews === "number" ? p.numReviews : 0,
            status: rawStatus,
            isActive,
            adminLocked,
            autoDeactivated,
            lowStockThreshold: p.lowStockThreshold ?? 2,
            statusLabel,
            storeName: p.store?.name || "—",
            images: imageUrls,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
            // عدد الوحدات المباعة
            salesCount: typeof p.salesCount === "number" ? p.salesCount : 0,
            // بيانات التميز
            isFeatured: !!p.isFeatured,
            featuredOrder: typeof p.featuredOrder === 'number' ? p.featuredOrder : 0,
            // عداد المشاهدات
            viewsCount: typeof p.viewsCount === "number" ? p.viewsCount : 0,
          };
        });

        const rawCategories = Array.isArray(categoriesRes)
          ? categoriesRes
          : Array.isArray(categoriesRes?.categories)
            ? categoriesRes.categories
            : [];

        const mappedCategories = rawCategories.map((c) => ({
          id: c._id,
          name: c.name,
        }));

        setProducts(mappedProducts);
        setCategories(mappedCategories);

        // ✅ حفظ بيانات الصفحات
        if (productsRes?.pages) setTotalPages(productsRes.pages);
        if (productsRes?.totalCount) setTotalProducts(productsRes.totalCount);
        if (productsRes?.page) setCurrentPage(productsRes.page);
      } catch (error) {
        if (showToast) {
          const msg =
            error?.response?.data?.message ||
            error?.message ||
            "تعذّر تحميل قائمة المنتجات. حاول مرة أخرى.";
          showToast(msg, "error");
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [showToast, filterFeatured, currentPage, filterStatus, filterCategory, searchQuery, sortBySales]);

  const filteredProducts = useMemo(() => {
    // بما أن الفلترة والبحث أصبحت تتم في السيرفر، فنحن نعرض المصفوفة كما هي.
    // نحافظ على الترتيب حسب المبيعات كخطوة أخيرة في الفرونت إذا لزم (أو يمكن نقلها للسيرفر مستقبلاً)
    let list = [...products];

    if (sortBySales === "most") {
      list.sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0));
    } else if (sortBySales === "least") {
      list.sort((a, b) => (a.salesCount || 0) - (b.salesCount || 0));
    }

    return list;
  }, [products, sortBySales]);

  const totalCount = totalProducts || products.length;
  const activeCount = products.filter(
    (p) => p.isActive && !p.adminLocked && !p.autoDeactivated
  ).length;
  const inactiveCount = products.filter(
    (p) => !p.isActive || p.adminLocked || p.autoDeactivated
  ).length;
  const featuredCount = products.filter((p) => p.isFeatured).length;

  const handleToggleStatus = async (product) => {
    // If product is auto-deactivated, admin can't activate it directly.
    // Admin can only override adminLocked status.
    // If adminLocked is true, admin can unlock it.
    // If adminLocked is false, admin can lock it.
    // Auto-deactivated status is based on stock and cannot be directly toggled by admin.
    if (product.autoDeactivated) {
      showToast("لا يمكن تفعيل منتج تم تعطيله آليًا بسبب نفاد المخزون.", "info");
      return;
    }

    const newAdminLockedStatus = !product.adminLocked; // Toggle adminLocked status

    setTogglingIds((prev) => ({ ...prev, [product.id]: true }));

    // تحديث متفائل
    setProducts((prev) =>
      prev.map((p) =>
        p.id === product.id
          ? {
            ...p,
            adminLocked: newAdminLockedStatus,
            statusLabel: newAdminLockedStatus
              ? "محجوب من الإدارة"
              : p.autoDeactivated
                ? "نفذ (تعطيل آلي)"
                : p.isActive
                  ? "نشط"
                  : "مخفي من البائع",
          }
          : p
      )
    );

    try {
      // The API call should reflect the admin's action on adminLocked status
      // Assuming updateProductStatusByAdmin can handle setting adminLocked directly
      await updateProductStatusByAdmin(product.id, { adminLocked: newAdminLockedStatus });
      if (showToast) {
        showToast(
          newAdminLockedStatus
            ? "تم حجب المنتج من قبل الإدارة."
            : "تم إلغاء حجب المنتج من قبل الإدارة.",
          "success"
        );
      }
    } catch (error) {
      // رجوع للحالة السابقة عند الفشل
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...product } : p))
      );

      if (showToast) {
        const msg =
          error?.response?.data?.message ||
          error?.message ||
          "تعذّر تحديث حالة المنتج.";
        showToast(msg, "error");
      }
    } finally {
      setTogglingIds((prev) => ({ ...prev, [product.id]: false }));
    }
  };

  // ✅ دالة التعامل مع التميز (Toggle / Update Order)
  const handleToggleFeatured = async (product) => {
    if (togglingFeatureIds[product.id]) return;

    const newIsFeatured = !product.isFeatured;
    setTogglingFeatureIds(prev => ({ ...prev, [product.id]: true }));

    // تحديث متفائل (بدون Order مبدئياً حتى يأتي من السيرفر)
    const oldState = { ...product };
    setProducts(prev => prev.map(p =>
      p.id === product.id ? { ...p, isFeatured: newIsFeatured } : p
    ));

    try {
      // استدعاء السيرفر
      // عند التفعيل: نرسل isFeatured: true (السيرفر يحدد الترتيب تلقائياً)
      // عند الإلغاء: نرسل isFeatured: false
      const res = await updateProductFeatureStatus(product.id, {
        isFeatured: newIsFeatured
      });

      // تحديث الحالة بالبيانات الحقيقية من السيرفر (خاصة الترتيب)
      setProducts(prev => prev.map(p =>
        p.id === product.id ? {
          ...p,
          isFeatured: res.isFeatured,
          featuredOrder: res.featuredOrder
        } : p
      ));

      if (showToast) {
        showToast(res.message, "success");
      }

    } catch (error) {
      // تراجع
      setProducts(prev => prev.map(p => p.id === product.id ? oldState : p));
      if (showToast) showToast(error?.message || "فشلت العملية", "error");
    } finally {
      setTogglingFeatureIds(prev => ({ ...prev, [product.id]: false }));
    }
  };

  // تحديث الترتيب عند تغيير الرقم
  const handleUpdateFeaturedOrder = async (productId, newOrderVal) => {
    const val = parseInt(newOrderVal);
    if (isNaN(val) || val < 1) {
      if (showToast) showToast("يجب أن يكون الترتيب 1 أو أكثر", "error");
      return;
    }

    setTogglingFeatureIds(prev => ({ ...prev, [productId]: true }));
    try {
      const res = await updateProductFeatureStatus(productId, {
        isFeatured: true,
        featuredOrder: val
      });

      setProducts(prev => prev.map(p =>
        p.id === productId ? { ...p, featuredOrder: res.featuredOrder } : p
      ));

      setEditingOrderProductId(null);
      setEditingOrderValue("");
      if (showToast) showToast("تم تحديث الترتيب", "success");

    } catch (error) {
      if (showToast) showToast(error?.message || "فشل تحديث الترتيب", "error");
    } finally {
      setTogglingFeatureIds(prev => ({ ...prev, [productId]: false }));
    }
  };

  const handleDelete = async (product) => {
    const confirmed = window.confirm(
      `هل أنت متأكد من حذف المنتج "${product.name}"؟ لا يمكن التراجع عن هذه العملية.`
    );
    if (!confirmed) return;

    setDeletingIds((prev) => ({ ...prev, [product.id]: true }));

    try {
      await deleteProductAsAdmin(product.id);
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
      if (showToast) {
        showToast("تم حذف المنتج بنجاح من قبل الإدارة.", "success");
      }
    } catch (error) {
      if (showToast) {
        const msg =
          error?.response?.data?.message ||
          error?.message ||
          "تعذّر حذف المنتج.";
        showToast(msg, "error");
      }
    } finally {
      setDeletingIds((prev) => ({ ...prev, [product.id]: false }));
    }
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setFilterCategory("");
    setFilterStatus("all");
    setFilterFeatured("all");
    setSortBySales("none");
    setCurrentPage(1); // العودة للصفحة الأولى
  };

  // الانتقال لصفحة التفاصيل الجديدة
  const openDetailsModal = (product) => {
    navigate(`/admin/products/details/${product.id || product._id}`);
  };

  // إخفاء نافذة التعديل السريع
  const closeEditOrder = () => {
    setEditingOrderProductId(null);
    setEditingOrderValue("");
  };


  return (
    <section className="adm-section-panel">
      <header className="adm-section-inner-header">
        <div className="adm-section-icon">
          <Package size={22} />
        </div>
        <div className="adm-section-title-group">
          <h2 className="adm-section-title">إدارة المنتجات</h2>
          <p className="adm-section-subtitle">
            الإشراف على المنتجات المضافة من قِبل البائعين، وحجب أو حذف المخالف منها.
          </p>
        </div>
      </header>

      <div className="adm-stats-grid">
        <div className="adm-stat-card">
          <div className="adm-stat-icon">
            <Package size={20} />
          </div>
          <div className="adm-stat-content">
            <div className="adm-stat-label">إجمالي المنتجات</div>
            <div className="adm-stat-value">{formatNumber(totalCount)}</div>
          </div>
        </div>
        <div className="adm-stat-card">
          <div className="adm-stat-icon" style={{ background: '#dcfce7', color: 'var(--adm-success)' }}>
            <ListChecks size={20} />
          </div>
          <div className="adm-stat-content">
            <div className="adm-stat-label">المنتجات النشطة</div>
            <div className="adm-stat-value" style={{ color: 'var(--adm-success)' }}>
              {formatNumber(activeCount)}
            </div>
          </div>
        </div>
        <div className="adm-stat-card">
          <div className="adm-stat-icon" style={{ background: '#fee2e2', color: 'var(--adm-danger)' }}>
            <XCircle size={20} />
          </div>
          <div className="adm-stat-content">
            <div className="adm-stat-label">الموقوفة / المحجوبة</div>
            <div className="adm-stat-value" style={{ color: 'var(--adm-danger)' }}>
              {formatNumber(inactiveCount)}
            </div>
          </div>
        </div>
        <div className="adm-stat-card">
          <div className="adm-stat-icon" style={{ background: '#fef3c7', color: 'var(--adm-warning)' }}>
            <Star size={20} />
          </div>
          <div className="adm-stat-content">
            <div className="adm-stat-label">منتجات مميزة</div>
            <div className="adm-stat-value" style={{ color: 'var(--adm-warning)' }}>
              {formatNumber(featuredCount)}
            </div>
          </div>
        </div>
      </div>

      <div className="adm-toolbar">
        <div className="adm-search-wrapper">
          <Search size={16} className="adm-search-icon" />
          <input
            type="text"
            className="adm-search-input"
            placeholder="بحث باسم المنتج، المتجر، التصنيف..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="adm-section-actions">
          <select
            className="adm-filter-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">كل الحالات</option>
            <option value="active">نشط</option>
            <option value="inactive">غير نشط / محجوب</option>
          </select>

          <select
            className="adm-filter-select"
            value={filterFeatured}
            onChange={(e) => setFilterFeatured(e.target.value)}
          >
            <option value="all">كل المنتجات</option>
            <option value="true">المميزة فقط ⭐</option>
            <option value="false">غير المميزة</option>
          </select>

          <select
            className="adm-filter-select"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="">كل التصنيفات</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          <select
            className="adm-filter-select"
            value={sortBySales}
            onChange={(e) => setSortBySales(e.target.value)}
          >
            <option value="none">بدون ترتيب</option>
            <option value="most">الأكثر مبيعاً</option>
            <option value="least">الأقل مبيعاً</option>
          </select>

          <button
            type="button"
            className="adm-btn ghost"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            onClick={handleResetFilters}
          >
            <RefreshCw size={14} />
            <span>إعادة التعيين</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="adm-loading">
          <RefreshCw size={24} className="spin" />
          <p>جاري تحميل المنتجات...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="adm-empty-msg">
          <div className="admin-empty-icon">
            <Package size={32} />
          </div>
          <h3>لا توجد منتجات مطابقة للبحث / الفلاتر الحالية</h3>
          <p>جرّب تعديل معايير البحث أو إعادة تعيين الفلاتر.</p>
        </div>
      ) : (
        <div className="adm-table-wrapper" ref={scrollRef}>
          <table className="adm-table">
            <thead>
              <tr>
                <th>المنتج</th>
                <th>المتجر</th>
                <th>التصنيف</th>
                <th>السعر</th>
                <th>المخزون</th>
                <th style={{ textAlign: "center" }}>تميز / ترتيب</th>
                <th style={{ textAlign: "center" }}>المشاهدات</th>
                <th style={{ textAlign: "center" }}>المبيعات</th>
                <th>الحالة</th>
                <th style={{ textAlign: "center" }}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => {
                const thumbUrl =
                  product.images && product.images.length
                    ? resolveImageUrl(product.images[0])
                    : "";

                const categoryLabel =
                  product.categoryName ||
                  categories.find((c) => c.id === product.categoryId)?.name ||
                  "";

                const statusConfig = product.adminLocked
                  ? { cls: "inactive", label: "محجوب" }
                  : product.autoDeactivated
                    ? { cls: "inactive", label: "نفد" }
                    : product.isActive
                      ? { cls: "active", label: "نشط" }
                      : { cls: "inactive", label: "مخفي" };

                const sales = Number(product.salesCount || 0);

                return (
                  <tr key={product.id}>
                    <td>
                      <div
                        className="adm-table-main clickable"
                        onClick={() => openDetailsModal(product)}
                      >
                        <div className="global-product-frame is-thumbnail">
                          {thumbUrl ? (
                            <img
                              src={thumbUrl}
                              alt={product.name}
                              loading="lazy"
                            />
                          ) : (
                            <div className="adm-placeholder-box">
                              <Package size={16} />
                            </div>
                          )}
                        </div>
                        <div className="adm-product-info">
                          <div className="adm-product-name">
                            {product.name}
                          </div>
                          <div className="adm-product-meta">
                            {product.brand && (
                              <span className="adm-meta-text">
                                {product.brand}
                              </span>
                            )}
                            {product.unitLabel && (
                              <span className="adm-meta-text">
                                • {product.unitLabel}
                              </span>
                            )}
                            {product.rating > 0 && (
                              <span className="adm-meta-text" style={{ color: '#f59e0b' }}>
                                <Star size={11} fill="#f59e0b" />{" "}
                                {product.rating.toFixed(1)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="adm-chip store">
                        <Store size={14} />
                        <span>{product.storeName}</span>
                      </div>
                    </td>
                    <td>
                      <div className="adm-chip category">
                        <Layers size={14} />
                        <span>{categoryLabel || "—"}</span>
                      </div>
                    </td>
                    <td>
                      {formatCurrency(product.price)}
                    </td>
                    {/* عمود المخزون */}
                    <td>
                      <strong>{formatNumber(product.stock)}</strong>{" "}
                      <span className="adm-text-muted" style={{ fontSize: '0.75rem' }}>وحدة</span>
                      {product.isActive && !product.adminLocked && product.stock <= product.lowStockThreshold && product.stock > 0 && (
                        <div className="adm-notice-text danger" style={{ fontSize: "10px", marginTop: '2px' }}>
                          (مخزون منخفض)
                        </div>
                      )}
                    </td>

                    {/* عمود التميز / الترتيب */}
                    <td style={{ textAlign: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                        <button
                          type="button"
                          className={`adm-star-btn ${product.isFeatured ? "active" : ""}`}
                          onClick={() => handleToggleFeatured(product)}
                          disabled={togglingFeatureIds[product.id]}
                          title={product.isFeatured ? "إلغاء التميز" : "تفعيل التميز"}
                        >
                          <Star
                            size={18}
                            fill={product.isFeatured ? "var(--adm-accent-solid)" : "none"}
                            color={product.isFeatured ? "var(--adm-accent-solid)" : "var(--adm-text-soft)"}
                            strokeWidth={product.isFeatured ? 0 : 2}
                          />
                        </button>

                        {product.isFeatured && (
                          editingOrderProductId === product.id ? (
                            <input
                              type="number"
                              min="1"
                              className="adm-order-input"
                              autoFocus
                              value={editingOrderValue}
                              onChange={(e) => setEditingOrderValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleUpdateFeaturedOrder(product.id, editingOrderValue);
                                if (e.key === "Escape") setEditingOrderProductId(null);
                              }}
                              onBlur={() => {
                                if (editingOrderValue && editingOrderValue !== String(product.featuredOrder)) {
                                  handleUpdateFeaturedOrder(product.id, editingOrderValue);
                                } else {
                                  setEditingOrderProductId(null);
                                }
                              }}
                            />
                          ) : (
                            <span
                              className="adm-order-badge"
                              onClick={() => {
                                setEditingOrderProductId(product.id);
                                setEditingOrderValue(String(product.featuredOrder));
                              }}
                              title="اضغط لتعديل الترتيب"
                            >
                              {product.featuredOrder}
                            </span>
                          )
                        )}
                      </div>
                    </td>
                    {/* عمود المشاهدات */}
                    <td style={{ textAlign: "center" }}>
                      <span className="admin-views-pill">
                        <Eye size={12} />
                        <span>{formatNumber(product.viewsCount)}</span>
                      </span>
                    </td>
                    {/* عمود المبيعات */}
                    <td style={{ textAlign: "center" }}>
                      <span className="admin-sales-pill">
                        <ShoppingBag size={12} />
                        <span>{formatNumber(sales)}</span>
                      </span>
                    </td>
                    <td>
                      <span className={`adm-status-chip ${statusConfig.cls}`}>
                        <span className="adm-status-dot"></span>
                        {statusConfig.label}
                      </span>
                    </td>
                    <td>
                      <div className="adm-table-actions">
                        <button
                          type="button"
                          className="adm-icon-btn primary"
                          onClick={() => openDetailsModal(product)}
                          title="عرض التفاصيل"
                        >
                          <Search size={14} />
                        </button>

                        <button
                          type="button"
                          className={`adm-icon-btn ${product.isActive ? 'muted' : 'success'}`}
                          disabled={!!togglingIds[product.id]}
                          onClick={() => handleToggleStatus(product)}
                          title={
                            product.isActive
                              ? "إيقاف / حجب المنتج"
                              : "تفعيل المنتج"
                          }
                        >
                          {product.isActive ? (
                            <EyeOff size={14} />
                          ) : (
                            <Eye size={14} />
                          )}
                        </button>

                        <button
                          type="button"
                          className="adm-icon-btn danger"
                          disabled={!!deletingIds[product.id]}
                          onClick={() => handleDelete(product)}
                          title="حذف المنتج نهائيًا"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ✅ شريط التنقل بين الصفحات (Pagination Controls) */}
      {!isLoading && filteredProducts.length > 0 && totalPages > 1 && (
        <div className="adm-pagination">
          <div className="adm-pagination-info">
            عرض {((currentPage - 1) * 20) + 1} - {Math.min(currentPage * 20, totalProducts)} من أصل {formatNumber(totalProducts)} منتج
          </div>
          <div className="adm-pagination-actions">
            <button
              type="button"
              className="adm-btn outline"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            >
              السابق
            </button>
            <span className="adm-pagination-current">
              صفحة {currentPage} من {totalPages}
            </span>
            <button
              type="button"
              className="adm-btn outline"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            >
              التالي
            </button>
          </div>
        </div>
      )}

    </section>
  );
}
