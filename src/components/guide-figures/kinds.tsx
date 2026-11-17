import { FigureFrame, Note, useStepper, type Tone } from "./kit";

/*
 * Four figure kinds made for the React guides, each driven by plain data:
 * a component tree whose nodes change state, a timeline of work over time,
 * a keyed list before and after a change, and a row of bits.
 */

type Caption = Readonly<{ overview: string; figcaption: string; description: readonly string[] }>;

/* ───────────── Tree ───────────── */

export type TreeState = "idle" | "renders" | "skipped" | "suspended" | "boundary" | "fallback" | "error" | "server" | "client";

const stateNames: Record<TreeState, string> = {
    idle: "idle",
    renders: "renders",
    skipped: "skipped",
    suspended: "suspended",
    boundary: "boundary",
    fallback: "fallback",
    error: "error",
    server: "server",
    client: "client",
};

export type TreeSpec = Caption &
    Readonly<{
        nodes: readonly Readonly<{ id: string; label: string; parent?: string; sub?: string }>[];
        steps: readonly Readonly<{ caption: string; states?: Readonly<Record<string, TreeState>>; subs?: Readonly<Record<string, string>> }>[];
        /** States every node starts in for the overview, if not idle. */
        initial?: Readonly<Record<string, TreeState>>;
        /** Hide the state legend when the states are used as plain highlights. */
        legend?: boolean;
    }>;

type Placed = Readonly<{ id: string; label: string; parent?: string; x: number; y: number; w: number }>;

/** Leaves share the width in reading order; each parent sits centred over its children. */
function layoutTree(nodes: TreeSpec["nodes"]): readonly Placed[] {
    const children = (id?: string) => nodes.filter((node) => node.parent === id);
    const leaves: string[] = [];
    const depth = new Map<string, number>();
    const walk = (id: string, level: number) => {
        depth.set(id, level);
        const kids = children(id);
        if (kids.length === 0) leaves.push(id);
        for (const kid of kids) walk(kid.id, level + 1);
    };
    for (const root of children(undefined)) walk(root.id, 0);
    const slot = 344 / Math.max(1, leaves.length);
    const width = Math.min(108, slot - 8);
    const centre = new Map<string, number>();
    const place = (id: string): number => {
        const kids = children(id);
        const x = kids.length === 0 ? 8 + slot * (leaves.indexOf(id) + 0.5) : kids.map((kid) => place(kid.id)).reduce((a, b) => a + b, 0) / kids.length;
        centre.set(id, x);
        return x;
    };
    for (const root of children(undefined)) place(root.id);
    return nodes.map((node) => ({
        id: node.id,
        label: node.label,
        parent: node.parent,
        x: (centre.get(node.id) ?? 180) - width / 2,
        y: 8 + (depth.get(node.id) ?? 0) * 58,
        w: width,
    }));
}

export function TreeFigure({ spec }: Readonly<{ spec: TreeSpec }>) {
    const stepper = useStepper(spec.steps.length);
    const step = stepper.index >= 0 ? spec.steps[stepper.index] : null;
    const placed = layoutTree(spec.nodes);
    const height = Math.max(...placed.map((node) => node.y)) + 44 + (spec.legend === false ? 4 : 26);
    const stateOf = (id: string): TreeState => step?.states?.[id] ?? (step ? "idle" : (spec.initial?.[id] ?? "idle"));
    const subOf = (id: string) => step?.subs?.[id] ?? spec.nodes.find((node) => node.id === id)?.sub;
    const used = spec.legend === false ? [] : [...new Set(spec.steps.flatMap((one) => Object.values(one.states ?? {})))].filter((state) => state !== "idle");
    return (
        <FigureFrame
            caption={<Note>{step?.caption ?? spec.overview}</Note>}
            description={spec.description}
            figcaption={spec.figcaption}
            stage={
                <svg aria-hidden="true" className="gf-flow gf-tree-figure" viewBox={`0 0 360 ${height}`}>
                    {placed.map((node) => {
                        const parent = placed.find((other) => other.id === node.parent);
                        if (!parent) return null;
                        const from = { x: parent.x + parent.w / 2, y: parent.y + 34 };
                        const to = { x: node.x + node.w / 2, y: node.y };
                        const mid = (from.y + to.y) / 2;
                        const lit = stateOf(node.id) !== "idle" && stateOf(node.id) !== "skipped" && stateOf(parent.id) !== "idle";
                        return (
                            <path
                                className="gf-tree-edge"
                                d={`M${from.x} ${from.y} C${from.x} ${mid} ${to.x} ${mid} ${to.x} ${to.y}`}
                                data-lit={lit ? "" : undefined}
                                key={node.id}
                            />
                        );
                    })}
                    {placed.map((node) => {
                        const sub = subOf(node.id);
                        return (
                            <g className="gf-tnode" data-state={stateOf(node.id)} key={node.id}>
                                <rect height="34" rx="6" width={node.w} x={node.x} y={node.y} />
                                <text className="gf-node__label" textAnchor="middle" x={node.x + node.w / 2} y={node.y + (sub ? 14.5 : 20.5)}>
                                    {node.label}
                                </text>
                                {sub && (
                                    <text className="gf-node__sub" key={sub} textAnchor="middle" x={node.x + node.w / 2} y={node.y + 26}>
                                        {sub}
                                    </text>
                                )}
                            </g>
                        );
                    })}
                    {used.map((state, index) => (
                        <g className="gf-tnode gf-legend" data-state={state} key={state} transform={`translate(${8 + index * 72} ${height - 14})`}>
                            <rect height="9" rx="2.5" width="12" />
                            <text className="gf-wire__label" x="17" y="7.6">
                                {stateNames[state]}
                            </text>
                        </g>
                    ))}
                </svg>
            }
            stepper={stepper}
        />
    );
}

