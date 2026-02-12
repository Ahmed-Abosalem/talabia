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

  const formatNumber = (value) =>
    Number(value || 0).toLocaleString("ar-EG", { maximumFractionDigits: 2 });

  const periodLabel = periodLabels[period] || periodLabels["7d"];

  return (
    <section className="admin-section-card">
      <div className="admin-section-header">
        <div className="admin-section-header-main">
          <div className="admin-section-icon">
            <BarChart3 size={18} />
          </div>
          <div>
            <div className="admin-section-title">نظرة عامة</div>
            <div className="admin-section-subtitle">
              لوحة ملخصات شاملة لأداء منصة طلبية: المستخدمون، المتاجر، الطلبات،
              الشحن، والمالية، مع إمكانية اختيار الفترة الزمنية.
            </div>
          </div>
        </div>
      </div>

      {!canViewStats ? (
        <div className="admin-empty-state" style={{ marginTop: "1rem" }}>
          لا تملك صلاحية عرض ملخص الإحصاءات في لوحة التحكم. إذا كنت تحتاج هذه
          المعلومات لعملك اليومي، يرجى التواصل مع مدير النظام لطلب الصلاحية
          المناسبة.
        </div>
      ) : loading ? (
        <div className="admin-empty-state" style={{ marginTop: "1rem" }}>
          جاري تحميل الإحصاءات...
        </div>
      ) : (
        <>
          {/* شريط اختيار الفترة */}
          <div className="admin-overview-toolbar">
            <div className="admin-overview-period-label">
              عرض الإحصاءات لـ:
              <span className="admin-overview-period-current">
                {" "}
                {periodLabel}
              </span>
            </div>
            <div className="admin-overview-period-toggle">
              <button
                type="button"
                className={
                  "admin-overview-period-button" +
                  (period === "day" ? " is-active" : "")
                }
                onClick={() => setPeriod("day")}
              >
                اليوم
              </button>
              <button
                type="button"
                className={
                  "admin-overview-period-button" +
                  (period === "7d" ? " is-active" : "")
                }
                onClick={() => setPeriod("7d")}
              >
                آخر ٧ أيام
              </button>
              <button
                type="button"
                className={
                  "admin-overview-period-button" +
                  (period === "30d" ? " is-active" : "")
                }
                onClick={() => setPeriod("30d")}
              >
                آخر ٣٠ يومًا
              </button>
              <button
                type="button"
                className={
                  "admin-overview-period-button" +
                  (period === "all" ? " is-active" : "")
                }
                onClick={() => setPeriod("all")}
              >
                كل الوقت
              </button>
            </div>
          </div>

          {/* تنبيهات حرجة */}
          {alerts.length > 0 && (
            <div className="admin-overview-alerts">
              {alerts.map((alert, index) => (
                <div
                  key={index}
                  className={
                    "admin-overview-alert admin-overview-alert-" +
                    (alert.level || "info")
                  }
                >
                  <div className="admin-overview-alert-icon">
                    <AlertTriangle size={16} />
                  </div>
                  <div className="admin-overview-alert-text">
                    {alert.message}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* شريط الأرقام الرئيسية */}
          <div className="admin-overview-grid admin-overview-grid-main">
            <div className="admin-overview-card">
              <div className="admin-overview-icon users">
                <Users size={18} />
              </div>
              <div className="admin-overview-label">إجمالي المستخدمين</div>
              <div className="admin-overview-value">
                {formatNumber(usersCount)}
              </div>
            </div>

            <div className="admin-overview-card">
              <div className="admin-overview-icon stores">
                <Store size={18} />
              </div>
              <div className="admin-overview-label">إجمالي المتاجر</div>
              <div className="admin-overview-value">
                {formatNumber(storesCount)}
              </div>
            </div>

            <div className="admin-overview-card">
              <div className="admin-overview-icon orders">
                <ShoppingBag size={18} />
              </div>
              <div className="admin-overview-label">
                الطلبات في الفترة ({periodLabel})
              </div>
              <div className="admin-overview-value">
                {formatNumber(ordersTotalInPeriod)}
              </div>
              <div className="admin-overview-meta">
                إجمالي الطلبات منذ البداية: {formatNumber(ordersTotalAllTime)}
              </div>
            </div>

            <div className="admin-overview-card">
              <div className="admin-overview-icon products">
                <ShoppingBag size={18} />
              </div>
              <div className="admin-overview-label">إجمالي المنتجات</div>
              <div className="admin-overview-value">
                {formatNumber(productsCount)}
              </div>
            </div>
          </div>

          {/* ملخصات الإدارات الرئيسية */}
          <div className="admin-overview-grid admin-overview-grid-sections">
            {/* الطلبات */}
            <div className="admin-overview-card">
              <div className="admin-overview-card-header">
                <div className="admin-overview-icon orders">
                  <ShoppingBag size={18} />
                </div>
                <div className="admin-overview-section-title">الطلبات</div>
              </div>
              <div className="admin-overview-section-body">
                <div className="admin-overview-row">
                  <span>الطلبات في الفترة:</span>
                  <strong>{formatNumber(ordersTotalInPeriod)}</strong>
                </div>
                <div className="admin-overview-row">
                  <span>جديدة / قيد المعالجة:</span>
                  <strong>
                    {formatNumber(ordersNew + ordersProcessing)}
                  </strong>
                </div>
                <div className="admin-overview-row">
                  <span>في الشحن:</span>
                  <strong>{formatNumber(ordersInShipping)}</strong>
                </div>
                <div className="admin-overview-row">
                  <span>تم التسليم:</span>
                  <strong>{formatNumber(ordersDelivered)}</strong>
                </div>
                <div className="admin-overview-row">
                  <span>ملغاة:</span>
                  <strong>{formatNumber(ordersCancelled)}</strong>
                </div>
              </div>
            </div>

            {/* الشحن */}
            <div className="admin-overview-card">
              <div className="admin-overview-card-header">
                <div className="admin-overview-icon shipping">
                  <Truck size={18} />
                </div>
                <div className="admin-overview-section-title">الشحن</div>
              </div>
              <div className="admin-overview-section-body">
                <div className="admin-overview-row">
                  <span>طلبات في الشحن:</span>
                  <strong>
                    {formatNumber(shipping.inShipping || 0)}
                  </strong>
                </div>
                <div className="admin-overview-row">
                  <span>تم التسليم في الفترة:</span>
                  <strong>
                    {formatNumber(shipping.deliveredInPeriod || 0)}
                  </strong>
                </div>
                <div className="admin-overview-row">
                  <span>شركات شحن مفعّلة:</span>
                  <strong>
                    {formatNumber(shipping.activeCompanies || 0)}
                  </strong>
                </div>
              </div>
            </div>

            {/* الإدارة المالية */}
            <div className="admin-overview-card">
              <div className="admin-overview-card-header">
                <div className="admin-overview-icon financial">
                  <DollarSign size={18} />
                </div>
                <div className="admin-overview-section-title">
                  الإدارة المالية
                </div>
              </div>
              <div className="admin-overview-section-body">
                <div className="admin-overview-row">
                  <span>إجمالي المبيعات (الفترة):</span>
                  <strong>{formatNumber(financial.totalSales)}</strong>
                </div>
                <div className="admin-overview-row">
                  <span>COD (دفع عند الاستلام):</span>
                  <strong>{formatNumber(financial.codSales)}</strong>
                </div>
                <div className="admin-overview-row">
                  <span>دفع إلكتروني:</span>
                  <strong>{formatNumber(financial.onlineSales)}</strong>
                </div>
                <div className="admin-overview-row">
                  <span>عمولة المنصة:</span>
                  <strong>{formatNumber(financial.platformCommission)}</strong>
                </div>
                <div className="admin-overview-row">
                  <span>مبالغ غير مسددة:</span>
                  <strong>{formatNumber(financial.unpaidPayouts)}</strong>
                </div>
              </div>
            </div>

            {/* الدعم الفني */}
            <div className="admin-overview-card">
              <div className="admin-overview-card-header">
                <div className="admin-overview-icon support">
                  <Headset size={18} />
                </div>
                <div className="admin-overview-section-title">الدعم الفني</div>
              </div>
              <div className="admin-overview-section-body">
                <div className="admin-overview-row">
                  <span>تذاكر مفتوحة:</span>
                  <strong>{formatNumber(support.open)}</strong>
                </div>
                <div className="admin-overview-row">
                  <span>قيد المعالجة:</span>
                  <strong>{formatNumber(support.inProgress)}</strong>
                </div>
                <div className="admin-overview-row">
                  <span>تم الحل:</span>
                  <strong>{formatNumber(support.resolved)}</strong>
                </div>
                <div className="admin-overview-row">
                  <span>مغلقة:</span>
                  <strong>{formatNumber(support.closed)}</strong>
                </div>
              </div>
            </div>

            {/* الإعلانات */}
            <div className="admin-overview-card">
              <div className="admin-overview-card-header">
                <div className="admin-overview-icon ads">
                  <BarChart3 size={18} />
                </div>
                <div className="admin-overview-section-title">الإعلانات</div>
              </div>
              <div className="admin-overview-section-body">
                <div className="admin-overview-row">
                  <span>إعلانات نشطة:</span>
                  <strong>{formatNumber(ads.active)}</strong>
                </div>
                <div className="admin-overview-row">
                  <span>غير مفعّلة:</span>
                  <strong>{formatNumber(ads.inactive)}</strong>
                </div>
                <div className="admin-overview-row">
                  <span>إجمالي الإعلانات:</span>
                  <strong>{formatNumber(ads.total)}</strong>
                </div>
              </div>
            </div>

            {/* التنبيهات */}
            <div className="admin-overview-card">
              <div className="admin-overview-card-header">
                <div className="admin-overview-icon notifications">
                  <Bell size={18} />
                </div>
                <div className="admin-overview-section-title">التنبيهات</div>
              </div>
              <div className="admin-overview-section-body">
                <div className="admin-overview-row">
                  <span>تنبيهات غير مقروءة:</span>
                  <strong>{formatNumber(notifications.unread)}</strong>
                </div>
                <div className="admin-overview-row">
                  <span>مرسلة في الفترة:</span>
                  <strong>{formatNumber(notifications.inPeriod)}</strong>
                </div>
                <div className="admin-overview-row">
                  <span>إجمالي التنبيهات:</span>
                  <strong>{formatNumber(notifications.totalAllTime)}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* آخر الأنشطة */}
          <div className="admin-overview-activity">
            <div className="admin-overview-activity-header">
              <div className="admin-overview-icon activity">
                <Activity size={18} />
              </div>
              <div className="admin-overview-section-title">
                آخر الأنشطة في المنصة
              </div>
            </div>
            {recentActivity.length === 0 ? (
              <div className="admin-overview-activity-empty">
                لا توجد أنشطة حديثة لعرضها في هذه الفترة.
              </div>
            ) : (
              <ul className="admin-overview-activity-list">
                {recentActivity.map((item, index) => (
                  <li key={index} className="admin-overview-activity-item">
                    <div className="admin-overview-activity-icon">
                      {item.type === "order" && <ShoppingBag size={16} />}
                      {item.type === "ticket" && <Headset size={16} />}
                      {item.type === "payout" && <DollarSign size={16} />}
                      {item.type !== "order" &&
                        item.type !== "ticket" &&
                        item.type !== "payout" && <Activity size={16} />}
                    </div>
                    <div className="admin-overview-activity-content">
                      <div className="admin-overview-activity-title">
                        {item.title}
                      </div>
                      {item.createdAt && (
                        <div className="admin-overview-activity-meta">
                          {new Date(item.createdAt).toLocaleString("ar-EG")}
                        </div>
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
