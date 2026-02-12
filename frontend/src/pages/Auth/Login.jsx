// src/pages/Auth/Login.jsx

import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import styled, { keyframes } from "styled-components";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  CreditCard,
  Package,
  Truck,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";

/* ================== Animations ================== */

const fadeInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(15px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const spin = keyframes`
  to {
    transform: rotate(360deg);
  }
`;

/* ================== Styled Components ================== */

const PageWrapper = styled.div`
  min-height: 100vh;
  width: 100%;
  background: #fafafa;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  direction: rtl;
  font-family: "Tajawal", "Cairo", system-ui, -apple-system, BlinkMacSystemFont,
    "Segoe UI", sans-serif;
`;

const LoginCard = styled.div`
  width: 100%;
  max-width: 440px;
  background: #ffffff;
  border-radius: 24px;
  padding: 2rem 2rem 2rem;
  box-shadow: 0 8px 32px rgba(15, 23, 42, 0.12);
  border: 1px solid rgba(148, 163, 184, 0.25);
  animation: ${fadeInUp} 0.4s ease-out;
`;

const CardHeader = styled.div`
  text-align: center;
  margin-bottom: 1.5rem;
`;

const BrandText = styled.div`
  font-size: 2.2rem;
  font-weight: 800;
  letter-spacing: -0.5px;
  background: linear-gradient(135deg, #06b6d4, #22c55e);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  margin-bottom: 0.2rem;
`;

const BrandSubtitle = styled.div`
  font-size: 0.9rem;
  font-weight: 500;
  color: #6b7280;
  margin-bottom: 0.8rem;
`;

const HeaderDivider = styled.div`
  height: 1px;
  width: 60px;
  margin: 0 auto;
  background: linear-gradient(
    90deg,
    transparent,
    #e5e7eb,
    #d4d4d4,
    transparent
  );
`;

/* ====== Role Selector ====== */

const RoleSection = styled.div`
  margin-bottom: 1.5rem;
`;

const RoleGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.5rem;

  @media (max-width: 480px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
`;

const RoleItem = styled.button`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.6rem 0.4rem;
  min-height: 72px;
  background: #ffffff;
  border-radius: 14px;
  border: 2px solid
    ${({ $active, $color }) => ($active ? $color : "#e5e7eb")};
  box-shadow: ${({ $active, $color }) =>
    $active ? `0 8px 18px ${$color}33` : "0 1px 3px rgba(15, 23, 42, 0.06)"};
  cursor: pointer;
  transition:
    transform 0.12s ease,
    box-shadow 0.16s ease,
    border-color 0.16s ease,
    background-color 0.16s ease;
  outline: none;

  &:hover {
    transform: translateY(-1px);
    border-color: ${({ $color }) => $color};
    box-shadow: 0 10px 22px ${({ $color }) => `${$color}2f`};
  }

  background-color: ${({ $active, $color }) =>
    $active ? `${$color}0f` : "#ffffff"};
`;

const RoleIcon = styled.div`
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: ${({ $color }) => $color};
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: ${({ $active }) => ($active ? "scale(1.02)" : "scale(1)")};
  box-shadow: ${({ $active, $color }) =>
    $active ? `0 6px 16px ${$color}55` : "none"};
  transition:
    transform 0.12s ease,
    box-shadow 0.16s ease;
`;

const RoleContent = styled.div`
  text-align: center;
  line-height: 1.1;
`;

const RoleLabel = styled.div`
  font-size: 0.8rem;
  font-weight: 700;
  color: ${({ $color, $active }) => ($active ? $color : "#111827")};
`;

/* ====== Form Section ====== */

const FormSection = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
`;

const FormTitleWrapper = styled.div`
  margin-bottom: 0.25rem;
`;

const FormTitle = styled.h2`
  margin: 0;
  font-size: 1rem;
  font-weight: 800;
  color: #111827;
`;

const FormSubtitle = styled.p`
  margin: 0.25rem 0 0;
  font-size: 0.8rem;
  color: #6b7280;
`;

const InputGroup = styled.div`
  position: relative;
`;

const InputLabel = styled.label`
  display: block;
  font-size: 0.78rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.35rem;
`;

const InputIcon = styled.div`
  position: absolute;
  inset-inline-end: 0.85rem;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
  z-index: 2;
  pointer-events: none;
`;

const InputField = styled.input`
  width: 100%;
  font-size: 0.95rem;
  padding: 0.9rem 3rem 0.9rem 1rem;
  border-radius: 12px;
  border: 2px solid ${({ $error }) => ($error ? "#f97373" : "#e5e7eb")};
  background: #ffffff;
  color: #111827;
  outline: none;
  transition:
    border-color 0.16s ease,
    box-shadow 0.16s ease,
    background-color 0.16s ease;

  &:focus {
    border-color: ${({ $rolecolor }) => $rolecolor || "#22c55e"};
    box-shadow: 0 0 0 1px
      ${({ $rolecolor }) => ($rolecolor ? `${$rolecolor}40` : "#22c55e40")};
    background-color: #ffffff;
  }

  &::placeholder {
    color: #9ca3af;
    font-size: 0.86rem;
  }
`;

const PasswordToggle = styled.button`
  position: absolute;
  inset-inline-start: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
  color: #9ca3af;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    color: ${({ $rolecolor }) => $rolecolor || "#22c55e"};
  }
`;

const ErrorMessage = styled.div`
  margin-top: 0.4rem;
  font-size: 0.8rem;
  color: #f97373;
  text-align: right;
`;

const FormExtrasRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.78rem;
`;

const RememberMeWrapper = styled.label`
  display: flex;
  align-items: center;
  gap: 0.3rem;
  cursor: pointer;

  input {
    accent-color: ${({ $rolecolor }) => $rolecolor || "#22c55e"};
  }
`;

const ForgotLink = styled.button`
  border: none;
  background: transparent;
  color: ${({ $rolecolor }) => $rolecolor || "#22c55e"};
  font-size: 0.78rem;
  cursor: pointer;
  padding: 0;
  text-decoration: none;

  &:hover {
    opacity: 0.85;
  }
`;

/* ====== Login Button ====== */

const LoginButton = styled.button`
  width: 100%;
  border: none;
  border-radius: 12px;
  padding: 0.9rem 2rem;
  margin-top: 0.25rem;

  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;

  font-size: 0.9rem;
  font-weight: 600;
  color: #ffffff;
  cursor: ${({ disabled }) => (disabled ? "default" : "pointer")};

  background: ${({ $rolecolor }) =>
    `linear-gradient(135deg, ${$rolecolor || "#22c55e"}, ${
      $rolecolor ? `${$rolecolor}e0` : "#22c55ee0"
    })`};

  box-shadow: 0 10px 24px
    ${({ $rolecolor }) => ($rolecolor ? `${$rolecolor}66` : "#22c55e66")};

  opacity: ${({ disabled }) => (disabled ? 0.7 : 1)};

  transition:
    transform 0.14s ease,
    box-shadow 0.16s ease,
    opacity 0.16s ease;

  svg.spinner {
    animation: ${spin} 0.8s linear infinite;
  }

  &:hover {
    ${({ disabled }) =>
      !disabled &&
      `
      transform: translateY(-1px);
      box-shadow: 0 14px 32px rgba(15,23,42,0.2);
    `}
  }
`;

const ButtonText = styled.span``;

/* ====== Redirecting Banner & Footer ====== */

const RedirectingBanner = styled.div`
  margin-top: 0.7rem;
  padding: 0.55rem 0.75rem;
  border-radius: 10px;
  background: #ecfeff;
  border: 1px solid #bae6fd;
  color: #0369a1;
  font-size: 0.78rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;

  svg {
    width: 16px;
    height: 16px;
  }
`;

const FormFooter = styled.div`
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #f3f4f6;
  font-size: 0.8rem;
  text-align: center;
  color: #6b7280;
`;

const RegisterLink = styled(Link)`
  color: ${({ $rolecolor }) => $rolecolor || "#22c55e"};
  font-weight: 600;
  text-decoration: none;
  margin-inline-start: 0.25rem;

  &:hover {
    opacity: 0.85;
  }
`;

const PolicyText = styled.div`
  margin-top: 0.7rem;
  font-size: 0.75rem;
  color: #9ca3af;

  a {
    color: #0ea5e9;
    text-decoration: none;
  }

  a:hover {
    text-decoration: underline;
  }
`;

/* ================== Logic & Component ================== */

const roles = [
  {
    id: "buyer",
    label: "مشتري",
    icon: CreditCard,
    color: "#0ea5e9",
  },
  {
    id: "seller",
    label: "بائع",
    icon: Package,
    color: "#f97316",
  },
  {
    id: "shipping",
    label: "شركة شحن",
    icon: Truck,
    color: "#22c55e",
  },
];

const roleColors = {
  buyer: "#0ea5e9",
  seller: "#f97316",
  shipping: "#22c55e",
  admin: "#a855f7",
};

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useApp() || {};
  const { login, isLoggedIn, role: currentRole } = useAuth() || {};

  const [selectedRole, setSelectedRole] = useState(null);
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [errors, setErrors] = useState({});

  // قراءة الدور من الكويري ?role=buyer مثلاً
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const roleFromQuery = params.get("role");
    if (roleFromQuery && !selectedRole) {
      if (["buyer", "seller", "shipping", "admin"].includes(roleFromQuery)) {
        handleRoleSelect(roleFromQuery);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  // في حالة المستخدم مسجّل دخول بالفعل
  useEffect(() => {
    if (isLoggedIn && currentRole) {
      setRedirecting(true);
      setTimeout(() => {
        redirectToDashboard(currentRole);
      }, 800);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, currentRole]);

  const activeColor =
    (selectedRole && roleColors[selectedRole]) || "#22c55e";

  const handleRoleSelect = (roleId) => {
    setSelectedRole(roleId);
    setErrors({});
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validateEmailFormat = (email) => {
    const re = /\S+@\S+\.\S+/;
    return re.test(email);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!selectedRole) {
      newErrors.role = "الرجاء اختيار نوع الحساب أولاً.";
    }

    if (!formData.email.trim()) {
      newErrors.email = "الرجاء إدخال البريد الإلكتروني.";
    } else if (!validateEmailFormat(formData.email.trim())) {
      newErrors.email = "صيغة البريد الإلكتروني غير صحيحة.";
    }

    if (!formData.password.trim()) {
      newErrors.password = "الرجاء إدخال كلمة المرور.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const redirectToDashboard = (roleId) => {
    const normalizedRole = roleId === "shipper" ? "shipping" : roleId;

    switch (normalizedRole) {
      case "buyer":
        navigate("/buyer", { replace: true });
        break;
      case "seller":
        navigate("/seller", { replace: true });
        break;
      case "shipping":
        navigate("/shipping", { replace: true });
        break;
      case "admin":
        navigate("/admin", { replace: true });
        break;
      default:
        navigate("/", { replace: true });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading || redirecting) return;

    const valid = validateForm();
    if (!valid) {
      if (showToast) {
        showToast("تحقق من الحقول قبل المتابعة.", "error");
      }
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      if (typeof login === "function") {
        await login({
          email: formData.email.trim(),
          password: formData.password.trim(),
          role: selectedRole, // يُرسل لكن AuthContext يستخدم الدور من الخادم
          rememberMe,
        });
      }

      if (showToast) {
        showToast("تم تسجيل الدخول بنجاح.", "success");
      }

      // هنا نكتفي بتفعيل حالة التحويل،
      // والتوجيه الفعلي سيتم عبر useEffect باستخدام currentRole من الـ backend
      setRedirecting(true);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "حدث خطأ أثناء تسجيل الدخول.";
      setErrors((prev) => ({ ...prev, general: msg }));
      if (showToast) {
        showToast(msg, "error");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getFormTitle = () => {
    if (!selectedRole) return "اختر نوع الحساب ثم سجّل الدخول";
    switch (selectedRole) {
      case "buyer":
        return "تسجيل دخول المشتري";
      case "seller":
        return "تسجيل دخول البائع";
      case "shipping":
        return "تسجيل دخول شركة الشحن";
      case "admin":
        return "تسجيل دخول المدير";
      default:
        return "تسجيل الدخول";
    }
  };

  const getFormSubtitle = () => {
    if (!selectedRole) return "اختر نوع الحساب لتسجيل الدخول إلى طلبية.";
    return "";
  };

  const getRegisterText = () => {
    if (!selectedRole) return "إنشاء حساب جديد";
    switch (selectedRole) {
      case "buyer":
        return "إنشاء حساب مشتري جديد";
      case "seller":
        return "إنشاء حساب بائع جديد";
      case "shipping":
        return "تسجيل شركة شحن جديدة";
      case "admin":
        return "إنشاء حساب مدير (صلاحيات خاصة)";
      default:
        return "إنشاء حساب جديد";
    }
  };

  const registerLinkRoleParam =
    selectedRole && selectedRole !== "shipping"
      ? `?role=${selectedRole}`
      : "";

  return (
    <PageWrapper>
      <LoginCard>
        <CardHeader>
          <BrandText>طلبية</BrandText>
          <BrandSubtitle>
            منصة الكترونية تربط المشتري والبائع وشركة الشحن في تجربة تسوق
            عصرية وواضحة.
          </BrandSubtitle>
          <HeaderDivider />
        </CardHeader>

        {/* اختيار الدور */}
        <RoleSection>
          {errors.role && (
            <ErrorMessage style={{ marginBottom: "0.4rem" }}>
              {errors.role}
            </ErrorMessage>
          )}
          <RoleGrid>
            {roles.map((role) => {
              const Icon = role.icon;
              const active = selectedRole === role.id;
              const color = role.color;
              return (
                <RoleItem
                  key={role.id}
                  type="button"
                  onClick={() => handleRoleSelect(role.id)}
                  $active={active}
                  $color={color}
                >
                  <RoleIcon $active={active} $color={color}>
                    <Icon size={18} />
                  </RoleIcon>
                  <RoleContent>
                    <RoleLabel $active={active} $color={color}>
                      {role.label}
                    </RoleLabel>
                  </RoleContent>
                </RoleItem>
              );
            })}
          </RoleGrid>
        </RoleSection>

        {/* النموذج */}
        <FormSection onSubmit={handleSubmit} noValidate>
          <FormTitleWrapper>
            <FormTitle>{getFormTitle()}</FormTitle>
            <FormSubtitle>{getFormSubtitle()}</FormSubtitle>
          </FormTitleWrapper>

          {errors.general && (
            <ErrorMessage style={{ marginBottom: "0.35rem" }}>
              {errors.general}
            </ErrorMessage>
          )}

          {/* البريد الإلكتروني */}
          <InputGroup>
            <InputLabel>البريد الإلكتروني</InputLabel>
            <InputIcon>
              <Mail size={18} />
            </InputIcon>
            <InputField
              type="email"
              placeholder="مثال: name@example.com"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              $error={!!errors.email}
              $rolecolor={activeColor}
            />
            {errors.email && <ErrorMessage>{errors.email}</ErrorMessage>}
          </InputGroup>

          {/* كلمة المرور */}
          <InputGroup>
            <InputLabel>كلمة المرور</InputLabel>
            <InputIcon>
              <Lock size={18} />
            </InputIcon>
            <InputField
              type={showPassword ? "text" : "password"}
              placeholder="أدخل كلمة المرور"
              value={formData.password}
              onChange={(e) => handleInputChange("password", e.target.value)}
              $error={!!errors.password}
              $rolecolor={activeColor}
            />
            <PasswordToggle
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              $rolecolor={activeColor}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </PasswordToggle>
            {errors.password && (
              <ErrorMessage>{errors.password}</ErrorMessage>
            )}
          </InputGroup>

          {/* تذكرني / نسيت كلمة المرور */}
          <FormExtrasRow>
            <RememberMeWrapper $rolecolor={activeColor}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span>تذكرني</span>
            </RememberMeWrapper>

            <ForgotLink
              type="button"
              $rolecolor={activeColor}
              onClick={() => {
                if (showToast) {
                  showToast(
                    "ميزة استعادة كلمة المرور سيتم تفعيلها عند ربط البريد بالخادم.",
                    "info"
                  );
                }
              }}
            >
              نسيت كلمة المرور؟
            </ForgotLink>
          </FormExtrasRow>

          {/* زر تسجيل الدخول */}
          <LoginButton
            type="submit"
            disabled={isLoading || redirecting}
            $rolecolor={activeColor}
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="spinner" />
                <ButtonText>جاري التحقق من البيانات...</ButtonText>
              </>
            ) : redirecting ? (
              <>
                <Loader2 size={18} className="spinner" />
                <ButtonText>جاري تحويلك للوحة التحكم...</ButtonText>
              </>
            ) : (
              <>
                <ArrowRight size={18} />
                <ButtonText>تسجيل الدخول</ButtonText>
              </>
            )}
          </LoginButton>

          {/* شريط إعادة التوجيه في حال كان مسجلاً مسبقاً */}
          {redirecting && (
            <RedirectingBanner>
              <Loader2 size={16} className="spinner" />
              <span>تم تسجيل الدخول، سيتم نقلك إلى لوحة التحكم...</span>
            </RedirectingBanner>
          )}

          {/* Footer: رابط إنشاء حساب + سياسة */}
          <FormFooter>
            {selectedRole === "shipping" ? (
              <div>
                حسابات شركات الشحن يتم إنشاؤها من قبل إدارة المنصة فقط. يرجى
                التواصل مع الإدارة للحصول على بيانات الدخول.
              </div>
            ) : (
              <div>
                ليس لديك حساب بعد؟
                <RegisterLink
                  to={`/register${registerLinkRoleParam}`}
                  $rolecolor={activeColor}
                >
                  {getRegisterText()}
                </RegisterLink>
              </div>
            )}

            <PolicyText>
              بتسجيل دخولك، فأنت توافق على{" "}
              <a href="#terms">شروط الاستخدام</a> و{" "}
              <a href="#privacy">سياسة الخصوصية</a>.
            </PolicyText>
          </FormFooter>
        </FormSection>
      </LoginCard>
    </PageWrapper>
  );
}
