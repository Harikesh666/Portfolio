import { describe, expect, it } from "vitest";
import {
    addMicrotask,
    addTimer,
    blockedTimerExample,
    createSim,
    eventLoopExample,
    isSettled,
    letLoopExample,
    step,
    type CallbackSpec,
    type SimState,
    varLoopExample,
} from "./event-loop-sim";

function runToEnd(state: SimState, limit = 200) {
    let current = state;
    for (let index = 0; index < limit && !isSettled(current); index += 1) current = step(current);
    return current;
}

function allStates(start: SimState) {
    const states = [start];
    while (!isSettled(states.at(-1)!)) states.push(step(states.at(-1)!));
    return states;
}

describe("event-loop simulator", () => {
    it("prints the event-loop guide's order: Start, End, Promise, Timer", () => {
        const end = runToEnd(createSim(eventLoopExample));
        expect(end.log.map((line) => line.text)).toEqual(["Start", "End", "Promise", "Timer"]);
        expect(end.log.map((line) => line.kind)).toEqual(["script", "script", "micro", "task"]);
    });

    it("hands the finished timer to the task queue while the script is still running", () => {
        const states = allStates(createSim(eventLoopExample));
        const arrival = states.findIndex((state) => state.arrivals.length > 0);
        const scriptReturn = states.findIndex((state) => state.event.type === "return");
        expect(arrival).toBeGreaterThan(-1);
        expect(arrival).toBeLessThan(scriptReturn);
    });

    it("drains microtasks that queue more microtasks before the next task", () => {
        const program: CallbackSpec = {
            label: "script",
            line: -1,
            body: [
                {
                    op: "microtask",
                    line: 0,
                    callback: {
                        label: "first",
                        line: 0,
                        body: [
                            { op: "log", line: 1, text: "First microtask" },
                            { op: "microtask", line: 2, callback: { label: "second", line: 2, body: [{ op: "log", line: 3, text: "Second microtask" }] } },
                        ],
                    },
                },
                { op: "timer", line: 5, delay: 0, callback: { label: "timer", line: 5, body: [{ op: "log", line: 6, text: "Timer task" }] } },
            ],
        };
        const end = runToEnd(createSim(program));
        expect(end.log.map((line) => line.text)).toEqual(["First microtask", "Second microtask", "Timer task"]);
    });

    it("runs work a reader adds: microtasks before timers", () => {
        let state = runToEnd(createSim(eventLoopExample));
        state = addTimer(state, "extraTimer");
        state = addMicrotask(state, "extraMicrotask");
        const end = runToEnd(state);
        expect(end.log.slice(-2).map((line) => line.text)).toEqual(["extraMicrotask", "extraTimer"]);
    });

    it("records which kind of job held the stack on every tick, and when each line logged", () => {
        const end = runToEnd(createSim(eventLoopExample));
        expect(end.history.length).toBe(end.tick + 1);
        expect(end.history[0]).toBe("script");
        expect(end.history).toContain("micro");
        expect(end.history).toContain("task");
        const ticks = end.log.map((line) => line.tick);
        expect([...ticks].sort((a, b) => a - b)).toEqual(ticks);
    });

    it("makes a 5-second timer wait for a 10-second loop, as the trust-issues guide says", () => {
        const states = allStates(createSim(blockedTimerExample, { stepCost: 0 }));
        const end = states.at(-1)!;
        expect(end.log.map((line) => line.text)).toEqual(["Start", "End", "While loop finished", "Callback"]);
        // Statements are free here, so only the loop moves the clock: Start and End at 0s, the rest at 10s.
        expect(end.log.map((line) => line.time)).toEqual([0, 0, 10, 10]);

        const arrival = states.find((state) => state.arrivals.length > 0)!;
        const run = states.find((state) => state.event.type === "run" && state.event.from === "task")!;
        const callback = arrival.arrivals[0];
        // The timer finishes on time, five seconds after it started, while the loop is still running...
        expect(arrival.time - callback.scheduledAt!).toBe(5);
        expect(arrival.event.type).toBe("busy");
        // ...but the callback only starts once the loop and the script are done: after ten seconds.
        expect(run.time - callback.scheduledAt!).toBe(10);
    });

    it("lets time pass while the loop waits on a timer, even when statements are free", () => {
        const program: CallbackSpec = {
            label: "script",
            line: -1,
            body: [{ op: "timer", line: 0, delay: 3, callback: { label: "later", line: 0, body: [{ op: "log", line: 1, text: "Later" }] } }],
        };
        const end = runToEnd(createSim(program, { stepCost: 0 }));
        expect(end.log).toEqual([expect.objectContaining({ text: "Later", time: 3 })]);
    });

    it("runs the var loop: Namaste, then 6 five times, one per second", () => {
        let state = createSim(varLoopExample, { stepCost: 0 });
        while (!isSettled(state)) state = step(state);
        expect(state.log.map((line) => line.text)).toEqual(["Namaste", "6", "6", "6", "6", "6"]);
        expect(state.log.slice(1).map((line) => line.time)).toEqual([1, 2, 3, 4, 5]);
        expect(state.envs).toEqual([{ id: "x", label: "x environment", vars: { i: 6 } }]);
        expect(state.closures.x).toHaveLength(5);
    });

    it("runs the let loop: Namaste, then 1 to 5, each callback with its own binding", () => {
        let state = createSim(letLoopExample, { stepCost: 0 });
        while (!isSettled(state)) state = step(state);
        expect(state.log.map((line) => line.text)).toEqual(["Namaste", "1", "2", "3", "4", "5"]);
        expect(state.envs.map((env) => env.vars.i)).toEqual([1, 2, 3, 4, 5, 6]);
        expect(state.closures["iteration-3"]).toEqual(["callback 3"]);
        expect(state.closures["iteration-6"]).toBeUndefined();
    });

    it("marks the binding each step reads or writes", () => {
        let state = createSim(varLoopExample, { stepCost: 0 });
        state = step(state);
        expect(state.touched).toEqual({ env: "x", name: "i", write: true });
        while (!(state.event.type === "exec" && state.event.instruction.op === "log" && state.event.job.kind === "task")) {
            state = step(state);
        }
        expect(state.touched).toEqual({ env: "x", name: "i", write: false });
    });
});
