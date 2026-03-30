import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Save, AlertCircle, ArrowRight, BookOpen } from "lucide-react";
import synonymService from "@/services/synonymService";
import { useApp } from "@/context/AppContext";
import "./adm-shared.css";

export default function AdminAddSynonymPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { showToast } = useApp();
    const initialData = location.state?.synonym;

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const [formData, setFormData] = useState({
        term: "",
        synonyms: "", // comma separated string for input
        notes: ""
    });

    useEffect(() => {
        setError("");
        if (initialData) {
            setFormData({
                term: initialData.term,
                synonyms: initialData.synonyms.join(", "),
                notes: initialData.notes || ""
            });
        }
    }, [initialData]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            // Convert comma separated string back to array and clean
            const synonymsArray = formData.synonyms
                .split(/,|،/)
                .map(s => s.trim())
                .filter(s => s.length > 0);

            if (synonymsArray.length === 0) {
                throw new Error("يجب إدخال مرادف واحد على الأقل");
            }

            const payload = {
                term: formData.term,
                synonyms: synonymsArray,
                notes: formData.notes
            };

            if (initialData) {
                await synonymService.updateSynonym(initialData._id, payload);
                if (showToast) showToast("تم تحديث المرادفات بنجاح", "success");
            } else {
                await synonymService.createSynonym(payload);
                if (showToast) showToast("تم إضافة المرادفات بنجاح", "success");
            }

            navigate("/admin?section=synonyms");
        } catch (err) {
            setError(err.response?.data?.message || err.message || "حدث خطأ ما");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="adm-page-root">
            <header className="adm-header">
                <div className="adm-header-inner">
                    <div className="adm-header-right">
                        <button
                            onClick={() => navigate("/admin?section=synonyms")}
                            className="adm-btn-back"
                            title="العودة للمرادفات"
                            type="button"
                        >
                            <ArrowRight size={20} />
                        </button>
                        <div className="adm-header-titles">
                            <div className="adm-role-badge">إدارة المرادفات</div>
                            <h1 className="adm-page-title">{initialData ? "تعديل المرادفات" : "إضافة مرادفات جديدة"}</h1>
                        </div>
                    </div>
                </div>
            </header>

            <div className="adm-main-container">
                <form className="adm-details-grid" onSubmit={handleSubmit}>
                    <div className="adm-card shadow-lg adm-syn-form-col-8">
                        <div className="adm-card-header">
                            <BookOpen size={20} />
                            <h2>بيانات المرادف الأساسية</h2>
                        </div>
                        <div className="adm-card-body">
                            {error && (
                                <div className="adm-error-box" style={{ marginBottom: "1rem" }}>
                                    <AlertCircle size={18} />
                                    <span>{error}</span>
                                </div>
                            )}

                            <div className="adm-info-grid" style={{ gridTemplateColumns: "1fr" }}>
                                <div className="adm-info-point">
                                    <label className="adm-form-label">الكلمة الأساسية (مثل: جوال)</label>
                                    <input
                                        type="text"
                                        className="adm-form-input"
                                        value={formData.term}
                                        onChange={(e) => setFormData({ ...formData, term: e.target.value })}
                                        required
                                        placeholder="الكلمة الأصلية التي يبحث عنها الناس"
                                    />
                                </div>

                                <div className="adm-info-point">
                                    <label className="adm-form-label">المرادفات (افصل بينها بفاصلة)</label>
                                    <textarea
                                        className="adm-form-textarea"
                                        value={formData.synonyms}
                                        onChange={(e) => setFormData({ ...formData, synonyms: e.target.value })}
                                        required
                                        placeholder="مثال: هاتف، موبايل، smart phone"
                                        rows={3}
                                    />
                                    <span className="adm-form-hint">سيقوم النظام بالبحث عن كل هذه الكلمات عند البحث عن الكلمة الأساسية والعكس.</span>
                                </div>

                                <div className="adm-info-point">
                                    <label className="adm-form-label">ملاحظات (اختياري)</label>
                                    <input
                                        type="text"
                                        className="adm-form-input"
                                        value={formData.notes}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                        placeholder="أي ملاحظات للإدارة"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="adm-card-footer" style={{ borderTop: "1px solid var(--adm-border)", paddingTop: "1rem", flexWrap: "wrap", gap: "10px" }}>
                            <button
                                type="button"
                                className="adm-btn-mgmt outline"
                                onClick={() => navigate("/admin?section=synonyms")}
                                disabled={isLoading}
                                style={{ flex: 1, justifyContent: "center" }}
                            >
                                إلغاء
                            </button>
                            <button
                                type="submit"
                                className="adm-btn-mgmt primary"
                                disabled={isLoading}
                                style={{ flex: 1, justifyContent: "center" }}
                            >
                                {isLoading ? "جاري الحفظ..." : (
                                    <>
                                        <Save size={18} />
                                        <span>{initialData ? "حفظ التعديلات" : "إضافة المرادفات"}</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="adm-card shadow-lg adm-syn-form-col-4" style={{ alignSelf: "start" }}>
                        <div className="adm-card-header">
                            <AlertCircle size={20} />
                            <h2>تعليمات الهيكلة</h2>
                        </div>
                        <div className="adm-card-body">
                            <div className="adm-notice-box">
                                <p style={{ margin: 0, lineHeight: 1.7 }}>
                                    • أدخل الكلمة التي يُتوقع أن يبحث بها العميل بكثرة.<br />
                                    • المرادفات تفصل بفاصلة وتتضمن أخطاء إملائية شائعة أو لغات أخرى.<br />
                                    • النظام يبحث بشكل عكسي، فإدخال المرادف كبحث سيظهر نفس نتائج الكلمة الأساسية.
                                </p>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
