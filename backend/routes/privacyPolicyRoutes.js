// backend/routes/privacyPolicyRoutes.js

import express from "express";
import {
    getPrivacyPolicy,
    updatePrivacyPolicy,
    sendPrivacyPolicyNotification,
} from "../controllers/privacyPolicyController.js";
import { protect } from "../middleware/authMiddleware.js";
import { allowRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

// Public route - Get privacy policy
router.get("/", getPrivacyPolicy);

// Admin routes - Update privacy policy and send notifications
router.put("/", protect, allowRoles("admin"), updatePrivacyPolicy);
router.post("/notify", protect, allowRoles("admin"), sendPrivacyPolicyNotification);

export default router;
