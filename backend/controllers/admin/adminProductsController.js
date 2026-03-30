// ────────────────────────────────────────────────
// 📁 admin/adminProductsController.js
// إدارة المنتجات: قائمة المنتجات + التفاصيل + تغيير الحالة + الحذف
// ────────────────────────────────────────────────

import asyncHandler from "express-async-handler";
import Product from "../../models/Product.js";
import Order from "../../models/Order.js";
import User from "../../models/User.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { ORDER_STATUS_CODES } from "../../utils/orderStatus.js";

// ✅ تحديد مسار uploads بشكل ثابت وآمن
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// backend/controllers/admin -> ../.. = backend -> uploads
const uploadsDir = path.join(__dirname, "..", "..", "uploads");

// ✅ حذف صور المنتج بشكل آمن (بدون Path Traversal)
function safeDeleteProductImages(images) {
  try {
    if (!Array.isArray(images) || images.length === 0) return;

    for (const img of images) {
      if (!img || typeof img !== "string") continue;

      const prefix = "/uploads/products/";
      if (!img.startsWith(prefix)) continue;

      const filename = path.basename(img);
      const filePath = path.join(uploadsDir, "products", filename);

      fs.unlink(filePath, (err) => {
        if (err && err.code !== "ENOENT") {
          console.warn("[PRODUCTS] Failed to delete product image:", err.message);
        }
      });
    }
  } catch (e) {
    // لا نكسر العملية
  }
}

// GET /api/admin/products
export const getAdminProducts = asyncHandler(async (req, res) => {
  const { status, storeId, search, featured } = req.query;

  // ✅ إضافة باراميترات الصفحات (Pagination)
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20; // 20 منتج في الصفحة افتراضياً
  const skip = (page - 1) * limit;

  const filter = {};
  if (status) filter.status = status;
  if (storeId) filter.store = storeId;
  if (req.query.category) filter.category = req.query.category;
  if (search) {
    filter.name = { $regex: search, $options: "i" };
  }

  // ✅ فلترة حسب التميز
  if (featured === "true") {
    filter.isFeatured = true;
  } else if (featured === "false") {
    filter.isFeatured = false;
  }

  // ✅ جلب إجمالي العدد للفلتر الحالي (قبل الـ Limit)
  const totalCount = await Product.countDocuments(filter);

  // ✅ جلب المنتجات مع الـ Pagination والترتيب
  const products = await Product.find(filter)
    .populate("store", "name")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  // ✅ حساب عدد الوحدات المباعة لكل منتج في الصفحة الحالية فقط (تحسين أداء Aggregation)
  const productIds = products.map((p) => p._id);

  let salesMap = {};

  if (productIds.length > 0) {
    const deliveredCode = ORDER_STATUS_CODES?.DELIVERED;

    const matchStage = {
      "orderItems.product": { $in: productIds },
      $or: [
        ...(deliveredCode
          ? [{ statusCode: deliveredCode }, { "orderItems.statusCode": deliveredCode }]
          : []),
        { status: "تم التسليم" },
        { "orderItems.itemStatus": "تم التسليم" },
      ],
    };

    const agg = await Order.aggregate([
      { $match: matchStage },
      { $unwind: "$orderItems" },
      {
        $match: {
          "orderItems.product": { $in: productIds },
        },
      },
      {
        $group: {
          _id: "$orderItems.product",
          totalQty: { $sum: { $ifNull: ["$orderItems.qty", 0] } },
        },
      },
    ]);

    salesMap = agg.reduce((acc, row) => {
      acc[row._id.toString()] = row.totalQty || 0;
      return acc;
    }, {});
  }

  products.forEach((p) => {
    const key = p._id.toString();
    p.salesCount = salesMap[key] || 0;
  });

  // ✅ إرجاع البيانات مع معلومات الصفحات
  res.json({
    products,
    page,
    pages: Math.ceil(totalCount / limit),
    totalCount
  });
});

