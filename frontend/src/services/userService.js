// frontend/src/services/userService.js
// خدمات المستخدم العامة في الواجهة الأمامية لمنصة طلبية (Talabia)

import { api } from "./api";

/**
 * 🧑‍💻 getProfile
 * جلب الملف الشخصي للمستخدم الحالي (أيًا كان دوره: مشتري، بائع، أدمن...)
 *
 * Backend:
 *   GET /api/users/profile
 */
export async function getProfile() {
  const res = await api.get("/users/profile");
  return res.data;
}

/**
 * ✏️ updateProfile
 * تحديث الملف الشخصي (الاسم / البريد / رقم الجوال وأي حقول أساسية أخرى).
 *
 * payload مثال:
 *  {
 *    fullName: "...",
 *    email: "...",
 *    phone: "...",
 *    country: "السعودية"
 *  }
 *
 * Backend:
 *   PUT /api/users/profile
 */
export async function updateProfile(payload) {
  const res = await api.put("/users/profile", payload);
  return res.data;
}

/**
 * 📦 getAddresses
 * جلب عناوين الشحن الخاصة بالمستخدم الحالي.
 *
 * Backend:
 *   GET /api/users/addresses
 */
export async function getAddresses() {
  const res = await api.get("/users/addresses");
  return res.data;
}

/**
 * ➕ createAddress
 * إضافة عنوان شحن جديد للمستخدم.
 *
 * payload مثال:
 *  {
 *    label: "المنزل",
 *    city: "الرياض",
 *    area: "الحي",
 *    street: "اسم الشارع",
 *    details: "وصف إضافي",
 *    isDefault: true | false
 *  }
 *
 * Backend:
 *   POST /api/users/addresses
 */
export async function createAddress(payload) {
  const res = await api.post("/users/addresses", payload);
  return res.data;
}

/**
 * ✏️ updateAddress
 * تعديل عنوان شحن موجود.
 *
 * Backend:
 *   PUT /api/users/addresses/:id
 */
export async function updateAddress(id, payload) {
  if (!id) {
    throw new Error("userService.updateAddress: يجب تمرير معرّف العنوان id");
  }

  const res = await api.put(`/users/addresses/${id}`, payload);
  return res.data;
}

/**
 * 🗑️ deleteAddress
 * حذف عنوان شحن.
 *
 * Backend:
 *   DELETE /api/users/addresses/:id
 */
export async function deleteAddress(id) {
  if (!id) {
    throw new Error("userService.deleteAddress: يجب تمرير معرّف العنوان id");
  }

  const res = await api.delete(`/users/addresses/${id}`);
  return res.data;
}

/**
 * 🔔 updateNotificationPreferences
 * تحديث تفضيلات الإشعارات للمستخدم (بريد / SMS / إشعارات داخل المنصة).
 *
 * prefs مثال:
 *  {
 *    email: true,
 *    sms: false,
 *    push: true
 *  }
 *
 * Backend:
 *   PUT /api/users/notification-preferences
 */
export async function updateNotificationPreferences(prefs) {
  const res = await api.put("/users/notification-preferences", prefs);
  return res.data;
}

/**
 * 🔒 changePassword
 * تغيير كلمة المرور للمستخدم الحالي.
 *
 * payload مثال:
 *  {
 *    currentPassword: "...",
 *    newPassword: "..."
 *  }
 *
 * Backend:
 *   PUT /api/users/change-password
 */
export async function changePassword(payload) {
  const res = await api.put("/users/change-password", payload);
  return res.data;
}

/**
 * 💖 getWishlist
 * جلب قائمة المفضلة للمستخدم الحالي.
 *
 * Backend:
 *   GET /api/users/wishlist
 */
export async function getWishlist() {
  const res = await api.get("/users/wishlist");
  return res.data;
}

/**
 * 💖 addToWishlist
 * إضافة منتج إلى المفضلة.
 *
 * Backend:
 *   POST /api/users/wishlist/:productId
 */
export async function addToWishlist(productId) {
  if (!productId) {
    throw new Error("userService.addToWishlist: يجب تمرير معرّف المنتج");
  }

  const res = await api.post(`/users/wishlist/${productId}`);
  return res.data;
}

/**
 * 💖 removeFromWishlist
 * إزالة منتج من المفضلة.
 *
 * Backend:
 *   DELETE /api/users/wishlist/:productId
 */
export async function removeFromWishlist(productId) {
  if (!productId) {
    throw new Error(
      "userService.removeFromWishlist: يجب تمرير معرّف المنتج"
    );
  }

  const res = await api.delete(`/users/wishlist/${productId}`);
  return res.data;
}

/**
 * 💣 clearWishlist
 * تفريغ قائمة المفضلة بالكامل.
 *
 * Backend:
 *   DELETE /api/users/wishlist
 */
export async function clearWishlist() {
  const res = await api.delete("/users/wishlist");
  return res.data;
}

/**
 * 🆘 createSupportTicket
 * إنشاء تذكرة دعم جديدة للمستخدم الحالي (إدارة التواصل).
 *
 * payload مثال:
 *  {
 *    subject: "مشكلة في الطلب رقم #123",
 *    message: "نص الشكوى أو الاستفسار...",
 *    priority: "low" | "normal" | "high" // اختياري، الافتراضي normal
 *  }
 *
 * Backend:
 *   POST /api/users/support-tickets
 */
export async function createSupportTicket(payload) {
  const res = await api.post("/users/support-tickets", payload);
  return res.data;
}

/**
 * 🆘 getMySupportTickets
 * جلب تذاكر الدعم الخاصة بالمستخدم الحالي.
 *
 * Backend:
 *   GET /api/users/support-tickets/my
 */
export async function getMySupportTickets() {
  const res = await api.get("/users/support-tickets/my");
  return res.data;
}

/**
 * ✅ تصدير افتراضي من أجل التوافق مع أي استيراد قديم:
 *   import userService from "@/services/userService";
 */
const userService = {
  getProfile,
  updateProfile,
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  updateNotificationPreferences,
  changePassword,
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist,
  // 🆕 تذاكر الدعم
  createSupportTicket,
  getMySupportTickets,
};

export default userService;
