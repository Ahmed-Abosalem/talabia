// src/pages/Admin/sections/AdminShippingSection.jsx
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Truck,
  RefreshCw,
  Plus,
  AlertTriangle,
  Search,
  Check,
  Copy,
  Mail,
  Phone,
  MapPin,
  Activity,
  Trash2,
  Globe,
  Store,
  X
} from "lucide-react";
import "./AdminShippingSection.css";

import {
  getAdminShippingCompanies,
  toggleShippingCompany,
  deleteShippingCompany,
} from "@/services/adminService";
import { useApp } from "@/context/AppContext";

export default function AdminShippingSection() {
  const navigate = useNavigate();
  const { showToast } = useApp() || {};

  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all | active | inactive
  const [scopeFilter, setScopeFilter] = useState("all"); // all | global | seller-specific

  // حالة مودال الحذف
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  // ────────────────────────────────────────────────
  // تحميل شركات الشحن
  // ────────────────────────────────────────────────
  useEffect(() => {
    loadCompanies();
  }, []);

  async function loadCompanies() {
    try {
      setLoading(true);
      const data = await getAdminShippingCompanies();
      const list = data?.companies || data || [];
      setCompanies(Array.isArray(list) ? list : []);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "تعذر تحميل شركات الشحن.";
      showToast?.(msg, "error");
    } finally {
      setLoading(false);
    }
  }

  // ────────────────────────────────────────────────
  // تغيير حالة الشركة
  // ────────────────────────────────────────────────
  async function handleToggle(id) {
    try {
      await toggleShippingCompany(id);
      showToast?.("تم تحديث حالة شركة الشحن.", "success");
      await loadCompanies();
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "تعذر تحديث حالة الشركة.";
      showToast?.(msg, "error");
    }
  }

  // ────────────────────────────────────────────────
  // حذف شركة شحن
  // ────────────────────────────────────────────────
  function confirmDeleteCompany(company) {
    setCompanyToDelete(company);
    setDeleteModalOpen(true);
  }

  async function executeDeleteCompany() {
    if (!companyToDelete) return;
    try {
      setIsDeleting(true);
      await deleteShippingCompany(companyToDelete._id);
      showToast?.("تم حذف شركة الشحن وكافة بياناتها بنجاح.", "success");
      setCompanies((prev) => prev.filter((c) => c._id !== companyToDelete._id));
      setDeleteModalOpen(false);
      setCompanyToDelete(null);
    } catch (err) {
      const msg = err?.response?.data?.message || "تعذر حذف شركة الشحن.";
      showToast?.(msg, "error");
    } finally {
      setIsDeleting(false);
    }
  }

  // ────────────────────────────────────────────────
  // فلترة الشركات
  // ────────────────────────────────────────────────
  const filteredCompanies = useMemo(() => {
    return companies.filter((c) => {
      // فلتر الحالة
      if (statusFilter === "active" && c.isActive === false) return false;
      if (statusFilter === "inactive" && c.isActive !== false) return false;

      // فلتر النطاق
      if (scopeFilter !== "all" && c.scope !== scopeFilter) return false;

      // بحث النص
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const name = (c.name || "").toLowerCase();
        const email = (c.email || "").toLowerCase();
        const phone = (c.phone || "").toLowerCase();
        const id = (c._id || "").toString().toLowerCase();
        if (
          !name.includes(q) &&
          !email.includes(q) &&
          !phone.includes(q) &&
          !id.includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [companies, search, statusFilter, scopeFilter]);

  const stats = useMemo(() => ({
    total: filteredCompanies.length,
    active: filteredCompanies.filter(c => c.isActive !== false).length,
    global: filteredCompanies.filter(c => c.scope === 'global').length
  }), [filteredCompanies]);

  // ────────────────────────────────────────────────
  // عرض كروت شركات الشحن
  // ────────────────────────────────────────────────
  function renderCompanyCards() {
    if (loading) {
      return (
        <div className="adm-section-grid">
          {[1, 2, 3].map((i) => (
            <div key={i} className="adm-card shipping-entity-card skeleton-card">
              <div className="adm-card-header skeleton-pulse"></div>
              <div className="adm-card-body">
                <div className="skeleton-line pulse"></div>
                <div className="skeleton-line pulse short"></div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (filteredCompanies.length === 0) {
      return (
        <div className="adm-empty-state">
          <div className="adm-empty-state-icon">
            <Search size={24} />
          </div>
          <h3>لا توجد نتائج مطابقة</h3>
          <p>جرّب تعديل خيارات البحث أو التصفية للوصول إلى الشركة المطلوبة.</p>
          <button className="adm-btn outline" onClick={() => { setSearch(""); setStatusFilter("all"); setScopeFilter("all"); }}>
            إعادة ضبط البحث
          </button>
        </div>
      );
    }

    return (
      <div className="adm-section-grid">
        {filteredCompanies.map((c, index) => {
          const pricing = c.pricing || {};
          const baseFee =
            typeof pricing.baseFee === "number" && pricing.baseFee > 0
              ? `${pricing.baseFee} ر.ي`
              : "—";
          const perKm =
            typeof pricing.perKm === "number" && pricing.perKm > 0
              ? `${pricing.perKm} ر.ي/كم`
              : null;

          let pricingLabel = baseFee;
          if (perKm) {
            pricingLabel =
              baseFee && baseFee !== "—" ? `${baseFee} + ${perKm}` : perKm;
          }

          const scopeText =
            c.scope === "seller-specific" ? "لبائعين محددين" : "جميع البائعين";

          const stores = Array.isArray(c.stores) ? c.stores : [];
          let scopeDetail = scopeText;
          if (c.scope === "seller-specific" && stores.length > 0) {
            const first = stores[0]?.name || "متجر محدد";
            const rest = stores.length - 1;
            scopeDetail = rest > 0 ? `${first} و${rest} آخرين` : first;
          }

          const coverage = Array.isArray(c.coverageAreas)
            ? c.coverageAreas
            : [];
          let coverageLabel = "";
          if (coverage.length > 0) {
            const firstCities = coverage
              .map((x) => x.city)
              .filter(Boolean)
              .slice(0, 3);
            const remaining = coverage.length - firstCities.length;
            coverageLabel =
              remaining > 0
                ? `${firstCities.join("، ")} + ${remaining} أخرى`
                : firstCities.join("، ");
          }

          return (
            <div key={c._id} className="adm-card shipping-entity-card animate-in" style={{ animationDelay: `${index * 0.05}s` }}>
              <div className="adm-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className="adm-section-icon sm header-icon-fix">
                    <Truck size={16} />
                  </div>
                  <div>
                    <h3 className="adm-card-title">{c.name}</h3>
                    <div className="adm-text-soft" style={{ fontSize: '0.8rem' }}>{scopeDetail}</div>
                  </div>
                </div>

                <div className="adm-card-badges">
                  <div className="adm-user-id-badge">
                    <span className="adm-user-id-text">{c._id}</span>
                    <button
                      className="adm-user-id-copy"
                      title="نسخ المعرف"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(c._id);
                        setCopiedId(c._id);
                        setTimeout(() => setCopiedId(null), 2000);
                        showToast?.("تم نسخ المعرف الرقمي", "success");
                      }}
                    >
                      {copiedId === c._id ? <Check size={10} style={{ color: "var(--adm-success)" }} /> : <Copy size={10} />}
                    </button>
                  </div>
                  <span className={"adm-status-pill " + (c.isActive === false ? "inactive" : "active")}>
                    <span className="adm-status-dot"></span>
                    {c.isActive === false ? "غير نشط" : "نشط"}
                  </span>
                </div>
              </div>

              <div className="adm-card-body">
                <div className="adm-info-grid">
                  <div className="adm-info-point">
                    <span className="label"><Phone size={12} /> التواصل</span>
                    <span className="value">{c.phone}</span>
                    {c.email && <span className="sub-value monospace">{c.email}</span>}
                  </div>
                  <div className="adm-info-point">
                    <span className="label"><Activity size={12} /> التسعير التقديري</span>
                    <span className="value">{pricingLabel || "—"}</span>
                  </div>
                  <div className="adm-info-point full">
                    <span className="label"><MapPin size={12} /> مناطق التغطية</span>
                    <span className="value">{coverageLabel || "جميع المناطق والمدن"}</span>
                  </div>
                </div>
              </div>

              <div className="adm-card-footer">
                <div className="adm-actions-group no-border" style={{ justifyContent: 'flex-end', padding: '0' }}>
                  <button
                    type="button"
                    className="adm-btn-mgmt primary"
                    onClick={() => navigate("/admin/shipping/add", { state: { company: c } })}
                  >
                    تعديل
                  </button>
                  <button
                    type="button"
                    className={`adm-btn-mgmt ${c.isActive === false ? 'primary' : 'secondary'}`}
                    onClick={() => handleToggle(c._id)}
                  >
                    {c.isActive === false ? "تفعيل" : "إيقاف"}
                  </button>
                  <button
                    type="button"
                    className="adm-btn-mgmt danger"
                    onClick={() => confirmDeleteCompany(c)}
                  >
                    <Trash2 size={14} />
                    <span>حذف</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // ────────────────────────────────────────────────
  // واجهة القسم كاملة
  // ────────────────────────────────────────────────
  return (
    <div className="admin-shipping-section-page">
      {/* 🏔️ OFFICIAL COMPACT HEADER (10/10 Standard) */}
      <header className="adm-header">
        <div className="adm-header-inner">
          <div className="adm-header-right">
            <div className="adm-section-icon sm header-icon-fix">
              <Truck size={20} />
            </div>
            <div className="adm-header-titles">
              <h1 className="adm-page-title">إدارة شركات الشحن</h1>
              <div className="adm-header-meta">
                <span className="adm-role-badge adm-mobile-hide">الخدمات اللوجستية</span>
                <div className="adm-id-copy">
                  <span className="adm-id-label">نشط:</span>
                  <span className="adm-id-value">{stats.active}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="adm-header-left">
            <button
              type="button"
              className="adm-btn primary"
              onClick={() => navigate("/admin/shipping/add")}
            >
              <Plus size={18} />
              <span>إضافة شركة</span>
            </button>
            <button
              type="button"
              className="adm-btn ghost adm-mobile-hide"
              onClick={loadCompanies}
              disabled={loading}
              title="تحديث البيانات"
            >
              <RefreshCw size={18} className={loading ? "spin" : ""} />
            </button>
          </div>
        </div>
      </header>

      <div className="adm-main-container">
        {/* شريط الأدوات الذكي */}
        <div className="adm-toolbar">
          <div className="adm-search-wrapper">
            <Search size={16} className="adm-search-icon" />
            <input
              type="text"
              className="adm-search-input"
              placeholder="بحث عن شركة، بريد، أو هاتف..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="adm-toolbar-filters">
            <select
              className="adm-filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">كل الحالات</option>
              <option value="active">النشطة فقط</option>
              <option value="inactive">غير النشطة</option>
            </select>

            <select
              className="adm-filter-select"
              value={scopeFilter}
              onChange={(e) => setScopeFilter(e.target.value)}
            >
              <option value="all">كل النطاقات</option>
              <option value="global">نطاق عام</option>
              <option value="seller-specific">بائعين محددين</option>
            </select>
          </div>
        </div>

        <main className="adm-details-grid">
          <div className="span-12">
            {renderCompanyCards()}
          </div>
        </main>
      </div>

      {/* مودال تأكيد الحذف */}
      {deleteModalOpen && companyToDelete && (
        <div className="adm-modal-backdrop blur animate-in" onClick={() => setDeleteModalOpen(false)}>
          <div className="adm-modal slide-up" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="adm-modal-header">
              <h2 className="adm-modal-title danger">
                <Trash2 size={20} />
                <span>حذف شركة الشحن نهائياً؟</span>
              </h2>
            </div>
            <div className="adm-modal-body">
              <div className="adm-notice-box danger">
                <div className="adm-notice-content">
                  أنت على وشك حذف شركة الشحن <strong>{companyToDelete.name}</strong>.
                  هذا الإجراء سيؤدي لإيقاف كافة خدمات التوصيل المرتبطة بهذه الشركة ولا يمكن التراجع عنه.
                </div>
              </div>
            </div>
            <div className="adm-modal-footer">
              <button type="button" className="adm-btn ghost" onClick={() => setDeleteModalOpen(false)} disabled={isDeleting}>
                إلغاء
              </button>
              <button type="button" className="adm-btn danger" onClick={executeDeleteCompany} disabled={isDeleting}>
                {isDeleting ? (
                  <><RefreshCw size={14} className="spin" /> <span>جاري الحذف...</span></>
                ) : (
                  <><Trash2 size={14} /><span>تأكيد الحذف النهائي</span></>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
