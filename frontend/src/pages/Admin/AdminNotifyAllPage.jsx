import React from "react";
import { useNavigate } from "react-router-dom";
import { Bell, ArrowRight, Send } from "lucide-react";
import "./adm-shared.css";

export default function AdminNotifyAllPage() {
    const navigate = useNavigate();

    return (
        <div className="adm-page-root">

            {/* 🏔️ الهيدر الزجاجي الرسمي */}
            <header className="adm-header">
                <div className="adm-header-inner">
                    <div className="adm-header-right">
                        <button
                            onClick={() => navigate("/admin")}
                            className="adm-btn-back"
                            title="العودة للوحة التحكم"
                        >
                            <ArrowRight size={20} />
                        </button>
                        <div className="adm-header-titles">
                            <div className="adm-role-badge">إدارة التنبيهات</div>
                            <h1 className="adm-page-title">إرسال تنبيه جماعي</h1>
                        </div>
                    </div>
                </div>
            </header>

            {/* 📐 حاوية المحتوى */}
            <div className="adm-main-container">
                <div className="adm-details-grid">

                    <div className="adm-card" style={{ gridColumn: "span 8" }}>
                        <div className="adm-card-header">
                            <Bell size={20} />
                            <h2>محتوى التنبيه الجماعي</h2>
                        </div>
                        <div className="adm-card-body">
                            <div className="adm-info-grid">
                                <div className="adm-info-point span-2">
                                    <label className="adm-form-label">عنوان التنبيه</label>
                                    <input className="adm-form-input" type="text" placeholder="عنوان مختصر وواضح" />
                                </div>
                                <div className="adm-info-point">
                                    <label className="adm-form-label">الفئة المستهدفة</label>
                                    <select className="adm-form-select">
                                        <option value="all">الكل</option>
                                        <option value="buyers">المشترون</option>
                                        <option value="sellers">البائعون</option>
                                        <option value="shipper">شركات الشحن</option>
                                        <option value="admins">المشرفون</option>
                                    </select>
                                </div>
                                <div className="adm-info-point">
                                    <label className="adm-form-label">وقت الإرسال</label>
                                    <select className="adm-form-select">
                                        <option value="now">الآن</option>
                                        <option value="schedule">مجدول</option>
                                    </select>
                                </div>
                                <div className="adm-info-point span-2">
                                    <label className="adm-form-label">تاريخ/وقت الجدولة (عند الحاجة)</label>
                                    <input className="adm-form-input" type="datetime-local" />
                                </div>
                                <div className="adm-info-point span-2">
                                    <label className="adm-form-label">نص التنبيه</label>
                                    <textarea
                                        className="adm-form-textarea"
                                        rows={6}
                                        placeholder="محتوى التنبيه المراد إرساله..."
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="adm-card-footer">
                            <button
                                type="button"
                                className="adm-btn outline"
                                onClick={() => navigate("/admin")}
                            >
                                إلغاء
                            </button>
                            <button type="button" className="adm-btn primary">
                                <Send size={18} />
                                إرسال التنبيه
                            </button>
                        </div>
                    </div>

                    <div className="adm-card" style={{ gridColumn: "span 4" }}>
                        <div className="adm-card-header">
                            <h2>نطاق الإرسال</h2>
                        </div>
                        <div className="adm-card-body">
                            <div className="adm-notice-box">
                                <p style={{ margin: 0, lineHeight: 1.7 }}>
                                    سيصل التنبيه لجميع المستخدمين في الفئة المحددة.
                                    تأكد من المحتوى قبل الإرسال، لأنه لا يمكن التراجع عنه.
                                </p>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