/* ───────────── Timeline ───────────── */

export type TimelineBlock = Readonly<{ lane: string; start: number; end: number; label?: string; tone?: Tone | "muted" }>;

export type TimelineSpec = Caption &
    Readonly<{
        lanes: readonly string[];
        /** Units of time across the track. */
        span: number;
        /** Optional label under the axis, such as "time →". */
        axis?: string;
        steps: readonly Readonly<{ caption: string; blocks: readonly TimelineBlock[]; at?: number; markers?: readonly Readonly<{ at: number; label: string }>[] }>[];
    }>;

export function TimelineFigure({ spec }: Readonly<{ spec: TimelineSpec }>) {
    const stepper = useStepper(spec.steps.length);
    const step = stepper.index >= 0 ? spec.steps[stepper.index] : spec.steps[spec.steps.length - 1];
    const left = 84;
    const right = 352;
    const x = (time: number) => left + ((right - left) * time) / spec.span;
    const laneY = (index: number) => 26 + index * 30;
    const height = laneY(spec.lanes.length) + 14;
    return (
        <FigureFrame
            caption={<Note>{stepper.index >= 0 ? step.caption : spec.overview}</Note>}
            description={spec.description}
            figcaption={spec.figcaption}
            stage={
                <svg aria-hidden="true" className="gf-flow gf-timeline" viewBox={`0 0 360 ${height}`}>
                    {spec.lanes.map((lane, index) => (
                        <g key={lane}>
                            <text className="gf-group__label" x="8" y={laneY(index) + 12}>
                                {lane}
                            </text>
                            <line className="gf-timeline__track" x1={left} x2={right} y1={laneY(index) + 9} y2={laneY(index) + 9} />
                        </g>
                    ))}
                    {(step.markers ?? []).map((marker) => (
                        <g key={`${marker.at}-${marker.label}`}>
                            <line className="gf-timeline__marker" x1={x(marker.at)} x2={x(marker.at)} y1="14" y2={height - 10} />
                            <text className="gf-wire__label" textAnchor="middle" x={x(marker.at)} y="10">
                                {marker.label}
                            </text>
                        </g>
                    ))}
                    {step.blocks.map((block) => {
                        const lane = spec.lanes.indexOf(block.lane);
                        const width = Math.max(4, x(block.end) - x(block.start) - 1.5);
                        return (
                            <g className="gf-tblock" data-tone={block.tone ?? "task"} key={`${block.lane}-${block.start}-${block.label ?? ""}`}>
                                <rect height="18" rx="3" width={width} x={x(block.start) + 0.75} y={laneY(lane)} />
                                {block.label && width > block.label.length * 4.6 + 6 && (
                                    <text textAnchor="middle" x={x(block.start) + width / 2 + 0.75} y={laneY(lane) + 12.4}>
                                        {block.label}
                                    </text>
                                )}
                            </g>
                        );
                    })}
                    {step.at !== undefined && stepper.index >= 0 && <line className="gf-timeline__head" x1={x(step.at)} x2={x(step.at)} y1="16" y2={height - 8} />}
                    {spec.axis && (
                        <text className="gf-wire__label" textAnchor="end" x={right} y={height - 1}>
                            {spec.axis}
                        </text>
                    )}
                </svg>
            }
            stepper={stepper}
        />
    );
}

/* ───────────── Keyed list ───────────── */

export type ListCell = Readonly<{ label: string; detail?: string; identity: number }>;

export type ListSpec = Caption &
    Readonly<{
        rows: readonly string[];
        steps: readonly Readonly<{
            caption: string;
            cells: readonly (readonly ListCell[])[];
            /** Pairs [topIndex, bottomIndex] joined by a line, such as "this fiber is reused here". */
            links?: readonly (readonly [number, number])[];
            /** Cells to mark as wrong, as [row, index]. */
            wrong?: readonly (readonly [number, number])[];
        }>[];
    }>;

