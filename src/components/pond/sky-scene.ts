import { sceneHour, openSkyAt, type OpenSkyLight } from "./pond-daylight";
import type { Pond } from "./pond-engine";
import { createFlock, numeralBox, type Flock, type Point } from "./sky-flock";

/**
 * The 404's scene: Mumbai's open sky at the current hour over a line of
 * rooftops, and a flock that writes "404" in it. By day the flock is small
 * birds, dark against the light. At night it is fireflies. A tap flushes
 * them and they come back.
 *
 * Everything is drawn on one 2D canvas, so it needs no WebGL and stays
 * cheap on a phone. The city, the rooftops and the clouds are painted
 * into layers in their real colours, once per size and again only when the
 * light changes. A frame is then a gradient, a handful of image draws, the
 * few things that move on their own (palms, laundry, a kite, beacons), and
 * the flock, drawn from a small sheet of wingbeat sprites. `sky-flock.ts`
 * holds the flock's behaviour.
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
/** The horizon, as a share of the frame's height from the top. The far city stands on it. */
const horizon = 0.8;
/** Sunrise and sunset on the light curve's day, in hours. */
const sunrise = 6.4;
const sunset = 18.6;
/** Night is "fireflies" above the second value and "birds" below the first, with a crossfade between. */
const fireflyNight: readonly [number, number] = [0.45, 0.75];
/** Clouds cross the frame at these speeds, in frame heights per second: the high band, then the low one. */
const cloudDrift: readonly [number, number] = [0.006, 0.013];
/** A bird's half wingspan in frame heights: the smallest, and how much larger the largest is. */
const birdSize: readonly [number, number] = [0.0085, 0.005];
/**
 * A bird glides while a slow wave of its own is above this: the first value
 * flying free (about a quarter of the time), the second settled in the
 * numerals (most of the time), so the strokes read as lines and not flicker.
 */
const glideAbove: readonly [number, number] = [0.72, -0.55];
/** The faintest bird's opacity, flying free and settled in the numerals. Settled birds are more alike, so a stroke reads as one even line. */
const birdFaintest: readonly [number, number] = [0.62, 0.86];
/** A firefly's glow in frame heights: the smallest, how much larger the largest is, and the fewest pixels it may have. */
const fireflySize: readonly [number, number, number] = [0.034, 0.02, 7];
/** Settled in the numerals, a firefly's glow shrinks to this share, at no fewer than this many pixels, so neighbours don't run together. */
const fireflyHeld: readonly [number, number] = [0.6, 5];
/** The firefly glow sprite's size in pixels: close to the sizes it is drawn at, since shrinking a sprite many times over costs far more per draw. */
const fireflyCell = 16;
/** A firefly's dimmest point in its pulse, as a share of full brightness: flying free, then settled, so a stroke never goes dark. */
const fireflyDimmest: readonly [number, number] = [0.4, 0.72];
/** The moon's radius in frame heights, its halo's reach in moon radii, and the clear sky it keeps from the numerals' box, in moon radii. */
const moonSize = { radius: 0.046, halo: 3.6, clearance: 2.2 } as const;
/** The wingbeat sprites: how many poses, and the size of one in pixels. */
const wingPoses = 8;
const spriteCell = 40;
/** The wind: how far a palm frond, a shirt on the line and the kite swing, as a share of their own size. */
const wind = { palm: 0.07, cloth: 0.16, kite: 0.3 } as const;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smoothstep = (from: number, to: number, value: number) => {
    const t = clamp((value - from) / (to - from), 0, 1);
    return t * t * (3 - 2 * t);
};
const mixRgb = (a: Rgb, b: Rgb, t: number): Rgb => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const scaleRgb = (rgb: Rgb, by: number): Rgb => [rgb[0] * by, rgb[1] * by, rgb[2] * by];
const css = (rgb: Rgb, alpha = 1) =>
    `rgba(${Math.round(clamp(rgb[0], 0, 255))}, ${Math.round(clamp(rgb[1], 0, 255))}, ${Math.round(clamp(rgb[2], 0, 255))}, ${alpha})`;

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

type Layer = Readonly<{ canvas: HTMLCanvasElement; context: CanvasRenderingContext2D; width: number; height: number }>;

function createLayer(width: number, height: number, ratio: number): Layer | null {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * ratio));
    canvas.height = Math.max(1, Math.round(height * ratio));
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    return { canvas, context, width, height };
}

/** One building of the far city. */
type Block = Readonly<{
    x: number;
    wide: number;
    top: number;
    /** Lighter or darker than its neighbours, and warmer or cooler, each -1 to 1, so two buildings never merge into one slab. */
    tone: number;
    warmth: number;
    /** What stands on its roof: a set-back storey, a stair head or a tank, as x, width and height. */
    roof?: readonly [number, number, number];
    /** The height of a mast on a tower, and whether a crane stands on it. */
    mast: number;
    crane: boolean;
    /** Its lit windows at night, as x and y pairs. */
    lit: readonly number[];
}>;

/** A band of city: how far back in the haze it stands, 0 at the rooftops and 1 at the horizon. */
type Band = Readonly<{ haze: number; blocks: readonly Block[] }>;

type Roof = Readonly<{ x: number; wide: number; top: number; parapet: number }>;
type Palm = Readonly<{ x: number; base: number; tall: number; lean: number; fronds: readonly (readonly [number, number])[] }>;
type Washing = Readonly<{ x: number; top: number; span: number; tall: number; cloths: readonly (readonly [number, number, number, number])[] }>;

