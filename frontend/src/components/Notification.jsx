import { CheckCircle2, AlertCircle } from "lucide-react";
import "./Notification.css";

export default function Notification({ type = "info", message }) {
  if (!message) return null;
  const isError = type === "error";
  const isSuccess = type === "success";

  return (
    <div className="toast-root fade-in">
      <div className={"toast-card " + (isError ? "toast-error" : isSuccess ? "toast-success" : "")}>
        {isError ? (
          <AlertCircle size={18} color="#b91c1c" />
        ) : (
          <CheckCircle2 size={18} color="#16a34a" />
        )}
        <div>{message}</div>
      </div>
    </div>
  );
}
