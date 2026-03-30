import { useEffect, useRef, Children } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import "./HScrollWrap.css";

/* Helper Functions */
let __rtlScrollTypeCache = null;

function getRtlScrollType() {
    if (__rtlScrollTypeCache) return __rtlScrollTypeCache;

    const outer = document.createElement("div");
    const inner = document.createElement("div");

    outer.style.width = "100px";
    outer.style.height = "100px";
    outer.style.overflow = "scroll";
    outer.style.position = "absolute";
    outer.style.top = "-9999px";
    outer.style.direction = "rtl";

    inner.style.width = "200px";
    inner.style.height = "1px";

    outer.appendChild(inner);
    document.body.appendChild(outer);

    if (outer.scrollLeft > 0) {
        __rtlScrollTypeCache = "default";
    } else {
        outer.scrollLeft = 1;
        __rtlScrollTypeCache = outer.scrollLeft === 0 ? "negative" : "reverse";
    }

    document.body.removeChild(outer);
    return __rtlScrollTypeCache;
}

function getMaxScroll(scrollEl) {
    return Math.max(0, scrollEl.scrollWidth - scrollEl.clientWidth);
}

// normalized: 0 = start (right in RTL), max = end (left in RTL)
function getNormalizedScrollLeft(scrollEl) {
    const dir = getComputedStyle(scrollEl).direction;
    const max = getMaxScroll(scrollEl);

    if (dir !== "rtl") {
        return Math.min(Math.max(scrollEl.scrollLeft, 0), max);
    }

    const type = getRtlScrollType();
    if (type === "default") return max - scrollEl.scrollLeft;
    if (type === "negative") return -scrollEl.scrollLeft;
    return scrollEl.scrollLeft; // reverse
}

function attachHScrollHints(scrollEl) {
    if (!scrollEl) return () => { };

    const wrap = scrollEl.closest(".hscroll-wrap");
    if (!wrap) return () => { };

    let resizeObs = null;
    let t1 = null;
    let t2 = null;
    let t3 = null;

    const updateState = () => {
        const scrollWidth = scrollEl.scrollWidth;
        const clientWidth = scrollEl.clientWidth;
        const isScrollable = scrollWidth > clientWidth;

        // 1️⃣ Smart Centering Logic
        if (isScrollable) {
            scrollEl.classList.remove("centered");
            scrollEl.classList.add("scrollable");
        } else {
            scrollEl.classList.add("centered");
            scrollEl.classList.remove("scrollable");
        }

        if (!isScrollable) {
            wrap.classList.remove("show-left", "show-right");
            return;
        }

        const max = getMaxScroll(scrollEl);
        const pos = getNormalizedScrollLeft(scrollEl);

        // Define a small threshold (5px) to prevent flickering at boundaries
        const threshold = 10;

        // In RTL: pos 0 is Right (Start), pos max is Left (End)
        // User behavior: 
        // 1) Start (pos=0): Show Left arrow (if max > 0), hide Right.
        // 2) Middle: Show both.
        // 3) End (pos=max): Show Right arrow, hide Left.

        const showRight = pos > threshold;
        const showLeft = pos < max - threshold;

        wrap.classList.toggle("show-left", showLeft);
        wrap.classList.toggle("show-right", showRight);
    };

    const onScroll = () => updateState();

    scrollEl.addEventListener("scroll", onScroll, { passive: true });

    if (typeof ResizeObserver !== "undefined") {
        resizeObs = new ResizeObserver(() => updateState());
        resizeObs.observe(scrollEl);
    } else {
        window.addEventListener("resize", updateState);
    }

    const prime = () => {
        updateState();
        requestAnimationFrame(updateState);

        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);

        t1 = setTimeout(updateState, 120);
        t2 = setTimeout(updateState, 420);
        t3 = setTimeout(updateState, 950);
    };

    prime();

    return () => {
        scrollEl.removeEventListener("scroll", onScroll);
        if (resizeObs) resizeObs.disconnect();
        else window.removeEventListener("resize", updateState);

        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
    };
}

export default function HScrollWrap({ id, className, children }) {
    const ref = useRef(null);
    const childCount = Children.count(children);

    useEffect(() => {
        if (!ref.current) return;
        return attachHScrollHints(ref.current);
    }, [children]); // Use 'children' itself to detect depth changes or re-renders

    // 🖱️ Smooth Scroll Handlers (220px Step)
    const scrollLeft = () => {
        if (ref.current) {
            ref.current.scrollBy({ left: -220, behavior: "smooth" });
        }
    };

    const scrollRight = () => {
        if (ref.current) {
            ref.current.scrollBy({ left: 220, behavior: "smooth" });
        }
    };

    return (
        <div className="hscroll-wrap" data-hscroll-id={id}>
            <div ref={ref} className={className || "hscroll-container"}>
                {children}
            </div>

            {/* ⬅️ Left Minimal Arrow */}
            <button
                className="nav-arrow nav-arrow-left"
                onClick={scrollLeft}
                aria-label="Scroll Left"
                type="button"
            >
                <ChevronLeft size={16} strokeWidth={2.5} />
            </button>

            {/* ➡️ Right Minimal Arrow */}
            <button
                className="nav-arrow nav-arrow-right"
                onClick={scrollRight}
                aria-label="Scroll Right"
                type="button"
            >
                <ChevronRight size={16} strokeWidth={2.5} />
            </button>
        </div>
    );
}
