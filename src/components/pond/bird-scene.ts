import { daylightAt, mumbaiHour } from "./pond-daylight";
import type { Pond } from "./pond-engine";
import { birdFragment, birdShaderSizes } from "./bird-shader";
import { createFullscreenTriangle, fullscreenVertex, link, uniforms } from "./pond-gl";

/**
 * A red-vented bulbul on a branch against the sky, lit by the hour in Mumbai.
 *
 * Everything is drawn by one fragment shader from signed distances: the sky
 * with its sun or moon, clouds and a hazy treeline, a tapering branch with
 * twigs and leaves, and the bird, built from a few smooth shapes. The light
 * comes from behind, so the bird, branch and leaves read mostly as
 * silhouettes, with a warm rim where the sun catches their edges and a glow
 * through thin parts: the crest, the tail, the beak, every leaf. Silhouettes
 * hide the fine detail code struggles with; shape and motion carry it.
 *
 * The bird behaves like one: its head moves in quick snaps with still
 * pauses, it breathes, its tail bobs after a hop, its crest rises now and
 * then. Tap it and it sings; tap the branch and it hops there, and the
 * branch dips under it and springs back; tap fast and it flies off and
 * comes back. At night it sleeps, fluffed up with its head tucked in.
 *
 * Coordinates: height units, y up from the bottom of the frame, x centred,
 * so the frame spans x from -aspect/2 to aspect/2.
 */

const { branchPoints: branchPointCount, twigs: maxTwigs, leaves: maxLeaves } = birdShaderSizes;
const pixelRatioCap = 1.5;
const maxStepSeconds = 0.05;
/** How big the bird is: one bird unit, about its body length, in frame heights. Close, like a long lens. */
const birdScale = 0.3;
/** How often the scene re-reads the clock in Mumbai, in seconds. */
const clockSeconds = 20;

/**
 * The branch's line at rest, for a 2:1 frame: from its anchor past the right
 * edge to its tip, radius in frame heights. A smooth curve is drawn through it.
 */
const branchLine: readonly (readonly [number, number, number])[] = [
    [1.18, 0.21, 0.05],
    [0.88, 0.268, 0.041],
    [0.58, 0.31, 0.034],
    [0.29, 0.335, 0.027],
    [0.02, 0.352, 0.021],
    [-0.23, 0.378, 0.015],
    [-0.44, 0.415, 0.01],
    [-0.6, 0.458, 0.006],
];
/** Where along the branch (0 at the anchor, 1 at the tip) the bird may stand. */
const perchRange: readonly [number, number] = [0.32, 0.64];

/** Springs and timings for the bird. Each value is the feel it was tuned for. */
const feel = {
    /** Head snaps: very stiff and critically damped, so a turn lands in about 80ms and then holds still. */
    headStiffness: 1600,
    headDamping: 80,
    /** Pause between head snaps, in seconds. */
    glanceEvery: [0.5, 2.4] as const,
    /** Tail: a loose spring that bobs a few times after a hop. */
    tailStiffness: 180,
    tailDamping: 7,
    /** Branch: a springy bough, about 1.6 oscillations a second, settling in a second or two. */
    branchStiffness: 100,
    branchDamping: 5.5,
    /** How far the branch sags under the bird at rest, and the kick when it lands. */
    perchSag: 0.012,
    landingKick: -0.32,
    /** A hop: its length along the branch, how long it takes, and its arc. */
    hopReach: 0.12,
    hopSeconds: 0.26,
    hopHeight: 0.045,
    /** Seconds between breaths. */
    breathSeconds: 1.15,
    /** How long the bird stays away after it is startled. */
    awaySeconds: [4, 7] as const,
    /** Taps this close together startle it. */
    startleWindow: 1.4,
    startleTaps: 3,
    /** Seconds between songs it sings on its own by day. */
    songEvery: [14, 30] as const,
    /** Seconds between idle acts: flicking its tail, preening, shaking out, stretching, moving along. */
    actEvery: [1.4, 4.5] as const,
    /** A bulbul flicks its tail often: chance per second of an idle flick, and its kick. */
    flickRate: 0.4,
    flickKick: 4.5,
    /** Seconds between flights it takes on its own, to come back a little later. */
    wanderEvery: [70, 140] as const,
} as const;

