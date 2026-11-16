export type JobKind = "task" | "micro";

export type Job = Readonly<{ id: number; kind: JobKind }>;

/**
 * The event-loop rules the pond acts out, kept free of rendering so they
 * can be tested on their own:
 *
 * - The call stack runs one job at a time.
 * - When the stack empties, every queued microtask runs before the next
 *   task, including microtasks queued while those microtasks run.
 */
export class EventLoopModel {
    readonly taskQueue: Job[] = [];
    readonly microQueue: Job[] = [];
    running: Job | null = null;

    enqueue(job: Job) {
        (job.kind === "micro" ? this.microQueue : this.taskQueue).push(job);
    }

    /** Picks the next job when the stack is empty; null when busy or idle. */
    next(): Job | null {
        if (this.running) return null;
        this.running = this.microQueue.shift() ?? this.taskQueue.shift() ?? null;
        return this.running;
    }

    finish(): Job | null {
        const finished = this.running;
        this.running = null;
        return finished;
    }

    /** Zero-based place in line, or -1 when the job is not waiting. */
    position(job: Job): number {
        const queue = job.kind === "micro" ? this.microQueue : this.taskQueue;
        return queue.indexOf(job);
    }
}
