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
      <div className="admin-profile-page">
        <div className="admin-profile-header">
          <div className="admin-profile-title-group">
            <h1 className="admin-profile-title">حساب المدير</h1>
            <p className="admin-profile-subtitle">
              جاري تحميل بيانات حساب الأدمن...
            </p>
          </div>
          <div className="admin-profile-role-pill">
            <Shield size={16} />
            <span>مدير النظام</span>
          </div>
        </div>
        <div className="admin-profile-loading-card">
          جاري التحميل...
        </div>
      </div>
    );
  }

  return (
    <div className="admin-profile-page">
      <div className="admin-profile-header">
        <div className="admin-profile-title-group">
          <h1 className="admin-profile-title">حساب المدير</h1>
          <p className="admin-profile-subtitle">
            من هذه الصفحة يمكنك إدارة بيانات حساب الأدمن وتحديث معلومات الأمان.
          </p>
        </div>
        <div className="admin-profile-role-pill">
          <Shield size={16} />
          <span>مدير النظام</span>
        </div>
      </div>

      <div className="admin-profile-grid">
        {/* بطاقة البيانات الأساسية */}
        <section className="admin-profile-card">
          <div className="admin-profile-card-header">
            <div className="admin-profile-card-title-group">
              <h2>البيانات الأساسية</h2>
              <p>تعديل اسمك، بريدك الإلكتروني، ورقم هاتفك.</p>
            </div>
            <User className="admin-profile-card-icon" size={20} />
          </div>

          <form className="admin-profile-form" onSubmit={handleSaveProfile}>
            <div className="admin-profile-form-row">
              <div className="admin-profile-field">
                <label>الاسم الكامل</label>
                <div className="admin-profile-input-wrapper">
                  <span className="admin-profile-input-icon">
                    <User size={18} />
                  </span>
                  <input
                    type="text"
                    value={profileForm.name}
                    onChange={(e) =>
                      handleProfileChange("name", e.target.value)
                    }
                    placeholder="أدخل اسم المدير"
                  />
                </div>
              </div>

              <div className="admin-profile-field">
                <label>البريد الإلكتروني</label>
                <div className="admin-profile-input-wrapper">
                  <span className="admin-profile-input-icon">
                    <Mail size={18} />
                  </span>
                  <input
                    type="email"
                    value={profileForm.email}
                    onChange={(e) =>
                      handleProfileChange("email", e.target.value)
                    }
                    placeholder="example@domain.com"
                  />
                </div>
              </div>
            </div>

            <div className="admin-profile-form-row">
              <div className="admin-profile-field">
                <label>رقم الجوال</label>
                <div className="admin-profile-input-wrapper">
                  <span className="admin-profile-input-icon">
                    <Phone size={18} />
                  </span>
                  <input
                    type="tel"
                    value={profileForm.phone}
                    onChange={(e) =>
                      handleProfileChange("phone", e.target.value)
                    }
                    placeholder="مثال: 0550000000"
                  />
                </div>
              </div>

              <div className="admin-profile-field">
                <label>العنوان</label>
                <div className="admin-profile-input-wrapper">
                  <span className="admin-profile-input-icon">
                    <MapPinIcon />
                  </span>
                  <input
                    type="text"
                    value={profileForm.address}
                    onChange={(e) =>
                      handleProfileChange("address", e.target.value)
                    }
                    placeholder="المدينة، الحي، العنوان التقريبي"
                  />
                </div>
              </div>
            </div>

            <div className="admin-profile-actions">
              <button
                type="button"
                className="admin-profile-btn ghost"
                onClick={handleResetProfile}
                disabled={isSavingProfile}
              >
                <RefreshCw size={16} />
                <span>استرجاع البيانات الأصلية</span>
              </button>

              <button
                type="submit"
                className="admin-profile-btn primary"
                disabled={isSavingProfile}
              >
                {isSavingProfile ? (
                  <>
                    <SavingSpinner />
                    <span>جاري الحفظ...</span>
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    <span>حفظ التغييرات</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

        {/* بطاقة الأمان وكلمة المرور */}
        <section className="admin-profile-card">
          <div className="admin-profile-card-header">
            <div className="admin-profile-card-title-group">
              <h2>الأمان وكلمة المرور</h2>
              <p>تغيير كلمة المرور الخاصة بحساب المدير.</p>
            </div>
            <Lock className="admin-profile-card-icon" size={20} />
          </div>

          <form className="admin-profile-form" onSubmit={handleSavePassword}>
            <div className="admin-profile-field">
              <label>كلمة المرور الحالية</label>
              <div className="admin-profile-input-wrapper">
                <span className="admin-profile-input-icon">
                  <Lock size={18} />
                </span>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) =>
                    handlePasswordChange("currentPassword", e.target.value)
                  }
                  placeholder="أدخل كلمة المرور الحالية"
                />
              </div>
            </div>

            <div className="admin-profile-form-row">
              <div className="admin-profile-field">
                <label>كلمة المرور الجديدة</label>
                <div className="admin-profile-input-wrapper">
                  <span className="admin-profile-input-icon">
                    <Lock size={18} />
                  </span>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) =>
                      handlePasswordChange("newPassword", e.target.value)
                    }
                    placeholder="كلمة مرور قوية لا تقل عن 6 رموز"
                  />
                </div>
              </div>

              <div className="admin-profile-field">
                <label>تأكيد كلمة المرور الجديدة</label>
                <div className="admin-profile-input-wrapper">
                  <span className="admin-profile-input-icon">
                    <Lock size={18} />
                  </span>
                  <input
                    type="password"
                    value={passwordForm.confirmNewPassword}
                    onChange={(e) =>
                      handlePasswordChange(
                        "confirmNewPassword",
                        e.target.value
                      )
                    }
                    placeholder="أعد إدخال كلمة المرور الجديدة"
                  />
                </div>
              </div>
            </div>

            <div className="admin-profile-actions">
              <button
                type="button"
                className="admin-profile-btn ghost"
                onClick={handleResetPassword}
                disabled={isSavingPassword}
              >
                <RefreshCw size={16} />
                <span>مسح الحقول</span>
              </button>

              <button
                type="submit"
                className="admin-profile-btn primary"
                disabled={isSavingPassword}
              >
                {isSavingPassword ? (
                  <>
                    <SavingSpinner />
                    <span>جاري التحديث...</span>
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    <span>تحديث كلمة المرور</span>
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

// أيقونة بسيطة للموقع الجغرافي بدون استيراد مكتبة إضافية
function MapPinIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="admin-profile-svg-icon"
    >
      <path
        d="M12 12.75a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z"
        fill="currentColor"
      />
      <path
        d="M6.75 10.5c0 4.28 3.04 7.28 4.68 8.7.33.29.49.43.79.43s.46-.14.79-.43c1.64-1.42 4.68-4.42 4.68-8.7a6.25 6.25 0 1 0-11 3.9v0Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  );
}

function SavingSpinner() {
  return (
    <span className="admin-profile-spinner" aria-hidden="true" />
  );
}
