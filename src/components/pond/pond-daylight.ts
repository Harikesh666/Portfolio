import type { WaterTheme } from "./pond-water";

type Rgb = readonly [number, number, number];

type Keyframe = Readonly<{
    hour: number;
    deep: Rgb;
    shallow: Rgb;
    light: Rgb;
    lightStrength: number;
    /** 0 by day, 1 at full night: drives the moon and slower fish. */
    night: number;
}>;

const night: Omit<Keyframe, "hour"> = {
    deep: [0.08, 0.14, 0.25],
    shallow: [0.15, 0.25, 0.39],
    light: [0.62, 0.72, 0.92],
    lightStrength: 0.18,
    night: 1,
};
const dawn: Omit<Keyframe, "hour"> = {
    deep: [0.4, 0.46, 0.62],
    shallow: [0.86, 0.75, 0.77],
    light: [1, 0.95, 0.9],
    lightStrength: 0.4,
    night: 0.2,
};
const day: Omit<Keyframe, "hour"> = {
    deep: [0.36, 0.58, 0.56],
    shallow: [0.6, 0.79, 0.76],
    light: [0.97, 1, 0.98],
    lightStrength: 0.42,
    night: 0,
};
const dusk: Omit<Keyframe, "hour"> = {
    deep: [0.44, 0.29, 0.42],
    shallow: [0.93, 0.65, 0.46],
    light: [1, 0.89, 0.68],
    lightStrength: 0.38,
    night: 0.3,
};

/** Mumbai's day, roughly: first light near six, sunset near seven. */
const keyframes: readonly Keyframe[] = [
    { hour: 0, ...night },
    { hour: 5, ...night },
    { hour: 6.5, ...dawn },
    { hour: 8.5, ...day },
    { hour: 16.5, ...day },
    { hour: 18.3, ...dusk },
    { hour: 20, ...night },
    { hour: 24, ...night },
];

const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const mixRgb = (a: Rgb, b: Rgb, t: number): Rgb => [
    mix(a[0], b[0], t),
    mix(a[1], b[1], t),
    mix(a[2], b[2], t),
];

export type Daylight = WaterTheme & Readonly<{ night: number }>;

/**
 * The pond's lighting for an hour of the day (0 to 24, fractional), with
 * a dimmer version for the site's dark theme so the pond never glares.
 */
export function daylightAt(hour: number, isDarkTheme: boolean): Daylight {
    const h = ((hour % 24) + 24) % 24;
    const index = keyframes.findIndex((frame, i) => h >= frame.hour && h < keyframes[i + 1].hour);
    const from = keyframes[index];
    const to = keyframes[index + 1];
    const t = (h - from.hour) / (to.hour - from.hour);
    const eased = t * t * (3 - 2 * t);

    const deep = mixRgb(from.deep, to.deep, eased);
    const shallow = mixRgb(from.shallow, to.shallow, eased);
    const nightness = mix(from.night, to.night, eased);
    // Dark theme: soften daylight so it never glares, but keep it clearly day; leave night alone.
    const dim = isDarkTheme ? mix(0.66, 1, nightness) : 1;

    return {
        deep: [deep[0] * dim, deep[1] * dim, deep[2] * dim],
        shallow: [shallow[0] * dim, shallow[1] * dim, shallow[2] * dim],
        light: mixRgb(from.light, to.light, eased),
        lightStrength: mix(from.lightStrength, to.lightStrength, eased) * (isDarkTheme ? 0.85 : 1),
        night: nightness,
    };
}

const hourFormat = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
});

/** The current hour in Mumbai as a fraction, e.g. 20.75 for 8:45 pm. */
export function mumbaiHour(now = new Date()) {
    const parts = hourFormat.formatToParts(now);
    const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
    const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0);
    return hour + minute / 60;
}