export function ListFigure({ spec }: Readonly<{ spec: ListSpec }>) {
    const stepper = useStepper(spec.steps.length);
    const step = stepper.index >= 0 ? spec.steps[stepper.index] : spec.steps[0];
    const rowY = (row: number) => 18 + row * 78;
    const count = Math.max(...step.cells.map((row) => row.length));
    const cellW = Math.min(78, (276 - (count - 1) * 8) / count);
    const cellX = (index: number) => 76 + index * (cellW + 8);
    const height = rowY(spec.rows.length - 1) + 50;
    return (
        <FigureFrame
            caption={<Note>{stepper.index >= 0 ? step.caption : spec.overview}</Note>}
            description={spec.description}
            figcaption={spec.figcaption}
            stage={
                <svg aria-hidden="true" className="gf-flow gf-list" viewBox={`0 0 360 ${height}`}>
                    {(step.links ?? []).map(([top, bottom]) => (
                        <path
                            className="gf-list__link"
                            d={`M${cellX(top) + cellW / 2} ${rowY(0) + 36} C${cellX(top) + cellW / 2} ${rowY(0) + 58} ${cellX(bottom) + cellW / 2} ${rowY(1) - 22} ${cellX(bottom) + cellW / 2} ${rowY(1)}`}
                            key={`${top}-${bottom}`}
                        />
                    ))}
                    {spec.rows.map((row, rowIndex) => (
                        <g key={row}>
                            <text className="gf-group__label" x="8" y={rowY(rowIndex) + 21}>
                                {row}
                            </text>
                            {(step.cells[rowIndex] ?? []).map((cell, index) => {
                                const wrong = step.wrong?.some(([r, i]) => r === rowIndex && i === index);
                                return (
                                    <g className="gf-lcell" data-identity={cell.identity % 4} data-wrong={wrong ? "" : undefined} key={`${cell.label}-${index}`}>
                                        <rect height="36" rx="5" width={cellW} x={cellX(index)} y={rowY(rowIndex)} />
                                        <text className="gf-node__label" textAnchor="middle" x={cellX(index) + cellW / 2} y={rowY(rowIndex) + (cell.detail ? 15 : 21)}>
                                            {cell.label}
                                        </text>
                                        {cell.detail && (
                                            <text className="gf-node__sub" textAnchor="middle" x={cellX(index) + cellW / 2} y={rowY(rowIndex) + 27}>
                                                {cell.detail}
                                            </text>
                                        )}
                                    </g>
                                );
                            })}
                        </g>
                    ))}
                </svg>
            }
            stepper={stepper}
        />
    );
}

/* ───────────── Bits ───────────── */

export type BitsSpec = Caption &
    Readonly<{
        /** Bit labels, left to right. */
        bits: readonly string[];
        steps: readonly Readonly<{ caption: string; rows: readonly Readonly<{ label: string; on: readonly number[]; tone?: Tone }>[] }>[];
    }>;

export function BitsFigure({ spec }: Readonly<{ spec: BitsSpec }>) {
    const stepper = useStepper(spec.steps.length);
    const step = stepper.index >= 0 ? spec.steps[stepper.index] : spec.steps[spec.steps.length - 1];
    const left = 96;
    // Few bits get wide cells, so their labels never run into each other.
    const cell = Math.min(80, (352 - left - (spec.bits.length - 1) * 4) / spec.bits.length);
    const bitX = (index: number) => left + index * (cell + 4);
    const rowY = (index: number) => 40 + index * 30;
    const rows = Math.max(...spec.steps.map((one) => one.rows.length));
    const height = rowY(rows) + 4;
    return (
        <FigureFrame
            caption={<Note>{stepper.index >= 0 ? step.caption : spec.overview}</Note>}
            description={spec.description}
            figcaption={spec.figcaption}
            stage={
                <svg aria-hidden="true" className="gf-flow gf-bits" viewBox={`0 0 360 ${height}`}>
                    {spec.bits.map((bit, index) => (
                        <text className="gf-wire__label" key={bit} textAnchor="middle" x={bitX(index) + cell / 2} y="28">
                            {bit}
                        </text>
                    ))}
                    {step.rows.map((row, rowIndex) => (
                        <g key={row.label}>
                            <text className="gf-group__label" x="8" y={rowY(rowIndex) + 13}>
                                {row.label}
                            </text>
                            {spec.bits.map((bit, index) => (
                                <g className="gf-bit" data-on={row.on.includes(index) ? "" : undefined} data-tone={row.tone ?? "task"} key={bit}>
                                    <rect height="20" rx="3" width={cell} x={bitX(index)} y={rowY(rowIndex)} />
                                    <text textAnchor="middle" x={bitX(index) + cell / 2} y={rowY(rowIndex) + 13.6}>
                                        {row.on.includes(index) ? "1" : "0"}
                                    </text>
                                </g>
                            ))}
                        </g>
                    ))}
                </svg>
            }
            stepper={stepper}
        />
    );
}
