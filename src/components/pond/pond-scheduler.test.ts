import { describe, expect, it } from "vitest";
import { EventLoopModel, type Job } from "./pond-scheduler";

const task = (id: number): Job => ({ id, kind: "task" });
const micro = (id: number): Job => ({ id, kind: "micro" });

function drain(model: EventLoopModel, onRun?: (job: Job) => void) {
    const order: number[] = [];
    for (let job = model.next(); job; job = model.next()) {
        order.push(job.id);
        onRun?.(job);
        model.finish();
    }
    return order;
}

describe("EventLoopModel", () => {
    it("runs one job at a time", () => {
        const model = new EventLoopModel();
        model.enqueue(task(1));
        model.enqueue(task(2));

        expect(model.next()?.id).toBe(1);
        expect(model.next()).toBeNull();
        model.finish();
        expect(model.next()?.id).toBe(2);
    });

    it("drains microtasks queued by a task before the next task", () => {
        const model = new EventLoopModel();
        model.enqueue(task(1));
        model.enqueue(task(2));

        const order = drain(model, (job) => {
            if (job.id === 1) {
                model.enqueue(micro(11));
                model.enqueue(micro(12));
            }
        });

        expect(order).toEqual([1, 11, 12, 2]);
    });

    it("runs microtasks queued by microtasks before any task", () => {
        const model = new EventLoopModel();
        model.enqueue(task(1));
        model.enqueue(micro(10));

        const order = drain(model, (job) => {
            if (job.id === 10) model.enqueue(micro(20));
        });

        expect(order).toEqual([10, 20, 1]);
    });

    it("reports each waiting job's place in its own line", () => {
        const model = new EventLoopModel();
        const [a, b, m] = [task(1), task(2), micro(3)];
        model.enqueue(a);
        model.enqueue(b);
        model.enqueue(m);

        expect([model.position(a), model.position(b), model.position(m)]).toEqual([0, 1, 0]);
        model.next();
        expect(model.position(m)).toBe(-1);
        expect(model.position(a)).toBe(0);
    });
});