type Act = "flicks" | "preen" | "rouse" | "stretch" | "shuffle" | "turn" | "sing";
/** How often each idle act is picked, as relative weights, and how long it lasts in seconds. */
const repertoire: readonly (readonly [Act, number, readonly [number, number]])[] = [
    ["flicks", 0.26, [0.6, 1]],
    ["preen", 0.18, [1.8, 3.4]],
    ["rouse", 0.1, [0.7, 0.9]],
    ["stretch", 0.08, [1.1, 1.5]],
    ["shuffle", 0.2, [0, 0]],
    ["turn", 0.1, [0, 0]],
    ["sing", 0.08, [0, 0]],
];

const random = (min: number, max: number) => min + Math.random() * (max - min);
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** A seeded random source, so the branch, twigs and leaves come out the same on every visit. */
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

type Twig = Readonly<{ at: number; side: number; angle: number; length: number }>;
type Leaf = Readonly<{ twig: number; along: number; angle: number; length: number; width: number; twist: number; seed: number; front: boolean }>;

/** The branch at rest: a Catmull-Rom curve through its line, swelling a little where twigs grow out. */
function restBranch(twigs: readonly Twig[]) {
    const points: { x: number; y: number; r: number }[] = [];
    const last = branchLine.length - 1;
    for (let i = 0; i < branchPointCount; i++) {
        const t = (i / (branchPointCount - 1)) * last;
        const k = Math.min(last - 1, Math.floor(t));
        const f = t - k;
        const p0 = branchLine[Math.max(0, k - 1)];
        const p1 = branchLine[k];
        const p2 = branchLine[k + 1];
        const p3 = branchLine[Math.min(last, k + 2)];
        const curve = (a: number, b: number, c: number, d: number) =>
            0.5 * (2 * b + (-a + c) * f + (2 * a - 5 * b + 4 * c - d) * f * f + (-a + 3 * b - 3 * c + d) * f * f * f);
        const s = i / (branchPointCount - 1);
        const swelling = twigs.reduce((sum, twig) => sum + Math.exp(-(((s - twig.at) / 0.025) ** 2)) * 0.18, 0);
        points.push({ x: curve(p0[0], p1[0], p2[0], p3[0]), y: curve(p0[1], p1[1], p2[1], p3[1]), r: curve(p0[2], p1[2], p2[2], p3[2]) * (1 + swelling) });
    }
    return points;
}

/** The twigs and leaves, placed once in the branch's own frame: clusters at twig ends, as mango and peepal grow them. */
function growFoliage() {
    const next = seeded(11);
    const twigs: Twig[] = [];
    const leaves: Leaf[] = [];
    const spots = [0.04, 0.09, 0.14, 0.19, 0.25, 0.31, 0.38, 0.47, 0.56, 0.64, 0.7, 0.76, 0.81, 0.86, 0.9, 0.94, 0.97, 1];
    spots.forEach((at, index) => {
        if (twigs.length >= maxTwigs) return;
        const side = index % 2 === 0 ? 1 : -1;
        const twig = { at, side, angle: side * next(0.35, 1.0), length: at > 0.99 ? 0.02 : next(0.04, 0.13) };
        twigs.push(twig);
        // A fan of leaves at the twig's end, thinner where the bird perches so it stays clear.
        const count = at > 0.8 ? 6 : at > 0.34 && at < 0.62 ? 2 : 5;
        for (let i = 0; i < count && leaves.length < maxLeaves; i++) {
            const spread = (i - (count - 1) / 2) * next(0.38, 0.55);
            leaves.push({
                twig: twigs.length - 1,
                along: i === 0 ? 1 : next(0.6, 1),
                angle: twig.angle + spread + next(-0.15, 0.15),
                length: next(0.09, 0.145),
                width: next(0.19, 0.25),
                twist: next(-1.2, 1.2),
                seed: next(0, 100),
                // Around the perch most leaves sit behind the branch, so the bird stays clear.
                front: at > 0.34 && at < 0.62 ? next() > 0.8 : next() > 0.45,
            });
        }
    });
    return { twigs, leaves };
}

const fragment = birdFragment(birdScale);

