// ────────────────────────────────────────────────
// 📁 admin/adminOrdersController.js
// إدارة الطلبات (قائمة + تغيير حالة الطلب/العنصر + إلغاء)
// ────────────────────────────────────────────────

import asyncHandler from "express-async-handler";
import Order from "../../models/Order.js";
import {
  ORDER_STATUS_CODES,
  mapAdminStatusInputToCode,
  mapLegacyArabicStatusToCode,
  mapStatusCodeToLegacyArabic,
  syncOrderStatus,
  syncItemStatus,
  isCompleted,
} from "../../utils/orderStatus.js";
import { returnStock } from "../../utils/inventoryUtils.js";

// ✅ توحيد populate المستخدم في getAdminOrders حتى تكون الاستجابات متسقة بعد التحديث
function buildAdminOrderQuery(filterOrId) {
  const q =
    typeof filterOrId === "string"
      ? Order.findById(filterOrId)
      : Order.find(filterOrId);

  return q
    .populate("buyer", "name email phone")
    .populate("store", "name phone email address")
    .populate("seller", "name phone email address country")
    .populate({
      path: "orderItems.product",
      select: "name images mainImage description category",
      populate: {
        path: "category",
        select: "name",
      },
    })
    .populate({
      path: "orderItems.store",
      select: "name phone email address",
    })
    .populate("shippingCompany", "name");
}

async function getPopulatedAdminOrderById(orderId) {
  return buildAdminOrderQuery(orderId);
}

// GET /api/admin/orders
export const getAdminOrders = asyncHandler(async (req, res) => {
  const { status, statusCode } = req.query;

  const filter = {};

  // 🔹 فلترة اختيارية بالحالة النصية القديمة (للتوافق مع أي واجهات قديمة)
  if (status) {
    filter.status = status;
  }

  // 🔹 فلترة اختيارية بالكود الموحّد على مستوى الطلب
  if (statusCode) {
    filter.statusCode = statusCode;
  }

  // 🔹 نتأكد أن الطلب يحتوي على عناصر (منتجات) فعلًا
  filter["orderItems.0"] = { $exists: true };

  const orders = await buildAdminOrderQuery(filter).sort({ createdAt: -1 });

  res.json({ orders });
});

// PUT /api/admin/orders/:id/status
export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, statusCode, applyToItems } = req.body;
  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error("الطلب غير موجود");
  }

  if (!status && !statusCode) {
    res.status(400);
    throw new Error("حقل الحالة (status) أو (statusCode) مطلوب");
  }

  let nextStatusCode = null;

  // 1) لو أُرسل statusCode مباشرًا
  if (
    statusCode &&
    Object.values(ORDER_STATUS_CODES).includes(String(statusCode).trim())
  ) {
    nextStatusCode = String(statusCode).trim();
  } else if (status) {
    const s = String(status).trim();
    // 2) نحاول تفسير إدخال الأدمن (كود أو نص عربي)
    nextStatusCode =
      mapAdminStatusInputToCode(s) ||
      // 3) لو كان نفس الكود الموحّد
      (Object.values(ORDER_STATUS_CODES).includes(s) ? s : null) ||
      // 4) نحاول تحويل الحالة العربية العامة القديمة
      mapLegacyArabicStatusToCode(s);
  }

  if (nextStatusCode) {
    // ✅ تحديث حالة الطلب بالكود الموحّد
    order.statusCode = nextStatusCode;

    const legacy = mapStatusCodeToLegacyArabic(nextStatusCode);
    if (legacy) {
      order.status = legacy;
    }

    // ✅ مهم لمتجر متعدد البائعين:
    // لا نلمس عناصر الطلب تلقائيًا إلا إذا طُلب ذلك صراحةً.
    const shouldApplyToItems =
      applyToItems === true || String(applyToItems).toLowerCase() === "true";

    if (shouldApplyToItems && Array.isArray(order.orderItems)) {
      order.orderItems.forEach((item) => {
        if (!item) return;
        item.statusCode = nextStatusCode;
        const legacyItem = mapStatusCodeToLegacyArabic(nextStatusCode);
        if (legacyItem) {
          item.itemStatus = legacyItem;
        }
      });
    }
  } else if (status) {
    // للحفاظ على التوافق مع المنطق القديم
    order.status = status;
  }

  // لو أصبحت الحالة "تم التسليم" نحدّث deliveredAt
  if (isCompleted(order)) {
    order.deliveredAt = Date.now();
  }

  await order.save();

  // ✅ نرجع نفس شكل getAdminOrders (populate كامل)
  const populated = await getPopulatedAdminOrderById(order._id);

  res.json({ order: populated });
});

