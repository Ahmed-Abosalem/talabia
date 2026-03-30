// backend/controllers/reviewController.js
// ────────────────────────────────────────────────
// ✅ Reviews Controller (Talabia)
// - Enterprise Grade Architecture
// - Transactional Creation (Review + Order + Product)
// - Aggregation on Write for Consistency
// ────────────────────────────────────────────────

import asyncHandler from "express-async-handler";
import mongoose from "mongoose";

import Review from "../models/Review.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";
import { ORDER_STATUS_CODES } from "../utils/orderStatus.js";

/**
 * 🔢 إعادة حساب متوسط التقييم للمنتج وتحديثه في Product (Aggregation)
 * يتم استدعاؤها داخل Transaction لضمان التزامن
 */
async function recalcAndUpdateProductRating(productId, session) {
  const pid = new mongoose.Types.ObjectId(productId);

  const agg = await Review.aggregate([
    {
      $match: {
        product: pid,
        isApproved: true,
        rating: { $gte: 1, $lte: 5 },
      },
    },
    {
      $group: {
        _id: "$product",
        avgRating: { $avg: "$rating" },
        count: { $sum: 1 },
      },
    },
  ]).session(session); // ✅ استخدام نفس الجلسة لقراءة البيانات المحدثة

  const avg = agg?.[0]?.avgRating ?? 0;
  const count = agg?.[0]?.count ?? 0;

  // تحديث المنتج بالقيم الجديدة
  const updated = await Product.findByIdAndUpdate(
    productId,
    { rating: avg, numReviews: count },
    { new: true, session }
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
      ? reviews.reduce((acc, r) => acc + (Number(r?.rating) || 0), 0) /
      reviews.length
      : 0;

  return res.status(200).json({
    count: reviews.length,
    avgRating: Number.isFinite(avgRating) ? avgRating : 0,
    reviews,
  });
});

/**
 * @desc    إضافة تقييم لمنتج (Transactional)
 * @route   POST /api/reviews
 * @access  Private (buyer)
 * body: { productId, rating, comment, orderId (opt), orderItemId (opt) }
 */
