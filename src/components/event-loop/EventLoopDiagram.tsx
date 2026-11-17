import { useEffect, useLayoutEffect, useRef } from "react";
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
/** How long a pill takes to travel a wire, in ms. */
const travelMs = 720;

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

/** The wire a job follows when it moves from one zone to another, if any. */
function routeBetween(from: Zone, to: Zone): Route | null {
    if (from === "api" && to === "task") return "api-task";
    if (from === "micro" && to === "stack") return "micro-stack";
    if (from === "task" && to === "stack") return "task-stack";
    return null;
}

type Placed = { job: Job; zone: Zone; index: number; waiting?: boolean; running?: boolean; gone?: boolean };

/** Where every job sits right now, plus the one just popped (drawn rising away). */
function placeJobs(state: SimState): Placed[] {
    const placed: Placed[] = [];
    const isWorking = state.event.type === "exec" || state.event.type === "busy";
    state.micro.forEach((job, index) => placed.push({ job, zone: "micro", index }));
    state.tasks.forEach((job, index) => placed.push({ job, zone: "task", index }));
    state.timers.forEach((timer, index) => placed.push({ job: timer.job, zone: "api", index, waiting: true }));
    state.stack.forEach((job, index) =>
        placed.push({ job, zone: "stack", index, running: index === state.stack.length - 1 && isWorking }),
    );
    if (state.event.type === "return") {
        placed.push({ job: state.event.job, zone: "stack", index: state.stack.length, gone: true });
    }
    return placed;
}

function focusOf(state: SimState): { zone: Zone | null; tone: JobKind | null; routes: Route[] } {
    const event = state.event;
    const arriving: Route[] = state.arrivals.length > 0 ? ["api-task"] : [];
    if (event.type === "timer-done") return { zone: "task", tone: "task", routes: ["api-task"] };
    if (event.type === "run") {
        return {
            zone: event.from,
            tone: event.job.kind,
            routes: [event.from === "micro" ? "micro-stack" : "task-stack", ...arriving],
        };
    }
    if (event.type === "idle") return { zone: null, tone: null, routes: arriving };
    return { zone: "stack", tone: event.job.kind, routes: arriving };
}

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/**
 * The event loop as a line drawing, for the guides' figures and hover
 * cards. It renders a `SimState`. A pill that changes zone travels along
 * its wire (queue, loop node, stack) on a short JavaScript tween over the
 * real SVG path, then settles into its slot; everything else eases with
 * CSS. Styling lives in `styles.css` (`.el-diagram`).
 */
