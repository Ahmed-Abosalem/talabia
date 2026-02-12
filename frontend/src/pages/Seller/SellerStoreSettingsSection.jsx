// frontend/src/pages/Seller/SellerStoreSettingsSection.jsx
// قسم "إعدادات المتجر" في لوحة البائع - نسخة إنتاجية منفصلة
import "./SellerStoreSettingsSection.css";

import { Info } from "lucide-react";

/**
 * props:
 *  - storeSettings: { name, description, visibility, phone, address }
 *      address: { country, city, area, street, details } (or may arrive null)
 *  - onChange: (field: string, value: string) => void
 *  - onSubmit: (event: FormEvent) => void
 *  - isSaving: boolean
 */
export default function SellerStoreSettingsSection({
  storeSettings,
  onChange,
  onSubmit,
  isSaving,
}) {
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
      <div className="seller-section-header seller-section-header--center">
        <div>
          <h2>إعدادات المتجر</h2>
          <p>إعدادات عامة لواجهة متجرك في منصة طلبية.</p>
        </div>
      </div>

      <form className="seller-settings-grid" onSubmit={onSubmit}>
        {/* بطاقة بيانات المتجر الأساسية */}
        <article className="seller-card">
          <div className="seller-card-header">
            <h3>بيانات المتجر الأساسية</h3>
          </div>

          <div className="seller-card-body">
            <div className="seller-field">
              <label>اسم المتجر</label>
              <input
                type="text"
                placeholder="الاسم الظاهر للمستخدمين في واجهة المتجر"
                value={safeSettings.name}
                onChange={handleChange("name")}
              />
            </div>

            <div className="seller-field">
              <label>وصف المتجر</label>
              <textarea
                rows={3}
                placeholder="اكتب وصفاً مختصراً عن نشاط المتجر، نوع المنتجات، الجمهور المستهدف..."
                value={safeSettings.description}
                onChange={handleChange("description")}
              />
            </div>

            {/* رقم الهاتف */}
            <div className="seller-field">
              <label>رقم الهاتف</label>
              <input
                type="text"
                placeholder="رقم هاتف المتجر"
                value={safeSettings.phone || ""}
                onChange={handleChange("phone")}
              />
            </div>

            {/* عنوان المتجر — مطابق لواجهة التسجيل */}
            <div className="seller-field">
              <label>عنوان المتجر</label>

              <div className="seller-address-grid">
                <div className="seller-field seller-field--compact">
                  <label>الدولة</label>
                  <input
                    type="text"
                    placeholder="مثال: تركيا"
                    value={safeAddress.country || ""}
                    onChange={handleChange("address.country")}
                  />
                </div>

                <div className="seller-field seller-field--compact">
                  <label>المدينة</label>
                  <input
                    type="text"
                    placeholder="مثال: إسطنبول"
                    value={safeAddress.city || ""}
                    onChange={handleChange("address.city")}
                  />
                </div>

                <div className="seller-field seller-field--compact">
                  <label>المديرية</label>
                  <input
                    type="text"
                    placeholder="مثال: الفاتح"
                    value={safeAddress.area || ""}
                    onChange={handleChange("address.area")}
                  />
                </div>

                <div className="seller-field seller-field--compact">
                  <label>الحي</label>
                  <input
                    type="text"
                    placeholder="مثال: حي كذا"
                    value={safeAddress.street || ""}
                    onChange={handleChange("address.street")}
                  />
                </div>

                <div className="seller-field seller-field--full">
                  <label>بقية التفاصيل</label>
                  <input
                    type="text"
                    placeholder="الشارع، رقم المبنى، الطابق، وأي تفاصيل إضافية تسهّل الوصول للمتجر"
                    value={safeAddress.details || ""}
                    onChange={handleChange("address.details")}
                  />
                </div>
              </div>
            </div>
          </div>
        </article>

        {/* بطاقة إعدادات الظهور والتنبيهات */}
        <article className="seller-card">
          <div className="seller-card-header">
            <h3>إعدادات الظهور</h3>
          </div>
          <div className="seller-card-body">
            <div className="seller-field">
              <label>حالة ظهور المتجر</label>
              <select
                value={safeSettings.visibility}
                onChange={handleChange("visibility")}
              >
                <option value="visible">ظاهر للجميع</option>
                <option value="hidden">مخفي مؤقتًا</option>
              </select>
            </div>

            <div className="seller-field">
              <label>التنبيهات</label>
              <ul className="seller-hint-list">
                <li>إشعار عند وجود طلب جديد.</li>
                <li>إشعار عند إلغاء طلب أو اكتماله.</li>
                <li>إشعار من إدارة المنصة حول سياسات جديدة.</li>
              </ul>
            </div>
          </div>
        </article>

        {/* بطاقة معلومات توضيحية */}
        <article className="seller-card seller-card-info">
          <div className="seller-card-header">
            <h3>ملاحظة</h3>
          </div>
          <div className="seller-card-body seller-info-row">
            <Info size={16} />
            <p>
              هذه البيانات تستخدم في كرت الشحن وفي التواصل، لذلك يُفضّل تحديثها
              عند تغيير رقم الهاتف أو انتقال المتجر لموقع جديد.
            </p>
          </div>
        </article>

        <div className="seller-settings-footer">
          <button
            type="submit"
            className="seller-btn-primary"
            disabled={isSaving}
          >
            {isSaving ? "جاري الحفظ..." : "حفظ إعدادات المتجر"}
          </button>
        </div>
      </form>
    </section>
  );
}
