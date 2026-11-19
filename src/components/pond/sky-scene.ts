import { mumbaiHour, openSkyAt, type OpenSkyLight } from "./pond-daylight";
import type { Pond } from "./pond-engine";
import { createFlock, type Flock, type Point } from "./sky-flock";

/**
 * The 404's scene: Mumbai's open sky at the current hour over a line of
 * rooftops, and a flock that writes "404" in it. By day the flock is small
 * birds, dark against the light. At night it is fireflies. A tap flushes
 * them and they come back.
 *
 * Everything is drawn on one 2D canvas, so it needs no WebGL and stays
 * cheap on a phone: a gradient sky with the sun or the moon, stars, two
 * drifting bands of cloud, a hazy far skyline and a dark near one with
 * water tanks, aerials, a clothesline and a palm. The skylines and clouds
 * are painted once per size and tinted only when the light changes; each
 * frame is a handful of image draws and the flock. `sky-flock.ts` holds
 * the flock's behaviour.
 */

type SkySceneOptions = Readonly<{
    /** Fixes the hour (0 to 24) instead of reading the Mumbai clock. */
    hourOverride?: number;
    container: HTMLElement;
    canvas: HTMLCanvasElement;
    /** Starts on a still frame with the numerals written; taps swap between still frames. */
    reducedMotion: boolean;
    isDark: () => boolean;
}>;

type Rgb = readonly [number, number, number];

const pixelRatioCap = 2;
const maxStepSeconds = 0.05;
/** How often the scene re-reads the clock in Mumbai, in seconds. */
const clockSeconds = 20;
/** The horizon, as a share of the frame's height from the top. The far skyline stands on it. */
const horizon = 0.8;
/** Sunrise and sunset on the light curve's day, in hours. */
const sunrise = 6.4;
const sunset = 18.6;
/** Night is "fireflies" above the second value and "birds" below the first, with a crossfade between. */
const fireflyNight: readonly [number, number] = [0.45, 0.75];
/** Clouds cross the frame at these speeds, in frame heights per second: the high band, then the low one. */
const cloudDrift: readonly [number, number] = [0.006, 0.013];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smoothstep = (from: number, to: number, value: number) => {
    const t = clamp((value - from) / (to - from), 0, 1);
    return t * t * (3 - 2 * t);
};
const mixRgb = (a: Rgb, b: Rgb, t: number): Rgb => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const css = (rgb: Rgb, alpha = 1) =>
    `rgba(${Math.round(rgb[0])}, ${Math.round(rgb[1])}, ${Math.round(rgb[2])}, ${alpha})`;

/** A seeded random source, so the rooftops and clouds come out the same on every visit. */
function seeded(seed: number) {
    let state = seed >>> 0;
    return (min = 0, max = 1) => {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return min + (((t ^ (t >>> 14)) >>> 0) / 4294967296) * (max - min);
    };
}

type Layer = Readonly<{ canvas: HTMLCanvasElement; context: CanvasRenderingContext2D }>;

function createLayer(width: number, height: number, ratio: number): Layer | null {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * ratio));
    canvas.height = Math.max(1, Math.round(height * ratio));
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    return { canvas, context };
}

/** Copies a white-on-clear shape layer into another layer in one flat colour. */
function tint(shape: Layer, into: Layer, color: string) {
    const { canvas, context } = into;
    context.save();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.globalCompositeOperation = "copy";
    context.drawImage(shape.canvas, 0, 0);
    context.globalCompositeOperation = "source-in";
    context.fillStyle = color;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.restore();
}

type Skyline = Readonly<{
    seed: number;
    /** Building widths, and heights at the middle and at the edges of the frame, in frame heights. */
    wide: readonly [number, number];
    tallMiddle: number;
    tallEdge: number;
    /** The chance that a building away from the middle is a slim tower. */
    towers: number;
}>;

/**
 * A band of city on the horizon: flat-roofed blocks with setbacks, stair
 * heads and masts, a few slim towers, and one crane. Buildings are lower
 * toward the middle of the frame, so the numerals have clear sky.
 */
