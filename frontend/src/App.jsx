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
import { SplashScreen } from "@capacitor/splash-screen";
import ReactSplashScreen from "@/components/pwa/SplashScreen";
import { useLayoutEffect } from "react";

export default function App() {
  const { isLoading, toast } = useApp();
  
  // 🎯 SplashScreen only on mobile/native, never on desktop
  const isMobileOrNative = typeof window !== 'undefined' && (
    window.Capacitor?.isNativePlatform?.() || window.innerWidth < 1024
  );
  const [showSplash, setShowSplash] = useState(isMobileOrNative);
  const location = useLocation();
  const navigate = useNavigate();

  // 🧹 CLEANUP: Restore White Background & Original Status Bar after Splash
  useEffect(() => {
    if (!showSplash) {
      // 1. Restore Page Background and Scroll
      document.body.style.backgroundColor = '#f8fafc'; 
      document.body.classList.remove('overflow-hidden');
      
      // 2. Restore StatusBar to White/Dark Style for the Storefront
      const restoreStatusBar = async () => {
        if (window.Capacitor && window.Capacitor.isNativePlatform() && StatusBar) {
          try {
            await StatusBar.setStyle({ style: Style.Light });
            await StatusBar.setBackgroundColor({ color: '#ffffff' });
          } catch (err) {
            // Silently ignore
          }
        }
      };
      restoreStatusBar();
    }
  }, [showSplash]);

  // 🚀 FRAME-PERFECT SYNC: Handoff from Native to React Splash
  useLayoutEffect(() => {
    if (window.Capacitor?.isNativePlatform?.()) {
      // Hide the native splash only AFTER React has built the first frame
      // This ensures 100% parity between the two layers.
      setTimeout(() => {
        SplashScreen.hide();
      }, 50); // Minimal buffer to ensure paint
    }
  }, []);

  // 🛡️ Super-Perfection: Hardware Back Button & StatusBar Sync
  useEffect(() => {
    const initNativeFeatures = async () => {
      try {
        // 1. Check if we are on a native platform (Android/iOS)
        if (window.Capacitor && window.Capacitor.isNativePlatform() && StatusBar) {
          try {
            // 2. StatusBar Style
            // Match the Deep Olive Edge for total immersion
            await StatusBar.setStyle({ style: Style.Dark });
            await StatusBar.setBackgroundColor({ color: '#353B17' });
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
      {showSplash && <ReactSplashScreen onComplete={() => setShowSplash(false)} />}
      
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
