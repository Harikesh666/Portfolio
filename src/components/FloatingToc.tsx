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
    const activeItemRef = useRef<HTMLAnchorElement>(null);
    const isPointerOver = useRef(false);
    const isFocusWithin = useRef(false);
    const isExpanded = useRef(false);

    const updateExpandedState = () => {
        const nextIsExpanded = isPointerOver.current || isFocusWithin.current;

        if (nextIsExpanded && !isExpanded.current) {
            isExpanded.current = true;
            window.requestAnimationFrame(() => {
                activeItemRef.current?.scrollIntoView({ block: "nearest" });
            });
        } else if (!nextIsExpanded) {
            isExpanded.current = false;
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
            className="rise-in-delayed group/toc fixed right-6 top-1/2 z-20 hidden w-60 max-w-[240px] -translate-y-1/2 isolate xl:block"
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
            <div className="floating-toc-panel relative overflow-hidden rounded-lg before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:translate-x-2 before:rounded-lg before:border before:border-divider before:bg-surface before:opacity-0 before:shadow-sm before:transition-[opacity,transform] before:duration-200 before:ease-out group-hover/toc:before:translate-x-0 group-hover/toc:before:opacity-100 group-focus-within/toc:before:translate-x-0 group-focus-within/toc:before:opacity-100">
                <ol className="floating-toc-list flex min-w-0 flex-col items-stretch gap-1.5 group-hover/toc:max-h-[min(60vh,520px)] group-hover/toc:overflow-y-auto group-hover/toc:overflow-x-hidden group-hover/toc:overscroll-contain group-hover/toc:gap-0.5 group-hover/toc:px-4 group-hover/toc:py-3 group-focus-within/toc:max-h-[min(60vh,520px)] group-focus-within/toc:overflow-y-auto group-focus-within/toc:overflow-x-hidden group-focus-within/toc:overscroll-contain group-focus-within/toc:gap-0.5 group-focus-within/toc:px-4 group-focus-within/toc:py-3">
                    {items.map((item) => {
                        const isActive = item.id === activeId;

                        return (
                            <li className="w-full min-w-0" key={item.id}>
                                <a
                                    aria-current={isActive ? "true" : undefined}
                                    className={`relative block w-full min-w-0 truncate rounded-sm py-1 pr-8 text-left text-[12px] leading-snug hover:text-foreground-strong group-hover/toc:pr-0 group-focus-within/toc:pr-0 ${
                                        isActive
                                            ? "text-accent"
                                            : "text-muted"
                                    }`}
                                    href={`#${item.id}`}
                                    ref={isActive ? activeItemRef : undefined}
                                >
                                    <span className="floating-toc-title sr-only block min-w-0 truncate group-hover/toc:not-sr-only group-focus-within/toc:not-sr-only">
                                        {item.title}
                                    </span>
                                    <span
                                        aria-hidden="true"
                                        className={`absolute right-0 top-1/2 h-[2px] -translate-y-1/2 rounded-full transition-[width,color] duration-200 group-hover/toc:hidden group-focus-within/toc:hidden ${
                                            isActive
                                                ? "w-6 bg-accent"
                                                : "w-4 bg-divider"
                                        }`}
                                    />
                                </a>
                            </li>
                        );
                    })}
                </ol>
            </div>
        </nav>
    );
}
