import { useEffect, useState, type ReactNode } from "react";
import { useReducedMotion } from "motion/react";
import { guidePreviewBeatMs } from "../../lib/motion";

type Zone = "api" | "micro" | "task" | "stack";
type TokenKind = "sync" | "micro" | "task";
type Route = "api-task" | "micro-stack" | "task-stack";

type Token = Readonly<{
    id: string;
    label: string;
    kind: TokenKind;
    zone: Zone;
    /** Slot within the zone; in the stack, 0 is the bottom. */
    slot: number;
    /** Popped off the stack this beat: it rises and fades out. */
    gone?: boolean;
}>;

type Beat = Readonly<{
    caption: string;
    /** The zone the eye should be on: it turns solid and tinted. */
    focus: Zone;
    /** The colour of the job this beat is about, for the focus tint and the route. */
    tone: TokenKind;
    /** A job travels this route this beat: the route lights up and a packet runs along it. */
    route?: Route;
    /** The timer in the web APIs box is counting down. */
    timing?: boolean;
    tokens: readonly Token[];
}>;

const main: Token = { id: "main", label: "main()", kind: "sync", zone: "stack", slot: 0 };
const then: Token = { id: "then", label: "then()", kind: "micro", zone: "micro", slot: 0 };
const timeout: Token = { id: "timeout", label: "timeout()", kind: "task", zone: "api", slot: 0 };

/**
 * The guide's story in seven beats: main() runs and schedules a promise and a
 * timer, the timer's callback joins the task queue, main() returns, the
 * microtask cuts in first, and only then does the task run.
 */
const beats: readonly Beat[] = [
    { caption: "main() runs. A promise queues then(), a timer starts.", focus: "stack", tone: "sync", timing: true, tokens: [main, then, timeout] },
    { caption: "The timer is done, so timeout() joins the task queue.", focus: "task", tone: "task", route: "api-task", tokens: [main, then, { ...timeout, zone: "task" }] },
    { caption: "main() returns. The call stack is empty.", focus: "stack", tone: "sync", tokens: [{ ...main, gone: true }, then, { ...timeout, zone: "task" }] },
    { caption: "Microtasks go first: the loop moves then() to the stack.", focus: "micro", tone: "micro", route: "micro-stack", tokens: [{ ...then, zone: "stack" }, { ...timeout, zone: "task" }] },
    { caption: "then() returns. No microtasks are left.", focus: "stack", tone: "micro", tokens: [{ ...then, zone: "stack", gone: true }, { ...timeout, zone: "task" }] },
    { caption: "Only now does the loop take one task: timeout().", focus: "task", tone: "task", route: "task-stack", tokens: [{ ...timeout, zone: "stack" }] },
    { caption: "The stack is empty. The loop keeps checking.", focus: "stack", tone: "task", tokens: [{ ...timeout, zone: "stack", gone: true }] },
];

/** Under reduced motion the card holds the guide's key moment. */
const stillBeat: Beat = {
    caption: "Microtasks like then() always run before the next task, timeout().",
    focus: "micro",
    tone: "micro",
    tokens: [{ ...then, zone: "stack" }, { ...timeout, zone: "task" }],
};

/*
 * Geometry on a 288 x 150 stage, in CSS pixels. Left column: microtasks
 * (top), task queue (middle), web APIs (bottom). Middle: the event-loop node.
 * Right: the call stack. Tokens are 54 x 18 pills; boxes match the SVG below.
 */
const boxes = {
    micro: { x: 10, y: 10, w: 104, h: 36 },
    task: { x: 10, y: 54, w: 104, h: 36 },
    api: { x: 10, y: 98, w: 104, h: 42 },
    stack: { x: 192, y: 10, w: 86, h: 130 },
} as const;
const loopNode = { cx: 152, cy: 50, r: 10 };

const tokenSlots: Record<Zone, (slot: number) => readonly [number, number]> = {
    micro: () => [54, 24],
    task: () => [54, 68],
    api: () => [54, 117],
    stack: (slot) => [208, 114 - slot * 22],
};

/** Connector paths. Queue routes pass through the loop node on their way to the stack. */
const routes: Record<Route, string> = {
    "api-task": "M40 98 V90",
    "micro-stack": "M114 28 H140 Q152 28 152 40 V50 H192",
    "task-stack": "M114 72 H140 Q152 72 152 60 V50 H192",
};

const tokenNames = /(main\(\)|then\(\)|timeout\(\))/;
const toneOfName: Record<string, TokenKind> = { "main()": "sync", "then()": "micro", "timeout()": "task" };

