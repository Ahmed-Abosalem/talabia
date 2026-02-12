// frontend/src/pages/Seller/SellerOverviewSection.jsx
// قسم "نظرة عامة" في لوحة البائع (إصدار إنتاجي منفصل)
import "./SellerOverviewSection.css";

import {
  BarChart3,
  Package,
  ShoppingBag,
  Truck,
  CheckCircle2,
  Calendar,
} from "lucide-react";

/**
 * props:
 *  - summary: {
 *      totalProducts,
 *      totalOrders,
 *      pendingOrders,
 *      deliveredOrders,
 *      totalRevenue,
 *      storeStatus,
 *      storeName,
 *    }
 *  - isLoading: boolean
 *  - onGoToTab: (tab: "overview" | "products" | "orders" | "settings") => void
 *  - dateFilter: "all" | "today" | "7d" | "30d" | "year" | "custom"
 *  - customFrom: string (YYYY-MM-DD) | ""
 *  - customTo: string (YYYY-MM-DD) | ""
 *  - onQuickFilterChange: (value) => void
 *  - onCustomRangeChange: (from, to) => void
 */
export default function SellerOverviewSection({
  summary,
  isLoading,
  onGoToTab,
  dateFilter,
  customFrom,
  customTo,
  onQuickFilterChange,
  onCustomRangeChange,
}) {
  const safeSummary = summary || {};
  const currentFilter = dateFilter || "all";
  const fromValue = customFrom || "";
  const toValue = customTo || "";

  const handleSelectChange = (e) => {
    const value = e.target.value;
    if (typeof onQuickFilterChange === "function") {
      onQuickFilterChange(value);
    }
  };

  const handleFromChange = (e) => {
    const value = e.target.value;
    if (typeof onCustomRangeChange === "function") {
      onCustomRangeChange(value, toValue);
    }
  };

  const handleToChange = (e) => {
    const value = e.target.value;
    if (typeof onCustomRangeChange === "function") {
      onCustomRangeChange(fromValue, value);
    }
  };

  return (
    <section className="seller-section seller-overview">
      {/* فلتر الفترة الزمنية خاص بتبويب نظرة عامة */}
      <div className="seller-overview-filter">
        <div className="seller-overview-filter-row">
          <div className="seller-overview-filter-label">
            <Calendar size={14} />
            <span>عرض الإحصائيات حسب الفترة:</span>
          </div>
          <div className="seller-overview-filter-control">
            <select
              className="seller-overview-filter-select"
              value={currentFilter}
              onChange={handleSelectChange}
            >
              <option value="all">كل الوقت</option>
              <option value="today">اليوم</option>
              <option value="7d">آخر ٧ أيام</option>
              <option value="30d">آخر ٣٠ يومًا</option>
              <option value="year">هذه السنة</option>
              <option value="custom">مخصص</option>
            </select>
          </div>
        </div>

        {currentFilter === "custom" && (
          <div className="seller-overview-filter-custom">
            <label>
              من
              <input
                type="date"
                value={fromValue}
                onChange={handleFromChange}
              />
            </label>
            <label>
              إلى
              <input type="date" value={toValue} onChange={handleToChange} />
            </label>
          </div>
        )}

        <div className="seller-overview-filter-divider" />
      </div>

      {/* كروت الأرقام الأساسية */}
      <div className="seller-summary-grid">
        {/* إجمالي المنتجات */}
        <article className="seller-summary-card">
          <div className="seller-summary-icon summary-blue">
            <Package size={20} />
          </div>
          <div className="seller-summary-body">
            <span className="seller-summary-label">إجمالي المنتجات</span>
            <span className="seller-summary-value">
              {isLoading ? "..." : safeSummary.totalProducts ?? 0}
            </span>
          </div>
        </article>

        {/* إجمالي الطلبات */}
        <article className="seller-summary-card">
          <div className="seller-summary-icon summary-amber">
            <ShoppingBag size={20} />
          </div>
          <div className="seller-summary-body">
            <span className="seller-summary-label">إجمالي الطلبات</span>
            <span className="seller-summary-value">
              {isLoading ? "..." : safeSummary.totalOrders ?? 0}
            </span>
          </div>
        </article>

        {/* الطلبات قيد التنفيذ */}
        <article className="seller-summary-card">
          <div className="seller-summary-icon summary-sky">
            <Truck size={20} />
          </div>
          <div className="seller-summary-body">
            <span className="seller-summary-label">طلبات قيد التنفيذ</span>
            <span className="seller-summary-value">
              {isLoading ? "..." : safeSummary.pendingOrders ?? 0}
            </span>
          </div>
        </article>

        {/* الطلبات المكتملة */}
        <article className="seller-summary-card">
          <div className="seller-summary-icon summary-green">
            <CheckCircle2 size={20} />
          </div>
          <div className="seller-summary-body">
            <span className="seller-summary-label">طلبات مكتملة</span>
            <span className="seller-summary-value">
              {isLoading ? "..." : safeSummary.deliveredOrders ?? 0}
            </span>
          </div>
        </article>

        {/* إجمالي الإيرادات */}
        <article className="seller-summary-card revenue-card">
          <div className="seller-summary-icon summary-teal">
            <BarChart3 size={20} />
          </div>
          <div className="seller-summary-body">
            <span className="seller-summary-label">إجمالي الإيرادات</span>
            <span className="seller-summary-value">
              {isLoading
                ? "..."
                : (safeSummary.totalRevenue || 0).toLocaleString("ar-SA", {
                    style: "currency",
                    currency: "SAR",
                  })}
            </span>
          </div>
        </article>
      </div>

      {/* سطر توضيحي بسيط في الأسفل */}
      <p className="seller-overview-footer">
        البيانات معتمدة على المنتجات والطلبات الفعلية المرتبطة بمتجرك على منصة طلبية.
      </p>
    </section>
  );
}
