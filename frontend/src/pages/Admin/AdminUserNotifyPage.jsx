import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    Bell,
    User,
    Send,
    ArrowRight,
    AlertTriangle,
    RefreshCw,
} from "lucide-react";
import {
    createAdminNotification,
    getAdminUserDetails
} from "@/services/adminService";
import { useApp } from "@/context/AppContext";
import "./AdminUserNotifyPage.css";

export default function AdminUserNotifyPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showToast } = useApp() || {};

    const [targetUser, setTargetUser] = useState(null);
    const [loadingUser, setLoadingUser] = useState(true);

    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        fetchUserContext();
    }, [id]);

    async function fetchUserContext() {
        try {
            setLoadingUser(true);
            const res = await getAdminUserDetails(id);
            setTargetUser(res?.user || null);
        } catch (err) {
            console.error("Error fetching user for notification:", err);
            showToast?.("تعذر جلب بيانات المستخدم المستهدف.", "error");
        } finally {
            setLoadingUser(false);
        }
    }

    async function handleSend() {
        if (!targetUser) {
            setError("لم يتم تحديد المستخدم المستهدف.");
            return;
        }

        const trimmedTitle = title.trim();
        const trimmedMessage = message.trim();

        if (!trimmedTitle || !trimmedMessage) {
            setError("عنوان التنبيه ونص الرسالة حقول إلزامية.");
            return;
        }

        try {
            setLoading(true);
            setError("");

            await createAdminNotification({
                title: trimmedTitle,
                message: trimmedMessage,
                userId: targetUser._id,
            });

            showToast?.(`تم إرسال التنبيه إلى ${targetUser.name || "المستخدم"} بنجاح.`, "success");
            navigate("/admin?section=users");
        } catch (err) {
            const msg = err?.response?.data?.message || err?.message || "تعذر إرسال التنبيه لهذا المستخدم.";
            setError(msg);
            showToast?.(msg, "error");
        } finally {
            setLoading(false);
        }
    }

    if (loadingUser) {
        return (
            <div className="adm-loading">
                <RefreshCw size={24} className="spin" />
                <span>جاري التحقق من بيانات المستخدم...</span>
            </div>
        );
    }

    return (
        <div className="admin-user-notify-page">

            {/* 🏔️ الهيدر الزجاجي الرسمي (Golden Standard) */}
            <header className="adm-header">
                <div className="adm-header-inner">
                    <div className="adm-header-right">
                        <button
                            onClick={() => navigate("/admin?section=users")}
                            className="adm-btn-back"
                            title="العودة لإدارة المستخدمين"
                        >
                            <ArrowRight size={20} />
                        </button>
                        <div className="adm-header-titles">
                            <div className="adm-role-badge">إدارة المستخدمين</div>
                            <h1 className="adm-page-title">إرسال تنبيه خاص</h1>
                        </div>
                    </div>
                    {targetUser && (
                        <div className="adm-header-left">
                            <div className={`adm-status-chip ${targetUser.isActive !== false ? "active" : "inactive"}`}>
                                <span className="adm-status-dot"></span>
                                <span className="adm-status-text">
                                    {targetUser.isActive !== false ? "حساب نشط" : "حساب غير نشط"}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </header>

            {/* 📐 حاوية المحتوى الرئيسية */}
            <div className="adm-main-container">
                <div className="adm-details-grid">

                    {/* 👤 كرت 1: بيانات المستخدم المستهدف (4 أعمدة) */}
                    <aside className="adm-card adm-notify-target-card">
                        <div className="adm-card-header">
                            <User size={20} />
                            <h2>المستخدم المستهدف</h2>
                        </div>
                        <div className="adm-card-body">
                            <div className="adm-info-grid" style={{ gridTemplateColumns: "1fr" }}>
                                <div className="adm-info-point">
                                    <span className="label">الاسم الكامل</span>
                                    <span className="value">{targetUser?.name || "مستخدم طلبية"}</span>
                                </div>
                                <div className="adm-info-point">
                                    <span className="label">نوع الحساب</span>
                                    <span className="value">
                                        {targetUser?.role === "seller" ? "تاجر معتمد" : targetUser?.role === "shipper" ? "شركة شحن" : "مشتري"}
                                    </span>
                                </div>
                                <div className="adm-info-point">
                                    <span className="label">البريد الإلكتروني</span>
                                    <span className="value monospace">{targetUser?.email}</span>
                                </div>
                                <div className="adm-info-point">
                                    <span className="label">رقم الهاتف</span>
                                    <span className="value monospace">{targetUser?.phone || "لا يوجد"}</span>
                                </div>
                            </div>
                            <div className="adm-notify-info-box">
                                سيصل هذا التنبيه فوراً إلى مركز إشعارات المستخدم كمهمة تتطلب الانتباه.
                            </div>
                        </div>
                    </aside>

                    {/* 🔔 كرت 2: نموذج التنبيه (8 أعمدة) */}
                    <main className="adm-card adm-notify-form-card">
                        <div className="adm-card-header">
                            <Bell size={20} />
                            <h2>محتوى التنبيه</h2>
                        </div>
                        <div className="adm-card-body">
                            <div className="adm-info-grid" style={{ gridTemplateColumns: "1fr" }}>
                                <div className="adm-info-point">
                                    <label className="adm-form-label">عنوان التنبيه</label>
                                    <input
                                        type="text"
                                        placeholder="مثال: تحديث هام بخصوص حسابك..."
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        className="adm-form-input"
                                        disabled={loading}
                                    />
                                    <small className="adm-form-hint">اجعل العنوان قصيراً وواضحاً.</small>
                                </div>

                                <div className="adm-info-point">
                                    <label className="adm-form-label">نص الرسالة</label>
                                    <textarea
                                        rows={8}
                                        placeholder="اكتب هنا التفاصيل التي ترغب في إرسالها للمستخدم بشكل مفصل..."
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        className="adm-form-textarea"
                                        disabled={loading}
                                    />
                                </div>

                                {error && (
                                    <div className="adm-error-box">
                                        <AlertTriangle size={16} />
                                        <span>{error}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="adm-card-footer">
                            <button
                                className="adm-btn outline"
                                onClick={() => navigate("/admin?section=users")}
                                disabled={loading}
                            >
                                إلغاء
                            </button>
                            <button
                                className="adm-btn primary"
                                onClick={handleSend}
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <RefreshCw size={18} className="spin" />
                                        <span>جاري الإرسال...</span>
                                    </>
                                ) : (
                                    <>
                                        <Send size={18} />
                                        <span>إرسال التنبيه الآن</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </main>

                </div>
            </div>
        </div>
    );
}
