import {
    useEffect,
    useImperativeHandle,
    useLayoutEffect,
    useRef,
    useState,
    type Ref,
} from "react";
import { useLocation } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import { tocHookFadeTween, tocHookInstantTween, tocHookSpring } from "../lib/motion";
import { useScrollSpy } from "../lib/use-scroll-spy";
import {
    useTocRegistration,
    useTocRegistrationValue,
    type FloatingTocProps,
    type TocRegistration,
} from "./TocRegistry";

type FloatingTocLifecycle = {
    activate: () => void;
    deactivate: () => void;
};

type FloatingTocHostState = Readonly<{
    registration: TocRegistration | null;
    retiredInstanceId: number | null;
}>;

export function FloatingToc({
    containerRef,
    items,
    onNavigate,
    slug,
}: FloatingTocProps) {
    const registerToc = useTocRegistration();
    const currentRouteId = useLocation({
        select: (location) => location.pathname,
    });
    const [routeId] = useState(currentRouteId);

    useEffect(() => {
        let unregister: (() => void) | undefined;
        const frame = window.requestAnimationFrame(() => {
            unregister = registerToc({
                containerRef,
                items,
                onNavigate,
                routeId,
                slug,
            });
        });

        return () => {
            window.cancelAnimationFrame(frame);
            unregister?.();
        };
    }, [containerRef, items, onNavigate, registerToc, routeId, slug]);

    return null;
}

export function FloatingTocHost({
    settledRouteId,
}: Readonly<{ settledRouteId: string }>) {
    const registration = useTocRegistrationValue();
    const currentRouteId = useLocation({
        select: (location) => location.pathname,
    });
    const [hostState, setHostState] = useState<FloatingTocHostState>({
        registration: null,
        retiredInstanceId: null,
    });
    const hostedRegistration = hostState.registration;
    const lifecycleRef = useRef<FloatingTocLifecycle>(null);
    const activeRegistration =
        registration?.routeId === currentRouteId &&
        registration.containerRef.current?.isConnected &&
        settledRouteId === currentRouteId
            ? registration
            : null;
    const isActive =
        hostedRegistration !== null &&
        hostedRegistration.token === activeRegistration?.token;

    useLayoutEffect(() => {
        if (hostState.retiredInstanceId !== null) {
            performance.mark("portfolio-toc-dispose");
        }

        if (
            activeRegistration &&
            activeRegistration.token === hostedRegistration?.token
        ) {
            lifecycleRef.current?.activate();
            return;
        }

        if (
            hostedRegistration &&
            hostedRegistration.routeId !== currentRouteId
        ) {
            lifecycleRef.current?.deactivate();
        }
    }, [
        activeRegistration,
        currentRouteId,
        hostState.retiredInstanceId,
        hostedRegistration,
    ]);

    if (
        activeRegistration &&
        hostedRegistration?.token !== activeRegistration.token
    ) {
        setHostState({
            registration: activeRegistration,
            retiredInstanceId: hostedRegistration?.instanceId ?? null,
        });
        return null;
    }

    if (
        hostedRegistration &&
        hostedRegistration.routeId !== currentRouteId &&
        settledRouteId === currentRouteId
    ) {
        setHostState({
            registration: null,
            retiredInstanceId: hostedRegistration?.instanceId ?? null,
        });
        return null;
    }

    return hostedRegistration ? (
        <div
            aria-hidden={!isActive}
            className={isActive ? undefined : "pointer-events-none"}
            data-floating-toc-host={isActive ? "active" : "retained"}
            data-floating-toc-slug={hostedRegistration.slug}
            inert={isActive ? undefined : true}
            style={isActive ? undefined : { display: "none" }}
        >
            <FloatingTocView
                {...hostedRegistration}
                key={hostedRegistration.instanceId}
                lifecycleRef={lifecycleRef}
            />
        </div>
    ) : null;
}

/** Height of the rail's rounded hook, from where it leaves the line to the row's center. */
const hookCorner = 6;
/** Space kept between the bottom of the list and the top of the site footer, in px. */
const footerClearance = 24;
const dashedRail =
    "repeating-linear-gradient(to bottom, currentColor 0 2px, transparent 2px 4px)";

