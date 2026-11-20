import { describe, expect, it } from "vitest";
import { circuitLength, createFlock, numeralBox, numerals, pointAlong, pointOnCircuit, type Point, type Stroke } from "./sky-flock";

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

/** Seconds of flight until the share of birds in place passes `share`, or Infinity within `limit` seconds. */
function secondsUntil(flock: ReturnType<typeof createFlock>, share: number, limit: number, night = 0) {
    for (let elapsed = 0; elapsed < limit; elapsed += 1 / 60) {
        flock.step(1 / 60, { night });
        if (flock.formed() > share) return elapsed;
    }
    return Infinity;
}

/** How far a point is from the nearest point of any stroke's line. */
function distanceToLine(strokes: readonly Stroke[], point: Point) {
    let nearest = Infinity;
    for (const { points } of strokes) {
        for (let i = 1; i < points.length; i++) {
            const a = points[i - 1];
            const b = points[i];
            const span = (b.x - a.x) ** 2 + (b.y - a.y) ** 2 || 1;
            const t = Math.min(1, Math.max(0, ((point.x - a.x) * (b.x - a.x) + (point.y - a.y) * (b.y - a.y)) / span));
            nearest = Math.min(nearest, Math.hypot(point.x - a.x - (b.x - a.x) * t, point.y - a.y - (b.y - a.y) * t));
        }
    }
    return nearest;
}

/** The angle a stroke turns through at a point, in degrees: 0 on a straight run. */
function turnAt(points: readonly Point[], i: number) {
    const ax = points[i].x - points[i - 1].x;
    const ay = points[i].y - points[i - 1].y;
    const bx = points[i + 1].x - points[i].x;
    const by = points[i + 1].y - points[i].y;
    return (Math.acos((ax * bx + ay * by) / (Math.hypot(ax, ay) * Math.hypot(bx, by))) * 180) / Math.PI;
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

    it.each(frames)("keeps a 4's corners sharp: an acute corner at the top and a bar that runs past the stem ($width wide)", ({ width, height }) => {
        const [four] = numerals(width, height);
        const { points } = four;
        const turns = points.slice(1, -1).map((_, i) => turnAt(points, i + 1));
        // Two corners, each turned in one point, and every other point on a straight run.
        const corners = turns.map((turn, i) => ({ turn, point: points[i + 1] })).filter(({ turn }) => turn > 1);
        expect(corners).toHaveLength(2);
        // Up the stem and back down the slope: a turn of well over 135 degrees leaves an acute angle.
        expect(corners[0].turn).toBeGreaterThan(140);
        // Down the slope and along the bar.
        expect(corners[1].turn).toBeGreaterThan(45);
        const stem = points[0].x;
        const barEnd = points[points.length - 1];
        const box = numeralBox(width, height);
        expect(barEnd.x - stem).toBeGreaterThan(box.wide * 0.25);
        // The stem runs on below the bar.
        expect(points[0].y - barEnd.y).toBeGreaterThan(box.tall * 0.25);
    });

    it("writes the numerals larger on a phone-sized frame", () => {
        const phone = numeralBox(360, 180);
        const wide = numeralBox(632, 316);
        expect(phone.tall / 180).toBeGreaterThan(wide.tall / 316);
        expect(phone.tall).toBeGreaterThan(100);
        expect(wide.tall).toBeGreaterThan(150);
    });

    it.each(frames)("leaves a margin either side for the moon ($width wide)", ({ width, height }) => {
        const box = numeralBox(width, height);
        // The moon is 0.046 of the frame's height across its radius and keeps 2.2 radii clear of the numerals.
        const moon = height * 0.046 * 3.2;
        expect(box.left).toBeGreaterThan(moon);
        expect(width - box.right).toBeGreaterThan(moon);
    });
});

describe("pointOnCircuit", () => {
    const lane = 4;

    it.each([0, 1, 2])("is one unbroken loop round stroke %i, with no jump anywhere", (index) => {
        const stroke = numerals(632, 316)[index];
        const length = circuitLength(stroke, lane);
        const side = stroke.closed ? lane : lane;
        let previous = pointOnCircuit(stroke, 0, side, lane);
        for (let distance = 0.5; distance <= length; distance += 0.5) {
            const at = pointOnCircuit(stroke, distance % length, side, lane);
            // Half a pixel round the circuit never moves the place more than a couple of pixels, even at a corner.
            expect(Math.hypot(at.x - previous.x, at.y - previous.y)).toBeLessThan(2.5);
            expect(Math.hypot(at.tx, at.ty)).toBeCloseTo(1, 5);
            previous = at;
        }
    });

    it("flies an open stroke out along one side and back along the other", () => {
        const stroke = numerals(632, 316)[0];
        const length = circuitLength(stroke, lane);
        const out = pointOnCircuit(stroke, stroke.total * 0.1, lane, lane);
        const back = pointOnCircuit(stroke, length - Math.PI * lane - stroke.total * 0.1, lane, lane);
        // The same stretch of the stem, two lanes apart, flown in opposite directions.
        expect(Math.hypot(out.x - back.x, out.y - back.y)).toBeCloseTo(lane * 2, 1);
        expect(out.tx * back.tx + out.ty * back.ty).toBeCloseTo(-1, 5);
    });
});

