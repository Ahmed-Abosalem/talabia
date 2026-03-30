// ──────────────────────────────────────────────────────────────
// 📁 frontend/src/pages/Admin/sections/AdminFinancialSection.jsx
// الإدارة المالية — الصفحة الرئيسية (إعادة بناء كاملة)
// Golden Standard: AdminUserDetailsPage المرجعية التصميمية
// ──────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CreditCard,
  Search,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Wallet,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  FileText,
  ArrowLeftRight,
  Filter,
} from "lucide-react";
import {
  getAdminFinancialAccounts,
  getAdminFinancialSummary,
} from "@/services/adminService";
import { formatCurrency } from "@/utils/formatters";
import { useApp } from "@/context/AppContext";

import {
  getRoleLabel,
  computeDateRange,
  ROLE_CONFIG,
  DATE_PRESET_LABELS,
  PAGE_SIZE,
} from "../utils/financialHelpers";

import "./AdminFinancialSection.css";

// ──────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────
export default function AdminFinancialSection() {
  const navigate = useNavigate();
  const { showToast } = useApp() || {};

  // البيانات
  const [accounts, setAccounts] = useState([]);
  const [summary, setSummary] = useState(null);

  // حالات التحميل
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // الفلاتر
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [datePreset, setDatePreset] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("ALL");

  // ترقيم الصفحات
  const [currentPage, setCurrentPage] = useState(1);

  // ─── جلب البيانات ────────────────────────────────────
  useEffect(() => {
    const range = computeDateRange(datePreset, customFrom, customTo);
    if (datePreset === "custom" && (!customFrom || !customTo)) return;

    let cancelled = false;

    async function fetchData() {
      try {
        setLoading(true);
        setErrorMessage("");

        // باراميترات الحسابات
        const accountsParams = { ...range };
        if (roleFilter && roleFilter !== "ALL") {
          accountsParams.role = roleFilter;
        }
        if (paymentFilter && paymentFilter !== "ALL") {
          accountsParams.paymentMethod = paymentFilter;
        }

        // باراميترات الملخص
        const summaryParams = { ...range };
        if (paymentFilter && paymentFilter !== "ALL") {
          summaryParams.paymentMethod = paymentFilter;
        }
        if (roleFilter && roleFilter !== "ALL") {
          summaryParams.role = roleFilter;
        }

        const [accountsData, summaryData] = await Promise.all([
          getAdminFinancialAccounts(accountsParams),
          getAdminFinancialSummary(summaryParams),
        ]);

        if (cancelled) return;

        const accList = accountsData?.accounts || accountsData || [];
        setAccounts(Array.isArray(accList) ? accList : []);
        setSummary(summaryData || null);
      } catch (err) {
        if (cancelled) return;
        const msg =
          err?.response?.data?.message ||
          err?.message ||
          "تعذر تحميل البيانات المالية.";
        setErrorMessage(msg);
        showToast?.(msg, "error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [roleFilter, datePreset, customFrom, customTo, paymentFilter]);

  // ─── إعادة التحميل اليدوي ──────────────────────────
  async function reloadData() {
    const range = computeDateRange(datePreset, customFrom, customTo);
    try {
      setLoading(true);
      setErrorMessage("");

      const accountsParams = { ...range };
      if (roleFilter && roleFilter !== "ALL") accountsParams.role = roleFilter;
      if (paymentFilter && paymentFilter !== "ALL") accountsParams.paymentMethod = paymentFilter;

      const summaryParams = { ...range };
      if (paymentFilter && paymentFilter !== "ALL") summaryParams.paymentMethod = paymentFilter;
      if (roleFilter && roleFilter !== "ALL") summaryParams.role = roleFilter;

      const [accountsData, summaryData] = await Promise.all([
        getAdminFinancialAccounts(accountsParams),
        getAdminFinancialSummary(summaryParams),
      ]);

      const accList = accountsData?.accounts || accountsData || [];
      setAccounts(Array.isArray(accList) ? accList : []);
      setSummary(summaryData || null);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "تعذر تحميل البيانات المالية.";
      setErrorMessage(msg);
      showToast?.(msg, "error");
    } finally {
      setLoading(false);
    }
  }

  // ─── فلتر البحث + ترقيم الصفحات ──────────────────
  const filteredAccounts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter((acc) => {
      const name = (acc.name || "").toLowerCase();
      const email = (acc.email || "").toLowerCase();
      const phone = (acc.phone || "").toLowerCase();
      const roleLabel = getRoleLabel(acc.role || "").toLowerCase();
      return name.includes(q) || email.includes(q) || phone.includes(q) || roleLabel.includes(q);
    });
  }, [accounts, search]);

  // إعادة ضبط الصفحة عند تغيير الفلاتر
  useEffect(() => { setCurrentPage(1); }, [search, roleFilter, paymentFilter, datePreset]);

  const totalPages = Math.max(1, Math.ceil(filteredAccounts.length / PAGE_SIZE));
  const pagedAccounts = filteredAccounts.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // ─── الملخص المحسوب ───────────────────────────────
  const computedSummary = useMemo(() => {
    // نستخدم بيانات الملخص من الباك إند إن توافرت
    if (summary) {
      const revenues =
        (summary.totalSellerEarnings || 0) +
        (summary.totalShippingEarnings || 0) +
        (summary.totalPlatformCommission || 0);
      const expenses =
        (summary.totalSellerPayouts || 0) +
        (summary.totalShippingPayouts || 0);
      return {
        revenues,
        expenses,
        net: revenues - expenses,
        transactions: summary.totalTransactions || 0,
      };
    }

    // fallback: حساب من الحسابات
    let revenues = 0;
    let expenses = 0;
    accounts.forEach((acc) => {
      if (acc.role === "SHIPPING" || acc.role === "SALES") {
        revenues += acc.totalDue || 0;
      }
      revenues += acc.totalSupply || 0;
      expenses += acc.totalSent || 0;
    });
    return { revenues, expenses, net: revenues - expenses, transactions: 0 };
  }, [summary, accounts]);

  // ─── التنقل ──────────────────────────────────────
  function openLogPage(account) {
    navigate("/admin/financial/log", { 
      state: { 
        account,
        filters: {
          datePreset,
          customFrom,
          customTo,
          paymentFilter
        }
      } 
    });
  }
  function openPayoutPage(account) {
    navigate("/admin/financial/payout", { state: { account } });
  }

  // ──────────────────────────────────────────────────────
  // JSX
  // ──────────────────────────────────────────────────────
  return (
    <section className="adm-section-panel">
      {/* ─── Header ─────────────────────────────────── */}
      <header className="adm-section-inner-header">
        <div className="adm-section-icon">
          <CreditCard size={22} />
        </div>
        <div className="adm-section-title-group">
          <h2 className="adm-section-title">الإدارة المالية</h2>
          <p className="adm-section-subtitle">
            مراقبة الأرصدة، مستحقات الأطراف، وتسوية الحسابات المالية.
          </p>
        </div>
        <div className="adm-section-actions">
          <button
            type="button"
            className="adm-btn primary"
            onClick={reloadData}
            disabled={loading}
          >
            <RefreshCw size={18} className={loading ? "spin" : ""} />
            <span>تحديث البيانات</span>
          </button>
        </div>
      </header>

      {/* ─── Summary Cards ──────────────────────────── */}
      <div className="fin-summary-grid">
        <div className="fin-summary-card fin-card-revenue">
          <div className="fin-card-icon">
            <TrendingUp size={22} />
          </div>
          <div className="fin-card-content">
            <span className="fin-card-label">إجمالي الإيرادات</span>
            <span className="fin-card-value">{formatCurrency(computedSummary.revenues)}</span>
          </div>
        </div>

        <div className="fin-summary-card fin-card-expense">
          <div className="fin-card-icon">
            <TrendingDown size={22} />
          </div>
          <div className="fin-card-content">
            <span className="fin-card-label">إجمالي المصروفات</span>
            <span className="fin-card-value">{formatCurrency(computedSummary.expenses)}</span>
          </div>
        </div>

        <div className="fin-summary-card fin-card-net">
          <div className="fin-card-icon">
            <Wallet size={22} />
          </div>
          <div className="fin-card-content">
            <span className="fin-card-label">صافي الرصيد</span>
            <span className="fin-card-value">{formatCurrency(computedSummary.net)}</span>
          </div>
        </div>

        <div className="fin-summary-card fin-card-count">
          <div className="fin-card-icon">
            <BarChart3 size={22} />
          </div>
          <div className="fin-card-content">
            <span className="fin-card-label">عدد المعاملات</span>
            <span className="fin-card-value">{computedSummary.transactions}</span>
          </div>
        </div>
      </div>

      {/* ─── Toolbar ────────────────────────────────── */}
      <div className="fin-toolbar">
        <div className="fin-toolbar-row">
          <div className="adm-search-wrapper fin-search">
            <Search size={16} className="adm-search-icon" />
            <input
              type="text"
              className="adm-search-input"
              placeholder="بحث باسم الجهة، البريد، الهاتف..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="fin-filters">
            <select
              className="adm-filter-select"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="ALL">كل الأدوار</option>
              <option value="SELLER">البائعين</option>
              <option value="SHIPPING">شركات الشحن</option>
              <option value="PLATFORM">المنصة</option>
              <option value="SALES">المبيعات</option>
            </select>

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

        <div className="fin-toolbar-row">
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

          {datePreset === "custom" && (
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
          )}
        </div>
      </div>

      {/* ─── Accounts Table Header ──────────────────── */}
      <div className="fin-table-header">
        <div className="adm-section-title-group">
          <h3 className="adm-section-title">الحسابات المالية</h3>
          <p className="adm-section-subtitle">
            كل صف يمثل بائعًا أو شركة شحن مع إجمالي المستحقات والمرسل والاسترجاع والتوريد.
          </p>
        </div>
        <div className="fin-balance-formula">
          الرصيد الحالي = المستحقات − المرسل − الاسترجاع
        </div>
      </div>

      {/* ─── Accounts Table ─────────────────────────── */}
      <div className="adm-section-body">
        <div className="adm-table-wrapper">
          {loading ? (
            <div className="adm-loading">
              <RefreshCw size={24} className="spin" />
              <span>جاري تحميل الحسابات...</span>
            </div>
          ) : errorMessage ? (
            <div className="adm-empty-msg fin-error-state">
              <span>{errorMessage}</span>
              <button type="button" className="adm-btn primary sm" onClick={reloadData}>
                إعادة المحاولة
              </button>
            </div>
          ) : filteredAccounts.length === 0 ? (
            <div className="adm-empty-msg">
              لا توجد حسابات مطابقة لخيارات البحث / التصفية.
            </div>
          ) : (
            <>
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>الجهة / الدور</th>
                    <th>المعلومات الشخصية</th>
                    <th className="fin-col-num">المستحقات</th>
                    <th className="fin-col-num">المرسل</th>
                    <th className="fin-col-num">الاسترجاع</th>
                    <th className="fin-col-num">الرصيد</th>
                    <th className="fin-col-num">التوريد</th>
                    <th className="fin-col-actions">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedAccounts.map((acc) => {
                    const cfg = ROLE_CONFIG[acc.role] || ROLE_CONFIG.SELLER;
                    return (
                      <tr key={`${acc.role}-${acc.partyId || "platform"}`} className="fin-row">
                        <td>
                          <div className="fin-entity-cell">
                            <span className="fin-entity-name">{acc.name || "جهة غير معروفة"}</span>
                            <span className={`adm-status-chip ${cfg.color}`}>
                              <span className="adm-status-dot"></span>
                              {getRoleLabel(acc.role)}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="fin-contact-cell">
                            <span className="fin-contact-email">{acc.email || "-"}</span>
                            <span className="fin-contact-phone">{acc.phone || "-"}</span>
                          </div>
                        </td>
                        <td className="fin-col-num fin-amount-due">{formatCurrency(acc.totalDue)}</td>
                        <td className="fin-col-num">{formatCurrency(acc.totalSent)}</td>
                        <td className="fin-col-num fin-amount-refund">{formatCurrency(acc.totalRefund)}</td>
                        <td className="fin-col-num fin-amount-balance">{formatCurrency(acc.currentBalance)}</td>
                        <td className="fin-col-num fin-amount-supply">{formatCurrency(acc.totalSupply)}</td>
                        <td className="fin-col-actions">
                          <div className="adm-table-actions">
                            <button
                              type="button"
                              className="adm-icon-btn primary"
                              onClick={() => openPayoutPage(acc)}
                              title="تسوية مالية"
                            >
                              <ArrowLeftRight size={16} />
                            </button>
                            <button
                              type="button"
                              className="adm-icon-btn muted"
                              onClick={() => openLogPage(acc)}
                              title="السجل المالي"
                            >
                              <FileText size={16} />
                            </button>
                          </div>
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
                    <ChevronRight size={16} />
                  </button>
                  <span className="fin-page-info">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    className="fin-page-btn"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="fin-page-total">
                    ({filteredAccounts.length} حساب)
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
