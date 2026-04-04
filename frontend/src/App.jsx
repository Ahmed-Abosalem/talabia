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
import { useEffect } from "react";
import { StatusBar, Style } from "@capacitor/status-bar";
import { App as CapApp } from "@capacitor/app";
import { SplashScreen } from "@capacitor/splash-screen";

export default function App() {
  const { isLoading, toast } = useApp();
  const location = useLocation();

  // 🛡️ Hardware Back Button & Native Features Sync
  useEffect(() => {
    const initNativeFeatures = async () => {
      try {
        if (window.Capacitor && window.Capacitor.isNativePlatform()) {
          // 1. Hide native splash immediately (if manual hide is enabled)
          // We set it to autohide in config, but this is a safe fallback.
          await SplashScreen.hide();

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
    initNativeFeatures();
    
    return () => {
      if (window.Capacitor?.isNativePlatform) {
        CapApp.removeAllListeners();
      }
    };
  }, []);

  // 🔓 Universal Fluid Unlock
  const isFluidPage = true;

  // Pages where BottomNav should be hidden
  const hideBottomNav = ["/login", "/register"].includes(location.pathname);

  return (
    <div className={`app-root ${isFluidPage ? "is-fluid-layout" : ""}`}>
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
