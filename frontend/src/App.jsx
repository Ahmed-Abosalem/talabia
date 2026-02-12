import Navbar from "@/components/Navbar/Navbar";
import Footer from "@/components/Footer/Footer";
import Loader from "@/components/Loader";
import Notification from "@/components/Notification";
import AppRouter from "./router";
import { useApp } from "@/context/AppContext";

export default function App() {
  const { isLoading, toast } = useApp();

  return (
    <div className="app-root">
      <Navbar />
      <main>
        <AppRouter />
      </main>
      <Footer />
      {isLoading && <Loader />}
      {toast && <Notification type={toast.type} message={toast.message} />}
    </div>
  );
}
