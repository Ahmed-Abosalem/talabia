import React, { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import styled, { keyframes, css } from "styled-components";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  CreditCard,
  Package,
  Truck,
  ArrowLeft,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import logo from "@/assets/logo.png";

// Components
import PremiumInput from "@/components/Auth/PremiumInput";
import ActionButton from "@/components/Auth/ActionButton";
import RoleCard from "@/components/Auth/RoleCard";
import {
  PageWrapper,
  FormSection,
  FormContainer,
  CardHeader,
  BrandLogo,
  Title,
  Subtitle,
  LegalNotice,
  fadeIn,
} from "./AuthStyles";

const RoleGrid = styled.div`
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const ErrorMessage = styled.div`
  background: #fef2f2;
  color: #b91c1c;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  border-right: 4px solid #ef4444;
  font-size: 0.9rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
  text-align: center;
  animation: ${fadeIn} 0.3s ease;
`;

const NoticeBox = styled.div`
  background: #f0f7ff;
  color: #0c4a6e;
  padding: 1rem;
  border-radius: 12px;
  border-right: 4px solid #0ea5e9;
  font-size: 0.95rem;
  line-height: 1.6;
  font-weight: 500;
  margin-bottom: 1.5rem;
  text-align: center;
  animation: ${fadeIn} 0.3s ease;
  
  strong {
    display: block;
    margin-bottom: 0.25rem;
    color: #0284c7;
    font-weight: 700;
  }
`;

const roles = [
  { id: "buyer", label: "مشتري", icon: CreditCard, color: "#4b502a" },
  { id: "seller", label: "بائع", icon: Package, color: "#ff7f00" },
];

const roleColors = {
  buyer: "#4b502a",
  seller: "#ff7f00",
  shipper: "#a30000",
  admin: "#4b502a",
};

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useApp() || {};
  const { login, isLoggedIn, role: currentRole } = useAuth() || {};

  const [selectedRole, setSelectedRole] = useState(null);
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const roleFromQuery = params.get("role");
    const messageFromQuery = params.get("message");

    if (roleFromQuery && ["buyer", "seller", "shipper", "admin"].includes(roleFromQuery)) {
      setSelectedRole(roleFromQuery);
    } else if (messageFromQuery === "guest_checkout") {
      setSelectedRole("buyer");
    }
  }, [location.search]);

  useEffect(() => {
    if (isLoggedIn && currentRole) {
      setRedirecting(true);
      setTimeout(() => redirectToDashboard(currentRole), 800);
    }
  }, [isLoggedIn, currentRole]);

  const activeColor = (selectedRole && roleColors[selectedRole]) || "#4b502a";

  const handleRoleSelect = (roleId) => {
    setSelectedRole(roleId);
    setErrors({});
  };

  const validateForm = () => {
    const newErrors = {};
    if (!selectedRole) newErrors.role = "اختر نوع الحساب وقم بتسجيل الدخول";
    if (!formData.email.trim()) newErrors.email = "الرجاء إدخال البريد الإلكتروني.";
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = "صيغة البريد غير صحيحة.";
    if (!formData.password.trim()) newErrors.password = "الرجاء إدخال كلمة المرور.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const redirectToDashboard = (roleId) => {
    navigate(`/${roleId}`, { replace: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading || redirecting || !validateForm()) return;

    setIsLoading(true);
    try {
      await login({
        email: formData.email.trim(),
        password: formData.password.trim(),
        role: selectedRole,
        rememberMe: true,
      });
      showToast?.("تم تسجيل الدخول بنجاح.", "success");
      setRedirecting(true);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "حدث خطأ ما.";
      setErrors({ general: msg });
      showToast?.(msg, "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageWrapper>
      <FormSection>
        <FormContainer>
          <CardHeader>
            <BrandLogo src={logo} alt="Talabia" />
            <Subtitle>اختر نوع الحساب وقم بتسجيل الدخول</Subtitle>
          </CardHeader>

          {new URLSearchParams(location.search).get("message") === "guest_checkout" && (
            <NoticeBox>
              <strong>إتمام عملية الشراء</strong>
              لإتمام عملية الشراء ومتابعة طلبك، يرجى تسجيل الدخول أو إنشاء حساب. هذا يساعدك على حفظ بياناتك وتتبع طلباتك بسهولة.
            </NoticeBox>
          )}

          <RoleGrid>
            {roles.map((r) => (
              <RoleCard
                key={r.id}
                label={r.label}
                icon={r.icon}
                color={r.color}
                active={selectedRole === r.id}
                onClick={() => handleRoleSelect(r.id)}
              />
            ))}
          </RoleGrid>

          {errors.role && (
            <ErrorMessage>
              {errors.role}
            </ErrorMessage>
          )}

          <form onSubmit={handleSubmit}>
            <PremiumInput
              label="البريد الإلكتروني"
              icon={Mail}
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              error={errors.email}
              activeColor={activeColor}
            />

            <PremiumInput
              label="كلمة المرور"
              icon={Lock}
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              error={errors.password}
              activeColor={activeColor}
              endAction={
                <div onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </div>
              }
            />

            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2rem", fontSize: "0.85rem" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                <input type="checkbox" defaultChecked /> تذكرني
              </label>
              <Link to="/forgot-password" style={{ color: activeColor, fontWeight: 700, textDecoration: "none" }}>
                نسيت كلمة المرور؟
              </Link>
            </div>

            <ActionButton
              type="submit"
              isLoading={isLoading || redirecting}
              activeColor={activeColor}
              icon={ArrowRight}
              isPulsing={true}
            >
              تسجيل الدخول
            </ActionButton>
          </form>

          <div style={{ marginTop: "2rem", textAlign: "center", fontSize: "0.9rem", color: "#6b7280" }}>
            ليس لديك حساب؟{" "}
            <Link
              to={`/register${selectedRole ? `?role=${selectedRole}` : ""}`}
              style={{ color: activeColor, fontWeight: 700, textDecoration: "none" }}
            >
              أنشئ حساباً الآن
            </Link>
          </div>

          <LegalNotice>
            بالانضمام إلينا، فإنك توافق على{" "}
            <Link to="/privacy-policy" target="_blank">
              سياسة الخصوصية
            </Link>{" "}
            الخاصة بنا.
          </LegalNotice>
        </FormContainer>
      </FormSection>
    </PageWrapper>
  );
}
