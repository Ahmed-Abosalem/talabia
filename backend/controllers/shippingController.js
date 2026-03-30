// ────────────────────────────────────────────────
// 📁 backend/controllers/shippingController.js
// منطق لوحة شركة الشحن في نظام طلبية (Talabia)
// ✅ إصلاح صلاحيات شركة الشحن + منع IDOR + تحسين الأداء
// ✅ منع تجاوز كود التسليم + منع تعديل العناصر الملغاة/المكتملة
// ✅ معالجة إغلاق الطلب عند وجود عناصر ملغاة
// ────────────────────────────────────────────────

import asyncHandler from "express-async-handler";
import ShippingCompany from "../models/ShippingCompany.js";
import Order from "../models/Order.js";
import {
  ORDER_STATUS_CODES,
  mapShippingStatusKeyToCode,
  mapStatusCodeToLegacyArabic,
  syncItemStatus,
  syncOrderStatus,
  isFinal,
  isCompleted,
} from "../utils/orderStatus.js";
import { registerFinancialTransactionsForDeliveredOrder } from "../utils/financialTransactions.js";

// 🧩 إيجاد شركة الشحن المرتبطة بالمستخدم الحالي
async function findCompanyForUser(userId) {
  if (!userId) return null;

  const company = await ShippingCompany.findOne({
    user: userId,
    isActive: true,
  }).lean();

  return company || null;
}

// 🧩 هل هذا العنصر داخل الطلب ضمن نطاق (stores) لشركة seller-specific؟
function isItemVisibleForCompany(company, item) {
  if (!item) return false;

  const scope = company?.scope || "global";
  if (scope === "global") return true;

  const stores =
    Array.isArray(company?.stores) && company.stores.length
      ? company.stores.map((id) => id.toString())
      : [];

  if (!stores.length) return false;

  // ✅ الصحيح: الاعتماد على store فقط
  const storeId =
    item.store?._id?.toString?.() ||
    item.store?.toString?.() ||
    (typeof item.store === "string" ? item.store : null);

  if (!storeId) return false;

  return stores.includes(storeId);
}

// 🧩 عناصر الطلب التي تخص هذه الشركة
function getItemsForCompany(company, order) {
  if (!order || !Array.isArray(order.orderItems)) return [];
  return order.orderItems.filter((item) => isItemVisibleForCompany(company, item));
}

// 🧩 تحقق أمني: هل هذا الطلب مُسند لهذه الشركة؟
function assertOrderBelongsToCompany(company, order) {
  const companyId = company?._id?.toString?.() || String(company?._id || "");
  const orderCompanyId =
    order?.shippingCompany?._id?.toString?.() ||
    order?.shippingCompany?.toString?.() ||
    String(order?.shippingCompany || "");

  if (!orderCompanyId || !companyId || orderCompanyId !== companyId) {
    return false;
  }
  return true;
}

// ✅ عنصر “نهائي” لا يجوز تغييره استخدام المرجع الموحد
function isFinalItem(item) {
  return isFinal(item);
}

// ✅ هل كل عناصر الطلب وصلت إلى حالة نهائية؟ (Delivered أو Cancelled)
function isOrderFinalized(order) {
  if (!order || !Array.isArray(order.orderItems) || !order.orderItems.length) return false;
  return order.orderItems.every((it) => isFinalItem(it));
}

// ✅ إعادة جلب الطلب بنفس populate المستخدم في getShippingOrders
async function getPopulatedShippingOrderById(company, orderId) {
  const query = await Order.findOne({
    _id: orderId,
    shippingCompany: company._id,
    "orderItems.0": { $exists: true },
  })
    .populate("buyer", "name email phone")
    .populate("store", "name phone email address")
    .populate("seller", "name phone email address country")
    .populate({
      path: "orderItems.product",
      select: "name images description",
    })
    .populate({
      path: "orderItems.store",
      select: "name phone email address address",
    })
    .lean();

  if (!query) return null;

  // نفس التنظيف الموجود في getShippingOrders (إخفاء deliveryCode + فلترة العناصر الملغاة + نطاق الشركة)
  const items = Array.isArray(query.orderItems)
    ? query.orderItems
      .filter((item) => {
        if (!item) return false;
        return isItemVisibleForCompany(company, item);
      })
      .map((item) => {
        const { deliveryCode, ...restItem } = item;
        return restItem;
      })
    : [];

  if (!items.length) return null;

  const { deliveryCode, ...restOrder } = query;
  return { ...restOrder, orderItems: items };
}

