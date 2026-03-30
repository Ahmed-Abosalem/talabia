// frontend/src/pages/Admin/sections/AdminCategoriesSection.jsx
// واجهة إدارة الأقسام في لوحة تحكم طلبية (Talabia)
// - إضافة / تعديل / حذف قسم
// - رفع صورة مع معاينة تفاعلية داخل إطار مربع مع شبكة (3×3)
// - ترتيب الأقسام مع دعم السحب والإفلات (Drag & Drop)
// - عرض عدد المنتجات داخل كل قسم
// - تفعيل / تعطيل القسم (إخفاؤه من الواجهة العامة)

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  Lock,
  RefreshCw,
  Layers,
} from "lucide-react";
import {
  getAdminCategories,
  createAdminCategory,
  updateAdminCategory,
  deleteAdminCategory,
} from "@/services/adminService";
import { useApp } from "@/context/AppContext";
import AdminModal from "@/components/Admin/AdminModal/AdminModal";

import "./AdminCategoriesSection.css";

// عنوان ثابت لعرض الصور القادمة من الباك إند
// يمكنك تعديله لاحقاً ليعتمد على env لو أحببت
const API_BASE_URL = "";

function resolveCategoryImage(image) {
  if (!image) return "";
  if (image.startsWith("http")) return image;
  return `${API_BASE_URL}${image}`;
}