export const createProductReview = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const { productId, rating, comment, orderId, orderItemId } = req.body;

  // 1️⃣ Validation
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    res.status(400);
    throw new Error("معرّف المنتج غير صالح.");
  }

  const ratingValue = Number(rating);
  if (!Number.isFinite(ratingValue) || ratingValue < 1 || ratingValue > 5) {
    res.status(400);
    throw new Error("التقييم يجب أن يكون رقمًا بين 1 و 5.");
  }

  const product = await Product.findById(productId).select("_id store");
  if (!product) {
    res.status(404);
    throw new Error("المنتج غير موجود.");
  }

  // 2️⃣ Find Eligible Order Item
  // نبحث عن عنصر طلب :
  // - يتبع للمستخدم
  // - يحتوي على المنتج المطلوب
  // - حالته DELIVERED / مكتمل
  // - (اختياري) يطابق orderId / orderItemId الممررين
  const deliveredCode = ORDER_STATUS_CODES.DELIVERED;
  const userIdStr = String(userId);

  const query = {
    buyer: userId,
    "orderItems.product": productId,
    // القديم والجديد:
    $or: [
      { "orderItems.statusCode": deliveredCode },
      { "orderItems.itemStatus": "مكتمل" },
      { status: "مكتمل" }, // legacy
      { status: "completed" }, // legacy
    ],
  };

  if (orderId && mongoose.Types.ObjectId.isValid(orderId)) {
    query._id = orderId;
  }

  const orders = await Order.find(query).sort({ createdAt: -1 }).limit(5);

  // البحث اليدوي عن العنصر المطابق
  let targetOrder = null;
  let targetItem = null;

  for (const ord of orders) {
    // 🛡️ تحقق إضافي للملكية
    if (String(ord.buyer) !== userIdStr) continue;

    const candidateItems = ord.orderItems.filter((item) => {
      // يطابق المنتج
      if (String(item.product) !== String(productId)) return false;
      // يطابق الـ ItemID لو ممرر
      if (orderItemId && String(item._id) !== String(orderItemId)) return false;

      // تحقق من الحالة (يدعم القديم والجديد)
      // ✅ التحديث: استخدام الكود الموحد كمعيار أساسي
      const isDelivered =
        item.statusCode === ORDER_STATUS_CODES.DELIVERED ||
        item.itemStatus === "مكتمل" || // Legacy fallback
        ord.statusCode === ORDER_STATUS_CODES.DELIVERED ||
        ord.status === "مكتمل" ||
        ord.status === "completed";

      return isDelivered;
    });

    // نأخذ أول عنصر غير مُقيم (أو العنصر المحدد نفسه)
    for (const itm of candidateItems) {
      if (itm.isRated) {
        // لو ممرر ID ومقيم، نرفض (لأنه create وليس edit)
        if (orderItemId && String(itm._id) === String(orderItemId)) {
          res.status(409);
          throw new Error("لقد قمت بتقييم هذا المنتج في هذا الطلب مسبقًا.");
        }
        continue; // نبحث عن عنصر آخر غير مقيم
      }
      targetOrder = ord;
      targetItem = itm;
      break;
    }

    if (targetOrder) break;
  }

  if (!targetOrder || !targetItem) {
    res.status(403);
    throw new Error(
      "غير مسموح بالتقييم: لم يتم العثور على طلب مستلم يحتوي على هذا المنتج (أو تم تقييمه بالفعل)."
    );
  }

  // 3️⃣ Define Core Operation for Create
  const performCreateOperation = async (withTransaction) => {
    const session = withTransaction ? await mongoose.startSession() : undefined;
    if (withTransaction) session.startTransaction();

    try {
      // A. Create Review
      const reviewData = {
        user: userId,
        product: productId,
        store: product.store,
        order: targetOrder._id,
        orderItem: targetItem._id,
        rating: ratingValue,
        comment: (comment || "").toString().trim().substring(0, 1000),
        isApproved: true,
        isVerifiedPurchase: true,
      };

      let newReview;
      if (withTransaction) {
        const [created] = await Review.create([reviewData], { session });
        newReview = created;
      } else {
        newReview = await Review.create(reviewData);
      }

      // B. Update Order Item
      const updateQuery = {
        $set: {
          "orderItems.$.isRated": true,
          "orderItems.$.review": newReview._id,
          "orderItems.$.rating.value": ratingValue,
          "orderItems.$.rating.comment": comment,
          "orderItems.$.rating.ratedAt": new Date(),
        },
      };

      const orderFilter = { _id: targetOrder._id, "orderItems._id": targetItem._id };
      if (withTransaction) {
        await Order.updateOne(orderFilter, updateQuery, { session });
      } else {
        await Order.updateOne(orderFilter, updateQuery);
      }

      // C. Recalculate Product
      const updatedProduct = await recalcAndUpdateProductRating(productId, withTransaction ? session : null);

      if (withTransaction) await session.commitTransaction();

      return { newReview, updatedProduct };

    } catch (err) {
      if (withTransaction) await session.abortTransaction();
      throw err;
    } finally {
      if (session) session.endSession();
    }
  };

  // 4️⃣ Execute with Retry Strategy
  try {
    // First attempt: Try with Transaction (Production Standard)
    const { newReview, updatedProduct } = await performCreateOperation(true);

    res.status(201).json({
      message: "تم إضافة التقييم بنجاح.",
      review: newReview,
      productSummary: {
        _id: updatedProduct?._id,
        rating: updatedProduct?.rating ?? 0,
        numReviews: updatedProduct?.numReviews ?? 0,
      },
    });

  } catch (error) {
    // Check for Standalone MongoDB Error
    if (
      error.message.includes("Transaction numbers are only allowed on a replica set member or mongos") ||
      error.message.includes("This MongoDB deployment does not support retryable writes")
    ) {
      console.warn("MongoDB Transactions not supported. Retrying without transaction...");

      // Retry: Fallback to Non-Transactional
      try {
        const { newReview, updatedProduct } = await performCreateOperation(false);
        res.status(201).json({
          message: "تم إضافة التقييم بنجاح.",
          review: newReview,
          productSummary: {
            _id: updatedProduct?._id,
            rating: updatedProduct?.rating ?? 0,
            numReviews: updatedProduct?.numReviews ?? 0,
          },
        });
      } catch (retryError) {
        // Handle duplicate key on retry
        if (retryError.code === 11000) {
          res.status(409);
          throw new Error("لقد قمت بتقييم هذا المنتج مسبقًا.");
        }
        throw retryError;
      }

    } else if (error.code === 11000) {
      res.status(409);
      throw new Error("لقد قمت بتقييم هذا المنتج مسبقًا.");
    } else {
      throw error;
    }
  }
});