function paintSkyline(shape: Layer, windows: Layer, width: number, height: number, city: Skyline) {
    const next = seeded(city.seed);
    const ground = height * horizon;
    const context = shape.context;
    context.fillStyle = "#fff";
    windows.context.fillStyle = "rgb(255, 214, 150)";
    const pane = Math.max(1, height * 0.006);
    const hair = Math.max(0.7, height * 0.0035);
    let x = -height * 0.05;
    let craned = false;
    while (x < width) {
        const fromMiddle = Math.min(1, Math.abs(x - width / 2) / (width / 2));
        const room = lerp(city.tallMiddle, city.tallEdge, fromMiddle ** 1.4);
        const isTower = fromMiddle > 0.3 && next() < city.towers;
        const wide = height * (isTower ? next(city.wide[0] * 0.55, city.wide[0]) : next(city.wide[0], city.wide[1]));
        const tall = height * (isTower ? next(room * 1.15, room * 1.8) : next(room * 0.35, room));
        const top = ground - tall;
        context.fillRect(x, top, wide, tall + height);
        // The roof: a setback storey, a stair head, a water tank, or a mast.
        const roof = next();
        if (roof < 0.3) context.fillRect(x + wide * 0.18, top - height * 0.02, wide * 0.64, height * 0.022);
        else if (roof < 0.55) context.fillRect(x + wide * next(0.1, 0.55), top - height * 0.013, wide * 0.3, height * 0.015);
        else if (roof < 0.7) context.fillRect(x + wide * next(0.2, 0.6), top - height * 0.016, height * 0.016, height * 0.018);
        if (isTower && next() < 0.55) context.fillRect(x + wide * 0.5, top - height * 0.055, hair, height * 0.055);
        if (isTower && !craned && fromMiddle > 0.55) {
            // A tower crane on a building still going up.
            craned = true;
            const mast = x + wide * 0.3;
            const jib = top - height * 0.07;
            context.fillRect(mast, jib, hair * 1.3, height * 0.07);
            context.fillRect(mast - height * 0.03, jib, height * 0.13, hair * 1.3);
            context.fillRect(mast + height * 0.085, jib, hair, height * 0.03);
        }
        // Windows in a loose grid; about one in four is lit at night.
        for (let wy = top + pane * 3; wy < ground - pane * 2; wy += pane * 3.4) {
            for (let wx = x + pane * 2; wx < x + wide - pane * 2; wx += pane * 3) {
                if (next() < 0.24) windows.context.fillRect(wx, wy, pane, pane * 1.3);
            }
        }
        x += wide + height * next(-0.012, 0.016);
    }
}

/** The city far off in the haze, and the nearer blocks in front of it. */
const distantCity: Skyline = { seed: 404, wide: [0.05, 0.1], tallMiddle: 0.09, tallEdge: 0.3, towers: 0.34 };
const nearerCity: Skyline = { seed: 71, wide: [0.08, 0.17], tallMiddle: 0.05, tallEdge: 0.13, towers: 0 };

