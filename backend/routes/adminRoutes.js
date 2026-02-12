// ────────────────────────────────────────────────
// 📁 backend/routes/adminRoutes.js
// مسارات المشرف العام ولوحة الإدارة في نظام طلبية (Talabia)
// ────────────────────────────────────────────────

import express from 'express';
import {
  // إحصاءات ومستخدمين
  getSystemStats,
  getAllUsers,
  updateUserRole,
  // 🔹 جديد: تفاصيل المستخدم + حالة المستخدم
  getAdminUserDetails,
  updateUserStatus,

  // المشرفون (الموظفون)
  getAdminStaffList,
  createAdminStaff,
  updateAdminStaffPermissions,
  toggleAdminStaffStatus,
  deleteAdminStaff,

  // البائعون
  getAdminSellers,
  updateSellerStatus,
  approveSeller,
  rejectSeller,

  // المنتجات
  getAdminProducts,
  getAdminProductDetails, // ✅ جديد: تفاصيل منتج واحد مع إحصاءات
  updateProductStatus,
  deleteProductAsAdmin,

  // الطلبات
  getAdminOrders,
  updateOrderStatus,
  cancelOrderAsAdmin,
  // 🆕 تحديث / إلغاء منتج واحد داخل الطلب (Item-based)
  updateOrderItemStatusAsAdmin,
  cancelOrderItemAsAdmin,

  // شركات الشحن
  getAdminShippingCompanies,
  createShippingCompany,
  updateShippingCompany,
  toggleShippingCompany,
  deleteShippingCompany,

  // الإدارة المالية
  getAdminTransactions,
  getAdminFinancialSummary,
  getFinancialAccounts,
  createFinancialSettlement,

  // التقارير
  getAdminReportsOverview,
  getAdminSalesByCategory,

  // الأقسام
  getAdminCategories,
  createAdminCategory,
  updateAdminCategory,
  deleteAdminCategory,

  // التنبيهات
  getAdminNotifications,
  createAdminNotification,
  deleteAdminNotification,

  // الدعم الفني
  getAdminSupportTickets,
  updateSupportTicketStatus,
} from '../controllers/adminController.js';
import { protect } from '../middleware/authMiddleware.js';
import { allowRoles, requireAdminPermission } from '../middleware/roleMiddleware.js';

// ✅ استخدام رافع الأقسام + معالج أخطاء multer
import { uploadCategoryImage, handleMulterError } from '../middleware/uploadMiddleware.js';

// 🔹 استيراد دوال الرد والحذف من كونترولر الدعم المتخصص
import {
  replyToSupportTicket,
  deleteSupportTicket,
} from '../controllers/admin/adminSupportController.js';

const router = express.Router();

// helper: حماية أدمن فقط (الخطوة الأولى)
const adminOnly = [protect, allowRoles('admin')];

// ────────────────────────────────────────────────
// 🧩 مجموعات الصلاحيات لمسارات لوحة الأدمن
// ────────────────────────────────────────────────

// الإحصاءات (نربطها بالتقارير)
const adminStatsView = [
  ...adminOnly,
  requireAdminPermission('reports', 'view'),
];

// المستخدمون
const adminUsersView = [
  ...adminOnly,
  requireAdminPermission('users', 'view'),
];
const adminUsersManageStatus = [
  ...adminOnly,
  requireAdminPermission('users', 'partial'),
];
const adminUsersManageRole = [
  ...adminOnly,
  requireAdminPermission('users', 'full'),
];

// الموظفون (المشرفون الإداريون)
// ملاحظة: الكنترولر نفسه يزيد حماية isOwner، وهذه الطبقة للتوثيق والاتساق فقط.
const adminStaffManage = [
  ...adminOnly,
  requireAdminPermission('admins', 'full'),
];

// البائعون
const adminSellersView = [
  ...adminOnly,
  requireAdminPermission('sellers', 'view'),
];
const adminSellersManage = [
  ...adminOnly,
  requireAdminPermission('sellers', 'partial'),
];

// المنتجات
const adminProductsView = [
  ...adminOnly,
  requireAdminPermission('products', 'view'),
];
const adminProductsManageStatus = [
  ...adminOnly,
  requireAdminPermission('products', 'partial'),
];
const adminProductsDelete = [
  ...adminOnly,
  requireAdminPermission('products', 'full'),
];

