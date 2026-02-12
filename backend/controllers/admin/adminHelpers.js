// ────────────────────────────────────────────────
// 📁 backend/controllers/admin/adminHelpers.js
// دوال وثوابت مشتركة بين كونترولرات الأدمن
// ────────────────────────────────────────────────

// 🧩 مفاتيح الصلاحيات المتاحة لكل مشرف (مطابقة للواجهة الأمامية)
export const PERMISSION_GROUP_KEYS = [
  'users',
  'orders',
  'products',
  'sellers',
  'shipping',
  'financial',
  'reports',
  'ads',
  'categories',
  'notifications',
  'support',
  'admins',
];

export const PERMISSION_LEVELS = ['none', 'view', 'partial', 'full'];

// 🔧 دالة مساعدة لتطبيع كائن الصلاحيات (sanitize & normalize)
export function normalizePermissions(rawPermissions = {}) {
  const normalized = {};
  PERMISSION_GROUP_KEYS.forEach((key) => {
    const value = rawPermissions?.[key];
    normalized[key] = PERMISSION_LEVELS.includes(value) ? value : 'none';
  });
  return normalized;
}

// 🔧 دالة مساعدة لتطبيع نسبة العمولة القادمة من الواجهة
// تقبل:
// - 0   → 0%
// - 0.1 → 10%
// - 10  → 10% (تتحول إلى 0.1)
// وتضمن أن الناتج بين 0 و 1
export function normalizeCommissionRate(input) {
  if (input === undefined || input === null) return undefined;

  let value = input;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = Number(trimmed);
    if (Number.isNaN(parsed)) return undefined;
    value = parsed;
  }

  if (typeof value !== 'number' || Number.isNaN(value)) {
    return undefined;
  }

  // لو كانت القيمة أكبر من 1 نفترض أنها نسبة مئوية (10 تعني 10%)
  if (value > 1) {
    value = value / 100;
  }

  if (value < 0) value = 0;
  if (value > 1) value = 1;

  return value;
}

// ────────────────────────────────────────────────
// 🛡️ دوال الصلاحيات (Permissions Helpers)
// ────────────────────────────────────────────────

// ترتيب المستويات لاستخدامه في المقارنة
const PERMISSION_LEVEL_RANK = {
  none: 0,
  view: 1,
  partial: 2,
  full: 3,
};

/**
 * إرجاع مستوى صلاحية المستخدم على قسم معيّن
 * - مدير النظام (isOwner) → دائماً "full" على جميع الأقسام.
 * - الموظف الإداري → من حقل permissions (Map أو Object).
 */
export function getPermissionLevel(user, key) {
  if (!user) return 'none';

  // مدير النظام الأعلى له صلاحية كاملة على كل شيء
  if (user.role === 'admin' && user.isOwner) {
    return 'full';
  }

  const perms = user.permissions;
  if (!perms) return 'none';

  let value;

  // دعم كلا الحالتين: Mongoose Map و Object عادي
  if (typeof perms.get === 'function') {
    value = perms.get(key);
  } else {
    value = perms[key];
  }

  if (typeof value !== 'string') return 'none';
  if (!PERMISSION_LEVELS.includes(value)) return 'none';

  return value;
}

/**
 * التحقق من أن المستخدم يملك صلاحية على قسم معيّن
 * بمستوى لا يقل عن مستوى معيّن (minLevel).
 *
 * - مدير النظام (isOwner) → دائماً true.
 */
export function hasPermission(user, key, minLevel = 'view') {
  if (!user) return false;

  // مدير النظام الأعلى له كل الصلاحيات تلقائيًا
  if (user.role === 'admin' && user.isOwner) {
    return true;
  }

  const effectiveMin = PERMISSION_LEVELS.includes(minLevel) ? minLevel : 'view';

  const current = getPermissionLevel(user, key);
  const currentRank =
    PERMISSION_LEVEL_RANK[current] ?? PERMISSION_LEVEL_RANK.none;
  const minRank =
    PERMISSION_LEVEL_RANK[effectiveMin] ?? PERMISSION_LEVEL_RANK.view;

  return currentRank >= minRank;
}
