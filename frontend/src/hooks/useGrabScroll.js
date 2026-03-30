import { useState, useCallback, useEffect } from "react";

/**
 * Reusable hook to enable horizontal scroll via mouse dragging (grab-to-scroll).
 * Perfect for tables and overflow containers on desktop.
 * Handles mouse events and provides visual feedback via CSS classes.
 * Also intelligently prevents click events from firing if the user was dragging.
 */
export default function useGrabScroll() {
    const [node, setNode] = useState(null);

    const ref = useCallback((element) => {
        if (element !== null) {
            setNode(element);
        }
    }, []);

    useEffect(() => {
        const el = node;
        if (!el) return;

        let isDown = false;
        let startX;
        let scrollLeft;
        let dragged = false;

        const onMouseDown = (e) => {
            // Skip if clicking interactive elements where grabbing doesn't make sense
            // like buttons or inputs. But allow grabbing on general table rows.
            if (e.target.closest("button, a, input, select, textarea, .adm-icon-btn, .adm-order-badge")) return;

            isDown = true;
            dragged = false;
            el.classList.add("grabbing");

            // PageX is used to account for horizontal page scrolling if any
            startX = e.pageX - el.offsetLeft;
            scrollLeft = el.scrollLeft;
        };

        const onMouseLeave = () => {
            isDown = false;
            el.classList.remove("grabbing");
        };

        const onMouseUp = () => {
            isDown = false;
            el.classList.remove("grabbing");
            // Give a short window for click events to fire, then clear the dragged state.
            setTimeout(() => {
                dragged = false;
            }, 50);
        };

        const onMouseMove = (e) => {
            if (!isDown) return;
            e.preventDefault();

            const x = e.pageX - el.offsetLeft;
            // Multiplier (1.5) for a more responsive "scroll-fast" feel
            const walk = (x - startX) * 1.5;

            // If moved more than 5 pixels, consider it a drag
            if (Math.abs(walk) > 5) {
                dragged = true;
            }

            el.scrollLeft = scrollLeft - walk;
        };

        // Capture phase click listener to prevent child clicks if dragged
        const onClick = (e) => {
            if (dragged) {
                e.preventDefault();
                e.stopPropagation();
            }
        };

        el.addEventListener("mousedown", onMouseDown);
        el.addEventListener("mouseleave", onMouseLeave);
        el.addEventListener("mouseup", onMouseUp);
        el.addEventListener("mousemove", onMouseMove);
        el.addEventListener("click", onClick, { capture: true });

        return () => {
            el.removeEventListener("mousedown", onMouseDown);
            el.removeEventListener("mouseleave", onMouseLeave);
            el.removeEventListener("mouseup", onMouseUp);
            el.removeEventListener("mousemove", onMouseMove);
            el.removeEventListener("click", onClick, { capture: true });
        };
    }, [node]);

    return ref;
}
