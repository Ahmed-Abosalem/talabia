// frontend/src/pages/Admin/sections/AdminCategoriesSection.jsx
// واجهة إدارة الأقسام في لوحة تحكم طلبية (Talabia)
// - إضافة / تعديل / حذف قسم
// - رفع صورة مع معاينة تفاعلية داخل إطار مربع مع شبكة (3×3)
// - ترتيب الأقسام مع دعم السحب والإفلات (Drag & Drop)
// - عرض عدد المنتجات داخل كل قسم
// - تفعيل / تعطيل القسم (إخفاؤه من الواجهة العامة)

import { useEffect, useState } from "react";
import {
  Plus,
  Trash2,
  Edit3,
  X,
  Image as ImageIcon,
  GripVertical,
  ToggleLeft,
  ToggleRight,
  Search,
} from "lucide-react";
import {
  getAdminCategories,
  createAdminCategory,
  updateAdminCategory,
  deleteAdminCategory,
} from "@/services/adminService";

// عنوان ثابت لعرض الصور القادمة من الباك إند
// يمكنك تعديله لاحقاً ليعتمد على env لو أحببت
const API_BASE_URL = "";

function resolveCategoryImage(image) {
  if (!image) return "";
  if (image.startsWith("http")) return image;
  return `${API_BASE_URL}${image}`;
}

const emptyForm = {
  id: null,
  name: "",
  sortOrder: "",
  imageFile: null,
  rawImageUrl: "", // الصورة الأصلية من الجهاز
  previewUrl: "", // لمعاينة داخل إطار القص
  cropZoom: 1,
  cropOffsetX: 0,
  cropOffsetY: 0,
  // نسبة عمولة المنصة كـ "نسبة مئوية" في الواجهة (مثال: 10 تعني 10٪)
  commissionRate: "",
};

