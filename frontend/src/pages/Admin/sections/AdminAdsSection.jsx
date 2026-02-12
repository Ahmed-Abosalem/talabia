// frontend/src/pages/Admin/sections/AdminAdsSection.jsx
// واجهة إدارة الإعلانات (بانر الصفحة الرئيسية) في لوحة تحكم طلبية
// - إضافة / تعديل / حذف إعلان
// - رفع صورة مع معاينة تفاعلية داخل إطار مستطيل مع شبكة (3×3)
// - ترتيب الإعلانات مع دعم السحب والإفلات (Drag & Drop)
// - تفعيل / تعطيل / ربط الإعلان برابط تحويل

import { useEffect, useState } from "react";
import {
  Plus,
  Trash2,
  Edit3,
  X,
  Image as ImageIcon,
  GripVertical,
  Search,
} from "lucide-react";

import "./AdminAdsSection.css";

import {
  getAdminAds,
  createAdminAd,
  updateAdminAd,
  deleteAdminAd,
  toggleAdminAdStatus,
} from "@/services/adminService";

// نفس أسلوب الأقسام: عنوان ثابت لعرض الصور القادمة من الباك إند
const API_BASE_URL = "";

function resolveAdImage(image) {
  if (!image) return "";
  if (image.startsWith("http")) return image;
  return `${API_BASE_URL}${image}`;
}

const emptyForm = {
  id: null,
  title: "",
  subtitle: "",
  description: "",
  linkUrl: "",
  startAt: "",
  endAt: "",
  sortOrder: "",
  isActive: true,
  imageFile: null,
  rawImageUrl: "", // الصورة الأصلية من الجهاز أو من السيرفر
  previewUrl: "", // لمعاينة داخل إطار القص
  cropZoom: 1,
  cropOffsetX: 0,
  cropOffsetY: 0,
};

