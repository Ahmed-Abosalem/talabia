import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar/Navbar";
import Footer from "@/components/Footer/Footer";
import AppContainer from "@/components/Layout/AppContainer";
import Loader from "@/components/Loader";
import Notification from "@/components/Notification";
import AppRouter from "./router";
import { useApp } from "@/context/AppContext";
import BottomNav from "@/components/BottomNav/BottomNav";
import ScrollToTop from "@/components/ScrollToTop";
import { useEffect, useState } from "react";
import { StatusBar, Style } from "@capacitor/status-bar";
import { App as CapApp } from "@capacitor/app";
import SplashScreen from "@/components/pwa/SplashScreen";

export default function App() {
  const { isLoading, toast } = useApp();
  
  // 🎯 SplashScreen only on mobile/native, never on desktop
  const isMobileOrNative = typeof window !== 'undefined' && (
    window.Capacitor?.isNativePlatform?.() || window.innerWidth < 1024
  );
  const [showSplash, setShowSplash] = useState(isMobileOrNative);
  const location = useLocation();
  const navigate = useNavigate();

  // 🛡️ Super-Perfection: Hardware Back Button & StatusBar Sync
  useEffect(() => {
    const initNativeFeatures = async () => {
      try {
        // 1. Check if we are on a native platform (Android/iOS)
        if (window.Capacitor && window.Capacitor.isNativePlatform() && StatusBar) {
          try {
            // 2. StatusBar Style
            await StatusBar.setStyle({ style: Style.Light });
            await StatusBar.setBackgroundColor({ color: '#ffffff' });
          } catch (err) {
            // Silently ignore if plugin not implemented
          }

          // 3. Hardware Back Button Handler
          CapApp.addListener('backButton', ({ canGoBack }) => {
            if (canGoBack) {
              window.history.back();
            } else {
              CapApp.exitApp();
            }
          });
        }
      } catch (e) {
        console.warn("Native features init failed:", e);
      }
    };
    initNativeFeatures();
    
    return () => {
      if (window.Capacitor?.isNativePlatform) {
        CapApp.removeAllListeners();
      }
    };
  }, []);

  // 🔓 Universal Fluid Unlock: All store pages are now 100% width on Mobile/App environments
  const isFluidPage = true;

  // Pages where BottomNav should be hidden
  const hideBottomNav = ["/login", "/register"].includes(location.pathname);

  return (
    <div className={`app-root ${isFluidPage ? "is-fluid-layout" : ""}`}>
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
      
      <ScrollToTop />
      <Navbar />
      <main className={!hideBottomNav ? "has-bottom-nav" : ""}>
        <AppContainer fluid={isFluidPage}>
          <AppRouter />
        </AppContainer>
        <Footer />
      </main>
      {!hideBottomNav && <BottomNav />}

      {isLoading && <Loader />}
      {toast && <Notification type={toast.type} message={toast.message} />}
    </div>
  );
}
