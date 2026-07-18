import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
    type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { TableOfContents } from "lucide-react";
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
    pageBlock,
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
    slug: string;
}>;

const focusableSelector =
    'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function TocSheet({ containerRef, items, slug }: TocSheetProps) {
    const { activeId, activeIndex, sectionProgress } = useScrollSpy(
        items,
        containerRef,
    );
    const shouldReduceMotion = useReducedMotion();
    const dragControls = useDragControls();
    const sheetY = useMotionValue(0);
    const sheetOpacity = useMotionValue(1);
    const animatedSectionProgress = useSpring(sectionProgress, snappySpring);
    const [sheetHeight, setSheetHeight] = useState(1);
    const [isOpen, setIsOpen] = useState(false);
    const [isSheetMounted, setIsSheetMounted] = useState(false);
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

    const returnFocus = useCallback(() => {
        window.requestAnimationFrame(() => {
            if (returnFocusRef.current?.isConnected) {
                returnFocusRef.current.focus({ preventScroll: true });
            }
        });
    }, []);

    const openSheet = useCallback(() => {
        returnFocusRef.current = triggerRef.current;
        isOpenRef.current = true;
        setIsOpen(true);
        animationSequenceRef.current += 1;
        animationRef.current?.stop();

        if (!isSheetMountedRef.current) {
            isSheetMountedRef.current = true;
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
    }, [sheetOpacity, sheetY, shouldReduceMotion]);

    const closeSheet = useCallback(
        (reducedTransition = sheetFadeTween, velocity = 0) => {
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
                returnFocus();
            });
        },
        [returnFocus, sheetOpacity, sheetY, shouldReduceMotion],
    );

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

    useEffect(() => {
        if (!isSheetMounted || !portalRef.current) return;

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
    }, [isSheetMounted]);

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

    const handleDragStart = useCallback(() => {
        hasDraggedRef.current = true;
        animationSequenceRef.current += 1;
        animationRef.current?.stop();
        isOpenRef.current = true;
        setIsOpen(true);
        sheetOpacity.set(1);
    }, [sheetOpacity]);

    const settleDrag = useCallback(
        (offset: number, velocity: number) => {
            if (
                shouldDismissSheet(
                    offset,
                    velocity,
                    sheetHeightRef.current,
                )
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
        },
        [closeSheet, sheetY, shouldReduceMotion],
    );

    const handleDragEnd = (
        _event: MouseEvent | TouchEvent | PointerEvent,
        info: PanInfo,
    ) => settleDrag(info.offset.y, info.velocity.y);

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

                handleDragStart();
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
                settleDrag(gesture.offset, gesture.velocity);
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
        handleDragStart,
        isSheetMounted,
        settleDrag,
        sheetY,
        supportsDirectionalTouchAction,
    ]);

    if (items.length === 0) return null;

    return (
        <>
            <motion.button
                aria-controls={sheetId}
                aria-expanded={isOpen}
                className="fixed left-1/2 z-30 flex min-h-11 -translate-x-1/2 items-center gap-2 overflow-hidden rounded-full border border-divider bg-surface px-4 text-left text-foreground-strong shadow-sm"
                onClick={openSheet}
                ref={triggerRef}
                style={{
                    bottom: "calc(1rem + env(safe-area-inset-bottom))",
                    width: "min(calc(100% - 2rem), 22rem)",
                }}
                type="button"
                variants={shouldReduceMotion ? reducedPageBlock : pageBlock}
            >
                <TableOfContents
                    aria-hidden="true"
                    className="size-3.5 shrink-0 text-muted"
                    strokeWidth={1.8}
                />
                <span className="relative min-w-0 flex-1 overflow-hidden text-[12px] leading-none">
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
                <span className="shrink-0 font-mono text-[10px] text-muted">
                    {items.length}
                </span>
                <motion.span
                    aria-hidden="true"
                    className="absolute inset-x-4 bottom-0 h-px origin-left bg-accent"
                    style={{
                        scaleX: shouldReduceMotion
                            ? sectionProgress
                            : animatedSectionProgress,
                    }}
                />
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
                                aria-label="Table of contents"
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
                                    className="flex h-10 shrink-0 touch-none items-center justify-center"
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
                                    <h2 className="text-sm font-bold text-foreground-strong">
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
                                            activeIndex === null
                                                ? 0
                                                : getTocItemDelay(
                                                      Math.abs(
                                                          index - activeIndex,
                                                      ),
                                                  );

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
                                                key={item.id}
                                                transition={
                                                    shouldReduceMotion
                                                        ? { duration: 0 }
                                                        : {
                                                              ...sheetRowTween,
                                                              delay,
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
                                                    aria-current={
                                                        isActive
                                                            ? "true"
                                                            : undefined
                                                    }
                                                    className={`block min-w-0 truncate rounded-md px-4 py-2.5 text-[13px] leading-snug hover:bg-accent-soft hover:text-foreground-strong ${
                                                        isActive
                                                            ? "text-accent"
                                                            : "text-muted"
                                                    }`}
                                                    href={`#${item.id}`}
                                                    onClick={() =>
                                                        closeSheet(
                                                            sheetNavigationFadeTween,
                                                        )
                                                    }
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
                        </LayoutGroup>
                    </div>,
                    document.body,
                )}
        </>
    );
}
