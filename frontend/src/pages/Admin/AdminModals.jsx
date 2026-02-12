// src/pages/Admin/AdminModals.jsx
import { X, UserPlus, Megaphone, Truck, Grid3X3, CreditCard, Bell } from "lucide-react";

export function AdminAddStaffModal({ open, onClose }) {
  if (!open) return null;

  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-header">
          <div className="admin-modal-title">إضافة مشرف جديد</div>
          <button
            type="button"
            className="admin-button admin-button-ghost"
            onClick={onClose}
            style={{ paddingInline: "0.45rem" }}
          >
            <X size={14} />
          </button>
        </div>
        <div className="admin-modal-body">
          <div className="admin-form-group">
            <span className="admin-form-label">الاسم الكامل للمشرف</span>
            <input className="admin-input" type="text" placeholder="اسم المشرف" />
          </div>
          <div className="admin-form-group">
            <span className="admin-form-label">البريد الإلكتروني (يدخله المدير)</span>
            <input className="admin-input" type="email" placeholder="example@domain.com" />
          </div>
          <div className="admin-form-group">
            <span className="admin-form-label">كلمة المرور (يحددها المدير)</span>
            <input className="admin-input" type="password" />
          </div>
          <div className="admin-form-group">
            <span className="admin-form-label">تأكيد كلمة المرور</span>
            <input className="admin-input" type="password" />
          </div>
          <div className="admin-form-group">
            <span className="admin-form-label">الصلاحيات المبدئية</span>
            <div className="admin-empty-list">
              <li>إدارة البائعين</li>
              <li>إدارة الطلبات</li>
              <li>الإدارة المالية</li>
              <li>التقارير والإحصاءات</li>
            </div>
          </div>
        </div>
        <div className="admin-modal-footer">
          <button type="button" className="admin-button">
            <UserPlus size={14} />
            <span>حفظ المشرف</span>
          </button>
          <button
            type="button"
            className="admin-button admin-button-ghost"
            onClick={onClose}
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminAddAdModal({ open, onClose }) {
  if (!open) return null;

  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-header">
          <div className="admin-modal-title">إضافة إعلان جديد</div>
          <button
            type="button"
            className="admin-button admin-button-ghost"
            onClick={onClose}
            style={{ paddingInline: "0.45rem" }}
          >
            <X size={14} />
          </button>
        </div>
        <div className="admin-modal-body">
          <div className="admin-form-group">
            <span className="admin-form-label">عنوان الإعلان</span>
            <input className="admin-input" type="text" placeholder="عنوان واضح وجذاب" />
          </div>
          <div className="admin-form-group">
            <span className="admin-form-label">صورة الإعلان</span>
            <input className="admin-input" type="file" accept="image/*" />
          </div>
          <div className="admin-form-group">
            <span className="admin-form-label">رابط عند الضغط على الإعلان</span>
            <input className="admin-input" type="url" placeholder="https://..." />
          </div>
          <div className="admin-form-row">
            <div className="admin-form-group" style={{ flex: 1 }}>
              <span className="admin-form-label">تاريخ البداية</span>
              <input className="admin-input" type="date" />
            </div>
            <div className="admin-form-group" style={{ flex: 1 }}>
              <span className="admin-form-label">تاريخ النهاية</span>
              <input className="admin-input" type="date" />
            </div>
          </div>
          <div className="admin-form-group">
            <span className="admin-form-label">مكان عرض الإعلان</span>
            <select className="admin-input">
              <option value="">اختر مكان العرض</option>
              <option value="home">الصفحة الرئيسية</option>
              <option value="category">صفحات الأقسام</option>
              <option value="product">صفحات المنتجات</option>
            </select>
          </div>
          <div className="admin-form-group">
            <span className="admin-form-label">الفئة المستهدفة</span>
            <select className="admin-input">
              <option value="all">الكل</option>
              <option value="buyers">المشترون</option>
              <option value="sellers">البائعون</option>
              <option value="shipping">شركات الشحن</option>
            </select>
          </div>
        </div>
        <div className="admin-modal-footer">
          <button type="button" className="admin-button">
            <Megaphone size={14} />
            <span>حفظ الإعلان</span>
          </button>
          <button
            type="button"
            className="admin-button admin-button-ghost"
            onClick={onClose}
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminAddShippingCompanyModal({ open, onClose }) {
  if (!open) return null;

  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-header">
          <div className="admin-modal-title">إضافة شركة شحن جديدة</div>
          <button
            type="button"
            className="admin-button admin-button-ghost"
            onClick={onClose}
            style={{ paddingInline: "0.45rem" }}
          >
            <X size={14} />
          </button>
        </div>
        <div className="admin-modal-body">
          <div className="admin-form-group">
            <span className="admin-form-label">اسم الشركة</span>
            <input className="admin-input" type="text" placeholder="اسم شركة الشحن" />
          </div>
          <div className="admin-form-row">
            <div className="admin-form-group" style={{ flex: 1 }}>
              <span className="admin-form-label">البريد الإلكتروني الرسمي</span>
              <input className="admin-input" type="email" />
            </div>
            <div className="admin-form-group" style={{ flex: 1 }}>
              <span className="admin-form-label">رقم الهاتف</span>
              <input className="admin-input" type="tel" />
            </div>
          </div>
          <div className="admin-form-group">
            <span className="admin-form-label">عنوان المقر</span>
            <input className="admin-input" type="text" placeholder="الدولة - المدينة - العنوان" />
          </div>
          <div className="admin-form-group">
            <span className="admin-form-label">المناطق المغطاة</span>
            <textarea
              className="admin-input admin-textarea"
              placeholder="مثال: صنعاء، تعز، عدن ..."
            />
          </div>
          <div className="admin-form-group">
            <span className="admin-form-label">سياسة الشحن المختصرة</span>
            <textarea
              className="admin-input admin-textarea"
              placeholder="ملخص بسيط عن سياسة الشحن، المدد، شروط التسليم ..."
            />
          </div>
        </div>
        <div className="admin-modal-footer">
          <button type="button" className="admin-button">
            <Truck size={14} />
            <span>حفظ شركة الشحن</span>
          </button>
          <button
            type="button"
            className="admin-button admin-button-ghost"
            onClick={onClose}
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminAddCategoryModal({ open, onClose }) {
  if (!open) return null;

  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-header">
          <div className="admin-modal-title">إضافة قسم جديد</div>
          <button
            type="button"
            className="admin-button admin-button-ghost"
            onClick={onClose}
            style={{ paddingInline: "0.45rem" }}
          >
            <X size={14} />
          </button>
        </div>
        <div className="admin-modal-body">
          <div className="admin-form-group">
            <span className="admin-form-label">اسم القسم</span>
            <input className="admin-input" type="text" placeholder="مثال: إلكترونيات" />
          </div>
          <div className="admin-form-group">
            <span className="admin-form-label">صورة القسم</span>
            <input className="admin-input" type="file" accept="image/*" />
          </div>
          <div className="admin-form-group">
            <span className="admin-form-label">القسم الأب (اختياري)</span>
            <select className="admin-input">
              <option value="">بدون (قسم رئيسي)</option>
            </select>
          </div>
          <div className="admin-form-group">
            <span className="admin-form-label">وصف مختصر (اختياري)</span>
            <textarea
              className="admin-input admin-textarea"
              placeholder="وصف بسيط يساعد على فهم محتوى القسم"
            />
          </div>
          <div className="admin-form-group">
            <label style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.78rem" }}>
              <input type="checkbox" defaultChecked />
              <span>إظهار القسم في واجهة المتجر</span>
            </label>
          </div>
        </div>
        <div className="admin-modal-footer">
          <button type="button" className="admin-button">
            <Grid3X3 size={14} />
            <span>حفظ القسم</span>
          </button>
          <button
            type="button"
            className="admin-button admin-button-ghost"
            onClick={onClose}
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminPayoutModal({ open, onClose }) {
  if (!open) return null;

  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-header">
          <div className="admin-modal-title">تحويل أرباح لبائع</div>
          <button
            type="button"
            className="admin-button admin-button-ghost"
            onClick={onClose}
            style={{ paddingInline: "0.45rem" }}
          >
            <X size={14} />
          </button>
        </div>
        <div className="admin-modal-body">
          <div className="admin-form-group">
            <span className="admin-form-label">اختيار البائع</span>
            <select className="admin-input">
              <option value="">اختر البائع المستفيد</option>
            </select>
          </div>
          <div className="admin-form-group">
            <span className="admin-form-label">الرصيد المتوفر (للعرض فقط)</span>
            <input
              className="admin-input"
              type="text"
              value="سيتم جلب الرصيد من الخادم"
              disabled
            />
          </div>
          <div className="admin-form-row">
            <div className="admin-form-group" style={{ flex: 1 }}>
              <span className="admin-form-label">مبلغ التحويل</span>
              <input className="admin-input" type="number" min="0" />
            </div>
            <div className="admin-form-group" style={{ flex: 1 }}>
              <span className="admin-form-label">طريقة التحويل</span>
              <select className="admin-input">
                <option value="">اختر الطريقة</option>
                <option value="bank">حوالة بنكية</option>
                <option value="wallet">محفظة إلكترونية</option>
                <option value="cash">نقداً</option>
              </select>
            </div>
          </div>
          <div className="admin-form-group">
            <span className="admin-form-label">ملاحظات (اختياري)</span>
            <textarea
              className="admin-input admin-textarea"
              placeholder="أي تفاصيل إضافية حول عملية التحويل"
            />
          </div>
        </div>
        <div className="admin-modal-footer">
          <button type="button" className="admin-button">
            <CreditCard size={14} />
            <span>تأكيد التحويل</span>
          </button>
          <button
            type="button"
            className="admin-button admin-button-ghost"
            onClick={onClose}
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminSendNotificationModal({ open, onClose }) {
  if (!open) return null;

  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-header">
          <div className="admin-modal-title">إرسال تنبيه جديد</div>
          <button
            type="button"
            className="admin-button admin-button-ghost"
            onClick={onClose}
            style={{ paddingInline: "0.45rem" }}
          >
            <X size={14} />
          </button>
        </div>
        <div className="admin-modal-body">
          <div className="admin-form-group">
            <span className="admin-form-label">عنوان التنبيه</span>
            <input className="admin-input" type="text" placeholder="عنوان مختصر وواضح" />
          </div>
          <div className="admin-form-group">
            <span className="admin-form-label">الفئة المستهدفة</span>
            <select className="admin-input">
              <option value="all">الكل</option>
              <option value="buyers">المشترون</option>
              <option value="sellers">البائعون</option>
              <option value="shipping">شركات الشحن</option>
              <option value="admins">المشرفون</option>
            </select>
          </div>
          <div className="admin-form-group">
            <span className="admin-form-label">نص التنبيه</span>
            <textarea
              className="admin-input admin-textarea"
              placeholder="محتوى التنبيه المراد إرساله"
            />
          </div>
          <div className="admin-form-row">
            <div className="admin-form-group" style={{ flex: 1 }}>
              <span className="admin-form-label">وقت الإرسال</span>
              <select className="admin-input">
                <option value="now">الآن</option>
                <option value="schedule">مجدول</option>
              </select>
            </div>
            <div className="admin-form-group" style={{ flex: 1 }}>
              <span className="admin-form-label">تاريخ/وقت الجدولة (عند الحاجة)</span>
              <input className="admin-input" type="datetime-local" />
            </div>
          </div>
        </div>
        <div className="admin-modal-footer">
          <button type="button" className="admin-button">
            <Bell size={14} />
            <span>إرسال التنبيه</span>
          </button>
          <button
            type="button"
            className="admin-button admin-button-ghost"
            onClick={onClose}
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}
