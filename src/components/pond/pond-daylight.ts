import type { WaterTheme } from "./pond-water";

type Rgb = readonly [number, number, number];

/**
 * The bulbul scene as it renders at a phase of the day, sampled from its
 * frames: the top and bottom of the frame, in the light and dark themes,
 * as 0-255 RGB. Only the CSS placeholder shown before WebGL draws uses it.
 */
type SkyPlaceholder = Readonly<{
    light: readonly [Rgb, Rgb];
    dark: readonly [Rgb, Rgb];
}>;

/**
 * The open sky over the 404's rooftops at a phase of the day: its zenith,
 * its middle and its horizon, as 0-255 RGB. The scene draws these and the
 * CSS placeholder shows them before it loads.
 */
type OpenSky = readonly [Rgb, Rgb, Rgb];

type Keyframe = Readonly<{
    hour: number;
    sky: SkyPlaceholder;
    open: OpenSky;
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
    sky: { light: [[7, 11, 30], [40, 38, 37]], dark: [[7, 11, 30], [28, 27, 26]] },
    open: [[9, 14, 36], [24, 34, 70], [70, 60, 82]],
};
const dawn: Omit<Keyframe, "hour"> = {
    deep: [0.4, 0.46, 0.62],
    shallow: [0.86, 0.75, 0.77],
    light: [1, 0.95, 0.9],
    lightStrength: 0.4,
    night: 0.2,
    sky: { light: [[113, 133, 161], [146, 143, 105]], dark: [[99, 117, 141], [119, 116, 82]] },
    open: [[82, 110, 160], [178, 170, 192], [246, 198, 162]],
};
const day: Omit<Keyframe, "hour"> = {
    deep: [0.36, 0.58, 0.56],
    shallow: [0.6, 0.79, 0.76],
    light: [0.97, 1, 0.98],
    lightStrength: 0.42,
    night: 0,
    sky: { light: [[166, 182, 186], [162, 165, 124]], dark: [[143, 155, 158], [127, 130, 97]] },
    open: [[84, 146, 206], [150, 196, 226], [224, 233, 226]],
};
const dusk: Omit<Keyframe, "hour"> = {
    deep: [0.44, 0.29, 0.42],
    shallow: [0.93, 0.65, 0.46],
    light: [1, 0.89, 0.68],
    lightStrength: 0.38,
    night: 0.3,
    sky: { light: [[99, 90, 130], [132, 115, 73]], dark: [[90, 82, 117], [107, 93, 55]] },
    open: [[56, 62, 120], [176, 112, 128], [250, 172, 98]],
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
 * The colour stops the pre-paint placeholder script interpolates, so a scene's
 * box shows the right time of day before WebGL draws: the koi pond's water
 * (0-1, dimmed for the dark theme the way `daylightAt` does), the bulbul's
 * sky, and the 404's open sky (dimmed for the dark theme the way
 * `openSkyAt` does). Serialized into the page by the root route.
 */
export const placeholderStops = keyframes.map(({ deep, hour, night, open, shallow, sky }) => ({
    deep,
    hour,
    night,
    open,
    shallow,
    sky,
}));

/** The two keyframes around an hour of the day (0 to 24, fractional) and the eased share of the way between them. */
function phaseAt(hour: number) {
    const h = ((hour % 24) + 24) % 24;
    const index = keyframes.findIndex((frame, i) => h >= frame.hour && h < keyframes[i + 1].hour);
    const from = keyframes[index];
    const to = keyframes[index + 1];
    const t = (h - from.hour) / (to.hour - from.hour);
    return { from, to, eased: t * t * (3 - 2 * t) };
}

/** The dark theme shows the open sky's daylight at this share of its brightness, so it never glares. Night is left alone. */
export const openSkyDarkDim = 0.8;

export type OpenSkyLight = Readonly<{ zenith: Rgb; middle: Rgb; horizon: Rgb; night: number }>;

/** The 404's open sky for an hour of the day, as 0-255 RGB, with a dimmer day for the site's dark theme. */
export function openSkyAt(hour: number, isDarkTheme: boolean): OpenSkyLight {
    const { from, to, eased } = phaseAt(hour);
    const night = mix(from.night, to.night, eased);
    const dim = isDarkTheme ? mix(openSkyDarkDim, 1, night) : 1;
    const stop = (index: 0 | 1 | 2): Rgb => {
        const rgb = mixRgb(from.open[index], to.open[index], eased);
        return [rgb[0] * dim, rgb[1] * dim, rgb[2] * dim];
    };
    return { zenith: stop(0), middle: stop(1), horizon: stop(2), night };
}

/**
 * The pond's lighting for an hour of the day (0 to 24, fractional), with
 * a dimmer version for the site's dark theme so the pond never glares.
 */
export function daylightAt(hour: number, isDarkTheme: boolean): Daylight {
    const { from, to, eased } = phaseAt(hour);

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

/** Mumbai, whose clock and sun the koi, the 404 sky, the footer and the bulbul follow. */
export const mumbaiLocation = { latitude: 19.08, longitude: 72.88 } as const;

/**
 * The hour on the keyframe day that matches the sky at a place right now:
 * today's real sunrise and sunset there map onto the curve's (6:45 am and
 * 6:45 pm), so dusk in Mumbai comes near 6 pm in November and 7:20 pm in
 * June instead of at 6:45 pm all year. It uses nothing but Date, Intl and
 * Math, so the root route inlines its source into the pre-paint placeholder
 * script and the placeholder always matches the scene. The sun's position is
 * the same approximation as `sunTimes` (a unit test holds them together).
 */
export function skyHourAt(now: Date, latitude: number, longitude: number): number {
    const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(now);
    let clock = 0;
    for (const part of parts) {
        if (part.type === "hour") clock += Number(part.value);
        if (part.type === "minute") clock += Number(part.value) / 60;
    }
    const radians = Math.PI / 180;
    const india = new Date(now.getTime() + 5.5 * 3600000);
    const day = Math.floor((india.getTime() - Date.UTC(india.getUTCFullYear(), 0, 0)) / 86400000);
    const declination = 23.44 * radians * Math.sin((2 * Math.PI * (284 + day)) / 365);
    const b = (2 * Math.PI * (day - 81)) / 364;
    const equationOfTime = 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
    const noon = 12 + ((82.5 - longitude) * 4) / 60 - equationOfTime / 60;
    const phi = latitude * radians;
    const cosine = (Math.sin(-0.833 * radians) - Math.sin(phi) * Math.sin(declination)) / (Math.cos(phi) * Math.cos(declination));
    const halfDay = Math.acos(Math.min(1, Math.max(-1, cosine))) / radians / 15;
    const sunrise = noon - halfDay;
    const sunset = noon + halfDay;
    const curveSunrise = 6.75;
    const curveSunset = 18.75;
    if (clock >= sunrise && clock <= sunset) {
        return curveSunrise + ((clock - sunrise) / (sunset - sunrise)) * (curveSunset - curveSunrise);
    }
    const sinceSunset = (clock - sunset + 24) % 24;
    return (curveSunset + (sinceSunset / (24 - (sunset - sunrise))) * (24 - (curveSunset - curveSunrise))) % 24;
}

/** The light curve's hour for Mumbai's sky right now. */
export function sceneHour(now = new Date()) {
    return skyHourAt(now, mumbaiLocation.latitude, mumbaiLocation.longitude);
}

/** The same for the sky at home in Bijethua, which the Kund scene follows. */
export function homeHour(now = new Date()) {
    return skyHourAt(now, home.latitude, home.longitude);
}
