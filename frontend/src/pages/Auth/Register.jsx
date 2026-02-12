// src/pages/Auth/Register.jsx

import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import styled, { keyframes } from "styled-components";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import {
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  MapPin,
  Globe2,
  IdCard,
  Building2,
  Briefcase,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { registerRequest } from "@/services/authService";

/* =============== Animations =============== */

const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(15px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

/* =============== Styled Components =============== */

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

const Card = styled.div`
  width: 100%;
  max-width: 720px;
  background: #ffffff;
  border-radius: 24px;
  padding: 2rem 2rem 2.2rem;
  box-shadow: 0 10px 32px rgba(15, 23, 42, 0.12);
  border: 1px solid rgba(148, 163, 184, 0.25);
  animation: ${fadeInUp} 0.4s ease-out;
`;

const CardHeader = styled.div`
  text-align: center;
  margin-bottom: 1.25rem;
`;

const BrandText = styled.div`
  font-size: 2.1rem;
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
  width: 80px;
  margin: 0.25rem auto 0;
  background: linear-gradient(
    90deg,
    transparent,
    #e5e7eb,
    #d4d4d4,
    transparent
  );
`;

/* =============== Stepper =============== */

const StepperWrapper = styled.div`
  margin-bottom: 1.4rem;
`;

const StepperRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  flex-wrap: wrap;
`;

const StepItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.45rem;
`;

const StepCircle = styled.div`
  width: 26px;
  height: 26px;
  border-radius: 999px;
  border: 2px solid
    ${({ $state, $color }) =>
      $state === "done" || $state === "active" ? $color : "#cbd5f5"};
  background-color: ${({ $state, $color }) =>
    $state === "done" || $state === "active" ? `${$color}10` : "#f9fafb"};
  color: ${({ $state, $color }) =>
    $state === "done" || $state === "active" ? $color : "#64748b"};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 700;
`;

const StepLabel = styled.div`
  font-size: 0.78rem;
  font-weight: 600;
  color: ${({ $state }) => ($state === "active" ? "#0f172a" : "#6b7280")};
`;

const StepSeparator = styled.div`
  width: 26px;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    #cbd5f5,
    #cbd5f5,
    transparent
  );
  opacity: 0.9;
`;

/* =============== Form Layout =============== */

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
`;

const SectionTitle = styled.h2`
  font-size: 1rem;
  font-weight: 800;
  color: #111827;
  margin: 0 0 0.25rem;
`;

const SectionSubtitle = styled.p`
  margin: 0;
  font-size: 0.8rem;
  color: #6b7280;
`;

const FieldsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.9rem;

  @media (max-width: 640px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const InputGroup = styled.div`
  position: relative;
`;

const InputLabel = styled.label`
  display: block;
  font-size: 0.78rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.3rem;
`;

const InputIcon = styled.div`
  position: absolute;
  inset-inline-end: 0.8rem;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
  pointer-events: none;
`;

const InputField = styled.input`
  width: 100%;
  font-size: 0.9rem;
  padding: 0.85rem 2.7rem 0.85rem 0.85rem;
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
    font-size: 0.8rem;
  }
`;

const SelectField = styled.select`
  width: 100%;
  font-size: 0.9rem;
  padding: 0.85rem 2.7rem 0.85rem 0.85rem;
  border-radius: 12px;
  border: 2px solid ${({ $error }) => ($error ? "#f97373" : "#e5e7eb")};
  background: #ffffff;
  color: #111827;
  outline: none;
  transition:
    border-color 0.16s ease,
    box-shadow 0.16s ease,
    background-color 0.16s ease;
  appearance: none;

  &:focus {
    border-color: ${({ $rolecolor }) => $rolecolor || "#22c55e"};
    box-shadow: 0 0 0 1px
      ${({ $rolecolor }) => ($rolecolor ? `${$rolecolor}40` : "#22c55e40")};
    background-color: #ffffff;
  }
`;

const TextAreaField = styled.textarea`
  width: 100%;
  min-height: 88px;
  font-size: 0.9rem;
  padding: 0.8rem 0.85rem;
  border-radius: 12px;
  border: 2px solid ${({ $error }) => ($error ? "#f97373" : "#e5e7eb")};
  background: #ffffff;
  color: #111827;
  outline: none;
  resize: vertical;
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
    font-size: 0.8rem;
  }
`;

const PasswordToggle = styled.button`
  position: absolute;
  inset-inline-start: 0.7rem;
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

const SmallHint = styled.div`
  margin-top: 0.25rem;
  font-size: 0.7rem;
  color: #9ca3af;
`;

const ErrorMessage = styled.div`
  margin-top: 0.35rem;
  font-size: 0.8rem;
  color: #f97373;
  text-align: right;
`;

/* =============== Footer Buttons =============== */

const ActionsRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  margin-top: 0.4rem;
  flex-wrap: wrap;
`;

const GhostButton = styled.button`
  flex: 1;
  min-width: 120px;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  background: #f9fafb;
  color: #374151;
  padding: 0.7rem 1rem;
  font-size: 0.85rem;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  cursor: pointer;
  transition:
    background-color 0.16s ease,
    border-color 0.16s ease,
    transform 0.1s ease;

  &:hover {
    background: #f3f4f6;
  }

  &:disabled {
    opacity: 0.55;
    cursor: default;
  }
