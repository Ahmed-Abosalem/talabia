import { api } from "./api";

// 📥 جلب كل الإشعارات الخاصة بالمستخدم الحالي
export async function listNotifications() {
  const res = await api.get("/notifications");
  return res.data;
}

// ✅ تحديد إشعار واحد كمقروء
export async function markNotificationAsRead(id) {
  const res = await api.put(`/notifications/${id}/read`);
  return res.data;
}

// ✅ تحديد جميع الإشعارات كمقروءة
export async function markAllNotificationsAsRead() {
  const res = await api.put("/notifications/mark-all-read");
  return res.data;
}
