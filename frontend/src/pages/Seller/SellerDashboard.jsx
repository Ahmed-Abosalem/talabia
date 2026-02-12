// frontend/src/pages/Seller/SellerDashboard.jsx
// لوحة البائع (الملف الرئيسي بعد التقسيم إلى أقسام مستقلة)

import "./SellerDashboard.css";
import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Store, BarChart3, ShoppingBag, Info } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";

import {
  getSellerDashboard,
  getSellerStore,
  updateSellerStore,
} from "@/services/sellerService";

import SellerOverviewSection from "./SellerOverviewSection";
import SellerProductsSection from "./SellerProductsSection";
import SellerOrdersSection from "./SellerOrdersSection";
import SellerStoreSettingsSection from "./SellerStoreSettingsSection";

const allowedTabs = ["overview", "products", "orders", "settings"];

// دالة مساعدة لبناء مجال التاريخ حسب الفلتر الزمني
function getDateRangeFromFilter(filter, customFrom, customTo) {
  if (filter === "all") return {};

  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  switch (filter) {
    case "today": {
      return { from: start, to: end };
    }
    case "7d": {
      const s = new Date(start);
      s.setDate(s.getDate() - 6); // آخر 7 أيام
      return { from: s, to: end };
    }
    case "30d": {
      const s = new Date(start);
      s.setDate(s.getDate() - 29); // آخر 30 يوم
      return { from: s, to: end };
    }
    case "year": {
      const s = new Date(start.getFullYear(), 0, 1);
      s.setHours(0, 0, 0, 0);
      return { from: s, to: end };
    }
    case "custom": {
      const range = {};
      if (customFrom) {
        const f = new Date(customFrom);
        if (!isNaN(f)) {
          f.setHours(0, 0, 0, 0);
          range.from = f;
        }
      }
      if (customTo) {
        const t = new Date(customTo);
        if (!isNaN(t)) {
          t.setHours(23, 59, 59, 999);
          range.to = t;
        }
      }
      return range;
    }
    default:
      return {};
  }
}

function buildEmptyAddress() {
  return { country: "", city: "", area: "", street: "", details: "" };
}

function normalizeAddressFromApi(address) {
  if (!address) return buildEmptyAddress();
  if (typeof address === "string") {
    return { ...buildEmptyAddress(), details: address };
  }
  if (typeof address === "object") {
    return {
      country: address.country || "",
      city: address.city || "",
      area: address.area || "",
      street: address.street || "",
      details: address.details || "",
    };
  }
  return buildEmptyAddress();
}

export default function SellerDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth() || {};
  const { showToast } = useApp() || {};

  // قراءة التبويب من رابط ?tab=...
  const searchParams = new URLSearchParams(location.search);
  const tabFromUrl = searchParams.get("tab") || "overview";

  const [activeTab, setActiveTab] = useState(
    allowedTabs.includes(tabFromUrl) ? tabFromUrl : "overview"
  );

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
  });
  const [isOverviewLoading, setIsOverviewLoading] = useState(false);

  // إعدادات المتجر (الاسم، الوصف، الظهور + الهاتف + العنوان)
  const [storeSettings, setStoreSettings] = useState({
    name: "",
    description: "",
    visibility: "visible",
    phone: "",
    address: buildEmptyAddress(),
  });
  const [isSettingsSaving, setIsSettingsSaving] = useState(false);

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
    deliveredOrders: dashboard.completedOrders ?? 0,
    totalRevenue:
      typeof dashboard.totalRevenue === "number" ? dashboard.totalRevenue : 0,
    storeStatus: dashboard.storeStatus || null,
    storeName: dashboard.storeName || storeSettings.name || null,
  };

  const handleTabChange = (tab) => {
    if (!allowedTabs.includes(tab)) return;
    setActiveTab(tab);

    const params = new URLSearchParams(location.search);
    params.set("tab", tab);
    navigate(
      {
        pathname: "/seller",
        search: params.toString(),
      },
      { replace: true }
    );
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
      {/* ===== البلوك العلوي: اسم المتجر + حالة + التبويبات ===== */}
      <section className="seller-top">
        <div className="seller-store-row">
          <div className="seller-store-id">
            <div className="seller-store-avatar">
              <Store size={16} />
            </div>
            {/* 🔸 نفس السطر: الأيقونة + اسم المتجر + مفعل */}
            <div className="seller-store-name">{storeNameLabel}</div>
            <div className="seller-store-status-chip">
              <span className="seller-store-status-dot" />
              <span>{storeStatusLabel}</span>
            </div>
          </div>

          <div className="seller-store-extra">
            {sellerName && (
              <span className="seller-store-user">
                {sellerName}
                {sellerEmail ? ` • ${sellerEmail}` : ""}
              </span>
            )}
          </div>
        </div>

        {/* تبويبات لوحة البائع */}
        <nav className="seller-tabs" aria-label="أقسام لوحة البائع">
          <button
            type="button"
            className={
              activeTab === "overview"
                ? "seller-tab seller-tab-active"
                : "seller-tab"
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
                ? "seller-tab seller-tab-active"
                : "seller-tab"
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
                ? "seller-tab seller-tab-active"
                : "seller-tab"
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
                ? "seller-tab seller-tab-active"
                : "seller-tab"
            }
            onClick={() => handleTabChange("settings")}
          >
            <Info size={16} />
            <span>إعدادات المتجر</span>
          </button>
        </nav>
      </section>

      {/* ===== تبويب: نظرة عامة ===== */}
      {activeTab === "overview" && (
        <SellerOverviewSection
          summary={summary}
          isLoading={isOverviewLoading}
          onGoToTab={handleTabChange}
          dateFilter={dateFilter}
          customFrom={customFrom}
          customTo={customTo}
          onQuickFilterChange={handleQuickDateFilterChange}
          onCustomRangeChange={(from, to) => {
            setCustomFrom(from);
            setCustomTo(to);
          }}
        />
      )}

      {/* ===== تبويب: المنتجات ===== */}
      {activeTab === "products" && <SellerProductsSection />}

      {/* ===== تبويب: الطلبات ===== */}
      {activeTab === "orders" && <SellerOrdersSection />}

      {/* ===== تبويب: إعدادات المتجر ===== */}
      {activeTab === "settings" && (
        <SellerStoreSettingsSection
          storeSettings={storeSettings}
          onChange={handleStoreFieldChange}
          onSubmit={handleStoreSettingsSubmit}
          isSaving={isSettingsSaving}
        />
      )}
    </div>
  );
}
