// ────────────────────────────────────────────────
// 📁 admin/adminFinancialController.js
// الإدارة المالية: ملخص مالي + قائمة المعاملات + حسابات + تسويات
// مبني على نموذج Transaction الجديد وتصوّر الإدارة المالية
// ────────────────────────────────────────────────

import asyncHandler from 'express-async-handler';
import Transaction from '../../models/Transaction.js';
import Order from '../../models/Order.js';
import Store from '../../models/Store.js';
import ShippingCompany from '../../models/ShippingCompany.js';
import Notification from '../../models/Notification.js';
import { CANCELLED_CODES } from '../../utils/cancellationCodes.js';

// 🧩 دالة مساعدة لبناء فلتر التاريخ من query (from, to)
function buildDateFilter(query) {
  const { from, to } = query || {};
  const createdAt = {};

  if (from) {
    const fromDate = new Date(from);
    if (!isNaN(fromDate.getTime())) {
      createdAt.$gte = fromDate;
    }
  }

  if (to) {
    const toDate = new Date(to);
    if (!isNaN(toDate.getTime())) {
      createdAt.$lte = toDate;
    }
  }

  return Object.keys(createdAt).length ? { createdAt } : {};
}

// 🧼 تطبيع قيم ALL من الواجهة
function normalizeAll(v) {
  if (!v) return undefined;
  if (String(v).toUpperCase() === 'ALL') return undefined;
  return v;
}

// 🧮 ثوابت لأنواع العمليات المستخدمة في التجميع
const EARNING_TYPES = [
  'ORDER_EARNING_SELLER',
  'ORDER_EARNING_SHIPPING',
  'ORDER_EARNING_PLATFORM',
];

