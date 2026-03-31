// frontend/src/pages/Admin/sections/AdminPrivacyPolicySection.jsx

import { useState, useEffect } from "react";
import { Shield, Save, Send, Calendar, RefreshCw, CheckCircle, AlertCircle, Info } from "lucide-react";
import { useApp } from "@/context/AppContext";
import api from "@/services/api";
import { formatCurrency, formatDate } from "@/utils/formatters";
import "./AdminPrivacyPolicySection.css";

export default function AdminPrivacyPolicySection() {
  const { showToast } = useApp();
  const [content, setContent] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [selectedAudience, setSelectedAudience] = useState("all");

  const audiences = [
    { id: "all", label: "الجميع" },
    { id: "buyer", label: "المشترين" },
    { id: "seller", label: "البائعين" },
    { id: "shipping", label: "شركات الشحن" },
    { id: "admin", label: "المديرين" },
  ];

  useEffect(() => {
    fetchPrivacyPolicy();
  }, []);

  const fetchPrivacyPolicy = async () => {
    try {
      setLoading(true);
      const response = await api.get("/privacy-policy");
      setContent(response.data.content || "");
      setLastUpdated(response.data.lastUpdated || "");
    } catch (error) {
      console.error("Error fetching privacy policy:", error);
      showToast("فشل تحميل سياسة الخصوصية", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!content.trim()) {
      showToast("المحتوى لا يمكن أن يكون فارغاً", "error");
      return;
    }

    try {
      setSaving(true);
      const response = await api.put("/privacy-policy", { content });

      setLastUpdated(response.data.lastUpdated);
      showToast("تم حفظ وتحديث بنود السياسة بنجاح", "success");
    } catch (error) {
      console.error("Error saving privacy policy:", error);
      const errorMsg = error.response?.data?.message || "فشل الحفظ، حاول مرة أخرى";
      showToast(errorMsg, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSendNotifications = async () => {
    try {
      setSending(true);
      const response = await api.post("/privacy-policy/notify", { 
        targetAudience: selectedAudience 
      });

      showToast(response.data.message || "تم إرسال الإشعارات بنجاح", "success");
    } catch (error) {
      console.error("Error sending notifications:", error);
      showToast(error.response?.data?.message || "فشل إرسال الإشعارات", "error");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <section className="adm-section-panel">
        <div className="adm-loading-state">
          <RefreshCw size={40} className="spin" />
          <p>جاري تحميل سياسة الخصوصية...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="adm-section-panel">
      <header className="adm-section-inner-header">
        <div className="adm-section-icon">
          <Shield size={22} />
        </div>
        <div className="adm-section-title-group">
          <h2 className="adm-section-title">إدارة سياسة الخصوصية</h2>
          <p className="adm-section-subtitle">إدارة نصوص سياسة الخصوصية وإرسال الإشعارات بآخر التحديثات.</p>
        </div>
        <div className="adm-section-actions">
          <button type="button" className="adm-btn outline" onClick={fetchPrivacyPolicy} disabled={loading}>
            <RefreshCw size={18} className={loading ? "spin" : ""} />
            <span>تحديث</span>
          </button>
        </div>
      </header>

      {lastUpdated && (
        <div className="adm-info-alert" style={{ marginBottom: 'var(--sp-3)' }}>
          <Calendar size={18} />
          <span>آخر تحديث للقواعد: <strong>{formatDate(lastUpdated)}</strong></span>
        </div>
      )}

      <div className="adm-form-group">
        <label className="adm-form-label">محتوى سياسة الخصوصية</label>
        <textarea
          className="privacy-textarea"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="اكتب بنود سياسة الخصوصية هنا..."
        />
      </div>

      <div className="adm-save-toolbar">
        <div className="adm-save-info">
          <div className="adm-save-status">
            <Info size={16} />
            <span>تأكد من مراجعة التغييرات قبل الحفظ النهائي.</span>
          </div>
        </div>
        <button className="adm-btn primary" onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <RefreshCw size={18} className="spin" />
              <span>جاري الحفظ...</span>
            </>
          ) : (
            <>
              <Save size={18} />
              <span>حفظ التغييرات</span>
            </>
          )}
        </button>
      </div>

      <div className="adm-notification-panel">
        <div className="adm-notification-header">
          <Send size={18} className="adm-text-primary" />
          <h3 className="adm-notification-title">إرسال إشعارات التحديث</h3>
        </div>

        <p className="adm-text-soft" style={{ fontSize: "0.85rem", marginBottom: "1rem" }}>
          اختر الفئة المستهدفة لإرسال إشعار فوري بتحديث سياسة الخصوصية.
        </p>

        <div className="adm-audience-grid">
          {audiences.map((audience) => (
            <button
              key={audience.id}
              type="button"
              className={`adm-audience-btn ${selectedAudience === audience.id ? 'active' : ''}`}
              onClick={() => setSelectedAudience(audience.id)}
            >
              {audience.label}
            </button>
          ))}
        </div>

        <button className="adm-btn primary" onClick={handleSendNotifications} disabled={sending}>
          {sending ? (
            <>
              <RefreshCw size={18} className="spin" />
              <span>جاري الإرسال...</span>
            </>
          ) : (
            <>
              <Send size={18} />
              <span>إرسال الإشعارات الآن</span>
            </>
          )}
        </button>
      </div>

      {/* تم استبدال الـ Toast المحلي بنظام useApp.showToast الموحد */}
    </section>
  );
}
