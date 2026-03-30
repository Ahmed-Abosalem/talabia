// ────────────────────────────────────────────────
// 📁 backend/controllers/orderController.js
// التحكم في الطلبات في نظام طلبية (Talabia)
// بعد إصلاح مشكلة صور المنتجات داخل الطلبات + تطبيع الدفع
// + إضافة دعم الحالة الموحدة (statusCode)
// ────────────────────────────────────────────────

import asyncHandler from "express-async-handler";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Notification from "../models/Notification.js";
import ShippingCompany from "../models/ShippingCompany.js";
import SystemSettings from "../models/SystemSettings.js"; // ✅ NEW: System Settings
import {
  ORDER_STATUS_CODES,
  mapAdminStatusInputToCode,
  mapLegacyArabicStatusToCode,
  mapStatusCodeToLegacyArabic,
} from "../utils/orderStatus.js";
import { registerFinancialTransactionsForDeliveredOrder } from "../utils/financialTransactions.js";
import { returnStock } from "../utils/inventoryUtils.js";
import { processWalletPayment } from "./walletController.js";
import Wallet from "../models/Wallet.js";
import WalletTransaction, {
  WALLET_TX_TYPES,
  WALLET_TX_DIRECTIONS,
  WALLET_TX_STATUS,
} from "../models/WalletTransaction.js";
import { sanitizeText } from "../utils/sanitize.js";

// 🧮 توليد كود تسليم رقمي للمشتري (6 أرقام)
// يُستخدم الآن على مستوى كل عنصر داخل الطلب (orderItems[].deliveryCode)
// مع الإبقاء على كود على مستوى الطلب للتوافق مع المنطق السابق
function generateDeliveryCode() {
  const min = 100000; // أصغر رقم 6 أرقام
  const max = 999999; // أكبر رقم 6 أرقام
  return String(Math.floor(Math.random() * (max - min + 1)) + min);
}

// 🔍 اختيار شركة الشحن المناسبة للطلب بناءً على المتجر (store)
// - نفضّل شركة بنطاق seller-specific مرتبطة بهذا المتجر
// - إن لم نجد، نستخدم أقرب شركة عامة scope = 'global'
// - إن لم نجد شيئًا، نرجع null ويُترك الطلب بدون شركة شحن
async function findShippingCompanyForStore(storeId) {
  const baseFilter = { isActive: true };

  // 1) نبحث أولاً عن شركة بنطاق مخصص لمتاجر محددة وتشمل هذا المتجر
  if (storeId) {
    const sellerSpecific = await ShippingCompany.findOne({
      ...baseFilter,
      scope: "seller-specific",
      // ✅ الحقل الصحيح في نموذج شركة الشحن هو "stores" وليس "storeIds"
      stores: storeId,
    }).sort({ createdAt: -1 });

    if (sellerSpecific) {
      return sellerSpecific;
    }
  }

  // 2) لو لم نجد شركة مخصصة، نبحث عن شركة عامة (global) فعّالة
  const globalCompany = await ShippingCompany.findOne({
    ...baseFilter,
    scope: "global",
  }).sort({ createdAt: -1 });

  return globalCompany || null;
}