/**
 * One dashed rail: a vertical line from `from` down to just above `y`, then a
 * small rounded hook that turns right into the row at `y`. Adapted from Rare
 * UI's Hook Sidebar. Only `top` and `height` of this small, absolutely placed
 * subtree animate, on the TOC spring.
 */
function HookRail({
    from = 0,
    y,
    isVisible,
    shouldReduceMotion,
    className,
}: Readonly<{
    from?: number;
    y: number | null;
    isVisible: boolean;
    shouldReduceMotion: boolean;
    className: string;
}>) {
    const travel = shouldReduceMotion ? tocHookInstantTween : tocHookSpring;
    return (
        <motion.span
            animate={{ opacity: isVisible && y !== null ? 1 : 0 }}
            aria-hidden="true"
            className={`pointer-events-none absolute inset-0 ${className}`}
            initial={false}
            transition={shouldReduceMotion ? tocHookInstantTween : tocHookFadeTween}
        >
            <motion.span
                animate={{ top: from, height: Math.max(0, (y ?? 0) - hookCorner - from) }}
                className="absolute left-0.5 w-px"
                initial={false}
                style={{ backgroundImage: dashedRail }}
                transition={travel}
            />
            <motion.svg
                animate={{ top: (y ?? 0) - hookCorner }}
                className="absolute left-0.5"
                fill="none"
                height="7"
                initial={false}
                transition={travel}
                viewBox="0 0 12 7"
                width="12"
            >
                <path d="M0.5 0a6 6 0 0 0 6 6H12" stroke="currentColor" strokeDasharray="2 2" />
            </motion.svg>
        </motion.span>
    );
}

/**
 * The desktop table of contents: the article's sections in a column to the
 * right of the text. A terracotta dashed rail runs from the top of the list
 * down to the section being read and hooks into it; while the pointer or
 * keyboard focus is on another row, a faint rail previews the way there.
 * Rows are anchors that push hash history through `onNavigate`. The one
 * scrollspy instance (`useScrollSpy`) decides the active row, and the host
 * starts and stops it through `lifecycleRef`. A long list scrolls on its own,
 * keeping the active row in view.
 */
