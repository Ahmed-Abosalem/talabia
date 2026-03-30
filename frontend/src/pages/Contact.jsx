import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Phone, Facebook, Instagram, Send, MessageCircle, ArrowRight, User, MessageSquare } from "lucide-react";
import "./Contact.css";
import userService from "../services/userService";
import PremiumInput from "@/components/Auth/PremiumInput";

export default function ContactPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });

  const [status, setStatus] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (status) setStatus(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      setStatus("validation-error");
      return;
    }

    try {
      setIsSubmitting(true);
      setStatus(null);
      const subject = `رسالة من صفحة تواصل معنا - ${formData.name.trim()}`;
      const composedMessage = `
الاسم: ${formData.name.trim()}
البريد الإلكتروني: ${formData.email.trim()}
رقم الهاتف: ${formData.phone?.trim() || "لم يُذكر"}

الرسالة:
${formData.message.trim()}
      `.trim();

      await userService.createSupportTicket({
        subject,
        message: composedMessage,
        priority: "normal",
      });

      setStatus("success");
      setFormData({ name: "", email: "", phone: "", message: "" });
    } catch (error) {
      if (error?.response?.status === 401) setStatus("auth-error");
      else setStatus("server-error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="adm-page-root contact-page">
      <header className="adm-header">
        <div className="adm-header-inner">
          <div className="adm-header-right">
            <button onClick={() => navigate("/")} className="adm-btn-back" title="العودة">
              <ArrowRight size={20} />
            </button>
            <h1 className="adm-page-title">
              <MessageCircle size={24} />
              <span>تواصل معنا</span>
            </h1>
          </div>
        </div>
      </header>

      <main className="adm-main-container">
        <section className="contact-intro-card adm-card">
          <p className="contact-intro-text">
            نحن هنا لمساعدتك. تواصل معنا بسهولة عبر النموذج التالي وسيقوم فريق الدعم بالرد عليك في أقرب وقت.
          </p>
        </section>

        <section className="contact-form-section">
          <div className="adm-card contact-form-card">
            <div className="adm-card-header centered-header">
              <Send size={18} />
              <h2>إرسال رسالة بريد إلكتروني</h2>
            </div>

            <div className="adm-card-body">
              <form className="contact-form" onSubmit={handleSubmit}>
                <div className="contact-form-row">
                  <PremiumInput
                    label="الاسم الكامل"
                    icon={User}
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    disabled={isSubmitting}
                  />
                  <PremiumInput
                    label="البريد الإلكتروني"
                    icon={Mail}
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={isSubmitting}
                  />
                </div>

                <PremiumInput
                  label="رقم الهاتف (اختياري)"
                  icon={Phone}
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />

                <PremiumInput
                  label="اكتب رسالتك أو استفسارك هنا..."
                  icon={MessageCircle}
                  type="textarea"
                  rows={5}
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />

                {status === "validation-error" && (
                  <div className="adm-error-box contact-status-box">
                    يرجى تعبئة الاسم والبريد الإلكتروني ونص الرسالة قبل الإرسال.
                  </div>
                )}

                {status === "auth-error" && (
                  <div className="adm-error-box contact-status-box">
                    يجب تسجيل الدخول لإرسال رسالة. يرجى تسجيل الدخول ثم إعادة المحاولة.
                  </div>
                )}

                {status === "server-error" && (
                  <div className="adm-error-box contact-status-box">
                    حدث خطأ أثناء إرسال الرسالة، يرجى المحاولة مرة أخرى لاحقًا.
                  </div>
                )}

                {status === "success" && (
                  <div className="adm-notice-box contact-status-box">
                    تم إرسال رسالتك بنجاح! سيتم التواصل معك في أقرب وقت ممكن.
                  </div>
                )}

                <div className="contact-form-footer">
                  <button
                    type="submit"
                    className="adm-btn-mgmt primary contact-submit-btn"
                    disabled={isSubmitting}
                  >
                    <Send size={18} />
                    <span>{isSubmitting ? "جاري الإرسال..." : "إرسال الرسالة"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
