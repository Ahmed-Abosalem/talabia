import "./BuyerProfileSection.css";
import { useEffect, useState } from "react";
import { User, MapPin, Lock } from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { useApp } from "../../context/AppContext";
import * as userService from "../../services/userService";

export default function BuyerProfileSection() {
  const { user } = useAuth();
  const { showToast } = useApp();

  // =========================
  // 1) حالة الملف الشخصي
  // =========================
  const [profileForm, setProfileForm] = useState({
    fullName: user?.fullName || user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    city: user?.city || "",
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
      city: user.city || prev.city || "",
    }));
  };

  const loadProfileAndPrefs = async () => {
    try {
      // تحميل بيانات الملف الشخصي من الـ API إن وُجدت
      if (userService.getProfile) {
        const profile = await userService.getProfile();
        if (profile) {
          setProfileForm((prev) => ({
            ...prev,
            fullName:
              profile.fullName || profile.name || prev.fullName || "",
            email: profile.email || prev.email || "",
            phone: profile.phone || profile.mobile || prev.phone || "",
            city: profile.city || prev.city || "",
          }));
        }
      } else {
        hydrateProfileFromAuth();
      }

      // تحميل تفضيلات الإشعارات إن وُجدت (منطق محفوظ لو أحببت استعماله لاحقًا)
      if (userService.updateNotificationPreferences) {
        // يمكن ربطه لاحقًا بواجهة جديدة إن لزم الأمر
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error loading buyer profile:", error);
      showToast(
        "تعذّر تحميل بيانات ملفك الشخصي حاليًا، حاول مرة أخرى.",
        "error"
      );
      hydrateProfileFromAuth();
    }
  };

  const validateProfile = () => {
    const errors = {};
    if (!profileForm.fullName.trim()) {
      errors.fullName = "الاسم الكامل مطلوب";
    }
    if (!profileForm.email.trim()) {
      errors.email = "البريد الإلكتروني مطلوب";
    } else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(profileForm.email)) {
      errors.email = "صيغة البريد الإلكتروني غير صحيحة";
    }
    if (!profileForm.phone.trim()) {
      errors.phone = "رقم الجوال مطلوب";
    }

    setProfileErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveProfile = async () => {
    if (!validateProfile()) return;

    try {
      setProfileSaving(true);
      if (userService.updateProfile) {
        await userService.updateProfile({
          fullName: profileForm.fullName,
          email: profileForm.email,
          phone: profileForm.phone,
          city: profileForm.city,
        });
      }
      showToast("تم تحديث بيانات ملفك الشخصي بنجاح.", "success");
    } catch (error) {
      // eslint-disable-next-line no-console
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
    city: "", // الدولة
    area: "", // المدينة
    street: "", // الحي
    details: "", // الشارع / تفاصيل إضافية
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
      // eslint-disable-next-line no-console
      console.error("Error loading buyer addresses:", error);
      showToast("تعذّر تحميل عناوين الشحن حاليًا.", "error");
    } finally {
      setAddressesLoading(false);
    }
  };

  const validateAddress = () => {
    const errors = {};

    if (!addressForm.label.trim()) {
      errors.label = "أدخل اسمًا مختصرًا لهذا العنوان (مثال: المنزل، العمل)";
    }
    if (!addressForm.city.trim()) {
      errors.city = "أدخل الدولة";
    }
    if (!addressForm.area.trim()) {
      errors.area = "أدخل المدينة";
    }
    if (!addressForm.street.trim()) {
      errors.street = "أدخل الحي";
    }
    // تفاصيل إضافية اختيارية لكن سنعتبرها الآن إلزامية بحسب النص
    if (!addressForm.details.trim()) {
      errors.details = "أدخل الشارع / تفاصيل إضافية";
    }

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
      street: "",
      details: "",
      isDefault: false,
    });
  };

  const handleSaveAddress = async () => {
    if (!validateAddress()) return;

    try {
      setAddressSaving(true);

      const payload = {
        label: addressForm.label,
        city: addressForm.city, // الدولة
        area: addressForm.area, // المدينة
        street: addressForm.street, // الحي
        details: addressForm.details, // الشارع / تفاصيل إضافية
        isDefault: !!addressForm.isDefault,
      };

      if (editingAddressId && userService.updateAddress) {
        await userService.updateAddress(editingAddressId, payload);
      } else if (userService.createAddress) {
        await userService.createAddress(payload);
      }

      await loadAddresses();
      resetAddressForm();
      showToast("تم حفظ العنوان بنجاح.", "success");
    } catch (error) {
      // eslint-disable-next-line no-console
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
      street: address.street || "",
      details: address.details || "",
      isDefault: !!address.isDefault,
    });
    setAddressErrors({});
  };

  const handleDeleteAddress = async (addressId) => {
    if (!addressId || !userService.deleteAddress) return;
    if (!window.confirm("هل أنت متأكد من حذف هذا العنوان؟")) return;

    try {
      setAddressesLoading(true);
      await userService.deleteAddress(addressId);
      setAddresses((prev) =>
        prev.filter((a) => (a._id || a.id) !== addressId)
      );
      showToast("تم حذف العنوان.", "success");
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error deleting buyer address:", error);
      showToast("تعذّر حذف العنوان حاليًا، حاول مجددًا.", "error");
    } finally {
      setAddressesLoading(false);
    }
  };

  // =========================
  // 3) تفضيلات الإشعارات (منطق محفوظ إن احتجناه لاحقًا)
  // =========================
  const [notifyPrefs, setNotifyPrefs] = useState({
    email: true,
    sms: false,
    push: true,
  });
  const [notifySaving, setNotifySaving] = useState(false);

  const handleToggleNotifyPref = async (key) => {
    const next = { ...notifyPrefs, [key]: !notifyPrefs[key] };
    setNotifyPrefs(next);

    if (!userService.updateNotificationPreferences) return;

    try {
      setNotifySaving(true);
      await userService.updateNotificationPreferences(next);
      showToast("تم تحديث تفضيلات الإشعارات.", "success");
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error updating notify prefs:", error);
      showToast("تعذّر تحديث تفضيلات الإشعارات.", "error");
    } finally {
      setNotifySaving(false);
    }
  };

  // =========================
  // 4) تغيير كلمة المرور
  // =========================
  const [showPasswordCard, setShowPasswordCard] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordSaving, setPasswordSaving] = useState(false);

  const validatePassword = () => {
    const errors = {};

    if (!passwordForm.currentPassword) {
      errors.currentPassword = "أدخل كلمة المرور الحالية";
    }

    if (!passwordForm.newPassword) {
      errors.newPassword = "أدخل كلمة المرور الجديدة";
    } else {
      if (passwordForm.newPassword.length < 8) {
        errors.newPassword =
          "كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل";
      }
      if (passwordForm.newPassword === passwordForm.currentPassword) {
        errors.newPassword = "كلمة المرور الجديدة يجب أن تختلف عن الحالية";
      }
    }

    if (!passwordForm.confirmPassword) {
      errors.confirmPassword = "أعد إدخال كلمة المرور الجديدة";
    } else if (passwordForm.confirmPassword !== passwordForm.newPassword) {
      errors.confirmPassword = "كلمتا المرور غير متطابقتين";
    }

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSavePassword = async () => {
    if (!validatePassword()) return;
    if (!userService.changePassword) return;

    try {
      setPasswordSaving(true);
      await userService.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setPasswordErrors({});
      setShowPasswordCard(false);
      showToast("تم تحديث كلمة المرور بنجاح.", "success");
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error changing buyer password:", error);
      showToast(
        "تعذّر تحديث كلمة المرور، تأكد من صحة البيانات وحاول مجددًا.",
        "error"
      );
    } finally {
      setPasswordSaving(false);
    }
  };

  // =========================
  // 5) التحميل الأولي
  // =========================
  useEffect(() => {
    loadProfileAndPrefs();
    loadAddresses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // =========================
  // 6) الواجهة
  // =========================
  return (
    <section className="buyer-profile-section">
      <div className="buyer-section-header">
        <h2 className="buyer-section-title">الملف الشخصي</h2>
        <p className="buyer-section-subtitle">
          حدّث بياناتك الأساسية، عناوين الشحن، وأمان الحساب وكلمة المرور.
        </p>
      </div>

      <div className="buyer-profile-grid">
        {/* بطاقة البيانات الأساسية + أمان الحساب */}
        <article className="buyer-profile-card">
          <div className="buyer-profile-card-header">
            <User className="buyer-profile-card-icon" />
            <div>
              <h3 className="buyer-profile-card-title">البيانات الأساسية</h3>
              <p className="buyer-profile-card-subtitle">
                عدّل اسمك، رقم الجوال، بريدك الإلكتروني، وأدِر أمان حسابك.
              </p>
            </div>
          </div>

          <div className="buyer-profile-card-body">
            {/* الحقول الأساسية */}
            <div className="buyer-form-group">
              <label className="buyer-form-label">الاسم الكامل</label>
              <input
                type="text"
                className={`buyer-form-input ${
                  profileErrors.fullName ? "has-error" : ""
                }`}
                value={profileForm.fullName}
                onChange={(e) =>
                  setProfileForm((prev) => ({
                    ...prev,
                    fullName: e.target.value,
                  }))
                }
              />
              {profileErrors.fullName && (
                <div className="buyer-form-error">
                  {profileErrors.fullName}
                </div>
              )}
            </div>

            <div className="buyer-form-group">
              <label className="buyer-form-label">رقم الجوال</label>
              <input
                type="tel"
                className={`buyer-form-input ${
                  profileErrors.phone ? "has-error" : ""
                }`}
                value={profileForm.phone}
                onChange={(e) =>
                  setProfileForm((prev) => ({
                    ...prev,
                    phone: e.target.value,
                  }))
                }
              />
              {profileErrors.phone && (
                <div className="buyer-form-error">
                  {profileErrors.phone}
                </div>
              )}
            </div>

            <div className="buyer-form-group">
              <label className="buyer-form-label">البريد الإلكتروني</label>
              <input
                type="email"
                className={`buyer-form-input ${
                  profileErrors.email ? "has-error" : ""
                }`}
                value={profileForm.email}
                onChange={(e) =>
                  setProfileForm((prev) => ({
                    ...prev,
                    email: e.target.value,
                  }))
                }
              />
              {profileErrors.email && (
                <div className="buyer-form-error">
                  {profileErrors.email}
                </div>
              )}
            </div>

            {/* أمان الحساب وكلمة المرور داخل نفس الكرت */}
            <div className="buyer-profile-card-divider" />

            <div className="buyer-profile-security">
              <div className="buyer-profile-security-header">
                <Lock className="buyer-profile-card-icon" />
                <div>
                  <h4 className="buyer-profile-card-title">
                    أمان الحساب وكلمة المرور
                  </h4>
                  <p className="buyer-profile-card-subtitle">
                    غيّر كلمة المرور واحرص على إبقاء حسابك آمنًا.
                  </p>
                </div>
              </div>

              {!showPasswordCard && (
                <button
                  type="button"
                  className="buyer-secondary-btn"
                  onClick={() => setShowPasswordCard(true)}
                >
                  تغيير كلمة المرور
                </button>
              )}

              {showPasswordCard && (
                <div className="buyer-password-form">
                  <div className="buyer-form-group">
                    <label className="buyer-form-label">
                      كلمة المرور الحالية
                    </label>
                    <input
                      type="password"
                      className={`buyer-form-input ${
                        passwordErrors.currentPassword ? "has-error" : ""
                      }`}
                      value={passwordForm.currentPassword}
                      onChange={(e) =>
                        setPasswordForm((prev) => ({
                          ...prev,
                          currentPassword: e.target.value,
                        }))
                      }
                    />
                    {passwordErrors.currentPassword && (
                      <div className="buyer-form-error">
                        {passwordErrors.currentPassword}
                      </div>
                    )}
                  </div>

                  <div className="buyer-form-group">
                    <label className="buyer-form-label">
                      كلمة المرور الجديدة
                    </label>
                    <input
                      type="password"
                      className={`buyer-form-input ${
                        passwordErrors.newPassword ? "has-error" : ""
                      }`}
                      value={passwordForm.newPassword}
                      onChange={(e) =>
                        setPasswordForm((prev) => ({
                          ...prev,
                          newPassword: e.target.value,
                        }))
                      }
                    />
                    {passwordErrors.newPassword && (
                      <div className="buyer-form-error">
                        {passwordErrors.newPassword}
                      </div>
                    )}
                  </div>

                  <div className="buyer-form-group">
                    <label className="buyer-form-label">
                      تأكيد كلمة المرور الجديدة
                    </label>
                    <input
                      type="password"
                      className={`buyer-form-input ${
                        passwordErrors.confirmPassword ? "has-error" : ""
                      }`}
                      value={passwordForm.confirmPassword}
                      onChange={(e) =>
                        setPasswordForm((prev) => ({
                          ...prev,
                          confirmPassword: e.target.value,
                        }))
                      }
                    />
                    {passwordErrors.confirmPassword && (
                      <div className="buyer-form-error">
                        {passwordErrors.confirmPassword}
                      </div>
                    )}
                  </div>

                  <div className="buyer-password-actions">
                    <button
                      type="button"
                      className="buyer-secondary-btn"
                      onClick={() => {
                        setShowPasswordCard(false);
                        setPasswordForm({
                          currentPassword: "",
                          newPassword: "",
                          confirmPassword: "",
                        });
                        setPasswordErrors({});
                      }}
                      disabled={passwordSaving}
                    >
                      إلغاء
                    </button>
                    <button
                      type="button"
                      className="buyer-primary-btn"
                      onClick={handleSavePassword}
                      disabled={passwordSaving}
                    >
                      {passwordSaving
                        ? "جارٍ التحديث..."
                        : "تحديث كلمة المرور"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="buyer-profile-card-footer">
            <button
              type="button"
              className="buyer-primary-btn"
              disabled={profileSaving}
              onClick={handleSaveProfile}
            >
              {profileSaving ? "جارٍ الحفظ..." : "حفظ البيانات"}
            </button>
          </div>
        </article>

        {/* بطاقة عناوين الشحن */}
        <article className="buyer-profile-card">
          <div className="buyer-profile-card-header">
            <MapPin className="buyer-profile-card-icon" />
            <div>
              <h3 className="buyer-profile-card-title">عناوين الشحن</h3>
              <p className="buyer-profile-card-subtitle">
                إدارة عناوين الشحن، وتعيين العنوان الافتراضي المستخدم في
                الدفع.
              </p>
            </div>
          </div>

          <div className="buyer-profile-card-body">
            <div className="buyer-addresses-list">
              {addressesLoading && (
                <div className="buyer-addresses-empty">
                  يتم تحميل عناوينك...
                </div>
              )}

              {!addressesLoading && addresses.length === 0 && (
                <div className="buyer-addresses-empty">
                  لا توجد عناوين مسجّلة حاليًا. يمكنك إضافة عنوان جديد أدناه.
                </div>
              )}

              {!addressesLoading &&
                addresses.map((addr) => (
                  <div
                    key={addr._id || addr.id}
                    className={`buyer-address-card ${
                      addr.isDefault ? "is-default" : ""
                    }`}
                  >
                    <div className="buyer-address-main">
                      <div className="buyer-address-title-row">
                        <h4 className="buyer-address-title">
                          {addr.label || "عنوان الشحن"}
                        </h4>
                        {addr.isDefault && (
                          <span className="buyer-address-badge">
                            العنوان الافتراضي
                          </span>
                        )}
                      </div>

                      <div className="buyer-address-text">
                        الدولة: {addr.city || "غير محددة"}
                      </div>
                      <div className="buyer-address-text">
                        المدينة: {addr.area || "غير محددة"}
                      </div>
                      {addr.street && (
                        <div className="buyer-address-text">
                          الحي: {addr.street}
                        </div>
                      )}
                      {addr.details && (
                        <div className="buyer-address-details">
                          الشارع / تفاصيل إضافية: {addr.details}
                        </div>
                      )}
                    </div>

                    <div className="buyer-address-actions">
                      <button
                        type="button"
                        className="buyer-text-btn"
                        onClick={() => handleEditAddress(addr)}
                      >
                        تعديل
                      </button>
                      <button
                        type="button"
                        className="buyer-text-btn buyer-danger-text"
                        onClick={() =>
                          handleDeleteAddress(addr._id || addr.id)
                        }
                      >
                        حذف
                      </button>
                    </div>
                  </div>
                ))}
            </div>

            <div className="buyer-address-form">
              <h4 className="buyer-address-form-title">
                {editingAddressId ? "تعديل العنوان" : "إضافة عنوان جديد"}
              </h4>

              <div className="buyer-address-form-grid">
                <div className="buyer-form-group">
                  <label className="buyer-form-label">
                    اسم العنوان (وصف مختصر)
                  </label>
                  <input
                    type="text"
                    className={`buyer-form-input ${
                      addressErrors.label ? "has-error" : ""
                    }`}
                    value={addressForm.label}
                    onChange={(e) =>
                      setAddressForm((prev) => ({
                        ...prev,
                        label: e.target.value,
                      }))
                    }
                  />
                  {addressErrors.label && (
                    <div className="buyer-form-error">
                      {addressErrors.label}
                    </div>
                  )}
                </div>

                <div className="buyer-form-group">
                  <label className="buyer-form-label">الدولة</label>
                  <input
                    type="text"
                    className={`buyer-form-input ${
                      addressErrors.city ? "has-error" : ""
                    }`}
                    value={addressForm.city}
                    onChange={(e) =>
                      setAddressForm((prev) => ({
                        ...prev,
                        city: e.target.value,
                      }))
                    }
                  />
                  {addressErrors.city && (
                    <div className="buyer-form-error">
                      {addressErrors.city}
                    </div>
                  )}
                </div>

                <div className="buyer-form-group">
                  <label className="buyer-form-label">المدينة</label>
                  <input
                    type="text"
                    className={`buyer-form-input ${
                      addressErrors.area ? "has-error" : ""
                    }`}
                    value={addressForm.area}
                    onChange={(e) =>
                      setAddressForm((prev) => ({
                        ...prev,
                        area: e.target.value,
                      }))
                    }
                  />
                  {addressErrors.area && (
                    <div className="buyer-form-error">
                      {addressErrors.area}
                    </div>
                  )}
                </div>
              </div>

              <div className="buyer-form-group">
                <label className="buyer-form-label">الحي</label>
                <input
                  type="text"
                  className={`buyer-form-input ${
                    addressErrors.street ? "has-error" : ""
                  }`}
                  value={addressForm.street}
                  onChange={(e) =>
                    setAddressForm((prev) => ({
                      ...prev,
                      street: e.target.value,
                    }))
                  }
                />
                {addressErrors.street && (
                  <div className="buyer-form-error">
                    {addressErrors.street}
                  </div>
                )}
              </div>

              <div className="buyer-form-group">
                <label className="buyer-form-label">
                  الشارع / تفاصيل إضافية (إلزامي)
                </label>
                <textarea
                  className={`buyer-form-textarea ${
                    addressErrors.details ? "has-error" : ""
                  }`}
                  rows={3}
                  value={addressForm.details}
                  onChange={(e) =>
                    setAddressForm((prev) => ({
                      ...prev,
                      details: e.target.value,
                    }))
                  }
                />
                {addressErrors.details && (
                  <div className="buyer-form-error">
                    {addressErrors.details}
                  </div>
                )}
              </div>

              <div className="buyer-checkbox">
                <input
                  type="checkbox"
                  checked={addressForm.isDefault}
                  onChange={(e) =>
                    setAddressForm((prev) => ({
                      ...prev,
                      isDefault: e.target.checked,
                    }))
                  }
                />
                <span>تعيين كعنوان شحن افتراضي</span>
              </div>

              <div className="buyer-address-form-actions">
                {editingAddressId && (
                  <button
                    type="button"
                    className="buyer-secondary-btn"
                    disabled={addressSaving}
                    onClick={resetAddressForm}
                  >
                    إلغاء
                  </button>
                )}
                <button
                  type="button"
                  className="buyer-primary-btn"
                  disabled={addressSaving}
                  onClick={handleSaveAddress}
                >
                  {addressSaving ? "جارٍ الحفظ..." : "حفظ العنوان"}
                </button>
              </div>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
