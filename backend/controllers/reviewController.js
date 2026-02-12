// backend/controllers/reviewController.js
// ────────────────────────────────────────────────
// ✅ Reviews Controller (Talabia)
// - عرض تقييمات منتج
// - إضافة تقييم (مسموح فقط للمشتري بعد تسليم Order Item: statusCode=DELIVERED)
// - تحديث متوسط التقييم وعدد التقييمات داخل Product (rating + numReviews)
// ────────────────────────────────────────────────

import asyncHandler from "express-async-handler";
import mongoose from "mongoose";

import Review from "../models/Review.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";
import { ORDER_STATUS_CODES } from "../utils/orderStatus.js";

// إعادة حساب متوسط التقييم للمنتج وتحديثه في Product
async function recalcAndUpdateProductRating(productId) {
  const pid = new mongoose.Types.ObjectId(productId);

  const agg = await Review.aggregate([
    { $match: { product: pid, isApproved: true, rating: { $gte: 1, $lte: 5 } } },
    {
      $group: {
        _id: "$product",
        avgRating: { $avg: "$rating" },
        count: { $sum: 1 },
      },
    },
  ]);

  const avg = agg?.[0]?.avgRating ?? 0;
  const count = agg?.[0]?.count ?? 0;

  // تخزين المتوسط كرقم (يمكن عرضه 1 decimal في الواجهة)
  const updated = await Product.findByIdAndUpdate(
    productId,
    { rating: avg, numReviews: count },
    { new: true }
  ).select("_id rating numReviews");

  return updated;
}

/**
 * @desc    جلب تقييمات منتج
 * @route   GET /api/reviews/product/:productId
 * @access  Public
 */
export const getProductReviews = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    res.status(400);
    throw new Error("معرّف المنتج غير صالح.");
  }

  // ✅ نعرض فقط التقييمات المعتمدة والصالحة (1..5)
  const reviews = await Review.find({
    product: productId,
    isApproved: true,
    rating: { $gte: 1, $lte: 5 },
  })
    .populate("user", "name")
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((acc, r) => acc + (Number(r?.rating) || 0), 0) / reviews.length
      : 0;

  return res.status(200).json({
    count: reviews.length,
    avgRating: Number.isFinite(avgRating) ? avgRating : 0,
    reviews,
  });
});

/**
 * @desc    إضافة تقييم لمنتج (فقط بعد التسليم DELIVERED على مستوى Order Item)
 * @route   POST /api/reviews/product/:productId
 * @access  Private (buyer)
 * body: { rating: 1..5, comment?: string }
 */
export const createProductReview = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const userId = req.user?._id;

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    res.status(400);
    throw new Error("معرّف المنتج غير صالح.");
  }

  const ratingValue = Number(req.body?.rating);
  const comment = (req.body?.comment || "").toString().trim();

  if (!Number.isFinite(ratingValue) || ratingValue < 1 || ratingValue > 5) {
    res.status(400);
    throw new Error("قيمة التقييم يجب أن تكون رقمًا بين 1 و 5.");
  }

  const product = await Product.findById(productId).select("_id store");
  if (!product) {
    res.status(404);
    throw new Error("المنتج غير موجود.");
  }

  // ✅ شرط احترافي: يجب أن يكون لدى المشتري Order Item لهذا المنتج وحالته DELIVERED
  const deliveredCode = ORDER_STATUS_CODES.DELIVERED;

  const order = await Order.findOne(
    {
      buyer: userId,
      orderItems: {
        $elemMatch: {
          product: productId,
          statusCode: deliveredCode,
        },
      },
    },
    { "orderItems.$": 1 } // يرجع أول عنصر مطابق فقط
  ).sort({ createdAt: -1 });

  if (!order || !order.orderItems?.length) {
    res.status(403);
    throw new Error("لا يمكنك تقييم هذا المنتج قبل استلامه (DELIVERED).");
  }

  const matchedItem = order.orderItems[0];

  // إذا كان هذا العنصر مُقيّم بالفعل داخل الطلب، نمنع
  if (matchedItem?.rating?.value) {
    res.status(400);
    throw new Error("تم تقييم هذا المنتج مسبقًا في هذا الطلب.");
  }

  // إنشاء Review (مصدر الحقيقة العام)
  try {
    const newReview = await Review.create({
      user: userId,
      product: productId,
      store: product.store,
      rating: ratingValue,
      comment,
      isApproved: true,
    });

    // توثيق التقييم داخل Order Item
    await Order.updateOne(
      { _id: order._id, "orderItems._id": matchedItem._id },
      {
        $set: {
          "orderItems.$.rating.value": ratingValue,
          "orderItems.$.rating.comment": comment,
          "orderItems.$.rating.ratedAt": new Date(),
        },
      }
    );

    // تحديث متوسط التقييم وعدده في Product
    const updatedProduct = await recalcAndUpdateProductRating(productId);

    return res.status(201).json({
      message: "تم إضافة التقييم بنجاح.",
      review: {
        _id: newReview._id,
        user: newReview.user,
        product: newReview.product,
        store: newReview.store,
        rating: newReview.rating,
        comment: newReview.comment,
        createdAt: newReview.createdAt,
      },
      productSummary: {
        _id: updatedProduct?._id,
        rating: updatedProduct?.rating ?? 0,
        numReviews: updatedProduct?.numReviews ?? 0,
      },
    });
  } catch (err) {
    if (err?.code === 11000) {
      res.status(400);
      throw new Error("لقد قمت بتقييم هذا المنتج مسبقًا.");
    }
    throw err;
  }
});