// ────────────────────────────────────────────────
// 🟢 جلب تسعيرة الشحن الافتراضية (للـ Checkout)
// ────────────────────────────────────────────────

export const getDefaultShippingPricing = asyncHandler(async (req, res) => {
  const company = await ShippingCompany.findOne({
    scope: "global",
    isActive: true,
  })
    .sort({ createdAt: -1 })
    .lean();

  if (!company || !company.pricing) {
    return res.json({
      baseFee: 0,
      currency: "ر.س",
    });
  }

  const { baseFee = 0, currency = "ر.س" } = company.pricing;

  res.json({ baseFee, currency });
});

// ────────────────────────────────────────────────
// 🟢 جلب طلبات الشحن لشركة الشحن الحالية
// ✅ لا يجلب إلا الطلبات المسندة لهذه الشركة فقط
// ────────────────────────────────────────────────

export const getShippingOrders = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  const company = await findCompanyForUser(userId);

  if (!company) {
    return res.json([]);
  }

  const query = {
    shippingCompany: company._id,
    "orderItems.0": { $exists: true },
  };

  const orders = await Order.find(query)
    .populate("buyer", "name email phone")
    .populate("store", "name phone email address")
    .populate("seller", "name phone email address country")
    .populate({
      path: "orderItems.product",
      select: "name images description",
    })
    .populate({
      path: "orderItems.store",
      select: "name phone email address address",
    })
    .sort({ createdAt: -1 })
    .lean();

  const sanitized = orders
    .map((order) => {
      const items = Array.isArray(order.orderItems)
        ? order.orderItems
          .filter((item) => {
            if (!item) return false;
            return isItemVisibleForCompany(company, item);
          })
          .map((item) => {
            const { deliveryCode, ...restItem } = item;
            return restItem;
          })
        : [];

      if (!items.length) return null;

      const { deliveryCode, ...restOrder } = order;

      return {
        ...restOrder,
        orderItems: items,
      };
    })
    .filter(Boolean);

  res.json(sanitized);
});

// ────────────────────────────────────────────────
// 🟢 تحديث حالة الشحن على مستوى الطلب (Bulk/قديم)
// ✅ ممنوع وضع Delivered من هنا (يلزم كود)
// ✅ ممنوع تعديل العناصر النهائية (ملغى/مكتمل)
// ────────────────────────────────────────────────

export const updateShippingStatus = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  const company = await findCompanyForUser(userId);

  if (!company) {
    return res.status(403).json({
      message: "لا تملك شركة الشحن الحالية صلاحية لتعديل هذه الطلبات.",
    });
  }

  const { orderId } = req.params;
  const { statusKey } = req.body;

  if (!statusKey) {
    return res.status(400).json({ message: "حقل statusKey مطلوب." });
  }

  // ✅ منع تجاوز كود التسليم
  if (statusKey === "delivered") {
    return res.status(400).json({
      message:
        "لا يمكن تعيين الحالة 'تم التسليم' من هذا المسار. استخدم مسار تأكيد التسليم بكود التسليم لكل منتج.",
    });
  }

  const mappedStatusCode = mapShippingStatusKeyToCode(statusKey);

  if (!mappedStatusCode) {
    return res.status(400).json({ message: "قيمة statusKey غير معروفة." });
  }

  const order = await Order.findById(orderId);
  if (!order) {
    return res.status(404).json({ message: "الطلب غير موجود." });
  }

  // ✅ شرط الأمان: هذا الطلب يجب أن يكون مسندًا لهذه الشركة
  if (!assertOrderBelongsToCompany(company, order)) {
    return res.status(403).json({
      message: "هذا الطلب غير تابع لشركة الشحن الحالية.",
    });
  }

  const itemsForCompany = getItemsForCompany(company, order);
  if (!itemsForCompany.length) {
    return res.status(403).json({
      message: "لا توجد منتجات في هذا الطلب مرتبطة بنطاق شركة الشحن الحالية.",
    });
  }

  // ✅ لا تعدّل عناصر نهائية
  const editableItems = itemsForCompany.filter((it) => !isFinalItem(it));

  if (!editableItems.length) {
    return res.status(400).json({
      message: "لا توجد عناصر قابلة للتعديل (جميع عناصر شركتك مكتملة أو ملغاة).",
    });
  }

  if (statusKey === "on_the_way") {
    editableItems.forEach((item) => {
      item.statusCode = ORDER_STATUS_CODES.IN_SHIPPING;
      item.itemStatus = "قيد الشحن";
    });
    order.shippingStatus = "on_the_way";
  } else if (
    statusKey === "cancelled_ship" ||
    statusKey === "cancelled_shipping" ||
    statusKey === "cancelled"
  ) {
    editableItems.forEach((item) => {
      item.statusCode = ORDER_STATUS_CODES.CANCELLED_BY_SHIPPING;
      item.itemStatus = "ملغى";
    });
    order.shippingStatus = "cancelled_shipping";
  }

  await order.save();

  // ✅ نرجع طلب populated ومتسق مع قائمة getShippingOrders
  const populated = await getPopulatedShippingOrderById(company, order._id);

  res.json({
    message: "تم تحديث حالة الشحن لهذا الطلب بنجاح.",
    order: populated,
  });
});