// PUT /api/admin/orders/:id/cancel
export const cancelOrderAsAdmin = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error("الطلب غير موجود");
  }

  // ✅ استخدام الكود الموحّد للإلغاء من قبل الإدارة على مستوى الطلب
  syncOrderStatus(order, ORDER_STATUS_CODES.CANCELLED_BY_ADMIN);
  order.cancellationReason = (reason || "").trim();

  // ✅ إلغاء كل المنتجات داخل الطلب بنفس الكود الموحد
  if (Array.isArray(order.orderItems)) {
    order.orderItems.forEach((item) => {
      if (!item) return;
      syncItemStatus(item, ORDER_STATUS_CODES.CANCELLED_BY_ADMIN);
    });
  }

  await order.save();

  // ✅ إعادة المخزون للمنتجات عند إلغاء الطلب بالكامل من قبل الإدارة
  if (Array.isArray(order.orderItems)) {
    await returnStock(order.orderItems);
  }

  // ✅ نرجع نفس شكل getAdminOrders (populate كامل)
  const populated = await getPopulatedAdminOrderById(order._id);

  res.json({ order: populated });
});

// PATCH /api/admin/orders/:orderId/items/:itemId/status
export const updateOrderItemStatusAsAdmin = asyncHandler(async (req, res) => {
  const { orderId, itemId } = req.params;
  const { status, statusCode } = req.body;

  if (!orderId || !itemId) {
    res.status(400);
    throw new Error("معرّف الطلب ومعرّف المنتج داخل الطلب مطلوبان");
  }

  if (!status && !statusCode) {
    res.status(400);
    throw new Error("حقل الحالة (status) أو (statusCode) مطلوب");
  }

  const order = await Order.findById(orderId);

  if (!order) {
    res.status(404);
    throw new Error("الطلب غير موجود");
  }

  if (!Array.isArray(order.orderItems) || order.orderItems.length === 0) {
    res.status(404);
    throw new Error("لا يحتوي هذا الطلب على أي عناصر منتجات");
  }

  const item = order.orderItems.id(itemId);

  if (!item) {
    res.status(404);
    throw new Error("العنصر المطلوب داخل الطلب غير موجود");
  }

  let nextStatusCode = null;

  // 1) لو أُرسل statusCode مباشرًا كأحد الأكواد الموحّدة
  if (
    statusCode &&
    Object.values(ORDER_STATUS_CODES).includes(String(statusCode).trim())
  ) {
    nextStatusCode = String(statusCode).trim();
  } else if (status) {
    const s = String(status).trim();
    // 2) نحاول تفسير إدخال الأدمن (كود أو نص عربي)
    nextStatusCode =
      mapAdminStatusInputToCode(s) ||
      // 3) لو كان نفس الكود الموحّد
      (Object.values(ORDER_STATUS_CODES).includes(s) ? s : null) ||
      // 4) نحاول تحويل الحالة العربية العامة القديمة
      mapLegacyArabicStatusToCode(s);
  }

  if (!nextStatusCode) {
    res.status(400);
    throw new Error("قيمة الحالة غير صحيحة أو غير مدعومة.");
  }

  // ✅ تحديث حالة هذا المنتج فقط داخل الطلب
  syncItemStatus(item, nextStatusCode);

  await order.save();

  // ✅ نرجع نفس شكل getAdminOrders (populate كامل)
  const populated = await getPopulatedAdminOrderById(order._id);

  res.json({ order: populated });
});

