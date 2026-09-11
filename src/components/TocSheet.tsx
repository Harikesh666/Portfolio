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
    type PanInfo,
} from "motion/react";
import type { TocItem } from "../lib/content-headings";
import {
    sheetCloseSpring,
    sheetFadeTween,
    sheetNavigationFadeTween,
    sheetRowTween,
    sheetSpring,
    tocLabelCrossfadeTween,
    tocProgressSpring,
    tocSurfaceFadeTween,
    tocSurfaceSpring,
} from "../lib/motion";
import { getTocItemDelay, shouldDismissSheet } from "../lib/toc";
import { useScrollSpy } from "../lib/use-scroll-spy";

type TocSheetProps = Readonly<{
    containerRef: RefObject<HTMLElement | null>;
    items: TocItem[];
    onNavigate: (id: string) => void;
    slug: string;
}>;

type SurfaceSize = Readonly<{
    width: number;
    height: number;
}>;

const focusableSelector =
    'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

type TocSheetRowProps = Readonly<{
    activeIndicatorLayoutId: string;
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
    activeIndicatorLayoutId,
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
                          y: 4,
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
            <a
                aria-current={isActive ? "location" : undefined}
                className={`relative flex min-w-0 items-center gap-3 rounded-[14px] px-3 py-2 text-left text-sm font-medium leading-none [corner-shape:squircle] ${
                    isActive
                        ? "text-[var(--toc-major)]"
                        : "text-foreground/55 hover:text-foreground/80"
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
                {isActive && (
                    <motion.span
                        aria-hidden="true"
                        className="absolute inset-0 rounded-[14px] bg-foreground/10 [corner-shape:squircle]"
                        layoutId={activeIndicatorLayoutId}
                        transition={
                            shouldReduceMotion
                                ? { duration: 0 }
                                : tocSurfaceSpring
                        }
                    />
                )}
                <span
                    aria-hidden="true"
                    className={`relative size-1.5 shrink-0 rounded-full ${
                        isActive ? "bg-foreground" : "bg-foreground/30"
                    }`}
                />
                <span className="relative min-w-0 truncate whitespace-nowrap">
                    {title}
                </span>
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
    const animatedSectionProgress = useSpring(
        sectionProgress,
        tocProgressSpring,
    );
    const [isOpen, setIsOpen] = useState(false);
    const [isSheetRowStaggering, setIsSheetRowStaggering] = useState(false);
    const [isListAtTop, setIsListAtTop] = useState(true);
    const [collapsedSize, setCollapsedSize] = useState<SurfaceSize | null>(
        null,
    );
    const [openSize, setOpenSize] = useState<SurfaceSize | null>(null);
    const [labelWidth, setLabelWidth] = useState<number | null>(null);
    const supportsDirectionalTouchAction =
        typeof CSS !== "undefined" && CSS.supports("touch-action", "pan-down");
    const triggerRef = useRef<HTMLButtonElement>(null);
    const portalRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLOListElement>(null);
    const activeItemRef = useRef<HTMLAnchorElement>(null);
    const collapsedMeasureRef = useRef<HTMLDivElement>(null);
    const labelMeasureRef = useRef<HTMLSpanElement>(null);
    const openMeasureRef = useRef<HTMLDivElement>(null);
    const returnFocusRef = useRef<HTMLElement | null>(null);
    const sheetHeightRef = useRef(1);
    const isOpenRef = useRef(false);
    const animationSequenceRef = useRef(0);
    const animationRef = useRef<{ stop: () => void } | null>(null);
    const hasDraggedRef = useRef(false);
    const currentTitle =
        activeIndex === null
            ? "Table of contents"
            : (items[activeIndex]?.title ?? "Table of contents");
    const sheetId = `toc-sheet-${slug}`;
    const sheetTitleId = `${sheetId}-title`;
    const sheetContentId = `${sheetId}-content`;
    const activeIndicatorLayoutId = `${sheetId}-active`;
    const surfaceSize = isOpen ? openSize : collapsedSize;
    const surfaceRadius = isOpen
        ? 26
        : Math.max((collapsedSize?.height ?? 48) / 2, 16);
    useLayoutEffect(() => {
        if (isRouteActive) return;

        animationSequenceRef.current += 1;
        animationRef.current?.stop();
        dragControls.cancel();
        isOpenRef.current = false;
        sheetY.set(0);
        setIsOpen(false);
        setIsSheetRowStaggering(false);
    }, [dragControls, isRouteActive, sheetY]);

    useLayoutEffect(() => {
        const measure = () => {
            const collapsed = collapsedMeasureRef.current;
            const label = labelMeasureRef.current;
            const open = openMeasureRef.current;
            if (label) {
                const maxLabelWidth = collapsed
                    ? Math.max(collapsed.offsetWidth - 54, 1)
                    : label.offsetWidth;
                setLabelWidth(
                    Math.max(Math.min(label.scrollWidth, maxLabelWidth), 1),
                );
            }
            if (collapsed) {
                setCollapsedSize({
                    width: Math.max(collapsed.offsetWidth, 1),
                    height: Math.max(collapsed.offsetHeight, 1),
                });
            }
            if (open) {
                setOpenSize({
                    width: Math.max(open.offsetWidth, 1),
                    height: Math.max(open.offsetHeight, 1),
                });
            }
        };

        measure();
        const resizeObserver = new ResizeObserver(measure);
        if (collapsedMeasureRef.current) {
            resizeObserver.observe(collapsedMeasureRef.current);
        }
        if (labelMeasureRef.current) {
            resizeObserver.observe(labelMeasureRef.current);
        }
        if (openMeasureRef.current) {
            resizeObserver.observe(openMeasureRef.current);
        }

        return () => resizeObserver.disconnect();
    }, [currentTitle, items]);

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
        setIsSheetRowStaggering(!shouldReduceMotion);
        animationSequenceRef.current += 1;
        animationRef.current?.stop();
        sheetY.set(0);
    };

    const closeSheet = (
        reducedTransition = sheetFadeTween,
        velocity = 0,
        onClosed?: () => void,
    ) => {
        if (!isOpenRef.current) return;

        isOpenRef.current = false;
        setIsOpen(false);
        setIsSheetRowStaggering(false);
        const sequence = ++animationSequenceRef.current;
        animationRef.current?.stop();

        const animation = shouldReduceMotion
            ? animate(sheetY, 0, reducedTransition)
            : animate(sheetY, 0, {
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
            returnFocus();
            onClosed?.();
        });
    };

    const navigateFromSheet = (id: string) => {
        closeSheet(sheetNavigationFadeTween, 0, () => onNavigate(id));
    };

    useLayoutEffect(() => {
        if (!isOpen || !panelRef.current) return;

        const panel = panelRef.current;
        sheetHeightRef.current = Math.max(panel.offsetHeight, 1);
        const focusFrame = window.requestAnimationFrame(() => {
            const focusTarget =
                activeItemRef.current ??
                panel.querySelector<HTMLElement>(focusableSelector);
            activeItemRef.current?.scrollIntoView({ block: "center" });
            focusTarget?.focus({ preventScroll: true });
        });

        return () => window.cancelAnimationFrame(focusFrame);
    }, [isOpen]);

    useLayoutEffect(() => {
        if (!isRouteActive || !isOpen || !portalRef.current) return;

        const html = document.documentElement;
        const body = document.body;
        const supportsInert = "inert" in HTMLElement.prototype;
        const previousHtmlOverflow = html.style.overflow;
        const previousBodyOverflow = body.style.overflow;
        const siblings = Array.from(body.children).flatMap((element) => {
            if (
                !(element instanceof HTMLElement) ||
                element === portalRef.current
            ) {
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
    }, [isOpen, isRouteActive]);

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

        if (!isOpen || event.key !== "Tab" || !panelRef.current) return;

        const focusableElements = Array.from(
            panelRef.current.querySelectorAll<HTMLElement>(focusableSelector),
        ).filter(
            (element) =>
                !element.hasAttribute("disabled") &&
                !element.hasAttribute("aria-hidden"),
        );
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
    };

    const settleDrag = (offset: number, velocity: number) => {
        if (shouldDismissSheet(offset, velocity, sheetHeightRef.current)) {
            closeSheet(sheetFadeTween, velocity);
        } else if (shouldReduceMotion) {
            sheetY.set(0);
        } else {
            animationRef.current = animate(sheetY, 0, {
                ...sheetSpring,
                velocity,
            });
        }

        window.requestAnimationFrame(() => {
            hasDraggedRef.current = false;
        });
    };

    const handleDragEnd = (
        _event: MouseEvent | TouchEvent | PointerEvent,
        info: PanInfo,
    ) => settleDrag(info.offset.y, info.velocity.y);
    const handleTouchDragStart = useEffectEvent(handleDragStart);
    const settleTouchDrag = useEffectEvent(settleDrag);
    useEffect(() => {
        const list = listRef.current;
        if (!isOpen || !list || supportsDirectionalTouchAction) return;

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
                if (offset < 0 || !event.cancelable) {
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
    }, [isOpen, sheetY, supportsDirectionalTouchAction]);

    if (!isRouteActive || items.length === 0) return null;

    return createPortal(
        <div className="pointer-events-none fixed inset-0 z-50" ref={portalRef}>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        aria-hidden="true"
                        className="pointer-events-auto absolute inset-0"
                        exit={{ opacity: 0 }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        onClick={() => closeSheet()}
                        style={{ backgroundColor: "transparent" }}
                        transition={
                            shouldReduceMotion
                                ? { duration: 0 }
                                : tocSurfaceFadeTween
                        }
                    />
                )}
            </AnimatePresence>

            <div className="pointer-events-none fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-1/2 z-51 -translate-x-1/2">
                <div
                    aria-hidden="true"
                    className="pointer-events-none invisible absolute"
                >
                    <div
                        className="inline-flex max-w-[calc(100vw-2.5rem)] items-center gap-2.5 whitespace-nowrap py-1.5 pl-2 pr-4"
                        ref={collapsedMeasureRef}
                    >
                        <span className="size-5 shrink-0" />
                        <span
                            className="whitespace-nowrap text-sm font-medium leading-none"
                            ref={labelMeasureRef}
                        >
                            {currentTitle}
                        </span>
                    </div>
                    <div
                        className="w-max max-w-[calc(100vw-2rem)] max-h-[min(64dvh,520px)] overflow-hidden p-1.5"
                        ref={openMeasureRef}
                    >
                        <ol className="space-y-0.5">
                            {items.map((item) => (
                                <li
                                    className="flex items-center gap-3 whitespace-nowrap px-3 py-2 text-sm font-medium leading-none"
                                    key={item.id}
                                >
                                    <span className="size-1.5 shrink-0" />
                                    <span className="truncate">
                                        {item.title}
                                    </span>
                                </li>
                            ))}
                        </ol>
                    </div>
                </div>

                {surfaceSize && (
                    <LayoutGroup id={`toc-sheet-layout-${slug}`}>
                        <motion.button
                            aria-controls={isOpen ? sheetContentId : undefined}
                            aria-expanded={isOpen}
                            aria-haspopup="dialog"
                            aria-hidden={isOpen ? true : undefined}
                            aria-label={
                                activeIndex === null
                                    ? "Open table of contents"
                                    : `Open table of contents. Current section: ${currentTitle}`
                            }
                            className={`pointer-events-auto absolute bottom-0 left-1/2 z-10 h-11 -translate-x-1/2 rounded-[1.25rem] border border-transparent bg-transparent outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/50 ${
                                isOpen ? "pointer-events-none" : ""
                            }`}
                            initial={false}
                            animate={{ opacity: isOpen ? 0 : 1 }}
                            onClick={openSheet}
                            ref={triggerRef}
                            style={{ width: collapsedSize?.width }}
                            tabIndex={isOpen ? -1 : undefined}
                            type="button"
                            transition={
                                shouldReduceMotion
                                    ? { duration: 0 }
                                    : tocSurfaceFadeTween
                            }
                        />
                        <motion.div
                            aria-labelledby={isOpen ? sheetTitleId : undefined}
                            aria-modal={isOpen ? "true" : undefined}
                            className="pointer-events-auto relative min-w-0 overflow-hidden border border-[var(--toc-border)] bg-[var(--toc-surface)] shadow-lg [corner-shape:squircle]"
                            drag={isOpen ? "y" : false}
                            dragConstraints={{ top: 0 }}
                            dragControls={dragControls}
                            dragElastic={{ top: 0.05, bottom: 0.6 }}
                            dragListener={false}
                            dragMomentum={false}
                            id={sheetId}
                            initial={false}
                            animate={{
                                width: surfaceSize.width,
                                height: surfaceSize.height,
                                borderRadius: surfaceRadius,
                            }}
                            onDragEnd={handleDragEnd}
                            onDragStart={handleDragStart}
                            onKeyDown={handleDialogKeyDown}
                            ref={panelRef}
                            role={isOpen ? "dialog" : undefined}
                            style={{ y: sheetY }}
                            transition={
                                shouldReduceMotion
                                    ? { duration: 0 }
                                    : tocSurfaceSpring
                            }
                        >
                            <motion.div
                                aria-hidden="true"
                                className="pointer-events-none absolute inset-0 flex items-center gap-2.5 whitespace-nowrap py-1.5 pl-2 pr-4 text-left text-[var(--toc-major)]"
                                initial={false}
                                animate={{ opacity: isOpen ? 0 : 1 }}
                                transition={
                                    shouldReduceMotion
                                        ? { duration: 0 }
                                        : tocSurfaceFadeTween
                                }
                            >
                                <span className="shrink-0">
                                    <svg
                                        aria-hidden="true"
                                        className="size-5 -rotate-90"
                                        viewBox="0 0 24 24"
                                    >
                                        <circle
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            fill="none"
                                        opacity="0.15"
                                        stroke="var(--toc-major)"
                                            strokeWidth="2.5"
                                        />
                                        <motion.circle
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            fill="none"
                                            stroke="var(--toc-major)"
                                            strokeLinecap="round"
                                            strokeWidth="2.5"
                                            style={{
                                                pathLength: shouldReduceMotion
                                                    ? sectionProgress
                                                    : animatedSectionProgress,
                                            }}
                                        />
                                    </svg>
                                </span>
                                <span
                                    className="relative h-5 shrink-0 overflow-hidden text-sm font-medium leading-none"
                                    style={
                                        labelWidth === null
                                            ? undefined
                                            : { width: labelWidth }
                                    }
                                >
                                    <AnimatePresence
                                        initial={false}
                                        mode="popLayout"
                                    >
                                        <motion.span
                                            animate={{ opacity: 1 }}
                                            className="block truncate"
                                            exit={{ opacity: 0 }}
                                            initial={{ opacity: 0 }}
                                            key={activeId ?? "toc-neutral"}
                                            transition={
                                                shouldReduceMotion
                                                    ? { duration: 0 }
                                                    : tocLabelCrossfadeTween
                                            }
                                        >
                                            {currentTitle}
                                        </motion.span>
                                    </AnimatePresence>
                                </span>
                            </motion.div>

                            <AnimatePresence initial={false} mode="popLayout">
                                {isOpen && (
                                    <motion.div
                                        aria-labelledby={sheetTitleId}
                                        className="absolute inset-0 min-h-0 min-w-0"
                                        id={sheetContentId}
                                        key="toc-list"
                                        initial={
                                            shouldReduceMotion
                                                ? false
                                                : { opacity: 0 }
                                        }
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={
                                            shouldReduceMotion
                                                ? { duration: 0 }
                                                : tocSurfaceFadeTween
                                        }
                                    >
                                        <h2
                                            className="sr-only"
                                            id={sheetTitleId}
                                        >
                                            Table of contents
                                        </h2>
                                        <ol
                                            className="toc-sheet-list min-h-0 min-w-0 max-h-[min(64dvh,520px)] overflow-y-auto overscroll-contain p-1.5"
                                            onPointerDown={(event) => {
                                                if (
                                                    isListAtTop &&
                                                    (event.pointerType !==
                                                        "touch" ||
                                                        supportsDirectionalTouchAction)
                                                ) {
                                                    dragControls.start(event);
                                                }
                                            }}
                                            onScroll={(event) =>
                                                setIsListAtTop(
                                                    event.currentTarget
                                                        .scrollTop <= 1,
                                                )
                                            }
                                            ref={listRef}
                                            style={{
                                                height: "100%",
                                                touchAction:
                                                    isListAtTop &&
                                                    supportsDirectionalTouchAction
                                                        ? "pan-down"
                                                        : "pan-y",
                                                WebkitOverflowScrolling:
                                                    "touch",
                                            }}
                                        >
                                            {items.map((item, index) => {
                                                const isActive =
                                                    item.id === activeId;
                                                const delay =
                                                    shouldReduceMotion ||
                                                    !isSheetRowStaggering
                                                        ? 0
                                                        : getTocItemDelay(
                                                              index,
                                                          );

                                                return (
                                                    <TocSheetRow
                                                        activeIndicatorLayoutId={
                                                            activeIndicatorLayoutId
                                                        }
                                                        activeItemRef={
                                                            activeItemRef
                                                        }
                                                        enterDelay={delay}
                                                        href={`#${item.id}`}
                                                        id={item.id}
                                                        isActive={isActive}
                                                        key={item.id}
                                                        onNavigate={
                                                            navigateFromSheet
                                                        }
                                                        onStaggerComplete={
                                                            isSheetRowStaggering &&
                                                            index ===
                                                                items.length - 1
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
                                )}
                            </AnimatePresence>
                        </motion.div>
                    </LayoutGroup>
                )}
            </div>
        </div>,
        document.body,
    );
}
