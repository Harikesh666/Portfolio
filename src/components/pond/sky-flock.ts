/**
 * The flock that writes "404" in the sky of the not-found page.
 *
 * Each numeral is a pen stroke: a line a pen could draw without lifting.
 * A "4" keeps its sharp corners, because its acute corner and the bar that
 * runs on past the stem are what make it a 4. The flock flies an open
 * stroke as a tight circuit, out along one side and back along the other,
 * with the two lanes so close that the stroke reads as one line. The zero
 * is one lap in a single lane. Every bird owns a place on a circuit and
 * keeps flying round it, so the numerals hold their shape while nothing in
 * them stands still. Between times the flock lets go and roams as one
 * loose, turning cloud, then pours back in. A tap flushes it.
 *
 * This file is the flock's behaviour only, with no drawing and no DOM, so
 * it can be tested. `sky-scene.ts` draws it: small birds by day, fireflies
 * at night.
 */

export type Point = { x: number; y: number };

/** A pen stroke in a unit box: x runs right, y runs down. A closed stroke joins its last point to its first. */
type Glyph = Readonly<{ points: readonly (readonly [number, number])[]; closed: boolean }>;

/**
 * A "4" drawn in one go: up the stem, down the slope to the left, and across
 * the bar, which runs on past the stem. Its corners stay sharp: the acute
 * one at the top and the bar's overshoot are what tell a 4 from a blob.
 */
const four: Glyph = {
    points: [
        [0.68, 1],
        [0.68, 0],
        [0, 0.68],
        [1, 0.68],
    ],
    closed: false,
};

/** A "0": an upright oval. */
const zero: Glyph = {
    points: Array.from({ length: 48 }, (_, i) => {
        const angle = (i / 48) * Math.PI * 2;
        return [0.5 + 0.46 * Math.sin(angle), 0.5 - 0.5 * Math.cos(angle)] as const;
    }),
    closed: true,
};

const glyphs: readonly Glyph[] = [four, zero, four];

/** The numerals' proportions: each glyph's width and the gap between two, as shares of their height. */
const glyphWidth = 0.64;
const glyphGap = 0.24;
/**
 * The numerals' height as a share of the frame's, and the most of the frame's
 * width they may fill. A narrow frame is a phone, where the whole scene is
 * small, so the numerals take more of it. Between the two frame widths in
 * `narrowWidths` (pixels) the values blend.
 */
const numeralHeight = { narrow: 0.58, wide: 0.5 } as const;
const numeralWidthLimit = { narrow: 0.8, wide: 0.66 } as const;
const narrowWidths: readonly [number, number] = [400, 640];
/** Where the numerals' centre sits in the frame, leaving the bottom for the rooftops. */
const numeralCentre = { x: 0.5, y: 0.4 } as const;
/** A stroke is laid out as points at most this far apart, in shares of the numerals' height, so a sharp corner stays a point while the lanes beside a straight run stay straight. */
const strokeStep = 0.025;

/**
 * A stroke laid out in the frame, in pixels, with the running length to each
 * point and the stroke's direction at each point: the average of the two
 * segments that meet there, so the direction turns smoothly through a corner.
 */
export type Stroke = Readonly<{ points: readonly Point[]; directions: readonly Point[]; lengths: readonly number[]; total: number; closed: boolean }>;

/** Where "404" sits in a frame of this size: the numerals' height and width, and their box, in pixels. */
export function numeralBox(width: number, height: number) {
    const narrow = Math.min(1, Math.max(0, (width - narrowWidths[0]) / (narrowWidths[1] - narrowWidths[0])));
    const share = numeralHeight.narrow + (numeralHeight.wide - numeralHeight.narrow) * narrow;
    const limit = numeralWidthLimit.narrow + (numeralWidthLimit.wide - numeralWidthLimit.narrow) * narrow;
    const tall = Math.min(height * share, (width * limit) / (glyphs.length * glyphWidth + (glyphs.length - 1) * glyphGap));
    const wide = tall * glyphWidth;
    const step = wide + tall * glyphGap;
    const span = step * (glyphs.length - 1) + wide;
    const left = width * numeralCentre.x - span / 2;
    const top = height * numeralCentre.y - tall / 2;
    return { tall, wide, step, left, top, right: left + span, bottom: top + tall };
}