// ➕ إنشاء طلب جديد
export const createOrder = asyncHandler(async (req, res) => {
  const {
    orderItems,
    shippingAddress,
    totalPrice,
    paymentMethod,
    shippingPrice,

    // ✅ جديد: تمييز النوع داخل الدفع الإلكتروني + بيانات الحوالة
    paymentSubMethod,
    bankTransferSenderName,
    bankTransferReferenceNumber,

    // ✅ NEW: بيانات الدفع بالمحفظة
    walletNumber,
    walletPin,
  } = req.body;

  // التأكد من وجود عناصر
  if (!orderItems || !Array.isArray(orderItems) || orderItems.length === 0) {
    res.status(400);
    throw new Error("لا توجد عناصر في الطلب");
  }

  // التأكد من وجود بيانات الشحن الأساسية
  if (!shippingAddress) {
    res.status(400);
    throw new Error("بيانات الشحن مطلوبة");
  }

  const normalizedItems = [];
  let sellerId = null;
  let storeId = null;
  let computedTotal = 0;

  // 1️⃣ حماية المخزون: مصفوفة لتتبع ما تم خصمه لضمان التراجع (Rollback) في حال الفشل
  const deductedItems = [];

  try {
    // بناء عناصر الطلب من قاعدة البيانات مع الخصم الذري
    for (const rawItem of orderItems) {
      const productId = rawItem.product || rawItem.productId || rawItem.id;

      if (!productId) {
        throw new Error("معرّف المنتج غير موجود لأحد عناصر الطلب");
      }

      const qty = Number(rawItem.qty || rawItem.quantity || 1);

      // ✅ (حماية إنتاجية) الخصم الذري: نخصم فقط إذا كان المنتج نشطاً والمخزون كافياً
      const updatedProduct = await Product.findOneAndUpdate(
        {
          _id: productId,
          stock: { $gte: qty },
          isActive: true,
        },
        {
          $inc: { stock: -qty },
        },
        { new: true }
      );

      if (!updatedProduct) {
        // فشل الخصم: إما الكمية غير كافية أو المنتج غير نشط
        const pCheck = await Product.findById(productId).select("name stock isActive");
        let errorMsg = "أحد المنتجات غير متوفر حالياً";
        if (pCheck) {
          if (!pCheck.isActive) {
            errorMsg = `المنتج "${pCheck.name}" غير متاح للبيع حالياً (غير نشط).`;
          } else if (pCheck.stock < qty) {
            errorMsg = `الكمية المطلوبة من "${pCheck.name}" غير متوفرة (المتاح: ${pCheck.stock}).`;
          }
        }
        const error = new Error(errorMsg);
        error.statusCode = 400;
        throw error;
      }

      // تتبع الخصم للرجوع فيه إذا فشل الطلب لاحقاً
      deductedItems.push({ id: productId, qty: qty, product: updatedProduct });

      const product = updatedProduct;

      // 🔄 إدارة الحالة التلقائية (Auto-Deactivation)
      // نستخدم التحديث لضمان أن المنتج لن يظهر في المتجر إذا نفد
      if (product.stock <= 0) {
        await Product.updateOne(
          { _id: productId },
          {
            $set: {
              isActive: false,
              status: "inactive",
              autoDeactivated: true,
            },
          }
        );
      }

      // 🔔 إدارة إشعارات نقص المخزون (مرة واحدة فقط)
      if (
        product.stock <= product.lowStockThreshold &&
        !product.lowStockNotified
      ) {
        const notified = await Product.findOneAndUpdate(
          { _id: productId, lowStockNotified: false },
          { $set: { lowStockNotified: true } }
        );

        if (notified) {
          try {
            await Notification.create({
              user: product.seller,
              title: "تنبيه: مخزون منخفض",
              message: `المنتج "${product.name}" وصل إلى حد التنبيه (${product.stock} قطعة متبقية).`,
              type: "system",
              link: "/seller/products",
            });
          } catch (err) {
            console.error("فشل إرسال إشعار المخزون المنخفض:", err);
          }
        }
      }

      const price = product.price || 0;

      const itemTotal = price * qty;
      computedTotal += itemTotal;

      if (!sellerId && product.seller) {
        sellerId = product.seller;
      }
      if (!storeId && product.store) {
        storeId = product.store;
      }

      let mainImage = null;

      if (typeof rawItem.image === "string" && rawItem.image.trim()) {
        mainImage = rawItem.image.trim();
      } else if (
        typeof rawItem.imageUrl === "string" &&
        rawItem.imageUrl.trim()
      ) {
        mainImage = rawItem.imageUrl.trim();
      } else {
        const candidateFields = [
          product.image,
          product.mainImage,
          product.mainImageUrl,
          product.imageUrl,
          product.thumbnail,
        ];

        for (const candidate of candidateFields) {
          if (typeof candidate === "string" && candidate.trim()) {
            mainImage = candidate.trim();
            break;
          }
        }

        if (!mainImage && Array.isArray(product.images) && product.images.length) {
          const firstImage = product.images[0];

          if (typeof firstImage === "string" && firstImage.trim()) {
            mainImage = firstImage.trim();
          } else if (
            firstImage &&
            typeof firstImage === "object" &&
            typeof firstImage.url === "string" &&
            firstImage.url.trim()
          ) {
            mainImage = firstImage.url.trim();
          }
        }
      }

      const selectedColorLabel =
        (typeof rawItem.selectedColor === "string" ? rawItem.selectedColor : "") ||
        rawItem.selectedColorLabel ||
        (rawItem.selectedColor &&
          typeof rawItem.selectedColor === "object" &&
          (rawItem.selectedColor.label || rawItem.selectedColor.name)) ||
        rawItem.color ||
        rawItem.colorLabel ||
        "";

      const selectedColorKey =
        rawItem.selectedColorKey ||
        (rawItem.selectedColor &&
          typeof rawItem.selectedColor === "object" &&
          rawItem.selectedColor.key) ||
        rawItem.colorKey ||
        "";

      const selectedColorHex =
        rawItem.selectedColorHex ||
        (rawItem.selectedColor &&
          typeof rawItem.selectedColor === "object" &&
          rawItem.selectedColor.hex) ||
        rawItem.colorHex ||
        "";

      const selectedSizeLabel =
        (typeof rawItem.selectedSize === "string" ? rawItem.selectedSize : "") ||
        rawItem.selectedSizeLabel ||
        (rawItem.selectedSize &&
          typeof rawItem.selectedSize === "object" &&
          (rawItem.selectedSize.label || rawItem.selectedSize.name)) ||
        rawItem.size ||
        rawItem.sizeLabel ||
        "";

      const selectedSizeKey =
        rawItem.selectedSizeKey ||
        (rawItem.selectedSize &&
          typeof rawItem.selectedSize === "object" &&
          rawItem.selectedSize.key) ||
        rawItem.sizeKey ||
        "";

      normalizedItems.push({
        product: product._id,
        name: product.name,
        qty,
        price,
        image: mainImage || undefined,
        ...(selectedColorLabel
          ? { selectedColor: String(selectedColorLabel).trim() }
          : {}),
        ...(selectedColorKey
          ? { selectedColorKey: String(selectedColorKey).trim() }
          : {}),
        ...(selectedColorHex
          ? { selectedColorHex: String(selectedColorHex).trim() }
          : {}),
        ...(selectedSizeLabel
          ? { selectedSize: String(selectedSizeLabel).trim() }
          : {}),
        ...(selectedSizeKey
          ? { selectedSizeKey: String(selectedSizeKey).trim() }
          : {}),
        seller: product.seller || undefined,
        store: product.store || undefined,
        itemStatus: "جديد",
        statusCode: ORDER_STATUS_CODES.AT_SELLER_NEW,
        deliveryCode: generateDeliveryCode(),
      });
    }
  } catch (error) {
    console.error("فشل تأكيد المخزون لبعض العناصر، جاري التراجع...", error.message);
    for (const item of deductedItems) {
      try {
        await Product.updateOne({ _id: item.id }, { $inc: { stock: item.qty } });
      } catch (rollbackError) {
        console.error("خطأ حرج: فشل التراجع عن خصم المخزون:", item.id);
      }
    }
    res.status(error.statusCode || 500);
    throw error;
  }

  // 🛡️ SECURITY CHECK: Minimum Order Value Validation
  try {
    const minOrderSetting = await SystemSettings.findOne({ key: "minOrderLimit" }).lean();
    if (minOrderSetting?.value?.active) {
      const limitValue = typeof minOrderSetting.value.value === "number" ? minOrderSetting.value.value : 0;
      if (computedTotal < limitValue) {
        // إذا كان المجموع الكلي (قبل الشحن) أقل من الحد الأدنى
        // نضطر للتراجع عن خصم المخزون قبل إصدار الخطأ
        for (const item of deductedItems) {
          try {
            await Product.updateOne({ _id: item.id }, { $inc: { stock: item.qty } });
          } catch (rollbackError) { }
        }
        res.status(400);
        throw new Error(`الحد الأدنى للطلب هو ${limitValue} ر.ي. إجمالي منتجاتك الحالي هو ${computedTotal} ر.ي.`);
      }
    }
  } catch (err) {
    if (err.statusCode === 400) throw err; // rethrow the specific minimum order error
    console.error("فشل التحقق من إعدادات الحد الأدنى للطلب", err);
  }

  // تطبيع عنوان الشحن
  const normalizedShipping = {
    fullName:
      shippingAddress.fullName ||
      shippingAddress.name ||
      shippingAddress.recipientName ||
      "",

    phone:
      shippingAddress.phone ||
      shippingAddress.mobile ||
      shippingAddress.phoneNumber ||
      "",

    country:
      shippingAddress.country ||
      shippingAddress.countryName ||
      shippingAddress.state ||
      "",

    city: shippingAddress.city || "",
    district: shippingAddress.district || shippingAddress.area || "",
    neighborhood: shippingAddress.neighborhood || "",
    street: shippingAddress.street || shippingAddress.addressLine || "",
    details:
      shippingAddress.details ||
      shippingAddress.addressLine ||
      shippingAddress.addressLine1 ||
      "",

    notes: shippingAddress.notes || shippingAddress.comment || "",
  };

  // إزالة الحقول الفارغة جدًا حتى لا نخزن ضجيج
  Object.keys(normalizedShipping).forEach((key) => {
    const value = normalizedShipping[key];
    if (value === undefined || value === null || value === "") {
      delete normalizedShipping[key];
    }
  });

  // ✅ تطبيع طريقة الدفع لتتوافق مع enum في Order.js (COD / Online / Wallet)
  let normalizedPaymentMethod = "COD";
  if (paymentMethod) {
    const val = String(paymentMethod).toLowerCase();

    if (val === "cod" || val === "الدفع عند الاستلام") {
      normalizedPaymentMethod = "COD";
    } else if (
      val === "online" ||
      val === "اونلاين" ||
      val === "الدفع الالكتروني" ||
      val === "الدفع الإلكتروني"
    ) {
      normalizedPaymentMethod = "Online";
    } else if (
      val === "wallet" ||
      val === "محفظة" ||
      val === "المحفظة" ||
      val === "الدفع بالمحفظة"
    ) {
      normalizedPaymentMethod = "Wallet";
    }
  }


  // ✅ تطبيع نوع الدفع داخل Online
  let normalizedPaymentSubMethod = undefined;

  if (normalizedPaymentMethod === "Online" && paymentSubMethod) {
    const sub = String(paymentSubMethod).toUpperCase().trim();
    if (sub === "CARD" || sub === "BANK_TRANSFER") {
      normalizedPaymentSubMethod = sub;
    }
  }

  // ✅ تطبيع بيانات الحوالة (نخزنها فقط إذا كانت حوالة)
  const normalizedBankSender =
    normalizedPaymentSubMethod === "BANK_TRANSFER"
      ? String(bankTransferSenderName || "").trim()
      : "";

  const normalizedBankRef =
    normalizedPaymentSubMethod === "BANK_TRANSFER"
      ? String(bankTransferReferenceNumber || "").trim()
      : "";

  // 🔒 رفض الحوالات البنكية بدون بيانات إلزامية (يمنع bypass عبر Postman)
  if (normalizedPaymentSubMethod === "BANK_TRANSFER") {
    if (!normalizedBankSender) {
      res.status(400);
      throw new Error("اسم المرسل مطلوب عند اختيار الحوالة البنكية.");
    }
    if (!normalizedBankRef) {
      res.status(400);
      throw new Error("رقم مرجع الحوالة مطلوب عند اختيار الحوالة البنكية.");
    }
  }

  // 💸 حساب سعر الشحن النهائي (إن وُجد) + الإجمالي الكلي
  let shippingPriceFinal = 0;

  if (typeof shippingPrice === "number" && shippingPrice >= 0) {
    // إذا أرسله الفرونت صراحة في body
    shippingPriceFinal = shippingPrice;
  } else if (
    shippingAddress &&
    typeof shippingAddress.shippingPrice === "number" &&
    shippingAddress.shippingPrice >= 0
  ) {
    // لو مخزَّن داخل كائن العنوان
    shippingPriceFinal = shippingAddress.shippingPrice;
  } else if (typeof totalPrice === "number" && totalPrice >= computedTotal) {
    // توافق مع النسخ القديمة:
    // نستنتج الشحن من الفرق بين الإجمالي القادم من الواجهة
    // ومجموع أسعار المنتجات
    shippingPriceFinal = totalPrice - computedTotal;
  }

  const grandTotal = computedTotal + shippingPriceFinal;

  // 🔹 اختيار شركة الشحن المناسبة لهذا الطلب (إن وُجدت قواعد لها)
  let shippingCompanyId = null;
  try {
    const shippingCompany = await findShippingCompanyForStore(storeId);
    if (shippingCompany && shippingCompany._id) {
      shippingCompanyId = shippingCompany._id;
    }
  } catch (err) {
    // في حال حدوث خطأ في اختيار شركة الشحن لا نمنع إنشاء الطلب،
    // فقط نترك الحقل فارغًا ليُظهر في الواجهات "لم تُعيَّن شركة شحن بعد"
  }

  const order = new Order({
    buyer: req.user.id,
    seller: sellerId,
    store: storeId,
    shippingCompany: shippingCompanyId,
    orderItems: normalizedItems,
    shippingAddress: normalizedShipping,

    // نخزن الإجمالي الحقيقي + سعر الشحن منفصلًا
    totalPrice: grandTotal,
    shippingPrice: shippingPriceFinal,

    // هنا نستخدم القيمة المنطبقة على الـ enum في Order.js
    paymentMethod: normalizedPaymentMethod,



    // ✅ تفصيل الدفع الإلكتروني + بيانات الحوالة
    paymentSubMethod: normalizedPaymentSubMethod,

    ...(normalizedPaymentSubMethod === "BANK_TRANSFER"
      ? {
        bankTransferSenderName: normalizedBankSender || undefined,
        bankTransferReferenceNumber: normalizedBankRef || undefined,
      }
      : {}),
    // 📌 حالة الطلب العامة (Arabic enum في Order.js)
    // enum: ["جديد", "قيد المعالجة", "قيد الشحن", "مكتمل", "ملغى"]
    status: "جديد",

    // 🔵 حالة الطلب العامة (legacy)
    // ستبقى للاستخدامات القديمة، لكن المنطق الجديد يعمل على مستوى العناصر
    sellerStatus: "new",
    shippingStatus: "pending_pickup",

    // 🧭 الحالة الموحدة على مستوى النظام
    statusCode: ORDER_STATUS_CODES.AT_SELLER_NEW,

    // كود تسليم على مستوى الطلب لأغراض التوافق مع الواجهة القديمة
    deliveryCode: generateDeliveryCode(),
  });

  const created = await order.save();

  // ────────────────────────────────────────────────
  // 💳 الدفع بالمحفظة (إن كانت طريقة الدفع = Wallet)
  // ────────────────────────────────────────────────
  if (normalizedPaymentMethod === "Wallet") {
    try {
      const walletResult = await processWalletPayment(
        walletNumber,
        walletPin,
        grandTotal,
        created._id,
        req.user.id,
        req.ip
      );

      // تحديث حالة الدفع
      created.isPaid = true;
      created.paidAt = new Date();
      await created.save();
    } catch (walletError) {
      // فشل الدفع بالمحفظة — إلغاء الطلب وإرجاع المخزون
      try {
        await Order.deleteOne({ _id: created._id });
        for (const item of normalizedItems) {
          await Product.updateOne(
            { _id: item.product },
            { $inc: { stock: item.qty } }
          );
        }
      } catch (rollbackErr) {
        console.error("خطأ حرج: فشل التراجع عن الطلب بعد فشل الدفع بالمحفظة:", rollbackErr);
      }

      res.status(walletError.statusCode || 400);
      throw new Error(walletError.message || "فشل الدفع بالمحفظة");
    }
  }

  // ────────────────────────────────────────────────
  // 🔔 إرسال إشعار تلقائي للبائع(ـين) عند وصول طلب جديد
  // ────────────────────────────────────────────────
  try {
    const uniqueSellerIds = [
      ...new Set(
        created.orderItems
          .map((item) => (item.seller ? item.seller.toString() : null))
          .filter((id) => id !== null)
      ),
    ];

    const notificationPromises = uniqueSellerIds.map((sellerId) =>
      Notification.create({
        user: sellerId,
        title: "طلب جديد",
        message: "لديك طلب جديد، يرجى تحضيره للشحن في أقرب فرصة.",
        type: "order",
        link: "/seller/orders",
      })
    );

    await Promise.all(notificationPromises);
  } catch (notificationError) {
    console.error("فشل إرسال الإشعار التلقائي للبائعين:", notificationError);
  }

  res.status(201).json(created);
});

