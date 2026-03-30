// frontend/src/components/Footer/Footer.jsx

import { useNavigate } from "react-router-dom";
import { Facebook, Instagram } from "lucide-react";
import "./Footer.css";
import logo from "@/assets/logo.png";

export default function Footer() {
  const navigate = useNavigate();

  // 🖱️ Consolidated Navigation Handler: Navigate + Scroll Top
  const handleNav = (path) => {
    navigate(path);
    window.scrollTo({ top: 0, behavior: "instant" }); // Instant jump to top as per "prevent scroll to middle/bottom"
  };

  return (
    <footer className="footer-root">
      <div className="footer-inner">

        {/* 1️⃣ Branding Zone */}
        <div className="footer-col footer-brand">
          <img
            src={logo}
            alt="طلبية"
            className="footer-logo"
            loading="lazy"
          />
          <p className="footer-brand-desc">
            منصة تربط البائعين بالمشترين في تجربة تسوق عصرية وسهلة وممتعة وآمنة.
          </p>
        </div>

        {/* 2️⃣ Quick Links Zone (Vertical Layout) */}
        <div className="footer-col">
          <div className="footer-column-title">روابط سريعة</div>
          <div className="footer-links-group">
            <button type="button" className="footer-link" onClick={() => handleNav("/")}>
              الرئيسية
            </button>
            <button type="button" className="footer-link" onClick={() => handleNav("/about")}>
              من نحن
            </button>
            <button type="button" className="footer-link" onClick={() => handleNav("/contact")}>
              تواصل معنا
            </button>
            <button type="button" className="footer-link" onClick={() => handleNav("/cart")}>
              سلة المشتريات
            </button>
          </div>
        </div>

        {/* 3️⃣ Social + Privacy Zone (Structured) */}
        <div className="footer-col footer-social-wrapper">

          {/* Privacy Section */}
          <div className="footer-group">
            <div className="footer-column-title">الخصوصية</div>
            <button
              type="button"
              className="footer-link footer-privacy-btn"
              onClick={() => handleNav("/privacy-policy")}
            >
              سياسة الخصوصية
            </button>
          </div>

          {/* Social Section */}
          <div className="footer-group" style={{ marginTop: 'auto' }}>
            <div className="footer-column-title">تابعنا</div>
            <div className="social-icons-row">
              <a
                href="https://www.facebook.com/share/1Dfwu2UG8z/"
                className="social-icon-btn facebook"
                aria-label="Facebook"
                target="_blank"
                rel="noopener noreferrer"
              >
                {/* Solid Fill for Brand Look */}
                <Facebook fill="white" strokeWidth={0} />
              </a>
              <a
                href="https://www.instagram.com/talabia.matjar?igsh=MWo3eTl5aHlnZ3kwaA=="
                className="social-icon-btn instagram"
                aria-label="Instagram"
                target="_blank"
                rel="noopener noreferrer"
              >
                {/* Custom SVG for Perfect Instagram Identity */}
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                </svg>
              </a>
            </div>
          </div>

        </div>

      </div>

      {/* Bottom Copyright */}
      <div className="footer-bottom">
        <p className="footer-bottom-text">
          © 2025 طلبية. جميع الحقوق محفوظة.
        </p>
      </div>
    </footer>
  );
}
