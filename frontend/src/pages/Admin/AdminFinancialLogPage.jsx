import React, { useEffect, useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
    ArrowRight,
    RefreshCw,
    FileText,
    TrendingDown,
    TrendingUp,
    Wallet,
    Filter,
} from "lucide-react";
import { getAdminTransactions, getAdminFinancialAccounts } from "@/services/adminService";
import { formatCurrency, formatDate } from "@/utils/formatters";
import { useApp } from "@/context/AppContext";

import {
    getRoleLabel,
    formatPaymentMethod,
    getTypeLabel,
    isOutgoing,
    computeDateRange,
    DATE_PRESET_LABELS,
    PAGE_SIZE,
} from "./utils/financialHelpers";

import "./sections/AdminFinancialSection.css"; // نعيد استخدام نفس التنسيقات العامة للحسابات
import "./AdminFinancialLogPage.css"; // التنسيقات الخاصة بصفحة السجل

export default function AdminFinancialLogPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const { showToast } = useApp() || {};

    // الحساب الممرر من الصفحة السابقة (كقيمة ابتدائية للهوية)
    const initialAccount = location.state?.account;
    const [account, setAccount] = useState(initialAccount);

    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // الفلاتر - استلام القيم من الصفحة السابقة إن وجدت لمزامنة التجربة
    const passedFilters = location.state?.filters || {};
    const [datePreset, setDatePreset] = useState(passedFilters.datePreset || "all");
    const [customFrom, setCustomFrom] = useState(passedFilters.customFrom || "");
    const [customTo, setCustomTo] = useState(passedFilters.customTo || "");
    const [typeFilter, setTypeFilter] = useState("ALL");
    const [paymentFilter, setPaymentFilter] = useState(passedFilters.paymentFilter || "ALL");

    // ترقيم الصفحات (Server-side)
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalResults, setTotalResults] = useState(0);

    // حماية المسار
    useEffect(() => {
        if (!account) {
            navigate("/admin?section=financial");
        }
    }, [account, navigate]);

    // جلب البيانات من السيرفر بناءً على الحساب فقط
    useEffect(() => {
        if (!account) return;

        let cancelled = false;
        const range = computeDateRange(datePreset, customFrom, customTo);
        if (datePreset === "custom" && (!customFrom || !customTo)) return;

        async function fetchLogs() {
            try {
                setLoading(true);
                setError("");

                // نرسل الـ Role والـ PartyId المحددين للحصول على حركات هذا الحساب فقط
                // إذا كان PLATFORM / SALES فلا نرسل partyId
                const params = {
                    ...range,
                    role: account.role,
                    page: currentPage,
                    limit: PAGE_SIZE,
                };

                if (paymentFilter && paymentFilter !== "ALL") {
                    params.paymentMethod = paymentFilter;
                }

                if (typeFilter && typeFilter !== "ALL") {
                    params.type = typeFilter;
                }

                if (account.partyId) {
                    if (account.role === "SELLER") params.storeId = account.partyId;
                    else if (account.role === "SHIPPING") params.shippingCompanyId = account.partyId;
                }

                // نطلب أيضاً تحديث بيانات الملخص للحساب بناءً على نفس الفلاتر
                const accountsRes = await getAdminFinancialAccounts(params);
                const updatedAcc = accountsRes?.accounts?.find(a =>
                    (a.role === account.role && (!a.partyId || String(a.partyId) === String(account.partyId)))
                );
                if (updatedAcc && JSON.stringify(updatedAcc) !== JSON.stringify(account)) {
                    setAccount(updatedAcc);
                }

                const res = await getAdminTransactions(params);
                if (cancelled) return;

                // الباك إند يرجع { transactions: [], pagination: { pages, total } }
                const dataList = res?.transactions || [];
                setTransactions(Array.isArray(dataList) ? dataList : []);
                setTotalPages(res?.pagination?.pages || 1);
                setTotalResults(res?.pagination?.total || (dataList.length));
            } catch (err) {
                if (!cancelled) {
                    const msg = err?.response?.data?.message || err?.message || "تعذر جلب سجل الحركات";
                    setError(msg);
                    showToast?.(msg, "error");
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        fetchLogs();
        return () => {
            cancelled = true;
        };
    }, [datePreset, customFrom, customTo, paymentFilter, typeFilter, currentPage]);

    // الحركات المفلترة (أصبحت الآن تُجلب مفلترة من السيرفر، لكن نبقي الـ useMemo للتبسيط أو لو أردنا إضافة فلاتر لحظية)
    const filteredTransactions = useMemo(() => {
        return transactions;
    }, [transactions]);

    // ترقيم الصفحات - إعادة الضبط عند تغيير الفلاتر
    useEffect(() => { setCurrentPage(1); }, [typeFilter, paymentFilter, datePreset]);

    const pagedTransactions = filteredTransactions;

    // تأمين ضد الريندر الجوي
    if (!account) return null;

    return (
        <div className="adm-log-page">
            {/* ─── Header ─── */}
            <header className="adm-header">
                <div className="adm-header-inner">
                    <div className="adm-header-right">
                        <button
                            onClick={() => navigate("/admin?section=financial")}
                            className="adm-btn-back"
                            title="العودة للإدارة المالية"
                        >
                            <ArrowRight size={20} />
                        </button>
                        <div className="adm-header-titles">
                            <h1 className="adm-page-title">السجل المالي — {account.name || "حساب غير محدد"}</h1>
                            <div className="adm-header-meta">
                                <span className="adm-role-badge">{getRoleLabel(account.role)}</span>
                                {account.email && (
                                    <span className="fin-log-email">{account.email}</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <div className="adm-main-container">
                {/* ─── Account Summary Grid ─── */}
                <div className="fin-log-summary-grid">
                    <div className="fin-summary-card fin-card-revenue">
                        <div className="fin-card-icon">
                            <TrendingUp size={22} />
                        </div>
                        <div className="fin-card-content">
                            <span className="fin-card-label">إجمالي المستحقات</span>
                            <span className="fin-card-value">{formatCurrency(account.totalDue)}</span>
                        </div>
                    </div>

                    <div className="fin-summary-card fin-card-expense">
                        <div className="fin-card-icon">
                            <TrendingDown size={22} />
                        </div>
                        <div className="fin-card-content">
                            <span className="fin-card-label">إجمالي المدفوع (المرسل)</span>
                            <span className="fin-card-value">{formatCurrency(account.totalSent)}</span>
                        </div>
                    </div>

                    <div className="fin-summary-card fin-card-net">
                        <div className="fin-card-icon">
                            <Wallet size={22} />
                        </div>
                        <div className="fin-card-content">
                            <span className="fin-card-label">الرصيد الحالي المستحق</span>
                            <span className="fin-card-value">{formatCurrency(account.currentBalance)}</span>
                        </div>
                    </div>
                </div>

                {/* ─── Toolbar ─── */}
                <div className="adm-section-panel">
                    <div className="fin-toolbar">
                        <div className="fin-toolbar-row">
                            <div className="fin-filters">
                                <div className="adm-filter-group">
                                    <Filter size={14} className="adm-filter-icon" />
                                    <select
                                        className="adm-filter-select"
                                        value={typeFilter}
                                        onChange={(e) => setTypeFilter(e.target.value)}
                                    >
                                        <option value="ALL">كل أنواع العمليات</option>
                                        <option value="PAYOUT">تسوية (تحويل مبالغ)</option>
                                        <option value="REFUND">استرجاع (Refund)</option>
                                        <option value="SUPPLY">توريد (Supply)</option>
                                        <option value="ORDER_EARNING_SELLER">مستحقات طلب (بائع)</option>
                                        <option value="ORDER_EARNING_SHIPPING">مستحقات طلب (شحن)</option>
                                        <option value="ORDER_EARNING_PLATFORM">عمولة المنصة</option>
                                    </select>
                                </div>

                                <div className="adm-filter-group">
                                    <select
                                        className="adm-filter-select"
                                        value={paymentFilter}
                                        onChange={(e) => setPaymentFilter(e.target.value)}
                                    >
                                        <option value="ALL">كل طرق الدفع</option>
                                        <option value="COD">الدفع عند الاستلام</option>
                                        <option value="ONLINE">الدفع بالبطاقة</option>
                                        <option value="BANK_TRANSFER">الحوالة البنكية</option>
                                        <option value="WALLET">الدفع بالمحفظة</option>
                                    </select>
                                </div>
                            </div>

                            <div className="adm-filter-group">
                                <Filter size={14} className="adm-filter-icon" />
                                <select
                                    className="adm-filter-select"
                                    value={datePreset}
                                    onChange={(e) => setDatePreset(e.target.value)}
                                >
                                    {Object.entries(DATE_PRESET_LABELS).map(([key, label]) => (
                                        <option key={key} value={key}>
                                            {label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {datePreset === "custom" && (
                            <div className="fin-toolbar-row">
                                <div className="fin-custom-dates adm-fade-in">
                                    <input
                                        type="date"
                                        className="adm-form-input sm"
                                        value={customFrom}
                                        onChange={(e) => setCustomFrom(e.target.value)}
                                    />
                                    <span className="fin-date-sep">إلى</span>
                                    <input
                                        type="date"
                                        className="adm-form-input sm"
                                        value={customTo}
                                        onChange={(e) => setCustomTo(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ─── Transactions Table ─── */}
                    <div className="adm-table-wrapper">
                        {loading ? (
                            <div className="adm-loading">
                                <RefreshCw size={24} className="spin" />
                                <span>جاري تحميل السجل المالي...</span>
                            </div>
                        ) : error ? (
                            <div className="adm-empty-msg fin-error-state">
                                <span>{error}</span>
                            </div>
                        ) : filteredTransactions.length === 0 ? (
                            <div className="adm-empty-msg">
                                <FileText size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
                                <span>لا توجد حركات تسويقية/مالية مطابقة لخيارات البحث أو نوع الحساب.</span>
                            </div>
                        ) : (
                            <>
                                <table className="adm-table">
                                    <thead>
                                        <tr>
                                            <th>نوع العملية</th>
                                            <th>طريقة الدفع / المرجع</th>
                                            <th className="fin-col-num">قيمة العملية</th>
                                            <th>التاريخ</th>
                                            <th>الملاحظات / التفاصيل</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pagedTransactions.map((tx) => {
                                            const isMinus = isOutgoing(tx.type) && tx.role !== "PLATFORM";
                                            // Platforms earn from refunds sometimes, or we just color conditionally
                                            const amtColorClass = isMinus ? "fin-amount-refund" : "fin-amount-due";

                                            return (
                                                <tr key={tx._id} className="fin-row">
                                                    <td>
                                                        <span className="fin-tx-type">
                                                            {getTypeLabel(tx.type)}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div className="fin-tx-meta">
                                                            <span className="fin-pm-label">{formatPaymentMethod(tx.paymentMethod)}</span>
                                                            {(tx.order?._id || tx.order) && (
                                                                <span className="fin-ref-link">
                                                                    رقم الطلب: {String(tx.order?._id || tx.order).slice(-6).toUpperCase()}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className={`fin-col-num ${amtColorClass}`} style={{ fontWeight: '600' }}>
                                                        {isMinus ? "-" : "+"}{formatCurrency(tx.amount)}
                                                    </td>
                                                    <td className="fin-log-date">
                                                        {formatDate(tx.createdAt)}
                                                    </td>
                                                    <td className="fin-log-note">
                                                        {tx.note || "إنشاء تلقائي عبر النظام"}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>

                                {/* Pagination */}
                                {totalPages > 1 && (
                                    <div className="fin-pagination">
                                        <button
                                            type="button"
                                            className="fin-page-btn"
                                            disabled={currentPage <= 1}
                                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                        >
                                            <ArrowRight size={16} />
                                        </button>
                                        <span className="fin-page-info">
                                            الصفحة {currentPage} من {totalPages}
                                        </span>
                                        <button
                                            type="button"
                                            className="fin-page-btn"
                                            disabled={currentPage >= totalPages}
                                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                        >
                                            <ArrowRight size={16} style={{ transform: 'rotate(180deg)' }} />
                                        </button>
                                        <span className="fin-page-total">({totalResults} حركة)</span>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