export default function AdminAdsSection() {
  const [ads, setAds] = useState([]);
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
  const [statusFilter, setStatusFilter] = useState("all"); // all | active | inactive

  // ─────────────────────────────
  // تحميل الإعلانات من الباك إند
  // ─────────────────────────────
  useEffect(() => {
    loadAds();
  }, []);

  async function loadAds() {
    try {
      setLoading(true);
      setErrorMessage("");
      const data = await getAdminAds({
        // يمكن لاحقاً استخدام placement أو search من الباك
      });

      const list = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.ads)
        ? data.ads
        : Array.isArray(data)
        ? data
        : [];

      const normalized = list.map((ad) => ({
        ...ad,
        sortOrder:
          typeof ad.sortOrder === "number" && !Number.isNaN(ad.sortOrder)
            ? ad.sortOrder
            : 0,
      }));

      normalized.sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) {
          return a.sortOrder - b.sortOrder;
        }
        return (a.title || "").localeCompare(b.title || "", "ar");
      });

      setAds(normalized);
    } catch (error) {
      console.error("خطأ في تحميل الإعلانات:", error);
      setErrorMessage("حدث خطأ أثناء تحميل الإعلانات، يرجى المحاولة لاحقاً.");
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
      sortOrder: ads.length ? ads.length + 1 : 1,
    });
    setIsModalOpen(true);
    setErrorMessage("");
    setSuccessMessage("");
  }

  function openEditModal(ad) {
    setIsEditing(true);
    setForm({
      id: ad._id,
      title: ad.title || "",
      subtitle: ad.subtitle || "",
      description: ad.description || "",
      linkUrl: ad.linkUrl || "",
      startAt: ad.startAt ? ad.startAt.slice(0, 16) : "",
      endAt: ad.endAt ? ad.endAt.slice(0, 16) : "",
      sortOrder:
        typeof ad.sortOrder === "number"
          ? ad.sortOrder
          : ad.sortOrder || "",
      isActive: ad.isActive !== false,
      imageFile: null,
      rawImageUrl: ad.image ? resolveAdImage(ad.image) : "",
      previewUrl: ad.image ? resolveAdImage(ad.image) : "",
      cropZoom: 1,
      cropOffsetX: 0,
      cropOffsetY: 0,
    });
    setIsModalOpen(true);
    setErrorMessage("");
    setSuccessMessage("");
  }

  function closeModal() {
    if (saving) return;
    if (form.rawImageUrl && form.rawImageUrl.startsWith("blob:")) {
      URL.revokeObjectURL(form.rawImageUrl);
    }
    setIsModalOpen(false);
    setForm(emptyForm);
  }

  // ─────────────────────────────
  // التعامل مع نموذج الإعلان
  // ─────────────────────────────
  function handleInputChange(e) {
    const { name, value, type, checked } = e.target;

    setForm((prev) => {
      if (name === "sortOrder") {
        return {
          ...prev,
          [name]: value.replace(/[^\d]/g, ""),
        };
      }

      if (type === "checkbox") {
        return {
          ...prev,
          [name]: checked,
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

  function handleStatusFilterChange(e) {
    setStatusFilter(e.target.value);
  }

  function handleImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) {
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
  // حفظ (إنشاء أو تعديل إعلان)
  // ─────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.title.trim()) {
      setErrorMessage("عنوان الإعلان مطلوب.");
      return;
    }

    if (!form.linkUrl.trim()) {
      setErrorMessage("رابط الإعلان مطلوب.");
      return;
    }

    try {
      setSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      const formData = new FormData();
      formData.append("title", form.title.trim());
      if (form.subtitle) formData.append("subtitle", form.subtitle.trim());
      if (form.description)
        formData.append("description", form.description.trim());

      if (form.sortOrder) {
        formData.append("sortOrder", String(form.sortOrder));
      }

      formData.append("isActive", form.isActive ? "true" : "false");

      if (form.linkUrl) {
        formData.append("linkUrl", form.linkUrl.trim());
      }

      // قيم ثابتة للتوافق مع نموذج الباك إند
      formData.append("type", "banner");
      formData.append("placement", "home_main_banner");

      if (form.imageFile) {
        formData.append("image", form.imageFile);
      }

      // يمكن لاحقاً إرسال قيم القص إن دعمها الباك إند
      formData.append("cropZoom", String(form.cropZoom));
      formData.append("cropOffsetX", String(form.cropOffsetX));
      formData.append("cropOffsetY", String(form.cropOffsetY));

      if (form.startAt) {
        formData.append("startAt", new Date(form.startAt).toISOString());
      }
      if (form.endAt) {
        formData.append("endAt", new Date(form.endAt).toISOString());
      }

      if (isEditing && form.id) {
        const data = await updateAdminAd(form.id, formData);
        const updated = data?.data || data?.ad || data;

        setAds((prev) =>
          prev
            .map((ad) => (ad._id === updated._id ? { ...ad, ...updated } : ad))
            .sort((a, b) => {
              if (a.sortOrder !== b.sortOrder) {
                return a.sortOrder - b.sortOrder;
              }
              return (a.title || "").localeCompare(b.title || "", "ar");
            })
        );

        setSuccessMessage("تم تحديث الإعلان بنجاح.");
      } else {
        const data = await createAdminAd(formData);
        const created = data?.data || data?.ad || data;

        setAds((prev) =>
          [...prev, created].sort((a, b) => {
            if (a.sortOrder !== b.sortOrder) {
              return a.sortOrder - b.sortOrder;
            }
            return (a.title || "").localeCompare(b.title || "", "ar");
          })
        );

        setSuccessMessage("تم إنشاء الإعلان بنجاح.");
      }

      setTimeout(() => {
        closeModal();
      }, 300);
    } catch (error) {
      console.error("خطأ في حفظ الإعلان:", error);
      const msg =
        error?.response?.data?.message || "حدث خطأ أثناء حفظ بيانات الإعلان.";
      setErrorMessage(msg);
    } finally {
      setSaving(false);
    }
  }

  // ─────────────────────────────
  // حذف إعلان
  // ─────────────────────────────
  async function handleDelete(adId) {
    const ok = window.confirm("هل أنت متأكد من حذف هذا الإعلان؟");
    if (!ok) return;

    try {
      setSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      await deleteAdminAd(adId);

      setAds((prev) =>
        prev
          .filter((ad) => ad._id !== adId)
          .map((ad, index) => ({ ...ad, sortOrder: index + 1 }))
      );

      setSuccessMessage("تم حذف الإعلان بنجاح.");
    } catch (error) {
      console.error("خطأ في حذف الإعلان:", error);
      const msg =
        error?.response?.data?.message || "حدث خطأ أثناء حذف الإعلان.";
      setErrorMessage(msg);
    } finally {
      setSaving(false);
    }
  }

  // ─────────────────────────────
  // تفعيل / تعطيل إعلان
  // ─────────────────────────────
  async function handleToggleStatus(ad) {
    try {
      setSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      const data = await toggleAdminAdStatus(ad._id);
      const updated = data?.data || data?.ad || data;

      setAds((prev) =>
        prev.map((item) =>
          item._id === updated._id ? { ...item, ...updated } : item
        )
      );

      setSuccessMessage(
        updated.isActive ? "تم تفعيل الإعلان." : "تم تعطيل الإعلان."
      );
    } catch (error) {
      console.error("خطأ في تغيير حالة الإعلان:", error);
      const msg =
        error?.response?.data?.message ||
        "حدث خطأ أثناء تغيير حالة الإعلان.";
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

    const currentList = [...ads];
    const fromIndex = currentList.findIndex((a) => a._id === draggingId);
    const toIndex = currentList.findIndex((a) => a._id === targetId);

    if (fromIndex === -1 || toIndex === -1) {
      setDraggingId(null);
      return;
    }

    const [moved] = currentList.splice(fromIndex, 1);
    currentList.splice(toIndex, 0, moved);

    // نعيد ترقيم sortOrder محلياً بحيث يكون 1..N
    const reordered = currentList.map((ad, index) => ({
      ...ad,
      sortOrder: index + 1,
    }));

    setAds(reordered);
    setDraggingId(null);

    try {
      setOrderSaving(true);

      // نحفظ الترتيب الجديد في الباك إند بتحديث sortOrder لكل إعلان
      await Promise.all(
        reordered.map((ad) => {
          const formData = new FormData();
          formData.append("sortOrder", ad.sortOrder);
          return updateAdminAd(ad._id, formData);
        })
      );

      setSuccessMessage("تم تحديث ترتيب الإعلانات بنجاح.");
    } catch (error) {
      console.error("خطأ في تحديث ترتيب الإعلانات:", error);
      setErrorMessage(
        "حدث خطأ أثناء حفظ ترتيب الإعلانات. سيتم إعادة التحميل لاحقاً."
      );
      await loadAds();
    } finally {
      setOrderSaving(false);
    }
  }

  // ─────────────────────────────
  // فلترة الإعلانات بحسب البحث
  // ─────────────────────────────
  const filteredAds = ads.filter((ad) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.trim().toLowerCase();
    return (
      (ad.title || "").toLowerCase().includes(term) ||
      (ad.linkUrl || "").toLowerCase().includes(term)
    );
  }).filter((ad) => {
    if (statusFilter === "active") return ad.isActive !== false;
    if (statusFilter === "inactive") return ad.isActive === false;
    return true;
  });

  // ─────────────────────────────
  // الواجهة
  // ─────────────────────────────
  return (
    <section className="admin-section-card">
      <div className="admin-section-header">
        <div>
          <h2 className="admin-section-title">إدارة الإعلانات (البانرات)</h2>
          <p className="admin-section-subtitle">
            من هنا يمكنك إنشاء وتعديل وحذف الإعلانات التي تظهر في الصفحة
            الرئيسية، مع التحكم في ترتيب ظهورها، فترة العرض، وحالة التفعيل،
            بالإضافة إلى ربط كل إعلان برابط مخصص.
          </p>
        </div>

        <div className="admin-section-actions" style={{ gap: "0.75rem" }}>
          {/* حقل البحث */}
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
                placeholder="بحث بعنوان الإعلان أو الرابط..."
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

          {/* فلتر الحالة */}
          <select
            className="admin-select"
            value={statusFilter}
            onChange={handleStatusFilterChange}
          >
            <option value="all">كل الحالات</option>
            <option value="active">مفعّل فقط</option>
            <option value="inactive">غير مفعّل فقط</option>
          </select>

          <button
            type="button"
            className="admin-btn primary"
            onClick={openCreateModal}
          >
            <Plus size={18} />
            <span>إضافة إعلان جديد</span>
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
              جاري حفظ ترتيب الإعلانات الجديد...
            </div>
          )}
        </div>
      )}

      <div className="admin-section-body">
        {loading ? (
          <div className="admin-loading">جاري تحميل الإعلانات...</div>
        ) : filteredAds.length === 0 ? (
          <div className="admin-empty-state">
            لا توجد إعلانات مطابقة لخيارات البحث الحالية.
            <button
              type="button"
              className="admin-btn link"
              onClick={openCreateModal}
            >
              إضافة إعلان جديد
            </button>
          </div>
        ) : (
          <div className="admin-table-wrapper">
            <p className="admin-table-hint">
              يمكنك سحب الصف باستخدام المقبض{" "}
              <span className="drag-handle-icon">
                <GripVertical size={14} />
              </span>{" "}
              لتغيير ترتيب الإعلانات.
            </p>

            <table className="admin-table categories-table">
              <thead>
                <tr>
                  <th style={{ width: "40px" }}></th>
                  <th>الصورة</th>
                  <th>عنوان الإعلان</th>
                  <th>الرابط</th>
                  <th style={{ width: "140px" }}>فترة العرض</th>
                  <th style={{ width: "90px" }}>الترتيب</th>
                  <th style={{ width: "110px" }}>الحالة</th>
                  <th style={{ width: "160px" }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredAds.map((ad) => (
                  <tr
                    key={ad._id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, ad._id)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, ad._id)}
                    className={
                      draggingId === ad._id ? "row-dragging" : undefined
                    }
                  >
                    <td className="drag-handle-cell">
                      <span className="drag-handle">
                        <GripVertical size={16} />
                      </span>
                    </td>
                    <td>
                      <div className="category-image-cell">
                        {ad.image ? (
                          <div
                            style={{
                              width: 160,
                              height: 90,
                              borderRadius: 18,
                              overflow: "hidden",
                              position: "relative",
                              backgroundColor: "#f9fafb",
                              border: "1px solid #e5e7eb",
                            }}
                          >
                            <img
                              src={resolveAdImage(ad.image)}
                              alt={ad.title}
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
                    <td>{ad.title}</td>
                    <td>
                      {ad.linkUrl ? (
                        <a
                          href={ad.linkUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ad-link"
                        >
                          {ad.linkUrl}
                        </a>
                      ) : (
                        <span className="ad-link-muted">لا يوجد رابط</span>
                      )}
                    </td>
                    <td>
                      <div className="ad-dates">
                        <span className="ad-date-badge">
                          من{" "}
                          {ad.startAt
                            ? new Date(ad.startAt).toLocaleString("ar-SA")
                            : "بدون تاريخ بداية"}
                        </span>
                        <span className="ad-date-badge">
                          إلى{" "}
                          {ad.endAt
                            ? new Date(ad.endAt).toLocaleString("ar-SA")
                            : "بدون تاريخ انتهاء"}
                        </span>
                      </div>
                    </td>
                    <td>{ad.sortOrder}</td>
                    <td>
                      <span
                        className={
                          ad.isActive !== false
                            ? "status-badge status-badge-success"
                            : "status-badge status-badge-muted"
                        }
                      >
                        {ad.isActive !== false ? "مفعل" : "غير مفعل"}
                      </span>
                    </td>
                    <td>
                      <div className="admin-table-actions">
                        <button
                          type="button"
                          className="admin-icon-btn"
                          onClick={() => openEditModal(ad)}
                        >
                          <Edit3 size={16} />
                          <span>تعديل</span>
                        </button>
                        <button
                          type="button"
                          className="admin-icon-btn"
                          onClick={() => handleToggleStatus(ad)}
                        >
                          {ad.isActive !== false ? "تعطيل" : "تفعيل"}
                        </button>
                        <button
                          type="button"
                          className="admin-icon-btn danger"
                          onClick={() => handleDelete(ad._id)}
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

      {/* نافذة إضافة/تعديل الإعلان */}
      {isModalOpen && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal">
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">
                {isEditing ? "تعديل الإعلان" : "إضافة إعلان جديد"}
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
                <label className="admin-label">
                  عنوان الإعلان <span className="required">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  className="admin-input"
                  placeholder="مثال: خصومات حتى 50٪ على الإلكترونيات"
                  value={form.title}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label className="admin-label">العنوان الفرعي</label>
                  <input
                    type="text"
                    name="subtitle"
                    className="admin-input"
                    placeholder="نص صغير يظهر أسفل العنوان..."
                    value={form.subtitle}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="admin-form-group">
                  <label className="admin-label">
                    رابط الإعلان <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    name="linkUrl"
                    className="admin-input"
                    placeholder="https://example.com"
                    value={form.linkUrl}
                    onChange={handleInputChange}
                    required
                  />
                  <small className="admin-help-text">
                    سيتم تحويل المستخدم مباشرة إلى هذا الرابط عند الضغط على
                    البانر.
                  </small>
                </div>
              </div>

              <div className="admin-form-group">
                <label className="admin-label">وصف مختصر</label>
                <textarea
                  name="description"
                  className="admin-input"
                  rows={3}
                  placeholder="يمكنك كتابة وصف موجز يظهر مع الإعلان..."
                  value={form.description}
                  onChange={handleInputChange}
                />
              </div>

              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label className="admin-label">تاريخ ووقت بداية العرض</label>
                  <input
                    type="datetime-local"
                    name="startAt"
                    className="admin-input"
                    value={form.startAt}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="admin-form-group">
                  <label className="admin-label">تاريخ ووقت نهاية العرض</label>
                  <input
                    type="datetime-local"
                    name="endAt"
                    className="admin-input"
                    value={form.endAt}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label className="admin-label">ترتيب الإعلان</label>
                  <input
                    type="text"
                    name="sortOrder"
                    className="admin-input"
                    placeholder="مثال: 1، 2، 3..."
                    value={form.sortOrder}
                    onChange={handleInputChange}
                  />
                  <small className="admin-help-text">
                    كلما كان الرقم أصغر ظهر الإعلان في مقدمة البانرات. يمكنك
                    دائماً تعديل الترتيب بالسحب والإفلات في الجدول.
                  </small>
                </div>

                <div className="admin-form-group">
                  <label className="admin-label">صورة البانر</label>
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
                      يُفضل استخدام صورة بعرض كبير (مستطيل أفقي) بجودة عالية
                      تناسب الصفحة الرئيسية.
                    </small>
                  </div>
                </div>
              </div>

              {/* معاينة الصورة داخل إطار مستطيل مع شبكة (3×3) + تحكم في الموضع */}
              <div className="admin-form-group">
                <label className="admin-label">
                  معاينة الصورة كما ستظهر في الصفحة الرئيسية
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
                      width: "100%",
                      maxWidth: 480,
                      aspectRatio: "16 / 9",
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
                          alt="معاينة الإعلان"
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
                    : "حفظ الإعلان"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
