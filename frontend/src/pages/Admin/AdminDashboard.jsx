import "./AdminDashboard.css";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
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
} from "lucide-react";

import AdminOverviewSection from "./sections/AdminOverviewSection";
import AdminUsersSection from "./sections/AdminUsersSection";
import AdminSellersSection from "./sections/AdminSellersSection";
import AdminProductsSection from "./sections/AdminProductsSection";
import AdminOrdersSection from "./sections/AdminOrdersSection";
import AdminShippingSection from "./sections/AdminShippingSection";
import AdminAdsSection from "./sections/AdminAdsSection";
import AdminCategoriesSection from "./sections/AdminCategoriesSection";
import AdminFinancialSection from "./sections/AdminFinancialSection";
import AdminReportsSection from "./sections/AdminReportsSection";
import AdminNotificationsSection from "./sections/AdminNotificationsSection";
import AdminSupportSection from "./sections/AdminSupportSection";
import AdminSecuritySection from "./sections/AdminSecuritySection";

import {
  AdminAddStaffModal,
  AdminAddAdModal,
  AdminAddShippingCompanyModal,
  AdminAddCategoryModal,
  AdminPayoutModal,
  AdminSendNotificationModal,
} from "./AdminModals";

import AdminProfile from "./AdminProfile";
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
      { id: "orders", label: "إدارة الطلبات", icon: Package },
      { id: "shipping", label: "إدارة شركات الشحن", icon: Truck },
      { id: "ads", label: "إدارة الإعلانات", icon: Megaphone },
      { id: "categories", label: "إدارة الأقسام", icon: Grid3X3 },
    ],
  },
  {
    group: "الماليات والتقارير",
    items: [
      { id: "financial", label: "الإدارة المالية", icon: CreditCard },
      { id: "reports", label: "التقارير والإحصاءات", icon: BarChart3 },
    ],
  },
  {
    group: "النظام والتواصل",
    items: [
      { id: "notifications", label: "إدارة التنبيهات", icon: Bell },
      { id: "support", label: "إدارة التواصل", icon: MessageSquare },
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

  // صلاحيات الموظف الإداري (كائن permissions القادم من الـ backend)
  const rawPermissions = (user && user.permissions) || {};

  const [searchParams, setSearchParams] = useSearchParams();
  const [section, setSection] = useState(getInitialSection(searchParams));

  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [isAddAdOpen, setIsAddAdOpen] = useState(false);
  const [isAddShippingOpen, setIsAddShippingOpen] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [isPayoutOpen, setIsPayoutOpen] = useState(false);
  const [isSendNotificationOpen, setIsSendNotificationOpen] = useState(false);

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
    if (!searchParams.get("section")) {
      const params = new URLSearchParams(searchParams);
      params.set("section", "dashboard");
      setSearchParams(params, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleNavigateSection = (id) => {
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
        <section className="admin-section-card">
          <div className="admin-empty-state">
            لا تملك صلاحية الوصول إلى هذا القسم في لوحة التحكم. إذا كنت ترى
            أن هذا خطأ، تواصل مع مدير النظام.
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
            onAddCompany={() => setIsAddShippingOpen(true)}
          />
        );
      case "ads":
        return <AdminAdsSection onAddAd={() => setIsAddAdOpen(true)} />;
      case "categories":
        return (
          <AdminCategoriesSection
            onAddCategory={() => setIsAddCategoryOpen(true)}
          />
        );
      case "financial":
        return (
          <AdminFinancialSection onOpenPayout={() => setIsPayoutOpen(true)} />
        );
      case "reports":
        return <AdminReportsSection />;
      case "notifications":
        return (
          <AdminNotificationsSection
            onSendNotification={() => setIsSendNotificationOpen(true)}
          />
        );
      case "support":
        return <AdminSupportSection />;
      case "security":
        if (!isOwner) {
          return (
            <section className="admin-section-card">
              <div className="admin-empty-state">
                هذا القسم متاح لمدير النظام فقط.
              </div>
            </section>
          );
        }
        return (
          <AdminSecuritySection onAddStaff={() => setIsAddStaffOpen(true)} />
        );
      case "adminProfile":
        if (!isOwner) {
          return (
            <section className="admin-section-card">
              <div className="admin-empty-state">
                هذا القسم (بيانات حساب الأدمن) متاح لمدير النظام فقط، ولا يمكن
                للموظفين تعديله. إذا كنت ترى أن هناك مشكلة في بيانات حسابك،
                يرجى التواصل مع مدير النظام.
              </div>
            </section>
          );
        }
        return <AdminProfile />;
      case "dashboard":
      default:
        return (
          <AdminOverviewSection onNavigateSection={handleNavigateSection} />
        );
    }
  };

  return (
    <div className="admin-page">
      {/* شريط الإدارات العلوي الثابت */}
      <div className="admin-top-tabs-sticky">
        <div className="admin-top-tabs-container">
          <div className="admin-top-tabs-scroll">
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
        {renderSection()}
      </main>

      {/* النوافذ المنبثقة العامة للوحة الأدمن */}
      <AdminAddStaffModal
        open={isAddStaffOpen}
        onClose={() => setIsAddStaffOpen(false)}
      />
      <AdminAddAdModal
        open={isAddAdOpen}
        onClose={() => setIsAddAdOpen(false)}
      />
      <AdminAddShippingCompanyModal
        open={isAddShippingOpen}
        onClose={() => setIsAddShippingOpen(false)}
      />
      <AdminAddCategoryModal
        open={isAddCategoryOpen}
        onClose={() => setIsAddCategoryOpen(false)}
      />
      <AdminPayoutModal
        open={isPayoutOpen}
        onClose={() => setIsPayoutOpen(false)}
      />
      <AdminSendNotificationModal
        open={isSendNotificationOpen}
        onClose={() => setIsSendNotificationOpen(false)}
      />
    </div>
  );
}
