// frontend/src/pages/Admin/sections/AdminPrivacyPolicySection.jsx

import { useState, useEffect } from "react";
import { Shield, Save, Send, Calendar, RefreshCw, CheckCircle, AlertCircle, Info } from "lucide-react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { formatDate } from "@/utils/formatters";
import "./AdminPrivacyPolicySection.css";

export default function AdminPrivacyPolicySection() {
  const { token } = useAuth();
  const [content, setContent] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
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
      const response = await axios.get("/api/privacy-policy");
      setContent(response.data.content || "");
      setLastUpdated(response.data.lastUpdated || "");
    } catch (error) {
      console.error("Error fetching privacy policy:", error);
      showMessage("error", "فشل تحميل سياسة الخصوصية");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!content.trim()) {
      showMessage("error", "المحتوى لا يمكن أن يكون فارغاً");
      return;
    }

    try {
      setSaving(true);
      const response = await axios.put(
        "/api/privacy-policy",
        { content },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setLastUpdated(response.data.lastUpdated);
      showMessage("success", "تم حفظ وتحديث بنود السياسة في قاعدة البيانات بنجاح");
    } catch (error) {
      console.error("Error saving privacy policy:", error);
      const status = error.response?.status;
      const errorMsg = error.response?.data?.message || error.message;
      showMessage("error", `فشل الحفظ: [${status || 'Network Error'}] ${errorMsg}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSendNotifications = async () => {
    try {
      setSending(true);
      const response = await axios.post(
        "/api/privacy-policy/notify",
        { targetAudience: selectedAudience },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      showMessage("success", response.data.message);
    } catch (error) {
      console.error("Error sending notifications:", error);
      showMessage("error", error.response?.data?.message || "فشل إرسال الإشعارات");
    } finally {
      setSending(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 5000);
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

      {message.text && (
        <div className={`adm-toast ${message.type === 'success' ? 'success' : 'error'}`}
          style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 1000 }}>
          {message.type === "success" ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{message.text}</span>
        </div>
      )}
    </section>
  );
}
