// ────────────────────────────────────────────────
// 📁 backend/controllers/sellerController.js
// منطق لوحة تحكم البائع (Seller Dashboard) في نظام طلبية (Talabia)
// يشمل:
// - ملخص الداشبورد
// - إعدادات المتجر
// - قائمة منتجات البائع فقط
// - تحديث حالة الطلب من زاوية البائع (sellerStatus)
// - 🔹 تحديث حالة منتج واحد داخل الطلب من جهة البائع (Item-based)
// ────────────────────────────────────────────────

import asyncHandler from "express-async-handler";
import Store from "../models/Store.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";
import Category from "../models/Category.js";
import {
  ORDER_STATUS_CODES,
  mapSellerStatusKeyToCode,
  mapStatusCodeToLegacyArabic,
} from "../utils/orderStatus.js";

// ────────────────────────────────────────────────
// ✅ Helpers: sellerId + populate response consistent
// ────────────────────────────────────────────────

// 🧩 دالة مساعدة لاستخراج معرف البائع من الطلب
function getSellerIdFromReq(req) {
  const raw = req.user?._id || req.user?.id;
  return raw ? raw.toString() : null;
}

// ✅ هل الطلب كله لبائع واحد؟ (مهم لمتجر متعدد البائعين)
function isSingleSellerOrder(order, sellerIdStr) {
  if (!order || !Array.isArray(order.orderItems) || !order.orderItems.length) return false;

  return order.orderItems.every((item) => {
    if (!item) return false;
    const rawSeller = item.seller && item.seller._id ? item.seller._id : item.seller;
    return rawSeller && String(rawSeller) === sellerIdStr;
  });
}

// ✅ إعادة جلب الطلب بعد التحديث بشكل populated ومتسق + فلترة عناصر هذا البائع فقط
async function getPopulatedSellerOrderById(sellerIdStr, orderId) {
  const order = await Order.findOne({
    _id: orderId,
    "orderItems.seller": sellerIdStr,
    "orderItems.0": { $exists: true },
  })
    .populate("buyer", "name email phone")
    .populate("shippingCompany", "name")
    .populate({
      path: "orderItems.product",
      select: "name images description",
    })
    .populate({
      path: "orderItems.store",
      select: "name phone email address",
    })
    .sort({ createdAt: -1 })
    .lean();

  if (!order) return null;

  // فلترة عناصر الطلب لتكون فقط لعناصر هذا البائع
  const filteredItems = Array.isArray(order.orderItems)
    ? order.orderItems
        .filter((item) => {
          if (!item) return false;

          const rawSeller =
            item.seller && item.seller._id ? item.seller._id : item.seller;

          if (!rawSeller || String(rawSeller) !== sellerIdStr) return false;

          // اختياري: لا نعرض العناصر الملغاة ضمن قائمة البائع (يمكن تعديلها إذا رغبت)
          // لكن لا نحذفها من قاعدة البيانات، مجرد فلترة للعرض.
          return true;
        })
        .map((item) => {
          // لا نرسل deliveryCode للبائع (لو كان موجودًا)
          const { deliveryCode, ...rest } = item || {};
          return rest;
        })
    : [];

  return { ...order, orderItems: filteredItems };
}

// ────────────────────────────────────────────────
// 🧼 تطبيع رقم الهاتف (بشكل محافظ جدًا)
// - لا نفرض فورمات عالمي
// - فقط trim وإزالة المسافات المتكررة
// ────────────────────────────────────────────────

function normalizePhone(phone) {
  if (typeof phone !== "string") return null;
  const t = phone.trim();
  if (!t) return null;
  return t.replace(/\s+/g, " ");
}

// ────────────────────────────────────────────────
// 🧼 تطبيع العنوان (بنفس هيكلة Store schema)
// يدعم:
// - object: {country, city, area, street, details}
// - string: يحفظها في details بشكل محافظ (بدون كسر بيانات قديمة)
// ────────────────────────────────────────────────

