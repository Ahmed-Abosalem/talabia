// src/router.jsx

import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import Loader from "@/components/Loader";

// ⚡ High-Performance Utility: lazy with preloading capability
const lazyWithPreload = (factory) => {
  const Component = lazy(factory);
  Component.preload = factory;
  return Component;
};

// 🚀 Core Components (Loaded Immediately)
import Home from "@/pages/Home/Home";

// 📦 Dynamic Imports (Lazy Loaded Chunks)
const NotificationsPage = lazyWithPreload(() => import("@/pages/Notifications/Notifications"));
const BuyerLayout = lazyWithPreload(() => import("@/pages/Buyer/BuyerLayout"));
const BuyerOrdersSection = lazyWithPreload(() => import("@/pages/Buyer/BuyerOrdersSection"));
const BuyerProfileSection = lazyWithPreload(() => import("@/pages/Buyer/BuyerProfileSection"));
const WalletPage = lazyWithPreload(() => import("@/pages/Buyer/Wallet/WalletPage"));
const SellerDashboard = lazyWithPreload(() => import("@/pages/Seller/SellerDashboard"));
const SellerOverviewSection = lazyWithPreload(() => import("@/pages/Seller/SellerOverviewSection"));
const SellerProductsSection = lazyWithPreload(() => import("@/pages/Seller/SellerProductsSection"));
const SellerOrdersSection = lazyWithPreload(() => import("@/pages/Seller/SellerOrdersSection"));
const SellerStoreSettingsSection = lazyWithPreload(() => import("@/pages/Seller/SellerStoreSettingsSection"));
const AddProductPage = lazyWithPreload(() => import("@/pages/Seller/AddProductPage"));
const ShippingDashboard = lazyWithPreload(() => import("@/pages/Shipping/ShippingDashboard"));
const OrderItemDetailsPage = lazyWithPreload(() => import("@/pages/Shipping/OrderItemDetailsPage"));
const AdminDashboard = lazyWithPreload(() => import("@/pages/Admin/AdminDashboard"));
const AdminProfile = lazyWithPreload(() => import("@/pages/Admin/AdminProfile"));
const AdminUserDetailsPage = lazyWithPreload(() => import("@/pages/Admin/AdminUserDetailsPage"));
const AdminUserNotifyPage = lazyWithPreload(() => import("@/pages/Admin/AdminUserNotifyPage"));
const AdminSellerDetailsPage = lazyWithPreload(() => import("@/pages/Admin/AdminSellerDetailsPage"));
const AdminOrderItemDetailsPage = lazyWithPreload(() => import("@/pages/Admin/AdminOrderItemDetailsPage"));
const AdminAddStaffPage = lazyWithPreload(() => import("@/pages/Admin/AdminAddStaffPage"));
const AdminAddAdPage = lazyWithPreload(() => import("@/pages/Admin/AdminAddAdPage"));
const AdminAddShippingPage = lazyWithPreload(() => import("@/pages/Admin/AdminAddShippingPage"));
const AdminAddCategoryPage = lazyWithPreload(() => import("@/pages/Admin/AdminAddCategoryPage"));
const AdminAddSynonymPage = lazyWithPreload(() => import("@/pages/Admin/AdminAddSynonymPage"));
const AdminPayoutPage = lazyWithPreload(() => import("@/pages/Admin/AdminPayoutPage"));
const AdminFinancialLogPage = lazyWithPreload(() => import("@/pages/Admin/AdminFinancialLogPage"));
const AdminNotifyAllPage = lazyWithPreload(() => import("@/pages/Admin/AdminNotifyAllPage"));
const AdminProductDetailsPage = lazyWithPreload(() => import("@/pages/Admin/AdminProductDetailsPage"));
const AdminWalletDetailsPage = lazyWithPreload(() => import("@/pages/Admin/AdminWalletDetailsPage"));
const AdminShippingScopePage = lazyWithPreload(() => import("@/pages/Admin/AdminShippingScopePage"));

const Login = lazyWithPreload(() => import("@/pages/Auth/Login"));
const Register = lazyWithPreload(() => import("@/pages/Auth/Register"));
const CartPage = lazyWithPreload(() => import("@/pages/Cart"));
const WishlistPage = lazyWithPreload(() => import("@/pages/Wishlist"));
const ProductDetailsPage = lazyWithPreload(() => import("@/pages/ProductDetails"));
const AboutPage = lazyWithPreload(() => import("@/pages/About"));
const ContactPage = lazyWithPreload(() => import("@/pages/Contact"));
const CheckoutPage = lazyWithPreload(() => import("@/pages/Checkout"));
const PrivacyPolicy = lazyWithPreload(() => import("@/pages/PrivacyPolicy"));
const AppDownloadPage = lazyWithPreload(() => import("@/pages/App/AppDownloadPage"));