// 📋 جلب طلبات المشتري الحالي (المشتري فقط)
export const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ buyer: req.user.id }).populate({
    path: "orderItems.product",
    // نضيف حقول الصور المحتملة كلها للاحتياط
    select:
      "name price image images store mainImage mainImageUrl imageUrl thumbnail",
    populate: { path: "store", select: "name" },
  });

  res.json(orders);
});

// 📋 جلب قائمة الطلبات وفقًا لدور المستخدم
export const getOrders = asyncHandler(async (req, res) => {
  const role = req.user?.role;
  const userId = req.user?.id;

  let filter = {};

  if (role === "seller") {
    filter = { "orderItems.seller": userId };
  } else if (role === "buyer") {
    filter = { buyer: userId };
  } else if (role === "admin") {
    filter = {};
  } else {
    res.status(403);
    throw new Error("غير مصرح بالوصول إلى الطلبات");
  }

  const orders = await Order.find(filter)
    .populate("buyer", "name email")
    .populate("seller", "name")
    .populate("shippingCompany", "name")
    .populate("store", "name")
    .populate({
      path: "orderItems.product",
      select:
        "name price image images store mainImage mainImageUrl imageUrl thumbnail",
      populate: { path: "store", select: "name" },
    })
    .sort({ createdAt: -1 })
    .lean();

  // إخفاء أكواد التسليم عن البائع
  if (role === "seller") {
    const userIdStr = String(userId);

    const filteredOrders = orders
      .map((order) => {
        const items = (order.orderItems || []).filter((item) => {
          if (!item) return false;

          const sellerVal =
            item.seller && item.seller._id ? item.seller._id : item.seller;

          return sellerVal && String(sellerVal) === userIdStr;
        });

        const { deliveryCode, ...restOrder } = order;

        const sanitizedItems = items.map((item) => {
          const { deliveryCode: itemDeliveryCode, ...restItem } = item;
          return restItem;
        });

        return {
          ...restOrder,
          orderItems: sanitizedItems,
        };
      })
      .filter(
        (order) =>
          Array.isArray(order.orderItems) && order.orderItems.length > 0
      );

    return res.json(filteredOrders);
  }

  res.json(orders);
});