function normalizeAddress(address, existingAddress) {
  if (address == null) return null;

  // في حال وصلنا نصًا، نحفظه داخل details مع الحفاظ على بقية الحقول إن وجدت
  if (typeof address === "string") {
    const t = address.trim();
    if (!t) return null;
    const base =
      existingAddress && typeof existingAddress === "object"
        ? { ...existingAddress }
        : {};
    return { ...base, details: t };
  }

  // في حال وصلنا كائن عنوان
  if (typeof address === "object") {
    const fields = ["country", "city", "area", "street", "details"];
    const out = {};

    for (const f of fields) {
      if (typeof address[f] === "string") {
        const t = address[f].trim();
        // محافظ جدًا: لا نستبدل بقيمة فارغة حتى لا نمسح العنوان خطأً
        if (t) out[f] = t;
      }
    }

    // إذا لم يأتِ أي حقل صالح، لا نغيّر العنوان
    if (Object.keys(out).length === 0) return null;

    // دمج جزئي مع العنوان الحالي حتى لا نفقد حقولًا لم تُرسل
    const base =
      existingAddress && typeof existingAddress === "object"
        ? { ...existingAddress }
        : {};

    return { ...base, ...out };
  }

  return null;
}

// ────────────────────────────────────────────────
// 🧮 دالة مساعدة لحساب إحصاءات الطلبات للبائع
// ✅ Item-based
// ────────────────────────────────────────────────

async function computeSellerOrderStats(sellerId, dateFilter = {}) {
  const match = {
    "orderItems.seller": sellerId,
  };

  if (dateFilter.from || dateFilter.to) {
    match.createdAt = {};
    if (dateFilter.from) match.createdAt.$gte = dateFilter.from;
    if (dateFilter.to) match.createdAt.$lte = dateFilter.to;
  }

  const orders = await Order.find(match).select("orderItems createdAt status");

  if (!orders || orders.length === 0) {
    return {
      totalOrders: 0,
      pendingItems: 0,
      completedItems: 0,
      totalRevenue: 0,
    };
  }

  const sellerIdStr = String(sellerId);
  const productIdsSet = new Set();

  for (const order of orders) {
    const items = order.orderItems || [];

    for (const item of items) {
      if (!item) continue;

      const rawSeller =
        item.seller && item.seller._id ? item.seller._id : item.seller;

      if (!rawSeller || String(rawSeller) !== sellerIdStr) continue;

      if (item.product) productIdsSet.add(String(item.product));
    }
  }

  const productToCategory = new Map();
  const categoryToCommission = new Map();

  if (productIdsSet.size > 0) {
    const productIds = Array.from(productIdsSet);

    const products = await Product.find({ _id: { $in: productIds } }).select(
      "_id category"
    );

    const categoryIdsSet = new Set();

    for (const p of products) {
      if (!p) continue;
      const pid = String(p._id);
      const cid = p.category ? String(p.category) : null;
      if (cid) {
        productToCategory.set(pid, cid);
        categoryIdsSet.add(cid);
      }
    }

    if (categoryIdsSet.size > 0) {
      const categoryIds = Array.from(categoryIdsSet);
      const categories = await Category.find({
        _id: { $in: categoryIds },
      }).select("_id commissionRate");

      for (const cat of categories) {
        if (!cat) continue;
        const cid = String(cat._id);
        let rate =
          typeof cat.commissionRate === "number" ? cat.commissionRate : 0;
        if (rate < 0) rate = 0;
        if (rate > 1) rate = 1;
        categoryToCommission.set(cid, rate);
      }
    }
  }

  let totalItems = 0;
  let pendingItems = 0;
  let completedItems = 0;
  let totalRevenue = 0;

  for (const order of orders) {
    const items = order.orderItems || [];

    for (const item of items) {
      if (!item) continue;

      const rawSeller =
        item.seller && item.seller._id ? item.seller._id : item.seller;

      if (!rawSeller || String(rawSeller) !== sellerIdStr) continue;

      const status = item.itemStatus || order.status;

      if (status === "ملغى") continue;

      totalItems += 1;

      const qty = typeof item.qty === "number" ? item.qty : 1;
      const price = typeof item.price === "number" ? item.price : 0;
      const gross = qty * price;

      let commissionRate = 0;
      const productId = item.product ? String(item.product) : null;

      if (productId) {
        const categoryId = productToCategory.get(productId);
        if (categoryId) {
          const rate = categoryToCommission.get(categoryId);
          if (typeof rate === "number") commissionRate = rate;
        }
      }

      if (commissionRate < 0) commissionRate = 0;
      if (commissionRate > 1) commissionRate = 1;

      const commissionAmount = gross * commissionRate;
      const net = gross - commissionAmount;

      if (status === "مكتمل") {
        completedItems += 1;
        totalRevenue += net;
      } else {
        pendingItems += 1;
      }
    }
  }

  return {
    totalOrders: totalItems,
    pendingItems,
    completedItems,
    totalRevenue,
  };
}

