import { describe, expect, it } from "vitest";
import { createPetals, type Petals } from "./footer-petals";

/** A repeatable random source, so a flaky petal would fail every run and not one in ten. */
function seeded(seed: number) {
    let state = seed;
    return () => {
        state = (state * 1664525 + 1013904223) % 4294967296;
        return state / 4294967296;
    };
}

const frame = { width: 900, headroom: 110, bed: 100, count: 30, size: 7 };
const garden = (seed: number) => createPetals({ ...frame, random: seeded(seed) });

/** Runs the petals until they are still, and returns how long that took in seconds. */
function settle(petals: Petals, limit = 20) {
    let elapsed = 0;
    while (elapsed < limit && petals.step(1 / 60)) elapsed += 1 / 60;
    return elapsed;
}

describe("createPetals", () => {
    it("lays every petal on the bed, below its top edge, and leaves them still", () => {
        const petals = garden(1);
        expect(petals.petals).toHaveLength(frame.count);
        expect(petals.isStill()).toBe(true);
        expect(petals.step(1 / 60)).toBe(false);
        for (const petal of petals.petals) {
            expect(petal.x).toBeGreaterThanOrEqual(0);
            expect(petal.x).toBeLessThanOrEqual(frame.width);
            expect(petal.y).toBeGreaterThan(frame.headroom + frame.bed * 0.3);
            expect(petal.y).toBeLessThan(frame.headroom + frame.bed);
        }
    });

    it("lifts the petals near a tap and leaves the far ones lying", () => {
        const petals = garden(2);
        const before = petals.petals.map((petal) => petal.y);
        petals.kick(450, frame.headroom + 60);
        for (let i = 0; i < 12; i++) petals.step(1 / 60);
        const lifted = petals.petals.filter((petal, i) => petal.y < before[i] - 2);
        expect(lifted.length).toBeGreaterThan(0);
        for (const petal of lifted) expect(Math.abs(petal.x - 450)).toBeLessThan(160);
        const far = petals.petals.filter((petal) => Math.abs(petal.x - 450) > 200);
        expect(far.length).toBeGreaterThan(0);
        expect(far.every((petal) => !petal.airborne)).toBe(true);
    });

    it("brings every lifted petal back down onto the bed, lying flat, within a few seconds", () => {
        const petals = garden(3);
        petals.kick(300, frame.headroom + 50);
        petals.kick(600, frame.headroom + 70, 1, 120, -40);
        expect(settle(petals)).toBeLessThan(8);
        expect(petals.isStill()).toBe(true);
        for (const petal of petals.petals) {
            expect(petal.y).toBeGreaterThan(frame.headroom + frame.bed * 0.3);
            expect(petal.y).toBeLessThan(frame.headroom + frame.bed);
            // Face up or face down, never left on its edge.
            expect(Math.abs(Math.sin(petal.flip))).toBeLessThan(0.02);
        }
    });

    it("never throws a petal above the air it has to fly in", () => {
        const petals = garden(4);
        let highest = Infinity;
        for (let burst = 0; burst < 4; burst++) {
            petals.kick(200 + burst * 150, frame.headroom + 55);
            for (let i = 0; i < 90; i++) {
                petals.step(1 / 60);
                highest = Math.min(highest, ...petals.petals.map((petal) => petal.y));
            }
        }
        expect(highest).toBeGreaterThan(0);
    });

    it("lets a breeze reach the petals in turn as it crosses the bed", () => {
        const petals = garden(5);
        petals.breeze(1);
        const waiting = petals.petals.filter((petal) => petal.lift >= 0);
        expect(waiting.length).toBeGreaterThan(2);
        expect(waiting.length).toBeLessThan(frame.count);
        // Further along the bed, later the lift.
        const ordered = [...waiting].sort((a, b) => a.x - b.x);
        for (let i = 1; i < ordered.length; i++) expect(ordered[i].lift).toBeGreaterThanOrEqual(ordered[i - 1].lift);
        expect(petals.isStill()).toBe(false);
        expect(settle(petals)).toBeLessThan(10);
    });

    it("keeps the same number of petals when new ones drift down", () => {
        const petals = garden(6);
        petals.drop(3);
        expect(petals.petals).toHaveLength(frame.count + 3);
        expect(petals.petals.filter((petal) => petal.y < 0)).toHaveLength(3);
        expect(settle(petals)).toBeLessThan(12);
        expect(petals.petals).toHaveLength(frame.count);
        expect(petals.petals.every((petal) => petal.alpha === 1)).toBe(true);
    });

    it("keeps each petal the same way down the bed when the strip changes size", () => {
        const petals = garden(7);
        const before = petals.petals.map((petal) => (petal.y - frame.headroom) / frame.bed);
        petals.resize(360, 80, 75);
        petals.petals.forEach((petal, i) => {
            expect((petal.y - 80) / 75).toBeCloseTo(before[i], 5);
            expect(petal.x).toBeLessThanOrEqual(360);
        });
    });
});
