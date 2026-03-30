// ────────────────────────────────────────────────
// 📁 frontend/src/pages/Admin/AdminWalletDetailsPage.jsx
// صفحة تفاصيل المحفظة — Tight-System Refactor
// Standard: adm-shared.css (Header-Body-Footer Architecture)
// ────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    ArrowRight,
    Wallet,
    Copy,
    User,
    RefreshCw,
    CheckCircle2,
    Ban,
    Unlock,
    KeyRound,
    ArrowDownCircle,
    ArrowUpCircle,
    CreditCard,
    RotateCcw,
    ClipboardList,
    History,
    Trash2,
    XCircle,
    AlertTriangle,
} from "lucide-react";
import {
    adminGetWalletById,
    adminGetWalletTransactions,
    adminGetWalletActionLogs,
    adminActivateWallet,
    adminSuspendWallet,
    adminReactivateWallet,
    adminChangeWalletPin,
    adminDeleteWallet,
    adminIssueManualTransaction,
} from "@/services/walletService";
import { formatCurrency } from "@/utils/currencyUtils";
import { useApp } from "@/context/AppContext";
import "./AdminWalletDetailsPage.css";

const STATUS_LABELS = {
    pending: "بانتظار المراجعة",
    active: "مفعّلة",
    locked: "مقفلة",
    suspended: "موقوفة",
    rejected: "مرفوض",
    completed: "مكتملة"
};

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

