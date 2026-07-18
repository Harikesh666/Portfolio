import { useEffect, useRef, useState } from "react";
import {
    AnimatePresence,
    LayoutGroup,
    motion,
    useMotionValue,
    useReducedMotion,
    useSpring,
    useTransform,
    useVelocity,
} from "motion/react";
import {
    hoverExitTween,
    snappySpring,
    stretchSpring,
    tocCollapseSpring,
    tocItemDelayCap,
    tocItemDelayStep,
    tocMorphSpring,
} from "../lib/motion";

type TocItem = {
    id: string;
    title: string;
};

const desktopQuery = "(min-width: 1280px)";
const viewportThreshold = 120;
const collapsedPanelScale = 0.08;
const collapseDelayRatio = 0.65;
const activeTickScale = 1;
const neighborTickScale = 20 / 28;
const baseTickScale = 14 / 28;
const maximumIndicatorStretch = 0.6;
const indicatorVelocityScale = 0.02;
const excludedIds = (id: string) =>
    id === "table-of-contents" || id.startsWith("read-this-first");

export function FloatingToc() {
    const [items, setItems] = useState<TocItem[]>([]);
    const [activeId, setActiveId] = useState("");
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const activeItemRef = useRef<HTMLAnchorElement>(null);
    const isPointerOver = useRef(false);
    const isFocusWithin = useRef(false);
    const isExpandedRef = useRef(false);
    const sectionProgress = useMotionValue(0);
    const animatedSectionProgress = useSpring(sectionProgress, snappySpring);
    const activePosition = useMotionValue(0);
    const animatedActivePosition = useSpring(activePosition, stretchSpring);
    const activeVelocity = useVelocity(animatedActivePosition);
    const indicatorScaleY = useTransform(activeVelocity, (velocity) =>
        1 +
        Math.min(
            Math.abs(velocity) * indicatorVelocityScale,
            maximumIndicatorStretch,
        ),
    );
    const indicatorTransformOrigin = useTransform(
        activeVelocity,
        (velocity) => (velocity >= 0 ? "50% 0%" : "50% 100%"),
    );
    const shouldReduceMotion = useReducedMotion();
    const instantTransition = { duration: 0 };
    const snappyTransition = shouldReduceMotion
        ? instantTransition
        : snappySpring;
    const stretchTransition = shouldReduceMotion
        ? instantTransition
        : stretchSpring;
    const activeIndex = Math.max(
        0,
        items.findIndex((item) => item.id === activeId),
    );
    const maximumItemDistance = Math.max(
        activeIndex,
        items.length - 1 - activeIndex,
    );

    const getItemDelay = (index: number) => {
        if (shouldReduceMotion) return 0;

        const distance = Math.abs(index - activeIndex);
        const staggerDistance = isExpanded
            ? distance
            : maximumItemDistance - distance;
        const delay = Math.min(
            staggerDistance * tocItemDelayStep,
            tocItemDelayCap,
        );

        return isExpanded ? delay : delay * collapseDelayRatio;
    };

    const getItemTransition = (index: number) => ({
        ...(isExpanded ? tocMorphSpring : tocCollapseSpring),
        delay: getItemDelay(index),
    });

    const updateExpandedState = () => {
        const nextIsExpanded = isPointerOver.current || isFocusWithin.current;

        if (nextIsExpanded === isExpandedRef.current) return;

        isExpandedRef.current = nextIsExpanded;
        setIsExpanded(nextIsExpanded);

        if (nextIsExpanded) {
            window.requestAnimationFrame(() => {
                activeItemRef.current?.scrollIntoView({ block: "nearest" });
            });
        } else {
            setHoveredId(null);
        }
    };

    useEffect(() => {
        activePosition.set(activeIndex);
    }, [activeIndex, activePosition]);

    useEffect(() => {
        const mediaQuery = window.matchMedia(desktopQuery);
        let animationFrame: number | undefined;
        let removeScrollListener: (() => void) | undefined;

        const stopScrollspy = () => {
            if (animationFrame !== undefined) {
                window.cancelAnimationFrame(animationFrame);
                animationFrame = undefined;
            }

            removeScrollListener?.();
            removeScrollListener = undefined;
        };

        const startScrollspy = () => {
            if (!mediaQuery.matches) return;

            const headings = Array.from(
                document.querySelectorAll<HTMLElement>(".guide-content h2[id]"),
            ).filter((heading) => !excludedIds(heading.id));
            const nextItems = headings.map((heading) => ({
                id: heading.id,
                title: heading.textContent?.trim() ?? heading.id,
            }));

            setItems(nextItems);

            if (nextItems.length === 0) {
                setActiveId("");
                sectionProgress.set(0);
                return;
            }

            const updateActiveSection = () => {
                animationFrame = undefined;
                let nextActiveIndex = 0;
                let activeTop = headings[0].getBoundingClientRect().top;
                let nextTop: number | undefined;

                for (let index = 0; index < headings.length; index += 1) {
                    const headingTop =
                        index === 0
                            ? activeTop
                            : headings[index].getBoundingClientRect().top;

                    if (headingTop <= viewportThreshold) {
                        nextActiveIndex = index;
                        activeTop = headingTop;
                    } else {
                        nextTop = headingTop;
                        break;
                    }
                }

                const sectionEnd =
                    nextTop ??
                    document.documentElement.scrollHeight - window.scrollY;
                const sectionLength = Math.max(sectionEnd - activeTop, 1);
                const nextProgress = Math.min(
                    Math.max(
                        (viewportThreshold - activeTop) / sectionLength,
                        0,
                    ),
                    1,
                );
                const nextActiveId = headings[nextActiveIndex].id;

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
            removeScrollListener = () =>
                window.removeEventListener(
                    "scroll",
                    scheduleActiveSectionUpdate,
                );
            scheduleActiveSectionUpdate();
        };

        const handleMediaChange = () => {
            stopScrollspy();

            if (mediaQuery.matches) {
                startScrollspy();
            } else {
                setItems([]);
                setActiveId("");
                sectionProgress.set(0);
            }
        };

        startScrollspy();
        mediaQuery.addEventListener("change", handleMediaChange);

        return () => {
            stopScrollspy();
            mediaQuery.removeEventListener("change", handleMediaChange);
        };
    }, [sectionProgress]);

    if (items.length === 0) return null;

    return (
        <LayoutGroup id="floating-toc">
            <nav
                aria-label="Table of contents"
                className="rise-in-delayed fixed right-6 top-1/2 z-20 hidden w-60 max-w-60 -translate-y-1/2 isolate xl:block"
                onBlurCapture={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget)) {
                        isFocusWithin.current = false;
                        updateExpandedState();
                    }
                }}
                onFocusCapture={() => {
                    isFocusWithin.current = true;
                    updateExpandedState();
                }}
                onKeyDown={(event) => {
                    if (event.key !== "Escape") return;

                    isFocusWithin.current = false;
                    (document.activeElement as HTMLElement | null)?.blur();
                    updateExpandedState();
                }}
                onMouseEnter={() => {
                    isPointerOver.current = true;
                    updateExpandedState();
                }}
                onMouseLeave={() => {
                    isPointerOver.current = false;
                    updateExpandedState();
                }}
            >
                <a className="sr-only" href="#floating-toc-panel">
                    Table of contents
                </a>
                <ol
                    aria-hidden="true"
                    className="ml-auto flex w-7 flex-col items-end gap-1.5"
                    style={{ pointerEvents: isExpanded ? "none" : "auto" }}
                >
                    {items.map((item, index) => {
                        const distance = Math.abs(index - activeIndex);
                        const isActive = distance === 0;
                        const isRead = index < activeIndex;
                        const tickScale = isActive
                            ? activeTickScale
                            : distance === 1
                              ? neighborTickScale
                              : baseTickScale;
                        const trackColor = isActive
                            ? "var(--accent)"
                            : distance === 1
                              ? "color-mix(in oklab, var(--accent) 38%, var(--divider))"
                              : isRead
                                ? "var(--accent-soft)"
                                : "var(--divider)";

                        return (
                            <li
                                className="flex h-2.5 items-center justify-end"
                                key={item.id}
                            >
                                {!isExpanded && (
                                    <motion.span
                                        aria-hidden="true"
                                        className="relative block h-2.5 w-7"
                                        layoutId={`toc-item-${item.id}`}
                                        transition={{
                                            layout: getItemTransition(index),
                                        }}
                                    >
                                        <motion.span
                                            className="absolute right-0 top-1/2 h-0.5 w-full -translate-y-1/2 origin-right rounded-full"
                                            animate={{
                                                opacity: isActive ? 0.38 : 1,
                                                scaleX: tickScale,
                                            }}
                                            style={{ backgroundColor: trackColor }}
                                            transition={snappyTransition}
                                        />
                                        <motion.span
                                            className="absolute right-0 top-1/2 h-0.5 w-full -translate-y-1/2 origin-right rounded-full"
                                            animate={{ scaleX: tickScale }}
                                            transition={snappyTransition}
                                        >
                                            <motion.span
                                                className="block h-full w-full origin-left rounded-full"
                                                style={{
                                                    backgroundColor: isActive
                                                        ? "var(--accent)"
                                                        : "var(--accent-soft)",
                                                    scaleX: isActive
                                                        ? shouldReduceMotion
                                                            ? sectionProgress
                                                            : animatedSectionProgress
                                                        : isRead
                                                          ? 1
                                                          : 0,
                                                }}
                                            />
                                        </motion.span>
                                    </motion.span>
                                )}
                            </li>
                        );
                    })}
                </ol>
                <motion.div
                    animate={
                        isExpanded
                            ? {
                                  opacity: 1,
                                  scaleX: 1,
                              }
                            : {
                                  opacity: 0,
                                  scaleX: shouldReduceMotion
                                      ? 1
                                      : collapsedPanelScale,
                              }
                    }
                    className="absolute right-0 top-0 w-60 overflow-hidden rounded-lg border border-divider bg-surface shadow-sm"
                    id="floating-toc-panel"
                    initial={false}
                    style={{
                        transformOrigin: "100% 50%",
                        visibility: isExpanded ? "visible" : "hidden",
                    }}
                    transition={
                        shouldReduceMotion
                            ? instantTransition
                            : isExpanded
                              ? tocMorphSpring
                              : tocCollapseSpring
                    }
                >
                    <ol
                        className="floating-toc-list flex max-h-[min(60vh,520px)] min-w-0 flex-col gap-0.5 overflow-y-auto overflow-x-hidden overscroll-contain px-4 py-3"
                        onPointerLeave={() => setHoveredId(null)}
                    >
                        {items.map((item, index) => {
                            const isActive = item.id === activeId;

                            return (
                                <motion.li
                                    animate={{
                                        opacity: isExpanded ? 1 : 0,
                                        x:
                                            isExpanded || shouldReduceMotion
                                                ? 0
                                                : 8,
                                    }}
                                    className="relative w-full min-w-0"
                                    initial={false}
                                    key={item.id}
                                    onPointerEnter={() => setHoveredId(item.id)}
                                    transition={getItemTransition(index)}
                                >
                                    <AnimatePresence initial={false}>
                                        {hoveredId === item.id && (
                                            <motion.span
                                                animate={{ opacity: 1 }}
                                                aria-hidden="true"
                                                className="absolute inset-0 z-0 rounded-sm bg-accent-soft"
                                                exit={{ opacity: 0 }}
                                                initial={{ opacity: 0 }}
                                                layoutId="toc-hover"
                                                transition={
                                                    shouldReduceMotion
                                                        ? instantTransition
                                                        : {
                                                              layout: snappySpring,
                                                              opacity:
                                                                  hoverExitTween,
                                                          }
                                                }
                                            />
                                        )}
                                    </AnimatePresence>
                                    {isActive && (
                                        <motion.span
                                            aria-hidden="true"
                                            className="absolute inset-y-0 left-0 z-10 w-0.5 rounded-full bg-accent"
                                            layoutId="toc-active"
                                            style={
                                                shouldReduceMotion
                                                    ? undefined
                                                    : {
                                                          scaleY:
                                                              indicatorScaleY,
                                                          transformOrigin:
                                                              indicatorTransformOrigin,
                                                      }
                                            }
                                            transition={{
                                                layout: stretchTransition,
                                            }}
                                        />
                                    )}
                                    {isExpanded && (
                                        <motion.span
                                            aria-hidden="true"
                                            className="absolute left-1 top-1/2 z-10 block h-2 w-1.5 -translate-y-1/2"
                                            layoutId={`toc-item-${item.id}`}
                                            transition={{
                                                layout: getItemTransition(index),
                                            }}
                                        >
                                            <span className="absolute left-0 top-1/2 block h-0.5 w-1.5 -translate-y-1/2 rounded-full bg-divider" />
                                        </motion.span>
                                    )}
                                    <a
                                        aria-current={
                                            isActive ? "true" : undefined
                                        }
                                        className={`relative z-10 block min-w-0 truncate rounded-sm py-1 pl-4 text-left text-[12px] leading-snug transition-colors hover:text-foreground-strong ${
                                            isActive
                                                ? "text-accent"
                                                : "text-muted"
                                        }`}
                                        href={`#${item.id}`}
                                        ref={
                                            isActive
                                                ? activeItemRef
                                                : undefined
                                        }
                                    >
                                        {item.title}
                                    </a>
                                </motion.li>
                            );
                        })}
                    </ol>
                </motion.div>
            </nav>
        </LayoutGroup>
    );
}
