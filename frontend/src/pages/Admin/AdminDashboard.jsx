import "./AdminDashboard.css";
import { useEffect, useState, useRef, lazy, Suspense } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Store,
  Package,
  Truck,
  Megaphone,
  Grid3X3,
  CreditCard,
  BarChart3,
  Bell,
  MessageSquare,
  ShieldCheck,
  User,
  Shield,
  Wallet,
  ShoppingBag,
  ClipboardList,
} from "lucide-react";

// ⚡ Lazy-loaded sections — each loads independently on demand
const AdminOverviewSection = lazy(() => import("./sections/AdminOverviewSection"));
const AdminUsersSection = lazy(() => import("./sections/AdminUsersSection"));
const AdminSellersSection = lazy(() => import("./sections/AdminSellersSection"));
const AdminProductsSection = lazy(() => import("./sections/AdminProductsSection"));
const AdminOrdersSection = lazy(() => import("./sections/AdminOrdersSection"));
const AdminShippingSection = lazy(() => import("./sections/AdminShippingSection"));
const AdminAdsSection = lazy(() => import("./sections/AdminAdsSection"));
const AdminCategoriesSection = lazy(() => import("./sections/AdminCategoriesSection"));
const AdminFinancialSection = lazy(() => import("./sections/AdminFinancialSection"));
const AdminReportsSection = lazy(() => import("./sections/AdminReportsSection"));
const AdminNotificationsSection = lazy(() => import("./sections/AdminNotificationsSection"));
const AdminSupportSection = lazy(() => import("./sections/AdminSupportSection"));
const AdminSecuritySection = lazy(() => import("./sections/AdminSecuritySection"));
const AdminPrivacyPolicySection = lazy(() => import("./sections/AdminPrivacyPolicySection"));
const AdminSynonymsSection = lazy(() => import("./sections/AdminSynonymsSection"));
const AdminPaymentSection = lazy(() => import("./sections/AdminPaymentSection"));
const AdminWalletSection = lazy(() => import("./sections/AdminWalletSection"));

// النوافذ المنبثقة استُبدلت بصفحات مستقلة — يتم التنقل إليها عبر useNavigate()

const AdminProfile = lazy(() => import("./AdminProfile"));
import { useAuth } from "@/context/AuthContext";

const SECTION_DEFINITIONS = [
  {
    group: "لوحة التحكم",
    items: [{ id: "dashboard", label: "نظرة عامة", icon: LayoutDashboard }],
  },
  {
    group: "إدارة المنصة",
    items: [
      { id: "users", label: "إدارة المستخدمين", icon: Users },
      { id: "sellers", label: "إدارة البائعين", icon: Store },
      { id: "products", label: "إدارة المنتجات", icon: Package },
      { id: "orders", label: "إدارة الطلبات", icon: ClipboardList },
      { id: "shipping", label: "إدارة شركات الشحن", icon: Truck },
      { id: "payment", label: "إدارة خيارات الدفع", icon: CreditCard }, // ✅ NEW
      { id: "ads", label: "إدارة الإعلانات", icon: Megaphone },
      { id: "categories", label: "إدارة الأقسام", icon: Grid3X3 },
      { id: "synonyms", label: "إدارة المرادفات", icon: MessageSquare },
    ],
  },
  {
    group: "الماليات والتقارير",
    items: [
      { id: "financial", label: "الإدارة المالية", icon: CreditCard },
      { id: "wallets", label: "إدارة المحافظ", icon: Wallet },
      { id: "reports", label: "التقارير والإحصاءات", icon: BarChart3 },
    ],
  },
  {
    group: "النظام والتواصل",
    items: [
      { id: "notifications", label: "إدارة التنبيهات", icon: Bell },
      { id: "support", label: "إدارة التواصل", icon: MessageSquare },
      { id: "privacy", label: "سياسة الخصوصية", icon: Shield },
      {
        id: "security",
        label: "إدارة الموظفين",
        icon: ShieldCheck,
      },
    ],
  },
  {
    group: "إعدادات الحساب",
    items: [
      {
        id: "adminProfile",
        label: "بيانات حساب الأدمن",
        icon: User,
      },
    ],
  },
];

function getInitialSection(searchParams) {
  const fromUrl = searchParams.get("section");
  if (fromUrl) return fromUrl;
  return "dashboard";
}