// ────────────────────────────────────────────────
// GET /api/admin/financial-summary
// ملخص مالي عام لفترة محددة (اختياريًا)
// ────────────────────────────────────────────────
export const getAdminFinancialSummary = asyncHandler(async (req, res) => {
  const matchDate = buildDateFilter(req.query);
  const { paymentMethod, role } = req.query;

  const matchTx = { ...matchDate, status: { $nin: CANCELLED_CODES } };

  const pmN = normalizeAll(paymentMethod);
  if (pmN) matchTx.paymentMethod = pmN;

  const roleN = normalizeAll(role);
  if (roleN) matchTx.role = roleN;

  // 🧮 نجمع المعاملات المالية حسب (type, role, paymentMethod)
  const [txAgg, totalOrders] = await Promise.all([
    Transaction.aggregate([
      { $match: matchTx },
      {
        $group: {
          _id: {
            type: '$type',
            role: '$role',
            paymentMethod: '$paymentMethod',
          },
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]),
    // ✅ لو يوجد فلتر تاريخ نطبقه على orders.createdAt (اختياري لكنه أدق)
    Object.keys(matchDate).length ? Order.countDocuments(matchDate) : Order.countDocuments(),
  ]);

  // 🎯 ملخص مبدئي (سنملأه من نتائج التجميع)
  const summary = {
    // إجماليات المعاملات
    totalTransactions: 0,
    totalTransactionAmount: 0,
    totalOrders,

    // مبيعات وأرباح
    totalSellerEarnings: 0, // مستحقات البائعين من الطلبات
    totalShippingEarnings: 0, // مستحقات الشحن من الطلبات
    totalPlatformCommission: 0, // عمولة المنصة من الطلبات

    // تسويات (إرسال) للبائعين والشحن
    totalSellerPayouts: 0,
    totalShippingPayouts: 0,

    // استرجاعات من البائعين والشحن
    totalSellerRefunds: 0,
    totalShippingRefunds: 0,

    // توريدات (إيجارات / توريد COD / ... )
    totalSellerSupply: 0,
    totalShippingSupply: 0,
    totalPlatformSupply: 0,

    // أرصدة حالية
    sellerCurrentBalance: 0,
    shippingCurrentBalance: 0,

    // الدفع عند الاستلام COD (من زاوية المبيعات)
    codSales: 0, // إجمالي مبيعات COD (صافي البائع + عمولة المنصة)
    codSupplied: 0, // ما تم توريده فعليًا (من شركات الشحن)
    codPending: 0, // ما لم يُورّد بعد = codSales - codSupplied
  };

  // 🧮 نمرّ على نتائج الـ aggregate ونملأ الملخص
  let totalTxCount = 0;
  let totalTxAmount = 0;

  for (const doc of txAgg) {
    const { type, role, paymentMethod } = doc._id || {};
    const amount = doc.totalAmount || 0;
    const count = doc.count || 0;

    totalTxCount += count;
    totalTxAmount += amount;

    // مستحقات من الطلبات
    if (type === 'ORDER_EARNING_SELLER') {
      summary.totalSellerEarnings += amount;

      // لو الدفع عند الاستلام، نضيفه لإجمالي مبيعات COD
      if (paymentMethod === 'COD') {
        summary.codSales += amount;
      }
    }

    if (type === 'ORDER_EARNING_SHIPPING') {
      summary.totalShippingEarnings += amount;
    }

    if (type === 'ORDER_EARNING_PLATFORM') {
      summary.totalPlatformCommission += amount;

      // عمولة المنصة من طلبات COD ضمن إجمالي مبيعات COD
      if (paymentMethod === 'COD') {
        summary.codSales += amount;
      }
    }

    // إرسال (PAYOUT) = تحويل من المنصة إلى البائع / شركة الشحن
    if (type === 'PAYOUT') {
      if (role === 'SELLER') {
        summary.totalSellerPayouts += amount;
      } else if (role === 'SHIPPING') {
        summary.totalShippingPayouts += amount;
      }
    }

    // استرجاع (REFUND) = المنصة تسترجع مبالغ من الطرف
    if (type === 'REFUND') {
      if (role === 'SELLER') {
        summary.totalSellerRefunds += amount;
      } else if (role === 'SHIPPING') {
        summary.totalShippingRefunds += amount;
      }
    }

    // توريد (SUPPLY) = الطرف يورد مبالغ للمنصة (إيجار / توريد COD / ... )
    if (type === 'SUPPLY') {
      if (role === 'SELLER') {
        summary.totalSellerSupply += amount;
      } else if (role === 'SHIPPING') {
        summary.totalShippingSupply += amount;

        // في حالة COD: ما تورّدته شركات الشحن من مبالغ التحصيل
        if (paymentMethod === 'COD') {
          summary.codSupplied += amount;
        }
      } else if (role === 'PLATFORM' || role === 'SALES') {
        summary.totalPlatformSupply += amount;
      }
    }
  }

  summary.totalTransactions = totalTxCount;
  summary.totalTransactionAmount = totalTxAmount;

  // 🧮 الأرصدة الحالية كما اتفقنا:
  // الرصيد الحالي = المستحقات - المرسل - الاسترجاع
  // التوريد لا يدخل في الرصيد لأنه حق للمنصة وليس للطرف
  summary.sellerCurrentBalance =
    summary.totalSellerEarnings -
    summary.totalSellerPayouts -
    summary.totalSellerRefunds;

  summary.shippingCurrentBalance =
    summary.totalShippingEarnings -
    summary.totalShippingPayouts -
    summary.totalShippingRefunds;

  // 🧮 رصيد مبالغ الدفع عند الاستلام غير المورّدة
  summary.codPending = summary.codSales - summary.codSupplied;

  return res.json(summary);
});

// ────────────────────────────────────────────────
// GET /api/admin/transactions
// قائمة المعاملات المالية مع دعم الفلترة والتقسيم لصفحات
// ────────────────────────────────────────────────
export const getAdminTransactions = asyncHandler(async (req, res) => {
  const {
    role,
    type,
    storeId,
    shippingCompanyId,
    status,
    paymentMethod,
    from,
    to,
    page = 1,
    limit = 50,
  } = req.query;

  const filter = {};

  // فلتر بالدور (SELLER / SHIPPING / PLATFORM / SALES)
  const roleN = normalizeAll(role);
  if (roleN) {
    filter.role = roleN;
  }

  // فلتر بنوع المعاملة
  const typeN = normalizeAll(type);
  if (typeN) {
    filter.type = typeN;
  }

  // فلتر بحالة المعاملة (PENDING / COMPLETED / CANCELLED)
  const statusN = normalizeAll(status);
  if (statusN) {
    filter.status = statusN;
  }

  // فلتر بطريقة الدفع (COD / ONLINE / OTHER)
  const pmN = normalizeAll(paymentMethod);
  if (pmN) {
    filter.paymentMethod = pmN;
  }

  // فلتر بالبائع (store)
  const storeN = normalizeAll(storeId);
  if (storeN) {
    filter.store = storeN;
  }

  // فلتر بشركة الشحن
  const shipN = normalizeAll(shippingCompanyId);
  if (shipN) {
    filter.shippingCompany = shipN;
  }

  // فلتر زمني (من / إلى) حسب createdAt
  Object.assign(filter, buildDateFilter({ from, to }));

  const pageNum = Number(page) > 0 ? Number(page) : 1;
  const limitNum = Math.min(Number(limit) > 0 ? Number(limit) : 50, 200);
  const skip = (pageNum - 1) * limitNum;

  const [total, transactions] = await Promise.all([
    Transaction.countDocuments(filter),
    Transaction.find(filter)
      .populate('order')
      .populate('store')
      .populate('shippingCompany')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
  ]);

  res.json({
    transactions,
    pagination: {
      total,
      page: pageNum,
      pages: Math.max(Math.ceil(total / limitNum), 1),
      limit: limitNum,
    },
  });
});

// ────────────────────────────────────────────────
// GET /api/admin/financial/accounts
// جدول الحسابات:
// - كل صف يمثل بائعًا أو شركة شحن أو المنصّة
// - مع صف افتراضي لإجمالي المبيعات (SALES) لمبالغ COD
// ────────────────────────────────────────────────
export const getFinancialAccounts = asyncHandler(async (req, res) => {
  const { role, paymentMethod } = req.query;
  const dateFilter = buildDateFilter(req.query);

  // ✅ استبعاد المعاملات الملغاة من جدول الحسابات
  const baseMatch = {
    ...dateFilter,
    status: { $nin: CANCELLED_CODES },
  };

  // ✅ فلتر طريقة الدفع
  const pmN = normalizeAll(paymentMethod);
  if (pmN) {
    baseMatch.paymentMethod = pmN;
  }

  // الأدوار "الحقيقية" التي لها طرف معيّن
  const REAL_ROLES = ['SELLER', 'SHIPPING', 'PLATFORM'];

  const isSpecificRole = role && role !== 'ALL';

  // لو الدور SALES نترك التجميع الرئيسي فارغ ونحسبه بشكل خاص
  const rolesToInclude =
    isSpecificRole && role !== 'SALES'
      ? [role]
      : !isSpecificRole
        ? REAL_ROLES
        : [];

  const { storeId, shippingCompanyId } = req.query;
  const storeFilter = normalizeAll(storeId);
  const shipFilter = normalizeAll(shippingCompanyId);

  if (storeFilter) baseMatch.store = storeFilter;
  if (shipFilter) baseMatch.shippingCompany = shipFilter;

  if (rolesToInclude.length) {
    baseMatch.role = { $in: rolesToInclude };
  }

  // 🧮 تجميع حسابات SELLER / SHIPPING / PLATFORM
  const agg = rolesToInclude.length
    ? await Transaction.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: {
            role: '$role',
            // للبائع: نجمع حسب store فقط
            store: {
              $cond: [{ $eq: ['$role', 'SELLER'] }, '$store', null],
            },
            // لشركة الشحن: نجمع حسب shippingCompany فقط
            shippingCompany: {
              $cond: [{ $eq: ['$role', 'SHIPPING'] }, '$shippingCompany', null],
            },
          },
          store: { $first: '$store' },
          shippingCompany: { $first: '$shippingCompany' },
          totalDue: {
            $sum: {
              $cond: [{ $in: ['$type', EARNING_TYPES] }, '$amount', 0],
            },
          },
          totalPayout: {
            $sum: {
              $cond: [{ $eq: ['$type', 'PAYOUT'] }, '$amount', 0],
            },
          },
          totalRefund: {
            $sum: {
              $cond: [{ $eq: ['$type', 'REFUND'] }, '$amount', 0],
            },
          },
          totalSupply: {
            $sum: {
              $cond: [{ $eq: ['$type', 'SUPPLY'] }, '$amount', 0],
            },
          },
        },
      },
    ])
    : [];

  const storeIds = [];
  const shippingCompanyIds = [];

  for (const row of agg) {
    const r = row._id?.role;
    if (r === 'SELLER' && row.store) {
      storeIds.push(row.store);
    }
    if (r === 'SHIPPING' && row.shippingCompany) {
      shippingCompanyIds.push(row.shippingCompany);
    }
  }

  const [stores, shippingCompanies] = await Promise.all([
    storeIds.length
      ? Store.find({ _id: { $in: storeIds } }).select(
        'name email phone contactEmail contactPhone'
      )
      : [],
    shippingCompanyIds.length
      ? ShippingCompany.find({ _id: { $in: shippingCompanyIds } }).select(
        'name email phone contactEmail contactPhone'
      )
      : [],
  ]);

  const storeMap = new Map();
  const shippingMap = new Map();

  stores.forEach((s) => {
    storeMap.set(String(s._id), s);
  });

  shippingCompanies.forEach((sc) => {
    shippingMap.set(String(sc._id), sc);
  });

  let accounts = agg.map((row) => {
    const r = row._id?.role;
    const store = row.store;
    const shippingCompany = row.shippingCompany;

    const totalDue = row.totalDue || 0;
    const totalPayout = row.totalPayout || 0;
    const totalRefund = row.totalRefund || 0;
    const totalSupply = row.totalSupply || 0;

    let meta = {
      name: '',
      email: '',
      phone: '',
    };
    let partyId = null;

    if (r === 'SELLER' && store) {
      const s = storeMap.get(String(store));
      meta = {
        name: s?.name || 'متجر غير محدد',
        email: s?.contactEmail || s?.email || '',
        phone: s?.contactPhone || s?.phone || '',
      };
      partyId = store;
    } else if (r === 'SHIPPING' && shippingCompany) {
      const sc = shippingMap.get(String(shippingCompany));
      meta = {
        name: sc?.name || 'شركة شحن غير محددة',
        email: sc?.contactEmail || sc?.email || '',
        phone: sc?.contactPhone || sc?.phone || '',
      };
      partyId = shippingCompany;
    } else if (r === 'PLATFORM') {
      // حساب المنصّة (عمولة المنصة)
      meta = {
        name: 'منصّة طلبية',
        email: '',
        phone: '',
      };
      partyId = null;
    }

    const currentBalance = totalDue - totalPayout - totalRefund;

    return {
      role: r,
      partyId,
      name: meta.name,
      email: meta.email || '-',
      phone: meta.phone || '-',
      totalDue,
      totalSent: totalPayout,
      totalRefund,
      totalSupply,
      currentBalance,
    };
  });

  // 🟨 حساب افتراضي لإجمالي المبيعات (SALES)
  const shouldIncludeSales =
    !role || role === 'ALL' || role === 'SALES';

  if (shouldIncludeSales) {
    // 1) إجمالي المبيعات = مستحقات البائع + عمولة المنصة من **جميع الطلبات** (قبل خصم أي عمولات)
    const salesMatch = {
      ...dateFilter,
      status: { $nin: CANCELLED_CODES }, // ✅ استبعاد الطلبات الملغاة
      type: { $in: ['ORDER_EARNING_SELLER', 'ORDER_EARNING_PLATFORM'] },
    };
    // ✅ تطبيق فلتر طريقة الدفع إن وُجد
    if (pmN) {
      salesMatch.paymentMethod = pmN;
    }

    const [salesAgg] = await Transaction.aggregate([
      { $match: salesMatch },
      {
        $group: {
          _id: null,
          totalDue: { $sum: '$amount' },
        },
      },
    ]);

    const salesTotalDue = salesAgg?.totalDue || 0;

    // 2) إجمالي التوريد من مبالغ COD = SUPPLY من شركات الشحن بالدفع عند الاستلام
    const supplyMatch = {
      ...dateFilter,
      status: { $nin: CANCELLED_CODES }, // ✅
      paymentMethod: 'COD',
      role: 'SHIPPING',
      type: 'SUPPLY',
    };

    const [supplyAgg] = await Transaction.aggregate([
      { $match: supplyMatch },
      {
        $group: {
          _id: null,
          totalSupply: { $sum: '$amount' },
        },
      },
    ]);

    const salesTotalSupply = supplyAgg?.totalSupply || 0;

    const salesAccount = {
      role: 'SALES',
      partyId: null,
      name: 'إجمالي المبيعات',
      email: '-',
      phone: '-',
      // إجمالي المستحقات = إجمالي قيمة المنتجات (بدون الشحن) من جميع الطلبات
      totalDue: salesTotalDue,
      // لا نستخدم PAYOUT / REFUND لحساب SALES
      totalSent: 0,
      totalRefund: 0,
      // إجمالي ما تم توريده من مبالغ المبيعات (COD)
      totalSupply: salesTotalSupply,
      // الرصيد الحالي = مبيعات COD لم تُورد بعد
      currentBalance: 0, // ✅ لا معنى للرصيد الحالي في إجمالي المبيعات
    };

    if (role === 'SALES') {
      // لو الفلتر SALES فقط، نرجع صف إجمالي المبيعات وحده
      return res.json({ accounts: [salesAccount] });
    }

    // في وضع "الكل" نضيفه تحت بقية الحسابات
    accounts.push(salesAccount);
  }

  res.json({ accounts });
});

