// frontend/src/pages/ProductDetails.jsx

import "./ProductDetails.css";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Heart, Share2, ShoppingCart, Store, Check, ChevronRight, XCircle, Star } from "lucide-react";

import { useApp } from "@/context/AppContext";
import ProductCard from "@/components/ProductCard/ProductCard";
import { getProductById, listProducts, getProductRecommendations } from "@/services/productService";
import { getCategories } from "@/services/categoryService";
import userService from "@/services/userService";
import HScrollWrap from "@/components/HScrollWrap/HScrollWrap";

// ✅ NEW: Reviews service (ملف جديد)
import { getProductReviews, createProductReview } from "@/services/reviewService";
import ReviewModal from "@/components/ReviewModal";

// عنوان الباك إند لبناء روابط الصور القادمة من قاعدة البيانات
const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  ``;

// بناء رابط الصورة (يدعم روابط كاملة أو مسارات uploads)
const resolveImageUrl = (imagePath) => {
  if (!imagePath) return "";
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) return imagePath;

  let normalized = String(imagePath).trim();

  if (!normalized.startsWith("/")) {
    if (normalized.startsWith("uploads/")) normalized = "/" + normalized;
    else if (normalized.startsWith("products/")) normalized = "/uploads/" + normalized;
    else normalized = "/uploads/" + normalized;
  }

  return `${API_BASE_URL}${normalized}`;
};

function buildCategoryMaps(rawCategories) {
  const categoryIdToSlug = {};
  const categoriesForRows = [];

  (rawCategories || []).forEach((cat) => {
    const baseSlug =
      cat.slug || (cat.name ? cat.name.trim().toLowerCase() : "") || String(cat._id || "");
    if (cat._id) categoryIdToSlug[String(cat._id)] = baseSlug;

    categoriesForRows.push({
      id: baseSlug,
      name: cat.name,
    });
  });

  return { categoryIdToSlug, categoriesForRows };
}

function getCategoryKey(rawCategory, categoryIdToSlug) {
  if (!rawCategory) return "";

  if (typeof rawCategory === "string") {
    return categoryIdToSlug?.[rawCategory] || rawCategory;
  }

  if (typeof rawCategory === "object") {
    if (rawCategory._id && categoryIdToSlug?.[rawCategory._id]) {
      return categoryIdToSlug[rawCategory._id];
    }
    if (rawCategory.slug) return rawCategory.slug;
    if (rawCategory.name) return rawCategory.name.trim().toLowerCase();
  }

  return "";
}

function normalizeCardProduct(rawProduct, categoryIdToSlug) {
  if (!rawProduct) return null;

  const id = rawProduct._id || rawProduct.id || rawProduct.productId;
  if (!id) return null;

  const category = getCategoryKey(rawProduct.category, categoryIdToSlug);

  let imageUrl = "";
  if (Array.isArray(rawProduct.images) && rawProduct.images.length > 0) {
    const first = rawProduct.images[0];
    if (typeof first === "string") imageUrl = resolveImageUrl(first);
    else if (first && typeof first === "object") {
      imageUrl = resolveImageUrl(first.url || first.path || first.src);
    }
  }
  if (!imageUrl) imageUrl = "/assets/products/default.jpg";

  return {
    id,
    category,
    name: rawProduct.name || rawProduct.title || "منتج بدون اسم",
    description: rawProduct.shortDescription || rawProduct.description || "",
    price: rawProduct.price || rawProduct.currentPrice || 0,
    image: imageUrl,
    stock: rawProduct.stock ?? 0,
    isActive: rawProduct.isActive ?? true,
    status: rawProduct.status || "active",
  };
}

