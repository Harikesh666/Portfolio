import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";
import {
    eventLoopExample,
    eventLoopExampleSource,
    type JobKind,
    type SimState,
} from "../../lib/event-loop-sim";
import { eventLoopBeatMs } from "../../lib/motion";
import { activeLine, describeEvent } from "./captions";
import { EventLoopDiagram } from "./EventLoopDiagram";
import { useEventLoopPlayer, type PlayerSpeed } from "./use-event-loop-player";

/** Which callback a source line belongs to, so its lines tint while that exact callback runs. */
const lineOwner: Record<number, { label: string; kind: JobKind }> = {
    2: { label: "timerCallback", kind: "task" },
    3: { label: "timerCallback", kind: "task" },
    4: { label: "timerCallback", kind: "task" },
    6: { label: "promiseCallback", kind: "micro" },
    7: { label: "promiseCallback", kind: "micro" },
    8: { label: "promiseCallback", kind: "micro" },
};
/** Function names in the source, coloured like their pills. */
const namedSpans: readonly { name: string; kind: JobKind }[] = [
    { name: "timerCallback", kind: "task" },
    { name: "promiseCallback", kind: "micro" },
];

function SourceLine({ text }: Readonly<{ text: string }>) {
    const named = namedSpans.find((span) => text.includes(span.name));
    if (!named) return <>{text || " "}</>;
    const [before, after] = text.split(named.name);
    return (
        <>
            {before}
            <span className="el-code__name" data-kind={named.kind}>
                {named.name}
            </span>
            {after}
        </>
    );
}

const speeds: readonly PlayerSpeed[] = [0.5, 1, 2];
const timelineWindow = 20;

/**
 * Lanes for script, microtask and task over the last `timelineWindow` ticks,
 * filled by whichever kind of job held the stack, with a dashed line at each
 * switch, like a scheduler trace.
 */
function Timeline({ state }: Readonly<{ state: SimState }>) {
    const lanes: readonly { kind: JobKind; label: string; y: number }[] = [
        { kind: "script", label: "script", y: 12 },
        { kind: "micro", label: "micro", y: 28 },
        { kind: "task", label: "task", y: 44 },
    ];
    const start = Math.max(0, state.history.length - timelineWindow);
    const ticks = state.history.slice(start);
    const left = 44;
    const width = (300 - left - 4) / timelineWindow;
    const laneY = (kind: JobKind) => lanes.find((lane) => lane.kind === kind)?.y ?? 0;

    return (
        <svg aria-hidden="true" className="el-timeline" viewBox="0 0 300 56">
            {lanes.map((lane) => (
                <g key={lane.kind}>
                    <text className="el-timeline__label" x="0" y={lane.y + 3}>
                        {lane.label}
                    </text>
                    <line className="el-timeline__track" x1={left} x2={296} y1={lane.y} y2={lane.y} />
                </g>
            ))}
            {ticks.map((kind, index) => {
                if (!kind) return null;
                const previous = ticks[index - 1];
                const x = left + index * width;
                return (
                    <g key={start + index}>
                        <rect className="el-timeline__run" data-kind={kind} height="5" width={width - 1} x={x} y={laneY(kind) - 2.5} />
                        {previous && previous !== kind && (
                            <line className="el-timeline__switch" x1={x} x2={x} y1={laneY(previous)} y2={laneY(kind)} />
                        )}
                    </g>
                );
            })}
            <line className="el-timeline__head" x1={left + ticks.length * width} x2={left + ticks.length * width} y1="4" y2="52" />
        </svg>
    );
}

/**
 * The guide's interactive event-loop figure. It runs the guide's own
 * example through a small simulator, one visible event per beat: the line
 * being executed lights up in the code, the diagram moves the work, the
 * console prints, and a timeline records what held the stack. Readers can
 * play, pause, step, change speed, restart, and add a timer or a microtask
 * of their own. It waits for the reader to start it and pauses when it
 * scrolls out of view. Styling lives in `styles.css` (`.el-figure`).
 */
