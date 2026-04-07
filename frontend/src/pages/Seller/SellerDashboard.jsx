// frontend/src/pages/Seller/SellerDashboard.jsx
// لوحة البائع

import "./SellerDashboard.css";
import { useLocation, useNavigate, Outlet } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { Store, BarChart3, ShoppingBag, Info, Wallet } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";

import {
  getSellerDashboard,
  getSellerStore,
  updateSellerStore,
} from "@/services/sellerService";

import {
  getDateRangeFromFilter,
  buildEmptyAddress,
  normalizeAddressFromApi,
} from "@/utils/dashboardUtils";



const allowedTabs = ["overview", "products", "orders", "settings", "wallet"];

export default function SellerDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth() || {};
  const { showToast } = useApp() || {};

  // تحديد التبويب من المسار (Pathname)
  const getTabFromPath = (pathname) => {
    const parts = pathname.split("/").filter(Boolean);
    // parts = ['seller'] أو ['seller', 'products']
    if (parts.length <= 1) return "overview";
    const tabName = parts[1];
    return allowedTabs.includes(tabName) ? tabName : "overview";
  };

  const [activeTab, setActiveTab] = useState(() => getTabFromPath(location.pathname));

  // مزامنة التبويب النشط عند تغيير الرابط
  useEffect(() => {
    const tab = getTabFromPath(location.pathname);
    if (tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [location.pathname, activeTab]);

  // 🔹 فلتر زمني لنظرة عامة
  const [dateFilter, setDateFilter] = useState("all"); // all, today, 7d, 30d, year, custom
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  // بيانات ملخص لوحة البائع
  const [dashboard, setDashboard] = useState({
    storeStatus: null,
    storeName: null,
    totalProducts: 0,
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalRevenue: 0,
    receivedBalance: 0,
    lifetimeRevenue: 0,
  });
  const [isOverviewLoading, setIsOverviewLoading] = useState(false);

  const [storeSettings, setStoreSettings] = useState({
    name: "",
    description: "",
    visibility: "visible",
    phone: "",
    address: buildEmptyAddress(),
  });
  const [isSettingsSaving, setIsSettingsSaving] = useState(false);

  // 📐 Dynamic Spacer Sync: Perfectly match spacer height to fixed header
  const headerRef = useRef(null);
  const [spacerHeight, setSpacerHeight] = useState(124); // Fallback standard height

  useEffect(() => {
    const headerEl = headerRef.current;
    if (!headerEl) return;

    // Monitor exact height changes (e.g. from name wrapping or mobile switching)
    const observer = new ResizeObserver((entries) => {
      if (entries[0]) {
        // Use offsetHeight as a reliable cross-browser measure of total block size
        setSpacerHeight(headerEl.offsetHeight);
      }
    });

    observer.observe(headerEl);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      try {
        setIsOverviewLoading(true);

        const range = getDateRangeFromFilter(dateFilter, customFrom, customTo);

        const params = {};
        if (range.from) params.from = range.from.toISOString();
        if (range.to) params.to = range.to.toISOString();

        const data = await getSellerDashboard(params);
        if (!isMounted || !data) return;

        setDashboard({
          storeStatus: data.storeStatus ?? null,
          storeName: data.storeName ?? null,
          totalProducts:
            typeof data.totalProducts === "number" ? data.totalProducts : 0,
          totalOrders:
            typeof data.totalOrders === "number" ? data.totalOrders : 0,
          pendingOrders:
            typeof data.pendingOrders === "number" ? data.pendingOrders : 0,
          completedOrders:
            typeof data.completedOrders === "number" ? data.completedOrders : 0,
          totalRevenue:
            typeof data.totalRevenue === "number" ? data.totalRevenue : 0,
          receivedBalance:
            typeof data.receivedBalance === "number" ? data.receivedBalance : 0,
          lifetimeRevenue:
            typeof data.lifetimeRevenue === "number" ? data.lifetimeRevenue : 0,
        });
      } catch (error) {
        if (showToast) {
          const message =
            error?.response?.data?.message ||
            error?.message ||
            "تعذّر تحميل بيانات لوحة البائع.";
          showToast(message, "error");
        }
      } finally {
        if (isMounted) setIsOverviewLoading(false);
      }
    }

    async function loadStoreSettings() {
      try {
        const data = await getSellerStore();
        if (!isMounted || !data) return;

        setStoreSettings({
          name: data.name || data.storeName || "",
          description: data.description || "",
          visibility: data.visibility || "visible",
          phone: data.phone || "",
          address: normalizeAddressFromApi(data.address),
        });
      } catch {
        // إذا لم يكن للبايع متجر مُنشأ بعد، نتجاهل الخطأ ونترك القيم الافتراضية
      }
    }

    loadDashboard();
    loadStoreSettings();

    return () => {
      isMounted = false;
    };
  }, [showToast, dateFilter, customFrom, customTo]);

  const sellerName = user?.name || user?.fullName || "البائع";
  const sellerEmail = user?.email || "";

  // ملخص مشتق من بيانات لوحة البائع وإعدادات المتجر
  const summary = {
    totalProducts: dashboard.totalProducts ?? 0,
    totalOrders: dashboard.totalOrders ?? 0,
    pendingOrders: dashboard.pendingOrders ?? 0,
    completedOrders: dashboard.completedOrders ?? 0,
    totalRevenue:
      typeof dashboard.totalRevenue === "number" ? dashboard.totalRevenue : 0,
    receivedBalance: dashboard.receivedBalance ?? 0,
    lifetimeRevenue: dashboard.lifetimeRevenue ?? 0,
    storeStatus: dashboard.storeStatus || null,
    storeName: dashboard.storeName || storeSettings.name || null,
  };

  const handleTabChange = (tab) => {
    if (!allowedTabs.includes(tab)) return;
    setActiveTab(tab);

    const path = tab === "overview" ? "/seller" : `/seller/${tab}`;
    navigate(path);
  };

  // ✅ دعم تعديل الحقول العادية + حقول العنوان بنمط address.city ...إلخ
  const handleStoreFieldChange = (field, value) => {
    setStoreSettings((prev) => {
      if (field && field.startsWith("address.")) {
        const key = field.replace("address.", "");
        return {
          ...prev,
          address: {
            ...(prev.address || buildEmptyAddress()),
            [key]: value,
          },
        };
      }
      return {
        ...prev,
        [field]: value,
      };
    });
  };

  const handleStoreSettingsSubmit = async (e) => {
    e.preventDefault();

    try {
      setIsSettingsSaving(true);

      const payload = {
        name: (storeSettings.name || "").trim(),
        description: (storeSettings.description || "").trim(),
        visibility: storeSettings.visibility,
        phone: (storeSettings.phone || "").trim(),
        address: {
          country: (storeSettings.address?.country || "").trim(),
          city: (storeSettings.address?.city || "").trim(),
          area: (storeSettings.address?.area || "").trim(),
          street: (storeSettings.address?.street || "").trim(),
          details: (storeSettings.address?.details || "").trim(),
        },
      };

      await updateSellerStore(payload);

      if (showToast) {
        showToast("تم حفظ إعدادات المتجر بنجاح.", "success");
      }
    } catch (error) {
      if (showToast) {
        const message =
          error?.response?.data?.message ||
          error?.message ||
          "تعذّر حفظ إعدادات المتجر.";
        showToast(message, "error");
      }
    } finally {
      setIsSettingsSaving(false);
    }
  };

  const handleQuickDateFilterChange = (value) => {
    setDateFilter(value);
    if (value !== "custom") {
      setCustomFrom("");
      setCustomTo("");
    }
  };

  // نص حالة المتجر
  const storeStatusLabel =
    summary.storeStatus === "approved"
      ? "مفعل"
      : summary.storeStatus === "pending"
        ? "في انتظار موافقة الإدارة"
        : summary.storeStatus === "suspended"
          ? "موقوف مؤقتًا"
          : summary.storeStatus === "rejected"
            ? "مرفوض"
            : "غير محدد";

  const storeNameLabel = summary.storeName || "لم يتم تسمية المتجر بعد";

  return (
    <div className="seller-page">
      {/* ===== الهيدر العلوي: معلومات المتجر والمالك (ثابت) ===== */}
      <section className="seller-top-header" ref={headerRef}>
        <div className="seller-header-main">
          <div className="seller-store-info">
            <div className="seller-store-avatar">
              <Store size={20} />
            </div>
            <div className="seller-name-status">
              <h1 className="seller-store-display-name">{storeNameLabel}</h1>
              <div className="seller-status-badge">
                <span className="seller-status-dot" />
                <span>{storeStatusLabel}</span>
              </div>
            </div>
          </div>

          <div className="seller-owner-info">
            {sellerName && (
              <div className="seller-owner-details">
                <span className="seller-owner-name">{sellerName}</span>
                {sellerEmail && <span className="seller-owner-email">{sellerEmail}</span>}
              </div>
            )}
          </div>
        </div>

        {/* تبويبات لوحة البائع - تظهر في الكمبيوتر فقط */}
        <nav className="seller-nav-tabs" aria-label="أقسام لوحة البائع">
          <button
            type="button"
            className={
              activeTab === "overview"
                ? "seller-tab-btn is-active"
                : "seller-tab-btn"
            }
            onClick={() => handleTabChange("overview")}
          >
            <BarChart3 size={16} />
            <span>نظرة عامة</span>
          </button>

          <button
            type="button"
            className={
              activeTab === "products"
                ? "seller-tab-btn is-active"
                : "seller-tab-btn"
            }
            onClick={() => handleTabChange("products")}
          >
            <Store size={16} />
            <span>المنتجات</span>
          </button>

          <button
            type="button"
            className={
              activeTab === "orders"
                ? "seller-tab-btn is-active"
                : "seller-tab-btn"
            }
            onClick={() => handleTabChange("orders")}
          >
            <ShoppingBag size={16} />
            <span>الطلبات</span>
          </button>

          <button
            type="button"
            className={
              activeTab === "settings"
                ? "seller-tab-btn is-active"
                : "seller-tab-btn"
            }
            onClick={() => handleTabChange("settings")}
          >
            <Info size={16} />
            <span>إعدادات المتجر</span>
          </button>

          <button
            type="button"
            className={
              activeTab === "wallet"
                ? "seller-tab-btn is-active"
                : "seller-tab-btn"
            }
            onClick={() => handleTabChange("wallet")}
          >
            <Wallet size={16} />
            <span>محفظتي</span>
          </button>
        </nav>
      </section>
      
      {/* 🧱 Fixed Header Spacer: Dynamically synced to prevent content occlusion */}
      <div className="seller-header-spacer" style={{ height: `${spacerHeight}px` }} />

      {/* ===== المحتوى المتغير (التبويبات أو الصفحات المستقلة) ===== */}
      <Outlet
        context={{
          summary,
          isLoading: isOverviewLoading,
          onGoToTab: handleTabChange,
          dateFilter,
          customFrom,
          customTo,
          onQuickFilterChange: handleQuickDateFilterChange,
          onCustomRangeChange: (from, to) => {
            setCustomFrom(from);
            setCustomTo(to);
          },
          storeSettings,
          handleStoreFieldChange,
          handleStoreSettingsSubmit,
          isSettingsSaving,
        }}
      />
    </div>
  );
}
