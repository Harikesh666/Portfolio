import type { Job } from "./pond-scheduler";

export type Vec = { x: number; y: number };
export type FishState = "wander" | "queued" | "running" | "leaving" | "fading";

type Marking = Readonly<{
    color: string;
    /** Position along the body, 0 at the nose and 1 at the tail root. */
    at: number;
    /** Offset across the body, -1 to 1 of the local half-width. */
    side: number;
    /** Radius as a share of the local half-width. */
    size: number;
    /** How much the patch stretches along the body. */
    stretch: number;
}>;

type Variety = Readonly<{
    body: string;
    shade: string;
    highlight: string;
    fin: string;
    marks: ReadonlyArray<Readonly<{ color: string; count: readonly [number, number]; size: readonly [number, number] }>>;
    /** A single round patch on the head, as on a tancho koi. */
    crown?: string;
}>;

/** Classic koi patterns, drawn from above. */
const varieties: readonly Variety[] = [
    // Kohaku: white with red patches.
    {
        body: "#f7f2ea",
        shade: "#d8cdbf",
        highlight: "#ffffff",
        fin: "rgba(250, 246, 238, 0.5)",
        marks: [{ color: "#de4f2c", count: [2, 3], size: [0.9, 1.35] }],
    },
    // Ogon: one metallic gold.
    {
        body: "#efb03e",
        shade: "#c3801c",
        highlight: "#ffe7a6",
        fin: "rgba(246, 196, 92, 0.48)",
        marks: [],
    },
    // Sanke: kohaku with small black accents.
    {
        body: "#f6f0e7",
        shade: "#d6cab9",
        highlight: "#ffffff",
        fin: "rgba(250, 245, 236, 0.5)",
        marks: [
            { color: "#d9472a", count: [2, 3], size: [0.8, 1.2] },
            { color: "#26211f", count: [1, 3], size: [0.35, 0.6] },
        ],
    },
    // Tancho: white with one red crown.
    {
        body: "#f8f4ee",
        shade: "#dbd1c4",
        highlight: "#ffffff",
        fin: "rgba(251, 248, 242, 0.5)",
        marks: [],
        crown: "#d8402a",
    },
    // Showa: black with red and white.
    {
        body: "#2c2624",
        shade: "#151110",
        highlight: "#5a514c",
        fin: "rgba(70, 62, 58, 0.5)",
        marks: [
            { color: "#d44a2b", count: [2, 3], size: [0.8, 1.2] },
            { color: "#f1ebe2", count: [2, 3], size: [0.7, 1] },
        ],
    },
    // Yamabuki: soft yellow with a pale back.
    {
        body: "#f3cf6e",
        shade: "#d0a23f",
        highlight: "#fff1c4",
        fin: "rgba(246, 214, 128, 0.48)",
        marks: [{ color: "#fbf3e2", count: [1, 2], size: [0.7, 1] }],
    },
];

/** Microtasks in the event-loop pond: small, pale and silvery. */
const microVariety: Variety = {
    body: "#dbecf1",
    shade: "#a9c6cf",
    highlight: "#ffffff",
    fin: "rgba(220, 238, 243, 0.5)",
    marks: [],
};

export type Fish = {
    job: Job;
    state: FishState;
    /** The spine as the simulation moves it: the head leads and each joint follows. */
    points: Vec[];
    /** The spine as it is drawn: `points` with the swimming wave laid over it. See `poseOf`. */
    pose: Vec[];
    heading: number;
    /** How fast the heading is changing, in radians per second. Eased, so turns start and end gently. */
    turn: number;
    speed: number;
    length: number;
    variety: Variety;
    /** Index into the koi varieties; the micro variety is last. Used by the GPU palette. */
    varietyIndex: number;
    /** Stable per-fish value that places its markings. */
    seed: number;
    markings: Marking[];
    target: Vec;
    timer: number;
    phase: number;
    orbit: number;
    alpha: number;
    /** How hard it is swimming: 0 coasting with a straight body, 1 a full stroke. */
    effort: number;
    /** Burst and glide: whether it is coasting now, and the seconds until it switches. */
    gliding: boolean;
    strokeTimer: number;
    /** 0 at the surface, 1 down near the floor, and the depth it is heading for. */
    depth: number;
    depthTarget: number;
    /** Pectoral fins: 0 folded against the body, 1 flared out to brake or hover. */
    spread: number;
    /** Mouth: 0 closed, 1 open for a pellet. `gulpTimer` holds it open a moment after a bite. */
    gulp: number;
    gulpTimer: number;
    /** Seconds left of a startled dart, and of a rest in one place. */
    startle: number;
    rest: number;
    /** A koi it is trailing for a while, and the seconds left of that. */
    leader?: Fish;
    leaderTimer: number;
};

