// frontend/src/pages/About.jsx

import { ShieldCheck, Sparkles, TrendingUp, Store, ShoppingBag } from "lucide-react";
import "./About.css";

export default function AboutPage() {
  return (
    <div className="page-container about-page">
      {/* العنوان الرئيسي في أعلى الصفحة */}
      <h1 className="about-page-title">من نحن</h1>

      {/* قسم المقدمة (Intro) */}
      <section className="about-section about-intro">
        <h2 className="about-intro-title">
          طلبية – سوق إلكتروني متعدد البائعين في مكان واحد
        </h2>
        <p className="about-intro-text">
          منصة عربية حديثة تجمع البائعين والمشترين وشركات الشحن في تجربة واحدة
          واضحة وبسيطة.
        </p>
      </section>

      {/* قسم المزايا (Features) */}
      <section className="about-section about-features">
        <h2 className="about-section-heading">مزايا طلبية</h2>

        <div className="about-features-row">
          {/* ثقة ووضوح */}
          <div className="about-feature-card">
            <div className="about-feature-icon">
              <ShieldCheck />
            </div>
            <div className="about-feature-content">
              <h3 className="about-feature-title">ثقة ووضوح</h3>
              <p className="about-feature-text">
                سياسات واضحة، تتبع دقيق للطلبات، ونظام دفع آمن يضمن تجربة مريحة
                وموثوقة للطرفين.
              </p>
            </div>
          </div>

          {/* سهولة الاستخدام */}
          <div className="about-feature-card">
            <div className="about-feature-icon">
              <Sparkles />
            </div>
            <div className="about-feature-content">
              <h3 className="about-feature-title">سهولة الاستخدام</h3>
              <p className="about-feature-text">
                واجهة عربية نظيفة وبسيطة، بدون خطوات معقدة، لتتمكن من إدارة متجرك
                أو التسوق خلال دقائق.
              </p>
            </div>
          </div>

          {/* دعم النمو */}
          <div className="about-feature-card">
            <div className="about-feature-icon">
              <TrendingUp />
            </div>
            <div className="about-feature-content">
              <h3 className="about-feature-title">دعم النمو</h3>
              <p className="about-feature-text">
                تمكين البائعين للوصول إلى عملاء أكثر، وتوفير تنوّع أكبر من
                المنتجات للمشترين في مكان واحد.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* قسم الرسالة (Mission) */}
      <section className="about-mission">
        <h2 className="about-section-heading">رسالتنا</h2>
        <p className="about-mission-text">
          تمكين التجارة الإلكترونية للجميع عبر منصة عصرية تربط المشتري والبائع
          وشركات الشحن في تجربة متوازنة تهتم بالتفاصيل.
        </p>
      </section>

      {/* قسم الدعوة للانضمام (Call to Action) */}
      <section className="about-cta">
        <h2 className="about-cta-title">انضم إلى مجتمع طلبية اليوم</h2>
        <p className="about-cta-text">
          كن جزءًا من منظومة رقمية حديثة؛ كبائع توسّع من خلالها أعمالك، أو كمشتري
          تحصل عبرها على تجربة تسوّق بسيطة وموثوقة.
        </p>

        <div className="about-cta-actions">
          <a href="/register?role=seller" className="about-btn about-btn-primary">
            <Store className="about-btn-icon" />
            <span>تسجيل بائع</span>
          </a>

          <a href="/register?role=buyer" className="about-btn about-btn-secondary">
            <ShoppingBag className="about-btn-icon" />
            <span>تسجيل مشتري</span>
          </a>
        </div>
      </section>
    </div>
  );
}