describe("createFlock", () => {
    it("sizes the flock to the numerals, within its limits", () => {
        for (const frame of frames) {
            const count = createFlock({ ...frame, random: seeded(1) }).birds.length;
            expect(count).toBeGreaterThanOrEqual(180);
            expect(count).toBeLessThanOrEqual(400);
        }
    });

    it("starts written when asked for a still frame", () => {
        const flock = createFlock({ ...frames[1], start: "formed", random: seeded(2) });
        expect(flock.isForming()).toBe(true);
        expect(flock.formed()).toBe(1);
    });

    it.each(frames)("flies in from off the frame and writes the numerals within about three seconds ($width wide)", (frame) => {
        const flock = createFlock({ ...frame, random: seeded(3) });
        expect(flock.birds.every((bird) => bird.x > frame.width)).toBe(true);
        expect(flock.formed()).toBe(0);
        expect(secondsUntil(flock, 0.95, 10)).toBeLessThan(3.2);
        expect(flock.isForming()).toBe(true);
    });

    it.each(frames)("writes them at night too, when fireflies drift in from below ($width wide)", (frame) => {
        const flock = createFlock({ ...frame, start: "low", random: seeded(4) });
        expect(secondsUntil(flock, 0.9, 10, 1)).toBeLessThan(4.5);
    });

    it.each(frames)("flies each stroke in a lane tight enough to read as one line ($width wide)", (frame) => {
        const flock = createFlock({ ...frame, start: "formed", random: seeded(10) });
        run(flock, 3);
        const strokes = numerals(frame.width, frame.height);
        const off = flock.birds.map((bird) => distanceToLine(strokes, bird));
        const mean = off.reduce((sum, distance) => sum + distance, 0) / off.length;
        // A bird's sprite is about 0.025 of the frame's height across, so the line stays about one bird wide.
        expect(mean).toBeLessThan(frame.height * 0.008);
        expect(Math.max(...off)).toBeLessThan(frame.height * 0.02);
    });

    it("settles birds into the numerals, and unsettles them when the flock lets go", () => {
        const flock = createFlock({ ...frames[1], random: seeded(11) });
        const held = () => flock.birds.reduce((sum, bird) => sum + bird.held, 0) / flock.birds.length;
        expect(held()).toBe(0);
        run(flock, 5);
        expect(held()).toBeGreaterThan(0.9);
        flock.flush(frames[1].width / 2, frames[1].height * 0.4);
        run(flock, 1);
        expect(held()).toBeLessThan(0.3);
    });

    it("holds the numerals while every bird keeps flying along its stroke", () => {
        const flock = createFlock({ ...frames[1], start: "formed", random: seeded(5) });
        const before = flock.birds.map((bird) => ({ x: bird.x, y: bird.y }));
        run(flock, 4);
        expect(flock.formed()).toBeGreaterThan(0.95);
        const moved = flock.birds.filter((bird, i) => Math.hypot(bird.x - before[i].x, bird.y - before[i].y) > 8);
        expect(moved.length).toBeGreaterThan(flock.birds.length * 0.9);
    });

    it("holds the numerals far longer than it roams", () => {
        const flock = createFlock({ ...frames[1], start: "formed", random: seeded(12) });
        let held = 0;
        let roamed = 0;
        for (let elapsed = 0; elapsed < 60; elapsed += 1 / 60) {
            flock.step(1 / 60);
            if (flock.isForming()) held += 1 / 60;
            else roamed += 1 / 60;
        }
        expect(held / roamed).toBeGreaterThan(3.5);
    });

    it("lets go after a while, roams inside the frame, and comes back", () => {
        const frame = frames[1];
        const flock = createFlock({ ...frame, start: "formed", random: seeded(6) });
        run(flock, 13.5);
        expect(flock.isForming()).toBe(true);
        run(flock, 2);
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

    it("never asks a bird to turn on the spot while the numerals hold", () => {
        const flock = createFlock({ ...frames[1], start: "formed", random: seeded(9) });
        run(flock, 1);
        let sharpest = 0;
        for (let frame = 0; frame < 360; frame++) {
            const before = flock.birds.map((bird) => bird.heading);
            flock.step(1 / 60);
            flock.birds.forEach((bird, i) => {
                const swing = bird.heading - before[i];
                sharpest = Math.max(sharpest, Math.abs(Math.atan2(Math.sin(swing), Math.cos(swing))));
            });
        }
        // The tightest turn is the hairpin round a stroke's end: under twelve degrees in a frame, so even it takes a quarter of a second.
        expect(sharpest).toBeLessThan(0.2);
    });

    it("keeps every bird's place when the frame changes size", () => {
        const flock = createFlock({ ...frames[1], start: "formed", random: seeded(8) });
        flock.resize(frames[0].width, frames[0].height);
        expect(flock.formed()).toBeGreaterThan(0.95);
        flock.resize(frames[1].width, frames[1].height);
        expect(flock.formed()).toBeGreaterThan(0.95);
    });
});
