// src/pages/Wishlist.jsx

import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Heart,
  Share2,
  Printer,
  Settings2,
  ArrowUpDown,
  Search,
  Trash2,
  ShoppingCart,
  RefreshCw,
  Download,
  AlertCircle,
  Info,
  CheckCircle2,
  Tag,
  FolderPlus,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import userService from "@/services/userService";

import "./Wishlist.css";

/**
 * إعداد عنوان الـ API لبناء روابط الصور القادمة من الباك إند
 * نفس المنطق المستخدم في ProductDetails.jsx
 *
 * ✅ FIX للهاتف: لا نستخدم localhost افتراضيًا لأنه على الهاتف يعني الهاتف نفسه.
 * إذا لم توجد متغيرات بيئة، نشتق الـ hostname من نفس رابط Vite الحالي
 * ونفترض الباك إند على  أثناء التطوير.
 */
const ENV_API_BASE =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "";

const API_BASE_URL = (
  ENV_API_BASE ||
  (typeof window !== "undefined"
    ? ``
    : "")
).replace(/\/$/, "");

/**
 * 🖼️ دالة مساعدة لتحويل أي صورة (string أو object)
 * إلى رابط صالح للاستخدام في <img src="...">
 */
function resolveImageUrl(source) {
  const PLACEHOLDER = "/assets/products/product-placeholder.jpg";

  if (!source) return PLACEHOLDER;

  let imagePath = "";

  if (typeof source === "string") {
    imagePath = source;
  } else if (typeof source === "object") {
    imagePath = source.url || source.path || source.src || "";
  }

  if (!imagePath) return PLACEHOLDER;

  // لو الرابط أصلاً كامل (http أو https) نستخدمه كما هو
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
    return imagePath;
  }

  let normalized = imagePath.trim();

  // حالات شائعة لمسارات الصور النسبية
  if (!normalized.startsWith("/")) {
    if (normalized.startsWith("uploads/")) {
      normalized = "/" + normalized; // → "/uploads/..."
    } else if (normalized.startsWith("ads/")) {
      normalized = "/uploads/" + normalized; // → "/uploads/ads/..."
    } else if (normalized.startsWith("products/")) {
      normalized = "/uploads/" + normalized; // → "/uploads/products/..."
    } else {
      // اسم ملف فقط → نفترض أنه تحت /uploads
      normalized = "/uploads/" + normalized;
    }
  }

  return `${API_BASE_URL}${normalized}`;
}

/**
 * 🔧 تحويل رابط الصورة إلى قيمة صالحة لاستخدامها كـ background-image عبر CSS variable
 * الهدف: نعرض الصورة كاملة (object-fit: contain) بدون قص،
 * ونملأ الفراغات بخلفية ضبابية مشتقة من نفس الصورة.
 */
