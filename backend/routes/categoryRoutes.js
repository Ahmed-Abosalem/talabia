import express from "express";
import asyncHandler from "express-async-handler";
import Category from "../models/Category.js";

const router = express.Router();

// GET /api/categories
router.get(
  "/",
  asyncHandler(async (req, res) => {
    // 🛡️ نظام الحماية الذاتي: التأكد من وجود "الكل" وضبطه كأول عنصر دائماً
    let allCat = await Category.findOne({ $or: [{ slug: 'all' }, { name: 'الكل' }] });
    if (!allCat) {
      // إذا اختفى لسبب ما، نعيده فوراً
      await Category.create({
        name: "الكل",
        slug: "all",
        isActive: true,
        isProtected: true,
        sortOrder: -999,
        image: "/assets/categories/all.jpg"
      });
    } else if (!allCat.isProtected || allCat.sortOrder !== -999) {
      // إصلاح الإعدادات إذا تغيرت يدوياً من قاعدة البيانات
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
