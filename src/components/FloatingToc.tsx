import {
    useCallback,
    useEffect,
    useImperativeHandle,
    useLayoutEffect,
    useRef,
    useState,
    type PointerEvent,
    type Ref,
} from "react";
import { useLocation } from "@tanstack/react-router";
import {
    motion,
    useMotionValue,
    useMotionValueEvent,
    useReducedMotion,
    useSpring,
    useTransform,
    type MotionValue,
} from "motion/react";
import type { MinimapKind } from "../lib/content-headings";
import {
    tocActivePulseResetDelay,
    tocProximitySpring,
    tocRailLabelInstantTween,
    tocRailLabelSpring,
    tocRailLabelVariants,
    hoverExitTween,
} from "../lib/motion";
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

const proximityRadius = 40;
const maximumDashWidth = 110;
const dashGap = 8;
type DashPreset = Readonly<{
    base: number;
    bump: number;
    thickness: number;
    color: string;
}>;

const DASH_PRESETS: Record<MinimapKind, DashPreset> = {
    title: {
        base: 40,
        bump: 70,
        thickness: 1,
        color: "var(--toc-major)",
    },
    subtitle: {
        base: 36,
        bump: 64,
        thickness: 1,
        color: "var(--toc-major)",
    },
    section: {
        base: 30,
        bump: 56,
        thickness: 1,
        color: "var(--toc-track)",
    },
    body: {
        base: 24,
        bump: 50,
        thickness: 1,
        color: "var(--toc-track)",
    },
};

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

type FloatingTocRailTickProps = Readonly<{
    id: string;
    isActive: boolean;
    dashCenters: ReadonlyMap<string, number>;
    centerVersion: MotionValue<number>;
    mouseY: MotionValue<number>;
    preset: DashPreset;
    shouldReduceMotion: boolean | null;
    title: string;
    registerDash: (id: string, node: HTMLAnchorElement | null) => void;
    onNavigate: (id: string) => void;
}>;

function FloatingTocRailTick({
    id,
    isActive,
    dashCenters,
    centerVersion,
    mouseY,
    preset,
    shouldReduceMotion,
    title,
    onNavigate,
    registerDash,
}: FloatingTocRailTickProps) {
    const anchorRef = useRef<HTMLAnchorElement>(null);
    const [hasFocus, setHasFocus] = useState(false);
    const [isPointerOver, setIsPointerOver] = useState(false);
    const isLabelVisible = hasFocus || isPointerOver;

    useEffect(() => {
        registerDash(id, anchorRef.current);
        return () => registerDash(id, null);
    }, [id, registerDash]);

    const targetScaleX = useTransform(
        [mouseY, centerVersion],
        ([pointerY]: number[]) => {
            const centerY = dashCenters.get(id);
            const baseScale = preset.base / maximumDashWidth;
            const activeScale =
                (preset.base + preset.bump) / maximumDashWidth;
            if (centerY === undefined || !Number.isFinite(pointerY)) {
                return baseScale;
            }

            const proximity = Math.max(
                0,
                1 - Math.abs(pointerY - centerY) / proximityRadius,
            );

            return (
                baseScale + (activeScale - baseScale) * proximity
            );
        },
    );
    const smoothedProximityScale = useSpring(
        targetScaleX,
        tocProximitySpring,
    );
    const tickScale = shouldReduceMotion
        ? targetScaleX
        : smoothedProximityScale;
    return (
        <a
            aria-current={isActive ? "location" : undefined}
            aria-label={`Go to ${title}`}
            className="group relative flex h-px w-27.5 items-center justify-end border-0 bg-transparent p-0"
            href={`#${id}`}
            ref={anchorRef}
            onBlur={() => {
                setHasFocus(false);
                if (!isPointerOver) {
                    mouseY.set(Number.POSITIVE_INFINITY);
                }
            }}
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
                onNavigate(id);
                if (event.detail > 0) event.currentTarget.blur();
            }}
            onFocus={() => {
                setHasFocus(true);
                const center = dashCenters.get(id);
                if (center !== undefined) mouseY.set(center);
            }}
            onPointerEnter={() => setIsPointerOver(true)}
            onPointerLeave={() => {
                setIsPointerOver(false);
                if (!hasFocus) {
                    mouseY.set(Number.POSITIVE_INFINITY);
                }
            }}
        >
            <span
                aria-hidden="true"
                className="absolute -inset-y-1 right-0 w-full"
            />
            <span
                aria-hidden="true"
                className="pointer-events-none absolute right-full top-1/2 z-10 mr-4 -translate-y-1/2"
            >
                <motion.span
                    animate={isLabelVisible ? "visible" : "hidden"}
                    className={`relative block w-max max-w-64 rounded-lg border bg-surface px-3 py-2 text-center text-[13px] font-medium leading-snug text-foreground-strong shadow-lg shadow-black/10 after:hidden dark:shadow-black/30 ${
                        isActive ? "border-accent/40" : "border-divider"
                    }`}
                    initial={false}
                    transition={
                        shouldReduceMotion
                            ? tocRailLabelInstantTween
                            : isLabelVisible
                              ? tocRailLabelSpring
                              : hoverExitTween
                    }
                    variants={tocRailLabelVariants}
                >
                    {title}
                </motion.span>
            </span>
            <motion.span
                aria-hidden="true"
                className="pointer-events-none block origin-right transition-colors duration-150 ease-out group-focus-visible:ring-2 group-focus-visible:ring-accent group-focus-visible:ring-offset-2"
                style={{
                    backgroundColor: preset.color,
                    scaleX: tickScale,
                    height: preset.thickness,
                    width: maximumDashWidth,
                    transformOrigin: "right center",
                }}
            />
        </a>
    );
}

