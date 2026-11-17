/**
 * A tiny, deterministic event-loop simulator for the guide's figures. It is
 * a teaching model, not a browser: one call stack, a microtask queue, a task
 * queue and timers held by "web APIs". Each `step` is one tick of time and
 * one visible thing on the stack, so a diagram can animate it and a caption
 * can explain it. Time is kept apart from ticks: by default every tick costs
 * one unit, but a program can make ordinary statements free so only real
 * work (and waiting) moves the clock. Timers count down in that time,
 * alongside JavaScript as the browser's timer does, and hand their
 * callbacks to the task queue during any tick.
 *
 * The loop's rule, as the guides state it: run the current job to the end;
 * when the stack is empty, drain every microtask; only then take one task.
 */

export type JobKind = "script" | "micro" | "task";

export type Instruction =
    | Readonly<{ op: "log"; line: number; text: string }>
    | Readonly<{ op: "timer"; line: number; callback: CallbackSpec; delay: number }>
    | Readonly<{ op: "microtask"; line: number; callback: CallbackSpec }>
    /** Synchronous work that keeps the stack busy for `ticks` ticks, like a long loop. */
    | Readonly<{ op: "work"; line: number; ticks: number }>;

export type CallbackSpec = Readonly<{
    label: string;
    /** Source line of the function's header, highlighted when it starts running. */
    line: number;
    body: readonly Instruction[];
}>;

export type Job = Readonly<{
    id: string;
    label: string;
    kind: JobKind;
    line: number;
    body: readonly Instruction[];
    /** Index of the next instruction to run. */
    pc: number;
    /** Ticks left on the current `work` instruction, while it runs. */
    busyLeft?: number;
    /** For timer callbacks: the time the timer started and the delay it asked for. */
    scheduledAt?: number;
    delay?: number;
}>;

export type Timer = Readonly<{ job: Job; remaining: number }>;

export type LogLine = Readonly<{ text: string; kind: JobKind; tick: number; time: number }>;

export type SimEvent =
    | Readonly<{ type: "start"; job: Job }>
    | Readonly<{ type: "exec"; job: Job; instruction: Instruction }>
    | Readonly<{ type: "busy"; job: Job; instruction: Instruction; remaining: number }>
    | Readonly<{ type: "timer-done"; job: Job }>
    | Readonly<{ type: "return"; job: Job }>
    | Readonly<{ type: "run"; job: Job; from: "micro" | "task" }>
    | Readonly<{ type: "idle" }>;

export type SimOptions = Readonly<{
    /** Time an ordinary step costs. `work` ticks and waiting always cost 1. Default 1. */
    stepCost?: number;
}>;

export type SimState = Readonly<{
    tick: number;
    /** Simulated time, in the program's units (seconds for the timer examples). */
    time: number;
    stepCost: number;
    stack: readonly Job[];
    micro: readonly Job[];
    tasks: readonly Job[];
    timers: readonly Timer[];
    log: readonly LogLine[];
    /** Which kind of job held the stack after each tick (null when empty), for the timeline. */
    history: readonly (JobKind | null)[];
    event: SimEvent;
    /** Timer callbacks that reached the task queue during this tick, alongside the event. */
    arrivals: readonly Job[];
    nextId: number;
}>;

function makeJob(spec: CallbackSpec, kind: JobKind, id: number): Job {
    return { id: `job-${id}`, label: spec.label, kind, line: spec.line, body: spec.body, pc: 0 };
}

/** A fresh simulation with the script on the stack, about to run its first line. */
export function createSim(script: CallbackSpec, options: SimOptions = {}): SimState {
    const job = makeJob(script, "script", 0);
    return {
        tick: 0,
        time: 0,
        stepCost: options.stepCost ?? 1,
        stack: [job],
        micro: [],
        tasks: [],
        timers: [],
        log: [],
        history: ["script"],
        event: { type: "start", job },
        arrivals: [],
        nextId: 1,
    };
}

/** True when nothing is running, queued or waiting on a timer. */
export function isSettled(state: SimState) {
    return (
        state.stack.length === 0 &&
        state.micro.length === 0 &&
        state.tasks.length === 0 &&
        state.timers.length === 0
    );
}