// ────────────────────────────────────────────────
// 🟢 تحديث حالة الشحن لمنتج واحد داخل الطلب
// ✅ ممنوع تعديل العناصر النهائية (ملغى/مكتمل)
// ✅ ممنوع وضع Delivered من هنا (يلزم كود)
// ────────────────────────────────────────────────

export const updateShippingItemStatus = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  const company = await findCompanyForUser(userId);

  if (!company) {
    return res.status(403).json({
      message: "لا تملك شركة الشحن الحالية صلاحية لتعديل هذه الطلبات.",
    });
  }

  const { orderId, itemId } = req.params;
  const { statusKey } = req.body;

  if (!statusKey) {
    return res.status(400).json({ message: "حقل statusKey مطلوب." });
  }

  const mappedStatusCode = mapShippingStatusKeyToCode(statusKey);
  if (!mappedStatusCode) {
    return res.status(400).json({ message: "قيمة statusKey غير معروفة." });
  }

  // ✅ لا نسمح بضبط Delivered من هنا
  if (mappedStatusCode === ORDER_STATUS_CODES.DELIVERED) {
    return res.status(400).json({
      message:
        "لا يمكن تعيين الحالة 'تم التسليم' من هذا المسار. استخدم مسار تأكيد التسليم بكود التسليم.",
    });
  }

  const order = await Order.findById(orderId);
  if (!order) {
    return res.status(404).json({ message: "الطلب غير موجود." });
  }

  // ✅ شرط الأمان
  if (!assertOrderBelongsToCompany(company, order)) {
    return res.status(403).json({ message: "هذا الطلب غير تابع لشركتك." });
  }

  const item =
    Array.isArray(order.orderItems) && order.orderItems.id
      ? order.orderItems.id(itemId)
      : null;

  if (!item) {
    return res.status(404).json({
      message: "المنتج المطلوب ضمن هذا الطلب غير موجود.",
    });
  }

  // ✅ نطاق seller-specific حسب stores
  if (!isItemVisibleForCompany(company, item)) {
    return res.status(403).json({
      message: "هذا المنتج ليس ضمن نطاق شركة الشحن الحالية.",
    });
  }

  // ✅ ممنوع تعديل عنصر نهائي
  if (isFinalItem(item)) {
    return res.status(400).json({
      message: "لا يمكن تعديل هذا المنتج لأنه مكتمل أو ملغى.",
    });
  }

  if (mappedStatusCode === ORDER_STATUS_CODES.IN_SHIPPING) {
    syncItemStatus(item, ORDER_STATUS_CODES.IN_SHIPPING);
    order.shippingStatus = "on_the_way";
  } else if (mappedStatusCode === ORDER_STATUS_CODES.CANCELLED_BY_SHIPPING) {
    syncItemStatus(item, ORDER_STATUS_CODES.CANCELLED_BY_SHIPPING);
    order.shippingStatus = "cancelled_shipping";
  }

  await order.save();

  // ✅ نرجع طلب populated ومتسق
  const populated = await getPopulatedShippingOrderById(company, order._id);

  res.json({
    message: "تم تحديث حالة هذا المنتج داخل الطلب من قبل شركة الشحن.",
    order: populated,
  });
});

// ────────────────────────────────────────────────
// 🟢 تأكيد التسليم باستخدام كود التسليم لكل منتج داخل الطلب
// ✅ ممنوع إذا العنصر ملغى أو مكتمل
// ✅ إغلاق الطلب إذا كل العناصر Delivered أو Cancelled
// ────────────────────────────────────────────────