function normalizeDetailsProduct(raw) {
  if (!raw) return null;

  const id = raw.id || raw._id || raw.productId;

  let images = [];
  if (Array.isArray(raw.images) && raw.images.length > 0) {
    images = raw.images
      .map((img) => {
        if (typeof img === "string") return resolveImageUrl(img);
        if (img && typeof img === "object") return resolveImageUrl(img.url || img.path || img.src);
        return "";
      })
      .filter(Boolean);
  } else if (raw.image) {
    const single =
      typeof raw.image === "string"
        ? resolveImageUrl(raw.image)
        : resolveImageUrl(raw.image.url || raw.image.path || raw.image.src);

    images = single ? [single] : [];
  }

  const mainImage = images.length > 0 ? images[0] : "/assets/products/default.jpg";

  const storeName =
    raw.store?.name ||
    raw.storeName ||
    raw.sellerStoreName ||
    raw.seller?.storeName ||
    "";

  // ✅ لا نعتبر rating صالحًا إلا إذا كان بين 1 و 5 (حتى لا يظهر 0.0 قبل وجود تقييمات)
  const ratingNum = Number(raw.rating);
  const rating = Number.isFinite(ratingNum) && ratingNum >= 1 && ratingNum <= 5 ? ratingNum : null;

  // ✅ عدد التقييمات (قد لا يرجع من الباك) - نحفظه إن وجد
  const numReviewsNum = Number(
    raw.numReviews ?? raw.numRatings ?? raw.reviewsCount ?? raw.reviewCount ?? 0
  );
  const numReviews = Number.isFinite(numReviewsNum) && numReviewsNum > 0 ? numReviewsNum : 0;

  const price = raw.price || raw.currentPrice || 0;

  const description = raw.description || raw.longDescription || raw.fullDescription || "";
  const shortDescription = raw.shortDescription || raw.shortTagline || raw.subtitle || description;

  return {
    id,
    image: mainImage,
    name: raw.name || raw.title || "منتج بدون اسم",
    rating,
    numReviews,
    price,
    storeName,
    images,
    shortDescription,
    description,
    stock: raw.stock ?? 0,
    isActive: raw.isActive ?? true,
    status: raw.status || "active",
    raw,
  };
}

const safeKey = (value, fallbackPrefix = "opt") => {
  const base = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\u0600-\u06FF-]+/g, "");
  return base || `${fallbackPrefix}-${Date.now()}`;
};

function parseVariantsToUiOptions(variantsRaw) {
  const out = { colors: [], sizes: [] };
  if (!variantsRaw) return out;

  let obj = null;

  if (typeof variantsRaw === "string") {
    const s = variantsRaw.trim();
    if (!s) return out;

    if ((s.startsWith("{") && s.endsWith("}")) || (s.startsWith("[") && s.endsWith("]"))) {
      try {
        obj = JSON.parse(s);
      } catch {
        return out;
      }
    } else {
      return out;
    }
  } else if (typeof variantsRaw === "object") {
    obj = variantsRaw;
  }

  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return out;

  const seenColors = new Set();
  const seenSizes = new Set();

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

      const dedupe = label.toLowerCase();
      if (seenColors.has(dedupe)) return;
      seenColors.add(dedupe);

      const key = String(
        (c && typeof c === "object" && c.key) || safeKey(label, `color-${idx + 1}`)
      );
      // ✅ Fix: Only use real hex value, no default gray
      out.colors.push({
        key,
        label,
        hex: hex || "",
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

      const dedupe = label.toLowerCase();
      if (seenSizes.has(dedupe)) return;
      seenSizes.add(dedupe);

      const key = String(
        (s && typeof s === "object" && s.key) || safeKey(label, `size-${idx + 1}`)
      );
      out.sizes.push({ key, label });
    });
  }

  return out;
}