/**
 * How the head is driven for a step.
 * "direct" swims straight for the target. "settle" also holds its place
 * facing right once it arrives. "cruise" is a koi at ease: a few tail
 * beats, then a glide. "dart" is a startled sprint that turns on the spot.
 */
export type Swim = "direct" | "settle" | "cruise" | "dart";

/** Joints along each fish's spine; the body bends between them. */
export const segments = 12;
/** Fastest heading change, in radians per second. */
const turnRate = 2.2;
/** How eagerly the head turns toward its target, and how quickly a turn builds and fades. */
const turnGain = 3.2;
const turnEase = 6;
/** A startled koi turns this many times faster. */
const dartAgility = 3.5;
/** Sideways yaw of the head with each stroke, in radians at full effort. */
const swayAmplitude = 0.1;
/** The swimming wave: its height at the tail root in body lengths, and how many waves fit along the body. */
const waveAmplitude = 0.075;
export const waveTurns = 0.85;
/** The head barely moves sideways; the wave grows from this share toward the tail. */
const waveAtHead = 0.05;
/** Cruising: seconds spent beating the tail, then gliding, and the speed of each as a share of the cruising pace. */
const burstSeconds: readonly [number, number] = [0.9, 1.9];
const glideSeconds: readonly [number, number] = [1.1, 2.6];
const burstPace = 1.35;
const glidePace = 0.5;
/** How fast speed catches up: quick when pushing off, slow when water drag is all there is. */
const pushGain = 2.3;
const dragGain = 0.65;

const random = (min: number, max: number) => min + Math.random() * (max - min);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const smooth = (from: number, to: number, value: number) => {
    const t = clamp((value - from) / (to - from), 0, 1);
    return t * t * (3 - 2 * t);
};

/**
 * Half-width of a koi from above, in body lengths, at u from the snout (0)
 * to the tail root (1): a blunt rounded head, shoulders that swell just
 * behind the gill covers, then a long taper to the wrist of the tail.
 * The GPU shader repeats this as `bodyHalfWidth`; keep the two in step.
 */
export function bodyProfile(u: number) {
    if (u <= 0 || u > 1) return 0;
    const nose = Math.max(0.2 - u, 0) / 0.2;
    const head = Math.max(0, 1 - nose * nose) ** 0.55;
    const shoulder = lerp(0.09, 0.118, smooth(0.16, 0.38, u));
    const taper = 1 - 0.75 * smooth(0.36, 1, u) ** 1.15;
    return shoulder * taper * head;
}

/** Half-width for the 2D koi, whose spine starts a little behind the nose. */
export function widthAt(t: number, length: number) {
    return length * bodyProfile((t + 0.055) / 1.055);
}

/** The most one spine joint can bend, in radians, so a koi turning on the spot never folds. */
const maxJointBend = 0.28;

export function follow(fish: Fish) {
    const spacing = fish.length / (segments - 1);
    // Each segment points backward; the first is measured against the heading.
    let previous = fish.heading + Math.PI;
    for (let i = 1; i < segments; i++) {
        const ahead = fish.points[i - 1];
        const point = fish.points[i];
        const angle = Math.atan2(point.y - ahead.y, point.x - ahead.x);
        const bend = Math.atan2(Math.sin(angle - previous), Math.cos(angle - previous));
        const limited = previous + Math.max(-maxJointBend, Math.min(maxJointBend, bend));
        point.x = ahead.x + Math.cos(limited) * spacing;
        point.y = ahead.y + Math.sin(limited) * spacing;
        previous = limited;
    }
}

