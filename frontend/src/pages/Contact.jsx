// frontend/src/pages/Contact.jsx

import { useState } from "react";
import { Mail, Phone, Facebook, Instagram, Send } from "lucide-react";
import "./Contact.css";
import userService from "../services/userService";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });

  // status:
  // "success" | "validation-error" | "auth-error" | "server-error" | null
  const [status, setStatus] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (status) setStatus(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // تحقق بسيط من الحقول الأساسية
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      setStatus("validation-error");
      return;
    }

    try {
      setIsSubmitting(true);
      setStatus(null);

      // نبني عنوان ونص التذكرة
      const subject = `رسالة من صفحة تواصل معنا - ${formData.name.trim()}`;

      const composedMessage = `
الاسم: ${formData.name.trim()}
البريد الإلكتروني: ${formData.email.trim()}
رقم الهاتف: ${formData.phone?.trim() || "لم يُذكر"}

الرسالة:
${formData.message.trim()}
      `.trim();

      // استدعاء API لإنشاء تذكرة الدعم
      await userService.createSupportTicket({
        subject,
        message: composedMessage,
        priority: "normal",
      });

      setStatus("success");
      setFormData({
        name: "",
        email: "",
        phone: "",
        message: "",
      });
    } catch (error) {
      // لو المستخدم غير مسجل دخول (JWT مفقود أو منتهي)
      if (error?.response?.status === 401) {
        setStatus("auth-error");
      } else {
        setStatus("server-error");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-container contact-page">
      {/* العنوان الرئيسي */}
      <h1 className="contact-page-title">تواصل معنا</h1>

      {/* قسم المقدمة */}
      <section className="contact-section contact-intro">
        <p className="contact-intro-text">
          نحن هنا لمساعدتك. تواصل معنا بسهولة عبر النموذج أو المعلومات التالية.
        </p>
      </section>

      {/* قسم النموذج + معلومات التواصل */}
      <section className="contact-section contact-body">
        <div className="contact-body-grid">
          {/* نموذج التواصل */}
          <div className="contact-form-wrapper">
            <h2 className="contact-section-heading">نموذج التواصل</h2>
            <form className="contact-form" onSubmit={handleSubmit}>
              <div className="contact-form-field">
                <label htmlFor="name">الاسم الكامل</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="اكتب اسمك هنا"
                  value={formData.name}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
              </div>

              <div className="contact-form-field">
                <label htmlFor="email">البريد الإلكتروني</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="example@mail.com"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
              </div>

              <div className="contact-form-field">
                <label htmlFor="phone">
                  رقم الهاتف <span className="contact-field-optional">(اختياري)</span>
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="text"
                  placeholder="+90 5xx xxx xx xx"
                  value={formData.phone}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
              </div>

              <div className="contact-form-field">
                <label htmlFor="message">الرسالة</label>
                <textarea
                  id="message"
                  name="message"
                  rows={5}
                  placeholder="اكتب رسالتك أو استفسارك هنا..."
                  value={formData.message}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
              </div>

              {status === "validation-error" && (
                <p className="contact-form-status contact-form-status-error">
                  يرجى تعبئة الاسم والبريد الإلكتروني ونص الرسالة قبل الإرسال.
                </p>
              )}

              {status === "auth-error" && (
                <p className="contact-form-status contact-form-status-error">
                  يجب تسجيل الدخول لإرسال رسالة عبر نموذج التواصل. يرجى تسجيل الدخول ثم إعادة المحاولة.
                </p>
              )}

              {status === "server-error" && (
                <p className="contact-form-status contact-form-status-error">
                  حدث خطأ أثناء إرسال الرسالة، يرجى المحاولة مرة أخرى لاحقًا.
                </p>
              )}

              {status === "success" && (
                <p className="contact-form-status contact-form-status-success">
                  تم إرسال رسالتك بنجاح على شكل تذكرة دعم، سيتم التواصل معك في أقرب وقت ممكن.
                </p>
              )}

              <button
                type="submit"
                className="contact-submit-btn"
                disabled={isSubmitting}
              >
                <Send className="contact-submit-icon" />
                <span>{isSubmitting ? "جاري الإرسال..." : "إرسال الرسالة"}</span>
              </button>
            </form>
          </div>

          {/* معلومات التواصل */}
          <div className="contact-info-wrapper">
            <h2 className="contact-section-heading">معلومات التواصل</h2>

            <div className="contact-info-list">
              <div className="contact-info-item">
                <div className="contact-info-icon">
                  <Mail />
                </div>
                <div className="contact-info-texts">
                  <span className="contact-info-label">البريد الإلكتروني</span>
                  <span className="contact-info-value">support@talabia.com</span>
                </div>
              </div>

              <div className="contact-info-item">
                <div className="contact-info-icon">
                  <Phone />
                </div>
                <div className="contact-info-texts">
                  <span className="contact-info-label">رقم الهاتف</span>
                  <span className="contact-info-value">+90 555 000 0000</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* قسم روابط التواصل الاجتماعي */}
      <section className="contact-section contact-social">
        <h2 className="contact-section-heading">تواصل معنا عبر الشبكات الاجتماعية</h2>
        <div className="contact-social-row">
          <a
            href="#"
            className="contact-social-icon contact-social-icon-facebook"
            aria-label="Facebook"
          >
            <Facebook />
          </a>
          <a
            href="#"
            className="contact-social-icon contact-social-icon-instagram"
            aria-label="Instagram"
          >
            <Instagram />
          </a>
        </div>
      </section>
    </div>
  );
}