/** The near rooftops along the bottom edge, with the clutter of a Mumbai terrace on them. */
function paintNearRooftops(shape: Layer, windows: Layer, width: number, height: number) {
    const next = seeded(92);
    const context = shape.context;
    context.fillStyle = "#fff";
    context.strokeStyle = "#fff";
    context.lineCap = "round";
    const hair = Math.max(0.8, height * 0.0045);
    const lamp = windows.context;

    /** A water tank on a stand: a squat drum with a domed lid. */
    function tank(x: number, roof: number, size: number) {
        const wide = size * 0.9;
        const tall = size * 0.7;
        const stand = size * 0.34;
        context.fillRect(x, roof - stand - tall, wide, tall);
        context.beginPath();
        context.ellipse(x + wide / 2, roof - stand - tall, wide / 2, size * 0.13, 0, Math.PI, 0);
        context.fill();
        context.fillRect(x + wide * 0.12, roof - stand, hair * 1.4, stand);
        context.fillRect(x + wide * 0.82, roof - stand, hair * 1.4, stand);
        context.fillRect(x + wide * 0.05, roof - stand, wide * 0.9, hair * 1.2);
    }
    /** An old television aerial: a mast with a few cross bars. */
    function aerial(x: number, roof: number, tall: number) {
        context.lineWidth = hair;
        context.beginPath();
        context.moveTo(x, roof);
        context.lineTo(x, roof - tall);
        for (let i = 0; i < 3; i++) {
            const y = roof - tall * (0.62 + i * 0.16);
            const half = tall * (0.2 - i * 0.04);
            context.moveTo(x - half, y);
            context.lineTo(x + half, y);
        }
        context.stroke();
    }
    /** A clothesline: two poles, a sagging line, and a few things drying on it. */
    function clothesline(x: number, roof: number, span: number, tall: number) {
        context.lineWidth = hair;
        context.beginPath();
        context.moveTo(x, roof);
        context.lineTo(x, roof - tall);
        context.moveTo(x + span, roof);
        context.lineTo(x + span, roof - tall);
        context.moveTo(x, roof - tall * 0.92);
        context.quadraticCurveTo(x + span / 2, roof - tall * 0.66, x + span, roof - tall * 0.92);
        context.stroke();
        for (let i = 0; i < 4; i++) {
            const t = 0.16 + i * 0.22 + next(-0.03, 0.03);
            const sag = 4 * t * (1 - t) * tall * 0.13;
            const wide = span * next(0.09, 0.15);
            context.fillRect(x + span * t - wide / 2, roof - tall * 0.92 + sag, wide, tall * next(0.3, 0.5));
        }
    }
    /** A coconut palm leaning in from the edge: a curved trunk and a crown of drooping fronds. */
    function palm(x: number, base: number, tall: number, lean: number) {
        const topX = x + lean;
        const topY = base - tall;
        context.lineWidth = Math.max(1.6, height * 0.011);
        context.beginPath();
        context.moveTo(x, base);
        context.quadraticCurveTo(x + lean * 0.15, base - tall * 0.55, topX, topY);
        context.stroke();
        for (let i = 0; i < 9; i++) {
            const angle = -Math.PI * 0.5 + (i - 4) * 0.42 + next(-0.08, 0.08);
            const reach = tall * next(0.34, 0.46);
            const tipX = topX + Math.cos(angle) * reach;
            const tipY = topY + Math.sin(angle) * reach * 0.62 + reach * 0.5;
            const midX = topX + Math.cos(angle) * reach * 0.62;
            const midY = topY + Math.sin(angle) * reach * 0.62 - reach * 0.08;
            context.beginPath();
            context.moveTo(topX, topY);
            context.quadraticCurveTo(midX, midY - reach * 0.12, tipX, tipY);
            context.quadraticCurveTo(midX, midY + reach * 0.1, topX, topY);
            context.fill();
        }
    }

    let x = -height * 0.1;
    let index = 0;
    while (x < width) {
        const wide = height * next(0.42, 0.85);
        const roof = height * next(0.875, 0.93);
        context.fillRect(x, roof, wide, height);
        // A parapet with a gap or two, then one or two things on the terrace.
        context.fillRect(x, roof - height * 0.012, wide * next(0.3, 0.6), height * 0.014);
        const first = index % 4;
        if (first === 0) tank(x + wide * next(0.5, 0.7), roof, height * next(0.07, 0.09));
        if (first === 1) clothesline(x + wide * next(0.12, 0.3), roof, wide * next(0.34, 0.46), height * 0.075);
        if (first === 2) aerial(x + wide * next(0.3, 0.7), roof, height * next(0.1, 0.14));
        if (first === 3) {
            // A stair head with a lit doorway at night.
            const boxX = x + wide * next(0.15, 0.5);
            const boxWide = height * 0.1;
            const boxTall = height * 0.065;
            context.fillRect(boxX, roof - boxTall, boxWide, boxTall);
            lamp.fillStyle = "rgb(255, 196, 120)";
            lamp.fillRect(boxX + boxWide * 0.38, roof - boxTall * 0.72, boxWide * 0.24, boxTall * 0.72);
        }
        if (next() < 0.45) aerial(x + wide * next(0.05, 0.95), roof, height * next(0.06, 0.1));
        // Roofs overlap a little, so no sky shows between two buildings.
        x += wide - height * next(0.01, 0.04);
        index += 1;
    }
    palm(width * 0.05, height * 0.96, height * 0.36, height * 0.05);
    palm(width * 0.965, height * 0.97, height * 0.27, -height * 0.035);
}

