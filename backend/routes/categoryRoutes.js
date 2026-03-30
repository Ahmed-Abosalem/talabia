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
      // Return all
    } else if (active === "false") {
      filter.isActive = false;
    } else {
      filter.isActive = true;
    }

    // 🛡️ نظام الحماية الذاتي: التأكد من وجود "الكل" وضبطه كأول عنصر دائماً
    let allCat = await Category.findOne({ $or: [{ slug: 'all' }, { name: 'الكل' }] });
    if (!allCat) {
      await Category.create({
        name: "الكل",
        slug: "all",
        isActive: true,
        isProtected: true,
        sortOrder: -999,
        image: "/assets/categories/all.jpg"
      });
    } else if (!allCat.isProtected || allCat.sortOrder !== -999) {
      allCat.isProtected = true;
      allCat.sortOrder = -999;
      await allCat.save();
    }

    const categories = await Category.find(filter).sort({
      sortOrder: 1,
      name: 1,
    });

    res.json({ categories });
  })
);

export default router;