/** Everything that stands in the frame, worked out once per size. Painting it is a separate step, redone when the light changes. */
type Town = Readonly<{
    bands: readonly Band[];
    roofs: readonly Roof[];
    tanks: readonly (readonly [number, number, number])[];
    aerials: readonly (readonly [number, number, number])[];
    stairs: readonly (readonly [number, number, number, number])[];
    washing: Washing | null;
    palms: readonly Palm[];
    /** The tops of the tallest towers, where a red light blinks at night. */
    beacons: readonly Point[];
    /** Where the kite's string is held. */
    flyer: Point;
}>;

type City = Readonly<{
    seed: number;
    haze: number;
    /** Building widths, and heights at the middle and at the edges of the frame, in frame heights. */
    wide: readonly [number, number];
    tallMiddle: number;
    tallEdge: number;
    /** The chance that a building away from the middle is a slim tower. */
    towers: number;
}>;

/** The city far off in the haze, and the nearer blocks in front of it. */
const distantCity: City = { seed: 404, haze: 0.76, wide: [0.05, 0.1], tallMiddle: 0.09, tallEdge: 0.3, towers: 0.34 };
const nearerCity: City = { seed: 71, haze: 0.5, wide: [0.08, 0.17], tallMiddle: 0.05, tallEdge: 0.13, towers: 0 };

/**
 * Lays out a band of city on the horizon: flat-roofed blocks shoulder to
 * shoulder, a few slim towers, and one crane. Buildings are lower toward
 * the middle of the frame, so the numerals have clear sky.
 */
function layCity(width: number, height: number, city: City, beacons: Point[]): Band {
    const next = seeded(city.seed);
    const ground = height * horizon;
    const pane = Math.max(1, height * 0.006);
    const blocks: Block[] = [];
    let x = -height * 0.05;
    let craned = false;
    while (x < width) {
        const fromMiddle = Math.min(1, Math.abs(x - width / 2) / (width / 2));
        const room = lerp(city.tallMiddle, city.tallEdge, fromMiddle ** 1.4);
        const isTower = fromMiddle > 0.3 && next() < city.towers;
        const wide = height * (isTower ? next(city.wide[0] * 0.55, city.wide[0]) : next(city.wide[0], city.wide[1]));
        const tall = height * (isTower ? next(room * 1.15, room * 1.8) : next(room * 0.35, room));
        const top = ground - tall;
        const kind = next();
        const roof: Block["roof"] =
            kind < 0.3
                ? [x + wide * 0.18, wide * 0.64, height * 0.022]
                : kind < 0.55
                  ? [x + wide * next(0.1, 0.55), wide * 0.3, height * 0.015]
                  : kind < 0.7
                    ? [x + wide * next(0.2, 0.6), height * 0.016, height * 0.018]
                    : undefined;
        const mast = isTower && next() < 0.55 ? height * 0.055 : 0;
        const crane: boolean = isTower && !craned && fromMiddle > 0.55;
        if (crane) craned = true;
        if (isTower && tall > height * 0.24) beacons.push({ x: x + wide * 0.5, y: top - mast - (crane ? height * 0.07 : 0) });
        // Windows in a loose grid; about one in four is lit at night.
        const lit: number[] = [];
        for (let wy = top + pane * 3; wy < ground - pane * 2; wy += pane * 3.4) {
            for (let wx = x + pane * 2; wx < x + wide - pane * 2; wx += pane * 3) {
                if (next() < 0.24) lit.push(wx, wy);
            }
        }
        blocks.push({ x, wide, top, tone: next(-1, 1), warmth: next(-1, 1), roof, mast, crane, lit });
        // Mostly shoulder to shoulder; now and then a street's width of sky.
        x += wide + (next() < 0.12 ? height * next(0.02, 0.045) : -height * next(0, 0.012));
    }
    return { haze: city.haze, blocks };
}

/** Lays out the frame: two bands of city, the near rooftops with a terrace's clutter, and a palm at each edge. */
function layTown(width: number, height: number): Town {
    const beacons: Point[] = [];
    const bands = [layCity(width, height, distantCity, beacons), layCity(width, height, nearerCity, beacons)];
    const next = seeded(92);
    const roofs: Roof[] = [];
    const tanks: (readonly [number, number, number])[] = [];
    const aerials: (readonly [number, number, number])[] = [];
    const stairs: (readonly [number, number, number, number])[] = [];
    let washing: Washing | null = null;
    let x = -height * 0.1;
    let index = 0;
    while (x < width) {
        const wide = height * next(0.42, 0.85);
        const top = height * next(0.875, 0.93);
        roofs.push({ x, wide, top, parapet: wide * next(0.3, 0.6) });
        const first = index % 4;
        if (first === 0) tanks.push([x + wide * next(0.5, 0.7), top, height * next(0.07, 0.09)]);
        if (first === 1 && !washing) {
            const span = wide * next(0.34, 0.46);
            const tall = height * 0.078;
            washing = {
                x: x + wide * next(0.12, 0.3),
                top,
                span,
                tall,
                // Each thing on the line: where along it, its width, its drop, and which colour it is.
                cloths: Array.from({ length: 4 }, (_, i) => [0.16 + i * 0.22 + next(-0.03, 0.03), span * next(0.1, 0.16), tall * next(0.34, 0.52), i] as const),
            };
        }
        if (first === 2) aerials.push([x + wide * next(0.3, 0.7), top, height * next(0.1, 0.14)]);
        if (first === 3) stairs.push([x + wide * next(0.15, 0.5), top, height * 0.1, height * 0.065]);
        if (next() < 0.45) aerials.push([x + wide * next(0.05, 0.95), top, height * next(0.06, 0.1)]);
        // Roofs overlap a little, so no sky shows between two buildings.
        x += wide - height * next(0.01, 0.04);
        index += 1;
    }
    const palm = (px: number, base: number, tall: number, lean: number): Palm => ({
        x: px,
        base,
        tall,
        lean,
        fronds: Array.from({ length: 9 }, (_, i) => [-Math.PI * 0.5 + (i - 4) * 0.42 + next(-0.08, 0.08), tall * next(0.34, 0.46)] as const),
    });
    return {
        bands,
        roofs,
        tanks,
        aerials,
        stairs,
        washing,
        palms: [palm(width * 0.05, height * 0.96, height * 0.36, height * 0.05), palm(width * 0.965, height * 0.97, height * 0.27, -height * 0.035)],
        beacons,
        flyer: { x: width * 0.9, y: height * 0.885 },
    };
}

