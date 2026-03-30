// src/pages/Admin/sections/BankTransfersTable.jsx
import { useEffect, useState, useCallback, useMemo } from "react";
import {
    RefreshCw,
    CheckCircle,
    XCircle,
    Clock,
    AlertTriangle,
    Inbox,
    Search,
    ChevronRight,
    ChevronLeft,
    User,
    Hash,
    RotateCcw,
    BarChart3,
} from "lucide-react";
import {
    getAdminBankTransfers,
    updateAdminBankTransferStatus,
} from "@/services/adminService";

const STATUS_MAP = {
    pending: { label: "بانتظار المراجعة", className: "warning", icon: <Clock size={13} /> },
    confirmed: { label: "تم التأكيد", className: "success", icon: <CheckCircle size={13} /> },
    rejected: { label: "مرفوض", className: "danger", icon: <XCircle size={13} /> },
};

/**
 * جدول الحوالات البنكية — مكوّن إنتاجي كامل
 * يعرض الطلبات المدفوعة بالحوالة البنكية مع إمكانية التأكيد/الرفض
 * متوافق مع النظام التصميمي Matte (8px radius, Slate palette)
 */
export default function BankTransfersTable() {
    const [transfers, setTransfers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [updatingId, setUpdatingId] = useState(null);
    const [search, setSearch] = useState("");
    const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

    const fetchTransfers = useCallback(async (page = 1, searchVal = search) => {
        try {
            setLoading(true);
            setError("");
            const params = { page, limit: 15 };
            if (searchVal.trim()) params.search = searchVal.trim();

            const data = await getAdminBankTransfers(params);
            setTransfers(data?.data || []);
            setPagination(data?.pagination || { page: 1, pages: 1, total: 0 });
        } catch (err) {
            setError("تعذر تحميل سجل الحوالات البنكية.");
        } finally {
            setLoading(false);
        }
    }, [search]);

    useEffect(() => {
        fetchTransfers(1, "");
    }, []);

    const handleSearch = (e) => {
        e.preventDefault();
        fetchTransfers(1, search);
    };

    const handleUpdateStatus = async (orderId, newStatus) => {
        if (updatingId) return;
        try {
            setUpdatingId(orderId);
            await updateAdminBankTransferStatus(orderId, newStatus);
            // تحديث محلي فوري
            setTransfers(prev =>
                prev.map(t =>
                    t._id === orderId
                        ? { ...t, bankTransferStatus: newStatus }
                        : t
                )
            );
        } catch (err) {
            setError("فشل تحديث حالة الحوالة. حاول مجدداً.");
        } finally {
            setUpdatingId(null);
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return "—";
        return new Date(dateStr).toLocaleDateString("ar-YE", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    // ── إحصائيات الحوالات ──
    const stats = useMemo(() => {
        const pending = transfers.filter(t => (t.bankTransferStatus || "pending") === "pending").length;
        const confirmed = transfers.filter(t => t.bankTransferStatus === "confirmed").length;
        const rejected = transfers.filter(t => t.bankTransferStatus === "rejected").length;
        return { pending, confirmed, rejected, total: transfers.length };
    }, [transfers]);

    return (
        <div className="bank-transfers-root">
            {/* Stats Summary Grid */}
            {!loading && transfers.length > 0 && (
                <div className="bt-stats-grid">
                    <div className="bt-stat-card">
                        <div className="bt-stat-icon" style={{ background: '#fffbeb', color: '#d97706' }}><Clock size={18} /></div>
                        <div className="bt-stat-info">
                            <span className="bt-stat-value">{stats.pending}</span>
                            <span className="bt-stat-label">بانتظار المراجعة</span>
                        </div>
                    </div>
                    <div className="bt-stat-card">
                        <div className="bt-stat-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}><CheckCircle size={18} /></div>
                        <div className="bt-stat-info">
                            <span className="bt-stat-value">{stats.confirmed}</span>
                            <span className="bt-stat-label">تم التأكيد</span>
                        </div>
                    </div>
                    <div className="bt-stat-card">
                        <div className="bt-stat-icon" style={{ background: '#fef2f2', color: '#dc2626' }}><XCircle size={18} /></div>
                        <div className="bt-stat-info">
                            <span className="bt-stat-value">{stats.rejected}</span>
                            <span className="bt-stat-label">مرفوض</span>
                        </div>
                    </div>
                    <div className="bt-stat-card">
                        <div className="bt-stat-icon" style={{ background: '#f1f5f9', color: '#475569' }}><BarChart3 size={18} /></div>
                        <div className="bt-stat-info">
                            <span className="bt-stat-value">{pagination.total}</span>
                            <span className="bt-stat-label">إجمالي الحوالات</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Toolbar: Search + Refresh */}
            <div className="bt-toolbar">
                <form className="bt-search-form" onSubmit={handleSearch}>
                    <div className="bt-search-wrapper">
                        <Search size={16} className="bt-search-icon" />
                        <input
                            type="text"
                            className="bt-search-input"
                            placeholder="بحث بالاسم أو رقم المرجع أو رقم الطلب..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                </form>
                <div className="bt-toolbar-actions">
                    <span className="bt-count-badge">{pagination.total} حوالة</span>
                    <button
                        className="adm-btn ghost"
                        onClick={() => fetchTransfers(pagination.page, search)}
                        disabled={loading}
                        title="تحديث"
                    >
                        <RefreshCw size={16} className={loading ? "spin" : ""} />
                    </button>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="adm-error-box" style={{ margin: '12px 0' }}>
                    <AlertTriangle size={16} />
                    <span>{error}</span>
                </div>
            )}

            {/* Loading State */}
            {loading ? (
                <div className="bt-empty-state">
                    <RefreshCw size={22} className="spin" />
                    <span>جارٍ تحميل الحوالات...</span>
                </div>
            ) : transfers.length === 0 ? (
                /* Empty State */
                <div className="bt-empty-state">
                    <Inbox size={36} strokeWidth={1.5} />
                    <p style={{ fontWeight: 700, margin: '12px 0 4px' }}>لا توجد حوالات بنكية</p>
                    <p style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)' }}>
                        {search ? "لا توجد نتائج مطابقة للبحث." : "ستظهر هنا طلبات التحويل عند استخدام العملاء للحوالة البنكية."}
                    </p>
                </div>
            ) : (
                /* Table */
                <div className="bt-table-container">
                    <table className="bt-table">
                        <thead>
                            <tr>
                                <th>رقم الطلب</th>
                                <th>المرسل</th>
                                <th>رقم المرجع</th>
                                <th>المبلغ</th>
                                <th>المشتري</th>
                                <th>التاريخ</th>
                                <th>الحالة</th>
                                <th style={{ textAlign: 'center' }}>إجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transfers.map((t) => {
                                const status = t.bankTransferStatus || "pending";
                                const statusInfo = STATUS_MAP[status] || STATUS_MAP.pending;
                                const isUpdating = updatingId === t._id;

                                return (
                                    <tr key={t._id}>
                                        <td>
                                            <span className="bt-order-ref">
                                                <Hash size={12} />
                                                {t.orderRef || t._id?.slice(-6)}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="bt-sender-name">
                                                {t.bankTransferSenderName || "—"}
                                            </span>
                                        </td>
                                        <td>
                                            <code className="bt-ref-number">
                                                {t.bankTransferReferenceNumber || "—"}
                                            </code>
                                        </td>
                                        <td>
                                            <span className="bt-amount">
                                                {Number(t.totalPrice || 0).toLocaleString()} ر.ي
                                            </span>
                                        </td>
                                        <td>
                                            <div className="bt-buyer-info">
                                                <User size={13} />
                                                <span>{t.buyer?.fullName || "—"}</span>
                                            </div>
                                        </td>
                                        <td className="bt-date">
                                            {formatDate(t.createdAt)}
                                        </td>
                                        <td>
                                            <span className={`adm-status-chip ${statusInfo.className}`}>
                                                {statusInfo.icon}
                                                {statusInfo.label}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            {isUpdating ? (
                                                <RefreshCw size={14} className="spin" style={{ color: 'var(--adm-primary)' }} />
                                            ) : status === "pending" ? (
                                                <div className="adm-table-actions">
                                                    <button
                                                        className="adm-icon-btn success"
                                                        title="تأكيد الحوالة"
                                                        onClick={() => handleUpdateStatus(t._id, "confirmed")}
                                                    >
                                                        <CheckCircle size={15} />
                                                    </button>
                                                    <button
                                                        className="adm-icon-btn danger"
                                                        title="رفض الحوالة"
                                                        onClick={() => handleUpdateStatus(t._id, "rejected")}
                                                    >
                                                        <XCircle size={15} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="adm-table-actions">
                                                    <button
                                                        className="adm-icon-btn muted"
                                                        title="تراجع — إعادة إلى قيد المراجعة"
                                                        onClick={() => handleUpdateStatus(t._id, "pending")}
                                                    >
                                                        <RotateCcw size={15} />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination */}
            {!loading && pagination.pages > 1 && (
                <div className="bt-pagination">
                    <button
                        className="adm-btn ghost"
                        disabled={pagination.page <= 1}
                        onClick={() => fetchTransfers(pagination.page - 1, search)}
                    >
                        <ChevronRight size={16} />
                    </button>
                    <span className="bt-page-info">
                        صفحة {pagination.page} من {pagination.pages}
                    </span>
                    <button
                        className="adm-btn ghost"
                        disabled={pagination.page >= pagination.pages}
                        onClick={() => fetchTransfers(pagination.page + 1, search)}
                    >
                        <ChevronLeft size={16} />
                    </button>
                </div>
            )}
        </div>
    );
}
