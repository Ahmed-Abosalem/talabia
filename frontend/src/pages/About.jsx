import { useNavigate } from "react-router-dom";
import { Shield, MousePointer2, TrendingUp, Store, User, Quote, ArrowRight, PhoneCall, Mail, Send } from "lucide-react";
import "./About.css";
import PremiumInput from "@/components/Auth/PremiumInput";
import { useState } from "react";

export default function AboutPage() {
  const navigate = useNavigate();
  const [newsletter, setNewsletter] = useState({ name: "", email: "" });

  const handleNewsletterChange = (e) => {
    const { name, value } = e.target;
    setNewsletter(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="adm-page-root about-page">
      <header className="adm-header">
        <div className="adm-header-inner">
          <div className="adm-header-right">
            <button onClick={() => navigate("/")} className="adm-btn-back" title="العودة">
              <ArrowRight size={20} />
            </button>
            <h1 className="adm-page-title">
              <Store size={24} />
              <span>من نحن</span>
            </h1>
          </div>
        </div>
      </header>

      <div className="adm-main-container">
        <main className="adm-details-grid">
          {/* القسم الافتتاحي (Hero) */}
          <section className="about-hero adm-card span-12">
            <div className="about-hero-content">
              <h2 className="about-hero-title">سوق إلكتروني مبتكر</h2>
              <p className="about-hero-text">
                نظام متكامل يجمع التاجر والمشتري وشركات الشحن في منصة واحدة تضمن السهولة والأمان والنمو للجميع.
              </p>
            </div>
          </section>

          {/* قسم المزايا (Features) */}
          <section className="about-features-section span-12">
            <div className="about-features-grid">
              <article className="adm-card about-feature-card">
                <div className="about-feature-icon-wrapper">
                  <Shield size={32} />
                </div>
                <h3 className="about-feature-title">ثقة ووضوح</h3>
                <p className="about-feature-text">
                  سياسات واضحة، تتبع دقيق للطلبات، ونظام دفع آمن يضمن حقوق جميع الأطراف.
                </p>
              </article>

              <article className="adm-card about-feature-card">
                <div className="about-feature-icon-wrapper">
                  <MousePointer2 size={32} />
                </div>
                <h3 className="about-feature-title">سهولة الاستخدام</h3>
                <p className="about-feature-text">
                  واجهة عربية عصرية تمكنك من إدارة متجرك أو التسوق بكل انسيابية وبدون تعقيدات.
                </p>
              </article>

              <article className="adm-card about-feature-card">
                <div className="about-feature-icon-wrapper">
                  <TrendingUp size={32} />
                </div>
                <h3 className="about-feature-title">دعم النمو</h3>
                <p className="about-feature-text">
                  نمكن البائعين من الوصول لجمهور أوسع، ونوفر للمشترين تنوعاً هائلاً بجودة عالية.
                </p>
              </article>
            </div>
          </section>

          {/* قسم الرسالة (Mission) */}
          <section className="adm-card about-mission-card span-12">
            <div className="mission-quote-icon">
              <Quote size={48} />
            </div>
            <h2 className="mission-title">رسالتنا</h2>
            <p className="mission-text">
              تمكين التجارة الإلكترونية عبر منصة عصرية تربط المشتري والبائع وشركات الشحن في تجربة
              متكاملة تهتم بأدق التفاصيل لضمان التميز والرضا.
            </p>
          </section>

          {/* قسم الدعوة للانضمام (Call to Action) */}
          <section className="about-cta-section span-12">
            <div className="about-cta-card">
              <h2 className="cta-title">جاهز للبدء معنا؟</h2>
              <p className="cta-text">
                سواء كنت بائعاً طموحاً أو مشترياً يبحث عن الأفضل، مكانك هنا.
              </p>

              <div className="cta-actions">
                <a href="/register?role=seller" className="adm-btn-mgmt primary">
                  <Store size={18} />
                  <span>ابدأ كبائع</span>
                </a>

                <a href="/register?role=buyer" className="adm-btn-mgmt outline">
                  <User size={18} />
                  <span>تسجيل مشتري</span>
                </a>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
