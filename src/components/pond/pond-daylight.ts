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

/** Bijethua Mahaviran, near Harikesh's home in Pratapgarh. */
const home = { latitude: 26.3, longitude: 82.3 };
/** India keeps one clock, set to the sun at 82.5 degrees east. */
const istMeridian = 82.5;
const radians = Math.PI / 180;

/**
 * Sunrise and sunset as fractional hours on the India clock, from the
 * standard approximation: the sun's declination for the day of the year,
 * the equation of time, and the hour angle at which the sun's upper edge
 * clears the horizon (including refraction). Accurate to a few minutes.
 */
export function sunTimes(now: Date, latitude = home.latitude, longitude = home.longitude) {
    const india = new Date(now.getTime() + 5.5 * 3_600_000);
    const startOfYear = Date.UTC(india.getUTCFullYear(), 0, 0);
    const day = Math.floor((india.getTime() - startOfYear) / 86_400_000);
    const declination = 23.44 * radians * Math.sin((2 * Math.PI * (284 + day)) / 365);
    const b = (2 * Math.PI * (day - 81)) / 364;
    const equationOfTime = 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
    const noon = 12 + ((istMeridian - longitude) * 4) / 60 - equationOfTime / 60;
    const phi = latitude * radians;
    const cosine = (Math.sin(-0.833 * radians) - Math.sin(phi) * Math.sin(declination)) / (Math.cos(phi) * Math.cos(declination));
    const halfDay = Math.acos(Math.min(1, Math.max(-1, cosine))) / radians / 15;
    return { sunrise: noon - halfDay, sunset: noon + halfDay };
}

/** Sunrise and sunset on the keyframe day above, which the light curve was drawn around. */
const keyframeSunrise = 6.75;
const keyframeSunset = 18.75;

/**
 * The hour on the keyframe day that matches the sky at home right now:
 * today's real sunrise and sunset at Bijethua map onto the curve's, so
 * dusk comes at 5:15 pm in December and near 7 pm in June.
 */
export function homeHour(now = new Date()) {
    const clock = mumbaiHour(now);
    const { sunrise, sunset } = sunTimes(now);
    if (clock >= sunrise && clock <= sunset) {
        return keyframeSunrise + ((clock - sunrise) / (sunset - sunrise)) * (keyframeSunset - keyframeSunrise);
    }
    const night = 24 - (sunset - sunrise);
    const sinceSunset = (clock - sunset + 24) % 24;
    return (keyframeSunset + (sinceSunset / night) * (24 - (keyframeSunset - keyframeSunrise))) % 24;
}
