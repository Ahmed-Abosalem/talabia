// ────────────────────────────────────────────────
// 📁 frontend/src/pages/Buyer/Wallet/WalletPage.jsx
// صفحة المحفظة الإلكترونية — Premium v3.0
// ────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";
import {
    getWalletStatus,
    setupWallet,
    verifyWalletPin,
    getWalletDetails,
    requestDeposit,
    requestWithdrawal,
    getWalletTransactions,
    getDepositInfo,
    changeWalletPassword,
} from "@/services/walletService";
import { formatCurrency, formatNumber } from "@/utils/formatters";
import {
    Wallet,
    ArrowDownToLine,
    ArrowUpFromLine,
    History,
    KeyRound,
    ChevronDown,
    ArrowRight,
    Search,
    LogOut,
    CheckCircle2,
    Copy,
    LockKeyhole,
    PartyPopper,
    Landmark,
    Eye,
    EyeOff,
} from "lucide-react";
import "./WalletPage.css";

// ─── Label Maps ──────────────────────────────────
const TX_TYPE_LABELS = {
    deposit: "إيداع",
    withdrawal: "سحب",
    payment: "دفع",
    refund: "استرجاع",
};

const TX_STATUS_LABELS = {
    pending: "بانتظار المراجعة",
    completed: "مكتملة",
    rejected: "مرفوض",
};

const DOC_TYPES = ["هوية وطنية", "إقامة", "جواز سفر", "أخرى"];

// ═══════════════════════════════════════════════
// ProfessionalPinInput — حقل PIN احترافي موحد
// ═══════════════════════════════════════════════
function ProfessionalPinInput({
    value,
    onChange,
    onComplete,
    autoFocus = false,
    placeholder = "● ● ● ● ● ●",
}) {
    const inputRef = useRef(null);
    const [visible, setVisible] = useState(false);
    const PIN_LENGTH = 6;

    useEffect(() => {
        if (autoFocus && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 80);
        }
    }, [autoFocus]);

    const handleChange = (e) => {
        const raw = e.target.value.replace(/\D/g, "").slice(0, PIN_LENGTH);
        onChange(raw);
        if (raw.length === PIN_LENGTH) onComplete?.(raw);
    };

    const filledCount = value.length;

    return (
        <div className="wallet-pin-pro-wrapper">
            <input
                ref={inputRef}
                type={visible ? "text" : "password"}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={PIN_LENGTH}
                value={value}
                onChange={handleChange}
                placeholder={placeholder}
                className={`wallet-pin-pro-input ${value.length > 0 ? "pin-filled" : ""}`}
                autoComplete="one-time-code"
            />
            <button
                type="button"
                className="wallet-pin-pro-toggle"
                onClick={() => setVisible((v) => !v)}
                tabIndex={-1}
                aria-label={visible ? "إخفاء" : "إظهار"}
            >
                {visible ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
            {/* تقدم الإدخال */}
            <div className="wallet-pin-progress" aria-hidden="true">
                {Array.from({ length: PIN_LENGTH }).map((_, i) => (
                    <span
                        key={i}
                        className={`wallet-pin-dot ${i < filledCount ? "active" : ""}`}
                    />
                ))}
            </div>
        </div>
    );
}

// ─── Clipboard helper (mobile-safe) ─────────────
function copyText(text, onSuccess) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text)
            .then(onSuccess)
            .catch(() => fallbackCopy(text, onSuccess));
    } else {
        fallbackCopy(text, onSuccess);
    }
}

function fallbackCopy(text, onSuccess) {
    const el = document.createElement("textarea");
    el.value = text;
    el.style.cssText = "position:fixed;opacity:0;top:0;left:0";
    document.body.appendChild(el);
    el.focus();
    el.select();
    try { document.execCommand("copy"); onSuccess?.(); } catch { }
    document.body.removeChild(el);
}

