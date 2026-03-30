// src/pages/PrivacyPolicy.jsx

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Calendar, Loader2, ArrowRight } from "lucide-react";
import axios from "axios";
import "./PrivacyPolicy.css";

export default function PrivacyPolicy() {
  const navigate = useNavigate();
  const [content, setContent] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchPrivacyPolicy();
  }, []);

  const fetchPrivacyPolicy = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await axios.get("/api/privacy-policy");

      if (response.data && response.data.content) {
        setContent(response.data.content);
        setLastUpdated(response.data.lastUpdated || new Date().toISOString());
      } else {
        // محتوى افتراضي إذا لم يكن هناك محتوى في قاعدة البيانات
        setContent(getDefaultContent());
        setLastUpdated(new Date().toISOString());
      }
    } catch (err) {
      console.error("Error fetching privacy policy:", err);
      // في حالة الخطأ، نعرض المحتوى الافتراضي
      setContent(getDefaultContent());
      setLastUpdated(new Date().toISOString());
    } finally {
      setLoading(false);
    }
  };

  const getDefaultContent = () => {
    return `سياسة الخصوصية

مرحباً بك في منصة طلبية. نحن نلتزم بحماية خصوصيتك وبياناتك الشخصية.

## جمع المعلومات

نقوم بجمع المعلومات التالية:
- الاسم الكامل
- البريد الإلكتروني
- رقم الهاتف
- عنوان التوصيل (للمشترين)
- معلومات المتجر (للبائعين)
- معلومات الشركة (لشركات الشحن)

## استخدام المعلومات

نستخدم معلوماتك للأغراض التالية:
- تقديم خدماتنا بشكل فعال
- معالجة الطلبات والمدفوعات
- التواصل معك بخصوص طلباتك
- تحسين تجربة المستخدم
- إرسال التحديثات والإشعارات المهمة

## حماية البيانات

نتخذ إجراءات أمنية صارمة لحماية بياناتك:
- تشفير البيانات الحساسة
- استخدام بروتوكولات أمان متقدمة
- تقييد الوصول إلى البيانات الشخصية
- مراقبة مستمرة للأنظمة

## مشاركة المعلومات

لن نشارك معلوماتك الشخصية مع أطراف ثالثة إلا في الحالات التالية:
- بموافقتك الصريحة
- لتنفيذ الخدمات المطلوبة (مثل الشحن)
- عند الطلب القانوني من الجهات المختصة

## حقوقك

لديك الحق في:
- الوصول إلى بياناتك الشخصية
- تعديل أو تحديث معلوماتك
- حذف حسابك وبياناتك
- الاعتراض على معالجة بياناتك

## الاتصال بنا

إذا كان لديك أي استفسارات حول سياسة الخصوصية، يرجى التواصل معنا عبر صفحة "تواصل معنا".`;
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("ar-SA", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return "غير محدد";
    }
  };

  return (
    <div className="adm-page-root privacy-page">
      <header className="adm-header">
        <div className="adm-header-inner">
          <div className="adm-header-right">
            <button onClick={() => navigate("/")} className="adm-btn-back" title="العودة">
              <ArrowRight size={20} />
            </button>
            <h1 className="adm-page-title">
              <Shield size={24} />
              <span>سياسة الخصوصية</span>
            </h1>
          </div>
        </div>
      </header>

      <main className="adm-main-container">
        <div className="privacy-container">
          <section className="adm-card privacy-card">
            {loading ? (
              <div className="privacy-loading-box">
                <Loader2 size={48} />
                <span>جاري تحميل سياسة الخصوصية...</span>
              </div>
            ) : error ? (
              <div className="privacy-error-box">
                <p>{error}</p>
                <button className="adm-btn primary" onClick={fetchPrivacyPolicy}>إعادة المحاولة</button>
              </div>
            ) : (
              <>
                <div className="privacy-header-content">
                  <div className="privacy-icon-wrapper">
                    <Shield size={32} />
                  </div>
                  <h2 className="privacy-card-title">سياسة الخصوصية</h2>
                  <p className="privacy-card-subtitle">
                    نحن نحترم خصوصيتك ونلتزم بحماية بياناتك الشخصية.
                  </p>
                  <div className="privacy-last-updated">
                    <Calendar size={16} />
                    <span>آخر تحديث: {formatDate(lastUpdated)}</span>
                  </div>
                </div>

                <div className="privacy-content-body">
                  {/* We map the content with basic formatting if it's text-based */}
                  {content.split("\n\n").map((block, idx) => {
                    if (block.startsWith("##")) {
                      return <h2 key={idx}>{block.replace("##", "").trim()}</h2>;
                    }
                    if (block.includes("- ")) {
                      return (
                        <ul key={idx}>
                          {block.split("\n").map((li, lidx) => (
                            <li key={lidx}>{li.replace("-", "").trim()}</li>
                          ))}
                        </ul>
                      );
                    }
                    return <p key={idx}>{block}</p>;
                  })}
                </div>
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
