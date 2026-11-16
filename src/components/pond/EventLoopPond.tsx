import { Pond, type PondLabel } from "./Pond";

const labels: ReadonlyArray<PondLabel> = [
    { text: "web APIs", className: "left-[14%] top-[45%]" },
    { text: "microtasks", className: "left-[45%] top-[calc(24%-1.5rem)]" },
    { text: "task queue", className: "left-[40%] top-[calc(77%+0.9rem)]" },
    { text: "call stack", className: "left-[80%] top-[calc(25%-1.5rem)]" },
];

/** The event loop acted out by koi, for the event-loop guide. */
export function EventLoopPond() {
    return (
        <Pond
            caption="Each fish is a task. Tasks wait in line and enter the call stack one at a time, and microtasks always cut in first. Click the pond to queue a timer."
            description="An animated pond acting out the JavaScript event loop. Fish are tasks: they wait in the task queue and swim into the call stack one at a time, and small microtask fish always go before the next task."
            labels={labels}
            mode="event-loop"
        />
    );
}
