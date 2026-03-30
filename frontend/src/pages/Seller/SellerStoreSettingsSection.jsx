// frontend/src/pages/Seller/SellerStoreSettingsSection.jsx
// قسم "إعدادات المتجر" في لوحة البائع - نسخة إنتاجية منفصلة
import "./SellerStoreSettingsSection.css";

import { Info, Store, Phone, MapPin, Globe, Layout } from "lucide-react";

/**
 * props:
 *  - storeSettings: { name, description, visibility, phone, address }
 *      address: { country, city, area, street, details } (or may arrive null)
 *  - onChange: (field: string, value: string) => void
 *  - onSubmit: (event: FormEvent) => void
 *  - isSaving: boolean
 */
import { useOutletContext } from "react-router-dom";

export default function SellerStoreSettingsSection() {
  const {
    storeSettings,
    handleStoreFieldChange: onChange,
    handleStoreSettingsSubmit: onSubmit,
    isSettingsSaving: isSaving,
  } = useOutletContext();
  const safeSettings = storeSettings || {
    name: "",
    description: "",
    visibility: "visible",
    phone: "",
    address: null,
  };

  // نطابق شكل التخزين الحالي، لكن نعرضه بمسميات واجهة التسجيل:
  // area   => المديرية
  // street => الحي
  // details=> بقية التفاصيل (الشارع/رقم المبنى/الطابق...)
  const safeAddress =
    safeSettings.address && typeof safeSettings.address === "object"
      ? safeSettings.address
      : { country: "", city: "", area: "", street: "", details: "" };

  const handleChange = (field) => (event) => {
    onChange && onChange(field, event.target.value);
  };

  return (
    <section className="seller-section">
      <div className="seller-layout-container">
        <div className="seller-hero-action">
          <div className="seller-hero-info">
            <h3>إعدادات المتجر</h3>
            <p>إدارة بيانات متجرك الأساسية، معلومات التواصل، والموقع الجغرافي.</p>
          </div>
        </div>

        <form className="seller-settings-panels" onSubmit={onSubmit}>
          <div className="seller-settings-grid">
            {/* Card 1: Store Identity */}
            <article className="seller-modern-card">
              <div className="seller-card-header">
                <div className="card-header-icon identity">
                  <Store size={20} />
                </div>
                <div>
                  <h3>هوية المتجر</h3>
                  <p>الاسم والوصف الذي يظهر للعملاء</p>
                </div>
              </div>

              <div className="seller-card-body">
                <div className="seller-modern-field">
                  <label>اسم المتجر</label>
                  <div className="field-input-wrap">
                    <input
                      type="text"
                      placeholder="الاسم الظاهر للمستخدمين"
                      value={safeSettings.name}
                      onChange={handleChange("name")}
                    />
                  </div>
                </div>

                <div className="seller-modern-field">
                  <label>وصف المتجر</label>
                  <div className="field-input-wrap">
                    <textarea
                      rows={4}
                      placeholder="اكتب وصفاً مختصراً عن نشاط المتجر..."
                      value={safeSettings.description}
                      onChange={handleChange("description")}
                    />
                  </div>
                </div>
              </div>
            </article>

            {/* Card 2: Contact & Visibility */}
            <article className="seller-modern-card">
              <div className="seller-card-header">
                <div className="card-header-icon contact">
                  <Phone size={20} />
                </div>
                <div>
                  <h3>التواصل والظهور</h3>
                  <p>إدارة أرقام الهاتف وحالة ظهور المتجر</p>
                </div>
              </div>

              <div className="seller-card-body">
                <div className="seller-modern-field">
                  <label>رقم الهاتف</label>
                  <div className="field-input-wrap">
                    <input
                      type="text"
                      placeholder="رقم هاتف المتجر"
                      value={safeSettings.phone || ""}
                      onChange={handleChange("phone")}
                    />
                  </div>
                </div>

                <div className="seller-modern-field">
                  <label>حالة الظهور</label>
                  <div className="seller-modern-select-wrap">
                    <select
                      value={safeSettings.visibility}
                      onChange={handleChange("visibility")}
                    >
                      <option value="visible">مرئي للجميع</option>
                      <option value="hidden">مخفي (للصيانة)</option>
                    </select>
                    <Layout className="filter-icon" size={16} />
                  </div>
                </div>
              </div>
            </article>

            {/* Card 3: Location Details */}
            <article className="seller-modern-card seller-card-full">
              <div className="seller-card-header">
                <div className="card-header-icon location">
                  <MapPin size={20} />
                </div>
                <div>
                  <h3>الموقع الجغرافي</h3>
                  <p>تفاصيل عنوان المتجر للشحن والاستلام</p>
                </div>
              </div>

              <div className="seller-card-body">
                <div className="seller-address-modern-grid">
                  <div className="seller-modern-field">
                    <label>الدولة</label>
                    <input
                      type="text"
                      placeholder="مثال: اليمن"
                      value={safeAddress.country || ""}
                      onChange={handleChange("address.country")}
                    />
                  </div>

                  <div className="seller-modern-field">
                    <label>المدينة</label>
                    <input
                      type="text"
                      placeholder="مثال: صنعاء"
                      value={safeAddress.city || ""}
                      onChange={handleChange("address.city")}
                    />
                  </div>

                  <div className="seller-modern-field">
                    <label>المديرية</label>
                    <input
                      type="text"
                      placeholder="مثال: السبعين"
                      value={safeAddress.area || ""}
                      onChange={handleChange("address.area")}
                    />
                  </div>

                  <div className="seller-modern-field">
                    <label>الحي</label>
                    <input
                      type="text"
                      placeholder="مثال: حي الوحدة"
                      value={safeAddress.street || ""}
                      onChange={handleChange("address.street")}
                    />
                  </div>

                  <div className="seller-modern-field field-full">
                    <label>بقية التفاصيل</label>
                    <input
                      type="text"
                      placeholder="الشارع، رقم المبنى، وأي تفاصيل إضافية..."
                      value={safeAddress.details || ""}
                      onChange={handleChange("address.details")}
                    />
                  </div>
                </div>
              </div>
            </article>
          </div>

          <div className="seller-settings-form-footer">
            <div className="seller-settings-info-box">
              <Info size={16} />
              <p>تستخدم هذه البيانات في كرت الشحن وعند تواصل العملاء معك.</p>
            </div>
            <button type="submit" className="seller-save-btn" disabled={isSaving}>
              {isSaving ? "جارٍ الحفظ..." : "حفظ التغييرات"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
