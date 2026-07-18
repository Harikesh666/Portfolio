import { useLayoutEffect, useState, type RefObject } from "react";
import { useMotionValue, type MotionValue } from "motion/react";
import type { TocItem } from "./content-headings";

const viewportThreshold = 120;

type ScrollSpyState = Readonly<{
    activeId: string | null;
    activeIndex: number | null;
    sectionProgress: MotionValue<number>;
}>;

export function useScrollSpy(
    items: TocItem[],
    containerRef: RefObject<HTMLElement | null>,
): ScrollSpyState {
    const [activeId, setActiveId] = useState<string | null>(null);
    const sectionProgress = useMotionValue(0);

    useLayoutEffect(() => {
        let animationFrame: number | undefined;
        if (items.length === 0) {
            setActiveId(null);
            sectionProgress.set(0);
            return;
        }

        const updateActiveSection = () => {
            animationFrame = undefined;
            const container = containerRef.current;
            if (!container?.isConnected) return;

            const headings = items.flatMap((item) => {
                const heading = container.querySelector<HTMLElement>(
                    `[id="${CSS.escape(item.id)}"]`,
                );
                return heading?.isConnected ? [heading] : [];
            });
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

        return () => {
            if (animationFrame !== undefined) {
                window.cancelAnimationFrame(animationFrame);
            }
            window.removeEventListener("scroll", scheduleActiveSectionUpdate);
        };
    }, [containerRef, items, sectionProgress]);

    const activeIndex = activeId
        ? items.findIndex((item) => item.id === activeId)
        : null;

    return {
        activeId,
        activeIndex:
            activeIndex !== null && activeIndex >= 0 ? activeIndex : null,
        sectionProgress,
    };
}
