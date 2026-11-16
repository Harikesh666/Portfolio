import { daylightAt, mumbaiHour, type Daylight } from "./pond-daylight";
import { EventLoopModel, type Job } from "./pond-scheduler";
import { createWater, waterThemes, type Water } from "./pond-water";

type Vec = { x: number; y: number };
type FishState = "wander" | "queued" | "running" | "leaving" | "fading";
type Palette = Readonly<{ body: string; spot: string; fin: string }>;
type Spot = Readonly<{ at: number; side: number; size: number }>;

type Fish = {
    job: Job;
    state: FishState;
    points: Vec[];
    heading: number;
    speed: number;
    length: number;
    palette: Palette;
    spots: Spot[];
    target: Vec;
    timer: number;
    phase: number;
    orbit: number;
    alpha: number;
};

type Ripple = { x: number; y: number; age: number };
type Pellet = { x: number; y: number; age: number };

/**
 * "event-loop" acts out the task queue and call stack for the guide.
 * "garden" is the home pond: Mumbai daylight, wandering koi that gather
 * near the pointer and come to food when tapped.
 */
export type PondMode = "event-loop" | "garden";

/** Joints along each fish's spine; the body bends between them. */
const segments = 10;
/** Cruising speed of task fish, in CSS pixels per second. */
const taskSpeed = 46;
/** Microtasks dart about faster than tasks. */
const microSpeed = 72;
/** Fastest heading change, in radians per second. */
const turnRate = 2.6;
/** One lap around the call stack for a task, in seconds. */
const taskRunSeconds = 3.4;
/** Microtasks are quick, so their lap is shorter. */
const microRunSeconds = 1.5;
/** How long a fish waits in Web APIs before its timer fires, in seconds. */
const timerRange: readonly [number, number] = [2.5, 7];
/** Population limits keep the pond calm and the frame cheap. */
const taskFishCount = 5;
const maxTaskFish = 8;
const maxMicroFish = 4;
/** Chance that a running task queues microtasks, like a resolved promise. */
const microtaskChance = 0.55;
/** Fish closer than this many body lengths gently push apart. */
const personalSpace = 0.75;
/** How hard wandering fish push apart, in pixels per second. */
const separationStrength = 38;
/** The longest step the simulation takes, so a stalled frame never teleports fish. */
const maxStepSeconds = 0.05;
/** Koi in the garden pond. */
const gardenFishCount = 6;
/** Fish notice the pointer within this many pixels and gather around it. */
const pointerReach = 170;
/** Fish notice food within this many pixels. */
const foodReach = 240;
/** Food pellets dropped per tap, and how long uneaten food lasts, in seconds. */
const pelletsPerTap = 4;
const pelletLifetime = 7;
/** At full night the koi slow to this share of their daytime pace. */
const nightPace = 0.6;
/** How often the garden re-reads the Mumbai clock, in seconds. */
const daylightRefreshSeconds = 20;
/** Fish canvas resolution cap; the water renders at a lower cap to spare the GPU. */
const fishPixelRatioCap = 2;
const waterPixelRatioCap = 1.5;

const taskPalettes: readonly Palette[] = [
    { body: "#f7f2ea", spot: "#e2643c", fin: "rgba(247, 242, 234, 0.7)" },
    { body: "#f3b440", spot: "#fbd98a", fin: "rgba(243, 180, 64, 0.62)" },
    { body: "#f5efe6", spot: "#d4462a", fin: "rgba(245, 239, 230, 0.7)" },
    { body: "#efe9df", spot: "#2b2b2b", fin: "rgba(239, 233, 223, 0.68)" },
];
const microPalette: Palette = {
    body: "#d9ebf0",
    spot: "#98c2d0",
    fin: "rgba(217, 235, 240, 0.7)",
};

const random = (min: number, max: number) => min + Math.random() * (max - min);

/** Task fish length for a pond of this height; microtasks are half as long. */
const fishLengthFor = (height: number) => Math.min(66, height * 0.3);

