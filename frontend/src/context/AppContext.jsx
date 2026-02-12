// src/context/AppContext.jsx
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { listNotifications } from "@/services/notificationService";

const AppContext = createContext(null);

// دالة مساعدة لتحميل مصفوفة بأمان من localStorage
function loadArrayFromLocalStorage(key) {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Failed to parse localStorage for", key, error);
    return [];
  }
}

// ✅ استخراج التوكن من localStorage بشكل مرن (حسب اختلافات التخزين)
function getAuthTokenFromLocalStorage() {
  if (typeof window === "undefined") return null;

  // 1) مفاتيح مباشرة محتملة للتوكن
  const directKeys = [
    "talabia_token",
    "token",
    "accessToken",
    "jwt",
    "authToken",
  ];

  for (const key of directKeys) {
    const v = window.localStorage.getItem(key);
    if (v && typeof v === "string" && v.trim()) return v.trim();
  }

  // 2) كائن مستخدم مخزن JSON (شائع)
  const objectKeys = ["talabia_user", "userInfo", "authUser"];

  for (const key of objectKeys) {
    const raw = window.localStorage.getItem(key);
    if (!raw) continue;
    try {
      const obj = JSON.parse(raw);
      const token =
        obj?.token ||
        obj?.accessToken ||
        obj?.jwt ||
        obj?.authToken ||
        obj?.data?.token ||
        obj?.user?.token;

      if (token && typeof token === "string" && token.trim()) {
        return token.trim();
      }
    } catch {
      // تجاهل
    }
  }

  return null;
}

export function AppProvider({ children }) {
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState(null); // { type, message }

  // ✅ السلة والمفضلة: التحميل يتم مرة واحدة من localStorage هنا
  const [cartItems, setCartItems] = useState(() =>
    loadArrayFromLocalStorage("talabia_cart_items")
  );
  const [wishlistItems, setWishlistItems] = useState(() =>
    loadArrayFromLocalStorage("talabia_wishlist_items")
  );

  // ✅ عدد الإشعارات
  const [notificationsCount, setNotificationsCount] = useState(0);

  const showToast = useCallback((message, type = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // =========================================================
  // 💾 حفظ السلة والمفضلة في localStorage عند كل تغيير
  // =========================================================
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        "talabia_cart_items",
        JSON.stringify(cartItems)
      );
    } catch (error) {
      console.error("Failed to save cart to localStorage", error);
    }
  }, [cartItems]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        "talabia_wishlist_items",
        JSON.stringify(wishlistItems)
      );
    } catch (error) {
      console.error("Failed to save wishlist to localStorage", error);
    }
  }, [wishlistItems]);

  // =========================================================
  // 🛒 منطق السلة (كما هو)
  // =========================================================

  const toggleCartItem = useCallback((product) => {
    setCartItems((prev) => {
      const exists = prev.find((p) => p.id === product.id);
      if (exists) {
        // إزالة من السلة
        return prev.filter((p) => p.id !== product.id);
      }
      const initialQuantity =
        typeof product.quantity === "number" && product.quantity > 0
          ? product.quantity
          : 1;
      return [...prev, { ...product, quantity: initialQuantity }];
    });
  }, []);

  const ensureInCart = useCallback((product) => {
    setCartItems((prev) => {
      const exists = prev.find((p) => p.id === product.id);
      if (exists) return prev;
      const initialQuantity =
        typeof product.quantity === "number" && product.quantity > 0
          ? product.quantity
          : 1;
      return [...prev, { ...product, quantity: initialQuantity }];
    });
  }, []);

  const updateCartItemQuantity = useCallback((productId, quantity) => {
    setCartItems((prev) =>
      prev.map((item) =>
        item.id === productId
          ? {
              ...item,
              quantity:
                typeof quantity === "number" && quantity > 0
                  ? quantity
                  : 1,
            }
          : item
      )
    );
  }, []);

  // =========================================================
  // 🤍 منطق المفضلة (كما هو)
  // =========================================================

  const toggleWishlistItem = useCallback((product) => {
    setWishlistItems((prev) => {
      const exists = prev.find((p) => p.id === product.id);
      if (exists) {
        return prev.filter((p) => p.id !== product.id);
      }
      return [...prev, { ...product }];
    });
  }, []);

  const clearCart = useCallback(() => setCartItems([]), []);
  const clearWishlist = useCallback(() => setWishlistItems([]), []);

  const cartCount = cartItems.length;
  const wishlistCount = wishlistItems.length;

  const isInCart = (id) => cartItems.some((p) => p.id === id);
  const isInWishlist = (id) => wishlistItems.some((p) => p.id === id);

  // =========================================================
  // 🔔 الإشعارات (✅ تم تعديلها لمنع 401 للزائر)
  // =========================================================

  const refreshNotificationsCount = useCallback(async () => {
    // ✅ لا تطلب الإشعارات إلا لو المستخدم مسجل دخول (يوجد token)
    const token = getAuthTokenFromLocalStorage();
    if (!token) {
      setNotificationsCount(0);
      return;
    }

    try {
      const data = await listNotifications();
      const unread = Array.isArray(data)
        ? data.filter((n) => !n.isRead).length
        : 0;
      setNotificationsCount(unread);
    } catch (error) {
      // لو حصل 401 بسبب توكن منتهي، لا نزعج الكونسول كثيرًا
      if (error?.response?.status === 401) {
        setNotificationsCount(0);
        return;
      }
      console.error("Failed to load notifications count", error);
    }
  }, []);

  useEffect(() => {
    // ✅ عند التشغيل: لو ما فيه توكن لا تعمل طلبات إشعارات
    refreshNotificationsCount();
  }, [refreshNotificationsCount]);

  // ✅ تحديث العداد عند تغيّر localStorage (مثلاً تسجيل دخول/خروج بتبويب آخر)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const onStorage = () => {
      refreshNotificationsCount();
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [refreshNotificationsCount]);

  const value = {
    isLoading,
    setIsLoading,
    toast,
    showToast,

    cartItems,
    wishlistItems,
    cartCount,
    wishlistCount,
    isInCart,
    isInWishlist,
    toggleCartItem,
    ensureInCart,
    updateCartItemQuantity,
    clearCart,
    clearWishlist,
    toggleWishlistItem,

    notificationsCount,
    setNotificationsCount,
    refreshNotificationsCount,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
