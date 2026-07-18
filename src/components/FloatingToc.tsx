import {
    createContext,
    useContext,
    useEffect,
    useImperativeHandle,
    useLayoutEffect,
    useRef,
    useState,
    type ReactNode,
    type Ref,
    type RefObject,
} from "react";
import { useLocation } from "@tanstack/react-router";
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
import type { TocItem } from "../lib/content-headings";
import {
    hoverExitTween,
    snappySpring,
    stretchSpring,
    tocCollapseSpring,
    tocMorphSpring,
} from "../lib/motion";
import { getTocItemDelay } from "../lib/toc";
import { useScrollSpy } from "../lib/use-scroll-spy";

type FloatingTocProps = Readonly<{
    containerRef: RefObject<HTMLElement | null>;
    items: TocItem[];
    onNavigate: (id: string) => void;
    slug: string;
}>;

type TocRegistration = FloatingTocProps & {
    instanceId: number;
    routeId: string;
    token: symbol;
};

type FloatingTocLifecycle = {
    activate: () => void;
    deactivate: () => void;
};

type RegisterToc = (
    toc: Omit<TocRegistration, "instanceId" | "token">,
) => () => void;

const FloatingTocContext = createContext<RegisterToc | null>(null);
const FloatingTocRegistrationContext =
    createContext<TocRegistration | null>(null);
let nextTocRegistrationId = 0;

const collapsedPanelScale = 0.08;
const collapseDelayRatio = 0.65;
const activeTickScale = 1;
const neighborTickScale = 20 / 28;
const baseTickScale = 14 / 28;
const maximumIndicatorStretch = 0.6;
const indicatorVelocityScale = 0.02;

function getNextTocRegistrationId() {
    nextTocRegistrationId += 1;
    return nextTocRegistrationId;
}

export function FloatingToc({
    containerRef,
    items,
    onNavigate,
    slug,
}: FloatingTocProps) {
    const registerToc = useContext(FloatingTocContext);
    const currentRouteId = useLocation({
        select: (location) => location.pathname,
    });
    const [routeId] = useState(currentRouteId);

    if (!registerToc) {
        throw new Error("FloatingToc must be rendered inside FloatingTocProvider");
    }

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

export function FloatingTocProvider({
    children,
}: Readonly<{ children: ReactNode }>) {
    const [registration, setRegistration] =
        useState<TocRegistration | null>(null);
    const registerToc: RegisterToc = (toc) => {
        const registration = {
            ...toc,
            instanceId: getNextTocRegistrationId(),
            token: Symbol(),
        };
        setRegistration(registration);

        return () =>
            setRegistration((current) =>
                current?.token === registration.token ? null : current,
            );
    };

    return (
        <FloatingTocContext value={registerToc}>
            <FloatingTocRegistrationContext value={registration}>
                {children}
            </FloatingTocRegistrationContext>
        </FloatingTocContext>
    );
}

export function FloatingTocHost({
    settledRouteId,
}: Readonly<{ settledRouteId: string }>) {
    const registration = useContext(FloatingTocRegistrationContext);
    const currentRouteId = useLocation({
        select: (location) => location.pathname,
    });
    const [hostedRegistration, setHostedRegistration] =
        useState<TocRegistration | null>(null);
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
        if (activeRegistration) {
            if (hostedRegistration?.token === activeRegistration.token) {
                lifecycleRef.current?.activate();
                return;
            }
            setHostedRegistration((current) => {
                if (current?.token === activeRegistration.token) {
                    return current;
                }
                if (current) {
                    performance.mark("portfolio-toc-dispose");
                }
                return activeRegistration;
            });
            return;
        }

        if (hostedRegistration?.routeId !== currentRouteId) {
            lifecycleRef.current?.deactivate();
        }

        if (
            hostedRegistration?.routeId !== currentRouteId &&
            settledRouteId === currentRouteId
        ) {
            performance.mark("portfolio-toc-dispose");
            setHostedRegistration(null);
        }
    }, [
        activeRegistration,
        currentRouteId,
        hostedRegistration,
        settledRouteId,
    ]);

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

