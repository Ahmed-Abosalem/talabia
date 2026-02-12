import express from "express";
import asyncHandler from "express-async-handler";
import Category from "../models/Category.js";

const router = express.Router();

// GET /api/categories
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { active, includeInactive } = req.query;

    const filter = {};

    if (includeInactive === "true") {
      // نعيد كل الأقسام (مفعّلة وغير مفعّلة)
    } else if (active === "false") {
      // نعيد الأقسام غير المفعّلة فقط
      filter.isActive = false;
    } else {
      // 🔥 افتراضيًا: نعيد الأقسام المفعّلة فقط
      filter.isActive = true;
    }

    const categories = await Category.find(filter).sort({
      sortOrder: 1,
      name: 1,
    });

    res.json({ categories });
  })
);

export default router;
