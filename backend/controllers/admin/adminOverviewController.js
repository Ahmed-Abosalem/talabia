// ────────────────────────────────────────────────
// 📁 admin/adminOverviewController.js
// نظرة عامة: إحصاءات عامة للنظام ولوحة تحكم الأدمن
// GET /api/admin/stats
// هذه النسخة موسّعة إنتاجية وتُرجع ملخصات كاملة بدون أي بيانات وهمية.
// ────────────────────────────────────────────────

import asyncHandler from 'express-async-handler';
import User from '../../models/User.js';
import Store from '../../models/Store.js';
import Product from '../../models/Product.js';
import Order from '../../models/Order.js';
import Transaction from '../../models/Transaction.js';
import ShippingCompany from '../../models/ShippingCompany.js';
import SupportTicket from '../../models/SupportTicket.js';
import Ad from '../../models/Ad.js';
import Notification from '../../models/Notification.js';
import {
  ORDER_STATUS_CODES,
  // يمكن استخدامه لاحقاً لو أردنا إعادة احتساب الكود لطلبات قديمة بلا statusCode
  // recomputeOrderStatusCode,
} from '../../utils/orderStatus.js';

// 🕒 مساعد بسيط لحساب تاريخ البداية حسب الفترة المطلوبة
function resolveFromDate(period) {
  const now = new Date();
  switch (period) {
    case 'day': {
      // بداية اليوم الحالي
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }
    case '7d': {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      return d;
    }
    case '30d': {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      return d;
    }
    case 'all':
    default:
      return null;
  }
}

// 🧮 مساعد لجمع مبلغ من Transactions وفق شرط معيّن
async function sumTransactions(match) {
  const pipeline = [
    { $match: match },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ];
  const res = await Transaction.aggregate(pipeline);
  return res?.[0]?.total || 0;
}

