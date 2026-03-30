// ────────────────────────────────────────────────
// 📁 frontend/src/services/walletService.js
// خدمات المحفظة الإلكترونية (API calls)
// ────────────────────────────────────────────────

import api from "./api";

// ────────────────────────────────────────────────
// 🔍 المستخدم: حالة المحفظة
// ────────────────────────────────────────────────
export const getWalletStatus = () => api.get("/wallet/status");

// 🔐 المستخدم: إنشاء محفظة
export const setupWallet = (data) => api.post("/wallet/setup", data);

// 🔑 المستخدم: التحقق من الكود
export const verifyWalletPin = (pin) => api.post("/wallet/verify", { pin });

// 📋 المستخدم: تفاصيل المحفظة
export const getWalletDetails = () => api.get("/wallet/details");

// 💰 المستخدم: طلب إيداع
export const requestDeposit = (data) => api.post("/wallet/deposit", data);

// 💸 المستخدم: طلب سحب
export const requestWithdrawal = (data) => api.post("/wallet/withdraw", data);

// 📊 المستخدم: سجل العمليات
export const getWalletTransactions = () => api.get("/wallet/transactions");

// 🏦 المستخدم: بيانات الإيداع البنكي
export const getDepositInfo = () => api.get("/wallet/deposit-info");

// 🔑 المستخدم: تغيير كلمة مرور المحفظة
export const changeWalletPassword = (oldPin, newPin) =>
    api.put("/wallet/change-password", { oldPin, newPin });

// ────────────────────────────────────────────────
// 🔧 المدير: إدارة المحافظ
// ────────────────────────────────────────────────
export const adminListWallets = (status) =>
    api.get("/admin/wallets", { params: status ? { status } : {} });

export const adminGetWalletById = (id) => api.get(`/admin/wallets/${id}`);

export const adminActivateWallet = (id) =>
    api.put(`/admin/wallets/${id}/activate`);

export const adminSuspendWallet = (id) =>
    api.put(`/admin/wallets/${id}/suspend`);

export const adminReactivateWallet = (id) =>
    api.put(`/admin/wallets/${id}/reactivate`);

export const adminChangeWalletPin = (id) =>
    api.put(`/admin/wallets/${id}/change-pin`);

export const adminDeleteWallet = (id, walletNumber) =>
    api.delete(`/admin/wallets/${id}`, { data: { walletNumber } });

export const adminIssueManualTransaction = (id, data) =>
    api.post(`/admin/wallets/${id}/manual-transaction`, data);

// العمليات المالية
export const adminApproveDeposit = (txId, actualAmount) =>
    api.put(`/admin/wallets/transactions/${txId}/approve-deposit`, { actualAmount });

export const adminRejectDeposit = (txId, reason) =>
    api.put(`/admin/wallets/transactions/${txId}/reject-deposit`, { reason });

export const adminApproveWithdrawal = (txId) =>
    api.put(`/admin/wallets/transactions/${txId}/approve-withdrawal`);

export const adminRejectWithdrawal = (txId, reason) =>
    api.put(`/admin/wallets/transactions/${txId}/reject-withdrawal`, { reason });

// سجلات
export const adminGetWalletTransactions = (walletId) =>
    api.get(`/admin/wallets/${walletId}/transactions`);

export const adminGetWalletActionLogs = (walletId) =>
    api.get(`/admin/wallets/${walletId}/action-logs`);

export const adminGetAllWalletTransactions = (params) =>
    api.get("/admin/wallets/transactions/all", { params });

// إعدادات
export const adminGetWalletSettings = () =>
    api.get("/admin/wallets/settings");

export const adminUpdateWalletSettings = (data) =>
    api.put("/admin/wallets/settings", data);
