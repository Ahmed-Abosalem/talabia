// backend/utils/financialTransactions.js
// دوال مساعدة لتسجيل الحركات المالية عند "تم التسليم"

import Order from "../models/Order.js";
import Transaction from "../models/Transaction.js";
import Category from "../models/Category.js";
import {
  ORDER_STATUS_CODES,
  isCancelled,
  isCompleted,
  isBillable,
} from "./orderStatus.js";

/**
 * 🧮 تطبيع نسبة العمولة:
 * - لو > 1 نعتبرها نسبة مئوية (10 = 10%)
 * - لو بين 0 و 1 نعتبرها كسر عشري (0.1 = 10%)
 */
function normalizeCommissionRate(rawRate) {
  if (typeof rawRate !== "number" || Number.isNaN(rawRate) || rawRate < 0) {
    return 0;
  }
  if (rawRate > 1) return rawRate / 100;
  return rawRate;
}

/**
 * 🔁 تطبيع طريقة الدفع إلى واحدة من:
 * - COD
 * - ONLINE (Card)
 * - BANK_TRANSFER
 * - WALLET
 * - OTHER
 */
function normalizePaymentMethod(pm, subPm) {
  if (!pm) return "COD";
  const v = String(pm).toUpperCase();
  if (v === "COD") return "COD";
  if (v === "WALLET") return "WALLET";

  // لو دفع إلكتروني، نشيك على النوع الفرعي (بطاقة أم حوالة)
  if (v === "ONLINE") {
    if (String(subPm).toUpperCase() === "BANK_TRANSFER") {
      return "BANK_TRANSFER";
    }
    return "ONLINE";
  }

  return "OTHER";
}

// ✅ استخراج ObjectId كنص من أي قيمة (ObjectId / string / populated object)
function toIdString(value) {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    if (value._id) return String(value._id);
    if (value.id) return String(value.id);
    if (value.toString) return String(value.toString());
  }
  try {
    return String(value);
  } catch {
    return null;
  }
}

// ✅ تحديد هل العنصر ملغى (لا يدخل بالحسبة)
// ✅ تحديد هل المنتج قابل للحسبة المالية (يجب ألا يكون ملغى)
function isCancelledItem(item) {
  return isCancelled(item);
}

// ✅ بناء مفتاح مصدر ثابت لمنع التكرار (Idempotency Key)
function buildSourceKey({ orderId, type, role, storeId, shippingCompanyId }) {
  const parts = [
    `order:${orderId}`,
    `type:${type}`,
    `role:${role}`,
  ];

  if (storeId) parts.push(`store:${storeId}`);
  if (shippingCompanyId) parts.push(`ship:${shippingCompanyId}`);

  return parts.join("|");
}

/**
 * 🧾 تسجيل الحركات المالية عند أول مرة يصبح فيها الطلب "DELIVERED"
 *
 * - تُستدعى من:
 *   - shippingController.confirmDeliveryWithCode
 *   - orderController.updateOrderStatus (عند التغيير إلى تم التسليم من قبل الأدمن)
 *
 * - تتحقق أولاً من عدم وجود حركات سابقة لنفس الطلب (حتى لا تتكرر).
 */
