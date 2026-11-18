import { useEffect, useRef, useState, type ReactNode } from "react";
import { PauseIcon, PlayIcon } from "@phosphor-icons/react";
import { useReducedMotion } from "motion/react";
import type { BirdArrival } from "./bird-scene";
import type { Pond as PondEngine, PondMode } from "./pond-engine";
import { readHourOverride } from "./pond-hour";

export type PondLabel = Readonly<{ text: string; className: string }>;

/**
 * The pond modes, plus "kund" (Makari Kund from a photo, set on a 3D model
 * of the tank) and "bird" (a bulbul on a branch against the sky).
 */
export type SceneMode = PondMode | "kund" | "bird";

/** A photo shown at once and kept as the fallback; the scene draws over it when ready. */
export type PondStill = Readonly<{ src: string; srcSet: string; sizes: string; mask: string }>;

type PondProps = Readonly<{
    mode: SceneMode;
    still?: PondStill;
    /** Spoken description of the scene for assistive technology. */
    description: string;
    caption: ReactNode;
    labels?: ReadonlyArray<PondLabel>;
    /** The bird scene only: "fly-in" starts on an empty branch and the bird flies in to land. */
    birdArrival?: BirdArrival;
}>;

/**
 * The shared pond shell: reserves its space, loads the engine after the
 * page settles, runs it only while visible in a foreground tab, and offers
 * Pause/Play. Under reduced motion it starts paused on a still frame.
 */
export function Pond({ birdArrival, caption, description, labels = [], mode, still }: PondProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const stillRef = useRef<HTMLImageElement>(null);
    const waterRef = useRef<HTMLCanvasElement>(null);
    const fishRef = useRef<HTMLCanvasElement>(null);
    const pondRef = useRef<PondEngine | null>(null);
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
        const isDark = () => document.documentElement.dataset.theme === "dark";
        const create = async (): Promise<PondEngine | null> => {
            if (mode === "kund") {
                const photo = stillRef.current;
                if (!photo || !still) return null;
                const { createKundScene } = await import("./kund-scene");
                return createKundScene({
                    hourOverride: readHourOverride(),
                    container,
                    canvas: waterCanvas,
                    photo,
                    maskUrl: still.mask,
                    reducedMotion: shouldReduceMotion,
                    isDark,
                });
            }
            if (mode === "bird") {
                const { createBirdScene } = await import("./bird-scene");
                return createBirdScene({
                    hourOverride: readHourOverride(),
                    container,
                    canvas: waterCanvas,
                    reducedMotion: shouldReduceMotion,
                    isDark,
                    arrival: birdArrival,
                });
            }
            const { createPond } = await import("./pond-engine");
            return createPond({
                mode,
                hourOverride: readHourOverride(),
                container,
                waterCanvas,
                fishCanvas,
                reducedMotion: shouldReduceMotion,
                isDark,
            });
        };
        const handle = schedule(() => {
            void create().then((pond) => {
                // Without WebGL the still photo, or the CSS water, simply stays.
                if (!pond) return;
                if (isCancelled) {
                    pond.destroy();
                    return;
                }
                // Reduced motion starts paused on a still frame; Play opts in.
                if (shouldReduceMotion) {
                    isPausedRef.current = true;
                    setIsPaused(true);
                }
                pondRef.current = pond;
                pond.resize();
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
    }, [birdArrival, mode, shouldReduceMotion, still]);

    function togglePaused() {
        const next = !isPausedRef.current;
        isPausedRef.current = next;
        setIsPaused(next);
        pondRef.current?.setActive(isVisibleRef.current && !document.hidden && !next);
    }

    function pointFrom(event: React.PointerEvent<HTMLDivElement>) {
        const bounds = event.currentTarget.getBoundingClientRect();
        return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
    }

    function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
        if (event.button !== 0) return;
        const point = pointFrom(event);
        pondRef.current?.poke(point.x, point.y);
    }

    function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
        // Hover attraction is for mice and pens; a finger feeds by tapping.
        if (event.pointerType === "touch") return;
        pondRef.current?.setPointer(pointFrom(event));
    }

    return (
        <figure className="not-prose m-0">
            <div className="pond-frame relative">
                <div
                    aria-label={description}
                    className={`event-loop-pond relative aspect-[2/1] w-full overflow-hidden sm:rounded-2xl ${mode === "kund" || mode === "bird" ? "" : "sm:aspect-[11/4]"}`}
                    data-mode={mode}
                    data-ready={isReady ? "" : undefined}
                    onPointerDown={handlePointerDown}
                    onPointerLeave={() => pondRef.current?.setPointer(null)}
                    onPointerMove={handlePointerMove}
                    ref={containerRef}
                    role="img"
                >
                    {still ? (
                        <img
                            alt=""
                            className="event-loop-pond__still"
                            decoding="async"
                            fetchPriority="high"
                            ref={stillRef}
                            sizes={still.sizes}
                            src={still.src}
                            srcSet={still.srcSet}
                        />
                    ) : null}
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
            <figcaption className="mt-3 text-center text-[13px] text-muted">{caption}</figcaption>
        </figure>
    );
}
