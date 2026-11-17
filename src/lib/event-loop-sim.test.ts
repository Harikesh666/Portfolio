import { describe, expect, it } from "vitest";
import {
    addMicrotask,
    addTimer,
    createSim,
    eventLoopExample,
    isSettled,
    step,
    type CallbackSpec,
    type SimState,
} from "./event-loop-sim";

function runToEnd(state: SimState, limit = 100) {
    let current = state;
    for (let index = 0; index < limit && !isSettled(current); index += 1) current = step(current);
    return current;
}

describe("event-loop simulator", () => {
    it("prints the guide's order: Start, End, Promise, Timer", () => {
        const end = runToEnd(createSim(eventLoopExample));
        expect(end.log.map((line) => line.text)).toEqual(["Start", "End", "Promise", "Timer"]);
        expect(end.log.map((line) => line.kind)).toEqual(["script", "script", "micro", "task"]);
    });

    it("moves the finished timer to the task queue while the script is still running", () => {
        let state = createSim(eventLoopExample);
        const events: string[] = [];
        while (!isSettled(state)) {
            state = step(state);
            events.push(state.event.type);
        }
        const timerDone = events.indexOf("timer-done");
        const scriptReturn = events.indexOf("return");
        expect(timerDone).toBeGreaterThan(-1);
        expect(timerDone).toBeLessThan(scriptReturn);
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

    it("records which kind of job held the stack on every tick", () => {
        const end = runToEnd(createSim(eventLoopExample));
        expect(end.history.length).toBe(end.tick + 1);
        expect(end.history[0]).toBe("script");
        expect(end.history).toContain("micro");
        expect(end.history).toContain("task");
    });
});
