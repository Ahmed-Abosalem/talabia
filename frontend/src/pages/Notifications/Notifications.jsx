// src/pages/Notifications/Notifications.jsx

import "./Notifications.css";
import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Package, Truck, Tag, ShieldCheck } from "lucide-react";
import {
  listNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "@/services/notificationService";
import { useApp } from "@/context/AppContext";

const FILTERS = [
  { id: "all", label: "الكل" },
  { id: "orders", label: "الطلبات" },
  { id: "shipping", label: "الشحن" },
  { id: "offers", label: "العروض" },
  { id: "system", label: "النظام" },
  { id: "support", label: "الدعم الفني" }, // ✅ جديد: فلتر للدعم الفني
];

// 🔁 تحويل type القادم من الباك إند إلى category المستخدمة في الواجهة
function mapTypeToCategory(type) {
  switch (type) {
    case "order":
      return "orders";
    case "product":
      return "offers";
    case "system":
      return "system";
    case "support": // ✅ جديد: نوع إشعار ردود الدعم الفني
      return "support";
    case "general":
    default:
      return "system";
  }
}

// 🕒 تنسيق الوقت ليعرض بشكل بسيط للمستخدم
function buildTimeLabel(createdAt) {
  if (!createdAt) return "";
  try {
    const date = new Date(createdAt);
    return date.toLocaleString("ar-SA", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return "";
  }
}

// 🧩 تحويل الإشعار القادم من الباك إند إلى الشكل المستخدم في الواجهة
function mapNotificationFromApi(n) {
  const category = mapTypeToCategory(n.type);
  return {
    id: n._id || n.id,
    category,
    title: n.title || "",
    message: n.message || "",
    timeLabel: buildTimeLabel(n.createdAt),
    isRead: !!n.isRead,
    link: n.link || "",
  };
}

function getCategoryIcon(category) {
  switch (category) {
    case "orders":
      return Package;
    case "shipping":
      return Truck;
    case "offers":
      return Tag;
    case "system":
      return ShieldCheck;
    case "support": // ✅ جديد: أيقونة للدعم الفني
      return ShieldCheck;
    default:
      return Bell;
  }
}

function getCategoryLabel(category) {
  switch (category) {
    case "orders":
      return "الطلبات";
    case "shipping":
      return "الشحن";
    case "offers":
      return "العروض";
    case "system":
      return "النظام";
    case "support": // ✅ جديد: تسمية فئة الدعم
      return "الدعم الفني";
    default:
      return "إشعار";
  }
}

export default function Notifications() {
  const navigate = useNavigate();
  const { setNotificationsCount } = useApp();

  const [activeFilter, setActiveFilter] = useState("all");
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  const filteredNotifications = useMemo(() => {
    if (activeFilter === "all") return notifications;
    return notifications.filter((n) => n.category === activeFilter);
  }, [notifications, activeFilter]);

  // 📥 جلب الإشعارات من الباك إند عند فتح الصفحة
  useEffect(() => {
    let isMounted = true;

    async function loadNotifications() {
      try {
        setIsLoading(true);
        setError("");

        const data = await listNotifications();
        if (!isMounted) return;

        const mapped = Array.isArray(data)
          ? data.map(mapNotificationFromApi)
          : [];

        setNotifications(mapped);
      } catch (err) {
        if (!isMounted) return;
        const message =
          err?.response?.data?.message ||
          "تعذر تحميل الإشعارات، حاول مرة أخرى.";
        setError(message);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadNotifications();

    return () => {
      isMounted = false;
    };
  }, []);

  // 🔁 كلما تغيّر عدد الإشعارات غير المقروءة بعد التحميل
  // نُحدّث العدّاد في AppContext ليتزامن الجرس مع الصفحة
  useEffect(() => {
    if (!isLoading) {
      setNotificationsCount(unreadCount);
    }
  }, [unreadCount, isLoading, setNotificationsCount]);

  // ✅ وضع كل الإشعارات كمقروءة (استدعاء API ثم تحديث الحالة)
  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;

    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) =>
        prev.map((n) => (n.isRead ? n : { ...n, isRead: true }))
      );
      // ستقوم useEffect أعلاه بتحديث العدّاد تلقائيًا بعد هذا التغيير
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        "تعذر تحديد جميع الإشعارات كمقروءة.";
      setError(message);
    }
  };

  // ✅ عند الضغط على كرت إشعار واحد
  const handleCardClick = async (notification) => {
    const { id, link } = notification;
    if (!id) return;

    // تحديث واجهة المستخدم مباشرة
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );

    // استدعاء API لتحديده كمقروء
    try {
      await markNotificationAsRead(id);
      // بعد التحديث، useEffect الخاص بـ unreadCount سيضبط عدّاد الجرس
    } catch {
      // في حال الفشل نكتفي بحالة الواجهة حالياً، يمكن لاحقاً إضافة منطق إرجاع
    }

    // لو الإشعار يحتوي على رابط → نذهب له
    if (link) {
      navigate(link);
    }
  };

  return (
    <div className="page-container notifications-page">
      {/* هيرو علوي بسيط مع تدرج لوني وأيقونة كبيرة */}
      <section className="notifications-hero">
        <div className="notifications-hero-main">
          <div className="notifications-hero-icon-wrapper">
            <div className="notifications-hero-icon">
              <Bell size={24} />
            </div>
          </div>
          <div className="notifications-hero-text">
            <h1>الإشعارات</h1>
            <p>عرض بسيط ومنظم لكل ما يحدث لحسابك وطلباتك في طلبية.</p>
          </div>
        </div>

        <div className="notifications-hero-meta">
          <div className="notifications-hero-badge">
            <span className="notifications-hero-badge-dot" />
            <span>
              {isLoading
                ? "جاري تحميل الإشعارات..."
                : unreadCount > 0
                ? `${unreadCount} إشعار جديد في انتظارك`
                : "كل الإشعارات مقروءة"}
            </span>
          </div>

          {!isLoading && unreadCount > 0 && (
            <button
              type="button"
              className="notifications-hero-btn"
              onClick={handleMarkAllAsRead}
            >
              وضع الكل كمقروء
            </button>
          )}
        </div>
      </section>

      {/* كرت الفلاتر + قائمة الإشعارات */}
      <section className="notifications-surface">
        {/* شريط الفلاتر داخل كرت خفيف */}
        <div className="notifications-filters-row">
          {FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              className={
                "notifications-filter-chip" +
                (activeFilter === filter.id ? " is-active" : "")
              }
              onClick={() => setActiveFilter(filter.id)}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* حالات التحميل / الخطأ / الفارغ / القائمة */}
        {isLoading ? (
          <div className="notifications-empty">
            <div className="notifications-empty-icon">
              <Bell size={26} />
            </div>
            <h2 className="notifications-empty-title">
              جاري تحميل الإشعارات...
            </h2>
            <p className="notifications-empty-text">
              يرجى الانتظار لحظات حتى يتم جلب أحدث التحديثات لحسابك.
            </p>
          </div>
        ) : error ? (
          <div className="notifications-empty">
            <div className="notifications-empty-icon">
              <Bell size={26} />
            </div>
            <h2 className="notifications-empty-title">
              حدث خطأ أثناء تحميل الإشعارات
            </h2>
            <p className="notifications-empty-text">{error}</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="notifications-empty">
            <div className="notifications-empty-icon">
              <Bell size={26} />
            </div>
            <h2 className="notifications-empty-title">
              لا توجد إشعارات في هذا القسم
            </h2>
            <p className="notifications-empty-text">
              سيتم عرض أي تحديث جديد يخص طلباتك أو حسابك هنا بشكل تلقائي.
            </p>
          </div>
        ) : (
          <div className="notifications-list">
            {filteredNotifications.map((notification, index) => {
              const Icon = getCategoryIcon(notification.category);
              const categoryLabel = getCategoryLabel(notification.category);
              const isLast = index === filteredNotifications.length - 1;

              return (
                <div key={notification.id} className="notifications-row">
                  {/* خط زمني رأسي بسيط */}
                  <div className="notifications-timeline">
                    <span
                      className={
                        "notifications-timeline-dot" +
                        (notification.isRead ? " is-read" : " is-unread")
                      }
                    />
                    {!isLast && (
                      <span className="notifications-timeline-line" />
                    )}
                  </div>

                  {/* بطاقة الإشعار */}
                  <article
                    className={
                      "notification-card" +
                      (notification.isRead ? " is-read" : " is-unread")
                    }
                    onClick={() => handleCardClick(notification)}
                  >
                    <div
                      className={
                        "notification-icon-wrapper notification-icon-" +
                        notification.category
                      }
                    >
                      <Icon size={18} />
                    </div>

                    <div className="notification-content">
                      <div className="notification-row-top">
                        <h3 className="notification-title">
                          {notification.title}
                        </h3>
                        <span className="notification-time">
                          {notification.timeLabel}
                        </span>
                      </div>

                      <p className="notification-message">
                        {notification.message}
                      </p>

                      <div className="notification-row-bottom">
                        <span
                          className={
                            "notification-pill notification-pill-" +
                            notification.category
                          }
                        >
                          {categoryLabel}
                        </span>

                        {!notification.isRead && (
                          <span className="notification-new-dot">جديد</span>
                        )}
                      </div>
                    </div>
                  </article>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
