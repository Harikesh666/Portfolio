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
            { color: "#f1ebe2", count: [1, 2], size: [0.6, 0.9] },
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
    points: Vec[];
    heading: number;
    speed: number;
    length: number;
    variety: Variety;
    markings: Marking[];
    target: Vec;
    timer: number;
    phase: number;
    orbit: number;
    alpha: number;
};

/** Joints along each fish's spine; the body bends between them. */
export const segments = 12;
/** Fastest heading change, in radians per second. */
const turnRate = 2.2;
/** Sideways sway of the swimming stroke, in radians at full speed. */
const swayAmplitude = 0.17;

const random = (min: number, max: number) => min + Math.random() * (max - min);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Half-width of a koi at a point along it: round snout, full shoulders, long taper. */
export function widthAt(t: number, length: number) {
    const max = length * 0.105;
    if (t < 0.12) return max * (0.6 + 0.4 * Math.sin((t / 0.12) * (Math.PI / 2)));
    if (t < 0.32) return max;
    const taper = (t - 0.32) / 0.68;
    return max * Math.max(0.06, (1 - taper) ** 1.25);
}

export function follow(fish: Fish) {
    const spacing = fish.length / (segments - 1);
    for (let i = 1; i < segments; i++) {
        const ahead = fish.points[i - 1];
        const point = fish.points[i];
        const dx = point.x - ahead.x;
        const dy = point.y - ahead.y;
        const distance = Math.hypot(dx, dy) || 1;
        point.x = ahead.x + (dx / distance) * spacing;
        point.y = ahead.y + (dy / distance) * spacing;
    }
}

/**
 * Turns the head toward a target at a limited rate, eases speed, and adds
 * a calm swimming sway; the rest of the spine follows the head.
 * `settle` makes a fish hold its place facing right.
 */
export function steer(fish: Fish, target: Vec, maxSpeed: number, dt: number, settle = false) {
    const head = fish.points[0];
    const dx = target.x - head.x;
    const dy = target.y - head.y;
    const distance = Math.hypot(dx, dy);
    let desiredHeading = Math.atan2(dy, dx);
    let desiredSpeed = Math.min(maxSpeed, distance * 1.4);
    if (settle && distance < 6) {
        desiredHeading = 0;
        desiredSpeed = 4;
    }

    const difference = Math.atan2(
        Math.sin(desiredHeading - fish.heading),
        Math.cos(desiredHeading - fish.heading),
    );
    const maxTurn = turnRate * (0.55 + fish.speed / maxSpeed) * dt;
    fish.heading += Math.max(-maxTurn, Math.min(maxTurn, difference));
    fish.speed += (desiredSpeed - fish.speed) * Math.min(1, dt * 1.8);
    fish.phase += dt * (2.4 + fish.speed * 0.07);

    const sway = Math.sin(fish.phase) * swayAmplitude * Math.min(1, fish.speed / maxSpeed + 0.2);
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
    const variety = isMicro ? microVariety : varieties[job.id % varieties.length];
    return {
        job,
        state: "wander",
        points: Array.from({ length: segments }, (_, i) => ({
            x: at.x - Math.cos(heading) * spacing * i,
            y: at.y - Math.sin(heading) * spacing * i,
        })),
        heading,
        speed: 0,
        length,
        variety,
        markings: markingsFor(variety),
        target: { ...at },
        timer: 0,
        phase: random(0, Math.PI * 2),
        orbit: 0,
        alpha: 1,
    };
}

type Frame = Readonly<{ left: Vec[]; right: Vec[]; normals: Vec[] }>;

/** Edge points and outward normals along the spine, for this frame's pose. */
function frameOf(fish: Fish): Frame {
    const { points, length } = fish;
    const left: Vec[] = [];
    const right: Vec[] = [];
    const normals: Vec[] = [];
    for (let i = 0; i < segments; i++) {
        const before = points[Math.max(0, i - 1)];
        const after = points[Math.min(segments - 1, i + 1)];
        const tx = before.x - after.x;
        const ty = before.y - after.y;
        const tangentLength = Math.hypot(tx, ty) || 1;
        const normal = { x: -ty / tangentLength, y: tx / tangentLength };
        const width = widthAt(i / (segments - 1), length);
        normals.push(normal);
        left.push({ x: points[i].x + normal.x * width, y: points[i].y + normal.y * width });
        right.push({ x: points[i].x - normal.x * width, y: points[i].y - normal.y * width });
    }
    return { left, right, normals };
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
        x: fish.points[0].x + Math.cos(fish.heading) * fish.length * 0.055,
        y: fish.points[0].y + Math.sin(fish.heading) * fish.length * 0.055,
    };
    return [nose, ...frame.left, fish.points[segments - 1], ...[...frame.right].reverse()];
}

/** The tail: two long lobes that trail the body's sway with a lag. */
function traceTail(context: CanvasRenderingContext2D, fish: Fish) {
    const { points, length } = fish;
    const root = points[segments - 1];
    const before = points[segments - 3];
    const back = Math.atan2(root.y - before.y, root.x - before.x);
    const lag = Math.sin(fish.phase - 1.6) * 0.42;
    const reach = length * 0.4;
    const lobe = (spread: number) => ({
        x: root.x + Math.cos(back + lag + spread) * reach,
        y: root.y + Math.sin(back + lag + spread) * reach,
    });
    const upper = lobe(0.5);
    const lower = lobe(-0.5);
    const notch = {
        x: root.x + Math.cos(back + lag * 1.2) * reach * 0.42,
        y: root.y + Math.sin(back + lag * 1.2) * reach * 0.42,
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

/** Pectoral and pelvic fins: soft fans that paddle slowly. */
function drawSideFins(context: CanvasRenderingContext2D, fish: Fish, frame: Frame) {
    const paddle = Math.sin(fish.phase * 0.7) * 0.22;
    const fins = [
        { index: 2, reach: 0.2, width: 0.11, sweep: 2.25 },
        { index: 6, reach: 0.1, width: 0.055, sweep: 2.5 },
    ];
    context.fillStyle = fish.variety.fin;
    for (const fin of fins) {
        for (const side of [1, -1]) {
            const edge = side === 1 ? frame.left[fin.index] : frame.right[fin.index];
            const angle = fish.heading + side * (fin.sweep + paddle * side);
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
    traceTail(context, fish);
    context.fill();
}

export function drawFish(context: CanvasRenderingContext2D, fish: Fish) {
    const { variety, points, length } = fish;
    const frame = frameOf(fish);
    context.globalAlpha = fish.alpha;

    // Fins sit under the body; the tail fades from its root to its tips.
    drawSideFins(context, fish, frame);
    const tail = traceTail(context, fish);
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

    // Eyes sit just behind the snout on either side.
    context.globalAlpha = fish.alpha * 0.7;
    context.fillStyle = "#1c1816";
    const eyeWidth = widthAt(0.06, length) * 0.72;
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
