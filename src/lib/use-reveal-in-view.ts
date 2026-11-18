import { useEffect, useState, type RefObject } from "react";
import { instantRouteTween } from "./motion";
import {
    useIsServerRenderedRoute,
    useHeroHandoffRef,
} from "./route-entrance";

type RevealState = "server-visible" | "parked" | "entered";

type RevealMotionProps = Readonly<{
    animate: "hidden" | "visible";
    /** Start delay in seconds, read by the visible variant. */
    custom?: number;
    initial: false | "hidden";
    transition?: typeof instantRouteTween;
}>;

/**
 * Drives a scroll reveal. On a client-side navigation the block starts hidden
 * and reveals once it scrolls into view. On the server-rendered route the
 * block paints visible, so the page reads before JavaScript arrives. After
 * hydration, blocks that are still below the fold park out of sight at once
 * and keep their scroll reveal.
 */
export function useRevealInView(
    elementRef: RefObject<Element | null>,
    shouldReduceMotion: boolean | null,
): RevealMotionProps {
    const isServerRendered = useIsServerRenderedRoute();
    const heroHandoffRef = useHeroHandoffRef();
    const [state, setState] = useState<RevealState>(
        isServerRendered ? "server-visible" : "parked",
    );
    const [entranceDelay, setEntranceDelay] = useState(0);

    useEffect(() => {
        if (shouldReduceMotion) return;

        const element = elementRef.current;

        if (!element || typeof IntersectionObserver === "undefined") {
            setState("entered");
            return;
        }

        let isFirstReport = true;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (!entry) return;
                const wasFirstReport = isFirstReport;
                isFirstReport = false;

                if (entry.isIntersecting) {
                    // On screen as the route mounts: follow the hero's stagger
                    // instead of racing ahead of it.
                    if (wasFirstReport && !isServerRendered) {
                        setEntranceDelay(
                            Math.max(
                                0,
                                heroHandoffRef.current - performance.now(),
                            ) / 1000,
                        );
                    }
                    setState("entered");
                    observer.disconnect();
                    return;
                }

                // A server-painted block the reader can already see stays put.
                // Only blocks wholly below the viewport park for a later reveal.
                if (wasFirstReport && isServerRendered) {
                    const isBelowFold =
                        entry.boundingClientRect.top >= window.innerHeight;
                    setState(isBelowFold ? "parked" : "entered");
                    if (!isBelowFold) observer.disconnect();
                }
            },
            {
                rootMargin: "0px 0px -64px 0px",
                threshold: 0.01,
            },
        );

        observer.observe(element);

        return () => observer.disconnect();
    }, [elementRef, heroHandoffRef, isServerRendered, shouldReduceMotion]);

    if (shouldReduceMotion) return { animate: "visible", initial: false };

    if (isServerRendered) {
        return state === "parked"
            ? { animate: "hidden", initial: false, transition: instantRouteTween }
            : { animate: "visible", initial: false };
    }

    return {
        animate: state === "entered" ? "visible" : "hidden",
        custom: entranceDelay,
        initial: "hidden",
    };
}