function layoutFor(width: number, height: number) {
    const radius = Math.min(height * 0.27, width * 0.13);
    const length = fishLengthFor(height);
    return {
        stack: { x: width * 0.8, y: height * 0.52, r: radius },
        // Queue slots are about one body apart, so waiting fish line up nose to tail.
        taskLane: { y: height * 0.77, front: width * 0.6, gap: length * 0.92 },
        microLane: { y: height * 0.24, front: width * 0.6, gap: length * 0.5 * 0.95 },
        free: { x0: width * 0.07, x1: width * 0.46, y0: height * 0.36, y1: height * 0.62 },
    };
}

type Layout = ReturnType<typeof layoutFor>;

function widthAt(t: number, length: number) {
    const max = length * 0.12;
    if (t < 0.18) return max * (0.72 + 0.28 * (t / 0.18));
    return max * Math.max(0.08, 1 - ((t - 0.18) / 0.82) ** 1.1 * 0.95);
}

function follow(fish: Fish) {
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
 * a swimming sway; the rest of the spine follows the head.
 * `settle` makes a fish hold its place facing right, toward the call stack.
 */
function steer(fish: Fish, target: Vec, maxSpeed: number, dt: number, settle = false) {
    const head = fish.points[0];
    const dx = target.x - head.x;
    const dy = target.y - head.y;
    const distance = Math.hypot(dx, dy);
    let desiredHeading = Math.atan2(dy, dx);
    let desiredSpeed = Math.min(maxSpeed, distance * 1.6);
    if (settle && distance < 6) {
        desiredHeading = 0;
        desiredSpeed = 4;
    }

    const difference = Math.atan2(
        Math.sin(desiredHeading - fish.heading),
        Math.cos(desiredHeading - fish.heading),
    );
    const maxTurn = turnRate * (0.6 + fish.speed / maxSpeed) * dt;
    fish.heading += Math.max(-maxTurn, Math.min(maxTurn, difference));
    fish.speed += (desiredSpeed - fish.speed) * Math.min(1, dt * 2.2);
    fish.phase += dt * (3 + fish.speed * 0.09);

    const sway = Math.sin(fish.phase) * 0.28 * Math.min(1, fish.speed / maxSpeed + 0.15);
    head.x += Math.cos(fish.heading + sway) * fish.speed * dt;
    head.y += Math.sin(fish.heading + sway) * fish.speed * dt;
    follow(fish);
}

function makeFish(job: Job, at: Vec, heading: number, length: number, palette: Palette): Fish {
    const spacing = length / (segments - 1);
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
        palette,
        spots: Array.from({ length: Math.round(random(2, 3.4)) }, () => ({
            at: random(0.12, 0.62),
            side: random(-0.55, 0.55),
            size: random(0.45, 0.8),
        })),
        target: { ...at },
        timer: random(...timerRange),
        phase: random(0, Math.PI * 2),
        orbit: 0,
        alpha: 1,
    };
}

function outline(fish: Fish) {
    const { points, length } = fish;
    const left: Vec[] = [];
    const right: Vec[] = [];
    for (let i = 0; i < segments; i++) {
        const before = points[Math.max(0, i - 1)];
        const after = points[Math.min(segments - 1, i + 1)];
        const tx = before.x - after.x;
        const ty = before.y - after.y;
        const tangentLength = Math.hypot(tx, ty) || 1;
        const nx = -ty / tangentLength;
        const ny = tx / tangentLength;
        const width = widthAt(i / (segments - 1), length);
        left.push({ x: points[i].x + nx * width, y: points[i].y + ny * width });
        right.push({ x: points[i].x - nx * width, y: points[i].y - ny * width });
    }
    const nose = {
        x: points[0].x + Math.cos(fish.heading) * length * 0.07,
        y: points[0].y + Math.sin(fish.heading) * length * 0.07,
    };
    return [nose, ...left, points[segments - 1], ...right.reverse()];
}