export default function ProductDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const {
    cartItems,
    isInCart,
    isInWishlist,
    toggleCartItem,
    toggleWishlistItem,
    showToast,
    updateCartItemQuantity,
  } = useApp();

  const [product, setProduct] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [relatedByName, setRelatedByName] = useState([]);
  const [relatedByCategory, setRelatedByCategory] = useState([]);
  const [extraRows, setExtraRows] = useState([]);
  const [isRelatedLoading, setIsRelatedLoading] = useState(false);
  const [relatedError, setRelatedError] = useState("");

  // ✅ الشريط السفلي: كمية + كتابة يدويًا
  const [qty, setQty] = useState(1);
  const [qtyText, setQtyText] = useState("1");

  // 🚀 FORCE SCROLL TO TOP: Triggers whenever product ID changes
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [id]);

  useEffect(() => {
    setQtyText(String(qty));
  }, [qty]);

  // وصف: المزيد/إخفاء
  const [descExpanded, setDescExpanded] = useState(false);

  // ✅ خيارات الألوان/الأحجام من المنتج نفسه (variants JSON)
  const variantOptions = useMemo(() => {
    return parseVariantsToUiOptions(product?.raw?.variants);
  }, [product?.raw?.variants]);

  const colorOptions = variantOptions.colors || [];
  const sizeOptions = variantOptions.sizes || [];

  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");

  // ✅ Reviews state
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState("");

  // تثبيت اختيار افتراضي عند توفر الخيارات
  useEffect(() => {
    if (!colorOptions.length) {
      if (selectedColor !== "") setSelectedColor("");
      return;
    }
    if (!selectedColor || !colorOptions.some((c) => c.key === selectedColor)) {
      setSelectedColor(colorOptions[0].key);
    }
  }, [colorOptions, selectedColor]);

  useEffect(() => {
    if (!sizeOptions.length) {
      if (selectedSize !== "") setSelectedSize("");
      return;
    }
    if (!selectedSize || !sizeOptions.some((s) => s.key === selectedSize)) {
      setSelectedSize(sizeOptions[0].key);
    }
  }, [sizeOptions, selectedSize]);

  // تحميل المنتج
  useEffect(() => {
    if (!id) return;

    let isMounted = true;

    async function loadProduct() {
      try {
        setIsLoading(true);
        setError("");
        const data = await getProductById(id);
        if (!isMounted) return;

        const normalized = normalizeDetailsProduct(data);
        setProduct(normalized);

        const firstImage =
          normalized?.images && normalized.images.length > 0 ? normalized.images[0] : null;
        setSelectedImage(firstImage);
      } catch {
        if (isMounted) setError("تعذّر تحميل بيانات المنتج. حاول مرة أخرى.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadProduct();

    return () => {
      isMounted = false;
    };
  }, [id]);

  // ✅ تحميل تقييمات المنتج
  useEffect(() => {
    if (!product?.id) return;

    let isMounted = true;

    async function loadReviews() {
      try {
        setReviewsLoading(true);
        setReviewsError("");
        const data = await getProductReviews(product.id);
        if (!isMounted) return;

        const list = Array.isArray(data?.reviews) ? data.reviews : [];
        setReviews(list);
      } catch {
        if (!isMounted) return;
        setReviews([]);
        setReviewsError("تعذّر تحميل التقييمات.");
      } finally {
        if (isMounted) setReviewsLoading(false);
      }
    }

    loadReviews();

    return () => {
      isMounted = false;
    };
  }, [product?.id]);





  // تحميل المنتجات المقترحة
  useEffect(() => {
    if (!product?.id) return;

    let isMounted = true;

    async function loadRelated() {
      try {
        setIsRelatedLoading(true);
        setRelatedError("");

        // 🧠 جلب التوصيات من الباك إند الجديد
        const data = await getProductRecommendations(product.id);

        if (!isMounted) return;

        const { similar = [], seller = [], trending = [] } = data;

        // نحتاج لـ categoryIdToSlug فقط لتطبيع المنتجات للواجهة
        // جلب التصنيفات هنا (كاش أو سريع) للتطبيع
        const catRes = await getCategories();
        const rawCategories = catRes?.categories || [];
        const { categoryIdToSlug } = buildCategoryMaps(rawCategories);

        const normalize = (list) =>
          list.map(p => normalizeCardProduct(p, categoryIdToSlug)).filter(Boolean);

        setRelatedByName(normalize(similar));
        setRelatedByCategory(normalize(seller)); // عرض منتجات البائع في هذا السلوت

        // تحويل صف "Trending" إلى هيكل Extra Rows
        const trendingRow = {
          id: "trending",
          title: "الأكثر مبيعاً في هذا القسم",
          products: normalize(trending)
        };

        setExtraRows([trendingRow]);
      } catch (error) {
        console.error("Recommendations UI Error:", error);
        if (isMounted) setRelatedError("تعذّر تحميل المنتجات المقترحة.");
      } finally {
        if (isMounted) setIsRelatedLoading(false);
      }
    }

    loadRelated();

    return () => {
      isMounted = false;
    };
  }, [product]);

  const inCart = product?.id ? isInCart(product.id) : false;
  const inWishlist = product?.id ? isInWishlist(product.id) : false;

  const isOutOfStock = useMemo(() => {
    if (!product) return false;
    return (product.stock <= 0) || (product.isActive === false) || (product.status === "inactive");
  }, [product]);

  // ✅ إذا كان المنتج موجودًا في السلة: اعرض نفس الكمية المحفوظة
  useEffect(() => {
    if (!product?.id) return;

    const pid = String(product.id);
    const found = (cartItems || []).find((ci) => {
      const cid =
        ci?.id ||
        ci?._id ||
        ci?.productId ||
        ci?.product_id ||
        ci?.product?.id ||
        ci?.product?._id;
      return cid != null && String(cid) === pid;
    });

    if (found && typeof found.quantity === "number" && found.quantity > 0) {
      setQty(found.quantity);
      setQtyText(String(found.quantity));
    }
  }, [product?.id, cartItems]);

  const productName = product?.name || "—";
  const storeName = product?.storeName || "";

  const mainImage = useMemo(() => {
    if (selectedImage) return selectedImage;
    if (product?.images && product.images.length > 0) return product.images[0];
    return "/assets/placeholders/product-placeholder.svg";
  }, [selectedImage, product]);

  const activeImageIndex = useMemo(() => {
    const imgs = product?.images || [];
    if (!imgs.length) return 0;
    const idx = imgs.findIndex((x) => x === mainImage);
    return idx >= 0 ? idx : 0;
  }, [product?.images, mainImage]);

  const totalPrice = useMemo(() => {
    const p = Number(product?.price || 0);
    const q = Number(qty || 1);
    return Math.max(0, p * q);
  }, [product?.price, qty]);

  // ✅ مهم: اعتبر فقط التقييمات الصالحة (1..5)
  const validReviews = useMemo(() => {
    const list = Array.isArray(reviews) ? reviews : [];
    return list.filter((r) => {
      const v = Number(r?.rating);
      return Number.isFinite(v) && v >= 1 && v <= 5;
    });
  }, [reviews]);

  // ✅ إحصائيات التقييم (مبنية على التقييمات الصالحة فقط)
  const effectiveNumReviews = useMemo(() => {
    return validReviews.length;
  }, [validReviews]);

  const effectiveAvgRating = useMemo(() => {
    if (effectiveNumReviews === 0) return null;

    // ✅ لا تعتمد rating من المنتج إلا إذا كانت قيمة صحيحة (>=1 && <=5)
    if (typeof product?.rating === "number" && product.rating >= 1 && product.rating <= 5) {
      return product.rating;
    }

    const sum = validReviews.reduce((acc, r) => acc + Number(r.rating), 0);
    const avg = sum / effectiveNumReviews;

    if (!Number.isFinite(avg) || avg < 1 || avg > 5) return null;
    return avg;
  }, [effectiveNumReviews, product?.rating, validReviews]);

  const handleAddToCart = () => {
    if (!product?.id) return;

    const safeQty = Math.max(1, Math.min(99, parseInt(String(qty || 1), 10) || 1));

    if (inCart) {
      toggleCartItem(product);
      showToast("تمت إزالة المنتج من السلة", "success");
      return;
    }

    const chosenColor = colorOptions.find((c) => c.key === selectedColor);
    const chosenSize = sizeOptions.find((s) => s.key === selectedSize);

    const selectedColorObj = chosenColor
      ? { key: chosenColor.key, label: chosenColor.label, hex: chosenColor.hex }
      : undefined;

    const selectedSizeObj = chosenSize ? { key: chosenSize.key, label: chosenSize.label } : undefined;

    toggleCartItem({
      ...product,
      quantity: safeQty,

      selectedColor: selectedColorObj,
      selectedSize: selectedSizeObj,

      selectedColorKey: selectedColorObj?.key || "",
      selectedColorLabel: selectedColorObj?.label || "",
      selectedSizeKey: selectedSizeObj?.key || "",
      selectedSizeLabel: selectedSizeObj?.label || "",
    });

    if (typeof updateCartItemQuantity === "function") {
      updateCartItemQuantity(product.id, safeQty);
    }

    showToast("تمت إضافة المنتج إلى السلة", "success");
  };

  const handleToggleFavorite = async () => {
    if (!product?.id) return;

    try {
      if (inWishlist) {
        await userService.removeFromWishlist(product.id);
        toggleWishlistItem(product);
        showToast("تمت إزالة المنتج من المفضلة", "success");
      } else {
        await userService.addToWishlist(product.id);
        toggleWishlistItem(product);
        showToast("تمت إضافة المنتج إلى المفضلة", "success");
      }
    } catch (err) {
      const status = err?.response?.status;
      const backendMessage = err?.response?.data?.message;

      if (status === 401) {
        showToast("الرجاء تسجيل الدخول لإدارة قائمة المفضلة", "error");
        navigate("/login");
      } else {
        showToast(backendMessage || "تعذر تحديث المفضلة، حاول مرة أخرى", "error");
      }
    }
  };

  const handleShare = async () => {
    try {
      const url = `${window.location.origin}/products/${id}`;
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(url);
      showToast("تم نسخ رابط المنتج", "success");
    } catch {
      showToast("تعذر مشاركة المنتج، حاول مرة أخرى", "error");
    }
  };

  const handleSizeGuide = () => {
    showToast("دليل المقاسات سيتم إضافته قريبًا", "success");
  };


  const shortText = useMemo(() => {
    const full = (product?.description || product?.shortDescription || "").trim();
    if (!full) return "";
    if (full.length <= 140) return full;
    return full.slice(0, 140).trim() + "…";
  }, [product?.description, product?.shortDescription]);

  const fullText = useMemo(() => {
    return (product?.description || product?.shortDescription || "").trim();
  }, [product?.description, product?.shortDescription]);

  const shownText = descExpanded ? fullText : shortText;

  return (
    <div className="product-page pd-has-bottom-bar">
      {isLoading && (
        <section className="pd-hero">
          <div className="pd-gallery pd-skeleton">
            <div className="pd-main-image-wrapper">
              <span>جارٍ تحميل بيانات المنتج...</span>
            </div>
          </div>
        </section>
      )}

      {!isLoading && error && (
        <section className="pd-hero">
          <div className="pd-gallery pd-skeleton">
            <div className="pd-main-image-wrapper">
              <span>{error}</span>
            </div>
          </div>

          <div className="pd-basic-card">
            <button type="button" className="pd-primary-pill" onClick={() => navigate("/")}>
              العودة إلى الرئيسية
            </button>
          </div>
        </section>
      )}

      {!isLoading && !error && product && (
        <>
          <section className="pd-hero">
            <div className="pd-gallery">
              <div className="pd-back-action" aria-label="رجوع">
                <button type="button" className="pd-fab-btn" onClick={() => navigate(-1)} aria-label="رجوع">
                  <ChevronRight />
                </button>
              </div>

              <div className="pd-fab-actions" aria-label="إجراءات سريعة">
                <button
                  type="button"
                  className={"pd-fab-btn" + (inWishlist ? " is-active" : "")}
                  onClick={handleToggleFavorite}
                  aria-label="مفضلة"
                >
                  <Heart />
                </button>

                <button type="button" className="pd-fab-btn" onClick={handleShare} aria-label="مشاركة">
                  <Share2 />
                </button>
              </div>

              <div className="pd-main-image-wrapper">
                {/* Main Image - Fills container completely */}
                <img
                  src={mainImage}
                  alt={productName}
                  className="pd-main-image"
                />
              </div>

              {/* Thumbnails repositioned under main image */}
              {product.images && product.images.length > 1 && (
                <div className="pd-thumbnails-container">
                  <div className="pd-thumbnails-row">
                    {product.images.slice(0, 6).map((img, idx) => (
                      <button
                        key={img + idx}
                        type="button"
                        className={"pd-thumb-btn" + (img === mainImage ? " is-active" : "")}
                        onClick={() => setSelectedImage(img)}
                        aria-label={`صورة ${idx + 1}`}
                      >
                        <img src={img} alt={`صورة ${idx + 1}`} />
                      </button>
                    ))}
                  </div>
                </div>
              )}


              {product.images && product.images.length > 1 && (
                <div className="pd-dots" aria-label="مؤشرات الصور">
                  {product.images.map((_, idx) => (
                    <span key={idx} className={"pd-dot" + (idx === activeImageIndex ? " is-active" : "")} />
                  ))}
                </div>
              )}
            </div>

            <div className="pd-content">
              {/* 1. Main Info Wrapper: Groups all scannable data */}
              <div className="pd-main-info-wrapper pd-fade-in">

                {/* A. Identity Block */}
                <div className="pd-refined-block pd-identity-group">
                  <div className="pd-rating-badge">
                    {effectiveNumReviews > 0 &&
                      typeof effectiveAvgRating === "number" &&
                      effectiveAvgRating >= 1 ? (
                      <>
                        <span className="pd-rating-number">{effectiveAvgRating.toFixed(1)}</span>
                        <span style={{ color: "#fbbf24" }}>★</span>
                        <span className="pd-rating-count">
                          ({effectiveNumReviews} تقييم)
                        </span>
                      </>
                    ) : (
                      <span className="pd-rating-empty">لا توجد تقييمات بعد</span>
                    )}
                  </div>
                  <h1 className="pd-title">{productName}</h1>
                </div>

                {/* B. Narrative Block (Promoted below Identity) */}
                <div className="pd-refined-block pd-narrative-group">
                  <div className="pd-section-title">
                    وصف المنتج
                  </div>
                  {shownText ? (
                    <div className="pd-desc-content">
                      <p className="pd-desc-text">{shownText}</p>
                      {fullText && fullText.length > 140 && (
                        <button
                          type="button"
                          className="pd-link"
                          onClick={() => setDescExpanded((v) => !v)}
                        >
                          {descExpanded ? "عرض أقل" : "اقرأ المزيد"}
                        </button>
                      )}
                    </div>
                  ) : (
                    <p className="pd-desc-empty">لا يوجد وصف متاح لهذا المنتج حالياً.</p>
                  )}
                </div>

                {/* D. Specs & Selection Block */}
                <div className="pd-refined-block pd-selection-group">
                  {colorOptions.length > 0 && (
                    <div className="pd-option-block">
                      <div className="pd-section-title">
                        اختر اللون المناسب
                      </div>
                      <div className="pd-swatches">
                        {colorOptions.map((c) => {
                          const active = c.key === selectedColor;
                          return (
                            <button
                              key={c.key}
                              type="button"
                              className={"pd-color-option" + (active ? " is-active" : "")}
                              onClick={() => setSelectedColor(c.key)}
                              aria-label={c.label}
                              title={c.label}
                            >
                              <span
                                className="pd-color-circle"
                                style={{ backgroundColor: c.hex }}
                              />
                              <span className="pd-color-label">{c.label}</span>
                              {active && <span className="pd-color-check">✓</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {sizeOptions.length > 0 && (
                    <div className="pd-option-block">
                      <div className="pd-section-title">
                        اختر المقاس المناسب
                      </div>
                      <div className="pd-size-pills">
                        {sizeOptions.map((s) => {
                          const active = s.key === selectedSize;
                          return (
                            <button
                              key={s.key}
                              type="button"
                              className={"pd-pill" + (active ? " is-active" : "")}
                              onClick={() => setSelectedSize(s.key)}
                            >
                              {s.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* E. Origin Block */}
                  {storeName && (
                    <div className="pd-seller-badge-container">
                      <div className="pd-seller-row" aria-label="المتجر" onClick={() => navigate(`/stores/${product?.raw?.store?._id || product?.raw?.seller?._id}`)}>
                        <span className="pd-seller-name">
                          <Store className="pd-seller-icon" size={18} color="#ff7f00" />
                          {storeName}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 2. Transactional Core: Purchase Bar */}
              <div className="pd-action-block" aria-label="وحدة الشراء">
                <div className="pd-total">
                  <div className="pd-total-label">المجموع الكلي</div>
                  <div className="pd-total-value">
                    {totalPrice} <span className="pd-currency">ر.ي</span>
                  </div>
                </div>

                {isOutOfStock && (
                  <div className="pd-out-of-stock-label">نعتذر، نفذت الكمية حالياً</div>
                )}

                <div className="pd-qty" aria-label="الكمية">
                  <button
                    type="button"
                    className="pd-qty-btn"
                    onClick={() => {
                      const max = typeof product.stock === "number" ? product.stock : 99;
                      if (qty >= max) {
                        showToast(`الكمية المتاحة هي فقط (${max})`, "error");
                        return;
                      }
                      setQty((q) => Math.min(max, q + 1));
                    }}
                    aria-label="زيادة الكمية"
                    disabled={isOutOfStock}
                  >
                    +
                  </button>

                  <input
                    className="pd-qty-input"
                    value={qtyText}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "") {
                        setQtyText("");
                        return;
                      }
                      if (!/^\d{1,3}$/.test(v)) return;

                      const max = typeof product.stock === "number" ? product.stock : 99;
                      let n = parseInt(v, 10) || 1;

                      if (n > max) {
                        showToast(`الكمية المتاحة هي فقط (${max})`, "error");
                        n = max;
                      }

                      setQty(n);
                      setQtyText(String(n));
                    }}
                    onBlur={() => {
                      if (qtyText === "") setQtyText(String(qty));
                    }}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    aria-label="رقم الكمية"
                    disabled={isOutOfStock}
                  />

                  <button
                    type="button"
                    className="pd-qty-btn"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    aria-label="إنقاص الكمية"
                    disabled={isOutOfStock}
                  >
                    −
                  </button>
                </div>

                <button
                  type="button"
                  className={"pd-add-btn" + (inCart ? " is-active" : "") + (isOutOfStock ? " is-disabled" : "")}
                  onClick={handleAddToCart}
                  disabled={isOutOfStock}
                  aria-label={isOutOfStock ? "نفذت الكمية" : inCart ? "إزالة من السلة" : "إضافة إلى السلة"}
                >
                  {isOutOfStock ? (
                    <>
                      <XCircle size={20} />
                      <span>نفذت الكمية</span>
                    </>
                  ) : inCart ? (
                    <>
                      <Check size={20} />
                      <span>تمت الإضافة</span>
                    </>
                  ) : (
                    <>
                      <ShoppingCart size={20} />
                      <span>أضف إلى السلة</span>
                    </>
                  )}
                </button>
              </div>

            </div>
          </section>

          <section className="pd-refined-block pd-reviews-wrapper">
            <div className="pd-section-title">
              آراء العملاء ({effectiveNumReviews})
            </div>

            {reviewsLoading && <div className="pd-loading">جاري تحميل التقييمات...</div>}
            {!reviewsLoading && validReviews.length === 0 && (
              <div className="pd-empty-reviews">لا توجد تقييمات لهذا المنتج بعد. كن أول من يقيمه!</div>
            )}

            <div className="pd-reviews-list">
              {validReviews.map((review) => (
                <div key={review._id || Math.random()} className="pd-review-card-refined">
                  <div className="pd-review-header">
                    <span className="pd-review-user">{review.user?.firstName || "مستخدم متجر طلبية"}</span>
                    <div className="pd-review-stars">
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star key={s} size={12} fill={s <= review.rating ? "#fbbf24" : "none"} stroke={s <= review.rating ? "#fbbf24" : "#e5e7eb"} />
                      ))}
                    </div>
                  </div>
                  {review.comment && <p className="pd-review-comment">{review.comment}</p>}
                  <div className="pd-review-meta">
                    <span>{new Date(review.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    {review.isVerifiedPurchase && (
                      <span className="pd-verified-purchase">
                        <Check size={14} />
                        شراء مؤكد
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="pd-related-wrapper">
            {isRelatedLoading && <div className="pd-related-loading">جارٍ تحميل المنتجات المقترحة...</div>}
            {!isRelatedLoading && relatedError && <div className="pd-related-error">{relatedError}</div>}

            {!isRelatedLoading && !relatedError && (
              <>
                {relatedByName.length > 0 && (
                  <section className="pd-related-section">
                    <HScrollWrap key={`similar-${relatedByName.length}`} className="pd-related-row">
                      {relatedByName.map((p) => (
                        <ProductCard key={p.id} product={p} />
                      ))}
                    </HScrollWrap>
                  </section>
                )}

                {relatedByCategory.length > 0 && (
                  <section className="pd-related-section">
                    <HScrollWrap key={`category-${relatedByCategory.length}`} className="pd-related-row">
                      {relatedByCategory.map((p) => (
                        <ProductCard key={p.id} product={p} />
                      ))}
                    </HScrollWrap>
                  </section>
                )}

                {extraRows.map((row) => (
                  <section key={row.id} className="pd-related-section">
                    <HScrollWrap key={`${row.id}-${row.products.length}`} className="pd-related-row">
                      {row.products.map((p) => (
                        <ProductCard key={p.id} product={p} />
                      ))}
                    </HScrollWrap>
                  </section>
                ))}
              </>
            )}
          </section>

        </>
      )}

    </div>
  );
}