export async function registerFinancialTransactionsForDeliveredOrder(orderOrId) {
  const orderId = orderOrId?._id || orderOrId;

  if (!orderId) {
    console.warn(
      "[FINANCIAL] registerFinancialTransactionsForDeliveredOrder called بدون orderId صالح:",
      orderOrId
    );
    return;
  }

  const orderIdStr =
    typeof orderId === "string" ? orderId : String(orderId.toString());

  console.log("[FINANCIAL] ⏳ بدء تسجيل الحركات المالية للطلب:", orderIdStr);

  // ✅ حماية: لو فيه أي حركة مالية لهذا الطلب من الأنواع الأساسية، نعتبره مسجل مسبقًا
  // (يبقى الـ sourceKey + unique index هو الحماية النهائية ضد السباق)
  const existsAny = await Transaction.exists({
    order: orderId,
    type: {
      $in: [
        "ORDER_EARNING_SELLER",
        "ORDER_EARNING_SHIPPING",
        "ORDER_EARNING_PLATFORM",
      ],
    },
  });

  if (existsAny) {
    console.log(
      "[FINANCIAL] ✅ تم العثور على حركات مالية سابقة لهذا الطلب، لن نكرر التسجيل:",
      orderIdStr
    );
    return;
  }

  // نحمّل الطلب + بعض العلاقات المطلوبة
  const order = await Order.findById(orderId)
    .populate("buyer", "_id")
    .populate("store", "_id")
    .populate("shippingCompany", "_id")
    .populate({
      path: "orderItems.product",
      select: "category",
    })
    .populate({
      path: "orderItems.store",
      select: "_id",
    })
    .lean();

  if (!order) {
    console.warn(
      "[FINANCIAL] ⚠️ لم يتم العثور على الطلب أثناء محاولة التسجيل المالي:",
      orderIdStr
    );
    return;
  }

  const isDeliveredNow = isCompleted(order);

  console.log("[FINANCIAL] 🧾 حالة الطلب المحمَّل للتسجيل المالي:", {
    id: orderIdStr,
    status: order.status,
    statusCode: order.statusCode,
    totalPrice: order.totalPrice,
    shippingPrice: order.shippingPrice,
    isDeliveredNow,
  });

  if (!isDeliveredNow) {
    console.log(
      "[FINANCIAL] ⛔ الطلب ليس في حالة DELIVERED عند محاولة التسجيل المالي، سيتم تجاهله:",
      orderIdStr
    );
    return;
  }

  const totalPrice = order.totalPrice || 0;
  const shippingPrice = order.shippingPrice || 0;

  // ✅ عناصر الطلب (سنحسب فقط العناصر غير الملغاة)
  const itemsAll = Array.isArray(order.orderItems) ? order.orderItems : [];
  const items = itemsAll.filter((it) => it && !isCancelledItem(it));

  // 🧮 حساب إجمالي قيمة المنتجات من عناصر الطلب نفسها (سعر × كمية لكل منتج)
  let productsTotalFromItems = 0;

  // سنُجمِّع "معرّفات الأقسام" للعناصر غير الملغاة فقط
  const categoryIdsSet = new Set();

  for (const item of items) {
    const qty =
      typeof item.qty === "number"
        ? item.qty
        : typeof item.quantity === "number"
          ? item.quantity
          : 0;

    const price =
      typeof item.price === "number"
        ? item.price
        : typeof item.unitPrice === "number"
          ? item.unitPrice
          : 0;

    if (qty <= 0 || price < 0) continue;

    const lineTotal = price * qty;
    productsTotalFromItems += lineTotal;

    // استخراج معرّف القسم من المنتج أو من العنصر نفسه
    let categoryId = null;
    const prod = item.product;

    if (prod && typeof prod === "object" && prod.category) {
      const catVal = prod.category;
      if (catVal && typeof catVal === "object" && catVal._id) {
        categoryId = String(catVal._id);
      } else {
        categoryId = String(catVal);
      }
    }

    // احتياطي: لو كان عندنا item.category
    if (!categoryId && item.category) {
      const catVal = item.category;
      if (catVal && typeof catVal === "object" && catVal._id) {
        categoryId = String(catVal._id);
      } else {
        categoryId = String(catVal);
      }
    }

    if (categoryId) categoryIdsSet.add(categoryId);
  }

  // في حال تعذر حساب الإجمالي من العناصر (حالة قديمة)، نرجع للمنطق السابق
  let productsTotal = productsTotalFromItems;
  if (!productsTotal && totalPrice) {
    productsTotal = Math.max(0, totalPrice - shippingPrice);
  }

  console.log("[FINANCIAL] 🧮 ملخص المبالغ قبل حساب العمولة:", {
    orderId: orderIdStr,
    productsTotalFromItems,
    productsTotal,
    shippingPrice,
    itemsCountAll: itemsAll.length,
    itemsCountBillable: items.length,
  });

  // 💰 حساب عمولة المنصّة بناءً على عمولة كل قسم (Category.commissionRate)
  let platformCommission = 0;

  // ✅ تجميع أرباح البائع حسب المتجر (Multi-seller safe)
  const sellerEarningByStore = {}; // storeId -> amount

  // 🚚 مستحقات الشحن هي قيمة رسوم الشحن كما هي
  let shippingEarning = 0;

  try {
    let categoryRates = {};

    if (categoryIdsSet.size > 0 && productsTotal > 0) {
      const categoryIds = Array.from(categoryIdsSet);

      const categories = await Category.find({ _id: { $in: categoryIds } })
        .select("_id commissionRate")
        .lean();

      for (const cat of categories) {
        const key = String(cat._id);
        categoryRates[key] = normalizeCommissionRate(cat.commissionRate);
      }
    }

    // حلقة على العناصر غير الملغاة فقط لحساب العمولة وصافي البائع لكل متجر
    for (const item of items) {
      const qty =
        typeof item.qty === "number"
          ? item.qty
          : typeof item.quantity === "number"
            ? item.quantity
            : 0;

      const price =
        typeof item.price === "number"
          ? item.price
          : typeof item.unitPrice === "number"
            ? item.unitPrice
            : 0;

      if (qty <= 0 || price < 0) continue;

      const lineTotal = price * qty;
      if (lineTotal <= 0) continue;

      // ✅ storeId من العنصر أولاً، ثم fallback من order.store
      const storeId =
        toIdString(item.store) ||
        toIdString(item.store?._id) ||
        toIdString(order.store);

      if (!storeId) continue;

      // تحديد القسم
      let categoryId = null;
      const prod = item.product;

      if (prod && typeof prod === "object" && prod.category) {
        const catVal = prod.category;
        if (catVal && typeof catVal === "object" && catVal._id) {
          categoryId = String(catVal._id);
        } else {
          categoryId = String(catVal);
        }
      }

      if (!categoryId && item.category) {
        const catVal = item.category;
        if (catVal && typeof catVal === "object" && catVal._id) {
          categoryId = String(catVal._id);
        } else {
          categoryId = String(catVal);
        }
      }

      const rate =
        categoryId && categoryRates[categoryId] != null
          ? categoryRates[categoryId]
          : 0;

      if (rate > 0) {
        const commissionForLine = lineTotal * rate;
        platformCommission += commissionForLine;

        const sellerNet = lineTotal - commissionForLine;
        sellerEarningByStore[storeId] =
          (sellerEarningByStore[storeId] || 0) + sellerNet;
      } else {
        sellerEarningByStore[storeId] =
          (sellerEarningByStore[storeId] || 0) + lineTotal;
      }
    }

    shippingEarning = shippingPrice;

    // تقريب الأرقام إلى خانتين عشريتين
    platformCommission = Math.max(0, Math.round(platformCommission * 100) / 100);

    for (const [sid, val] of Object.entries(sellerEarningByStore)) {
      sellerEarningByStore[sid] = Math.max(0, Math.round(val * 100) / 100);
    }

    shippingEarning = Math.max(0, Math.round(shippingEarning * 100) / 100);
  } catch (err) {
    console.error("[FINANCIAL] ⚠️ خطأ أثناء حساب العمولة وتوزيع المبالغ:", err);

    // fallback: لا نقطع عمولة
    const fallbackStoreId = toIdString(order.store);
    if (fallbackStoreId) {
      sellerEarningByStore[fallbackStoreId] = Math.max(
        0,
        Math.round(productsTotal * 100) / 100
      );
    }
    shippingEarning = Math.max(0, Math.round(shippingPrice * 100) / 100);
    platformCommission = 0;
  }

  const paymentMethod = normalizePaymentMethod(order.paymentMethod, order.paymentSubMethod);

  // ✅ IDs صريحة
  const buyerId = toIdString(order.buyer);
  const shippingCompanyId = toIdString(order.shippingCompany);

  const baseData = {
    order: order._id,
    buyer: buyerId || undefined,
    shippingCompany: shippingCompanyId || undefined,
    paymentMethod,
    status: "PENDING", // مستحق لم يُسدَّد بعد
  };

  console.log("[FINANCIAL] 🧮 نتائج الحسبة المالية:", {
    orderId: orderIdStr,
    sellerEarningByStore,
    shippingEarning,
    platformCommission,
    hasBuyer: !!baseData.buyer,
    hasShippingCompany: !!baseData.shippingCompany,
    paymentMethod,
  });

  const txs = [];

  // 💸 مستحقات البائع — لكل متجر ظهر في عناصر الطلب
  for (const [storeId, amount] of Object.entries(sellerEarningByStore)) {
    if (!storeId) continue;
    if (typeof amount !== "number" || Number.isNaN(amount) || amount <= 0) continue;

    const sourceKey = buildSourceKey({
      orderId: orderIdStr,
      type: "ORDER_EARNING_SELLER",
      role: "SELLER",
      storeId,
    });

    txs.push(
      new Transaction({
        ...baseData,
        store: storeId,
        role: "SELLER",
        type: "ORDER_EARNING_SELLER",
        amount,
        direction: "DEBIT",
        note: "مستحقات البائع من الطلب بعد خصم عمولة المنصة (حسب الأقسام).",
        sourceKey,
      })
    );
  }

  // 🚚 مستحقات شركة الشحن
  if (shippingEarning > 0 && baseData.shippingCompany) {
    const sourceKey = buildSourceKey({
      orderId: orderIdStr,
      type: "ORDER_EARNING_SHIPPING",
      role: "SHIPPING",
      shippingCompanyId: String(baseData.shippingCompany),
    });

    txs.push(
      new Transaction({
        ...baseData,
        role: "SHIPPING",
        type: "ORDER_EARNING_SHIPPING",
        amount: shippingEarning,
        direction: "DEBIT",
        note: "رسوم الشحن المستحقة لشركة الشحن.",
        sourceKey,
      })
    );
  }

  // 🏛 عمولة المنصة
  if (platformCommission > 0) {
    const sourceKey = buildSourceKey({
      orderId: orderIdStr,
      type: "ORDER_EARNING_PLATFORM",
      role: "PLATFORM",
    });

    txs.push(
      new Transaction({
        ...baseData,
        role: "PLATFORM",
        type: "ORDER_EARNING_PLATFORM",
        amount: platformCommission,
        direction: "CREDIT",
        note: "عمولة المنصة من الطلب.",
        sourceKey,
      })
    );
  }

  if (!txs.length) {
    console.log(
      "[FINANCIAL] ⛔ لم يتم تكوين أي حركات مالية (كل المبالغ = 0 أو لا يوجد store/shipping مناسب) للطلب:",
      orderIdStr
    );
    return;
  }

  try {
    // ✅ ordered:false حتى لو حصل Duplicate key بسبب سباق، لا يوقف إدخال باقي العناصر
    await Transaction.insertMany(txs, { ordered: false });

    console.log("[FINANCIAL] ✅ تم إدخال الحركات المالية للطلب بنجاح:", orderIdStr, {
      count: txs.length,
      entries: txs.map((t) => ({
        role: t.role,
        type: t.type,
        store: t.store,
        amount: t.amount,
        sourceKey: t.sourceKey,
      })),
    });
  } catch (err) {
    // ✅ لو فشل بسبب Duplicate key فقط، نعتبره طبيعي (Idempotency)
    const isDup =
      err?.code === 11000 ||
      (Array.isArray(err?.writeErrors) &&
        err.writeErrors.every((e) => e?.code === 11000));

    if (isDup) {
      console.log(
        "[FINANCIAL] ℹ️ Duplicate key أثناء إدخال معاملات الطلب (متوقع مع السباق/التكرار). تم تجاهله:",
        orderIdStr
      );
      return;
    }

    console.error(
      "[FINANCIAL] ❌ فشل إدخال الحركات المالية في قاعدة البيانات للطلب:",
      orderIdStr,
      err
    );
    throw err;
  }
}
