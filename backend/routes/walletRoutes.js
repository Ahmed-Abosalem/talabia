// ────────────────────────────────────────────────
// 📁 backend/routes/walletRoutes.js
// مسارات المحفظة الإلكترونية (دور المشتري)
// ────────────────────────────────────────────────

import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { allowRoles } from "../middleware/roleMiddleware.js";
import {
    setupWallet,
    getWalletStatus,
    verifyWalletPin,
    getWalletDetails,
    requestDeposit,
    requestWithdrawal,
    getWalletTransactions,
    getDepositInfo,
    changeWalletPassword,
} from "../controllers/walletController.js";

const router = express.Router();

// جميع مسارات المحفظة تتطلب: مصادقة + دور مشتري
const authorizedRoles = [protect, allowRoles("buyer", "seller")];

// 🔍 حالة المحفظة (هل موجودة؟)
router.get("/status", ...authorizedRoles, getWalletStatus);

// 🔐 إنشاء محفظة جديدة
router.post("/setup", ...authorizedRoles, setupWallet);

// 🔑 التحقق من الكود والدخول
router.post("/verify", ...authorizedRoles, verifyWalletPin);

// 📋 تفاصيل المحفظة (بعد الدخول)
router.get("/details", ...authorizedRoles, getWalletDetails);

// 💰 طلب إيداع
router.post("/deposit", ...authorizedRoles, requestDeposit);

// 💸 طلب سحب
router.post("/withdraw", ...authorizedRoles, requestWithdrawal);

// 📊 سجل العمليات
router.get("/transactions", ...authorizedRoles, getWalletTransactions);

// 🏦 بيانات الإيداع البنكي
router.get("/deposit-info", ...authorizedRoles, getDepositInfo);

// 🔑 تغيير كلمة مرور المحفظة
router.put("/change-password", ...authorizedRoles, changeWalletPassword);

export default router;