export default function AdminDashboard() {
  const { user, role } = useAuth();
  const isOwner = role === "admin" && user?.isOwner;
  const navigate = useNavigate();

  // صلاحيات الموظف الإداري (كائن permissions القادم من الـ backend)
  const rawPermissions = (user && user.permissions) || {};

  const [searchParams, setSearchParams] = useSearchParams();
  const [section, setSection] = useState(() => getInitialSection(searchParams));
  const [isLocked, setIsLocked] = useState(true); // 🛡️ Ghost Click Lock

  // 🔓 Unlock interaction after a brief delay on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsLocked(false), 300);
    return () => clearTimeout(timer);
  }, []);

  // 🛡️ Proactive Selection Clearing

  // 🛡️ Proactive Selection Clearing
  useEffect(() => {
    const clear = () => {
      if (window.getSelection) {
        window.getSelection().removeAllRanges();
      }
    };
    clear();
    // Also clear on a slight delay to catch late renders
    const timer = setTimeout(clear, 100);
    return () => clearTimeout(timer);
  }, [section]);

  // 🔄 Reset scroll to top when changing sections
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [section]);
  const scrollRef = useRef(null);
  const dragInfo = useRef({
    isDragging: false,
    startX: 0,
    scrollLeft: 0,
    dragMoved: false,
    velocity: 0,
    lastX: 0,
    rafId: null,
  });

  const handleMouseDown = (e) => {
    if (window.innerWidth < 900) return;
    // 🛡️ Prevent selection trigger
    if (e.detail > 1) e.preventDefault();

    cancelAnimationFrame(dragInfo.current.rafId);
    dragInfo.current.isDragging = true;
    dragInfo.current.startX = e.pageX - scrollRef.current.offsetLeft;
    dragInfo.current.lastX = e.pageX;
    dragInfo.current.scrollLeft = scrollRef.current.scrollLeft;
    dragInfo.current.dragMoved = false;
    dragInfo.current.velocity = 0;
  };

  const handleMouseMove = (e) => {
    if (!dragInfo.current.isDragging) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;

    // Momentum tracking: Calculate instantaneous velocity
    const currentX = e.pageX;
    dragInfo.current.velocity = currentX - dragInfo.current.lastX;
    dragInfo.current.lastX = currentX;

    const walk = (x - dragInfo.current.startX) * 1.2;
    scrollRef.current.scrollLeft = dragInfo.current.scrollLeft - walk;

    if (Math.abs(walk) > 5) {
      dragInfo.current.dragMoved = true;
    }
  };

  const handleMouseUpOrLeave = () => {
    if (!dragInfo.current.isDragging) return;
    dragInfo.current.isDragging = false;

    // Momentum Engine: Inertial Scroll loop
    let velocity = dragInfo.current.velocity;
    const friction = 0.95; // Industry standard friction coefficient

    const applyMomentum = () => {
      if (Math.abs(velocity) < 0.5) return;
      scrollRef.current.scrollLeft -= velocity;
      velocity *= friction;
      dragInfo.current.rafId = requestAnimationFrame(applyMomentum);
    };

    if (Math.abs(velocity) > 1) {
      dragInfo.current.rafId = requestAnimationFrame(applyMomentum);
    }
  };

  // helper بسيط لفحص مستوى الصلاحية (none / view / partial / full)
  const hasViewPermission = (permKey) => {
    if (!user || role !== "admin") return false;

    // مدير النظام له صلاحية كاملة على كل شيء
    if (isOwner) return true;

    if (!permKey) return false;

    const value = rawPermissions[permKey];
    return value === "view" || value === "partial" || value === "full";
  };

  // تعيين مفتاح الصلاحية لكل قسم في اللوحة
  const getPermissionKeyForSection = (sectionId) => {
    switch (sectionId) {
      case "users":
        return "users";
      case "sellers":
        return "sellers";
      case "products":
        return "products";
      case "orders":
        return "orders";
      case "shipping":
        return "shipping";
      case "ads":
        return "ads";
      case "categories":
        return "categories";
      case "synonyms":
        return "products"; // Share permission with products
      case "payment":
        return "payment"; // صلاحية إدارة الدفع
      case "wallets":
        return "wallets"; // صلاحية إدارة المحافظ
      case "financial":
        return "financial";
      case "reports":
        return "reports";
      case "notifications":
        return "notifications";
      case "support":
        return "support";
      case "security":
        return "admins";
      default:
        return null;
    }
  };

  // هل يمكن لهذا المستخدم رؤية قسم معيّن (ظهور التبويب فقط)؟
  const canViewSection = (sectionId) => {
    // مدير النظام يرى كل شيء
    if (isOwner) return true;

    // هذه الأقسام عامة لكل أدمن:
    if (sectionId === "dashboard") return true;

    // "بيانات حساب الأدمن" متاحة لمدير النظام فقط
    if (sectionId === "adminProfile") return false;

    // إدارة الموظفين متاحة لمدير النظام فقط
    if (sectionId === "security") return false;

    const permKey = getPermissionKeyForSection(sectionId);
    if (!permKey) return true; // احتياط: لو قسم غير مربوط، نسمح مؤقتًا

    return hasViewPermission(permKey);
  };

  // هل يمكن الوصول فعليًا لهذا القسم في المحتوى الرئيسي؟
  const canAccessSection = (sectionId) => {
    // نظرة عامة متاحة لكل من له دور admin
    if (sectionId === "dashboard") return true;

    // "بيانات حساب الأدمن" متاحة لمدير النظام فقط
    if (sectionId === "adminProfile") return isOwner;

    // "إدارة الموظفين" متاحة لمدير النظام فقط
    if (sectionId === "security") return isOwner;

    return canViewSection(sectionId);
  };

  useEffect(() => {
    const fromUrl = searchParams.get("section");
    if (!fromUrl) {
      const params = new URLSearchParams(searchParams);
      params.set("section", "dashboard");
      setSearchParams(params, { replace: true });
      setSection("dashboard");
    } else if (fromUrl !== section) {
      setSection(fromUrl);
    }
  }, [searchParams, setSearchParams, section]);

  const handleNavigateSection = (id) => {
    if (isLocked) return; // 🛡️ Ignore interaction if locked (ghost click)
    if (dragInfo.current.dragMoved) return; // Prevent click if we were dragging
    setSection(id);
    const params = new URLSearchParams(searchParams);
    params.set("section", id);
    setSearchParams(params, { replace: true });
  };

  // فلترة الأقسام في الشريط العلوي حسب الصلاحيات
  const filteredSectionDefinitions = SECTION_DEFINITIONS.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      // قسم إدارة الموظفين متاح لمدير النظام فقط
      if (item.id === "security" && !isOwner) return false;

      // "بيانات حساب الأدمن" متاحة لمدير النظام فقط
      if (item.id === "adminProfile" && !isOwner) return false;

      // باقي الأقسام تُعرض فقط لمن يملك صلاحية "view" فأكثر
      if (!canViewSection(item.id)) return false;

      return true;
    }),
  })).filter((group) => group.items.length > 0);

  const renderSection = () => {
    // لو المستخدم حاول يفتح قسم ليس له صلاحية عليه (من رابط مباشر مثلاً)
    if (!canAccessSection(section)) {
      return (
        <section className="adm-section-panel">
          <div className="adm-empty-state">
            <p>لا تملك صلاحية الوصول إلى هذا القسم في لوحة التحكم. إذا كنت ترى
              أن هذا خطأ، تواصل مع مدير النظام.</p>
          </div>
        </section>
      );
    }

    switch (section) {
      case "users":
        return <AdminUsersSection />;
      case "sellers":
        return <AdminSellersSection />;
      case "products":
        return <AdminProductsSection />;
      case "orders":
        return <AdminOrdersSection />;
      case "shipping":
        return (
          <AdminShippingSection
            onAddCompany={() => navigate("/admin/shipping/add")}
          />
        );
      case "ads":
        return <AdminAdsSection onAddAd={() => navigate("/admin/ads/add")} />;
      case "categories":
        return (
          <AdminCategoriesSection
            onAddCategory={() => navigate("/admin/categories/add")}
          />
        );
      case "synonyms":
        return <AdminSynonymsSection />;
      case "payment":
        return <AdminPaymentSection />;
      case "wallets":
        return <AdminWalletSection />;
      case "financial":
        return (
          <AdminFinancialSection onOpenPayout={() => navigate("/admin/financial/payout")} />
        );
      case "reports":
        return <AdminReportsSection />;
      case "notifications":
        return (
          <AdminNotificationsSection
            onSendNotification={() => navigate("/admin/notify-all")}
          />
        );
      case "support":
        return <AdminSupportSection />;
      case "security":
        if (!isOwner) {
          return (
            <section className="adm-section-panel">
              <div className="adm-empty-state">
                <p>هذا القسم متاح لمدير النظام فقط.</p>
              </div>
            </section>
          );
        }
        return (
          <AdminSecuritySection onAddStaff={() => navigate("/admin/staff/add")} />
        );
      case "adminProfile":
        if (!isOwner) {
          return (
            <section className="adm-section-panel">
              <div className="adm-empty-state">
                <p>هذا القسم (بيانات حساب الأدمن) متاح لمدير النظام فقط، ولا يمكن
                  للموظفين تعديله. إذا كنت ترى أن هناك مشكلة في بيانات حسابك،
                  يرجى التواصل مع مدير النظام.</p>
              </div>
            </section>
          );
        }
        return <AdminProfile />;
      case "privacy":
        return <AdminPrivacyPolicySection />;
      case "dashboard":
      default:
        return (
          <AdminOverviewSection onNavigateSection={handleNavigateSection} />
        );
    }
  };

  return (
    <div className="adm-page-root adm-page-root--top-tabs">
      {/* شريط الإدارات العلوي الثابت */}
      <div className="admin-top-tabs-sticky">
        <div className="admin-top-tabs-container">
          <div
            className="admin-top-tabs-scroll"
            ref={scrollRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
          >
            {filteredSectionDefinitions.map((group) => (
              <div key={group.group} className="admin-top-tabs-group">
                <div className="admin-top-tabs-items">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = section === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={
                          "admin-top-tab-card" +
                          (active ? " admin-top-tab-card-active" : "")
                        }
                        onClick={() => handleNavigateSection(item.id)}
                      >
                        <div className="admin-top-tab-icon">
                          <Icon size={16} />
                        </div>
                        <span className="admin-top-tab-label">
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <main className="admin-main admin-main-with-top-tabs">
        <Suspense fallback={<div className="adm-section-panel" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 200 }}><span className="adm-loading-text">جارٍ التحميل...</span></div>}>
          {renderSection()}
        </Suspense>
      </main>
    </div>
  );
}