/** Adds points along each segment so none is longer than `step`, keeping every corner where it is. */
function subdivide(points: readonly Point[], step: number) {
    const fine: Point[] = [points[0]];
    for (let i = 1; i < points.length; i++) {
        const from = points[i - 1];
        const to = points[i];
        const pieces = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / step));
        for (let piece = 1; piece <= pieces; piece++) {
            fine.push({ x: from.x + ((to.x - from.x) * piece) / pieces, y: from.y + ((to.y - from.y) * piece) / pieces });
        }
    }
    return fine;
}

/** Lays "404" out in a frame of this size. */
export function numerals(width: number, height: number): Stroke[] {
    const { tall, wide, step, left, top } = numeralBox(width, height);
    return glyphs.map((glyph, index) => {
        const corners = glyph.points.map(([x, y]) => ({ x: left + index * step + x * wide, y: top + y * tall }));
        if (glyph.closed) corners.push({ ...corners[0] });
        const points = glyph.closed ? corners : subdivide(corners, tall * strokeStep);
        const lengths = [0];
        for (let i = 1; i < points.length; i++) {
            lengths.push(lengths[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y));
        }
        const last = points.length - 1;
        const heading = (i: number) => {
            const span = lengths[i + 1] - lengths[i] || 1;
            return { x: (points[i + 1].x - points[i].x) / span, y: (points[i + 1].y - points[i].y) / span };
        };
        const directions = points.map((_, i) => {
            // At a closed stroke's seam the last segment meets the first. An open stroke's ends have one segment each.
            const before = heading(i > 0 ? i - 1 : glyph.closed ? last - 1 : 0);
            const after = heading(i < last ? i : glyph.closed ? 0 : last - 1);
            const span = Math.hypot(before.x + after.x, before.y + after.y) || 1;
            return { x: (before.x + after.x) / span, y: (before.y + after.y) / span };
        });
        return { points, directions, lengths, total: lengths[last], closed: glyph.closed };
    });
}

/** The point a distance along a stroke, with the stroke's direction there. */
export function pointAlong(stroke: Stroke, distance: number) {
    const { points, directions, lengths } = stroke;
    let i = 1;
    while (i < points.length - 1 && lengths[i] < distance) i += 1;
    const from = points[i - 1];
    const to = points[i];
    const span = lengths[i] - lengths[i - 1] || 1;
    const t = Math.min(1, Math.max(0, (distance - lengths[i - 1]) / span));
    const tx = directions[i - 1].x + (directions[i].x - directions[i - 1].x) * t;
    const ty = directions[i - 1].y + (directions[i].y - directions[i - 1].y) * t;
    const turn = Math.hypot(tx, ty) || 1;
    return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t, tx: tx / turn, ty: ty / turn };
}

/**
 * The length of the circuit birds fly round a stroke, with lanes a
 * distance `lane` either side of it. A closed stroke is its own circuit.
 * An open one is flown out and back, with a half turn round each end.
 */
export function circuitLength(stroke: Stroke, lane: number) {
    return stroke.closed ? stroke.total : 2 * stroke.total + 2 * Math.PI * lane;
}

/**
 * The point a distance round a stroke's circuit, and the way a bird flies
 * there. `side` is how far from the stroke's line the bird keeps: on a
 * closed stroke its sign picks the side of the line, and on an open one
 * it is the lane's distance, the same out and back.
 */