export default function AdminCategoriesSection() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [orderSaving, setOrderSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [isEditing, setIsEditing] = useState(false);

  const [draggingId, setDraggingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  // ─────────────────────────────
  // تحميل الأقسام من الباك إند
  // ─────────────────────────────
  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    try {
      setLoading(true);
      setErrorMessage("");
      const data = await getAdminCategories(); // { categories: [...] }

      const list = (data.categories || []).map((cat) => ({
        ...cat,
        sortOrder:
          typeof cat.sortOrder === "number" && !Number.isNaN(cat.sortOrder)
            ? cat.sortOrder
            : 0,
      }));

      list.sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) {
          return a.sortOrder - b.sortOrder;
        }
        return (a.name || "").localeCompare(b.name || "", "ar");
      });

      setCategories(list);
    } catch (error) {
      console.error("خطأ في تحميل الأقسام:", error);
      setErrorMessage("حدث خطأ أثناء تحميل الأقسام، يرجى المحاولة لاحقاً.");
    } finally {
      setLoading(false);
    }
  }

  // ─────────────────────────────
  // فتح وإغلاق النافذة (Modal)
  // ─────────────────────────────
  function openCreateModal() {
    setIsEditing(false);
    setForm({
      ...emptyForm,
      sortOrder: categories.length ? categories.length + 1 : 1,
    });
    setIsModalOpen(true);
    setErrorMessage("");
    setSuccessMessage("");
  }

  function openEditModal(category) {
    setIsEditing(true);
    setForm({
      id: category._id,
      name: category.name || "",
      sortOrder:
        typeof category.sortOrder === "number"
          ? category.sortOrder
          : category.sortOrder || "",
      imageFile: null,
      rawImageUrl: category.image ? resolveCategoryImage(category.image) : "",
      previewUrl: category.image ? resolveCategoryImage(category.image) : "",
      cropZoom: 1,
      cropOffsetX: 0,
      cropOffsetY: 0,
      // نحول القيمة من 0–1 إلى نسبة مئوية للواجهة
      commissionRate:
        typeof category.commissionRate === "number"
          ? String(Math.round(category.commissionRate * 100))
          : "",
    });
    setIsModalOpen(true);
    setErrorMessage("");
    setSuccessMessage("");
  }

  function closeModal() {
    if (saving) return;
    // تنظيف URL السابقة إن وجدت
    if (form.rawImageUrl && form.rawImageUrl.startsWith("blob:")) {
      URL.revokeObjectURL(form.rawImageUrl);
    }
    setIsModalOpen(false);
    setForm(emptyForm);
  }

  // ─────────────────────────────
  // التعامل مع نموذج القسم
  // ─────────────────────────────
  function handleInputChange(e) {
    const { name, value } = e.target;
    setForm((prev) => {
      if (name === "sortOrder") {
        return {
          ...prev,
          [name]: value.replace(/[^\d]/g, ""),
        };
      }
      if (name === "commissionRate") {
        // نسمح بالأرقام والنقطة العشرية فقط
        return {
          ...prev,
          [name]: value.replace(/[^\d.]/g, ""),
        };
      }
      return {
        ...prev,
        [name]: value,
      };
    });
  }

  function handleSearchChange(e) {
    setSearchTerm(e.target.value);
  }

  function handleImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) {
      // إعادة الضبط عند إزالة الاختيار
      if (form.rawImageUrl && form.rawImageUrl.startsWith("blob:")) {
        URL.revokeObjectURL(form.rawImageUrl);
      }
      setForm((prev) => ({
        ...prev,
        imageFile: null,
        rawImageUrl: "",
        previewUrl: "",
        cropZoom: 1,
        cropOffsetX: 0,
        cropOffsetY: 0,
      }));
      return;
    }

    const rawUrl = URL.createObjectURL(file);

    // نعيد الضبط بالكامل لو تغيّرت الصورة
    if (form.rawImageUrl && form.rawImageUrl.startsWith("blob:")) {
      URL.revokeObjectURL(form.rawImageUrl);
    }

    setForm((prev) => ({
      ...prev,
      imageFile: file,
      rawImageUrl: rawUrl,
      previewUrl: rawUrl,
      cropZoom: 1,
      cropOffsetX: 0,
      cropOffsetY: 0,
    }));
  }

  function handleCropChange(field, value) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function resetCrop() {
    setForm((prev) => ({
      ...prev,
      cropZoom: 1,
      cropOffsetX: 0,
      cropOffsetY: 0,
    }));
  }

  // ─────────────────────────────
  // حفظ (إنشاء أو تعديل قسم)
  // ─────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) {
      setErrorMessage("اسم القسم مطلوب.");
      return;
    }

    // تحويل نسبة العمولة من % في الواجهة إلى قيمة 0–1 للبك إند
    let normalizedCommission = null;
    if (form.commissionRate !== "") {
      const num = Number(form.commissionRate);
      if (!Number.isNaN(num) && num >= 0) {
        normalizedCommission = num / 100;
      }
    }

    try {
      setSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      const payload = {
        name: form.name.trim(),
        sortOrder: form.sortOrder
          ? Number(form.sortOrder)
          : categories.length + 1,
        description: "", // يمكن إضافة حقل وصف مستقبلاً في الواجهة
        imageFile: form.imageFile || undefined,
        // قيم القص (حالياً تُستخدم للمعاينة ويمكن لاحقاً إرسالها وحفظها في الباك إند)
        cropZoom: form.cropZoom,
        cropOffsetX: form.cropOffsetX,
        cropOffsetY: form.cropOffsetY,
      };

      if (normalizedCommission !== null) {
        payload.commissionRate = normalizedCommission;
      }

      // يمكن عند الإنشاء إضافة isActive إن أردت (مثلاً جعل القسم معطّل افتراضياً)
      // payload.isActive = true; // حالياً نترك الافتراضي من الباك إند

      if (isEditing && form.id) {
        const data = await updateAdminCategory(form.id, payload);
        const updated = data.category;

        setCategories((prev) =>
          prev
            .map((cat) =>
              cat._id === updated._id
                ? {
                    ...cat,
                    ...updated,
                  }
                : cat
            )
            .sort((a, b) => {
              if (a.sortOrder !== b.sortOrder) {
                return a.sortOrder - b.sortOrder;
              }
              return (a.name || "").localeCompare(b.name || "", "ar");
            })
        );

        setSuccessMessage("تم تحديث القسم بنجاح.");
      } else {
        const data = await createAdminCategory(payload);
        const created = data.category;

        setCategories((prev) =>
          [...prev, created].sort((a, b) => {
            if (a.sortOrder !== b.sortOrder) {
              return a.sortOrder - b.sortOrder;
            }
            return (a.name || "").localeCompare(b.name || "", "ar");
          })
        );

        setSuccessMessage("تم إنشاء القسم بنجاح.");
      }

      setTimeout(() => {
        closeModal();
      }, 300);
    } catch (error) {
      console.error("خطأ في حفظ القسم:", error);
      const msg =
        error?.response?.data?.message || "حدث خطأ أثناء حفظ بيانات القسم.";
      setErrorMessage(msg);
    } finally {
      setSaving(false);
    }
  }

  // ─────────────────────────────
  // حذف قسم
  // ─────────────────────────────
  async function handleDelete(categoryId) {
    const ok = window.confirm("هل أنت متأكد من حذف هذا القسم؟");
    if (!ok) return;

    try {
      setSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      await deleteAdminCategory(categoryId);

      setCategories((prev) =>
        prev
          .filter((cat) => cat._id !== categoryId)
          .map((cat, index) => ({ ...cat, sortOrder: index + 1 }))
      );

      setSuccessMessage("تم حذف القسم بنجاح.");
    } catch (error) {
      console.error("خطأ في حذف القسم:", error);
      const msg =
        error?.response?.data?.message || "حدث خطأ أثناء حذف القسم.";
      setErrorMessage(msg);
    } finally {
      setSaving(false);
    }
  }

  // ─────────────────────────────
  // تفعيل / تعطيل قسم
  // ─────────────────────────────
  async function handleToggleStatus(category) {
    try {
      setSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      const nextActive = category.isActive === false ? true : false;

      const data = await updateAdminCategory(category._id, {
        isActive: nextActive,
      });

      const updated = data.category;

      setCategories((prev) =>
        prev.map((cat) =>
          cat._id === updated._id ? { ...cat, ...updated } : cat
        )
      );

      setSuccessMessage(
        updated.isActive
          ? "تم تفعيل القسم بنجاح."
          : "تم تعطيل القسم بنجاح."
      );
    } catch (error) {
      console.error("خطأ في تغيير حالة القسم:", error);
      const msg =
        error?.response?.data?.message ||
        "حدث خطأ أثناء تغيير حالة القسم.";
      setErrorMessage(msg);
    } finally {
      setSaving(false);
    }
  }

  // ─────────────────────────────
  // السحب والإفلات لتغيير الترتيب
  // ─────────────────────────────
  function handleDragStart(e, id) {
    setDraggingId(id);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  async function handleDrop(e, targetId) {
    e.preventDefault();
    if (!draggingId || draggingId === targetId) {
      setDraggingId(null);
      return;
    }

    const currentList = [...categories];
    const fromIndex = currentList.findIndex((c) => c._id === draggingId);
    const toIndex = currentList.findIndex((c) => c._id === targetId);

    if (fromIndex === -1 || toIndex === -1) {
      setDraggingId(null);
      return;
    }

    const [moved] = currentList.splice(fromIndex, 1);
    currentList.splice(toIndex, 0, moved);

    const reordered = currentList.map((cat, index) => ({
      ...cat,
      sortOrder: index + 1,
    }));

    setCategories(reordered);
    setDraggingId(null);

    try {
      setOrderSaving(true);
      await Promise.all(
        reordered.map((cat) =>
          updateAdminCategory(cat._id, { sortOrder: cat.sortOrder })
        )
      );
      setSuccessMessage("تم تحديث ترتيب الأقسام بنجاح.");
    } catch (error) {
      console.error("خطأ في تحديث ترتيب الأقسام:", error);
      setErrorMessage(
        "حدث خطأ أثناء حفظ ترتيب الأقسام. سيتم إعادة التحميل لاحقاً."
      );
    } finally {
      setOrderSaving(false);
    }
  }

  // ─────────────────────────────
  // فلترة الأقسام بحسب البحث
  // ─────────────────────────────
  const filteredCategories = categories.filter((cat) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.trim().toLowerCase();
    return (cat.name || "").toLowerCase().includes(term);
  });

  // ─────────────────────────────
  // الواجهة
  // ─────────────────────────────
  return (
    <section className="admin-section-card">
      <div className="admin-section-header">
        <div>
          <h2 className="admin-section-title">إدارة الأقسام</h2>
          <p className="admin-section-subtitle">
            من هنا يمكنك إضافة وتعديل وحذف الأقسام الرئيسية، والتحكم في
            ترتيبها ومعاينة صورة كل قسم كما ستظهر في الواجهة، وتحديد نسبة
            عمولة المنصة لكل قسم، وتفعيل أو تعطيل ظهور القسم في المتجر.
          </p>
        </div>
        <div className="admin-section-actions" style={{ gap: "0.75rem" }}>
          <div className="admin-search-field">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.35rem",
                padding: "0.4rem 0.75rem",
                borderRadius: "999px",
                backgroundColor: "#f3f4f6",
                border: "1px solid #e5e7eb",
              }}
            >
              <Search size={16} style={{ color: "#9ca3af" }} />
              <input
                type="text"
                placeholder="بحث باسم القسم..."
                value={searchTerm}
                onChange={handleSearchChange}
                style={{
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  fontSize: "0.85rem",
                }}
              />
            </div>
          </div>

          <button
            type="button"
            className="admin-btn primary"
            onClick={openCreateModal}
          >
            <Plus size={18} />
            <span>إضافة قسم جديد</span>
          </button>
        </div>
      </div>

      {(errorMessage || successMessage || orderSaving) && (
        <div className="admin-section-messages">
          {errorMessage && (
            <div className="alert alert-error">{errorMessage}</div>
          )}
          {successMessage && (
            <div className="alert alert-success">{successMessage}</div>
          )}
          {orderSaving && !errorMessage && (
            <div className="alert alert-info">
              جاري حفظ ترتيب الأقسام الجديد...
            </div>
          )}
        </div>
      )}

      <div className="admin-section-body">
        {loading ? (
          <div className="admin-loading">جاري تحميل الأقسام...</div>
        ) : filteredCategories.length === 0 ? (
          <div className="admin-empty-state">
            لا توجد أقسام مطابقة لخيارات البحث الحالية.
            <button
              type="button"
              className="admin-btn link"
              onClick={openCreateModal}
            >
              إضافة قسم جديد
            </button>
          </div>
        ) : (
          <div className="admin-table-wrapper">
            <p className="admin-table-hint">
              يمكنك سحب الصف باستخدام المقبض{" "}
              <span className="drag-handle-icon">
                <GripVertical size={14} />
              </span>{" "}
              لتغيير ترتيب الأقسام.
            </p>

            <table className="admin-table categories-table">
              <thead>
                <tr>
                  <th style={{ width: "40px" }}></th>
                  <th>الصورة</th>
                  <th>اسم القسم</th>
                  <th style={{ width: "110px" }}>الترتيب</th>
                  <th style={{ width: "120px" }}>الحالة</th>
                  <th style={{ width: "120px" }}>عمولة المنصة</th>
                  <th style={{ width: "120px" }}>عدد المنتجات</th>
                  <th style={{ width: "180px" }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredCategories.map((cat) => (
                  <tr
                    key={cat._id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, cat._id)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, cat._id)}
                    className={
                      draggingId === cat._id ? "row-dragging" : undefined
                    }
                  >
                    <td className="drag-handle-cell">
                      <span className="drag-handle">
                        <GripVertical size={16} />
                      </span>
                    </td>
                    <td>
                      <div className="category-image-cell">
                        {cat.image ? (
                          <div
                            style={{
                              width: 56,
                              height: 56,
                              borderRadius: 16,
                              overflow: "hidden",
                              position: "relative",
                              backgroundColor: "#f9fafb",
                              border: "1px solid #e5e7eb",
                            }}
                          >
                            <img
                              src={resolveCategoryImage(cat.image)}
                              alt={cat.name}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                                objectPosition: "center",
                              }}
                            />
                          </div>
                        ) : (
                          <div className="category-image-placeholder">
                            <ImageIcon size={18} />
                          </div>
                        )}
                      </div>
                    </td>
                    <td>{cat.name}</td>
                    <td>{cat.sortOrder}</td>
                    <td>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.25rem",
                          justifyContent: "center",
                        }}
                      >
                        {cat.isActive !== false ? (
                          <>
                            <ToggleRight size={18} color="#16a34a" />
                            <span className="status-label">مفعل</span>
                          </>
                        ) : (
                          <>
                            <ToggleLeft size={18} color="#9ca3af" />
                            <span className="status-label muted">
                              غير مفعل
                            </span>
                          </>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="badge-soft">
                        {typeof cat.commissionRate === "number"
                          ? `${Math.round(cat.commissionRate * 100)}٪`
                          : "0٪"}
                      </span>
                    </td>
                    <td>
                      <span className="badge-soft">
                        {typeof cat.productCount === "number"
                          ? cat.productCount
                          : 0}
                      </span>
                    </td>
                    <td>
                      <div className="admin-table-actions">
                        <button
                          type="button"
                          className="admin-icon-btn"
                          onClick={() => openEditModal(cat)}
                        >
                          <Edit3 size={16} />
                          <span>تعديل</span>
                        </button>
                        <button
                          type="button"
                          className="admin-icon-btn"
                          onClick={() => handleToggleStatus(cat)}
                        >
                          {cat.isActive !== false ? "تعطيل" : "تفعيل"}
                        </button>
                        <button
                          type="button"
                          className="admin-icon-btn danger"
                          onClick={() => handleDelete(cat._id)}
                        >
                          <Trash2 size={16} />
                          <span>حذف</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* نافذة إضافة/تعديل القسم */}
      {isModalOpen && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal">
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">
                {isEditing ? "تعديل القسم" : "إضافة قسم جديد"}
              </h3>
              <button
                type="button"
                className="admin-modal-close"
                onClick={closeModal}
                disabled={saving}
              >
                <X size={18} />
              </button>
            </div>

            <form className="admin-modal-body" onSubmit={handleSubmit}>
              <div className="admin-form-group">
                <label className="admin-label">اسم القسم *</label>
                <input
                  type="text"
                  name="name"
                  className="admin-input"
                  placeholder="مثال: الإلكترونيات، الأجهزة المنزلية..."
                  value={form.name}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label className="admin-label">ترتيب القسم</label>
                  <input
                    type="text"
                    name="sortOrder"
                    className="admin-input"
                    placeholder="مثال: 1، 2، 3..."
                    value={form.sortOrder}
                    onChange={handleInputChange}
                  />
                  <small className="admin-help-text">
                    كلما كان الرقم أصغر ظهر القسم في مقدمة القائمة.
                  </small>
                </div>

                <div className="admin-form-group">
                  <label className="admin-label">صورة القسم</label>
                  <div className="image-upload-field">
                    <label className="image-upload-btn">
                      <ImageIcon size={16} />
                      <span>اختر صورة</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        hidden
                      />
                    </label>
                    <small className="admin-help-text">
                      يُفضل استخدام صورة مربعة أو قريبة من المربع.
                    </small>
                  </div>
                </div>
              </div>

              <div className="admin-form-group">
                <label className="admin-label">
                  نسبة عمولة المنصة لهذا القسم (%)
                </label>
                <input
                  type="number"
                  name="commissionRate"
                  className="admin-input"
                  placeholder="مثال: 10 تعني 10٪"
                  min="0"
                  max="100"
                  step="0.1"
                  value={form.commissionRate}
                  onChange={handleInputChange}
                />
                <small className="admin-help-text">
                  اتركها 0 إن لم تكن هناك عمولة خاصة لهذا القسم.
                </small>
              </div>

              {/* معاينة الصورة داخل إطار مربع مع شبكة (3×3) + تحكم في الموضع */}
              <div className="admin-form-group">
                <label className="admin-label">
                  معاينة الصورة كما ستظهر في الواجهة
                </label>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.75rem",
                  }}
                >
                  <div
                    style={{
                      width: 220,
                      height: 220,
                      borderRadius: 24,
                      overflow: "hidden",
                      position: "relative",
                      border: "1px solid #e5e7eb",
                      background: "#f9fafb",
                      alignSelf: "flex-start",
                    }}
                  >
                    {form.previewUrl ? (
                      <>
                        <img
                          src={form.previewUrl}
                          alt="معاينة القسم"
                          style={{
                            position: "absolute",
                            inset: 0,
                            margin: "auto",
                            width: "120%",
                            height: "120%",
                            objectFit: "cover",
                            transform: `translate(${form.cropOffsetX}%, ${form.cropOffsetY}%) scale(${form.cropZoom})`,
                            transition: "transform 0.12s ease-out",
                          }}
                        />
                        {/* شبكة 3×3 */}
                        <div
                          style={{
                            position: "absolute",
                            inset: 0,
                            backgroundImage:
                              "linear-gradient(to right, rgba(255,255,255,0.18) 1px, transparent 1px)," +
                              "linear-gradient(to bottom, rgba(255,255,255,0.18) 1px, transparent 1px)",
                            backgroundSize: "33.33% 100%, 100% 33.33%",
                            pointerEvents: "none",
                            boxShadow:
                              "inset 0 0 0 1px rgba(15,23,42,0.25), inset 0 0 40px rgba(15,23,42,0.25)",
                          }}
                        />
                      </>
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "0.35rem",
                          color: "#9ca3af",
                          fontSize: "0.85rem",
                        }}
                      >
                        <ImageIcon size={22} />
                        <span>لم يتم اختيار صورة بعد</span>
                      </div>
                    )}
                  </div>

                  {form.previewUrl && (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                        gap: "0.75rem",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <label
                          className="admin-label"
                          style={{ fontSize: "0.8rem" }}
                        >
                          التكبير
                        </label>
                        <input
                          type="range"
                          min={1}
                          max={2}
                          step={0.01}
                          value={form.cropZoom}
                          onChange={(e) =>
                            handleCropChange("cropZoom", Number(e.target.value))
                          }
                          style={{ width: "100%" }}
                        />
                      </div>

                      <div>
                        <label
                          className="admin-label"
                          style={{ fontSize: "0.8rem" }}
                        >
                          تحريك أفقيًا
                        </label>
                        <input
                          type="range"
                          min={-50}
                          max={50}
                          step={1}
                          value={form.cropOffsetX}
                          onChange={(e) =>
                            handleCropChange(
                              "cropOffsetX",
                              Number(e.target.value)
                            )
                          }
                          style={{ width: "100%" }}
                        />
                      </div>

                      <div>
                        <label
                          className="admin-label"
                          style={{ fontSize: "0.8rem" }}
                        >
                          تحريك عموديًا
                        </label>
                        <input
                          type="range"
                          min={-50}
                          max={50}
                          step={1}
                          value={form.cropOffsetY}
                          onChange={(e) =>
                            handleCropChange(
                              "cropOffsetY",
                              Number(e.target.value)
                            )
                          }
                          style={{ width: "100%" }}
                        />
                      </div>

                      <div>
                        <button
                          type="button"
                          className="admin-btn ghost"
                          onClick={resetCrop}
                          style={{ marginTop: "0.4rem" }}
                        >
                          إعادة ضبط موضع الصورة
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {errorMessage && (
                <div className="alert alert-error">{errorMessage}</div>
              )}

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="admin-btn ghost"
                  onClick={closeModal}
                  disabled={saving}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="admin-btn primary"
                  disabled={saving}
                >
                  {saving
                    ? "جاري الحفظ..."
                    : isEditing
                    ? "حفظ التعديلات"
                    : "حفظ القسم"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
