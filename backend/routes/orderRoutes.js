// ────────────────────────────────────────────────
// 📁 backend/routes/orderRoutes.js
// مسارات الطلبات في نظام طلبية (Talabia)
// ✅ إغلاق ثغرات الصلاحيات (IDOR) + منع تجاوز كود التسليم
// ────────────────────────────────────────────────

import express from "express";
import asyncHandler from "express-async-handler";
import {
  createOrder,
  getMyOrders,
  getOrderById,
  updateOrderStatus,
  getOrders,
} from "../controllers/orderController.js";
import { protect } from "../middleware/authMiddleware.js";
import { allowRoles } from "../middleware/roleMiddleware.js";
import Order from "../models/Order.js";

import {
  ORDER_STATUS_CODES,
  mapAdminStatusInputToCode,
  mapLegacyArabicStatusToCode,
  mapStatusCodeToLegacyArabic,
} from "../utils/orderStatus.js";

const router = express.Router();

// إنشاء طلب جديد (المشتري)
router.post("/", protect, allowRoles("buyer"), createOrder);

// طلبات المشتري الحالي
router.get("/my", protect, allowRoles("buyer"), getMyOrders);

// قائمة الطلبات:
// - البائع: طلبات هذا البائع
// - المشتري: طلبات هذا المشتري
// - الأدمن: جميع الطلبات
router.get("/", protect, allowRoles("buyer", "seller", "admin"), getOrders);

// تفاصيل طلب واحد
// ✅ مُقيدة بالأدوار + يتم التحقق من الملكية داخل getOrderById
router.get(
  "/:id",
  protect,
  allowRoles("buyer", "seller", "shipper", "admin"),
  getOrderById
);

// تحديث حالة الطلب العامة
// ✅ للإنتاج الأفضل: الأدمن فقط (لتفادي عبث البائع/الشاحن بحالة الطلب العامة)
// البائع/الشاحن يحدثون "عنصر الطلب" وليس الطلب كله
router.put("/:id/status", protect, allowRoles("admin"), updateOrderStatus);

// ────────────────────────────────────────────────
// ✳️ مسارات متقدمة على مستوى "عنصر الطلب" (Order Item)
// - تحديث حالة منتج داخل الطلب
// - تقييم منتج
// - إخفاء منتج من واجهة المشتري
// ────────────────────────────────────────────────

// ✅ تحديث حالة منتج داخل طلب (للبائع / الشاحن / الأدمن)
// ✅ تدعم statusCode + منع IDOR + توحيد itemStatus مع statusCode
router.put(
  "/:orderId/items/:itemId/status",
  protect,
  allowRoles("seller", "shipper", "admin"),
  asyncHandler(async (req, res) => {
    const { orderId, itemId } = req.params;
    const { status, statusCode } = req.body || {};

    if (!status && !statusCode) {
      res.status(400);
      throw new Error("حقل الحالة (status) أو (statusCode) مطلوب");
    }

    const order = await Order.findById(orderId).populate(
      "shippingCompany",
      "_id"
    );
    if (!order) {
      res.status(404);
      throw new Error("الطلب غير موجود");
    }

    const item = order.orderItems.id(itemId);
    if (!item) {
      res.status(404);
      throw new Error("العنصر غير موجود في هذا الطلب");
    }

    const userId = String(req.user?._id || req.user?.id || "");
    const role = String(req.user?.role || "").toLowerCase().trim();

    // ✅ تحقق ملكية البائع: لا يغير إلا عناصره فقط
    // ملاحظة: بعض البنى تخزن المالك في item.seller أو item.store
    if (role === "seller") {
      const itemSeller =
        item.seller?.toString?.() || (item.seller ? String(item.seller) : "");
      const itemStore =
        item.store?.toString?.() || (item.store ? String(item.store) : "");

      const userStoreId = String(
        req.user?.store?._id ||
          req.user?.storeId ||
          req.user?.store ||
          req.user?.sellerStore ||
          ""
      );

      const okBySeller = itemSeller && itemSeller === userId;
      const okByStore = itemStore && userStoreId && itemStore === userStoreId;

      if (!okBySeller && !okByStore) {
        res.status(403);
        throw new Error("غير مصرح لك بتعديل حالة هذا العنصر");
      }
    }

    // ✅ تحقق شركة الشحن: لا يغير إلا طلبات شركته
    if (role === "shipper") {
      const shipperCompanyId =
        req.user?.shippingCompany ||
        req.user?.shippingCompanyId ||
        req.user?.companyId ||
        req.user?.company ||
        null;

      const orderCompany =
        order.shippingCompany?._id?.toString?.() ||
        order.shippingCompany?.toString?.() ||
        "";

      // إذا ما عندنا companyId على المستخدم، نمنع للتأكد (أكثر أمانًا)
      if (!shipperCompanyId) {
        res.status(403);
        throw new Error(
          "لا يمكن تحديد شركة الشحن لهذا الحساب، غير مصرح بالتعديل"
        );
      }

      if (!orderCompany || String(orderCompany) !== String(shipperCompanyId)) {
        res.status(403);
        throw new Error("غير مصرح لك بتعديل طلب غير تابع لشركتك");
      }
    }

    // ── توحيد الحالة ──────────────────────────────
    let nextStatusCode = null;

    // 1) إذا جاء statusCode مباشرًا وكان صالحًا
    if (
      statusCode &&
      Object.values(ORDER_STATUS_CODES).includes(String(statusCode).trim())
    ) {
      nextStatusCode = String(statusCode).trim();
    } else if (status) {
      // 2) إذا جاء status نصيًا: نحاول تحويله
      const s = String(status).trim();

      nextStatusCode =
        mapAdminStatusInputToCode(s) ||
        (Object.values(ORDER_STATUS_CODES).includes(s) ? s : null) ||
        mapLegacyArabicStatusToCode(s);
    }

    // لو ما قدرنا نحوله لكود، نرفض (حتى لا نخرب التوحيد)
    if (!nextStatusCode) {
      res.status(400);
      throw new Error(
        "قيمة الحالة غير صالحة (استخدم statusCode صحيح أو status معروف)"
      );
    }

    // ✅ حماية: البائع لا يجعل العنصر Delivered مباشرة
    if (role === "seller" && nextStatusCode === ORDER_STATUS_CODES.DELIVERED) {
      res.status(403);
      throw new Error("غير مصرح للبائع بتعيين الحالة إلى مكتمل/تم التسليم");
    }

    // ✅ حماية حرجة: الشاحن لا يجعل العنصر Delivered من هذا المسار
    // يجب استخدام مسار confirmDeliveryWithCode في shippingRoutes
    if (role === "shipper" && nextStatusCode === ORDER_STATUS_CODES.DELIVERED) {
      res.status(403);
      throw new Error(
        "لا يمكن تأكيد التسليم من هذا المسار. استخدم مسار تأكيد التسليم بالكود."
      );
    }

    item.statusCode = nextStatusCode;

    const legacyArabic = mapStatusCodeToLegacyArabic(nextStatusCode);
    if (legacyArabic) {
      item.itemStatus = legacyArabic; // يضمن تماشي الواجهات القديمة
    }

    // تسجيل وقت التسليم إذا أصبحت Delivered/مكتمل (للأدمن فقط هنا)
    if (
      nextStatusCode === ORDER_STATUS_CODES.DELIVERED ||
      item.itemStatus === "مكتمل"
    ) {
      item.deliveredAt = new Date();
    }

    await order.save();

    res.json({
      message: "تم تحديث حالة هذا المنتج داخل الطلب بنجاح.",
      orderId: order._id,
      item: {
        id: item._id,
        product: item.product,
        itemStatus: item.itemStatus,
        statusCode: item.statusCode,
        deliveredAt: item.deliveredAt,
      },
    });
  })
);