/** Advances the simulation by one tick. */
export function step(state: SimState): SimState {
    let { stack, micro, tasks, log, nextId } = state;
    const tick = state.tick + 1;
    const newTimers: Timer[] = [];

    let event: SimEvent | null;
    let cost = state.stepCost;
    const top = stack.at(-1);
    const replaceTop = (job: Job) => [...stack.slice(0, -1), job];

    if (top && top.pc < top.body.length) {
        const instruction = top.body[top.pc];
        if (instruction.op === "work") {
            const remaining = (top.busyLeft ?? instruction.ticks) - 1;
            const job: Job =
                remaining > 0 ? { ...top, busyLeft: remaining } : { ...top, pc: top.pc + 1, busyLeft: undefined };
            stack = replaceTop(job);
            cost = 1;
            event = { type: "busy", job, instruction, remaining };
        } else {
            const job: Job = { ...top, pc: top.pc + 1 };
            stack = replaceTop(job);
            if (instruction.op === "log") {
                log = [...log, { text: instruction.text, kind: top.kind, tick, time: state.time + cost }];
            } else if (instruction.op === "timer") {
                const callback: Job = {
                    ...makeJob(instruction.callback, "task", nextId),
                    scheduledAt: state.time + cost,
                    delay: instruction.delay,
                };
                // A zero delay still waits at least one unit: the timer always goes through the browser.
                newTimers.push({ job: callback, remaining: Math.max(1, instruction.delay) });
                nextId += 1;
            } else {
                micro = [...micro, makeJob(instruction.callback, "micro", nextId)];
                nextId += 1;
            }
            event = { type: "exec", job, instruction };
        }
    } else if (top) {
        stack = stack.slice(0, -1);
        event = { type: "return", job: top };
    } else if (micro.length > 0) {
        // The stack is empty, so the loop drains microtasks before anything else.
        const [job, ...rest] = micro;
        micro = rest;
        stack = [job];
        event = { type: "run", job, from: "micro" };
    } else if (tasks.length > 0) {
        const [job, ...rest] = tasks;
        tasks = rest;
        stack = [job];
        event = { type: "run", job, from: "task" };
    } else {
        // Nothing to run: the loop waits, and waiting always lets time pass.
        cost = 1;
        event = null;
    }

    // The browser's timers run alongside JavaScript: finished ones hand their callbacks to the task queue.
    const counted = state.timers.map((timer) => ({ ...timer, remaining: timer.remaining - cost }));
    const arrivals = counted.filter((timer) => timer.remaining <= 0).map((timer) => timer.job);
    const timers = [...counted.filter((timer) => timer.remaining > 0), ...newTimers];
    tasks = [...tasks, ...arrivals];
    if (!event) event = arrivals.length > 0 ? { type: "timer-done", job: arrivals[0] } : { type: "idle" };

    return {
        tick,
        time: state.time + cost,
        stepCost: state.stepCost,
        stack,
        micro,
        tasks,
        timers,
        log,
        history: [...state.history, stack.at(-1)?.kind ?? null],
        event,
        arrivals,
        nextId,
    };
}

/** Starts a timer from outside the program, as a reader's button might. */
export function addTimer(state: SimState, label: string, delay = 2): SimState {
    const job: Job = {
        ...makeJob({ label, line: -1, body: [{ op: "log", line: -1, text: label }] }, "task", state.nextId),
        scheduledAt: state.time,
        delay,
    };
    return { ...state, timers: [...state.timers, { job, remaining: delay }], nextId: state.nextId + 1 };
}

/** Queues a microtask from outside the program. */
export function addMicrotask(state: SimState, label: string): SimState {
    const job = makeJob({ label, line: -1, body: [{ op: "log", line: -1, text: label }] }, "micro", state.nextId);
    return { ...state, micro: [...state.micro, job], nextId: state.nextId + 1 };
}

/**
 * The event-loop guide's example from "Tasks and microtasks are not the
 * same", line for line. Line numbers index `eventLoopExampleSource`.
 */
export const eventLoopExample: CallbackSpec = {
    label: "script",
    line: -1,
    body: [
        { op: "log", line: 0, text: "Start" },
        {
            op: "timer",
            line: 2,
            delay: 0,
            callback: { label: "timerCallback", line: 2, body: [{ op: "log", line: 3, text: "Timer" }] },
        },
        {
            op: "microtask",
            line: 6,
            callback: { label: "promiseCallback", line: 6, body: [{ op: "log", line: 7, text: "Promise" }] },
        },
        { op: "log", line: 10, text: "End" },
    ],
};

export const eventLoopExampleSource = [
    'console.log("Start");',
    "",
    "setTimeout(function timerCallback() {",
    '    console.log("Timer");',
    "}, 0);",
    "",
    "Promise.resolve().then(function promiseCallback() {",
    '    console.log("Promise");',
    "});",
    "",
    'console.log("End");',
] as const;

/**
 * The "setTimeout Has Trust Issues" guide's blocked-timer example, with one
 * tick standing for one second: a 5-second timer, then a loop that keeps
 * the stack busy for about 10 seconds.
 */
export const blockedTimerExample: CallbackSpec = {
    label: "script",
    line: -1,
    body: [
        { op: "log", line: 0, text: "Start" },
        {
            op: "timer",
            line: 2,
            delay: 5,
            callback: { label: "callback", line: 2, body: [{ op: "log", line: 3, text: "Callback" }] },
        },
        { op: "log", line: 6, text: "End" },
        { op: "work", line: 12, ticks: 10 },
        { op: "log", line: 16, text: "While loop finished" },
    ],
};

export const blockedTimerExampleSource = [
    'console.log("Start");',
    "",
    "setTimeout(function callback() {",
    '    console.log("Callback");',
    "}, 5000);",
    "",
    'console.log("End");',
    "",
    "const startTime = Date.now();",
    "let currentTime = startTime;",
    "",
    "// Block the main thread for about 10 seconds.",
    "while (currentTime < startTime + 10_000) {",
    "    currentTime = Date.now();",
    "}",
    "",
    'console.log("While loop finished");',
] as const;