// GET /api/admin/products/:id/details
export const getAdminProductDetails = asyncHandler(async (req, res) => {
  const productId = req.params.id;

  const productDoc = await Product.findById(productId)
    .populate("store", "name")
    .populate("seller", "name")
    .populate("category", "name")
    .lean();

  if (!productDoc) {
    res.status(404);
    throw new Error("المنتج غير موجود");
  }

  const id = productDoc._id;

  // إحصاءات بسيطة: عدد الطلبات، عدد مرات التفضيل
  const [ordersCount, favoritesCount] = await Promise.all([
    Order.countDocuments({ "orderItems.product": id }),
    User.countDocuments({ favorites: id }),
  ]);

  const isActive =
    typeof productDoc.isActive === "boolean"
      ? productDoc.isActive
      : productDoc.status !== "inactive";

  const adminLocked = !!productDoc.adminLocked;

  let adminControlLabel = "";
  let statusDisplay = "";

  if (adminLocked) {
    adminControlLabel = "محجوب من الإدارة";
    statusDisplay = "محجوب من الإدارة";
  } else if (!isActive) {
    adminControlLabel = "مخفي من البائع";
    statusDisplay = "مخفي من البائع";
  } else {
    adminControlLabel = "نشط عادي";
    statusDisplay = "نشط";
  }

  res.json({
    product: {
      _id: id,
      id,
      name: productDoc.name,
      description: productDoc.description,
      price: productDoc.price,
      stock: productDoc.stock,
      unitLabel: productDoc.unitLabel,
      brand: productDoc.brand,
      variants: productDoc.variants,
      returnPolicy: productDoc.returnPolicy,
      category: productDoc.category,
      storeName: productDoc.store?.name || null,
      images: productDoc.images || [],
      rating: productDoc.rating || 0,
      numReviews: productDoc.numReviews || 0,
      status: productDoc.status,
      isActive,
      adminLocked,
      statusDisplay,
      adminControlLabel,
      ordersCount,
      favoritesCount,
      addToCartCount: productDoc.addToCartCount || 0,
      seller: productDoc.seller,
      storeId: productDoc.store?._id || productDoc.store || null,
      isFeatured: !!productDoc.isFeatured,
      featuredOrder: productDoc.featuredOrder || 0,
      createdAt: productDoc.createdAt,
      updatedAt: productDoc.updatedAt,
    },
  });
});

// PUT /api/admin/products/:id/status
export const updateProductStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error("المنتج غير موجود");
  }

  if (!status) {
    res.status(400);
    throw new Error("حقل الحالة (status) مطلوب");
  }

  const normalizedStatus = status === "inactive" ? "inactive" : "active";

  product.status = normalizedStatus;
  product.isActive = normalizedStatus === "active";
  product.adminLocked = normalizedStatus === "inactive";

  await product.save();

  res.json({ product });
});

// DELETE /api/admin/products/:id
export const deleteProductAsAdmin = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error("المنتج غير موجود");
  }

  // ✅ حذف صور المنتج من السيرفر قبل حذف السجل
  if (Array.isArray(product.images) && product.images.length) {
    safeDeleteProductImages(product.images);
  }

  await product.deleteOne();

  res.json({ message: "تم حذف المنتج بنجاح." });
});
// PUT /api/admin/products/:id/feature-status
export const updateProductFeatureStatus = asyncHandler(async (req, res) => {
  const { isFeatured, featuredOrder } = req.body;
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error("المنتج غير موجود");
  }

  // ✅ منطق التفعيل / إلغاء التفعيل
  if (isFeatured === true) {
    // 1. تفعيل التميز
    product.isFeatured = true;

    // 2. التعامل مع الترتيب
    if (typeof featuredOrder !== "undefined") {
      // إذا تم إرسال رقم ترتيب، يجب أن يكون >= 1
      const orderVal = Number(featuredOrder);
      if (isNaN(orderVal) || orderVal < 1) {
        res.status(400);
        throw new Error("رقم الترتيب للمنتج المميز يجب أن يكون 1 أو أكثر.");
      }
      product.featuredOrder = orderVal;
    } else {
      // إذا لم يرسل ترتيب (تفعيل سريع)، نحسب الرقم التالي تلقائياً
      // نأخذ أعلى featuredOrder موجود حالياً ونضيف 1
      // ملاحظة: قد يحدث تكرار بسيط في حالات نادرة جداً من التزامن (Race Condition)
      // لكنه مقبول هنا لأن النظام يعالج التساوي عبر finalSortScore
      const lastFeatured = await Product.findOne({ isFeatured: true })
        .sort({ featuredOrder: -1 })
        .select("featuredOrder");

      const maxOrder = lastFeatured?.featuredOrder || 0;
      product.featuredOrder = maxOrder + 1;
    }
  } else {
    // إلغاء التميز
    product.isFeatured = false;
    // تصفير الترتيب (قيمة مهملة)
    product.featuredOrder = 0;
  }

  await product.save();

  res.json({
    _id: product._id,
    isFeatured: product.isFeatured,
    featuredOrder: product.featuredOrder,
    message: product.isFeatured
      ? `تم تمييز المنتج بنجاح (ترتيب: ${product.featuredOrder})`
      : "تم إلغاء تمييز المنتج",
  });
});