/** Colours the job names in a caption to match their pills. */
function captionParts(caption: string): ReactNode[] {
    return caption.split(tokenNames).map((part, index) =>
        index % 2 === 1 ? (
            // Split positions are fixed for a given caption, so the index is stable.
            <code className="loop-scene__name" data-kind={toneOfName[part]} key={index}>
                {part}
            </code>
        ) : (
            part
        ),
    );
}

/**
 * The event-loop guide's hover preview: a live diagram of the loop that plays
 * the guide's main example while the card is open, in the line-drawing style
 * of an engineering explainer. Styling and timing live in `styles.css`
 * (`.loop-scene`).
 */
export default function EventLoopPreview({ isRunning }: Readonly<{ isRunning: boolean }>) {
    const shouldReduceMotion = useReducedMotion();
    // The parent remounts the scene on every open, so each hover starts at beat 0.
    const [{ beatIndex, cycle }, setPlayhead] = useState({ beatIndex: 0, cycle: 0 });

    useEffect(() => {
        if (!isRunning || shouldReduceMotion) return;
        const interval = window.setInterval(() => {
            setPlayhead(({ beatIndex: index, cycle: count }) =>
                index < beats.length - 1
                    ? { beatIndex: index + 1, cycle: count }
                    : // New ids each cycle, so the next main() fades in rather than flying back.
                      { beatIndex: 0, cycle: count + 1 },
            );
        }, guidePreviewBeatMs);
        return () => window.clearInterval(interval);
    }, [isRunning, shouldReduceMotion]);

    const beat = shouldReduceMotion ? stillBeat : beats[beatIndex];
    const loopTurns =
        beats.slice(0, beatIndex + 1).filter((entry) => entry.route && entry.route !== "api-task").length + cycle * 2;

    return (
        <div className="loop-scene" data-tone={beat.tone}>
            <div className="loop-scene__stage">
                <svg aria-hidden="true" className="loop-scene__wires" viewBox="0 0 288 150">
                    {(Object.keys(routes) as Route[]).map((route) => (
                        <path
                            className="loop-scene__wire"
                            d={routes[route]}
                            data-active={beat.route === route ? "" : undefined}
                            key={route}
                        />
                    ))}
                    {(Object.keys(boxes) as Zone[]).map((zone) => {
                        const box = boxes[zone];
                        return (
                            <rect
                                className="loop-scene__box"
                                data-focus={beat.focus === zone ? "" : undefined}
                                height={box.h - 1}
                                key={zone}
                                rx="6"
                                width={box.w - 1}
                                x={box.x + 0.5}
                                y={box.y + 0.5}
                            />
                        );
                    })}
                    <circle
                        className="loop-scene__node"
                        cx={loopNode.cx}
                        cy={loopNode.cy}
                        data-active={beat.route && beat.route !== "api-task" ? "" : undefined}
                        r={loopNode.r}
                    />
                    <g className="loop-scene__loop" style={{ rotate: `${loopTurns * 180}deg` }}>
                        <path d="M157 50a5 5 0 1 1-1.5-3.6" fill="none" strokeLinecap="round" />
                        <path d="M155.9 44.2l-.2 2.4-2.4-.1" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </g>
                    {beat.route && !shouldReduceMotion && (
                        // A packet runs the active route once per beat; the key restarts it each time.
                        <circle className="loop-scene__packet" key={`${beat.route}-${cycle}`} r="2.5">
                            <animateMotion dur="0.55s" fill="freeze" path={routes[beat.route]} />
                        </circle>
                    )}
                </svg>
                <span className="loop-scene__label" style={{ left: 18, top: 15 }}>microtasks</span>
                <span className="loop-scene__label" style={{ left: 18, top: 59 }}>task queue</span>
                <span className="loop-scene__label" style={{ left: 18, top: 103 }}>web APIs</span>
                <span className="loop-scene__label" style={{ left: 200, top: 16 }}>call stack</span>
                <span className="loop-scene__label loop-scene__label--node" style={{ left: 165, top: 35 }}>loop</span>
                {beat.timing && <span className="loop-scene__timer" />}
                {beat.tokens.map((token) => {
                    const [x, y] = tokenSlots[token.zone](token.slot);
                    return (
                        <span
                            className="loop-scene__token"
                            data-gone={token.gone ? "" : undefined}
                            data-kind={token.kind}
                            key={`${token.id}-${cycle}`}
                            style={{ translate: `${x}px ${token.gone ? y - 10 : y}px` }}
                        >
                            {token.label}
                        </span>
                    );
                })}
            </div>
            <div className="loop-scene__footer">
                <p className="loop-scene__caption" key={beat.caption}>
                    {captionParts(beat.caption)}
                </p>
                {!shouldReduceMotion && (
                    <span className="loop-scene__count">
                        {beatIndex + 1}/{beats.length}
                    </span>
                )}
            </div>
        </div>
    );
}