function FloatingTocView({
    containerRef,
    items,
    lifecycleRef,
    onNavigate,
}: FloatingTocProps & Readonly<{ lifecycleRef: Ref<FloatingTocLifecycle> }>) {
    const mouseY = useMotionValue(Number.POSITIVE_INFINITY);
    const centerVersion = useMotionValue(0);
    const dashRefs = useRef(new Map<string, HTMLAnchorElement>());
    const dashCenters = useRef(new Map<string, number>());
    const pointerInsideRef = useRef(false);
    const { activeId, scrollActivity, start, stop } = useScrollSpy(
        items,
        containerRef,
    );
    const shouldReduceMotion = useReducedMotion();
    const previousActiveIdRef = useRef<string | null>(null);
    const activeIdRef = useRef<string | null>(null);
    const pulseTimeoutRef = useRef<number | null>(null);

    const registerDash = useCallback(
        (id: string, node: HTMLAnchorElement | null) => {
            if (node) {
                dashRefs.current.set(id, node);
            } else {
                dashRefs.current.delete(id);
                dashCenters.current.delete(id);
            }
        },
        [],
    );

    const cacheDashCenters = useCallback(() => {
        for (const [id, node] of dashRefs.current) {
            if (!node.isConnected) continue;
            const rect = node.getBoundingClientRect();
            dashCenters.current.set(id, rect.top + rect.height / 2);
        }
        centerVersion.set(centerVersion.get() + 1);
    }, [centerVersion]);

    const clearActivePulse = useCallback(() => {
        if (pulseTimeoutRef.current === null) return;
        window.clearTimeout(pulseTimeoutRef.current);
        pulseTimeoutRef.current = null;
    }, []);

    const pulseActiveDash = useCallback(
        (id: string) => {
            const center = dashCenters.current.get(id);
            if (center === undefined) return;
            clearActivePulse();
            mouseY.set(center);
            if (pointerInsideRef.current) return;
            pulseTimeoutRef.current = window.setTimeout(() => {
                mouseY.set(Number.POSITIVE_INFINITY);
                pulseTimeoutRef.current = null;
            }, tocActivePulseResetDelay);
        },
        [clearActivePulse, mouseY],
    );

    useImperativeHandle(
        lifecycleRef,
        () => ({
            activate: start,
            deactivate: () => {
                clearActivePulse();
                mouseY.set(Number.POSITIVE_INFINITY);
                stop();
            },
        }),
        [clearActivePulse, mouseY, start, stop],
    );

    useEffect(() => {
        activeIdRef.current = activeId;
        if (activeId === null || previousActiveIdRef.current === activeId) {
            return;
        }
        previousActiveIdRef.current = activeId;
        if (!dashCenters.current.has(activeId)) cacheDashCenters();
        pulseActiveDash(activeId);
    }, [activeId, cacheDashCenters, pulseActiveDash]);

    useMotionValueEvent(scrollActivity, "change", () => {
        const currentActiveId = activeIdRef.current;
        if (currentActiveId) pulseActiveDash(currentActiveId);
    });

    useEffect(() => {
        cacheDashCenters();
        const handleResize = () => cacheDashCenters();
        window.addEventListener("resize", handleResize);
        return () => {
            window.removeEventListener("resize", handleResize);
            clearActivePulse();
        };
    }, [cacheDashCenters, clearActivePulse]);

    if (items.length === 0) return null;

    const handlePointerEnter = (event: PointerEvent<HTMLElement>) => {
        clearActivePulse();
        pointerInsideRef.current = true;
        cacheDashCenters();
        mouseY.set(event.clientY);
    };
    const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
        if (pointerInsideRef.current) mouseY.set(event.clientY);
    };
    const handlePointerLeave = () => {
        clearActivePulse();
        pointerInsideRef.current = false;
        mouseY.set(Number.POSITIVE_INFINITY);
    };
    return (
        <aside className="pointer-events-none fixed inset-y-0 right-0 z-20 hidden w-24 xl:block">
            <motion.nav
                aria-label="Table of contents"
                className="pointer-events-auto flex h-full min-h-0 items-center justify-end"
                onKeyDown={(event) => {
                    if (event.key !== "Escape") return;
                    (document.activeElement as HTMLElement | null)?.blur();
                }}
            >
                <div
                    className="mx-8 flex flex-col items-end"
                    onPointerEnter={handlePointerEnter}
                    onPointerLeave={handlePointerLeave}
                    onPointerMove={handlePointerMove}
                    style={{ gap: dashGap }}
                >
                    {items.map((item) => {
                        const isActive = item.id === activeId;

                        return (
                            <FloatingTocRailTick
                                id={item.id}
                                isActive={isActive}
                                key={item.id}
                                dashCenters={dashCenters.current}
                                centerVersion={centerVersion}
                                mouseY={mouseY}
                                onNavigate={onNavigate}
                                preset={DASH_PRESETS[item.kind]}
                                registerDash={registerDash}
                                shouldReduceMotion={shouldReduceMotion}
                                title={item.title}
                            />
                        );
                    })}
                </div>
            </motion.nav>
        </aside>
    );
}
