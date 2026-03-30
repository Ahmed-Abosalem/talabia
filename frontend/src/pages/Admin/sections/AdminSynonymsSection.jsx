// src/pages/Admin/sections/AdminSynonymsSection.jsx
import React, { useState, useEffect } from "react";
import "./AdminSynonymsSection.css";
import { Plus, Search, Edit2, Trash2, BookOpen, RefreshCw } from "lucide-react";
import synonymService from "@/services/synonymService";
import { useApp } from "@/context/AppContext";
import { useNavigate } from "react-router-dom";
import AdminModal from "@/components/Admin/AdminModal/AdminModal";

export default function AdminSynonymsSection() {
    const { showToast } = useApp();
    const [synonyms, setSynonyms] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [modalOpen, setModalOpen] = useState(false);
    const [synonymToDelete, setSynonymToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const navigate = useNavigate();

    const fetchSynonyms = async () => {
        try {
            setIsLoading(true);
            const data = await synonymService.getAllSynonyms();
            setSynonyms(data);
        } catch (error) {
            console.error(error);
            showToast("فشل تحميل المرادفات", "error");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSynonyms();
    }, []);

    const confirmDelete = (id) => {
        setSynonymToDelete(id);
        setModalOpen(true);
    };

    const executeDelete = async () => {
        if (!synonymToDelete) return;
        try {
            setDeleting(true);
            await synonymService.deleteSynonym(synonymToDelete);
            showToast("تم الحذف بنجاح", "success");
            setModalOpen(false);
            setSynonymToDelete(null);
            fetchSynonyms(); // Refresh
        } catch (error) {
            showToast("فشل الحذف", "error");
        } finally {
            setDeleting(false);
        }
    };

    const handleEdit = (item) => {
        navigate("/admin/synonyms/add", { state: { synonym: item } });
    };

    const handleAdd = () => {
        navigate("/admin/synonyms/add");
    };

    // Filter
    const filteredSynonyms = synonyms.filter(item =>
        item.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.synonyms.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <section className="adm-section-panel">
            <header className="adm-section-inner-header">
                <div className="adm-section-icon">
                    <BookOpen size={22} />
                </div>
                <div className="adm-section-title-group">
                    <h2 className="adm-section-title">إدارة المرادفات</h2>
                    <p className="adm-section-subtitle">
                        إضافة وتحسين مجموعات المرادفات لرفع دقة نتائج البحث عبر المتجر.
                    </p>
                </div>
                <div className="adm-section-actions">
                    <button type="button" className="adm-btn primary" onClick={handleAdd}>
                        <Plus size={18} />
                        <span>إضافة جديد</span>
                    </button>
                    <button type="button" className="adm-btn outline" onClick={fetchSynonyms} disabled={isLoading}>
                        <RefreshCw size={18} className={isLoading ? "spin" : ""} />
                        <span>تحديث</span>
                    </button>
                </div>
            </header>

            <div className="adm-toolbar">
                <div className="adm-search-wrapper">
                    <Search size={16} className="adm-search-icon" />
                    <input
                        type="text"
                        className="adm-search-input"
                        placeholder="بحث عن كلمة أو مرادف..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="adm-table-wrapper">
                <table className="adm-table">
                    <thead>
                        <tr>
                            <th>الكلمة الأساسية</th>
                            <th>المرادفات</th>
                            <th>الملاحظات</th>
                            <th style={{ width: "140px" }}>الحالة</th>
                            <th style={{ width: "140px" }}>الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td colSpan="5">
                                    <div className="adm-loading" style={{ minHeight: '200px' }}>
                                        <RefreshCw size={24} className="spin" />
                                        <span>جاري التحميل...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : filteredSynonyms.length === 0 ? (
                            <tr>
                                <td colSpan="5">
                                    <div className="adm-empty-state">
                                        <div className="adm-empty-state-icon">
                                            <BookOpen size={32} />
                                        </div>
                                        <p>لا توجد سجلات مطابقة.</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filteredSynonyms.map((item) => (
                                <tr key={item._id}>
                                    <td>
                                        <div className="adm-table-main">
                                            <span className="adm-font-bold">{item.term}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="synonym-list">
                                            {item.synonyms.map((s, idx) => (
                                                <span key={idx} className="adm-pill sm primary-soft">
                                                    {s}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td>
                                        <span className="adm-text-soft">{item.notes || "—"}</span>
                                    </td>
                                    <td>
                                        <span className={`adm-status-chip ${item.isActive ? 'active' : 'inactive'}`}>
                                            <span className="adm-status-dot"></span>
                                            <span>{item.isActive ? "نشط" : "غير نشط"}</span>
                                        </span>
                                    </td>
                                    <td>
                                        <div className="adm-table-actions">
                                            <button
                                                type="button"
                                                className="adm-icon-btn primary"
                                                onClick={() => handleEdit(item)}
                                                title="تعديل"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                type="button"
                                                className="adm-icon-btn danger"
                                                onClick={() => confirmDelete(item._id)}
                                                title="حذف"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <AdminModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onConfirm={executeDelete}
                title="حذف المرادفات"
                confirmText="تأكيد الحذف"
                cancelText="إلغاء"
                type="danger"
                isConfirming={deleting}
            >
                <p>هل أنت متأكد من حذف مجموعة المرادفات هذه؟ لن يمكن التراجع عن هذا الإجراء.</p>
            </AdminModal>
        </section>
    );
}