// الطلبات
const adminOrdersView = [
  ...adminOnly,
  requireAdminPermission('orders', 'view'),
];
const adminOrdersManage = [
  ...adminOnly,
  requireAdminPermission('orders', 'partial'),
];

// شركات الشحن
const adminShippingView = [
  ...adminOnly,
  requireAdminPermission('shipping', 'view'),
];
const adminShippingManage = [
  ...adminOnly,
  requireAdminPermission('shipping', 'full'),
];

// الإدارة المالية
const adminFinancialView = [
  ...adminOnly,
  requireAdminPermission('financial', 'view'),
];
const adminFinancialSettle = [
  ...adminOnly,
  requireAdminPermission('financial', 'full'),
];

// التقارير
const adminReportsView = [
  ...adminOnly,
  requireAdminPermission('reports', 'view'),
];

// الأقسام
const adminCategoriesView = [
  ...adminOnly,
  requireAdminPermission('categories', 'view'),
];
const adminCategoriesManage = [
  ...adminOnly,
  requireAdminPermission('categories', 'full'),
];

// التنبيهات
const adminNotificationsView = [
  ...adminOnly,
  requireAdminPermission('notifications', 'view'),
];
const adminNotificationsManage = [
  ...adminOnly,
  requireAdminPermission('notifications', 'partial'),
];

// الدعم الفني
const adminSupportView = [
  ...adminOnly,
  requireAdminPermission('support', 'view'),
];
const adminSupportManage = [
  ...adminOnly,
  requireAdminPermission('support', 'partial'),
];
const adminSupportDelete = [
  ...adminOnly,
  requireAdminPermission('support', 'full'),
];

// ────────────────────────────────────────────────
// 📊 إحصاءات عامة
// ────────────────────────────────────────────────
router.get('/stats', ...adminStatsView, getSystemStats);

// ────────────────────────────────────────────────
// 👥 إدارة جميع المستخدمين
// ────────────────────────────────────────────────
router.get('/users', ...adminUsersView, getAllUsers);
// 🔹 جديد: تفاصيل مستخدم معيّن
router.get('/users/:id', ...adminUsersView, getAdminUserDetails);
// 🔹 تحديث الدور (حسّاس → يتطلب full)
router.put('/users/:id/role', ...adminUsersManageRole, updateUserRole);
// 🔹 تحديث حالة المستخدم (نشط / غير نشط)
router.put('/users/:id/status', ...adminUsersManageStatus, updateUserStatus);

// ────────────────────────────────────────────────
// 👑 إدارة المشرفين (الموظفين الإداريين)
// ────────────────────────────────────────────────
router.get('/admins', ...adminStaffManage, getAdminStaffList);
router.post('/admins', ...adminStaffManage, createAdminStaff);
router.put(
  '/admins/:id/permissions',
  ...adminStaffManage,
  updateAdminStaffPermissions
);
router.put(
  '/admins/:id/toggle-status',
  ...adminStaffManage,
  toggleAdminStaffStatus
);
router.delete('/admins/:id', ...adminStaffManage, deleteAdminStaff);

// ────────────────────────────────────────────────
// 🏪 إدارة البائعين
// ────────────────────────────────────────────────
router.get('/sellers', ...adminSellersView, getAdminSellers);
router.put('/sellers/:id/status', ...adminSellersManage, updateSellerStatus);
router.put('/sellers/:id/approve', ...adminSellersManage, approveSeller);
router.put('/sellers/:id/reject', ...adminSellersManage, rejectSeller);

// ────────────────────────────────────────────────
// 📦 إدارة المنتجات
// ────────────────────────────────────────────────
router.get('/products', ...adminProductsView, getAdminProducts);

// ✅ جديد: تفاصيل منتج واحد (بيانات + إحصاءات) لعرضها في النافذة المنبثقة
router.get(
  '/products/:id/details',
  ...adminProductsView,
  getAdminProductDetails
);

router.put(
  '/products/:id/status',
  ...adminProductsManageStatus,
  updateProductStatus
);
router.delete(
  '/products/:id',
  ...adminProductsDelete,
  deleteProductAsAdmin
);

