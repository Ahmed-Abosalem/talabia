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
import { useEffect } from "react";
import { StatusBar, Style } from "@capacitor/status-bar";
import { App as CapApp } from "@capacitor/app";

export default function App() {
  const { isLoading, toast } = useApp();
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
      <ScrollToTop />
      <Navbar />
      <main>
        <AppContainer fluid={isFluidPage}>
          <AppRouter />
        </AppContainer>
      </main>
      {!hideBottomNav && <BottomNav />}
      <Footer />
      {isLoading && <Loader />}
      {toast && <Notification type={toast.type} message={toast.message} />}
    </div>
  );
}
