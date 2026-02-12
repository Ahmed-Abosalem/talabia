// ────────────────────────────────────────────────
// 📁 backend/middleware/roleMiddleware.js
// إدارة الصلاحيات حسب الدور (Role-based Access Control)
// نسخة إنتاجية محسّنة (نهائية)
// ────────────────────────────────────────────────

import { hasPermission } from "../controllers/admin/adminHelpers.js";

// السماح فقط لأدوار معيّنة (مثل admin, seller, buyer, shipper)
export const allowRoles = (...roles) => {
  // لو أحد نسى يمرر أدوار، نقفل المسار (أمانًا)
  const allowed = (roles || []).map((r) => String(r).toLowerCase().trim());

  return (req, res, next) => {
    const userRole = req.user?.role ? String(req.user.role).toLowerCase().trim() : null;

    if (!req.user || !userRole || !allowed.includes(userRole)) {
      res.status(403);
      throw new Error("ليس لديك صلاحية للوصول إلى هذا المورد");
    }

    return next();
  };
};

/**
 * 🔐 ميدل وير لصلاحيات موظفي الأدمن حسب القسم
 *
 * يُستخدم بعد:
 *   - protect()
 *   - allowRoles('admin')
 *
 * ويعتمد على حقل permissions في المستخدم:
 *   users, orders, products, sellers, shipping, financial, reports,
 *   ads, categories, notifications, support, admins
 *
 * مدير النظام (role=admin + isOwner=true) يملك كل الصلاحيات تلقائيًا.
 */
export const requireAdminPermission = (permissionKey, minLevel = "view") => {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401);
      throw new Error("يجب تسجيل الدخول للوصول إلى لوحة التحكم.");
    }

    const role = req.user.role ? String(req.user.role).toLowerCase().trim() : "";

    // مدير النظام الأعلى له كل الصلاحيات بدون فحص إضافي
    if (role === "admin" && req.user.isOwner) {
      return next();
    }

    // نتأكد أن الدور نفسه هو "admin"
    if (role !== "admin") {
      res.status(403);
      throw new Error("ليس لديك صلاحية للوصول إلى هذا القسم.");
    }

    if (!permissionKey) {
      res.status(400);
      throw new Error("permissionKey مطلوب للتحقق من صلاحيات الأدمن.");
    }

    const level = String(minLevel || "view").toLowerCase().trim();
    const ok = hasPermission(req.user, permissionKey, level);

    if (!ok) {
      res.status(403);
      throw new Error("لا تملك الصلاحية الكافية للوصول إلى هذا القسم في لوحة التحكم.");
    }

    return next();
  };
};
