import "./BuyerProfileSection.css";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  MapPin,
  Lock,
  ArrowRight,
  Mail,
  Phone,
  Info,
  Eye,
  EyeOff,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  RefreshCw,
  Check,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { useApp } from "../../context/AppContext";
import * as userService from "../../services/userService";

export default function BuyerProfileSection() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const { showToast } = useApp();

  // =========================
  // 1) حالة الملف الشخصي
  // =========================
  const [profileForm, setProfileForm] = useState({
    fullName: user?.fullName || user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    country: user?.country || "",
    city: user?.city || "",
    district: user?.district || "",
    neighborhood: user?.neighborhood || "",
    addressDetails: user?.addressDetails || "",
  });
  const [profileErrors, setProfileErrors] = useState({});
  const [profileSaving, setProfileSaving] = useState(false);

  const hydrateProfileFromAuth = () => {
    if (!user) return;
    setProfileForm((prev) => ({
      ...prev,
      fullName: user.fullName || user.name || prev.fullName || "",
      email: user.email || prev.email || "",
      phone: user.phone || user.mobile || prev.phone || "",
      country: user.country || prev.country || "",
      city: user.city || prev.city || "",
      district: user.district || prev.district || "",
      neighborhood: user.neighborhood || prev.neighborhood || "",
      addressDetails: user.addressDetails || prev.addressDetails || "",
    }));
  };

  const loadProfileAndPrefs = async () => {
    try {
      if (userService.getProfile) {
        const profile = await userService.getProfile();
        if (profile) {
          setProfileForm((prev) => ({
            ...prev,
            fullName: profile.fullName || profile.name || prev.fullName || "",
            email: profile.email || prev.email || "",
            phone: profile.phone || profile.mobile || prev.phone || "",
            country: profile.country || prev.country || "",
            city: profile.city || prev.city || "",
            district: profile.district || prev.district || "",
            neighborhood: profile.neighborhood || prev.neighborhood || "",
            addressDetails: profile.addressDetails || prev.addressDetails || "",
          }));
        }
      } else {
        hydrateProfileFromAuth();
      }
    } catch (error) {
      console.error("Error loading buyer profile:", error);
      showToast("تعذّر تحميل بيانات ملفك الشخصي حاليًا.", "error");
      hydrateProfileFromAuth();
    }
  };

  const validateProfile = () => {
    const errors = {};
    if (!profileForm.fullName.trim()) errors.fullName = "الاسم الكامل مطلوب";
    if (!profileForm.email.trim()) {
      errors.email = "البريد الإلكتروني مطلوب";
    } else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(profileForm.email)) {
      errors.email = "صيغة البريد الإلكتروني غير صحيحة";
    }
    if (!profileForm.phone.trim()) errors.phone = "رقم الجوال مطلوب";

    setProfileErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveProfile = async () => {
    if (!validateProfile()) return;
    try {
      setProfileSaving(true);
      if (userService.updateProfile) {
        await userService.updateProfile(profileForm);
        if (refreshUser) await refreshUser();
      }
      showToast("تم تحديث بيانات ملفك الشخصي بنجاح.", "success");
    } catch (error) {
      console.error("Error updating buyer profile:", error);
      showToast("تعذّر تحديث البيانات، حاول مرة أخرى.", "error");
    } finally {
      setProfileSaving(false);
    }
  };

  // =========================
  // 2) عناوين الشحن
  // =========================
  const [addresses, setAddresses] = useState([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [addressForm, setAddressForm] = useState({
    label: "",
    city: "",
    area: "",
    district: "",
    street: "",
    details: "",
    isDefault: false,
  });
  const [addressErrors, setAddressErrors] = useState({});
  const [addressSaving, setAddressSaving] = useState(false);

  const loadAddresses = async () => {
    if (!userService.getAddresses) return;
    try {
      setAddressesLoading(true);
      const list = await userService.getAddresses();
      setAddresses(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error("Error loading buyer addresses:", error);
      showToast("تعذّر تحميل عناوين الشحن حاليًا.", "error");
    } finally {
      setAddressesLoading(false);
    }
  };

  const validateAddress = () => {
    const errors = {};
    if (!addressForm.label.trim()) errors.label = "الاسم المختصر مطلوب";
    if (!addressForm.city.trim()) errors.city = "الدولة مطلوبة";
    if (!addressForm.area.trim()) errors.area = "المدينة مطلوبة";
    if (!addressForm.district.trim()) errors.district = "المديرية مطلوبة";
    if (!addressForm.street.trim()) errors.street = "الحي مطلوب";
    if (!addressForm.details.trim()) errors.details = "أدخل تفاصيل إضافية";

    setAddressErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const resetAddressForm = () => {
    setEditingAddressId(null);
    setAddressErrors({});
    setAddressForm({
      label: "",
      city: "",
      area: "",
      district: "",
      street: "",
      details: "",
      isDefault: false,
    });
  };

  const handleSaveAddress = async () => {
    if (!validateAddress()) return;
    try {
      setAddressSaving(true);
      if (editingAddressId && userService.updateAddress) {
        await userService.updateAddress(editingAddressId, addressForm);
      } else if (userService.createAddress) {
        await userService.createAddress(addressForm);
      }
      await loadAddresses();
      resetAddressForm();
      showToast("تم حفظ العنوان بنجاح.", "success");
    } catch (error) {
      console.error("Error saving buyer address:", error);
      showToast("تعذّر حفظ العنوان، حاول مجددًا.", "error");
    } finally {
      setAddressSaving(false);
    }
  };

  const handleEditAddress = (address) => {
    if (!address) return;
    setEditingAddressId(address._id || address.id || null);
    setAddressForm({
      label: address.label || "",
      city: address.city || "",
      area: address.area || "",
      district: address.district || "",
      street: address.street || "",
      details: address.details || "",
      isDefault: !!address.isDefault,
    });
    setAddressErrors({});
    window.scrollTo({ top: document.querySelector(".buyer-address-form")?.offsetTop - 100, behavior: "smooth" });
  };

  const handleDeleteAddress = async (addressId) => {
    if (!addressId || !userService.deleteAddress) return;
    if (!window.confirm("هل أنت متأكد من حذف هذا العنوان؟")) return;
    try {
      setAddressesLoading(true);
      await userService.deleteAddress(addressId);
      setAddresses((prev) => prev.filter((a) => (a._id || a.id) !== addressId));
      showToast("تم حذف العنوان بنجاح.", "success");
    } catch (error) {
      console.error("Error deleting buyer address:", error);
      showToast("تعذّر حذف العنوان حاليًا.", "error");
    } finally {
      setAddressesLoading(false);
    }
  };

  // =========================
  // 3) تغيير كلمة المرور
  // =========================
  const [showPasswordCard, setShowPasswordCard] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validatePassword = () => {
    const errors = {};
    if (!passwordForm.currentPassword) errors.currentPassword = "أدخل كلمة المرور الحالية";
    if (!passwordForm.newPassword) {
      errors.newPassword = "أدخل كلمة المرور الجديدة";
    } else if (passwordForm.newPassword.length < 8) {
      errors.newPassword = "يجب أن تكون 8 أحرف على الأقل";
    }
    if (passwordForm.confirmPassword !== passwordForm.newPassword) {
      errors.confirmPassword = "كلمتا المرور غير متطابقتين";
    }
    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSavePassword = async () => {
    if (!validatePassword()) return;
    try {
      setPasswordSaving(true);
      await userService.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setShowPasswordCard(false);
      showToast("تم تحديث كلمة المرور بنجاح.", "success");
    } catch (error) {
      console.error("Error changing password:", error);
      showToast("تعذّر تحديث كلمة المرور، تأكد من صحة البيانات.", "error");
    } finally {
      setPasswordSaving(false);
    }
  };

  useEffect(() => {
    loadProfileAndPrefs();
    loadAddresses();
  }, []);

  return (
    <div className="adm-page-root buyer-profile-section">
      <header className="adm-header">
        <div className="adm-header-inner">
          <div className="adm-header-right">
            <button onClick={() => navigate("/")} className="adm-btn-back" title="مواصلة التسوق">
              <ArrowRight size={20} />
            </button>
            <h1 className="adm-page-title buyer-page-title">
              <User size={24} />
              الملف الشخصي
            </h1>
          </div>
        </div>
      </header>

      <div className="adm-main-container">
        <main className="adm-details-grid buyer-profile-grid">
          {/* Card 1: Basic Info */}
          <section className="adm-card span-12 buyer-profile-card">
            <div className="adm-card-header buyer-profile-card-header">
              <User className="buyer-profile-card-icon" />
              <div>
                <h3 className="buyer-profile-card-title">البيانات الأساسية</h3>
              </div>
            </div>

            <div className="adm-card-body buyer-profile-card-body">
              <div className="adm-form-group">
                <label className="adm-form-label">الاسم الكامل</label>
                <div className="buyer-input-wrapper">
                  <User size={18} className="buyer-field-icon" />
                  <input
                    type="text"
                    className={`adm-form-input ${profileErrors.fullName ? "has-error" : ""}`}
                    value={profileForm.fullName}
                    placeholder="أدخل اسمك الكامل"
                    onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                  />
                </div>
                {profileErrors.fullName && <div className="adm-form-error">{profileErrors.fullName}</div>}
              </div>

              <div className="adm-form-group">
                <label className="adm-form-label">رقم الجوال</label>
                <div className="buyer-input-wrapper">
                  <Phone size={18} className="buyer-field-icon" />
                  <input
                    type="tel"
                    className={`adm-form-input ${profileErrors.phone ? "has-error" : ""}`}
                    value={profileForm.phone}
                    placeholder="05xxxxxxxx"
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  />
                </div>
                {profileErrors.phone && <div className="adm-form-error">{profileErrors.phone}</div>}
              </div>

              <div className="adm-form-group">
                <label className="adm-form-label">البريد الإلكتروني</label>
                <div className="buyer-input-wrapper">
                  <Mail size={18} className="buyer-field-icon" />
                  <input
                    type="email"
                    className={`adm-form-input ${profileErrors.email ? "has-error" : ""}`}
                    value={profileForm.email}
                    placeholder="example@email.com"
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  />
                </div>
                {profileErrors.email && <div className="adm-form-error">{profileErrors.email}</div>}
              </div>

              <hr className="buyer-profile-card-divider" />

              <div className="buyer-security-section">
                <div className="adm-card-header buyer-profile-card-header no-border p-0">
                  <Lock className="buyer-profile-card-icon" />
                  <div>
                    <h4 className="buyer-profile-card-title">أمان الحساب</h4>
                  </div>
                </div>

                {!showPasswordCard ? (
                  <button className="adm-btn outline w-full mt-4" onClick={() => setShowPasswordCard(true)}>
                    <Lock size={18} /> تغيير كلمة المرور
                  </button>
                ) : (
                  <div className="buyer-password-form">
                    <div className="adm-form-group">
                      <label className="adm-form-label">كلمة المرور الحالية</label>
                      <div className="buyer-input-wrapper">
                        <Lock size={18} className="buyer-field-icon" />
                        <input
                          type={showCurrentPassword ? "text" : "password"}
                          className={`adm-form-input ${passwordErrors.currentPassword ? "has-error" : ""}`}
                          value={passwordForm.currentPassword}
                          placeholder="••••••••"
                          onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                        />
                        <button className="buyer-password-toggle" onClick={() => setShowCurrentPassword(!showCurrentPassword)}>
                          {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      {passwordErrors.currentPassword && <div className="adm-form-error">{passwordErrors.currentPassword}</div>}
                    </div>

                    <div className="adm-form-group">
                      <label className="adm-form-label">كلمة المرور الجديدة</label>
                      <div className="buyer-input-wrapper">
                        <Lock size={18} className="buyer-field-icon" />
                        <input
                          type={showNewPassword ? "text" : "password"}
                          className={`adm-form-input ${passwordErrors.newPassword ? "has-error" : ""}`}
                          value={passwordForm.newPassword}
                          placeholder="••••••••"
                          onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                        />
                        <button className="buyer-password-toggle" onClick={() => setShowNewPassword(!showNewPassword)}>
                          {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      {passwordErrors.newPassword && <div className="adm-form-error">{passwordErrors.newPassword}</div>}
                    </div>

                    <div className="buyer-password-actions">
                      <button className="adm-btn outline" onClick={() => setShowPasswordCard(false)} disabled={passwordSaving}>
                        <X size={18} /> إلغاء
                      </button>
                      <button className="adm-btn primary" onClick={handleSavePassword} disabled={passwordSaving}>
                        {passwordSaving ? <RefreshCw size={18} className="animate-spin" /> : <RefreshCw size={18} />}
                        تحديث كلمة المرور
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="adm-card-footer mt-auto">
              <button className="adm-btn primary w-full" onClick={handleSaveProfile} disabled={profileSaving}>
                {profileSaving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                {profileSaving ? "جارٍ الحفظ..." : "حفظ بيانات الملف الشخصي"}
              </button>
            </div>
          </section>

          {/* Card 2: Shipping Addresses */}
          <section className="adm-card span-12 buyer-profile-card">
            <div className="adm-card-header buyer-profile-card-header">
              <MapPin className="buyer-profile-card-icon" />
              <div>
                <h3 className="buyer-profile-card-title">عناوين الشحن</h3>
              </div>
            </div>

            <div className="adm-card-body buyer-profile-card-body">
              <div className="buyer-addresses-list">
                {addressesLoading ? (
                  <div className="buyer-addresses-empty">يتم التحميل...</div>
                ) : addresses.length === 0 ? (
                  <div className="buyer-addresses-empty">لا توجد عناوين مسجلة.</div>
                ) : (
                  addresses.map((addr) => (
                    <div key={addr._id || addr.id} className={`buyer-address-card ${addr.isDefault ? "is-default" : ""}`}>
                      <div className="buyer-address-title-row">
                        <h4 className="buyer-address-title">{addr.label}</h4>
                        {addr.isDefault && <span className="buyer-address-badge">افتراضي</span>}
                      </div>
                      <div className="buyer-address-text">{addr.city}، {addr.area}، {addr.district}</div>
                      <div className="buyer-address-text">الحي: {addr.street}</div>
                      {addr.details && <div className="buyer-address-details">{addr.details}</div>}
                      <div className="buyer-address-actions">
                        <button className="adm-btn mini outline" onClick={() => handleEditAddress(addr)}>
                          <Edit2 size={14} /> تعديل
                        </button>
                        <button className="adm-btn mini danger outline" onClick={() => handleDeleteAddress(addr._id || addr.id)}>
                          <Trash2 size={14} /> حذف
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="buyer-address-form">
                <h4 className="buyer-address-form-title">
                  {editingAddressId ? "تعديل العنوان" : "إضافة عنوان جديد"}
                </h4>
                <div className="buyer-address-form-grid">
                  <div className="adm-form-group">
                    <label className="adm-form-label">الاسم المختصر</label>
                    <div className="buyer-input-wrapper">
                      <Info size={18} className="buyer-field-icon" />
                      <input
                        type="text"
                        className="adm-form-input"
                        value={addressForm.label}
                        placeholder="المنزل، العمل..."
                        onChange={(e) => setAddressForm({ ...addressForm, label: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="adm-form-group">
                    <label className="adm-form-label">الدولة</label>
                    <input
                      type="text"
                      className="adm-form-input"
                      value={addressForm.city}
                      onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                    />
                  </div>

                  <div className="adm-form-group">
                    <label className="adm-form-label">المدينة</label>
                    <input
                      type="text"
                      className="adm-form-input"
                      value={addressForm.area}
                      onChange={(e) => setAddressForm({ ...addressForm, area: e.target.value })}
                    />
                  </div>

                  <div className="adm-form-group">
                    <label className="adm-form-label">المديرية</label>
                    <input
                      type="text"
                      className="adm-form-input"
                      value={addressForm.district}
                      onChange={(e) => setAddressForm({ ...addressForm, district: e.target.value })}
                    />
                  </div>

                  <div className="adm-form-group">
                    <label className="adm-form-label">الحي</label>
                    <input
                      type="text"
                      className="adm-form-input"
                      value={addressForm.street}
                      onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })}
                    />
                  </div>

                  <div className="adm-form-group">
                    <label className="adm-form-label">تفاصيل إضافية</label>
                    <input
                      type="text"
                      className="adm-form-input"
                      value={addressForm.details}
                      onChange={(e) => setAddressForm({ ...addressForm, details: e.target.value })}
                    />
                  </div>
                </div>

                <label className="buyer-checkbox mt-4">
                  <input
                    type="checkbox"
                    checked={addressForm.isDefault}
                    onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })}
                  />
                  تعيين كافتراضي
                </label>

                <div className="buyer-password-actions mt-4">
                  {editingAddressId && (
                    <button className="adm-btn outline" onClick={resetAddressForm}>
                      <X size={18} /> إلغاء التعديل
                    </button>
                  )}
                  <button className="adm-btn primary" onClick={handleSaveAddress} disabled={addressSaving}>
                    {addressSaving ? <RefreshCw size={18} className="animate-spin" /> : editingAddressId ? <Edit2 size={18} /> : <Plus size={18} />}
                    {addressSaving ? "جارٍ الحفظ..." : editingAddressId ? "تحديث العنوان" : "إضافة العنوان الجديد"}
                  </button>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
