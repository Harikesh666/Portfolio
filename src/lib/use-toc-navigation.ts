import { useCallback, useEffect, useRef, type RefObject } from "react";
import { useLocation, useRouter } from "@tanstack/react-router";
import { useReducedMotion } from "motion/react";

const hashlessScrollStateKey = "__portfolioHashlessScrollY";
const maximumAnchorCorrections = 3;
const anchorTolerance = 2;

type PortfolioHistoryState = Record<string, unknown> & {
    [hashlessScrollStateKey]?: number;
};

function getHashId() {
    return decodeURIComponent(window.location.hash.slice(1));
}

function scrollToHeading(id: string, shouldReduceMotion: boolean) {
    const initialTarget = document.getElementById(id);
    if (!initialTarget) return;

    initialTarget.scrollIntoView({
        behavior: shouldReduceMotion ? "instant" : "smooth",
        block: "start",
    });

    let correctionFrame: number | undefined;
    let correctionCount = 0;
    const correctAnchor = () => {
        correctionFrame = undefined;
        const target = document.getElementById(id);
        if (!target?.isConnected) return;

        const scrollMarginTop = Number.parseFloat(
            window.getComputedStyle(target).scrollMarginTop,
        );
        const expectedTop = Number.isFinite(scrollMarginTop)
            ? scrollMarginTop
            : 0;
        const offset = target.getBoundingClientRect().top - expectedTop;
        if (
            Math.abs(offset) <= anchorTolerance ||
            correctionCount >= maximumAnchorCorrections
        ) {
            window.dispatchEvent(new Event("scroll"));
            return;
        }

        correctionCount += 1;
        target.scrollIntoView({ behavior: "instant", block: "start" });
        correctionFrame = window.requestAnimationFrame(correctAnchor);
    };

    correctionFrame = window.requestAnimationFrame(correctAnchor);
    return () => {
        if (correctionFrame !== undefined) {
            window.cancelAnimationFrame(correctionFrame);
        }
    };
}

export function useTocNavigation(containerRef: RefObject<HTMLElement | null>) {
    const router = useRouter();
    const pathname = useLocation({ select: (location) => location.pathname });
    const shouldReduceMotion = useReducedMotion() ?? false;
    const cancelScrollRef = useRef<(() => void) | undefined>(undefined);

    const scrollToId = useCallback(
        (id: string) => {
            if (!containerRef.current?.querySelector(`#${CSS.escape(id)}`)) {
                return;
            }
            cancelScrollRef.current?.();
            cancelScrollRef.current = scrollToHeading(id, shouldReduceMotion);
        },
        [containerRef, shouldReduceMotion],
    );

    useEffect(() => {
        let navigationFrame: number | undefined;
        const previousScrollRestoration = window.history.scrollRestoration;
        window.history.scrollRestoration = "manual";
        const handleHistoryNavigation = (event?: PopStateEvent) => {
            if (navigationFrame !== undefined) {
                window.cancelAnimationFrame(navigationFrame);
            }
            navigationFrame = window.requestAnimationFrame(() => {
                navigationFrame = undefined;
                const id = getHashId();
                if (id) {
                    scrollToId(id);
                    return;
                }

                const state = (event?.state ??
                    window.history.state) as PortfolioHistoryState | null;
                const scrollY = state?.[hashlessScrollStateKey];
                if (typeof scrollY === "number") {
                    window.scrollTo({
                        behavior: shouldReduceMotion ? "instant" : "smooth",
                        top: scrollY,
                    });
                }
            });
        };

        window.addEventListener("popstate", handleHistoryNavigation);
        if (window.location.hash) handleHistoryNavigation();

        return () => {
            if (navigationFrame !== undefined) {
                window.cancelAnimationFrame(navigationFrame);
            }
            cancelScrollRef.current?.();
            window.history.scrollRestoration = previousScrollRestoration;
            window.removeEventListener("popstate", handleHistoryNavigation);
        };
    }, [pathname, scrollToId, shouldReduceMotion]);

    return useCallback(
        async (id: string) => {
            const hash = `#${id}`;
            const replace = window.location.hash === hash;
            if (!window.location.hash) {
                const state = (window.history.state ??
                    {}) as PortfolioHistoryState;
                window.history.replaceState(
                    {
                        ...state,
                        [hashlessScrollStateKey]: window.scrollY,
                    },
                    "",
                    window.location.href,
                );
            }

            await router.navigate({
                hash: id,
                hashScrollIntoView: false,
                replace,
                resetScroll: false,
            });
            scrollToId(id);
        },
        [router, scrollToId],
    );
}
