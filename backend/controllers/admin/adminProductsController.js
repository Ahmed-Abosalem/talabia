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
  const { status, storeId, search } = req.query;

  const filter = {};
  if (status) filter.status = status;
  if (storeId) filter.store = storeId;
  if (search) {
    filter.name = { $regex: search, $options: "i" };
  }

  // ✅ نستخدم lean() حتى تصبح النتيجة كائنات عادية،
  // وبذلك يظهر الحقل المؤقت salesCount في JSON المرسل للفرونت.
  const products = await Product.find(filter)
    .populate("store", "name")
    .sort({ createdAt: -1 })
    .lean();

  // ✅ حساب عدد الوحدات المباعة لكل منتج (salesCount)
  // نعتمد على الطلبات التي حالتها "تم التسليم" سواء بالكود الموحّد أو بالنص العربي القديم
  const productIds = products.map((p) => p._id);

  let salesMap = {};

  if (productIds.length > 0) {
    const deliveredCode = ORDER_STATUS_CODES?.DELIVERED;

    // نجمع كل الاحتمالات في نفس الـ $or
    const matchStage = {
      "orderItems.product": { $in: productIds },
      $or: [
        // حالة الكود الموحّد إن وُجد
        ...(deliveredCode
          ? [{ statusCode: deliveredCode }, { "orderItems.statusCode": deliveredCode }]
          : []),
        // والحالة القديمة بالنص العربي
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
          // ✅ حماية: لو qty غير موجود نعتبره 0
          totalQty: { $sum: { $ifNull: ["$orderItems.qty", 0] } },
        },
      },
    ]);

    salesMap = agg.reduce((acc, row) => {
      acc[row._id.toString()] = row.totalQty || 0;
      return acc;
    }, {});
  }

  // نحقن salesCount لكل منتج (ليصل إلى الفرونت مباشرة)
  products.forEach((p) => {
    const key = p._id.toString();
    p.salesCount = salesMap[key] || 0;
  });

  res.json({ products });
});

// GET /api/admin/products/:id/details
export const getAdminProductDetails = asyncHandler(async (req, res) => {
  const productId = req.params.id;

  const productDoc = await Product.findById(productId)
    .populate("store", "name")
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
