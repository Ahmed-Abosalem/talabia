import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function GuestRoute({ children }) {
  const { isLoggedIn, isReady } = useAuth();

  if (!isReady) {
    return null;
  }

  if (isLoggedIn) {
    return <Navigate to="/" replace />;
  }
  return children;
}