export function pointOnCircuit(stroke: Stroke, distance: number, side: number, lane: number) {
    if (stroke.closed) {
        const at = pointAlong(stroke, distance);
        return { x: at.x - at.ty * side, y: at.y + at.tx * side, tx: at.tx, ty: at.ty };
    }
    const length = stroke.total;
    const turn = Math.PI * lane;
    if (distance < length) {
        // Out along one side.
        const at = pointAlong(stroke, distance);
        return { x: at.x - at.ty * side, y: at.y + at.tx * side, tx: at.tx, ty: at.ty };
    }
    if (distance < length + turn) {
        // Round the far end.
        const at = pointAlong(stroke, length);
        const angle = (distance - length) / lane;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return {
            x: at.x + (-at.ty * cos + at.tx * sin) * side,
            y: at.y + (at.tx * cos + at.ty * sin) * side,
            tx: at.ty * sin + at.tx * cos,
            ty: -at.tx * sin + at.ty * cos,
        };
    }
    if (distance < 2 * length + turn) {
        // Back along the other side.
        const at = pointAlong(stroke, 2 * length + turn - distance);
        return { x: at.x + at.ty * side, y: at.y - at.tx * side, tx: -at.tx, ty: -at.ty };
    }
    // Round the near end.
    const at = pointAlong(stroke, 0);
    const angle = (distance - 2 * length - turn) / lane;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return {
        x: at.x + (at.ty * cos - at.tx * sin) * side,
        y: at.y + (-at.tx * cos - at.ty * sin) * side,
        tx: -at.ty * sin - at.tx * cos,
        ty: at.tx * sin - at.ty * cos,
    };
}

export type Bird = {
    x: number;
    y: number;
    vx: number;
    vy: number;
    /** The way it points, in radians. It follows its velocity with a little lag, so it banks into a turn instead of snapping. */
    heading: number;
    /** Its place in the numerals: which stroke, how far round that stroke's circuit, and how far to the side of the lane's middle (-1 to 1). */
    stroke: number;
    along: number;
    aside: number;
    /** Its place in the roaming flock: an angle around the flock's centre and a share of its radius. */
    angle: number;
    orbit: number;
    /** Whether it is flying to its place in the numerals or with the roaming flock. */
    forming: boolean;
    /** Seconds before it follows the flock's latest change of plan, so the flock pours instead of snapping. */
    delay: number;
    /** Wingbeat phase, and a value of its own for size, blinking and wander. */
    flap: number;
    seed: number;
    /** 0 while it flies free, easing to 1 once it is settled in its place in the numerals. The scene draws a settled bird calmer, so the strokes read as lines. */
    held: number;
};

/** How the flock flies. Speeds are in frame heights per second, so every screen sees the same pace. */
const feel = {
    /** Seconds the numerals hold before the flock lets go, and seconds it roams before it pours back. */
    holdSeconds: 14,
    roamSeconds: 3.4,
    /** The first roam is barely a turn: the flock sweeps in and writes the numerals almost at once. */
    arriveSeconds: 0.5,
    /** After a tap the flock stays up a little, then comes back. */
    flushSeconds: 2.6,
    /** Birds join the numerals over this long, and leave over this long. */
    pourSeconds: 0.8,
    leaveSeconds: 0.7,
    /** How fast a bird flies round its circuit while the numerals hold. */
    flow: 0.06,
    /** Top speed, and how quickly a bird's velocity answers its steering, per second. */
    speed: 1.15,
    response: 3.4,
    /** How hard a bird closes on where it wants to be: speed per distance. It grips its place in the numerals harder, so it barely cuts a corner. */
    approach: 2.6,
    grip: 4.2,
    /** An open stroke's two lanes run this far either side of its line, in frame heights, close enough to read as one line. A bird strays this far from its lane's middle. */
    lane: 0.0035,
    stray: 0.0012,
    /** A bird counts as in its place within this distance, in frame heights, and settles into it at this rate, per second. */
    formedWithin: 0.03,
    settling: 2.5,
    /** How quickly a bird's heading follows its flight, per second. */
    banking: 7,
    /** A tap throws birds within this radius outward at up to this speed. */
    flushRadius: 0.95,
    flushKick: 1.5,
    /** A hovering mouse parts birds within this radius. */
    shyRadius: 0.2,
    shyPush: 0.55,
    /** Fireflies drift: slower, softer to steer, and never quite straight. */
    nightPace: 0.6,
    nightResponse: 2.2,
    nightWander: 0.018,
    /** A firefly settled in the numerals drops this share of its wander. */
    heldCalm: 0.8,
} as const;