export function EventLoopFigure() {
    const shouldReduceMotion = useReducedMotion() ?? false;
    const { sim, isPlaying, hasStarted, speed, dispatch } = useEventLoopPlayer({
        program: eventLoopExample,
        beatMs: eventLoopBeatMs,
    });
    const figureRef = useRef<HTMLElement>(null);
    const line = activeLine(sim);
    const runningLabel = sim.stack.at(-1)?.label;
    const consoleRef = useRef<HTMLOListElement>(null);

    // Keep the newest console line in view as the log grows.
    useEffect(() => {
        const list = consoleRef.current;
        if (list) list.scrollTop = list.scrollHeight;
    }, [sim.log.length]);

    // Pause when the figure leaves the screen; the reader resumes it.
    useEffect(() => {
        const figure = figureRef.current;
        if (!figure) return;
        const observer = new IntersectionObserver(([entry]) => {
            if (!entry.isIntersecting) dispatch({ type: "pause" });
        });
        observer.observe(figure);
        return () => observer.disconnect();
    }, [dispatch]);

    return (
        <figure className="el-figure not-prose" ref={figureRef}>
            <div className="el-figure__stage">
                <EventLoopDiagram animate={!shouldReduceMotion} state={sim} />
                {!hasStarted && (
                    <button className="el-start" onClick={() => dispatch({ type: "play" })} type="button">
                        <span aria-hidden="true" className="el-start__icon">▶</span>
                        Run the example
                    </button>
                )}
            </div>

            <p aria-live={isPlaying ? "off" : "polite"} className="el-caption">
                {describeEvent(sim)}
            </p>

            <div className="el-figure__panels">
                <div className="el-code">
                    <div className="el-panel__bar">
                        <span>main.js</span>
                    </div>
                    <ol className="el-code__lines">
                        {eventLoopExampleSource.map((text, index) => (
                            <li
                                className="el-code__line"
                                data-active={line === index ? "" : undefined}
                                data-kind={lineOwner[index]?.kind ?? "script"}
                                data-owner-running={lineOwner[index]?.label === runningLabel ? "" : undefined}
                                // The source is a fixed listing, so the line number is its identity.
                                key={index}
                            >
                                <span className="el-code__number">{index + 1}</span>
                                <span className="el-code__text">
                                    <SourceLine text={text} />
                                </span>
                            </li>
                        ))}
                    </ol>
                </div>
                <div className="el-side">
                    <div className="el-console">
                        <div className="el-panel__bar">
                            <span>console</span>
                        </div>
                        <ol className="el-console__lines" ref={consoleRef}>
                            {sim.log.map((entry, index) => (
                                // The log only grows, so position is a stable key.
                                <li className="el-console__line" data-kind={entry.kind} key={index}>
                                    <span aria-hidden="true">›</span> {entry.text}
                                </li>
                            ))}
                        </ol>
                    </div>
                    <div className="el-trace">
                        <div className="el-panel__bar">
                            <span>what held the stack</span>
                        </div>
                        <Timeline state={sim} />
                    </div>
                </div>
            </div>

            <div className="el-controls">
                <div className="el-controls__group">
                    <button
                        className="el-button el-button--primary"
                        onClick={() => dispatch({ type: isPlaying ? "pause" : "play" })}
                        type="button"
                    >
                        {isPlaying ? "Pause" : "Play"}
                    </button>
                    <button className="el-button" onClick={() => dispatch({ type: "step" })} type="button">
                        Step
                    </button>
                    <button className="el-button" onClick={() => dispatch({ type: "restart" })} type="button">
                        Restart ↺
                    </button>
                </div>
                <div aria-label="Speed" className="el-controls__group el-segmented" role="group">
                    {speeds.map((value) => (
                        <button
                            aria-pressed={speed === value}
                            className="el-button"
                            key={value}
                            onClick={() => dispatch({ type: "speed", speed: value })}
                            type="button"
                        >
                            {value}×
                        </button>
                    ))}
                </div>
                <div className="el-controls__group">
                    <button className="el-button" data-kind="task" onClick={() => dispatch({ type: "add-timer" })} type="button">
                        + setTimeout
                    </button>
                    <button className="el-button" data-kind="micro" onClick={() => dispatch({ type: "add-microtask" })} type="button">
                        + microtask
                    </button>
                </div>
            </div>
            <figcaption className="el-figcaption">
                The example above, run one event at a time. Add a timer or a microtask while it runs to see where each one waits.
            </figcaption>
        </figure>
    );
}
