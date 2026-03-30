// ────────────────────────────────────────────────
// 📁 frontend/src/pages/Admin/sections/AdminWalletSection.jsx
// إدارة المحافظ الإلكترونية (لوحة المدير) - Tight-System Refactor
// Standard: adm-shared.css (Header-Body-Footer Architecture)
// ────────────────────────────────────────────────

import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
    Wallet,
    RefreshCw,
    CheckCircle2,
    XCircle,
    Ban,
    Unlock,
    KeyRound,
    ClipboardList,
    Trash2,
    Save,
    Copy,
    AlertTriangle,
    Activity,
    Search,
    Eye,
} from "lucide-react";
import {
    adminListWallets,
    adminActivateWallet,
    adminSuspendWallet,
    adminReactivateWallet,
    adminChangeWalletPin,
    adminApproveDeposit,
    adminRejectDeposit,
    adminApproveWithdrawal,
    adminRejectWithdrawal,
    adminGetAllWalletTransactions,
    adminGetWalletSettings,
    adminDeleteWallet,
    adminUpdateWalletSettings,
} from "@/services/walletService";
import { formatCurrency } from "@/utils/currencyUtils";
import { useApp } from "@/context/AppContext";
import "./AdminWalletSection.css";

const STATUS_LABELS = {
    pending: "بانتظار المراجعة",
    active: "مفعّلة / نشطة",
    locked: "مقفلة",
    suspended: "موقوفة",
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

const formatDate = (d) => {
    if (!d) return "—";
    const date = new Date(d);
    if (isNaN(date.getTime())) return "—";
    return date.toLocaleDateString("ar-SA", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
};

export default function AdminWalletSection() {
    const navigate = useNavigate();
    const { showToast } = useApp();

    // ═══════════ State ═══════════
    const [tab, setTab] = useState("wallets"); 
    const [wallets, setWallets] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState("");
    const [txFilter, setTxFilter] = useState({ status: "", type: "" });
    const [settings, setSettings] = useState({
        walletDailyPaymentLimit: 30,
        walletDepositInfo: "",
    });
    const [search, setSearch] = useState("");
    const [txSearch, setTxSearch] = useState("");

    const filteredTransactions = useMemo(() => {
        return transactions.filter(tx => {
            const matchesType = !txFilter.type || tx.type === txFilter.type;
            const matchesStatus = !txFilter.status || tx.status === txFilter.status;
            const matchesSearch = !txSearch.trim() || 
                (tx.reference || "").toLowerCase().includes(txSearch.toLowerCase()) ||
                (tx.wallet?.metadata?.fullName || "").toLowerCase().includes(txSearch.toLowerCase());
            return matchesType && matchesStatus && matchesSearch;
        });
    }, [transactions, txFilter, txSearch]);

    const totalBalance = useMemo(() => {
        return wallets.reduce((sum, w) => sum + (w.balance || 0), 0);
    }, [wallets]);

    const [deleteModal, setDeleteModal] = useState({ step: 0, wallet: null, inputNumber: "" });
    const [resetModal, setResetModal] = useState({ open: false, wallet: null, inputNumber: "" });

    // ═══════════ Load Data ═══════════
    const loadWallets = useCallback(async () => {
        try {
            setLoading(true);
            const { data } = await adminListWallets(statusFilter || undefined);
            setWallets(data);
        } catch (err) {
            showToast(err?.response?.data?.message || "فشل تحميل المحافظ", "error");
        } finally {
            setLoading(false);
        }
    }, [statusFilter, showToast]);

    const loadTransactions = useCallback(async () => {
        try {
            setLoading(true);
            const { data } = await adminGetAllWalletTransactions(txFilter);
            setTransactions(data);
        } catch (err) {
            showToast(err?.response?.data?.message || "فشل تحميل العمليات", "error");
        } finally {
            setLoading(false);
        }
    }, [txFilter, showToast]);

    const loadSettings = useCallback(async () => {
        try {
            const { data } = await adminGetWalletSettings();
            setSettings(data);
        } catch {
            // silent
        }
    }, []);

    useEffect(() => {
        if (tab === "wallets") loadWallets();
        if (tab === "transactions") loadTransactions();
        if (tab === "settings") loadSettings();
    }, [tab, loadWallets, loadTransactions, loadSettings]);

    // ═══════════ Actions ═══════════
    const doAction = async (actionFn, successMsg) => {
        try {
            setLoading(true);
            const { data } = await actionFn();
            showToast(data.message || successMsg, "success");
            loadWallets();
            if (data.newPin) {
                alert(`كلمة مرور المحفظة الجديدة: ${data.newPin}\nأرسلها للمشتري عبر الواتساب.`);
            }
        } catch (err) {
            showToast(err?.response?.data?.message || "فشل تنفيذ العملية", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleActivate = (id) => doAction(() => adminActivateWallet(id), "تم تفعيل المحفظة");
    const handleSuspend = (id) => doAction(() => adminSuspendWallet(id), "تم إيقاف المحفظة");
    const handleReactivate = (id) => doAction(() => adminReactivateWallet(id), "تم إعادة تفعيل المحفظة");

    const handleConfirmResetPin = async () => {
        if (!resetModal.wallet) return;
        if (resetModal.inputNumber.trim() !== resetModal.wallet.walletNumber) {
            showToast("رقم المحفظة غير مطابق", "error");
            return;
        }

        try {
            setLoading(true);
            const { data } = await adminChangeWalletPin(resetModal.wallet._id);
            showToast(data.message || "تم إعادة تعيين كلمة المرور", "success");
            loadWallets();
            setResetModal({ open: false, wallet: null, inputNumber: "" });
            if (data.newPin) {
                alert(`كلمة مرور المحفظة الجديدة لحساب (${resetModal.wallet.metadata?.fullName}): ${data.newPin}\nأرسلها للمستخدم عبر الواتساب.`);
            }
        } catch (err) {
            showToast(err?.response?.data?.message || "فشل تنفيذ العملية", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleApproveDeposit = (txId, claimedAmount) => {
        const enteredAmount = prompt(
            `المشتري يدّعي إيداع ${claimedAmount} ريال.\nأدخل المبلغ الفعلي المودع:`
        );
        if (enteredAmount === null) return;
        const num = Number(enteredAmount);
        if (!num || num <= 0) {
            showToast("يجب إدخال مبلغ صحيح أكبر من صفر", "error");
            return;
        }
        if (!window.confirm(`هل تؤكد إيداع ${num} ريال في محفظة المشتري؟`)) return;
        doAction(() => adminApproveDeposit(txId, num), "تم تأكيد الإيداع");
    };
    const handleRejectDeposit = (txId) => doAction(() => adminRejectDeposit(txId), "تم رفض الإيداع");
    const handleApproveWithdrawal = (txId) => doAction(() => adminApproveWithdrawal(txId), "تم تأكيد السحب");
    const handleRejectWithdrawal = (txId) => doAction(() => adminRejectWithdrawal(txId), "تم رفض السحب");

    const handleSaveSettings = async () => {
        try {
            setLoading(true);
            await adminUpdateWalletSettings(settings);
            showToast("تم حفظ الإعدادات بنجاح", "success");
        } catch (err) {
            showToast(err?.response?.data?.message || "فشل حفظ الإعدادات", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteWallet = async () => {
        try {
            setLoading(true);
            const { data } = await adminDeleteWallet(deleteModal.wallet._id, deleteModal.inputNumber);
            showToast(data.message, "success");
            setDeleteModal({ step: 0, wallet: null, inputNumber: "" });
            loadWallets();
        } catch (err) {
            showToast(err?.response?.data?.message || "فشل حذف المحفظة", "error");
            setDeleteModal({ step: 0, wallet: null, inputNumber: "" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="adm-section-panel admin-wallet-section">
            <div className="adm-section-inner-header">
                <div className="adm-section-icon"><Wallet size={20} /></div>
                <div className="adm-section-title-group">
                    <div className="adm-section-title">إدارة المحافظ الإلكترونية</div>
                    <div className="adm-section-subtitle">مراقبة الأرصدة، تفعيل المحافظ، ومعالجة العمليات المالية.</div>
                </div>
                <div className="adm-section-actions">
                    <button type="button" className="adm-btn-mgmt sm outline" onClick={() => tab === "wallets" ? loadWallets() : tab === "transactions" ? loadTransactions() : loadSettings()} disabled={loading}>
                        <RefreshCw size={14} className={loading ? "spin" : ""} />
                        <span>تحديث</span>
                    </button>
                </div>
            </div>

            <div className="adm-tabs-nav">
                {[
                    { id: "wallets", label: "المحافظ", icon: <Wallet size={16} /> },
                    { id: "transactions", label: "سجل العمليات", icon: <ClipboardList size={16} /> },
                    { id: "settings", label: "الإعدادات", icon: <Save size={16} /> },
                ].map((t) => (
                    <button key={t.id} className={`adm-tab-btn ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>
                        {t.icon}
                        <span>{t.label}</span>
                    </button>
                ))}
            </div>

            {tab === "wallets" && (
                <>
                    <div className="adm-toolbar">
                        <div className="adm-search-wrapper">
                            <Search size={16} className="adm-search-icon" />
                            <input type="text" className="adm-search-input" placeholder="بحث باسم المالك أو رقم المحفظة..." value={search} onChange={(e) => setSearch(e.target.value)} />
                        </div>
                        <div className="adm-stat-mini">
                            <div className="adm-stat-mini-icon"><Wallet size={16} /></div>
                            <div>
                                <div className="adm-stat-mini-label">المحافظ</div>
                                <div className="adm-stat-mini-value">{wallets.length}</div>
                            </div>
                        </div>

                        <div className="adm-stat-mini orange-pill">
                            <div className="adm-stat-mini-icon accent"><Activity size={16} /></div>
                            <div>
                                <div className="adm-stat-mini-label">إجمالي السيولة</div>
                                <div className="adm-stat-mini-value">{formatCurrency(totalBalance)}</div>
                            </div>
                        </div>
                        <div className="adm-filter-group">
                            <select className="adm-filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                                <option value="">جميع الحالات</option>
                                {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="adm-table-wrapper">
                        <table className="adm-table">
                            <thead>
                                <tr>
                                    <th>المستخدم</th>
                                    <th>رقم المحفظة</th>
                                    <th>الرصيد المتاح</th>
                                    <th>الحالة</th>
                                    <th>إجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {wallets
                                    .filter(w => {
                                        if (!search.trim()) return true;
                                        const q = search.toLowerCase();
                                        return (w.metadata?.fullName || "").toLowerCase().includes(q) || (w.walletNumber || "").toLowerCase().includes(q);
                                    })
                                    .map((w) => (
                                        <tr key={w._id}>
                                            <td>
                                                <div className="adm-user-name">{w.metadata?.fullName || "غير مسجل"}</div>
                                                <div className="adm-user-id-badge" style={{ marginTop: 4 }}>
                                                    <span className="adm-user-id-text">{w._id}</span>
                                                </div>
                                            </td>
                                            <td className="monospace">{w.walletNumber}</td>
                                            <td className="text-success font-bold">{formatCurrency(w.balance || 0)}</td>
                                            <td>
                                                <span className={`adm-status-pill ${w.status}`}>
                                                    <span className="adm-status-dot"></span>
                                                    {STATUS_LABELS[w.status]}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="adm-actions-row">
                                                    <button className="adm-icon-btn primary" onClick={() => navigate(`/admin/wallets/details/${w._id}`)} title="عرض">
                                                        <Eye size={14} />
                                                    </button>
                                                    {w.status === "pending" && (
                                                        <button className="adm-icon-btn success" onClick={() => handleActivate(w._id)} title="تفعيل">
                                                            <CheckCircle2 size={14} />
                                                        </button>
                                                    )}
                                                    {w.status === "active" && (
                                                        <button className="adm-icon-btn warning" onClick={() => handleSuspend(w._id)} title="إيقاف">
                                                            <Ban size={14} />
                                                        </button>
                                                    )}
                                                    {(w.status === "locked" || w.status === "suspended") && (
                                                        <button className="adm-icon-btn success" onClick={() => handleReactivate(w._id)} title="فك حظر">
                                                            <Unlock size={14} />
                                                        </button>
                                                    )}
                                                    <button className="adm-icon-btn accent" onClick={() => setResetModal({ open: true, wallet: w, inputNumber: "" })} title="PIN">
                                                        <KeyRound size={14} />
                                                    </button>
                                                    <button className="adm-icon-btn danger" onClick={() => setDeleteModal({ step: 1, wallet: w, inputNumber: "" })} title="حذف">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {tab === "transactions" && (
                <>
                    <div className="adm-toolbar">
                        <div className="adm-search-wrapper">
                            <Search size={16} className="adm-search-icon" />
                            <input 
                                type="text" 
                                className="adm-search-input" 
                                placeholder="بحث بالمرجع أو اسم المالك..." 
                                value={txSearch} 
                                onChange={(e) => setTxSearch(e.target.value)} 
                            />
                        </div>

                        <div className="adm-stat-mini">
                            <div className="adm-stat-mini-icon"><ClipboardList size={16} /></div>
                            <div>
                                <div className="adm-stat-mini-label">النتائج</div>
                                <div className="adm-stat-mini-value">{filteredTransactions.length}</div>
                            </div>
                        </div>

                        <select 
                            className="adm-filter-select" 
                            value={txFilter.type} 
                            onChange={(e) => setTxFilter({...txFilter, type: e.target.value})}
                        >
                            <option value="">كل الأنواع</option>
                            {Object.entries(TX_TYPE_LABELS).map(([val, lbl]) => (
                                <option key={val} value={val}>{lbl}</option>
                            ))}
                        </select>

                        <select 
                            className="adm-filter-select" 
                            value={txFilter.status} 
                            onChange={(e) => setTxFilter({...txFilter, status: e.target.value})}
                        >
                            <option value="">كل الحالات</option>
                            {Object.entries(TX_STATUS_LABELS).map(([val, lbl]) => (
                                <option key={val} value={val}>{lbl}</option>
                            ))}
                        </select>
                    </div>

                    <div className="adm-table-wrapper">
                        <table className="adm-table">
                            <thead>
                                <tr>
                                    <th>المرجع</th>
                                    <th>النوع</th>
                                    <th>المحفظة</th>
                                    <th>المبلغ</th>
                                    <th>التاريخ</th>
                                    <th>الحالة</th>
                                    <th>إجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTransactions.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="text-center py-8 text-muted">لا توجد عمليات تطابق البحث</td>
                                    </tr>
                                ) : (
                                    filteredTransactions.map(tx => (
                                <tr key={tx._id}>
                                    <td className="monospace">{tx.reference}</td>
                                    <td>{TX_TYPE_LABELS[tx.type] || tx.type}</td>
                                    <td>{tx.wallet?.metadata?.fullName || tx.wallet?.walletNumber || "—"}</td>
                                    <td className={tx.type !== 'withdrawal' ? 'text-success font-bold' : 'text-danger font-bold'}>
                                        {tx.type !== 'withdrawal' ? '+' : '-'}{formatCurrency(tx.amount)}
                                    </td>
                                    <td className="text-muted small">{formatDate(tx.createdAt)}</td>
                                    <td>
                                        <span className={`adm-status-pill mini ${tx.status}`}>
                                            <span className="adm-status-dot"></span>
                                            {TX_STATUS_LABELS[tx.status]}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="adm-actions-row">
                                            <button className="adm-icon-btn primary" onClick={() => navigate(`/admin/wallets/details/${tx.wallet?._id || tx.wallet}`)}>
                                                <Eye size={14} />
                                            </button>
                                            {tx.status === "pending" && tx.type === "deposit" && (
                                                <button className="adm-icon-btn success" onClick={() => handleApproveDeposit(tx._id, tx.amount)}>
                                                    <CheckCircle2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {tab === "settings" && (
                <div className="adm-settings-container">
                    <div className="adm-card-header integrated">
                        <Save size={18} />
                        <h2>قواعد النظام المالي</h2>
                    </div>
                    <div className="adm-integrated-body">
                            <div className="adm-form-group">
                                <label className="adm-form-label">الحد اليومي لعمليات الدفع (عدد المحاولات)</label>
                                <input type="number" className="adm-form-input" value={settings.walletDailyPaymentLimit} onChange={(e) => setSettings({ ...settings, walletDailyPaymentLimit: e.target.value })} />
                            </div>
                            <div className="adm-form-group">
                                <label className="adm-form-label">بيانات الإيداع البنكي للمشترين</label>
                                <textarea className="adm-form-textarea" rows={5} value={settings.walletDepositInfo || ""} onChange={(e) => setSettings({ ...settings, walletDepositInfo: e.target.value })} />
                            </div>
                            <button className="adm-btn-mgmt primary full-width" onClick={handleSaveSettings} disabled={loading}>
                                <Save size={16} />
                                <span>حفظ التغييرات النهائية</span>
                            </button>
                        </div>
                    </div>
                )}

            {/* 🏔️ SHARED MODAL SYSTEM - DELETE */}
            {deleteModal.step > 0 && (
                <div className="adm-modal-backdrop" onClick={() => setDeleteModal({ step: 0, wallet: null, inputNumber: "" })}>
                    <div className="adm-modal narrow" onClick={e => e.stopPropagation()}>
                        <div className="adm-modal-header">
                            <div className="adm-modal-icon-wrapper danger">
                                <AlertTriangle size={32} />
                            </div>
                            <h3 className="adm-modal-title">تأكيد عملية الحذف</h3>
                            {deleteModal.step > 1 && <div className="adm-modal-step-badge">الخطوة {deleteModal.step} من 3</div>}
                        </div>
                        <div className="adm-modal-body">
                            {deleteModal.step === 1 && (
                                <div className="adm-notice-box danger" style={{ margin: 0 }}>
                                    أنت على وشك حذف محفظة <strong>{deleteModal.wallet?.metadata?.fullName}</strong> نهائياً.
                                </div>
                            )}
                            {deleteModal.step === 2 && (
                                <div style={{ textAlign: 'center' }}>
                                    <p className="text-muted mb-8">أدخل رقم المحفظة للتأكيد:</p>
                                    <p className="font-bold mb-16 monospace">{deleteModal.wallet?.walletNumber}</p>
                                    <input type="text" className="adm-form-input" value={deleteModal.inputNumber} onChange={e => setDeleteModal({...deleteModal, inputNumber: e.target.value})} autoFocus />
                                </div>
                            )}
                            {deleteModal.step === 3 && (
                                <p style={{ textAlign: 'center', fontWeight: 800, color: 'var(--adm-danger)' }}>هل أنت واثق من مسح كافة سجلات هذه المحفظة؟</p>
                            )}
                        </div>
                        <div className="adm-modal-footer">
                            {deleteModal.step === 1 && <button className="adm-btn-mgmt danger" onClick={() => setDeleteModal({...deleteModal, step: 2})}>متابعة</button>}
                            {deleteModal.step === 2 && <button className="adm-btn-mgmt danger" onClick={() => deleteModal.inputNumber.trim() === deleteModal.wallet.walletNumber ? setDeleteModal({...deleteModal, step: 3}) : showToast("الرقم غير مطابق", "error")}>تأكيد الرقم</button>}
                            {deleteModal.step === 3 && <button className="adm-btn-mgmt danger" onClick={handleDeleteWallet} disabled={loading}>احذف الآن</button>}
                            <button className="adm-btn-mgmt outline" onClick={() => setDeleteModal({ step: 0, wallet: null, inputNumber: "" })}>إلغاء</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 🏔️ SHARED MODAL SYSTEM - RESET PIN */}
            {resetModal.open && (
                <div className="adm-modal-backdrop" onClick={() => setResetModal({ open: false, wallet: null, inputNumber: "" })}>
                    <div className="adm-modal narrow" onClick={e => e.stopPropagation()}>
                        <div className="adm-modal-header">
                            <div className="adm-modal-icon-wrapper">
                                <KeyRound size={32} />
                            </div>
                            <h3 className="adm-modal-title">إعادة تعيين رمز PIN للمحفظة</h3>
                        </div>
                        <div className="adm-modal-body">
                            <p className="text-muted mb-16" style={{ textAlign: 'center' }}>أدخل رقم المحفظة لتوليد كلمة مرور جديدة:</p>
                            <input type="text" className="adm-form-input monospace" value={resetModal.inputNumber} onChange={e => setResetModal({...resetModal, inputNumber: e.target.value})} placeholder={resetModal.wallet?.walletNumber} autoFocus />
                        </div>
                        <div className="adm-modal-footer">
                            <button className="adm-btn-mgmt primary" onClick={handleConfirmResetPin} disabled={resetModal.inputNumber.trim() !== resetModal.wallet?.walletNumber || loading}>توليد وارسال</button>
                            <button className="adm-btn-mgmt outline" onClick={() => setResetModal({ open: false, wallet: null, inputNumber: "" })}>إلغاء</button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
