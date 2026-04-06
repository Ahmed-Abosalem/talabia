import { useLocation } from "react-router-dom";
import Navbar from "@/components/Navbar/Navbar";
import Footer from "@/components/Footer/Footer";
import AppContainer from "@/components/Layout/AppContainer";
import Loader from "@/components/Loader";
import Notification from "@/components/Notification";
import AppRouter from "./router";
import { useApp } from "@/context/AppContext";
import BottomNav from "@/components/BottomNav/BottomNav";
import ScrollToTop from "@/components/ScrollToTop";
import { useState, useEffect } from "react";
import { StatusBar, Style } from "@capacitor/status-bar";
import { App as CapApp } from "@capacitor/app";
import { SplashScreen } from "@capacitor/splash-screen";

import EliteHomeSkeleton from "@/components/Skeletons/EliteHomeSkeleton";

export default function App() {
  const { isLoading, toast } = useApp();
  const location = useLocation();

  // 🛡️ Nuclear Visibility Guard: Ensure NO real UI mounts during splash
  const [isSplashActive, setIsSplashActive] = useState(true);

  // 🛡️ Hardware Back Button & Native Features Sync
  useEffect(() => {
    // 🧹 Forced UI Reset: Ensure storefront is always white/light-gray
    document.body.style.backgroundColor = '#f8fafc';

    const initNativeFeatures = async () => {
      try {
        if (window.Capacitor && window.Capacitor.isNativePlatform()) {
          // 2. StatusBar Styles for the Storefront
          if (StatusBar) {
            await StatusBar.setStyle({ style: Style.Light });
            await StatusBar.setBackgroundColor({ color: '#ffffff' });
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
      } catch (err) {
        console.warn("Native features init failed:", err);
      }
    };

    // 🌊 Clean Launch Controller: Hide splash only when data is ready
    const handleSplashTransition = async () => {
      if (!isLoading && window.Capacitor && window.Capacitor.isNativePlatform()) {
        // Small buffer to ensure first meaningful paint is committed
        setTimeout(async () => {
          await SplashScreen.hide();
          setIsSplashActive(false); // 🔑 Lock released! Real UI can now manifest.
        }, 500);
      } else if (!isLoading) {
        // Safe fallback for web or if capacitor fails
        setIsSplashActive(false);
      }
    };

    if (isLoading === false) {
      handleSplashTransition();
    }

    initNativeFeatures();
    
    return () => {
      if (window.Capacitor?.isNativePlatform) {
        CapApp.removeAllListeners();
      }
    };
  }, [isLoading]);

  // 🔓 Universal Fluid Unlock
  const isFluidPage = true;

  // Pages where BottomNav should be hidden
  const hideBottomNav = ["/login", "/register"].includes(location.pathname);

  // 💎 Elite Professional: Determine which loader to show
  const isHomePage = location.pathname === "/";
  // The skeleton shows if we are loading OR if the splash hasn't officially ended
  const showHomeSkeleton = (isLoading || isSplashActive) && isHomePage;

  return (
    <div className={`app-root ${isFluidPage ? "is-fluid-layout" : ""}`}>
      <ScrollToTop />
      <Navbar />
      <main className={!hideBottomNav ? "has-bottom-nav" : ""}>
        <AppContainer fluid={isFluidPage}>
          {showHomeSkeleton ? <EliteHomeSkeleton /> : <AppRouter />}
        </AppContainer>
        <Footer />
      </main>
      
      {/* 🚀 Nuclear Gate: No bottom nav ever appears while splash or loading is active */}
      {!hideBottomNav && !isLoading && !isSplashActive && <BottomNav />}

      {isLoading && !isHomePage && <Loader />}
      {toast && <Notification type={toast.type} message={toast.message} />}
    </div>
  );
}