const formatDate = (value) => {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("ar-SA", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
};

export default function AdminWalletDetailsPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showToast } = useApp();

    // ═══════════ State ═══════════
    const [wallet, setWallet] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [actionLogs, setActionLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [tab, setTab] = useState("transactions");
    const [actionLoading, setActionLoading] = useState(false);

    const [deleteModal, setDeleteModal] = useState({ step: 0, inputNumber: "" });
    const [resetModal, setResetModal] = useState({ open: false, inputNumber: "" });

    const [manualTxModal, setManualTxModal] = useState({
        open: false,
        type: "deposit",
        amount: "",
        note: "",
        confirmStep: false
    });

    // ═══════════ Load Data ═══════════
    const loadWallet = useCallback(async () => {
        try {
            setLoading(true);
            setError("");
            const { data } = await adminGetWalletById(id);
            setWallet(data);
        } catch (err) {
            setError(err?.response?.data?.message || "تعذر تحميل بيانات المحفظة");
        } finally {
            setLoading(false);
        }
    }, [id]);

    const loadTransactions = useCallback(async () => {
        try {
            const { data } = await adminGetWalletTransactions(id);
            setTransactions(data);
        } catch {
            // silent
        }
    }, [id]);

    const loadActionLogs = useCallback(async () => {
        try {
            const { data } = await adminGetWalletActionLogs(id);
            setActionLogs(data);
        } catch {
            // silent
        }
    }, [id]);

    useEffect(() => {
        loadWallet();
        loadTransactions();
        loadActionLogs();
    }, [loadWallet, loadTransactions, loadActionLogs]);

    // 📏 Real-time Header Height Tracking (Universal Admin Standard)
    const headerRef = useRef(null);
    const [headerHeight, setHeaderHeight] = useState(0);

    /* 🛡️ SYSTEM GUARD: DYNAMIC DISPLACEMENT PROTOCOL */
    useEffect(() => {
        if (!headerRef.current) return;
        const observer = new ResizeObserver((entries) => {
            for (let entry of entries) {
                setHeaderHeight(entry.target.offsetHeight);
            }
        });

        observer.observe(headerRef.current);
        return () => observer.disconnect();
    }, []);

    // ═══════════ Actions ═══════════
    const doAction = async (actionFn, successMsg) => {
        try {
            setActionLoading(true);
            const { data } = await actionFn();
            showToast(data.message || successMsg, "success");
            loadWallet();
            if (data.newPin) {
                alert(`كلمة مرور المحفظة الجديدة: ${data.newPin}\nأرسلها للمستخدم عبر الواتساب.`);
            }
        } catch (err) {
            showToast(err?.response?.data?.message || "فشل تنفيذ العملية", "error");
        } finally {
            setActionLoading(false);
        }
    }

    const handleConfirmResetPin = async () => {
        if (resetModal.inputNumber.trim() !== wallet.walletNumber) {
            showToast("رقم المحفظة غير مطابق", "error");
            return;
        }

        try {
            setActionLoading(true);
            const { data } = await adminChangeWalletPin(wallet._id);
            showToast(data.message || "تم إعادة تعيين كلمة المرور", "success");
            loadWallet();
            setResetModal({ open: false, inputNumber: "" });
            if (data.newPin) {
                alert(`كلمة مرور المحفظة الجديدة لحساب (${wallet.metadata?.fullName}): ${data.newPin}\nأرسلها للمستخدم عبر الواتساب.`);
            }
        } catch (err) {
            showToast(err?.response?.data?.message || "فشل تنفيذ العملية", "error");
        } finally {
            setActionLoading(false);
        }
    };

    const copyToClipboard = (text, label) => {
        navigator.clipboard.writeText(text);
        showToast(`تم نسخ ${label}`, "success");
    };

    const handleDeleteWallet = async () => {
        try {
            setActionLoading(true);
            const { data } = await adminDeleteWallet(wallet._id, deleteModal.inputNumber);
            setDeleteModal({ step: 0, inputNumber: "" });
            showToast(data.message, "success");
            navigate("/admin?section=wallets");
        } catch (err) {
            showToast(err?.response?.data?.message || "فشل حذف المحفظة", "error");
            setDeleteModal({ step: 0, inputNumber: "" });
        } finally {
            setActionLoading(false);
        }
    };

    const handleManualTransaction = async () => {
        if (!manualTxModal.amount || Number(manualTxModal.amount) <= 0) {
            showToast("يرجى إدخال مبلغ صالح", "error");
            return;
        }
        if (!manualTxModal.note.trim()) {
            showToast("يجب إدخال سبب أو ملاحظة للعملية", "error");
            return;
        }

        try {
            setActionLoading(true);
            const { data } = await adminIssueManualTransaction(wallet._id, {
                amount: manualTxModal.amount,
                type: manualTxModal.type,
                note: manualTxModal.note
            });
            showToast(data.message, "success");
            setManualTxModal({ open: false, type: "deposit", amount: "", note: "", confirmStep: false });
            loadWallet();
            loadTransactions();
            loadActionLogs();
        } catch (err) {
            showToast(err?.response?.data?.message || "فشل إجراء العملية اليدوية", "error");
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="adm-loading">
                <RefreshCw size={28} className="spin" />
                <span>جاري تحميل بيانات المحفظة...</span>
            </div>
        );
    }

    if (error || !wallet) {
        return (
            <div className="adm-loading">
                <Wallet size={48} style={{ opacity: 0.3 }} />
                <h2>تعذر تحميل البيانات</h2>
                <button onClick={() => navigate("/admin?section=wallets")} className="adm-btn-mgmt sm outline">
                    <ArrowRight size={16} /> العودة
                </button>
            </div>
        );
    }

    return (
        <div
            className="adm-page-root admin-wallet-details-page"
            style={{ "--adm-header-height": `${headerHeight}px` }}
        >
            <header className="adm-header" ref={headerRef}>
                <div className="adm-header-inner">
                    <div className="adm-header-right">
                        <button onClick={() => navigate("/admin?section=wallets")} className="adm-btn-back">
                            <ArrowRight size={20} />
                        </button>
                        <div className="adm-header-titles">
                            <h1 className="adm-page-title">محفظة: {wallet.metadata?.fullName || "مستخدم غير مسجل"}</h1>
                            <div className="adm-header-meta">
                                <div className="adm-user-id-badge" onClick={() => copyToClipboard(wallet.walletNumber, "رقم المحفظة")}>
                                    <span className="adm-user-id-text monospace">{wallet.walletNumber}</span>
                                    <Copy size={10} style={{ marginLeft: 4 }} />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="adm-header-left">
                        <div className={`adm-status-chip ${wallet.status === 'active' ? 'active' : 'inactive'}`}>
                            <span className="adm-status-dot"></span>
                            <span>{STATUS_LABELS[wallet.status] || wallet.status}</span>
                        </div>
                    </div>
                </div>
            </header>

            <div className="adm-main-container">
                <main className="adm-details-grid">
                    <section className="adm-card span-8">
                        <div className="adm-card-header">
                            <User size={18} />
                            <h2>بيانات مالك المحفظة</h2>
                        </div>
                        <div className="adm-card-body">
                            <div className="adm-info-grid">
                                <div className="adm-info-point">
                                    <span className="label">الاسم الكامل</span>
                                    <span className="value">{wallet.metadata?.fullName || "—"}</span>
                                </div>
                                <div className="adm-info-point">
                                    <span className="label">رقم الهاتف</span>
                                    <span className="value monospace" dir="ltr">{wallet.metadata?.whatsapp || "—"}</span>
                                </div>
                                <div className="adm-info-point">
                                    <span className="label">نوع الوثيقة</span>
                                    <span className="value">{wallet.metadata?.docType || "—"}</span>
                                </div>
                                <div className="adm-info-point">
                                    <span className="label">رقم الوثيقة</span>
                                    <span className="value monospace">{wallet.metadata?.docNumber || "—"}</span>
                                </div>
                                <div className="adm-info-point">
                                    <span className="label">الحساب المرتبط</span>
                                    <span className="value">{wallet.buyer?.name || "—"}</span>
                                </div>
                                <div className="adm-info-point">
                                    <span className="label">تاريخ الإنشاء</span>
                                    <span className="value">{formatDate(wallet.createdAt)}</span>
                                </div>
                            </div>

                            <div className="adm-actions-group">
                                {wallet.status === "pending" && (
                                    <button className="adm-btn-mgmt success" onClick={() => doAction(() => adminActivateWallet(wallet._id), "تم تفعيل المحفظة")} disabled={actionLoading}>
                                        <CheckCircle2 size={16} /> تفعيل
                                    </button>
                                )}
                                {wallet.status === "active" && (
                                    <button className="adm-btn-mgmt warning" onClick={() => doAction(() => adminSuspendWallet(wallet._id), "تم إيقاف المحفظة")} disabled={actionLoading}>
                                        <Ban size={16} /> إيقاف مؤقت
                                    </button>
                                )}
                                {(wallet.status === "locked" || wallet.status === "suspended") && (
                                    <button className="adm-btn-mgmt primary" onClick={() => doAction(() => adminReactivateWallet(wallet._id), "تم إعادة التفعيل")} disabled={actionLoading}>
                                        <Unlock size={16} /> إلغاء الحظر
                                    </button>
                                )}
                                <button className="adm-btn-mgmt outline" onClick={() => setResetModal({ open: true, inputNumber: "" })} disabled={actionLoading}>
                                    <KeyRound size={16} /> إعادة تعيين رمز PIN
                                </button>
                                <button className="adm-btn-mgmt danger" onClick={() => setDeleteModal({ step: 1, inputNumber: "" })} disabled={actionLoading}>
                                    <Trash2 size={16} /> حذف
                                </button>
                            </div>
                        </div>
                    </section>

                    <section className="adm-card span-4">
                        <div className="adm-card-header">
                            <ArrowDownCircle size={18} />
                            <h2>الملخص المالي</h2>
                        </div>
                        <div className="adm-card-body">
                            <div className="adm-info-point" style={{ marginBottom: 'var(--sp-2)' }}>
                                <span className="label">الرصيد المتاح</span>
                                <span className="value" style={{ fontSize: '1.5rem', color: 'var(--adm-success)' }}>{formatCurrency(wallet.balance || 0)}</span>
                            </div>
                            <div className="adm-info-point">
                                <span className="label">إجمالي العمليات</span>
                                <span className="value">{transactions.length} تحويل</span>
                            </div>

                            <div style={{ marginTop: 'var(--sp-3)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-1)' }}>
                                <button className="adm-btn-mgmt success full-width" onClick={() => setManualTxModal({ open: true, type: 'deposit', amount: '', note: '', confirmStep: false })}>
                                    <ArrowDownCircle size={16} /> إيداع يدوي
                                </button>
                                <button className="adm-btn-mgmt danger full-width" onClick={() => setManualTxModal({ open: true, type: 'withdrawal', amount: '', note: '', confirmStep: false })}>
                                    <ArrowUpCircle size={16} /> سحب يدوي
                                </button>
                            </div>
                        </div>
                    </section>

                    <section className="adm-card span-12">
                        <div className="adm-tabs-nav">
                            <button className={`adm-tab-btn ${tab === "transactions" ? "active" : ""}`} onClick={() => setTab("transactions")}>
                                <ClipboardList size={16} /> سجل العمليات
                            </button>
                            <button className={`adm-tab-btn ${tab === "logs" ? "active" : ""}`} onClick={() => setTab("logs")}>
                                <History size={16} /> سجل الإجراءات
                            </button>
                        </div>
                        <div className="adm-card-body">
                            {tab === "transactions" ? (
                                <div className="adm-table-wrapper">
                                    <table className="adm-table">
                                        <thead>
                                            <tr>
                                                <th>المرجع</th>
                                                <th>النوع</th>
                                                <th>المبلغ</th>
                                                <th>الحالة</th>
                                                <th>التاريخ</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {transactions.map(tx => (
                                                <tr key={tx._id}>
                                                    <td className="monospace">{tx.reference}</td>
                                                    <td>{TX_TYPE_LABELS[tx.type] || tx.type}</td>
                                                    <td className={tx.type !== 'withdrawal' ? 'text-success font-bold' : 'text-danger font-bold'}>
                                                        {tx.type !== 'withdrawal' ? '+' : '-'}{formatCurrency(tx.amount)}
                                                    </td>
                                                    <td>
                                                        <span className={`adm-status-pill ${tx.status}`}>
                                                            <span className="adm-status-dot"></span>
                                                            {TX_STATUS_LABELS[tx.status]}
                                                        </span>
                                                    </td>
                                                    <td className="text-muted small">{formatDate(tx.createdAt)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="adm-log-list">
                                    {actionLogs.map(log => (
                                        <div key={log._id} className="adm-log-item" style={{ padding: 'var(--sp-1)', borderBottom: '1px solid var(--adm-border)' }}>
                                            <p style={{ margin: 0, fontWeight: 700 }}>{log.description}</p>
                                            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--adm-text-muted)' }}>
                                                {log.performedBy?.name || "النظام"} • {formatDate(log.createdAt)}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </section>
                </main>
            </div>

            {/* 🏔️ SHARED MODAL SYSTEM - DELETE */}
            {deleteModal.step > 0 && (
                <div className="adm-modal-backdrop" onClick={() => setDeleteModal({ step: 0, inputNumber: "" })}>
                    <div className="adm-modal narrow" onClick={e => e.stopPropagation()}>
                        <div className="adm-modal-header">
                            <div className="adm-modal-icon-wrapper danger">
                                <AlertTriangle size={32} />
                            </div>
                            <h3 className="adm-modal-title">حذف نهائي للمحفظة</h3>
                            {deleteModal.step > 1 && <div className="adm-modal-step-badge">الخطوة {deleteModal.step} من 3</div>}
                        </div>
                        <div className="adm-modal-body">
                            {deleteModal.step === 1 && (
                                <div className="adm-notice-box danger" style={{ margin: 0 }}>
                                    هذا الإجراء سيؤدي لمسح كافة بيانات المحفظة والسجلات المالية بشكل دائم.
                                </div>
                            )}
                            {deleteModal.step === 2 && (
                                <div style={{ textAlign: 'center' }}>
                                    <p className="text-muted mb-8">أدخل رقم المحفظة للتأكيد:</p>
                                    <p className="font-bold mb-16 monospace">{wallet?.walletNumber}</p>
                                    <input type="text" className="adm-form-input" value={deleteModal.inputNumber} onChange={e => setDeleteModal({ ...deleteModal, inputNumber: e.target.value })} autoFocus />
                                </div>
                            )}
                            {deleteModal.step === 3 && (
                                <p style={{ textAlign: 'center', fontWeight: 800, color: 'var(--adm-danger)' }}>تأكيد نهائي؟ لا يمكن التراجع.</p>
                            )}
                        </div>
                        <div className="adm-modal-footer">
                            {deleteModal.step === 1 && <button className="adm-btn-mgmt danger" onClick={() => setDeleteModal({ ...deleteModal, step: 2 })}>متابعة</button>}
                            {deleteModal.step === 2 && <button className="adm-btn-mgmt danger" onClick={() => deleteModal.inputNumber.trim() === wallet.walletNumber ? setDeleteModal({ ...deleteModal, step: 3 }) : showToast("الرقم غير مطابق", "error")}>تأكيد الرقم</button>}
                            {deleteModal.step === 3 && <button className="adm-btn-mgmt danger" onClick={handleDeleteWallet} disabled={actionLoading}>احذف الآن</button>}
                            <button className="adm-btn-mgmt outline" onClick={() => setDeleteModal({ step: 0, inputNumber: "" })}>إلغاء</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 🏔️ SHARED MODAL SYSTEM - RESET PIN */}
            {resetModal.open && (
                <div className="adm-modal-backdrop" onClick={() => setResetModal({ open: false, inputNumber: "" })}>
                    <div className="adm-modal narrow" onClick={e => e.stopPropagation()}>
                        <div className="adm-modal-header">
                            <div className="adm-modal-icon-wrapper">
                                <KeyRound size={32} />
                            </div>
                            <h3 className="adm-modal-title">إعادة تعيين رمز PIN للمحفظة</h3>
                        </div>
                        <div className="adm-modal-body">
                            <p style={{ textAlign: 'center', color: 'var(--adm-text-muted)' }}>أدخل رقم المحفظة للتحقق:</p>
                            <input type="text" className="adm-form-input monospace" value={resetModal.inputNumber} onChange={e => setResetModal({ ...resetModal, inputNumber: e.target.value })} placeholder={wallet?.walletNumber} autoFocus />
                        </div>
                        <div className="adm-modal-footer">
                            <button className="adm-btn-mgmt primary" onClick={handleConfirmResetPin} disabled={resetModal.inputNumber.trim() !== wallet?.walletNumber || actionLoading}>تم وبدء التوليد</button>
                            <button className="adm-btn-mgmt outline" onClick={() => setResetModal({ open: false, inputNumber: "" })}>إلغاء</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 🏔️ SHARED MODAL SYSTEM - MANUAL TX */}
            {manualTxModal.open && (
                <div className="adm-modal-backdrop" onClick={() => !actionLoading && setManualTxModal({ ...manualTxModal, open: false, confirmStep: false })}>
                    <div className="adm-modal" onClick={e => e.stopPropagation()}>
                        <div className="adm-modal-header">
                            <div className={`adm-modal-icon-wrapper ${manualTxModal.type === 'deposit' ? 'success' : 'danger'}`}>
                                {manualTxModal.type === 'deposit' ? <ArrowDownCircle size={32} /> : <ArrowUpCircle size={32} />}
                            </div>
                            <h3 className="adm-modal-title">{manualTxModal.type === 'deposit' ? 'إيداع رصيد يدوي' : 'سحب رصيد يدوي'}</h3>
                        </div>

                        {!manualTxModal.confirmStep ? (
                            <div className="adm-modal-body">
                                <div className="adm-form-group">
                                    <label className="adm-form-label">المبلغ المطلوب (ريال)</label>
                                    <input type="number" className="adm-form-input" value={manualTxModal.amount} onChange={e => setManualTxModal({ ...manualTxModal, amount: e.target.value })} autoFocus />
                                </div>
                                <div className="adm-form-group">
                                    <label className="adm-form-label">الملاحظات / سبب العملية</label>
                                    <textarea className="adm-form-textarea" rows={3} value={manualTxModal.note} onChange={e => setManualTxModal({ ...manualTxModal, note: e.target.value })} />
                                </div>
                            </div>
                        ) : (
                            <div className="adm-modal-body">
                                <div className="adm-notice-box" style={{ background: '#f8fafc', border: '1px solid var(--adm-border)', color: 'var(--adm-text-main)', textAlign: 'center' }}>
                                    <p style={{ margin: 0 }}>أنت بصدد إجراء عملية <strong>{manualTxModal.type === 'deposit' ? 'إيداع' : 'سحب'}</strong> بمبلغ:</p>
                                    <p style={{ fontSize: '1.5rem', fontWeight: 800, margin: '10px 0' }}>{formatCurrency(manualTxModal.amount)}</p>
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--adm-text-muted)' }}>{manualTxModal.note}</p>
                                </div>
                            </div>
                        )}

                        <div className="adm-modal-footer">
                            {!manualTxModal.confirmStep ? (
                                <button className={`adm-btn-mgmt ${manualTxModal.type === 'deposit' ? 'success' : 'danger'}`} disabled={!manualTxModal.amount || Number(manualTxModal.amount) <= 0 || !manualTxModal.note.trim()} onClick={() => setManualTxModal({ ...manualTxModal, confirmStep: true })}>متابعة</button>
                            ) : (
                                <button className={`adm-btn-mgmt ${manualTxModal.type === 'deposit' ? 'success' : 'danger'}`} onClick={handleManualTransaction} disabled={actionLoading}>تأكيد وتنفيذ</button>
                            )}
                            <button className="adm-btn-mgmt outline" onClick={() => setManualTxModal({ ...manualTxModal, open: false, confirmStep: false })}>إلغاء</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
