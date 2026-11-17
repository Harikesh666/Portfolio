import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";
import { guidePreviewBeatMs } from "../../lib/motion";

type Zone = "api" | "micro" | "task" | "stack";
type TokenKind = "sync" | "micro" | "task";

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
    /** The zone the eye should be on; its label brightens. */
    focus: Zone;
    /** The event loop picks the next job this beat, so its arrow turns. */
    loops?: boolean;
    /** The timer in the web APIs zone is counting down. */
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
    {
        caption: "main() runs. A promise queues then(), a timer starts.",
        focus: "stack",
        timing: true,
        tokens: [main, then, timeout],
    },
    {
        caption: "The timer is done, so timeout() joins the task queue.",
        focus: "task",
        tokens: [main, then, { ...timeout, zone: "task" }],
    },
    {
        caption: "main() returns. The call stack is empty.",
        focus: "stack",
        tokens: [{ ...main, gone: true }, then, { ...timeout, zone: "task" }],
    },
    {
        caption: "Microtasks go first: then() runs.",
        focus: "micro",
        loops: true,
        tokens: [{ ...then, zone: "stack" }, { ...timeout, zone: "task" }],
    },
    {
        caption: "then() returns. No microtasks are left.",
        focus: "micro",
        tokens: [{ ...then, zone: "stack", gone: true }, { ...timeout, zone: "task" }],
    },
    {
        caption: "Only now does one task run: timeout().",
        focus: "task",
        loops: true,
        tokens: [{ ...timeout, zone: "stack" }],
    },
    {
        caption: "The stack is empty. The loop keeps checking.",
        focus: "stack",
        tokens: [{ ...timeout, zone: "stack", gone: true }],
    },
];

/** Under reduced motion the card holds the guide's key moment. */
const stillBeat: Beat = {
    caption: "Microtasks always run before the next task.",
    focus: "micro",
    tokens: [{ ...then, zone: "stack" }, { ...timeout, zone: "task" }],
};

/*
 * Scene geometry in CSS pixels, documented against the zone boxes in
 * styles.css (.loop-scene__zone): web APIs left, the two queues stacked in
 * the middle, the call stack tall on the right. Tokens are 58 x 18 pills.
 */
const tokenSlots: Record<Zone, (slot: number) => readonly [number, number]> = {
    api: () => [12, 68],
    micro: (slot) => [98 + slot * 60, 38],
    task: (slot) => [98 + slot * 60, 114],
    stack: (slot) => [218, 114 - slot * 22],
};

/**
 * The event-loop guide's hover preview: a live diagram of the loop that plays
 * the guide's main example while the card is open, restarting on every open.
 * Styling and timing live in `styles.css` (`.loop-scene`).
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
    const loopTurns = beats.slice(0, beatIndex + 1).filter((entry) => entry.loops).length + cycle * 2;

    return (
        <div className="loop-scene">
            <div className="loop-scene__stage">
                <Zone focus={beat.focus} label="web APIs" zone="api">
                    {beat.timing && <span className="loop-scene__timer" />}
                </Zone>
                <Zone focus={beat.focus} label="microtasks" zone="micro" />
                <Zone focus={beat.focus} label="task queue" zone="task" />
                <Zone focus={beat.focus} label="call stack" zone="stack" />
                <svg
                    aria-hidden="true"
                    className="loop-scene__loop"
                    style={{ rotate: `${loopTurns * 180}deg` }}
                    viewBox="0 0 16 16"
                >
                    <path d="M13 8a5 5 0 1 1-1.6-3.7" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
                    <path d="M11.2 1.8l.4 2.7-2.7.3" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                </svg>
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
            <p className="loop-scene__caption" key={beat.caption}>
                {beat.caption}
            </p>
        </div>
    );
}

function Zone({
    children,
    focus,
    label,
    zone,
}: Readonly<{ children?: React.ReactNode; focus: Zone; label: string; zone: Zone }>) {
    return (
        <div className="loop-scene__zone" data-focus={focus === zone ? "" : undefined} data-zone={zone}>
            <span className="loop-scene__label">{label}</span>
            {children}
        </div>
    );
}