export function EventLoopDiagram({
    state,
    animate,
    readout,
}: Readonly<{ state: SimState; animate: boolean; readout?: string }>) {
    const { zone: focus, tone, routes: activeRoutes } = focusOf(state);
    const placed = placeJobs(state);
    const pillNodes = useRef(new Map<string, SVGGElement>());
    const wireNodes = useRef(new Map<Route, SVGPathElement>());
    const lastPlace = useRef(new Map<string, { zone: Zone; x: number; y: number }>());
    const frames = useRef(new Map<string, number>());

    // Send each pill that changed zone along its wire, starting before the browser paints.
    useLayoutEffect(() => {
        const next = new Map<string, { zone: Zone; x: number; y: number }>();
        for (const item of placed) {
            if (item.gone) continue;
            const [x, y] = slot(item.zone, item.index);
            next.set(item.job.id, { zone: item.zone, x, y });
            const before = lastPlace.current.get(item.job.id);
            const route = before ? routeBetween(before.zone, item.zone) : null;
            const node = pillNodes.current.get(item.job.id);
            const wire = route ? wireNodes.current.get(route) : undefined;
            if (!animate || !before || !route || !node || !wire) continue;

            cancelAnimationFrame(frames.current.get(item.job.id) ?? 0);
            const length = wire.getTotalLength();
            const start = wire.getPointAtLength(0);
            const end = wire.getPointAtLength(length);
            const from = { x: before.x + pill.w / 2, y: before.y + pill.h / 2 };
            const to = { x: x + pill.w / 2, y: y + pill.h / 2 };
            const lead = Math.hypot(start.x - from.x, start.y - from.y);
            const tail = Math.hypot(to.x - end.x, to.y - end.y);
            const total = lead + length + tail;
            const pointAt = (distance: number) => {
                if (distance <= lead) {
                    const t = lead ? distance / lead : 1;
                    return { x: from.x + (start.x - from.x) * t, y: from.y + (start.y - from.y) * t };
                }
                if (distance <= lead + length) return wire.getPointAtLength(distance - lead);
                const t = tail ? (distance - lead - length) / tail : 1;
                return { x: end.x + (to.x - end.x) * t, y: end.y + (to.y - end.y) * t };
            };
            const place = (point: { x: number; y: number }) => {
                node.style.transform = `translate(${point.x - pill.w / 2}px, ${point.y - pill.h / 2}px)`;
            };

            node.style.transition = "none";
            place(from);
            const began = performance.now();
            const frame = (now: number) => {
                const progress = Math.min(1, (now - began) / travelMs);
                place(pointAt(easeInOut(progress) * total));
                if (progress < 1) {
                    frames.current.set(item.job.id, requestAnimationFrame(frame));
                } else {
                    node.style.transition = "";
                    place(to);
                }
            };
            frames.current.set(item.job.id, requestAnimationFrame(frame));
        }
        lastPlace.current = next;
    });

    useEffect(() => {
        const pending = frames.current;
        return () => {
            for (const id of pending.values()) cancelAnimationFrame(id);
        };
    }, []);

    return (
        <svg
            aria-hidden="true"
            className="el-diagram"
            data-tone={tone ?? undefined}
            viewBox={`0 0 ${diagramViewBox.width} ${diagramViewBox.height}`}
        >
            {(Object.keys(routes) as Route[]).map((name) => (
                <path
                    className="el-wire"
                    d={routes[name]}
                    data-active={activeRoutes.includes(name) ? "" : undefined}
                    key={name}
                    ref={(node) => {
                        if (node) wireNodes.current.set(name, node);
                        else wireNodes.current.delete(name);
                    }}
                />
            ))}

            {(Object.keys(boxes) as Zone[]).map((name) => {
                const box = boxes[name];
                return (
                    <g className="el-zone" data-focus={focus === name ? "" : undefined} key={name}>
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
                {readout ?? `TICK ${String(state.tick).padStart(2, "0")}`}
            </text>

            <circle
                className="el-node"
                cx={loopNode.cx}
                cy={loopNode.cy}
                data-active={activeRoutes.some((route) => route !== "api-task") ? "" : undefined}
                r={loopNode.r}
            />
            <g className="el-node__arrow" style={{ rotate: `${state.history.length * 90}deg` }}>
                <path d={`M${loopNode.cx + 5} ${loopNode.cy}a5 5 0 1 1-1.5-3.6`} />
                <path d={`M${loopNode.cx + 3.9} ${loopNode.cy - 5.8}l-.2 2.4-2.4-.1`} />
            </g>
            <text className="el-zone__label" textAnchor="middle" x={loopNode.cx} y={loopNode.cy + loopNode.r + 9}>
                loop
            </text>

            {placed.map(({ job, zone, index, waiting, running, gone }) => {
                const [x, y] = slot(zone, index);
                return (
                    <g
                        className="el-pill"
                        data-gone={gone ? "" : undefined}
                        data-kind={job.kind}
                        data-running={running ? "" : undefined}
                        data-waiting={waiting ? "" : undefined}
                        key={gone ? `${job.id}-gone` : job.id}
                        ref={(node) => {
                            if (gone) return;
                            if (node) pillNodes.current.set(job.id, node);
                            else pillNodes.current.delete(job.id);
                        }}
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