/**
 * Lays the swimming wave over the spine and returns the drawn pose.
 * A fish pushes water with a wave that runs from head to tail and grows as
 * it goes, so the head stays nearly still and the tail sweeps widest. The
 * wave's height follows `effort`: a gliding koi is almost straight.
 */
export function poseOf(fish: Fish) {
    const { points, pose, length } = fish;
    const height = length * waveAmplitude * fish.effort;
    for (let i = 0; i < segments; i++) {
        const before = points[Math.max(0, i - 1)];
        const after = points[Math.min(segments - 1, i + 1)];
        const tx = before.x - after.x;
        const ty = before.y - after.y;
        const tangent = Math.hypot(tx, ty) || 1;
        const u = i / (segments - 1);
        const offset = height * (waveAtHead + (1 - waveAtHead) * u * u) * Math.sin(fish.phase - u * waveTurns * Math.PI * 2);
        pose[i].x = points[i].x + (-ty / tangent) * offset;
        pose[i].y = points[i].y + (tx / tangent) * offset;
    }
    return pose;
}

/**
 * Turns the head toward a target, eases speed, and advances the stroke;
 * the rest of the spine follows the head. See `Swim` for the modes.
 */
export function steer(fish: Fish, target: Vec, maxSpeed: number, dt: number, swim: Swim = "direct") {
    const head = fish.points[0];
    const dx = target.x - head.x;
    const dy = target.y - head.y;
    const distance = Math.hypot(dx, dy);
    // Right on top of its target a fish keeps its line, or it would spin.
    let desiredHeading = distance < 3 ? fish.heading : Math.atan2(dy, dx);
    let desiredSpeed = Math.min(maxSpeed, distance * 1.4);
    if (swim === "settle" && distance < 6) {
        desiredHeading = 0;
        desiredSpeed = 4;
    }

    let effort = clamp(desiredSpeed / maxSpeed, 0.15, 1);
    let gain = pushGain;
    if (swim === "cruise") {
        fish.strokeTimer -= dt;
        if (fish.strokeTimer <= 0) {
            fish.gliding = !fish.gliding;
            fish.strokeTimer = random(...(fish.gliding ? glideSeconds : burstSeconds));
        }
        desiredSpeed *= fish.gliding ? glidePace : burstPace;
        effort = fish.gliding ? 0.1 : 1;
        gain = fish.gliding ? dragGain : pushGain;
    } else if (swim === "dart") {
        effort = 1;
        gain = pushGain * 4;
    }

    const agility = swim === "dart" ? dartAgility : 1;
    const difference = Math.atan2(
        Math.sin(desiredHeading - fish.heading),
        Math.cos(desiredHeading - fish.heading),
    );
    const maxTurn = turnRate * (0.55 + fish.speed / maxSpeed) * agility;
    const wantedTurn = clamp(difference * turnGain * agility, -maxTurn, maxTurn);
    fish.turn += (wantedTurn - fish.turn) * Math.min(1, dt * turnEase * agility);
    fish.heading += fish.turn * dt;

    // Fins flare to brake or hover, half open on a glide, and fold flat for a sprint.
    const braking = fish.speed > desiredSpeed * 1.3 || desiredSpeed < 8;
    const spread = swim === "dart" ? 0 : braking ? 1 : fish.gliding && swim === "cruise" ? 0.7 : 0.35;
    fish.spread += (spread - fish.spread) * Math.min(1, dt * 4);

    fish.speed += (desiredSpeed - fish.speed) * Math.min(1, dt * gain);
    fish.effort += (effort - fish.effort) * Math.min(1, dt * 3.5);
    fish.depth += (fish.depthTarget - fish.depth) * Math.min(1, dt * 0.9);
    fish.phase += dt * (1.5 + fish.effort * 3.6 + fish.speed * 0.035);

    const sway = Math.sin(fish.phase) * swayAmplitude * fish.effort;
    head.x += Math.cos(fish.heading + sway) * fish.speed * dt;
    head.y += Math.sin(fish.heading + sway) * fish.speed * dt;
    follow(fish);
}

