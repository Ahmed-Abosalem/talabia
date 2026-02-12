// ────────────────────────────────────────────────
// 📁 backend/controllers/adminController.js
// بوابة تجميعية لكل منطق إدارة النظام ولوحة التحكم في طلبية (Talabia)
// بعد التقسيم إلى كونترولرات فرعية داخل مجلد admin/
// ────────────────────────────────────────────────

export * from './admin/adminOverviewController.js';
export * from './admin/adminUsersController.js';
export * from './admin/adminSecurityController.js';
export * from './admin/adminSellersController.js';
export * from './admin/adminProductsController.js';
export * from './admin/adminOrdersController.js';
export * from './admin/adminShippingController.js';
export * from './admin/adminFinancialController.js';
export * from './admin/adminReportsController.js';
export * from './admin/adminCategoriesController.js';
export * from './admin/adminNotificationsController.js';
export * from './admin/adminSupportController.js';
