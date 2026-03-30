// ────────────────────────────────────────────────
// 📁 backend/routes/adminWalletRoutes.js
// مسارات إدارة المحافظ (دور المدير — إدارة المحافظ)
// ────────────────────────────────────────────────

import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { allowRoles, requireAdminPermission } from "../middleware/roleMiddleware.js";
import {
    listWallets,
    getWalletById,
    activateWallet,
    suspendWallet,
    reactivateWallet,
    changeWalletPin,
    approveDeposit,
    rejectDeposit,
    approveWithdrawal,
    rejectWithdrawal,
    getWalletTransactions,
    getWalletActionLogs,
    getAllWalletTransactions,
    getWalletSettings,
    updateWalletSettings,
    deleteWallet,
    issueManualWalletTransaction,
} from "../controllers/admin/adminWalletController.js";

const router = express.Router();

// helper: حماية أدمن فقط
const adminOnly = [protect, allowRoles("admin")];

// صلاحيات إدارة المحافظ
const adminWalletsView = [
    ...adminOnly,
    requireAdminPermission("wallets", "view"),
];
const adminWalletsManage = [
    ...adminOnly,
    requireAdminPermission("wallets", "partial"),
];
const adminWalletsFullControl = [
    ...adminOnly,
    requireAdminPermission("wallets", "full"),
];

// ────────────────────────────────────────────────
// 📋 قائمة المحافظ
// ────────────────────────────────────────────────
router.get("/", ...adminWalletsView, listWallets);

// ────────────────────────────────────────────────
// ⚙️ إعدادات المحفظة (حد المحاولات اليومية)
// ────────────────────────────────────────────────
router.get("/settings", ...adminWalletsView, getWalletSettings);
router.put("/settings", ...adminWalletsFullControl, updateWalletSettings);

// ────────────────────────────────────────────────
// 📊 جميع العمليات (لكل المحافظ)
// ────────────────────────────────────────────────
router.get("/transactions/all", ...adminWalletsView, getAllWalletTransactions);

// ────────────────────────────────────────────────
// 🔧 عمليات على عملية مالية محددة
// ────────────────────────────────────────────────
router.put(
    "/transactions/:txId/approve-deposit",
    ...adminWalletsManage,
    approveDeposit
);
router.put(
    "/transactions/:txId/reject-deposit",
    ...adminWalletsManage,
    rejectDeposit
);
router.put(
    "/transactions/:txId/approve-withdrawal",
    ...adminWalletsManage,
    approveWithdrawal
);
router.put(
    "/transactions/:txId/reject-withdrawal",
    ...adminWalletsManage,
    rejectWithdrawal
);

// ────────────────────────────────────────────────
// 📋 تفاصيل محفظة معيّنة
// ────────────────────────────────────────────────
router.get("/:id", ...adminWalletsView, getWalletById);

// ────────────────────────────────────────────────
// 🔧 إجراءات على محفظة معيّنة
// ────────────────────────────────────────────────
router.put("/:id/activate", ...adminWalletsManage, activateWallet);
router.put("/:id/suspend", ...adminWalletsManage, suspendWallet);
router.put("/:id/reactivate", ...adminWalletsManage, reactivateWallet);
router.put("/:id/change-pin", ...adminWalletsFullControl, changeWalletPin);

// 🛡️ إجراء عملية يدوية (إيداع / سحب)
router.post("/:id/manual-transaction", ...adminWalletsFullControl, issueManualWalletTransaction);

// 🗑️ حذف المحفظة نهائياً
router.delete("/:id", ...adminWalletsFullControl, deleteWallet);

// ────────────────────────────────────────────────
// 📊 سجلات محفظة معيّنة
// ────────────────────────────────────────────────
router.get("/:id/transactions", ...adminWalletsView, getWalletTransactions);
router.get("/:id/action-logs", ...adminWalletsView, getWalletActionLogs);

export default router;