/** The colours everything in the frame takes from the sky at this hour. */
function palette(sky: OpenSkyLight) {
    // Rooftops are near-black against the sky; each band of city behind them sits further back into the haze.
    const near: Rgb = [sky.zenith[0] * 0.26 + 5, sky.zenith[1] * 0.26 + 6, sky.zenith[2] * 0.26 + 9];
    return {
        near,
        band: (haze: number) => mixRgb(near, sky.horizon, haze),
        // Clouds are lit in the horizon's colour and shaded in the sky's own, and sink to a dim grey at night.
        cloudLit: scaleRgb(mixRgb([255, 255, 255], sky.horizon, 0.3), 1 - 0.68 * sky.night),
        cloudShade: scaleRgb(mixRgb(sky.middle, sky.zenith, 0.35), lerp(1.08, 0.75, sky.night)),
        /** How bright the windows and lamps are: 0 by day, 1 at night. */
        lights: smoothstep(0.35, 0.85, sky.night),
    };
}

/** Paints both bands of city in their colours for this light. `lampX` is where the sun or moon stands, and `glow` how low and warm it is. */
function paintCity(layer: Layer, town: Town, sky: OpenSkyLight, lampX: number, glow: number) {
    const { context, width, height } = layer;
    const colours = palette(sky);
    const pane = Math.max(1, height * 0.006);
    const hair = Math.max(0.7, height * 0.0035);
    context.clearRect(0, 0, width, height);
    for (const band of town.bands) {
        const base = colours.band(band.haze);
        for (const block of band.blocks) {
            // Sandstone and plaster on some, concrete and glass on others, all of it dimmed with the light.
            const paint: Rgb = block.warmth > 0 ? [226, 204, 176] : [176, 196, 214];
            const brightness = (base[0] + base[1] + base[2]) / 600;
            const face = scaleRgb(mixRgb(base, scaleRgb(paint, brightness), Math.abs(block.warmth) * 0.22), 1 + block.tone * 0.05);
            const deep = height - block.top;
            context.fillStyle = css(face);
            context.fillRect(block.x, block.top, block.wide, deep);
            if (block.roof) context.fillRect(block.roof[0], block.top - block.roof[2], block.roof[1], block.roof[2] + 1);
            if (block.mast > 0) context.fillRect(block.x + block.wide * 0.5, block.top - block.mast, hair, block.mast);
            if (block.crane) {
                const mast = block.x + block.wide * 0.3;
                const jib = block.top - height * 0.07;
                context.fillRect(mast, jib, hair * 1.3, height * 0.07);
                context.fillRect(mast - height * 0.03, jib, height * 0.13, hair * 1.3);
                context.fillRect(mast + height * 0.085, jib, hair, height * 0.03);
            }
            // The side turned from the light is a shade darker, and a low sun warms the side that faces it.
            const facesLeft = lampX < block.x + block.wide / 2;
            const strip = block.wide * 0.3;
            context.fillStyle = css(scaleRgb(face, 0.9));
            context.fillRect(facesLeft ? block.x + block.wide - strip : block.x, block.top, strip, deep);
            if (glow > 0.02) {
                context.fillStyle = css(sky.horizon, 0.3 * glow * band.haze);
                context.fillRect(facesLeft ? block.x : block.x + block.wide - strip * 0.6, block.top, strip * 0.6, deep);
            }
            // Floors, as faint bands of glass.
            context.fillStyle = css(colours.near, 0.05 + 0.07 * (1 - band.haze));
            for (let wy = block.top + pane * 3; wy < height * horizon; wy += pane * 3.4) {
                context.fillRect(block.x + pane, wy, block.wide - pane * 2, pane);
            }
            if (colours.lights > 0.02) {
                context.fillStyle = `rgba(255, 214, 150, ${colours.lights * 0.9})`;
                for (let i = 0; i < block.lit.length; i += 2) context.fillRect(block.lit[i], block.lit[i + 1], pane, pane * 1.3);
            }
        }
    }
}

