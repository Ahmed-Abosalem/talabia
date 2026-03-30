// src/components/Navbar/MenuDropdown.jsx
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import "./MenuDropdown.css";
import logo from "@/assets/logo.png";

import {
  Home,
  Info,
  Phone,
  Store,
  Truck,
  User,
  LogIn,
  LogOut,
  LayoutDashboard,
  Wallet,
  Smartphone,
} from "lucide-react";

export default function MenuDropdown({ role, onClose }) {
  const navigate = useNavigate();
  const { isLoggedIn, logout, user } = useAuth();
  const containerRef = useRef(null);

  // إغلاق القائمة عند الضغط خارجها
  useEffect(() => {
    const handleClickOutside = (event) => {
      // ✅ تجاهل الضغط على زر القائمة نفسه لتجنب تضارب الأحداث
      if (event.target.closest(".navbar-menu-button")) {
        return;
      }

      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        onClose?.();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [onClose]);


  const handleItemClick = (action) => {
    action?.();
    onClose?.();
  };

  // =========================
  // 🎯 تحديد الدور الفعلي مع تطويع للقيم غير المتطابقة حرفيًا
  // =========================

  let effectiveRole = "guest";

  if (isLoggedIn) {
    // نحاول أخذ الدور من الـ props، وإن لم يوجد فمن كائن المستخدم
    const rawRole = (role || user?.role || "guest")?.toString().toLowerCase();

    if (["buyer", "seller", "shipper", "admin"].includes(rawRole)) {
      effectiveRole = rawRole;
    } else {
      // لو الدور غير معروف (مثلاً shipping_company أو delivery)
      // نعامله افتراضياً كـ "شركة شحن" (shipper) لو احتوى على ship أو deliver
      if (
        rawRole.includes("ship") ||
        rawRole.includes("delivery") ||
        rawRole.includes("transport")
      ) {
        effectiveRole = "shipper";
      } else {
        effectiveRole = "guest";
      }
    }
  }

  const roleMap = {
    guest: { label: "زائر", color: "#22c55e" },
    buyer: { label: "مشتري", color: "#0ea5e9" },
    seller: { label: "بائع", color: "#f97316" },
    shipper: { label: "شركة شحن", color: "#14b8a6" },
    admin: { label: "مدير", color: "#a855f7" },
  };

  const roleKey = roleMap[effectiveRole] ? effectiveRole : "guest";
  const roleInfo = roleMap[roleKey];

  const displayName = isLoggedIn
    ? user?.name || "مستخدم طلبية"
    : "تصفح كزائر";

  // زر أساسي ثابت (تسجيل الدخول / تسجيل الخروج)
  const isCtaLogin = !isLoggedIn;
  const CtaIcon = isCtaLogin ? LogIn : LogOut;
  const ctaLabel = isCtaLogin ? "تسجيل الدخول" : "تسجيل الخروج";
  const ctaClassName = `menu-primary-cta menu-primary-cta--${roleKey}`;

  const handleCtaClick = () => {
    if (isCtaLogin) {
      handleItemClick(() => navigate("/login"));
    } else {
      handleItemClick(() => logout());
    }
  };

  // الأقسام حسب الدور
  const sections = [];

  if (!isLoggedIn) {
    sections.push(
      {
        title: "التصفح",
        items: [
          {
            label: "الصفحة الرئيسية",
            icon: Home,
            onClick: () => navigate("/"),
          },
          {
            label: "تطبيق المتجر",
            icon: Smartphone,
            onClick: () => navigate("/download-app"),
          },
          {
            label: "من نحن",
            icon: Info,
            onClick: () => navigate("/about"),
          },
          {
            label: "تواصل معنا",
            icon: Phone,
            onClick: () => navigate("/contact"),
          },
        ],
      },
      {
        title: "الانضمام إلى طلبية",
        items: [
          {
            label: "كن بائعًا معنا",
            icon: Store,
            onClick: () => navigate("/register?role=seller"),
          },
          {
            label: "أنشئ حساب مشتري",
            icon: Truck,
            onClick: () => navigate("/register?role=buyer"),
          },
        ],
      }
    );
  } else if (roleKey === "buyer") {
    sections.push(
      {
        title: "حسابي",
        items: [
          {
            label: "ملفي الشخصي",
            icon: User,
            onClick: () => navigate("/buyer/profile"),
          },
          {
            label: "طلباتي",
            icon: Truck,
            onClick: () => navigate("/buyer/orders"),
          },
          {
            label: "محفظتي",
            icon: Wallet,
            onClick: () => navigate("/buyer/wallet"),
          },
        ],
      },
      {
        title: "التصفح",
        items: [
          {
            label: "الصفحة الرئيسية",
            icon: Home,
            onClick: () => navigate("/"),
          },
          {
            label: "تطبيق المتجر",
            icon: Smartphone,
            onClick: () => navigate("/download-app"),
          },
          {
            label: "من نحن",
            icon: Info,
            onClick: () => navigate("/about"),
          },
          {
            label: "تواصل معنا",
            icon: Phone,
            onClick: () => navigate("/contact"),
          },
        ],
      }
    );
  } else if (roleKey === "seller") {
    sections.push(
      {
        title: "إدارة المتجر",
        items: [
          {
            label: "لوحة التحكم",
            icon: LayoutDashboard,
            onClick: () => navigate("/seller"),
          },
          {
            label: "محفظتي",
            icon: Wallet,
            onClick: () => navigate("/seller/wallet"),
          },
        ],
      },
      {
        title: "التصفح",
        items: [
          {
            label: "الصفحة الرئيسية",
            icon: Home,
            onClick: () => navigate("/"),
          },
          {
            label: "تطبيق المتجر",
            icon: Smartphone,
            onClick: () => navigate("/download-app"),
          },
          {
            label: "من نحن",
            icon: Info,
            onClick: () => navigate("/about"),
          },
          {
            label: "تواصل معنا",
            icon: Phone,
            onClick: () => navigate("/contact"),
          },
        ],
      }
    );
  } else if (roleKey === "shipper") {
    sections.push(
      {
        title: "إدارة الشحن",
        items: [
          {
            label: "لوحة التحكم",
            icon: LayoutDashboard,
            onClick: () => navigate("/shipping"),
          },
        ],
      },
      {
        title: "التصفح",
        items: [
          {
            label: "الصفحة الرئيسية",
            icon: Home,
            onClick: () => navigate("/"),
          },
          {
            label: "تطبيق المتجر",
            icon: Smartphone,
            onClick: () => navigate("/download-app"),
          },
          {
            label: "من نحن",
            icon: Info,
            onClick: () => navigate("/about"),
          },
          {
            label: "تواصل معنا",
            icon: Phone,
            onClick: () => navigate("/contact"),
          },
        ],
      }
    );
  } else if (roleKey === "admin") {
    sections.push(
      {
        title: "لوحة التحكم",
        items: [
          {
            label: "لوحة التحكم",
            icon: LayoutDashboard,
            onClick: () => navigate("/admin"),
          },
        ],
      },
      {
        title: "التصفح",
        items: [
          {
            label: "الصفحة الرئيسية",
            icon: Home,
            onClick: () => navigate("/"),
          },
          {
            label: "تطبيق المتجر",
            icon: Smartphone,
            onClick: () => navigate("/download-app"),
          },
          {
            label: "من نحن",
            icon: Info,
            onClick: () => navigate("/about"),
          },
          {
            label: "تواصل معنا",
            icon: Phone,
            onClick: () => navigate("/contact"),
          },
        ],
      }
    );
  }

  return (
    <div className="menu-dropdown-root">
      <div className="menu-dropdown-inner" ref={containerRef}>
        {/* هيدر العلامة التجارية */}
        <div className="menu-brand">
          <img src={logo} alt="طلبية" className="menu-brand-logo" />
          <div className="menu-brand-subtitle">منصة التجارة الإلكترونية</div>
        </div>

        <div className="menu-divider" />

        {/* كرت المستخدم */}
        <div className="menu-user-card">
          <div className="menu-user-avatar">
            <User size={16} />
          </div>
          <div className="menu-user-text">
            <div className="menu-user-name">{displayName}</div>
          </div>
        </div>

        {/* شارة الدور */}
        <div className="menu-user-role-pill-wrapper">
          <div
            className="menu-user-role-pill"
            style={{
              backgroundColor: `${roleInfo.color}1a`,
              color: roleInfo.color,
            }}
          >
            <span>{roleInfo.label}</span>
          </div>
        </div>

        {/* زر رئيسي ثابت: تسجيل الدخول / تسجيل الخروج */}
        <button className={ctaClassName} onClick={handleCtaClick}>
          <CtaIcon size={16} className="menu-primary-cta-icon" />
          <span className="menu-primary-cta-label">{ctaLabel}</span>
        </button>

        {/* الأقسام */}
        <div className="menu-sections">
          {sections.map((section, sIndex) => (
            <div key={sIndex} className="menu-section">
              <div className="menu-section-title">{section.title}</div>
              <div className="menu-section-items">
                {section.items.map((item, iIndex) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={iIndex}
                      className="menu-item-card"
                      onClick={() => handleItemClick(item.onClick)}
                    >
                      <div className="menu-item-main">
                        <Icon size={15} className="menu-item-icon" />
                        <span className="menu-item-label">{item.label}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
