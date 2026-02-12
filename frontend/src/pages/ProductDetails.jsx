// frontend/src/pages/ProductDetails.jsx

import "./ProductDetails.css";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Heart, Share2, ShoppingCart, Store, Check, ChevronRight } from "lucide-react";

import { useApp } from "@/context/AppContext";
import ProductCard from "@/components/ProductCard/ProductCard";
import { getProductById, listProducts } from "@/services/productService";
import { getCategories } from "@/services/categoryService";
import userService from "@/services/userService";

// ✅ NEW: Reviews service (ملف جديد)
import { getProductReviews, createProductReview } from "@/services/reviewService";

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
  const [myRating, setMyRating] = useState(5);
  const [myComment, setMyComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

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

        const [catRes, productsRes] = await Promise.all([getCategories(), listProducts()]);

        if (!isMounted) return;

        const rawCategories = catRes?.categories || [];
        const { categoryIdToSlug, categoriesForRows } = buildCategoryMaps(rawCategories);

        const allRawProducts = Array.isArray(productsRes) ? productsRes : productsRes?.products || [];

        const allCardProducts = allRawProducts
          .map((p) => normalizeCardProduct(p, categoryIdToSlug))
          .filter(Boolean);

        const currentId = product.id;
        const currentName = product.name || "";
        const currentCategoryKey = getCategoryKey(product.raw?.category, categoryIdToSlug);

        let restProducts = allCardProducts.filter((p) => p.id !== currentId);

        const nameWords = currentName.split(/\s+/).filter(Boolean).map((w) => w.toLowerCase());

        const byName = restProducts.filter((p) => {
          const n = (p.name || "").toLowerCase();
          return nameWords.some((w) => n.includes(w));
        });

        const byNameIds = new Set(byName.map((p) => p.id));
        restProducts = restProducts.filter((p) => !byNameIds.has(p.id));

        const byCategory = restProducts.filter(
          (p) => currentCategoryKey && p.category && p.category === currentCategoryKey
        );

        const byCategoryIds = new Set(byCategory.map((p) => p.id));
        const remaining = restProducts.filter((p) => !byCategoryIds.has(p.id));

        const rows = [];

        if (remaining.length > 0) {
          rows.push({
            id: "all",
            title: "اكتشف المزيد من طلبية",
            products: remaining.slice(0, 20),
          });
        }

        categoriesForRows.forEach((cat) => {
          const rowProducts = remaining.filter((p) => p.category === cat.id);
          if (rowProducts.length > 0) {
            rows.push({
              id: cat.id,
              title: `منتجات من قسم ${cat.name}`,
              products: rowProducts.slice(0, 20),
            });
          }
        });

        setRelatedByName(byName.slice(0, 12));
        setRelatedByCategory(byCategory.slice(0, 12));
        setExtraRows(rows);
      } catch {
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

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!product?.id) return;

    const ratingValue = Number(myRating);
    if (!Number.isFinite(ratingValue) || ratingValue < 1 || ratingValue > 5) {
      showToast("اختر تقييمًا من 1 إلى 5", "error");
      return;
    }

    try {
      setIsSubmittingReview(true);
      setReviewsError("");

      const payload = {
        rating: ratingValue,
        comment: String(myComment || "").trim(),
      };

      const data = await createProductReview(product.id, payload);
      showToast(data?.message || "تم إرسال تقييمك بنجاح", "success");

      try {
        const refreshed = await getProductReviews(product.id);
        setReviews(Array.isArray(refreshed?.reviews) ? refreshed.reviews : []);
      } catch {
        // ignore
      }

      setMyRating(5);
      setMyComment("");
    } catch (err) {
      const status = err?.response?.status;
      const backendMessage = err?.response?.data?.message;

      if (status === 401) {
        showToast("الرجاء تسجيل الدخول لإضافة تقييم", "error");
        navigate("/login");
      } else if (status === 403) {
        showToast(backendMessage || "لا يمكنك تقييم هذا المنتج قبل استلامه", "error");
      } else {
        showToast(backendMessage || "تعذر إرسال التقييم، حاول مرة أخرى", "error");
      }
    } finally {
      setIsSubmittingReview(false);
    }
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
    <div className="page-container product-page pd-has-bottom-bar">
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
              <div style={{ position: "absolute", right: 12, top: 12, zIndex: 4 }} aria-label="رجوع">
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
                <img src={mainImage} alt={productName} className="pd-main-image" />
              </div>

              {product.images && product.images.length > 1 && (
                <div className="pd-dots" aria-label="مؤشرات الصور">
                  {product.images.map((_, idx) => (
                    <span key={idx} className={"pd-dot" + (idx === activeImageIndex ? " is-active" : "")} />
                  ))}
                </div>
              )}

              {product.images && product.images.length > 1 && (
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
              )}
            </div>

            <div className="pd-content">
              {/* ✅ منع ظهور 0.0 نهائيًا (لا يُعرض الرقم إلا إذا كان >= 1 فعلاً) */}
              <div className="pd-rating-badge">
                {effectiveNumReviews > 0 &&
                typeof effectiveAvgRating === "number" &&
                effectiveAvgRating >= 1 ? (
                  <>
                    <span className="pd-rating-number">{effectiveAvgRating.toFixed(1)}</span>
                    <span className="pd-rating-star">★</span>
                    <span style={{ marginInlineStart: 8, opacity: 0.85, fontSize: 12 }}>
                      ({effectiveNumReviews})
                    </span>
                  </>
                ) : (
                  <span style={{ opacity: 0.85, fontSize: 12 }}>لا توجد تقييمات بعد</span>
                )}
              </div>

              <h1 className="pd-title">{productName}</h1>

              <div className="pd-section">
                <div className="pd-section-title">الوصف</div>

                {shownText ? (
                  <>
                    <p className="pd-desc-text">{shownText}</p>

                    {fullText && fullText.length > 140 && (
                      <button
                        type="button"
                        className="pd-link"
                        onClick={() => setDescExpanded((v) => !v)}
                      >
                        {descExpanded ? "إخفاء" : "المزيد"}
                      </button>
                    )}
                  </>
                ) : (
                  <p className="pd-desc-empty">لا يوجد وصف متاح لهذا المنتج حالياً.</p>
                )}
              </div>

              {colorOptions.length > 0 && (
                <div className="pd-section">
                  <div className="pd-row">
                    <div className="pd-section-title">اللون</div>
                    <div className="pd-section-sub">
                      {colorOptions.find((c) => c.key === selectedColor)?.label || ""}
                    </div>
                  </div>

                  <div className="pd-swatches">
                    {colorOptions.map((c) => {
                      const active = c.key === selectedColor;
                      return (
                        <button
                          key={c.key}
                          type="button"
                          className={"pd-swatch" + (active ? " is-active" : "")}
                          onClick={() => setSelectedColor(c.key)}
                          aria-label={c.label}
                          title={c.label}
                        >
                          <span className="pd-swatch-dot" style={{ backgroundColor: c.hex }} />
                          {active && <span className="pd-swatch-check">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {sizeOptions.length > 0 && (
                <div className="pd-section">
                  <div className="pd-section-title">الحجم</div>

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

                  <button type="button" className="pd-link" onClick={handleSizeGuide}>
                    دليل المقاسات
                  </button>
                </div>
              )}

              {storeName && (
                <div className="pd-seller-row" aria-label="المتجر">
                  <span className="pd-seller-name">
                    <Store className="pd-seller-icon" />
                    {storeName}
                  </span>
                </div>
              )}

              <div className="pd-section" style={{ marginTop: 14 }}>
                <div className="pd-section-title">التقييمات</div>

                {reviewsLoading && <div style={{ opacity: 0.85 }}>جارٍ تحميل التقييمات...</div>}
                {!reviewsLoading && reviewsError && <div style={{ opacity: 0.85 }}>{reviewsError}</div>}

                {!reviewsLoading && !reviewsError && (
                  <>
                    {validReviews.length === 0 ? (
                      <div style={{ opacity: 0.85 }}>لا توجد تقييمات بعد.</div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
                        {validReviews.slice(0, 10).map((r) => (
                          <div
                            key={r._id}
                            style={{
                              padding: 12,
                              borderRadius: 12,
                              border: "1px solid rgba(0,0,0,0.06)",
                              background: "rgba(255,255,255,0.6)",
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                              <div style={{ fontWeight: 700 }}>{r?.user?.name || "مستخدم"}</div>
                              <div style={{ opacity: 0.9 }}>
                                <span style={{ fontWeight: 800 }}>{Number(r.rating).toFixed(1)}</span>
                                <span style={{ marginInlineStart: 4 }}>★</span>
                              </div>
                            </div>

                            {r?.comment ? (
                              <div style={{ marginTop: 6, opacity: 0.9, lineHeight: 1.6 }}>{r.comment}</div>
                            ) : (
                              <div style={{ marginTop: 6, opacity: 0.6 }}>بدون تعليق</div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <form onSubmit={handleSubmitReview} style={{ marginTop: 14 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <label style={{ fontWeight: 700 }}>قيّم المنتج:</label>
                        <select
                          value={myRating}
                          onChange={(e) => setMyRating(Number(e.target.value))}
                          disabled={isSubmittingReview}
                          style={{
                            padding: "10px 12px",
                            borderRadius: 12,
                            border: "1px solid rgba(0,0,0,0.12)",
                            background: "white",
                          }}
                        >
                          <option value={5}>5</option>
                          <option value={4}>4</option>
                          <option value={3}>3</option>
                          <option value={2}>2</option>
                          <option value={1}>1</option>
                        </select>
                      </div>

                      <textarea
                        value={myComment}
                        onChange={(e) => setMyComment(e.target.value)}
                        disabled={isSubmittingReview}
                        placeholder="اكتب تعليقك (اختياري)"
                        rows={3}
                        style={{
                          width: "100%",
                          marginTop: 10,
                          padding: 12,
                          borderRadius: 12,
                          border: "1px solid rgba(0,0,0,0.12)",
                          resize: "vertical",
                          background: "white",
                        }}
                      />

                      <button
                        type="submit"
                        className="pd-primary-pill"
                        disabled={isSubmittingReview}
                        style={{ marginTop: 10 }}
                      >
                        {isSubmittingReview ? "جارٍ الإرسال..." : "إرسال التقييم"}
                      </button>

                      <div style={{ marginTop: 8, opacity: 0.75, fontSize: 12, lineHeight: 1.6 }}>
                        ملاحظة: لا يمكنك تقييم المنتج إلا بعد استلامه (DELIVERED).
                      </div>
                    </form>
                  </>
                )}
              </div>
            </div>
          </section>

          <section className="pd-related-wrapper">
            {isRelatedLoading && <div className="pd-related-loading">جارٍ تحميل المنتجات المقترحة...</div>}
            {!isRelatedLoading && relatedError && <div className="pd-related-error">{relatedError}</div>}

            {!isRelatedLoading && !relatedError && (
              <>
                {relatedByName.length > 0 && (
                  <section className="pd-related-section">
                    <h2 className="pd-related-title">منتجات مشابهة قد تعجبك</h2>
                    <div className="products-row pd-related-row">
                      {relatedByName.map((p) => (
                        <ProductCard key={p.id} product={p} />
                      ))}
                    </div>
                  </section>
                )}

                {relatedByCategory.length > 0 && (
                  <section className="pd-related-section">
                    <h2 className="pd-related-title">منتجات أخرى من نفس القسم</h2>
                    <div className="products-row pd-related-row">
                      {relatedByCategory.map((p) => (
                        <ProductCard key={p.id} product={p} />
                      ))}
                    </div>
                  </section>
                )}

                {extraRows.map((row) => (
                  <section key={row.id} className="pd-related-section">
                    <h2 className="pd-related-title">{row.title}</h2>
                    <div className="products-row pd-related-row">
                      {row.products.map((p) => (
                        <ProductCard key={p.id} product={p} />
                      ))}
                    </div>
                  </section>
                ))}
              </>
            )}
          </section>

          <div className="pd-bottom-bar" role="region" aria-label="شريط الشراء">
            <button
              type="button"
              className={"pd-cart-fab" + (inCart ? " is-active" : "")}
              onClick={handleAddToCart}
              aria-label={inCart ? "إزالة من السلة" : "إضافة إلى السلة"}
            >
              {inCart ? <Check /> : <ShoppingCart />}
            </button>

            <div className="pd-qty" aria-label="الكمية">
              <button
                type="button"
                className="pd-qty-btn"
                onClick={() => setQty((q) => Math.min(99, q + 1))}
                aria-label="زيادة الكمية"
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

                  if (!/^\d{1,2}$/.test(v)) return;

                  const n = Math.max(1, Math.min(99, parseInt(v, 10) || 1));
                  setQty(n);
                  setQtyText(String(n));
                }}
                onBlur={() => {
                  if (qtyText === "") setQtyText(String(qty));
                }}
                inputMode="numeric"
                pattern="[0-9]*"
                aria-label="رقم الكمية"
              />

              <button
                type="button"
                className="pd-qty-btn"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                aria-label="إنقاص الكمية"
              >
                −
              </button>
            </div>

            <div className="pd-total">
              <div className="pd-total-label">المجموع الكلي</div>
              <div className="pd-total-value">
                {totalPrice} <span className="pd-currency">ر.ي</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
