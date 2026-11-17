import type { Job, JobKind, SimState } from "../../lib/event-loop-sim";

type Zone = "micro" | "task" | "api" | "stack";
type Route = "api-task" | "micro-stack" | "task-stack";

/*
 * Geometry in viewBox units (320 x 168); the SVG scales to its container.
 * Left column: microtasks, task queue, web APIs, each a box with a header
 * strip and two dashed slot lines. Middle: the loop node. Right: the call
 * stack, filling from the bottom. Pills are 68 x 16 everywhere.
 */
export const diagramViewBox = { width: 320, height: 168 };

const boxes: Record<Zone, { x: number; y: number; w: number; h: number; label: string }> = {
    micro: { x: 8, y: 8, w: 148, h: 48, label: "microtasks" },
    task: { x: 8, y: 64, w: 148, h: 48, label: "task queue" },
    api: { x: 8, y: 120, w: 148, h: 40, label: "web APIs" },
    stack: { x: 212, y: 8, w: 100, h: 152, label: "call stack" },
};

const headerHeight = 14;
const pill = { w: 68, h: 16 };
const loopNode = { cx: 184, cy: 64, r: 11 };

/** Queue slots left to right; the stack fills bottom up. */
function slot(zone: Zone, index: number): readonly [number, number] {
    if (zone === "stack") return [boxes.stack.x + (boxes.stack.w - pill.w) / 2, 138 - index * 20];
    const box = boxes[zone];
    const y = zone === "api" ? box.y + headerHeight + 5 : box.y + headerHeight + 9;
    return [box.x + 4 + Math.min(index, 1) * 72, y];
}

const routes: Record<Route, string> = {
    "api-task": "M40 120 V112",
    "micro-stack": "M156 39 H172 Q184 39 184 51 V64 H212",
    "task-stack": "M156 95 H172 Q184 95 184 83 V64 H212",
};

type Placed = { job: Job; zone: Zone; index: number; waiting?: boolean; running?: boolean; gone?: boolean };

/** Where every job sits right now, plus the one just popped (drawn rising away). */
function placeJobs(state: SimState): Placed[] {
    const placed: Placed[] = [];
    state.micro.forEach((job, index) => placed.push({ job, zone: "micro", index }));
    state.tasks.forEach((job, index) => placed.push({ job, zone: "task", index }));
    state.timers.forEach((timer, index) => placed.push({ job: timer.job, zone: "api", index, waiting: true }));
    state.stack.forEach((job, index) =>
        placed.push({ job, zone: "stack", index, running: index === state.stack.length - 1 && state.event.type === "exec" }),
    );
    if (state.event.type === "return") {
        placed.push({ job: state.event.job, zone: "stack", index: state.stack.length, gone: true });
    }
    return placed;
}

function focusOf(state: SimState): { zone: Zone | null; tone: JobKind | null; route: Route | null } {
    const event = state.event;
    switch (event.type) {
        case "start":
        case "exec":
        case "return":
            return { zone: "stack", tone: event.job.kind, route: null };
        case "timer-done":
            return { zone: "task", tone: "task", route: "api-task" };
        case "run":
            return { zone: event.from, tone: event.job.kind, route: event.from === "micro" ? "micro-stack" : "task-stack" };
        case "idle":
            return { zone: null, tone: null, route: null };
    }
}

/**
 * The event loop as a line drawing, for the guide's figure and the hover
 * card. Pure: it renders a `SimState`, and CSS transitions carry each pill
 * from one place to the next (keyed by job id). Styling lives in
 * `styles.css` (`.el-diagram`).
 */
export function EventLoopDiagram({ state, animate }: Readonly<{ state: SimState; animate: boolean }>) {
    const { zone: focus, tone, route } = focusOf(state);
    const loopTurns = state.history.length;

    return (
        <svg
            aria-hidden="true"
            className="el-diagram"
            data-tone={tone ?? undefined}
            viewBox={`0 0 ${diagramViewBox.width} ${diagramViewBox.height}`}
        >
            {(Object.keys(routes) as Route[]).map((name) => (
                <path className="el-wire" d={routes[name]} data-active={route === name ? "" : undefined} key={name} />
            ))}

            {(Object.keys(boxes) as Zone[]).map((name) => {
                const box = boxes[name];
                const isFocus = focus === name;
                return (
                    <g className="el-zone" data-focus={isFocus ? "" : undefined} key={name}>
                        <rect className="el-zone__box" height={box.h - 1} rx="4" width={box.w - 1} x={box.x + 0.5} y={box.y + 0.5} />
                        <line className="el-zone__rule" x1={box.x + 1} x2={box.x + box.w - 1} y1={box.y + headerHeight + 0.5} y2={box.y + headerHeight + 0.5} />
                        <text className="el-zone__label" x={box.x + 6} y={box.y + 9.5}>
                            {box.label}
                        </text>
                        {name !== "stack" &&
                            [0, 1].map((index) => {
                                const [x, y] = slot(name, index);
                                return (
                                    <line className="el-zone__slot" key={index} x1={x} x2={x + pill.w} y1={y + pill.h / 2} y2={y + pill.h / 2} />
                                );
                            })}
                    </g>
                );
            })}

            <text className="el-readout" textAnchor="end" x={boxes.stack.x + boxes.stack.w - 6} y={boxes.stack.y + 9.5}>
                tick {String(state.tick).padStart(2, "0")}
            </text>

            <circle className="el-node" cx={loopNode.cx} cy={loopNode.cy} data-active={route && route !== "api-task" ? "" : undefined} r={loopNode.r} />
            <g className="el-node__arrow" style={{ rotate: `${loopTurns * 90}deg` }}>
                <path d={`M${loopNode.cx + 5} ${loopNode.cy}a5 5 0 1 1-1.5-3.6`} />
                <path d={`M${loopNode.cx + 3.9} ${loopNode.cy - 5.8}l-.2 2.4-2.4-.1`} />
            </g>
            <text className="el-zone__label" textAnchor="middle" x={loopNode.cx} y={loopNode.cy + loopNode.r + 9}>
                loop
            </text>

            {route && animate && (
                // One packet per event along the active route; the key restarts it every tick.
                <circle className="el-packet" key={`packet-${state.tick}`} r="2.4">
                    <animateMotion dur="0.5s" fill="freeze" path={routes[route]} />
                </circle>
            )}

            {placeJobs(state).map(({ job, zone, index, waiting, running, gone }) => {
                const [x, y] = slot(zone, index);
                return (
                    <g
                        className="el-pill"
                        data-gone={gone ? "" : undefined}
                        data-kind={job.kind}
                        data-running={running ? "" : undefined}
                        data-waiting={waiting ? "" : undefined}
                        key={gone ? `${job.id}-gone` : job.id}
                        style={{ transform: `translate(${x}px, ${gone ? y - 8 : y}px)` }}
                    >
                        <rect className="el-pill__body" height={pill.h} rx="2.5" width={pill.w} />
                        <text
                            className="el-pill__text"
                            // Long names compress to fit the pill when phones enlarge the text.
                            lengthAdjust="spacingAndGlyphs"
                            textAnchor="middle"
                            textLength={job.label.length > 13 ? pill.w - 6 : undefined}
                            x={pill.w / 2}
                            y={pill.h / 2 + 2.4}
                        >
                            {job.label}
                        </text>
                    </g>
                );
            })}
        </svg>
    );
}
