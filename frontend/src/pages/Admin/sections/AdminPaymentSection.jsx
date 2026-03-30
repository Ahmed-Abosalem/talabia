// src/pages/Admin/sections/AdminPaymentSection.jsx
import { useEffect, useState, useMemo, useRef } from "react";
import {
    CreditCard,
    Banknote,
    Landmark,
    Wallet,
    Save,
    Info,
    RefreshCw,
    AlertTriangle,
    CheckCircle,
} from "lucide-react";
import "./AdminPaymentSection.css";
import BankTransfersTable from "./BankTransfersTable";

import {
    getAdminPaymentSettings,
    updateAdminPaymentSettings,
} from "@/services/adminService";
import { useApp } from "@/context/AppContext";

/**
 * قسم إدارة خيارات الدفع - واجهة المدير
 * يتميز بتصميم Matte احترافي مع حواف 8px ودعم كامل للاستجابة.
 */
export default function AdminPaymentSection() {
    const { showToast } = useApp() || {};

    // الحالة الأساسية للإعدادات
    const [settings, setSettings] = useState({
        cod: { enabled: true },
        card: { enabled: false },
        transfer: { enabled: false, bankInfo: "" },
        wallet: { enabled: false },
    });

    // حالات التحميل والإنتاجية
    const [loading, setLoading] = useState(true);
    const [togglingId, setTogglingId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [saveMsg, setSaveMsg] = useState({ type: "", text: "" });

    // مرجع لتتبع البيانات البنكية المحفوظة بالسيرفر
    const savedBankInfoRef = useRef("");

    const activeMethodsCount = useMemo(() => {
        return Object.values(settings).filter(s => s?.enabled).length;
    }, [settings]);

    // هل تغيرت بيانات البنك عن آخر حفظ؟
    const bankInfoChanged = (settings.transfer?.bankInfo || "") !== savedBankInfoRef.current;

    // جلب البيانات عند التفعيل
    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            setErrorMessage("");
            const data = await getAdminPaymentSettings();
            if (data?.settings) {
                setSettings(data.settings);
                savedBankInfoRef.current = data.settings?.transfer?.bankInfo || "";
            }
        } catch (err) {
            setErrorMessage("تعذر تحميل إعدادات الدفع. يرجى التحقق من الاتصال.");
        } finally {
            setLoading(false);
        }
    };

    /**
     * تبديل حالة وسيلة الدفع (تفعيل/إيقاف)
     * يتم الحفظ تلقائياً لسرعة الإنتاجية
     */
    const handleToggle = async (methodKey, nextEnabled) => {
        if (togglingId) return;

        // التحقق من وجود وسيلة واحدة على الأقل
        if (!nextEnabled) {
            const currentActive = Object.values(settings).filter(s => s.enabled).length;
            if (currentActive <= 1) {
                showToast?.("يجب الإبقاء على وسيلة دفع واحدة على الأقل مفعلة.", "error");
                return;
            }
        }

        const previousSettings = { ...settings };
        const updatedSettings = {
            ...settings,
            [methodKey]: { ...settings[methodKey], enabled: nextEnabled }
        };

        try {
            setTogglingId(methodKey);
            setSettings(updatedSettings); // التحديث المتفائل UI
            setSaveMsg({ type: "", text: "" });

            await updateAdminPaymentSettings(updatedSettings);
            showToast?.(`تم ${nextEnabled ? "تفعيل" : "إيقاف"} ${methodKey} بنجاح`, "success");
        } catch (err) {
            setSettings(previousSettings); // استعادة الحالة عند الخطأ
            showToast?.("فشل تحديث الإعدادات.", "error");
        } finally {
            setTogglingId(null);
        }
    };

    const handleBankInfoChange = (val) => {
        setSettings(prev => ({
            ...prev,
            transfer: { ...prev.transfer, bankInfo: val }
        }));
        setSaveMsg({ type: "", text: "" });
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            setSaveMsg({ type: "", text: "" });
            await updateAdminPaymentSettings(settings);
            savedBankInfoRef.current = settings.transfer?.bankInfo || "";
            setSaveMsg({ type: "success", text: "تم حفظ بيانات الحساب البنكي بنجاح ✅" });
            showToast?.("تم الحفظ بنجاح", "success");
        } catch (err) {
            setSaveMsg({ type: "error", text: "فشل الحفظ. حاول مجدداً." });
        } finally {
            setSaving(false);
        }
    };

    const methodDefs = [
        {
            key: "cod",
            label: "الدفع عند الاستلام",
            sub: "تحصيل نقدي عند تسليم الطلب",
            icon: <Banknote size={22} />,
        },
        {
            key: "card",
            label: "الدفع بالبطاقة",
            sub: "مدى، فيزا، وماستر كارد",
            icon: <CreditCard size={22} />,
        },
        {
            key: "transfer",
            label: "الحوالة البنكية",
            sub: "تحويل مباشر لحساب المتجر الرسمي",
            icon: <Landmark size={22} />,
        },
        {
            key: "wallet",
            label: "الدفع بالمحفظة",
            sub: "استخدام رصيد المحفظة المتاح",
            icon: <Wallet size={22} />,
        },
    ];

    if (loading) {
        return (
            <div className="admin-payment-section-page">
                <header className="adm-header">
                    <div className="adm-header-inner">
                        <div className="adm-header-right">
                            <div className="adm-section-icon sm"><CreditCard size={20} /></div>
                            <h1 className="adm-page-title">إدارة خيارات الدفع</h1>
                        </div>
                    </div>
                </header>
                <div className="adm-main-container">
                    <div className="adm-loading-box" style={{ padding: '60px', textAlign: 'center' }}>
                        <RefreshCw size={24} className="spin" style={{ color: 'var(--adm-primary)' }} />
                        <p style={{ marginTop: '12px', color: 'var(--adm-text-soft)' }}>جارٍ تحميل الإعدادات...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-payment-section-page">
            {/* 🏔️ COMPACT HEADER (Premium standard) */}
            <header className="adm-header">
                <div className="adm-header-inner">
                    <div className="adm-header-right">
                        <div className="adm-section-icon sm header-icon-fix">
                            <CreditCard size={20} />
                        </div>
                        <div className="adm-header-titles">
                            <h1 className="adm-page-title">إدارة خيارات الدفع</h1>
                            <div className="adm-header-meta">
                                <span className="adm-role-badge">المعاملات المالية</span>
                                <div className="adm-id-copy">
                                    <span className="adm-id-label">المفعّل:</span>
                                    <span className="adm-id-value">{activeMethodsCount}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="adm-header-left">
                        <button
                            type="button"
                            className="adm-btn ghost adm-mobile-hide"
                            onClick={fetchSettings}
                            disabled={loading}
                            title="تحديث"
                        >
                            <RefreshCw size={18} className={loading ? "spin" : ""} />
                        </button>
                    </div>
                </div>
            </header>

            <div className="adm-main-container">
                {errorMessage && (
                    <div className="adm-error-box animate-in" style={{ marginBottom: 'var(--sp-3)' }}>
                        <AlertTriangle size={18} />
                        <span>{errorMessage}</span>
                    </div>
                )}

                <div className="payment-section-wrapper">
                    {/* 1. Payment Methods Grid */}
                    <section className="payment-methods-grid">
                        {methodDefs.map((method) => {
                            const isEnabled = settings[method.key]?.enabled;
                            const isToggling = togglingId === method.key;
                            return (
                                <div
                                    key={method.key}
                                    className={`payment-method-card animate-in ${isEnabled ? "enabled" : ""}`}
                                >
                                    <div className="payment-method-left">
                                        <div className="payment-method-icon">
                                            {method.icon}
                                        </div>
                                        <div className="payment-method-info">
                                            <span className="payment-method-name">{method.label}</span>
                                            <span className="payment-method-subtext">{method.sub}</span>
                                            <div className={`payment-method-status-text ${isEnabled ? "on" : "off"}`}>
                                                <div className="adm-status-dot"></div>
                                                {isEnabled ? "نشطة حالياً" : "غير مفعلة"}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="payment-method-right">
                                        {isToggling ? (
                                            <div className="adm-loader-sm">
                                                <RefreshCw size={14} className="spin" />
                                            </div>
                                        ) : (
                                            <label className="toggle-switch">
                                                <input
                                                    type="checkbox"
                                                    checked={isEnabled}
                                                    onChange={() => handleToggle(method.key, !isEnabled)}
                                                />
                                                <span className="toggle-track"></span>
                                                <span className="toggle-thumb"></span>
                                            </label>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </section>

                    {/* 2. Bank Information Section (Conditional) */}
                    {settings.transfer?.enabled && (
                        <section className="payment-bank-info-section animate-in" style={{ marginTop: '1.5rem' }}>
                            <div className="payment-bank-info-label">
                                <Landmark size={18} style={{ color: "var(--adm-primary)" }} />
                                <span>بيانات الحساب البنكي للمتجر الرسمية</span>
                            </div>

                            <textarea
                                className="payment-bank-info-textarea"
                                value={settings.transfer?.bankInfo || ""}
                                onChange={(e) => handleBankInfoChange(e.target.value)}
                                placeholder={"اسم البنك:\nاسم الحساب:\nرقم الحساب:\nالآيبان:"}
                                rows={5}
                            />

                            <div className="payment-bank-info-hint">
                                <Info size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                                <span>يتم عرض هذه البيانات للعملاء الذين يختارون الدفع عبر الحوالة لتأكيد عملية الدفع لاحقاً.</span>
                            </div>

                            <div className="adm-actions-group no-border" style={{ justifyContent: 'flex-end', padding: 0, marginTop: '1rem' }}>
                                <button
                                    className="adm-btn primary"
                                    onClick={handleSave}
                                    disabled={saving || !bankInfoChanged}
                                >
                                    {saving ? <RefreshCw size={16} className="spin" /> : <Save size={16} />}
                                    <span>حفظ بيانات البنك</span>
                                </button>
                            </div>
                        </section>
                    )}

                    {/* 3. Global Save Feedback */}
                    {saveMsg.text && (
                        <div className={`adm-notice-box ${saveMsg.type === 'error' ? 'danger' : 'success'} animate-in`} style={{ marginTop: '1.5rem' }}>
                            <div className="adm-notice-icon">
                                {saveMsg.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle size={18} />}
                            </div>
                            <div className="adm-notice-content">{saveMsg.text}</div>
                        </div>
                    )}

                    {/* 4. Support Info */}
                    <div className="adm-notice-box info" style={{ marginTop: '1rem' }}>
                        <div className="adm-notice-icon"><Info size={18} /></div>
                        <div className="adm-notice-content">
                            يتم حفظ خيارات تفعيل طرق الدفع تلقائياً وبشكل فوري عند التبديل، بينما تتطلب بيانات الحوالة البنكية الحفظ اليدوي.
                        </div>
                    </div>
                </div>

                {/* 5. Bank Transfers Management Table */}
                <section className="adm-section-panel" style={{ marginTop: '3rem' }}>
                    <div className="adm-section-inner-header">
                        <div className="adm-section-icon"><Banknote size={20} /></div>
                        <div className="adm-section-title-group">
                            <h2 className="adm-section-title">سجل الحوالات البنكية</h2>
                            <p className="adm-section-subtitle">مراجعة وتأكيد طلبات الدفع عبر التحويل البنكي المباشر.</p>
                        </div>
                    </div>
                    <BankTransfersTable />
                </section>
            </div>
        </div>
    );
}
