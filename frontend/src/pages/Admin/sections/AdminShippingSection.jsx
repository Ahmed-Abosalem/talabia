// src/pages/Admin/sections/AdminShippingSection.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Truck, RefreshCw, Plus, Search, Globe2 } from "lucide-react";
import "./AdminShippingSection.css";

import {
  getAdminShippingCompanies,
  createShippingCompany,
  updateShippingCompany,
  toggleShippingCompany,
  deleteShippingCompany,
  getAdminSellers,
} from "@/services/adminService";
import { useApp } from "@/context/AppContext";

const INITIAL_FORM = {
  // مرحلة 1 - بيانات الشركة
  name: "",
  headquarters: "",
  scopeType: "all", // all | specific
  isActive: true,

  // مرحلة 2 - مسؤول الشركة
  contactName: "",
  contactRelation: "",
  documentType: "",
  documentNumber: "",
  documentFile: null,

  email: "",
  phone: "",

  // مرحلة 3 - الحساب والتسعير
  password: "",
  confirmPassword: "",
  baseFee: "",
  perKm: "",
  coverageCities: "",
};

export default function AdminShippingSection() {
  const { showToast } = useApp() || {};

  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // مودال الإضافة / التعديل
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState(1);
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // البائعون لنطاق العمل
  const [sellers, setSellers] = useState([]);
  const [sellersLoading, setSellersLoading] = useState(false);
  const [sellerSearch, setSellerSearch] = useState("");
  const [selectedSellerIds, setSelectedSellerIds] = useState(new Set());

  // حالة فتح/إغلاق لوحة نطاق العمل
  const [isScopePanelOpen, setIsScopePanelOpen] = useState(false);
  const scopeWrapperRef = useRef(null);

  // ────────────────────────────────────────────────
  // إغلاق لوحة نطاق العمل عند الضغط خارجها
  // ────────────────────────────────────────────────
  useEffect(() => {
    if (!isScopePanelOpen) return;

    function handleClickOutside(event) {
      if (
        scopeWrapperRef.current &&
        !scopeWrapperRef.current.contains(event.target)
      ) {
        setIsScopePanelOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isScopePanelOpen]);

  // ────────────────────────────────────────────────
  // تحميل شركات الشحن
  // ────────────────────────────────────────────────
  useEffect(() => {
    loadCompanies();
  }, []);

  async function loadCompanies() {
    try {
      setLoading(true);
      setErrorMessage("");
      const data = await getAdminShippingCompanies();
      const list = data?.companies || data || [];
      setCompanies(Array.isArray(list) ? list : []);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "تعذر تحميل شركات الشحن.";
      setErrorMessage(msg);
      showToast?.(msg, "error");
    } finally {
      setLoading(false);
    }
  }

  // ────────────────────────────────────────────────
  // تحميل البائعين (مرة واحدة عند فتح المودال)
  // ────────────────────────────────────────────────
  useEffect(() => {
    if (!isModalOpen) return;
    if (sellers.length > 0) return;

    (async () => {
      try {
        setSellersLoading(true);
        const data = await getAdminSellers({ status: "approved" });
        const list = data?.sellers || data || [];
        setSellers(Array.isArray(list) ? list : []);
      } catch (err) {
        const msg =
          err?.response?.data?.message ||
          err?.message ||
          "تعذر تحميل قائمة البائعين.";
        showToast?.(msg, "error");
      } finally {
        setSellersLoading(false);
      }
    })();
  }, [isModalOpen, sellers.length, showToast]);

  // ────────────────────────────────────────────────
  // فتح مودال إضافة شركة جديدة
  // ────────────────────────────────────────────────
  function openCreateModal() {
    setForm(INITIAL_FORM);
    setEditingId(null);
    setSelectedSellerIds(new Set());
    setModalStep(1);
    setIsModalOpen(true);
  }

  // ────────────────────────────────────────────────
  // فتح مودال تعديل شركة قائمة
  // ────────────────────────────────────────────────
  function openEditModal(company) {
    if (!company) return;

    const scopeType =
      company.scope === "seller-specific" ? "specific" : "all";

    let coverageCities = "";
    if (Array.isArray(company.coverageAreas) && company.coverageAreas.length) {
      coverageCities = company.coverageAreas
        .map((c) => c.city)
        .filter(Boolean)
        .join("، ");
    }

    const pricing = company.pricing || {};
    const baseFee =
      typeof pricing.baseFee === "number" && pricing.baseFee > 0
        ? String(pricing.baseFee)
        : "";
    const perKm =
      typeof pricing.perKm === "number" && pricing.perKm > 0
        ? String(pricing.perKm)
        : "";

    let sellerIdsSet = new Set();
    if (scopeType === "specific") {
      const fromStoreIds = Array.isArray(company.storeIds)
        ? company.storeIds
        : [];
      const fromStores =
        Array.isArray(company.stores) && company.stores.length
          ? company.stores.map((s) => s._id)
          : [];
      const allIds = [...fromStoreIds, ...fromStores]
        .filter(Boolean)
        .map((id) => String(id));
      sellerIdsSet = new Set(allIds);
    }

    setForm({
      name: company.name || "",
      headquarters: company.headquarters || "",
      scopeType,
      isActive: company.isActive !== false,

      contactName: company.contactName || "",
      contactRelation: company.contactRelation || "",
      documentType: company.documentType || "",
      documentNumber: company.documentNumber || "",
      documentFile: null,

      email: company.email || "",
      phone: company.phone || "",

      password: "",
      confirmPassword: "",
      baseFee,
      perKm,
      coverageCities,
    });

    setSelectedSellerIds(sellerIdsSet);
    setEditingId(company._id || null);
    setModalStep(1);
    setIsModalOpen(true);
  }

  // ────────────────────────────────────────────────
  // غلق المودال
  // ────────────────────────────────────────────────
  function closeModal() {
    setIsModalOpen(false);
    setForm(INITIAL_FORM);
    setSelectedSellerIds(new Set());
    setEditingId(null);
    setModalStep(1);
    setIsScopePanelOpen(false);
  }

  // ────────────────────────────────────────────────
  // اختيار/إلغاء كل البائعين (لم نعد نستخدمه مباشرة، لكن نحافظ عليه)
  // ────────────────────────────────────────────────
  function toggleSelectAllSellers() {
    setForm((f) => {
      if (f.scopeType === "all") {
        return { ...f, scopeType: "specific" };
      }
      return { ...f, scopeType: "all" };
    });
    if (form.scopeType === "all") {
      setSelectedSellerIds(new Set());
    }
  }

  // ────────────────────────────────────────────────
  // اختيار/إلغاء بائع معيّن
  // ────────────────────────────────────────────────
  function toggleSeller(id) {
    const strId = String(id);
    setSelectedSellerIds((prev) => {
      const next = new Set(prev);
      if (next.has(strId)) next.delete(strId);
      else next.add(strId);
      return next;
    });
  }

  // ────────────────────────────────────────────────
  // فلترة البائعين حسب البحث
  // ────────────────────────────────────────────────
  const filteredSellers = useMemo(() => {
    const q = sellerSearch.trim().toLowerCase();
    if (!q) return sellers;
    return sellers.filter((s) => {
      const storeName = (s.name || s.storeName || "").toLowerCase();
      const ownerName = (s.owner?.name || "").toLowerCase();
      return storeName.includes(q) || ownerName.includes(q);
    });
  }, [sellers, sellerSearch]);

  // ────────────────────────────────────────────────
  // ملخص نطاق العمل
  // ────────────────────────────────────────────────
  const scopeSummary = useMemo(() => {
    if (form.scopeType === "all") {
      return "جميع البائعين في المنصة";
    }

    if (selectedSellerIds.size === 0) {
      return "لم يتم اختيار بائعين بعد";
    }

    const ids = Array.from(selectedSellerIds);
    const firstId = ids[0];
    const firstSeller = sellers.find((s) => String(s._id) === firstId);
    const firstName =
      firstSeller?.name || firstSeller?.storeName || "متجر محدد";
    const rest = ids.length - 1;
    return rest > 0 ? `${firstName} و${rest} آخرين` : firstName;
  }, [form.scopeType, selectedSellerIds, sellers]);

  // ────────────────────────────────────────────────
  // حفظ (إضافة / تعديل) شركة الشحن
  // ────────────────────────────────────────────────
  async function handleSubmit(e) {
    e?.preventDefault();

    try {
      if (!form.name.trim()) {
        showToast?.("اسم شركة الشحن مطلوب.", "error");
        setModalStep(1);
        return;
      }
      if (!form.email.trim()) {
        showToast?.("البريد الإلكتروني للشركة مطلوب.", "error");
        setModalStep(2);
        return;
      }
      if (!form.phone.trim()) {
        showToast?.("رقم الجوال للشركة مطلوب.", "error");
        setModalStep(2);
        return;
      }

      if (!editingId) {
        if (!form.password.trim()) {
          showToast?.("كلمة المرور مطلوبة لإنشاء حساب الشاحن.", "error");
          setModalStep(3);
          return;
        }
        if (form.password !== form.confirmPassword) {
          showToast?.("كلمتا المرور غير متطابقتين.", "error");
          setModalStep(3);
          return;
        }
      }

      let scope = "global";
      let storeIds = [];
      if (form.scopeType === "specific") {
        if (selectedSellerIds.size === 0) {
          showToast?.(
            "اختر بائعًا واحدًا على الأقل أو فعّل خيار جميع البائعين.",
            "error"
          );
          setModalStep(1);
          return;
        }
        scope = "seller-specific";
        storeIds = Array.from(selectedSellerIds);
      }

      setSaving(true);

      const coverageAreas = form.coverageCities
        .split(/[,،]/)
        .map((c) => c.trim())
        .filter(Boolean)
        .map((city) => ({
          city,
          deliveryTime: "1-3 أيام",
        }));

      const payload = {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),

        headquarters: form.headquarters.trim() || undefined,
        contactName: form.contactName.trim() || undefined,
        contactRelation: form.contactRelation.trim() || undefined,
        documentType: form.documentType.trim() || undefined,
        documentNumber: form.documentNumber.trim() || undefined,

        isActive: !!form.isActive,
        scope,
        storeIds,

        logo: "",
        coverageAreas,
        pricing: {
          baseFee: form.baseFee ? Number(form.baseFee) : 0,
          perKm: form.perKm ? Number(form.perKm) : 0,
          extraWeightFee: 0,
        },
      };

      let res;
      if (!editingId) {
        payload.password = form.password.trim();
        res = await createShippingCompany(payload);
      } else {
        res = await updateShippingCompany(editingId, payload);
      }

      if (res?.company) {
        showToast?.(
          editingId
            ? "تم تحديث شركة الشحن بنجاح."
            : "تم إضافة شركة الشحن بنجاح.",
          "success"
        );
      } else {
        showToast?.(
          editingId ? "تم حفظ بيانات شركة الشحن." : "تم حفظ شركة الشحن.",
          "success"
        );
      }

      setIsModalOpen(false);
      setForm(INITIAL_FORM);
      setSelectedSellerIds(new Set());
      setEditingId(null);
      setIsScopePanelOpen(false);

      await loadCompanies();
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "حدث خطأ أثناء حفظ شركة الشحن.";
      setErrorMessage(msg);
      showToast?.(msg, "error");
    } finally {
      setSaving(false);
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
      setErrorMessage(msg);
      showToast?.(msg, "error");
    }
  }

  // ────────────────────────────────────────────────
  // حذف شركة شحن
  // ────────────────────────────────────────────────
  async function handleDelete(id) {
    const ok = window.confirm("هل أنت متأكد من حذف شركة الشحن هذه؟");
    if (!ok) return;
    try {
      await deleteShippingCompany(id);
      showToast?.("تم حذف شركة الشحن.", "success");
      await loadCompanies();
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "تعذر حذف الشركة.";
      setErrorMessage(msg);
      showToast?.(msg, "error");
    }
  }

  // ────────────────────────────────────────────────
  // الـ Stepper (مراحل المودال)
  // ────────────────────────────────────────────────
  function StepHeader() {
    const steps = [
      { id: 1, label: "بيانات الشركة" },
      { id: 2, label: "مسؤول الشركة" },
      { id: 3, label: "الحساب والتسعير" },
    ];
    return (
      <div className="admin-modal-steps">
        {steps.map((step) => (
          <div
            key={step.id}
            className={
              "admin-modal-step" +
              (modalStep === step.id ? " admin-modal-step-active" : "") +
              (modalStep > step.id ? " admin-modal-step-done" : "")
            }
          >
            <span className="admin-modal-step-number">{step.id}</span>
            <span className="admin-modal-step-label">{step.label}</span>
          </div>
        ))}
      </div>
    );
  }

  // ────────────────────────────────────────────────
  // مكوّن اختيار نطاق العمل (القائمة المنسدلة المحسّنة)
  // ────────────────────────────────────────────────
  function ScopeSelector() {
    return (
      <div className="admin-profile-field">
        <label>نطاق عمل الشركة</label>

        <div ref={scopeWrapperRef} className="shipping-scope-wrapper">
          <button
            type="button"
            className="shipping-scope-summary"
            onClick={() => setIsScopePanelOpen((prev) => !prev)}
          >
            <Globe2 size={16} />
            <span>{scopeSummary}</span>
          </button>

          {isScopePanelOpen && (
            <div className="shipping-scope-panel">
              {/* اختيار نوع النطاق */}
              <div className="shipping-scope-modes">
                <label
                  className={
                    "shipping-scope-mode" +
                    (form.scopeType === "all"
                      ? " shipping-scope-mode-active"
                      : "")
                  }
                >
                  <input
                    type="radio"
                    name="shipping-scope"
                    value="all"
                    checked={form.scopeType === "all"}
                    onChange={() => {
                      setForm((f) => ({ ...f, scopeType: "all" }));
                      setSelectedSellerIds(new Set());
                    }}
                  />
                  <span>جميع البائعين في المنصة</span>
                </label>

                <label
                  className={
                    "shipping-scope-mode" +
                    (form.scopeType === "specific"
                      ? " shipping-scope-mode-active"
                      : "")
                  }
                >
                  <input
                    type="radio"
                    name="shipping-scope"
                    value="specific"
                    checked={form.scopeType === "specific"}
                    onChange={() => {
                      setForm((f) => ({ ...f, scopeType: "specific" }));
                    }}
                  />
                  <span>لبائعين محددين</span>
                </label>
              </div>

              {/* البحث + قائمة البائعين في حالة بائعين محددين */}
              {form.scopeType === "specific" && (
                <>
                  <div className="shipping-scope-search">
                    <Search size={14} />
                    <input
                      type="text"
                      placeholder="ابحث عن متجر أو صاحب متجر..."
                      value={sellerSearch}
                      onChange={(e) => setSellerSearch(e.target.value)}
                    />
                  </div>

                  <div className="shipping-scope-list">
                    {sellersLoading ? (
                      <div className="shipping-scope-empty">
                        جاري تحميل قائمة البائعين...
                      </div>
                    ) : filteredSellers.length === 0 ? (
                      <div className="shipping-scope-empty">
                        لا توجد بائعين مطابقين لخيارات البحث.
                      </div>
                    ) : (
                      filteredSellers.map((s) => {
                        const id = String(s._id);
                        const storeName =
                          s.name || s.storeName || "متجر بدون اسم";
                        const ownerName = s.owner?.name;
                        const checked = selectedSellerIds.has(id);
                        return (
                          <label key={id} className="shipping-scope-item">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleSeller(id)}
                            />
                            <div className="shipping-scope-item-text">
                              <div className="shipping-scope-item-title">
                                {storeName}
                              </div>
                              {ownerName && (
                                <div className="shipping-scope-item-sub">
                                  صاحب المتجر: {ownerName}
                                </div>
                              )}
                            </div>
                          </label>
                        );
                      })
                    )}
                  </div>
                </>
              )}

              {/* زر تم */}
              <div className="shipping-scope-footer">
                <button
                  type="button"
                  className="shipping-scope-done"
                  onClick={() => setIsScopePanelOpen(false)}
                >
                  تم
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────
  // محتوى كل مرحلة في المودال
  // ────────────────────────────────────────────────
  function renderStepContent() {
    if (modalStep === 1) {
      return (
        <div className="admin-profile-form">
          <div className="admin-profile-form-row">
            <div className="admin-profile-field">
              <label>اسم شركة الشحن</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="مثال: شركة الطلب السريع"
              />
            </div>
            <div className="admin-profile-field">
              <label>مقر الشركة</label>
              <input
                type="text"
                value={form.headquarters}
                onChange={(e) =>
                  setForm((f) => ({ ...f, headquarters: e.target.value }))
                }
                placeholder="مثال: الرياض – حي النرجس"
              />
            </div>
          </div>

          <ScopeSelector />

          <div className="admin-profile-form-row">
            <div className="admin-profile-field">
              <label>الحالة</label>
              <select
                value={form.isActive ? "active" : "inactive"}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    isActive: e.target.value === "active",
                  }))
                }
              >
                <option value="active">نشط</option>
                <option value="inactive">غير نشط</option>
              </select>
            </div>
          </div>
        </div>
      );
    }

    if (modalStep === 2) {
      return (
        <div className="admin-profile-form">
          <div className="admin-profile-form-row">
            <div className="admin-profile-field">
              <label>اسم مسؤول الشركة</label>
              <input
                type="text"
                value={form.contactName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, contactName: e.target.value }))
                }
                placeholder="مثال: أحمد علي"
              />
            </div>
            <div className="admin-profile-field">
              <label>صلته بالشركة</label>
              <input
                type="text"
                value={form.contactRelation}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    contactRelation: e.target.value,
                  }))
                }
                placeholder="مثال: صاحب الشركة، مدير العمليات."
              />
            </div>
          </div>

          <div className="admin-profile-form-row">
            <div className="admin-profile-field">
              <label>نوع الوثيقة</label>
              <input
                type="text"
                value={form.documentType}
                onChange={(e) =>
                  setForm((f) => ({ ...f, documentType: e.target.value }))
                }
                placeholder="مثال: هوية وطنية، سجل تجاري."
              />
            </div>
            <div className="admin-profile-field">
              <label>رقم الوثيقة</label>
              <input
                type="text"
                value={form.documentNumber}
                onChange={(e) =>
                  setForm((f) => ({ ...f, documentNumber: e.target.value }))
                }
                placeholder="أدخل رقم الوثيقة"
              />
            </div>
          </div>

          <div className="admin-profile-form-row">
            <div className="admin-profile-field">
              <label>البريد الإلكتروني</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
                placeholder="example@shipping.com"
              />
            </div>
            <div className="admin-profile-field">
              <label>رقم الجوال</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: e.target.value }))
                }
                placeholder="05XXXXXXXX"
              />
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="admin-profile-form">
        <div className="admin-profile-form-row">
          <div className="admin-profile-field">
            <label>كلمة السر</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) =>
                setForm((f) => ({ ...f, password: e.target.value }))
              }
              placeholder={
                editingId
                  ? "اتركها فارغة للإبقاء على كلمة المرور الحالية"
                  : "كلمة المرور لحساب الشاحن"
              }
            />
          </div>
          <div className="admin-profile-field">
            <label>إعادة كلمة السر</label>
            <input
              type="password"
              value={form.confirmPassword}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  confirmPassword: e.target.value,
                }))
              }
              placeholder="أعد إدخال كلمة المرور"
            />
          </div>
        </div>

        <div className="admin-profile-form-row">
          <div className="admin-profile-field">
            <label>سعر التوصيل الأساسي (ر.ي)</label>
            <input
              type="number"
              min="0"
              value={form.baseFee}
              onChange={(e) =>
                setForm((f) => ({ ...f, baseFee: e.target.value }))
              }
              placeholder="مثال: 20"
            />
          </div>
          <div className="admin-profile-field">
            <label>سعر لكل كيلومتر (اختياري)</label>
            <input
              type="number"
              min="0"
              value={form.perKm}
              onChange={(e) =>
                setForm((f) => ({ ...f, perKm: e.target.value }))
              }
              placeholder="مثال: 1 ر.ي لكل كم"
            />
            <small className="field-help-text">
              اتركه فارغًا إذا كان السعر ثابتًا لا يعتمد على المسافة.
            </small>
          </div>
        </div>

        <div className="admin-profile-form-row">
          <div className="admin-profile-field">
            <label>المدن المغطاة (افصل بينها بفاصلة)</label>
            <input
              type="text"
              value={form.coverageCities}
              onChange={(e) =>
                setForm((f) => ({ ...f, coverageCities: e.target.value }))
              }
              placeholder="مثال: الرياض، جدة، الدمام"
            />
          </div>
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────
  // عرض كروت شركات الشحن (مع كروت فرعية لكل معلومة)
  // ────────────────────────────────────────────────
  function renderCompanyCards() {
    if (loading) {
      return (
        <div className="users-empty-state">جاري تحميل شركات الشحن...</div>
      );
    }

    if (!companies || companies.length === 0) {
      return (
        <div className="users-empty-state">لا توجد شركات شحن حتى الآن.</div>
      );
    }

    return (
      <div className="shipping-card-grid">
        {companies.map((c) => {
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
            <div key={c._id} className="shipping-card">
              {/* هيدر الكرت */}
              <div className="shipping-card-header">
                <div className="shipping-card-title">
                  <Truck size={16} />
                  <div>
                    <div className="shipping-card-name">{c.name}</div>
                    <div className="shipping-card-scope">{scopeDetail}</div>
                  </div>
                </div>

                <span
                  className={
                    "users-status-pill " +
                    (c.isActive === false ? "inactive" : "active")
                  }
                >
                  {c.isActive === false ? "غير نشط" : "نشط"}
                </span>
              </div>

              {/* جسم الكرت: كروت فرعية لكل معلومة */}
              <div className="shipping-card-body">
                {/* التواصل */}
                <div className="shipping-info-card">
                  <div className="shipping-info-title">التواصل</div>
                  <div className="shipping-info-content">
                    {c.email && (
                      <div className="shipping-info-text">{c.email}</div>
                    )}
                    {c.phone && (
                      <div className="shipping-info-text">{c.phone}</div>
                    )}
                  </div>
                </div>

                {/* نطاق العمل */}
                <div className="shipping-info-card">
                  <div className="shipping-info-title">نطاق العمل</div>
                  <div className="shipping-info-content">
                    <div className="shipping-info-text">{scopeText}</div>
                    {coverageLabel && (
                      <div className="shipping-info-text shipping-info-secondary">
                        يغطي: {coverageLabel}
                      </div>
                    )}
                  </div>
                </div>

                {/* التسعير */}
                <div className="shipping-info-card">
                  <div className="shipping-info-title">التسعير</div>
                  <div className="shipping-info-content">
                    <div className="shipping-info-text">
                      {pricingLabel || "—"}
                    </div>
                  </div>
                </div>
              </div>

              {/* الفوتر: الإجراءات */}
              <div className="shipping-card-footer">
                <div className="shipping-card-actions">
                  <button
                    type="button"
                    className="users-inline-button"
                    onClick={() => openEditModal(c)}
                  >
                    تعديل
                  </button>
                  <button
                    type="button"
                    className="users-inline-button"
                    onClick={() => handleToggle(c._id)}
                  >
                    {c.isActive === false ? "تفعيل" : "إيقاف"}
                  </button>
                  <button
                    type="button"
                    className="users-inline-button danger"
                    onClick={() => handleDelete(c._id)}
                  >
                    حذف
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
    <section className="admin-section-card">
      <div className="admin-section-header">
        <div className="admin-section-header-main">
          <div className="admin-section-icon">
            <Truck size={18} />
          </div>
          <div>
            <div className="admin-section-title">إدارة شركات الشحن</div>
            <div className="admin-section-subtitle">
              تعريف شركات الشحن المتعاقدة مع طلبية، مع ضبط نطاق عمل كل شركة
              وتسعير التوصيل.
            </div>
          </div>
        </div>
        <div className="admin-section-actions">
          <button
            type="button"
            className="admin-button admin-button-primary"
            onClick={openCreateModal}
          >
            <Plus size={14} />
            <span>إضافة شركة شحن</span>
          </button>
          <button
            type="button"
            className="admin-button admin-button-ghost"
            onClick={loadCompanies}
            disabled={loading}
          >
            <RefreshCw size={14} />
            <span>تحديث</span>
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="admin-error" style={{ marginBottom: "0.5rem" }}>
          {errorMessage}
        </div>
      )}

      {renderCompanyCards()}

      {isModalOpen && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal">
            <div className="admin-modal-header">
              <h2>
                {editingId ? "تعديل شركة الشحن" : "إضافة شركة شحن"}
              </h2>
              <button
                type="button"
                className="admin-modal-close"
                onClick={closeModal}
                disabled={saving}
              >
                ×
              </button>
            </div>

            <StepHeader />

            <div className="admin-modal-body">{renderStepContent()}</div>

            <div className="admin-modal-footer">
              <button
                type="button"
                className="admin-profile-btn ghost"
                onClick={closeModal}
                disabled={saving}
              >
                إلغاء
              </button>

              <div style={{ flex: 1 }} />

              {modalStep > 1 && (
                <button
                  type="button"
                  className="admin-profile-btn ghost"
                  onClick={() => setModalStep((s) => Math.max(1, s - 1))}
                  disabled={saving}
                >
                  السابق
                </button>
              )}

              {modalStep < 3 && (
                <button
                  type="button"
                  className="admin-profile-btn primary"
                  onClick={() => setModalStep((s) => Math.min(3, s + 1))}
                  disabled={saving}
                >
                  التالي
                </button>
              )}

              {modalStep === 3 && (
                <button
                  type="button"
                  className="admin-profile-btn primary"
                  onClick={handleSubmit}
                  disabled={saving}
                >
                  {saving
                    ? "جارٍ الحفظ..."
                    : editingId
                    ? "حفظ التعديلات"
                    : "حفظ شركة الشحن"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
