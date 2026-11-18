import { useEffect, useState } from "react";

/** Scrolling down only counts past this point. Near the top the dock covers no text yet. */
const nearTopScrollY = 160;
/** Smaller scroll changes (momentum settling, the address bar resizing) change nothing. */
const scrollJitterPx = 8;

/**
 * Scroll facts that decide when a floating phone dock steps aside: the site
 * footer is on screen, or the reader is scrolling down through the text.
 * Shared by the TOC pill and the site dock so both leave and return together.
 */
export function useDockTuck(isActive: boolean) {
    const [isFooterInView, setIsFooterInView] = useState(false);
    const [isReadingDown, setIsReadingDown] = useState(false);

    useEffect(() => {
        if (!isActive) return;
        const footer = document.querySelector("[data-site-footer]");
        if (!footer) return;
        const observer = new IntersectionObserver(([entry]) =>
            setIsFooterInView(entry.isIntersecting),
        );
        observer.observe(footer);
        return () => {
            observer.disconnect();
            setIsFooterInView(false);
        };
    }, [isActive]);

    useEffect(() => {
        if (!isActive) return;
        let lastY = window.scrollY;
        let frame = 0;
        const read = () => {
            frame = 0;
            const y = window.scrollY;
            if (Math.abs(y - lastY) < scrollJitterPx) return;
            setIsReadingDown(y > lastY && y > nearTopScrollY);
            lastY = y;
        };
        const onScroll = () => {
            if (!frame) frame = window.requestAnimationFrame(read);
        };
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => {
            window.removeEventListener("scroll", onScroll);
            window.cancelAnimationFrame(frame);
            setIsReadingDown(false);
        };
    }, [isActive]);

    return { isFooterInView, isReadingDown };
}
