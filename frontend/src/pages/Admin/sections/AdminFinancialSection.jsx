// src/pages/Admin/sections/AdminFinancialSection.jsx
// واجهة الإدارة المالية في لوحة تحكم طلبية (Talabia)

import { useEffect, useMemo, useState } from "react";
import { CreditCard, Filter, Calendar, Search, RefreshCw, X } from "lucide-react";
import {
  getAdminFinancialAccounts,
  getAdminTransactions,
  createAdminFinancialSettlement,
} from "@/services/adminService";
import { useApp } from "@/context/AppContext";

import "./AdminFinancialSection.css";

// تنسيق مبسط للعملة
function formatCurrency(value) {
  if (value == null) return "-";
  const num = Number(value);
  if (Number.isNaN(num)) return "-";
  return `${num.toFixed(2)} ر.ي`;
}

// تنسيق التاريخ
function formatDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("ar-SA");
}

// تسمية الدور بالعربي
function getRoleLabel(role) {
  switch (role) {
    case "SELLER":
      return "بائع";
    case "SHIPPING":
      return "شركة شحن";
    case "PLATFORM":
      return "المنصة";
    case "SALES":
      return "إجمالي المبيعات";
    default:
      return role || "-";
  }
}

// تسمية نوع العملية بالعربي
function getTypeLabel(type) {
  switch (type) {
    case "ORDER_EARNING_SELLER":
      return "مستحقات البائع من الطلبات";
    case "ORDER_EARNING_SHIPPING":
      return "مستحقات شركة الشحن";
    case "ORDER_EARNING_PLATFORM":
      return "عمولة المنصة";
    case "PAYOUT":
      return "تحويل / إرسال";
    case "REFUND":
      return "استرجاع";
    case "SUPPLY":
      return "توريد";
    default:
      return type || "-";
  }
}

// تحويل فلتر التاريخ إلى from/to
function computeDateRange(preset, customFrom, customTo) {
  const now = new Date();

  if (preset === "custom" && customFrom && customTo) {
    return {
      from: new Date(customFrom).toISOString(),
      to: new Date(customTo).toISOString(),
    };
  }

  let from;
  const to = now.toISOString();

  if (preset === "today") {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    from = d.toISOString();
  } else if (preset === "week") {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    from = d.toISOString();
  } else if (preset === "year") {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    from = d.toISOString();
  } else {
    // الافتراضي: الشهر الحالي (آخر 30 يوم تقريباً)
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    from = d.toISOString();
  }

  return { from, to };
}

