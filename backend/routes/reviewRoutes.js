import express from "express";
import {
  getProductReviews,
  createProductReview,
  updateProductReview,
} from "../controllers/reviewController.js";
import { protect } from "../middleware/authMiddleware.js";
import { allowRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

// Public: Get reviews
router.get("/product/:productId", getProductReviews);

// Private: Create review (Buyer only)
// Note: Changed from /product/:productId to / to support unified body payload
router.post("/", protect, allowRoles("buyer"), createProductReview);

// Private: Update review (Owner only)
router.put("/:id", protect, updateProductReview);

export default router;
