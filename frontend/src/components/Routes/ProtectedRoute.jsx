import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { isLoggedIn, isReady } = useAuth();

  if (!isReady) {
    return null; // Or a <Loader />
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }
  return children;
}
