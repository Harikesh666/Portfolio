import { describe, expect, it } from "vitest";
import { daylightAt, homeHour, mumbaiHour, mumbaiLocation, openSkyAt, placeholderStops, sceneHour, skyHourAt, sunTimes } from "./pond-daylight";

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

describe("openSkyAt", () => {
    const brightness = (rgb: readonly number[]) => rgb[0] + rgb[1] + rgb[2];

    it("is brightest at the horizon and darkest overhead, at every hour", () => {
        for (let hour = 0; hour < 24; hour += 0.5) {
            const sky = openSkyAt(hour, false);
            expect(brightness(sky.horizon)).toBeGreaterThan(brightness(sky.middle));
            expect(brightness(sky.middle)).toBeGreaterThan(brightness(sky.zenith));
        }
    });

    it("is blue at noon, warm at the horizon at dusk, and dark at night", () => {
        const noon = openSkyAt(12, false);
        expect(noon.zenith[2]).toBeGreaterThan(noon.zenith[0]);
        const dusk = openSkyAt(18.3, false);
        expect(dusk.horizon[0]).toBeGreaterThan(dusk.horizon[2]);
        expect(brightness(openSkyAt(1, false).zenith)).toBeLessThan(brightness(noon.zenith) * 0.2);
    });

    it("changes continuously rather than jumping between keyframes", () => {
        for (let hour = 0; hour < 24; hour += 0.05) {
            const a = openSkyAt(hour, false);
            const b = openSkyAt(hour + 0.05, false);
            expect(Math.abs(a.horizon[0] - b.horizon[0])).toBeLessThan(12);
        }
    });

    it("dims daylight for the dark theme but leaves night alone", () => {
        expect(openSkyAt(12, true).middle[1]).toBeCloseTo(openSkyAt(12, false).middle[1] * 0.8);
        expect(openSkyAt(2, true)).toEqual(openSkyAt(2, false));
    });

    it("gives the placeholder script the same stops it draws", () => {
        const noon = placeholderStops.find((stop) => stop.hour === 8.5);
        expect(noon?.open[0]).toEqual(openSkyAt(12, false).zenith);
    });
});

describe("mumbaiHour", () => {
    it("reads the time in India, five and a half hours ahead of UTC", () => {
        expect(mumbaiHour(new Date("2026-11-16T15:15:00Z"))).toBeCloseTo(20.75);
        expect(mumbaiHour(new Date("2026-11-16T20:00:00Z"))).toBeCloseTo(1.5);
    });
});

describe("sunTimes", () => {
    it("puts sunrise and sunset at Bijethua within minutes of the almanac", () => {
        // Sultanpur almanac: about 5:07 and 6:52 pm at midsummer, 6:42 and 5:15 pm at midwinter.
        const june = sunTimes(new Date("2026-06-21T06:30:00Z"));
        expect(june.sunrise).toBeCloseTo(5.12, 0);
        expect(june.sunset).toBeCloseTo(18.87, 0);
        const december = sunTimes(new Date("2026-12-21T06:30:00Z"));
        expect(december.sunrise).toBeCloseTo(6.7, 0);
        expect(december.sunset).toBeCloseTo(17.25, 0);
    });
});

describe("homeHour", () => {
    it("maps today's sunrise and sunset at home onto the light curve's", () => {
        const now = new Date("2026-12-21T06:30:00Z");
        const { sunrise, sunset } = sunTimes(now);
        const at = (hour: number) => new Date(Date.UTC(2026, 11, 21, 0, 0) + (hour - 5.5) * 3_600_000);
        expect(homeHour(at(sunrise))).toBeCloseTo(6.75, 1);
        expect(homeHour(at(sunset))).toBeCloseTo(18.75, 1);
        expect(homeHour(at(12))).toBeGreaterThan(11);
        expect(homeHour(at(12))).toBeLessThan(13);
    });

    it("is full night at home by 7 pm in December", () => {
        expect(daylightAt(homeHour(new Date("2026-12-21T13:30:00Z")), false).night).toBe(1);
    });
});

describe("sceneHour", () => {
    const { latitude, longitude } = mumbaiLocation;
    /** A Date at a fractional hour on Mumbai's clock (IST is UTC+5:30). */
    const istAt = (date: string, hour: number) => new Date(Date.parse(`${date}T00:00:00Z`) + (hour - 5.5) * 3_600_000);

    it("puts Mumbai's real sunrise and sunset on the curve's 6:45 am and 6:45 pm, whatever the season", () => {
        for (const date of ["2026-11-22", "2026-06-21", "2026-12-21", "2026-03-20"]) {
            const { sunrise, sunset } = sunTimes(istAt(date, 12), latitude, longitude);
            expect(sceneHour(istAt(date, sunrise))).toBeCloseTo(6.75, 1);
            expect(sceneHour(istAt(date, sunset))).toBeCloseTo(18.75, 1);
        }
    });

    it("is past dusk at 6:15 pm in late November, when the curve's own clock would still be golden", () => {
        expect(sceneHour(istAt("2026-11-22", 18.25))).toBeGreaterThan(18.75);
        expect(sceneHour(istAt("2026-06-21", 18.25))).toBeLessThan(18.75);
    });

    it("moves smoothly forward through the night and across midnight, with no jump", () => {
        let previous = sceneHour(istAt("2026-11-22", 18.5));
        for (let minutes = 10; minutes <= 12 * 60; minutes += 10) {
            const date = minutes < 330 ? "2026-11-22" : "2026-11-23";
            const clock = (18.5 + minutes / 60) % 24;
            const hour = sceneHour(istAt(date, clock));
            const step = (hour - previous + 24) % 24;
            expect(step).toBeGreaterThan(0);
            expect(step).toBeLessThan(0.25);
            previous = hour;
        }
    });

    it("still runs when inlined from its source, as the pre-paint placeholder script does", () => {
        const inlined = new Function(`return (${skyHourAt.toString()})`)() as typeof skyHourAt;
        for (const hour of [0.5, 6.9, 12, 17.95, 18.4, 21]) {
            const now = istAt("2026-11-22", hour);
            expect(inlined(now, latitude, longitude)).toBeCloseTo(skyHourAt(now, latitude, longitude), 6);
        }
    });

    it("leaves Mumbai's clock itself alone", () => {
        expect(mumbaiHour(istAt("2026-11-22", 18.25))).toBeCloseTo(18.25);
    });
});
