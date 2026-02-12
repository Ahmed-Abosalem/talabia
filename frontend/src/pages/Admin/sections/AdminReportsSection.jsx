// src/pages/Admin/sections/AdminReportsSection.jsx

import { useEffect, useState } from "react";
import { FileText, RefreshCw } from "lucide-react";
import { getAdminReports } from "@/services/adminService";
import { useApp } from "@/context/AppContext";

export default function AdminReportsSection() {
  const { showToast } = useApp() || {};
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("last_30_days");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  async function loadReports() {
    try {
      setLoading(true);
      setErrorMessage("");
      const data = await getAdminReports({ period });
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

  const stats = reports?.stats || {};
  const topCategories = reports?.topCategories || [];
  const topSellers = reports?.topSellers || [];

  return (
    <section className="admin-section-card">
      <style>{`
        .reports-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
          gap: 0.75rem;
          margin-top: 0.7rem;
          margin-bottom: 1rem;
        }
        .reports-card {
          border-radius: 14px;
          border: 1px solid #e5e7eb;
          padding: 0.7rem 0.9rem;
          background: #ffffff;
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }
        .reports-card-label {
          font-size: 0.78rem;
          color: #6b7280;
        }
        .reports-card-value {
          font-size: 1rem;
          font-weight: 700;
          color: #111827;
        }
        .reports-subtitle {
          font-size: 0.8rem;
          color: #6b7280;
          margin-bottom: 0.4rem;
        }
      `}</style>

      <div className="admin-section-header">
        <div className="admin-section-header-main">
          <div className="admin-section-icon">
            <FileText size={18} />
          </div>
          <div>
            <div className="admin-section-title">التقارير والإحصاءات</div>
            <div className="admin-section-subtitle">
              تحليل أداء المنصة خلال فترة زمنية محددة: عدد الطلبات، حجم
              المبيعات، البائعين الأكثر نشاطًا، والأقسام الأكثر مبيعًا.
            </div>
          </div>
        </div>
        <div className="admin-section-actions">
          <button
            type="button"
            className="admin-button admin-button-ghost"
            onClick={loadReports}
            disabled={loading}
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

      {/* اختيار الفترة */}
      <div className="users-toolbar" style={{ marginTop: "0.6rem" }}>
        <div className="users-toolbar-left">
          <span style={{ fontSize: "0.8rem", color: "#4b5563" }}>
            الفترة الزمنية للتقرير:
          </span>
          <select
            className="users-filter-select"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="today">اليوم</option>
            <option value="last_7_days">آخر 7 أيام</option>
            <option value="last_30_days">آخر 30 يومًا</option>
            <option value="this_month">هذا الشهر</option>
            <option value="this_year">هذه السنة</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="users-empty-state">جاري تحميل التقارير...</div>
      ) : (
        <>
          {/* كروت الإحصاءات */}
          <div className="reports-grid">
            <div className="reports-card">
              <div className="reports-card-label">إجمالي الطلبات</div>
              <div className="reports-card-value">
                {stats.totalOrders ?? 0}
              </div>
            </div>
            <div className="reports-card">
              <div className="reports-card-label">إجمالي المبيعات</div>
              <div className="reports-card-value">
                {stats.totalSales != null
                  ? `${stats.totalSales.toFixed(2)} ر.ي`
                  : "0.00 ر.ي"}
              </div>
            </div>
            <div className="reports-card">
              <div className="reports-card-label">عدد العملاء</div>
              <div className="reports-card-value">
                {stats.totalBuyers ?? 0}
              </div>
            </div>
            <div className="reports-card">
              <div className="reports-card-label">عدد البائعين النشطين</div>
              <div className="reports-card-value">
                {stats.activeSellers ?? 0}
              </div>
            </div>
          </div>

          {/* أفضل الأقسام */}
          <div style={{ marginBottom: "0.8rem" }}>
            <div className="reports-subtitle">الأقسام الأكثر مبيعًا</div>
            <div className="users-table-wrapper">
              {topCategories.length === 0 ? (
                <div className="users-empty-state">
                  لا توجد بيانات للأقسام في الفترة المحددة.
                </div>
              ) : (
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>القسم</th>
                      <th>عدد الطلبات</th>
                      <th>إجمالي المبيعات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topCategories.map((c) => (
                      <tr key={c._id || c.name}>
                        <td>{c.name}</td>
                        <td>{c.orderCount ?? 0}</td>
                        <td>
                          {c.salesAmount != null
                            ? `${c.salesAmount.toFixed(2)} ر.ي`
                            : "0.00 ر.ي"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* أفضل البائعين */}
          <div>
            <div className="reports-subtitle">البائعون الأكثر مبيعًا</div>
            <div className="users-table-wrapper">
              {topSellers.length === 0 ? (
                <div className="users-empty-state">
                  لا توجد بيانات للبائعين في الفترة المحددة.
                </div>
              ) : (
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>البائع</th>
                      <th>المتجر</th>
                      <th>عدد الطلبات</th>
                      <th>إجمالي المبيعات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topSellers.map((s) => (
                      <tr key={s._id}>
                        <td>{s.name}</td>
                        <td>{s.storeName || "-"}</td>
                        <td>{s.orderCount ?? 0}</td>
                        <td>
                          {s.salesAmount != null
                            ? `${s.salesAmount.toFixed(2)} ر.ي`
                            : "0.00 ر.ي"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
