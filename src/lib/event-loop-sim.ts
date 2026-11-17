/**
 * A tiny, deterministic event-loop simulator for the guide's figures. It is
 * a teaching model, not a browser: one call stack, a microtask queue, a task
 * queue and timers held by "web APIs". Each `step` performs exactly one
 * visible thing, so a diagram can animate it and a caption can explain it.
 *
 * The loop's rule, as the guide states it: run the current job to the end;
 * when the stack is empty, drain every microtask; only then take one task.
 */

export type JobKind = "script" | "micro" | "task";

export type Instruction =
    | Readonly<{ op: "log"; line: number; text: string }>
    | Readonly<{ op: "timer"; line: number; callback: CallbackSpec; delay: number }>
    | Readonly<{ op: "microtask"; line: number; callback: CallbackSpec }>;

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
}>;

export type Timer = Readonly<{ job: Job; remaining: number }>;

export type LogLine = Readonly<{ text: string; kind: JobKind }>;

export type SimEvent =
    | Readonly<{ type: "start"; job: Job }>
    | Readonly<{ type: "exec"; job: Job; instruction: Instruction }>
    | Readonly<{ type: "timer-done"; job: Job }>
    | Readonly<{ type: "return"; job: Job }>
    | Readonly<{ type: "run"; job: Job; from: "micro" | "task" }>
    | Readonly<{ type: "idle" }>;

export type SimState = Readonly<{
    tick: number;
    stack: readonly Job[];
    micro: readonly Job[];
    tasks: readonly Job[];
    timers: readonly Timer[];
    log: readonly LogLine[];
    /** Which kind of job held the stack after each tick (null when empty), for the timeline. */
    history: readonly (JobKind | null)[];
    event: SimEvent;
    nextId: number;
}>;

function makeJob(spec: CallbackSpec, kind: JobKind, id: number): Job {
    return { id: `job-${id}`, label: spec.label, kind, line: spec.line, body: spec.body, pc: 0 };
}

/** A fresh simulation with the script on the stack, about to run its first line. */
export function createSim(script: CallbackSpec): SimState {
    const job = makeJob(script, "script", 0);
    return {
        tick: 0,
        stack: [job],
        micro: [],
        tasks: [],
        timers: [],
        log: [],
        history: ["script"],
        event: { type: "start", job },
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

/** Advances the simulation by one visible event. */
export function step(state: SimState): SimState {
    let { stack, micro, tasks, timers, log, nextId } = state;
    let event: SimEvent;

    const due = timers.find((timer) => timer.remaining <= 0);
    if (due) {
        // A finished timer hands its callback to the task queue. That is this tick's event.
        timers = timers.filter((timer) => timer !== due);
        tasks = [...tasks, due.job];
        event = { type: "timer-done", job: due.job };
    } else {
        timers = timers.map((timer) => ({ ...timer, remaining: timer.remaining - 1 }));
        const top = stack.at(-1);

        if (top && top.pc < top.body.length) {
            const instruction = top.body[top.pc];
            const advanced: Job = { ...top, pc: top.pc + 1 };
            stack = [...stack.slice(0, -1), advanced];
            if (instruction.op === "log") {
                log = [...log, { text: instruction.text, kind: top.kind }];
            } else if (instruction.op === "timer") {
                timers = [...timers, { job: makeJob(instruction.callback, "task", nextId), remaining: instruction.delay }];
                nextId += 1;
            } else {
                micro = [...micro, makeJob(instruction.callback, "micro", nextId)];
                nextId += 1;
            }
            event = { type: "exec", job: advanced, instruction };
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
            event = { type: "idle" };
        }
    }

    return {
        tick: state.tick + 1,
        stack,
        micro,
        tasks,
        timers,
        log,
        history: [...state.history, stack.at(-1)?.kind ?? null],
        event,
        nextId,
    };
}

/** Starts a timer from outside the program, as a reader's button might. */
export function addTimer(state: SimState, label: string, delay = 2): SimState {
    const job = makeJob({ label, line: -1, body: [{ op: "log", line: -1, text: label }] }, "task", state.nextId);
    return { ...state, timers: [...state.timers, { job, remaining: delay }], nextId: state.nextId + 1 };
}

/** Queues a microtask from outside the program. */
export function addMicrotask(state: SimState, label: string): SimState {
    const job = makeJob({ label, line: -1, body: [{ op: "log", line: -1, text: label }] }, "micro", state.nextId);
    return { ...state, micro: [...state.micro, job], nextId: state.nextId + 1 };
}

/**
 * The guide's example from "Tasks and microtasks are not the same", line for
 * line. Line numbers index `eventLoopExampleSource`.
 */
export const eventLoopExample: CallbackSpec = {
    label: "script",
    line: -1,
    body: [
        { op: "log", line: 0, text: "Start" },
        {
            op: "timer",
            line: 2,
            delay: 1,
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