`;

const PrimaryButton = styled.button`
  flex: 1.4;
  min-width: 150px;
  border-radius: 12px;
  border: none;
  padding: 0.85rem 1.25rem;
  font-size: 0.9rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  cursor: ${({ disabled }) => (disabled ? "default" : "pointer")};

  color: #ffffff;
  background: ${({ $rolecolor }) =>
    `linear-gradient(135deg, ${$rolecolor || "#22c55e"}, ${
      $rolecolor ? `${$rolecolor}e0` : "#22c55ee0"
    })`};
  box-shadow: 0 10px 24px
    ${({ $rolecolor }) => ($rolecolor ? `${$rolecolor}55` : "#22c55e55")};
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
      box-shadow: 0 14px 32px rgba(15,23,42,0.18);
    `}
  }
`;

const FormFooter = styled.div`
  margin-top: 1.3rem;
  padding-top: 1.1rem;
  border-top: 1px solid #f3f4f6;
  font-size: 0.8rem;
  color: #6b7280;
  text-align: center;
`;

const LoginLink = styled(Link)`
  color: ${({ $rolecolor }) => $rolecolor || "#22c55e"};
  font-weight: 600;
  text-decoration: none;
  margin-inline-start: 0.25rem;

  &:hover {
    opacity: 0.85;
  }
`;

/* =============== Role Config =============== */

const roleLabels = {
  buyer: "مشتري",
  seller: "بائع",
  shipping: "شركة شحن",
  admin: "مدير",
};

const roleColors = {
  buyer: "#0ea5e9",
  seller: "#f97316",
  shipping: "#22c55e",
  admin: "#a855f7",
};

/* الخطوات لكل دور */
const roleSteps = {
  buyer: ["المعلومات الشخصية", "معلومات العنوان"],
  seller: ["المعلومات الشخصية", "معلومات الهوية", "معلومات المتجر"],
  shipping: ["معلومات المسؤول", "معلومات الشركة"],
};

/* ✅ الحقول المطلوبة لكل خطوة ولكل دور */
const requiredByRoleAndStep = {
  buyer: {
    1: ["buyerFullName", "email", "phone", "password", "confirmPassword"],
    2: ["addressLine"],
  },
  seller: {
    1: [
      "sellerFirstName",
      "sellerLastName",
      "email",
      "phone",
      "password",
      "confirmPassword",
    ],
    2: ["idType", "idNumber"],
    3: ["storeName"],
  },
  shipping: {
    1: [
      "shippingFirstName",
      "shippingLastName",
      "email",
      "phone",
      "password",
      "confirmPassword",
      "position",
      "idType",
      "idNumber",
    ],
    2: ["companyName"],
  },
};

/* =============== Component =============== */

