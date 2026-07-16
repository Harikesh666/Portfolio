import { useEffect, useRef, useState } from "react";

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
    const [shouldAnimate, setShouldAnimate] = useState(false);
    const activeItemRef = useRef<HTMLAnchorElement>(null);
    const isPointerOver = useRef(false);
    const isFocusWithin = useRef(false);
    const isExpandedRef = useRef(false);

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
                    setShouldAnimate(isPointerOver.current);
                    isFocusWithin.current = false;
                    updateExpandedState();
                }
            }}
            onFocusCapture={() => {
                setShouldAnimate(isPointerOver.current);
                isFocusWithin.current = true;
                updateExpandedState();
            }}
            onMouseEnter={() => {
                setShouldAnimate(true);
                isPointerOver.current = true;
                updateExpandedState();
            }}
            onMouseLeave={() => {
                setShouldAnimate(true);
                isPointerOver.current = false;
                updateExpandedState();
            }}
        >
            <ol
                aria-hidden="true"
                className={`floating-toc-rail ml-auto flex w-6 flex-col items-end gap-1.5 ${
                    isExpanded ? "floating-toc-rail-hidden" : ""
                } ${
                    shouldAnimate ? "" : "floating-toc-instant"
                }`}
            >
                {items.map((item) => {
                    const isActive = item.id === activeId;

                    return (
                        <li className="w-full" key={item.id}>
                            <span
                                className={`ml-auto block h-[2px] rounded-full ${
                                    isActive
                                        ? "w-6 bg-accent"
                                        : "w-4 bg-divider"
                                }`}
                            />
                        </li>
                    );
                })}
            </ol>

            <div
                className={`floating-toc-panel absolute right-0 top-0 w-60 overflow-hidden rounded-lg border border-divider bg-surface shadow-sm ${
                    isExpanded ? "floating-toc-panel-expanded" : ""
                } ${
                    shouldAnimate ? "" : "floating-toc-instant"
                }`}
            >
                <ol className="floating-toc-list flex max-h-[min(60vh,520px)] min-w-0 flex-col gap-0.5 overflow-y-auto overflow-x-hidden overscroll-contain px-4 py-3">
                    {items.map((item) => {
                        const isActive = item.id === activeId;

                        return (
                            <li className="w-full min-w-0" key={item.id}>
                                <a
                                    aria-current={isActive ? "true" : undefined}
                                    className={`block min-w-0 truncate rounded-sm py-1 text-left text-[12px] leading-snug hover:text-foreground-strong ${
                                        isActive
                                            ? "text-accent"
                                            : "text-muted"
                                    }`}
                                    href={`#${item.id}`}
                                    ref={isActive ? activeItemRef : undefined}
                                >
                                    {item.title}
                                </a>
                            </li>
                        );
                    })}
                </ol>
            </div>
        </nav>
    );
}