// PATCH /api/admin/orders/:orderId/items/:itemId/cancel-by-admin
export const cancelOrderItemAsAdmin = asyncHandler(async (req, res) => {
  const { orderId, itemId } = req.params;
  const { reason } = req.body;

  if (!orderId || !itemId) {
    res.status(400);
    throw new Error("معرّف الطلب ومعرّف المنتج داخل الطلب مطلوبان");
  }

  const order = await Order.findById(orderId);

  if (!order) {
    res.status(404);
    throw new Error("الطلب غير موجود");
  }

  if (!Array.isArray(order.orderItems) || order.orderItems.length === 0) {
    res.status(404);
    throw new Error("لا يحتوي هذا الطلب على أي عناصر منتجات");
  }

  const item = order.orderItems.id(itemId);

  if (!item) {
    res.status(404);
    throw new Error("العنصر المطلوب داخل الطلب غير موجود");
  }

  // ✅ إلغاء هذا المنتج فقط باستخدام الكود الموحّد
  syncItemStatus(item, ORDER_STATUS_CODES.CANCELLED_BY_ADMIN);

  // يمكن استخدام سبب الإلغاء على مستوى الطلب ككل (للتوافق مع الحقل الحالي)
  if (typeof reason === "string" && reason.trim()) {
    order.cancellationReason = reason.trim();
  }

  await order.save();

  // ✅ إعادة المخزون لهذا المنتج الملغى من قبل الإدارة
  await returnStock([item]);

  // ✅ نرجع نفس شكل getAdminOrders (populate كامل)
  const populated = await getPopulatedAdminOrderById(order._id);

  res.json({ order: populated });
});

// ────────────────────────────────────────────────
// 🚨 DELETE /api/admin/orders/:id - حذف الطلب نهائياً
// ────────────────────────────────────────────────
// ⚠️ تنبيه: هذه العملية خطيرة جداً ولا يمكن التراجع عنها
// - متاح فقط لـ Super Admin (isOwner = true)
// - يحذف الطلب من جميع السجلات والتقارير والإحصائيات
// - لا يمكن استرجاع البيانات بعد الحذف
export const deleteOrderPermanently = asyncHandler(async (req, res) => {
  const orderId = req.params.id;

  if (!orderId) {
    res.status(400);
    throw new Error("معرّف الطلب مطلوب");
  }

  // ✅ التحقق من أن المستخدم هو Super Admin فقط
  const user = req.user;
  if (!user || user.role !== "admin" || user.isOwner !== true) {
    res.status(403);
    throw new Error(
      "غير مصرح لك بهذه العملية. هذه الصلاحية متاحة فقط للمدير الأعلى (Super Admin)"
    );
  }

  // البحث عن الطلب
  const order = await Order.findById(orderId);

  if (!order) {
    res.status(404);
    throw new Error("الطلب غير موجود");
  }

  // حفظ معلومات الطلب قبل الحذف للسجل
  const orderInfo = {
    orderId: order._id,
    orderNumber: order.orderNumber || String(order._id).slice(-6),
    buyerName: order.buyer?.name || "غير محدد",
    totalPrice: order.totalPrice,
    itemsCount: order.orderItems?.length || 0,
  };

  // 🗑️ حذف الطلب نهائياً من قاعدة البيانات
  await Order.findByIdAndDelete(orderId);

  // ملاحظة: إذا كان لديك جداول أخرى مرتبطة بالطلب (مثل جدول المعاملات المالية،
  // السجلات، التقارير، العمولات، إلخ)، يجب حذف السجلات المرتبطة هنا أيضاً.
  // مثال:
  // await Transaction.deleteMany({ order: orderId });
  // await Commission.deleteMany({ order: orderId });
  // await FinancialRecord.deleteMany({ order: orderId });

  res.json({
    success: true,
    message: "تم حذف الطلب نهائياً من النظام بنجاح",
    deletedOrder: orderInfo,
  });
});