function markingsFor(variety: Variety): Marking[] {
    const markings: Marking[] = [];
    if (variety.crown) {
        markings.push({ color: variety.crown, at: 0.07, side: 0, size: 0.78, stretch: 1 });
    }
    for (const mark of variety.marks) {
        const count = Math.round(random(mark.count[0], mark.count[1] + 0.4));
        for (let i = 0; i < count; i++) {
            markings.push({
                color: mark.color,
                at: random(0.1, 0.7),
                side: random(-0.55, 0.55),
                size: random(mark.size[0], mark.size[1]),
                stretch: random(1.3, 2.2),
            });
        }
    }
    return markings;
}

export function makeFish(job: Job, at: Vec, heading: number, length: number, isMicro: boolean): Fish {
    const spacing = length / (segments - 1);
    const varietyIndex = isMicro ? varieties.length : job.id % varieties.length;
    const variety = isMicro ? microVariety : varieties[varietyIndex];
    const points = Array.from({ length: segments }, (_, i) => ({
        x: at.x - Math.cos(heading) * spacing * i,
        y: at.y - Math.sin(heading) * spacing * i,
    }));
    return {
        job,
        state: "wander",
        points,
        pose: points.map((point) => ({ ...point })),
        heading,
        turn: 0,
        speed: 0,
        length,
        variety,
        varietyIndex,
        seed: random(0, 100),
        markings: markingsFor(variety),
        target: { ...at },
        timer: 0,
        phase: random(0, Math.PI * 2),
        orbit: 0,
        alpha: 1,
        effort: 0.5,
        gliding: Math.random() < 0.5,
        strokeTimer: random(0, 1.5),
        depth: 0.4,
        depthTarget: 0.4,
        spread: 0.5,
        gulp: 0,
        gulpTimer: 0,
        startle: 0,
        rest: 0,
        leaderTimer: 0,
    };
}

type Frame = Readonly<{ spine: Vec[]; left: Vec[]; right: Vec[]; normals: Vec[] }>;

/** Edge points and outward normals along the drawn spine, for this frame's pose. */
function frameOf(fish: Fish): Frame {
    const spine = poseOf(fish);
    const left: Vec[] = [];
    const right: Vec[] = [];
    const normals: Vec[] = [];
    for (let i = 0; i < segments; i++) {
        const before = spine[Math.max(0, i - 1)];
        const after = spine[Math.min(segments - 1, i + 1)];
        const tx = before.x - after.x;
        const ty = before.y - after.y;
        const tangentLength = Math.hypot(tx, ty) || 1;
        const normal = { x: -ty / tangentLength, y: tx / tangentLength };
        const width = widthAt(i / (segments - 1), fish.length);
        normals.push(normal);
        left.push({ x: spine[i].x + normal.x * width, y: spine[i].y + normal.y * width });
        right.push({ x: spine[i].x - normal.x * width, y: spine[i].y - normal.y * width });
    }
    return { spine, left, right, normals };
}

/** A smooth closed curve through points, using midpoints as anchors. */
function traceClosed(context: CanvasRenderingContext2D, shape: Vec[]) {
    const mid = (a: Vec, b: Vec) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
    const start = mid(shape[shape.length - 1], shape[0]);
    context.beginPath();
    context.moveTo(start.x, start.y);
    for (let i = 0; i < shape.length; i++) {
        const next = mid(shape[i], shape[(i + 1) % shape.length]);
        context.quadraticCurveTo(shape[i].x, shape[i].y, next.x, next.y);
    }
    context.closePath();
}

function bodyShape(fish: Fish, frame: Frame) {
    const nose = {
        x: frame.spine[0].x + Math.cos(fish.heading) * fish.length * 0.055,
        y: frame.spine[0].y + Math.sin(fish.heading) * fish.length * 0.055,
    };
    return [nose, ...frame.left, frame.spine[segments - 1], ...[...frame.right].reverse()];
}

