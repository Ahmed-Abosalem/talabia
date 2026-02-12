// frontend/src/pages/Admin/sections/AdminProductsSection.jsx
// قسم إدارة المنتجات في لوحة الأدمن لمنصة طلبية (Talabia)
// منطق + JSX فقط (التنسيقات في ملف CSS مستقل)

import { useEffect, useMemo, useState } from "react";
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
} from "lucide-react";
// ✅ تعديل هنا: استخدام خدمات الأدمن بدلاً من productService
import {
  getAdminProducts as listAdminProducts,
  getAdminProductDetails,
  updateProductStatus as updateProductStatusByAdmin,
  deleteProductAsAdmin,
} from "@/services/adminService";
import { listCategories } from "@/services/categoryService";
import { useApp } from "@/context/AppContext";

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

const formatDateTime = (value) => {
  if (!value) return "—";
  try {
    const d = new Date(value);
    return d.toLocaleString("ar-SA");
  } catch {
    return "—";
  }
};

export default function AdminProductsSection() {
  const { showToast } = useApp() || {};

  const [isLoading, setIsLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBySales, setSortBySales] = useState("none"); // ترتيب حسب المبيعات

  const [togglingIds, setTogglingIds] = useState({});
  const [deletingIds, setDeletingIds] = useState({});

  // نافذة التفاصيل
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [details, setDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setIsLoading(true);

        const [productsRes, categoriesRes] = await Promise.all([
          listAdminProducts(), // API الأدمن
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

          let statusLabel = "";
          if (adminLocked) {
            statusLabel = "محجوب من الإدارة";
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
            statusLabel,
            storeName: p.store?.name || "—",
            images: imageUrls,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
            // عدد الوحدات المباعة
            salesCount: typeof p.salesCount === "number" ? p.salesCount : 0,
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
  }, [showToast]);

  const filteredProducts = useMemo(() => {
    // 1) الفلترة
    let list = products.filter((p) => {
      if (filterCategory && p.categoryId !== filterCategory) return false;

      if (filterStatus === "active") {
        if (!(p.isActive && !p.adminLocked)) return false;
      } else if (filterStatus === "inactive") {
        if (p.isActive && !p.adminLocked) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const haystack = [
          p.name,
          p.brand,
          p.description,
          p.storeName,
          p.categoryName,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(q)) return false;
      }

      return true;
    });

    // 2) الترتيب حسب المبيعات
    if (sortBySales === "most") {
      list = [...list].sort(
        (a, b) => (b.salesCount || 0) - (a.salesCount || 0)
      );
    } else if (sortBySales === "least") {
      list = [...list].sort(
        (a, b) => (a.salesCount || 0) - (b.salesCount || 0)
      );
    }

    return list;
  }, [products, searchQuery, filterCategory, filterStatus, sortBySales]);

  const totalCount = products.length;
  const activeCount = products.filter(
    (p) => p.isActive && !p.adminLocked
  ).length;
  const inactiveCount = products.filter(
    (p) => !p.isActive || p.adminLocked
  ).length;

  const handleToggleStatus = async (product) => {
    const newStatus = product.isActive ? "inactive" : "active";

    setTogglingIds((prev) => ({ ...prev, [product.id]: true }));

    // تحديث متفائل
    setProducts((prev) =>
      prev.map((p) =>
        p.id === product.id
          ? {
              ...p,
              status: newStatus,
              isActive: newStatus === "active",
              adminLocked: newStatus === "inactive",
              statusLabel:
                newStatus === "active"
                  ? "نشط"
                  : "محجوب من الإدارة", // من الأدمن دائمًا
            }
          : p
      )
    );

    try {
      await updateProductStatusByAdmin(product.id, newStatus);
      if (showToast) {
        showToast("تم تحديث حالة المنتج من قبل الإدارة.", "success");
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
    setSortBySales("none");
  };

  // فتح نافذة التفاصيل
  const openDetailsModal = async (product) => {
    setSelectedProduct(product);
    setIsDetailsOpen(true);
    setDetails(null);
    setDetailsError("");

    try {
      setDetailsLoading(true);
      const res = await getAdminProductDetails(product.id);
      const d = res?.product || res;
      setDetails(d);
    } catch (error) {
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        "تعذّر تحميل تفاصيل المنتج.";
      setDetailsError(msg);
      if (showToast) showToast(msg, "error");
    } finally {
      setDetailsLoading(false);
    }
  };

  const closeDetailsModal = () => {
    setIsDetailsOpen(false);
    setSelectedProduct(null);
    setDetails(null);
    setDetailsError("");
  };

  const modalData = details || selectedProduct || null;

  return (
    <section className="admin-section">
      <header className="admin-section-header">
        <div>
          <h2>إدارة المنتجات</h2>
          <p>
            من هنا يمكن للإدارة الإشراف على جميع المنتجات المضافة من قِبل
            البائعين، وتعديل حالة ظهورها أو حذف المخالف منها، مع إمكانية
            مراجعة تفاصيل كل منتج.
          </p>
        </div>
        <div className="admin-section-stats">
          <div className="admin-stat-pill">
            <span className="admin-stat-label">إجمالي المنتجات</span>
            <span className="admin-stat-value">{totalCount}</span>
          </div>
          <div className="admin-stat-pill">
            <span className="admin-stat-label">المنتجات النشطة</span>
            <span className="admin-stat-value admin-stat-green">
              {activeCount}
            </span>
          </div>
          <div className="admin-stat-pill">
            <span className="admin-stat-label">
              المنتجات الموقوفة / المحجوبة
            </span>
            <span className="admin-stat-value admin-stat-amber">
              {inactiveCount}
            </span>
          </div>
        </div>
      </header>

      <div className="admin-toolbar">
        <div className="admin-search">
          <Search size={16} />
          <input
            type="text"
            placeholder="بحث باسم المنتج، المتجر، التصنيف..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="admin-toolbar-right">
          <div className="admin-filter-group">
            <div className="admin-select">
              <Filter size={14} />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">كل الحالات</option>
                <option value="active">نشط</option>
                <option value="inactive">غير نشط / محجوب</option>
              </select>
            </div>

            <div className="admin-select">
              <Layers size={14} />
              <select
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
            </div>

            {/* فلتر ترتيب حسب المبيعات */}
            <div className="admin-select">
              <ShoppingBag size={14} />
              <select
                value={sortBySales}
                onChange={(e) => setSortBySales(e.target.value)}
              >
                <option value="none">بدون ترتيب</option>
                <option value="most">الأكثر مبيعاً</option>
                <option value="least">الأقل مبيعاً</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            className="admin-btn-ghost"
            onClick={handleResetFilters}
          >
            <RefreshCw size={14} />
            <span>إعادة التعيين</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="admin-empty">
          <p>جاري تحميل المنتجات...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="admin-empty">
          <div className="admin-empty-icon">
            <Package size={22} />
          </div>
          <h3>لا توجد منتجات مطابقة للبحث / الفلاتر الحالية</h3>
          <p>جرّب تعديل معايير البحث أو إعادة تعيين الفلاتر.</p>
        </div>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>المنتج</th>
                <th>المتجر</th>
                <th>التصنيف</th>
                <th>السعر</th>
                <th>المخزون</th>
                <th>المبيعات</th>
                <th>الحالة</th>
                <th>إجراءات</th>
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

                const statusClass =
                  product.adminLocked
                    ? "admin-status-badge admin-status-locked"
                    : product.isActive
                    ? "admin-status-badge admin-status-active"
                    : "admin-status-badge admin-status-inactive";

                const sales = Number(product.salesCount || 0);

                return (
                  <tr key={product.id}>
                    <td>
                      <div
                        className="admin-table-main admin-table-main-clickable"
                        onClick={() => openDetailsModal(product)}
                      >
                        <div className="admin-product-thumb">
                          {thumbUrl ? (
                            <img
                              src={thumbUrl}
                              alt={product.name}
                              loading="lazy"
                            />
                          ) : (
                            <div className="admin-product-thumb-placeholder">
                              <Package size={16} />
                            </div>
                          )}
                        </div>
                        <div className="admin-product-info">
                          <div className="admin-product-name">
                            {product.name}
                          </div>
                          <div className="admin-product-meta">
                            {product.brand && (
                              <span className="admin-product-brand">
                                {product.brand}
                              </span>
                            )}
                            {product.unitLabel && (
                              <span className="admin-product-unit">
                                • {product.unitLabel}
                              </span>
                            )}
                            {product.rating > 0 && (
                              <span className="admin-product-rating">
                                <Star size={11} />{" "}
                                {product.rating.toFixed(1)} ({product.numReviews}{" "}
                                مراجعة)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="admin-chip admin-chip-store">
                        <Store size={14} />
                        <span>{product.storeName}</span>
                      </div>
                    </td>
                    <td>
                      <div className="admin-chip admin-chip-category">
                        <Layers size={14} />
                        <span>{categoryLabel || "—"}</span>
                      </div>
                    </td>
                    <td>
                      {Number(product.price).toLocaleString()} <span>ر.ي</span>
                    </td>
                    {/* عمود المخزون */}
                    <td>
                      <span className="admin-stock-value">
                        {Number(product.stock).toLocaleString()}
                      </span>{" "}
                      <span className="admin-stock-unit">وحدة</span>
                    </td>
                    {/* عمود المبيعات */}
                    <td>
                      <span className="admin-sales-pill">
                        <ShoppingBag size={12} />
                        <span>{sales.toLocaleString()}</span>
                      </span>
                    </td>
                    <td>
                      <span className={statusClass}>{product.statusLabel}</span>
                    </td>
                    <td>
                      <div className="admin-table-actions">
                        <button
                          type="button"
                          className="admin-icon-btn"
                          onClick={() => openDetailsModal(product)}
                          title="عرض التفاصيل"
                        >
                          <Search size={16} />
                        </button>

                        <button
                          type="button"
                          className="admin-icon-btn"
                          disabled={!!togglingIds[product.id]}
                          onClick={() => handleToggleStatus(product)}
                          title={
                            product.isActive
                              ? "إيقاف / حجب المنتج من قبل الإدارة"
                              : "تفعيل المنتج من قبل الإدارة"
                          }
                        >
                          {product.isActive ? (
                            <EyeOff size={16} />
                          ) : (
                            <Eye size={16} />
                          )}
                        </button>

                        <button
                          type="button"
                          className="admin-icon-btn admin-icon-danger"
                          disabled={!!deletingIds[product.id]}
                          onClick={() => handleDelete(product)}
                          title="حذف المنتج نهائيًا"
                        >
                          <Trash2 size={16} />
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

      {/* نافذة تفاصيل المنتج */}
      {isDetailsOpen && modalData && (
        <div className="admin-modal-backdrop" onClick={closeDetailsModal}>
          <div
            className="admin-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="admin-modal-header">
              <h3 className="admin-modal-title">
                تفاصيل المنتج: {modalData.name}
              </h3>
              <button
                type="button"
                className="admin-modal-close"
                onClick={closeDetailsModal}
              >
                <X size={18} />
              </button>
            </header>

            <div className="admin-modal-body">
              {detailsLoading && (
                <div className="admin-modal-section">
                  <p>جاري تحميل تفاصيل المنتج...</p>
                </div>
              )}

              {detailsError && (
                <div className="admin-modal-section admin-modal-error">
                  {detailsError}
                </div>
              )}

              {!detailsLoading && (
                <div className="admin-modal-grid">
                  {/* البيانات الأساسية */}
                  <section className="admin-modal-section">
                    <h4>البيانات الأساسية</h4>
                    <ul className="admin-details-list">
                      <li>
                        <span>المتجر:</span>
                        <strong>{modalData.storeName || "—"}</strong>
                      </li>
                      <li>
                        <span>التصنيف:</span>
                        <strong>
                          {modalData.category ||
                            modalData.categoryName ||
                            "—"}
                        </strong>
                      </li>
                      <li>
                        <span>السعر:</span>
                        <strong>
                          {Number(modalData.price ?? 0).toLocaleString()} ر.ي
                        </strong>
                      </li>
                      <li>
                        <span>المخزون:</span>
                        <strong>{modalData.stock ?? 0}</strong>
                      </li>
                      <li>
                        <span>وحدة المنتج:</span>
                        <strong>{modalData.unitLabel || "—"}</strong>
                      </li>
                      <li>
                        <span>العلامة التجارية:</span>
                        <strong>
                          {modalData.brand || "بدون علامة تجارية"}
                        </strong>
                      </li>
                      <li>
                        <span>الخيارات / النكهات / الأوزان:</span>
                        <strong>
                          {modalData.variants || "لا توجد خيارات محددة"}
                        </strong>
                      </li>
                    </ul>
                  </section>

                  {/* الحالة */}
                  <section className="admin-modal-section">
                    <h4>حالة المنتج والتحكم الإداري</h4>
                    <ul className="admin-details-list">
                      <li>
                        <span>حالة العرض الحالية:</span>
                        <strong>
                          {modalData.statusLabel ||
                            (modalData.adminControlLabel || "—")}
                        </strong>
                      </li>
                      <li>
                        <span>تحكم الإدارة:</span>
                        <strong>
                          {modalData.adminLocked
                            ? "محجوب من الإدارة"
                            : modalData.isActive
                            ? "نشط عادي"
                            : "مخفي من البائع"}
                        </strong>
                      </li>
                      <li>
                        <span>تاريخ الإنشاء:</span>
                        <strong>{formatDateTime(modalData.createdAt)}</strong>
                      </li>
                      <li>
                        <span>آخر تحديث:</span>
                        <strong>{formatDateTime(modalData.updatedAt)}</strong>
                      </li>
                    </ul>
                  </section>

                  {/* التقييم وجودة المنتج */}
                  <section className="admin-modal-section">
                    <h4>التقييم وجودة التجربة</h4>
                    <ul className="admin-details-list">
                      <li>
                        <span>متوسط التقييم:</span>
                        <strong>
                          {modalData.rating && modalData.rating > 0
                            ? `${modalData.rating.toFixed(1)} من 5`
                            : "لا يوجد تقييم بعد"}
                        </strong>
                      </li>
                      <li>
                        <span>عدد المراجعات:</span>
                        <strong>{modalData.numReviews ?? 0}</strong>
                      </li>
                      <li>
                        <span>عدد الطلبات التي تحتوي المنتج:</span>
                        <strong>{modalData.ordersCount ?? 0}</strong>
                      </li>
                      <li>
                        <span>مرات الإضافة للمفضلة:</span>
                        <strong>{modalData.favoritesCount ?? 0}</strong>
                      </li>
                    </ul>
                  </section>

                  {/* الوصف الكامل */}
                  <section className="admin-modal-section admin-modal-section-full">
                    <h4>وصف المنتج</h4>
                    <p className="admin-modal-text">
                      {modalData.description || "لا يوجد وصف للمنتج."}
                    </p>
                  </section>

                  {/* سياسة الاسترجاع */}
                  <section className="admin-modal-section admin-modal-section-full">
                    <h4>سياسة الاسترجاع</h4>
                    <p className="admin-modal-text">
                      {modalData.returnPolicy ||
                        "لا توجد سياسة استرجاع محددة لهذا المنتج."}
                    </p>
                  </section>

                  {/* صور المنتج */}
                  <section className="admin-modal-section admin-modal-section-full">
                    <h4>صور المنتج</h4>
                    <div className="admin-modal-images">
                      {modalData.images && modalData.images.length > 0 ? (
                        modalData.images.map((img, index) => {
                          const url =
                            typeof img === "string" ? img : img.url || "";
                          if (!url) return null;
                          return (
                            <img
                              key={index}
                              src={resolveImageUrl(url)}
                              alt={modalData.name}
                              className="admin-modal-image"
                            />
                          );
                        })
                      ) : (
                        <p className="admin-modal-text">
                          لا توجد صور مرفوعة لهذا المنتج.
                        </p>
                      )}
                    </div>
                  </section>
                </div>
              )}
            </div>

            <footer className="admin-modal-footer">
              <button
                type="button"
                className="admin-btn-ghost"
                onClick={closeDetailsModal}
              >
                إغلاق
              </button>
            </footer>
          </div>
        </div>
      )}
    </section>
  );
}
