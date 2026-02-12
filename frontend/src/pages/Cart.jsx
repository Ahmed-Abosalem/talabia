// src/pages/Cart.jsx

import "./Cart.css";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShoppingCart,
  Trash2,
  ArrowLeft,
  Plus,
  Minus,
  Info,
  Tag,
  ShieldCheck,
} from "lucide-react";
import { useApp } from "@/context/AppContext";

function formatStatus(status) {
  switch (status) {
    case "available":
      return "متوفر";
    case "limited":
      return "كمية محدودة";
    case "unavailable":
      return "غير متوفر";
    default:
      return "متوفر";
  }
}

export default function Cart() {
  const navigate = useNavigate();
  const {
    cartItems,
    toggleCartItem,
    clearCart,
    showToast,
    updateCartItemQuantity,
  } = useApp();

  const [rows, setRows] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);

  const [discountCode, setDiscountCode] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountMessage, setDiscountMessage] = useState("");

  // مزامنة عناصر السلة من الـ Context مع صفوف الصفحة مع الحفاظ على الكميات
  useEffect(() => {
    setRows((prevRows) =>
      cartItems.map((item) => {
        const existing = prevRows.find((r) => r.id === item.id);
        const quantity =
          existing && typeof existing.quantity === "number"
            ? Math.max(1, existing.quantity)
            : typeof item.quantity === "number" && item.quantity > 0
            ? item.quantity
            : 1;

        return {
          ...item,
          quantity,
          status: item.status || "available", // available | limited | unavailable
          stockLeft: typeof item.stockLeft === "number" ? item.stockLeft : null,
        };
      })
    );

    // تنظيف التحديد من العناصر المحذوفة
    setSelectedIds((prev) =>
      prev.filter((id) => cartItems.some((item) => item.id === id))
    );
  }, [cartItems]);

  const hasItems = rows.length > 0;
  const hasSelection = selectedIds.length > 0;
  const allSelected = hasItems && rows.every((row) => selectedIds.includes(row.id));

  // ملخص الأرقام (بدون شحن، فقط إجمالي + خصم)
  const summary = useMemo(() => {
    if (rows.length === 0) {
      return {
        itemsCount: 0,
        subtotal: 0,
        discount: 0,
        total: 0,
      };
    }

    const itemsCount = rows.reduce((sum, row) => sum + row.quantity, 0);
    const subtotal = rows.reduce((sum, row) => sum + row.price * row.quantity, 0);

    const discount = Math.min(discountAmount, subtotal);
    const total = Math.max(subtotal - discount, 0);

    return { itemsCount, subtotal, discount, total };
  }, [rows, discountAmount]);

  // تغيير الكمية بالأزرار
  const handleQtyChange = (id, delta) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const newQuantity = Math.max(1, row.quantity + delta);
        updateCartItemQuantity(id, newQuantity);
        return { ...row, quantity: newQuantity };
      })
    );
  };

  // تعديل الكمية يدويًا بالحقل
  const handleQtyInput = (id, value) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const parsed = parseInt(value, 10);
        const newQuantity = !isNaN(parsed) && parsed > 0 ? parsed : 1;
        updateCartItemQuantity(id, newQuantity);
        return { ...row, quantity: newQuantity };
      })
    );
  };

  // تحديد/إلغاء تحديد عنصر واحد
  const toggleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // تحديد/إلغاء الكل
  const toggleSelectAll = () => {
    if (allSelected) setSelectedIds([]);
    else setSelectedIds(rows.map((row) => row.id));
  };

  // حذف عنصر واحد
  const handleRemoveItem = (row) => {
    toggleCartItem(row);
    setSelectedIds((prev) => prev.filter((id) => id !== row.id));
    showToast("تمت إزالة المنتج من السلة", "success");
  };

  // حذف المحدد
  const handleRemoveSelected = () => {
    if (!hasSelection) return;
    const toRemove = rows.filter((row) => selectedIds.includes(row.id));
    toRemove.forEach((row) => toggleCartItem(row));
    setSelectedIds([]);
    showToast("تم حذف المنتجات المحددة من السلة", "success");
  };

  // إفراغ السلة بالكامل
  const handleClearCart = () => {
    if (!hasItems) return;
    clearCart();
    setSelectedIds([]);
    showToast("تم إفراغ السلة بالكامل", "success");
  };

  // تطبيق كود الخصم
  const handleApplyDiscount = () => {
    const code = discountCode.trim().toUpperCase();
    const subtotal = rows.reduce((sum, row) => sum + row.price * row.quantity, 0);

    if (!code) {
      showToast("أدخل كود الخصم أولاً", "info");
      setDiscountMessage("");
      setDiscountAmount(0);
      return;
    }

    let newDiscount = 0;
    let message = "";

    if (code === "SAVE20") {
      if (subtotal >= 100) {
        newDiscount = 20;
        message = "تم تطبيق خصم 20 ر.ي على الطلب";
      } else {
        message = "هذا الكود يتطلب حد أدنى 100 ر.ي";
      }
    } else if (code === "SAVE10") {
      if (subtotal > 0) {
        newDiscount = Math.round(subtotal * 0.1);
        message = "تم تطبيق خصم 10٪ على إجمالي المنتجات";
      } else {
        message = "السلة فارغة، لا يمكن تطبيق الخصم";
      }
    } else {
      message = "كود الخصم غير معروف";
    }

    setDiscountAmount(newDiscount);

    if (newDiscount > 0) {
      setDiscountMessage(message);
      showToast(message, "success");
    } else {
      setDiscountMessage("");
      showToast(message, "error");
    }
  };

  // إتمام الطلب
  const handleCheckout = () => {
    if (!hasItems) {
      showToast("سلتك فارغة، أضف منتجات أولاً", "info");
      return;
    }
    navigate("/checkout");
  };


  // الانتقال لصفحة تفاصيل المنتج عند الضغط على كرت المنتج في السلة
  // ملاحظة: إذا كان مسار صفحة تفاصيل المنتج لديك مختلفاً، غيّر الثابت التالي فقط.
  const PRODUCT_DETAILS_BASE = "/products";

  const getProductId = (row) => {
    // نعطي أولوية لأي حقول صريحة للـ productId ثم نرجع إلى id المعتاد
    return (
      row?.productId ||
      row?.product_id ||
      row?.product?.id ||
      row?.product?._id ||
      row?.product?._id ||
      row?._id ||
      row?.id
    );
  };

  const handleGoToProduct = (row) => {
    const pid = getProductId(row);
    if (!pid) return;
    navigate(`${PRODUCT_DETAILS_BASE}/${encodeURIComponent(String(pid))}`);
  };

  return (
    <div className="page-container cart-page">
      {/* الهيدر الأزرق العلوي */}
      <header className="cart-header">
        <div className="cart-header-main">
          <div className="cart-title-row">
            <div className="cart-icon-circle">
              <ShoppingCart size={22} />
            </div>
            <div className="cart-title-text">
              <h1 className="cart-title">سلة مشترياتي</h1>
              <p className="cart-subtitle">
                {hasItems
                  ? `لديك ${summary.itemsCount} منتج في السلة`
                  : "سلتك فارغة حاليًا – أضف بعض المنتجات وابدأ التسوق"}
              </p>
            </div>
          </div>
        </div>

        <div className="cart-header-actions">
          <button
            type="button"
            className="cart-header-btn ghost"
            onClick={() => navigate("/")}
          >
            <ArrowLeft size={15} />
            <span>مواصلة التسوق</span>
          </button>

          {hasItems && (
            <button
              type="button"
              className="cart-header-btn danger"
              onClick={handleClearCart}
            >
              <Trash2 size={15} />
              <span>إفراغ السلة</span>
            </button>
          )}
        </div>
      </header>

      {/* حالة السلة الفارغة */}
      {!hasItems && (
        <section className="cart-empty-state">
          <div className="cart-empty-icon">
            <ShoppingCart size={30} />
          </div>
          <h2 className="cart-empty-title">سلتك تنتظر منتجاتك المفضلة</h2>
          <p className="cart-empty-text">
            يمكنك إضافة المنتجات إلى السلة من خلال الضغط على أيقونة السلة في بطاقة المنتج.
          </p>
          <button
            type="button"
            className="cart-empty-btn"
            onClick={() => navigate("/")}
          >
            <ArrowLeft size={16} />
            <span>العودة للصفحة الرئيسية</span>
          </button>
        </section>
      )}

      {/* التخطيط الرئيسي عند وجود عناصر */}
      {hasItems && (
        <>
          <section className="cart-layout">
            {/* قائمة المنتجات في السلة */}
            <main className="cart-items-card">
              <div className="cart-items-header">
                <h2>منتجات السلة</h2>
                <span className="cart-items-count">{rows.length} منتج مختلف</span>
              </div>

              {/* شريط الأدوات أعلى قائمة المنتجات */}
              <div className="cart-table-toolbar">
                <label className="cart-checkbox-label">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                  />
                  <span className="cart-checkbox-custom" />
                  <span className="cart-checkbox-label-text">تحديد الكل</span>
                </label>

                <div className="cart-table-toolbar-actions">
                  <button
                    type="button"
                    className="cart-toolbar-btn danger"
                    disabled={!hasSelection}
                    onClick={handleRemoveSelected}
                  >
                    <Trash2 size={14} />
                    <span>حذف المحدد</span>
                  </button>
                </div>
              </div>

              <div className="cart-items-list">
                {rows.map((row) => {
                  const isSelected = selectedIds.includes(row.id);
                  const isUnavailable = row.status === "unavailable";

                  return (
                    <article
                      key={row.id}
                      className={"cart-item" + (isUnavailable ? " cart-item-unavailable" : "")}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleGoToProduct(row)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleGoToProduct(row);
                        }
                      }}
                    >
                      <div className="cart-item-main">
                        {/* checkbox لكل منتج */}
                        <label className="cart-checkbox-label cart-item-select" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectOne(row.id)}
                          />
                          <span className="cart-checkbox-custom" />
                        </label>

                        {/* صورة المنتج */}
                        {row.image && (
                          <div className="cart-item-image-wrapper">
                            <img
                              src={row.image}
                              alt={row.name}
                              className="cart-item-image"
                              loading="lazy"
                            />
                          </div>
                        )}

                        {/* تفاصيل المنتج */}
                        <div className="cart-item-info">
                          <h3 className="cart-item-name">{row.name}</h3>
                          <p className="cart-item-meta"></p>

                          <div className="cart-item-extra">
                            <span className={"cart-status-pill status-" + row.status}>
                              {formatStatus(row.status)}
                            </span>

                            {typeof row.stockLeft === "number" && row.stockLeft <= 5 && (
                              <span className="cart-stock-warning">
                                {row.stockLeft <= 0
                                  ? "انتهى المخزون لهذا المنتج"
                                  : `متبقي ${row.stockLeft} فقط في المخزون`}
                              </span>
                            )}
                          </div>

                          <div className="cart-item-controls">
                            <div className="cart-item-qty">
                              <button
                                type="button"
                                className="cart-qty-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleQtyChange(row.id, -1);
                                }}
                                disabled={row.quantity <= 1}
                              >
                                <Minus size={14} />
                              </button>

                              <input
                                type="number"
                                min="1"
                                className="cart-qty-input"
                                value={row.quantity}
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => e.stopPropagation()}
                                onChange={(e) => handleQtyInput(row.id, e.target.value)}
                              />

                              <button
                                type="button"
                                className="cart-qty-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleQtyChange(row.id, 1);
                                }}
                              >
                                <Plus size={14} />
                              </button>
                            </div>

                            <div className="cart-item-actions">
                              <button
                                type="button"
                                className="cart-item-action danger"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveItem(row);
                                }}
                              >
                                <Trash2 size={14} />
                                <span>حذف</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="cart-item-price-block">
                        <div className="cart-item-unit">
                          <span className="cart-item-unit-label">سعر الوحدة</span>
                          <span className="cart-item-unit-value">
                            {row.price.toLocaleString()} ر.ي
                          </span>
                        </div>
                        <div className="cart-item-total">
                          <span className="cart-item-total-label">الإجمالي</span>
                          <span className="cart-item-total-value">
                            {(row.price * row.quantity).toLocaleString()} ر.ي
                          </span>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </main>

            {/* ملخص الطلب (كمبيوتر) */}
            <aside className="cart-summary">
              <div className="cart-summary-header">
                <h2>ملخص الطلب</h2>
                <span className="cart-summary-tag">
                  <Info size={14} />
                </span>
              </div>

              <div className="cart-summary-card">
                <div className="cart-summary-row">
                  <span>إجمالي ({summary.itemsCount} منتج)</span>
                  <span>{summary.subtotal.toLocaleString()} ر.ي</span>
                </div>

                <div className="cart-summary-row">
                  <span>
                    <Tag size={14} />
                    <span>الخصم</span>
                  </span>
                  <span>
                    {summary.discount > 0
                      ? `- ${summary.discount.toLocaleString()} ر.ي`
                      : "لا يوجد"}
                  </span>
                </div>

                <div className="cart-summary-divider" />

                <div className="cart-summary-row total">
                  <span>الإجمالي النهائي</span>
                  <span>{summary.total.toLocaleString()} ر.ي</span>
                </div>

                <div className="cart-summary-discount">
                  <input
                    type="text"
                    className="cart-discount-input"
                    placeholder="أدخل كود الخصم (مثال: SAVE20 / SAVE10)"
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value)}
                  />
                  <button
                    type="button"
                    className="cart-discount-apply"
                    onClick={handleApplyDiscount}
                  >
                    تطبيق
                  </button>
                </div>

                {discountMessage && (
                  <p className="cart-discount-message">{discountMessage}</p>
                )}

                <button
                  type="button"
                  className="cart-summary-btn"
                  onClick={handleCheckout}
                >
                  إتمام الشراء
                </button>

                <p className="cart-summary-note">
                  <ShieldCheck size={14} />
                  <span></span>
                </p>
              </div>
            </aside>
          </section>

          {/* ✅ شريط ملخص سفلي للهاتف فقط */}
          <div className="cart-summary-mobile" role="region" aria-label="ملخص الطلب">
            <div className="cart-summary-mobile-top">
              <div className="cart-summary-mobile-part cart-summary-mobile-items">
                <span className="cart-summary-mobile-part-label">
                  {summary.itemsCount} منتجات
                </span>
              </div>

              <div className="cart-summary-mobile-divider" />

              <div className="cart-summary-mobile-part cart-summary-mobile-total">
                <span className="cart-summary-mobile-part-label">الإجمالي</span>
                <span className="cart-summary-mobile-part-value">
                  {summary.total.toLocaleString()} ر.ي
                </span>
              </div>
            </div>

            <button
              type="button"
              className="cart-summary-mobile-btn"
              onClick={handleCheckout}
            >
              <span>إتمام الشراء</span>
              <ArrowLeft size={16} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