export default function AdminFinancialSection() {
  const { showToast } = useApp() || {};

  // بيانات الجدول الرئيسي (الحسابات)
  const [accounts, setAccounts] = useState([]);

  // الحركات المالية (للسجل)
  const [transactions, setTransactions] = useState([]);

  // حالات التحميل / الأخطاء
  const [loading, setLoading] = useState(true);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // فلاتر الشريط العلوي
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [datePreset, setDatePreset] = useState("month"); // today / week / month / year / custom
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("ALL"); // ALL / COD / ONLINE / OTHER

  // مودال التسوية
  const [isSettlementOpen, setIsSettlementOpen] = useState(false);

  // مودال السجل
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [accountTransactions, setAccountTransactions] = useState([]);

  const [selectedAccount, setSelectedAccount] = useState(null);
  const [settlementForm, setSettlementForm] = useState({
    operationType: "PAYOUT", // PAYOUT / REFUND / SUPPLY
    amount: "",
    paymentMethod: "OTHER", // COD / ONLINE / OTHER
    note: "",
  });
  const [savingSettlement, setSavingSettlement] = useState(false);

  function getCurrentRange() {
    return computeDateRange(datePreset, customFrom, customTo);
  }

  // تحميل البيانات عند تغيير الفلاتر
  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleFilter, datePreset, customFrom, customTo, paymentFilter]);

  async function loadAll() {
    try {
      setLoading(true);
      setErrorMessage("");
      const range = getCurrentRange();
      await Promise.all([loadAccounts(range), loadTransactions(range)]);
    } catch {
      // سيتم التعامل مع الخطأ داخل كل دالة
    } finally {
      setLoading(false);
    }
  }

  async function loadAccounts(range) {
    try {
      setLoadingAccounts(true);
      const params = { ...range };
      if (roleFilter && roleFilter !== "ALL") {
        params.role = roleFilter;
      }
      const data = await getAdminFinancialAccounts(params);
      const list = data?.accounts || data || [];
      setAccounts(Array.isArray(list) ? list : []);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "تعذر تحميل الحسابات المالية.";
      setErrorMessage(msg);
      showToast?.(msg, "error");
    } finally {
      setLoadingAccounts(false);
    }
  }

  async function loadTransactions(range) {
    try {
      setLoadingTransactions(true);
      const params = { ...range, limit: 500 };

      // لا نرسل role=SALES لأن SALES حساب تجميعي ولا توجد معاملات بدور SALES في قاعدة البيانات
      if (roleFilter && roleFilter !== "ALL" && roleFilter !== "SALES") {
        params.role = roleFilter;
      }

      if (paymentFilter && paymentFilter !== "ALL") {
        params.paymentMethod = paymentFilter;
      }
      const data = await getAdminTransactions(params);
      const list = data?.transactions || data || [];
      setTransactions(Array.isArray(list) ? list : []);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "تعذر تحميل سجل الحركات المالية.";
      setErrorMessage(msg);
      showToast?.(msg, "error");
    } finally {
      setLoadingTransactions(false);
    }
  }

  // تطبيق فلتر البحث على جدول الحسابات
  const filteredAccounts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return accounts;

    return accounts.filter((acc) => {
      const name = (acc.name || "").toLowerCase();
      const email = (acc.email || "").toLowerCase();
      const phone = (acc.phone || "").toLowerCase();
      const roleLabel = getRoleLabel(acc.role || "").toLowerCase();

      return (
        name.includes(q) ||
        email.includes(q) ||
        phone.includes(q) ||
        roleLabel.includes(q)
      );
    });
  }, [accounts, search]);

  function openSettlementModal(account) {
    setSelectedAccount(account);
    setSettlementForm({
      operationType: "PAYOUT",
      amount: "",
      paymentMethod: "OTHER",
      note: "",
    });
    setIsSettlementOpen(true);
    setIsLogOpen(false);
  }

  function closeSettlementModal() {
    if (savingSettlement) return;
    setIsSettlementOpen(false);
    setSelectedAccount(null);
  }

  async function handleSettlementSubmit(e) {
    e.preventDefault();
    if (!selectedAccount) return;

    const numericAmount = Number(settlementForm.amount);
    if (!numericAmount || numericAmount <= 0) {
      showToast?.("الرجاء إدخال مبلغ صالح للتسوية.", "error");
      return;
    }

    const payload = {
      role: selectedAccount.role,
      partyId: selectedAccount.partyId,
      operationType: settlementForm.operationType,
      amount: numericAmount,
      paymentMethod: settlementForm.paymentMethod || "OTHER",
      note: settlementForm.note || "",
    };

    try {
      setSavingSettlement(true);
      await createAdminFinancialSettlement(payload);
      showToast?.("تم تسجيل عملية التسوية بنجاح.", "success");
      closeSettlementModal();

      const range = getCurrentRange();
      await Promise.all([loadAccounts(range), loadTransactions(range)]);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "تعذر تنفيذ عملية التسوية.";
      showToast?.(msg, "error");
    } finally {
      setSavingSettlement(false);
    }
  }

  // فتح مودال السجل لحساب معيّن
  function openLogModal(account) {
    setSelectedAccount(account);

    const accRole = account.role;
    const accId = String(account.partyId || "");

    const listForAccount = transactions.filter((t) => {
      if (!t) return false;

      // 🟦 سجل البائع: كل حركات هذا المتجر
      if (accRole === "SELLER") {
        if (t.role !== "SELLER") return false;
        const storeId = t.store?._id || t.store;
        return storeId && String(storeId) === accId;
      }

      // 🟧 سجل شركة الشحن: كل حركات هذه الشركة
      if (accRole === "SHIPPING") {
        if (t.role !== "SHIPPING") return false;
        const companyId = t.shippingCompany?._id || t.shippingCompany;
        return companyId && String(companyId) === accId;
      }

      // 🟨 سجل المنصّة: كل حركات PLATFORM
      if (accRole === "PLATFORM") {
        return t.role === "PLATFORM";
      }

      // 🟥 سجل إجمالي المبيعات – COD (SALES)
      // نعرض فيه كل عمليات التوريد SUPPLY من شركات الشحن بالدفع عند الاستلام COD
      // حتى ترى كل توريدات شركات الشحن في مكان واحد، بالإضافة إلى ظهورها في سجل كل شركة.
      if (accRole === "SALES") {
        return (
          t.role === "SHIPPING" &&
          t.type === "SUPPLY" &&
          t.paymentMethod === "COD"
        );
      }

      return false;
    });

    setAccountTransactions(listForAccount);
    setIsLogOpen(true);
    setIsSettlementOpen(false);
  }

  function closeLogModal() {
    setIsLogOpen(false);
    setSelectedAccount(null);
    setAccountTransactions([]);
  }

  const isBusy =
    loading || loadingAccounts || loadingTransactions || savingSettlement;

  return (
    <section className="admin-section-card">
      {/* الهيدر العلوي */}
      <div className="admin-section-header">
        <div className="admin-section-header-main">
          <div className="admin-section-icon">
            <CreditCard size={18} />
          </div>
          <div>
            <div className="admin-section-title">الإدارة المالية</div>
            <div className="admin-section-subtitle">
              عرض أرصدة البائعين وشركات الشحن، مع إمكانية التسوية ومتابعة السجل المالي.
            </div>
          </div>
        </div>

        <div className="admin-section-actions">
          <button
            type="button"
            className="admin-button admin-button-ghost"
            onClick={loadAll}
            disabled={isBusy}
          >
            <RefreshCw size={14} />
            <span>تحديث</span>
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="admin-error" style={{ marginBottom: "0.6rem" }}>
          {errorMessage}
        </div>
      )}

      {/* شريط الفلاتر العلوي */}
      <div className="financial-toolbar">
        {/* البحث في أقصى اليمين */}
        <div className="financial-toolbar-right">
          <div className="financial-search-wrapper">
            <Search className="financial-search-icon" size={14} />
            <input
              className="financial-input"
              placeholder="بحث بالاسم، الإيميل، الهاتف..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* الفلاتر على يسار البحث */}
        <div className="financial-toolbar-left">
          <span className="financial-filter-label">
            <Filter size={14} />
            <span>الفلاتر</span>
          </span>

          <select
            className="financial-select"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="ALL">الكل (كافة الأدوار)</option>
            <option value="SELLER">البائعون</option>
            <option value="SHIPPING">شركات الشحن</option>
            <option value="PLATFORM">المنصة</option>
            <option value="SALES">إجمالي المبيعات</option>
          </select>

          <div className="financial-inline">
            <Calendar size={14} className="financial-inline-icon" />
            <select
              className="financial-select"
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value)}
            >
              <option value="today">اليوم</option>
              <option value="week">هذا الأسبوع</option>
              <option value="month">الشهر الحالي</option>
              <option value="year">هذه السنة</option>
              <option value="custom">مخصص</option>
            </select>
          </div>

          {datePreset === "custom" && (
            <>
              <input
                type="datetime-local"
                className="financial-select"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
              />
              <input
                type="datetime-local"
                className="financial-select"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
              />
            </>
          )}

          <select
            className="financial-select"
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
          >
            <option value="ALL">كل طرق الدفع</option>
            <option value="COD">الدفع عند الاستلام</option>
            <option value="ONLINE">دفع إلكتروني</option>
            <option value="OTHER">طرق أخرى</option>
          </select>
        </div>
      </div>

      {/* عنوان جدول الحسابات */}
      <div className="financial-section-title-row">
        <div>
          <h3>الحسابات المالية</h3>
          <span>
            كل صف يمثل بائعًا أو شركة شحن مع إجمالي المستحقات والمرسل والاسترجاع والتوريد.
          </span>
        </div>
        <div className="financial-small-note">
          الرصيد الحالي = إجمالي المستحقات - إجمالي المرسل - إجمالي الاسترجاع
          (التوريد لا يدخل في رصيدهم لأنه حق للمنصة).
        </div>
      </div>

      {/* جدول الحسابات */}
      <div className="users-table-wrapper">
        {loadingAccounts ? (
          <div className="users-empty-state">جاري تحميل الحسابات...</div>
        ) : filteredAccounts.length === 0 ? (
          <div className="users-empty-state">
            لا توجد حسابات مطابقة لخيارات البحث / التصفية.
          </div>
        ) : (
          <table className="users-table">
            <thead>
              <tr>
                <th>الجهة / الدور</th>
                <th>المعلومات الشخصية</th>
                <th>إجمالي المستحقات</th>
                <th>إجمالي المرسل</th>
                <th>إجمالي الاسترجاع</th>
                <th>الرصيد الحالي</th>
                <th>إجمالي التوريد</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredAccounts.map((acc) => {
                const badgeClass =
                  acc.role === "SELLER"
                    ? "financial-badge financial-badge-seller"
                    : acc.role === "SHIPPING"
                    ? "financial-badge financial-badge-shipping"
                    : acc.role === "PLATFORM"
                    ? "financial-badge financial-badge-platform"
                    : acc.role === "SALES"
                    ? "financial-badge financial-badge-sales"
                    : "financial-badge";

                return (
                  <tr key={`${acc.role}-${acc.partyId || ""}`}>
                    <td>
                      <div className="financial-entity-cell">
                        <span className="financial-entity-name">
                          {acc.name || "-"}
                        </span>
                        <span>
                          <span className={badgeClass}>{getRoleLabel(acc.role)}</span>
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="financial-contact-cell">
                        <span className="financial-contact-email">
                          {acc.email || "-"}
                        </span>
                        <span className="financial-contact-phone">
                          {acc.phone || "-"}
                        </span>
                      </div>
                    </td>
                    <td>{formatCurrency(acc.totalDue)}</td>
                    <td>{formatCurrency(acc.totalSent)}</td>
                    <td>{formatCurrency(acc.totalRefund)}</td>
                    <td>{formatCurrency(acc.currentBalance)}</td>
                    <td>{formatCurrency(acc.totalSupply)}</td>
                    <td>
                      <div className="financial-actions-cell">
                        <button
                          type="button"
                          className="admin-button admin-button-xs"
                          onClick={() => openSettlementModal(acc)}
                        >
                          تسوية
                        </button>
                        <button
                          type="button"
                          className="admin-button admin-button-ghost admin-button-xs"
                          onClick={() => openLogModal(acc)}
                          disabled={loadingTransactions}
                        >
                          السجل
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* مودال التسوية */}
      {isSettlementOpen && selectedAccount && (
        <div className="settlement-modal-backdrop" onClick={closeSettlementModal}>
          <div
            className="settlement-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="settlement-modal-header">
              <div className="settlement-modal-header-title">
                <h2>تسوية مالية للحساب</h2>
                <span>
                  {getRoleLabel(selectedAccount.role)} · {selectedAccount.name || "-"}
                </span>
                <span className="financial-small-note">
                  الرصيد الحالي: {formatCurrency(selectedAccount.currentBalance)} (لا
                  يتم احتساب التوريد ضمن رصيد الطرف لأنه حق للمنصة).
                </span>
              </div>
              <button
                type="button"
                className="settlement-modal-close"
                onClick={closeSettlementModal}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSettlementSubmit}>
              <div className="settlement-modal-body">
                <div>
                  <div className="settlement-field-label">نوع العملية</div>
                  <select
                    className="settlement-select"
                    value={settlementForm.operationType}
                    onChange={(e) =>
                      setSettlementForm((prev) => ({
                        ...prev,
                        operationType: e.target.value,
                      }))
                    }
                  >
                    <option value="PAYOUT">تحويل / إرسال للطرف (PAYOUT)</option>
                    <option value="REFUND">استرجاع مبلغ من الطرف (REFUND)</option>
                    <option value="SUPPLY">
                      توريد من الطرف إلى المنصة (SUPPLY)
                    </option>
                  </select>
                  <div className="settlement-field-hint">
                    التوريد (SUPPLY) يستخدم للإيجارات ولتوريد مبالغ الدفع عند
                    الاستلام من شركات الشحن، ولا يدخل في رصيدهم الحالي.
                  </div>
                </div>

                <div>
                  <div className="settlement-field-label">المبلغ</div>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="settlement-input"
                    value={settlementForm.amount}
                    onChange={(e) =>
                      setSettlementForm((prev) => ({
                        ...prev,
                        amount: e.target.value,
                      }))
                    }
                    placeholder="أدخل مبلغ التسوية..."
                  />
                </div>

                <div>
                  <div className="settlement-field-label">طريقة الدفع</div>
                  <select
                    className="settlement-select"
                    value={settlementForm.paymentMethod}
                    onChange={(e) =>
                      setSettlementForm((prev) => ({
                        ...prev,
                        paymentMethod: e.target.value,
                      }))
                    }
                  >
                    <option value="OTHER">أخرى</option>
                    <option value="COD">الدفع عند الاستلام</option>
                    <option value="ONLINE">دفع إلكتروني</option>
                  </select>
                </div>

                <div>
                  <div className="settlement-field-label">ملاحظة</div>
                  <textarea
                    className="settlement-textarea"
                    value={settlementForm.note}
                    onChange={(e) =>
                      setSettlementForm((prev) => ({
                        ...prev,
                        note: e.target.value,
                      }))
                    }
                    placeholder="مثال: تسوية مستحقات شهرية، توريد مبالغ الدفع عند الاستلام لطلبات رقم ..."
                  />
                </div>
              </div>

              <div className="settlement-modal-footer">
                <button
                  type="button"
                  className="settlement-btn settlement-btn-cancel"
                  onClick={closeSettlementModal}
                  disabled={savingSettlement}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="settlement-btn settlement-btn-save"
                  disabled={savingSettlement}
                >
                  {savingSettlement ? "جارٍ الحفظ..." : "حفظ التسوية"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* مودال السجل المالي للحساب – واسع تقريبًا بعرض الشاشة */}
      {isLogOpen && selectedAccount && (
        <div className="settlement-modal-backdrop" onClick={closeLogModal}>
          <div
            className="settlement-modal settlement-modal--wide"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="settlement-modal-header">
              <div className="settlement-modal-header-title">
                <h2>سجل الحركات المالية للحساب</h2>
                <span>
                  {getRoleLabel(selectedAccount.role)} · {selectedAccount.name || "-"}
                </span>
              </div>
              <button
                type="button"
                className="settlement-modal-close"
                onClick={closeLogModal}
              >
                <X size={16} />
              </button>
            </div>

            <div className="settlement-modal-body log-modal-body">
              {loadingTransactions ? (
                <div className="users-empty-state">جاري تحميل السجل...</div>
              ) : accountTransactions.length === 0 ? (
                <div className="users-empty-state">
                  لا توجد حركات مالية مسجلة ضمن النطاق الحالي لهذا الحساب.
                </div>
              ) : (
                <div className="log-table-wrapper">
                  <table className="users-table">
                    <thead>
                      <tr>
                        <th>نوع العملية</th>
                        <th>المبلغ</th>
                        <th>طريقة الدفع</th>
                        <th>التاريخ</th>
                        <th>ملاحظة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accountTransactions.map((t) => {
                        const paymentLabel =
                          t.paymentMethod === "COD"
                            ? "الدفع عند الاستلام"
                            : t.paymentMethod === "ONLINE"
                            ? "دفع إلكتروني"
                            : t.paymentMethod || "-";

                        return (
                          <tr key={t._id}>
                            <td>{getTypeLabel(t.type)}</td>
                            <td>{formatCurrency(t.amount)}</td>
                            <td>{paymentLabel}</td>
                            <td>{formatDate(t.createdAt)}</td>
                            <td>{t.note || "-"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