/** The tail: two soft lobes that trail the body's wave with a lag. */
function traceTail(context: CanvasRenderingContext2D, fish: Fish, frame: Frame) {
    const root = frame.spine[segments - 1];
    const before = frame.spine[segments - 3];
    const back = Math.atan2(root.y - before.y, root.x - before.x);
    const lag = tailFlex(fish, 1);
    const reach = fish.length * 0.34;
    const lobe = (spread: number) => ({
        x: root.x + Math.cos(back + lag + spread) * reach,
        y: root.y + Math.sin(back + lag + spread) * reach,
    });
    const upper = lobe(0.5);
    const lower = lobe(-0.5);
    const notch = {
        x: root.x + Math.cos(back + lag * 1.2) * reach * 0.5,
        y: root.y + Math.sin(back + lag * 1.2) * reach * 0.5,
    };
    const curve = (spread: number) => ({
        x: root.x + Math.cos(back + lag * 0.6 + spread) * reach * 0.62,
        y: root.y + Math.sin(back + lag * 0.6 + spread) * reach * 0.62,
    });
    const upperBend = curve(0.62);
    const lowerBend = curve(-0.62);
    context.beginPath();
    context.moveTo(root.x, root.y);
    context.quadraticCurveTo(upperBend.x, upperBend.y, upper.x, upper.y);
    context.quadraticCurveTo(notch.x, notch.y, lower.x, lower.y);
    context.quadraticCurveTo(lowerBend.x, lowerBend.y, root.x, root.y);
    context.closePath();
    return { root, reach, back: back + lag };
}

/**
 * How far the tail fin bends from the body's line at a point along it
 * (0 at its root, 1 at its tips), in radians. The fin is a soft sheet: it
 * trails the tail root's sideways sweep, later toward its tips, and swings
 * wide of a turn.
 */
export function tailFlex(fish: Fish, along: number) {
    const sweep = Math.cos(fish.phase - waveTurns * Math.PI * 2 - 0.8 * along);
    return (0.62 * fish.effort * sweep - clamp(fish.turn * 0.12, -0.35, 0.35)) * along;
}

/** Pectoral and pelvic fins: soft fans that flare to brake and fold to sprint. */
function drawSideFins(context: CanvasRenderingContext2D, fish: Fish, frame: Frame) {
    const scull = Math.sin(fish.phase * 0.7) * 0.18 * fish.spread;
    const fins = [
        { index: 2, reach: 0.21, width: 0.12, sweep: lerp(2.6, 1.95, fish.spread) },
        { index: 6, reach: 0.1, width: 0.055, sweep: 2.5 },
    ];
    context.fillStyle = fish.variety.fin;
    for (const fin of fins) {
        for (const side of [1, -1]) {
            const edge = side === 1 ? frame.left[fin.index] : frame.right[fin.index];
            const angle = fish.heading + side * (fin.sweep + scull * side);
            const tip = {
                x: edge.x + Math.cos(angle) * fish.length * fin.reach,
                y: edge.y + Math.sin(angle) * fish.length * fin.reach,
            };
            const spread = fish.length * fin.width;
            const across = angle + Math.PI / 2;
            context.beginPath();
            context.moveTo(edge.x, edge.y);
            context.quadraticCurveTo(
                lerp(edge.x, tip.x, 0.6) + Math.cos(across) * spread,
                lerp(edge.y, tip.y, 0.6) + Math.sin(across) * spread,
                tip.x,
                tip.y,
            );
            context.quadraticCurveTo(
                lerp(edge.x, tip.x, 0.5) - Math.cos(across) * spread * 0.4,
                lerp(edge.y, tip.y, 0.5) - Math.sin(across) * spread * 0.4,
                edge.x,
                edge.y,
            );
            context.fill();
        }
    }
}

/** The silhouette alone, for the blurred shadow layer. */
export function traceFishSilhouette(context: CanvasRenderingContext2D, fish: Fish) {
    const frame = frameOf(fish);
    traceClosed(context, bodyShape(fish, frame));
    context.fill();
    traceTail(context, fish, frame);
    context.fill();
}