export type FlockOptions = Readonly<{
    width: number;
    height: number;
    /**
     * Where the flock starts. "edge" (the default) flies in from off the right
     * of the frame, as birds would. "low" rises from along the bottom, as
     * fireflies would. "formed" has the numerals already written, for a still frame.
     */
    start?: "edge" | "low" | "formed";
    random?: () => number;
}>;

export type FlockStep = Readonly<{ night?: number; pointer?: Point | null }>;

export type Flock = Readonly<{
    birds: readonly Bird[];
    step(dt: number, options?: FlockStep): void;
    /** A tap: every bird near it is thrown outward and the whole flock goes up. */
    flush(x: number, y: number): void;
    /** Puts every bird in its place at once. */
    form(): void;
    /** Sends the flock roaming at once, spread through its cloud. */
    roam(): void;
    resize(width: number, height: number): void;
    /** Whether the flock is writing the numerals, and the share of birds that are in place. */
    isForming(): boolean;
    formed(): number;
}>;

/** One bird for about every this many pixels of circuit, within these limits. */
const spacing = 5.4;
const countLimits: readonly [number, number] = [180, 400];

export function createFlock(options: FlockOptions): Flock {
    const random = options.random ?? Math.random;
    const between = (min: number, max: number) => min + random() * (max - min);
    let width = options.width;
    let height = options.height;
    let strokes = numerals(width, height);
    let time = between(0, 60);
    let forming = false;
    let timer: number = feel.arriveSeconds;
    const birds: Bird[] = [];

    const lane = () => feel.lane * height;
    const circuits = () => strokes.map((stroke) => circuitLength(stroke, lane()));
    /**
     * How many birds a stroke needs, as a length. An open stroke's circuit
     * runs along its line twice, out and back. A closed one runs along it
     * once, so it counts twice to carry as many birds per length of line.
     */
    const crowds = () => strokes.map((stroke) => circuitLength(stroke, lane()) * (stroke.closed ? 2 : 1));

    /** Shares the birds out round the circuits by length, evenly spaced. */
    function assign() {
        const lengths = circuits();
        const crowd = crowds();
        const total = crowd.reduce((sum, length) => sum + length, 0);
        let index = 0;
        strokes.forEach((_, s) => {
            const share = s === strokes.length - 1 ? birds.length - index : Math.round((crowd[s] / total) * birds.length);
            for (let i = 0; i < share && index < birds.length; i++, index++) {
                const bird = birds[index];
                bird.stroke = s;
                bird.along = ((i + between(0.25, 0.75)) / share) * lengths[s];
                bird.aside = between(-1, 1);
            }
        });
    }

    function populate() {
        const fromLow = options.start === "low";
        const total = crowds().reduce((sum, length) => sum + length, 0);
        const count = Math.round(Math.min(countLimits[1], Math.max(countLimits[0], total / spacing)));
        birds.length = 0;
        for (let i = 0; i < count; i++) {
            birds.push({
                // Just off the right edge at the numerals' height, or low along the bottom of the frame.
                x: width * (fromLow ? between(0.04, 0.96) : between(1.03, 1.3)),
                y: height * (fromLow ? between(0.72, 0.86) : between(0.1, 0.6)),
                vx: fromLow ? 0 : -height * feel.speed * between(0.5, 0.9),
                vy: 0,
                heading: fromLow ? -Math.PI / 2 : Math.PI,
                stroke: 0,
                along: 0,
                aside: 0,
                angle: between(0, Math.PI * 2),
                orbit: Math.sqrt(random()),
                forming: false,
                delay: 0,
                flap: between(0, Math.PI * 2),
                seed: random(),
                held: 0,
            });
        }
        assign();
    }

    /** Where a bird's place in the numerals is right now, and the way that place is moving. */
    function place(bird: Bird) {
        const stroke = strokes[bird.stroke];
        // A closed stroke has one lane, on its line. An open one has a lane either side, both the same distance out.
        const side = (stroke.closed ? 0 : lane()) + bird.aside * feel.stray * height;
        return pointOnCircuit(stroke, bird.along, side, lane());
    }

    /** Where a bird's place in the roaming flock is right now: a cloud that turns, stretches and wanders. */
    function cloud(bird: Bird) {
        const cx = width * (0.5 + 0.27 * Math.sin(time * 0.31 + 1.3));
        const cy = height * (0.36 + 0.13 * Math.sin(time * 0.43));
        const rx = height * (0.5 + 0.14 * Math.sin(time * 0.6));
        const ry = height * (0.2 + 0.07 * Math.sin(time * 0.47 + 2));
        // Birds nearer the middle turn faster, so the cloud shears and folds instead of spinning like a plate.
        const angle = bird.angle + time * (1.15 - 0.6 * bird.orbit);
        const reach = bird.orbit * (1 + 0.22 * Math.sin(time * 1.1 + bird.angle * 3));
        return { x: cx + Math.cos(angle) * rx * reach, y: cy + Math.sin(angle) * ry * reach };
    }

    function turn(nowForming: boolean, seconds: number, stagger: number) {
        forming = nowForming;
        timer = seconds;
        for (const bird of birds) bird.delay = between(0, stagger);
    }

    function step(dt: number, { night = 0, pointer = null }: FlockStep = {}) {
        time += dt;
        timer -= dt;
        if (timer <= 0) {
            if (forming) turn(false, feel.roamSeconds, feel.leaveSeconds);
            else turn(true, feel.holdSeconds, feel.pourSeconds);
        }

        const pace = 1 - night * (1 - feel.nightPace);
        const response = feel.response + (feel.nightResponse - feel.response) * night;
        const topSpeed = feel.speed * height * pace;
        const flow = feel.flow * height * pace;
        const lengths = circuits();
        for (const bird of birds) {
            if (bird.forming !== forming) {
                bird.delay -= dt;
                if (bird.delay <= 0) bird.forming = forming;
            }

            let targetX: number;
            let targetY: number;
            let carryX = 0;
            let carryY = 0;
            if (bird.forming) {
                // Its place keeps moving round the circuit, always the same way.
                bird.along = (bird.along + flow * dt) % lengths[bird.stroke];
                const at = place(bird);
                targetX = at.x;
                targetY = at.y;
                carryX = at.tx * flow;
                carryY = at.ty * flow;
            } else {
                const at = cloud(bird);
                targetX = at.x;
                targetY = at.y;
            }

            const offX = targetX - bird.x;
            const offY = targetY - bird.y;
            const settled = bird.forming && Math.hypot(offX, offY) < feel.formedWithin * height ? 1 : 0;
            bird.held += (settled - bird.held) * Math.min(1, dt * feel.settling);
            const approach = bird.forming ? feel.grip : feel.approach;
            let wantX = offX * approach;
            let wantY = offY * approach;
            const want = Math.hypot(wantX, wantY);
            if (want > topSpeed) {
                wantX *= topSpeed / want;
                wantY *= topSpeed / want;
            }
            wantX += carryX;
            wantY += carryY;
            if (night > 0) {
                // A firefly settled in the numerals wanders less, so the strokes stay crisp.
                const wander = feel.nightWander * height * night * (1 - feel.heldCalm * bird.held);
                wantX += Math.sin(time * 1.7 + bird.seed * 40) * wander;
                wantY += Math.cos(time * 1.3 + bird.seed * 70) * wander;
            }
            if (pointer) {
                const dx = bird.x - pointer.x;
                const dy = bird.y - pointer.y;
                const distance = Math.hypot(dx, dy) || 1;
                const radius = feel.shyRadius * height;
                if (distance < radius) {
                    const push = (1 - distance / radius) * feel.shyPush * height;
                    wantX += (dx / distance) * push;
                    wantY += (dy / distance) * push;
                }
            }

            const ease = Math.min(1, dt * response);
            bird.vx += (wantX - bird.vx) * ease;
            bird.vy += (wantY - bird.vy) * ease;
            bird.x += bird.vx * dt;
            bird.y += bird.vy * dt;

            const speed = Math.hypot(bird.vx, bird.vy);
            // A bird barely moving keeps the heading it had: there is no direction in a standstill.
            if (speed > height * 0.01) {
                const swing = Math.atan2(bird.vy, bird.vx) - bird.heading;
                bird.heading += Math.atan2(Math.sin(swing), Math.cos(swing)) * Math.min(1, dt * feel.banking);
            }
            bird.flap += dt * (9 + (speed / height) * 14);
        }
    }

    function form() {
        turn(true, feel.holdSeconds, 0);
        for (const bird of birds) {
            const at = place(bird);
            bird.forming = true;
            bird.x = at.x;
            bird.y = at.y;
            bird.vx = at.tx * feel.flow * height;
            bird.vy = at.ty * feel.flow * height;
            bird.heading = Math.atan2(at.ty, at.tx);
            bird.held = 1;
        }
    }

    function roam() {
        turn(false, feel.roamSeconds, 0);
        for (const bird of birds) {
            const at = cloud(bird);
            const next = cloud({ ...bird, angle: bird.angle + 0.05 });
            const span = Math.hypot(next.x - at.x, next.y - at.y) || 1;
            bird.forming = false;
            bird.x = at.x;
            bird.y = at.y;
            bird.vx = ((next.x - at.x) / span) * feel.speed * height * 0.3;
            bird.vy = ((next.y - at.y) / span) * feel.speed * height * 0.3;
            bird.heading = Math.atan2(bird.vy, bird.vx);
            bird.held = 0;
        }
    }

    function flush(x: number, y: number) {
        turn(false, feel.flushSeconds, 0);
        const radius = feel.flushRadius * height;
        for (const bird of birds) {
            bird.forming = false;
            const dx = bird.x - x;
            const dy = bird.y - y;
            const distance = Math.hypot(dx, dy) || 1;
            if (distance >= radius) continue;
            const kick = (1 - distance / radius) ** 2 * feel.flushKick * height;
            bird.vx += (dx / distance) * kick;
            bird.vy += (dy / distance) * kick;
        }
    }

    function resize(nextWidth: number, nextHeight: number) {
        if (nextWidth === width && nextHeight === height) return;
        const sx = nextWidth / width;
        const sy = nextHeight / height;
        const before = circuits();
        // The numerals take a different share of a narrow frame than a wide one, so a bird in them keeps its place relative to them, not to the frame.
        const offsets = birds.map((bird) => {
            const at = place(bird);
            return { x: bird.x - at.x, y: bird.y - at.y };
        });
        width = nextWidth;
        height = nextHeight;
        strokes = numerals(width, height);
        const after = circuits();
        birds.forEach((bird, i) => {
            bird.along *= after[bird.stroke] / before[bird.stroke];
            if (bird.forming) {
                const at = place(bird);
                bird.x = at.x + offsets[i].x * sy;
                bird.y = at.y + offsets[i].y * sy;
            } else {
                bird.x *= sx;
                bird.y *= sy;
            }
            bird.vx *= sy;
            bird.vy *= sy;
        });
    }

    function formed() {
        const near = feel.formedWithin * height;
        let count = 0;
        for (const bird of birds) {
            const at = place(bird);
            if (Math.hypot(bird.x - at.x, bird.y - at.y) < near) count += 1;
        }
        return count / birds.length;
    }

    populate();
    if (options.start === "formed") form();

    return { birds, step, flush, form, roam, resize, isForming: () => forming, formed };
}