// 🧾 جلب تفاصيل طلب (مع تحقق ملكية صارم + منع تسريب عناصر بائعين آخرين)
export const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate("buyer", "name email")
    .populate("seller", "name")
    .populate("shippingCompany", "name") // يحتوي _id أيضًا
    .populate({
      path: "orderItems.product",
      select:
        "name price image images store mainImage mainImageUrl imageUrl thumbnail",
      populate: { path: "store", select: "name" },
    });

  if (!order) {
    res.status(404);
    throw new Error("الطلب غير موجود");
  }

  const role = req.user?.role;
  const userId = req.user?.id || req.user?._id;

  // ✅ تحقق صلاحيات الوصول (إغلاق IDOR)
  if (role === "buyer") {
    if (String(order.buyer?._id || order.buyer) !== String(userId)) {
      res.status(403);
      throw new Error("غير مصرح لك بالوصول إلى هذا الطلب");
    }
  } else if (role === "seller") {
    const hasAnyItemForSeller = (order.orderItems || []).some((item) => {
      const sellerVal = item?.seller?._id || item?.seller;
      return sellerVal && String(sellerVal) === String(userId);
    });

    if (!hasAnyItemForSeller) {
      res.status(403);
      throw new Error("غير مصرح لك بالوصول إلى هذا الطلب");
    }
  } else if (role === "shipper") {
    // نحاول استخراج companyId من المستخدم (حسب سكيمتك)
    let shipperCompanyId =
      req.user?.shippingCompany ||
      req.user?.shippingCompanyId ||
      req.user?.companyId ||
      req.user?.company ||
      null;

    // إذا لم يكن موجودًا على المستخدم، نحاول استنتاجه من DB (مرن حسب أسماء الحقول الشائعة)
    if (!shipperCompanyId) {
      const company = await ShippingCompany.findOne({
        $or: [
          { user: userId },
          { owner: userId },
          { createdBy: userId },
          { account: userId },
        ],
      }).select("_id");

      if (company?._id) {
        shipperCompanyId = company._id;
      }
    }

    const orderCompany =
      order.shippingCompany?._id?.toString?.() ||
      order.shippingCompany?.toString?.() ||
      "";

    if (!shipperCompanyId) {
      res.status(403);
      throw new Error("لا يمكن تحديد شركة الشحن لهذا الحساب");
    }

    if (!orderCompany || String(orderCompany) !== String(shipperCompanyId)) {
      res.status(403);
      throw new Error("غير مصرح لك بالوصول إلى طلب غير تابع لشركتك");
    }
  } else if (role !== "admin") {
    res.status(403);
    throw new Error("غير مصرح بالوصول إلى الطلبات");
  }

  // ✅ الآن نطبّق “منع تسريب البيانات” حسب الدور
  const plain = order.toObject();

  // إخفاء أكواد التسليم عن البائع والشاحن
  if (role === "seller" || role === "shipper") {
    delete plain.deliveryCode;

    if (Array.isArray(plain.orderItems)) {
      plain.orderItems = plain.orderItems.map((item) => {
        if (!item) return item;
        const { deliveryCode, ...restItem } = item;
        return restItem;
      });
    }
  }

  // ✅ البائع لا يرى عناصر بائعين آخرين
  if (role === "seller" && Array.isArray(plain.orderItems)) {
    plain.orderItems = plain.orderItems.filter((item) => {
      const sellerVal = item?.seller?._id || item?.seller;
      return sellerVal && String(sellerVal) === String(userId);
    });
  }

  return res.json(plain);
});

