import PwaInstallBanner from "../../components/pwa/PwaInstallBanner";


// src/pages/Home/Home.jsx
import { useMemo, useState, useEffect, useRef, Children } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import ProductCard from "@/components/ProductCard/ProductCard";
import { getCategories } from "@/services/categoryService";
import { listProducts } from "@/services/productService";
import { getHomeBannerAds } from "@/services/adService";
import "./Home.css";

const bannerImages = [
  "/assets/banners/banner1.jpg",
  "/assets/banners/banner2.jpg",
  "/assets/banners/banner3.jpg",
];

const CATEGORY_IMAGE_MAP = {
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

/* =========================
   ✅ إيحاء تمرير أفقي (سهم فقط)
   - بدون تدرّجات/ضبابية
   - السهم يظهر في جهة التمرير المتاحة
   - بدون أي "رجوع تلقائي" أو scrollTo
   ========================= */

let __rtlScrollTypeCache = null;

function getRtlScrollType() {
  if (__rtlScrollTypeCache) return __rtlScrollTypeCache;

  const outer = document.createElement("div");
  const inner = document.createElement("div");

  outer.style.width = "100px";
  outer.style.height = "100px";
  outer.style.overflow = "scroll";
  outer.style.position = "absolute";
  outer.style.top = "-9999px";
  outer.style.direction = "rtl";

  inner.style.width = "200px";
  inner.style.height = "1px";

  outer.appendChild(inner);
  document.body.appendChild(outer);

  if (outer.scrollLeft > 0) {
    __rtlScrollTypeCache = "default";
  } else {
    outer.scrollLeft = 1;
    __rtlScrollTypeCache = outer.scrollLeft === 0 ? "negative" : "reverse";
  }

  document.body.removeChild(outer);
  return __rtlScrollTypeCache;
}

function getMaxScroll(scrollEl) {
  return Math.max(0, scrollEl.scrollWidth - scrollEl.clientWidth);
}

// normalized: 0 = بداية المحتوى (يمين في RTL), max = نهاية المحتوى (يسار في RTL)
function getNormalizedScrollLeft(scrollEl) {
  const dir = getComputedStyle(scrollEl).direction;
  const max = getMaxScroll(scrollEl);

  if (dir !== "rtl") {
    return Math.min(Math.max(scrollEl.scrollLeft, 0), max);
  }

  const type = getRtlScrollType();
  if (type === "default") return max - scrollEl.scrollLeft;
  if (type === "negative") return -scrollEl.scrollLeft;
  return scrollEl.scrollLeft; // reverse
}

function attachHScrollHints(scrollEl) {
  if (!scrollEl) return () => {};

  const wrap = scrollEl.closest(".hscroll-wrap");
  if (!wrap) return () => {};

  let resizeObs = null;
  let t1 = null;
  let t2 = null;
  let t3 = null;

  const isOverflowing = () => scrollEl.scrollWidth > scrollEl.clientWidth + 4;

  const updateState = () => {
    const hasOverflow = isOverflowing();
    wrap.classList.toggle("hscroll--active", hasOverflow);

    if (!hasOverflow) {
      wrap.classList.remove("hscroll--can-left", "hscroll--can-right");
      return;
    }

    const max = getMaxScroll(scrollEl);
    const pos = getNormalizedScrollLeft(scrollEl);

    // ✅ السهم يظهر في "جهة يوجد فيها تمرير"
    // can-left: يوجد محتوى مخفي باتجاه اليسار
    // can-right: يوجد محتوى مخفي باتجاه اليمين
    const canGoLeft = max - pos > 2;
    const canGoRight = pos > 2;

    wrap.classList.toggle("hscroll--can-left", canGoLeft);
    wrap.classList.toggle("hscroll--can-right", canGoRight);
  };

  const onScroll = () => updateState();

  scrollEl.addEventListener("scroll", onScroll, { passive: true });

  if (typeof ResizeObserver !== "undefined") {
    resizeObs = new ResizeObserver(() => updateState());
    resizeObs.observe(scrollEl);
  } else {
    window.addEventListener("resize", updateState);
  }

  // ✅ الأهم: "تهيئة" متكررة بعد التحميل
  // لأن شريط الأقسام قد يتغير عرضه بعد تحميل الصور/بعد جلب البيانات
  const prime = () => {
    updateState();
    requestAnimationFrame(updateState);

    clearTimeout(t1);
    clearTimeout(t2);
    clearTimeout(t3);

    t1 = setTimeout(updateState, 120);
    t2 = setTimeout(updateState, 420);
    t3 = setTimeout(updateState, 950);
  };

  prime();

  return () => {
    scrollEl.removeEventListener("scroll", onScroll);
    if (resizeObs) resizeObs.disconnect();
    else window.removeEventListener("resize", updateState);

    clearTimeout(t1);
    clearTimeout(t2);
    clearTimeout(t3);
  };
}

function HScrollWrap({ id, className, children }) {
  const ref = useRef(null);
  const childCount = Children.count(children);

  // ✅ مهم: نعيد تهيئة الإيماءة عند تغير عدد العناصر (مثل الأقسام بعد الجلب)
  useEffect(() => {
    if (!ref.current) return;
    return attachHScrollHints(ref.current);
  }, [childCount]);

  return (
    <div className="hscroll-wrap" data-hscroll-id={id}>
      <div ref={ref} className={className}>
        {children}
      </div>

      {/* ✅ سهم عصري دائم (يظهر فقط في الجهة المتاحة للتمرير) */}
      <div className="hscroll-arrow hscroll-arrow-left" aria-hidden="true">
        <ChevronLeft size={18} />
      </div>
      <div className="hscroll-arrow hscroll-arrow-right" aria-hidden="true">
        <ChevronRight size={18} />
      </div>
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const query = (searchParams.get("q") || "").trim();
  const hasQuery = query.length > 0;

  const [activeBanner, setActiveBanner] = useState(0);
  const [activeCategory, setActiveCategory] = useState("all");

  const [bannerAds, setBannerAds] = useState([]);
  const [hasDynamicBanners, setHasDynamicBanners] = useState(false);

  const [categories, setCategories] = useState([
    { id: "all", name: "الكل", image: "/assets/categories/all.jpg" },
  ]);

  const [products, setProducts] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

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

  useEffect(() => {
    let isMounted = true;

    async function loadHomeData() {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const [catRes, productsRes] = await Promise.all([
          getCategories(),
          listProducts(),
        ]);

        if (!isMounted) return;

        const rawCategories = catRes?.categories || [];
        const categoryIdToSlug = {};

        const apiCategories = rawCategories.map((cat) => {
          const slugBase =
            cat.slug || cat.name?.trim()?.toLowerCase() || String(cat._id || "");

          if (cat._id) categoryIdToSlug[String(cat._id)] = slugBase;

          let imageUrl = "";
          if (cat.image) imageUrl = resolveImageUrl(cat.image);
          else
            imageUrl =
              CATEGORY_IMAGE_MAP[slugBase] || "/assets/categories/default.jpg";

          return { id: slugBase, name: cat.name, image: imageUrl };
        });

        const baseAllCategory = {
          id: "all",
          name: "الكل",
          image: "/assets/categories/all.jpg",
        };

        setCategories([baseAllCategory, ...apiCategories]);

        const apiProducts = (productsRes || []).map((p) => {
          const rawCategory = p.category;
          let categorySlug = "";

          if (typeof rawCategory === "string") {
            const fromMap = categoryIdToSlug[rawCategory];
            categorySlug = fromMap ? fromMap : rawCategory;
          } else if (rawCategory && typeof rawCategory === "object") {
            if (rawCategory._id && categoryIdToSlug[rawCategory._id]) {
              categorySlug = categoryIdToSlug[rawCategory._id];
            } else if (rawCategory.slug) {
              categorySlug = rawCategory.slug;
            } else if (rawCategory.name) {
              categorySlug = rawCategory.name.trim().toLowerCase();
            }
          }

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
            category: categorySlug,
            name: p.name,
            description: p.shortDescription || p.description || "",
            price: p.price,
            image: imageUrl,
          };
        });

        setProducts(apiProducts);
      } catch (error) {
        console.error("خطأ في تحميل بيانات الصفحة الرئيسية:", error);
        if (!isMounted) return;
        setErrorMessage("حدث خطأ أثناء تحميل البيانات، يرجى المحاولة لاحقًا.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadHomeData();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadBannerAds() {
      try {
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
      }
    }

    loadBannerAds();
    return () => {
      isMounted = false;
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

  const searchedProducts = useMemo(() => {
    if (!hasQuery) return products;
    const q = query.toLowerCase();
    return products.filter((p) => {
      const name = (p.name || "").toLowerCase();
      const desc = (p.description || "").toLowerCase();
      return name.includes(q) || desc.includes(q);
    });
  }, [products, hasQuery, query]);

  const isAllActive = activeCategory === "all";

  const filteredProductsByCategory = (categoryId) => {
    if (categoryId === "all") return searchedProducts;
    return searchedProducts.filter((p) => p.category === categoryId);
  };

  const categoryRows = categories.filter((cat) => cat.id !== "all");

  const currentBannerIndex = totalBanners ? activeBanner % totalBanners : 0;
  const currentBannerData = hasDynamicBanners ? bannerAds[currentBannerIndex] : null;

  const currentBannerSrc = hasDynamicBanners
    ? resolveImageUrl(currentBannerData?.image)
    : bannerImages[currentBannerIndex];

  const handleBannerClick = () => {
    if (!hasDynamicBanners || !currentBannerData) return;

    const link = currentBannerData.linkUrl;
    if (!link) return;

    if (link.startsWith("http")) {
      window.open(link, "_blank", "noopener,noreferrer");
    } else {
      navigate(link);
    }
  };

  const clearSearch = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("q");
    setSearchParams(next, { replace: true });
    setActiveCategory("all");
  };

  const showNoResults =
    !isLoading &&
    !errorMessage &&
    products.length > 0 &&
    hasQuery &&
    searchedProducts.length === 0;

  return (
    <div className="page-container home-page">
      <div className="banner-top-gap" />

      <section className="banner-section">
        <div className="banner-strip">
          <div
            className={"banner-wrapper" + (hasDynamicBanners ? " banner-wrapper-clickable" : "")}
            onClick={handleBannerClick}
          >
            <img src={currentBannerSrc} alt="عرض مميز" className="banner-image" />

            {totalBanners > 0 && (
              <div className="banner-counter">
                {currentBannerIndex + 1} / {totalBanners}
              </div>
            )}

            <button
              className="banner-nav-btn banner-nav-left"
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              aria-label="السابق"
            >
              <ChevronRight size={20} />
            </button>
            <button
              className="banner-nav-btn banner-nav-right"
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              aria-label="التالي"
            >
              <ChevronLeft size={20} />
            </button>

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
        </div>
      </section>

        {/* PWA Install Banner */}
        <PwaInstallBanner />


      <section className="categories-section">
        <HScrollWrap id="categories-strip" className="categories-strip">
          {categories.map((cat) => {
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
          })}
        </HScrollWrap>
      </section>

      {!isLoading && !errorMessage && hasQuery && (
        <div
          style={{
            padding: "0.25rem 0.75rem 0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.75rem",
          }}
        >
          <div style={{ fontSize: "0.9rem", color: "#0f172a", overflow: "hidden" }}>
            نتائج البحث عن: <b>{query}</b> (عدد: <b>{searchedProducts.length}</b>)
          </div>
          <button
            type="button"
            onClick={clearSearch}
            style={{
              border: "1px solid #e5e7eb",
              background: "#fff",
              borderRadius: "10px",
              padding: "0.25rem 0.6rem",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            مسح
          </button>
        </div>
      )}

      <section className="products-section">
        <div className="products-rows">
          {isLoading && <div className="products-loading">جاري تحميل المنتجات والأقسام...</div>}

          {!isLoading && errorMessage && <div className="products-error">{errorMessage}</div>}

          {!isLoading && !errorMessage && products.length === 0 && (
            <div className="products-empty">لا توجد منتجات متاحة حالياً.</div>
          )}

          {showNoResults && <div className="products-empty">لا توجد نتائج مطابقة لبحثك.</div>}

          {!isLoading && !errorMessage && products.length > 0 && !showNoResults && (
            <>
              {isAllActive &&
                categoryRows.map((cat) => {
                  const rowProducts = filteredProductsByCategory(cat.id);
                  if (rowProducts.length === 0) return null;

                  return (
                    <HScrollWrap key={cat.id} id={`products-row-${cat.id}`} className="products-row">
                      {rowProducts.map((product) => (
                        <ProductCard key={product.id} product={product} />
                      ))}
                    </HScrollWrap>
                  );
                })}

              {!isAllActive && (
                <HScrollWrap id="products-row-single" className="products-row">
                  {filteredProductsByCategory(activeCategory).map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </HScrollWrap>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
