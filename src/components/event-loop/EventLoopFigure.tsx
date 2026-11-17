import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useReducedMotion } from "motion/react";
import type { JobKind, SimState } from "../../lib/event-loop-sim";
import { eventLoopBeatMs } from "../../lib/motion";
import { BindingsPanel } from "./BindingsPanel";
import { activeLine, describeEvent } from "./captions";
import { EventLoopDiagram } from "./EventLoopDiagram";
import { figureExamples, isFigureExampleName, type FigureExample, type FigureExampleName } from "./examples";
import { useEventLoopPlayer, type PlayerSpeed } from "./use-event-loop-player";

function SourceLine({ text, names }: Readonly<{ text: string; names: FigureExample["names"] }>) {
    const named = names.find((span) => text.includes(span.name));
    if (!named) return <>{text || " "}</>;
    const index = text.indexOf(named.name);
    return (
        <>
            {text.slice(0, index)}
            <span className="el-code__name" data-kind={named.kind}>
                {named.name}
            </span>
            {text.slice(index + named.name.length)}
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
 * A guide's interactive event-loop figure. It runs one of the guide's own
 * examples (`figureExamples`) through a small simulator, one tick per beat:
 * the line being executed lights up in the code, the diagram carries the
 * work along its wires, the console prints with a timestamp, and a trace
 * records what held the stack. Readers can play, pause, step forward and
 * back (or use ← → and Space), change speed, restart, and add a timer or a
 * microtask of their own. It waits for the reader to start it and pauses
 * when it scrolls out of view. With `compare`, a toggle in the code bar
 * switches between two examples, like a `var` loop and a `let` loop.
 * Styling lives in `styles.css` (`.el-figure`).
 */
export function EventLoopFigure({ example: exampleName, compare }: Readonly<{ example?: unknown; compare?: unknown }>) {
    const first: FigureExampleName = isFigureExampleName(exampleName) ? exampleName : "tasks-and-microtasks";
    const pair: readonly FigureExampleName[] = isFigureExampleName(compare) ? [first, compare] : [];
    const [shown, setShown] = useState({ name: first, resume: false, fromToggle: false });
    return (
        <FigureBody
            // A switch starts the other example fresh; it plays at once if the reader had started.
            key={shown.name}
            name={shown.name}
            fromToggle={shown.fromToggle}
            onSwitch={(name, resume) => setShown({ name, resume, fromToggle: true })}
            pair={pair}
            resume={shown.resume}
        />
    );
}

function FigureBody({
    name,
    pair,
    resume,
    fromToggle,
    onSwitch,
}: Readonly<{
    name: FigureExampleName;
    pair: readonly FigureExampleName[];
    resume: boolean;
    fromToggle: boolean;
    onSwitch: (name: FigureExampleName, resume: boolean) => void;
}>) {
    const example: FigureExample = figureExamples[name];
    const shouldReduceMotion = useReducedMotion() ?? false;
    const { sim, isPlaying, hasStarted, speed, canGoBack, dispatch } = useEventLoopPlayer({
        program: example.program,
        options: example.simOptions,
        beatMs: eventLoopBeatMs,
        autoplay: resume,
    });
    const toggleRef = useRef<HTMLDivElement>(null);
    const figureRef = useRef<HTMLElement>(null);
    const consoleRef = useRef<HTMLOListElement>(null);
    const line = activeLine(sim);
    const runningLabel = sim.stack.at(-1)?.label;
    // Timer examples stamp simulated seconds; the others stamp the tick.
    const stamp = (tick: number, time: number) =>
        example.secondsPerTick ? `${time * example.secondsPerTick}s` : `t${String(tick).padStart(2, "0")}`;
    const captionOptions = { secondsPerTick: example.secondsPerTick };

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

    // After a switch, focus stays on the toggle the reader pressed.
    useEffect(() => {
        if (fromToggle) toggleRef.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')?.focus();
    }, [fromToggle]);

    // Keep the newest console line in view as the log grows.
    useEffect(() => {
        const list = consoleRef.current;
        if (list) list.scrollTop = list.scrollHeight;
    }, [sim.log.length]);

    function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
        if (event.key === "ArrowRight") dispatch({ type: "step" });
        else if (event.key === "ArrowLeft") dispatch({ type: "back" });
        else if (event.key === " " && !(event.target instanceof HTMLButtonElement)) dispatch({ type: "toggle" });
        else return;
        event.preventDefault();
    }

    return (
        <figure className="el-figure not-prose" onKeyDown={handleKeyDown} ref={figureRef}>
            <div className="el-figure__stage" data-idle={hasStarted ? undefined : ""}>
                <EventLoopDiagram
                    animate={!shouldReduceMotion}
                    readout={example.secondsPerTick ? `T = ${stamp(sim.tick, sim.time)}` : undefined}
                    state={sim}
                />
                {!hasStarted && (
                    <button className="el-start" onClick={() => dispatch({ type: "play" })} type="button">
                        <span aria-hidden="true" className="el-start__icon">▶</span>
                        {example.startLabel}
                    </button>
                )}
            </div>

            <p aria-live={isPlaying ? "off" : "polite"} className="el-caption">
                {describeEvent(sim, captionOptions)}
            </p>

            <div className="el-figure__panels">
                <div className="el-code">
                    <div className="el-panel__bar">
                        <span>{example.fileName}</span>
                        {pair.length > 0 && (
                            <div aria-label="Declare the loop variable with" className="el-toggle" ref={toggleRef} role="group">
                                {pair.map((option) => (
                                    <button
                                        aria-pressed={option === name}
                                        className="el-toggle__option"
                                        key={option}
                                        onClick={() => {
                                            if (option !== name) onSwitch(option, hasStarted);
                                        }}
                                        type="button"
                                    >
                                        {(figureExamples[option] as FigureExample).toggleLabel ?? option}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <ol className="el-code__lines">
                        {example.source.map((text, index) => {
                            const owner = example.lineOwners[index];
                            return (
                                <li
                                    className="el-code__line"
                                    data-active={line === index ? "" : undefined}
                                    data-kind={owner?.kind ?? "script"}
                                    data-owner-running={owner && runningLabel?.startsWith(owner.label) ? "" : undefined}
                                    // The source is a fixed listing, so the line number is its identity.
                                    key={index}
                                >
                                    <span className="el-code__number">{index + 1}</span>
                                    <span className="el-code__text">
                                        <SourceLine names={example.names} text={text} />
                                    </span>
                                </li>
                            );
                        })}
                    </ol>
                </div>
                <div className="el-side">
                    <div className="el-console">
                        <div className="el-panel__bar">
                            <span>console</span>
                        </div>
                        <ol className="el-console__lines" ref={consoleRef}>
                            {sim.log.map((entry, index) => (
                                // The log only grows (Back rewinds the whole list), so position is a stable key.
                                <li className="el-console__line" data-kind={entry.kind} key={index}>
                                    <span className="el-console__stamp">{stamp(entry.tick, entry.time)}</span>
                                    {entry.text}
                                </li>
                            ))}
                        </ol>
                    </div>
                    {example.panel === "bindings" ? (
                        <div className="el-trace">
                            <div className="el-panel__bar">
                                <span>bindings</span>
                            </div>
                            <BindingsPanel state={sim} />
                        </div>
                    ) : (
                        <div className="el-trace">
                            <div className="el-panel__bar">
                                <span>what held the stack</span>
                            </div>
                            <Timeline state={sim} />
                        </div>
                    )}
                </div>
            </div>

            <div className="el-controls">
                <div className="el-controls__group">
                    <button
                        aria-keyshortcuts="Space"
                        className="el-button el-button--primary"
                        onClick={() => dispatch({ type: "toggle" })}
                        type="button"
                    >
                        {isPlaying ? "Pause" : "Play"}
                    </button>
                    <button
                        aria-keyshortcuts="ArrowLeft"
                        aria-label="Step back"
                        className="el-button"
                        disabled={!canGoBack}
                        onClick={() => dispatch({ type: "back" })}
                        type="button"
                    >
                        ‹ Back
                    </button>
                    <button
                        aria-keyshortcuts="ArrowRight"
                        aria-label="Step forward"
                        className="el-button"
                        onClick={() => dispatch({ type: "step" })}
                        type="button"
                    >
                        Step ›
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
                {example.injectable !== false && (
                    <div className="el-controls__group">
                        <button className="el-button" data-kind="task" onClick={() => dispatch({ type: "add-timer" })} type="button">
                            + setTimeout
                        </button>
                        <button
                            className="el-button"
                            data-kind="micro"
                            onClick={() => dispatch({ type: "add-microtask" })}
                            type="button"
                        >
                            + microtask
                        </button>
                    </div>
                )}
                <p aria-hidden="true" className="el-keys">
                    <kbd>←</kbd>
                    <kbd>→</kbd> step · <kbd>space</kbd> play
                </p>
            </div>
            <figcaption className="el-figcaption">{example.figcaption}</figcaption>
        </figure>
    );
}
