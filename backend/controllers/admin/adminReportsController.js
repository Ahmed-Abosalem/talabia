// ────────────────────────────────────────────────
// 📁 admin/adminReportsController.js
// التقارير والإحصاءات
// ────────────────────────────────────────────────

import asyncHandler from 'express-async-handler';
import User from '../../models/User.js';
import Store from '../../models/Store.js';
import Order from '../../models/Order.js';
import Product from '../../models/Product.js';
import Transaction from '../../models/Transaction.js';
import Category from '../../models/Category.js';

// GET /api/admin/reports/overview
export const getAdminReportsOverview = asyncHandler(async (req, res) => {
  const [users, stores, orders, products, transactions] = await Promise.all([
    User.countDocuments(),
    Store.countDocuments(),
    Order.countDocuments(),
    Product.countDocuments(),
    Transaction.countDocuments(),
  ]);

  res.json({
    users,
    stores,
    orders,
    products,
    transactions,
  });
});

// GET /api/admin/reports/sales-by-category
export const getAdminSalesByCategory = asyncHandler(async (req, res) => {
  const categories = await Category.find().sort({ sortOrder: 1, name: 1 });

  const stats = categories.map((cat) => ({
    categoryId: cat._id,
    categoryName: cat.name,
    totalOrders: 0,
    totalProducts: 0,
    totalAmount: 0,
  }));

  res.json({ stats });
});
