/* s:\Talabia_new\frontend\src\pages\App\AppDownloadPage.jsx */
import React from 'react';
import { useApp } from '@/context/AppContext';
import { Smartphone, Apple, Bell, Zap, CloudOff, ArrowRight, Store } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import logo from "@/assets/logo.png";
import './AppDownloadPage.css';

const AppDownloadPage = () => {
  const navigate = useNavigate();
  const { deferredPrompt, isAppInstalled, pwaReady, setDeferredPrompt, showToast } = useApp();

  const handleInstallClick = async () => {
    // التحقق من الجاهزية
    if (!pwaReady) {
      showToast("جاري التحقق من حالة النظام، يرجى المحاولة بعد لحظات...", "info");
      return;
    }

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
        showToast("بدء عملية التثبيت... ستظهر أيقونة التطبيق على شاشة هاتفك قريباً.", "success");
      }
      return;
    }

    // 3. التعامل مع الحالات الأخرى (iOS أو متصفحات غير مدعومة حالياً)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    
    if (isIOS) {
      showToast("يرجى قراءة تعليمات التثبيت للآيفون بالأسفل.", "info");
      const iosSection = document.getElementById('ios-instructions');
      if (iosSection) iosSection.scrollIntoView({ behavior: 'smooth' });
    } else {
      showToast("خيار التثبيت المباشر غير متاح حالياً. يرجى التأكد من استخدام متصفح 'Chrome' أو استخدامه يدوياً من قائمة المتصفح.", "warning");
    }
  };

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

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
              <section className="adm-card download-option-card" id="ios-instructions">
                <div className="option-visual-container">
                  <div className="mobile-app-icon-preview" style={{ background: '#f8fafc' }}>
                    <Smartphone size={60} className="apple-logo-large" strokeWidth={1.5} />
                  </div>
                </div>
                <h3 className="option-title">{isIOS ? "تثبيت للآيفون" : "بقية الهواتف"}</h3>
                <p className="option-desc">
                  {isIOS 
                    ? "ثبّت التطبيق يدوياً ليعمل كأنه تطبيق أصلي تماماً."
                    : "ثبّت التطبيق الذكي بمجرد الضغط على الزر، ليعمل كأنه تطبيق أصلي على هاتفك."
                  }
                </p>
                
                {isIOS ? (
                  <div className="ios-manual-steps" style={{ textAlign: 'right', padding: '15px', background: '#f0f4f8', borderRadius: '15px', border: '1px solid #dbeafe' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', color: '#1e40af' }}>
                      <Apple size={20} />
                      <strong>خطوات التثبيت للآيفون:</strong>
                    </div>
                    <ol style={{ paddingRight: '20px', margin: 0, fontSize: '0.9rem', lineHeight: '1.6', color: '#334155' }}>
                      <li>افتح الموقع في متصفح <strong>Safari</strong></li>
                      <li>اضغط على زر المشاركة <strong>(Share)</strong> <img src="https://upload.wikimedia.org/wikipedia/commons/d/da/Apple_Safari_share_icon.svg" width="18" style={{verticalAlign:'middle'}} /> بالأسفل</li>
                      <li>اختر <strong>"إضافة إلى الشاشة الرئيسية"</strong></li>
                      <li>اضغط <strong>"إضافة"</strong> الموجودة بالأعلى</li>
                    </ol>
                  </div>
                ) : (
                  <div className="option-action">
                    <button 
                      onClick={handleInstallClick} 
                      className="adm-btn-mgmt primary w-full"
                      style={{ 
                        height: '60px', 
                        borderRadius: '15px', 
                        fontSize: '1.2rem',
                        opacity: pwaReady ? 1 : 0.7,
                        cursor: pwaReady ? 'pointer' : 'wait'
                      }}
                      disabled={!pwaReady}
                    >
                      {!pwaReady ? "جاري التحقق..." : "تثبيت التطبيق الآن"}
                    </button>
                  </div>
                )}

                {/* 🔧 Troubleshooting help */}
                {!deferredPrompt && !isAppInstalled && pwaReady && !isIOS && (
                  <div style={{ marginTop: '15px', padding: '10px', background: '#fff9f9', borderRadius: '10px', fontSize: '11px', border: '1px dashed #ffa6a6', color: '#a30000' }}>
                    <strong>تواجه مشكلة في التثبيت؟</strong><br />
                    قد يتأخر ظهور خيار التثبيت لعدة ثوانٍ. إذا استمرت المشكلة، جرب استخدام خيار "تثبيت التطبيق" أو "إضافة للشاشة الرئيسية" من قائمة إعدادات متصفحك (النقاط الثلاث بالأعلى).
                  </div>
                )}
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
