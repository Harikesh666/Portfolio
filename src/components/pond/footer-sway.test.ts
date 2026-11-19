import { describe, expect, it } from "vitest";
import { createSway, swayFeel, type Sway } from "./footer-sway";

const width = 900;
/** The widest bend anywhere along the bed. */
const widest = (sway: Sway) => sway.bends.reduce((most, bend) => Math.max(most, Math.abs(bend)), 0);

/** Runs the springs until they rest, and returns how long that took in seconds. */
function settle(sway: Sway, limit = 10) {
    let elapsed = 0;
    while (elapsed < limit && sway.step(1 / 60)) elapsed += 1 / 60;
    return elapsed;
}

describe("createSway", () => {
    it("starts at rest and stays there", () => {
        const sway = createSway(width);
        expect(widest(sway)).toBe(0);
        expect(sway.step(1 / 60)).toBe(false);
    });

    it("carries the plants under the hand along with it at once, before any time has passed", () => {
        const sway = createSway(width);
        sway.push(450, 10);
        // No step has run: the answer is in the same frame as the move.
        expect(sway.bendAt(450)).toBeCloseTo(10 * swayFeel.carry, 1);
        expect(sway.bendAt(450 + swayFeel.reach)).toBeGreaterThan(0);
        expect(sway.bendAt(450 + swayFeel.reach)).toBeLessThan(sway.bendAt(450));
        expect(sway.bendAt(100)).toBe(0);
        sway.push(450, -20);
        expect(sway.bendAt(450)).toBeLessThan(0);
    });

    it("lets the sway run outward along the bed as a wave", () => {
        const sway = createSway(width);
        sway.push(450, 12);
        // Well outside the hand's own reach, where it moved nothing directly.
        const far = 450 + swayFeel.reach * 2.4;
        expect(Math.abs(sway.bendAt(far))).toBeLessThan(0.01);
        let reached = 0;
        for (let frame = 0; frame < 60; frame++) {
            sway.step(1 / 60);
            reached = Math.max(reached, Math.abs(sway.bendAt(far)));
        }
        expect(reached).toBeGreaterThan(0.3);
    });

    it("swings back past rest a few times, then comes to rest", () => {
        const sway = createSway(width);
        sway.push(450, 12);
        let crossings = 0;
        let before = sway.bendAt(450);
        let elapsed = 0;
        while (elapsed < 10 && sway.step(1 / 60)) {
            elapsed += 1 / 60;
            const now = sway.bendAt(450);
            if (Math.sign(now) !== Math.sign(before) && now !== 0) crossings += 1;
            before = now;
        }
        expect(crossings).toBeGreaterThanOrEqual(2);
        expect(elapsed).toBeGreaterThan(0.4);
        expect(elapsed).toBeLessThan(4);
        expect(widest(sway)).toBe(0);
    });

    it("throws the plants further for a quick pass than a slow one, and never past their limit", () => {
        const furthest = (pixelsPerFrame: number) => {
            const sway = createSway(width);
            let most = 0;
            for (let x = 200; x <= 700; x += pixelsPerFrame) {
                sway.push(x, pixelsPerFrame);
                sway.step(1 / 60);
                most = Math.max(most, widest(sway));
            }
            return most;
        };
        const slow = furthest(2);
        const quick = furthest(14);
        expect(slow).toBeGreaterThan(0.5);
        expect(quick).toBeGreaterThan(slow * 1.5);
        expect(quick).toBeLessThanOrEqual(swayFeel.most);
    });

    it("leans the plants away from a tap on both sides", () => {
        const sway = createSway(width);
        sway.puff(450);
        expect(sway.bendAt(450 - 30)).toBeLessThan(0);
        expect(sway.bendAt(450 + 30)).toBeGreaterThan(0);
        expect(Math.abs(sway.bendAt(450))).toBeLessThan(0.5);
        expect(settle(sway)).toBeLessThan(4);
    });

    it("stays stable through a slow frame", () => {
        const sway = createSway(width);
        sway.push(300, 13);
        sway.puff(600);
        for (let frame = 0; frame < 120; frame++) {
            sway.step(0.05);
            expect(widest(sway)).toBeLessThanOrEqual(swayFeel.most);
            expect(Number.isFinite(widest(sway))).toBe(true);
        }
        expect(widest(sway)).toBeLessThan(0.5);
    });
});
