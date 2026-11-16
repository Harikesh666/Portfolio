import { describe, expect, it } from "vitest";
import { daylightAt, mumbaiHour } from "./pond-daylight";

describe("daylightAt", () => {
    it("is full night after dark and full day at noon", () => {
        expect(daylightAt(2, false).night).toBe(1);
        expect(daylightAt(23, false).night).toBe(1);
        expect(daylightAt(12, false).night).toBe(0);
    });

    it("warms the light toward orange at dusk", () => {
        const noon = daylightAt(12, false);
        const dusk = daylightAt(18.3, false);
        expect(dusk.shallow[0]).toBeGreaterThan(dusk.shallow[2]);
        expect(dusk.light[2]).toBeLessThan(noon.light[2]);
    });

    it("changes continuously rather than jumping between keyframes", () => {
        // Three-minute steps: twilight is quick, but never a jump.
        for (let hour = 0; hour < 24; hour += 0.05) {
            const a = daylightAt(hour, false);
            const b = daylightAt(hour + 0.05, false);
            expect(Math.abs(a.shallow[0] - b.shallow[0])).toBeLessThan(0.04);
        }
    });

    it("dims daylight for the dark theme but leaves night alone", () => {
        expect(daylightAt(12, true).shallow[1]).toBeLessThan(daylightAt(12, false).shallow[1]);
        expect(daylightAt(2, true).shallow).toEqual(daylightAt(2, false).shallow);
    });

    it("wraps hours outside 0 to 24", () => {
        expect(daylightAt(26, false)).toEqual(daylightAt(2, false));
        expect(daylightAt(-1, false)).toEqual(daylightAt(23, false));
    });
});

describe("mumbaiHour", () => {
    it("reads the time in India, five and a half hours ahead of UTC", () => {
        expect(mumbaiHour(new Date("2026-11-16T15:15:00Z"))).toBeCloseTo(20.75);
        expect(mumbaiHour(new Date("2026-11-16T20:00:00Z"))).toBeCloseTo(1.5);
    });
});