export const confirmDeliveryWithCode = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  const company = await findCompanyForUser(userId);

  if (!company) {
    return res.status(403).json({
      message: "لا تملك شركة الشحن الحالية صلاحية لتأكيد تسليم هذه الطلبات.",
    });
  }

  const { orderId, itemId } = req.params;
  const { deliveryCode } = req.body;

  if (!deliveryCode) {
    return res.status(400).json({
      message: "حقل deliveryCode (كود التسليم) مطلوب.",
    });
  }

  const order = await Order.findById(orderId);
  if (!order) {
    return res.status(404).json({ message: "الطلب غير موجود." });
  }

  // ✅ شرط الأمان
  if (!assertOrderBelongsToCompany(company, order)) {
    return res.status(403).json({ message: "هذا الطلب غير تابع لشركتك." });
  }

  const item =
    Array.isArray(order.orderItems) && order.orderItems.id
      ? order.orderItems.id(itemId)
      : null;

  if (!item) {
    return res.status(404).json({
      message: "المنتج المطلوب ضمن هذا الطلب غير موجود.",
    });
  }

  // ✅ نطاق seller-specific
  if (!isItemVisibleForCompany(company, item)) {
    return res.status(403).json({
      message: "هذا المنتج ليس ضمن نطاق شركة الشحن الحالية.",
    });
  }

  // ✅ ممنوع تأكيد التسليم لعنصر نهائي (ملغى/مكتمل)
  if (isFinalItem(item)) {
    return res.status(400).json({
      message: "لا يمكن تأكيد التسليم لهذا المنتج لأنه مكتمل أو ملغى.",
    });
  }

  const wasDeliveredBefore =
    order.statusCode === ORDER_STATUS_CODES.DELIVERED ||
    order.status === "مكتمل" ||
    order.status === "completed";

  // تحقق الكود
  if (!item.deliveryCode || String(item.deliveryCode) !== String(deliveryCode)) {
    return res.status(400).json({ message: "كود التسليم غير صحيح." });
  }

  // تحديث حالة المنتج
  syncItemStatus(item, ORDER_STATUS_CODES.DELIVERED);
  item.deliveredAt = new Date();

  // ✅ إذا كل العناصر وصلت حالة نهائية (Delivered أو Cancelled) → نغلق الطلب
  if (isOrderFinalized(order)) {
    order.statusCode = ORDER_STATUS_CODES.DELIVERED;
    order.status = mapStatusCodeToLegacyArabic(ORDER_STATUS_CODES.DELIVERED);
    order.shippingStatus = "delivered";
    order.deliveredAt = new Date();
  }

  order.markModified("orderItems"); // ✅ ضمان حفظ التغييرات العميقة
  const updated = await order.save();

  const isDeliveredNow =
    updated.statusCode === ORDER_STATUS_CODES.DELIVERED ||
    updated.status === "مكتمل" ||
    updated.status === "completed";

  // ✅ تسجيل الحركات المالية مرة واحدة فقط عند اكتمال الطلب لأول مرة
  if (isDeliveredNow && !wasDeliveredBefore) {
    try {
      await registerFinancialTransactionsForDeliveredOrder(updated._id);
    } catch (err) {
      console.error(
        "فشل تسجيل الحركات المالية عند تأكيد التسليم بالكود:",
        updated._id,
        err
      );
    }
  }

  // ✅ نرجع طلب populated ومتسق
  const populated = await getPopulatedShippingOrderById(company, updated._id);

  res.json({
    message: "تم تأكيد تسليم هذا المنتج بنجاح.",
    order: populated,
  });
});

// ────────────────────────────────────────────────
// 🟢 إحصائيات شركة الشحن
// ────────────────────────────────────────────────

export const getShippingStats = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  const company = await findCompanyForUser(userId);

  if (!company) {
    return res.json({ inShipping: 0, delivered: 0 });
  }

  const orders = await Order.find({
    shippingCompany: company._id,
    "orderItems.0": { $exists: true },
  }).lean();

  let inShipping = 0;
  let delivered = 0;

  orders.forEach((order) => {
    const itemsForCompany = getItemsForCompany(company, order);

    itemsForCompany.forEach((item) => {
      if (
        item.statusCode === ORDER_STATUS_CODES.IN_SHIPPING ||
        item.itemStatus === "قيد الشحن"
      ) {
        inShipping += 1;
      } else if (
        item.statusCode === ORDER_STATUS_CODES.DELIVERED ||
        item.itemStatus === "مكتمل"
      ) {
        delivered += 1;
      }
    });
  });

  res.json({ inShipping, delivered });
});
