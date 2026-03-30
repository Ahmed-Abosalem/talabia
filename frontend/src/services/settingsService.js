// src/services/settingsService.js
import { api } from "./api";

/**
 * دالة جلب إعدادات النظام العامة (للمشترين وزوار الموقع)
 * GET /api/settings/min-order
 */
export async function getPublicMinOrderSettings() {
    const res = await api.get("/settings/min-order");
    return res.data; // { active (boolean), value (number) }
}
