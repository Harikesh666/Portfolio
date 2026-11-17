import {
    blockedTimerExample,
    blockedTimerExampleSource,
    eventLoopExample,
    eventLoopExampleSource,
    type CallbackSpec,
    type JobKind,
    type SimOptions,
    type SimState,
} from "../../lib/event-loop-sim";

export type FigureExample = Readonly<{
    program: CallbackSpec;
    source: readonly string[];
    fileName: string;
    /** Which callback each source line belongs to, so its lines tint while that callback runs. */
    lineOwners: Readonly<Record<number, Readonly<{ label: string; kind: JobKind }>>>;
    /** Function names in the source, coloured like their pills. */
    names: readonly Readonly<{ name: string; kind: JobKind }>[];
    /** How the simulator charges time; the timer examples make plain statements free. */
    simOptions?: SimOptions;
    /** When set, one unit of simulated time is this many seconds: readouts and captions speak in seconds. */
    secondsPerTick?: number;
    startLabel: string;
    figcaption: string;
    /** The frame a reduced-motion hover card holds: the moment the example exists to show. */
    isKeyMoment: (state: SimState) => boolean;
}>;

const owned = (lines: readonly number[], label: string, kind: JobKind) =>
    Object.fromEntries(lines.map((line) => [line, { label, kind }]));

/**
 * The examples a guide can place with `<EventLoopFigure example="…" />`.
 * Each runs a guide's own code, line for line, through the simulator.
 */
export const figureExamples = {
    "tasks-and-microtasks": {
        program: eventLoopExample,
        source: eventLoopExampleSource,
        fileName: "main.js",
        lineOwners: { ...owned([2, 3, 4], "timerCallback", "task"), ...owned([6, 7, 8], "promiseCallback", "micro") },
        names: [
            { name: "timerCallback", kind: "task" },
            { name: "promiseCallback", kind: "micro" },
        ],
        startLabel: "Run the example",
        isKeyMoment: (state) => state.event.type === "run" && state.event.from === "micro",
        figcaption:
            "The example above, run one event at a time. Add a timer or a microtask while it runs to see where each one waits.",
    },
    "blocked-timer": {
        program: blockedTimerExample,
        source: blockedTimerExampleSource,
        fileName: "blocked.js",
        lineOwners: owned([2, 3, 4], "callback", "task"),
        names: [{ name: "callback", kind: "task" }],
        simOptions: { stepCost: 0 },
        secondsPerTick: 1,
        startLabel: "Run the blocked timer",
        isKeyMoment: (state) => state.event.type === "busy" && state.tasks.length > 0,
        figcaption:
            "The example above with one step standing for one second. The timer finishes at five seconds, but its callback waits for the loop.",
    },
} as const satisfies Record<string, FigureExample>;

export type FigureExampleName = keyof typeof figureExamples;

export function isFigureExampleName(value: unknown): value is FigureExampleName {
    return typeof value === "string" && Object.hasOwn(figureExamples, value);
}
