// ────────────────────────────────────────────────
// 📁 admin/adminReportsController.js
// التقارير والإحصاءات الديناميكية مع الفلترة الزمنية
// ────────────────────────────────────────────────

import asyncHandler from 'express-async-handler';
import User from '../../models/User.js';
import Store from '../../models/Store.js';
import Order from '../../models/Order.js';
import Product from '../../models/Product.js';
import Transaction from '../../models/Transaction.js';
import Category from '../../models/Category.js';
import { ORDER_STATUS_CODES } from '../../utils/orderStatus.js';

/**
 * 🛠️ دالة مساعدة لتحديد نطاق التاريخ بناءً على الفلتر
 */
function getDateRange(period, startDate, endDate) {
  const now = new Date();
  let start = new Date();
  let end = new Date();

  // ضبط نهاية الوقت ليكون نهاية اليوم الحالي
  end.setHours(23, 59, 59, 999);

  switch (period) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      break;
    case 'last_7_days':
      start.setDate(now.getDate() - 7);
      break;
    case 'last_30_days':
      start.setDate(now.getDate() - 30);
      break;
    case 'this_month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'this_year':
      start = new Date(now.getFullYear(), 0, 1);
      break;
    case 'custom':
      if (startDate && endDate) {
        start = new Date(startDate);
        end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // لتشمل نهاية يوم النهاية
      } else {
        // افتراضي لآخر 30 يوم إذا لم تحدد
        start.setDate(now.getDate() - 30);
      }
      break;
    default:
      // افتراضي: آخر 30 يوم
      start.setDate(now.getDate() - 30);
  }

  return { start, end };
}

/**
 * 📊 جلب تقرير شامل (إحصائيات + أفضل الأقسام + أفضل البائعين)
 * GET /api/admin/reports/overview
 */