async function calculateSellerRevenue(sellerId, dateFilter = {}) {
  const stats = await computeSellerOrderStats(sellerId, dateFilter);
  return stats.totalRevenue || 0;
}

// ────────────────────────────────────────────────
// 📊 إحضار ملخص لوحة تحكم البائع
// GET /api/seller/dashboard
// ────────────────────────────────────────────────

export const getSellerDashboard = asyncHandler(async (req, res) => {
  const sellerId = getSellerIdFromReq(req);

  if (!sellerId) {
    return res
      .status(401)
      .json({ message: "غير مصرح: لا يوجد مستخدم مسجّل." });
  }

  const { from, to } = req.query || {};
  const dateFilter = {};

  if (from) {
    const fromDate = new Date(from);
    if (!isNaN(fromDate)) dateFilter.from = fromDate;
  }

  if (to) {
    const toDate = new Date(to);
    if (!isNaN(toDate)) dateFilter.to = toDate;
  }

  let store =
    (await Store.findOne({ owner: sellerId })) ||
    (await Store.findOne({ seller: sellerId }));

  if (!store) {
    return res.json({
      storeStatus: null,
      storeName: null,
      totalProducts: 0,
      totalOrders: 0,
      pendingOrders: 0,
      completedOrders: 0,
      totalRevenue: 0,
    });
  }

  const storeId = store._id;

  const totalProducts = await Product.countDocuments({ store: storeId });

  const { totalOrders, pendingItems, completedItems, totalRevenue } =
    await computeSellerOrderStats(sellerId, dateFilter);

  res.json({
    storeStatus: store.status || store.approvalStatus || "pending",
    storeName: store.name,
    totalProducts,
    totalOrders,
    pendingOrders: pendingItems,
    completedOrders: completedItems,
    totalRevenue,
  });
});

// ────────────────────────────────────────────────
// 🏪 إعدادات متجر البائع
// GET/PUT /api/seller/store
// ────────────────────────────────────────────────

export const getSellerStore = asyncHandler(async (req, res) => {
  const userId = getSellerIdFromReq(req);

  let store =
    (await Store.findOne({ owner: userId })) ||
    (await Store.findOne({ seller: userId }));

  if (!store) {
    return res.status(404).json({
      message: "لم يتم إنشاء متجر للبائع بعد.",
    });
  }

  res.json({
    id: store._id,
    name: store.name,
    description: store.description || "",
    visibility: store.visibility || "visible",
    status: store.status || store.approvalStatus || null,
    phone: store.phone || "",
    address: store.address || null,
  });
});

export const updateSellerStore = asyncHandler(async (req, res) => {
  const userId = getSellerIdFromReq(req);

  const { name, description, visibility, phone, address } = req.body;

  let store =
    (await Store.findOne({ owner: userId })) ||
    (await Store.findOne({ seller: userId }));

  if (!store) {
    const normalizedPhone = normalizePhone(phone);
    const normalizedAddress = normalizeAddress(address, null);

    store = new Store({
      owner: userId,
      seller: userId,
      name: typeof name === "string" && name.trim() ? name.trim() : "متجري",
      description: typeof description === "string" ? description.trim() : "",
      visibility: visibility === "hidden" ? "hidden" : "visible",
      ...(normalizedPhone ? { phone: normalizedPhone } : {}),
      ...(normalizedAddress ? { address: normalizedAddress } : {}),
    });
  } else {
    if (typeof name === "string" && name.trim()) {
      store.name = name.trim();
    }
    if (typeof description === "string") {
      store.description = description.trim();
    }
    if (visibility === "visible" || visibility === "hidden") {
      store.visibility = visibility;
    }

    const normalizedPhone = normalizePhone(phone);
    if (normalizedPhone) {
      store.phone = normalizedPhone;
    }

    const normalizedAddress = normalizeAddress(address, store.address);
    if (normalizedAddress) {
      store.address = normalizedAddress;
    }
  }

  await store.save();

  res.json({
    message: "تم حفظ إعدادات المتجر بنجاح.",
    store: {
      id: store._id,
      name: store.name,
      description: store.description || "",
      visibility: store.visibility || "visible",
      status: store.status || store.approvalStatus || null,
      phone: store.phone || "",
      address: store.address || null,
    },
  });
});

// ────────────────────────────────────────────────
// 📦 منتجات البائع فقط
// GET /api/seller/products
// ────────────────────────────────────────────────

