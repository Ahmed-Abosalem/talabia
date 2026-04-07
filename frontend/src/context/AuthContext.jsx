// src/context/AuthContext.jsx

import { createContext, useContext, useEffect, useState } from "react";
import {
  loginRequest,
  registerRequest,
  getCurrentUser,
  logoutRequest,
} from "../services/authService";
// import { preloadForRole } removed due to circular dependency.
const AuthContext = createContext({
  login: async () => { throw new Error("AuthContext provider is missing!"); },
  logout: async () => {},
  register: async () => {},
  isLoggedIn: false,
  isReady: false,
});

function normalizeRole(rawRole) {
  if (!rawRole) return null;
  const r = rawRole.toString().toLowerCase().trim();

  if (r.includes("admin")) return "admin";
  if (r.includes("owner")) return "admin";
  if (r.includes("buyer")) return "buyer";
  if (r.includes("customer")) return "buyer";
  if (r.includes("seller")) return "seller";
  if (r.includes("vendor")) return "seller";
  if (r.includes("store")) return "seller";
  if (
    r.includes("ship") ||
    r.includes("delivery") ||
    r.includes("courier") ||
    r.includes("logistics") ||
    r.includes("driver")
  ) {
    return "shipper";
  }
  return r;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null); // buyer | seller | shipping | admin | ...
  const [token, setToken] = useState(null); // ✅ إضافة token state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // تحميل حالة المستخدم من الـ API إذا كان هناك توكن مخزّن
  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedToken = localStorage.getItem("talabia_token");
        if (!storedToken) {
          setIsReady(true);
          return;
        }

        setToken(storedToken); // ✅ حفظ token في state

        const data = await getCurrentUser();
        const currentUser = data?.user || data || null;
        const userRole = normalizeRole(currentUser?.role || null);

        if (currentUser && userRole) {
          setUser(currentUser);
          setRole(userRole);
          setIsLoggedIn(true);
          localStorage.setItem(
            "talabia-auth",
            JSON.stringify({ user: currentUser, role: userRole })
          );
          // Pre-fetch removed to avoid circular dependency
        } else {
          localStorage.removeItem("talabia_token");
          localStorage.removeItem("talabia-auth");
          setToken(null);
        }
      } catch (error) {
        // 🛡️ OFFLINE-FIRST RESILIENCE:
        // Do NOT blindly destroy the session on network errors or timeouts.
        const status = error?.response?.status;
        
        if (status === 401) {
          // 401 Unauthorized: Token is genuinely expired/invalid. Clean up strictly.
          localStorage.removeItem("talabia_token");
          localStorage.removeItem("talabia-auth");
          setUser(null);
          setRole(null);
          setToken(null);
          setIsLoggedIn(false);
        } else {
          // Network Error, 500, or App temporarily offline on boot.
          // Fall back to safely cached local data to keep user logged in.
          try {
            const cachedData = localStorage.getItem("talabia-auth");
            if (cachedData) {
              const parsed = JSON.parse(cachedData);
              if (parsed.user && parsed.role) {
                setUser(parsed.user);
                setRole(parsed.role);
                setIsLoggedIn(true);
                // Token already set at the start of initAuth.
              } else {
                setToken(null);
              }
            } else {
              setToken(null); // No cache, safe fallback
            }
          } catch {
            setToken(null);
          }
        }
      } finally {
        setIsReady(true);
      }
    };

    initAuth();
  }, []);

  // حفظ الحالة (user + role) في localStorage عند التغيير
  useEffect(() => {
    if (!isReady) return;
    try {
      if (isLoggedIn && user && role) {
        localStorage.setItem(
          "talabia-auth",
          JSON.stringify({ user, role })
        );
      } else {
        localStorage.removeItem("talabia-auth");
      }
    } catch {
      // تجاهل أخطاء التخزين
    }
  }, [isLoggedIn, user, role, isReady]);

  // تسجيل الدخول الفعلي عبر الـ API
  const handleLogin = async ({ email, password }) => {
    const data = await loginRequest({ email, password });

    const newToken = data?.token || data?.accessToken || null;
    const currentUser = data?.user || data || null;
    const userRole = normalizeRole(currentUser?.role || null);

    if (newToken) {
      localStorage.setItem("talabia_token", newToken);
      setToken(newToken); // ✅ حفظ token في state
    }

    if (currentUser && userRole) {
      setUser(currentUser);
      setRole(userRole);
      setIsLoggedIn(true);

      localStorage.setItem(
        "talabia-auth",
        JSON.stringify({ user: currentUser, role: userRole })
      );

      // Pre-fetch removed to avoid circular dependency
    }

    return currentUser;
  };

  // تسجيل الخروج الفعلي
  const logout = async () => {
    try {
      await logoutRequest();
    } catch {
      // حتى لو فشل الـ API، نكمل تنظيف الجلسة محليًا
    } finally {
      setUser(null);
      setRole(null);
      setToken(null); // ✅ مسح token
      setIsLoggedIn(false);
      localStorage.removeItem("talabia_token");
      localStorage.removeItem("talabia-auth");
    }
  };

  // ✅ تحديث بيانات المستخدم من الـ API (لمزامنة التغييرات من الملف الشخصي)
  const refreshUser = async () => {
    try {
      const data = await getCurrentUser();
      const currentUser = data?.user || data || null;
      if (currentUser) {
        setUser(currentUser);
        // تحديث localStorage أيضاً لضمان الاستمرارية
        const storedRole = role || normalizeRole(currentUser.role);
        localStorage.setItem(
          "talabia-auth",
          JSON.stringify({ user: currentUser, role: storedRole })
        );
      }
      return currentUser;
    } catch (error) {
      console.error("AuthContext: refreshUser failed", error);
      return null;
    }
  };

  // تسجيل مستخدم جديد
  const register = async (payload) => {
    const data = await registerRequest(payload);

    const newToken = data?.token || data?.accessToken || null;
    const currentUser = data?.user || data || null;
    const userRole = normalizeRole(currentUser?.role || null);

    if (newToken) {
      localStorage.setItem("talabia_token", newToken);
      setToken(newToken);
    }

    if (currentUser && userRole) {
      setUser(currentUser);
      setRole(userRole);
      setIsLoggedIn(true);

      localStorage.setItem(
        "talabia-auth",
        JSON.stringify({ user: currentUser, role: userRole })
      );
    }

    return currentUser;
  };

  const value = {
    user,
    role,
    token, // ✅ تصدير token
    isLoggedIn,
    isReady,
    login: handleLogin,
    register,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