// 🔄 تحديث حالة الطلب (legacy) + ربط الإدارة المالية
export const updateOrderStatus = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error("الطلب غير موجود");
  }

  const { status, statusCode } = req.body || {};

  if (!status && !statusCode) {
    res.status(400);
    throw new Error("حقل الحالة (status) أو (statusCode) مطلوب");
  }

  const previousStatus = order.status;
  const previousStatusCode = order.statusCode;

  let nextStatusCode = null;

  if (
    statusCode &&
    Object.values(ORDER_STATUS_CODES).includes(String(statusCode).trim())
  ) {
    nextStatusCode = String(statusCode).trim();
  } else if (status) {
    const s = String(status).trim();
    nextStatusCode =
      mapAdminStatusInputToCode(s) ||
      (Object.values(ORDER_STATUS_CODES).includes(s) ? s : null) ||
      mapLegacyArabicStatusToCode(s);
  }

  if (nextStatusCode) {
    order.statusCode = nextStatusCode;

    const legacy = mapStatusCodeToLegacyArabic(nextStatusCode);
    if (legacy) {
      order.status = legacy;
    }
  } else if (status) {
    order.status = status;
  }

  const isDeliveredNow =
    order.status === "مكتمل" ||
    order.status === "completed" ||
    order.statusCode === ORDER_STATUS_CODES.DELIVERED;

  const wasDeliveredBefore =
    previousStatus === "مكتمل" ||
    previousStatus === "completed" ||
    previousStatusCode === ORDER_STATUS_CODES.DELIVERED;

  if (isDeliveredNow && !wasDeliveredBefore) {
    order.deliveredAt = Date.now();
  }

  const updated = await order.save();

  // ✅ إعادة المخزون إذا تحول الطلب إلى "ملغى" ولم يكن ملغى سابقاً
  const isCancelledNow =
    updated.status === "ملغى" ||
    updated.statusCode === ORDER_STATUS_CODES.CANCELLED_BY_ADMIN ||
    updated.statusCode === ORDER_STATUS_CODES.CANCELLED_BY_SELLER ||
    updated.statusCode === ORDER_STATUS_CODES.CANCELLED_BY_BUYER;

  const wasCancelledBefore =
    previousStatus === "ملغى" ||
    previousStatusCode === ORDER_STATUS_CODES.CANCELLED_BY_ADMIN ||
    previousStatusCode === ORDER_STATUS_CODES.CANCELLED_BY_SELLER ||
    previousStatusCode === ORDER_STATUS_CODES.CANCELLED_BY_BUYER;

  if (isCancelledNow && !wasCancelledBefore) {
    if (Array.isArray(updated.orderItems)) {
      await returnStock(updated.orderItems);
    }
  }

  if (isDeliveredNow && !wasDeliveredBefore) {
    try {
      await registerFinancialTransactionsForDeliveredOrder(updated._id);

      // ✅ زيادة عداد المبيعات للمنتجات في هذا الطلب
      const updateScores = updated.orderItems.map(item => ({
        updateOne: {
          filter: { _id: item.product },
          update: { $inc: { salesCount: item.qty } }
        }
      }));

      if (updateScores.length > 0) {
        await Product.bulkWrite(updateScores);
      }
    } catch (err) {
      console.error(
        "فشل تسجيل الحركات المالية أو تحديث المبيعات عند تحديث حالة الطلب من الأدمن:",
        updated._id,
        err
      );
    }
  }

  res.json(updated);
});

