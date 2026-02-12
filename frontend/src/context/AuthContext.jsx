// src/context/AuthContext.jsx

import { createContext, useContext, useEffect, useState } from "react";
import {
  loginRequest,
  getCurrentUser,
  logoutRequest,
} from "../services/authService";

const AuthContext = createContext(null);

// تطبيع الدور القادم من الخادم إلى دور الواجهة
// shipper (في الباك إند) → shipping (في الواجهة)
function normalizeRole(rawRole) {
  if (!rawRole) return null;
  if (rawRole === "shipper") return "shipping";
  return rawRole;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null); // buyer | seller | shipping | admin | ...
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // تحميل حالة المستخدم من الـ API إذا كان هناك توكن مخزّن
  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = localStorage.getItem("talabia_token");
        if (!token) {
          setIsReady(true);
          return;
        }

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
        } else {
          localStorage.removeItem("talabia_token");
          localStorage.removeItem("talabia-auth");
        }
      } catch {
        localStorage.removeItem("talabia_token");
        localStorage.removeItem("talabia-auth");
        setUser(null);
        setRole(null);
        setIsLoggedIn(false);
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
  const login = async ({ email, password }) => {
    const data = await loginRequest({ email, password });

    const token = data?.token || data?.accessToken || null;
    const currentUser = data?.user || data || null;
    const userRole = normalizeRole(currentUser?.role || null);

    if (token) {
      localStorage.setItem("talabia_token", token);
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

  // تسجيل الخروج الفعلي
  const logout = async () => {
    try {
      await logoutRequest();
    } catch {
      // حتى لو فشل الـ API، نكمل تنظيف الجلسة محليًا
    } finally {
      setUser(null);
      setRole(null);
      setIsLoggedIn(false);
      localStorage.removeItem("talabia_token");
      localStorage.removeItem("talabia-auth");
    }
  };

  const value = {
    user,
    role,
    isLoggedIn,
    isReady,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
