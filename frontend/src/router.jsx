// src/router.jsx

import { Routes, Route } from "react-router-dom";

import Home from "@/pages/Home/Home";
import NotificationsPage from "@/pages/Notifications/Notifications";

import BuyerDashboard from "@/pages/Buyer/BuyerDashboard";
import SellerDashboard from "@/pages/Seller/SellerDashboard";
import ShippingDashboard from "@/pages/Shipping/ShippingDashboard";
import AdminDashboard from "@/pages/Admin/AdminDashboard";
import AdminProfile from "@/pages/Admin/AdminProfile"; // ← إضافة مهمة

import Login from "@/pages/Auth/Login";
import Register from "@/pages/Auth/Register";

import CartPage from "@/pages/Cart";
import WishlistPage from "@/pages/Wishlist";
import ProductDetailsPage from "@/pages/ProductDetails";
import AboutPage from "@/pages/About";
import ContactPage from "@/pages/Contact";
import CheckoutPage from "@/pages/Checkout";

import ProtectedRoute from "@/components/Routes/ProtectedRoute";
import RoleRoute from "@/components/Routes/RoleRoute";
import GuestRoute from "@/components/Routes/GuestRoute";

export default function AppRouter() {
  return (
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
      <Route
        path="/buyer"
        element={
          <RoleRoute allowedRoles={["buyer"]}>
            <BuyerDashboard />
          </RoleRoute>
        }
      />

      {/* لوحة البائع */}
      <Route
        path="/seller"
        element={
          <RoleRoute allowedRoles={["seller"]}>
            <SellerDashboard />
          </RoleRoute>
        }
      />

      {/* لوحة شركة الشحن */}
      <Route
        path="/shipping"
        element={
          <RoleRoute allowedRoles={["shipping"]}>
            <ShippingDashboard />
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
    </Routes>
  );
}