export default function AdminCategoriesSection() {
  const navigate = useNavigate();
  const { showToast } = useApp() || {};
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [orderSaving, setOrderSaving] = useState(false);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [catToDelete, setCatToDelete] = useState(null);

  const [draggingId, setDraggingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const filteredCategories = categories.filter((cat) =>
    (cat.name || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ─────────────────────────────
  // تحميل الأقسام من الباك إند
  // ─────────────────────────────
  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    try {
      setLoading(true);
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
      showToast?.("حدث خطأ أثناء تحميل الأقسام.", "error");
    } finally {
      setLoading(false);
    }
  }

  // ─────────────────────────────
  // الانتقال لصفحة الإضافة/التعديل
  // ─────────────────────────────
  function openCreateModal() {
    navigate("/admin/categories/add");
  }

  function openEditModal(category) {
    navigate("/admin/categories/add", { state: { category } });
  }


  // ─────────────────────────────
  // حذف قسم
  // ─────────────────────────────
  function confirmDelete(id) {
    setCatToDelete(id);
    setModalOpen(true);
  }

  async function executeDelete() {
    if (!catToDelete) return;
    try {
      setSaving(true);
      await deleteAdminCategory(catToDelete);

      setCategories((prev) =>
        prev
          .filter((cat) => cat._id !== catToDelete)
          .map((cat, index) => ({ ...cat, sortOrder: index + 1 }))
      );

      showToast?.("تم حذف القسم بنجاح.", "success");
      setModalOpen(false);
      setCatToDelete(null);
    } catch (error) {
      console.error("خطأ في حذف القسم:", error);
      const msg =
        error?.response?.data?.message || "حدث خطأ أثناء حذف القسم.";
      showToast?.(msg, "error");
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

      showToast?.(
        updated.isActive
          ? "تم تفعيل القسم بنجاح."
          : "تم تعطيل القسم بنجاح.",
        "success"
      );
    } catch (error) {
      console.error("خطأ في تغيير حالة القسم:", error);
      const msg =
        error?.response?.data?.message ||
        "حدث خطأ أثناء تغيير حالة القسم.";
      showToast?.(msg, "error");
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

    // 🛡️ حماية: منع تغيير ترتيب قسم "الكل" (سواء كان هو المسحوب أو الهدف)
    const targetCat = categories.find(c => c._id === targetId);
    const draggedCat = categories.find(c => c._id === draggingId);

    if (
      (targetCat && (targetCat.isProtected || targetCat.slug === 'all')) ||
      (draggedCat && (draggedCat.isProtected || draggedCat.slug === 'all'))
    ) {
      setDraggingId(null);
      return;
    }

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
      showToast?.("تم تحديث ترتيب الأقسام بنجاح.", "success");
    } catch (error) {
      console.error("خطأ في تحديث ترتيب الأقسام:", error);
      showToast?.("فشل في حفظ الترتيب الجديد.", "error");
      loadCategories();
    } finally {
      setOrderSaving(false);
    }
  }



  // ─────────────────────────────
  // الواجهة
  // ─────────────────────────────
  return (
    <section className="adm-section-panel">
      <header className="adm-section-inner-header">
        <div className="adm-section-icon">
          <Layers size={22} />
        </div>
        <div className="adm-section-title-group">
          <h2 className="adm-section-title">إدارة الأقسام</h2>
          <p className="adm-section-subtitle">
            إضافة وتعديل الأقسام الرئيسية وتحديد نسب العمولات لكل منها.
          </p>
        </div>
        <div className="adm-section-actions">
          <button
            type="button"
            className="adm-btn primary"
            onClick={openCreateModal}
          >
            <Plus size={18} />
            <span>إضافة قسم جديد</span>
          </button>
        </div>
      </header>

      <div className="adm-toolbar">
        <div className="adm-search-wrapper">
          <Search size={16} className="adm-search-icon" />
          <input
            type="text"
            className="adm-search-input"
            placeholder="بحث باسم القسم..."
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </div>
      </div>

      {orderSaving && (
        <div className="adm-messages">
          <div className="adm-notice-box">
            <RefreshCw size={16} className="spin" />
            <span>جاري حفظ ترتيب الأقسام الجديد...</span>
          </div>
        </div>
      )}

      <div className="adm-section-body">
        {loading ? (
          <div className="adm-loading">
            <RefreshCw size={24} className="spin" />
            <span>جاري تحميل الأقسام...</span>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="adm-empty-msg">
            لا توجد أقسام مطابقة لخيارات البحث الحالية.
          </div>
        ) : (
          <div className="adm-table-wrapper">
            <p className="adm-table-hint">
              يمكنك سحب الصف باستخدام المقبض <GripVertical size={14} /> لتغيير الترتيب.
            </p>

            <table className="adm-table categories-table">
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
                    draggable={!(cat.isProtected || cat.slug === 'all')}
                    onDragStart={(e) => {
                      if (cat.isProtected || cat.slug === 'all') {
                        e.preventDefault();
                        return;
                      }
                      handleDragStart(e, cat._id);
                    }}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, cat._id)}
                    className={
                      draggingId === cat._id ? "row-dragging" : undefined
                    }
                    style={{
                      opacity: draggingId === cat._id ? 0.5 : 1,
                      backgroundColor: (cat.isProtected || cat.slug === 'all') ? '#f9f9f9' : undefined
                    }}
                  >
                    <td className="drag-handle-cell">
                      {!(cat.isProtected || cat.slug === 'all') ? (
                        <span className="adm-drag-handle">
                          <GripVertical size={16} />
                        </span>
                      ) : (
                        <span className="adm-drag-handle disabled" title="قسم ثابت">
                          <Lock size={16} />
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="adm-table-main">
                        <div className="global-product-frame is-thumbnail" style={{ width: '40px', height: '40px', borderRadius: 'var(--rad-sm)' }}>
                          {cat.image ? (
                            <img src={resolveCategoryImage(cat.image)} alt={cat.name} />
                          ) : (
                            <div className="adm-placeholder-box">
                              <ImageIcon size={18} />
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>{cat.name}</td>
                    <td>{cat.sortOrder}</td>
                    <td>
                      <div className="adm-status-wrapper">
                        {cat.isActive !== false ? (
                          <div className="adm-status-chip active">
                            <span className="adm-status-dot"></span>
                            <span>مفعل</span>
                          </div>
                        ) : (
                          <div className="adm-status-chip inactive">
                            <span className="adm-status-dot"></span>
                            <span>معطل</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="adm-badge-soft">
                        {typeof cat.commissionRate === "number"
                          ? `${Math.round(cat.commissionRate * 100)}٪`
                          : "0٪"}
                      </span>
                    </td>
                    <td>
                      <strong>{cat.productCount ?? 0}</strong>
                    </td>
                    <td>
                      <div className="adm-table-actions">
                        <button
                          type="button"
                          className="adm-icon-btn primary"
                          onClick={() => openEditModal(cat)}
                          title="تعديل"
                        >
                          <Edit3 size={16} />
                        </button>

                        {!(cat.isProtected || cat.slug === 'all') && (
                          <button
                            type="button"
                            className={`adm-icon-btn ${cat.isActive !== false ? 'muted' : 'success'}`}
                            onClick={() => handleToggleStatus(cat)}
                            title={cat.isActive !== false ? "تعطيل" : "تفعيل"}
                          >
                            {cat.isActive !== false ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                          </button>
                        )}

                        {!(cat.isProtected || cat.slug === 'all') ? (
                          <button
                            type="button"
                            className="adm-icon-btn danger"
                            onClick={() => confirmDelete(cat._id)}
                            title="حذف"
                          >
                            <Trash2 size={16} />
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="adm-icon-btn disabled"
                            disabled
                            title="قسم ثابت"
                          >
                            <Lock size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AdminModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={executeDelete}
        title="حذف القسم"
        confirmText="تأكيد الحذف"
        cancelText="إلغاء"
        type="danger"
        isConfirming={saving}
      >
        <p>هل أنت متأكد من حذف هذا القسم؟ سيتم إزالة القسم نهائياً من المتجر وكافة المنتجات المرتبطة به قد تتأثر.</p>
      </AdminModal>
    </section>
  );
}
