import { describe, expect, it } from "vitest";
import { createFlock, numerals, pointAlong } from "./sky-flock";

/** A repeatable random source, so a flaky flock would fail every run and not one in ten. */
function seeded(seed: number) {
    let state = seed;
    return () => {
        state = (state * 1664525 + 1013904223) % 4294967296;
        return state / 4294967296;
    };
}

const frames = [
    { width: 360, height: 180 },
    { width: 632, height: 316 },
];

function run(flock: ReturnType<typeof createFlock>, seconds: number, night = 0) {
    for (let elapsed = 0; elapsed < seconds; elapsed += 1 / 60) flock.step(1 / 60, { night });
}

describe("numerals", () => {
    it.each(frames)("fits 404 inside a $width by $height frame, clear of the rooftops", ({ width, height }) => {
        const strokes = numerals(width, height);
        expect(strokes).toHaveLength(3);
        for (const point of strokes.flatMap((stroke) => stroke.points)) {
            expect(point.x).toBeGreaterThan(width * 0.1);
            expect(point.x).toBeLessThan(width * 0.9);
            expect(point.y).toBeGreaterThan(height * 0.08);
            expect(point.y).toBeLessThan(height * 0.7);
        }
    });

    it("closes the zero and leaves the fours open", () => {
        const [first, zero, last] = numerals(632, 316);
        expect([first.closed, zero.closed, last.closed]).toEqual([false, true, false]);
        expect(pointAlong(zero, 0)).toMatchObject({ x: pointAlong(zero, zero.total).x, y: pointAlong(zero, zero.total).y });
    });
});

describe("createFlock", () => {
    it("sizes the flock to the numerals, within its limits", () => {
        for (const frame of frames) {
            const count = createFlock({ ...frame, random: seeded(1) }).birds.length;
            expect(count).toBeGreaterThanOrEqual(130);
            expect(count).toBeLessThanOrEqual(260);
        }
    });

    it("starts written when asked for a still frame", () => {
        const flock = createFlock({ ...frames[1], start: "formed", random: seeded(2) });
        expect(flock.isForming()).toBe(true);
        expect(flock.formed()).toBe(1);
    });

    it.each(frames)("flies in from off the frame and writes the numerals within seconds ($width wide)", (frame) => {
        const flock = createFlock({ ...frame, random: seeded(3) });
        expect(flock.birds.every((bird) => bird.x > frame.width)).toBe(true);
        expect(flock.formed()).toBe(0);
        run(flock, 7);
        expect(flock.isForming()).toBe(true);
        expect(flock.formed()).toBeGreaterThan(0.95);
    });

    it("writes them at night too, when fireflies drift in from below", () => {
        const flock = createFlock({ ...frames[0], start: "low", random: seeded(4) });
        run(flock, 9, 1);
        expect(flock.formed()).toBeGreaterThan(0.9);
    });

    it("holds the numerals while every bird keeps flying along its stroke", () => {
        const flock = createFlock({ ...frames[1], start: "formed", random: seeded(5) });
        const before = flock.birds.map((bird) => ({ x: bird.x, y: bird.y }));
        run(flock, 4);
        expect(flock.formed()).toBeGreaterThan(0.95);
        const moved = flock.birds.filter((bird, i) => Math.hypot(bird.x - before[i].x, bird.y - before[i].y) > 8);
        expect(moved.length).toBeGreaterThan(flock.birds.length * 0.9);
    });

    it("lets go after a while, roams inside the frame, and comes back", () => {
        const frame = frames[1];
        const flock = createFlock({ ...frame, start: "formed", random: seeded(6) });
        run(flock, 11.5);
        expect(flock.isForming()).toBe(false);
        expect(flock.formed()).toBeLessThan(0.4);
        for (const bird of flock.birds) {
            expect(bird.x).toBeGreaterThan(-frame.width * 0.2);
            expect(bird.x).toBeLessThan(frame.width * 1.2);
            expect(bird.y).toBeGreaterThan(-frame.height * 0.2);
            expect(bird.y).toBeLessThan(frame.height * 0.85);
        }
        run(flock, 7);
        expect(flock.formed()).toBeGreaterThan(0.95);
    });

    it("scatters from a tap and gathers again", () => {
        const frame = frames[1];
        const flock = createFlock({ ...frame, start: "formed", random: seeded(7) });
        flock.flush(frame.width / 2, frame.height * 0.4);
        expect(flock.isForming()).toBe(false);
        run(flock, 0.8);
        expect(flock.formed()).toBeLessThan(0.3);
        run(flock, 7);
        expect(flock.formed()).toBeGreaterThan(0.95);
    });

    it("keeps every bird's place when the frame changes size", () => {
        const flock = createFlock({ ...frames[1], start: "formed", random: seeded(8) });
        flock.resize(frames[0].width, frames[0].height);
        expect(flock.formed()).toBeGreaterThan(0.95);
    });
});