/** A band of cloud that tiles sideways: soft heaps and a few thin streaks. */
function paintClouds(shape: Layer, tile: number, height: number, seed: number, top: number, bottom: number, count: number) {
    const next = seeded(seed);
    const context = shape.context;
    const puff = (x: number, y: number, radius: number, alpha: number) => {
        // Drawn on both sides of the seam, so the tile repeats without a cut.
        for (const offset of [0, tile, -tile]) {
            const cx = x + offset;
            if (cx + radius < 0 || cx - radius > tile) continue;
            const gradient = context.createRadialGradient(cx, y, 0, cx, y, radius);
            gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
            gradient.addColorStop(0.55, `rgba(255, 255, 255, ${alpha * 0.55})`);
            gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
            context.fillStyle = gradient;
            context.fillRect(cx - radius, y - radius, radius * 2, radius * 2);
        }
    };
    for (let i = 0; i < count; i++) {
        const x = ((i + next(0.1, 0.9)) / count) * tile;
        const y = height * next(top, bottom);
        const size = height * next(0.07, 0.13);
        const puffs = Math.round(next(5, 9));
        context.save();
        // Clouds are wider than they are tall.
        context.translate(0, y);
        context.scale(1, 0.42);
        for (let p = 0; p < puffs; p++) {
            const along = (p / (puffs - 1) - 0.5) * 2;
            puff(x + along * size * 1.9, -size * (1 - along * along) * 0.5 + next(-0.1, 0.1) * size, size * (1.15 - 0.5 * along * along), 0.5);
        }
        context.restore();
    }
    // A few long thin streaks of high cloud.
    context.save();
    context.scale(1, 0.12);
    for (let i = 0; i < Math.ceil(count / 2); i++) {
        puff(next(0, tile), (height * next(top, bottom)) / 0.12, height * next(0.3, 0.5), 0.3);
    }
    context.restore();
}

type Star = Readonly<{ x: number; y: number; size: number; phase: number }>;