export const getSellerProducts = asyncHandler(async (req, res) => {
  const sellerId = getSellerIdFromReq(req);

  if (!sellerId) {
    return res
      .status(401)
      .json({ message: "غير مصرح: لا يوجد مستخدم مسجّل." });
  }

  const products = await Product.find({ seller: sellerId }).populate(
    "store",
    "name"
  );

  res.json(products);
});

// ────────────────────────────────────────────────
// 🔄 Seller order status keys
// ────────────────────────────────────────────────

const SELLER_STATUS_KEYS = [
  "new",
  "processing",
  "ready_for_shipping",
  "cancelled",
];

function normalizeSellerStatusKey(value) {
  if (!value) return null;
  const v = String(value).trim().toLowerCase();

  switch (v) {
    case "new":
    case "جديد":
      return "new";
    case "processing":
    case "قيد المعالجة":
      return "processing";
    case "ready_for_shipping":
    case "ready-for-shipping":
    case "قيد الشحن":
    case "جاهز للشحن":
      return "ready_for_shipping";
    case "cancelled":
    case "ملغى":
    case "ملغي":
      return "cancelled";
    default:
      return null;
  }
}

function getAllowedNextSellerStatuses(currentKey) {
  switch (currentKey) {
    case "new":
      return ["processing", "cancelled"];
    case "processing":
      return ["ready_for_shipping", "cancelled"];
    case "ready_for_shipping":
      return [];
    default:
      return [];
  }
}

function mapSellerStatusKeyToItemStatus(key) {
  switch (key) {
    case "new":
      return "جديد";
    case "processing":
      return "قيد المعالجة";
    case "ready_for_shipping":
      return "قيد الشحن";
    case "cancelled":
      return "ملغى";
    default:
      return null;
  }
}

// ────────────────────────────────────────────────
// 🔄 تحديث حالة الطلب من جهة البائع (Order-level)
// PUT /api/seller/orders/:orderId/status
// ────────────────────────────────────────────────

export const updateSellerOrderStatus = asyncHandler(async (req, res) => {
  const sellerId = getSellerIdFromReq(req);
  const sellerIdStr = String(sellerId || "");
  const { orderId } = req.params;
  const { status } = req.body || {};

  if (!sellerId) {
    return res
      .status(401)
      .json({ message: "غير مصرح: لا يوجد مستخدم مسجّل." });
  }

  const requestedKey = normalizeSellerStatusKey(status);

  if (!requestedKey || !SELLER_STATUS_KEYS.includes(requestedKey)) {
    return res.status(400).json({
      message:
        "حالة غير صحيحة. الحالات المسموحة: جديد، قيد المعالجة، جاهز للشحن، ملغى.",
    });
  }

  const order = await Order.findOne({
    _id: orderId,
    "orderItems.seller": sellerId,
  });

  if (!order) {
    return res
      .status(404)
      .json({ message: "لم يتم العثور على هذا الطلب للبائع الحالي." });
  }

  // ✅ في متجر متعدد البائعين: لا تغيّر الحالة العامة للطلب إلا إذا كان الطلب كله لهذا البائع
  const singleSeller = isSingleSellerOrder(order, sellerIdStr);

  const currentKey = normalizeSellerStatusKey(order.sellerStatus) || "new";
  const allowed = getAllowedNextSellerStatuses(currentKey);

  if (!allowed.includes(requestedKey)) {
    return res.status(400).json({
      message: "لا يُسمح بالانتقال من الحالة الحالية إلى الحالة المطلوبة.",
      currentStatus: currentKey,
      allowedNext: allowed,
    });
  }

  // تحديث sellerStatus على مستوى الطلب فقط إذا كان الطلب لبائع واحد (توافق + منع تضارب multi-seller)
  if (singleSeller) {
    order.sellerStatus = requestedKey;
  }

  const unifiedCode = mapSellerStatusKeyToCode(requestedKey);
  const legacy = unifiedCode ? mapStatusCodeToLegacyArabic(unifiedCode) : null;

  // ✅ تحديث عناصر هذا البائع فقط (بدون تحويل orderItems إلى plain objects)
  const itemStatusArabic = mapSellerStatusKeyToItemStatus(requestedKey);

  if (Array.isArray(order.orderItems)) {
    for (const item of order.orderItems) {
      if (!item) continue;

      const rawSeller =
        item.seller && item.seller._id ? item.seller._id : item.seller;

      if (!rawSeller || String(rawSeller) !== sellerIdStr) continue;

      if (itemStatusArabic) item.itemStatus = itemStatusArabic;
      if (unifiedCode) item.statusCode = unifiedCode;
    }
  }

  // ✅ لا نلمس order.statusCode/order.status إلا في حالة الطلب لبائع واحد
  if (singleSeller && unifiedCode) {
    order.statusCode = unifiedCode;
    if (legacy) order.status = legacy;
  }

  await order.save();

  // ✅ نرجع Order populated ومتسق + مفلتر لعناصر هذا البائع فقط
  const populated = await getPopulatedSellerOrderById(sellerIdStr, order._id);

  res.json({
    message: "تم تحديث حالة الطلب من جهة البائع بنجاح.",
    orderId: order._id,
    sellerStatus: order.sellerStatus,
    statusCode: order.statusCode,
    order: populated,
  });
});