// ────────────────────────────────────────────────
// 🧾 إدارة الطلبات
// ────────────────────────────────────────────────
router.get('/orders', ...adminOrdersView, getAdminOrders);
router.put('/orders/:id/status', ...adminOrdersManage, updateOrderStatus);
router.put('/orders/:id/cancel', ...adminOrdersManage, cancelOrderAsAdmin);

// 🆕 تحديث حالة منتج واحد داخل الطلب / إلغاء منتج واحد من قبل الإدارة (Item-based)
router.patch(
  '/orders/:orderId/items/:itemId/status',
  ...adminOrdersManage,
  updateOrderItemStatusAsAdmin
);
router.patch(
  '/orders/:orderId/items/:itemId/cancel-by-admin',
  ...adminOrdersManage,
  cancelOrderItemAsAdmin
);

// ────────────────────────────────────────────────
// 🚚 شركات الشحن
// ────────────────────────────────────────────────
router.get(
  '/shipping-companies',
  ...adminShippingView,
  getAdminShippingCompanies
);
router.post(
  '/shipping-companies',
  ...adminShippingManage,
  createShippingCompany
);
router.put(
  '/shipping-companies/:id',
  ...adminShippingManage,
  updateShippingCompany
);
router.put(
  '/shipping-companies/:id/toggle',
  ...adminShippingManage,
  toggleShippingCompany
);
router.delete(
  '/shipping-companies/:id',
  ...adminShippingManage,
  deleteShippingCompany
);

// ────────────────────────────────────────────────
// 💰 الإدارة المالية والمعاملات
// ────────────────────────────────────────────────
router.get('/transactions', ...adminFinancialView, getAdminTransactions);
router.get(
  '/financial-summary',
  ...adminFinancialView,
  getAdminFinancialSummary
);
router.get('/financial/accounts', ...adminFinancialView, getFinancialAccounts);
router.post(
  '/financial/settle',
  ...adminFinancialSettle,
  createFinancialSettlement
);

// ────────────────────────────────────────────────
// 📈 التقارير والإحصاءات
// ────────────────────────────────────────────────
router.get('/reports/overview', ...adminReportsView, getAdminReportsOverview);
router.get(
  '/reports/sales-by-category',
  ...adminReportsView,
  getAdminSalesByCategory
);

// ────────────────────────────────────────────────
// 🧩 الأقسام (Categories)
// ────────────────────────────────────────────────
router.get('/categories', ...adminCategoriesView, getAdminCategories);

// 🟢 دعم رفع الصورة في الإنشاء والتعديل (مع معالجة أخطاء multer)
router.post(
  '/categories',
  ...adminCategoriesManage,
  uploadCategoryImage.single('image'),
  handleMulterError,
  createAdminCategory
);

router.put(
  '/categories/:id',
  ...adminCategoriesManage,
  uploadCategoryImage.single('image'),
  handleMulterError,
  updateAdminCategory
);

router.delete(
  '/categories/:id',
  ...adminCategoriesManage,
  deleteAdminCategory
);

// ────────────────────────────────────────────────
// 🔔 التنبيهات (Notifications)
// ────────────────────────────────────────────────
router.get(
  '/notifications',
  ...adminNotificationsView,
  getAdminNotifications
);
router.post(
  '/notifications',
  ...adminNotificationsManage,
  createAdminNotification
);
router.delete(
  '/notifications/:id',
  ...adminNotificationsManage,
  deleteAdminNotification
);

// ────────────────────────────────────────────────
// 🆘 الدعم الفني (Support Tickets)
// ────────────────────────────────────────────────
router.get(
  '/support-tickets',
  ...adminSupportView,
  getAdminSupportTickets
);
router.put(
  '/support-tickets/:id/status',
  ...adminSupportManage,
  updateSupportTicketStatus
);

// 🔹 الرد على التذكرة
router.put(
  '/support-tickets/:id/reply',
  ...adminSupportManage,
  replyToSupportTicket
);

// 🔹 حذف التذكرة
router.delete(
  '/support-tickets/:id',
  ...adminSupportDelete,
  deleteSupportTicket
);

export default router;
