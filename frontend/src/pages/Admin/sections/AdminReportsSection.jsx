// src/pages/Admin/sections/AdminReportsSection.jsx
import { useEffect, useState } from "react";
import { FileText, RefreshCw, Calendar } from "lucide-react";
import { getAdminReports } from "@/services/adminService";
import { formatCurrency, formatDate, formatNumber } from "@/utils/formatters";
import { useApp } from "@/context/AppContext";
import "./AdminReportsSection.css";

export default function AdminReportsSection() {
  const { showToast } = useApp() || {};
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("last_30_days");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    // إذا كانت الفترة مخصصة، ننتظر أن يقوم المستخدم بالضغط على "تحديث" أو تغيير التواريخ يدوياً
    if (period !== "custom") {
      loadReports();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  async function loadReports() {
    try {
      setLoading(true);
      setErrorMessage("");

      const params = { period };
      if (period === "custom") {
        if (!customStart || !customEnd) {
          // يمكن هنا إظهار تنبيه، لكن سنسمح بالمرور ليتم استخدام الافتراضي من السيرفر أو إظهار خطأ
        }
        params.startDate = customStart;
        params.endDate = customEnd;
      }

      const data = await getAdminReports(params);
      setReports(data || {});
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "تعذر تحميل التقارير.";
      setErrorMessage(msg);
      showToast?.(msg, "error");
    } finally {
      setLoading(false);
    }
  }

  const {
    stats = {},
    topCategories = [],
    topSellers = [],
    topProducts = [],
    salesOverTime = [],
  } = reports || {};

  // 📊 دالة مساعدة لرسم الأعمدة البيانية البسيطة (CSS Only)
  const maxSales = Math.max(...(salesOverTime.map((d) => d.sales) || [0]), 1);

  return (
    <section className="adm-section-panel">
      <header className="adm-section-inner-header">
        <div className="adm-section-icon">
          <FileText size={22} />
        </div>
        <div className="adm-section-title-group">
          <h2 className="adm-section-title">التقارير والإحصائيات</h2>
          <p className="adm-section-subtitle">
            تحليل شامل لأداء المتجر، المبيعات، والمنتجات الأكثر طلباً.
          </p>
        </div>
        <div className="adm-section-actions">
          <button
            type="button"
            className="adm-btn primary"
            onClick={loadReports}
            disabled={loading}
          >
            <RefreshCw size={18} className={loading ? "spin" : ""} />
            <span>تحديث البيانات</span>
          </button>
        </div>
      </header>


      {errorMessage && (
        <div className="adm-messages">
          <div className="adm-error-box">
            <RefreshCw size={16} />
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      <div className="adm-toolbar">
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', width: '100%' }}>
          <div className="adm-filter-group" style={{ display: 'flex', gap: '8px' }}>
            {[
              { id: 'today', label: 'اليوم' },
              { id: 'last_7_days', label: 'أسبوع' },
              { id: 'last_30_days', label: 'شهر' },
              { id: 'this_year', label: 'سنة' },
              { id: 'custom', label: 'مخصص' }
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                className={`adm-btn sm ${period === p.id ? 'primary' : 'ghost'}`}
                onClick={() => setPeriod(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>

          {period === "custom" && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="date"
                className="adm-form-input sm"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
              />
              <span className="adm-text-soft">إلى</span>
              <input
                type="date"
                className="adm-form-input sm"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
              />
              <button className="adm-btn primary sm" onClick={loadReports}>تطبيق</button>
            </div>
          )}
        </div>
      </div>


      {loading && !reports ? (
        <div className="adm-loading" style={{ minHeight: '300px' }}>
          <RefreshCw size={32} className="spin" />
          <span>جاري جلب وتحليل البيانات...</span>
        </div>
      ) : (
        <div className="adm-section-body">
          {/* 📊 الكروت العلوية (KPIs) */}
          <div className="adm-stats-grid">
            <div className="adm-stat-card">
              <div className="adm-stat-label">إجمالي الطلبات</div>
              <div className="adm-stat-value">{formatNumber(stats.totalOrders ?? 0)}</div>
            </div>
            <div className="adm-stat-card success">
              <div className="adm-stat-label">إجمالي المبيعات</div>
              <div className="adm-stat-value">
                {formatCurrency(stats.totalSales || 0)}
              </div>
            </div>
            <div className="adm-stat-card">
              <div className="adm-stat-label">عدد العملاء</div>
              <div className="adm-stat-value">
                {formatNumber(stats.totalBuyers ?? 0)}
              </div>
            </div>
            <div className="adm-stat-card primary">
              <div className="adm-stat-label">البائعين النشطين</div>
              <div className="adm-stat-value">
                {formatNumber(stats.activeSellers ?? 0)}
              </div>
            </div>
          </div>

          {/* 📈 رسم بياني بسيط للمبيعات */}
          {salesOverTime.length > 0 && (
            <div className="adm-card" style={{ marginTop: 'var(--sp-3)' }}>
              <div className="adm-card-header">
                <h3 className="adm-card-title">حركة المبيعات خلال الفترة</h3>
              </div>
              <div className="adm-card-body">
                <div className="adm-chart-container">
                  {salesOverTime.map((d, index) => {
                    const heightPercent =
                      maxSales > 0 ? (d.sales / maxSales) * 100 : 0;
                    const dateLabel = new Date(d.date).toLocaleDateString(
                      "ar-EG",
                      { day: "numeric", month: "short" }
                    );
                    return (
                      <div key={index} className="adm-chart-bar-wrapper">
                        <div
                          className="adm-chart-bar"
                          style={{ height: `${heightPercent}%` }}
                          title={`${dateLabel}: ${formatCurrency(d.sales)}`}
                        >
                          <div className="adm-chart-tooltip">
                            <div>{formatCurrency(d.sales)}</div>
                            <div style={{ fontSize: '10px', opacity: 0.8 }}>{d.orders} طلب</div>
                          </div>
                        </div>
                        <div className="adm-chart-label">{dateLabel}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <div className="adm-section-grid" style={{ marginTop: 'var(--sp-3)' }}>
            <div className="adm-card">
              <div className="adm-card-header">
                <h3 className="adm-card-title">الأقسام الأكثر مبيعًا</h3>
              </div>
              <div className="adm-table-wrapper">
                {topCategories.length === 0 ? (
                  <div className="adm-empty-msg">لا توجد بيانات</div>
                ) : (
                  <table className="adm-table mini">
                    <thead>
                      <tr>
                        <th>القسم</th>
                        <th>طلبات</th>
                        <th>مبيعات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topCategories.map((c, i) => (
                        <tr key={i}>
                          <td className="adm-font-bold">{c.name}</td>
                          <td>{formatNumber(c.orderCount ?? 0)}</td>
                          <td className="adm-text-primary">{formatCurrency(c.salesAmount || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className="adm-card">
              <div className="adm-card-header">
                <h3 className="adm-card-title">أفضل البائعين</h3>
              </div>
              <div className="adm-table-wrapper">
                {topSellers.length === 0 ? (
                  <div className="adm-empty-msg">لا توجد بيانات</div>
                ) : (
                  <table className="adm-table mini">
                    <thead>
                      <tr>
                        <th>المتجر</th>
                        <th>طلبات</th>
                        <th>مبيعات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topSellers.map((s, i) => (
                        <tr key={i}>
                          <td className="adm-font-bold">{s.storeName || s.name}</td>
                          <td>{formatNumber(s.orderCount ?? 0)}</td>
                          <td className="adm-text-primary">{formatCurrency(s.salesAmount || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

          <div className="adm-card" style={{ marginTop: 'var(--sp-2)' }}>
            <div className="adm-card-header">
              <h3 className="adm-card-title">المنتجات الأكثر مبيعًا</h3>
            </div>
            <div className="adm-table-wrapper">
              {topProducts.length === 0 ? (
                <div className="adm-empty-msg">لا توجد بيانات</div>
              ) : (
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th>المنتج</th>
                      <th style={{ width: '150px' }}>الكمية</th>
                      <th style={{ width: '150px' }}>الإيرادات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProducts.map((p, i) => (
                      <tr key={i}>
                        <td className="adm-font-bold">{p.name}</td>
                        <td>{formatNumber(p.salesCount ?? 0)}</td>
                        <td className="adm-text-primary">{formatCurrency(p.totalRevenue || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
