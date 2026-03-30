import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * 🔄 ScrollToTop Component
 * Ensures that whenever the user navigates to a new page, 
 * the scroll position is reset to the very top.
 */
const ScrollToTop = () => {
    const { pathname } = useLocation();

    useEffect(() => {
        // 🚀 Reset scroll to top of the window
        window.scrollTo({
            top: 0,
            left: 0,
            behavior: "instant", // Optional: use "smooth" if preferred, but "instant" is standard for route changes
        });
    }, [pathname]);

    return null;
};

export default ScrollToTop;