/**
 * @desc    تعديل تقييم (Transactional)
 * @route   PUT /api/reviews/:id
 * @access  Private (Owner)
 */
export const updateProductReview = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user?._id;
  const { rating, comment } = req.body;

  const ratingValue = Number(rating);
  if (!Number.isFinite(ratingValue) || ratingValue < 1 || ratingValue > 5) {
    res.status(400);
    throw new Error("التقييم يجب أن يكون رقمًا بين 1 و 5.");
  }

  // التحقق من الملكية قبل المعاملة
  const review = await Review.findById(id);
  if (!review) {
    res.status(404);
    throw new Error("التقييم غير موجود.");
  }

  if (String(review.user) !== String(userId)) {
    res.status(403);
    throw new Error("غير مصرح لك بتعديل هذا التقييم.");
  }

  // 3️⃣ Define Core Operation for Update
  const performUpdateOperation = async (withTransaction) => {
    const session = withTransaction ? await mongoose.startSession() : undefined;
    if (withTransaction) session.startTransaction();

    try {
      // Need to fetch fresh if retrying (though here we have the doc from closure, save handles versioning)
      // A. Update Review
      if (withTransaction) {
        await review.save({ session });
      } else {
        await review.save();
      }

      // B. Re-calc Product
      const updatedProduct = await recalcAndUpdateProductRating(review.product, withTransaction ? session : null);

      // C. Update Legacy Order Field
      if (review.order && review.orderItem) {
        const updateQuery = {
          $set: {
            "orderItems.$.rating.value": ratingValue,
            "orderItems.$.rating.comment": comment,
            "orderItems.$.rating.ratedAt": new Date(),
          },
        };
        const orderFilter = { _id: review.order, "orderItems._id": review.orderItem };

        if (withTransaction) {
          await Order.updateOne(orderFilter, updateQuery, { session });
        } else {
          await Order.updateOne(orderFilter, updateQuery);
        }
      }

      if (withTransaction) await session.commitTransaction();
      return updatedProduct;

    } catch (err) {
      if (withTransaction) await session.abortTransaction();
      throw err;
    } finally {
      if (session) session.endSession();
    }
  };

  review.rating = ratingValue;
  review.comment = (comment || "").toString().trim().substring(0, 1000);

  try {
    // First Attempt: Transactional
    const updatedProduct = await performUpdateOperation(true);

    res.status(200).json({
      message: "تم تحديث التقييم بنجاح.",
      review,
      productSummary: {
        _id: updatedProduct?._id,
        rating: updatedProduct?.rating ?? 0,
        numReviews: updatedProduct?.numReviews ?? 0,
      },
    });

  } catch (error) {
    // Check for Standalone MongoDB Error
    if (
      error.message.includes("Transaction numbers are only allowed on a replica set member or mongos") ||
      error.message.includes("This MongoDB deployment does not support retryable writes")
    ) {
      console.warn("MongoDB Transactions not supported. Retrying update without transaction...");

      try {
        const updatedProduct = await performUpdateOperation(false);
        res.status(200).json({
          message: "تم تحديث التقييم بنجاح.",
          review,
          productSummary: {
            _id: updatedProduct?._id,
            rating: updatedProduct?.rating ?? 0,
            numReviews: updatedProduct?.numReviews ?? 0,
          },
        });
      } catch (retryError) {
        throw retryError;
      }

    } else {
      throw error;
    }
  }
});