// ────────────────────────────────────────────────
// 🔄 تحديث حالة "منتج واحد داخل الطلب" من جهة البائع (Item-based)
// PATCH /api/seller/orders/:orderId/items/:itemId/status
// ────────────────────────────────────────────────

export const updateSellerOrderItemStatus = asyncHandler(async (req, res) => {
  const sellerId = getSellerIdFromReq(req);
  const sellerIdStr = String(sellerId || "");
  const { orderId, itemId } = req.params;
  const { status, statusKey } = req.body || {};

  if (!sellerId) {
    return res
      .status(401)
      .json({ message: "غير مصرح: لا يوجد مستخدم مسجّل." });
  }

  const requestedKey = normalizeSellerStatusKey(status || statusKey);

  if (!requestedKey || !SELLER_STATUS_KEYS.includes(requestedKey)) {
    return res.status(400).json({
      message:
        "حالة غير صحيحة. الحالات المسموحة: جديد، قيد المعالجة، جاهز للشحن، ملغى.",
    });
  }

  const order = await Order.findById(orderId);

  if (!order) {
    return res
      .status(404)
      .json({ message: "لم يتم العثور على هذا الطلب." });
  }

  const item =
    Array.isArray(order.orderItems) && order.orderItems.id
      ? order.orderItems.id(itemId)
      : null;

  if (!item) {
    return res.status(404).json({
      message: "لم يتم العثور على هذا المنتج داخل الطلب.",
    });
  }

  const rawSeller =
    item.seller && item.seller._id ? item.seller._id : item.seller;

  if (!rawSeller || String(rawSeller) !== sellerIdStr) {
    return res.status(403).json({
      message: "لا يمكنك تعديل حالة منتج لا يخص متجرك.",
    });
  }

  // ✅ في متجر متعدد البائعين: لا تغيّر الحالة العامة للطلب إلا إذا كان الطلب كله لهذا البائع
  const singleSeller = isSingleSellerOrder(order, sellerIdStr);

  const currentKey =
    normalizeSellerStatusKey(item.itemStatus || order.sellerStatus) || "new";
  const allowed = getAllowedNextSellerStatuses(currentKey);

  if (!allowed.includes(requestedKey)) {
    return res.status(400).json({
      message: "لا يُسمح بالانتقال من الحالة الحالية إلى الحالة المطلوبة.",
      currentStatus: currentKey,
      allowedNext: allowed,
    });
  }

  const unifiedCode = mapSellerStatusKeyToCode(requestedKey);
  const itemStatusArabic = mapSellerStatusKeyToItemStatus(requestedKey);

  if (itemStatusArabic) item.itemStatus = itemStatusArabic;
  if (unifiedCode) item.statusCode = unifiedCode;

  // فقط للتوافق إذا كان الطلب لبائع واحد
  if (singleSeller) {
    order.sellerStatus = requestedKey;

    if (unifiedCode) {
      order.statusCode = unifiedCode;
      const legacy = mapStatusCodeToLegacyArabic(unifiedCode);
      if (legacy) order.status = legacy;
    }
  }

  await order.save();

  // ✅ نرجع Order populated ومتسق + مفلتر لعناصر هذا البائع فقط
  const populated = await getPopulatedSellerOrderById(sellerIdStr, order._id);

  res.json({
    message: "تم تحديث حالة هذا المنتج داخل الطلب من جهة البائع بنجاح.",
    orderId: order._id,
    itemId: item._id,
    sellerStatus: order.sellerStatus,
    itemStatus: item.itemStatus,
    statusCode: item.statusCode,
    order: populated,
  });
});
