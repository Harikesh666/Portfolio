import type { ReactNode } from "react";
import type { JobKind, SimState } from "../../lib/event-loop-sim";

/** A job's name, coloured like its pill, its route and its console lines. */
export function JobName({ kind, children }: Readonly<{ kind: JobKind; children: ReactNode }>) {
    return (
        <span className="el-name" data-kind={kind}>
            {children}
        </span>
    );
}

/** One plain sentence for the event that just happened. */
export function describeEvent(state: SimState): ReactNode {
    const event = state.event;
    switch (event.type) {
        case "start":
            return "The script starts. It runs as one task, top to bottom.";
        case "exec": {
            const instruction = event.instruction;
            if (instruction.op === "log") {
                return (
                    <>
                        <JobName kind={event.job.kind}>{event.job.label}</JobName> logs “{instruction.text}”.
                    </>
                );
            }
            if (instruction.op === "timer") {
                return (
                    <>
                        <span className="el-name">setTimeout</span> hands{" "}
                        <JobName kind="task">{instruction.callback.label}</JobName> to the browser’s timer and moves on.
                    </>
                );
            }
            return (
                <>
                    The promise is already resolved, so <JobName kind="micro">{instruction.callback.label}</JobName> joins the
                    microtask queue.
                </>
            );
        }
        case "timer-done":
            return (
                <>
                    The timer is done. <JobName kind="task">{event.job.label}</JobName> waits in the task queue.
                </>
            );
        case "return":
            if (event.job.kind === "script") return "The script ends. The call stack is empty.";
            return (
                <>
                    <JobName kind={event.job.kind}>{event.job.label}</JobName> returns.
                    {event.job.kind === "micro" &&
                        (state.micro.length > 0 ? " More microtasks are waiting." : " No microtasks are left.")}
                </>
            );
        case "run":
            return event.from === "micro" ? (
                <>
                    The stack is empty, so the loop drains microtasks first: <JobName kind="micro">{event.job.label}</JobName> runs.
                </>
            ) : (
                <>
                    No microtasks are left. Only now does the loop take a task: <JobName kind="task">{event.job.label}</JobName>.
                </>
            );
        case "idle":
            return "Both queues are empty. The loop waits for new work.";
    }
}

/** The source line to highlight for the current event, or null. */
export function activeLine(state: SimState): number | null {
    const event = state.event;
    if (event.type === "exec") return event.instruction.line >= 0 ? event.instruction.line : null;
    if (event.type === "run") return event.job.line >= 0 ? event.job.line : null;
    return null;
}
