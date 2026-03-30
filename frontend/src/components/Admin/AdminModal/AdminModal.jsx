import React, { useEffect, useState } from "react";
import "./AdminModal.css";
import { X } from "lucide-react";

export default function AdminModal({
    isOpen,
    onClose,
    title,
    children,
    icon: Icon,
    type = "default", // default | danger | success
    confirmText,
    cancelText = "إلغاء",
    onConfirm,
    isConfirming = false
}) {
    const [showContent, setShowContent] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // Small delay to allow CSS transition
            requestAnimationFrame(() => setShowContent(true));
            document.body.style.overflow = "hidden";
        } else {
            setShowContent(false);
            document.body.style.overflow = "";
        }

        return () => { document.body.style.overflow = ""; };
    }, [isOpen]);

    if (!isOpen && !showContent) return null;

    return (
        <div className={`adm-modal-overlay ${showContent ? "active" : ""}`} onClick={onClose}>
            <div
                className={`adm-modal-content ${showContent ? "active" : ""} ${type}`}
                onClick={(e) => e.stopPropagation()}
            >
                <button className="adm-modal-close" onClick={onClose}>
                    <X size={20} />
                </button>

                <div className="adm-modal-header">
                    {Icon && (
                        <div className={`adm-modal-icon-wrapper ${type}`}>
                            <Icon size={24} />
                        </div>
                    )}
                    <h2 className="adm-modal-title">{title}</h2>
                </div>

                <div className="adm-modal-body">
                    {children}
                </div>

                {(onConfirm || confirmText) && (
                    <div className="adm-modal-footer">
                        <button
                            className="adm-btn-mgmt outline"
                            onClick={onClose}
                            disabled={isConfirming}
                        >
                            {cancelText}
                        </button>
                        <button
                            className={`adm-btn-mgmt ${type === 'danger' ? 'danger' : 'primary'}`}
                            onClick={onConfirm}
                            disabled={isConfirming}
                        >
                            {isConfirming ? "جاري المعالجة..." : confirmText}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
