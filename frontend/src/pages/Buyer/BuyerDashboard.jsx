// frontend/src/pages/Buyer/BuyerDashboard.jsx

import "./BuyerDashboard.css";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { User, Package } from "lucide-react";

import BuyerOrdersSection from "./BuyerOrdersSection";
import BuyerProfileSection from "./BuyerProfileSection";

const TABS = Object.freeze({
  ORDERS: "orders",
  PROFILE: "profile",
});

export default function BuyerDashboard() {
  const location = useLocation();
  const navigate = useNavigate();

  // -------------------------
  // إدارة التبويبات مع مزامنة الـ URL
  // -------------------------
  const searchParams = new URLSearchParams(location.search);
  const initialTab = searchParams.get("tab") || TABS.ORDERS;

  const [activeTab, setActiveTab] = useState(
    Object.values(TABS).includes(initialTab) ? initialTab : TABS.ORDERS
  );

  // مزامنة التبويب إذا تغيّر في الـ URL (مثلاً عند الرجوع للخلف)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get("tab");
    if (tab && Object.values(TABS).includes(tab) && tab !== activeTab) {
      setActiveTab(tab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    const params = new URLSearchParams(location.search);
    params.set("tab", tabKey);
    navigate(`?${params.toString()}`, { replace: true });
  };

  // -------------------------
  // واجهة صفحة المشتري
  // -------------------------
  return (
    <div className="buyer-dashboard">
      {/* تبويبات صفحة المشتري */}
      <div className="buyer-tabs">
        <button
          type="button"
          className={`buyer-tab ${activeTab === TABS.ORDERS ? "is-active" : ""}`}
          onClick={() => handleTabChange(TABS.ORDERS)}
        >
          <Package className="buyer-tab-icon" />
          <span>طلباتي</span>
        </button>

        <button
          type="button"
          className={`buyer-tab ${
            activeTab === TABS.PROFILE ? "is-active" : ""
          }`}
          onClick={() => handleTabChange(TABS.PROFILE)}
        >
          <User className="buyer-tab-icon" />
          <span>الملف الشخصي</span>
        </button>
      </div>

      {/* محتوى التبويبات */}
      <main className="buyer-dashboard-content">
        {activeTab === TABS.ORDERS && <BuyerOrdersSection />}
        {activeTab === TABS.PROFILE && <BuyerProfileSection />}
      </main>
    </div>
  );
}