// ✅ تقييم منتج داخل الطلب (المشتري فقط)
router.post(
  "/:orderId/items/:itemId/rating",
  protect,
  allowRoles("buyer"),
  asyncHandler(async (req, res) => {
    const { orderId, itemId } = req.params;
    const { value, comment } = req.body;

    if (typeof value !== "number") {
      res.status(400);
      throw new Error("قيمة التقييم (1-5) مطلوبة");
    }

    if (value < 1 || value > 5) {
      res.status(400);
      throw new Error("قيمة التقييم يجب أن تكون بين 1 و 5");
    }

    // التأكد أن هذا الطلب يخص المشتري الحالي
    const order = await Order.findOne({
      _id: orderId,
      buyer: req.user.id,
    });

    if (!order) {
      res.status(404);
      throw new Error("الطلب غير موجود أو لا يخص هذا المستخدم");
    }

    const item = order.orderItems.id(itemId);
    if (!item) {
      res.status(404);
      throw new Error("العنصر غير موجود في هذا الطلب");
    }

    item.rating = {
      value,
      comment: comment || "",
      ratedAt: new Date(),
    };

    await order.save();

    res.json({
      message: "تم تسجيل تقييمك لهذا المنتج بنجاح.",
      orderId: order._id,
      itemId: item._id,
      rating: item.rating,
    });
  })
);

// ✅ إخفاء منتج من واجهة "طلباتي" للمشتري (لا يُحذف من قاعدة البيانات)
router.put(
  "/:orderId/items/:itemId/hide-for-buyer",
  protect,
  allowRoles("buyer"),
  asyncHandler(async (req, res) => {
    const { orderId, itemId } = req.params;

    // التأكد أن هذا الطلب يخص المشتري الحالي
    const order = await Order.findOne({
      _id: orderId,
      buyer: req.user.id,
    });

    if (!order) {
      res.status(404);
      throw new Error("الطلب غير موجود أو لا يخص هذا المستخدم");
    }

    const item = order.orderItems.id(itemId);
    if (!item) {
      res.status(404);
      throw new Error("العنصر غير موجود في هذا الطلب");
    }

    item.hiddenForBuyer = true;

    await order.save();

    res.json({
      message: "تم إخفاء هذا المنتج من صفحة طلباتك.",
      orderId: order._id,
      itemId: item._id,
    });
  })
);

export default router;
