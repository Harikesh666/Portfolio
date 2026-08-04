import {
    useEffect,
    useEffectEvent,
    useLayoutEffect,
    useRef,
    useState,
    type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { useLocation } from "@tanstack/react-router";
import {
    AnimatePresence,
    LayoutGroup,
    animate,
    motion,
    useDragControls,
    useMotionValue,
    useReducedMotion,
    useSpring,
    useTransform,
    type PanInfo,
} from "motion/react";
import type { TocItem } from "../lib/content-headings";
import {
    materializeBlock,
    reducedPageBlock,
    sheetCloseSpring,
    sheetFadeTween,
    sheetNavigationFadeTween,
    sheetRowTween,
    sheetSpring,
    snappySpring,
} from "../lib/motion";
import { getTocItemDelay, shouldDismissSheet } from "../lib/toc";
import { useScrollSpy } from "../lib/use-scroll-spy";

type TocSheetProps = Readonly<{
    containerRef: RefObject<HTMLElement | null>;
    items: TocItem[];
    onNavigate: (id: string) => void;
    slug: string;
}>;

const focusableSelector =
    'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

type TocSheetRowProps = Readonly<{
    activeItemRef: RefObject<HTMLAnchorElement | null>;
    enterDelay: number;
    href: string;
    id: string;
    isActive: boolean;
    onNavigate: (id: string) => void;
    onStaggerComplete: (() => void) | undefined;
    shouldReduceMotion: boolean | null;
    title: string;
}>;

function TocSheetRow({
    activeItemRef,
    enterDelay,
    href,
    id,
    isActive,
    onNavigate,
    onStaggerComplete,
    shouldReduceMotion,
    title,
}: TocSheetRowProps) {
    return (
        <motion.li
            animate={{ opacity: 1, y: 0 }}
            className="relative min-w-0"
            initial={
                shouldReduceMotion
                    ? false
                    : {
                          opacity: 0,
                          y: 6,
                      }
            }
            onAnimationComplete={onStaggerComplete}
            transition={
                shouldReduceMotion
                    ? { duration: 0 }
                    : {
                          ...sheetRowTween,
                          delay: enterDelay,
                      }
            }
        >
            {isActive && (
                <motion.span
                    aria-hidden="true"
                    className="absolute inset-y-1 left-1 w-0.5 rounded-full bg-accent"
                    layoutId="toc-sheet-active"
                    transition={{
                        layout: shouldReduceMotion
                            ? {
                                  duration: 0,
                              }
                            : snappySpring,
                    }}
                />
            )}
            <a
                aria-current={isActive ? "location" : undefined}
                className={`flex min-h-11 min-w-0 items-center rounded-md px-4 py-2 text-sm leading-snug hover:bg-accent-soft hover:text-foreground-strong ${
                    isActive
                        ? "bg-accent-soft font-medium text-accent"
                        : "text-muted"
                }`}
                href={href}
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
                }}
                ref={isActive ? activeItemRef : undefined}
            >
                <span className="line-clamp-2 min-w-0">{title}</span>
            </a>
        </motion.li>
    );
}