// ─── Component Wrapper Helper ─────────────────────
function WrapIfSeller({ isSeller, children }) {
    if (!isSeller) return children;
    return (
        <div className="seller-section wallet-docked-immersion wallet-seller-scope">
            <div className="seller-layout-container">
                {children}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════
// WalletPage — Main Component
// ═══════════════════════════════════════════════
export default function WalletPage() {
    const { summary, isLoading } = useOutletContext() || {};
    const isSeller = !!summary; // Provided by SellerDashboard outlet context

    // ─── State ───────────────────────────────────
    const [view, setView] = useState("loading");
    const { showToast } = useApp();
    const { logout } = useAuth();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [walletData, setWalletData] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [depositInfo, setDepositInfo] = useState("");
    const [depositSuccess, setDepositSuccess] = useState("");

    // Setup form
    const [setupForm, setSetupForm] = useState({
        fullName: "",
        docType: DOC_TYPES[0],
        docNumber: "",
        whatsapp: "",
        pin: "",
        pinConfirm: "",
    });

    // Change password form
    const [changePwForm, setChangePwForm] = useState({
        oldPin: "",
        newPin: "",
        newPinConfirm: "",
    });

    // PIN entry
    const [pin, setPin] = useState("");

    // Deposit form
    const [depositForm, setDepositForm] = useState({
        senderName: "",
        transactionRef: "",
        amount: "",
    });

    // Withdraw form
    const [withdrawForm, setWithdrawForm] = useState({
        bankName: "",
        accountNumber: "",
        accountHolder: "",
        amount: "",
    });

    // ─── Initial Load ─────────────────────────────
    const checkWalletStatus = useCallback(async () => {
        try {
            setLoading(true);
            const { data } = await getWalletStatus();
            if (!data.exists) {
                setView("setup");
            } else {
                setWalletData({ fullName: data.fullName, status: data.status });
                setView("pin");
            }
        } catch (err) {
            const status = err?.response?.status;
            if (status === 401) {
                showToast("انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى", "error");
                logout();
                navigate("/login");
            } else {
                showToast(err?.response?.data?.message || "حدث خطأ في تحميل البيانات", "error");
                setView("pin");
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        checkWalletStatus();
    }, [checkWalletStatus]);

    // ─── Handlers ────────────────────────────────

    // 1️⃣ إنشاء المحفظة
    const handleSetup = async (e) => {
        e.preventDefault();

        if (
            !setupForm.fullName ||
            !setupForm.docType ||
            !setupForm.docNumber ||
            !setupForm.whatsapp ||
            !setupForm.pin
        ) {
            showToast("جميع الحقول مطلوبة", "error");
            return;
        }

        if (!/^\d{6}$/.test(setupForm.pin)) {
            showToast("كلمة مرور المحفظة يجب أن تكون 6 أرقام", "error");
            return;
        }

        if (setupForm.pin !== setupForm.pinConfirm) {
            showToast("كلمة المرور وتأكيدها غير متطابقتين", "error");
            return;
        }

        try {
            setLoading(true);
            const { data } = await setupWallet({
                fullName: setupForm.fullName,
                docType: setupForm.docType,
                docNumber: setupForm.docNumber,
                whatsapp: setupForm.whatsapp,
                pin: setupForm.pin,
            });
            showToast(data.message, "success");
            setView("success");
        } catch (err) {
            if (err?.response?.status === 401) {
                showToast("انتهت صلاحية الجلسة", "error");
                logout();
                navigate("/login");
            } else {
                showToast(err?.response?.data?.message || "فشل إنشاء المحفظة", "error");
            }
        } finally {
            setLoading(false);
        }
    };

    // 2️⃣ التحقق من كلمة المرور
    const handleVerifyPin = async (pinValue) => {
        const pinToVerify = pinValue || pin;
        if (!pinToVerify || pinToVerify.length !== 6) {
            showToast("كلمة المرور يجب أن تكون 6 أرقام", "error");
            return;
        }

        try {
            setLoading(true);
            const { data } = await verifyWalletPin(pinToVerify);
            setWalletData({
                walletNumber: data.walletNumber,
                balance: data.balance,
                fullName: data.fullName,
            });
            setPin("");
            setView("dashboard");
        } catch (err) {
            if (err?.response?.status === 401) {
                showToast("انتهت صلاحية الجلسة", "error");
                logout();
                navigate("/login");
            } else {
                showToast(err?.response?.data?.message || "كلمة مرور خاطئة", "error");
            }
        } finally {
            setLoading(false);
        }
    };

    // Refresh wallet details
    const refreshWallet = async () => {
        try {
            const { data } = await getWalletDetails();
            setWalletData((prev) => ({
                ...prev,
                balance: data.balance,
                walletNumber: data.walletNumber,
                fullName: data.fullName,
            }));
        } catch {
            // silent
        }
    };

    // 3️⃣ إيداع
    const handleDeposit = async (e) => {
        e.preventDefault();
        if (!depositForm.senderName || !depositForm.transactionRef || !depositForm.amount) {
            showToast("جميع الحقول مطلوبة", "error");
            return;
        }
        try {
            setLoading(true);
            const { data } = await requestDeposit(depositForm);
            setDepositSuccess(data.message);
            setDepositForm({ senderName: "", transactionRef: "", amount: "" });
        } catch (err) {
            if (err?.response?.status === 401) {
                showToast("انتهت صلاحية الجلسة", "error");
                logout();
                navigate("/login");
            } else {
                showToast(err?.response?.data?.message || "فشل إرسال طلب الإيداع", "error");
            }
        } finally {
            setLoading(false);
        }
    };

    // 4️⃣ سحب
    const handleWithdraw = async (e) => {
        e.preventDefault();
        if (!withdrawForm.bankName || !withdrawForm.accountNumber || !withdrawForm.accountHolder || !withdrawForm.amount) {
            showToast("جميع الحقول مطلوبة", "error");
            return;
        }
        try {
            setLoading(true);
            const { data } = await requestWithdrawal(withdrawForm);
            showToast(data.message, "success");
            setWithdrawForm({ bankName: "", accountNumber: "", accountHolder: "", amount: "" });
            setTimeout(() => setView("dashboard"), 2500);
        } catch (err) {
            if (err?.response?.status === 401) {
                showToast("انتهت صلاحية الجلسة", "error");
                logout();
                navigate("/login");
            } else {
                showToast(err?.response?.data?.message || "فشل إرسال طلب السحب", "error");
            }
        } finally {
            setLoading(false);
        }
    };

    // 5️⃣ سجل العمليات
    const loadTransactions = async () => {
        try {
            setLoading(true);
            const { data } = await getWalletTransactions();
            setTransactions(data);
            setView("transactions");
        } catch (err) {
            if (err?.response?.status === 401) {
                showToast("انتهت صلاحية الجلسة", "error");
                logout();
                navigate("/login");
            } else {
                showToast(err?.response?.data?.message || "فشل تحميل السجل", "error");
            }
        } finally {
            setLoading(false);
        }
    };

    // 6️⃣ خروج من المحفظة
    const handleLogout = () => {
        setWalletData(null);
        setPin("");
        setView("pin");
    };

    // 7️⃣ تغيير كلمة مرور المحفظة
    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (!changePwForm.oldPin || !changePwForm.newPin || !changePwForm.newPinConfirm) {
            showToast("جميع الحقول مطلوبة", "error");
            return;
        }
        if (!/^\d{6}$/.test(changePwForm.newPin)) {
            showToast("كلمة المرور الجديدة يجب أن تكون 6 أرقام", "error");
            return;
        }
        if (changePwForm.newPin !== changePwForm.newPinConfirm) {
            showToast("كلمة المرور الجديدة وتأكيدها غير متطابقتين", "error");
            return;
        }
        if (changePwForm.oldPin === changePwForm.newPin) {
            showToast("كلمة المرور الجديدة يجب أن تختلف عن الحالية", "error");
            return;
        }
        try {
            setLoading(true);
            const { data } = await changeWalletPassword(changePwForm.oldPin, changePwForm.newPin);
            showToast(data.message, "success");
            setChangePwForm({ oldPin: "", newPin: "", newPinConfirm: "" });
            setTimeout(() => setView("dashboard"), 2500);
        } catch (err) {
            if (err?.response?.status === 401) {
                showToast("انتهت صلاحية الجلسة", "error");
                logout();
                navigate("/login");
            } else {
                showToast(err?.response?.data?.message || "فشل تغيير كلمة المرور", "error");
            }
        } finally {
            setLoading(false);
        }
    };

    // ════════════════════════════════════════════════
    // RENDER: Loading
    // ════════════════════════════════════════════════
    if (view === "loading") {
        return (
            <div className={`wallet-page wallet-loading-container ${isSeller ? "seller-section wallet-docked-immersion wallet-seller-scope" : ""}`}>
                <div className={isSeller ? "seller-layout-container" : ""}>
                    <div className="wallet-loading-card">
                        <div className="wallet-icon-box icon-orange wallet-loading-icon" style={{ margin: "0 auto 1.5rem" }}>
                            <Wallet size={32} />
                        </div>
                        <div className="wallet-loading-text">جاري تحميل محفظتك...</div>
                        <div className="wallet-loading-bar">
                            <div className="wallet-loading-bar-fill" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }



    // ════════════════════════════════════════════════
    // RENDER: Setup
    // ════════════════════════════════════════════════
    if (view === "setup") {
        return (
            <WrapIfSeller isSeller={isSeller}>
                <div className="wallet-page">
                    <header className="adm-header wallet-top-header">
                        <div className="adm-header-inner">
                            <div className="adm-header-right">
                                <h1 className="adm-page-title">
                                    <Wallet size={24} />
                                    إعداد المحفظة الرقمية
                                </h1>
                            </div>
                        </div>
                    </header>
                    {!isSeller && <div className="wallet-header-spacer" />}

                    <div className="view-transition-wrapper">
                        <div className="wallet-content-wrapper">

                            <div className="wallet-setup-warning wallet-setup-warning--spaced">
                                <p>
                                    ⚠️ <strong>تنبيه هام:</strong> الاسم والبيانات الرسمية لا يمكن تعديلها بعد الحفظ،
                                    يرجى التأكد من صحتها تماماً.
                                </p>
                            </div>

                            <div className="wallet-card">
                                <div className="wallet-form-group">
                                    <label>الاسم كما في الوثيقة الرسمية</label>
                                    <input
                                        type="text"
                                        value={setupForm.fullName}
                                        onChange={(e) => setSetupForm({ ...setupForm, fullName: e.target.value })}
                                        placeholder="الاسم الكامل"
                                    />
                                </div>

                                <div className="wallet-form-group">
                                    <label>نوع الوثيقة</label>
                                    <select
                                        value={setupForm.docType}
                                        onChange={(e) => setSetupForm({ ...setupForm, docType: e.target.value })}
                                    >
                                        {DOC_TYPES.map((t) => (
                                            <option key={t} value={t}>{t}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="wallet-form-group">
                                    <label>رقم الوثيقة</label>
                                    <input
                                        type="text"
                                        value={setupForm.docNumber}
                                        onChange={(e) => setSetupForm({ ...setupForm, docNumber: e.target.value })}
                                        placeholder="رقم الهوية أو الإقامة أو الجواز"
                                    />
                                </div>

                                <div className="wallet-form-group">
                                    <label>رقم الواتساب</label>
                                    <input
                                        type="tel"
                                        value={setupForm.whatsapp}
                                        onChange={(e) => setSetupForm({ ...setupForm, whatsapp: e.target.value })}
                                        placeholder="05xxxxxxxx"
                                    />
                                </div>

                                <div className="wallet-form-group">
                                    <label>كلمة مرور المحفظة (6 أرقام)</label>
                                    <ProfessionalPinInput
                                        value={setupForm.pin}
                                        onChange={(val) => setSetupForm({ ...setupForm, pin: val })}
                                        placeholder="أدخل 6 أرقام"
                                    />
                                </div>

                                <div className="wallet-form-group">
                                    <label>تأكيد كلمة المرور</label>
                                    <ProfessionalPinInput
                                        value={setupForm.pinConfirm}
                                        onChange={(val) => setSetupForm({ ...setupForm, pinConfirm: val })}
                                        placeholder="أعد إدخال الرقم"
                                    />
                                </div>

                                <button
                                    type="button"
                                    onClick={handleSetup}
                                    className="wallet-submit-btn"
                                    disabled={loading}
                                >
                                    {loading ? "جارٍ إنشاء المحفظة..." : "تأكيد وإنشاء المحفظة"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </WrapIfSeller>
        );
    }

    // ════════════════════════════════════════════════
    // RENDER: Success
    // ════════════════════════════════════════════════
    if (view === "success") {
        return (
            <WrapIfSeller isSeller={isSeller}>
                <div className="wallet-page">
                    <div className="wallet-top-header">
                        <div className="wallet-header-content">
                            <h2>محفظتي</h2>
                        </div>
                    </div>
                    {!isSeller && <div className="wallet-header-spacer" />}
                    <div className="view-transition-wrapper">
                        <div className="wallet-content-wrapper">
                            <div className="wallet-pending wallet-success-entrance">
                                <div className="wallet-icon-box icon-orange wallet-icon-box--xl">
                                    <PartyPopper size={44} />
                                </div>
                                <h2>مبارك! تم إنشاء محفظتك بنجاح 🎉</h2>
                                <p>
                                    محفظتك الآن جاهزة للاستخدام. يمكنك البدء بإيداع الرصيد وإتمام
                                    عملياتك المالية بكل سهولة وأمان.
                                </p>
                                <button
                                    className="wallet-btn-primary wallet-success-cta"
                                    onClick={() => setView("pin")}
                                >
                                    ابدأ استكشاف محفظتك
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </WrapIfSeller>
        );
    }

    // ════════════════════════════════════════════════
    // RENDER: PIN Entry — Unified Verification Hub
    // ════════════════════════════════════════════════
    if (view === "pin") {
        return (
            <WrapIfSeller isSeller={isSeller}>
                <div className="wallet-page wallet-page--pin">
                    {/* Standard Sticky Header */}
                    <header className="adm-header wallet-top-header">
                        <div className="adm-header-inner">
                            <div className="adm-header-right">
                                <h1 className="adm-page-title">
                                    <Wallet size={22} />
                                    محفظتي
                                </h1>
                            </div>
                        </div>
                    </header>
                    {!isSeller && <div className="wallet-header-spacer" />}

                    <div className="view-transition-wrapper wallet-pin-scene">
                        <div className="wallet-pin-hub">
                            {/* Identity Shield Icon */}
                            <div className="wallet-pin-hub__icon-wrap">
                                <div className="wallet-pin-hub__icon-ring" />
                                <div className="wallet-pin-hub__icon-core wallet-pin-hub__icon-core--orange">
                                    <LockKeyhole size={28} />
                                </div>
                            </div>

                            {/* Title & Subtitle */}
                            <div className="wallet-pin-hub__text">
                                <h2 className="wallet-pin-hub__title">تأكيد الهوية</h2>
                                <p className="wallet-pin-hub__sub">
                                    أدخل رمز المحفظة المكوّن من 6 أرقام للمتابعة
                                </p>
                            </div>

                            {/* PIN Field */}
                            <div className="wallet-pin-hub__field">
                                <ProfessionalPinInput
                                    value={pin}
                                    onChange={setPin}
                                    onComplete={handleVerifyPin}
                                    autoFocus
                                    placeholder="● ● ● ● ● ●"
                                />
                            </div>

                            {/* CTA */}
                            <button
                                className="wallet-submit-btn wallet-pin-hub__cta"
                                onClick={() => handleVerifyPin(pin)}
                                disabled={loading || pin.length < 6}
                            >
                                {loading ? "جارٍ التحقق..." : "فتح المحفظة"}
                            </button>
                        </div>
                    </div>
                </div>
            </WrapIfSeller>
        );
    }


    // ════════════════════════════════════════════════
    // RENDER: Deposit
    // ════════════════════════════════════════════════
    if (view === "deposit") {
        return (
            <WrapIfSeller isSeller={isSeller}>
                <div className="wallet-page">
                    <header className="adm-header wallet-top-header">
                        <div className="adm-header-inner">
                            <div className="adm-header-right">
                                <button className="adm-btn-back" onClick={() => setView("dashboard")}>
                                    <ArrowRight size={20} />
                                </button>
                                <h1 className="adm-page-title">
                                    <ArrowDownToLine size={24} />
                                    إيداع رصيد
                                </h1>
                            </div>
                        </div>
                    </header>
                    {!isSeller && <div className="wallet-header-spacer" />}
                    <div className="view-transition-wrapper">
                        <div className="wallet-content-wrapper">
                            {depositSuccess ? (
                                <div className="wallet-card wallet-card--success wallet-success-entrance">
                                    <div className="wallet-icon-box icon-olive wallet-icon-box--lg">
                                        <CheckCircle2 size={40} />
                                    </div>
                                    <h3 className="wallet-deposit-success-title">تم إرسال طلب الإيداع</h3>
                                    <p className="wallet-deposit-success-msg">{depositSuccess}</p>
                                    <button
                                        className="wallet-btn-primary wallet-deposit-return-btn"
                                        onClick={() => {
                                            setDepositSuccess("");
                                            setView("dashboard");
                                            refreshWallet();
                                        }}
                                    >
                                        العودة للمحفظة
                                    </button>
                                </div>
                            ) : (
                                <div className="wallet-deposit-form-wrapper">
                                    <div className="wallet-setup-warning" style={{ marginTop: "1.25rem" }}>
                                        <p>للإيداع، يرجى التحويل لأحد حساباتنا أدناه ثم تعبئة النموذج ببيانات التحويل.</p>
                                    </div>

                                    <div className="wallet-card">
                                        <div className="wallet-bank-info">
                                            <div className="wallet-bank-info-title">
                                                <Landmark size={16} />
                                                <span>الحساب البنكي للإيداع</span>
                                            </div>
                                            {depositInfo ? (
                                                <div className="wallet-bank-card">
                                                    <button
                                                        className="wallet-bank-copy-btn"
                                                        onClick={() => {
                                                            const lines = depositInfo.split("\n");
                                                            const accountInfo = lines.length >= 2 ? lines[1] : depositInfo;
                                                            navigator.clipboard.writeText(accountInfo);
                                                            showToast("تم نسخ رقم الحساب", "success");
                                                        }}
                                                        title="نسخ رقم الحساب"
                                                    >
                                                        <Copy size={15} />
                                                    </button>
                                                    {(() => {
                                                        const lines = depositInfo.split("\n");
                                                        return (
                                                            <>
                                                                <div className="wallet-bank-name">{lines[0] || "حساب بنكي"}</div>
                                                                <div className="wallet-bank-account">{lines[1] || ""}</div>
                                                                {lines[2] && <div className="wallet-bank-holder">{lines[2]}</div>}
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            ) : (
                                                <p className="wallet-loading-text" style={{ fontSize: "0.85rem" }}>جاري تحميل البيانات...</p>
                                            )}
                                        </div>

                                        <div className="wallet-deposit-form-inner">
                                            <div className="wallet-form-group">
                                                <label>اسم المحوّل</label>
                                                <input
                                                    type="text"
                                                    value={depositForm.senderName}
                                                    onChange={(e) => setDepositForm({ ...depositForm, senderName: e.target.value })}
                                                    placeholder="الاسم كما يظهر في الحوالة"
                                                />
                                            </div>
                                            <div className="wallet-form-group">
                                                <label>رقم الحوالة / المرجع</label>
                                                <input
                                                    type="text"
                                                    value={depositForm.transactionRef}
                                                    onChange={(e) => setDepositForm({ ...depositForm, transactionRef: e.target.value })}
                                                    placeholder="أدخل رقم المرجع"
                                                />
                                            </div>
                                            <div className="wallet-form-group">
                                                <label>المبلغ (ريال)</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    step="0.01"
                                                    value={depositForm.amount}
                                                    onChange={(e) => setDepositForm({ ...depositForm, amount: e.target.value })}
                                                    placeholder="0.00"
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleDeposit}
                                                className="wallet-submit-btn"
                                                disabled={loading}
                                            >
                                                {loading ? "جارٍ الإرسال..." : "تأكيد طلب الإيداع"}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </WrapIfSeller>
        );
    }

    // ════════════════════════════════════════════════
    // RENDER: Withdraw
    // ════════════════════════════════════════════════
    if (view === "withdraw") {
        return (
            <WrapIfSeller isSeller={isSeller}>
                <div className="wallet-page">
                    <header className="adm-header wallet-top-header">
                        <div className="adm-header-inner">
                            <div className="adm-header-right">
                                <button className="adm-btn-back" onClick={() => setView("dashboard")}>
                                    <ArrowRight size={20} />
                                </button>
                                <h1 className="adm-page-title">
                                    <ArrowUpFromLine size={24} />
                                    سحب رصيد
                                </h1>
                            </div>
                        </div>
                    </header>
                    {!isSeller && <div className="wallet-header-spacer" />}
                    <div className="view-transition-wrapper">
                        <div className="wallet-content-wrapper">
                            <div className="wallet-card">
                                <div className="wallet-form-group">
                                    <label>اسم البنك</label>
                                    <input
                                        type="text"
                                        value={withdrawForm.bankName}
                                        onChange={(e) => setWithdrawForm({ ...withdrawForm, bankName: e.target.value })}
                                        placeholder="مثال: الراجحي، الأهلي"
                                    />
                                </div>
                                <div className="wallet-form-group">
                                    <label>رقم الحساب (IBAN)</label>
                                    <input
                                        type="text"
                                        value={withdrawForm.accountNumber}
                                        onChange={(e) => setWithdrawForm({ ...withdrawForm, accountNumber: e.target.value })}
                                        placeholder="SA..."
                                    />
                                </div>
                                <div className="wallet-form-group">
                                    <label>اسم صاحب الحساب</label>
                                    <input
                                        type="text"
                                        value={withdrawForm.accountHolder}
                                        onChange={(e) => setWithdrawForm({ ...withdrawForm, accountHolder: e.target.value })}
                                        placeholder="الاسم كما في البنك"
                                    />
                                </div>
                                <div className="wallet-form-group">
                                    <label>المبلغ المطلوب (ريال)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        step="0.01"
                                        max={walletData?.balance || 0}
                                        value={withdrawForm.amount}
                                        onChange={(e) => setWithdrawForm({ ...withdrawForm, amount: e.target.value })}
                                        placeholder="0.00"
                                    />
                                    <p className="wallet-field-hint">
                                        الرصيد المتاح: {walletData?.balance?.toFixed(2)} ريال
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleWithdraw}
                                    className="wallet-submit-btn"
                                    disabled={loading}
                                >
                                    {loading ? "جارٍ الإرسال..." : "إرسال طلب السحب"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </WrapIfSeller>
        );
    }

    // ════════════════════════════════════════════════
    // RENDER: Transactions Ledger
    // ════════════════════════════════════════════════
    if (view === "transactions") {
        return (
            <WrapIfSeller isSeller={isSeller}>
                <div className="wallet-page">
                    <header className="adm-header wallet-top-header">
                        <div className="adm-header-inner">
                            <div className="adm-header-right">
                                <button className="adm-btn-back" onClick={() => setView("dashboard")}>
                                    <ArrowRight size={20} />
                                </button>
                                <h1 className="adm-page-title">
                                    <History size={24} />
                                    سجل العمليات
                                </h1>
                            </div>
                        </div>
                    </header>
                    {!isSeller && <div className="wallet-header-spacer" />}
                    <div className="view-transition-wrapper">
                        <div className="wallet-content-wrapper">
                            {transactions.length === 0 ? (
                                <div className="wallet-ledger-container">
                                    <div className="wallet-empty-state">
                                        <div className="wallet-empty-icon">
                                            <History size={52} />
                                        </div>
                                        <h3>لا توجد عمليات بعد</h3>
                                        <p>لم تقم بأي عمليات مالية حتى الآن. ستظهر جميع الإيداعات والسحوبات هنا فور تنفيذها.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="wallet-ledger-container">
                                    <div className="wallet-ledger-title">سجل المعاملات</div>
                                    {transactions.map((tx) => (
                                        <div key={tx._id} className="wallet-ledger-item">
                                            <div
                                                className={`wallet-icon-box wallet-ledger-icon ${tx.direction === "credit" ? "icon-olive" : "icon-red"
                                                    }`}
                                            >
                                                {tx.direction === "credit"
                                                    ? <ArrowDownToLine size={18} />
                                                    : <ArrowUpFromLine size={18} />
                                                }
                                            </div>
                                            <div className="wallet-ledger-info">
                                                <span className="wallet-ledger-type">
                                                    {TX_TYPE_LABELS[tx.type] || tx.type}
                                                </span>
                                                <span className="wallet-ledger-date">
                                                    {new Date(tx.createdAt).toLocaleDateString("ar-SA", {
                                                        year: "numeric",
                                                        month: "short",
                                                        day: "numeric",
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    })}
                                                </span>
                                                <span className={`wallet-ledger-status ${tx.status}`}>
                                                    {TX_STATUS_LABELS[tx.status] || tx.status}
                                                </span>
                                            </div>
                                            <div className="wallet-ledger-amount-container">
                                                <div className={`wallet-ledger-amount ${tx.direction}`}>
                                                    {tx.direction === "credit" ? "+" : "−"}{tx.amount?.toFixed(2)}
                                                </div>
                                                {tx.status === "completed" && tx.balanceAfter !== undefined && (
                                                    <div className="wallet-ledger-balance-after">
                                                        {tx.balanceAfter?.toFixed(2)} ر.س
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </WrapIfSeller>
        );
    }

    // ════════════════════════════════════════════════
    // RENDER: Change Password
    // ════════════════════════════════════════════════
    if (view === "change-password") {
        return (
            <WrapIfSeller isSeller={isSeller}>
                <div className="wallet-page">
                    <header className="adm-header wallet-top-header">
                        <div className="adm-header-inner">
                            <div className="adm-header-right">
                                <button className="adm-btn-back" onClick={() => setView("dashboard")}>
                                    <ArrowRight size={20} />
                                </button>
                                <h1 className="adm-page-title">
                                    <KeyRound size={24} />
                                    تغيير كلمة المرور
                                </h1>
                            </div>
                        </div>
                    </header>
                    {!isSeller && <div className="wallet-header-spacer" />}
                    <div className="view-transition-wrapper">
                        <div className="wallet-content-wrapper">
                            <div className="wallet-card">
                                <div className="wallet-form-group">
                                    <label>كلمة المرور الحالية</label>
                                    <ProfessionalPinInput
                                        value={changePwForm.oldPin}
                                        onChange={(val) => setChangePwForm({ ...changePwForm, oldPin: val })}
                                        placeholder="● ● ● ● ● ●"
                                    />
                                </div>
                                <div className="wallet-form-group">
                                    <label>كلمة المرور الجديدة (6 أرقام)</label>
                                    <ProfessionalPinInput
                                        value={changePwForm.newPin}
                                        onChange={(val) => setChangePwForm({ ...changePwForm, newPin: val })}
                                        placeholder="● ● ● ● ● ●"
                                    />
                                </div>
                                <div className="wallet-form-group">
                                    <label>تأكيد كلمة المرور الجديدة</label>
                                    <ProfessionalPinInput
                                        value={changePwForm.newPinConfirm}
                                        onChange={(val) => setChangePwForm({ ...changePwForm, newPinConfirm: val })}
                                        placeholder="● ● ● ● ● ●"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={handleChangePassword}
                                    className="wallet-submit-btn"
                                    disabled={loading}
                                >
                                    {loading ? "جارٍ التغيير..." : "تحديث كلمة المرور"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </WrapIfSeller>
        );
    }

    // ════════════════════════════════════════════════
    // RENDER: Dashboard (default)
    // ════════════════════════════════════════════════
    return (
        <WrapIfSeller isSeller={isSeller}>
            <div className="wallet-page">
                <div className="wallet-top-header wallet-top-header--brand">
                    <div className="wallet-top-header--brand__inner">
                        <div className="wallet-top-header--brand__icon">
                            <Wallet size={18} />
                        </div>
                        <h1 className="wallet-top-header--brand__name">محفظتي</h1>
                    </div>
                </div>
                {!isSeller && <div className="wallet-header-spacer" />}
                <div className="view-transition-wrapper">
                    <div className="wallet-content-wrapper">

                        {/* ─── Balance Hero Card ─── */}
                        <div className="wallet-balance-card">
                            <div className="wallet-balance-label">الرصيد المتاح</div>
                            <div className="wallet-balance-amount">
                                {isSeller
                                    ? (isLoading ? "..." : ((summary?.lifetimeRevenue ?? 0) - (summary?.receivedBalance ?? 0))?.toFixed(2))
                                    : walletData?.balance?.toFixed(2) || "0.00"
                                }
                            </div>
                            <div className="wallet-balance-currency">ريال</div>
                            {walletData?.fullName && (
                                <div className="wallet-balance-name">{walletData.fullName}</div>
                            )}
                            <div
                                className="wallet-number-display"
                                title="انقر لنسخ رقم المحفظة"
                                onClick={() =>
                                    copyText(
                                        walletData?.walletNumber || "",
                                        () => showToast("تم نسخ رقم المحفظة", "success")
                                    )
                                }
                            >
                                {walletData?.walletNumber || ""}
                                <Copy size={13} className="wallet-copy-icon" />
                            </div>
                        </div>

                        {/* ─── Seller Financial Insights ─── */}
                        {isSeller && (
                            <div className={`seller-wallet-insights ${isLoading ? "is-loading" : ""}`}>
                                <div className="insight-item">
                                    <span className="insight-label">إجمالي الإيرادات</span>
                                    <span className="insight-value">{isLoading ? "..." : formatCurrency(summary?.totalRevenue || 0)}</span>
                                </div>
                                <div className="insight-divider" />
                                <div className="insight-item">
                                    <span className="insight-label">الرصيد المستلم</span>
                                    <span className="insight-value">{isLoading ? "..." : formatCurrency(summary?.receivedBalance || 0)}</span>
                                </div>
                            </div>
                        )}

                        {/* ─── Quick Actions ─── */}
                        <div className="wallet-actions">

                            {/* إيداع */}
                            <div className="wallet-action-item wallet-action-primary">
                                <button
                                    className="wallet-btn"
                                    onClick={async () => {
                                        try {
                                            const { data } = await getDepositInfo();
                                            setDepositInfo(data.depositInfo || "");
                                        } catch { }
                                        setView("deposit");
                                    }}
                                >
                                    <div className="wallet-icon-box">
                                        <ArrowDownToLine size={22} />
                                    </div>
                                </button>
                                <span className="wallet-action-label">إيداع</span>
                            </div>

                            {/* سحب */}
                            <div className="wallet-action-item wallet-action-primary">
                                <button
                                    className="wallet-btn"
                                    onClick={() => setView("withdraw")}
                                >
                                    <div className="wallet-icon-box">
                                        <ArrowUpFromLine size={22} />
                                    </div>
                                </button>
                                <span className="wallet-action-label">سحب</span>
                            </div>

                            {/* السجل */}
                            <div className="wallet-action-item">
                                <button
                                    className="wallet-btn"
                                    onClick={loadTransactions}
                                    disabled={loading}
                                >
                                    <div className="wallet-icon-box icon-orange">
                                        <History size={22} />
                                    </div>
                                </button>
                                <span className="wallet-action-label">السجل</span>
                            </div>

                            {/* الرمز */}
                            <div className="wallet-action-item">
                                <button
                                    className="wallet-btn"
                                    onClick={() => setView("change-password")}
                                >
                                    <div className="wallet-icon-box icon-olive">
                                        <KeyRound size={22} />
                                    </div>
                                </button>
                                <span className="wallet-action-label">الرمز</span>
                            </div>

                            {/* خروج */}
                            <div className="wallet-action-item wallet-action-danger">
                                <button
                                    className="wallet-btn"
                                    onClick={handleLogout}
                                >
                                    <div className="wallet-icon-box icon-red">
                                        <LogOut size={22} />
                                    </div>
                                </button>
                                <span className="wallet-action-label">خروج</span>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </WrapIfSeller>
    );
}
