import { useEffect, useState, type RefObject } from "react";

export function useRevealInView(
    elementRef: RefObject<Element | null>,
    shouldReduceMotion: boolean | null,
) {
    const [hasEntered, setHasEntered] = useState(false);

    useEffect(() => {
        if (shouldReduceMotion) {
            setHasEntered(true);
            return;
        }

        const element = elementRef.current;

        if (!element || typeof IntersectionObserver === "undefined") {
            setHasEntered(true);
            return;
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (!entry?.isIntersecting) return;

                setHasEntered(true);
                observer.disconnect();
            },
            {
                rootMargin: "0px 0px -64px 0px",
                threshold: 0.01,
            },
        );

        observer.observe(element);

        return () => observer.disconnect();
    }, [elementRef, shouldReduceMotion]);

    return shouldReduceMotion || hasEntered;
}
