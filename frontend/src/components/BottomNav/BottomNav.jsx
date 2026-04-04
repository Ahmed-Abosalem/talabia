// s:\Talabia_new\frontend\src\components\BottomNav\BottomNav.jsx
import React from "react";
import {
    Home,
    Heart,
    ShoppingCart,
    Package,
    User,
    Plus,
    LayoutDashboard,
    Box,
    Settings,
    ClipboardList,
    MessageSquare,
    MonitorDot,
    LogOut
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";
import { useNavigate, useLocation } from "react-router-dom";
import "./BottomNav.css";

const BottomNav = () => {
    const { isLoggedIn, role, user, logout } = useAuth();
    const { cartCount, wishlistCount } = useApp();
    const navigate = useNavigate();
    const location = useLocation();

    // Determine current role for logic
    const effectiveRole = isLoggedIn ? (user?.isOwner ? "owner" : role) : "guest";

    const handleProtectedNavigation = (path) => {
        if (!isLoggedIn) {
            navigate("/login");
        } else {
            navigate(path);
        }
        window.scrollTo({ top: 0, behavior: "instant" });
    };

    const handleSimpleNavigation = (path) => {
        navigate(path);
        window.scrollTo({ top: 0, behavior: "instant" });
    };

    // Configuration for different roles
    const navConfigs = {
        guest: {
            items: [
                { id: "home", label: "الرئيسية", icon: Home, path: "/" },
                { id: "wishlist", label: "المفضلة", icon: Heart, path: "/wishlist", badge: wishlistCount },
                { id: "center", type: "center", label: "السلة", icon: ShoppingCart, path: "/cart", variant: "cart", badge: cartCount },
                { id: "orders", label: "طلباتي", icon: Package, path: "/buyer/orders", protected: true },
                { id: "profile", label: "حسابي", icon: User, path: "/buyer/profile", protected: true }
            ]
        },
        buyer: {
            items: [
                { id: "home", label: "الرئيسية", icon: Home, path: "/" },
                { id: "wishlist", label: "المفضلة", icon: Heart, path: "/wishlist", badge: wishlistCount },
                { id: "center", type: "center", label: "السلة", icon: ShoppingCart, path: "/cart", variant: "cart", badge: cartCount },
                { id: "orders", label: "طلباتي", icon: Package, path: "/buyer/orders" },
                { id: "profile", label: "حسابي", icon: User, path: "/buyer/profile" }
            ]
        },
        seller: {
            items: [
                { id: "overview", label: "نظرة عامة", icon: LayoutDashboard, path: "/seller" },
                { id: "products", label: "المنتجات", icon: Box, path: "/seller/products" },
                { id: "center", type: "center", label: "إضافة", icon: Plus, path: "/seller/products/add", variant: "add" },
                { id: "orders", label: "الطلبات", icon: ClipboardList, path: "/seller/orders" },
                { id: "settings", label: "المتجر", icon: Settings, path: "/seller/settings" }
            ]
        },
        shipper: {
            items: [
                { id: "home", label: "الرئيسية", icon: Home, path: "/" },
                { id: "center", type: "center", label: "الطلبات", icon: ClipboardList, path: "/shipping", variant: "shipping" },
                { id: "contact", label: "تواصل معنا", icon: MessageSquare, path: "/contact" }
            ]
        },
        admin: {
            items: [
                { id: "home", label: "الرئيسية", icon: Home, path: "/" },
                { id: "center", type: "center", label: "لوحة التحكم", icon: MonitorDot, path: "/admin", variant: "admin" },
                { id: "logout", label: "خروج", icon: LogOut, action: "logout" }
            ]
        },
        owner: {
            items: [
                { id: "home", label: "الرئيسية", icon: Home, path: "/" },
                { id: "center", type: "center", label: "لوحة التحكم", icon: MonitorDot, path: "/admin", variant: "admin" },
                { id: "logout", label: "خروج", icon: LogOut, action: "logout" }
            ]
        }
    };

    const rawConfig = navConfigs[effectiveRole] || navConfigs.guest;
    
    /**
     * 🏗️ THE 5-SLOT MATRIX NORMALIZATION
     * To maintain absolute symmetry and keep the 'Center' item in the center slot
     * regardless of the role's item count, we map roles with 3 items to slots 1, 3, and 5.
     * This preserves the grid-based 20% segment distribution requested in the architecture.
     */
    let displayItems = [...rawConfig.items];
    if (displayItems.length === 3) {
        displayItems = [
            displayItems[0], // Slot 1: Right
            { id: "spacer1", type: "spacer" }, // Slot 2: Empty
            displayItems[1], // Slot 3: Center (Concave Dip)
            { id: "spacer2", type: "spacer" }, // Slot 4: Empty
            displayItems[2]  // Slot 5: Left
        ];
    }

    return (
        <nav className="buyer-bottom-nav-root">
            {/* 🏗️ SVG CONCAVE CRADLE: The "Dip Down" Geometry */}
            {displayItems.some(item => item?.type === "center") && (
                <svg
                    className="nav-notch-svg"
                    viewBox="0 0 100 90"
                    preserveAspectRatio="none"
                >
                    <path d="M 0 0 H 35 C 41 0, 44 40, 50 40 C 56 40, 59 0, 65 0 H 100 V 90 H 0 Z" />
                </svg>
            )}

            {displayItems.map((item) => {
                if (!item || item.type === "spacer") {
                    return <div key={item?.id || Math.random()} className="nav-item-spacer-only" />;
                }

                const isActive = item.path
                    ? (item.path.includes("?")
                        ? (location.pathname + location.search === item.path)
                        : (location.pathname === item.path))
                    : false;

                if (item.type === "center") {
                    return (
                        <div key={item.id} className={`nav-item cart-item-wrapper ${isActive ? 'active' : ''}`} onClick={() => item.protected ? handleProtectedNavigation(item.path) : handleSimpleNavigation(item.path)}>
                            <div className={`floating-cart-btn variant-${item.variant || 'default'}`}>
                                <div className="cart-outer-circle">
                                    <div className="cart-inner-circle">
                                        <item.icon className="cart-icon-olive" size={26} />
                                        {item.badge > 0 && (
                                            <span className="navbar-badge nav-badge-center">{item.badge}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="nav-icon-spacer" />
                            <span className="nav-item-label">{item.label}</span>
                        </div>
                    );
                }

                return (
                    <button
                        key={item.id}
                        className={`nav-item ${isActive ? 'active' : ''}`}
                        onClick={() => {
                            if (item.action === "logout") {
                                logout();
                                navigate("/");
                            } else if (item.protected) {
                                handleProtectedNavigation(item.path);
                            } else {
                                handleSimpleNavigation(item.path);
                            }
                        }}
                    >
                        <div className="nav-icon-wrapper">
                            <item.icon size={22} className="nav-icon" />
                            {item.badge > 0 && (
                                <span className="navbar-badge nav-badge-side">{item.badge}</span>
                            )}
                        </div>
                        <span className="nav-item-label">{item.label}</span>
                    </button>
                );
            })}
        </nav>
    );
};

export default BottomNav;