/** Paints the near rooftops and the things that stand still on them. The palms and the washing move, so they are drawn each frame. */
function paintRoofs(layer: Layer, town: Town, sky: OpenSkyLight, glow: number) {
    const { context, width, height } = layer;
    const colours = palette(sky);
    const hair = Math.max(0.8, height * 0.0045);
    context.clearRect(0, 0, width, height);
    context.fillStyle = css(colours.near);
    context.strokeStyle = css(colours.near);
    context.lineCap = "round";
    context.lineWidth = hair;
    for (const roof of town.roofs) {
        context.fillRect(roof.x, roof.top, roof.wide, height);
        context.fillRect(roof.x, roof.top - height * 0.012, roof.parapet, height * 0.014);
    }
    // A water tank on a stand: a squat drum with a domed lid.
    for (const [x, top, size] of town.tanks) {
        const wide = size * 0.9;
        const tall = size * 0.7;
        const stand = size * 0.34;
        context.fillRect(x, top - stand - tall, wide, tall);
        context.beginPath();
        context.ellipse(x + wide / 2, top - stand - tall, wide / 2, size * 0.13, 0, Math.PI, 0);
        context.fill();
        context.fillRect(x + wide * 0.12, top - stand, hair * 1.4, stand);
        context.fillRect(x + wide * 0.82, top - stand, hair * 1.4, stand);
        context.fillRect(x + wide * 0.05, top - stand, wide * 0.9, hair * 1.2);
    }
    // Old television aerials: a mast with a few cross bars.
    context.beginPath();
    for (const [x, top, tall] of town.aerials) {
        context.moveTo(x, top);
        context.lineTo(x, top - tall);
        for (let i = 0; i < 3; i++) {
            const y = top - tall * (0.62 + i * 0.16);
            const half = tall * (0.2 - i * 0.04);
            context.moveTo(x - half, y);
            context.lineTo(x + half, y);
        }
    }
    // The washing line's poles and the line itself.
    if (town.washing) {
        const { x, top, span, tall } = town.washing;
        context.moveTo(x, top);
        context.lineTo(x, top - tall);
        context.moveTo(x + span, top);
        context.lineTo(x + span, top - tall);
        context.moveTo(x, top - tall * 0.92);
        context.quadraticCurveTo(x + span / 2, top - tall * 0.66, x + span, top - tall * 0.92);
    }
    context.stroke();
    // Stair heads, each with a doorway that is lit at night.
    for (const [x, top, wide, tall] of town.stairs) {
        context.fillStyle = css(colours.near);
        context.fillRect(x, top - tall, wide, tall);
        if (colours.lights > 0.02) {
            const doorX = x + wide * 0.5;
            const doorY = top - tall * 0.36;
            const spill = context.createRadialGradient(doorX, doorY, 0, doorX, doorY, wide * 1.3);
            spill.addColorStop(0, `rgba(255, 190, 110, ${0.34 * colours.lights})`);
            spill.addColorStop(1, "rgba(255, 190, 110, 0)");
            context.fillStyle = spill;
            context.fillRect(doorX - wide * 1.3, doorY - wide * 1.3, wide * 2.6, wide * 2.6);
            context.fillStyle = `rgba(255, 204, 132, ${colours.lights})`;
            context.fillRect(x + wide * 0.38, top - tall * 0.72, wide * 0.24, tall * 0.72);
        }
    }
    // A low sun catches the top edge of every roof.
    if (glow > 0.02) {
        context.fillStyle = css(sky.horizon, 0.55 * glow);
        for (const roof of town.roofs) context.fillRect(roof.x, roof.top - height * 0.012, roof.parapet, Math.max(1, height * 0.004));
    }
}

/**
 * Paints a band of cloud that tiles sideways: heaps built from soft puffs,
 * each shaded underneath and lit on the side the light comes from, and a
 * few thin streaks. `under` is 0 with the sun overhead and 1 with it on
 * the horizon, when clouds are lit from below.
 */
function paintClouds(layer: Layer, seed: number, top: number, bottom: number, count: number, lit: Rgb, shade: Rgb, under: number) {
    const { context, width: tile, height } = layer;
    const next = seeded(seed);
    context.clearRect(0, 0, tile, height);
    const puff = (x: number, y: number, radius: number, color: Rgb, alpha: number) => {
        // Drawn on both sides of the seam, so the tile repeats without a cut.
        for (const offset of [0, tile, -tile]) {
            const cx = x + offset;
            if (cx + radius < 0 || cx - radius > tile) continue;
            const gradient = context.createRadialGradient(cx, y, 0, cx, y, radius);
            gradient.addColorStop(0, css(color, alpha));
            gradient.addColorStop(0.55, css(color, alpha * 0.55));
            gradient.addColorStop(1, css(color, 0));
            context.fillStyle = gradient;
            context.fillRect(cx - radius, y - radius, radius * 2, radius * 2);
        }
    };
    // The light sits above a cloud at noon and below it at dusk.
    const towardLight = lerp(-0.42, 0.34, under);
    for (let i = 0; i < count; i++) {
        const x = ((i + next(0.1, 0.9)) / count) * tile;
        const y = height * next(top, bottom);
        const size = height * next(0.07, 0.13);
        const puffs = Math.round(next(5, 9));
        context.save();
        // Clouds are wider than they are tall.
        context.translate(0, y);
        context.scale(1, 0.42);
        const heap: (readonly [number, number, number])[] = [];
        for (let p = 0; p < puffs; p++) {
            const along = (p / (puffs - 1) - 0.5) * 2;
            heap.push([x + along * size * 1.9, -size * (1 - along * along) * 0.5 + next(-0.1, 0.1) * size, size * (1.15 - 0.5 * along * along)]);
        }
        for (const [px, py, radius] of heap) puff(px, py, radius, shade, 0.46);
        for (const [px, py, radius] of heap) puff(px, py + radius * towardLight, radius * 0.72, lit, 0.62);
        context.restore();
    }
    // A few long thin streaks of high cloud.
    context.save();
    context.scale(1, 0.12);
    for (let i = 0; i < Math.ceil(count / 2); i++) {
        puff(next(0, tile), (height * next(top, bottom)) / 0.12, height * next(0.3, 0.5), lit, 0.3);
    }
    context.restore();
}

