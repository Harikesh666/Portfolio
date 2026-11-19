/**
 * The flock that writes "404" in the sky of the not-found page.
 *
 * Each numeral is a pen stroke: a line a pen could draw without lifting.
 * Every bird owns a place along one stroke and keeps flying along it, so
 * the numerals hold their shape while nothing in them stands still. Between
 * times the flock lets go and roams as one loose, turning cloud, then pours
 * back in. A tap flushes it.
 *
 * This file is the flock's behaviour only, with no drawing and no DOM, so
 * it can be tested. `sky-scene.ts` draws it: small birds by day, fireflies
 * at night.
 */

export type Point = { x: number; y: number };

/** A pen stroke in a unit box: x runs right, y runs down. A closed stroke joins its last point to its first. */
type Glyph = Readonly<{ points: readonly (readonly [number, number])[]; closed: boolean }>;

/** A "4" drawn in one go: up the stem, down the slope, and across the bar. */
const four: Glyph = {
    points: [
        [0.72, 1],
        [0.72, 0],
        [0, 0.7],
        [1, 0.7],
    ],
    closed: false,
};

/** A "0": an upright oval. */
const zero: Glyph = {
    points: Array.from({ length: 28 }, (_, i) => {
        const angle = (i / 28) * Math.PI * 2;
        return [0.5 + 0.47 * Math.sin(angle), 0.5 - 0.5 * Math.cos(angle)] as const;
    }),
    closed: true,
};

const glyphs: readonly Glyph[] = [four, zero, four];

/** The numerals' proportions: each glyph's width and the gap between two, as shares of their height. */
const glyphWidth = 0.62;
const glyphGap = 0.24;
/** The numerals are this tall: a share of the frame's height, but never so wide they crowd a narrow frame. */
const numeralHeight = 0.46;
const numeralWidthLimit = 0.52;
/** Where the numerals' centre sits in the frame, leaving the bottom for the rooftops. */
const numeralCentre = { x: 0.5, y: 0.41 } as const;

/** A stroke laid out in the frame, in pixels, with the running length to each point. */
export type Stroke = Readonly<{ points: readonly Point[]; lengths: readonly number[]; total: number; closed: boolean }>;

/** Lays "404" out in a frame of this size. */
export function numerals(width: number, height: number): Stroke[] {
    const tall = Math.min(height * numeralHeight, (width * numeralWidthLimit) / (glyphs.length * glyphWidth + (glyphs.length - 1) * glyphGap));
    const wide = tall * glyphWidth;
    const step = wide + tall * glyphGap;
    const left = width * numeralCentre.x - (step * (glyphs.length - 1) + wide) / 2;
    const top = height * numeralCentre.y - tall / 2;
    return glyphs.map((glyph, index) => {
        const points = glyph.points.map(([x, y]) => ({ x: left + index * step + x * wide, y: top + y * tall }));
        if (glyph.closed) points.push({ ...points[0] });
        const lengths = [0];
        for (let i = 1; i < points.length; i++) {
            lengths.push(lengths[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y));
        }
        return { points, lengths, total: lengths[lengths.length - 1], closed: glyph.closed };
    });
}

/** The point a distance along a stroke, with the stroke's direction there. */
export function pointAlong(stroke: Stroke, distance: number) {
    const { points, lengths } = stroke;
    let i = 1;
    while (i < points.length - 1 && lengths[i] < distance) i += 1;
    const from = points[i - 1];
    const to = points[i];
    const span = lengths[i] - lengths[i - 1] || 1;
    const t = Math.min(1, Math.max(0, (distance - lengths[i - 1]) / span));
    return {
        x: from.x + (to.x - from.x) * t,
        y: from.y + (to.y - from.y) * t,
        tx: (to.x - from.x) / span,
        ty: (to.y - from.y) / span,
    };
}

export type Bird = {
    x: number;
    y: number;
    vx: number;
    vy: number;
    /** Its place in the numerals: which stroke, how far along it, which way it flies along it, and how far to one side. */
    stroke: number;
    along: number;
    direction: 1 | -1;
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
};

