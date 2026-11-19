import { describe, expect, it } from "vitest";
import { bodyProfile, makeFish, poseOf, segments, steer, type Fish } from "./pond-fish";

const koi = (): Fish => makeFish({ id: 1, kind: "task" }, { x: 200, y: 100 }, 0, 100, false);

/** How far each drawn joint sits from the simulated spine. */
const sweep = (fish: Fish) =>
    poseOf(fish).map((point, i) => Math.hypot(point.x - fish.points[i].x, point.y - fish.points[i].y));

/** The sharpest bend between two neighbouring spine segments, in radians. */
function sharpestBend(fish: Fish) {
    let sharpest = 0;
    for (let i = 2; i < segments; i++) {
        const a = Math.atan2(fish.points[i - 1].y - fish.points[i - 2].y, fish.points[i - 1].x - fish.points[i - 2].x);
        const b = Math.atan2(fish.points[i].y - fish.points[i - 1].y, fish.points[i].x - fish.points[i - 1].x);
        sharpest = Math.max(sharpest, Math.abs(Math.atan2(Math.sin(b - a), Math.cos(b - a))));
    }
    return sharpest;
}

describe("bodyProfile", () => {
    it("closes at the snout and is widest behind the head", () => {
        expect(bodyProfile(0)).toBe(0);
        const widest = Math.max(...Array.from({ length: 101 }, (_, i) => bodyProfile(i / 100)));
        expect(bodyProfile(0.4)).toBeCloseTo(widest, 2);
        expect(bodyProfile(0.1)).toBeLessThan(widest);
    });

    it("tapers to a narrow wrist at the tail", () => {
        expect(bodyProfile(1)).toBeGreaterThan(0);
        expect(bodyProfile(1)).toBeLessThan(bodyProfile(0.4) * 0.3);
    });
});

describe("poseOf", () => {
    it("draws a coasting koi straight", () => {
        const fish = koi();
        fish.effort = 0;
        expect(Math.max(...sweep(fish))).toBe(0);
    });

    it("keeps the head nearly still while the tail sweeps widest", () => {
        const fish = koi();
        fish.effort = 1;
        let head = 0;
        let tail = 0;
        // The widest sweep over one full stroke.
        for (let step = 0; step < 64; step++) {
            fish.phase = (step / 64) * Math.PI * 2;
            const offsets = sweep(fish);
            head = Math.max(head, offsets[0]);
            tail = Math.max(tail, offsets[segments - 1]);
        }
        expect(tail).toBeGreaterThan(fish.length * 0.05);
        expect(head).toBeLessThan(tail * 0.1);
    });
});

describe("steer", () => {
    it("reaches a target behind it without folding its spine", () => {
        const fish = koi();
        const target = { x: 40, y: 110 };
        let sharpest = 0;
        // Coming about is unhurried: a koi turns in an arc its body can hold.
        for (let step = 0; step < 900; step++) {
            steer(fish, target, 46, 1 / 60);
            sharpest = Math.max(sharpest, sharpestBend(fish));
        }
        expect(Math.hypot(fish.points[0].x - target.x, fish.points[0].y - target.y)).toBeLessThan(6);
        expect(sharpest).toBeLessThanOrEqual(0.28 + 1e-6);
    });

    it("turns faster when startled than when cruising", () => {
        const turned = (swim: "cruise" | "dart") => {
            const fish = koi();
            fish.speed = 30;
            // Hold it mid-stroke, so the comparison is not left to which half of burst-and-glide it starts in.
            fish.gliding = false;
            fish.strokeTimer = 10;
            for (let step = 0; step < 12; step++) steer(fish, { x: 200, y: 400 }, 46, 1 / 60, swim);
            return Math.abs(fish.heading);
        };
        expect(turned("dart")).toBeGreaterThan(turned("cruise") * 2);
    });

    it("never turns in a tighter arc than its body can hold, or faster than a fish can", () => {
        const fish = koi();
        const targets = [
            { x: 40, y: 110 },
            { x: 320, y: 30 },
            { x: 210, y: 105 },
            { x: 60, y: 20 },
        ];
        // A turn eases in and out, so it may trail a limit that has just dropped: judge it against the last half second's speed.
        const recent: number[] = [];
        for (const target of targets) {
            for (let i = 0; i < 240; i++) {
                recent.push(fish.speed);
                if (recent.length > 30) recent.shift();
                steer(fish, target, 46, 1 / 60, "cruise");
                const limit = Math.min(2.4, Math.max(...recent, fish.speed) / (fish.length * 0.34) + 0.55);
                expect(Math.abs(fish.turn)).toBeLessThanOrEqual(limit + 1e-6);
            }
        }
    });

    it("eases apart from a neighbour instead of jumping", () => {
        const fish = koi();
        fish.nudgeX = 0;
        fish.nudgeY = 38;
        const before = fish.points[0].y;
        steer(fish, { x: 5000, y: 100 }, 46, 1 / 60, "cruise");
        // One frame of a full nudge moves the head a small fraction of a pixel.
        expect(Math.abs(fish.points[0].y - before)).toBeLessThan(0.2);
        for (let i = 0; i < 120; i++) steer(fish, { x: 5000, y: fish.points[0].y }, 46, 1 / 60, "cruise");
        expect(fish.driftY).toBeGreaterThan(30);
    });

    it("glides slower than it strokes", () => {
        const speedAfter = (gliding: boolean) => {
            const fish = koi();
            fish.gliding = gliding;
            fish.strokeTimer = 10;
            for (let step = 0; step < 240; step++) steer(fish, { x: 5000, y: 100 }, 46, 1 / 60, "cruise");
            return fish.speed;
        };
        expect(speedAfter(true)).toBeLessThan(speedAfter(false) * 0.5);
    });
});
