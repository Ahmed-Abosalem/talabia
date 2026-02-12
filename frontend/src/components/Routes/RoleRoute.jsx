// src/components/Routes/RoleRoute.jsx
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

/**
 * توحيد مسميات الأدوار القادمة من الخادم إلى شكل قياسي
 * حتى لو كانت مختلفة قليلاً (مثل shipping_company, shipper, delivery...)
 */
function normalizeRole(rawRole) {
  if (!rawRole) return null;

  const r = rawRole.toString().toLowerCase().trim();

  if (r.includes("admin")) return "admin";
  if (r.includes("buyer") || r.includes("customer") || r.includes("client"))
    return "buyer";
  if (r.includes("seller") || r.includes("store") || r.includes("merchant"))
    return "seller";

  // أي شيء يحتوي ship / delivery / transport نعامله كـ "شركة شحن"
  if (
    r.includes("ship") ||
    r.includes("delivery") ||
    r.includes("courier") ||
    r.includes("logistic") ||
    r.includes("transport")
  ) {
    return "shipping";
  }

  return r; // القيمة كما هي إن لم تُطابق أي نمط
}

export default function RoleRoute({ allowedRoles = [], children }) {
  const { isLoggedIn, role, user, isReady } = useAuth();
  const location = useLocation();

  // إلى أن ينتهي تحميل حالة المصادقة
  if (!isReady) {
    return null; // أو يمكن إرجاع Loader هنا لو أردت
  }

  if (!isLoggedIn) {
    // غير مسجل → نعيد توجيهه لتسجيل الدخول
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const rawRole = user?.role || role;
  const normalizedUserRole = normalizeRole(rawRole);

  const normalizedAllowed = allowedRoles.map((r) => normalizeRole(r));

  const isAllowed = normalizedAllowed.includes(normalizedUserRole);

  if (!isAllowed) {
    // مسجل لكن لا يملك الصلاحية
    return <Navigate to="/" replace />;
  }

  return children;
}