import ProtectedRoute from "@/components/Routes/ProtectedRoute";
import RoleRoute from "@/components/Routes/RoleRoute";
import GuestRoute from "@/components/Routes/GuestRoute";

export default function AppRouter() {
  return (
    <Suspense fallback={<Loader />}>
      <Routes>
        {/* الصفحة الرئيسية */}
        <Route path="/" element={<Home />} />

        {/* الإشعارات (محمية) */}
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <NotificationsPage />
            </ProtectedRoute>
          }
        />

        {/* لوحة المشتري */}
        {/* لوحة المشتري */}
        {/* لوحة المشتري */}
        {/* لوحة المشتري */}
        <Route
          path="/buyer"
          element={
            <RoleRoute allowedRoles={["buyer"]}>
              <BuyerLayout />
            </RoleRoute>
          }
        >
          <Route index element={<BuyerOrdersSection />} />
          <Route path="orders" element={<BuyerOrdersSection />} />
          <Route path="profile" element={<BuyerProfileSection />} />
          <Route path="wallet" element={<WalletPage />} />
        </Route>

        {/* لوحة البائع */}
        <Route
          path="/seller"
          element={
            <RoleRoute allowedRoles={["seller"]}>
              <SellerDashboard />
            </RoleRoute>
          }
        >
          <Route index element={<SellerOverviewSection />} />
          <Route path="products" element={<SellerProductsSection />} />
          <Route path="products/add" element={<AddProductPage />} />
          <Route path="products/edit/:id" element={<AddProductPage />} />
          <Route path="orders" element={<SellerOrdersSection />} />
          <Route path="settings" element={<SellerStoreSettingsSection />} />
          <Route path="wallet" element={<WalletPage />} />
        </Route>

        {/* لوحة شركة الشحن */}
        <Route
          path="/shipping"
          element={
            <RoleRoute allowedRoles={["shipper"]}>
              <ShippingDashboard />
            </RoleRoute>
          }
        />

        {/* تفاصيل كرت الطلب */}
        <Route
          path="/shipping/orders/:orderId/items/:itemId"
          element={
            <RoleRoute allowedRoles={["shipper"]}>
              <OrderItemDetailsPage />
            </RoleRoute>
          }
        />

        {/* لوحة الأدمن */}
        <Route
          path="/admin"
          element={
            <RoleRoute allowedRoles={["admin"]}>
              <AdminDashboard />
            </RoleRoute>
          }
        />

        {/* صفحة تعديل حساب الأدمن */}
        <Route
          path="/admin/profile"
          element={
            <RoleRoute allowedRoles={["admin"]}>
              <AdminProfile />
            </RoleRoute>
          }
        />

        <Route
          path="/admin/users/details/:id"
          element={
            <RoleRoute allowedRoles={["admin"]}>
              <AdminUserDetailsPage />
            </RoleRoute>
          }
        />

        <Route
          path="/admin/users/notify/:id"
          element={
            <RoleRoute allowedRoles={["admin"]}>
              <AdminUserNotifyPage />
            </RoleRoute>
          }
        />

        <Route
          path="/admin/products/details/:id"
          element={
            <RoleRoute allowedRoles={["admin"]}>
              <AdminProductDetailsPage />
            </RoleRoute>
          }
        />

        <Route
          path="/admin/sellers/details/:id"
          element={
            <RoleRoute allowedRoles={["admin"]}>
              <AdminSellerDetailsPage />
            </RoleRoute>
          }
        />

        {/* صفحات إدارية محولة من نوافذ منبثقة */}
        <Route
          path="/admin/staff/add"
          element={
            <RoleRoute allowedRoles={["admin"]}>
              <AdminAddStaffPage />
            </RoleRoute>
          }
        />

        <Route
          path="/admin/ads/add"
          element={
            <RoleRoute allowedRoles={["admin"]}>
              <AdminAddAdPage />
            </RoleRoute>
          }
        />

        <Route
          path="/admin/shipping/add"
          element={
            <RoleRoute allowedRoles={["admin"]}>
              <AdminAddShippingPage />
            </RoleRoute>
          }
        />

        <Route
          path="/admin/shipping/select-scope"
          element={
            <RoleRoute allowedRoles={["admin"]}>
              <AdminShippingScopePage />
            </RoleRoute>
          }
        />

        <Route
          path="/admin/categories/add"
          element={
            <RoleRoute allowedRoles={["admin"]}>
              <AdminAddCategoryPage />
            </RoleRoute>
          }
        />

        <Route
          path="/admin/synonyms/add"
          element={
            <RoleRoute allowedRoles={["admin"]}>
              <AdminAddSynonymPage />
            </RoleRoute>
          }
        />

        <Route
          path="/admin/financial/payout"
          element={
            <RoleRoute allowedRoles={["admin"]}>
              <AdminPayoutPage />
            </RoleRoute>
          }
        />

        <Route
          path="/admin/financial/log"
          element={
            <RoleRoute allowedRoles={["admin"]}>
              <AdminFinancialLogPage />
            </RoleRoute>
          }
        />

        <Route
          path="/admin/security/add-staff"
          element={
            <RoleRoute allowedRoles={["admin"]}>
              <AdminAddStaffPage />
            </RoleRoute>
          }
        />

        <Route
          path="/admin/notify-all"
          element={
            <RoleRoute allowedRoles={["admin"]}>
              <AdminNotifyAllPage />
            </RoleRoute>
          }
        />

        {/* تفاصيل المحفظة */}
        <Route
          path="/admin/wallets/details/:id"
          element={
            <RoleRoute allowedRoles={["admin"]}>
              <AdminWalletDetailsPage />
            </RoleRoute>
          }
        />

        <Route
          path="/admin/orders/:orderId/items/:itemId"
          element={
            <RoleRoute allowedRoles={["admin"]}>
              <AdminOrderItemDetailsPage />
            </RoleRoute>
          }
        />

        {/* تسجيل الدخول */}
        <Route
          path="/login"
          element={
            <GuestRoute>
              <Login />
            </GuestRoute>
          }
        />

        {/* إنشاء حساب */}
        <Route
          path="/register"
          element={
            <GuestRoute>
              <Register />
            </GuestRoute>
          }
        />

        {/* بقية الصفحات العامة */}
        <Route path="/cart" element={<CartPage />} />
        <Route path="/wishlist" element={<WishlistPage />} />
        <Route path="/products/:id" element={<ProductDetailsPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/download-app" element={<AppDownloadPage />} />
        
        {/* 404 / Catch-all Redirect to Home */}
        <Route path="*" element={<Home />} />
      </Routes>
    </Suspense>
  );
}