type BirdOptions = Readonly<{
    hourOverride?: number;
    container: HTMLElement;
    canvas: HTMLCanvasElement;
    reducedMotion: boolean;
    isDark: () => boolean;
}>;

type Mode = "perched" | "hopping" | "flying" | "away" | "returning";

/** A critically or under-damped spring, stepped with semi-implicit Euler. */
function spring(value: { x: number; v: number }, target: number, stiffness: number, damping: number, dt: number) {
    value.v += (stiffness * (target - value.x) - damping * value.v) * dt;
    value.x += value.v * dt;
}

/**
 * Builds the bulbul scene. Resolves to null without WebGL2, and the shell's
 * CSS backdrop stays.
 */
export function createBirdScene(options: BirdOptions): Pond | null {
    const { hourOverride, container, canvas, reducedMotion, isDark } = options;
    const context = canvas.getContext("webgl2", { alpha: false, antialias: false, powerPreference: "low-power" });
    if (!context) return null;
    const gl: WebGL2RenderingContext = context;
    const program = link(gl, fullscreenVertex, fragment);
    if (!program) return null;
    const u = uniforms(gl, program, [
        "uRes", "uTime", "uNight", "uDusk", "uDim", "uSun", "uMoon", "uGust", "uBranch", "uTwigs", "uTwigCount",
        "uLeaves", "uLeafShape", "uLeafCount", "uBird", "uFacing", "uTilt", "uHead", "uBeak", "uPuff", "uCrest",
        "uTail", "uBreath", "uFluff", "uFly", "uFlap", "uEye", "uMotion", "uPreen", "uStretch",
    ]);
    const screen = createFullscreenTriangle(gl, [program]);
    const { twigs, leaves } = growFoliage();
    const branchRest = restBranch(twigs);
    const branchData = new Float32Array(branchPointCount * 3);
    const twigData = new Float32Array(maxTwigs * 4);
    const leafData = new Float32Array(maxLeaves * 4);
    const leafShape = new Float32Array(maxLeaves * 4);

    let width = 1;
    let height = 1;
    let aspect = 2;
    let time = random(0, 100);
    let hour = hourOverride ?? mumbaiHour();
    let clockAge = 0;
    let frame: number | undefined;
    let lastTimestamp: number | undefined;
    let isActive = false;
    let pointer: { x: number; y: number } | null = null;

    // The branch: a damped sag at the perch, and the wind.
    const sag = { x: feel.perchSag, v: 0 };
    let gust = 0.3;
    let sway = 0;

    // The bird.
    let mode: Mode = "perched";
    let perch = 0.5;
    let facing = -1;
    const head = { x: 0, v: 0 };
    let headTarget = 0;
    let nextGlance = random(...feel.glanceEvery);
    const tail = { x: 0, v: 0 };
    let crest = 0;
    let crestTarget = 0;
    let nextCrest = random(4, 10);
    let fluff = 0;
    let blinkFor = 0;
    let nextBlink = random(2, 5);
    let wakeFor = 0;
    let song: { notes: { at: number; length: number }[]; age: number } | null = null;
    let nextSong = random(...feel.songEvery);
    let act: { kind: Act; age: number; length: number } | null = null;
    let nextAct = random(...feel.actEvery);
    let nextWander = random(...feel.wanderEvery);
    let preen = 0;
    let stretch = 0;
    let rouse = 0;
    let hop: { from: number; to: number; age: number; turn: boolean } | null = null;
    let queuedPerch: number | null = null;
    let flight = { age: 0, from: { x: 0, y: 0 }, to: { x: 0, y: 0 }, length: 1 };
    let awayFor = 0;
    const tapTimes: number[] = [];
    const birdAt = { x: 0, y: 0 };
    let tilt = 0.5;

    const light = () => daylightAt(hour, isDark());
    /** Dusk and dawn: how warm the light is, read from its colour on the daylight curve. */
    const duskOf = (tint: readonly number[], night: number) => clamp((tint[0] - tint[2]) * 3.2, 0, 1) * (1 - night * 0.6);
    /** The sun's path across the frame, from low on the left at dawn to low on the right at dusk. */
    function sunAt() {
        const day = clamp((hour - 6.6) / (18.9 - 6.6), 0, 1);
        return { x: (day - 0.5) * 1.6 * (aspect / 2), y: 0.16 + 0.7 * Math.sin(Math.PI * day) };
    }
    function moonAt() {
        const night = ((hour - 18.9 + 24) % 24) / (24 - 18.9 + 6.6);
        const along = clamp(night, 0, 1);
        return { x: (0.5 - along) * 1.4 * (aspect / 2), y: 0.3 + 0.55 * Math.sin(Math.PI * along) };
    }

    /** The branch now: its rest shape shifted to the frame's right edge, swaying from the anchor, sagging at the perch. */
    function branchPoints() {
        const shift = aspect / 2 - 1;
        const anchor = { x: branchRest[0].x + shift, y: branchRest[0].y };
        const lastIndex = branchRest.length - 1;
        const loaded = mode === "perched" || mode === "hopping" ? 1 : 0;
        return branchRest.map(({ x, y, r }, index) => {
            const s = index / lastIndex;
            const angle = sway * s ** 1.4;
            const dx = x + shift - anchor.x;
            const dy = y - anchor.y;
            const bent = { x: anchor.x + dx * Math.cos(angle) - dy * Math.sin(angle), y: anchor.y + dx * Math.sin(angle) + dy * Math.cos(angle) };
            // A cantilever's bend: grows toward the perch, then the rest of the branch follows it down.
            const at = clamp(perch, 0.05, 1);
            const bend = s < at ? (s / at) ** 2 * (3 - 2 * (s / at)) * 0.5 + (s / at) * 0.5 : 1 + (s - at) * 0.8;
            bent.y -= (sag.x * (0.4 + 0.6 * loaded) + (loaded ? 0 : -feel.perchSag * 0.6)) * bend;
            return { x: bent.x, y: bent.y, r };
        });
    }

    /** The point and slope on the branch at a fraction of its length. */
    function onBranch(points: ReturnType<typeof branchPoints>, s: number) {
        const scaled = clamp(s, 0, 1) * (points.length - 1);
        const index = Math.min(points.length - 2, Math.floor(scaled));
        const t = scaled - index;
        const a = points[index];
        const b = points[index + 1];
        return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, r: a.r + (b.r - a.r) * t, angle: Math.atan2(b.y - a.y, b.x - a.x) };
    }

    /** The fraction along the branch nearest a frame point. */
    function nearestOnBranch(points: ReturnType<typeof branchPoints>, x: number) {
        let best = perch;
        let bestDistance = Infinity;
        for (let s = 0; s <= 1.0001; s += 0.01) {
            const at = onBranch(points, s);
            if (Math.abs(at.x - x) < bestDistance) {
                bestDistance = Math.abs(at.x - x);
                best = s;
            }
        }
        return best;
    }

    function sing() {
        if (song || fluff > 0.5) return;
        const notes: { at: number; length: number }[] = [];
        let at = 0.05;
        const count = Math.round(random(4, 7));
        for (let i = 0; i < count; i++) {
            const length = random(0.09, 0.2);
            notes.push({ at, length });
            at += length + random(0.04, 0.12);
        }
        song = { notes, age: 0 };
        headTarget = 0.32;
        crestTarget = 1;
    }

    function startHop(to: number) {
        const target = clamp(to, ...perchRange);
        if (Math.abs(target - perch) < 0.02) return;
        const direction = Math.sign(target - perch);
        // Facing: -1 looks toward the tip (left, where the fraction grows), +1 toward the anchor.
        const wantFacing = direction > 0 ? -1 : 1;
        const step = clamp(target - perch, -feel.hopReach, feel.hopReach);
        hop = { from: perch, to: perch + step, age: 0, turn: wantFacing !== facing };
        queuedPerch = Math.abs(target - (perch + step)) > 0.02 ? target : null;
    }

    function flyAway() {
        if (mode !== "perched") return;
        mode = "flying";
        song = null;
        act = null;
        const goLeft = Math.random() < 0.6;
        facing = goLeft ? -1 : 1;
        flight = { age: 0, from: { x: birdAt.x, y: birdAt.y }, to: { x: (goLeft ? -1 : 1) * (aspect / 2 + 0.4), y: random(0.75, 1.1) }, length: random(0.9, 1.3) };
        sag.v += 0.35;
        awayFor = random(...feel.awaySeconds);
    }

    function returnToBranch() {
        mode = "returning";
        perch = random(perchRange[0] + 0.05, perchRange[1] - 0.05);
        const points = branchPoints();
        const landing = onBranch(points, perch);
        const fromLeft = Math.random() < 0.5;
        facing = fromLeft ? 1 : -1;
        flight = { age: 0, from: { x: (fromLeft ? -1 : 1) * (aspect / 2 + 0.4), y: random(0.7, 1.0) }, to: { x: landing.x, y: landing.y + landing.r }, length: random(1.1, 1.5) };
    }

    function step(dt: number) {
        time += dt;
        clockAge += dt;
        if (hourOverride === undefined && clockAge > clockSeconds) {
            clockAge = 0;
            hour = mumbaiHour();
        }
        const night = light().night;
        // The wind: slow swells with quicker gusts on top, shared by branch, leaves and feathers.
        gust = clamp(0.35 + 0.35 * Math.sin(time * 0.31) * Math.sin(time * 0.13 + 1.7) + 0.25 * Math.sin(time * 1.7) * Math.sin(time * 0.47), 0, 1);
        sway = 0.012 * Math.sin(time * 0.9) + 0.022 * gust * Math.sin(time * 2.1 + 0.6);
        const loaded = mode === "perched" || mode === "hopping";
        spring(sag, loaded ? feel.perchSag : 0, feel.branchStiffness, feel.branchDamping, dt);

        // Head: snaps to a new target now and then, and holds still between.
        nextGlance -= dt;
        if (nextGlance <= 0 && !song && fluff < 0.5) {
            nextGlance = random(...feel.glanceEvery);
            const points = branchPoints();
            const at = onBranch(points, perch);
            if (pointer && Math.random() < 0.5) {
                // A glance at the pointer, as far as a neck can turn.
                const dx = (pointer.x - at.x) * facing;
                const dy = pointer.y - (at.y + birdScale * 0.8);
                headTarget = clamp(Math.atan2(dy, Math.abs(dx)), -0.5, 0.55);
                if (dx < -0.05 && Math.random() < 0.25 && mode === "perched") hop = { from: perch, to: perch, age: 0, turn: true };
            } else {
                const looks = [0, 0, 0.15, -0.12, 0.32, -0.3, 0.05];
                headTarget = looks[Math.floor(Math.random() * looks.length)] + random(-0.04, 0.04);
            }
        }
        spring(head, headTarget, feel.headStiffness, feel.headDamping, dt);

        // Crest: rises now and then, and while it sings.
        nextCrest -= dt;
        if (nextCrest <= 0) {
            nextCrest = random(4, 10);
            crestTarget = crestTarget > 0.5 ? 0 : 1;
        }
        crest += (crestTarget * (1 - fluff) - crest) * (1 - Math.exp(-dt * 6));

        // Tail: bobs on its spring; a bulbul flicks it up often.
        if (Math.random() < dt * feel.flickRate && fluff < 0.5) tail.v += random(0.6, 1) * feel.flickKick;
        spring(tail, 0, feel.tailStiffness, feel.tailDamping, dt);

        // Idle acts, one at a time, while it sits awake and quiet.
        const settled = mode === "perched" && !hop && !song && fluff < 0.5;
        if (act) {
            act.age += dt;
            const k = act.length > 0 ? clamp(act.age / act.length, 0, 1) : 1;
            if (act.kind === "flicks" && Math.floor(act.age / 0.28) !== Math.floor((act.age - dt) / 0.28)) tail.v += feel.flickKick;
            if (act.kind === "preen") headTarget = 0.06 * Math.sin(act.age * 11) + 0.04 * Math.sin(act.age * 4.3);
            if (k >= 1) {
                act = null;
                headTarget = 0;
                nextAct = random(...feel.actEvery);
            }
        } else if (settled) {
            nextAct -= dt;
            if (nextAct <= 0) {
                const total = repertoire.reduce((sum, [, weight]) => sum + weight, 0);
                let pick = Math.random() * total;
                const [kind, , lasts] = repertoire.find(([, weight]) => (pick -= weight) <= 0) ?? repertoire[0];
                if (kind === "shuffle") {
                    startHop(clamp(perch + random(-0.14, 0.14), ...perchRange));
                    nextAct = random(...feel.actEvery);
                } else if (kind === "turn") {
                    hop = { from: perch, to: perch, age: 0, turn: true };
                    nextAct = random(...feel.actEvery);
                } else if (kind === "sing") {
                    if (night < 0.4) sing();
                    nextAct = random(...feel.actEvery);
                } else {
                    act = { kind, age: 0, length: random(...lasts) };
                }
            }
            // Now and then it flies off on its own, and comes back a little later.
            nextWander -= dt;
            if (nextWander <= 0 && night < 0.5) {
                nextWander = random(...feel.wanderEvery);
                flyAway();
            }
        }
        const easeTo = (value: number, target: number, rate: number) => value + (target - value) * (1 - Math.exp(-dt * rate));
        const actK = act && act.length > 0 ? clamp(act.age / act.length, 0, 1) : 0;
        preen = easeTo(preen, act?.kind === "preen" && actK < 0.9 ? 1 : 0, 9);
        stretch = easeTo(stretch, act?.kind === "stretch" ? Math.sin(Math.PI * actK) : 0, 10);
        // A rouse: feathers fluffed out and shaken, then smoothed.
        rouse = act?.kind === "rouse" ? Math.sin(Math.PI * actK) : easeTo(rouse, 0, 8);

        // Sleep: after dark it fluffs up and tucks its head in; a tap wakes it for a while.
        wakeFor = Math.max(0, wakeFor - dt);
        const sleepy = night > 0.6 && wakeFor <= 0 && mode === "perched" ? 1 : 0;
        fluff += (sleepy - fluff) * (1 - Math.exp(-dt * 0.8));

        // Blink.
        nextBlink -= dt;
        if (nextBlink <= 0) {
            nextBlink = random(2, 6);
            blinkFor = 0.13;
        }
        blinkFor = Math.max(0, blinkFor - dt);

        // A song: a few bubbling notes, the beak opening and the throat puffing on each.
        if (song) {
            song.age += dt;
            const last = song.notes[song.notes.length - 1];
            if (song.age > last.at + last.length + 0.2) {
                song = null;
                headTarget = 0;
                crestTarget = 0;
            }
        } else if (night < 0.4 && mode === "perched") {
            nextSong -= dt;
            if (nextSong <= 0) {
                nextSong = random(...feel.songEvery);
                sing();
            }
        }

        // A hop along the branch, turning first if it faces the other way.
        if (hop) {
            hop.age += dt;
            const length = hop.from === hop.to ? feel.hopSeconds * 0.7 : feel.hopSeconds;
            const k = clamp(hop.age / length, 0, 1);
            if (hop.turn && k > 0.5) {
                facing = -facing;
                hop.turn = false;
            }
            perch = hop.from + (hop.to - hop.from) * k;
            if (k >= 1) {
                perch = hop.to;
                hop = null;
                sag.v += feel.landingKick * 0.5;
                tail.v += 3.5;
                mode = "perched";
                if (queuedPerch !== null) {
                    const next = queuedPerch;
                    queuedPerch = null;
                    startHop(next);
                }
            } else {
                mode = "hopping";
            }
        }

        // Flight: off out of frame, away a while, then back in to land.
        if (mode === "flying" || mode === "returning") {
            flight.age += dt;
            const k = clamp(flight.age / flight.length, 0, 1);
            const ease = mode === "flying" ? k * k : 1 - (1 - k) * (1 - k);
            birdAt.x = flight.from.x + (flight.to.x - flight.from.x) * ease;
            birdAt.y = flight.from.y + (flight.to.y - flight.from.y) * ease + Math.sin(Math.PI * k) * (mode === "flying" ? 0.08 : 0.12);
            if (k >= 1) {
                if (mode === "flying") {
                    mode = "away";
                } else {
                    mode = "perched";
                    sag.v += feel.landingKick;
                    tail.v += 4.5;
                }
            }
        }
        if (mode === "away") {
            awayFor -= dt;
            if (awayFor <= 0) returnToBranch();
        }
    }

    function render() {
        const daylight = light();
        const night = daylight.night;
        const points = branchPoints();
        points.forEach((point, index) => branchData.set([point.x, point.y, point.r], index * 3));

        twigs.forEach((twig, index) => {
            const base = onBranch(points, twig.at);
            const angle = base.angle + twig.angle + Math.sin(time * 1.3 + index) * 0.03 * (0.3 + gust);
            twigData.set([base.x, base.y, base.x + Math.cos(angle) * twig.length, base.y + Math.sin(angle) * twig.length], index * 4);
        });
        leaves.forEach((leaf, index) => {
            const twig = twigs[leaf.twig];
            const base = onBranch(points, twig.at);
            const twigAngle = base.angle + twig.angle;
            const x = base.x + Math.cos(twigAngle) * twig.length * leaf.along;
            const y = base.y + Math.sin(twigAngle) * twig.length * leaf.along;
            // Each leaf flutters on its own, harder in gusts: it swings a little, and twists
            // about its midrib, which foreshortens it and flips its paler underside into view.
            const swing = reducedMotion ? 0 : Math.sin(time * (2.1 + (leaf.seed % 3) * 0.4) + leaf.seed) * 0.07 * (0.35 + gust);
            const twist = leaf.twist + (reducedMotion ? 0 : Math.sin(time * (3.1 + (leaf.seed % 5) * 0.35) + leaf.seed * 1.7) * 0.75 * (0.3 + gust));
            leafData.set([x, y, base.angle + leaf.angle + swing, leaf.length], index * 4);
            leafShape.set([Math.cos(twist), leaf.seed, leaf.front ? 1 : 0, leaf.width], index * 4);
        });

        // The bird stands on the branch unless it is in the air.
        let flap = 0;
        let fly = 0;
        if (mode === "perched" || mode === "hopping") {
            const at = onBranch(points, perch);
            const arc = hop ? Math.sin(Math.PI * clamp(hop.age / feel.hopSeconds, 0, 1)) * feel.hopHeight : 0;
            birdAt.x = at.x;
            birdAt.y = at.y + at.r * 0.85 + arc;
            tilt += ((hop ? 0.35 : 0.5) - at.angle * facing * 0.5 - tilt) * 0.2;
        } else if (mode !== "away") {
            fly = 1;
            flap = Math.sin(time * 34) * 1.0 - 0.2;
            tilt += (0.05 - tilt) * 0.2;
        }

        let beak = 0;
        let puff = 0;
        if (song) {
            for (const note of song.notes) {
                const k = (song.age - note.at) / note.length;
                if (k > 0 && k < 1) {
                    beak = Math.sin(Math.PI * k) * 0.55;
                    puff = Math.sin(Math.PI * k);
                }
            }
        }
        const sun = sunAt();
        const moon = moonAt();

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.useProgram(program);
        gl.bindVertexArray(screen.vao);
        gl.uniform2f(u.uRes, canvas.width, canvas.height);
        gl.uniform1f(u.uTime, time);
        gl.uniform1f(u.uNight, night);
        gl.uniform1f(u.uDusk, duskOf(daylight.light, night));
        gl.uniform1f(u.uDim, isDark() ? 0.85 + 0.15 * night : 1);
        gl.uniform2f(u.uSun, sun.x, sun.y);
        gl.uniform2f(u.uMoon, moon.x, moon.y);
        gl.uniform1f(u.uGust, gust);
        gl.uniform3fv(u.uBranch, branchData);
        gl.uniform4fv(u.uTwigs, twigData);
        gl.uniform1i(u.uTwigCount, twigs.length);
        gl.uniform4fv(u.uLeaves, leafData);
        gl.uniform4fv(u.uLeafShape, leafShape);
        gl.uniform1i(u.uLeafCount, leaves.length);
        // Away, the bird is parked far outside the frame.
        gl.uniform2f(u.uBird, mode === "away" ? 9 : birdAt.x, mode === "away" ? 9 : birdAt.y);
        gl.uniform1f(u.uFacing, facing);
        gl.uniform1f(u.uTilt, tilt);
        gl.uniform1f(u.uHead, head.x);
        gl.uniform1f(u.uBeak, beak);
        gl.uniform1f(u.uPuff, puff);
        gl.uniform1f(u.uCrest, crest);
        gl.uniform1f(u.uTail, tail.x * 0.12);
        // Breathing, and a rouse: the feathers fluffed out and shaken, then smoothed.
        gl.uniform1f(u.uBreath, (reducedMotion ? 0 : Math.sin((time / feel.breathSeconds) * Math.PI * 2)) + rouse * (6 + 2 * Math.sin(time * 44)));
        gl.uniform1f(u.uFluff, fluff);
        gl.uniform1f(u.uPreen, preen);
        gl.uniform1f(u.uStretch, stretch);
        gl.uniform1f(u.uFly, fly);
        gl.uniform1f(u.uFlap, flap);
        gl.uniform1f(u.uEye, blinkFor > 0 || fluff > 0.5 ? 0 : 1);
        gl.uniform1f(u.uMotion, isActive ? 1 : 0.4);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function tick(timestamp: number) {
        const dt = lastTimestamp === undefined ? 0 : Math.min((timestamp - lastTimestamp) / 1000, maxStepSeconds);
        lastTimestamp = timestamp;
        step(dt);
        render();
        frame = window.requestAnimationFrame(tick);
    }

    /** Runs time forward without drawing, so a paused scene still answers a tap. */
    function advance(seconds: number) {
        for (let elapsed = 0; elapsed < seconds; elapsed += 1 / 60) step(1 / 60);
    }

    // Settle the bird on its perch before the first frame.
    advance(0.5);

    const toFrame = (x: number, y: number) => ({ x: (x - width / 2) / height, y: 1 - y / height });

    return {
        resize() {
            width = container.clientWidth;
            height = container.clientHeight;
            if (width === 0 || height === 0) return;
            aspect = width / height;
            const ratio = Math.min(pixelRatioCap, window.devicePixelRatio || 1);
            canvas.width = Math.round(width * ratio);
            canvas.height = Math.round(height * ratio);
            render();
        },
        setActive(active) {
            if (active === isActive) return;
            isActive = active;
            if (active) {
                lastTimestamp = undefined;
                frame = window.requestAnimationFrame(tick);
            } else if (frame !== undefined) {
                window.cancelAnimationFrame(frame);
                frame = undefined;
            }
        },
        poke(x, y) {
            const point = toFrame(x, y);
            // Taps in quick succession startle it off the branch.
            tapTimes.push(time);
            while (tapTimes.length && time - tapTimes[0] > feel.startleWindow) tapTimes.shift();
            if (mode === "perched" && tapTimes.length >= feel.startleTaps && fluff < 0.5) {
                tapTimes.length = 0;
                flyAway();
            } else if (mode === "perched" || mode === "hopping") {
                const centre = { x: birdAt.x, y: birdAt.y + birdScale * 0.5 };
                const onBird = Math.hypot(point.x - centre.x, point.y - centre.y) < birdScale * 0.65;
                if (fluff > 0.5 || light().night > 0.6) {
                    // Asleep: a tap wakes it to look around, then it tucks in again.
                    wakeFor = 3.5;
                    headTarget = random(-0.2, 0.3);
                } else if (onBird) {
                    sing();
                } else {
                    const points = branchPoints();
                    const target = nearestOnBranch(points, point.x);
                    const at = onBranch(points, target);
                    if (Math.abs(point.y - at.y) < 0.12 && !hop) {
                        startHop(target);
                    } else {
                        // Anywhere else, it looks where the tap landed.
                        const dx = (point.x - birdAt.x) * facing;
                        headTarget = clamp(Math.atan2(point.y - (birdAt.y + birdScale * 0.8), Math.abs(dx)), -0.5, 0.55);
                        nextGlance = random(1, 2);
                    }
                }
            }
            if (!isActive) {
                advance(reducedMotion ? 0.6 : 0.3);
                render();
            }
        },
        setPointer(point) {
            pointer = point ? toFrame(point.x, point.y) : null;
        },
        destroy() {
            if (frame !== undefined) window.cancelAnimationFrame(frame);
            screen.destroy();
            gl.deleteProgram(program);
        },
    };
}

