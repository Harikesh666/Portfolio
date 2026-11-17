import { useEffect, useState, type RefObject } from "react";

/** Below this share on screen, a figure's playback pauses: the reader has moved on. */
const pauseBelow = 0.3;

/**
 * Watches how much of a guide figure is on screen. It calls `onMostlyHidden`
 * once less than 30% of the figure is visible (or, for a figure taller than
 * the window, once it fills less than 30% of the window), and returns
 * whether any of it is on screen at all, so its decorative motion can stop.
 */
export function useFigureVisibility(ref: RefObject<HTMLElement | null>, onMostlyHidden: () => void) {
    const [isOnScreen, setIsOnScreen] = useState(true);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                setIsOnScreen(entry.isIntersecting);
                const windowShare = entry.intersectionRect.height / (entry.rootBounds?.height || window.innerHeight);
                if (!entry.isIntersecting || (entry.intersectionRatio < pauseBelow && windowShare < pauseBelow)) onMostlyHidden();
            },
            { threshold: [0, 0.1, 0.2, pauseBelow, 0.5] },
        );
        observer.observe(element);
        return () => observer.disconnect();
    }, [ref, onMostlyHidden]);

    return isOnScreen;
}
