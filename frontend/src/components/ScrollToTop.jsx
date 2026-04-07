import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * 🔄 Unified Scroll Restoration Hub
 * Ensures that whenever the user navigates between pages or tabs (pathname change),
 * the exact scrolling container is instantly reset to the very top.
 */
const ScrollToTop = () => {
    const { pathname } = useLocation();

    useEffect(() => {
        // 🚀 1. Reset explicit app scroll container (<main> tag)
        const mainContainer = document.getElementById("main-scroll-container");
        if (mainContainer) {
            mainContainer.scrollTo({
                top: 0,
                left: 0,
                behavior: "instant",
            });
        }

        // 🚀 2. Fallback: Reset global window scroll (in case some pages escape main)
        window.scrollTo({
            top: 0,
            left: 0,
            behavior: "instant",
        });
    }, [pathname]);

    return null;
};

export default ScrollToTop;
