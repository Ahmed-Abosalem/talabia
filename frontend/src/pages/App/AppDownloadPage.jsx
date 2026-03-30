/* s:\Talabia_new\frontend\src\pages\App\AppDownloadPage.jsx */
import React from 'react';
import { useApp } from '@/context/AppContext';
import { Smartphone, Apple, Bell, Zap, CloudOff, ArrowRight, Store } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import logo from "@/assets/logo.png";
import './AppDownloadPage.css';

const AppDownloadPage = () => {
  const navigate = useNavigate();
  const { deferredPrompt, isAppInstalled, setDeferredPrompt, showToast } = useApp();

  const handleInstallClick = async () => {
    // 1. التحقق إذا كان التطبيق مثبتاً بالفعل (Standalone Mode)
    if (isAppInstalled) {
      showToast("التطبيق مثبت بالفعل على جهازك. استمتع بالتجربة!", "success");
      return;
    }

    // 2. التحقق من وجود إشارة التثبيت (للمتصفحات المدعومة)
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
      return;
    }

    // 3. التعامل مع الحالات الأخرى (iOS أو متصفحات غير مدعومة حالياً)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    
    if (isIOS) {
      showToast("لمستخدمي الآيفون: استخدم خيار 'إضافة إلى الشاشة الرئيسية' من قائمة المشاركة.", "info");
    } else {
      showToast("خيار التثبيت المباشر غير متاح حالياً. يرجى التأكد من أنك تستخدم متصفح كروم أو الضغط على 'إضافة للشاشة الرئيسية' من إعدادات المتصفح.", "warning");
    }
  };

  return (
    <div className="adm-page-root download-page animate-fade-in">
      <header className="adm-header">
        <div className="adm-header-inner">
          <div className="adm-header-right">
            <button onClick={() => navigate("/")} className="adm-btn-back" title="العودة">
              <ArrowRight size={20} />
            </button>
            <h1 className="adm-page-title download-page-header-title">
              <Smartphone size={24} />
              <span>تحميل التطبيق</span>
            </h1>
          </div>
        </div>
      </header>

      <div className="adm-main-container">
        <div className="adm-details-grid">
          {/* 📦 Download Options Grid */}
          <div className="span-12">
            <div className="download-options-grid">
              {/* Android Card */}
              <section className="adm-card download-option-card">
                <div className="option-visual-container">
                  <div className="mobile-app-icon-preview">
                    <img 
                      src={logo} 
                      alt="Talabia Logo" 
                      className="android-logo-large"
                    />
                  </div>
                </div>
                <h3 className="option-title">حمل التطبيق الآن</h3>
                <p className="option-desc">
                  بالضغط على أيقونة Google Play
                </p>
                <div className="badge-wrapper" style={{ display: 'flex', justifyContent: 'center' }}>
                  <a 
                    href="https://play.google.com/store/apps/details?id=com.talabia.app" 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <img 
                      src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" 
                      alt="Download from Google Play" 
                      className="google-play-badge"
                    />
                  </a>
                </div>
              </section>

              {/* Other Phones Card */}
              <section className="adm-card download-option-card">
                <div className="option-visual-container">
                  <div className="mobile-app-icon-preview" style={{ background: '#f8fafc' }}>
                    <Smartphone size={60} className="apple-logo-large" strokeWidth={1.5} />
                  </div>
                </div>
                <h3 className="option-title">بقية الهواتف</h3>
                <p className="option-desc">
                  ثبّت التطبيق الذكي بمجرد الضغط على الزر، ليعمل كأنه تطبيق أصلي على هاتفك.
                </p>
                <div className="option-action">
                  <button 
                    onClick={handleInstallClick} 
                    className="adm-btn-mgmt primary w-full"
                    style={{ height: '60px', borderRadius: '15px', fontSize: '1.2rem' }}
                  >
                    تثبيت التطبيق الآن
                  </button>
                </div>
              </section>
            </div>
          </div>

          {/* 🏆 Benefits Card */}
          <div className="span-12">
            <section className="adm-card benefits-section">
              <h3 className="benefits-title">لماذا تنزل التطبيق؟</h3>
              <div className="benefits-grid">
                <div className="benefit-item">
                  <div className="benefit-icon-ring"><Bell size={28} /></div>
                  <h4 className="benefit-name">تنبيهات فورية</h4>
                  <p className="benefit-text">استلم إشعارات العروض الجديدة وتحديثات طلباتك مباشرة.</p>
                </div>
                <div className="benefit-item">
                  <div className="benefit-icon-ring"><Zap size={28} /></div>
                  <h4 className="benefit-name">سرعة فائقة</h4>
                  <p className="benefit-text">تصفح انسيابي وسريع يتفوق على المتصفحات.</p>
                </div>
                <div className="benefit-item">
                  <div className="benefit-icon-ring"><CloudOff size={28} /></div>
                  <h4 className="benefit-name">دعم الأوفلاين</h4>
                  <p className="benefit-text">استعرض سلتك ومنتجاتك حتى في حال ضعف الاتصال.</p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppDownloadPage;