/** A smooth closed curve through the outline, using midpoints as anchors. */
function tracePath(context: CanvasRenderingContext2D, shape: Vec[]) {
    const mid = (a: Vec, b: Vec) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
    const start = mid(shape[shape.length - 1], shape[0]);
    context.beginPath();
    context.moveTo(start.x, start.y);
    for (let i = 0; i < shape.length; i++) {
        const point = shape[i];
        const next = mid(point, shape[(i + 1) % shape.length]);
        context.quadraticCurveTo(point.x, point.y, next.x, next.y);
    }
    context.closePath();
}

function drawFins(context: CanvasRenderingContext2D, fish: Fish) {
    const { points, length, palette } = fish;
    const tail = points[segments - 1];
    const beforeTail = points[segments - 2];
    const back = Math.atan2(tail.y - beforeTail.y, tail.x - beforeTail.x);
    const sway = Math.sin(fish.phase - 1.2) * 0.35;
    const reach = length * 0.24;
    const tip = (spread: number) => ({
        x: tail.x + Math.cos(back + spread + sway) * reach,
        y: tail.y + Math.sin(back + spread + sway) * reach,
    });
    const upper = tip(0.5);
    const lower = tip(-0.5);
    const notch = {
        x: tail.x + Math.cos(back + sway) * reach * 0.55,
        y: tail.y + Math.sin(back + sway) * reach * 0.55,
    };
    context.fillStyle = palette.fin;
    context.beginPath();
    context.moveTo(tail.x, tail.y);
    context.quadraticCurveTo(
        tail.x + Math.cos(back + 0.25 + sway) * reach * 0.6,
        tail.y + Math.sin(back + 0.25 + sway) * reach * 0.6,
        upper.x,
        upper.y,
    );
    context.lineTo(notch.x, notch.y);
    context.lineTo(lower.x, lower.y);
    context.quadraticCurveTo(
        tail.x + Math.cos(back - 0.25 + sway) * reach * 0.6,
        tail.y + Math.sin(back - 0.25 + sway) * reach * 0.6,
        tail.x,
        tail.y,
    );
    context.fill();

    const shoulder = points[2];
    const paddle = Math.sin(fish.phase * 0.8) * 0.25;
    for (const side of [-1, 1]) {
        const angle = fish.heading + side * (1.9 + paddle);
        context.beginPath();
        context.ellipse(
            shoulder.x + Math.cos(angle) * length * 0.1,
            shoulder.y + Math.sin(angle) * length * 0.1,
            length * 0.085,
            length * 0.032,
            angle,
            0,
            Math.PI * 2,
        );
        context.fill();
    }
}

function drawFish(context: CanvasRenderingContext2D, fish: Fish, shadow: string) {
    const shape = outline(fish);
    context.globalAlpha = fish.alpha;

    context.save();
    context.translate(fish.length * 0.05, fish.length * 0.09);
    tracePath(context, shape);
    context.fillStyle = shadow;
    context.fill();
    context.restore();

    drawFins(context, fish);
    tracePath(context, shape);
    context.fillStyle = fish.palette.body;
    context.fill();

    context.save();
    tracePath(context, shape);
    context.clip();
    context.fillStyle = fish.palette.spot;
    for (const spot of fish.spots) {
        const index = Math.round(spot.at * (segments - 1));
        const point = fish.points[index];
        const width = widthAt(spot.at, fish.length);
        const normal = fish.heading + Math.PI / 2;
        context.beginPath();
        context.arc(
            point.x + Math.cos(normal) * spot.side * width,
            point.y + Math.sin(normal) * spot.side * width,
            width * spot.size,
            0,
            Math.PI * 2,
        );
        context.fill();
    }
    context.restore();
    context.globalAlpha = 1;
}

