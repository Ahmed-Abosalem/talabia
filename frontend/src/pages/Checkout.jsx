import "./Checkout.css";
import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShoppingCart,
  CreditCard,
  Banknote,
  Landmark,
  CheckCircle2,
  X,
  Phone,
  MapPin,
  Mail,
  Globe2,
  User,
  Home,
  Flag,
  Building2,
  Compass,
  ArrowRight,
  ArrowLeft,
  Info,
  ShieldCheck,
  Package,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { formatCurrency } from "@/utils/formatters";
import { createOrder } from "@/services/orderService";
import { useAuth } from "@/context/AuthContext";
import { getProfile, getAddresses } from "@/services/userService";
import { getDefaultShippingPricing } from "@/services/shippingService";
import { api } from "@/services/api";
import { getWalletStatus } from "@/services/walletService";

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { cartItems = [], clearCart, showToast } = useApp() || {};
  const { isLoggedIn, user } = useAuth() || {};

  const safeShowToast =
    showToast ||
    ((msg) => {});

  // 🔢 المراحل: 1 = الشحن، 2 = الدفع
  const [step, setStep] = useState(1);

  // 📝 بيانات الشحن
  const [shipping, setShipping] = useState({
    fullName: "",
    phone: "",
    country: "",
    city: "",
    district: "",
    neighborhood: "",
    address: "",
    email: "",
  });

  // ⚙️ لضمان تهيئة بيانات الشحن مرة واحدة فقط
  const [isShippingInitialized, setIsShippingInitialized] = useState(false);

  // 💳 طريقة الدفع
  const [paymentMethod, setPaymentMethod] = useState("cod"); // cod | card | transfer | wallet

  // حقول إضافية للبطاقة
  const [cardData, setCardData] = useState({
    cardNumber: "",
    expiry: "",
    cvv: "",
  });

  // حقول إضافية للحوالة البنكية
  const [transferData, setTransferData] = useState({
    senderName: "",
    transferNumber: "",
  });

  // ✅ نافذة التأكيد
  const [showConfirmation, setShowConfirmation] = useState(false);

  // 💳 إعدادات الدفع (تُجلب من الخادم لتحديد الخيارات المتاحة)
  // ⚠️ كل الخيارات مغلقة مبدئياً حتى يصل رد الـ API
  const [paymentSettings, setPaymentSettings] = useState({
    cod: { enabled: false },
    card: { enabled: false },
    transfer: { enabled: false, bankInfo: "" },
    wallet: { enabled: false },
  });
  const [paymentSettingsLoaded, setPaymentSettingsLoaded] = useState(false);
  const [paymentSettingsError, setPaymentSettingsError] = useState("");

  // 💰 حالة المحفظة (تُجلب من الخادم إذا كان الخيار مفعّلاً)
  const [walletInfo, setWalletInfo] = useState({ exists: false, status: "", walletNumber: "", balance: 0 });
  const [walletPin, setWalletPin] = useState("");

  // 🧮 ملخص سريع للطلب من السلة
  const summary = useMemo(() => {
    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      return { itemsCount: 0, subtotal: 0 };
    }
    const itemsCount = cartItems.reduce((sum, item) => {
      const rawQty = Number(item.quantity);
      const qty = Number.isFinite(rawQty) && rawQty > 0 ? rawQty : 1;
      return sum + qty;
    }, 0);
    const subtotal = cartItems.reduce((sum, item) => {
      const price = Number(item.price) || 0;
      const rawQty = Number(item.quantity);
      const qty = Number.isFinite(rawQty) && rawQty > 0 ? rawQty : 1;
      return sum + price * qty;
    }, 0);
    return { itemsCount, subtotal };
  }, [cartItems]);

  const hasItems = summary.itemsCount > 0;

  // 💰 أجرة الشحن (سعر التوصيل الأساسي من الأدمن)
  const [shippingFee, setShippingFee] = useState(0);
  const [isShippingFeeLoading, setIsShippingFeeLoading] = useState(false);
  const [shippingFeeError, setShippingFeeError] = useState("");

  // 🧮 الإجمالي المستحق = إجمالي المنتجات + أجرة الشحن
  const grandTotal = summary.subtotal + shippingFee;

  const handleShippingChange = (field, value) => {
    setShipping((prev) => ({ ...prev, [field]: value }));
  };

  // 🧠 تهيئة بيانات الشحن تلقائيًا من الملف الشخصي + العنوان الافتراضي
  useEffect(() => {
    const initShippingFromProfileAndAddress = async () => {
      // إذا لم يكن المستخدم مسجلاً أو تمّت التهيئة من قبل، لا نفعل شيئًا
      if (!isLoggedIn || isShippingInitialized) return;

      try {
        const [profileRes, addressesRes] = await Promise.all([
          getProfile().catch(() => null),
          getAddresses().catch(() => []),
        ]);

        const profile = profileRes || null;
        const addresses = Array.isArray(addressesRes) ? addressesRes : [];

        const defaultAddress =
          addresses.find((addr) => addr.isDefault) || addresses[0] || null;

        setShipping((prev) => {
          // إذا كان المستخدم قد كتب أي شيء في الحقول، لا نغيّرها
          const hasAnyValue = Object.values(prev).some(
            (val) => typeof val === "string" && val.trim() !== ""
          );
          if (hasAnyValue) {
            return prev;
          }

          const fullNameFromProfile =
            profile?.fullName || profile?.name || user?.fullName || user?.name || prev.fullName;
          const phoneFromProfile = profile?.phone || user?.phone || prev.phone;
          const emailFromProfile = profile?.email || user?.email || prev.email;

          // الدولة (city في Address)
          const countryFromAddress = defaultAddress?.city || null;
          const countryFromProfile = profile?.country || user?.country || null;
          const countryFinal = countryFromAddress || countryFromProfile || "";

          // المدينة (area في Address)
          const cityFromAddress = defaultAddress?.area || null;
          const cityFromProfile = profile?.city || user?.city || null;
          const cityFinal = cityFromAddress || cityFromProfile || "";

          // المديرية (district في Address)
          const districtFromAddress = defaultAddress?.district || null;
          const districtFromProfile = profile?.district || user?.district || null;
          const districtFinal = districtFromAddress || districtFromProfile || "";

          // الحي (street في Address)
          const neighborhoodFromAddress = defaultAddress?.street || null;
          const neighborhoodFromProfile = profile?.neighborhood || user?.neighborhood || null;
          const neighborhoodFinal = neighborhoodFromAddress || neighborhoodFromProfile || "";

          // تفاصيل إضافية (details في Address)
          const detailsFromAddress = defaultAddress?.details || null;
          const detailsFromProfile = profile?.addressDetails || user?.addressDetails || null;
          const detailsFinal = detailsFromAddress || detailsFromProfile || "";

          return {
            ...prev,
            fullName: fullNameFromProfile,
            phone: phoneFromProfile,
            email: emailFromProfile,
            country: countryFinal,
            city: cityFinal,
            district: districtFinal,
            neighborhood: neighborhoodFinal,
            address: detailsFinal,
          };
        });
      } finally {
        setIsShippingInitialized(true);
      }
    };

    initShippingFromProfileAndAddress();
  }, [isLoggedIn, isShippingInitialized, user]); // ✅ أضفنا user هنا ليتم التحديث بمجرد تغيير البروفايل

  // 🔒 منع الزوار من الدخول لصفحة الشحن مباشرة
  useEffect(() => {
    if (!isLoggedIn) {
      safeShowToast("يرجى تسجيل الدخول أولاً لإتمام طلبك.", "info");
      navigate("/login?redirect=/checkout&message=guest_checkout");
    }
  }, [isLoggedIn, navigate]);

  // 💳 جلب إعدادات الدفع من الخادم (تحت (بلا توثيق))
  useEffect(() => {
    let cancelled = false;
    const loadPaymentSettings = async () => {
      try {
        // 🔒 نُضيف headers لمنع الـ browser cache (304) من جانب العميل
        const res = await api.get("/settings/payment", {
          headers: {
            "Cache-Control": "no-cache",
            "Pragma": "no-cache",
          },
        });
        if (!cancelled && res?.data) {
          setPaymentSettings(res.data);
          // إذا كانت طريقة الدفع الحالية غير مفعّلة، نعود لأول خيار متاح
          const current = paymentMethod;
          const isCurrentEnabled =
            (current === "cod" && res.data.cod?.enabled) ||
            (current === "card" && res.data.card?.enabled) ||
            (current === "transfer" && res.data.transfer?.enabled) ||
            (current === "wallet" && res.data.wallet?.enabled);
          if (!isCurrentEnabled) {
            if (res.data.cod?.enabled) setPaymentMethod("cod");
            else if (res.data.card?.enabled) setPaymentMethod("card");
            else if (res.data.transfer?.enabled) setPaymentMethod("transfer");
            else if (res.data.wallet?.enabled) setPaymentMethod("wallet");
          }

          // 💰 إذا كان خيار المحفظة مفعلاً، نجلب حالة محفظة المشتري
          if (res.data.wallet?.enabled) {
            try {
              const { data: wData } = await getWalletStatus();
              setWalletInfo({
                exists: wData.exists || false,
                status: wData.status || "",
                walletNumber: wData.walletNumber || "",
                balance: wData.balance || 0,
              });
            } catch {
              // فشل جلب المحفظة — لا يمنع العمل
            }
          }
        }
      } catch {
        // 🔒 عند فشل الجلب: لا نعرض أي خيار دفع — الأمان أولاً
        // المشتري سيرى رسالة خطأ بدلاً من خيارات وهمية
        setPaymentSettingsError("تعذّر تحميل خيارات الدفع. حاول تحديث الصفحة.");
      } finally {
        if (!cancelled) setPaymentSettingsLoaded(true);
      }
    };
    loadPaymentSettings();
    return () => { cancelled = true; };
  }, []);

  // 💰 جلب أجرة الشحن الافتراضية من الخادم (سعر التوصيل الأساسي الذي يحدده الأدمن)
  useEffect(() => {
    if (!hasItems) {
      setShippingFee(0);
      setShippingFeeError("");
      return;
    }

    let cancelled = false;

    const loadShippingFee = async () => {
      try {
        setIsShippingFeeLoading(true);
        setShippingFeeError("");

        const data = await getDefaultShippingPricing();
        const base = Number(data?.baseFee);

        if (!cancelled) {
          setShippingFee(Number.isFinite(base) ? base : 0);
        }
      } catch (error) {
        if (!cancelled) {
          setShippingFee(0);
          setShippingFeeError(
            "تعذر تحميل أجرة الشحن حالياً، سيتم احتسابها لاحقًا."
          );
        }
      } finally {
        if (!cancelled) {
          setIsShippingFeeLoading(false);
        }
      }
    };

    loadShippingFee();

    return () => {
      cancelled = true;
    };
  }, [hasItems]);

  // ✅ التحقق من معلومات الشحن قبل الانتقال للخطوة 2
  const validateShipping = () => {
    const missing = [];
    if (!shipping.fullName.trim()) missing.push("الاسم الكامل");
    if (!shipping.phone.trim()) missing.push("رقم الهاتف");
    if (!shipping.country.trim()) missing.push("الدولة");
    if (!shipping.city.trim()) missing.push("المدينة");
    if (!shipping.district.trim()) missing.push("المديرية");
    if (!shipping.neighborhood.trim()) missing.push("الحي");
    if (!shipping.address.trim()) missing.push("تفاصيل إضافية");

    if (missing.length > 0) {
      safeShowToast(
        `الرجاء تعبئة الحقول التالية: ${missing.join("، ")}`,
        "error"
      );
      return false;
    }

    if (!hasItems) {
      safeShowToast("سلة المشتريات فارغة، لا يمكن إتمام الطلب.", "error");
      return false;
    }

    return true;
  };

  const goToPaymentStep = () => {
    if (!validateShipping()) return;
    setStep(2);
  };

  // ✅ التحقق من بيانات الدفع قبل تأكيد الطلب
  const validatePayment = () => {
    if (!hasItems) {
      safeShowToast("سلة المشتريات فارغة، لا يمكن إتمام الطلب.", "error");
      return false;
    }

    if (paymentMethod === "card") {
      if (!cardData.cardNumber.trim()) {
        safeShowToast("الرجاء إدخال رقم البطاقة.", "error");
        return false;
      }
      if (!cardData.expiry.trim()) {
        safeShowToast("الرجاء إدخال تاريخ انتهاء البطاقة.", "error");
        return false;
      }
      if (!cardData.cvv.trim()) {
        safeShowToast("الرجاء إدخال رمز CVV.", "error");
        return false;
      }
    }

    if (paymentMethod === "transfer") {
      if (!transferData.senderName.trim()) {
        safeShowToast("الرجاء إدخال اسم المرسل.", "error");
        return false;
      }
      if (!transferData.transferNumber.trim()) {
        safeShowToast("الرجاء إدخال رقم الحوالة.", "error");
        return false;
      }
    }

    if (paymentMethod === "wallet") {
      if (!walletInfo.exists || walletInfo.status !== "active") {
        safeShowToast("لا توجد محفظة نشطة. يرجى إنشاء محفظة أولاً.", "error");
        return false;
      }
      if (!walletPin || walletPin.length !== 6) {
        safeShowToast("الرجاء إدخال الرمز السري للمحفظة (6 أرقام).", "error");
        return false;
      }
    }

    return true;
  };

  // 🧱 بناء الـ payload الذي سيرسل للباك إند
  const buildOrderPayload = () => {
    const orderItems = (cartItems || []).map((item) => {
      const price = Number(item.price) || 0;
      const rawQty = Number(item.quantity);
      const qty = Number.isFinite(rawQty) && rawQty > 0 ? rawQty : 1;

      // ✅ تطبيع اللون/الحجم (ندعم كل الأشكال المحتملة بدون كسر)
      const colorLabel =
        item?.selectedColorLabel ||
        item?.selectedColor?.label ||
        item?.colorLabel ||
        item?.color ||
        (typeof item?.selectedColor === "string" ? item.selectedColor : "") ||
        "";

      const colorKey =
        item?.selectedColorKey ||
        item?.selectedColor?.key ||
        item?.colorKey ||
        "";

      const colorHex =
        item?.selectedColorHex ||
        item?.selectedColor?.hex ||
        item?.colorHex ||
        "";

      const sizeLabel =
        item?.selectedSizeLabel ||
        item?.selectedSize?.label ||
        item?.sizeLabel ||
        item?.size ||
        (typeof item?.selectedSize === "string" ? item.selectedSize : "") ||
        "";

      const sizeKey =
        item?.selectedSizeKey ||
        item?.selectedSize?.key ||
        item?.sizeKey ||
        "";

      return {
        product: item.id, // معرّف المنتج في الفرونت
        name: item.name,
        qty,
        price,
        image: item.image,

        // ✅ نرسلها فقط إذا كانت موجودة
        ...(colorLabel ? { selectedColor: colorLabel } : {}),
        ...(colorKey ? { selectedColorKey: colorKey } : {}),
        ...(colorHex ? { selectedColorHex: colorHex } : {}),
        ...(sizeLabel ? { selectedSize: sizeLabel } : {}),
        ...(sizeKey ? { selectedSizeKey: sizeKey } : {}),
      };
    });

    // ✅ نرسل عنوان الشحن منظمًا كما يتوقعه الباك إند
    const shippingAddress = {
      fullName: shipping.fullName,
      phone: shipping.phone,
      country: shipping.country,
      city: shipping.city,
      district: shipping.district,
      neighborhood: shipping.neighborhood,
      // نستخدم address كـ street في الـ Schema
      street: shipping.address,
      // نستخدم notes للبريد أو ملاحظات إضافية فقط
      notes: shipping.email || "",
    };

    const paymentMethodForApi =
      paymentMethod === "cod" ? "COD" : paymentMethod === "wallet" ? "Wallet" : "Online"; // مطابق لـ enum في Order.js

    // ✅ تمييز نوع الدفع الإلكتروني للباك-إند (CARD / BANK_TRANSFER)
    const paymentSubMethod = paymentMethod === "card" ? "CARD" : paymentMethod === "transfer" ? "BANK_TRANSFER" : undefined;

    // ✅ بيانات الحوالة البنكية (ترسل فقط عند transfer)
    const bankTransferSenderName = paymentMethod === "transfer" ? String((transferData && transferData.senderName) || "").trim() : undefined;
    const bankTransferReferenceNumber = paymentMethod === "transfer" ? String((transferData && transferData.transferNumber) || "").trim() : undefined;


    // ✅ الآن الإجمالي يشمل إجمالي المنتجات + أجرة الشحن
    const totalPrice = summary.subtotal + shippingFee;

    return {
      orderItems,
      shippingAddress,
      // نمرر سعر الشحن بشكل صريح للباك إند
      shippingPrice: shippingFee,
      totalPrice,
      paymentMethod: paymentMethodForApi,
      ...(paymentSubMethod ? { paymentSubMethod } : {}),
      ...(bankTransferSenderName ? { bankTransferSenderName } : {}),
      ...(bankTransferReferenceNumber ? { bankTransferReferenceNumber } : {}),
      // ✅ بيانات المحفظة (تُرسل فقط عند اختيار الدفع بالمحفظة)
      ...(paymentMethod === "wallet" ? { walletNumber: walletInfo.walletNumber, walletPin } : {}),
    };
  };

  const handleConfirmOrder = async () => {
    if (!validatePayment()) return;

    try {
      const payload = buildOrderPayload();
      await createOrder(payload);

      safeShowToast("تم إنشاء طلبك بنجاح.", "success");

      if (typeof clearCart === "function") {
        clearCart();
      }

      setShowConfirmation(true);
    } catch (error) {

      const status = error?.response?.status;

      if (status === 401 || status === 403) {
        safeShowToast("يجب تسجيل الدخول كمشتري لإتمام الطلب.", "error");
        navigate("/login?redirect=/checkout");
      } else {
        const msg = error?.response?.data?.message || "حدث خطأ أثناء إنشاء الطلب. الرجاء المحاولة مرة أخرى.";
        safeShowToast(msg, "error");
      }
    }
  };

  const closeConfirmation = () => {
    setShowConfirmation(false);
    navigate("/"); // العودة للرئيسية
  };

  return (
    <div className="page-container checkout-page">
      {/* شريط المراحل أعلى الصفحة */}
      <header className="checkout-header">
        <div className={`checkout-progress step-${step}`}>
          <div className="checkout-progress-step-wrapper">
            <div
              className={
                "checkout-progress-step" +
                (step >= 1 ? " checkout-progress-step-active" : "")
              }
            >
              <div className="checkout-progress-circle">1</div>
            </div>
            <div className="checkout-progress-label">معلومات الشحن</div>
          </div>

          <div className="checkout-progress-arrow">
            <span className="checkout-progress-line" />
          </div>

          <div className="checkout-progress-step-wrapper">
            <div
              className={
                "checkout-progress-step" +
                (step >= 2 ? " checkout-progress-step-active" : "")
              }
            >
              <div className="checkout-progress-circle">2</div>
            </div>
            <div className="checkout-progress-label">خيارات الدفع</div>
          </div>
        </div>

        <div className="checkout-header-sub">
          <div className="checkout-header-main-title">
            <ShoppingCart size={20} />
            <h1>إتمام الطلب</h1>
          </div>
          {hasItems && (
            <p className="checkout-header-text">
              عدد المنتجات في السلة:{" "}
              <strong className="checkout-items-count">{summary.itemsCount}</strong> | إجمالي المنتجات:{" "}
              <strong className="checkout-grand-total">{formatCurrency(summary.subtotal)}</strong>
            </p>
          )}
          {!hasItems && (
            <p className="checkout-header-text empty">
              سلة المشتريات فارغة، يمكنك إضافة منتجات من الصفحة الرئيسية.
            </p>
          )}
        </div>
      </header>

      {/* النافذة الأولى: معلومات الشحن */}
      {step === 1 && (
        <section className="checkout-step-card">
          <h2 className="checkout-step-title">معلومات الشحن</h2>
          <p className="checkout-step-subtitle">
            الرجاء إدخال بيانات المستلم وعنوان التوصيل بدقة لتسهيل عملية الشحن.
          </p>

          <div className="checkout-form-grid">
            <div className="checkout-field">
              <label className="checkout-label">
                الاسم الكامل<span className="required">*</span>
              </label>
              <div className="checkout-input-with-icon">
                <User size={16} />
                <input
                  type="text"
                  className="checkout-input"
                  value={shipping.fullName}
                  onChange={(e) =>
                    handleShippingChange("fullName", e.target.value)
                  }
                  placeholder="اكتب الاسم كما يظهر في الهوية أو الشحن"
                />
              </div>
            </div>

            <div className="checkout-field">
              <label className="checkout-label">
                رقم الهاتف<span className="required">*</span>
              </label>
              <div className="checkout-input-with-icon">
                <Phone size={16} />
                <input
                  type="tel"
                  className="checkout-input"
                  value={shipping.phone}
                  onChange={(e) =>
                    handleShippingChange("phone", e.target.value)
                  }
                  placeholder="مثال: 05XXXXXXXX"
                />
              </div>
            </div>

            <div className="checkout-field">
              <label className="checkout-label">
                البريد الإلكتروني (اختياري)
              </label>
              <div className="checkout-input-with-icon">
                <Mail size={16} />
                <input
                  type="email"
                  className="checkout-input"
                  value={shipping.email}
                  onChange={(e) =>
                    handleShippingChange("email", e.target.value)
                  }
                  placeholder="لاستقبال الفواتير والإشعارات"
                />
              </div>
            </div>

            <div className="checkout-field">
              <label className="checkout-label">
                الدولة<span className="required">*</span>
              </label>
              <div className="checkout-input-with-icon">
                <Flag size={16} />
                <input
                  type="text"
                  className="checkout-input"
                  value={shipping.country}
                  onChange={(e) =>
                    handleShippingChange("country", e.target.value)
                  }
                  placeholder="مثال: اليمن، السعودية، تركيا..."
                />
              </div>
            </div>

            <div className="checkout-field">
              <label className="checkout-label">
                المدينة<span className="required">*</span>
              </label>
              <div className="checkout-input-with-icon">
                <Building2 size={16} />
                <input
                  type="text"
                  className="checkout-input"
                  value={shipping.city}
                  onChange={(e) =>
                    handleShippingChange("city", e.target.value)
                  }
                  placeholder="مثال: صنعاء، عدن، تعز..."
                />
              </div>
            </div>

            <div className="checkout-field">
              <label className="checkout-label">
                المديرية<span className="required">*</span>
              </label>
              <div className="checkout-input-with-icon">
                <Compass size={16} />
                <input
                  type="text"
                  className="checkout-input"
                  value={shipping.district}
                  onChange={(e) =>
                    handleShippingChange("district", e.target.value)
                  }
                  placeholder="مثال: مديرية السبعين، مديرية التحرير..."
                />
              </div>
            </div>

            <div className="checkout-field">
              <label className="checkout-label">
                الحي<span className="required">*</span>
              </label>
              <div className="checkout-input-with-icon">
                <MapPin size={16} />
                <input
                  type="text"
                  className="checkout-input"
                  value={shipping.neighborhood}
                  onChange={(e) =>
                    handleShippingChange("neighborhood", e.target.value)
                  }
                  placeholder="مثال: حي الروضة، حي حدة..."
                />
              </div>
            </div>

            <div className="checkout-field checkout-field-full">
              <label className="checkout-label">
                تفاصيل إضافية (الشارع، رقم المبنى، ملاحظات)<span className="required">*</span>
              </label>
              <div className="checkout-input-with-icon textarea-wrapper">
                <Home size={16} />
                <textarea
                  className="checkout-textarea"
                  rows={3}
                  value={shipping.address}
                  onChange={(e) =>
                    handleShippingChange("address", e.target.value)
                  }
                  placeholder="مثال: شارع حدة، عمارة رقم 10، أمام كافيه كذا"
                />
              </div>
            </div>
          </div>

          <div className="checkout-step-actions">
            <button
              type="button"
              className="checkout-secondary-btn"
              onClick={() => navigate("/cart")}
            >
              <ArrowRight size={18} /> العودة إلى السلة
            </button>
            <button
              type="button"
              className="checkout-primary-btn"
              onClick={goToPaymentStep}
            >
              التالي <ArrowLeft size={18} />
            </button>
          </div>
        </section>
      )}

      {/* النافذة الثانية: خيارات الدفع */}
      {step === 2 && (
        <section className="checkout-step-card">
          <h2 className="checkout-step-title">
            <ShieldCheck size={20} className="checkout-title-icon" />
            خيارات الدفع
          </h2>
          <p className="checkout-step-subtitle">
            اختر طريقة الدفع المناسبة لك، ثم أكمل البيانات إن لزم.
          </p>

          <div className="checkout-payment-layout">
            {/* خيارات الدفع */}
            <div className="checkout-payment-column">

              {/* ✅ رسالة خطأ عند فشل تحميل إعدادات الدفع */}
              {paymentSettingsLoaded && paymentSettingsError && (
                <div style={{
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: "0.75rem",
                  padding: "0.85rem 1rem",
                  color: "#b91c1c",
                  fontSize: "0.85rem",
                  marginBottom: "0.75rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}>
                  <Info size={16} />
                  {paymentSettingsError}
                </div>
              )}

              {/* ⏳ جارٍ تحميل خيارات الدفع */}
              {!paymentSettingsLoaded && (
                <div style={{
                  textAlign: "center",
                  padding: "1.5rem",
                  color: "#6b7280",
                  fontSize: "0.85rem",
                }}>
                  جارٍ تحميل خيارات الدفع...
                </div>
              )}

              {/* الدفع عند الاستلام — يُعرض فقط إذا كان مفعّلاً */}
              {paymentSettings.cod?.enabled && (
                <label
                  className={
                    "checkout-payment-option" +
                    (paymentMethod === "cod" ? " active" : "")
                  }
                >
                  <input
                    type="radio"
                    name="payment"
                    value="cod"
                    checked={paymentMethod === "cod"}
                    onChange={() => setPaymentMethod("cod")}
                  />
                  <div className="checkout-payment-icon">
                    <Banknote size={18} />
                  </div>
                  <div className="checkout-payment-text">
                    <div className="checkout-payment-title">
                      الدفع عند الاستلام
                    </div>
                    <div className="checkout-payment-sub">
                      تدفع نقدًا عند استلام الطلب من شركة الشحن.
                    </div>
                  </div>
                </label>
              )}

              {/* الدفع بالبطاقة — يُعرض فقط إذا كان مفعّلاً */}
              {paymentSettings.card?.enabled && (
                <>
                  <label
                    className={
                      "checkout-payment-option" +
                      (paymentMethod === "card" ? " active" : "")
                    }
                  >
                    <input
                      type="radio"
                      name="payment"
                      value="card"
                      checked={paymentMethod === "card"}
                      onChange={() => setPaymentMethod("card")}
                    />
                    <div className="checkout-payment-icon">
                      <CreditCard size={18} />
                    </div>
                    <div className="checkout-payment-text">
                      <div className="checkout-payment-title">الدفع بالبطاقة</div>
                      <div className="checkout-payment-sub">
                        سيتم لاحقاً ربط بوابات دفع آمنة (مدى – فيزا – ماستر
                        كارد).
                      </div>
                    </div>
                  </label>

                  {paymentMethod === "card" && (
                    <div className="checkout-payment-extra">
                      <div className="checkout-field">
                        <label className="checkout-label">رقم البطاقة</label>
                        <input
                          type="text"
                          className="checkout-input"
                          value={cardData.cardNumber}
                          onChange={(e) =>
                            setCardData((prev) => ({
                              ...prev,
                              cardNumber: e.target.value,
                            }))
                          }
                          placeholder="XXXX XXXX XXXX XXXX"
                        />
                      </div>
                      <div className="checkout-extra-row">
                        <div className="checkout-field">
                          <label className="checkout-label">
                            تاريخ الانتهاء (MM/YY)
                          </label>
                          <input
                            type="text"
                            className="checkout-input"
                            value={cardData.expiry}
                            onChange={(e) =>
                              setCardData((prev) => ({
                                ...prev,
                                expiry: e.target.value,
                              }))
                            }
                            placeholder="MM/YY"
                          />
                        </div>
                        <div className="checkout-field">
                          <label className="checkout-label">رمز CVV</label>
                          <input
                            type="password"
                            className="checkout-input"
                            value={cardData.cvv}
                            onChange={(e) =>
                              setCardData((prev) => ({
                                ...prev,
                                cvv: e.target.value,
                              }))
                            }
                            placeholder="CVV"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* الحوالة البنكية — يُعرض فقط إذا كانت مفعّلة */}
              {paymentSettings.transfer?.enabled && (
                <>
                  <label
                    className={
                      "checkout-payment-option" +
                      (paymentMethod === "transfer" ? " active" : "")
                    }
                  >
                    <input
                      type="radio"
                      name="payment"
                      value="transfer"
                      checked={paymentMethod === "transfer"}
                      onChange={() => setPaymentMethod("transfer")}
                    />
                    <div className="checkout-payment-icon">
                      <Landmark size={18} />
                    </div>
                    <div className="checkout-payment-text">
                      <div className="checkout-payment-title">
                        الحوالة البنكية
                      </div>
                      <div className="checkout-payment-sub">
                        أرسل الحوالة وأدخل بيانات المرسل للتأكيد.
                      </div>
                    </div>
                  </label>

                  {paymentMethod === "transfer" && (
                    <div className="checkout-payment-extra">
                      {/* 🏦 بيانات البنك الديناميكية من الأدمن */}
                      {paymentSettings.transfer?.bankInfo && (
                        <div
                          style={{
                            background: "#f0f9ff",
                            border: "1px solid #bae6fd",
                            borderRadius: "0.65rem",
                            padding: "0.75rem 0.9rem",
                            marginBottom: "0.85rem",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.4rem",
                              marginBottom: "0.45rem",
                            }}
                          >
                            <Landmark size={14} color="#0284c7" />
                            <span
                              style={{
                                fontSize: "0.8rem",
                                fontWeight: 600,
                                color: "#0284c7",
                              }}
                            >
                              بيانات التحويل البنكي
                            </span>
                          </div>
                          <pre
                            style={{
                              fontSize: "0.8rem",
                              color: "#0c4a6e",
                              whiteSpace: "pre-wrap",
                              wordBreak: "break-word",
                              margin: 0,
                              fontFamily: "inherit",
                              lineHeight: 1.7,
                            }}
                          >
                            {paymentSettings.transfer.bankInfo}
                          </pre>
                        </div>
                      )}

                      {/* حقل اسم المرسل */}
                      <div className="checkout-field">
                        <label className="checkout-label">اسم المرسل</label>
                        <input
                          type="text"
                          className="checkout-input"
                          value={transferData.senderName}
                          onChange={(e) =>
                            setTransferData((prev) => ({
                              ...prev,
                              senderName: e.target.value,
                            }))
                          }
                          placeholder="الاسم كما يظهر في الحوالة"
                        />
                      </div>

                      {/* حقل رقم الحوالة */}
                      <div className="checkout-field">
                        <label className="checkout-label">رقم الحوالة</label>
                        <input
                          type="text"
                          className="checkout-input"
                          value={transferData.transferNumber}
                          onChange={(e) =>
                            setTransferData((prev) => ({
                              ...prev,
                              transferNumber: e.target.value,
                            }))
                          }
                          placeholder="الرقم الذي يظهر في إيصال الحوالة"
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* الدفع بالمحفظة — يُعرض فقط إذا كانت مفعّلة ولدى المشتري محفظة نشطة */}
              {paymentSettings.wallet?.enabled && walletInfo.exists && walletInfo.status === "active" && (
                <>
                  <label
                    className={
                      "checkout-payment-option" +
                      (paymentMethod === "wallet" ? " active" : "")
                    }
                  >
                    <input
                      type="radio"
                      name="payment"
                      value="wallet"
                      checked={paymentMethod === "wallet"}
                      onChange={() => setPaymentMethod("wallet")}
                    />
                    <div className="checkout-payment-icon">
                      <CreditCard size={18} />
                    </div>
                    <div className="checkout-payment-text">
                      <div className="checkout-payment-title">
                        الدفع بالمحفظة
                      </div>
                      <div className="checkout-payment-sub">
                        خصم المبلغ مباشرة من رصيد محفظتك ({formatCurrency(walletInfo.balance)})
                      </div>
                    </div>
                  </label>

                  {paymentMethod === "wallet" && (
                    <div className="checkout-payment-extra">
                      <div
                        style={{
                          background: "#f0fdf4",
                          border: "1px solid #86efac",
                          borderRadius: "0.65rem",
                          padding: "0.75rem 0.9rem",
                          marginBottom: "0.85rem",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                        }}
                      >
                        <CheckCircle2 size={16} color="#16a34a" />
                        <span style={{ fontSize: "0.85rem", color: "#15803d" }}>
                          رصيدك الحالي: <strong>{formatCurrency(walletInfo.balance)}</strong>
                        </span>
                      </div>

                      {walletInfo.balance < grandTotal && (
                        <div
                          style={{
                            background: "#fef2f2",
                            border: "1px solid #fecaca",
                            borderRadius: "0.65rem",
                            padding: "0.75rem 0.9rem",
                            marginBottom: "0.85rem",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                          }}
                        >
                          <Info size={16} color="#dc2626" />
                          <span style={{ fontSize: "0.85rem", color: "#dc2626" }}>
                            رصيدك غير كافٍ لتغطية المبلغ المطلوب ({formatCurrency(grandTotal)}).
                          </span>
                        </div>
                      )}

                      <div className="checkout-field">
                        <label className="checkout-label">الرمز السري للمحفظة (6 أرقام)</label>
                        <input
                          type="text"
                          className="checkout-input"
                          style={{ WebkitTextSecurity: "disc", fontFamily: "monospace" }}
                          maxLength={6}
                          value={walletPin}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                            setWalletPin(val);
                          }}
                          placeholder="أدخل الرمز السري"
                          inputMode="numeric"
                          autoComplete="off"
                          data-1p-ignore
                          data-bwignore
                        />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* ملخص جانبي بسيط للطلب */}
            <aside className="checkout-summary-panel">
              <h3>
                <Package size={20} className="checkout-title-icon" />
                ملخص الطلب
              </h3>
              {hasItems ? (
                <>
                  <div className="checkout-summary-row">
                    <span>عدد المنتجات</span>
                    <span className="checkout-numeric-value">{summary.itemsCount}</span>
                  </div>
                  <div className="checkout-summary-row">
                    <span>إجمالي المنتجات</span>
                    <span className="checkout-numeric-value">
                      {formatCurrency(summary.subtotal)}
                    </span>
                  </div>
                  <div className="checkout-summary-row">
                    <span>أجرة الشحن</span>
                    <span className="checkout-numeric-value">
                      {isShippingFeeLoading
                        ? "جاري التحميل..."
                        : formatCurrency(shippingFee)}
                    </span>
                  </div>
                  <div className="checkout-summary-divider" />
                  <div className="checkout-summary-row checkout-summary-row-total">
                    <span>الإجمالي المستحق</span>
                    <span className="checkout-numeric-value">
                      {formatCurrency(grandTotal)}
                    </span>
                  </div>
                  {shippingFeeError && (
                    <p className="checkout-summary-note warning">
                      <Info size={16} />
                      {shippingFeeError}
                    </p>
                  )}
                  {!shippingFeeError && (
                    <p className="checkout-summary-note">
                      <Info size={16} />
                      يشمل الإجمالي المستحق قيمة المنتجات مضافًا إليها أجرة
                      الشحن الأساسية.
                    </p>
                  )}
                </>
              ) : (
                <p className="checkout-summary-note empty">
                  <Info size={16} />
                  لا توجد منتجات في السلة حاليًا.
                </p>
              )}
            </aside>
          </div>

          <div className="checkout-step-actions">
            <button
              type="button"
              className="checkout-secondary-btn"
              onClick={() => setStep(1)}
            >
              ← الرجوع لبيانات الشحن
            </button>
            <button
              type="button"
              className="checkout-primary-btn"
              onClick={handleConfirmOrder}
              disabled={!paymentSettingsLoaded}
              title={!paymentSettingsLoaded ? "جارٍ تحميل خيارات الدفع..." : undefined}
            >
              {paymentSettingsLoaded ? "تأكيد الطلب" : "جارٍ التحميل..."}
            </button>
          </div>

        </section>
      )}

      {/* نافذة تأكيد الطلب */}
      {showConfirmation && (
        <div className="checkout-modal-backdrop">
          <div className="checkout-modal">
            <button
              type="button"
              className="checkout-modal-close"
              onClick={closeConfirmation}
            >
              <X size={18} />
            </button>
            <div className="checkout-modal-icon">
              <CheckCircle2 size={42} />
            </div>
            <h2>تم تأكيد طلبك بنجاح!</h2>
            <p>شكرًا لتسوقك معنا في طلبية. سيتم التواصل معك لإتمام الشحن.</p>
            <div className="checkout-modal-actions">
              <button
                type="button"
                className="checkout-primary-btn"
                onClick={closeConfirmation}
              >
                العودة للصفحة الرئيسية
              </button>
              <button
                type="button"
                className="checkout-secondary-btn"
                onClick={closeConfirmation}
              >
                متابعة التسوق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