// 🚀 Export for Strategic Preloading
export { ProductDetailsPage, Login, CartPage, WishlistPage, NotificationsPage };

// ⚡ Role-Based Preloading: pre-fetch all chunks for a role after login
// This runs in the background so the user never sees a loading spinner
export function preloadForRole(role) {
  // Common pages all logged-in users need
  NotificationsPage.preload();

  switch (role) {
    case "admin":
      AdminDashboard.preload();
      // Admin sections are lazy-loaded inside AdminDashboard,
      // so we trigger their import() to cache them in the browser
      import("@/pages/Admin/sections/AdminOverviewSection");
      import("@/pages/Admin/sections/AdminUsersSection");
      import("@/pages/Admin/sections/AdminSellersSection");
      import("@/pages/Admin/sections/AdminProductsSection");
      import("@/pages/Admin/sections/AdminOrdersSection");
      import("@/pages/Admin/sections/AdminShippingSection");
      import("@/pages/Admin/sections/AdminAdsSection");
      import("@/pages/Admin/sections/AdminCategoriesSection");
      import("@/pages/Admin/sections/AdminFinancialSection");
      import("@/pages/Admin/sections/AdminReportsSection");
      import("@/pages/Admin/sections/AdminNotificationsSection");
      import("@/pages/Admin/sections/AdminSupportSection");
      import("@/pages/Admin/sections/AdminSecuritySection");
      import("@/pages/Admin/sections/AdminPrivacyPolicySection");
      import("@/pages/Admin/sections/AdminSynonymsSection");
      import("@/pages/Admin/sections/AdminPaymentSection");
      import("@/pages/Admin/sections/AdminWalletSection");
      import("@/pages/Admin/AdminProfile");
      AdminWalletDetailsPage.preload();
      AdminShippingScopePage.preload();
      break;

    case "seller":
      SellerDashboard.preload();
      SellerOverviewSection.preload();
      SellerProductsSection.preload();
      SellerOrdersSection.preload();
      SellerStoreSettingsSection.preload();
      AddProductPage.preload();
      WalletPage.preload();
      break;

    case "buyer":
      BuyerLayout.preload();
      BuyerOrdersSection.preload();
      BuyerProfileSection.preload();
      WalletPage.preload();
      CartPage.preload();
      WishlistPage.preload();
      CheckoutPage.preload();
      ProductDetailsPage.preload();
      break;

    case "shipper":
      ShippingDashboard.preload();
      OrderItemDetailsPage.preload();
      break;
  }
}
