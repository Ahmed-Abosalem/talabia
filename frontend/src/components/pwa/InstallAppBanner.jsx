import { useEffect, useMemo, useState } from "react";

/**
 * بطاقة تثبيت PWA (محافظة جدًا):
 * - تظهر فقط إذا:
 *   1) المتصفح يدعم beforeinstallprompt (يعني Chromium غالبًا)
 *   2) التطبيق غير مثبت (ليس standalone)
 * - تختفي بعد التثبيت (appinstalled)
 * - لا تغيّر SW ولا تضيف كاش للـ HTML أو API
 */
export default function InstallAppBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const isStandalone = useMemo(() => {
    if (typeof window === "undefined") return false;
    const mql = window.matchMedia?.("(display-mode: standalone)");
    // iOS Safari:
    const iosStandalone = window.navigator?.standalone === true;
    return (mql && mql.matches) || iosStandalone;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandalone) return; // إذا التطبيق مثبت/standalone لا نظهر البطاقة

    const onBeforeInstallPrompt = (e) => {
      // نخزن الحدث لزر "تثبيت" بدل أن يظهر تلقائيًا
      e.preventDefault();
      setDeferredPrompt(e);
      setVisible(true);
    };

    const onAppInstalled = () => {
      setVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, [isStandalone]);

  if (!visible || dismissed || isStandalone) return null;

  const onInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      // يفتح نافذة التثبيت
      await deferredPrompt.prompt();

      // بعض المتصفحات تعطي نتيجة اختيار المستخدم
      const choice = await deferredPrompt.userChoice?.catch(() => null);

      // في كل الحالات نخفي البطاقة بعد المحاولة حتى لا نزعج المستخدم
      setVisible(false);
      setDeferredPrompt(null);

      // لو تبغى لاحقًا: ممكن تسجل choice.outcome (accepted/dismissed)
      void choice;
    } catch {
      // لو حدث خطأ، نخفي البطاقة احتياطًا
      setVisible(false);
      setDeferredPrompt(null);
    }
  };

  const cardStyle = {
    margin: "12px 0",
    padding: "12px 12px",
    borderRadius: 14,
    border: "1px solid rgba(0,0,0,0.08)",
    background: "#fff",
    boxShadow: "0 10px 24px rgba(0,0,0,0.06)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  };

  const titleStyle = {
    margin: 0,
    fontSize: 15,
    fontWeight: 800,
    lineHeight: 1.1,
  };

  const subStyle = {
    margin: "4px 0 0",
    fontSize: 12.5,
    opacity: 0.75,
    lineHeight: 1.2,
  };

  const btnStyle = {
    border: "0",
    borderRadius: 12,
    padding: "10px 14px",
    fontWeight: 800,
    cursor: "pointer",
    background: "#111",
    color: "#fff",
    whiteSpace: "nowrap",
  };

  const closeStyle = {
    border: "0",
    background: "transparent",
    cursor: "pointer",
    fontSize: 18,
    lineHeight: 1,
    opacity: 0.55,
    padding: "0 6px",
  };

  return (
    <div style={cardStyle} dir="rtl" aria-label="بطاقة تثبيت التطبيق">
      <div style={{ minWidth: 0 }}>
        <p style={titleStyle}>نزّل تطبيق طلبية</p>
        <p style={subStyle}>تثبيت سريع على هاتفك لفتح المتجر كتطبيق مستقل</p>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button type="button" style={btnStyle} onClick={onInstallClick}>
          تثبيت
        </button>
        <button
          type="button"
          style={closeStyle}
          onClick={() => setDismissed(true)}
          aria-label="إغلاق"
          title="إغلاق"
        >
          ×
        </button>
      </div>
    </div>
  );
}