// ────────────────────────────────────────────────
// POST /api/admin/financial/settle
// إنشاء عملية تسوية (إرسال / استرجاع / توريد) لحساب معيّن
// ────────────────────────────────────────────────
export const createFinancialSettlement = asyncHandler(async (req, res) => {
  const { role, partyId, operationType, amount, note, paymentMethod } =
    req.body || {};

  // ✅ الآن نقبل SELLER و SHIPPING و PLATFORM
  if (!role || !['SELLER', 'SHIPPING', 'PLATFORM'].includes(role)) {
    res.status(400);
    throw new Error('الدور غير صالح لعملية التسوية.');
  }

  // ✅ نحتاج partyId للبائع والشحن فقط، وليس للمنصّة
  if (role !== 'PLATFORM' && !partyId) {
    res.status(400);
    throw new Error('معرّف الحساب (partyId) مطلوب لعملية التسوية.');
  }

  const numericAmount = Number(amount);
  if (!numericAmount || numericAmount <= 0) {
    res.status(400);
    throw new Error('قيمة المبلغ في التسوية غير صالحة.');
  }

  if (
    !operationType ||
    !['PAYOUT', 'REFUND', 'SUPPLY'].includes(operationType)
  ) {
    res.status(400);
    throw new Error('نوع العملية في التسوية غير صالح.');
  }

  // ✅ تحقق وجود الطرف وحالته لمنع معاملات يتيمة أو لأطراف موقوفة
  if (role === 'SELLER') {
    const store = await Store.findById(partyId);
    if (!store) {
      res.status(404);
      throw new Error('المتجر (Store) غير موجود.');
    }
    // منع التسوية للمتجر غير المفعل أو الموقوف (فقط لعمليات الصرف PAYOUT)
    if (operationType === 'PAYOUT' && (store.status !== 'approved' || !store.isActive)) {
      res.status(400);
      throw new Error('لا يمكن إجراء تسوية (صرف) لمتجر غير مفعل أو موقوف.');
    }
  }

  if (role === 'SHIPPING') {
    const company = await ShippingCompany.findById(partyId);
    if (!company) {
      res.status(404);
      throw new Error('شركة الشحن غير موجودة.');
    }
    // منع التسوية لشركة الشحن غير المفعلة (فقط لعمليات الصرف PAYOUT)
    if (operationType === 'PAYOUT' && !company.isActive) {
      res.status(400);
      throw new Error('لا يمكن إجراء تسوية (صرف) لشركة شحن غير مفعلة.');
    }
  }

  // ✅ تحقق من توفر الرصيد الكافي لعمليات الصرف (PAYOUT)
  if (operationType === 'PAYOUT') {
    const balanceMatch = {
      status: { $nin: CANCELLED_CODES },
      role
    };
    if (role === 'SELLER') balanceMatch.store = partyId;
    if (role === 'SHIPPING') balanceMatch.shippingCompany = partyId;

    const [balanceAgg] = await Transaction.aggregate([
      { $match: balanceMatch },
      {
        $group: {
          _id: null,
          totalDue: { $sum: { $cond: [{ $in: ['$type', EARNING_TYPES] }, '$amount', 0] } },
          totalPayout: { $sum: { $cond: [{ $eq: ['$type', 'PAYOUT'] }, '$amount', 0] } },
          totalRefund: { $sum: { $cond: [{ $eq: ['$type', 'REFUND'] }, '$amount', 0] } },
        }
      }
    ]);

    const currentBalance = (balanceAgg?.totalDue || 0) - (balanceAgg?.totalPayout || 0) - (balanceAgg?.totalRefund || 0);
    
    if (currentBalance < numericAmount) {
      res.status(400);
      throw new Error(`الرصيد غير كافٍ. الرصيد الحالي: ${currentBalance.toFixed(2)} ريال.`);
    }
  }

  // ✅ تطبيع paymentMethod
  const pm = paymentMethod || 'OTHER';
  const allowedPM = ['COD', 'ONLINE', 'WALLET', 'BANK_TRANSFER', 'OTHER'];
  const finalPM = allowedPM.includes(pm) ? pm : 'OTHER';

  const txData = {
    role,
    type: operationType,
    amount: numericAmount,
    direction:
      operationType === 'PAYOUT'
        ? 'DEBIT' // التزام يخرج من المنصة
        : 'CREDIT', // دخل لصالح المنصة
    status: 'COMPLETED',
    paymentMethod: finalPM,
    note: note || '',
    processedAt: new Date(),
  };

  if (role === 'SELLER') {
    txData.store = partyId;
  } else if (role === 'SHIPPING') {
    txData.shippingCompany = partyId;
  }
  // ✅ لو الدور PLATFORM لا نربطه بـ store أو shippingCompany

  const transaction = await Transaction.create(txData);

  // 🔔 إرسال إشعار للطرف المعني (بائع / شركة شحن)
  try {
    let targetUser = null;
    let title = '';
    let message = '';
    let link = '';

    if (role === 'SELLER') {
      const store = await Store.findById(partyId).populate('owner');
      targetUser = store?.owner?._id;
      link = '/seller/financial';
    } else if (role === 'SHIPPING') {
      const sci = await ShippingCompany.findById(partyId);
      targetUser = sci?.user;
      link = '/shipping/financial';
    }

    if (targetUser) {
      if (operationType === 'PAYOUT') {
        title = 'تم تحويل مستحقات مالية 💸';
        message = `تم تحويل مبلغ ${numericAmount} ريال إلى حسابك كمسوية مالية. تفاصيل: ${note || 'لا يوجد'}`;
      } else if (operationType === 'REFUND') {
        title = 'إشعار استرجاع مالي ⚠️';
        message = `تم تسجيل عملية استرجاع (Refund) بقيمة ${numericAmount} ريال من حسابكم. السبب: ${note || 'لا يوجد'}`;
      } else if (operationType === 'SUPPLY') {
        title = 'تم تسجيل توريد مالي ✅';
        message = `نشكركم على توريد مبلغ ${numericAmount} ريال للمنصة. تم توثيق العملية في سجلاتكم المالية.`;
      }

      await Notification.create({
        user: targetUser,
        title,
        message,
        type: 'system',
        link
      });
    }
  } catch (notifyErr) {
    console.error('Error sending settlement notification:', notifyErr);
  }

  res.status(201).json({
    message: 'تم إنشاء عملية التسوية بنجاح.',
    transaction,
  });
});
