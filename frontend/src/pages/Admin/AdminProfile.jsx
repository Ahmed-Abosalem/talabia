// src/pages/Admin/AdminProfile.jsx

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";
import { useNavigate } from "react-router-dom";
import {
  User,
  Mail,
  Phone,
  Shield,
  Lock,
  Save,
  RefreshCw,
  MapPin,
} from "lucide-react";
import { getProfile, updateProfile } from "@/services/userService";
import "./AdminProfile.css";

export default function AdminProfile() {
  const { isLoggedIn, role } = useAuth() || {};
  const { showToast } = useApp() || {};
  const navigate = useNavigate();

  const [profileForm, setProfileForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });

  const [initialProfile, setInitialProfile] = useState(null);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // تحميل بيانات الأدمن من الـ API
  useEffect(() => {
    if (!isLoggedIn || role !== "admin") {
      navigate("/login?role=admin", { replace: true });
      return;
    }

    const fetchProfile = async () => {
      try {
        setLoadingProfile(true);
        const data = await getProfile();
        const user = data?.user || data || {};

        const next = {
          name: user.name || "",
          email: user.email || "",
          phone: user.phone || "",
          address: user.address || "",
        };

        setProfileForm(next);
        setInitialProfile(next);
      } catch (err) {
        console.error("Failed to load admin profile", err);
        showToast?.("تعذّر تحميل بيانات حساب الأدمن. حاول مرة أخرى.", "error");
      } finally {
        setLoadingProfile(false);
      }
    };

    fetchProfile();
  }, [isLoggedIn, role, navigate, showToast]);

  const handleProfileChange = (field, value) => {
    setProfileForm((prev) => ({ ...prev, [field]: value }));
  };

  const handlePasswordChange = (field, value) => {
    setPasswordForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleResetProfile = () => {
    if (!initialProfile) return;
    setProfileForm(initialProfile);
  };

  const handleResetPassword = () => {
    setPasswordForm({
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    });
  };

  const validateEmail = (email) => {
    const re = /\S+@\S+\.\S+/;
    return re.test(email);
  };

  // حفظ بيانات الملف الشخصي (اسم + بريد + هاتف + عنوان)
  const handleSaveProfile = async (e) => {
    e.preventDefault();

    if (!profileForm.name.trim() || !profileForm.email.trim()) {
      showToast?.("الاسم والبريد الإلكتروني حقول إلزامية.", "error");
      return;
    }

    if (!validateEmail(profileForm.email.trim())) {
      showToast?.("صيغة البريد الإلكتروني غير صحيحة.", "error");
      return;
    }

    setIsSavingProfile(true);
    try {
      const payload = {
        name: profileForm.name.trim(),
        email: profileForm.email.trim(),
        phone: profileForm.phone.trim(),
        address: profileForm.address.trim(),
      };

      const updated = await updateProfile(payload);
      const user = updated?.user || updated || {};

      const next = {
        name: user.name || payload.name,
        email: user.email || payload.email,
        phone: user.phone || payload.phone,
        address: user.address || payload.address,
      };

      setProfileForm(next);
      setInitialProfile(next);

      showToast?.("تم حفظ بيانات الملف الشخصي بنجاح.", "success");

      // تحديث AuthContext وباقي الواجهة
      setTimeout(() => {
        window.location.reload();
      }, 800);
    } catch (err) {
      console.error("Failed to save admin profile", err);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "حدث خطأ أثناء حفظ بيانات الملف الشخصي.";
      showToast?.(msg, "error");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // حفظ كلمة المرور
  const handleSavePassword = async (e) => {
    e.preventDefault();

    if (
      !passwordForm.currentPassword ||
      !passwordForm.newPassword ||
      !passwordForm.confirmNewPassword
    ) {
      showToast?.("جميع حقول كلمة المرور إلزامية.", "error");
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      showToast?.("كلمة المرور الجديدة يجب أن لا تقل عن 6 رموز.", "error");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
      showToast?.("كلمتا المرور الجديدتان غير متطابقتين.", "error");
      return;
    }

    setIsSavingPassword(true);
    try {
      // نرسل كلمة المرور الجديدة (والحالـية إن احتاجها السيرفر للتحقق)
      const payload = {
        password: passwordForm.newPassword,
        currentPassword: passwordForm.currentPassword,
      };

      await updateProfile(payload);

      showToast?.("تم تحديث كلمة مرور الأدمن بنجاح.", "success");
      handleResetPassword();

      // التأكد من تحديث الجلسة
      setTimeout(() => {
        window.location.reload();
      }, 800);
    } catch (err) {
      console.error("Failed to update admin password", err);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "حدث خطأ أثناء تحديث كلمة المرور.";
      showToast?.(msg, "error");
    } finally {
      setIsSavingPassword(false);
    }
  };

  if (loadingProfile) {
    return (
      <section className="adm-section-panel">
        <div className="adm-loading-state">
          <RefreshCw size={40} className="spin" />
          <p>جاري تحميل بيانات حساب الأدمن...</p>
        </div>
      </section>
    );
  }

  return (
    <div className="adm-section-panel">
      <header className="adm-section-inner-header">
        <div className="adm-section-icon">
          <User size={22} />
        </div>
        <div className="adm-section-title-group">
          <h2 className="adm-section-title">حساب المدير</h2>
          <p className="adm-section-subtitle">إدارة بيانات حسابك الشخصي وكلمة المرور المشفرة.</p>
        </div>
        <div className="adm-profile-role-pill">
          <Shield size={16} />
          <span>مدير النظام</span>
        </div>
      </header>

      <div className="adm-profile-grid">
        {/* بطاقة البيانات الأساسية */}
        <section className="adm-card">
          <div className="adm-section-inner-header plain no-padding" style={{ marginBottom: 'var(--sp-4)' }}>
            <div className="adm-section-icon sm">
              <User size={16} />
            </div>
            <div>
              <h3 className="adm-font-bold" style={{ margin: 0, fontSize: '1rem' }}>البيانات الأساسية</h3>
              <p className="adm-text-soft" style={{ fontSize: '0.8rem', margin: 0 }}>تعديل الاسم، البريد، والهاتف.</p>
            </div>
          </div>

          <form className="adm-form" onSubmit={handleSaveProfile}>
            <div className="adm-profile-form-row">
              <div className="adm-form-group">
                <label className="adm-form-label">الاسم الكامل</label>
                <div style={{ position: 'relative' }}>
                  <User className="adm-input-icon" size={18} />
                  <input
                    className="adm-form-input adm-input-with-icon"
                    type="text"
                    value={profileForm.name}
                    onChange={(e) => handleProfileChange("name", e.target.value)}
                    placeholder="أدخل اسمك الكامل"
                  />
                </div>
              </div>

              <div className="adm-form-group">
                <label className="adm-form-label">البريد الإلكتروني</label>
                <div style={{ position: 'relative' }}>
                  <Mail className="adm-input-icon" size={18} />
                  <input
                    className="adm-form-input adm-input-with-icon"
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => handleProfileChange("email", e.target.value)}
                    placeholder="example@domain.com"
                  />
                </div>
              </div>
            </div>

            <div className="adm-profile-form-row">
              <div className="adm-form-group">
                <label className="adm-form-label">رقم الجوال</label>
                <div style={{ position: 'relative' }}>
                  <Phone className="adm-input-icon" size={18} />
                  <input
                    className="adm-form-input adm-input-with-icon"
                    type="tel"
                    value={profileForm.phone}
                    onChange={(e) => handleProfileChange("phone", e.target.value)}
                    placeholder="05XXXXXXXX"
                  />
                </div>
              </div>

              <div className="adm-form-group">
                <label className="adm-form-label">العنوان</label>
                <div style={{ position: 'relative' }}>
                  <MapPin className="adm-input-icon" size={18} />
                  <input
                    className="adm-form-input adm-input-with-icon"
                    type="text"
                    value={profileForm.address}
                    onChange={(e) => handleProfileChange("address", e.target.value)}
                    placeholder="المدينة، الحي..."
                  />
                </div>
              </div>
            </div>

            <div className="adm-profile-actions">
              <button
                type="button"
                className="adm-btn outline sm"
                onClick={handleResetProfile}
                disabled={isSavingProfile}
              >
                <RefreshCw size={16} />
                <span>إرجاع</span>
              </button>

              <button
                type="submit"
                className="adm-btn primary"
                disabled={isSavingProfile}
              >
                {isSavingProfile ? (
                  <>
                    <RefreshCw size={16} className="spin" />
                    <span>جاري الحفظ...</span>
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    <span>حفظ البيانات</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

        {/* بطاقة الأمان وكلمة المرور */}
        <section className="adm-card">
          <div className="adm-section-inner-header plain no-padding" style={{ marginBottom: 'var(--sp-4)' }}>
            <div className="adm-section-icon sm">
              <Lock size={16} />
            </div>
            <div>
              <h3 className="adm-font-bold" style={{ margin: 0, fontSize: '1rem' }}>الأمان وكلمة المرور</h3>
              <p className="adm-text-soft" style={{ fontSize: '0.8rem', margin: 0 }}>تحديث كلمة السر لحماية الحساب.</p>
            </div>
          </div>

          <form className="adm-form" onSubmit={handleSavePassword}>
            <div className="adm-form-group">
              <label className="adm-form-label">كلمة المرور الحالية</label>
              <div style={{ position: 'relative' }}>
                <Lock className="adm-input-icon" size={18} />
                <input
                  className="adm-form-input adm-input-with-icon"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => handlePasswordChange("currentPassword", e.target.value)}
                  placeholder="أدخل كلمة المرور الحالية"
                />
              </div>
            </div>

            <div className="adm-profile-form-row">
              <div className="adm-form-group">
                <label className="adm-form-label">كلمة المرور الجديدة</label>
                <div style={{ position: 'relative' }}>
                  <Lock className="adm-input-icon" size={18} />
                  <input
                    className="adm-form-input adm-input-with-icon"
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => handlePasswordChange("newPassword", e.target.value)}
                    placeholder="6 رموز على الأقل"
                  />
                </div>
              </div>

              <div className="adm-form-group">
                <label className="adm-form-label">تأكيد كلمة المرور</label>
                <div style={{ position: 'relative' }}>
                  <Lock className="adm-input-icon" size={18} />
                  <input
                    className="adm-form-input adm-input-with-icon"
                    type="password"
                    value={passwordForm.confirmNewPassword}
                    onChange={(e) => handlePasswordChange("confirmNewPassword", e.target.value)}
                    placeholder="أعد إدخال الكلمة الجديدة"
                  />
                </div>
              </div>
            </div>

            <div className="adm-profile-actions">
              <button
                type="button"
                className="adm-btn outline sm"
                onClick={handleResetPassword}
                disabled={isSavingPassword}
              >
                <RefreshCw size={16} />
                <span>مسح</span>
              </button>

              <button
                type="submit"
                className="adm-btn primary"
                disabled={isSavingPassword}
              >
                {isSavingPassword ? (
                  <>
                    <RefreshCw size={16} className="spin" />
                    <span>جاري التحديث...</span>
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    <span>تحديث كلمة السر</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
