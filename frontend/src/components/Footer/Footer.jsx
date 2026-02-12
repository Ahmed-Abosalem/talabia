// frontend/src/components/Footer/Footer.jsx

import { useNavigate } from "react-router-dom";
import { Facebook, Instagram } from "lucide-react";
import "./Footer.css";

export default function Footer() {
  const navigate = useNavigate();

  return (
    <footer className="footer-root">
      <div className="footer-inner">
        {/* القسم الأول – الهوية */}
        <div className="footer-col">
          <div className="footer-brand">طلبية</div>
          <p className="footer-brand-desc">
            منصة تربط البائعين بالمشترين في تجربة تسوق عصرية وسهلة
            مع دعم شركات الشحن.
          </p>
        </div>

        {/* القسم الثاني – الروابط السريعة (شبكة 2×2) */}
        <div className="footer-col">
          <div className="footer-column-title">روابط سريعة</div>
          <div className="footer-quick-links-grid">
            <button
              type="button"
              className="footer-link"
              onClick={() => navigate("/")}
            >
              الرئيسية
            </button>
            <button
              type="button"
              className="footer-link"
              onClick={() => navigate("/about")}
            >
              من نحن
            </button>
            <button
              type="button"
              className="footer-link"
              onClick={() => navigate("/contact")}
            >
              تواصل معنا
            </button>
            <button
              type="button"
              className="footer-link"
              onClick={() => navigate("/cart")}
            >
              سلة المشتريات
            </button>
          </div>
        </div>

        {/* القسم الثالث – الدعم */}
        <div className="footer-col">
          <div className="footer-column-title">الدعم</div>
          <button type="button" className="footer-link">
            الأسئلة الشائعة
          </button>
          <button type="button" className="footer-link">
            سياسة الخصوصية
          </button>
          <button type="button" className="footer-link">
            الشروط والأحكام
          </button>
        </div>

        {/* القسم الرابع – مواقع التواصل الاجتماعي */}
        <div className="footer-col">
          <div className="footer-column-title">تابعنا</div>
          <div className="footer-social-icons">
            <a
              href="#"
              className="footer-social-icon"
              aria-label="Facebook"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Facebook />
            </a>
            <a
              href="#"
              className="footer-social-icon"
              aria-label="Instagram"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Instagram />
            </a>
          </div>
        </div>
      </div>

      {/* قسم الحقوق في الأسفل */}
      <div className="footer-bottom">
        <div className="footer-bottom-divider" />
        <p className="footer-bottom-text">
          © 2025 طلبية. جميع الحقوق محفوظة.
        </p>
      </div>
    </footer>
  );
}