function drawGuides(context: CanvasRenderingContext2D, layout: Layout, ink: string) {
    const { stack, taskLane, microLane } = layout;
    context.strokeStyle = ink;
    context.fillStyle = ink;
    context.lineWidth = 1;
    context.setLineDash([3, 5]);

    for (const lane of [taskLane, microLane]) {
        context.beginPath();
        context.moveTo(lane.front - lane.gap * 6.5, lane.y);
        context.lineTo(lane.front + lane.gap * 0.6, lane.y);
        context.stroke();
    }
    context.beginPath();
    context.arc(stack.x, stack.y, stack.r, 0, Math.PI * 2);
    context.stroke();
    context.setLineDash([]);

    // Small chevrons point from the front of each line toward the stack.
    for (const lane of [taskLane, microLane]) {
        const x = lane.front + lane.gap * 0.9;
        context.beginPath();
        context.moveTo(x - 3, lane.y - 4);
        context.lineTo(x + 2, lane.y);
        context.lineTo(x - 3, lane.y + 4);
        context.stroke();
    }
}

export type Pond = Readonly<{
    resize(): void;
    setActive(active: boolean): void;
    /** A tap: queues a timer in event-loop mode, drops food in the garden. */
    poke(x: number, y: number): void;
    /** Pointer position over the pond, or null when it leaves. */
    setPointer(point: { x: number; y: number } | null): void;
    destroy(): void;
}>;

type PondOptions = Readonly<{
    mode: PondMode;
    /** Fixes the garden's hour (0 to 24) instead of reading the Mumbai clock. */
    hourOverride?: number;
    container: HTMLElement;
    waterCanvas: HTMLCanvasElement;
    fishCanvas: HTMLCanvasElement;
    /**
     * With reduced motion the pond starts from a settled still frame and
     * clicks fast-forward instead of animating. It only loops if the reader
     * explicitly presses Play.
     */
    reducedMotion: boolean;
    isDark: () => boolean;
}>;