/**
 * The wingbeat sprites: one small bird seen from below, drawn in each pose
 * from wings spread to wings swept back. Drawing a pose from this sheet is
 * one image draw per bird, with smooth edges at any size.
 */
function paintWingbeats() {
    const sheet = document.createElement("canvas");
    sheet.width = spriteCell * wingPoses;
    sheet.height = spriteCell;
    const context = sheet.getContext("2d");
    if (!context) return sheet;
    context.fillStyle = "rgb(22, 26, 34)";
    const unit = spriteCell * 0.4;
    for (let pose = 0; pose < wingPoses; pose++) {
        // 0 with the wings spread, 1 with them swept back at the bottom of a beat.
        const swept = 0.5 - 0.5 * Math.cos((pose / wingPoses) * Math.PI * 2);
        context.setTransform(unit, 0, 0, unit, spriteCell * (pose + 0.5), spriteCell * 0.5);
        context.beginPath();
        // A short plump body pointing right, with a wedge of tail.
        context.ellipse(0.02, 0, 0.4, 0.15, 0, 0, Math.PI * 2);
        context.moveTo(-0.3, -0.1);
        context.lineTo(-0.66, -0.15);
        context.lineTo(-0.66, 0.15);
        context.lineTo(-0.3, 0.1);
        context.closePath();
        // Wings like a starling's: a curved leading edge and a pointed tip that trails behind the shoulder.
        const tipX = lerp(-0.38, -0.82, swept);
        const tipY = lerp(1, 0.42, swept);
        for (const side of [1, -1]) {
            context.moveTo(0.26, side * 0.08);
            context.quadraticCurveTo(0.44 - 0.22 * swept, side * (0.58 - 0.2 * swept), tipX, side * tipY);
            context.quadraticCurveTo(-0.06 - 0.24 * swept, side * (0.44 - 0.18 * swept), -0.2, side * 0.08);
            context.closePath();
        }
        context.fill();
    }
    return sheet;
}

type Star = Readonly<{ x: number; y: number; size: number; phase: number }>;

/** What hangs on the washing line, by day. At night they keep only a hint of it. */
const washingColours: readonly Rgb[] = [
    [238, 236, 228],
    [226, 138, 74],
    [116, 150, 190],
    [222, 196, 120],
];
const kiteColour: Rgb = [226, 84, 62];