export function useHasFloatingTocRegistration() {
    return useContext(FloatingTocRegistrationContext) !== null;
}

function FloatingTocView({
    containerRef,
    items,
    lifecycleRef,
    onNavigate,
    slug,
}: FloatingTocProps &
    Readonly<{ lifecycleRef: Ref<FloatingTocLifecycle> }>) {
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const activeItemRef = useRef<HTMLAnchorElement>(null);
    const [hasPaintedActiveSection, setHasPaintedActiveSection] =
        useState(false);
    const isPointerOver = useRef(false);
    const isFocusWithin = useRef(false);
    const isExpandedRef = useRef(false);
    const { activeId, activeIndex, sectionProgress, start, stop } = useScrollSpy(
        items,
        containerRef,
    );
    useImperativeHandle(
        lifecycleRef,
        () => ({ activate: start, deactivate: stop }),
        [start, stop],
    );
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
    const activeTransition = hasPaintedActiveSection
        ? snappyTransition
        : instantTransition;
    const stretchTransition = shouldReduceMotion
        ? instantTransition
        : stretchSpring;

    useEffect(() => {
        if (activeId !== null) {
            setHasPaintedActiveSection(true);
        }
    }, [activeId]);
    const hasActiveItem = activeIndex !== null;
    const maximumItemDistance = hasActiveItem
        ? Math.max(activeIndex, items.length - 1 - activeIndex)
        : 0;

    const getItemDelay = (index: number) => {
        if (shouldReduceMotion || !hasActiveItem) return 0;

        const distance = Math.abs(index - activeIndex);
        const staggerDistance = isExpanded
            ? distance
            : maximumItemDistance - distance;
        const delay = getTocItemDelay(staggerDistance);

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
        if (hasActiveItem) activePosition.set(activeIndex);
    }, [activeIndex, activePosition, hasActiveItem]);

    if (items.length === 0) return null;

    const panelId = `floating-toc-panel-${slug}`;

    return (
        <LayoutGroup id={`floating-toc-${slug}`}>
            <div className="pointer-events-none fixed inset-y-0 right-6 z-20 hidden w-60 max-w-60 items-center xl:flex">
                <motion.nav
                    aria-label="Table of contents"
                    className="pointer-events-auto relative isolate w-full"
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
                <a className="sr-only" href={`#${panelId}`}>
                    Table of contents
                </a>
                <ol
                    aria-hidden="true"
                    className="ml-auto flex w-7 flex-col items-end gap-1.5"
                    style={{ pointerEvents: isExpanded ? "none" : "auto" }}
                >
                    {items.map((item, index) => {
                        const distance = hasActiveItem
                            ? Math.abs(index - activeIndex)
                            : Number.POSITIVE_INFINITY;
                        const isActive = hasActiveItem && distance === 0;
                        const isRead = hasActiveItem && index < activeIndex;
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
                                            transition={activeTransition}
                                        />
                                        <motion.span
                                            className="absolute right-0 top-1/2 h-0.5 w-full -translate-y-1/2 origin-right rounded-full"
                                            animate={{ scaleX: tickScale }}
                                            transition={activeTransition}
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
                    id={panelId}
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
                                        className={`relative z-10 block min-w-0 truncate rounded-sm py-1 pl-4 text-left text-[12px] leading-snug hover:text-foreground-strong ${
                                            hasPaintedActiveSection
                                                ? "transition-colors"
                                                : ""
                                        } ${
                                            isActive
                                                ? "text-accent"
                                                : "text-muted"
                                        }`}
                                        href={`#${item.id}`}
                                        onClick={(event) => {
                                            if (
                                                event.button !== 0 ||
                                                event.metaKey ||
                                                event.ctrlKey ||
                                                event.shiftKey ||
                                                event.altKey
                                            ) {
                                                return;
                                            }
                                            event.preventDefault();
                                            onNavigate(item.id);
                                        }}
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
                </motion.nav>
            </div>
        </LayoutGroup>
    );
}
