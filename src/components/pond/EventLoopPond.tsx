import { useEffect, useRef, useState } from "react";
import { PauseIcon, PlayIcon } from "@phosphor-icons/react";
import { useReducedMotion } from "motion/react";
import type { Pond } from "./pond-engine";

const description =
    "An animated pond acting out the JavaScript event loop. Fish are tasks: they wait in the task queue and swim into the call stack one at a time, and small microtask fish always go before the next task.";

const labels = [
    { text: "web APIs", className: "left-[14%] top-[45%]" },
    { text: "microtasks", className: "left-[45%] top-[calc(24%-1.5rem)]" },
    { text: "task queue", className: "left-[40%] top-[calc(77%+0.9rem)]" },
    { text: "call stack", className: "left-[80%] top-[calc(25%-1.5rem)]" },
] as const;

/**
 * A small generative pond above the home intro. The engine loads after the
 * page settles, runs only while visible in a foreground tab, and draws a
 * single still frame under reduced motion. Clicking adds a task.
 */
export function EventLoopPond() {
    const containerRef = useRef<HTMLDivElement>(null);
    const waterRef = useRef<HTMLCanvasElement>(null);
    const fishRef = useRef<HTMLCanvasElement>(null);
    const pondRef = useRef<Pond | null>(null);
    const isPausedRef = useRef(false);
    const isVisibleRef = useRef(false);
    const [isPaused, setIsPaused] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const shouldReduceMotion = useReducedMotion() ?? false;

    useEffect(() => {
        const container = containerRef.current;
        const waterCanvas = waterRef.current;
        const fishCanvas = fishRef.current;
        if (!container || !waterCanvas || !fishCanvas) return;

        let isCancelled = false;
        const syncActivity = () =>
            pondRef.current?.setActive(
                isVisibleRef.current && !document.hidden && !isPausedRef.current,
            );

        const visibility = new IntersectionObserver(([entry]) => {
            isVisibleRef.current = entry.isIntersecting;
            syncActivity();
        });
        visibility.observe(container);
        const sizing = new ResizeObserver(() => pondRef.current?.resize());
        sizing.observe(container);
        document.addEventListener("visibilitychange", syncActivity);

        // Start after the page's own entrance work, when the browser is idle.
        const schedule =
            window.requestIdleCallback ?? ((callback: () => void) => window.setTimeout(callback, 200));
        const cancelSchedule = window.cancelIdleCallback ?? window.clearTimeout;
        const handle = schedule(() => {
            void import("./pond-engine").then(({ createPond }) => {
                if (isCancelled) return;
                // Reduced motion starts paused on a still frame; Play opts in.
                if (shouldReduceMotion) {
                    isPausedRef.current = true;
                    setIsPaused(true);
                }
                pondRef.current = createPond({
                    container,
                    waterCanvas,
                    fishCanvas,
                    reducedMotion: shouldReduceMotion,
                    isDark: () => document.documentElement.dataset.theme === "dark",
                });
                pondRef.current.resize();
                syncActivity();
                setIsReady(true);
            });
        });

        return () => {
            isCancelled = true;
            cancelSchedule(handle);
            visibility.disconnect();
            sizing.disconnect();
            document.removeEventListener("visibilitychange", syncActivity);
            pondRef.current?.destroy();
            pondRef.current = null;
        };
    }, [shouldReduceMotion]);

    function togglePaused() {
        const next = !isPausedRef.current;
        isPausedRef.current = next;
        setIsPaused(next);
        pondRef.current?.setActive(isVisibleRef.current && !document.hidden && !next);
    }

    function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
        if (event.button !== 0) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        pondRef.current?.addTask(event.clientX - bounds.left, event.clientY - bounds.top);
    }

    return (
        <figure className="not-prose m-0">
            <div className="relative">
                <div
                    aria-label={description}
                    className="event-loop-pond relative aspect-[2/1] w-full cursor-crosshair overflow-hidden rounded-2xl sm:aspect-[11/4]"
                    data-ready={isReady ? "" : undefined}
                    onPointerDown={handlePointerDown}
                    ref={containerRef}
                    role="img"
                >
                    <canvas aria-hidden="true" className="event-loop-pond__layer" ref={waterRef} />
                    <canvas aria-hidden="true" className="event-loop-pond__layer" ref={fishRef} />
                    {labels.map((label) => (
                        <span
                            aria-hidden="true"
                            className={`event-loop-pond__label ${label.className}`}
                            key={label.text}
                        >
                            {label.text}
                        </span>
                    ))}
                </div>
                {/* Always rendered, so server and client markup match. */}
                <button
                    aria-label={isPaused ? "Play pond animation" : "Pause pond animation"}
                    aria-pressed={isPaused}
                    className="event-loop-pond__toggle"
                    onClick={togglePaused}
                    type="button"
                >
                    {isPaused ? (
                        <PlayIcon aria-hidden="true" size={12} weight="fill" />
                    ) : (
                        <PauseIcon aria-hidden="true" size={12} weight="fill" />
                    )}
                </button>
            </div>
            <figcaption className="mt-3 text-center text-[13px] text-muted">
                Fish are tasks. They wait in line and enter the call stack one
                at a time, and microtasks always cut in first. Click the pond
                to queue a timer.
            </figcaption>
        </figure>
    );
}
