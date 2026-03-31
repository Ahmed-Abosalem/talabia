import { useMemo, useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import ProductCard from "@/components/ProductCard/ProductCard";
import { ProductDetailsPage, Login, CartPage } from "@/router";
import { getCategories } from "@/services/categoryService";
import { listProducts } from "@/services/productService";
import { getHomeBannerAds } from "@/services/adService";
import "./Home.css";
import HScrollWrap from "@/components/HScrollWrap/HScrollWrap";
import ProductSkeleton from "@/components/ProductCard/ProductSkeleton";
import SafeImage from "@/components/SafeImage";

const bannerImages = []; // No hardcoded local banners to avoid 404s

const CATEGORY_IMAGE_MAP = {
  all: "/assets/categories/all.jpg",
  electronics: "/assets/categories/electronics.jpg",
  fashion: "/assets/categories/fashion.jpg",
  home: "/assets/categories/home.jpg",
  beauty: "/assets/categories/beauty.jpg",
  supermarket: "/assets/categories/supermarket.jpg",
};

const resolveImageUrl = (imagePath) => {
  if (!imagePath) return "";

  const raw = String(imagePath).trim();

  if (
    raw.startsWith("http://") ||
    raw.startsWith("https://") ||
    raw.startsWith("data:") ||
    raw.startsWith("blob:")
  ) {
    const idx = raw.indexOf("/uploads/");
    if (idx !== -1) return raw.slice(idx);
    return raw;
  }

  if (raw.startsWith("/assets/")) return raw;

  let normalized = raw;
  if (!normalized.startsWith("/")) normalized = "/" + normalized;

  if (normalized.startsWith("/uploads/")) return normalized;

  if (normalized.startsWith("/ads/") || normalized.startsWith("/products/")) {
    return "/uploads" + normalized;
  }

  return "/uploads" + normalized;
};

// 🔹 خيارات الترتيب الموحدة
const SORT_OPTIONS = [
  { value: "default", label: "الافتراضي" },
  { value: "price_asc", label: "الأقل سعراً" },
  { value: "price_desc", label: "الأعلى سعراً" },
  { value: "best_selling", label: "الأكثر مبيعاً" },
  { value: "featured", label: "المميزة أولاً" },
  { value: "newest", label: "الأحدث" },
  { value: "oldest", label: "الأقدم" },
];

export default function Home() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const query = (searchParams.get("q") || "").trim();
  const hasQuery = query.length > 0;

  const [activeBanner, setActiveBanner] = useState(0);
  const [activeCategory, setActiveCategory] = useState("all");
  const [sortOption, setSortOption] = useState("default"); // 🆕 حالة الترتيب

  const [bannerAds, setBannerAds] = useState([]);
  const [hasDynamicBanners, setHasDynamicBanners] = useState(false);
  const [bannerLoading, setBannerLoading] = useState(true);

  const [categories, setCategories] = useState([]);

  const [products, setProducts] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursorScore, setNextCursorScore] = useState(null);
  const [nextCursorId, setNextCursorId] = useState(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const observer = useRef();
  const lastProductElementRef = (node) => {
    if (isLoading || isFetchingNextPage) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore) {
        loadMoreProducts();
      }
    });
    if (node) observer.current.observe(node);
  };

  const totalBanners =
    hasDynamicBanners && bannerAds.length > 0
      ? bannerAds.length
      : bannerImages.length;

  const handlePrev = () => {
    if (!totalBanners) return;
    setActiveBanner((prev) => (prev === 0 ? totalBanners - 1 : prev - 1));
  };

  const handleNext = () => {
    if (!totalBanners) return;
    setActiveBanner((prev) => (prev === totalBanners - 1 ? 0 : prev + 1));
  };

  // 🖱️ منطق السحب (Swipe) الموحد للماوس واللمس
  const dragStartX = useRef(null);
  const dragEndX = useRef(null);
  const minSwipeDistance = 50;

  // حالة الصفحة للسحب اللانهائي المستقر
  const [currentPage, setCurrentPage] = useState(1);

  const onDragStart = (clientX) => {
    dragStartX.current = clientX;
    dragEndX.current = null;
  };

  const onDragMove = (clientX) => {
    dragEndX.current = clientX;
  };

  const onDragEnd = () => {
    if (dragStartX.current === null || dragEndX.current === null) return;
    const distance = dragStartX.current - dragEndX.current;
    if (distance > minSwipeDistance) handleNext();
    else if (distance < -minSwipeDistance) handlePrev();
    dragStartX.current = null;
    dragEndX.current = null;
  };

  const processProducts = (rawList) => {
    return rawList.map((p) => {
      let imageUrl = "";
      if (Array.isArray(p.images) && p.images.length > 0) {
        const first = p.images[0];
        if (typeof first === "string") imageUrl = resolveImageUrl(first);
        else if (first && typeof first === "object" && first.url) {
          imageUrl = resolveImageUrl(first.url);
        }
      }
      if (!imageUrl) imageUrl = "/assets/products/default.jpg";

      return {
        id: p._id,
        category: p.category?._id || p.category,
        name: p.name,
        description: p.shortDescription || p.description || "",
        price: p.price,
        image: imageUrl,
        stock: p.stock ?? 0,
        isActive: p.isActive ?? true,
        status: p.status || "active",
        performanceScore: p.performanceScore,
        isFeatured: p.isFeatured, // 🆕
        featuredOrder: p.featuredOrder, // 🆕
      };
    });
  };

  // 🔄 دالة جلب المنتجات (تحميل المزيد)
  const loadMoreProducts = async () => {
    if (isFetchingNextPage || !hasMore) return;
    try {
      setIsFetchingNextPage(true);
      const nextPage = currentPage + 1;
      const params = {
        category: activeCategory === "all" ? undefined : activeCategory,
        limit: 20,
        page: nextPage,
        cursor_score: nextCursorScore,
        cursor_id: nextCursorId,
        search: query, // 🆕 تمرير البحث للسيرفر
        sort: sortOption, // 🆕 تمرير الترتيب للسيرفر
      };

      const newProductsRaw = await listProducts(params);

      if (newProductsRaw.length === 0) {
        setHasMore(false);
      } else {
        const processed = processProducts(newProductsRaw);
        setProducts((prev) => [...prev, ...processed]);
        setCurrentPage(nextPage);

        const last = newProductsRaw[newProductsRaw.length - 1];
        setNextCursorScore(last.performanceScore || 0);
        setNextCursorId(last._id);

        if (newProductsRaw.length < 20) {
          setHasMore(false);
        }
      }
    } catch (error) {
      console.error("Error loading more products:", error);
    } finally {
      setIsFetchingNextPage(false);
    }
  };

  // Touch Events
  const handleTouchStart = (e) => onDragStart(e.targetTouches[0].clientX);
  const handleTouchMove = (e) => onDragMove(e.targetTouches[0].clientX);
  const handleTouchEnd = () => onDragEnd();

  // Mouse Events
  const handleMouseDown = (e) => {
    e.preventDefault();
    onDragStart(e.clientX);
  };
  const handleMouseMove = (e) => {
    if (dragStartX.current !== null) {
      onDragMove(e.clientX);
    }
  };
  const handleMouseUp = () => onDragEnd();
  const handleMouseLeave = () => {
    if (dragStartX.current !== null) onDragEnd();
  };

  // 🔄 التحميل الأولي عند تغيير الفلاتر (Category, Search, Sort)
  useEffect(() => {
    let isMounted = true;

    async function initialLoad() {
      try {
        setIsLoading(true);
        setErrorMessage("");
        setHasMore(true);
        setCurrentPage(1);
        setNextCursorScore(null);
        setNextCursorId(null);
        setProducts([]); // تصفية القائمة القديمة

        // جلب الأقسام فقط في المرة الأولى (إذا كانت فارغة)
        let apiCategories = categories;
        if (categories.length === 0) {
          const catRes = await getCategories();
          const rawCategories = catRes?.categories || [];
          apiCategories = rawCategories.map((cat) => {
            const slugBase = cat.slug || cat.name?.trim()?.toLowerCase() || String(cat._id || "");
            let imageUrl = cat.image ? resolveImageUrl(cat.image) : (CATEGORY_IMAGE_MAP[slugBase] || "/assets/categories/default.jpg");
            const finalId = (slugBase === "all") ? "all" : (cat._id || slugBase);
            return { id: finalId, name: cat.name, image: imageUrl, slug: slugBase };
          });
          if (isMounted) setCategories(apiCategories);
        }

        const params = {
          category: activeCategory === "all" ? undefined : activeCategory,
          limit: 20,
          search: query, // 🆕
          sort: sortOption // 🆕
        };

        const productsRes = await listProducts(params);

        if (!isMounted) return;

        const processed = processProducts(productsRes);
        setProducts(processed);

        if (productsRes.length > 0) {
          const last = productsRes[productsRes.length - 1];
          setNextCursorScore(last.performanceScore || 0);
          setNextCursorId(last._id);
          if (productsRes.length < 20) setHasMore(false);
        } else {
          setHasMore(false);
        }

      } catch (error) {
        console.error("Home load error:", error);
        if (isMounted) setErrorMessage("فشل تحميل البيانات.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    initialLoad();
    return () => { isMounted = false; };
  }, [activeCategory, query, sortOption]); // 🔄 إعادة التحميل عند تغيير أي فلتر

  useEffect(() => {
    let isMounted = true;

    async function loadBannerAds() {
      try {
        setBannerLoading(true);
        const ads = await getHomeBannerAds({ limit: 5 });
        if (!isMounted) return;

        if (Array.isArray(ads) && ads.length > 0) {
          setBannerAds(ads);
          setHasDynamicBanners(true);
          setActiveBanner(0);
        } else {
          setBannerAds([]);
          setHasDynamicBanners(false);
        }
      } catch (error) {
        console.error("خطأ في تحميل إعلانات البانر:", error);
        if (!isMounted) return;
        setBannerAds([]);
        setHasDynamicBanners(false);
      } finally {
        if (isMounted) setBannerLoading(false);
      }
    }

    loadBannerAds();
    return () => {
      isMounted = false;
    };
  }, []);

  // 🚀 Strategic Preloading on Idle
  useEffect(() => {
    const idleCallback = window.requestIdleCallback || ((cb) => setTimeout(cb, 1000));
    const handle = idleCallback(() => {
      Login.preload();
      CartPage.preload();
    });
    return () => {
      if (window.cancelIdleCallback) window.cancelIdleCallback(handle);
      else clearTimeout(handle);
    };
  }, []);

  useEffect(() => {
    if (totalBanners <= 1) return;
    const intervalId = setInterval(() => {
      setActiveBanner((prev) => (prev === totalBanners - 1 ? 0 : prev + 1));
    }, 2000);
    return () => clearInterval(intervalId);
  }, [totalBanners]);

  const handleCategoryClick = (categoryId) => {
    setActiveCategory(categoryId);
  };

  // ❌ Removed useMemo for searchedProducts - now using server-side results directly in `products`


  const currentBannerIndex = totalBanners ? activeBanner % totalBanners : 0;
  const currentBannerData = hasDynamicBanners ? bannerAds[currentBannerIndex] : null;

  const currentBannerSrc = hasDynamicBanners
    ? resolveImageUrl(currentBannerData?.image)
    : bannerImages[currentBannerIndex];

  const handleBannerClick = () => {
    if (!hasDynamicBanners || !currentBannerData) return;
    const link = currentBannerData.linkUrl;
    if (link) {
      if (link.startsWith("http")) window.open(link, "_blank", "noopener,noreferrer");
      else navigate(link);
    }
  };

  const clearSearch = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("q");
    setSearchParams(next, { replace: true });
    // Reset sort when clearing search? Optional. Let's keep sort as is.
  };

  const showNoResults =
    !isLoading &&
    !errorMessage &&
    products.length === 0;

  return (
    <div className="page-container home-page">
      <section className="banner-section">
        <div className="banner-strip">
          {bannerLoading ? (
            /* ✅ Skeleton أثناء تحميل الإعلانات - يمنع الخلفية البيضاء */
            <div className="banner-wrapper banner-skeleton">
              <div className="banner-skeleton-inner skeleton-pulse" />
            </div>
          ) : (
            <div
              className={"banner-wrapper" + (hasDynamicBanners ? " banner-wrapper-clickable" : "")}
              onClick={handleBannerClick}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              style={{ touchAction: "pan-y" }}
            >
              <SafeImage src={currentBannerSrc} alt="عرض مميز" className="banner-image" draggable="false" />
              {totalBanners > 0 && (
                <div className="banner-counter">
                  {currentBannerIndex + 1} / {totalBanners}
                </div>
              )}
              <div className="banner-dots">
                {Array.from({ length: totalBanners }).map((_, idx) => (
                  <button
                    key={idx}
                    className={"banner-dot" + (idx === currentBannerIndex ? " active" : "")}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveBanner(idx);
                    }}
                    aria-label={`انتقال إلى البنر ${idx + 1}`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>



      <section className="categories-section">
        <HScrollWrap id="categories-strip" className="categories-strip">
          {isLoading && products.length === 0 && categories.length === 0 ? (
            Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="category-item category-skeleton">
                <div className="category-circle skeleton-pulse" />
                <span className="category-label skeleton-text" />
              </div>
            ))
          ) : (
            categories.map((cat) => {
              const isActive = cat.id === activeCategory;
              return (
                <button
                  key={cat.id}
                  className="category-item"
                  onClick={() => handleCategoryClick(cat.id)}
                >
                  <div className={"category-circle" + (isActive ? " category-circle-active" : "")}>
                    <img src={cat.image} alt={cat.name} />
                  </div>
                  <span className={"category-label" + (isActive ? " category-label-active" : "")}>
                    {cat.name}
                  </span>
                </button>
              );
            })
          )}
        </HScrollWrap>
      </section>

      {/* 🆕 شريط الأدوات الموحد: نتائج البحث + الفلتر */}
      <div className="home-info-bar">
        {/* معلومات البحث */}
        <div className="home-title-container">
          {hasQuery ? (
            <div className="search-results-info">
              <span>نتائج: <b>{query}</b></span>
              <button onClick={clearSearch} className="btn-clear-search">
                إلغاء
              </button>
            </div>
          ) : (
            <h2 className="home-section-title">
              {activeCategory === 'all' ? 'كل المنتجات' : categories.find(c => c.id === activeCategory)?.name || 'المنتجات'}
            </h2>
          )}
        </div>

        {/* 🔻 القائمة المنسدلة للترتيب */}
        <div className="sort-dropdown-container">
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            className="sort-select"
          >
            {SORT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="sort-icon" size={16} />
        </div>
      </div>


      <section className="products-section">
        <div className="products-grid">
          {isLoading && products.length === 0 ? (
            Array.from({ length: 8 }).map((_, idx) => (
              <ProductSkeleton key={idx} />
            ))
          ) : errorMessage ? (
            <div className="products-error">{errorMessage}</div>
          ) : products.length === 0 ? (
            <div className="products-empty">
              {hasQuery ? `لا توجد نتائج بحث تطابق "${query}"` : "لا توجد منتجات متاحة حالياً."}
            </div>
          ) : (
            <>
              {products.map((product, index) => {
                const isLastElement = products.length === index + 1;
                return (
                  <div
                    key={product.id}
                    ref={isLastElement ? lastProductElementRef : null}
                    className="product-card-wrapper"
                    onMouseEnter={() => ProductDetailsPage.preload()}
                  >
                    {/* تمرير خاصية isFeatured للبطاقة إذا أردنا تمييزها بصرياً */}
                    <ProductCard product={product} />
                  </div>
                );
              })}
              {isFetchingNextPage && <div className="products-loading-next">جاري تحميل المزيد...</div>}
              {!hasMore && products.length > 0 && <div className="products-end">نهاية القائمة</div>}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
