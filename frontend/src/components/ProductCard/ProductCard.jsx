// src/components/ProductCard/ProductCard.jsx
import { memo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, ShoppingCart, Share2, Check, Trash2 } from "lucide-react";
import { useApp } from "@/context/AppContext";
import userService from "@/services/userService";
import { formatCurrency } from "@/utils/formatters";
import SafeImage from "@/components/SafeImage";
import "./ProductCard.css";

// ✅ توحيد رابط صورة المنتج بشكل إنتاجي نهائي
const resolveProductImageSrc = (src) => {
  if (!src) return "";

  const raw = String(src).trim();

  // روابط كاملة أو data/blob نتركها (مع معالجة حالة /uploads داخلها)
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

  // صور محلية
  if (raw.startsWith("/assets/")) return raw;

  let normalized = raw;
  if (!normalized.startsWith("/")) normalized = "/" + normalized;

  if (normalized.startsWith("/uploads/")) return normalized;
  if (normalized.startsWith("/products/") || normalized.startsWith("/ads/")) {
    return "/uploads" + normalized;
  }

  // اسم ملف فقط أو مسار غير واضح
  return "/uploads" + normalized;
};

const ProductCard = memo(({
  product,
  selectable = false,
  selected = false,
  onSelect,
  showRemove = false,
  onRemove,
}) => {
  const navigate = useNavigate();

  const {
    id,
    name,
    description,
    price,
    image,
    oldPrice,
    status,
    inOffer,
    stock,
    isActive,
  } = product;

  const {
    isInCart,
    isInWishlist,
    toggleCartItem,
    toggleWishlistItem,
    showToast,
  } = useApp();

  const [sharedOnce, setSharedOnce] = useState(false);

  const inCart = isInCart(id);
  const inWishlist = isInWishlist(id);
  const isOutOfStock = stock <= 0 || isActive === false || status === "inactive";
  const isUnavailable = isOutOfStock; // توحيد المسمى للتوافق مع التنسيقات الموجودة
  const showDiscount = (inOffer || (oldPrice && oldPrice > price));

  const handleCardClick = () => {
    navigate(`/products/${id}`);
  };

  const handleCartClick = (event) => {
    event.stopPropagation();
    if (isUnavailable) return;
    toggleCartItem(product);

    if (inCart) {
      showToast("تمت إزالة المنتج من السلة", "success");
    } else {
      showToast("تمت إضافة المنتج إلى السلة", "success");
    }
  };

  const handleWishlistClick = async (event) => {
    event.stopPropagation();

    if (!id) return;

    try {
      if (inWishlist) {
        await userService.removeFromWishlist(id);
        toggleWishlistItem(product);
        showToast("تمت إزالة المنتج من المفضلة", "success");
      } else {
        await userService.addToWishlist(id);
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

  const handleShareClick = (event) => {
    event.stopPropagation();
    try {
      const url = `${window.location.origin}/products/${id}`;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url);
      }
      setSharedOnce(true);
      showToast("تم نسخ رابط المنتج", "success");
    } catch {
      showToast("تعذر مشاركة المنتج، حاول مرة أخرى", "error");
    }
  };

  const handleRemoveClick = (event) => {
    event.stopPropagation();
    onRemove?.(id);
  };

  const handleCheckboxClick = (event) => {
    event.stopPropagation();
    onSelect?.(id);
  };

  const imageSrc = resolveProductImageSrc(image);

  return (
    <article
      className={`product-card ${isUnavailable ? "unavailable" : ""} ${selected ? "selected" : ""
        } ${selectable ? "selectable" : ""}`}
      onClick={handleCardClick}
    >
      <div className="product-image-wrapper">
        <SafeImage src={imageSrc} alt={name} className="product-image" />
        <div className="product-image-overlay" />

        {/* Top Badges & Actions Area */}
        <div className="product-badge-actions">
          {/* Left Side: Selection Checkbox */}
          <div className="product-actions-left">
            {selectable && (
              <div className={`product-checkbox ${selected ? "checked" : ""}`} onClick={handleCheckboxClick}>
                {selected && <Check size={14} />}
              </div>
            )}
          </div>

          {/* Center: Badges */}
          <div className="product-badges-center">
            {isOutOfStock && <span className="product-badge-soldout">نفذت الكمية</span>}
            {showDiscount && !isOutOfStock && <span className="product-badge-offer">عرض</span>}
          </div>

          {/* Right Side: Remove Icon */}
          <div className="product-actions-right">
            {showRemove && (
              <button
                type="button"
                className="product-remove-icon"
                onClick={handleRemoveClick}
                aria-label="حذف من المفضلة"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="product-content">
        <h3 className="product-name">{name}</h3>
        <p className="product-description">{description || "\u00A0"}</p>

        <div className="product-price-row">
          <span className="product-price">
            {formatCurrency(price)}
          </span>
          {showDiscount && oldPrice && (
            <span className="product-old-price">
              {formatCurrency(oldPrice)}
            </span>
          )}
        </div>

        <div className="product-divider" />

        <div className="product-actions-row">
          <button
            type="button"
            className={
              "product-icon-circle favorite" +
              (inWishlist ? " product-icon-circle-active favorite-active" : "")
            }
            aria-label="إضافة إلى المفضلة"
            onClick={handleWishlistClick}
          >
            <Heart size={18} />
          </button>

          <button
            type="button"
            className={
              "product-icon-circle cart" +
              (inCart ? " product-icon-circle-active cart-active" : "")
            }
            aria-label={inCart ? "إزالة من السلة" : "إضافة إلى السلة"}
            onClick={handleCartClick}
            disabled={isUnavailable}
          >
            {inCart ? <Check size={18} /> : <ShoppingCart size={18} />}
          </button>

          <button
            type="button"
            className={
              "product-icon-circle share" +
              (sharedOnce ? " product-icon-circle-active share-active" : "")
            }
            aria-label="مشاركة المنتج"
            onClick={handleShareClick}
          >
            <Share2 size={18} />
          </button>
        </div>
      </div>
    </article>
  );
});

export default ProductCard;
