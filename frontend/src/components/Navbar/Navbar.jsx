// src/components/Navbar/Navbar.jsx
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Bell, Heart, ShoppingCart } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";
import MenuDropdown from "./MenuDropdown";
import SearchBar from "@/components/SearchBar";
import "./Navbar.css";
import logo from "@/assets/logo.png";
import { CartPage, WishlistPage, NotificationsPage } from "@/router";
export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ كما في ملفك السابق
  const { isLoggedIn, role, user } = useAuth();
  const { cartCount, wishlistCount, notificationsCount } = useApp();

  const isVisitor = !isLoggedIn;
  const isBuyer = role === "buyer";
  const showShopArea = isVisitor || isBuyer; // السلة + المفضلة + البحث

  // 🔹 الدور الفعلي المستخدم للعنوان في المنتصف
  const effectiveRole = user?.role || role;

  // 🔹 العنوان الديناميكي حسب الدور (Dashboard roles)
  const roleTitle =
    effectiveRole === "seller"
      ? "لوحة تحكم البائع"
      : effectiveRole === "admin"
        ? "لوحة تحكم المدير"
        : effectiveRole === "shipper"
          ? "لوحة تحكم شركة الشحن"
          : null;

  // =========================
  // ✅ منطق البحث (إضافة فقط)
  // =========================
  const getQueryFromUrl = () => {
    try {
      const params = new URLSearchParams(location.search);
      return (params.get("q") || "").trim();
    } catch {
      return "";
    }
  };

  const [searchValue, setSearchValue] = useState(getQueryFromUrl);
  const searchDebounceRef = useRef(null);

  // مزامنة الحقل إذا تغير الرابط (مثلاً رجوع للخلف أو فتح رابط مباشر)
  useEffect(() => {
    if (!showShopArea || roleTitle) return;
    setSearchValue(getQueryFromUrl());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, showShopArea, roleTitle]);

  // تنظيف أي timeout عند الخروج
  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, []);

  const handleSearchChange = (val) => {
    setSearchValue(val);

    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    searchDebounceRef.current = setTimeout(() => {
      const q = (val || "").trim();
      const params = new URLSearchParams();

      if (q) params.set("q", q);

      const nextUrl = params.toString() ? `/?${params.toString()}` : "/";

      // نضمن أن البحث يذهب للصفحة الرئيسية ويعرض النتائج
      navigate(nextUrl, { replace: true });
    }, 250);
  };

  const handleNotificationsClick = () => {
    if (!isLoggedIn) {
      navigate("/login");
      return;
    }
    navigate("/notifications");
  };

  const handleCartClick = () => {
    if (!showShopArea) return;
    navigate("/cart");
  };

  const handleWishlistClick = () => {
    if (!showShopArea) return;
    navigate("/wishlist");
  };

  return (
    <header className="navbar-root">
      <div className="navbar-inner">
        {/* أقصى اليمين في RTL: زر القائمة + الشعار */}
        <div className="navbar-left">
          <button
            type="button"
            className={`navbar-icon-button navbar-menu-button ${menuOpen ? "is-active" : ""
              }`}
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label="فتح القائمة"
            aria-expanded={menuOpen}
          >
            <span className="navbar-menu-line" />
            <span className="navbar-menu-line" />
            <span className="navbar-menu-line" />
          </button>

          <div className="navbar-logo">
            <img
              src={logo}
              alt="Talabia"
              className="navbar-logo-img"
            />

          </div>
        </div>

        {/* منتصف الشريط:
            - زائر/مشتري => مربع البحث
            - بائع/أدمن/شركة شحن => عنوان لوحة تحكم */}
        <div
          className={
            "navbar-search" + (roleTitle ? " navbar-search--has-title" : "")
          }
        >
          {roleTitle ? (
            <span className="navbar-role-title">{roleTitle}</span>
          ) : (
            showShopArea && (
              <SearchBar value={searchValue} onChange={handleSearchChange} />
            )
          )}
        </div>

        {/* أقصى اليسار: سلة → مفضلة → إشعارات */}
        <div className="navbar-right">
          {/* السلة */}
          {showShopArea && (
            <button
              type="button"
              className="navbar-icon-button navbar-icon-button--cart"
              onClick={handleCartClick}
              onMouseEnter={() => CartPage.preload()}
              aria-label="السلة"
            >
              <span className="navbar-icon">
                <ShoppingCart size={26} />
                {cartCount > 0 && (
                  <span className="navbar-badge navbar-badge--cart">
                    {cartCount}
                  </span>
                )}
              </span>
            </button>
          )}

          {/* المفضلة */}
          {showShopArea && (
            <button
              type="button"
              className="navbar-icon-button navbar-icon-button--wishlist"
              onClick={handleWishlistClick}
              onMouseEnter={() => WishlistPage.preload()}
              aria-label="المفضلة"
            >
              <span className="navbar-icon">
                <Heart size={26} />
                {wishlistCount > 0 && (
                  <span className="navbar-badge navbar-badge--wishlist">
                    {wishlistCount}
                  </span>
                )}
              </span>
            </button>
          )}

          {/* الإشعارات */}
          <button
            type="button"
            className="navbar-icon-button"
            onClick={handleNotificationsClick}
            onMouseEnter={() => NotificationsPage.preload()}
            aria-label="الإشعارات"
          >
            <span className="navbar-icon">
              <Bell size={26} />
              {notificationsCount > 0 && (
                <span className="navbar-badge navbar-badge--notifications">
                  {notificationsCount}
                </span>
              )}
            </span>
          </button>
        </div>
      </div>

      {menuOpen && (
        <MenuDropdown
          role={user?.role || role}
          onClose={() => setMenuOpen(false)}
        />
      )}
    </header>
  );
}