export default function Register() {
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useApp() || {};
  const { isLoggedIn, role: currentRole } = useAuth() || {};

  const [role, setRole] = useState("buyer");
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    // Buyer
    buyerFullName: "",
    // Seller
    sellerFirstName: "",
    sellerLastName: "",
    // Shipping
    shippingFirstName: "",
    shippingLastName: "",
    position: "",
    // Common auth
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    // Address
    country: "",
    state: "",
    city: "",
    addressLine: "",
    // Identity
    nationality: "",
    birthDate: "",
    idType: "",
    idNumber: "",
    idIssuer: "",
    idDocumentFile: null,
    // Store
    storeName: "",
    storeDescription: "",
    storeAddress: "",
    storeCountry: "",
    storeCity: "",
    storeDistrict: "",
    storeNeighborhood: "",
    storeAddressDetails: "",
    // Company
    companyName: "",
    companyAddress: "",
    companyScope: "",
  });

  // قراءة الدور من ?role=buyer|seller
  // وإجبار أي role=shipping أو admin على التحويل إلى buyer
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const roleParam = params.get("role");

    if (roleParam && ["buyer", "seller"].includes(roleParam)) {
      setRole(roleParam);
      setStep(1);
      setErrors({});
    } else if (roleParam === "shipping" || roleParam === "admin") {
      // تسجيل شركة الشحن لا يتم من هذه الواجهة، نحول الطلب إلى مشتري افتراضيًا
      setRole("buyer");
      setStep(1);
      setErrors({});
    }
  }, [location.search]);

  // إن كان مسجلاً فعلاً نعيده للوحة
  useEffect(() => {
    if (isLoggedIn && currentRole) {
      if (showToast) {
        showToast("أنت مسجّل بالفعل، سيتم نقلك للوحة التحكم.", "info");
      }
      setTimeout(() => {
        navigate(`/${currentRole}`, { replace: true });
      }, 800);
    }
  }, [isLoggedIn, currentRole, navigate, showToast]);

  const steps = useMemo(() => {
    return roleSteps[role] || roleSteps["buyer"];
  }, [role]);

  const activeColor = roleColors[role] || "#22c55e";

  const totalSteps = steps.length;

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validateEmailFormat = (email) => {
    const re = /\S+@\S+\.\S+/;
    return re.test(email);
  };

  const validateStep = (stepNumber) => {
    const requiredConfig = requiredByRoleAndStep[role]?.[stepNumber] || [];
    const newErrors = {};

    requiredConfig.forEach((field) => {
      const val = formData[field];
      if (!val || (typeof val === "string" && val.trim() === "")) {
        newErrors[field] = "هذا الحقل مطلوب";
      }
    });

    if (requiredConfig.includes("email")) {
      const email = formData.email.trim();
      if (!validateEmailFormat(email)) {
        newErrors.email = "صيغة البريد الإلكتروني غير صحيحة";
      }
    }

    if (
      requiredConfig.includes("password") ||
      requiredConfig.includes("confirmPassword")
    ) {
      const pw = formData.password;
      const cpw = formData.confirmPassword;
      if (!pw || pw.length < 6) {
        newErrors.password = "كلمة المرور يجب أن لا تقل عن 6 أحرف";
      }
      if (pw !== cpw) {
        newErrors.confirmPassword = "كلمتا المرور غير متطابقتين";
      }
    }

    setErrors(newErrors);
    const hasError = Object.keys(newErrors).length > 0;
    return !hasError;
  };

  const handleNext = () => {
    const ok = validateStep(step);
    if (!ok) {
      if (showToast) {
        showToast("تحقق من الحقول في هذه الخطوة قبل المتابعة.", "error");
      }
      return;
    }
    if (step < totalSteps) {
      setStep((s) => s + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePrev = () => {
    if (step > 1) {
      setStep((s) => s - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // 🔁 دالة إرسال النموذج بعد الربط مع الـ backend
  const handleSubmit = async (e) => {
    e.preventDefault();

    const ok = validateStep(step);
    if (!ok) {
      if (showToast) {
        showToast("تحقق من الحقول في هذه الخطوة قبل إرسال الطلب.", "error");
      }
      return;
    }

    // 💾 تحقق من الملف (للبائع و شركة الشحن) قبل الإرسال
    if ((role === "seller" || role === "shipping") && formData.idDocumentFile) {
      const file = formData.idDocumentFile;
      const maxSize = 5 * 1024 * 1024; // 5MB
      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        "application/pdf",
      ];

      if (file.size > maxSize) {
        setErrors((prev) => ({
          ...prev,
          idDocumentFile: "حجم الملف أكبر من 5 ميغابايت",
        }));
        if (showToast) {
          showToast("حجم وثيقة الهوية أكبر من المسموح (5 ميغابايت).", "error");
        }
        return;
      }

      if (file.type && !allowedTypes.includes(file.type)) {
        setErrors((prev) => ({
          ...prev,
          idDocumentFile: "صيغة الملف غير مدعومة (يُسمح بالصور أو PDF فقط)",
        }));
        if (showToast) {
          showToast("صيغة وثيقة الهوية غير مدعومة.", "error");
        }
        return;
      }
    }

    // تجهيز الاسم حسب الدور
    let name = "";
    if (role === "buyer") {
      name = formData.buyerFullName || formData.email;
    } else if (role === "seller") {
      name = `${formData.sellerFirstName || ""} ${
        formData.sellerLastName || ""
      }`.trim();
    } else if (role === "shipping") {
      name = `${formData.shippingFirstName || ""} ${
        formData.shippingLastName || ""
      }`.trim();
    }

    if (!name) {
      name = formData.email;
    }

    // الآن الدور يُرسل كما هو (buyer | seller فقط من هذه الواجهة)
    const apiRole = role;

    // الحمولة الأساسية المشتركة لكل الأدوار
    const payload = {
      name: name.trim(),
      email: formData.email.trim(),
      password: formData.password.trim(),
      role: apiRole,
      phone: formData.phone?.trim() || undefined,
    };

    // ✅ توسيع الحمولة بحسب الدور (للبائع: إرسال بيانات المتجر وإنشاء Store)
    if (role === "seller") {
      const storeCountry = formData.storeCountry?.trim();
      const storeCity = formData.storeCity?.trim();
      const storeDistrict = formData.storeDistrict?.trim();
      const storeNeighborhood = formData.storeNeighborhood?.trim();
      const storeDetails = formData.storeAddressDetails?.trim();

      const addressParts = [
        storeCountry,
        storeCity,
        storeDistrict,
        storeNeighborhood,
        storeDetails,
      ].filter(Boolean);
      const storeAddressCombined = addressParts.join(" - ");

      payload.storeName = formData.storeName?.trim() || "";
      payload.storeDescription = formData.storeDescription?.trim() || "";
      payload.storeAddress = storeAddressCombined || undefined;

      payload.storeCountry = storeCountry || undefined;
      payload.storeCity = storeCity || undefined;
      payload.storeDistrict = storeDistrict || undefined;
      payload.storeNeighborhood = storeNeighborhood || undefined;
      payload.storeAddressDetails = storeDetails || undefined;

      payload.nationality = formData.nationality?.trim() || undefined;
      payload.birthDate = formData.birthDate || undefined;
      payload.idType = formData.idType || undefined;
      payload.idNumber = formData.idNumber?.trim() || undefined;
      payload.idIssuer = formData.idIssuer?.trim() || undefined;
    } else if (role === "buyer") {
      payload.country = formData.country?.trim() || undefined;
      payload.state = formData.state?.trim() || undefined;
      payload.city = formData.city?.trim() || undefined;
      payload.addressLine = formData.addressLine?.trim() || undefined;
    } else if (role === "shipping") {
      // هذا الفرع لن يُستخدم عملياً لأن role=shipping لا يأتي من الواجهة بعد إيقافه،
      // لكن نتركه دون استعمال حتى لا نكسر أي منطق سابق محتمل.
      payload.position = formData.position?.trim() || undefined;
      payload.nationality = formData.nationality?.trim() || undefined;
      payload.birthDate = formData.birthDate || undefined;
      payload.idType = formData.idType || undefined;
      payload.idNumber = formData.idNumber?.trim() || undefined;
      payload.idIssuer = formData.idIssuer?.trim() || undefined;
      payload.companyName = formData.companyName?.trim() || "";
      payload.companyAddress = formData.companyAddress?.trim() || "";
      payload.companyScope = formData.companyScope?.trim() || "";
    }

    // 📨 تجهيز جسم الطلب النهائي: JSON عادي أو FormData
    let requestBody = payload;

    if (role === "seller" || role === "shipping") {
      // نستخدم FormData لتمرير ملف وثيقة الهوية + بقية الحقول النصية
      const formDataToSend = new FormData();

      Object.entries(payload).forEach(([key, value]) => {
        if (
          value !== undefined &&
          value !== null &&
          !(typeof value === "string" && value.trim() === "")
        ) {
          formDataToSend.append(key, value);
        }
      });

      if (formData.idDocumentFile) {
        formDataToSend.append("idDocument", formData.idDocumentFile);
      }

      requestBody = formDataToSend;
    }

    setIsSubmitting(true);

    try {
      await registerRequest(requestBody);

      if (showToast) {
        showToast(
          "تم إنشاء الحساب بنجاح، يمكنك الآن تسجيل الدخول.",
          "success"
        );
      }

      navigate(`/login?role=${role}`, { replace: true });
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "حدث خطأ أثناء إنشاء الحساب.";
      if (showToast) {
        showToast(msg, "error");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const sectionTitle = useMemo(() => {
    if (role === "buyer") {
      if (step === 1) return "المعلومات الشخصية";
      if (step === 2) return "معلومات العنوان";
    }
    if (role === "seller") {
      if (step === 1) return "المعلومات الشخصية";
      if (step === 2) return "معلومات الهوية";
      if (step === 3) return "معلومات المتجر";
    }
    if (role === "shipping") {
      if (step === 1) return "معلومات المسؤول";
      if (step === 2) return "معلومات الشركة";
    }
    return "بيانات الحساب";
  }, [role, step]);

  const sectionSubtitle = useMemo(() => {
    if (role === "buyer") {
      return "أدخل بيانات حساب المشتري وعنوان التسليم بشكل صحيح لتجربة تسوق سلسة.";
    }
    if (role === "seller") {
      return "أدخل بياناتك الشخصية والهوية ومعلومات متجرك لبدء البيع عبر طلبية.";
    }
    if (role === "shipping") {
      return "أدخل بيانات المسؤول عن الشركة ومعلومات شركة الشحن للتكامل مع طلبية.";
    }
    const label = roleLabels[role] || "المستخدم";
    return `إنشاء حساب ${label} جديد في طلبية.`;
  }, [role]);

  /* =============== Render Fields by Step & Role =============== */

  const renderStepFields = () => {
    const commonEmailPhonePassword = (
      <>
        <InputGroup>
          <InputLabel>البريد الإلكتروني *</InputLabel>
          <InputIcon>
            <Mail size={18} />
          </InputIcon>
          <InputField
            type="email"
            placeholder="مثال: name@example.com"
            value={formData.email}
            onChange={(e) => handleChange("email", e.target.value)}
            $error={!!errors.email}
            $rolecolor={activeColor}
          />
          {errors.email && <ErrorMessage>{errors.email}</ErrorMessage>}
        </InputGroup>

        <InputGroup>
          <InputLabel>رقم الهاتف *</InputLabel>
          <InputIcon>
            <Phone size={18} />
          </InputIcon>
          <InputField
            type="tel"
            placeholder="مثال: 0555000000"
            value={formData.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
            $error={!!errors.phone}
            $rolecolor={activeColor}
          />
          {errors.phone && <ErrorMessage>{errors.phone}</ErrorMessage>}
        </InputGroup>

        <InputGroup>
          <InputLabel>كلمة المرور *</InputLabel>
          <InputIcon>
            <Lock size={18} />
          </InputIcon>
          <InputField
            type={showPassword ? "text" : "password"}
            placeholder="أدخِل كلمة مرور لا تقل عن 6 رموز"
            value={formData.password}
            onChange={(e) => handleChange("password", e.target.value)}
            $error={!!errors.password}
            $rolecolor={activeColor}
          />
          <PasswordToggle
            type="button"
            onClick={() => setShowPassword((p) => !p)}
            $rolecolor={activeColor}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </PasswordToggle>
          {errors.password && <ErrorMessage>{errors.password}</ErrorMessage>}
        </InputGroup>

        <InputGroup>
          <InputLabel>تأكيد كلمة المرور *</InputLabel>
          <InputIcon>
            <Lock size={18} />
          </InputIcon>
          <InputField
            type={showConfirmPassword ? "text" : "password"}
            placeholder="أعد إدخال نفس كلمة المرور"
            value={formData.confirmPassword}
            onChange={(e) =>
              handleChange("confirmPassword", e.target.value)
            }
            $error={!!errors.confirmPassword}
            $rolecolor={activeColor}
          />
          <PasswordToggle
            type="button"
            onClick={() => setShowConfirmPassword((prev) => !prev)}
            $rolecolor={activeColor}
          >
            {showConfirmPassword ? (
              <EyeOff size={18} />
            ) : (
              <Eye size={18} />
            )}
          </PasswordToggle>
          {errors.confirmPassword && (
            <ErrorMessage>{errors.confirmPassword}</ErrorMessage>
          )}
        </InputGroup>
      </>
    );

    // ================= Buyer =================
    if (role === "buyer") {
      if (step === 1) {
        return (
          <FieldsGrid>
            <InputGroup>
              <InputLabel>الاسم الكامل *</InputLabel>
              <InputIcon>
                <User size={18} />
              </InputIcon>
              <InputField
                type="text"
                placeholder="أدخل اسمك الثلاثي أو الرباعي"
                value={formData.buyerFullName}
                onChange={(e) =>
                  handleChange("buyerFullName", e.target.value)
                }
                $error={!!errors.buyerFullName}
                $rolecolor={activeColor}
              />
              {errors.buyerFullName && (
                <ErrorMessage>{errors.buyerFullName}</ErrorMessage>
              )}
            </InputGroup>

            {commonEmailPhonePassword}
          </FieldsGrid>
        );
      }

      if (step === 2) {
        return (
          <FieldsGrid>
            <InputGroup>
              <InputLabel>الدولة</InputLabel>
              <InputIcon>
                <Globe2 size={18} />
              </InputIcon>
              <InputField
                type="text"
                placeholder="مثال: تركيا"
                value={formData.country}
                onChange={(e) => handleChange("country", e.target.value)}
                $error={!!errors.country}
                $rolecolor={activeColor}
              />
              {errors.country && (
                <ErrorMessage>{errors.country}</ErrorMessage>
              )}
            </InputGroup>

            <InputGroup>
              <InputLabel>المحافظة / الولاية</InputLabel>
              <InputIcon>
                <MapPin size={18} />
              </InputIcon>
              <InputField
                type="text"
                placeholder="مثال: إسطنبول"
                value={formData.state}
                onChange={(e) => handleChange("state", e.target.value)}
                $error={!!errors.state}
                $rolecolor={activeColor}
              />
              {errors.state && <ErrorMessage>{errors.state}</ErrorMessage>}
            </InputGroup>

            <InputGroup>
              <InputLabel>المديرية / المدينة</InputLabel>
              <InputIcon>
                <MapPin size={18} />
              </InputIcon>
              <InputField
                type="text"
                placeholder="مثال: الفاتح"
                value={formData.city}
                onChange={(e) => handleChange("city", e.target.value)}
                $error={!!errors.city}
                $rolecolor={activeColor}
              />
              {errors.city && <ErrorMessage>{errors.city}</ErrorMessage>}
            </InputGroup>

            <InputGroup style={{ gridColumn: "1 / -1" }}>
              <InputLabel>العنوان التفصيلي *</InputLabel>
              <TextAreaField
                placeholder="مثال: شارع كذا، مبنى رقم (..)، طابق (..)، ملاحظات إضافية للتوصيل"
                value={formData.addressLine}
                onChange={(e) =>
                  handleChange("addressLine", e.target.value)
                }
                $error={!!errors.addressLine}
                $rolecolor={activeColor}
              />
              {errors.addressLine && (
                <ErrorMessage>{errors.addressLine}</ErrorMessage>
              )}
            </InputGroup>
          </FieldsGrid>
        );
      }
    }

    // ================= Seller =================
    if (role === "seller") {
      if (step === 1) {
        return (
          <FieldsGrid>
            <InputGroup>
              <InputLabel>الاسم الأول *</InputLabel>
              <InputIcon>
                <User size={18} />
              </InputIcon>
              <InputField
                type="text"
                placeholder="الاسم الأول"
                value={formData.sellerFirstName}
                onChange={(e) =>
                  handleChange("sellerFirstName", e.target.value)
                }
                $error={!!errors.sellerFirstName}
                $rolecolor={activeColor}
              />
              {errors.sellerFirstName && (
                <ErrorMessage>{errors.sellerFirstName}</ErrorMessage>
              )}
            </InputGroup>

            <InputGroup>
              <InputLabel>اسم العائلة *</InputLabel>
              <InputIcon>
                <User size={18} />
              </InputIcon>
              <InputField
                type="text"
                placeholder="اسم العائلة"
                value={formData.sellerLastName}
                onChange={(e) =>
                  handleChange("sellerLastName", e.target.value)
                }
                $error={!!errors.sellerLastName}
                $rolecolor={activeColor}
              />
              {errors.sellerLastName && (
                <ErrorMessage>{errors.sellerLastName}</ErrorMessage>
              )}
            </InputGroup>

            {commonEmailPhonePassword}
          </FieldsGrid>
        );
      }

      if (step === 2) {
        return (
          <FieldsGrid>
            <InputGroup>
              <InputLabel>الجنسية</InputLabel>
              <InputIcon>
                <Globe2 size={18} />
              </InputIcon>
              <InputField
                type="text"
                placeholder="مثال: يمني، تركي..."
                value={formData.nationality}
                onChange={(e) =>
                  handleChange("nationality", e.target.value)
                }
                $error={!!errors.nationality}
                $rolecolor={activeColor}
              />
              {errors.nationality && (
                <ErrorMessage>{errors.nationality}</ErrorMessage>
              )}
            </InputGroup>

            <InputGroup>
              <InputLabel>تاريخ الميلاد</InputLabel>
              <InputField
                type="date"
                value={formData.birthDate}
                onChange={(e) =>
                  handleChange("birthDate", e.target.value)
                }
                $error={!!errors.birthDate}
                $rolecolor={activeColor}
                style={{ paddingInlineEnd: "0.8rem" }}
              />
              {errors.birthDate && (
                <ErrorMessage>{errors.birthDate}</ErrorMessage>
              )}
            </InputGroup>

            <InputGroup>
              <InputLabel>نوع الهوية *</InputLabel>
              <InputIcon>
                <IdCard size={18} />
              </InputIcon>
              <SelectField
                value={formData.idType}
                onChange={(e) => handleChange("idType", e.target.value)}
                $error={!!errors.idType}
                $rolecolor={activeColor}
              >
                <option value="">اختر نوع الهوية</option>
                <option value="national">هوية وطنية</option>
                <option value="residence">هوية مقيم</option>
                <option value="passport">جواز سفر</option>
              </SelectField>
              {errors.idType && (
                <ErrorMessage>{errors.idType}</ErrorMessage>
              )}
            </InputGroup>

            <InputGroup>
              <InputLabel>رقم الهوية *</InputLabel>
              <InputIcon>
                <IdCard size={18} />
              </InputIcon>
              <InputField
                type="text"
                placeholder="أدخل رقم الهوية"
                value={formData.idNumber}
                onChange={(e) =>
                  handleChange("idNumber", e.target.value)
                }
                $error={!!errors.idNumber}
                $rolecolor={activeColor}
              />
              {errors.idNumber && (
                <ErrorMessage>{errors.idNumber}</ErrorMessage>
              )}
            </InputGroup>

            <InputGroup>
              <InputLabel>جهة الإصدار</InputLabel>
              <InputField
                type="text"
                placeholder="مثال: وزارة الداخلية - الرياض"
                value={formData.idIssuer}
                onChange={(e) =>
                  handleChange("idIssuer", e.target.value)
                }
                $error={!!errors.idIssuer}
                $rolecolor={activeColor}
                style={{ paddingInlineEnd: "0.85rem" }}
              />
              {errors.idIssuer && (
                <ErrorMessage>{errors.idIssuer}</ErrorMessage>
              )}
            </InputGroup>

            <InputGroup>
              <InputLabel>رفع وثيقة الهوية (اختياري)</InputLabel>
              <InputField
                type="file"
                onChange={(e) =>
                  handleChange(
                    "idDocumentFile",
                    e.target.files?.[0] || null
                  )
                }
                $error={!!errors.idDocumentFile}
                $rolecolor={activeColor}
                style={{
                  paddingInlineEnd: "0.5rem",
                  paddingInlineStart: "0.5rem",
                }}
              />
              <SmallHint>
                يقبل الصور أو PDF، بحد أقصى 5 ميغابايت.
              </SmallHint>
              {errors.idDocumentFile && (
                <ErrorMessage>{errors.idDocumentFile}</ErrorMessage>
              )}
            </InputGroup>
          </FieldsGrid>
        );
      }

      if (step === 3) {
        return (
          <FieldsGrid>
            <InputGroup>
              <InputLabel>اسم المتجر *</InputLabel>
              <InputIcon>
                <Building2 size={18} />
              </InputIcon>
              <InputField
                type="text"
                placeholder="اسم المتجر كما سيظهر للعملاء"
                value={formData.storeName}
                onChange={(e) =>
                  handleChange("storeName", e.target.value)
                }
                $error={!!errors.storeName}
                $rolecolor={activeColor}
              />
              {errors.storeName && (
                <ErrorMessage>{errors.storeName}</ErrorMessage>
              )}
            </InputGroup>

            <InputGroup>
              <InputLabel>الدولة</InputLabel>
              <InputIcon>
                <Globe2 size={18} />
              </InputIcon>
              <InputField
                type="text"
                placeholder="مثال: تركيا"
                value={formData.storeCountry}
                onChange={(e) =>
                  handleChange("storeCountry", e.target.value)
                }
                $error={!!errors.storeCountry}
                $rolecolor={activeColor}
              />
              {errors.storeCountry && (
                <ErrorMessage>{errors.storeCountry}</ErrorMessage>
              )}
            </InputGroup>

            <InputGroup>
              <InputLabel>المدينة</InputLabel>
              <InputIcon>
                <MapPin size={18} />
              </InputIcon>
              <InputField
                type="text"
                placeholder="مثال: إسطنبول"
                value={formData.storeCity}
                onChange={(e) =>
                  handleChange("storeCity", e.target.value)
                }
                $error={!!errors.storeCity}
                $rolecolor={activeColor}
              />
              {errors.storeCity && (
                <ErrorMessage>{errors.storeCity}</ErrorMessage>
              )}
            </InputGroup>

            <InputGroup>
              <InputLabel>المديرية</InputLabel>
              <InputIcon>
                <MapPin size={18} />
              </InputIcon>
              <InputField
                type="text"
                placeholder="مثال: الفاتح"
                value={formData.storeDistrict}
                onChange={(e) =>
                  handleChange("storeDistrict", e.target.value)
                }
                $error={!!errors.storeDistrict}
                $rolecolor={activeColor}
              />
              {errors.storeDistrict && (
                <ErrorMessage>{errors.storeDistrict}</ErrorMessage>
              )}
            </InputGroup>

            <InputGroup>
              <InputLabel>الحي</InputLabel>
              <InputIcon>
                <MapPin size={18} />
              </InputIcon>
              <InputField
                type="text"
                placeholder="مثال: حي كذا"
                value={formData.storeNeighborhood}
                onChange={(e) =>
                  handleChange("storeNeighborhood", e.target.value)
                }
                $error={!!errors.storeNeighborhood}
                $rolecolor={activeColor}
              />
              {errors.storeNeighborhood && (
                <ErrorMessage>{errors.storeNeighborhood}</ErrorMessage>
              )}
            </InputGroup>

            <InputGroup style={{ gridColumn: "1 / -1" }}>
              <InputLabel>بقية التفاصيل</InputLabel>
              <TextAreaField
                placeholder="الشارع، رقم المبنى، الطابق، وأي تفاصيل إضافية تسهّل الوصول للمتجر"
                value={formData.storeAddressDetails}
                onChange={(e) =>
                  handleChange("storeAddressDetails", e.target.value)
                }
                $error={!!errors.storeAddressDetails}
                $rolecolor={activeColor}
              />
              {errors.storeAddressDetails && (
                <ErrorMessage>{errors.storeAddressDetails}</ErrorMessage>
              )}
            </InputGroup>

            <InputGroup style={{ gridColumn: "1 / -1" }}>
              <InputLabel>وصف المتجر</InputLabel>
              <TextAreaField
                placeholder="اكتب وصفاً مختصراً عن نشاط المتجر، نوع المنتجات، الجمهور المستهدف..."
                value={formData.storeDescription}
                onChange={(e) =>
                  handleChange("storeDescription", e.target.value)
                }
                $error={!!errors.storeDescription}
                $rolecolor={activeColor}
              />
              {errors.storeDescription && (
                <ErrorMessage>{errors.storeDescription}</ErrorMessage>
              )}
            </InputGroup>
          </FieldsGrid>
        );
      }
    }

    // ================= Shipping (لن تُستخدم من الواجهة بعد الآن لكن نتركها كما هي) =================
    if (role === "shipping") {
      if (step === 1) {
        return (
          <FieldsGrid>
            <InputGroup>
              <InputLabel>الاسم الأول للمسؤول *</InputLabel>
              <InputIcon>
                <User size={18} />
              </InputIcon>
              <InputField
                type="text"
                placeholder="اسم المسؤول الأول"
                value={formData.shippingFirstName}
                onChange={(e) =>
                  handleChange("shippingFirstName", e.target.value)
                }
                $error={!!errors.shippingFirstName}
                $rolecolor={activeColor}
              />
              {errors.shippingFirstName && (
                <ErrorMessage>{errors.shippingFirstName}</ErrorMessage>
              )}
            </InputGroup>

            <InputGroup>
              <InputLabel>اسم العائلة للمسؤول *</InputLabel>
              <InputIcon>
                <User size={18} />
              </InputIcon>
              <InputField
                type="text"
                placeholder="اسم العائلة للمسؤول"
                value={formData.shippingLastName}
                onChange={(e) =>
                  handleChange("shippingLastName", e.target.value)
                }
                $error={!!errors.shippingLastName}
                $rolecolor={activeColor}
              />
              {errors.shippingLastName && (
                <ErrorMessage>{errors.shippingLastName}</ErrorMessage>
              )}
            </InputGroup>

            <InputGroup>
              <InputLabel>المنصب في الشركة *</InputLabel>
              <InputIcon>
                <Briefcase size={18} />
              </InputIcon>
              <InputField
                type="text"
                placeholder="مثال: مدير العمليات، مسؤول الشحن..."
                value={formData.position}
                onChange={(e) =>
                  handleChange("position", e.target.value)
                }
                $error={!!errors.position}
                $rolecolor={activeColor}
              />
              {errors.position && (
                <ErrorMessage>{errors.position}</ErrorMessage>
              )}
            </InputGroup>

            <InputGroup>
              <InputLabel>الجنسية</InputLabel>
              <InputIcon>
                <Globe2 size={18} />
              </InputIcon>
              <InputField
                type="text"
                placeholder="الجنسية"
                value={formData.nationality}
                onChange={(e) =>
                  handleChange("nationality", e.target.value)
                }
                $error={!!errors.nationality}
                $rolecolor={activeColor}
              />
              {errors.nationality && (
                <ErrorMessage>{errors.nationality}</ErrorMessage>
              )}
            </InputGroup>

            <InputGroup>
              <InputLabel>تاريخ الميلاد</InputLabel>
              <InputField
                type="date"
                value={formData.birthDate}
                onChange={(e) =>
                  handleChange("birthDate", e.target.value)
                }
                $error={!!errors.birthDate}
                $rolecolor={activeColor}
                style={{ paddingInlineEnd: "0.8rem" }}
              />
              {errors.birthDate && (
                <ErrorMessage>{errors.birthDate}</ErrorMessage>
              )}
            </InputGroup>

            <InputGroup>
              <InputLabel>نوع الهوية *</InputLabel>
              <InputIcon>
                <IdCard size={18} />
              </InputIcon>
              <SelectField
                value={formData.idType}
                onChange={(e) => handleChange("idType", e.target.value)}
                $error={!!errors.idType}
                $rolecolor={activeColor}
              >
                <option value="">اختر نوع الهوية</option>
                <option value="national">هوية وطنية</option>
                <option value="residence">هوية مقيم</option>
                <option value="passport">جواز سفر</option>
              </SelectField>
              {errors.idType && (
                <ErrorMessage>{errors.idType}</ErrorMessage>
              )}
            </InputGroup>

            <InputGroup>
              <InputLabel>رقم الهوية *</InputLabel>
              <InputIcon>
                <IdCard size={18} />
              </InputIcon>
              <InputField
                type="text"
                placeholder="أدخل رقم الهوية"
                value={formData.idNumber}
                onChange={(e) =>
                  handleChange("idNumber", e.target.value)
                }
                $error={!!errors.idNumber}
                $rolecolor={activeColor}
              />
              {errors.idNumber && (
                <ErrorMessage>{errors.idNumber}</ErrorMessage>
              )}
            </InputGroup>

            <InputGroup>
              <InputLabel>جهة الإصدار</InputLabel>
              <InputField
                type="text"
                placeholder="مثال: وزارة الداخلية"
                value={formData.idIssuer}
                onChange={(e) =>
                  handleChange("idIssuer", e.target.value)
                }
                $error={!!errors.idIssuer}
                $rolecolor={activeColor}
                style={{ paddingInlineEnd: "0.85rem" }}
              />
              {errors.idIssuer && (
                <ErrorMessage>{errors.idIssuer}</ErrorMessage>
              )}
            </InputGroup>

            <InputGroup>
              <InputLabel>رفع وثيقة الهوية (اختياري)</InputLabel>
              <InputField
                type="file"
                onChange={(e) =>
                  handleChange(
                    "idDocumentFile",
                    e.target.files?.[0] || null
                  )
                }
                $error={!!errors.idDocumentFile}
                $rolecolor={activeColor}
                style={{
                  paddingInlineEnd: "0.5rem",
                  paddingInlineStart: "0.5rem",
                }}
              />
              <SmallHint>
                يقبل الصور أو PDF، بحد أقصى 5 ميغابايت.
              </SmallHint>
              {errors.idDocumentFile && (
                <ErrorMessage>{errors.idDocumentFile}</ErrorMessage>
              )}
            </InputGroup>

            {commonEmailPhonePassword}
          </FieldsGrid>
        );
      }

      if (step === 2) {
        return (
          <FieldsGrid>
            <InputGroup>
              <InputLabel>اسم الشركة *</InputLabel>
              <InputIcon>
                <Building2 size={18} />
              </InputIcon>
              <InputField
                type="text"
                placeholder="الاسم التجاري لشركة الشحن"
                value={formData.companyName}
                onChange={(e) =>
                  handleChange("companyName", e.target.value)
                }
                $error={!!errors.companyName}
                $rolecolor={activeColor}
              />
              {errors.companyName && (
                <ErrorMessage>{errors.companyName}</ErrorMessage>
              )}
            </InputGroup>

            <InputGroup>
              <InputLabel>عنوان مقر الشركة</InputLabel>
              <InputIcon>
                <MapPin size={18} />
              </InputIcon>
              <InputField
                type="text"
                placeholder="المدينة، المنطقة، العنوان التقريبي"
                value={formData.companyAddress}
                onChange={(e) =>
                  handleChange("companyAddress", e.target.value)
                }
                $error={!!errors.companyAddress}
                $rolecolor={activeColor}
              />
              {errors.companyAddress && (
                <ErrorMessage>{errors.companyAddress}</ErrorMessage>
              )}
            </InputGroup>

            <InputGroup style={{ gridColumn: "1 / -1" }}>
              <InputLabel>نطاق عمل الشركة</InputLabel>
              <TextAreaField
                placeholder="مثال: شحن داخل مدينة واحدة / داخل الدولة / دولي، أنواع الشحن، أوقات العمل..."
                value={formData.companyScope}
                onChange={(e) =>
                  handleChange("companyScope", e.target.value)
                }
                $error={!!errors.companyScope}
                $rolecolor={activeColor}
              />
              {errors.companyScope && (
                <ErrorMessage>{errors.companyScope}</ErrorMessage>
              )}
            </InputGroup>
          </FieldsGrid>
        );
      }
    }

    return null;
  };

  return (
    <PageWrapper>
      <Card>
        <CardHeader>
          <BrandText>طلبية</BrandText>
          <BrandSubtitle>
            إنشاء حساب {roleLabels[role] || "مستخدم"} جديد في منصة طلبية.
          </BrandSubtitle>
          <HeaderDivider />
        </CardHeader>

        {/* Stepper */}
        <StepperWrapper>
          <StepperRow>
            {steps.map((label, index) => {
              const stepNumber = index + 1;
              let state = "upcoming";
              if (stepNumber < step) state = "done";
              else if (stepNumber === step) state = "active";

              return (
                <div
                  key={stepNumber}
                  style={{ display: "flex", alignItems: "center" }}
                >
                  <StepItem>
                    <StepCircle $state={state} $color={activeColor}>
                      {stepNumber}
                    </StepCircle>
                    <StepLabel $state={state}>{label}</StepLabel>
                  </StepItem>
                  {stepNumber < steps.length && <StepSeparator />}
                </div>
              );
            })}
          </StepperRow>
        </StepperWrapper>

        <Form onSubmit={handleSubmit} noValidate>
          <div>
            <SectionTitle>{sectionTitle}</SectionTitle>
            <SectionSubtitle>{sectionSubtitle}</SectionSubtitle>
          </div>

          {renderStepFields()}

          {/* أزرار التنقل بين الخطوات */}
          <ActionsRow>
            <GhostButton
              type="button"
              onClick={handlePrev}
              disabled={step === 1 || isSubmitting}
            >
              السابق
            </GhostButton>

            <PrimaryButton
              type={step === totalSteps ? "submit" : "button"}
              onClick={step === totalSteps ? undefined : handleNext}
              disabled={isSubmitting}
              $rolecolor={activeColor}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="spinner" />
                  <span>جاري إرسال البيانات...</span>
                </>
              ) : step === totalSteps ? (
                <>
                  <ArrowRight size={18} />
                  <span>إنشاء الحساب</span>
                </>
              ) : (
                <>
                  <ArrowRight size={18} />
                  <span>التالي</span>
                </>
              )}
            </PrimaryButton>
          </ActionsRow>

          <FormFooter>
            لديك حساب مسبقًا؟
            <LoginLink to={`/login?role=${role}`} $rolecolor={activeColor}>
              تسجيل الدخول
            </LoginLink>
          </FormFooter>
        </Form>
      </Card>
    </PageWrapper>
  );
}
