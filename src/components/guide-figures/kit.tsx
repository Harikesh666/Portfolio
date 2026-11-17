import { useEffect, useReducer, useRef, type KeyboardEvent, type ReactNode } from "react";
import { useReducedMotion } from "motion/react";
import { guideFigureBeatMs, guideFigurePulseMs } from "../../lib/motion";

/** One colour per role, shared with the event-loop figures: Strong, terracotta, blue. */
export type Tone = "strong" | "accent" | "task";

/** Plain caption text; `backticked` words are set in mono. */
export function Note({ children }: Readonly<{ children: string }>) {
    return (
        <>
            {children.split(/`([^`]+)`/).map((part, index) =>
                index % 2 === 1 ? (
                    // The caption is fixed text, so a part's position is its identity.
                    <code className="gf-code" key={index}>
                        {part}
                    </code>
                ) : (
                    part
                ),
            )}
        </>
    );
}

type StepperState = Readonly<{ index: number; isPlaying: boolean }>;
type StepperAction = "play" | "pause" | "toggle" | "step" | "back" | "restart" | "tick";

function stepperReducer(count: number) {
    return (state: StepperState, action: StepperAction): StepperState => {
        const last = count - 1;
        switch (action) {
            case "tick":
                return state.index >= last ? { ...state, isPlaying: false } : { ...state, index: state.index + 1 };
            case "play":
                // Playing from the end starts over.
                return { index: state.index >= last ? 0 : Math.max(0, state.index), isPlaying: true };
            case "pause":
                return { ...state, isPlaying: false };
            case "toggle":
                return stepperReducer(count)(state, state.isPlaying ? "pause" : "play");
            case "step":
                return { isPlaying: false, index: Math.min(last, state.index + 1) };
            case "back":
                return { isPlaying: false, index: Math.max(-1, state.index - 1) };
            case "restart":
                return { isPlaying: false, index: -1 };
        }
    };
}

/**
 * Walks a figure through its steps. Index -1 is the overview: the whole
 * diagram at rest, as the guide's text describes it.
 */
export function useStepper(count: number) {
    const [state, dispatch] = useReducer(stepperReducer(count), { index: -1, isPlaying: false });
    useEffect(() => {
        if (!state.isPlaying) return;
        const timer = setTimeout(() => dispatch("tick"), state.index < 0 ? 0 : guideFigureBeatMs);
        return () => clearTimeout(timer);
    }, [state.isPlaying, state.index]);
    return { ...state, count, dispatch };
}

export type Stepper = ReturnType<typeof useStepper>;

/**
 * The frame every guide figure shares with the event-loop figures: a stage
 * on a dot grid, a caption for the current step, optional panels, then
 * monospace controls and a figcaption. ← → step and Space plays. It pauses
 * when scrolled out of view. `description` is the diagram as text for
 * screen readers, since the drawing itself is hidden from them.
 */
export function FigureFrame({
    stage,
    caption,
    stepper,
    figcaption,
    description,
    panels,
    tools,
}: Readonly<{
    stage: ReactNode;
    caption: ReactNode;
    stepper: Stepper;
    figcaption: string;
    description: readonly string[];
    panels?: ReactNode;
    tools?: ReactNode;
}>) {
    const figureRef = useRef<HTMLElement>(null);
    const { dispatch, index, count, isPlaying } = stepper;

    useEffect(() => {
        const figure = figureRef.current;
        if (!figure) return;
        const observer = new IntersectionObserver(([entry]) => {
            if (!entry.isIntersecting) dispatch("pause");
        });
        observer.observe(figure);
        return () => observer.disconnect();
    }, [dispatch]);

    function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
        if (event.key === "ArrowRight") dispatch("step");
        else if (event.key === "ArrowLeft") dispatch("back");
        else if (event.key === " " && !(event.target instanceof HTMLButtonElement)) dispatch("toggle");
        else return;
        event.preventDefault();
    }

    return (
        <figure className="el-figure gf-figure not-prose" onKeyDown={handleKeyDown} ref={figureRef}>
            <div className="gf-stage">{stage}</div>
            <p aria-live={isPlaying ? "off" : "polite"} className="el-caption">
                {caption}
            </p>
            {panels}
            <div className="el-controls">
                <div className="el-controls__group">
                    <button
                        aria-keyshortcuts="Space"
                        className="el-button el-button--primary"
                        onClick={() => dispatch("toggle")}
                        type="button"
                    >
                        {isPlaying ? "Pause" : index >= count - 1 ? "Replay" : "Play"}
                    </button>
                    <button
                        aria-keyshortcuts="ArrowLeft"
                        aria-label="Step back"
                        className="el-button"
                        disabled={index < 0}
                        onClick={() => dispatch("back")}
                        type="button"
                    >
                        ‹ Back
                    </button>
                    <button
                        aria-keyshortcuts="ArrowRight"
                        aria-label="Step forward"
                        className="el-button"
                        disabled={index >= count - 1}
                        onClick={() => dispatch("step")}
                        type="button"
                    >
                        Step ›
                    </button>
                    <button className="el-button" disabled={index < 0} onClick={() => dispatch("restart")} type="button">
                        Overview
                    </button>
                </div>
                {tools}
                <p className="gf-count">
                    {index < 0 ? "overview" : `${index + 1} / ${count}`}
                </p>
            </div>
            <figcaption className="el-figcaption">{figcaption}</figcaption>
            <ul className="sr-only">
                {description.map((line) => (
                    <li key={line}>{line}</li>
                ))}
            </ul>
        </figure>
    );
}

export type FlowNode = Readonly<{
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
    label: string;
    sub?: readonly string[];
    tone?: Tone;
    /**
     * "ghost": an outcome, drawn dashed, like "reclaimed". "group": a container
     * whose label sits in a header strip. "readout": a small live panel.
     */
    variant?: "box" | "ghost" | "group" | "readout";
}>;

export type FlowWire = Readonly<{
    id: string;
    d: string;
    tone?: Tone;
    label?: Readonly<{ text: string; x: number; y: number; anchor?: "start" | "middle" | "end" }>;
}>;

/** Which nodes and wires a step lights. Null is the overview: everything at rest, nothing dimmed. */
export type Lit = Readonly<{ nodes: readonly string[]; wires: readonly string[]; tone?: Tone }> | null;

/**
 * A diagram of boxes and wires on the figure's dot grid. In the overview
 * every part sits at rest. A step lights some parts in its tone and dims
 * the rest; lit wires flow and carry a pulse (none under reduced motion).
 */
export function Flow({
    width,
    height,
    nodes,
    wires,
    lit,
    children,
}: Readonly<{
    width: number;
    height: number;
    nodes: readonly FlowNode[];
    wires: readonly FlowWire[];
    lit: Lit;
    children?: ReactNode;
}>) {
    const animate = !(useReducedMotion() ?? false);
    const state = (on: boolean) => (lit === null ? undefined : on ? "on" : "off");
    return (
        <svg aria-hidden="true" className="gf-flow" data-tone={lit?.tone ?? "strong"} viewBox={`0 0 ${width} ${height}`}>
            <defs>
                <marker id="gf-arrow" markerHeight="6" markerWidth="6" orient="auto-start-reverse" refX="5" refY="3" viewBox="0 0 6 6">
                    <path className="gf-arrow" d="M0.5 0.8 5 3 0.5 5.2" />
                </marker>
            </defs>
            {wires.map((wire) => {
                const on = lit?.wires.includes(wire.id) ?? false;
                return (
                    <g className="gf-wire" data-state={state(on)} data-tone={wire.tone} key={wire.id}>
                        <path d={wire.d} markerEnd="url(#gf-arrow)" />
                        {wire.label && (
                            <text className="gf-wire__label" textAnchor={wire.label.anchor ?? "middle"} x={wire.label.x} y={wire.label.y}>
                                {wire.label.text}
                            </text>
                        )}
                        {on && animate && (
                            <circle className="gf-pulse" r="2.2">
                                <animateMotion dur={`${guideFigurePulseMs}ms`} path={wire.d} repeatCount="indefinite" />
                            </circle>
                        )}
                    </g>
                );
            })}
            {nodes.map((node) =>
                node.variant === "group" ? (
                    <g className="gf-group" data-state={state(lit?.nodes.includes(node.id) ?? false)} key={node.id}>
                        <rect height={node.h} rx="5" width={node.w} x={node.x} y={node.y} />
                        <line x1={node.x} x2={node.x + node.w} y1={node.y + 14.5} y2={node.y + 14.5} />
                        <text className="gf-group__label" x={node.x + 7} y={node.y + 10}>
                            {node.label}
                        </text>
                    </g>
                ) : (
                <g
                    className="gf-node"
                    data-state={state(lit?.nodes.includes(node.id) ?? false)}
                    data-tone={node.tone}
                    data-variant={node.variant}
                    key={node.id}
                >
                    <rect height={node.h} rx="5" width={node.w} x={node.x} y={node.y} />
                    <text
                        className="gf-node__label"
                        textAnchor="middle"
                        x={node.x + node.w / 2}
                        y={node.y + node.h / 2 + 3.4 - ((node.sub?.length ?? 0) * 9) / 2}
                    >
                        {node.label}
                    </text>
                    {node.sub?.map((line, index) => (
                        <text
                            className="gf-node__sub"
                            key={line}
                            textAnchor="middle"
                            x={node.x + node.w / 2}
                            y={node.y + node.h / 2 + 3.4 - ((node.sub?.length ?? 0) * 9) / 2 + 10 * (index + 1)}
                        >
                            {line}
                        </text>
                    ))}
                </g>
                ),
            )}
            {children}
        </svg>
    );
}

/** A flow figure stepped through a fixed list of captions and lit parts. */
export type FlowStep = Readonly<{
    caption: string;
    lit: NonNullable<Lit>;
    /** Per-step changes to nodes, such as a readout's lines. */
    patch?: Readonly<Record<string, Partial<FlowNode>>>;
}>;

/** The nodes as a step shows them. */
export function patched(nodes: readonly FlowNode[], step: FlowStep | null): readonly FlowNode[] {
    const patch = step?.patch;
    return patch ? nodes.map((node) => (patch[node.id] ? { ...node, ...patch[node.id] } : node)) : nodes;
}

export function FlowFigure({
    width,
    height,
    nodes,
    wires,
    steps,
    overview,
    figcaption,
    description,
}: Readonly<{
    width: number;
    height: number;
    nodes: readonly FlowNode[];
    wires: readonly FlowWire[];
    steps: readonly FlowStep[];
    overview: string;
    figcaption: string;
    description: readonly string[];
}>) {
    const stepper = useStepper(steps.length);
    const step = stepper.index >= 0 ? steps[stepper.index] : null;
    return (
        <FigureFrame
            caption={<Note>{step?.caption ?? overview}</Note>}
            description={description}
            figcaption={figcaption}
            stage={<Flow height={height} lit={step?.lit ?? null} nodes={patched(nodes, step)} width={width} wires={wires} />}
            stepper={stepper}
        />
    );
}