export function TocSheet({
    containerRef,
    items,
    onNavigate,
    slug,
}: TocSheetProps) {
    const currentRouteId = useLocation({
        select: (location) => location.pathname,
    });
    const [routeId] = useState(currentRouteId);
    const isRouteActive = currentRouteId === routeId;
    const { activeId, activeIndex, sectionProgress } = useScrollSpy(
        items,
        containerRef,
        isRouteActive,
    );
    const shouldReduceMotion = useReducedMotion();
    const dragControls = useDragControls();
    const sheetY = useMotionValue(0);
    const sheetOpacity = useMotionValue(1);
    const animatedSectionProgress = useSpring(sectionProgress, snappySpring);
    const [sheetHeight, setSheetHeight] = useState(1);
    const [isOpen, setIsOpen] = useState(false);
    const [isSheetMounted, setIsSheetMounted] = useState(false);
    const [isSheetRowStaggering, setIsSheetRowStaggering] = useState(false);
    const [isListAtTop, setIsListAtTop] = useState(true);
    const supportsDirectionalTouchAction =
        typeof CSS !== "undefined" &&
        CSS.supports("touch-action", "pan-down");
    const triggerRef = useRef<HTMLButtonElement>(null);
    const portalRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLOListElement>(null);
    const activeItemRef = useRef<HTMLAnchorElement>(null);
    const returnFocusRef = useRef<HTMLElement | null>(null);
    const sheetHeightRef = useRef(1);
    const isOpenRef = useRef(false);
    const isSheetMountedRef = useRef(false);
    const animationSequenceRef = useRef(0);
    const animationRef = useRef<{ stop: () => void } | null>(null);
    const hasDraggedRef = useRef(false);
    const backdropOpacity = useTransform(
        sheetY,
        [0, Math.max(sheetHeight, 1)],
        [1, 0],
    );
    const currentTitle =
        activeIndex === null
            ? "Table of contents"
            : (items[activeIndex]?.title ?? "Table of contents");
    const sheetId = `toc-sheet-${slug}`;
    const sheetTitleId = `${sheetId}-title`;

    useLayoutEffect(() => {
        if (isRouteActive) return;

        animationSequenceRef.current += 1;
        animationRef.current?.stop();
        dragControls.cancel();
        isOpenRef.current = false;
        isSheetMountedRef.current = false;
        setIsOpen(false);
        setIsSheetMounted(false);
        setIsSheetRowStaggering(false);
    }, [dragControls, isRouteActive]);

    const returnFocus = () => {
        window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => {
                if (returnFocusRef.current?.isConnected) {
                    returnFocusRef.current.focus({ preventScroll: true });
                }
            });
        });
    };

    const openSheet = () => {
        returnFocusRef.current = triggerRef.current;
        isOpenRef.current = true;
        setIsOpen(true);
        animationSequenceRef.current += 1;
        animationRef.current?.stop();

        if (!isSheetMountedRef.current) {
            isSheetMountedRef.current = true;
            setIsSheetRowStaggering(!shouldReduceMotion);
            setIsSheetMounted(true);
            return;
        }

        if (shouldReduceMotion) {
            sheetY.set(0);
            animationRef.current = animate(
                sheetOpacity,
                1,
                sheetFadeTween,
            );
        } else {
            sheetOpacity.set(1);
            animationRef.current = animate(sheetY, 0, sheetSpring);
        }
    };

    const closeSheet = (
        reducedTransition = sheetFadeTween,
        velocity = 0,
        onClosed?: () => void,
    ) => {
        if (!isSheetMountedRef.current) return;

        isOpenRef.current = false;
        setIsOpen(false);
        const sequence = ++animationSequenceRef.current;
        animationRef.current?.stop();

        const animation = shouldReduceMotion
            ? animate(sheetOpacity, 0, reducedTransition)
            : animate(sheetY, sheetHeightRef.current, {
                  ...sheetCloseSpring,
                  velocity,
              });

        animationRef.current = animation;
        void animation.then(() => {
            if (
                sequence !== animationSequenceRef.current ||
                isOpenRef.current
            ) {
                return;
            }

            isSheetMountedRef.current = false;
            setIsSheetMounted(false);
            setIsSheetRowStaggering(false);
            returnFocus();
            onClosed?.();
        });
    };

    const navigateFromSheet = (id: string) => {
        closeSheet(sheetNavigationFadeTween, 0, () => onNavigate(id));
    };

    useLayoutEffect(() => {
        if (!isSheetMounted || !panelRef.current) return;

        const panel = panelRef.current;
        const measureSheet = () => {
            const nextHeight = Math.max(panel.getBoundingClientRect().height, 1);
            sheetHeightRef.current = nextHeight;
            setSheetHeight(nextHeight);
        };

        measureSheet();
        const sequence = ++animationSequenceRef.current;
        animationRef.current?.stop();

        if (shouldReduceMotion) {
            sheetY.set(0);
            sheetOpacity.set(0);
            animationRef.current = animate(
                sheetOpacity,
                1,
                sheetFadeTween,
            );
        } else {
            sheetOpacity.set(1);
            sheetY.set(sheetHeightRef.current);
            animationRef.current = animate(sheetY, 0, sheetSpring);
        }

        const focusFrame = window.requestAnimationFrame(() => {
            if (sequence !== animationSequenceRef.current) return;

            const focusTarget =
                activeItemRef.current ??
                panel.querySelector<HTMLElement>(focusableSelector);
            activeItemRef.current?.scrollIntoView({ block: "center" });
            focusTarget?.focus({ preventScroll: true });
        });
        const resizeObserver = new ResizeObserver(measureSheet);
        resizeObserver.observe(panel);

        return () => {
            window.cancelAnimationFrame(focusFrame);
            resizeObserver.disconnect();
        };
    }, [isSheetMounted, sheetOpacity, sheetY, shouldReduceMotion]);

    useLayoutEffect(() => {
        if (!isRouteActive || !isSheetMounted || !portalRef.current) return;

        const html = document.documentElement;
        const body = document.body;
        const supportsInert = "inert" in HTMLElement.prototype;
        const previousHtmlOverflow = html.style.overflow;
        const previousBodyOverflow = body.style.overflow;
        const siblings = Array.from(body.children).flatMap((element) => {
            if (!(element instanceof HTMLElement) || element === portalRef.current) {
                return [];
            }

            const state = {
                element,
                inert: element.inert,
                ariaHidden: element.getAttribute("aria-hidden"),
            };

            if (supportsInert) {
                element.inert = true;
            } else {
                element.setAttribute("aria-hidden", "true");
            }

            return [state];
        });

        html.style.overflow = "hidden";
        body.style.overflow = "hidden";

        return () => {
            html.style.overflow = previousHtmlOverflow;
            body.style.overflow = previousBodyOverflow;
            siblings.forEach(({ element, inert, ariaHidden }) => {
                element.inert = inert;
                if (ariaHidden === null) {
                    element.removeAttribute("aria-hidden");
                } else {
                    element.setAttribute("aria-hidden", ariaHidden);
                }
            });
        };
    }, [isRouteActive, isSheetMounted]);

    useEffect(
        () => () => {
            animationSequenceRef.current += 1;
            animationRef.current?.stop();
            dragControls.cancel();
        },
        [dragControls],
    );

    const handleDialogKeyDown = (event: React.KeyboardEvent) => {
        if (event.key === "Escape") {
            event.preventDefault();
            closeSheet();
            return;
        }

        if (event.key !== "Tab" || !panelRef.current) return;

        const focusableElements = Array.from(
            panelRef.current.querySelectorAll<HTMLElement>(focusableSelector),
        ).filter((element) => !element.hasAttribute("disabled"));
        const firstElement = focusableElements[0];
        const lastElement = focusableElements.at(-1);
        if (!firstElement || !lastElement) return;

        if (event.shiftKey && document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
        }
    };

    const handleDragStart = () => {
        hasDraggedRef.current = true;
        animationSequenceRef.current += 1;
        animationRef.current?.stop();
        isOpenRef.current = true;
        setIsOpen(true);
        sheetOpacity.set(1);
    };

    const settleDrag = (offset: number, velocity: number) => {
        if (
            shouldDismissSheet(offset, velocity, sheetHeightRef.current)
        ) {
            closeSheet(sheetFadeTween, velocity);
        } else if (shouldReduceMotion) {
            sheetY.set(0);
        } else {
            animationRef.current = animate(sheetY, 0, {
                ...sheetSpring,
                velocity,
            });
        }

        window.setTimeout(() => {
            hasDraggedRef.current = false;
        }, 0);
    };

    const handleDragEnd = (
        _event: MouseEvent | TouchEvent | PointerEvent,
        info: PanInfo,
    ) => settleDrag(info.offset.y, info.velocity.y);
    const handleTouchDragStart = useEffectEvent(handleDragStart);
    const settleTouchDrag = useEffectEvent(settleDrag);
    const sheetStaggerCompletionIndex =
        activeIndex === null
            ? items.length - 1
            : activeIndex <= items.length - 1 - activeIndex
              ? items.length - 1
              : 0;

    useEffect(() => {
        const list = listRef.current;
        if (
            !isSheetMounted ||
            !list ||
            supportsDirectionalTouchAction
        ) {
            return;
        }

        let gesture:
            | {
                  startY: number;
                  startSheetY: number;
                  lastY: number;
                  lastTime: number;
                  offset: number;
                  velocity: number;
                  dragging: boolean;
              }
            | undefined;

        const handleTouchStart = (event: TouchEvent) => {
            if (event.touches.length !== 1 || list.scrollTop > 1) {
                gesture = undefined;
                return;
            }

            const touch = event.touches[0];
            gesture = {
                startY: touch.clientY,
                startSheetY: sheetY.get(),
                lastY: touch.clientY,
                lastTime: event.timeStamp,
                offset: 0,
                velocity: 0,
                dragging: false,
            };
        };

        const handleTouchMove = (event: TouchEvent) => {
            if (!gesture || event.touches.length !== 1) return;

            const touch = event.touches[0];
            const offset = touch.clientY - gesture.startY;
            if (!gesture.dragging) {
                if (Math.abs(offset) < 4) return;
                if (offset < 0) {
                    gesture = undefined;
                    return;
                }
                if (!event.cancelable) {
                    gesture = undefined;
                    return;
                }

                handleTouchDragStart();
                gesture.dragging = true;
            }

            event.preventDefault();
            const elapsed = Math.max(event.timeStamp - gesture.lastTime, 1);
            gesture.velocity =
                ((touch.clientY - gesture.lastY) / elapsed) * 1000;
            gesture.lastY = touch.clientY;
            gesture.lastTime = event.timeStamp;
            gesture.offset = offset;
            sheetY.set(Math.max(gesture.startSheetY + offset, 0));
        };

        const finishTouch = () => {
            if (gesture?.dragging) {
                settleTouchDrag(gesture.offset, gesture.velocity);
            }
            gesture = undefined;
        };

        list.addEventListener("touchstart", handleTouchStart, {
            passive: true,
        });
        list.addEventListener("touchmove", handleTouchMove, {
            passive: false,
        });
        list.addEventListener("touchend", finishTouch);
        list.addEventListener("touchcancel", finishTouch);

        return () => {
            list.removeEventListener("touchstart", handleTouchStart);
            list.removeEventListener("touchmove", handleTouchMove);
            list.removeEventListener("touchend", finishTouch);
            list.removeEventListener("touchcancel", finishTouch);
        };
    }, [
        isSheetMounted,
        sheetY,
        supportsDirectionalTouchAction,
    ]);

    if (!isRouteActive || items.length === 0) return null;

    return (
        <>
            <motion.button
                aria-controls={sheetId}
                aria-expanded={isOpen}
                aria-haspopup="dialog"
                aria-label={
                    activeIndex === null
                        ? "Open table of contents"
                        : `Open table of contents. Current section: ${currentTitle}`
                }
                className="fixed left-1/2 z-30 flex h-13 -translate-x-1/2 items-center gap-3 overflow-hidden rounded-full border border-divider bg-surface px-4 text-left text-foreground-strong shadow-sm"
                onClick={openSheet}
                ref={triggerRef}
                style={{
                    bottom: "calc(1rem + env(safe-area-inset-bottom))",
                    width: "min(calc(100% - 2rem), 20rem)",
                }}
                type="button"
                variants={
                    shouldReduceMotion ? reducedPageBlock : materializeBlock
                }
            >
                <span
                    aria-hidden="true"
                    className="size-2 shrink-0 rounded-full bg-foreground-strong"
                />
                <span className="relative min-w-0 flex-1 overflow-hidden text-[13px] font-medium leading-none">
                    <AnimatePresence initial={false} mode="popLayout">
                        <motion.span
                            animate={{ opacity: 1, y: 0 }}
                            className="block truncate"
                            exit={
                                shouldReduceMotion
                                    ? { opacity: 1 }
                                    : { opacity: 0, y: -8 }
                            }
                            initial={
                                shouldReduceMotion
                                    ? false
                                    : { opacity: 0, y: 8 }
                            }
                            key={activeId ?? "toc-neutral"}
                            transition={
                                shouldReduceMotion
                                    ? { duration: 0 }
                                    : snappySpring
                            }
                        >
                            {currentTitle}
                        </motion.span>
                    </AnimatePresence>
                </span>
                <svg
                    aria-hidden="true"
                    className="size-9 shrink-0 -rotate-90"
                    viewBox="0 0 36 36"
                >
                    <circle
                        cx="18"
                        cy="18"
                        fill="none"
                        r="15"
                        stroke="var(--divider)"
                        strokeWidth="2.5"
                    />
                    <motion.circle
                        cx="18"
                        cy="18"
                        fill="none"
                        r="15"
                        stroke="var(--accent)"
                        strokeLinecap="round"
                        strokeWidth="2.5"
                        style={{
                            pathLength: shouldReduceMotion
                                ? sectionProgress
                                : animatedSectionProgress,
                        }}
                    />
                </svg>
            </motion.button>

            {isSheetMounted &&
                createPortal(
                    <div
                        className="fixed inset-0 z-50"
                        ref={portalRef}
                        style={{ touchAction: "none" }}
                    >
                        <motion.div
                            aria-hidden="true"
                            className="absolute inset-0"
                            onClick={() => closeSheet()}
                            style={{
                                backgroundColor:
                                    "color-mix(in oklab, var(--code-surface) 68%, transparent)",
                                opacity: shouldReduceMotion
                                    ? sheetOpacity
                                    : backdropOpacity,
                            }}
                        />
                        <LayoutGroup id={`toc-sheet-layout-${slug}`}>
                            <motion.div
                                aria-labelledby={sheetTitleId}
                                aria-modal="true"
                                className="absolute inset-x-0 bottom-0 flex max-h-[min(72dvh,560px)] min-w-0 flex-col overflow-hidden rounded-t-2xl border-t border-divider bg-surface shadow-lg"
                                drag="y"
                                dragConstraints={{ top: 0 }}
                                dragControls={dragControls}
                                dragElastic={{ top: 0.05, bottom: 0.6 }}
                                dragListener={false}
                                dragMomentum={false}
                                id={sheetId}
                                onDragEnd={handleDragEnd}
                                onDragStart={handleDragStart}
                                onKeyDown={handleDialogKeyDown}
                                ref={panelRef}
                                role="dialog"
                                style={{
                                    opacity: shouldReduceMotion
                                        ? sheetOpacity
                                        : 1,
                                    y: sheetY,
                                }}
                            >
                                <button
                                    aria-label="Close table of contents"
                                    className="flex h-11 shrink-0 touch-none items-center justify-center"
                                    onClick={() => {
                                        if (!hasDraggedRef.current) closeSheet();
                                    }}
                                    onPointerDown={(event) =>
                                        dragControls.start(event)
                                    }
                                    type="button"
                                >
                                    <span
                                        aria-hidden="true"
                                        className="h-1 w-9 rounded-full bg-divider"
                                    />
                                </button>
                                <div
                                    className="flex shrink-0 touch-none items-baseline justify-between px-5 pb-2"
                                    onPointerDown={(event) =>
                                        dragControls.start(event)
                                    }
                                >
                                    <h2
                                        className="text-sm font-semibold text-foreground-strong"
                                        id={sheetTitleId}
                                    >
                                        Table of contents
                                    </h2>
                                    <span className="font-mono text-[11px] text-muted">
                                        {items.length} sections
                                    </span>
                                </div>
                                <ol
                                    className="toc-sheet-list min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
                                    onPointerDown={(event) => {
                                        if (
                                            isListAtTop &&
                                            (event.pointerType !== "touch" ||
                                                supportsDirectionalTouchAction)
                                        ) {
                                            dragControls.start(event);
                                        }
                                    }}
                                    onScroll={(event) =>
                                        setIsListAtTop(
                                            event.currentTarget.scrollTop <= 1,
                                        )
                                    }
                                    ref={listRef}
                                    style={{
                                        touchAction:
                                            isListAtTop &&
                                            supportsDirectionalTouchAction
                                                ? "pan-down"
                                                : "pan-y",
                                        WebkitOverflowScrolling: "touch",
                                    }}
                                >
                                    {items.map((item, index) => {
                                        const isActive = item.id === activeId;
                                        const delay =
                                            shouldReduceMotion ||
                                            activeIndex === null ||
                                            !isSheetRowStaggering
                                                ? 0
                                                : getTocItemDelay(
                                                      Math.abs(
                                                          index - activeIndex,
                                                      ),
                                                  );

                                        return (
                                            <TocSheetRow
                                                activeItemRef={activeItemRef}
                                                enterDelay={delay}
                                                href={`#${item.id}`}
                                                id={item.id}
                                                isActive={isActive}
                                                key={item.id}
                                                onNavigate={navigateFromSheet}
                                                onStaggerComplete={
                                                    isSheetRowStaggering &&
                                                    index ===
                                                        sheetStaggerCompletionIndex
                                                        ? () =>
                                                              setIsSheetRowStaggering(
                                                                  false,
                                                              )
                                                        : undefined
                                                }
                                                shouldReduceMotion={
                                                    shouldReduceMotion
                                                }
                                                title={item.title}
                                            />
                                        );
                                    })}
                                </ol>
                            </motion.div>
                        </LayoutGroup>
                    </div>,
                    document.body,
                )}
        </>
    );
}