export function drawFish(context: CanvasRenderingContext2D, fish: Fish) {
    const { variety, length } = fish;
    const frame = frameOf(fish);
    const points = frame.spine;
    context.globalAlpha = fish.alpha;

    // Fins sit under the body; the tail fades from its root to its tips.
    drawSideFins(context, fish, frame);
    const tail = traceTail(context, fish, frame);
    const tailTip = {
        x: tail.root.x + Math.cos(tail.back) * tail.reach,
        y: tail.root.y + Math.sin(tail.back) * tail.reach,
    };
    const tailFade = context.createLinearGradient(tail.root.x, tail.root.y, tailTip.x, tailTip.y);
    tailFade.addColorStop(0, variety.fin);
    tailFade.addColorStop(1, "rgba(255, 255, 255, 0.08)");
    context.fillStyle = tailFade;
    context.fill();

    // The body is lit down its back and shaded toward its sides.
    const shape = bodyShape(fish, frame);
    const across = 3;
    const shading = context.createLinearGradient(
        frame.left[across].x,
        frame.left[across].y,
        frame.right[across].x,
        frame.right[across].y,
    );
    shading.addColorStop(0, variety.shade);
    shading.addColorStop(0.34, variety.body);
    shading.addColorStop(0.5, variety.highlight);
    shading.addColorStop(0.66, variety.body);
    shading.addColorStop(1, variety.shade);
    traceClosed(context, shape);
    context.fillStyle = shading;
    context.fill();

    // Markings have soft edges and bend with the body.
    context.save();
    traceClosed(context, shape);
    context.clip();
    for (const mark of fish.markings) {
        const position = mark.at * (segments - 1);
        const i = Math.min(segments - 2, Math.floor(position));
        const t = position - i;
        const center = { x: lerp(points[i].x, points[i + 1].x, t), y: lerp(points[i].y, points[i + 1].y, t) };
        const normal = frame.normals[i];
        const width = widthAt(mark.at, length);
        const x = center.x + normal.x * mark.side * width;
        const y = center.y + normal.y * mark.side * width;
        const radius = width * mark.size;
        const along = Math.atan2(points[i].y - points[i + 1].y, points[i].x - points[i + 1].x);
        context.save();
        context.translate(x, y);
        context.rotate(along);
        context.scale(mark.stretch, 1);
        const patch = context.createRadialGradient(0, 0, 0, 0, 0, radius);
        patch.addColorStop(0, mark.color);
        patch.addColorStop(0.72, mark.color);
        patch.addColorStop(1, "rgba(0, 0, 0, 0)");
        context.fillStyle = patch;
        context.beginPath();
        context.arc(0, 0, radius, 0, Math.PI * 2);
        context.fill();
        context.restore();
    }
    context.restore();

    // A thin dorsal fin and a soft sheen run down the back.
    context.lineCap = "round";
    context.strokeStyle = variety.highlight;
    context.globalAlpha = fish.alpha * 0.32;
    context.lineWidth = widthAt(0.3, length) * 0.5;
    context.beginPath();
    context.moveTo(points[1].x, points[1].y);
    for (let i = 2; i <= 6; i++) context.lineTo(points[i].x, points[i].y);
    context.stroke();
    context.strokeStyle = variety.shade;
    context.globalAlpha = fish.alpha * 0.45;
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(points[3].x, points[3].y);
    for (let i = 4; i <= 7; i++) context.lineTo(points[i].x, points[i].y);
    context.stroke();

    // Eyes sit on top of the head, a little in from its edge.
    context.globalAlpha = fish.alpha * 0.7;
    context.fillStyle = "#1c1816";
    const eyeWidth = widthAt(0.03, length) * 0.74;
    for (const side of [1, -1]) {
        context.beginPath();
        context.arc(
            points[0].x + frame.normals[0].x * eyeWidth * side,
            points[0].y + frame.normals[0].y * eyeWidth * side,
            Math.max(0.9, length * 0.012),
            0,
            Math.PI * 2,
        );
        context.fill();
    }
    context.globalAlpha = 1;
}