export function createPond(options: PondOptions): Pond {
    const { mode, hourOverride, container, waterCanvas, fishCanvas, reducedMotion, isDark } = options;
    const isGarden = mode === "garden";
    const pellets: Pellet[] = [];
    let pointer: Vec | null = null;
    let daylightHour = hourOverride ?? mumbaiHour();
    let daylightAge = 0;
    const water: Water | null = createWater(waterCanvas);
    const context = fishCanvas.getContext("2d");
    const model = new EventLoopModel();
    const fishes: Fish[] = [];
    const ripples: Ripple[] = [];
    let width = 0;
    let height = 0;
    let layout = layoutFor(1, 1);
    let time = random(0, 100);
    let nextId = 1;
    let frame: number | undefined;
    let lastTimestamp: number | undefined;
    let isActive = false;

    const fishLength = () => fishLengthFor(height);
    const randomFreePoint = (): Vec =>
        isGarden
            ? { x: random(width * 0.1, width * 0.9), y: random(height * 0.2, height * 0.8) }
            : { x: random(layout.free.x0, layout.free.x1), y: random(layout.free.y0, layout.free.y1) };
    const daylight = (): Daylight => daylightAt(daylightHour, isDark());

    function addFish(kind: Job["kind"], at: Vec, heading = random(-Math.PI, Math.PI)) {
        const job: Job = { id: nextId++, kind };
        const fish =
            kind === "task"
                ? makeFish(job, at, heading, fishLength(), taskPalettes[job.id % taskPalettes.length])
                : makeFish(job, at, heading, fishLength() * 0.5, microPalette);
        fish.target = randomFreePoint();
        fishes.push(fish);
        return fish;
    }

    function startRunning(fish: Fish) {
        const head = fish.points[0];
        fish.state = "running";
        fish.orbit = Math.atan2(head.y - layout.stack.y, head.x - layout.stack.x);
        fish.timer = fish.job.kind === "task" ? taskRunSeconds : microRunSeconds;

        const microFish = fishes.filter((f) => f.job.kind === "micro").length;
        if (fish.job.kind === "task" && microFish < maxMicroFish && Math.random() < microtaskChance) {
            const count = Math.min(maxMicroFish - microFish, Math.random() < 0.5 ? 1 : 2);
            for (let i = 0; i < count; i++) {
                const spawn = addFish(
                    "micro",
                    { x: layout.stack.x - layout.stack.r * 0.4, y: layout.stack.y - layout.stack.r * 0.4 },
                    Math.PI + random(-0.6, 0.2),
                );
                spawn.state = "queued";
                model.enqueue(spawn.job);
            }
        }
    }

    /** Free-swimming fish nudge apart so they never pile on top of each other. */
    function separate(dt: number) {
        for (const fish of fishes) {
            if (fish.state !== "wander" && fish.state !== "leaving") continue;
            const head = fish.points[0];
            let pushX = 0;
            let pushY = 0;
            for (const other of fishes) {
                if (other === fish) continue;
                const near = other.points[Math.floor(segments / 2)];
                const dx = head.x - near.x;
                const dy = head.y - near.y;
                const distance = Math.hypot(dx, dy) || 1;
                const reach = (fish.length + other.length) * 0.5 * personalSpace;
                if (distance < reach) {
                    const strength = (1 - distance / reach) * separationStrength * dt;
                    pushX += (dx / distance) * strength;
                    pushY += (dy / distance) * strength;
                }
            }
            if (pushX !== 0 || pushY !== 0) {
                head.x += pushX;
                head.y += pushY;
                follow(fish);
            }
        }
    }

    function gardenStep(dt: number) {
        daylightAge += dt;
        if (hourOverride === undefined && daylightAge > daylightRefreshSeconds) {
            daylightAge = 0;
            daylightHour = mumbaiHour();
        }
        const pace = 1 - daylight().night * (1 - nightPace);

        for (const fish of fishes) {
            const head = fish.points[0];
            let nearest: Pellet | undefined;
            let nearestDistance = Infinity;
            for (const pellet of pellets) {
                const distance = Math.hypot(pellet.x - head.x, pellet.y - head.y);
                if (distance < nearestDistance) {
                    nearest = pellet;
                    nearestDistance = distance;
                }
            }

            if (nearest && nearestDistance < foodReach) {
                steer(fish, nearest, taskSpeed * 1.15 * pace, dt);
                if (nearestDistance < fish.length * 0.2) {
                    pellets.splice(pellets.indexOf(nearest), 1);
                    ripples.push({ x: nearest.x, y: nearest.y, age: 0.55 });
                }
                continue;
            }

            if (pointer && Math.hypot(pointer.x - head.x, pointer.y - head.y) < pointerReach) {
                // Each fish takes its own spot on a ring, so they gather instead of piling up.
                const angle = fish.job.id * 2.39996 + time * 0.25;
                const ring = fish.length * 0.65;
                steer(
                    fish,
                    { x: pointer.x + Math.cos(angle) * ring, y: pointer.y + Math.sin(angle) * ring },
                    taskSpeed * 0.9 * pace,
                    dt,
                );
                continue;
            }

            if (Math.hypot(fish.target.x - head.x, fish.target.y - head.y) < 14) {
                fish.target = randomFreePoint();
            }
            steer(fish, fish.target, taskSpeed * 0.55 * pace, dt);
        }

        for (let i = pellets.length - 1; i >= 0; i--) {
            pellets[i].age += dt;
            pellets[i].y += dt * 1.5;
            if (pellets[i].age > pelletLifetime) pellets.splice(i, 1);
        }
    }

    function step(dt: number) {
        if (isGarden) {
            time += dt;
            gardenStep(dt);
            separate(dt);
            for (let i = ripples.length - 1; i >= 0; i--) {
                ripples[i].age += dt * 1.1;
                if (ripples[i].age >= 1) ripples.splice(i, 1);
            }
            return;
        }
        time += dt;
        if (!model.running) {
            const job = model.next();
            const fish = job && fishes.find((f) => f.job === job);
            if (fish) startRunning(fish);
        }

        for (const fish of fishes) {
            const isTask = fish.job.kind === "task";
            const speed = isTask ? taskSpeed : microSpeed;
            switch (fish.state) {
                case "wander": {
                    fish.timer -= dt;
                    const head = fish.points[0];
                    if (Math.hypot(fish.target.x - head.x, fish.target.y - head.y) < 12) {
                        fish.target = randomFreePoint();
                    }
                    steer(fish, fish.target, speed * 0.6, dt);
                    if (fish.timer <= 0) {
                        fish.state = "queued";
                        model.enqueue(fish.job);
                    }
                    break;
                }
                case "queued": {
                    const lane = isTask ? layout.taskLane : layout.microLane;
                    const place = Math.max(0, model.position(fish.job));
                    steer(fish, { x: lane.front - place * lane.gap, y: lane.y }, speed, dt, true);
                    break;
                }
                case "running": {
                    const { stack } = layout;
                    fish.orbit += (dt * Math.PI * 2) / (isTask ? taskRunSeconds : microRunSeconds);
                    const lead = fish.orbit + 0.7;
                    steer(
                        fish,
                        { x: stack.x + Math.cos(lead) * stack.r, y: stack.y + Math.sin(lead) * stack.r },
                        speed * 1.3,
                        dt,
                    );
                    fish.timer -= dt;
                    if (fish.timer <= 0) {
                        model.finish();
                        fish.state = isTask ? "leaving" : "fading";
                        fish.target = randomFreePoint();
                        fish.timer = 1.4;
                    }
                    break;
                }
                case "leaving": {
                    steer(fish, fish.target, speed * 0.8, dt);
                    fish.timer -= dt;
                    if (fish.timer <= 0) {
                        fish.state = "wander";
                        fish.timer = random(...timerRange);
                    }
                    break;
                }
                case "fading": {
                    steer(fish, fish.target, speed * 0.5, dt);
                    fish.alpha -= dt * 1.4;
                    break;
                }
            }
        }

        separate(dt);

        for (let i = fishes.length - 1; i >= 0; i--) {
            if (fishes[i].alpha <= 0) fishes.splice(i, 1);
        }
        for (let i = ripples.length - 1; i >= 0; i--) {
            ripples[i].age += dt * 1.1;
            if (ripples[i].age >= 1) ripples.splice(i, 1);
        }
    }

    function drawMoon(night: number) {
        if (!context || night < 0.05) return;
        const x = width * 0.82;
        const y = height * 0.3;
        const radius = height * 0.14;
        const glow = context.createRadialGradient(x, y, 0, x, y, radius * 2.4);
        glow.addColorStop(0, `rgba(235, 242, 255, ${0.34 * night})`);
        glow.addColorStop(0.35, `rgba(220, 232, 255, ${0.12 * night})`);
        glow.addColorStop(1, "rgba(220, 232, 255, 0)");
        context.fillStyle = glow;
        context.fillRect(x - radius * 2.4, y - radius * 2.4, radius * 4.8, radius * 4.8);
        // The reflection breaks into short wavering streaks below the moon.
        context.strokeStyle = `rgba(240, 246, 255, ${0.28 * night})`;
        context.lineWidth = 1.5;
        for (let i = 0; i < 5; i++) {
            const streakY = y + radius * (0.9 + i * 0.42);
            const sway = Math.sin(time * 1.3 + i * 1.7) * radius * 0.25;
            const half = radius * (0.7 - i * 0.1);
            context.beginPath();
            context.moveTo(x - half + sway, streakY);
            context.lineTo(x + half + sway, streakY);
            context.stroke();
        }
    }

    function draw() {
        const dark = isDark();
        const light = isGarden ? daylight() : undefined;
        water?.render(time, light ?? waterThemes[dark ? "dark" : "light"]);
        if (!context) return;

        const ratio = Math.min(fishPixelRatioCap, window.devicePixelRatio || 1);
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        context.clearRect(0, 0, width, height);
        if (light) {
            drawMoon(light.night);
        } else {
            drawGuides(context, layout, dark ? "rgba(170, 225, 220, 0.32)" : "rgba(255, 255, 255, 0.7)");
        }

        for (const pellet of pellets) {
            const fade = Math.min(1, (pelletLifetime - pellet.age) / 1.5);
            context.fillStyle = `rgba(255, 236, 196, ${0.9 * fade})`;
            context.beginPath();
            context.arc(pellet.x, pellet.y, 2.2, 0, Math.PI * 2);
            context.fill();
        }

        const shadow = dark || (light && light.night > 0.5) ? "rgba(0, 0, 0, 0.3)" : "rgba(20, 50, 48, 0.16)";
        for (const fish of [...fishes].sort((a, b) => a.points[0].y - b.points[0].y)) {
            drawFish(context, fish, shadow);
        }

        context.lineWidth = 1.25;
        for (const ripple of ripples) {
            context.strokeStyle = `rgba(255, 255, 255, ${0.65 * (1 - ripple.age)})`;
            context.beginPath();
            context.arc(ripple.x, ripple.y, 6 + ripple.age * 34, 0, Math.PI * 2);
            context.stroke();
        }
    }

    function tick(timestamp: number) {
        const dt = lastTimestamp === undefined ? 0 : (timestamp - lastTimestamp) / 1000;
        lastTimestamp = timestamp;
        step(Math.min(dt, maxStepSeconds));
        draw();
        frame = window.requestAnimationFrame(tick);
    }

    /** Runs the simulation forward without drawing, in fixed small steps. */
    function advance(seconds: number) {
        for (let elapsed = 0; elapsed < seconds; elapsed += 1 / 30) step(1 / 30);
    }

    function resize() {
        width = container.clientWidth;
        height = container.clientHeight;
        if (width === 0 || height === 0) return;
        const previous = layout;
        layout = layoutFor(width, height);

        const fishRatio = Math.min(fishPixelRatioCap, window.devicePixelRatio || 1);
        fishCanvas.width = Math.round(width * fishRatio);
        fishCanvas.height = Math.round(height * fishRatio);
        const waterRatio = Math.min(waterPixelRatioCap, window.devicePixelRatio || 1);
        waterCanvas.width = Math.round(width * waterRatio);
        waterCanvas.height = Math.round(height * waterRatio);
        water?.resize(waterCanvas.width, waterCanvas.height, waterRatio);

        if (fishes.length === 0) {
            const count = isGarden ? gardenFishCount : taskFishCount;
            for (let i = 0; i < count; i++) addFish("task", randomFreePoint());
            // Start mid-story, with a queue and a running task, not a blank pond.
            advance(reducedMotion ? 9 : 4);
        } else if (previous.stack.x > 1) {
            const sx = width / (previous.stack.x / 0.8);
            const sy = height / (previous.stack.y / 0.52);
            for (const fish of fishes) {
                for (const point of fish.points) {
                    point.x *= sx;
                    point.y *= sy;
                }
            }
        }
        draw();
    }

    function setActive(active: boolean) {
        const shouldRun = active;
        if (shouldRun === isActive) return;
        isActive = shouldRun;
        if (shouldRun) {
            lastTimestamp = undefined;
            frame = window.requestAnimationFrame(tick);
        } else if (frame !== undefined) {
            window.cancelAnimationFrame(frame);
            frame = undefined;
        }
    }

    function feed(x: number, y: number) {
        ripples.push({ x, y, age: 0 });
        for (let i = 0; i < pelletsPerTap; i++) {
            pellets.push({ x: x + random(-14, 14), y: y + random(-10, 10), age: 0 });
        }
        if (reducedMotion && !isActive) advance(3);
        if (!isActive) draw();
    }

    function addTask(x: number, y: number) {
        ripples.push({ x, y, age: 0 });
        const taskFish = fishes.filter((f) => f.job.kind === "task");
        if (taskFish.length < maxTaskFish) {
            // Like setTimeout(fn, 0): a short timer, then the task queue.
            const fish = addFish("task", { x, y });
            fish.timer = 0.6;
            fish.target = { x: x + random(-30, 30), y: y + random(-20, 20) };
        } else {
            const waiting = taskFish.find((f) => f.state === "wander");
            if (waiting) waiting.timer = Math.min(waiting.timer, 0.4);
        }
        if (reducedMotion && !isActive) advance(3);
        if (!isActive) draw();
    }

    return {
        resize,
        setActive,
        poke(x, y) {
            if (isGarden) feed(x, y);
            else addTask(x, y);
        },
        setPointer(point) {
            pointer = point;
        },
        destroy() {
            setActive(false);
            water?.destroy();
        },
    };
}
