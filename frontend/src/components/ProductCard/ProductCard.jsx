// src/components/ProductCard/ProductCard.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, ShoppingCart, Share2, Check } from "lucide-react";
import { useApp } from "@/context/AppContext";
import userService from "@/services/userService";
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

export default function ProductCard({ product }) {
  const navigate = useNavigate();

  const { id, name, description, price, image } = product;
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

  const handleCardClick = () => {
    navigate(`/products/${id}`);
  };

  const handleCartClick = (event) => {
    event.stopPropagation();
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

  const imageSrc = resolveProductImageSrc(image);

  return (
    <article className="product-card" onClick={handleCardClick}>
      <div className="product-image-wrapper">
        <img src={imageSrc} alt={name} className="product-image" />
        <div className="product-image-overlay" />
      </div>

      <div className="product-content">
        <h3 className="product-name">{name}</h3>
        <p className="product-description">{description}</p>

        <div className="product-price-row">
          <span className="product-price">
            {price.toLocaleString("ar-SA")} ر.ي
          </span>
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
}
