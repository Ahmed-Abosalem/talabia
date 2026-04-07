import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import styled, { keyframes, css } from "styled-components";
import {
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  MapPin,
  Building2,
  Briefcase,
  ArrowRight,
  ArrowLeft,
  Upload,
  CheckCircle2,
  ShieldCheck,
  Store,
  CreditCard,
  Package,
  Sparkles,
  Trophy,
  Rocket,
  Flag,
  Calendar,
  Fingerprint,
  Landmark,
  Compass,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import logo from "@/assets/logo.png";

// Components
import PremiumInput from "@/components/Auth/PremiumInput";
import ActionButton from "@/components/Auth/ActionButton";
import Stepper from "@/components/Auth/Stepper";
import RoleCard from "@/components/Auth/RoleCard";
import {
  PageWrapper,
  FormSection,
  FormContainer,
  CardHeader,
  BrandLogo,
  Title,
  Subtitle,
  Grid,
  LegalNotice,
  CheckboxWrapper,
  BackButton,
  MotivationalMessage,
} from "./AuthStyles";

/* ================== Component ================== */
const merchantSteps = ["البيانات الشخصية", "بيانات المتجر"];
const buyerSteps = ["البيانات الشخصية", "معلومات التوصيل"];

export default function Register() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useApp() || {};
  const { register, isLoggedIn, role: currentRole } = useAuth() || {};

  const [role, setRole] = useState("buyer");
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    // Identity / Personal (Expanded for Seller)
    nationality: "",
    birthDate: "",
    idType: "national_id",
    idNumber: "",
    idIssuer: "",
    idDocument: null,
    // Store / Buyer Address (Expanded)
    storeName: "",
    storeDescription: "",
    country: "اليمن",
    city: "",
    district: "",
    neighborhood: "",
    addressDetails: "",
    // Store specific (Legacy support or seller only if needed)
    storeCountry: "اليمن",
    storeCity: "",
    storeDistrict: "",
    storeNeighborhood: "",
    storeAddressDetails: "",
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const r = params.get("role");
    if (r === "seller") setRole("seller");
    else setRole("buyer");
    setStep(1);
  }, [location.search]);

  useEffect(() => {
    if (isLoggedIn && currentRole) {
      navigate(`/${currentRole}`, { replace: true });
    }
  }, [isLoggedIn, currentRole, navigate]);

  const activeColor = role === "seller" ? "#ff7f00" : "#4b502a";

  const validate = (s) => {
    const e = {};
    if (s === 1) {
      if (!formData.name.trim()) e.name = "الاسم الكامل مطلوب";
      if (!formData.email.trim()) e.email = "البريد الإلكتروني مطلوب";
      else if (!/\S+@\S+\.\S+/.test(formData.email)) e.email = "صيغة البريد غير صحيحة";
      if (!formData.password) e.password = "كلمة المرور مطلوبة";
      if (formData.password !== formData.confirmPassword) e.confirmPassword = "كلمتا المرور غير متطابقتين";
    } else if (s === 2 && role === "seller") {
      if (!formData.storeName.trim()) e.storeName = "اسم المتجر مطلوب";
      if (!formData.storeCity.trim()) e.storeCity = "المدينة مطلوبة";
      if (!formData.storeDistrict.trim()) e.storeDistrict = "المديرية مطلوبة";
    } else if (s === 2 && role === "buyer") {
      if (!formData.city.trim()) e.city = "المدينة مطلوبة";
      if (!formData.district.trim()) e.district = "المديرية مطلوبة";
    }

    // Add seller-specific step 1 validation
    if (s === 1 && role === "seller") {
      if (!formData.nationality.trim()) e.nationality = "الجنسية مطلوبة";
      if (!formData.birthDate) e.birthDate = "تاريخ الميلاد مطلوب";
      if (!formData.idNumber.trim()) e.idNumber = "رقم الهوية مطلوب";
      if (!formData.idIssuer.trim()) e.idIssuer = "جهة الإصدار مطلوبة";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (!validate(step)) return;
    if (step < 2) {
      setStep(s => s + 1);
      window.scrollTo(0, 0);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const payload = new FormData();

      // إضافة الحقول النصية والملفات
      Object.keys(formData).forEach((key) => {
        if (formData[key] !== null && formData[key] !== undefined) {
          payload.append(key, formData[key]);
        }
      });

      // ضبط الدور بشكل صريح
      payload.set("role", role);
      payload.set("agreedToTerms", agreedToTerms);

      await register(payload);
      showToast?.(role === "seller" ? "تم تسجيل متجرك بنجاح!" : "تم إنشاء حساب المشتري بنجاح!", "success");

      // التوجيه للوحة التحكم المناسبة
      navigate(role === "seller" ? "/seller" : "/buyer");
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "فشل تسجيل الحساب";
      showToast?.(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderPhase = () => {
    if (step === 1) {
      return (
        <div style={{ animation: "fadeIn 0.5s ease" }}>
          <Grid>
            <PremiumInput
              label="الاسم الكامل"
              icon={User}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              error={errors.name}
              activeColor={activeColor}
            />
            <PremiumInput
              label="رقم الجوال"
              icon={Phone}
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              activeColor={activeColor}
            />
          </Grid>

          {role === "seller" && (
            <>
              <Grid>
                <PremiumInput
                  label="الجنسية"
                  icon={Flag}
                  value={formData.nationality}
                  onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                  error={errors.nationality}
                  activeColor={activeColor}
                />
                <PremiumInput
                  label="تاريخ الميلاد"
                  icon={Calendar}
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                  error={errors.birthDate}
                  activeColor={activeColor}
                />
              </Grid>

              <Grid>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", flex: 1 }}>
                  <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "#374151", marginBottom: "0.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <Fingerprint size={16} /> نوع الهوية
                  </label>
                  <select
                    value={formData.idType}
                    onChange={(e) => setFormData({ ...formData, idType: e.target.value })}
                    style={{
                      padding: "0.75rem",
                      borderRadius: "10px",
                      border: "1.5px solid #e5e7eb",
                      fontSize: "0.9rem",
                      background: "#ffffff",
                      cursor: "pointer",
                      outline: "none",
                      transition: "border-color 0.3s ease",
                    }}
                  >
                    <option value="national_id">بطاقة شخصية</option>
                    <option value="passport">جواز سفر</option>
                    <option value="residence_permit">إقامة</option>
                  </select>
                </div>
                <PremiumInput
                  label="رقم الهوية"
                  icon={Fingerprint}
                  value={formData.idNumber}
                  onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
                  error={errors.idNumber}
                  activeColor={activeColor}
                />
              </Grid>

              <Grid>
                <PremiumInput
                  label="جهة الإصدار"
                  icon={Landmark}
                  value={formData.idIssuer}
                  onChange={(e) => setFormData({ ...formData, idIssuer: e.target.value })}
                  error={errors.idIssuer}
                  activeColor={activeColor}
                />
                <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.75rem",
                      padding: "0.75rem 1rem",
                      background: "#f9fafb",
                      border: "1.5px dashed #d1d5db",
                      borderRadius: "10px",
                      cursor: "pointer",
                      fontSize: "0.85rem",
                      color: "#6b7280",
                      transition: "all 0.3s ease",
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.borderColor = activeColor)}
                    onMouseOut={(e) => (e.currentTarget.style.borderColor = "#d1d5db")}
                  >
                    <input
                      type="file"
                      style={{ display: "none" }}
                      onChange={(e) => setFormData({ ...formData, idDocument: e.target.files[0] })}
                    />
                    <Upload size={18} />
                    {formData.idDocument ? formData.idDocument.name : "وثيقة الهوية (اختياري)"}
                  </label>
                </div>
              </Grid>
            </>
          )}

          <PremiumInput
            id="register-email"
            name="email"
            autoComplete="email"
            inputMode="email"
            label="البريد الإلكتروني"
            icon={Mail}
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            error={errors.email}
            activeColor={activeColor}
          />

          <Grid>
            <PremiumInput
              id="register-password"
              name="password"
              autoComplete="new-password"
              label="كلمة المرور"
              icon={Lock}
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              error={errors.password}
              activeColor={activeColor}
              endAction={
                <div style={{ cursor: "pointer" }} onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </div>
              }
            />
            <PremiumInput
              id="register-confirm-password"
              name="confirm-password"
              autoComplete="new-password"
              label="تأكيد كلمة المرور"
              icon={ShieldCheck}
              type={showPassword ? "text" : "password"}
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              error={errors.confirmPassword}
              activeColor={activeColor}
              endAction={
                <div style={{ cursor: "pointer" }} onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </div>
              }
            />
          </Grid>
        </div>
      );
    }

    if (step === 2 && role === "seller") {
      return (
        <div style={{ animation: "fadeIn 0.5s ease" }}>
          <PremiumInput
            label="اسم المتجر"
            icon={Store}
            value={formData.storeName}
            onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
            error={errors.storeName}
            activeColor={activeColor}
          />
          <PremiumInput
            label="وصف المتجر (مختصر)"
            icon={Briefcase}
            value={formData.storeDescription}
            onChange={(e) => setFormData({ ...formData, storeDescription: e.target.value })}
            activeColor={activeColor}
            placeholder="مثال: أفضل المكسرات والبهارات اليمنية بجودة عالية"
          />

          <h4 style={{ fontSize: "0.95rem", fontWeight: 800, color: "#111827", marginBottom: "1rem", marginTop: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <MapPin size={18} color={activeColor} /> عنوان المتجر التفصيلي
          </h4>

          <Grid>
            <PremiumInput
              label="الدولة"
              icon={Flag}
              value={formData.storeCountry}
              onChange={(e) => setFormData({ ...formData, storeCountry: e.target.value })}
              activeColor={activeColor}
            />
            <PremiumInput
              label="المدينة"
              icon={Building2}
              value={formData.storeCity}
              onChange={(e) => setFormData({ ...formData, storeCity: e.target.value })}
              error={errors.storeCity}
              activeColor={activeColor}
            />
          </Grid>

          <Grid>
            <PremiumInput
              label="المديرية"
              icon={Compass}
              value={formData.storeDistrict}
              onChange={(e) => setFormData({ ...formData, storeDistrict: e.target.value })}
              error={errors.storeDistrict}
              activeColor={activeColor}
            />
            <PremiumInput
              label="الحي"
              icon={MapPin}
              value={formData.storeNeighborhood}
              onChange={(e) => setFormData({ ...formData, storeNeighborhood: e.target.value })}
              activeColor={activeColor}
            />
          </Grid>

          <PremiumInput
            label="تفاصيل إضافية (الشارع، رقم المبنى...)"
            icon={MapPin}
            value={formData.storeAddressDetails}
            onChange={(e) => setFormData({ ...formData, storeAddressDetails: e.target.value })}
            activeColor={activeColor}
          />
        </div>
      );
    }

    if (step === 2 && role === "buyer") {
      return (
        <div style={{ animation: "fadeIn 0.5s ease" }}>
          <h4 style={{ fontSize: "0.95rem", fontWeight: 800, color: "#111827", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <MapPin size={18} color={activeColor} /> معلومات التوصيل
          </h4>
          <p style={{ fontSize: "0.85rem", color: "#6b7280", marginBottom: "1.5rem" }}>
            يرجى إدخال معلومات التوصيل بدقة لضمان وصول الطلبات إليك بسرعة.
          </p>

          <Grid>
            <PremiumInput
              label="الدولة"
              icon={Flag}
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              activeColor={activeColor}
            />
            <PremiumInput
              label="المدينة"
              icon={Building2}
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              error={errors.city}
              activeColor={activeColor}
            />
          </Grid>

          <Grid>
            <PremiumInput
              label="المديرية"
              icon={Compass}
              value={formData.district}
              onChange={(e) => setFormData({ ...formData, district: e.target.value })}
              error={errors.district}
              activeColor={activeColor}
            />
            <PremiumInput
              label="الحي"
              icon={MapPin}
              value={formData.neighborhood}
              onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
              activeColor={activeColor}
            />
          </Grid>

          <PremiumInput
            label="تفاصيل إضافية (الشارع، رقم المبنى، ملاحظات)"
            icon={MapPin}
            value={formData.addressDetails}
            onChange={(e) => setFormData({ ...formData, addressDetails: e.target.value })}
            activeColor={activeColor}
            placeholder="مثال: شارع حدة، عمارة رقم 10، أمام كافيه كذا"
          />
        </div>
      );
    }
  };

  return (
    <PageWrapper>
      <FormSection>
        <FormContainer>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.5rem" }}>
            <BrandLogo src={logo} alt="Talabia" style={{ height: "60px" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "1rem" }}>
            <BackButton to="/login">
              <ArrowLeft size={20} /> العودة لتسجيل الدخول الآن
            </BackButton>
          </div>

          <CardHeader>
            <Title>{role === "seller" ? "تسجيل بائع جديد" : "إنشاء حساب مشتري"}</Title>
            <Subtitle>
              {role === "seller" ? merchantSteps[step - 1] : buyerSteps[step - 1]}
            </Subtitle>
          </CardHeader>

          <Stepper steps={role === "seller" ? merchantSteps : buyerSteps} currentStep={step} activeColor={activeColor} />

          <div style={{ marginBottom: "2rem" }}>
            {step === 1 && (
              <MotivationalMessage color={activeColor}>
                <Sparkles size={24} color={activeColor} />
                <div>
                  <h4>أهلاً بك في عائلة طلبية!</h4>
                  <p>
                    {role === "seller"
                      ? "لنبدأ بتوثيق بياناتك الشخصية لبناء جسر من الثقة مع عملائك المستقبليين."
                      : "سعداء بانضمامك إلينا! لنبدأ بإعداد بياناتك الشخصية لتجربة تسوق مميزة."}
                  </p>
                </div>
              </MotivationalMessage>
            )}
            {step === 2 && (
              <MotivationalMessage color={activeColor}>
                {role === "seller" ? <Trophy size={24} color={activeColor} /> : <Rocket size={24} color={activeColor} />}
                <div>
                  <h4>{role === "seller" ? "الخطوة الأخيرة للتميز!" : "خطوة واحدة نحو أول طلب!"}</h4>
                  <p>
                    {role === "seller"
                      ? "رائع! الآن لنبرز هوية متجرك. أنت على وشك الانطلاق في \"طلبية\"."
                      : "أضف عنوانك الآن لتسهيل وصول مشترياتك بدقة وسرعة وبدون عناء."}
                  </p>
                </div>
              </MotivationalMessage>
            )}
          </div>

          <form onSubmit={(e) => e.preventDefault()}>
            {renderPhase()}

            {(role === "buyer" || (role === "seller" && step === 2)) && (
              <CheckboxWrapper style={{ marginTop: "1.5rem" }}>
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                />
                <span>
                  بالضغط على إنشاء حساب، فإنك توافق على{" "}
                  <Link to="/privacy-policy" target="_blank" style={{ color: activeColor, fontWeight: 700 }}>
                    سياسة الخصوصية
                  </Link>{" "}
                  الخاصة بنا.
                </span>
              </CheckboxWrapper>
            )}

            <div style={{ marginTop: "2rem", display: "flex", gap: "1rem" }}>
              {step > 1 && (
                <ActionButton
                  type="button"
                  variant="secondary"
                  onClick={() => setStep(s => s - 1)}
                  activeColor={activeColor}
                >
                  السابق
                </ActionButton>
              )}
              <ActionButton
                type="button"
                isLoading={isSubmitting}
                activeColor={activeColor}
                icon={step < 2 ? ArrowRight : null}
                onClick={handleNext}
                disabled={step === 2 && !agreedToTerms}
              >
                {step < 2 ? "المتابعة" : "إتمام التسجيل"}
              </ActionButton>
            </div>

            <div style={{ marginTop: "2rem", textAlign: "center", fontSize: "0.9rem", color: "#6b7280" }}>
              لديك حساب بالفعل؟{" "}
              <Link to="/login" style={{ color: activeColor, fontWeight: 700, textDecoration: "none" }}>
                سجل الدخول هنا
              </Link>
            </div>
          </form>
        </FormContainer>
      </FormSection>
    </PageWrapper >
  );
}
