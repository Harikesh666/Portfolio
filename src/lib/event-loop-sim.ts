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

export type Value = number | string;

/**
 * Every instruction may carry a `note`: the caption for the tick it runs in,
 * written for the guide it belongs to.
 */
export type Instruction =
    /** Logs `text`, or the value of `read` looked up in the running job's closure. */
    | Readonly<{ op: "log"; line: number; text?: string; read?: string; note?: string }>
    /** Starts a timer; its callback closes over `env` (default: the running job's closure). */
    | Readonly<{ op: "timer"; line: number; callback: CallbackSpec; delay: number; env?: string; note?: string }>
    | Readonly<{ op: "microtask"; line: number; callback: CallbackSpec; env?: string; note?: string }>
    /** Synchronous work that keeps the stack busy for `ticks` ticks, like a long loop. */
    | Readonly<{ op: "work"; line: number; ticks: number; note?: string }>
    /** Creates a binding, and its environment if it is new (a `let` loop's fresh iteration, say). */
    | Readonly<{ op: "bind"; line: number; env: string; envLabel: string; name: string; value: Value; note?: string }>
    /** Changes an existing binding. */
    | Readonly<{ op: "set"; line: number; env: string; name: string; value: Value; note?: string }>;

/** A scope: a labelled set of bindings, like "x() scope" or "iteration 2". */
export type Env = Readonly<{ id: string; label: string; vars: Readonly<Record<string, Value>> }>;

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
    /** The environment this job's code reads variables from: its closure. */
    env?: string;
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
    /** Scopes created so far, in order. */
    envs: readonly Env[];
    /** The binding this tick read or wrote, for the bindings panel to light up. */
    touched: Readonly<{ env: string; name: string; write: boolean }> | null;
    /** Labels of the callbacks closing over each environment. */
    closures: Readonly<Record<string, readonly string[]>>;
    nextId: number;
}>;

function makeJob(spec: CallbackSpec, kind: JobKind, id: number, env?: string): Job {
    return { id: `job-${id}`, label: spec.label, kind, line: spec.line, body: spec.body, pc: 0, env };
}

function writeBinding(envs: readonly Env[], id: string, label: string, name: string, value: Value): readonly Env[] {
    const existing = envs.find((env) => env.id === id);
    if (!existing) return [...envs, { id, label, vars: { [name]: value } }];
    return envs.map((env) => (env.id === id ? { ...env, vars: { ...env.vars, [name]: value } } : env));
}

/** A fresh simulation with the script on the stack, about to run its first line. */
export function createSim(script: CallbackSpec, options: SimOptions = {}): SimState {
    const job = makeJob(script, "script", 0, "global");
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
        envs: [],
        touched: null,
        closures: {},
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
    let { stack, micro, tasks, log, nextId, envs, closures } = state;
    let touched: SimState["touched"] = null;
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
                let text = instruction.text ?? "";
                if (instruction.read && top.env) {
                    const value = envs.find((env) => env.id === top.env)?.vars[instruction.read];
                    text = String(value);
                    touched = { env: top.env, name: instruction.read, write: false };
                }
                log = [...log, { text, kind: top.kind, tick, time: state.time + cost }];
            } else if (instruction.op === "timer" || instruction.op === "microtask") {
                const env = instruction.env ?? top.env;
                if (env) closures = { ...closures, [env]: [...(closures[env] ?? []), instruction.callback.label] };
                if (instruction.op === "timer") {
                    const callback: Job = {
                        ...makeJob(instruction.callback, "task", nextId, env),
                        scheduledAt: state.time + cost,
                        delay: instruction.delay,
                    };
                    // A zero delay still waits at least one unit: the timer always goes through the browser.
                    newTimers.push({ job: callback, remaining: Math.max(1, instruction.delay) });
                } else {
                    micro = [...micro, makeJob(instruction.callback, "micro", nextId, env)];
                }
                nextId += 1;
            } else if (instruction.op === "bind") {
                envs = writeBinding(envs, instruction.env, instruction.envLabel, instruction.name, instruction.value);
                touched = { env: instruction.env, name: instruction.name, write: true };
            } else if (instruction.op === "set") {
                const label = envs.find((env) => env.id === instruction.env)?.label ?? instruction.env;
                envs = writeBinding(envs, instruction.env, label, instruction.name, instruction.value);
                touched = { env: instruction.env, name: instruction.name, write: true };
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
        envs,
        touched,
        closures,
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

/**
 * The guide's var/let loop (`settimeout-closures-var-let-loop`, Examples 3 and 4),
 * with one unit of time standing for one second. Every step carries the guide's
 * own explanation as its note.
 */
function closureLoop(keyword: "var" | "let"): CallbackSpec {
    const shared = keyword === "var";
    const envOf = (iteration: number) => (shared ? "x" : `iteration-${iteration}`);
    const body: Instruction[] = [
        {
            op: "bind",
            line: 1,
            env: envOf(1),
            envLabel: shared ? "x environment" : "iteration 1",
            name: "i",
            value: 1,
            note: shared
                ? "The loop starts. var is function-scoped, so x gets one i binding for the whole loop. It holds 1."
                : "The loop starts. With let, the first iteration gets its own i binding. It holds 1.",
        },
    ];
    for (let iteration = 1; iteration <= 5; iteration += 1) {
        const label = `callback ${iteration}`;
        body.push({
            op: "timer",
            line: 2,
            delay: iteration,
            env: envOf(iteration),
            note: shared
                ? `setTimeout schedules ${label} for ${iteration * 1000}ms. It closes over the shared i binding, not over its value.`
                : `setTimeout schedules ${label} for ${iteration * 1000}ms. It closes over the i binding of iteration ${iteration}.`,
            callback: {
                label,
                line: 2,
                body: [
                    {
                        op: "log",
                        line: 3,
                        read: "i",
                        note: shared
                            ? `${label} reads i. There is only one i binding, and the loop left it at 6.`
                            : `${label} reads i from its own iteration's binding, which still holds ${iteration}.`,
                    },
                ],
            },
        });
        const next = iteration + 1;
        const ends = next > 5 ? ` The condition ${next} <= 5 is false, so the loop stops.` : "";
        body.push(
            shared
                ? {
                      op: "set",
                      line: 1,
                      env: "x",
                      name: "i",
                      value: next,
                      note: `i++ changes the same binding to ${next}. Every callback sees the change.${ends}`,
                  }
                : {
                      op: "bind",
                      line: 1,
                      env: envOf(next),
                      envLabel: `iteration ${next}`,
                      name: "i",
                      value: next,
                      note: `JavaScript creates a fresh binding for the next iteration and i++ makes it ${next}.${ends}`,
                  },
        );
    }
    body.push({
        op: "log",
        line: 7,
        text: "Namaste",
        note: "The loop is done, so Namaste logs first. No timer has finished yet.",
    });
    return { label: "x()", line: -1, body };
}

export const varLoopExample = closureLoop("var");
export const letLoopExample = closureLoop("let");

const loopSource = (keyword: "var" | "let") =>
    [
        "function x() {",
        `    for (${keyword} i = 1; i <= 5; i++) {`,
        "        setTimeout(function () {",
        "            console.log(i);",
        "        }, i * 1000);",
        "    }",
        "",
        '    console.log("Namaste");',
        "}",
        "",
        "x();",
    ] as const;

export const varLoopExampleSource = loopSource("var");
export const letLoopExampleSource = loopSource("let");
