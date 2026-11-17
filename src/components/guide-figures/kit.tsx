import { createContext, useCallback, useContext, useEffect, useId, useReducer, useRef, type KeyboardEvent, type ReactNode } from "react";
import { useReducedMotion } from "motion/react";
import { guideFigureBeatMs, guideFigurePreviewBeatMs, guideFigurePulseMs } from "../../lib/motion";
import { useFigureVisibility } from "../../lib/use-figure-visibility";

/**
 * Set by a guide's hover card. Inside it, a figure shows only its drawing
 * and caption, and plays on a loop while `playing` (the card is open and
 * motion is allowed); otherwise it holds the overview.
 */
export const FigurePreview = createContext<Readonly<{ playing: boolean }> | null>(null);

/**
 * Whether a figure's lit wires may move: only while it plays and is on
 * screen. Stepped by hand or scrolled away, a figure holds still.
 */
const FigureMotion = createContext(false);

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
type StepperAction = "play" | "pause" | "toggle" | "step" | "back" | "restart" | "tick" | "advance";

function stepperReducer(count: number, loop = false) {
    return (state: StepperState, action: StepperAction): StepperState => {
        const last = count - 1;
        switch (action) {
            case "tick":
                if (state.index >= last) return loop ? { ...state, index: 0 } : { ...state, isPlaying: false };
                return { ...state, index: state.index + 1 };
            case "play":
                // Playing from the end starts over.
                return { index: state.index >= last ? 0 : Math.max(0, state.index), isPlaying: true };
            case "pause":
                return { ...state, isPlaying: false };
            case "toggle":
                return stepperReducer(count)(state, state.isPlaying ? "pause" : "play");
            case "advance":
                // A tap on the drawing: next step, or back to the start after the last one.
                return state.index >= last ? { isPlaying: false, index: -1 } : { isPlaying: false, index: state.index + 1 };
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
    const preview = useContext(FigurePreview);
    const [state, dispatch] = useReducer(
        stepperReducer(count, preview !== null),
        preview?.playing ? { index: 0, isPlaying: true } : { index: -1, isPlaying: false },
    );
    const beat = preview ? guideFigurePreviewBeatMs : guideFigureBeatMs;
    useEffect(() => {
        if (!state.isPlaying) return;
        const timer = setTimeout(() => dispatch("tick"), state.index < 0 ? 0 : beat);
        return () => clearTimeout(timer);
    }, [state.isPlaying, state.index, beat]);
    return { ...state, count, dispatch };
}

export type Stepper = ReturnType<typeof useStepper>;

/**
 * The frame every guide figure shares with the event-loop figures: a stage
 * on a dot grid, a caption for the current step, optional panels, then
 * monospace controls and a figcaption. ← → step and Space plays. It pauses
 * when scrolled out of view. `description` is the diagram as text for
 * screen readers, since the drawing itself is hidden from them. Without a
 * stepper it is a still: a snapshot that a guide's own steps narrate.
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
    stepper?: Stepper;
    figcaption: string;
    description: readonly string[];
    panels?: ReactNode;
    tools?: ReactNode;
}>) {
    const figureRef = useRef<HTMLElement>(null);
    const preview = useContext(FigurePreview);
    const dispatch = stepper?.dispatch;

    const pause = useCallback(() => dispatch?.("pause"), [dispatch]);
    const isOnScreen = useFigureVisibility(figureRef, pause);

    if (preview) {
        return (
            <FigureMotion.Provider value={preview.playing}>
                <div className="el-card gf-card" data-motion={preview.playing ? "on" : undefined}>
                    <div className="gf-stage">{stage}</div>
                    <p className="el-card__caption">{caption}</p>
                </div>
            </FigureMotion.Provider>
        );
    }

    const isMoving = Boolean(stepper?.isPlaying) && isOnScreen;

    function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
        if (!dispatch) return;
        if (event.key === "ArrowRight") dispatch("step");
        else if (event.key === "ArrowLeft") dispatch("back");
        else if (event.key === " " && !(event.target instanceof HTMLButtonElement)) dispatch("toggle");
        else return;
        event.preventDefault();
    }

    return (
        <figure
            className="el-figure gf-figure not-prose"
            data-motion={isMoving ? "on" : undefined}
            data-offscreen={isOnScreen ? undefined : ""}
            onKeyDown={handleKeyDown}
            ref={figureRef}
        >
            <div
                className="gf-stage"
                data-tappable={dispatch ? "" : undefined}
                // On touch screens a tap on the drawing steps through it; mice keep the buttons.
                onPointerUp={(event) => {
                    if (event.pointerType === "touch" && dispatch) dispatch("advance");
                }}
            >
                <FigureMotion.Provider value={isMoving}>{stage}</FigureMotion.Provider>
            </div>
            <p aria-live={stepper?.isPlaying ? "off" : "polite"} className="el-caption">
                {caption}
            </p>
            {panels}
            {stepper && <Controls stepper={stepper} tools={tools} />}
            <figcaption className="el-figcaption">
                <Note>{figcaption}</Note>
            </figcaption>
            <ul className="sr-only">
                {description.map((line) => (
                    <li key={line}>{line}</li>
                ))}
            </ul>
        </figure>
    );
}

function Controls({ stepper, tools }: Readonly<{ stepper: Stepper; tools?: ReactNode }>) {
    const { dispatch, index, count, isPlaying } = stepper;
    return (
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
    /** Arrowheads at both ends, for a two-way link. */
    both?: boolean;
    label?: Readonly<{ text: string; x: number; y: number; anchor?: "start" | "middle" | "end" }>;
}>;

/** Distance between a node's title baseline and each subtitle baseline. */
const lineGap = 11.5;

/** The title baseline that centres the title and its subtitle lines as one block. */
function labelBaseline(node: FlowNode) {
    return node.y + node.h / 2 + 3.2 - ((node.sub?.length ?? 0) * lineGap) / 2;
}

/** Which nodes and wires a step lights. Null is the overview: everything at rest, nothing dimmed. */
export type Lit = Readonly<{ nodes: readonly string[]; wires: readonly string[]; tone?: Tone }> | null;

/** Where a wire starts and ends, walking its absolute M, L, H, V, Q and C commands. */
function wireEnds(d: string) {
    let x = 0;
    let y = 0;
    let start = { x: 0, y: 0 };
    for (const [, command, args] of d.matchAll(/([MLHVQC])([^MLHVQC]*)/g)) {
        const values = args.trim().split(/[\s,]+/).filter(Boolean).map(Number);
        if (command === "H") x = values[values.length - 1];
        else if (command === "V") y = values[values.length - 1];
        else {
            x = values[values.length - 2];
            y = values[values.length - 1];
        }
        if (command === "M") start = { x, y };
    }
    return { start, end: { x, y } };
}

/** The box a wire end touches: the nearest one within a few units of its edge. */
function nodeAt(nodes: readonly FlowNode[], point: { x: number; y: number }) {
    let best: FlowNode | undefined;
    let bestDistance = 7;
    for (const node of nodes) {
        if (node.variant === "group") continue;
        const dx = Math.max(node.x - point.x, 0, point.x - (node.x + node.w));
        const dy = Math.max(node.y - point.y, 0, point.y - (node.y + node.h));
        const distance = Math.hypot(dx, dy);
        if (distance < bestDistance) {
            best = node;
            bestDistance = distance;
        }
    }
    return best;
}

const columnBox = { x: 8, w: 322, lane: 338 };
const narrowLabel = 13;
const narrowSub = 11;

type NarrowLayout = Readonly<{ nodes: readonly FlowNode[]; wires: readonly FlowWire[]; headings: readonly Readonly<{ label: string; y: number }>[]; height: number }>;

/**
 * The phone layout of a box diagram: one column in the order the wires
 * lead, from each process's start. Grouped boxes stay together under their
 * group's heading. A wire between neighbours runs straight up or down; a
 * longer one runs along a lane in the right margin.
 */
function columnLayout(nodes: readonly FlowNode[], wires: readonly FlowWire[]): NarrowLayout {
    const boxes = nodes.filter((node) => node.variant !== "group");
    const groups = nodes.filter((node) => node.variant === "group");
    const groupOf = (node: FlowNode) =>
        groups.find((group) => node.x >= group.x - 1 && node.x + node.w <= group.x + group.w + 1 && node.y >= group.y - 1 && node.y + node.h <= group.y + group.h + 1);
    const byPosition = (a: FlowNode, b: FlowNode) => a.y - b.y || a.x - b.x;
    const links = wires
        .map((wire) => {
            const ends = wireEnds(wire.d);
            return { wire, from: nodeAt(boxes, ends.start), to: nodeAt(boxes, ends.end) };
        })
        .filter((link) => link.from && link.to && link.from !== link.to);

    // Walk the wires from every box nothing points at, so a process reads top to bottom.
    const order: FlowNode[] = [];
    const visit = (node: FlowNode) => {
        if (order.includes(node)) return;
        order.push(node);
        links
            .filter((link) => link.from === node)
            .map((link) => link.to as FlowNode)
            .sort(byPosition)
            .forEach(visit);
    };
    [...boxes].filter((node) => !links.some((link) => link.to === node)).sort(byPosition).forEach(visit);
    [...boxes].sort(byPosition).forEach(visit);

    // Members of a group stay together, in their own top-to-bottom order, under one heading.
    const placedOrder: (FlowNode | { heading: string })[] = [];
    const seenGroups = new Set<FlowNode>();
    for (const node of order) {
        const group = groupOf(node);
        if (!group) {
            placedOrder.push(node);
            continue;
        }
        if (seenGroups.has(group)) continue;
        seenGroups.add(group);
        placedOrder.push({ heading: group.label }, ...order.filter((other) => groupOf(other) === group).sort(byPosition));
    }

    const boxesInOrder = placedOrder.filter((item): item is FlowNode => "id" in item);
    const index = new Map(boxesInOrder.map((node, position) => [node.id, position]));
    const isNeighbour = (a: FlowNode, b: FlowNode) => Math.abs((index.get(a.id) ?? 0) - (index.get(b.id) ?? 0)) === 1;
    const labelled = new Set(links.filter((link) => link.wire.label && isNeighbour(link.from as FlowNode, link.to as FlowNode)).flatMap((link) => [link.from?.id, link.to?.id]));

    let y = 8;
    const placed = new Map<string, FlowNode>();
    const headings: { label: string; y: number }[] = [];
    let previous: FlowNode | null = null;
    // Boxes joined by wires form one run; a new run starts after a wider gap, so separate cases read as separate.
    const connected = (a: FlowNode, b: FlowNode) => links.some((link) => (link.from === a && link.to === b) || (link.from === b && link.to === a));
    let run: FlowNode[] = [];
    for (const item of placedOrder) {
        if (!("id" in item)) {
            if (previous) y += 8;
            headings.push({ label: item.heading, y: y + 9 });
            y += 16;
            previous = null;
            continue;
        }
        const continuesRun = run.some((member) => connected(member, item));
        if (previous) y += !continuesRun && links.length > 0 ? 34 : labelled.has(previous.id) && labelled.has(item.id) ? 26 : 20;
        run = continuesRun ? [...run, item] : [item];
        const lines = item.sub?.length ?? 0;
        const height = lines === 0 ? 34 : 24 + lines * 13;
        placed.set(item.id, { ...item, x: columnBox.x, y, w: columnBox.w, h: height });
        y += height;
        previous = item;
    }

    // Lay out the wires against the new boxes.
    const pairCount = new Map<string, number>();
    let lanes = 0;
    const narrowWires: FlowWire[] = links.map(({ wire, from, to }) => {
        const a = placed.get((from as FlowNode).id) as FlowNode;
        const b = placed.get((to as FlowNode).id) as FlowNode;
        if (isNeighbour(a, b)) {
            const key = [a.id, b.id].sort().join("|");
            const nth = pairCount.get(key) ?? 0;
            pairCount.set(key, nth + 1);
            const x = 150 + nth * 44;
            const down = a.y < b.y;
            const startY = down ? a.y + a.h : a.y;
            const endY = down ? b.y - 2 : b.y + b.h + 2;
            return {
                ...wire,
                d: `M${x} ${startY} V${endY}`,
                label: wire.label ? { text: wire.label.text, x: x + 7, y: (startY + endY) / 2 + 3, anchor: "start" } : undefined,
            };
        }
        const laneX = Math.min(356, columnBox.lane + lanes * 6);
        lanes += 1;
        const fromY = a.y + a.h / 2;
        const toY = b.y + b.h / 2;
        const turn = toY > fromY ? 5 : -5;
        return {
            ...wire,
            d: `M${a.x + a.w} ${fromY} H${laneX - 5} Q${laneX} ${fromY} ${laneX} ${fromY + turn} V${toY - turn} Q${laneX} ${toY} ${laneX - 5} ${toY} H${b.x + b.w + 2}`,
            label: undefined,
        };
    });

    return { nodes: boxesInOrder.map((node) => placed.get(node.id) as FlowNode), wires: narrowWires, headings, height: y + 8 };
}

/**
 * Whether a wire label still fits at phone size (about 6.4 units a
 * character): one hanging off the side must stay on the drawing, and one
 * centred in a gap must stay short enough not to touch the boxes.
 */
function labelFits(label: NonNullable<FlowWire["label"]>) {
    const width = label.text.length * 6.4;
    if (label.anchor === "start") return label.x + width <= 356;
    if (label.anchor === "end") return label.x - width >= 4;
    return width <= 30;
}

/** One rendering of a box diagram, at one layout. */
function FlowDrawing({
    width,
    height,
    nodes,
    wires,
    lit,
    layout,
    headings = [],
    children,
    fitLabels = false,
}: Readonly<{
    width: number;
    height: number;
    nodes: readonly FlowNode[];
    wires: readonly FlowWire[];
    lit: Lit;
    layout: "wide" | "narrow";
    headings?: readonly Readonly<{ label: string; y: number }>[];
    children?: ReactNode;
    /** Drop wire labels that no longer fit once the text is phone-sized. */
    fitLabels?: boolean;
}>) {
    const isMoving = useContext(FigureMotion);
    const animate = !(useReducedMotion() ?? false) && isMoving;
    // Each drawing owns its arrowhead: a shared id would point into a hidden drawing.
    const marker = `gf-arrow-${useId().replace(/:/g, "")}`;
    const state = (on: boolean) => (lit === null ? undefined : on ? "on" : "off");
    // On phones a title or subtitle too long for its box shrinks just enough to fit (about 0.62em a character).
    const labelSize = layout === "narrow" ? narrowLabel : undefined;
    const subSize = layout === "narrow" ? narrowSub : undefined;
    const fit = (text: string, width: number, size: number | undefined) =>
        size === undefined ? undefined : { fontSize: `${Math.min(size, (width - 14) / (text.length * 0.62)).toFixed(1)}px` };
    const baseline = (node: FlowNode) =>
        layout === "narrow" ? node.y + node.h / 2 + 4.2 - ((node.sub?.length ?? 0) * 13) / 2 : labelBaseline(node);
    const gap = layout === "narrow" ? 13 : lineGap;
    return (
        <svg
            aria-hidden="true"
            // A drawing with custom overlays has one layout for every screen, so it is neither wide nor narrow.
            className={children ? "gf-flow" : `gf-flow gf-${layout}`}
            data-tone={lit?.tone ?? "strong"}
            viewBox={`0 0 ${width} ${height}`}
        >
            <defs>
                <marker id={marker} markerHeight="6" markerWidth="6" orient="auto-start-reverse" refX="5" refY="3" viewBox="0 0 6 6">
                    <path className="gf-arrow" d="M0.5 0.8 5 3 0.5 5.2" />
                </marker>
            </defs>
            {headings.map((heading) => (
                <text className="gf-group__label" key={heading.label} x="10" y={heading.y}>
                    {heading.label}
                </text>
            ))}
            {wires.map((wire) => {
                const on = lit?.wires.includes(wire.id) ?? false;
                return (
                    <g className="gf-wire" data-state={state(on)} data-tone={wire.tone} key={wire.id}>
                        <path d={wire.d} markerEnd={`url(#${marker})`} markerStart={wire.both ? `url(#${marker})` : undefined} />
                        {wire.label && (!fitLabels || labelFits(wire.label)) && (
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
                        <text className="gf-node__label" style={fit(node.label, node.w, labelSize)} textAnchor="middle" x={node.x + node.w / 2} y={baseline(node)}>
                            {node.label}
                        </text>
                        {node.sub?.map((line, index) => (
                            <text
                                className="gf-node__sub"
                                style={fit(line, node.w, subSize)}
                                key={line}
                                textAnchor="middle"
                                x={node.x + node.w / 2}
                                y={baseline(node) + gap * (index + 1)}
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

/**
 * A diagram of boxes and wires on the figure's dot grid. In the overview
 * every part sits at rest. A step lights some parts in its tone and dims
 * the rest; lit wires flow and carry a pulse (none under reduced motion).
 * It draws twice, a wide layout and a phone column, and CSS shows the one
 * that fits; a diagram with custom overlays (children) keeps one layout.
 */
export function Flow({
    width,
    height,
    nodes,
    wires,
    lit,
    children,
    narrow,
}: Readonly<{
    width: number;
    height: number;
    nodes: readonly FlowNode[];
    wires: readonly FlowWire[];
    lit: Lit;
    children?: ReactNode;
    narrow?: NarrowOverride;
}>) {
    if (children) {
        return (
            <FlowDrawing height={height} layout="wide" lit={lit} nodes={nodes} width={width} wires={wires}>
                {children}
            </FlowDrawing>
        );
    }
    const wide = <FlowDrawing height={height} layout="wide" lit={lit} nodes={nodes} width={width} wires={wires} />;
    if (narrow) {
        // A figure's own portrait arrangement: same boxes and wires, placed for the phone.
        const placedNodes = nodes.map((node) => {
            const place = narrow.place[node.id];
            return place ? { ...node, x: place[0], y: place[1], w: place[2], h: place[3] } : node;
        });
        const placedWires = wires.map((wire) => (narrow.wires[wire.id] ? { ...wire, ...narrow.wires[wire.id] } : wire));
        return (
            <>
                {wide}
                <FlowDrawing height={narrow.height} layout="narrow" lit={lit} nodes={placedNodes} width={360} wires={placedWires} />
            </>
        );
    }
    // Two columns of wide boxes already fit a phone: keep the shape, raise the text.
    if (nodes.every((node) => node.variant === "group" || node.w >= 140)) {
        return (
            <>
                {wide}
                <FlowDrawing fitLabels height={height} layout="narrow" lit={lit} nodes={nodes} width={width} wires={wires} />
            </>
        );
    }
    const column = columnLayout(nodes, wires);
    return (
        <>
            {wide}
            <FlowDrawing headings={column.headings} height={column.height} layout="narrow" lit={lit} nodes={column.nodes} width={360} wires={column.wires} />
        </>
    );
}

/** A hand-drawn phone layout: box positions as [x, y, w, h], and replacement wire paths and labels. */
export type NarrowOverride = Readonly<{
    height: number;
    place: Readonly<Record<string, readonly [number, number, number, number]>>;
    wires: Readonly<Record<string, Partial<FlowWire>>>;
}>;

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
    tools,
    narrow,
}: Readonly<{
    width: number;
    height: number;
    nodes: readonly FlowNode[];
    wires: readonly FlowWire[];
    steps: readonly FlowStep[];
    overview: string;
    figcaption: string;
    description: readonly string[];
    tools?: ReactNode;
    narrow?: NarrowOverride;
}>) {
    const stepper = useStepper(steps.length);
    const step = stepper.index >= 0 ? steps[stepper.index] : null;
    return (
        <FigureFrame
            caption={<Note>{step?.caption ?? overview}</Note>}
            description={description}
            figcaption={figcaption}
            stage={<Flow height={height} lit={step?.lit ?? null} narrow={narrow} nodes={patched(nodes, step)} width={width} wires={wires} />}
            stepper={stepper}
            tools={tools}
        />
    );
}

/**
 * A two-way switch for figures that compare two cases (with and without a
 * transition, id keys and index keys). Each case is its own short run of
 * steps, so a reader follows one idea at a time.
 */
export function CaseSwitch({
    label,
    cases,
    value,
    onChange,
}: Readonly<{ label: string; cases: readonly string[]; value: number; onChange: (index: number) => void }>) {
    return (
        <div aria-label={label} className="el-controls__group el-segmented" role="group">
            {cases.map((name, index) => (
                <button aria-pressed={index === value} className="el-button" key={name} onClick={() => onChange(index)} type="button">
                    {name}
                </button>
            ))}
        </div>
    );
}
