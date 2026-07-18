import {
    useCallback,
    useLayoutEffect,
    useRef,
    useState,
    type RefObject,
} from "react";
import { useMotionValue, type MotionValue } from "motion/react";
import type { TocItem } from "./content-headings";

const viewportThreshold = 120;

type ScrollSpyState = Readonly<{
    activeId: string | null;
    activeIndex: number | null;
    sectionProgress: MotionValue<number>;
    start: () => void;
    stop: () => void;
}>;

export function useScrollSpy(
    items: TocItem[],
    containerRef: RefObject<HTMLElement | null>,
    enabled = true,
): ScrollSpyState {
    const [activeId, setActiveId] = useState<string | null>(null);
    const sectionProgress = useMotionValue(0);
    const cleanupRef = useRef<(() => void) | undefined>(undefined);
    const startRef = useRef<() => void>(() => undefined);
    const start = useCallback(() => startRef.current(), []);
    const stop = useCallback(() => {
        cleanupRef.current?.();
        cleanupRef.current = undefined;
    }, []);

    useLayoutEffect(() => {
        let animationFrame: number | undefined;
        const startListening = () => {
            if (cleanupRef.current) return;
            if (items.length === 0) {
                setActiveId(null);
                sectionProgress.set(0);
                return;
            }

            const initialContainer = containerRef.current;
            if (!initialContainer?.isConnected) return;
            let container = initialContainer;
            const resolveHeadings = () =>
                items.flatMap((item) => {
                    const heading = container.querySelector<HTMLElement>(
                        `[id="${CSS.escape(item.id)}"]`,
                    );
                    return heading?.isConnected ? [heading] : [];
                });
            let headings = resolveHeadings();
            if (headings.length === 0) return;

            const updateActiveSection = () => {
                animationFrame = undefined;
                const currentContainer = containerRef.current;
                if (!currentContainer?.isConnected) return;
                if (currentContainer !== container) {
                    container = currentContainer;
                    headings = resolveHeadings();
                } else if (headings.some((heading) => !heading.isConnected)) {
                    headings = resolveHeadings();
                }
                if (headings.length === 0) return;

                let nextActiveIndex = 0;
                const firstHeading = headings[0];
                if (!firstHeading.isConnected) return;

                let activeTop = firstHeading.getBoundingClientRect().top;
                let nextTop: number | undefined;

                for (let index = 0; index < headings.length; index += 1) {
                    const heading = headings[index];
                    if (!heading.isConnected) continue;

                    const headingTop =
                        index === 0
                            ? activeTop
                            : heading.getBoundingClientRect().top;

                    if (headingTop <= viewportThreshold) {
                        nextActiveIndex = index;
                        activeTop = headingTop;
                    } else {
                        nextTop = headingTop;
                        break;
                    }
                }

                const sectionEnd =
                    nextTop ?? container.getBoundingClientRect().bottom;
                const sectionLength = Math.max(sectionEnd - activeTop, 1);
                const nextProgress = Math.min(
                    Math.max(
                        (viewportThreshold - activeTop) / sectionLength,
                        0,
                    ),
                    1,
                );
                const activeHeading = headings[nextActiveIndex];
                if (!activeHeading?.isConnected) return;

                const nextActiveId = activeHeading.id;

                sectionProgress.set(nextProgress);
                setActiveId((currentId) =>
                    currentId === nextActiveId ? currentId : nextActiveId,
                );
            };

            const scheduleActiveSectionUpdate = () => {
                if (animationFrame === undefined) {
                    animationFrame = window.requestAnimationFrame(
                        updateActiveSection,
                    );
                }
            };

            window.addEventListener("scroll", scheduleActiveSectionUpdate, {
                passive: true,
            });
            scheduleActiveSectionUpdate();

            cleanupRef.current = () => {
                if (animationFrame !== undefined) {
                    window.cancelAnimationFrame(animationFrame);
                    animationFrame = undefined;
                }
                window.removeEventListener(
                    "scroll",
                    scheduleActiveSectionUpdate,
                );
            };
        };
        startRef.current = startListening;
        if (enabled) startListening();

        return () => {
            stop();
            startRef.current = () => undefined;
        };
    }, [containerRef, enabled, items, sectionProgress, stop]);

    const activeIndex = activeId
        ? items.findIndex((item) => item.id === activeId)
        : null;

    return {
        activeId,
        activeIndex:
            activeIndex !== null && activeIndex >= 0 ? activeIndex : null,
        sectionProgress,
        start,
        stop,
    };
}
