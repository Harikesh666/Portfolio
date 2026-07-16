import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { snappySpring } from "../lib/motion";

type TocItem = {
    id: string;
    title: string;
};

const desktopQuery = "(min-width: 1280px)";
const excludedIds = (id: string) =>
    id === "table-of-contents" || id.startsWith("read-this-first");

export function FloatingToc() {
    const [items, setItems] = useState<TocItem[]>([]);
    const [activeId, setActiveId] = useState("");
    const [isExpanded, setIsExpanded] = useState(false);
    const activeItemRef = useRef<HTMLAnchorElement>(null);
    const isPointerOver = useRef(false);
    const isFocusWithin = useRef(false);
    const isExpandedRef = useRef(false);
    const shouldReduceMotion = useReducedMotion();
    const transition = shouldReduceMotion ? { duration: 0 } : snappySpring;
    const itemStagger =
        items.length > 1 ? Math.min(0.015, 0.25 / (items.length - 1)) : 0;
    const panelListVariants = {
        collapsed: {
            transition: {
                ...transition,
                delayChildren: 0,
                staggerChildren: 0,
            },
        },
        expanded: {
            transition: {
                ...transition,
                delayChildren: 0,
                staggerChildren: itemStagger,
            },
        },
    };
    const panelItemVariants = {
        collapsed: { opacity: 0, y: 5, transition },
        expanded: { opacity: 1, y: 0, transition },
    };
    const panelVariants = {
        collapsed: {
            opacity: 0,
            x: 16,
            scale: 0.97,
            visibility: "hidden" as const,
            transition,
        },
        expanded: {
            opacity: 1,
            x: 0,
            scale: 1,
            visibility: "visible" as const,
            transition,
        },
    };
    const panelAnimationState = isExpanded ? "expanded" : "collapsed";

    const updateExpandedState = () => {
        const nextIsExpanded = isPointerOver.current || isFocusWithin.current;

        if (nextIsExpanded === isExpandedRef.current) return;

        isExpandedRef.current = nextIsExpanded;
        setIsExpanded(nextIsExpanded);

        if (nextIsExpanded) {
            window.requestAnimationFrame(() => {
                activeItemRef.current?.scrollIntoView({ block: "nearest" });
            });
        }
    };

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
                return;
            }

            const updateActiveSection = () => {
                animationFrame = undefined;
                let nextActiveId = headings[0].id;

                for (const heading of headings) {
                    if (heading.getBoundingClientRect().top <= 120) {
                        nextActiveId = heading.id;
                    } else {
                        break;
                    }
                }

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
            }
        };

        startScrollspy();
        mediaQuery.addEventListener("change", handleMediaChange);

        return () => {
            stopScrollspy();
            mediaQuery.removeEventListener("change", handleMediaChange);
        };
    }, []);

    if (items.length === 0) return null;

    return (
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
            <motion.ol
                aria-hidden="true"
                className="ml-auto flex w-6 flex-col items-end gap-1.5"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{
                    opacity: isExpanded ? 0 : 1,
                    scale: isExpanded ? 0.97 : 1,
                }}
                style={{ pointerEvents: isExpanded ? "none" : "auto" }}
                transition={transition}
            >
                {items.map((item) => {
                    const isActive = item.id === activeId;

                    return (
                        <li className="flex h-[10px] items-center" key={item.id}>
                            <motion.span
                                aria-hidden="true"
                                className={`block h-[2px] rounded-full transition-colors ${
                                    isActive ? "bg-accent" : "bg-divider"
                                }`}
                                animate={{ width: isActive ? 24 : 16 }}
                                transition={transition}
                            />
                        </li>
                    );
                })}
            </motion.ol>
            <motion.div
                className="absolute right-0 top-0 w-60 overflow-hidden rounded-lg border border-divider bg-surface shadow-sm"
                id="floating-toc-panel"
                variants={panelVariants}
                initial="collapsed"
                animate={panelAnimationState}
            >
                <motion.ol
                    className="floating-toc-list flex max-h-[min(60vh,520px)] min-w-0 flex-col gap-0.5 overflow-y-auto overflow-x-hidden overscroll-contain px-4 py-3"
                    variants={panelListVariants}
                    initial="collapsed"
                    animate={panelAnimationState}
                >
                    {items.map((item) => {
                        const isActive = item.id === activeId;

                        return (
                            <motion.li
                                className="relative w-full min-w-0"
                                key={item.id}
                                variants={panelItemVariants}
                            >
                                {isActive && (
                                    <motion.span
                                        aria-hidden="true"
                                        className="absolute left-0 top-1/2 h-1 w-1 -translate-y-1/2 rounded-full bg-accent"
                                        layoutId="toc-active"
                                        transition={transition}
                                    />
                                )}
                                <a
                                    aria-current={isActive ? "true" : undefined}
                                    className={`block min-w-0 truncate rounded-sm py-1 pl-3 text-left text-[12px] leading-snug hover:text-foreground-strong ${
                                        isActive ? "text-accent" : "text-muted"
                                    }`}
                                    href={`#${item.id}`}
                                    ref={isActive ? activeItemRef : undefined}
                                >
                                    {item.title}
                                </a>
                            </motion.li>
                        );
                    })}
                </motion.ol>
            </motion.div>
        </nav>
    );
}