export function createSkyScene(options: SkySceneOptions): Pond | null {
    const { hourOverride, container, canvas, reducedMotion, isDark } = options;
    const context = canvas.getContext("2d");
    if (!context) return null;

    let width = 0;
    let height = 0;
    let ratio = 1;
    let time = 0;
    let hour = hourOverride ?? sceneHour();
    let clockAge = 0;
    let frame: number | undefined;
    let lastTimestamp: number | undefined;
    let isActive = false;
    let pointer: Point | null = null;
    let flock: Flock | undefined;
    let town: Town | undefined;
    let stars: Star[] = [];
    let layers: { city: Layer; roofs: Layer; high: Layer; low: Layer } | undefined;
    let paintedFor = "";
    let cloudTile = 1;
    let firefly: HTMLCanvasElement | undefined;
    let wingbeats: HTMLCanvasElement | undefined;
    let grain: CanvasPattern | null = null;

    const light = (): OpenSkyLight => openSkyAt(hour, isDark());
    /** 0 while the flock is birds, 1 once it is fireflies. */
    const fireflies = (sky: OpenSkyLight) => smoothstep(fireflyNight[0], fireflyNight[1], sky.night);

    /**
     * Where the moon is for the hour, in pixels. It keeps clear of the
     * numerals so its glow never sits among the fireflies: it rises up the
     * left margin through the evening and leaves through the top of the
     * frame, then comes down the right margin before dawn.
     */
    function moonAt(dark: number) {
        const box = numeralBox(width, height);
        const radius = height * moonSize.radius;
        const clear = radius * moonSize.clearance;
        const evening = dark < 0.5;
        // 0 on the horizon, 1 just out of the top of the frame.
        const climb = clamp(evening ? dark * 2 : (1 - dark) * 2, 0, 1);
        const outer = evening ? width * 0.06 : width * 0.94;
        const inner = evening ? Math.max(outer, box.left - clear) : Math.min(outer, box.right + clear);
        return { x: lerp(outer, inner, climb), y: lerp(height * horizon + radius, -radius * 2, climb) };
    }

    /** Where the sun and the moon are for the hour, in pixels. */
    function lamps() {
        const day = (hour - sunrise) / (sunset - sunrise);
        const dark = ((hour - sunset + 24) % 24) / (24 - (sunset - sunrise));
        const ground = height * horizon;
        return {
            // The sun arcs from the left edge to the right, and climbs out of the top of the frame by mid-morning; only its glow is left at noon.
            sun: { x: width * lerp(0.12, 0.88, day), y: ground - Math.sin(Math.PI * clamp(day, 0, 1)) * height * 1.3, up: day > -0.02 && day < 1.02 },
            moon: moonAt(dark),
            /** 1 with the sun on the horizon, 0 with it overhead. */
            low: 1 - Math.sin(Math.PI * clamp(day, 0, 1)),
        };
    }

    /** Repaints the city, the rooftops and the clouds for the light, only when the light has changed. */
    function relight(sky: OpenSkyLight) {
        if (!layers || !town) return;
        const { sun, moon, low } = lamps();
        const isDay = sun.up && sky.night < 0.6;
        const lampX = isDay ? sun.x : moon.x;
        const key = `${sky.zenith.map(Math.round)}|${sky.horizon.map(Math.round)}|${Math.round((lampX / width) * 12)}`;
        if (key === paintedFor) return;
        paintedFor = key;
        const colours = palette(sky);
        // A low sun glows on walls and roof edges, and lights clouds from below.
        const glow = isDay ? low * (1 - smoothstep(0.3, 0.9, sky.night)) : 0;
        paintCity(layers.city, town, sky, lampX, glow);
        paintRoofs(layers.roofs, town, sky, glow);
        paintClouds(layers.high, 7, 0.06, 0.3, 4, colours.cloudLit, colours.cloudShade, isDay ? low : 0);
        paintClouds(layers.low, 31, 0.34, 0.62, 3, colours.cloudLit, colours.cloudShade, isDay ? low : 0);
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
            const reach = height * lerp(1.1, 0.8, low);
            const glow = context.createRadialGradient(sun.x, sun.y, 0, sun.x, sun.y, reach);
            glow.addColorStop(0, css(warm, 0.66 * daylight));
            glow.addColorStop(0.22, css(warm, 0.3 * daylight));
            glow.addColorStop(1, css(warm, 0));
            context.fillStyle = glow;
            context.fillRect(0, 0, width, height);
            const radius = height * lerp(0.05, 0.062, low);
            const disc = context.createRadialGradient(sun.x, sun.y, radius * 0.7, sun.x, sun.y, radius * 1.2);
            disc.addColorStop(0, css(mixRgb([255, 252, 240], [255, 218, 156], low), daylight));
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
            const radius = height * moonSize.radius;
            const reach = radius * moonSize.halo;
            const halo = context.createRadialGradient(moon.x, moon.y, radius * 0.8, moon.x, moon.y, reach);
            halo.addColorStop(0, `rgba(206, 220, 255, ${0.3 * moonlight})`);
            halo.addColorStop(0.3, `rgba(190, 208, 250, ${0.1 * moonlight})`);
            halo.addColorStop(1, "rgba(190, 208, 250, 0)");
            context.fillStyle = halo;
            context.fillRect(moon.x - reach, moon.y - reach, reach * 2, reach * 2);
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

    /** A paper kite on a long string from a rooftop, tugging in the wind. It comes down at dusk. */
    function drawKite(sky: OpenSkyLight, near: Rgb) {
        if (!context || !town) return;
        const up = 1 - smoothstep(0.22, 0.5, sky.night);
        if (up <= 0.01) return;
        const size = height * 0.034;
        const x = width * (0.845 + 0.022 * Math.sin(time * 0.37));
        const y = height * (0.27 + 0.035 * Math.sin(time * 0.53 + 1.2));
        const tilt = 0.5 + wind.kite * Math.sin(time * 0.9) + 0.1 * Math.sin(time * 2.3);
        context.strokeStyle = css(near, 0.5 * up);
        context.lineWidth = Math.max(0.6, height * 0.0022);
        context.beginPath();
        context.moveTo(town.flyer.x, town.flyer.y);
        // The string hangs in a long curve, slack where it leaves the hand.
        context.quadraticCurveTo(lerp(town.flyer.x, x, 0.45), lerp(town.flyer.y, y, 0.25), x, y);
        context.stroke();
        context.save();
        context.translate(x, y);
        context.rotate(tilt);
        const paper = mixRgb(kiteColour, near, 0.25 + 0.5 * sky.night);
        context.globalAlpha = up;
        context.fillStyle = css(paper);
        context.beginPath();
        context.moveTo(0, -size);
        context.lineTo(size * 0.72, 0);
        context.lineTo(0, size);
        context.lineTo(-size * 0.72, 0);
        context.closePath();
        context.fill();
        // The far half is in shade, the spine and bow show through, and a ribbon tail trails off the bottom.
        context.fillStyle = css(scaleRgb(paper, 0.82));
        context.beginPath();
        context.moveTo(0, -size);
        context.lineTo(size * 0.72, 0);
        context.lineTo(0, size);
        context.closePath();
        context.fill();
        context.strokeStyle = css(scaleRgb(paper, 0.6));
        context.lineWidth = Math.max(0.5, size * 0.05);
        context.beginPath();
        context.moveTo(0, -size);
        context.lineTo(0, size);
        context.moveTo(-size * 0.72, 0);
        context.quadraticCurveTo(0, -size * 0.45, size * 0.72, 0);
        context.moveTo(0, size);
        for (let i = 1; i <= 6; i++) context.lineTo(Math.sin(time * 3.2 - i * 0.9) * size * 0.16 * i * 0.4, size + i * size * 0.3);
        context.stroke();
        context.restore();
        context.globalAlpha = 1;
    }

    /**
     * Small birds from the wingbeat sheet, each turned the way it flies.
     * Smaller ones read as farther off, so they are fainter. A bird settled
     * in the numerals mostly glides and is less faint, so a stroke is calm.
     */
    function drawBirds(alpha: number) {
        if (!context || !flock || !wingbeats || alpha <= 0.01) return;
        for (const bird of flock.birds) {
            const size = Math.max(2.2, height * (birdSize[0] + birdSize[1] * bird.seed));
            // Now and then a bird stops beating and glides on spread wings.
            const glides = Math.sin(time * 0.9 + bird.seed * 30) > lerp(glideAbove[0], glideAbove[1], bird.held);
            const pose = glides ? 1 : Math.floor((((bird.flap / (Math.PI * 2)) % 1) + 1) * wingPoses) % wingPoses;
            const cos = Math.cos(bird.heading) * ratio;
            const sin = Math.sin(bird.heading) * ratio;
            const half = size * 1.25;
            const faintest = lerp(birdFaintest[0], birdFaintest[1], bird.held);
            context.setTransform(cos, sin, -sin, cos, bird.x * ratio, bird.y * ratio);
            context.globalAlpha = alpha * (faintest + (1 - faintest) * bird.seed);
            context.drawImage(wingbeats, pose * spriteCell, 0, spriteCell, spriteCell, -half, -half, half * 2, half * 2);
        }
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        context.globalAlpha = 1;
    }

    /**
     * Fireflies: a warm point with a soft glow, each pulsing in its own time.
     * Settled in the numerals, a glow tightens and pulses less, so the
     * strokes stay crisp lines instead of merging into blobs.
     */
    function drawFireflies(alpha: number) {
        if (!context || !flock || !firefly || alpha <= 0.01) return;
        context.globalCompositeOperation = "lighter";
        for (const bird of flock.birds) {
            const pulse = 0.5 + 0.5 * Math.sin(time * (1.4 + bird.seed * 2.2) + bird.seed * 40);
            const free = height * (fireflySize[0] + fireflySize[1] * bird.seed);
            const size = Math.max(lerp(fireflySize[2], fireflyHeld[1], bird.held), free * lerp(1, fireflyHeld[0], bird.held));
            const dimmest = lerp(fireflyDimmest[0], fireflyDimmest[1], bird.held);
            context.globalAlpha = alpha * (dimmest + (1 - dimmest) * pulse * pulse);
            context.drawImage(firefly, bird.x - size / 2, bird.y - size / 2, size, size);
        }
        context.globalAlpha = 1;
        context.globalCompositeOperation = "source-over";
    }

    /** The palms: a curved trunk and a crown of drooping fronds that sway, each a beat behind the last. */
    function drawPalms(near: Rgb) {
        if (!context || !town) return;
        context.fillStyle = css(near);
        context.strokeStyle = css(near);
        context.lineCap = "round";
        for (const palm of town.palms) {
            const sway = Math.sin(time * 0.7 + palm.x) * wind.palm;
            const topX = palm.x + palm.lean + sway * palm.tall * 0.12;
            const topY = palm.base - palm.tall;
            context.lineWidth = Math.max(1.6, height * 0.011);
            context.beginPath();
            context.moveTo(palm.x, palm.base);
            context.quadraticCurveTo(palm.x + palm.lean * 0.15, palm.base - palm.tall * 0.55, topX, topY);
            context.stroke();
            context.beginPath();
            palm.fronds.forEach(([angle, reach], i) => {
                const swing = angle + sway + Math.sin(time * 1.3 + i * 0.8 + palm.x) * wind.palm * 0.5;
                const tipX = topX + Math.cos(swing) * reach;
                const tipY = topY + Math.sin(swing) * reach * 0.62 + reach * 0.5;
                const midX = topX + Math.cos(swing) * reach * 0.62;
                const midY = topY + Math.sin(swing) * reach * 0.62 - reach * 0.08;
                context.moveTo(topX, topY);
                context.quadraticCurveTo(midX, midY - reach * 0.12, tipX, tipY);
                context.quadraticCurveTo(midX, midY + reach * 0.1, topX, topY);
            });
            context.fill();
        }
    }

    /** The washing: each piece hangs from the line and swings at its hem. */
    function drawWashing(sky: OpenSkyLight, near: Rgb) {
        if (!context || !town?.washing) return;
        const { x, top, span, tall, cloths } = town.washing;
        for (const [along, wide, drop, colour] of cloths) {
            const sag = 4 * along * (1 - along) * tall * 0.26;
            const pegX = x + span * along;
            const pegY = top - tall * 0.92 + sag;
            const swing = Math.sin(time * 1.5 + colour * 1.7) * wide * wind.cloth;
            context.fillStyle = css(mixRgb(washingColours[colour % washingColours.length], near, 0.3 + 0.62 * smoothstep(0.1, 0.8, sky.night)));
            context.beginPath();
            context.moveTo(pegX - wide / 2, pegY);
            context.lineTo(pegX + wide / 2, pegY);
            context.lineTo(pegX + wide / 2 + swing, pegY + drop);
            context.lineTo(pegX - wide / 2 + swing * 0.8, pegY + drop * 0.96);
            context.closePath();
            context.fill();
        }
    }

    /** A red light on each tall tower, blinking slowly out of step with the others. */
    function drawBeacons(lights: number) {
        if (!context || !town || lights <= 0.02) return;
        for (const beacon of town.beacons) {
            const blink = Math.max(0, Math.sin(time * 1.9 + beacon.x * 0.05)) ** 3;
            const radius = height * 0.022;
            const glow = context.createRadialGradient(beacon.x, beacon.y, 0, beacon.x, beacon.y, radius);
            glow.addColorStop(0, `rgba(255, 96, 72, ${lights * (0.35 + 0.65 * blink)})`);
            glow.addColorStop(0.25, `rgba(255, 70, 56, ${lights * 0.3 * blink})`);
            glow.addColorStop(1, "rgba(255, 70, 56, 0)");
            context.fillStyle = glow;
            context.fillRect(beacon.x - radius, beacon.y - radius, radius * 2, radius * 2);
        }
    }

    function draw() {
        if (!context || !layers || !town || width === 0) return;
        const sky = light();
        relight(sky);
        const colours = palette(sky);
        const glow = fireflies(sky);
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        drawSky(sky);
        drawClouds(layers.high, cloudDrift[0], lerp(0.9, 0.55, sky.night));
        drawClouds(layers.low, cloudDrift[1], lerp(0.8, 0.45, sky.night));
        context.drawImage(layers.city.canvas, 0, 0, width, height);
        // Ground haze: the city fades into the horizon's colour toward its feet.
        const haze = context.createLinearGradient(0, height * (horizon - 0.22), 0, height * (horizon + 0.1));
        haze.addColorStop(0, css(sky.horizon, 0));
        haze.addColorStop(1, css(sky.horizon, lerp(0.6, 0.28, sky.night)));
        context.fillStyle = haze;
        context.fillRect(0, height * (horizon - 0.22), width, height * 0.32);
        drawBeacons(colours.lights);
        drawKite(sky, colours.near);
        drawBirds(1 - glow);
        drawFireflies(glow);
        // The near rooftops come last, so a low-flying bird passes behind them.
        context.drawImage(layers.roofs.canvas, 0, 0, width, height);
        drawWashing(sky, colours.near);
        drawPalms(colours.near);
        // A fine grain over everything: it breaks up the banding a smooth sky shows on a phone, and reads as film.
        if (grain) {
            context.setTransform(1, 0, 0, 1, 0, 0);
            context.globalCompositeOperation = "soft-light";
            context.globalAlpha = 0.42;
            context.fillStyle = grain;
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.globalAlpha = 1;
            context.globalCompositeOperation = "source-over";
            context.setTransform(ratio, 0, 0, ratio, 0, 0);
        }
    }

    function step(dt: number) {
        time += dt;
        clockAge += dt;
        if (hourOverride === undefined && clockAge > clockSeconds) {
            clockAge = 0;
            hour = sceneHour();
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

    /** One glow, drawn once: a bright warm core fading through yellow-green. */
    function paintFirefly() {
        const sprite = document.createElement("canvas");
        sprite.width = sprite.height = fireflyCell;
        const spriteContext = sprite.getContext("2d");
        if (!spriteContext) return sprite;
        const middle = fireflyCell / 2;
        const glow = spriteContext.createRadialGradient(middle, middle, 0, middle, middle, middle);
        glow.addColorStop(0, "rgba(255, 250, 214, 1)");
        glow.addColorStop(0.16, "rgba(255, 232, 130, 0.85)");
        glow.addColorStop(0.42, "rgba(214, 226, 90, 0.22)");
        glow.addColorStop(1, "rgba(190, 220, 80, 0)");
        spriteContext.fillStyle = glow;
        spriteContext.fillRect(0, 0, fireflyCell, fireflyCell);
        return sprite;
    }

    /** A small tile of grey noise around mid-grey, which soft-light blending turns into grain. */
    function paintGrain() {
        if (!context) return null;
        const tile = document.createElement("canvas");
        tile.width = tile.height = 96;
        const tileContext = tile.getContext("2d");
        if (!tileContext) return null;
        const next = seeded(5);
        const pixels = tileContext.createImageData(96, 96);
        for (let i = 0; i < pixels.data.length; i += 4) {
            const grey = 128 + next(-38, 38);
            pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = grey;
            pixels.data[i + 3] = 255;
        }
        tileContext.putImageData(pixels, 0, 0);
        return context.createPattern(tile, "repeat");
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

        const city = createLayer(width, height, ratio);
        const roofs = createLayer(width, height, ratio);
        // Clouds are soft, so half the resolution is plenty and a quarter of the memory.
        const high = createLayer(cloudTile, height, ratio * 0.5);
        const low = createLayer(cloudTile, height, ratio * 0.5);
        if (!city || !roofs || !high || !low) return;
        layers = { city, roofs, high, low };
        town = layTown(width, height);
        paintedFor = "";

        const next = seeded(11);
        stars = Array.from({ length: 90 }, () => ({
            x: next(0, width),
            y: next(0, height * horizon * 0.92),
            size: next(0.7, 1.6),
            phase: next(0, Math.PI * 2),
        }));
        firefly ??= paintFirefly();
        wingbeats ??= paintWingbeats();
        grain ??= paintGrain();

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
        redraw() {
            draw();
        },
        destroy() {
            setActive(false);
        },
    };
}
