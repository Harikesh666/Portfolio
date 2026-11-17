import type { ReactNode } from "react";
import type { Job, JobKind, SimState } from "../../lib/event-loop-sim";

/** A job's name, coloured like its pill, its route and its console lines. */
export function JobName({ kind, children }: Readonly<{ kind: JobKind; children: ReactNode }>) {
    return (
        <span className="el-name" data-kind={kind}>
            {children}
        </span>
    );
}

export type CaptionOptions = Readonly<{
    /** When set, one unit of simulated time is this many seconds and captions speak in seconds. */
    secondsPerTick?: number;
}>;

function duration(ticks: number, options: CaptionOptions) {
    if (!options.secondsPerTick) return `${ticks} tick${ticks === 1 ? "" : "s"}`;
    const seconds = ticks * options.secondsPerTick;
    return `${seconds} second${seconds === 1 ? "" : "s"}`;
}

function arrivalNote(state: SimState): ReactNode {
    if (state.arrivals.length === 0 || state.event.type === "timer-done") return null;
    const job = state.arrivals[0];
    return (
        <>
            {" "}
            Meanwhile the timer finishes, so <JobName kind="task">{job.label}</JobName> joins the task queue.
        </>
    );
}

function taskWait(job: Job, state: SimState, options: CaptionOptions): ReactNode {
    if (job.scheduledAt === undefined || job.delay === undefined || !options.secondsPerTick) return null;
    const asked = job.delay * options.secondsPerTick;
    const waited = (state.time - job.scheduledAt) * options.secondsPerTick;
    if (waited <= asked) return null;
    return ` It asked for ${asked} seconds and starts after ${waited}.`;
}

/** One plain sentence (two at most) for what just happened. */
export function describeEvent(state: SimState, options: CaptionOptions = {}): ReactNode {
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
                        {arrivalNote(state)}
                    </>
                );
            }
            if (instruction.op === "timer") {
                return (
                    <>
                        <span className="el-name">setTimeout</span> hands{" "}
                        <JobName kind="task">{instruction.callback.label}</JobName> to the browser’s timer and moves on.
                        {arrivalNote(state)}
                    </>
                );
            }
            if (instruction.op === "microtask") {
                return (
                    <>
                        The promise is already resolved, so <JobName kind="micro">{instruction.callback.label}</JobName> joins
                        the microtask queue.
                        {arrivalNote(state)}
                    </>
                );
            }
            // `work` reports as "busy" ticks, never as an exec.
            return null;
        }
        case "busy":
            return (
                <>
                    {event.remaining > 0
                        ? `The loop keeps the call stack busy, ${duration(event.remaining, options)} to go. Nothing else can run.`
                        : "The loop finally ends."}
                    {arrivalNote(state)}
                </>
            );
        case "timer-done":
            return (
                <>
                    The timer is done. <JobName kind="task">{event.job.label}</JobName> waits in the task queue.
                </>
            );
        case "return":
            if (event.job.kind === "script") return <>The script ends. The call stack is empty.{arrivalNote(state)}</>;
            return (
                <>
                    <JobName kind={event.job.kind}>{event.job.label}</JobName> returns.
                    {event.job.kind === "micro" &&
                        (state.micro.length > 0 ? " More microtasks are waiting." : " No microtasks are left.")}
                    {arrivalNote(state)}
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
                    {taskWait(event.job, state, options)}
                </>
            );
        case "idle":
            return "Both queues are empty. The loop waits for new work.";
    }
}

/** The source line to highlight for the current event, or null. */
export function activeLine(state: SimState): number | null {
    const event = state.event;
    if (event.type === "exec" || event.type === "busy") return event.instruction.line >= 0 ? event.instruction.line : null;
    if (event.type === "run") return event.job.line >= 0 ? event.job.line : null;
    return null;
}
