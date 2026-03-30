// src/pages/Wishlist.jsx

import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Heart,
  Search,
  Trash2,
  ShoppingCart,
  RefreshCw,
  AlertCircle,
  ArrowRight,
  Filter,
  ArrowUpDown,
  ChevronRight,
} from "lucide-react";
import ProductCard from "@/components/ProductCard/ProductCard";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import userService from "@/services/userService";
import { formatCurrency, formatDate, resolveAssetUrl } from "@/utils/formatters";

import "./Wishlist.css";

/**
 * 🖼️ دالة مساعدة لتحويل أي صورة (string أو object)
 * إلى رابط صالح للاستخدام في <img src="...">
 */
function resolveImageUrl(raw) {
  if (!raw) return null;

  // لو جاءتنا كائن صورة من نوع { url: "..." } نحاول استخراج url
  if (typeof raw === "object" && raw !== null) {
    if (typeof raw.url === "string") {
      return resolveImageUrl(raw.url);
    }
    return null;
  }

  if (typeof raw !== "string") return null;

  const trimmed = raw.trim();
  if (!trimmed) return null;

  // لو هو رابط كامل http أو https نستخدمه كما هو
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  // قاعدة الـ API من الإعدادات
  const baseUrl = import.meta.env.VITE_API_URL || "";

  if (trimmed.startsWith("/")) {
    return `${baseUrl}${trimmed}`;
  }

  if (
    trimmed.startsWith("uploads/") ||
    trimmed.startsWith("products/") ||
    trimmed.startsWith("static/")
  ) {
    return `${baseUrl}/${trimmed}`;
  }

  return trimmed;
}

/**
 * 🧩 دالة مساعدة لتحويل بيانات المنتجات القادمة من الباك إند
 * إلى الشكل الذي تستخدمه صفحة المفضلة.
 */
function mapWishlistItemsFromApi(apiItems) {
  if (!Array.isArray(apiItems)) return [];

  return apiItems.map((p) => {
    const id = p._id || p.id;
    const name = p.name || p.title || "منتج بدون اسم";
    const description = p.description || p.shortDescription || "";
    const priceNumber = Number(p.price ?? p.salePrice ?? p.finalPrice ?? 0);

    const rawOldPrice = p.oldPrice ?? p.originalPrice ?? p.regularPrice ?? null;
    const oldPriceNumber = typeof rawOldPrice === "number" ? rawOldPrice : null;

    let rawImage =
      p.mainImage ||
      p.image ||
      (Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : null);

    const imageUrl = resolveImageUrl(rawImage);

    // حالة التوفر
    const stock =
      typeof p.stock === "number"
        ? p.stock
        : typeof p.quantity === "number"
          ? p.quantity
          : null;

    let status = "available";
    if (stock !== null) {
      if (stock <= 0) status = "unavailable";
      else if (stock <= 3) status = "limited";
    }
    if (p.status === "inactive" || p.isActive === false) {
      status = "unavailable";
    }

    const inOffer =
      !!p.inOffer || (oldPriceNumber && priceNumber && oldPriceNumber > priceNumber);

    const addedAt = p.createdAt || p.updatedAt || new Date().toISOString();

    return {
      id,
      name,
      description,
      price: priceNumber,
      oldPrice: oldPriceNumber,
      image: imageUrl,
      status,
      inOffer,
      addedAt,
      stock: p.stock ?? (status === "unavailable" ? 0 : 10),
      isActive: p.isActive ?? true,
      raw: p,
    };
  });
}

