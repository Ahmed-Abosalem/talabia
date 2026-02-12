// backend/routes/reviewRoutes.js
// ────────────────────────────────────────────────
// ✅ Reviews Routes (Talabia)
// - GET  /api/reviews/product/:productId
// - POST /api/reviews/product/:productId  (buyer فقط + بعد DELIVERED)
// ────────────────────────────────────────────────

import express from "express";

import { protect } from "../middleware/authMiddleware.js";
import { allowRoles } from "../middleware/roleMiddleware.js";
import {
  getProductReviews,
  createProductReview,
} from "../controllers/reviewController.js";

const router = express.Router();

// عرض تقييمات منتج (عام)
router.get("/product/:productId", getProductReviews);

// إضافة تقييم (مشتري فقط)
router.post("/product/:productId", protect, allowRoles("buyer"), createProductReview);

export default router;