function FloatingTocView({
    containerRef,
    items,
    lifecycleRef,
    onNavigate,
}: FloatingTocProps & Readonly<{ lifecycleRef: Ref<FloatingTocLifecycle> }>) {
    const { activeId, start, stop } = useScrollSpy(items, containerRef);
    const shouldReduceMotion = useReducedMotion() ?? false;
    const scrollRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const navRef = useRef<HTMLElement>(null);
    const rowRefs = useRef(new Map<string, HTMLAnchorElement>());
    const [centers, setCenters] = useState<Record<string, number>>({});
    const [previewId, setPreviewId] = useState<string | null>(null);
    const [isPointerInside, setIsPointerInside] = useState(false);
    const [isFocusInside, setIsFocusInside] = useState(false);

    useImperativeHandle(lifecycleRef, () => ({ activate: start, deactivate: stop }), [start, stop]);

    // Row centers inside the list, the rails' only geometry. Re-measured when the list resizes.
    useLayoutEffect(() => {
        const list = listRef.current;
        if (!list) return;
        const measure = () => {
            const next: Record<string, number> = {};
            for (const [id, row] of rowRefs.current) next[id] = row.offsetTop + row.offsetHeight / 2;
            setCenters(next);
        };
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(list);
        return () => observer.disconnect();
    }, [items]);

    // Keep the section being read in view when the list is taller than the window allows.
    useEffect(() => {
        const scroller = scrollRef.current;
        const row = activeId ? rowRefs.current.get(activeId) : undefined;
        if (!scroller || !row) return;
        const top = row.offsetTop;
        const bottom = top + row.offsetHeight;
        const margin = 32;
        if (top - margin < scroller.scrollTop) {
            scroller.scrollTo({ top: top - margin, behavior: shouldReduceMotion ? "auto" : "smooth" });
        } else if (bottom + margin > scroller.scrollTop + scroller.clientHeight) {
            scroller.scrollTo({ top: bottom + margin - scroller.clientHeight, behavior: shouldReduceMotion ? "auto" : "smooth" });
        }
    }, [activeId, shouldReduceMotion]);

    // Past the article the footer rises into view. The list rides up with it
    // and always ends a little above the footer, the way a sticky column lets
    // go, instead of the footer's petals drawing over its last rows. Each
    // scroll frame reads the list's resting bottom and the footer's top, then
    // writes one translate: reads before the write, so no forced layout.
    useEffect(() => {
        const nav = navRef.current;
        const footer = document.querySelector("[data-site-footer]");
        if (!nav || !footer) return;
        let lift = 0;
        let frame = 0;
        const place = () => {
            frame = 0;
            const restingBottom = nav.getBoundingClientRect().bottom + lift;
            const next = Math.max(0, restingBottom + footerClearance - footer.getBoundingClientRect().top);
            if (Math.abs(next - lift) < 0.5) return;
            lift = next;
            nav.style.translate = lift > 0 ? `0 ${-lift}px` : "";
        };
        const schedule = () => {
            if (!frame) frame = window.requestAnimationFrame(place);
        };
        schedule();
        window.addEventListener("scroll", schedule, { passive: true });
        window.addEventListener("resize", schedule);
        return () => {
            window.cancelAnimationFrame(frame);
            window.removeEventListener("scroll", schedule);
            window.removeEventListener("resize", schedule);
            nav.style.translate = "";
        };
    }, []);

    if (items.length === 0) return null;

    const activeY = activeId ? (centers[activeId] ?? null) : null;
    const previewY = previewId ? (centers[previewId] ?? null) : null;
    // Above the active row the terracotta rail already covers the line, so the preview draws only its hook.
    const previewFrom =
        activeY !== null && previewY !== null && previewY <= activeY ? Math.max(0, previewY - hookCorner) : (activeY ?? 0);

    return (
        <aside className="toc-hook pointer-events-none fixed top-0 right-0 bottom-0 z-20 hidden xl:block">
            <nav
                aria-label="Table of contents"
                className="pointer-events-auto flex max-h-full flex-col"
                ref={navRef}
                onKeyDown={(event) => {
                    if (event.key !== "Escape") return;
                    (document.activeElement as HTMLElement | null)?.blur();
                }}
            >
                <p className="toc-hook__label">On this page</p>
                <div className="toc-hook__scroll" ref={scrollRef}>
                    <div
                        className="relative flex flex-col gap-0.5"
                        onPointerLeave={() => {
                            setIsPointerInside(false);
                            if (!isFocusInside) setPreviewId(null);
                        }}
                        ref={listRef}
                    >
                        <HookRail
                            className="text-muted opacity-60"
                            from={previewFrom}
                            isVisible={(isPointerInside || isFocusInside) && previewId !== activeId}
                            shouldReduceMotion={shouldReduceMotion}
                            y={previewY}
                        />
                        <HookRail
                            className="text-accent"
                            isVisible={activeY !== null}
                            shouldReduceMotion={shouldReduceMotion}
                            y={activeY}
                        />
                        {items.map((item) => {
                            const isActive = item.id === activeId;
                            return (
                                <a
                                    aria-current={isActive ? "location" : undefined}
                                    className="toc-hook__row"
                                    data-active={isActive ? "" : undefined}
                                    href={`#${item.id}`}
                                    key={item.id}
                                    onBlur={() => setIsFocusInside(false)}
                                    onClick={(event) => {
                                        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
                                            return;
                                        }
                                        event.preventDefault();
                                        onNavigate(item.id);
                                        if (event.detail > 0) event.currentTarget.blur();
                                    }}
                                    onFocus={() => {
                                        setPreviewId(item.id);
                                        setIsFocusInside(true);
                                    }}
                                    onPointerEnter={() => {
                                        setPreviewId(item.id);
                                        setIsPointerInside(true);
                                    }}
                                    ref={(node) => {
                                        if (node) rowRefs.current.set(item.id, node);
                                        else rowRefs.current.delete(item.id);
                                    }}
                                >
                                    <span className="toc-hook__title">{item.title}</span>
                                </a>
                            );
                        })}
                    </div>
                </div>
            </nav>
        </aside>
    );
}