// ────────────────────────────────────────────────
// 🎯 الإحصاءات العامة للنظام
// ────────────────────────────────────────────────
export const getSystemStats = asyncHandler(async (req, res) => {
  const period = (req.query && req.query.period ? String(req.query.period) : 'all');
  const fromDate = resolveFromDate(period);

  const dateFilter = fromDate ? { $gte: fromDate } : undefined;

  // فلتر الفترة للطلبات
  const ordersPeriodFilter = fromDate ? { createdAt: dateFilter } : {};

  // فلتر الفترة للحركات المالية / الإشعارات / التذاكر
  const genericPeriodFilter = fromDate ? { createdAt: dateFilter } : {};

  // ──────────────────────────────────────────
  // 1) أرقام عامة أساسية (دائمة - كل الوقت)
  // ──────────────────────────────────────────
  const [users, stores, totalOrders, products] = await Promise.all([
    User.countDocuments(),
    Store.countDocuments(),
    Order.countDocuments(), // إجمالي الطلبات طوال عمر النظام
    Product.countDocuments(),
  ]);

  // ──────────────────────────────────────────
  // 2) ملخص الطلبات حسب الكود الموحد للحالة
  // ──────────────────────────────────────────
  // نحسب التجميع حسب statusCode للطلبات ضمن الفترة (إن وُجدت فترة)
  const ordersStatusAgg = await Order.aggregate([
    { $match: ordersPeriodFilter },
    {
      $group: {
        _id: '$statusCode',
        count: { $sum: 1 },
      },
    },
  ]);

  // نهيّء جميع الأكواد بالقيمة 0 حتى لو لم توجد طلبات لها
  const ordersByStatusCode = Object.values(ORDER_STATUS_CODES).reduce(
    (acc, code) => {
      acc[code] = 0;
      return acc;
    },
    {}
  );

  let ordersInPeriod = 0;
  for (const row of ordersStatusAgg) {
    const code = row._id;
    const count = row.count || 0;
    if (code && Object.prototype.hasOwnProperty.call(ordersByStatusCode, code)) {
      ordersByStatusCode[code] = count;
      ordersInPeriod += count;
    } else {
      // طلبات بدون statusCode أو بكود غير متوقع تُحسب فقط في الإجمالي
      ordersInPeriod += count;
    }
  }

  // إن لم تُحدّد فترة → إجمالي الطلبات في الفترة = إجمالي الطلبات الكلي
  if (!fromDate) {
    ordersInPeriod = totalOrders;
  }

  const ordersSummary = {
    totalAllTime: totalOrders,
    totalInPeriod: ordersInPeriod,
    byStatusCode: ordersByStatusCode,
  };

  // ──────────────────────────────────────────
  // 3) ملخص مالي عبر جدول Transactions
  // ──────────────────────────────────────────
  const earningsTypes = [
    'ORDER_EARNING_SELLER',
    'ORDER_EARNING_SHIPPING',
    'ORDER_EARNING_PLATFORM',
  ];

  const txBaseMatch = genericPeriodFilter ? { ...genericPeriodFilter } : {};

  const [
    totalSales,
    codSales,
    onlineSales,
    platformCommission,
    unpaidPayouts,
  ] = await Promise.all([
    // إجمالي المبيعات (كل ما دُفع من المشتري = مجموع مستحقات البائع + الشحن + عمولة المنصة)
    sumTransactions({
      ...txBaseMatch,
      type: { $in: earningsTypes },
    }),
    // مبيعات الدفع عند الاستلام COD
    sumTransactions({
      ...txBaseMatch,
      type: { $in: earningsTypes },
      paymentMethod: 'COD',
    }),
    // مبيعات الدفع الإلكتروني ONLINE
    sumTransactions({
      ...txBaseMatch,
      type: { $in: earningsTypes },
      paymentMethod: 'ONLINE',
    }),
    // إجمالي عمولة المنصة
    sumTransactions({
      ...txBaseMatch,
      type: 'ORDER_EARNING_PLATFORM',
    }),
    // مبالغ مستحقة (غير مسددة) للبائعين وشركات الشحن
    sumTransactions({
      ...txBaseMatch,
      status: 'PENDING',
      role: { $in: ['SELLER', 'SHIPPING'] },
      direction: 'DEBIT',
    }),
  ]);

  const financial = {
    totalSales,
    codSales,
    onlineSales,
    platformCommission,
    unpaidPayouts,
  };

  // ──────────────────────────────────────────
  // 4) ملخص الشحن
  // ──────────────────────────────────────────
  const inShippingCount =
    ordersByStatusCode[ORDER_STATUS_CODES.IN_SHIPPING] || 0;
  const deliveredInPeriod =
    ordersByStatusCode[ORDER_STATUS_CODES.DELIVERED] || 0;

  const [activeShippingCompanies] = await Promise.all([
    ShippingCompany.countDocuments({ isActive: true }),
  ]);

  const shipping = {
    inShipping: inShippingCount,
    deliveredInPeriod,
    activeCompanies: activeShippingCompanies,
  };

  // ──────────────────────────────────────────
  // 5) ملخص الدعم الفني (التذاكر)
  // ──────────────────────────────────────────
  const ticketsBaseMatch = genericPeriodFilter ? { ...genericPeriodFilter } : {};

  const [
    openTickets,
    inProgressTickets,
    resolvedTickets,
    closedTickets,
  ] = await Promise.all([
    SupportTicket.countDocuments({ ...ticketsBaseMatch, status: 'open' }),
    SupportTicket.countDocuments({
      ...ticketsBaseMatch,
      status: 'in_progress',
    }),
    SupportTicket.countDocuments({
      ...ticketsBaseMatch,
      status: 'resolved',
    }),
    SupportTicket.countDocuments({ ...ticketsBaseMatch, status: 'closed' }),
  ]);

  const support = {
    open: openTickets,
    inProgress: inProgressTickets,
    resolved: resolvedTickets,
    closed: closedTickets,
  };

  // ──────────────────────────────────────────
  // 6) ملخص الإعلانات
  // ──────────────────────────────────────────
  const [activeAds, inactiveAds, totalAds] = await Promise.all([
    Ad.countDocuments({ isActive: true }),
    Ad.countDocuments({ isActive: false }),
    Ad.countDocuments({}),
  ]);

  const ads = {
    active: activeAds,
    inactive: inactiveAds,
    total: totalAds,
  };

  // ──────────────────────────────────────────
  // 7) ملخص التنبيهات (Notifications) العامة
  // ──────────────────────────────────────────
  const notificationsBaseMatch = genericPeriodFilter
    ? { ...genericPeriodFilter }
    : {};

  const [
    notificationsTotalAllTime,
    notificationsInPeriod,
    unreadNotifications,
  ] = await Promise.all([
    Notification.countDocuments({}),
    Notification.countDocuments(notificationsBaseMatch),
    // نفترض وجود حقل isRead (إن لم يوجد فستكون النتيجة 0 ولن يحدث خطأ)
    Notification.countDocuments({ isRead: false }),
  ]);

  const notifications = {
    totalAllTime: notificationsTotalAllTime,
    inPeriod: notificationsInPeriod,
    unread: unreadNotifications,
  };

  // ──────────────────────────────────────────
  // 8) آخر الأنشطة (Recent Activity)
  // ──────────────────────────────────────────
  // نأخذ عينة صغيرة من أحدث الطلبات، التذاكر، والحركات المالية الخاصة بالمنصة
  const [recentOrders, recentTickets, recentPlatformTxs] = await Promise.all([
    Order.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .select('_id createdAt statusCode'),
    SupportTicket.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .select('_id createdAt status subject userName'),
    Transaction.find({ type: 'ORDER_EARNING_PLATFORM' })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('_id createdAt amount order'),
  ]);

  const recentActivity = [];

  for (const o of recentOrders) {
    recentActivity.push({
      type: 'order',
      createdAt: o.createdAt,
      title: `طلب #${String(o._id).slice(-6)}`,
      meta: {
        orderId: o._id,
        statusCode: o.statusCode || null,
      },
    });
  }

  for (const t of recentTickets) {
    recentActivity.push({
      type: 'ticket',
      createdAt: t.createdAt,
      title: t.subject || 'تذكرة دعم',
      meta: {
        ticketId: t._id,
        status: t.status,
        userName: t.userName || null,
      },
    });
  }

  for (const tx of recentPlatformTxs) {
    recentActivity.push({
      type: 'payout',
      createdAt: tx.createdAt,
      title: `عمولة منصة بقيمة ${tx.amount}`,
      meta: {
        transactionId: tx._id,
        orderId: tx.order || null,
        amount: tx.amount,
      },
    });
  }

  // ترتيب حسب التاريخ تنازلياً وأخذ آخر 10 عناصر
  recentActivity.sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
  const recentActivitySlice = recentActivity.slice(0, 10);

  // ──────────────────────────────────────────
  // 9) تنبيهات حرجة (Alerts) استنادًا إلى الأرقام
  // ──────────────────────────────────────────
  const alerts = [];

  const newOrProcessingCount =
    (ordersByStatusCode[ORDER_STATUS_CODES.AT_SELLER_NEW] || 0) +
    (ordersByStatusCode[ORDER_STATUS_CODES.AT_SELLER_PROCESSING] || 0);

  if (newOrProcessingCount > 20) {
    alerts.push({
      level: 'warning',
      message: `هناك ${newOrProcessingCount} طلبًا جديدًا أو قيد المعالجة في الفترة الحالية، قد تحتاج إلى متابعة.`,
    });
  }

  if (financial.unpaidPayouts > 0) {
    alerts.push({
      level: financial.unpaidPayouts > 10000 ? 'danger' : 'warning',
      message: `هناك مبالغ غير مسددة للبائعين/شركات الشحن بقيمة ${financial.unpaidPayouts.toFixed(
        2
      )}.`,
    });
  }

  if (support.open > 0) {
    alerts.push({
      level: 'info',
      message: `هناك ${support.open} تذكرة دعم مفتوحة تحتاج إلى معالجة.`,
    });
  }

  // يمكن إضافة تنبيهات أخرى لاحقًا (مثل كثرة الطلبات الملغاة)

  // ──────────────────────────────────────────
  // 10) تجميع وإرجاع الاستجابة
  // ──────────────────────────────────────────
  res.json({
    // أرقام عامة أساسية (كل الوقت)
    users,
    stores,
    orders: totalOrders,
    products,

    // ملخص الطلبات
    ordersSummary,

    // ملخصات فرعية
    financial,
    shipping,
    support,
    ads,
    notifications,

    // نشاط وتنبيهات
    recentActivity: recentActivitySlice,
    alerts,
  });
});
