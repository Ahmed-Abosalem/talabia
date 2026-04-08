// src/pages/Cart.jsx

import "./Cart.css";
import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShoppingCart,
  Trash2,
  ArrowLeft,
  ArrowRight,
  Plus,
  Minus,
  Info,
  Tag,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { formatCurrency, formatNumber } from "@/utils/formatters";
import { getPublicMinOrderSettings } from "@/services/settingsService";
import { useAuth } from "@/context/AuthContext";


export default function Cart() {
  const navigate = useNavigate();
  const {
    cartItems,
    toggleCartItem,
    clearCart,
    showToast,
    updateCartItemQuantity,
  } = useApp();
  const { isLoggedIn } = useAuth();

  const [rows, setRows] = useState(
    cartItems.map((item) => ({
      ...item,
      quantity: typeof item.quantity === "number" && item.quantity > 0 ? item.quantity : 1,
      status: item.status || "available",
      stockLeft: typeof item.stockLeft === "number" ? item.stockLeft : null,
    }))
  );

  const [discountCode, setDiscountCode] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountMessage, setDiscountMessage] = useState("");

  const [minOrder, setMinOrder] = useState({ active: false, value: 0 });
  const [removingId, setRemovingId] = useState(null);

  // 📏 Real-time Header Height Tracking (Golden Standard)
  const headerRef = useRef(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  useEffect(() => {
    if (!headerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setHeaderHeight(entry.target.offsetHeight);
      }
    });
    observer.observe(headerRef.current);
    return () => observer.disconnect();
  }, []);

  // جلب إعدادات الحد الأدنى للطلب
  useEffect(() => {
    async function loadMinOrder() {
      try {
        const data = await getPublicMinOrderSettings();
        setMinOrder({ active: !!data.active, value: Number(data.value) || 0 });
      } catch (err) {
        console.error("فشل جلب إعدادات الحد الأدنى للطلب", err);
      }
    }
    loadMinOrder();
  }, []);

  // مزامنة عناصر السلة من الـ Context مع صفوف الصفحة مع الحفاظ على الكميات
  useEffect(() => {
    if (!cartItems.length) {
      setRows([]);
      return;
    }

    setRows((prevRows) => {
      const newRows = cartItems.map((item) => {
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
          status: item.status || "available",
          stockLeft: typeof item.stockLeft === "number" ? item.stockLeft : null,
        };
      });

      // منع التحديث إذا كانت البيانات متطابقة تماماً (تجنب الومضات العشوائية)
      if (JSON.stringify(newRows) === JSON.stringify(prevRows)) return prevRows;
      return newRows;
    });
  }, [cartItems]);

  const hasItems = rows.length > 0;

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

    const filteredRows = rows.map(row => ({
      ...row,
      quantity: (row.quantity === "" || isNaN(parseInt(row.quantity, 10))) ? 0 : parseInt(row.quantity, 10)
    }));

    const itemsCount = filteredRows.reduce((sum, row) => sum + row.quantity, 0);
    const subtotal = filteredRows.reduce((sum, row) => sum + row.price * row.quantity, 0);

    const discount = Math.min(discountAmount, subtotal);
    const total = Math.max(subtotal - discount, 0);

    const isBelowMinOrder = minOrder.active && subtotal < minOrder.value;

    return { itemsCount, subtotal, discount, total, isBelowMinOrder };
  }, [rows, discountAmount, minOrder]);

  // تغيير الكمية بالأزرار
  const handleQtyChange = (id, delta) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const stock = typeof row.stock === "number" ? row.stock : 999;
        const newQuantity = Math.max(1, row.quantity + delta);

        if (newQuantity > stock) {
          showToast(`الكمية المتاحة هي فقط (${stock})`, "error");
          return row;
        }

        updateCartItemQuantity(id, newQuantity);
        return { ...row, quantity: newQuantity };
      })
    );
  };

  // تعديل الكمية يدويًا بالحقل
  // تعديل الكمية يدويًا بالحقل (يسمح بالفراغ المؤقت للكتابة)
  const handleQtyInput = (id, value) => {
    // إذا كان المدخل فارغاً، نقبله في الحالة (State) ليتمكن المستخدم من الكتابة
    if (value === "") {
      setRows((prev) => prev.map((row) => (row.id === id ? { ...row, quantity: "" } : row)));
      return;
    }

    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) return;

    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const stock = typeof row.stock === "number" ? row.stock : 999;
        let newQuantity = Math.max(0, parsed); // نسمح بالصفر مؤقتاً أثناء المسح

        if (newQuantity > stock) {
          showToast(`الكمية المتاحة هي فقط (${stock})`, "error");
          newQuantity = stock;
        }

        updateCartItemQuantity(id, newQuantity);
        return { ...row, quantity: newQuantity };
      })
    );
  };

  // معالجة فقدان التركيز (Blur) لضمان عدم بقاء الحقل فارغاً أو صفر
  const handleQtyBlur = (id, value) => {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed) || parsed < 1) {
      setRows((prev) =>
        prev.map((row) => {
          if (row.id !== id) return row;
          updateCartItemQuantity(id, 1);
          return { ...row, quantity: 1 };
        })
      );
    }
  };

  const handleRemoveItem = (row) => {
    setRemovingId(row.id);
    setTimeout(() => {
      toggleCartItem(row);
      setRemovingId(null);
      showToast("تمت إزالة المنتج من السلة", "success");
    }, 300);
  };

  // إفراغ السلة بالكامل
  const handleClearCart = () => {
    if (!hasItems) return;
    clearCart();
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
    if (summary.isBelowMinOrder) {
      showToast(`الحد الأدنى للطلب هو ${minOrder.value} ر.ي. يرجى إضافة المزيد من المنتجات.`, "error");
      return;
    }

    if (!isLoggedIn) {
      navigate("/login?redirect=/checkout&message=guest_checkout");
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
    <div className="adm-page-root cart-page" style={{ '--adm-header-height': `${headerHeight}px` }}>
      <header className="adm-header" ref={headerRef}>
        <div className="adm-header-inner">
          <div className="adm-header-right">
            <button onClick={() => navigate("/")} className="adm-btn-back" title="العودة للتسوق">
              <ArrowRight size={20} />
            </button>
            <h1 className="adm-page-title buyer-page-title">
              <ShoppingCart size={24} />
              <span>السلة</span>
              <span className="cart-items-count">
                ({summary.itemsCount} منتجات)
              </span>
            </h1>
          </div>
          <div className="adm-header-left">
            <button type="button" className="header-clear-cart-btn" onClick={handleClearCart}>
              <Trash2 size={18} />
              <span>إفراغ السلة</span>
            </button>
          </div>
        </div>
      </header>

      <div className="adm-main-container">
        <main className="adm-details-grid">
          {!hasItems ? (
            <section className="span-12 cart-empty-state">
              <div className="cart-empty-icon">
                <ShoppingCart size={48} />
              </div>
              <h2 className="cart-empty-title">سلتك تنتظر منتجاتك المفضلة</h2>
              <p className="cart-empty-text">
                ابدأ بإضافة المنتجات التي تنال إعجابك لتتمكن من إتمام عملية الشراء لاحقاً.
              </p>
              <button type="button" className="adm-btn primary" onClick={() => navigate("/")}>
                <ArrowLeft size={18} />
                العودة للصفحة الرئيسية
              </button>
            </section>
          ) : (
            <>
              {/* Items List */}
              <div className="span-12 cart-items-list">
                {rows.map((row) => {
                  const isUnavailable = row.status === "unavailable";

                  return (
                    <article
                      key={row.id}
                      className={`adm-card buyer-item-card ${isUnavailable ? 'is-unavailable' : ''} ${removingId === row.id ? 'removing' : ''}`}
                    >
                      {/* Column 1: Image & Action Overlay (4:5 AR) */}
                      <div className="item-card-col-visual">
                        <div className="item-image-container" onClick={() => handleGoToProduct(row)}>
                          {row.image ? (
                            <img src={row.image} alt={row.name} className="item-card-img" />
                          ) : (
                            <div className="adm-empty-center"><ShoppingCart size={32} /></div>
                          )}
                          {isUnavailable && <div className="unavailable-overlay">غير متوفر</div>}

                          {/* Delete Overlay */}
                          <button
                            type="button"
                            className="item-delete-overlay"
                            onClick={(e) => { e.stopPropagation(); handleRemoveItem(row); }}
                            title="حذف من السلة"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Column 2: Info & Controls Stack */}
                      <div className="item-card-col-info">
                        <div className="info-main" onClick={() => handleGoToProduct(row)}>
                          <div className="info-header">
                            <h3 className="item-name">{row.name}</h3>
                            {row.storeName && <span className="item-store">متجر: {row.storeName}</span>}
                          </div>

                          <div className="item-meta-stack">
                            <div className="meta-row">
                              <span className="label">سعر الوحدة:</span>
                              <span className="value">{formatCurrency(row.price)}</span>
                            </div>
                            <div className="meta-row total-highlight">
                              <span className="label">الإجمالي:</span>
                              <span className="value">{formatCurrency(row.price * row.quantity)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="info-controls">
                          <div className="qty-rect-group">
                            <button
                              type="button"
                              className="qty-rect-btn"
                              onClick={(e) => { e.stopPropagation(); handleQtyChange(row.id, -1); }}
                              disabled={row.quantity <= 1 || isUnavailable}
                            >
                              <Minus size={14} />
                            </button>
                            <input
                              type="number"
                              className="qty-rect-input"
                              value={row.quantity}
                              lang="en"
                              dir="ltr"
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => handleQtyInput(row.id, e.target.value)}
                              onBlur={(e) => handleQtyBlur(row.id, e.target.value)}
                              onFocus={(e) => e.target.select()}
                              disabled={isUnavailable}
                              min="1"
                            />
                            <button
                              type="button"
                              className="qty-rect-btn"
                              onClick={(e) => { e.stopPropagation(); handleQtyChange(row.id, 1); }}
                              disabled={isUnavailable}
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              {/* Summary Section */}
              <section className="adm-card span-12 cart-summary-card">
                <div className="adm-card-header">
                  <Info size={20} />
                  <h2>ملخص الطلب النهائي</h2>
                </div>
                <div className="adm-card-body">
                  {summary.isBelowMinOrder && (
                    <div className="adm-notice-box">
                      <Info size={20} />
                      <span>
                        عذراً، يجب أن يكون مجموع المنتجات لا يقل عن <strong>{formatCurrency(minOrder.value)}</strong>. أضف منتجات بقيمة <strong>{formatCurrency(minOrder.value - summary.subtotal)}</strong> لإتمام طلبك.
                      </span>
                    </div>
                  )}

                  <div className="summary-grid">
                    {/* Block 1: Calc */}
                    <div className="summary-block">
                      <div className="summary-row">
                        <span className="label">إجمالي المنتجات ({summary.itemsCount}):</span>
                        <span className="value">{formatCurrency(summary.subtotal)}</span>
                      </div>
                      <div className="summary-row">
                        <span className="label">الخصم المطبق:</span>
                        <span className={`value ${summary.discount > 0 ? "num-accent" : ""}`}>
                          {summary.discount > 0 ? `- ${formatCurrency(summary.discount)}` : "0 ر.ي"}
                        </span>
                      </div>
                      <div className="summary-row total-row">
                        <span className="label">المبلغ الإجمالي:</span>
                        <span className="value">{formatCurrency(summary.total)}</span>
                      </div>
                    </div>

                    {/* Block 2: Coupon */}
                    <div className="summary-block">
                      <span className="label" style={{ marginBottom: '8px', display: 'block' }}>هل لديك كود خصم؟</span>
                      <div className="coupon-input-group">
                        <input type="text" className="adm-form-input" placeholder="أدخل الكود هنا" value={discountCode} onChange={(e) => setDiscountCode(e.target.value)} />
                        <button type="button" className="adm-btn primary" onClick={handleApplyDiscount}>تطبيق</button>
                      </div>
                      {discountMessage && <p className="adm-form-hint" style={{ color: 'var(--adm-success)', fontWeight: '700' }}>{discountMessage}</p>}
                    </div>

                    {/* Block 3: Action */}
                    <div className={`summary-block action-block ${summary.isBelowMinOrder ? 'disabled' : ''}`}>
                      <button type="button" className="checkout-btn" onClick={handleCheckout} disabled={summary.isBelowMinOrder}>
                        <span>إتمام عملية الشراء</span>
                        <ArrowLeft size={24} />
                      </button>
                    </div>
                  </div>
                </div>
              </section>

            </>
          )}
        </main>
      </div>
    </div>
  );
}
