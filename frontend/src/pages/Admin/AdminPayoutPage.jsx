import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
    ArrowRight,
    Save,
    DollarSign,
    AlertTriangle,
    RefreshCw,
    Wallet,
    Banknote,
    ArrowUpRight,
    ArrowDownRight,
    Briefcase,
    ShieldCheck,
    History
} from "lucide-react";
import { createAdminFinancialSettlement } from "@/services/adminService";
import { formatCurrency } from "@/utils/formatters";
import { useApp } from "@/context/AppContext";

import { getRoleLabel } from "./utils/financialHelpers";

import "./AdminPayoutPage.css";

export default function AdminPayoutPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const { showToast } = useApp() || {};

    const account = location.state?.account;

    useEffect(() => {
        if (!account) {
            navigate("/admin?section=financial");
        }
    }, [account, navigate]);

    const [formData, setFormData] = useState({
        operationType: "PAYOUT",
        amount: "",
        note: "",
        paymentMethod: "BANK_TRANSFER",
    });

    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);

    const handleChange = (e) => {
        setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleAmountChange = (e) => {
        const val = e.target.value.replace(/[^0-9.]/g, "");
        const parts = val.split(".");
        if (parts.length > 2) return;
        setFormData((prev) => ({ ...prev, amount: val }));
    };

    const validateAndConfirm = (e) => {
        e.preventDefault();
        const numAmount = parseFloat(formData.amount);
        if (!numAmount || numAmount <= 0) {
            showToast?.("يرجى إدخال مبلغ صحيح أكبر من الصفر", "error");
            return;
        }

        if (formData.operationType === "PAYOUT" && numAmount > account.currentBalance) {
            showToast?.("لا يمكن تحويل مبلغ أكبر من رصيد المستحقات الحالي", "error");
            return;
        }

        setModalOpen(true);
    };

    const executeSettlement = async () => {
        try {
            setLoading(true);
            const payload = {
                role: account.role,
                partyId: account.partyId || null,
                operationType: formData.operationType,
                amount: parseFloat(formData.amount),
                note: formData.note,
                paymentMethod: formData.paymentMethod,
            };

            await createAdminFinancialSettlement(payload);
            showToast?.("تم حفظ العملية المالية بنجاح", "success");
            setModalOpen(false);
            navigate("/admin?section=financial", { replace: true });
        } catch (err) {
            const msg = err?.response?.data?.message || err?.message || "تعذر حفظ التسوية";
            showToast?.(msg, "error");
            setModalOpen(false);
        } finally {
            setLoading(false);
        }
    };

    if (!account) return null;

    const parsedAmount = parseFloat(formData.amount) || 0;
    let newBalance = account.currentBalance;

    if (formData.operationType === "PAYOUT") {
        newBalance = account.currentBalance - parsedAmount;
    } else if (formData.operationType === "REFUND") {
        newBalance = account.currentBalance - parsedAmount;
    }

    const roleName = getRoleLabel(account.role);

    return (
        <div className="adm-page-root admin-payout-page">
            {/* 🏔️ OFFICIAL COMPACT HEADER (10/10 Standard) */}
            <header className="adm-header">
                <div className="adm-header-inner">
                    <div className="adm-header-right">
                        <button onClick={() => navigate(-1)} className="adm-btn-back" title="العودة">
                            <ArrowRight size={20} />
                        </button>
                        <div className="adm-header-titles">
                            <h1 className="adm-page-title">تسوية مالية ذكية</h1>
                            <div className="adm-header-meta">
                                <span className="adm-role-badge">{roleName}</span>
                                <div className="adm-header-separator"></div>
                                <span className="adm-header-subtitle">{account.name}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <div className="adm-main-container">
                <main className="adm-details-grid">

                    {/* 👤 Card 1: Account Context (Span 4) */}
                    <section className="adm-card span-4">
                        <div className="adm-card-header">
                            <Briefcase size={20} />
                            <h2>بيانات الحساب</h2>
                        </div>
                        <div className="adm-card-body">
                            <div className="adm-info-grid single-col">
                                <div className="adm-info-point">
                                    <span className="label">رصيد الحساب الحالي</span>
                                    <span className="value price-large">{formatCurrency(account.currentBalance)}</span>
                                </div>
                                <div className="fin-summary-mini-list">
                                    <div className="fin-mini-item">
                                        <ArrowUpRight size={14} className="text-success" />
                                        <span className="lbl">إجمالي المستحقات:</span>
                                        <span className="val">{formatCurrency(account.totalDue)}</span>
                                    </div>
                                    <div className="fin-mini-item">
                                        <ArrowDownRight size={14} className="text-danger" />
                                        <span className="lbl">إجمالي المسدد:</span>
                                        <span className="val">{formatCurrency(account.totalSent)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* 📋 Card 2: Settlement Form (Span 8) */}
                    <section className="adm-card span-8">
                        <div className="adm-card-header">
                            <Banknote size={20} />
                            <h2>إنشاء عملية تسوية جديدة</h2>
                        </div>
                        <div className="adm-card-body">
                            <form onSubmit={validateAndConfirm} className="adm-form-modular">
                                <div className="adm-form-group">
                                    <label className="adm-form-label">نوع العملية المالية</label>
                                    <div className="fin-type-toggle-grid">
                                        <button
                                            type="button"
                                            className={`type-btn ${formData.operationType === 'PAYOUT' ? 'active' : ''}`}
                                            onClick={() => setFormData(p => ({ ...p, operationType: 'PAYOUT' }))}
                                        >
                                            <ArrowDownRight size={16} />
                                            <span>تسديد مستحقات</span>
                                        </button>
                                        <button
                                            type="button"
                                            className={`type-btn ${formData.operationType === 'REFUND' ? 'active' : ''}`}
                                            onClick={() => setFormData(p => ({ ...p, operationType: 'REFUND' }))}
                                        >
                                            <ArrowUpRight size={16} />
                                            <span>استرجاع (Refund)</span>
                                        </button>
                                        <button
                                            type="button"
                                            className={`type-btn ${formData.operationType === 'SUPPLY' ? 'active' : ''}`}
                                            onClick={() => setFormData(p => ({ ...p, operationType: 'SUPPLY' }))}
                                        >
                                            <History size={16} />
                                            <span>توريد (Supply)</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="adm-form-row">
                                    <div className="adm-form-group">
                                        <label className="adm-form-label">المبلغ (ر.س)</label>
                                        <div className="adm-input-wrapper highlight-input">
                                            <input
                                                type="text"
                                                className="adm-form-input bold-price"
                                                name="amount"
                                                value={formData.amount}
                                                onChange={handleAmountChange}
                                                placeholder="0.00"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="adm-form-group">
                                        <label className="adm-form-label">طريقة المحاصة</label>
                                        <select className="adm-form-input" name="paymentMethod" value={formData.paymentMethod} onChange={handleChange} required>
                                            <option value="BANK_TRANSFER">الحوالة البنكية</option>
                                            <option value="ONLINE">الدفع بالبطاقة</option>
                                            <option value="WALLET">الدفع بالمحفظة</option>
                                            <option value="COD">نقداً (كاش)</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="adm-form-group">
                                    <label className="adm-form-label">ملاحظات توثيقية</label>
                                    <textarea
                                        className="adm-form-input"
                                        name="note"
                                        value={formData.note}
                                        onChange={handleChange}
                                        placeholder="اكتب تفاصيل العملية، رقم المراجعة، أو أي ملاحظات هامة..."
                                        rows="2"
                                    ></textarea>
                                </div>

                                <div className="adm-actions-group">
                                    <button type="submit" className="adm-btn-mgmt primary" disabled={loading || !formData.amount}>
                                        <Save size={18} />
                                        <span>اعتماد العملية المالية</span>
                                    </button>
                                    <button type="button" className="adm-btn-mgmt outline" onClick={() => navigate(-1)}>
                                        إلغاء التغييرات
                                    </button>
                                </div>
                            </form>
                        </div>
                    </section>

                    {/* 📉 Card 3: Simulator (Span 12 - Focused) */}
                    <section className="adm-card span-12">
                        <div className="adm-card-header">
                            <RefreshCw size={20} />
                            <h2>محاكي التأثير المالي المباشر</h2>
                        </div>
                        <div className="adm-card-body">
                            <div className="fin-simulator-dashboard">
                                <div className="sim-block">
                                    <span className="lbl">الرصيد الحالي</span>
                                    <span className="val">{formatCurrency(account.currentBalance)}</span>
                                </div>
                                <div className="sim-operator">
                                    {formData.operationType === 'REFUND' ? '+' : (formData.operationType === 'SUPPLY' ? '=' : '-')}
                                </div>
                                <div className="sim-block entry">
                                    <span className="lbl">المبلغ المدخل</span>
                                    <span className="val">{formatCurrency(parsedAmount)}</span>
                                </div>
                                <div className="sim-operator">=</div>
                                <div className="sim-block result">
                                    <span className="lbl">الرصيد المتوقع</span>
                                    <span className={`val ${newBalance < 0 ? 'alert' : 'final'}`}>
                                        {formatCurrency(newBalance)}
                                    </span>
                                </div>
                            </div>

                            <div className="adm-notice-box caution" style={{ marginTop: '1.5rem' }}>
                                <ShieldCheck size={18} />
                                <div className="adm-notice-content">
                                    هذا المحاكي يقدم رؤية تقريبية للرصيد بعد التنفيذ، يرجى التأكد من مطابقة السجلات البنكية قبل الضغط على "اعتماد".
                                </div>
                            </div>
                        </div>
                    </section>

                </main>
            </div>

            {/* ─── تأكيد العملية (Golden Standard Modal) ─── */}
            {modalOpen && (
                <div className="adm-modal-backdrop" onClick={() => !loading && setModalOpen(false)}>
                    <div className="adm-modal" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
                        <div className="adm-modal-header">
                            <h2 className="adm-modal-title warning">
                                <AlertTriangle size={20} />
                                <span>تأكيد العملية النهائية</span>
                            </h2>
                        </div>
                        <div className="adm-modal-body">
                            <div className="adm-notice-box warning">
                                <div className="adm-notice-content">
                                    أنت على وشك تنفيذ عملية <strong>{formData.operationType === 'PAYOUT' ? 'صرف' : formData.operationType === 'REFUND' ? 'استرجاع' : 'توريد'}</strong>
                                    بقيمة <strong style={{ color: 'var(--adm-accent-deep)' }}>{formatCurrency(parsedAmount)}</strong>.
                                </div>
                            </div>
                            <div className="fin-modal-summary">
                                <div className="sim-row">
                                    <span>الرصيد بعد التنفيذ:</span>
                                    <strong className={newBalance < 0 ? "text-danger" : "text-primary"}>
                                        {formatCurrency(newBalance)}
                                    </strong>
                                </div>
                            </div>
                        </div>
                        <div className="adm-modal-footer">
                            <button className="adm-btn ghost" onClick={() => setModalOpen(false)} disabled={loading}>تراجع</button>
                            <button className="adm-btn-mgmt primary" onClick={executeSettlement} disabled={loading}>
                                {loading ? <RefreshCw className="spin" size={18} /> : <span>تأكيد واعتماد الآن</span>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