export default function Wishlist() {
  const navigate = useNavigate();
  const {
    ensureInCart,
    isInCart,
    showToast,
    clearWishlist,
    toggleWishlistItem,
    setWishlistCount,
  } = useApp() || {};
  const { isLoggedIn, isReady: authReady } = useAuth() || {};

  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const total = items.length;

  // مزامنة حالة المفضلة في الـ Context
  const syncContextFromItems = (list) => {
    if (setWishlistCount) setWishlistCount(list.length);
    if (clearWishlist) clearWishlist();
    list.forEach((item) => {
      if (toggleWishlistItem) toggleWishlistItem(item);
    });
  };

  // جلب المفضلة من الباك إند
  async function loadWishlist(options = { silent: false }) {
    if (!authReady) return;
    if (!isLoggedIn) {
      setItems([]);
      return;
    }

    const { silent } = options;
    try {
      if (!silent) setIsLoading(true);
      else setIsRefreshing(true);
      setError(null);

      const data = await userService.getWishlist();
      const mapped = mapWishlistItemsFromApi(data);

      setItems(mapped);
      syncContextFromItems(mapped);
    } catch (err) {
      console.error(err);
      const message = err?.response?.data?.message || "حدث خطأ أثناء جلب قائمة المفضلة";
      setError(message);
      if (showToast) showToast(message, "error");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    loadWishlist();
  }, []);

  const visibleItems = useMemo(() => {
    let result = [...items];

    if (search.trim()) {
      const term = search.trim().toLowerCase();
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(term) ||
          item.description.toLowerCase().includes(term)
      );
    }

    result.sort((a, b) => {
      if (sortBy === "newest") return new Date(b.addedAt) - new Date(a.addedAt);
      if (sortBy === "oldest") return new Date(a.addedAt) - new Date(b.addedAt);
      if (sortBy === "price-asc") return a.price - b.price;
      if (sortBy === "price-desc") return b.price - a.price;
      return 0;
    });

    return result;
  }, [items, search, sortBy]);

  const hasVisibleItems = visibleItems.length > 0;

  const addToCart = (item) => {
    if (item.status === "unavailable") {
      if (showToast) showToast("هذا المنتج غير متاح حالياً", "error");
      return;
    }

    if (isInCart && isInCart(item.id)) {
      if (showToast) showToast("هذا المنتج موجود بالفعل في السلة", "info");
      return;
    }

    if (ensureInCart) ensureInCart(item);
    if (showToast) showToast("تمت إضافة المنتج إلى السلة", "success");
  };

  const addAllToCart = () => {
    const availableItems = visibleItems.filter((i) => i.status !== "unavailable");

    if (availableItems.length === 0) {
      if (showToast) showToast("لا يوجد منتجات متاحة لإضافتها إلى السلة", "info");
      return;
    }

    let addedCount = 0;
    availableItems.forEach((item) => {
      if (isInCart && !isInCart(item.id)) {
        if (ensureInCart) ensureInCart(item);
        addedCount += 1;
      }
    });

    if (addedCount === 0) {
      if (showToast) showToast("كل هذه المنتجات موجودة بالفعل في السلة", "info");
    } else {
      if (showToast) showToast(`تمت إضافة ${addedCount} منتج/منتجات إلى السلة`, "success");
    }
  };

  const removeItem = async (id) => {
    try {
      await userService.removeFromWishlist(id);
      setItems((prev) => {
        const updated = prev.filter((i) => i.id !== id);
        syncContextFromItems(updated);
        return updated;
      });
      if (showToast) showToast("تم حذف المنتج من المفضلة", "success");
    } catch (err) {
      const message = err?.response?.data?.message || "تعذر حذف هذا المنتج";
      if (showToast) showToast(message, "error");
    }
  };

  async function handleBulkRemove() {
    if (!hasVisibleItems) return;
    setIsLoading(true);
    try {
      if (search.trim() === "") {
        await userService.clearWishlist();
      } else {
        // If filtered, remove only visible items sequentially
        for (const item of visibleItems) {
          await userService.removeFromWishlist(item.id);
        }
      }
      if (showToast) showToast("تم تحديث قائمة المفضلة.", "success");
      await loadWishlist({ silent: true });
    } catch (error) {
      console.error("❌ تعذّر تفريغ المفضلة:", error);
      if (showToast) showToast("تعذّر تفريغ هذه العناصر. حاول مرة أخرى.", "error");
    } finally {
      setIsLoading(false);
    }
  }

  const handleProductClick = (id) => {
    if (!id) return;
    navigate(`/products/${id}`);
  };

  return (
    <div className="adm-page-root wishlist-page">
      <header className="adm-header">
        <div className="adm-header-inner">
          <div className="adm-header-right">
            <button onClick={() => navigate("/")} className="adm-btn-back" title="العودة للتسوق">
              <ArrowRight size={20} />
            </button>
            <h1 className="adm-page-title wishlist-page-title">
              <Heart size={24} />
              قائمة المفضلة
              <span className="adm-header-count">
                لديك: <span className="count-num">{items.length}</span> منتج
              </span>
            </h1>
          </div>
        </div>
      </header>

      <div className="adm-main-container">
        <main className="wishlist-main-grid">
          {/* Filters card */}
          <section className="adm-card span-12">
            <div className="adm-card-header">
              <Filter size={20} />
              <h2>خيارات العرض والفلترة</h2>
            </div>
            <div className="adm-card-body">
              {/* Row 1: Search and Sort */}
              <div className="wishlist-filter-row">
                <div className="search-wrap">
                  <Search size={18} />
                  <input
                    type="text"
                    className="adm-form-input"
                    placeholder="ابحث في مفضلتك..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className="sort-wrap">
                  <ArrowUpDown size={18} />
                  <select
                    className="adm-form-select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <option value="newest">الأحدث</option>
                    <option value="oldest">الأقدم</option>
                    <option value="price-asc">الأرخص</option>
                    <option value="price-desc">الأغلى</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Bulk Actions */}
              <div className="wishlist-actions-row">
                <div className="adm-actions-group">
                  <button
                    type="button"
                    className="adm-btn accent"
                    onClick={addAllToCart}
                    disabled={!hasVisibleItems}
                  >
                    <ShoppingCart size={16} />
                    إضافة الكل
                  </button>
                  <button
                    type="button"
                    className="adm-btn danger"
                    onClick={handleBulkRemove}
                    disabled={!hasVisibleItems || isLoading}
                  >
                    <Trash2 size={16} />
                    تفريغ الكل
                  </button>
                </div>
              </div>
            </div>
          </section>

          <div className="span-12">
            {isLoading && !items.length ? (
              <div className="adm-loading">
                <RefreshCw size={48} className="spin" />
                <p>جاري تحميل المفضلة...</p>
              </div>
            ) : error ? (
              <div className="adm-empty-center wishlist-empty-state">
                <div className="empty-icon-wrap danger">
                  <AlertCircle size={48} />
                </div>
                <h3>حدث خطأ</h3>
                <p>{error}</p>
                <button className="adm-btn primary" onClick={() => loadWishlist()}>إعادة المحاولة</button>
              </div>
            ) : !items.length ? (
              <div className="adm-empty-center wishlist-empty-state">
                <div className="empty-icon-wrap">
                  <Heart size={48} />
                </div>
                <h3>مفضلتك فارغة</h3>
                <p>لم تقم بإضافة أي منتجات إلى قائمتك المفضلة حتى الآن.</p>
                <button className="adm-btn primary" onClick={() => navigate("/")}>ابدأ التسوق</button>
              </div>
            ) : !hasVisibleItems ? (
              <div className="adm-empty-center wishlist-empty-state">
                <div className="empty-icon-wrap">
                  <Search size={48} />
                </div>
                <h3>لا توجد نتائج</h3>
                <p>لا توجد منتجات مطابقة للبحث: <strong>{search}</strong></p>
              </div>
            ) : (
              <div className="wishlist-products-grid">
                {visibleItems.map((item) => (
                  <div key={item.id} className="wishlist-card-wrapper">
                    <ProductCard
                      product={item}
                      showRemove={true}
                      onRemove={() => removeItem(item.id)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
