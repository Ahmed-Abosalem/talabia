/* eslint-disable no-unused-vars */
// src/pages/Admin/sections/AdminAdsSection.jsx
// ───────────────────────────────────────────────
// قسم إدارة الإعلانات
// - جلب البنرات من الباك إند
// - ترتيب الإعلانات مع دعم السحب والإفلات (Drag & Drop)
// - تفعيل / تعطيل / ربط الإعلان برابط تحويل

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Trash2,
  Edit3,
  X,
  Image as ImageIcon,
  GripVertical,
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Check,
} from "lucide-react";

import { formatDate, formatNumber } from "@/utils/formatters";
import AdminModal from "@/components/Admin/AdminModal/AdminModal";
import {
  getAdminAds,
  updateAdminAd,
  deleteAdminAd,
  toggleAdminAdStatus,
} from "@/services/adminService";
import { useApp } from "@/context/AppContext";

import "./AdminAdsSection.css";

// نفس أسلوب الأقسام: عنوان ثابت لعرض الصور القادمة من الباك إند
const API_BASE_URL = "";

function resolveAdImage(image) {
  if (!image) return "";
  if (image.startsWith("http")) return image;
  return `${API_BASE_URL}${image}`;
}

export default function AdminAdsSection() {
  const navigate = useNavigate();
  const { showToast } = useApp() || {};
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [orderSaving, setOrderSaving] = useState(false);

  const [draggingId, setDraggingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all | active | inactive

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [adToDelete, setAdToDelete] = useState(null);

  // ─────────────────────────────
  // تحميل الإعلانات من الباك إند
  // ─────────────────────────────
  useEffect(() => {
    loadAds();
  }, []);

  async function loadAds() {
    try {
      setLoading(true);
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
  // Navigation
  // ─────────────────────────────
  function openCreateModal() {
    navigate("/admin/ads/add");
  }

  function openEditModal(ad) {
    navigate("/admin/ads/add", { state: { ad } });
  }

  // ─────────────────────────────
  // فلترة الإعلانات بحسب البحث
  // ─────────────────────────────
  function handleSearchChange(e) {
    setSearchTerm(e.target.value);
  }

  function handleStatusFilterChange(e) {
    setStatusFilter(e.target.value);
  }

  // ─────────────────────────────
  // حذف إعلان
  // ─────────────────────────────
  function confirmDelete(ad) {
    setAdToDelete(ad);
    setModalOpen(true);
  }

  async function executeDelete() {
    if (!adToDelete) return;

    try {
      setSaving(true);
      await deleteAdminAd(adToDelete._id);

      setAds((prev) =>
        prev
          .filter((ad) => ad._id !== adToDelete._id)
          .map((ad, index) => ({ ...ad, sortOrder: index + 1 }))
      );

      showToast?.("تم حذف الإعلان بنجاح.", "success");
      setModalOpen(false);
      setAdToDelete(null);
    } catch (error) {
      console.error("خطأ في حذف الإعلان:", error);
      const msg =
        error?.response?.data?.message || "حدث خطأ أثناء حذف الإعلان.";
      showToast?.(msg, "error");
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
      const data = await toggleAdminAdStatus(ad._id);
      const updated = data?.data || data?.ad || data;

      setAds((prev) =>
        prev.map((item) =>
          item._id === updated._id ? { ...item, ...updated } : item
        )
      );

      showToast?.(
        updated.isActive ? "تم تفعيل الإعلان." : "تم تعطيل الإعلان.",
        "success"
      );
    } catch (error) {
      console.error("خطأ في تغيير حالة الإعلان:", error);
      const msg =
        error?.response?.data?.message ||
        "حدث خطأ أثناء تغيير حالة الإعلان.";
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

      showToast?.("تم تحديث ترتيب الإعلانات بنجاح.", "success");
    } catch (error) {
      console.error("خطأ في تحديث ترتيب الإعلانات:", error);
      showToast?.("فشل في حفظ الترتيب الجديد.", "error");
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
    <section className="adm-section-panel">
      <header className="adm-section-inner-header">
        <div className="adm-section-icon">
          <ImageIcon size={22} />
        </div>
        <div className="adm-section-title-group">
          <h2 className="adm-section-title">إدارة الإعلانات</h2>
          <p className="adm-section-subtitle">
            التحكم في بانرات الصفحة الرئيسية، ترتيبها، وحالة ظهورها.
          </p>
        </div>
        <div className="adm-section-actions">
          <button
            type="button"
            className="adm-btn primary"
            onClick={openCreateModal}
          >
            <Plus size={18} />
            <span>إضافة إعلان جديد</span>
          </button>
        </div>
      </header>

      <div className="adm-toolbar">
        <div className="adm-search-wrapper">
          <Search size={16} className="adm-search-icon" />
          <input
            type="text"
            className="adm-search-input"
            placeholder="بحث بعنوان الإعلان أو الرابط..."
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </div>

        <div className="adm-section-actions">
          <select
            className="adm-filter-select"
            value={statusFilter}
            onChange={handleStatusFilterChange}
          >
            <option value="all">كل الحالات</option>
            <option value="active">مفعّل</option>
            <option value="inactive">غير مفعّل</option>
          </select>
        </div>
      </div>

      {orderSaving && (
        <div className="adm-section-messages">
          <div className="adm-notice-box">
            <RefreshCw size={18} className="spin" />
            <span>جاري حفظ ترتيب الإعلانات الجديد...</span>
          </div>
        </div>
      )}

      <div className="admin-section-body">
        {loading ? (
          <div className="adm-loading">
            <RefreshCw size={24} className="spin" />
            <span>جاري تحميل الإعلانات...</span>
          </div>
        ) : filteredAds.length === 0 ? (
          <div className="adm-empty-msg">
            <div className="adm-empty-icon">
              <ImageIcon size={48} />
            </div>
            <h3>لا توجد إعلانات مطابقة</h3>
            <p>جرّب تعديل خيارات البحث أو التصفية للحصول على نتائج.</p>
          </div>
        ) : (
          <div className="adm-table-wrapper">
            <p className="admin-table-hint" style={{ fontWeight: 600 }}>
              يمكنك سحب الصف باستخدام المقبض{" "}
              <GripVertical size={14} style={{ verticalAlign: 'middle' }} />{" "}
              لتغيير ترتيب الإعلانات.
            </p>

            <table className="adm-table">
              <thead>
                <tr>
                  <th style={{ width: "40px" }}></th>
                  <th>الصورة</th>
                  <th>العنوان</th>
                  <th>الرابط</th>
                  <th>فترة العرض</th>
                  <th style={{ textAlign: 'center' }}>الترتيب</th>
                  <th>الحالة</th>
                  <th style={{ textAlign: 'center' }}>الإجراءات</th>
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
                      <span className="adm-drag-handle">
                        <GripVertical size={16} />
                      </span>
                    </td>
                    <td>
                      <div className="adm-table-main">
                        <div className="global-product-frame is-thumbnail" style={{ width: '120px', height: '60px', borderRadius: 'var(--rad-sm)' }}>
                          {ad.image ? (
                            <img src={resolveAdImage(ad.image)} alt={ad.title} />
                          ) : (
                            <div className="adm-placeholder-box">
                              <ImageIcon size={20} />
                            </div>
                          )}
                        </div>
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
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div className="adm-meta-text">
                          <strong>من:</strong> {ad.startAt ? formatDate(ad.startAt) : "—"}
                        </div>
                        <div className="adm-meta-text">
                          <strong>إلى:</strong> {ad.endAt ? formatDate(ad.endAt) : "—"}
                        </div>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 800 }}>{formatNumber(ad.sortOrder)}</td>
                    <td>
                      <span
                        className={`adm-status-chip mini ${ad.isActive !== false ? "active" : "inactive"}`}
                      >
                        <span className="adm-status-dot"></span>
                        {ad.isActive !== false ? "مفعل" : "غير مفعل"}
                      </span>
                    </td>
                    <td>
                      <div className="adm-table-actions">
                        <button
                          type="button"
                          className="adm-icon-btn primary"
                          onClick={() => openEditModal(ad)}
                          title="تعديل"
                          disabled={saving}
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          type="button"
                          className={`adm-icon-btn ${ad.isActive !== false ? 'muted' : 'success'}`}
                          onClick={() => handleToggleStatus(ad)}
                          title={ad.isActive !== false ? "تعطيل" : "تفعيل"}
                          disabled={saving}
                        >
                          {ad.isActive !== false ? <X size={16} /> : <Check size={16} />}
                        </button>
                        <button
                          type="button"
                          className="adm-icon-btn danger"
                          onClick={() => confirmDelete(ad)}
                          title="حذف"
                          disabled={saving}
                        >
                          <Trash2 size={16} />
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

      {modalOpen && (
        <AdminModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title="تأكيد حذف الإعلان"
          icon={AlertTriangle}
          type="danger"
          confirmText="حذف"
          onConfirm={executeDelete}
          isConfirming={saving}
        >
          <p>هل أنت متأكد من رغبتك في حذف الإعلان الآتي؟</p>
          <p style={{ fontWeight: 600, color: 'var(--adm-text-main)', marginTop: '8px' }}>
            "{adToDelete?.title}"
          </p>
          <p style={{ marginTop: '8px', fontSize: '0.9rem', color: 'var(--adm-text-muted)' }}>
            هذا الإجراء لا يمكن التراجع عنه.
          </p>
        </AdminModal>
      )}

    </section>
  );
}