// ────────────────────────────────────────────────
// 💰 استرداد مبلغ الطلب للمحفظة (يدوي من قبل الأدمن)
// POST /api/admin/orders/:id/refund
// ────────────────────────────────────────────────
export const refundOrderWallet = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error("الطلب غير موجود");
  }

  // 1. التحقق من حالة الطلب (يجب أن يكون ملغياً)
  if (order.statusCode !== ORDER_STATUS_CODES.CANCELLED) {
    res.status(400);
    throw new Error("لا يمكن استرداد مبلغ طلب غير ملغى. يرجى إلغاء الطلب أولاً.");
  }

  // 2. التحقق من طريقة الدفع (يجب أن تكون WALLET أو تم دفعها فعلياً)
  if (order.paymentMethod !== "WALLET") {
    res.status(400);
    throw new Error("هذا الطلب لم يتم دفعه عن طريق المحفظة الإلكترونية.");
  }

  // 3. التحقق من عدم وجود استرداد سابق لتفادي التكرار
  if (order.isRefunded) {
    res.status(400);
    throw new Error("هذا الطلب تم استرداده مسبقاً.");
  }

  // 4. البحث عن محفظة المشتري
  const wallet = await Wallet.findOne({ buyer: order.buyer });
  if (!wallet) {
    res.status(404);
    throw new Error("لم يتم العثور على محفظة مرتبطة بهذا المشتري.");
  }

  const refundAmount = order.totalPrice;

  // 5. تحديث رصيد المحفظة بشكل ذري
  const updatedWallet = await Wallet.findOneAndUpdate(
    { _id: wallet._id },
    { $inc: { balance: refundAmount } },
    { new: true }
  );

  if (!updatedWallet) {
    res.status(500);
    throw new Error("فشل تحديث رصيد المحفظة.");
  }

  // 6. تسجيل العملية المالية في سجل المحفظة
  await WalletTransaction.create({
    wallet: wallet._id,
    type: WALLET_TX_TYPES.REFUND,
    direction: WALLET_TX_DIRECTIONS.CREDIT,
    amount: refundAmount,
    balanceBefore: wallet.balance,
    balanceAfter: updatedWallet.balance,
    status: WALLET_TX_STATUS.COMPLETED,
    reference: WalletTransaction.generateReference(),
    note: `استرداد مبلغ الطلب رقم ${order.orderNumber} (يدوي بواسطة الإدارة)`,
    orderId: order._id,
    processedBy: req.user?._id,
    processedAt: new Date(),
  });

  // 7. تحديث حالة الطلب ليعكس أنه استُرد
  order.isRefunded = true;
  order.refundedAt = new Date();
  order.refundedBy = req.user?._id;
  await order.save();

  // 8. إشعار المشتري
  try {
    await Notification.create({
      user: order.buyer,
      title: "تم استرداد مبلغ الطلب 💰",
      message: `تمت إعادة مبلغ ${refundAmount} ريال إلى محفظتك مقابل الطلب الملغى رقم (${order.orderNumber}). رصيدك الآن: ${updatedWallet.balance} ريال.`,
      type: "wallet",
      link: "/buyer/wallet",
    });
  } catch (err) {
    console.error("فشل إرسال إشعار الاسترداد:", err);
  }

  res.json({
    message: "تم استرداد المبلغ للمحفظة بنجاح",
    refundAmount,
    newBalance: updatedWallet.balance,
  });
});
