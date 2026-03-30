import { api } from "./api";

/**
 * جلب تقييمات منتج
 * GET /api/reviews/product/:productId
 */
export const getProductReviews = async (productId) => {
  const { data } = await api.get(`/reviews/product/${productId}`);
  return data; // { count, avgRating, reviews }
};

/**
 * إضافة تقييم لمنتج (Transaction verified)
 * POST /api/reviews
 * Payload: { productId, rating, comment, orderId, orderItemId }
 */
export const createProductReview = async (payload) => {
  // لاحظ: المسار أصبح للجذر /reviews بدل /product/:id
  const { data } = await api.post(`/reviews`, payload);
  return data;
};

/**
 * تعديل تقييم
 * PUT /api/reviews/:id
 * Payload: { rating, comment }
 */
export const updateProductReview = async (reviewId, payload) => {
  const { data } = await api.put(`/reviews/${reviewId}`, payload);
  return data;
};