export const getAdminReportsOverview = asyncHandler(async (req, res) => {
  const { period, startDate, endDate } = req.query;

  // 1️⃣ تحديد النطاق الزمني
  const { start, end } = getDateRange(period, startDate, endDate);

  // 2️⃣ مرحلة الفلترة الأساسية (نستبعد الطلبات الملغاة)
  const matchStage = {
    createdAt: { $gte: start, $lte: end },
    statusCode: {
      $nin: [
        ORDER_STATUS_CODES.CANCELLED,
        ORDER_STATUS_CODES.CANCELLED_BY_ADMIN,
        'cancelled'
      ]
    }
  };

  // 3️⃣ حساب الإحصائيات العامة (Orders, Sales, Buyers, Sellers)
  const statsAggregation = await Order.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalSales: { $sum: '$totalPrice' }, // نفترض totalPrice يشمل الشحن
        buyers: { $addToSet: '$buyer' },
        stores: { $addToSet: '$store' }
      }
    },
    {
      $project: {
        _id: 0,
        totalOrders: 1,
        totalSales: 1,
        totalBuyers: { $size: '$buyers' },
        activeSellers: { $size: '$stores' }
      }
    }
  ]);

  const stats = statsAggregation[0] || {
    totalOrders: 0,
    totalSales: 0,
    totalBuyers: 0,
    activeSellers: 0
  };

  // 4️⃣ أفضل الأقسام (Top Categories)
  // نحتاج فك تفكيك orderItems ثم تجميعها حسب التصنيف
  const topCategories = await Order.aggregate([
    { $match: matchStage },
    { $unwind: '$orderItems' },
    // ملاحظة: orderItems يجب أن تحتوي على product (ObjectId) لعمل Lookup
    // أو productCategoryId مخزن مباشرة كما رأينا في الكود السابق
    {
      $project: {
        qty: '$orderItems.qty',
        price: '$orderItems.price',
        // محاولة استخراج ID القسم من المنتج أو المخزن في العنصر
        productCategoryId: '$orderItems.productCategoryId', // إذا كان مخزناً
        product: '$orderItems.product'
      }
    },
    // إذا لم يكن productCategoryId موجوداً في orderItems، نجيبه من Product
    {
      $lookup: {
        from: 'products',
        localField: 'product',
        foreignField: '_id',
        as: 'productDoc'
      }
    },
    { $unwind: { path: '$productDoc', preserveNullAndEmptyArrays: true } },
    {
      $addFields: {
        // 🛠️ تصحيح هام: البرودكت يخزن القسم كنص، نحوله لـ ObjectId لنربط مع جدول Categories
        finalCategoryId: {
          $toObjectId: { $ifNull: ['$productCategoryId', '$productDoc.category'] }
        }
      }
    },
    {
      $lookup: {
        from: 'categories',
        localField: 'finalCategoryId',
        foreignField: '_id',
        as: 'categoryDoc'
      }
    },
    { $unwind: { path: '$categoryDoc', preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: '$finalCategoryId',
        name: { $first: '$categoryDoc.name' },
        orderCount: { $sum: 1 }, // عدد مرات ظهور منتجات هذا القسم في الطلبات
        salesAmount: { $sum: { $multiply: ['$qty', '$price'] } },
        itemsSold: { $sum: '$qty' }
      }
    },
    { $match: { _id: { $ne: null } } }, // استبعاد غير المصنفين
    { $sort: { salesAmount: -1 } },
    { $limit: 5 }
  ]);

  // 5️⃣ أفضل البائعين (Top Sellers)
  const topSellers = await Order.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$store',
        orderCount: { $sum: 1 },
        salesAmount: { $sum: '$totalPrice' } // المبيعات الكلية للمتجر
      }
    },
    {
      $lookup: {
        from: 'stores',
        localField: '_id',
        foreignField: '_id',
        as: 'storeDoc'
      }
    },
    { $unwind: { path: '$storeDoc', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 1,
        name: { $ifNull: ['$storeDoc.name', 'متجر غير معروف'] }, // اسم المتجر
        storeName: '$storeDoc.storeName', // قد يكون الحقل storeName
        orderCount: 1,
        salesAmount: 1
      }
    },
    { $sort: { salesAmount: -1 } },
    { $limit: 5 }
  ]);

  // 6️⃣ أفضل المنتجات (Top Products)
  const topProducts = await Order.aggregate([
    { $match: matchStage },
    { $unwind: '$orderItems' },
    {
      $group: {
        _id: '$orderItems.product',
        salesCount: { $sum: '$orderItems.qty' },
        totalRevenue: { $sum: { $multiply: ['$orderItems.qty', '$orderItems.price'] } },
        // نحتاج الاحتفاظ بالقسم والبائع لاحقاً، حالياً نكتفي بالـ ID
      }
    },
    { $sort: { salesCount: -1 } },
    { $limit: 5 },
    {
      $lookup: {
        from: 'products',
        localField: '_id',
        foreignField: '_id',
        as: 'productDoc'
      }
    },
    { $unwind: { path: '$productDoc', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        name: { $ifNull: ['$productDoc.name', 'منتج محذوف'] },
        salesCount: 1,
        totalRevenue: 1,
        category: '$productDoc.category',
        store: '$productDoc.store'
      }
    }
  ]);

  // 7️⃣ المبيعات عبر الزمن (Sales Over Time) - تجميع يومي
  const salesOverTime = await Order.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        },
        sales: { $sum: '$totalPrice' },
        orders: { $sum: 1 }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    {
      $project: {
        date: {
          $dateFromParts: {
            year: '$_id.year',
            month: '$_id.month',
            day: '$_id.day'
          }
        },
        sales: 1,
        orders: 1,
        _id: 0
      }
    }
  ]);

  // 8️⃣ ملء الأسماء للأقسام غير الموجودة (احتياط)
  const filledCategories = topCategories.map(c => ({
    ...c,
    name: c.name || 'غير مصنف'
  }));

  res.json({
    period,
    start,
    end,
    stats,
    topCategories: filledCategories,
    topSellers,
    topProducts,
    salesOverTime
  });

});

// GET /api/admin/reports/sales-by-category
// (إذا كانت هناك حاجة لنقطة نهاية منفصلة)
export const getAdminSalesByCategory = asyncHandler(async (req, res) => {
  // يمكن إعادة استخدام المنطق أعلاه أو تركه بسيطاً
  // سنتركه حالياً فارغاً أو نوجهه لنفس الدالة إذا لزم الأمر
  // لكن بما أن الواجهة تستخدم getAdminReportsOverview سنركز عليها
  res.json({ message: "Use overview endpoint for detailed stats" });
});
