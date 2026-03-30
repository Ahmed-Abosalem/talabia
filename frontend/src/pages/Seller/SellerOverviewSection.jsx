import {
  BarChart3,
  Package,
  ShoppingBag,
  Truck,
  CheckCircle2,
  Calendar,
  Zap,
  PlusCircle,
  Settings,
  ArrowUpRight,
  CreditCard,
  Briefcase,
} from "lucide-react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { formatCurrency, formatNumber } from "@/utils/formatters";
import { useEffect, useState } from "react";
import "./SellerOverviewSection.css";

function AnimatedCounter({ value, duration = 1000, formatter = (v) => v }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      setCount(Math.floor(progress * value));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }, [value, duration]);

  return <span>{formatter(count)}</span>;
}

export default function SellerOverviewSection() {
  const navigate = useNavigate();
  const {
    summary,
    isLoading,
    dateFilter,
    customFrom,
    customTo,
    onQuickFilterChange,
    onCustomRangeChange,
  } = useOutletContext();

  const safeSummary = summary || {};
  const currentFilter = dateFilter || "all";
  const fromValue = customFrom || "";
  const toValue = customTo || "";

  const handleSelectChange = (e) => onQuickFilterChange?.(e.target.value);
  const handleFromChange = (e) => onCustomRangeChange?.(e.target.value, toValue);
  const handleToChange = (e) => onCustomRangeChange?.(fromValue, e.target.value);

  // Time-based greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "صباح الخير" : "مساء الخير";


  return (
    <section className="seller-section">
      <div className="seller-layout-container seller-overview-container">
        {/* 1. Hero Greeting Section */}
        <header className="seller-overview-hero">
          <div className="hero-welcome-content">
            <div className="hero-text-group">
              <h1>{greeting}، {safeSummary.storeName || "شريكنا العزيز"} 👋</h1>
              <p>لديك نظرة شاملة على أداء متجرك اليوم. استمر في التوسع!</p>
            </div>
          </div>

          <div className="seller-overview-filter">
            <div className="filter-inner">
              <Calendar size={16} />
              <select
                className="seller-overview-select"
                value={currentFilter}
                onChange={handleSelectChange}
              >
                <option value="all">كل الوقت</option>
                <option value="today">اليوم</option>
                <option value="7d">آخر 7 أيام</option>
                <option value="30d">آخر 30 يوم</option>
                <option value="year">هذه السنة</option>
                <option value="custom">تاريخ مخصص...</option>
              </select>
            </div>

            {currentFilter === "custom" && (
              <div className="custom-range-inputs">
                <input type="date" value={fromValue} onChange={handleFromChange} />
                <span>إلى</span>
                <input type="date" value={toValue} onChange={handleToChange} />
              </div>
            )}
          </div>
        </header>

        {/* 2. Organized Stats Grid */}
        <div className="seller-stats-grid">
          <article className="stat-card">
            <div className="stat-icon-bg secondary"><ShoppingBag size={20} /></div>
            <div className="stat-content">
              <span className="stat-label">الطلبات</span>
              <span className="stat-value">
                {isLoading ? (
                  <div className="platinum-skeleton" style={{ width: "60px", height: "28px" }} />
                ) : (
                  <AnimatedCounter value={safeSummary.totalOrders ?? 0} formatter={formatNumber} />
                )}
              </span>
            </div>
          </article>

          <article className="stat-card">
            <div className="stat-icon-bg primary"><Package size={20} /></div>
            <div className="stat-content">
              <span className="stat-label">المنتجات</span>
              <span className="stat-value">
                {isLoading ? (
                  <div className="platinum-skeleton" style={{ width: "60px", height: "28px" }} />
                ) : (
                  formatNumber(safeSummary.totalProducts ?? 0)
                )}
              </span>
            </div>
          </article>

          <article className="stat-card">
            <div className="stat-icon-bg accent"><Truck size={20} /></div>
            <div className="stat-content">
              <span className="stat-label">قيد التنفيذ</span>
              <span className="stat-value">
                {isLoading ? (
                  <div className="platinum-skeleton" style={{ width: "40px", height: "28px" }} />
                ) : (
                  formatNumber(safeSummary.pendingOrders ?? 0)
                )}
              </span>
            </div>
          </article>

          <article className="stat-card">
            <div className="stat-icon-bg success"><CheckCircle2 size={20} /></div>
            <div className="stat-content">
              <span className="stat-label">تم التسليم</span>
              <span className="stat-value">
                {isLoading ? (
                  <div className="platinum-skeleton" style={{ width: "40px", height: "28px" }} />
                ) : (
                  formatNumber(safeSummary.completedOrders ?? 0)
                )}
              </span>
            </div>
          </article>

          <article className="stat-card financial-card">
            <div className="stat-icon-bg payout"><CreditCard size={20} /></div>
            <div className="stat-content">
              <span className="stat-label">الرصيد المستلم</span>
              <span className="stat-value">
                {isLoading ? (
                  <div className="platinum-skeleton" style={{ width: "100px", height: "28px" }} />
                ) : (
                  formatCurrency(safeSummary.receivedBalance)
                )}
              </span>
            </div>
          </article>

          <article className={`stat-card financial-card accent-border ${safeSummary.outOfStockCount > 0 ? "has-alert" : ""}`}>
            <div className="stat-icon-bg balance"><Briefcase size={20} /></div>
            <div className="stat-content">
              <span className="stat-label">الرصيد المتبقي</span>
              <span className="stat-value">
                {isLoading ? (
                  <div className="platinum-skeleton" style={{ width: "100px", height: "28px" }} />
                ) : (
                  formatCurrency((safeSummary.lifetimeRevenue ?? 0) - (safeSummary.receivedBalance ?? 0))
                )}
              </span>
            </div>
          </article>

          {safeSummary.outOfStockCount > 0 && (
            <article className="stat-card alert-card danger" onClick={() => navigate("/seller/products")}>
              <div className="stat-icon-bg danger"><Zap size={20} /></div>
              <div className="stat-content">
                <span className="stat-label">منتجات نفدت</span>
                <span className="stat-value">{formatNumber(safeSummary.outOfStockCount)}</span>
              </div>
            </article>
          )}

          {safeSummary.lowStockCount > 0 && (
            <article className="stat-card alert-card warning" onClick={() => navigate("/seller/products")}>
              <div className="stat-icon-bg warning"><Package size={20} /></div>
              <div className="stat-content">
                <span className="stat-label">مخزون منخفض</span>
                <span className="stat-value">{formatNumber(safeSummary.lowStockCount)}</span>
              </div>
            </article>
          )}
        </div>

        {/* Revenue Spotlight (Keeping as secondary premium element) */}
        <div className="revenue-spotlight-container">
          <article className="metric-card revenue-spotlight">
            <div className="metric-header">
              <div className="metric-icon-wrap">
                <BarChart3 size={24} />
              </div>
              <span className="metric-label">إجمالي الإيرادات</span>
            </div>
            <div className="metric-value-wrap">
              <h2 className="metric-value">
                {isLoading ? (
                  <div className="platinum-skeleton" style={{ width: "180px", height: "48px" }} />
                ) : (
                  <AnimatedCounter value={safeSummary.totalRevenue ?? 0} formatter={formatCurrency} />
                )}
              </h2>
            </div>
          </article>
        </div>

        <footer className="seller-overview-footer-v2">
          المصدر: البيانات الفعلية للمتجر على منصة طلبية • تم التحديث الآن
        </footer>
      </div>
    </section>
  );
}