export function createSkyScene(options: SkySceneOptions): Pond | null {
    const { hourOverride, container, canvas, reducedMotion, isDark } = options;
    const context = canvas.getContext("2d");
    if (!context) return null;

    let width = 0;
    let height = 0;
    let ratio = 1;
    let time = 0;
    let hour = hourOverride ?? mumbaiHour();
    let clockAge = 0;
    let frame: number | undefined;
    let lastTimestamp: number | undefined;
    let isActive = false;
    let pointer: Point | null = null;
    let flock: Flock | undefined;
    let stars: Star[] = [];
    /** The painted shapes, and their copies tinted for the current light. */
    let shapes: { distant: Layer; far: Layer; near: Layer; windows: Layer; lamps: Layer; high: Layer; low: Layer } | undefined;
    let tinted: { distant: Layer; far: Layer; near: Layer; high: Layer; low: Layer } | undefined;
    let tintedFor = "";
    let cloudTile = 1;
    let firefly: HTMLCanvasElement | undefined;

    const light = (): OpenSkyLight => openSkyAt(hour, isDark());
    /** 0 while the flock is birds, 1 once it is fireflies. */
    const fireflies = (sky: OpenSkyLight) => smoothstep(fireflyNight[0], fireflyNight[1], sky.night);

    /** Tints the skylines and clouds for the light, only when the light has changed. */
    function relight(sky: OpenSkyLight) {
        if (!shapes || !tinted) return;
        const key = `${sky.zenith.map(Math.round)}|${sky.horizon.map(Math.round)}`;
        if (key === tintedFor) return;
        tintedFor = key;
        // Rooftops are near-black against the sky; each band of city behind them sits further back into the haze.
        const near: Rgb = [sky.zenith[0] * 0.26 + 5, sky.zenith[1] * 0.26 + 6, sky.zenith[2] * 0.26 + 9];
        const far = mixRgb(sky.horizon, near, 0.5);
        const distant = mixRgb(sky.horizon, near, 0.24);
        tint(shapes.distant, tinted.distant, css(distant));
        // Clouds take the horizon's colour by day and sink to a dim grey at night.
        const cloud = mixRgb([255, 255, 255], sky.horizon, 0.36).map((value) => value * (1 - 0.7 * sky.night)) as unknown as Rgb;
        tint(shapes.far, tinted.far, css(far));
        tint(shapes.near, tinted.near, css(near));
        tint(shapes.high, tinted.high, css(cloud));
        tint(shapes.low, tinted.low, css(cloud));
    }

    /** Where the sun and the moon are for the hour, in pixels. Each arcs from the left edge to the right. */
    function lamps() {
        const day = (hour - sunrise) / (sunset - sunrise);
        const dark = ((hour - sunset + 24) % 24) / (24 - (sunset - sunrise));
        const ground = height * horizon;
        return {
            // The sun climbs out of the top of the frame by mid-morning; only its glow is left at noon.
            sun: { x: width * lerp(0.12, 0.88, day), y: ground - Math.sin(Math.PI * clamp(day, 0, 1)) * height * 1.3, up: day > -0.02 && day < 1.02 },
            moon: { x: width * lerp(0.14, 0.86, dark), y: ground - Math.sin(Math.PI * clamp(dark, 0, 1)) * height * 0.7 },
            /** 1 with the sun on the horizon, 0 with it overhead. */
            low: 1 - Math.sin(Math.PI * clamp(day, 0, 1)),
        };
    }

    function drawSky(sky: OpenSkyLight) {
        if (!context) return;
        const gradient = context.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, css(sky.zenith));
        gradient.addColorStop(0.5, css(sky.middle));
        gradient.addColorStop(horizon + 0.04, css(sky.horizon));
        gradient.addColorStop(1, css(sky.horizon));
        context.fillStyle = gradient;
        context.fillRect(0, 0, width, height);

        const { sun, moon, low } = lamps();
        const daylight = 1 - smoothstep(0.3, 0.9, sky.night);
        if (sun.up && daylight > 0.01) {
            // A wide warm glow, redder as the sun sinks, then the disc itself.
            const warm: Rgb = mixRgb([255, 246, 222], [255, 176, 104], low);
            const reach = height * lerp(1.1, 0.75, low);
            const glow = context.createRadialGradient(sun.x, sun.y, 0, sun.x, sun.y, reach);
            glow.addColorStop(0, css(warm, 0.62 * daylight));
            glow.addColorStop(0.25, css(warm, 0.26 * daylight));
            glow.addColorStop(1, css(warm, 0));
            context.fillStyle = glow;
            context.fillRect(0, 0, width, height);
            const radius = height * 0.05;
            const disc = context.createRadialGradient(sun.x, sun.y, radius * 0.6, sun.x, sun.y, radius * 1.25);
            disc.addColorStop(0, css(mixRgb([255, 252, 240], [255, 214, 150], low), daylight));
            disc.addColorStop(1, css(warm, 0));
            context.fillStyle = disc;
            context.fillRect(sun.x - radius * 1.3, sun.y - radius * 1.3, radius * 2.6, radius * 2.6);
        }

        const moonlight = smoothstep(0.45, 0.9, sky.night);
        if (moonlight > 0.01) {
            // Stars first: fewer and fainter toward the horizon, where the city's glow washes them out.
            for (const star of stars) {
                const haze = 1 - star.y / (height * horizon);
                const twinkle = 0.55 + 0.45 * Math.sin(time * 1.3 + star.phase);
                context.fillStyle = `rgba(232, 238, 255, ${moonlight * haze * twinkle * 0.9})`;
                context.fillRect(star.x, star.y, star.size, star.size);
            }
            const radius = height * 0.046;
            const halo = context.createRadialGradient(moon.x, moon.y, radius * 0.8, moon.x, moon.y, radius * 6);
            halo.addColorStop(0, `rgba(206, 220, 255, ${0.3 * moonlight})`);
            halo.addColorStop(0.3, `rgba(190, 208, 250, ${0.1 * moonlight})`);
            halo.addColorStop(1, "rgba(190, 208, 250, 0)");
            context.fillStyle = halo;
            context.fillRect(moon.x - radius * 6, moon.y - radius * 6, radius * 12, radius * 12);
            context.fillStyle = `rgba(240, 242, 232, ${moonlight})`;
            context.beginPath();
            context.arc(moon.x, moon.y, radius, 0, Math.PI * 2);
            context.fill();
            // Two soft grey seas, so it reads as the moon and not a lamp.
            context.fillStyle = `rgba(178, 186, 196, ${0.42 * moonlight})`;
            context.beginPath();
            context.ellipse(moon.x - radius * 0.28, moon.y - radius * 0.2, radius * 0.36, radius * 0.28, 0.5, 0, Math.PI * 2);
            context.ellipse(moon.x + radius * 0.3, moon.y + radius * 0.34, radius * 0.24, radius * 0.18, -0.3, 0, Math.PI * 2);
            context.fill();
        }
    }

    function drawClouds(layer: Layer, drift: number, alpha: number) {
        if (!context) return;
        const offset = -((time * drift * height) % cloudTile);
        context.globalAlpha = alpha;
        context.drawImage(layer.canvas, offset, 0, cloudTile, height);
        context.drawImage(layer.canvas, offset + cloudTile, 0, cloudTile, height);
        context.globalAlpha = 1;
    }

    /** Small birds: two wing strokes each, beating, pointed the way the bird flies. */
    function drawBirds(alpha: number) {
        if (!context || !flock || alpha <= 0.01) return;
        context.lineCap = "round";
        context.lineJoin = "round";
        // Two passes: the smaller birds read as farther off, so they are drawn fainter.
        for (const isNear of [false, true]) {
            context.strokeStyle = `rgba(20, 24, 32, ${(isNear ? 0.92 : 0.6) * alpha})`;
            context.lineWidth = Math.max(0.9, height * (isNear ? 0.0046 : 0.0036));
            context.beginPath();
            for (const bird of flock.birds) {
                if (bird.seed > 0.42 !== isNear) continue;
                const speed = Math.hypot(bird.vx, bird.vy) || 1;
                const dx = bird.vx / speed;
                const dy = bird.vy / speed;
                const span = Math.max(2, height * (0.0085 + 0.0065 * bird.seed));
                // Seen from far off, a beating wing only looks shorter and longer, and its tip trails the body.
                const out = span * (0.5 + 0.5 * Math.abs(Math.cos(bird.flap)));
                const back = span * (0.3 + 0.25 * Math.sin(bird.flap));
                context.moveTo(bird.x - dy * out - dx * back, bird.y + dx * out - dy * back);
                context.lineTo(bird.x, bird.y);
                context.lineTo(bird.x + dy * out - dx * back, bird.y - dx * out - dy * back);
            }
            context.stroke();
        }
    }

    /** Fireflies: a warm point with a soft glow, each pulsing in its own time. */
    function drawFireflies(alpha: number) {
        if (!context || !flock || !firefly || alpha <= 0.01) return;
        context.globalCompositeOperation = "lighter";
        for (const bird of flock.birds) {
            const pulse = 0.5 + 0.5 * Math.sin(time * (1.4 + bird.seed * 2.2) + bird.seed * 40);
            const size = Math.max(7, height * (0.034 + 0.02 * bird.seed));
            context.globalAlpha = alpha * (0.4 + 0.6 * pulse * pulse);
            context.drawImage(firefly, bird.x - size / 2, bird.y - size / 2, size, size);
        }
        context.globalAlpha = 1;
        context.globalCompositeOperation = "source-over";
    }

    function draw() {
        if (!context || !shapes || !tinted || width === 0) return;
        const sky = light();
        relight(sky);
        const glow = fireflies(sky);
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        drawSky(sky);
        drawClouds(tinted.high, cloudDrift[0], lerp(0.85, 0.5, sky.night));
        drawClouds(tinted.low, cloudDrift[1], lerp(0.7, 0.4, sky.night));
        context.drawImage(tinted.distant.canvas, 0, 0, width, height);
        context.drawImage(tinted.far.canvas, 0, 0, width, height);
        context.globalAlpha = smoothstep(0.35, 0.85, sky.night) * 0.85;
        context.drawImage(shapes.windows.canvas, 0, 0, width, height);
        context.globalAlpha = 1;
        // Ground haze: the city fades into the horizon's colour toward its feet.
        const haze = context.createLinearGradient(0, height * (horizon - 0.22), 0, height * (horizon + 0.1));
        haze.addColorStop(0, css(sky.horizon, 0));
        haze.addColorStop(1, css(sky.horizon, lerp(0.62, 0.3, sky.night)));
        context.fillStyle = haze;
        context.fillRect(0, height * (horizon - 0.22), width, height * 0.32);
        drawBirds(1 - glow);
        drawFireflies(glow);
        // The near rooftops come last, so a low-flying bird passes behind them.
        context.drawImage(tinted.near.canvas, 0, 0, width, height);
        context.globalAlpha = smoothstep(0.35, 0.85, sky.night) * 0.9;
        context.drawImage(shapes.lamps.canvas, 0, 0, width, height);
        context.globalAlpha = 1;
    }

    function step(dt: number) {
        time += dt;
        clockAge += dt;
        if (hourOverride === undefined && clockAge > clockSeconds) {
            clockAge = 0;
            hour = mumbaiHour();
        }
        flock?.step(dt, { night: fireflies(light()), pointer });
    }

    function tick(timestamp: number) {
        const dt = lastTimestamp === undefined ? 0 : Math.min(maxStepSeconds, (timestamp - lastTimestamp) / 1000);
        lastTimestamp = timestamp;
        step(dt);
        draw();
        frame = window.requestAnimationFrame(tick);
    }

    function resize() {
        const nextWidth = container.clientWidth;
        const nextHeight = container.clientHeight;
        if (nextWidth === 0 || nextHeight === 0) return;
        const nextRatio = Math.min(pixelRatioCap, window.devicePixelRatio || 1);
        if (nextWidth === width && nextHeight === height && nextRatio === ratio) {
            draw();
            return;
        }
        width = nextWidth;
        height = nextHeight;
        ratio = nextRatio;
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
        cloudTile = Math.max(width, height * 2) * 1.5;

        const layer = (layerWidth: number, detail = 1) => createLayer(layerWidth, height, ratio * detail);
        const distant = layer(width);
        const far = layer(width);
        const near = layer(width);
        const windows = layer(width);
        const lampLayer = layer(width);
        // Clouds are soft, so half the resolution is plenty and a quarter of the memory.
        const high = layer(cloudTile, 0.5);
        const low = layer(cloudTile, 0.5);
        const tintedLayers = [layer(width), layer(width), layer(width), layer(cloudTile, 0.5), layer(cloudTile, 0.5)];
        if (!distant || !far || !near || !windows || !lampLayer || !high || !low || tintedLayers.some((entry) => !entry)) return;
        paintSkyline(distant, windows, width, height, distantCity);
        paintSkyline(far, windows, width, height, nearerCity);
        paintNearRooftops(near, lampLayer, width, height);
        paintClouds(high, cloudTile, height, 7, 0.06, 0.3, 4);
        paintClouds(low, cloudTile, height, 31, 0.34, 0.62, 3);
        shapes = { distant, far, near, windows, lamps: lampLayer, high, low };
        const [tintedDistant, tintedFar, tintedNear, tintedHigh, tintedLow] = tintedLayers as Layer[];
        tinted = { distant: tintedDistant, far: tintedFar, near: tintedNear, high: tintedHigh, low: tintedLow };
        tintedFor = "";

        const next = seeded(11);
        stars = Array.from({ length: 90 }, () => ({
            x: next(0, width),
            y: next(0, height * horizon * 0.92),
            size: next(0.7, 1.5),
            phase: next(0, Math.PI * 2),
        }));

        // One glow, drawn once: a bright warm core fading through yellow-green.
        firefly ??= document.createElement("canvas");
        firefly.width = firefly.height = 48;
        const glowContext = firefly.getContext("2d");
        if (glowContext) {
            const glow = glowContext.createRadialGradient(24, 24, 0, 24, 24, 24);
            glow.addColorStop(0, "rgba(255, 250, 214, 1)");
            glow.addColorStop(0.16, "rgba(255, 232, 130, 0.85)");
            glow.addColorStop(0.42, "rgba(214, 226, 90, 0.22)");
            glow.addColorStop(1, "rgba(190, 220, 80, 0)");
            glowContext.fillStyle = glow;
            glowContext.fillRect(0, 0, 48, 48);
        }

        if (flock) {
            flock.resize(width, height);
        } else {
            // Birds fly in from the edge; fireflies rise from the rooftops. A still frame starts written.
            const start = reducedMotion ? "formed" : fireflies(light()) > 0.5 ? "low" : "edge";
            flock = createFlock({ width, height, start });
        }
        draw();
    }

    function setActive(active: boolean) {
        if (active === isActive) return;
        isActive = active;
        if (active) {
            lastTimestamp = undefined;
            frame = window.requestAnimationFrame(tick);
        } else if (frame !== undefined) {
            window.cancelAnimationFrame(frame);
            frame = undefined;
        }
    }

    return {
        resize,
        setActive,
        poke(x, y) {
            if (!flock) return;
            if (isActive) {
                flock.flush(x, y);
                return;
            }
            // Paused, or under reduced motion: a tap swaps between two still frames instead of animating.
            if (flock.isForming()) flock.roam();
            else flock.form();
            draw();
        },
        setPointer(point) {
            pointer = point;
        },
        destroy() {
            setActive(false);
        },
    };
}
