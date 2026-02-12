// frontend/src/services/reviewService.js
// ────────────────────────────────────────────────
// ✅ Review Service (Frontend)
// يعتمد على api.js (baseURL = "/api")
// ────────────────────────────────────────────────

import { api } from "./api";

/**
 * جلب تقييمات منتج
 * GET /api/reviews/product/:productId
 */
export const getProductReviews = async (productId) => {
  const { data } = await api.get(`/reviews/product/${productId}`);
  return data; // { count, reviews }
};

/**
 * إضافة تقييم لمنتج (يتطلب تسجيل دخول كمشتري + أن يكون المنتج مُسلّم DELIVERED)
 * POST /api/reviews/product/:productId
 * body: { rating, comment }
 */
export const createProductReview = async (productId, payload) => {
  const { data } = await api.post(`/reviews/product/${productId}`, payload);
  return data;
};