function cssUrl(url) {
  if (!url) return "none";
  const safe = String(url).replace(/["\\]/g, "\\$&");
  return `url("${safe}")`;
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

    // الصورة الأساسية: نتعامل مع mainImage / image / images[0] كـ string أو object
    let rawImage =
      p.mainImage ||
      p.image ||
      (Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : null);

    const image = resolveImageUrl(rawImage);

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
      image,
      status,
      inOffer,
      addedAt,
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
  } = useApp();

  // نبدأ بقائمة فارغة ثم نملؤها من الـ API
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest"); // newest | oldest | price-asc | price-desc
  const [selectedIds, setSelectedIds] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const total = items.length;
  const hasSelection = selectedIds.length > 0;

  const stats = useMemo(() => {
    const available = items.filter((i) => i.status === "available").length;
    const limited = items.filter((i) => i.status === "limited").length;
    const unavailable = items.filter((i) => i.status === "unavailable").length;
    const offers = items.filter((i) => i.inOffer).length;

    return {
      available,
      limited,
      unavailable,
      offers,
    };
  }, [items]);

  // مزامنة حالة المفضلة في الـ Context مع العناصر الحالية في الصفحة
  const syncContextFromItems = (list) => {
    clearWishlist();
    list.forEach((item) => {
      toggleWishlistItem(item);
    });
  };

  // جلب المفضلة من الباك إند
  async function loadWishlist() {
    try {
      setIsLoading(true);
      setError(null);

      const data = await userService.getWishlist();
      const mapped = mapWishlistItemsFromApi(data);

      setItems(mapped);
      setSelectedIds([]);
      syncContextFromItems(mapped);
    } catch (err) {
      console.error(err);
      const message =
        err?.response?.data?.message || "حدث خطأ أثناء جلب قائمة المفضلة";
      setError(message);
      showToast(message, "error");
    } finally {
      setIsLoading(false);
    }
  }

  // تحميل المفضلة عند فتح الصفحة
  useEffect(() => {
    loadWishlist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshPrices = () => {
    // يمكن استخدام نفس الفكرة لتحديث البيانات من الخادم
    loadWishlist();
  };

  const shareWishlist = async () => {
    try {
      const url = window.location.origin + "/wishlist";
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      }
      showToast("تم نسخ رابط قائمة المفضلة", "success");
    } catch {
      showToast("تعذر نسخ الرابط، حاول مرة أخرى", "error");
    }
  };

  const printWishlist = () => {
    window.print();
  };

  const downloadWishlist = () => {
    showToast("سيتم دعم حفظ القائمة كملف PDF لاحقاً", "info");
  };

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
      if (sortBy === "newest") {
        return new Date(b.addedAt) - new Date(a.addedAt);
      }
      if (sortBy === "oldest") {
        return new Date(a.addedAt) - new Date(b.addedAt);
      }
      if (sortBy === "price-asc") {
        return a.price - b.price;
      }
      if (sortBy === "price-desc") {
        return b.price - a.price;
      }
      return 0;
    });

    return result;
  }, [items, search, sortBy]);

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectVisible = () => {
    const visibleIds = visibleItems.map((i) => i.id);
    setSelectedIds(visibleIds);
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  const handleRetry = () => {
    loadWishlist();
  };

  // ✅ إضافة منتج واحد إلى السلة من بطاقة المفضلة
  const addToCart = (item) => {
    if (item.status === "unavailable") {
      showToast("هذا المنتج غير متاح حالياً", "error");
      return;
    }

    if (isInCart(item.id)) {
      showToast("هذا المنتج موجود بالفعل في السلة", "info");
      return;
    }

    ensureInCart(item);
    showToast("تمت إضافة المنتج إلى السلة", "success");
  };

  // ✅ إضافة كل المتوفر إلى السلة مع منع التكرار
  const addAllToCart = () => {
    const availableItems = items.filter((i) => i.status !== "unavailable");

    if (availableItems.length === 0) {
      showToast("لا يوجد منتجات متاحة لإضافتها إلى السلة", "info");
      return;
    }

    let addedCount = 0;

    availableItems.forEach((item) => {
      if (!isInCart(item.id)) {
        ensureInCart(item);
        addedCount += 1;
      }
    });

    if (addedCount === 0) {
      showToast("كل هذه المنتجات موجودة بالفعل في السلة", "info");
    } else {
      showToast(`تمت إضافة ${addedCount} منتج/منتجات إلى السلة`, "success");
    }
  };

  // حذف المنتجات المحددة من المفضلة (من السيرفر ثم من الواجهة)
  const removeSelected = async () => {
    if (!hasSelection) return;

    try {
      await Promise.all(selectedIds.map((id) => userService.removeFromWishlist(id)));

      setItems((prev) => {
        const updated = prev.filter((i) => !selectedIds.includes(i.id));
        syncContextFromItems(updated);
        return updated;
      });

      setSelectedIds([]);
      showToast("تم حذف المنتجات المحددة من المفضلة", "success");
    } catch (err) {
      const message =
        err?.response?.data?.message || "تعذر حذف بعض المنتجات المحددة من المفضلة";
      showToast(message, "error");
    }
  };

  // حذف منتج واحد من المفضلة
  const removeItem = async (id) => {
    try {
      await userService.removeFromWishlist(id);

      setItems((prev) => {
        const updated = prev.filter((i) => i.id !== id);
        syncContextFromItems(updated);
        return updated;
      });

      setSelectedIds((prev) => prev.filter((x) => x !== id));
      showToast("تم حذف المنتج من المفضلة", "success");
    } catch (err) {
      const message = err?.response?.data?.message || "تعذر حذف هذا المنتج من المفضلة";
      showToast(message, "error");
    }
  };

  // تنظيف المنتجات غير المتوفرة من المفضلة
  const cleanUnavailable = async () => {
    const toRemove = items.filter((i) => i.status === "unavailable");

    if (toRemove.length === 0) {
      showToast("لا يوجد منتجات غير متاحة للتنظيف", "info");
      return;
    }

    try {
      await Promise.all(toRemove.map((item) => userService.removeFromWishlist(item.id)));

      setItems((prev) => {
        const updated = prev.filter((i) => i.status !== "unavailable");
        syncContextFromItems(updated);
        return updated;
      });

      setSelectedIds((prev) =>
        prev.filter((id) =>
          items.some((item) => item.id === id && item.status !== "unavailable")
        )
      );

      showToast("تم تنظيف المنتجات غير المتاحة من المفضلة", "success");
    } catch (err) {
      const message =
        err?.response?.data?.message || "تعذر تنظيف جميع المنتجات غير المتاحة";
      showToast(message, "error");
    }
  };

  let touchStartX = null;

  const handleTouchStart = (e) => {
    touchStartX = e.touches[0].clientX;
  };

  const handleTouchSwipe = (e, item) => {
    if (touchStartX == null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX;

    if (deltaX < -80) {
      // سحب لليسار → حذف من المفضلة (مع استدعاء السيرفر)
      removeItem(item.id);
    } else if (deltaX > 80 && item.status !== "unavailable") {
      // سحب لليمين → إضافة للسلة
      addToCart(item);
    }

    touchStartX = null;
  };

  const hasItems = items.length > 0;

  // ✅ دالة فتح صفحة تفاصيل المنتج عند الضغط على الكرت
  const handleCardClick = (id) => {
    if (!id) return;
    navigate(`/products/${id}`);
  };

  return (
    <div className="page-container wishlist-page">
      {/* الهيدر الأخضر */}
      <header className="wishlist-header">
        <div className="wishlist-header-main">
          <div className="wishlist-title-row">
            <Heart className="wishlist-title-icon" size={22} />
            <h1 className="wishlist-title">قائمتي المفضلة</h1>
          </div>
          <p className="wishlist-subtitle">
            {isLoading
              ? "جاري تحميل قائمة المفضلة..."
              : error
              ? "حدث خطأ أثناء تحميل قائمة المفضلة"
              : total === 0
              ? "قائمتك المفضلة فارغة حالياً"
              : `لديك ${total} منتج في المفضلة`}
          </p>
        </div>

        <div className="wishlist-header-actions">
          <button type="button" className="btn-accent" onClick={() => navigate("/")}>
            <ShoppingCart size={16} />
            <span>العودة للتسوق</span>
          </button>
        </div>
      </header>

      {/* شريط الأدوات */}
      <section className="wishlist-toolbar">
        <div className="wishlist-toolbar-main">
          <div className="wishlist-search-wrapper">
            <Search className="wishlist-search-icon" size={16} />
            <input
              type="text"
              className="wishlist-search-input"
              placeholder="ابحث داخل المفضلة..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="wishlist-filters">
            <div className="wishlist-select-wrapper">
              <ArrowUpDown size={15} />
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="newest">الأحدث أولاً</option>
                <option value="oldest">الأقدم أولاً</option>
                <option value="price-asc">السعر: من الأقل للأعلى</option>
                <option value="price-desc">السعر: من الأعلى للأقل</option>
              </select>
            </div>
          </div>
        </div>

        <div className="wishlist-toolbar-selection">
          <button type="button" className="btn-ghost" onClick={selectVisible}>
            تحديد الكل الظاهر
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={clearSelection}
            disabled={!hasSelection}
          >
            إلغاء التحديد
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={addAllToCart}
            disabled={!hasItems}
          >
            <ShoppingCart size={15} />
            <span>إضافة المحدد إلى السلة</span>
          </button>
          <button
            type="button"
            className="btn-ghost danger"
            onClick={removeSelected}
            disabled={!hasSelection}
          >
            <Trash2 size={15} />
            <span>حذف المحدد</span>
          </button>
        </div>
      </section>

      {/* التخطيط العام */}
      <section className="wishlist-layout">
        <main className="wishlist-main-area">
          {/* حالة الخطأ */}
          {!isLoading && error && (
            <div className="wishlist-error-box">
              <AlertCircle size={18} />
              <div>
                <div>{error}</div>
                <button type="button" onClick={handleRetry}>
                  إعادة المحاولة
                </button>
              </div>
            </div>
          )}

          {/* حالة فارغة */}
          {!isLoading && !error && visibleItems.length === 0 && (
            <div className="wishlist-empty">
              <div className="wishlist-empty-icon">
                <Heart />
              </div>
              <p className="wishlist-empty-title">لا توجد منتجات في قائمتك المفضلة</p>
              <p className="wishlist-empty-text">
                ابدأ بإضافة المنتجات إلى المفضلة من صفحة المنتج أو من الصفحة الرئيسية.
              </p>
              <button
                type="button"
                className="btn-primary small"
                onClick={() => navigate("/")}
              >
                <FolderPlus size={14} />
                <span>ابدأ التسوق الآن</span>
              </button>
            </div>
          )}

          {/* شبكة المنتجات */}
          {!isLoading && !error && visibleItems.length > 0 && (
            <div className="wishlist-grid">
              {visibleItems.map((item) => {
                const isSelected = selectedIds.includes(item.id);
                const isUnavailable = item.status === "unavailable";
                const showDiscount =
                  item.inOffer && item.oldPrice && item.oldPrice > item.price;

                return (
                  <article
                    key={item.id}
                    className={
                      "wishlist-item-card" +
                      (isUnavailable ? " wishlist-item-unavailable" : "")
                    }
                    onClick={() => handleCardClick(item.id)}
                    onTouchStart={handleTouchStart}
                    onTouchEnd={(e) => handleTouchSwipe(e, item)}
                  >
                    <div
                      className="wishlist-item-image-wrapper"
                      style={{ "--wishlist-img": cssUrl(item.image) }}
                    >
                      <div className="wishlist-item-top">
                        <label
                          className="wishlist-checkbox-label"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(item.id)}
                          />
                          <span className="wishlist-checkbox-custom" />
                        </label>

                        {showDiscount && (
                          <span className="wishlist-badge-offer">عرض خاص</span>
                        )}

                        <button
                          type="button"
                          className="wishlist-remove-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeItem(item.id);
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <img
                        src={item.image}
                        alt={item.name}
                        className="wishlist-item-image"
                      />
                    </div>

                    <div className="wishlist-item-body">
                      <h3 className="wishlist-item-name">{item.name}</h3>
                      <p className="wishlist-item-desc">{item.description}</p>

                      <div className="wishlist-item-meta">
                        <div className="wishlist-price-wrap">
                          <span className="wishlist-price">
                            {item.price.toLocaleString()} ر.ي
                          </span>
                          {showDiscount && (
                            <span className="wishlist-old-price">
                              {item.oldPrice.toLocaleString()} ر.ي
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="wishlist-item-footer">
                      <button
                        type="button"
                        className="wishlist-footer-btn primary"
                        disabled={isUnavailable}
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCart(item);
                        }}
                      >
                        <ShoppingCart size={15} />
                        <span>{isUnavailable ? "غير متاح" : "أضف إلى السلة"}</span>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </main>

        {/* اللوحة الجانبية تبقى كما هي عندك/أو يمكن تفعيلها لاحقًا باستخدام stats */}
        {/* يمكن لاحقًا استخدام stats.available / stats.unavailable / stats.offers */}
      </section>
    </div>
  );
}
