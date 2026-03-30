// src/pages/Notifications/Notifications.jsx

import "./Notifications.css";
import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Package, Truck, Tag, ShieldCheck, ArrowRight, MessageSquare, CheckCheck } from "lucide-react";
import {
  listNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "@/services/notificationService";
import { formatDate } from "@/utils/formatters";
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


// 🧩 تحويل الإشعار القادم من الباك إند إلى الشكل المستخدم في الواجهة
function mapNotificationFromApi(n) {
  const category = mapTypeToCategory(n.type);
  return {
    id: n._id || n.id,
    category,
    title: n.title || "",
    message: n.message || "",
    timeLabel: formatDate(n.createdAt),
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
      return MessageSquare;
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
    <div className="adm-page-root notifications-page">
      <header className="adm-header">
        <div className="adm-header-inner">
          <div className="adm-header-right">
            <button onClick={() => navigate("/")} className="adm-btn-back" title="العودة للتسوق">
              <ArrowRight size={20} />
            </button>
            <h1 className="adm-page-title buyer-page-title">
              <Bell size={24} className="notifications-header-icon" />
              <span>الإشعارات</span>
            </h1>
          </div>
          <div className="notifications-unread-banner">
            <span className="pulse-dot-orange"></span>
            <span className="unread-text">
              {isLoading
                ? "جاري التحميل..."
                : unreadCount > 0
                  ? `لديك ${unreadCount} إشعارات غير مقروءة`
                  : "كل الإشعارات مقروءة"}
            </span>
          </div>
          <div className="adm-header-left">
            {!isLoading && unreadCount > 0 && (
              <button
                type="button"
                className="header-action-btn mark-read-btn"
                onClick={handleMarkAllAsRead}
              >
                <CheckCheck size={18} />
                <span>وضع المقروء</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="adm-main-container">
        <main className="adm-details-grid">
          {/* Filters Card */}
          <section className="adm-card span-12">
            <div className="adm-card-header">
              <Tag size={20} />
              <h2>خيارات العرض والفلترة</h2>
            </div>
            <div className="adm-card-body">
              <div className="buyer-filter-row">
                <span className="filter-label">فلتر النوع:</span>
                <select
                  className="adm-form-select"
                  value={activeFilter}
                  onChange={(e) => setActiveFilter(e.target.value)}
                >
                  {FILTERS.map((f) => (
                    <option key={f.id} value={f.id}>{f.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <div className="span-12">
            {/* حالات التحميل / الخطأ / الفارغ / القائمة */}
            {isLoading ? (
              <div className="adm-empty-center notifications-empty">
                <div className="empty-icon-wrap">
                  <Bell size={48} className="spin" />
                </div>
                <h3>جاري التحميل...</h3>
                <p>يرجى الانتظار لحظات حتى يتم جلب أحدث التحديثات لحسابك.</p>
              </div>
            ) : error ? (
              <div className="adm-empty-center notifications-empty">
                <div className="empty-icon-wrap">
                  <Bell size={48} />
                </div>
                <h3>حدث خطأ</h3>
                <p>{error}</p>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="adm-empty-center notifications-empty">
                <div className="empty-icon-wrap">
                  <Bell size={48} />
                </div>
                <h3>لا توجد إشعارات</h3>
                <p>سيتم عرض أي تحديث جديد يخص طلباتك أو حسابك هنا بشكل تلقائي.</p>
              </div>
            ) : (
              <div className="notifications-grid-flow">
                {filteredNotifications.map((notification) => {
                  const Icon = getCategoryIcon(notification.category);
                  const categoryLabel = getCategoryLabel(notification.category);

                  return (
                    <article
                      key={notification.id}
                      className={
                        "adm-card notification-card" +
                        (notification.isRead ? " is-read" : " is-unread")
                      }
                      onClick={() => handleCardClick(notification)}
                    >
                      {/* Column 1: Icon Box */}
                      <div className="notification-col-icon">
                        <div className={`notification-icon-wrapper notification-icon-${notification.category}`}>
                          <Icon size={24} />
                          {!notification.isRead && <span className="unread-dot-fixed"></span>}
                        </div>
                      </div>

                      {/* Column 2: Content */}
                      <div className="notification-col-content">
                        <h3 className="notification-title">{notification.title}</h3>
                        <p className="notification-message">{notification.message}</p>
                      </div>

                      {/* Column 3: Meta Info */}
                      <div className="notification-col-meta">
                        <div className="notification-time-display">{notification.timeLabel}</div>
                        <div className={`notification-pill-display notification-pill-${notification.category}`}>
                          {categoryLabel}
                        </div>
                      </div>

                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