/** How the flock flies. Speeds are in frame heights per second, so every screen sees the same pace. */
const feel = {
    /** Seconds the numerals hold before the flock lets go, and seconds it roams before it pours back. */
    holdSeconds: 9,
    roamSeconds: 4.2,
    /** The first roam is short: the flock sweeps in and the page says what it is. */
    arriveSeconds: 2.2,
    /** After a tap the flock stays up a little, then comes back. */
    flushSeconds: 2.6,
    /** Birds join the numerals over this long, and leave over this long. */
    pourSeconds: 1.5,
    leaveSeconds: 0.7,
    /** How fast a bird flies along its stroke while the numerals hold. */
    flow: 0.075,
    /** Top speed, and how quickly a bird's velocity answers its steering, per second. */
    speed: 0.95,
    response: 3.4,
    /** How hard a bird closes on where it wants to be: speed per distance. */
    approach: 2.6,
    /** A stroke is this thick, in frame heights: birds keep to within it. */
    weight: 0.016,
    /** A tap throws birds within this radius outward at up to this speed. */
    flushRadius: 0.95,
    flushKick: 1.5,
    /** A hovering mouse parts birds within this radius. */
    shyRadius: 0.2,
    shyPush: 0.55,
    /** Fireflies drift: slower, softer to steer, and never quite straight. */
    nightPace: 0.5,
    nightResponse: 1.7,
    nightWander: 0.018,
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

/** One bird for about every this many pixels of stroke, within these limits. */
const spacing = 4.3;
const countLimits: readonly [number, number] = [130, 260];

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

    /** Shares the birds out along the strokes by length, evenly spaced, alternating direction. */
    function assign() {
        const total = strokes.reduce((sum, stroke) => sum + stroke.total, 0);
        let index = 0;
        strokes.forEach((stroke, s) => {
            const share = s === strokes.length - 1 ? birds.length - index : Math.round((stroke.total / total) * birds.length);
            for (let i = 0; i < share && index < birds.length; i++, index++) {
                const bird = birds[index];
                bird.stroke = s;
                bird.along = ((i + between(0.2, 0.8)) / share) * stroke.total;
                bird.direction = stroke.closed || i % 2 === 0 ? 1 : -1;
            }
        });
    }

    function populate() {
        const fromLow = options.start === "low";
        const total = strokes.reduce((sum, stroke) => sum + stroke.total, 0);
        const count = Math.round(Math.min(countLimits[1], Math.max(countLimits[0], total / spacing)));
        birds.length = 0;
        for (let i = 0; i < count; i++) {
            birds.push({
                // Off the right edge and high up, or low along the bottom of the frame.
                x: width * (fromLow ? between(0.04, 0.96) : between(1.05, 1.5)),
                y: height * (fromLow ? between(0.74, 0.9) : between(0.05, 0.5)),
                vx: fromLow ? 0 : -height * feel.speed * between(0.5, 0.9),
                vy: 0,
                stroke: 0,
                along: 0,
                direction: 1,
                aside: between(-1, 1),
                angle: between(0, Math.PI * 2),
                orbit: Math.sqrt(random()),
                forming: false,
                delay: 0,
                flap: between(0, Math.PI * 2),
                seed: random(),
            });
        }
        assign();
    }

    /** Where a bird's place in the numerals is right now, and how that place is moving. */
    function place(bird: Bird) {
        const stroke = strokes[bird.stroke];
        const at = pointAlong(stroke, bird.along);
        const offset = bird.aside * feel.weight * height;
        return {
            x: at.x - at.ty * offset,
            y: at.y + at.tx * offset,
            tx: at.tx * bird.direction,
            ty: at.ty * bird.direction,
        };
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
                // Its place keeps moving along the stroke: round a loop, or back and forth along a line.
                const stroke = strokes[bird.stroke];
                bird.along += bird.direction * flow * dt;
                if (stroke.closed) {
                    bird.along = ((bird.along % stroke.total) + stroke.total) % stroke.total;
                } else if (bird.along > stroke.total || bird.along < 0) {
                    bird.along = Math.min(stroke.total, Math.max(0, bird.along));
                    bird.direction = bird.direction === 1 ? -1 : 1;
                }
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

            let wantX = (targetX - bird.x) * feel.approach;
            let wantY = (targetY - bird.y) * feel.approach;
            const want = Math.hypot(wantX, wantY);
            if (want > topSpeed) {
                wantX *= topSpeed / want;
                wantY *= topSpeed / want;
            }
            wantX += carryX;
            wantY += carryY;
            if (night > 0) {
                const wander = feel.nightWander * height * night;
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
            bird.flap += dt * (7 + (Math.hypot(bird.vx, bird.vy) / height) * 16);
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
        }
    }

    function roam() {
        turn(false, feel.roamSeconds, 0);
        for (const bird of birds) {
            const at = cloud(bird);
            const ahead = { ...bird, angle: bird.angle + 0.05 };
            const next = cloud(ahead);
            const span = Math.hypot(next.x - at.x, next.y - at.y) || 1;
            bird.forming = false;
            bird.x = at.x;
            bird.y = at.y;
            bird.vx = ((next.x - at.x) / span) * feel.speed * height * 0.3;
            bird.vy = ((next.y - at.y) / span) * feel.speed * height * 0.3;
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
        const before = strokes;
        width = nextWidth;
        height = nextHeight;
        strokes = numerals(width, height);
        for (const bird of birds) {
            bird.x *= sx;
            bird.y *= sy;
            bird.vx *= sy;
            bird.vy *= sy;
            bird.along *= strokes[bird.stroke].total / before[bird.stroke].total;
        }
    }

    function formed() {
        const near = feel.weight * height * 2.5;
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
