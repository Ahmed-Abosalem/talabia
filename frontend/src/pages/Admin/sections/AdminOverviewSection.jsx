// src/pages/Admin/sections/AdminOverviewSection.jsx
import "./AdminOverviewSection.css";
import { useEffect, useState } from "react";
import {
  BarChart3,
  Users,
  ShoppingBag,
  Store,
  Truck,
  DollarSign,
  Headset,
  Bell,
  AlertTriangle,
  Activity,
} from "lucide-react";
import { getAdminStats } from "@/services/adminService";
import { formatNumber, formatDate, formatCurrency } from "@/utils/formatters";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";

export default function AdminOverviewSection() {
  const { showToast } = useApp() || {};
  const { user, role } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("7d"); // all | day | 7d | 30d

  const isOwner = role === "admin" && user?.isOwner;
  const permissions = (user && user.permissions) || {};

  const periodLabels = {
    day: "اليوم",
    "7d": "آخر ٧ أيام",
    "30d": "آخر ٣٠ يومًا",
    all: "كل الوقت",
  };

  // هل يملك هذا المستخدم صلاحية عرض ملخص الإحصاءات؟
  const canViewStats = (() => {
    // مدير النظام يرى الإحصاءات دائمًا
    if (isOwner) return true;

    // يجب أن يكون الدور "admin" + صلاحية "reports" بمستوى view أو أعلى
    if (role !== "admin") return false;

    const level = permissions.reports;
    return level === "view" || level === "partial" || level === "full";
  })();

  useEffect(() => {
    // لو لا يملك صلاحية رؤية الإحصاءات، لا نستدعي الـ API أساسًا
    if (!canViewStats) {
      setLoading(false);
      return;
    }

    async function load() {
      try {
        setLoading(true);
        const data = await getAdminStats({ period });
        setStats(data || {});
      } catch (err) {
        const msg =
          err?.response?.data?.message ||
          err?.message ||
          "تعذر تحميل ملخص النظام.";
        showToast?.(msg, "error");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [showToast, canViewStats, period]);

  const safeStats = stats || {};

  // الأرقام الأساسية (كل الوقت)
  const usersCount = safeStats.users ?? 0;
  const storesCount = safeStats.stores ?? 0;
  const ordersTotalAllTime = safeStats.orders ?? 0;
  const productsCount = safeStats.products ?? 0;

  // ملخص الطلبات
  const ordersSummary = safeStats.ordersSummary || {};
  const ordersTotalInPeriod = ordersSummary.totalInPeriod ?? ordersTotalAllTime;
  const byStatusCode = ordersSummary.byStatusCode || {};

  const ordersNew = (byStatusCode.AT_SELLER_NEW || 0) + 0;
  const ordersProcessing = byStatusCode.AT_SELLER_PROCESSING || 0;
  const ordersInShipping = byStatusCode.IN_SHIPPING || 0;
  const ordersDelivered = byStatusCode.DELIVERED || 0;
  const ordersCancelled = byStatusCode.CANCELLED || 0;

  // ملخصات فرعية
  const financial = safeStats.financial || {};
  const shipping = safeStats.shipping || {};
  const support = safeStats.support || {};
  const ads = safeStats.ads || {};
  const notifications = safeStats.notifications || {};
  const recentActivity = safeStats.recentActivity || [];
  const alerts = safeStats.alerts || [];



  const periodLabel = periodLabels[period] || periodLabels["7d"];

  return (
    <section className="adm-section-panel">
      <div className="adm-section-inner-header">
        <div className="adm-section-icon">
          <BarChart3 size={18} />
        </div>
        <div className="adm-section-title-group">
          <div className="adm-section-title">نظرة عامة</div>
          <div className="adm-section-subtitle">
            لوحة ملخصات شاملة لأداء منصة طلبية: المستخدمون، المتاجر، الطلبات،
            الشحن، والمالية، مع إمكانية اختيار الفترة الزمنية.
          </div>
        </div>
      </div>

      {!canViewStats ? (
        <div className="adm-empty-state">
          <p>لا تملك صلاحية عرض ملخص الإحصاءات في لوحة التحكم. يرجى التواصل مع مدير النظام لطلب الصلاحية المناسبة.</p>
        </div>
      ) : loading ? (
        <div className="adm-empty-state">
          <p>جاري تحميل الإحصاءات...</p>
        </div>
      ) : (
        <>
          {/* شريط اختيار الفترة */}
          <div className="adm-overview-toolbar">
            <div className="adm-overview-period-label">
              عرض الإحصائات لـ:
            </div>
            <div className="adm-overview-period-select-wrapper">
              <select
                className="adm-form-select adm-overview-period-select"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              >
                {Object.entries(periodLabels).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* تنبيهات حرجة */}
          {alerts.length > 0 && (
            <div className="adm-overview-alerts">
              {alerts.map((alert, index) => (
                <div key={index} className={`adm-notice-box ${alert.level === 'error' ? 'danger' : alert.level || 'info'}`} style={{ marginBottom: 'var(--sp-1)' }}>
                  <div className="adm-notice-icon">
                    {alert.level === 'error' ? <AlertTriangle size={18} /> : <Activity size={18} />}
                  </div>
                  <div className="adm-notice-content">
                    {alert.message}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* شريط الأرقام الرئيسية */}
          <div className="adm-stats-grid">
            <div className="adm-stat-card">
              <div className="adm-stat-icon"><Users size={18} /></div>
              <div className="adm-stat-label">إجمالي المستخدمين</div>
              <div className="adm-stat-value">{formatNumber(usersCount)}</div>
            </div>
            <div className="adm-stat-card">
              <div className="adm-stat-icon"><Store size={18} /></div>
              <div className="adm-stat-label">إجمالي المتاجر</div>
              <div className="adm-stat-value">{formatNumber(storesCount)}</div>
            </div>
            <div className="adm-stat-card">
              <div className="adm-stat-icon"><ShoppingBag size={18} /></div>
              <div className="adm-stat-label">الطلبات في الفترة ({periodLabel})</div>
              <div className="adm-stat-value">{formatNumber(ordersTotalInPeriod)}</div>
              <div className="adm-stat-meta">إجمالي منذ البداية: {formatNumber(ordersTotalAllTime)}</div>
            </div>
            <div className="adm-stat-card">
              <div className="adm-stat-icon"><ShoppingBag size={18} /></div>
              <div className="adm-stat-label">إجمالي المنتجات</div>
              <div className="adm-stat-value">{formatNumber(productsCount)}</div>
            </div>
          </div>

          {/* ملخصات الإدارات الرئيسية */}
          <div className="adm-overview-grid-sections">
            {/* الطلبات */}
            <div className="adm-card adm-overview-section-card">
              <div className="adm-section-inner-header plain no-padding" style={{ marginBottom: 'var(--sp-2)' }}>
                <div className="adm-section-icon"><ShoppingBag size={18} /></div>
                <div className="adm-overview-section-card-title">الطلبات</div>
              </div>
              <div className="adm-overview-row"><span>الطلبات في الفترة:</span><strong>{formatNumber(ordersTotalInPeriod)}</strong></div>
              <div className="adm-overview-row"><span>جديدة / قيد المعالجة:</span><strong>{formatNumber(ordersNew + ordersProcessing)}</strong></div>
              <div className="adm-overview-row"><span>في الشحن:</span><strong>{formatNumber(ordersInShipping)}</strong></div>
              <div className="adm-overview-row"><span>تم التسليم:</span><strong>{formatNumber(ordersDelivered)}</strong></div>
              <div className="adm-overview-row"><span>ملغاة:</span><strong>{formatNumber(ordersCancelled)}</strong></div>
            </div>

            {/* الشحن */}
            <div className="adm-card adm-overview-section-card">
              <div className="adm-section-inner-header plain no-padding" style={{ marginBottom: 'var(--sp-2)' }}>
                <div className="adm-section-icon"><Truck size={18} /></div>
                <div className="adm-overview-section-card-title">الشحن</div>
              </div>
              <div className="adm-overview-row"><span>طلبات في الشحن:</span><strong>{formatNumber(shipping.inShipping || 0)}</strong></div>
              <div className="adm-overview-row"><span>تسليم في الفترة:</span><strong>{formatNumber(shipping.deliveredInPeriod || 0)}</strong></div>
              <div className="adm-overview-row"><span>شركات شحن مفعّلة:</span><strong>{formatNumber(shipping.activeCompanies || 0)}</strong></div>
            </div>

            {/* الإدارة المالية */}
            <div className="adm-card adm-overview-section-card">
              <div className="adm-section-inner-header plain no-padding" style={{ marginBottom: 'var(--sp-2)' }}>
                <div className="adm-section-icon"><DollarSign size={18} /></div>
                <div className="adm-overview-section-card-title">الإدارة المالية</div>
              </div>
              <div className="adm-overview-row"><span>إجمالي المبيعات + أجرة الشحن:</span><strong>{formatCurrency(financial.totalSales)}</strong></div>
              <div className="adm-overview-row"><span>COD (دفع عند الاستلام):</span><strong>{formatCurrency(financial.codSales)}</strong></div>
              <div className="adm-overview-row"><span>الدفع الإلكتروني:</span><strong>{formatCurrency(financial.onlineSales)}</strong></div>
              <div className="adm-overview-row"><span>عمولة المنصة:</span><strong>{formatCurrency(financial.platformCommission)}</strong></div>
            </div>

            {/* الدعم الفني */}
            <div className="adm-card adm-overview-section-card">
              <div className="adm-section-inner-header plain no-padding" style={{ marginBottom: 'var(--sp-2)' }}>
                <div className="adm-section-icon"><Headset size={18} /></div>
                <div className="adm-overview-section-card-title">الدعم الفني</div>
              </div>
              <div className="adm-overview-row"><span>تذاكر مفتوحة:</span><strong>{formatNumber(support.open)}</strong></div>
              <div className="adm-overview-row"><span>قيد المعالجة:</span><strong>{formatNumber(support.inProgress)}</strong></div>
              <div className="adm-overview-row"><span>تم الحل:</span><strong>{formatNumber(support.resolved)}</strong></div>
              <div className="adm-overview-row"><span>مغلقة:</span><strong>{formatNumber(support.closed)}</strong></div>
            </div>

            {/* الإعلانات */}
            <div className="adm-card adm-overview-section-card">
              <div className="adm-section-inner-header plain no-padding" style={{ marginBottom: 'var(--sp-2)' }}>
                <div className="adm-section-icon"><BarChart3 size={18} /></div>
                <div className="adm-overview-section-card-title">الإعلانات</div>
              </div>
              <div className="adm-overview-row"><span>إعلانات نشطة:</span><strong>{formatNumber(ads.active)}</strong></div>
              <div className="adm-overview-row"><span>غير مفعّلة:</span><strong>{formatNumber(ads.inactive)}</strong></div>
              <div className="adm-overview-row"><span>إجمالي الإعلانات:</span><strong>{formatNumber(ads.total)}</strong></div>
            </div>

            {/* التنبيهات */}
            <div className="adm-card adm-overview-section-card">
              <div className="adm-section-inner-header plain no-padding" style={{ marginBottom: 'var(--sp-2)' }}>
                <div className="adm-section-icon"><Bell size={18} /></div>
                <div className="adm-overview-section-card-title">التنبيهات</div>
              </div>
              <div className="adm-overview-row"><span>تنبيهات غير مقروءة:</span><strong>{formatNumber(notifications.unread)}</strong></div>
              <div className="adm-overview-row"><span>مرسلة في الفترة:</span><strong>{formatNumber(notifications.inPeriod)}</strong></div>
              <div className="adm-overview-row"><span>إجمالي التنبيهات:</span><strong>{formatNumber(notifications.totalAllTime)}</strong></div>
            </div>
          </div>

          {/* آخر الأنشطة */}
          <div className="adm-card adm-overview-activity">
            <div className="adm-section-inner-header plain no-padding" style={{ marginBottom: 'var(--sp-2)' }}>
              <div className="adm-section-icon"><Activity size={18} /></div>
              <div className="adm-overview-activity-title">آخر الأنشطة في المنصة</div>
            </div>
            {recentActivity.length === 0 ? (
              <div className="adm-overview-activity-empty">لا توجد أنشطة حديثة لعرضها في هذه الفترة.</div>
            ) : (
              <ul className="adm-overview-activity-list">
                {recentActivity.map((item, index) => (
                  <li key={index} className="adm-overview-activity-item">
                    <div className="adm-overview-activity-icon">
                      {item.type === "order" && <ShoppingBag size={16} />}
                      {item.type === "ticket" && <Headset size={16} />}
                      {item.type === "payout" && <DollarSign size={16} />}
                      {item.type !== "order" && item.type !== "ticket" && item.type !== "payout" && <Activity size={16} />}
                    </div>
                    <div>
                      <div className="adm-overview-activity-event">{item.title}</div>
                      {item.createdAt && (
                        <div className="adm-overview-activity-meta">{formatDate(item.createdAt)}</div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </section>
  );
}
