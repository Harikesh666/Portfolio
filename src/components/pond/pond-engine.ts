import { daylightAt, sceneHour, type Daylight } from "./pond-daylight";
import {
    createDecor,
    drawLilyPads,
    drawReeds,
    drawStones,
    driftDecor,
    tracePadShadows,
    type Decor,
} from "./pond-decor";
import {
    drawFish,
    makeFish,
    segments,
    steer,
    traceFishSilhouette,
    type Fish,
    type Vec,
} from "./pond-fish";
import { createGpuPond } from "./pond-gpu";
import { EventLoopModel, type Job } from "./pond-scheduler";
import { createWater, waterThemes, type Water } from "./pond-water";

type Ripple = { x: number; y: number; age: number };
type Pellet = { x: number; y: number; age: number };

/**
 * "event-loop" acts out the task queue and call stack for the guide.
 * "garden" is the home pond: Mumbai daylight, wandering koi that gather
 * near the pointer and come to food when tapped.
 */
export type PondMode = "event-loop" | "garden";

/** Cruising speed of task fish, in CSS pixels per second. */
const taskSpeed = 46;
/** Microtasks dart about faster than tasks. */
const microSpeed = 72;
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
const separationStrength = 52;
/** The longest step the simulation takes, so a stalled frame never teleports fish. */
const maxStepSeconds = 0.05;
/** Koi in the garden pond, and how much larger they are than event-loop fish. A narrow pond holds one fewer. */
const gardenFishCount = 6;
const narrowPondWidth = 480;
const gardenFishScale = 1.3;
/** No koi is longer than this share of the pond's width, so a phone's pond is not crowded. */
const gardenFishWidthShare = 0.17;
/** Each koi's size against the pond's standard: one large, one young, the rest between. */
const gardenFishSizes = [1.08, 0.94, 1, 0.72, 1.14, 0.88] as const;
/** A tap startles koi within this many body lengths: they dart away for a moment before the food draws them back. */
const startleReach = 0.8;
const startleSeconds: readonly [number, number] = [0.3, 0.5];
const dartSpeed = taskSpeed * 3.2;
/** A koi opens its mouth this many body lengths from a pellet, and eats it this close. */
const gulpReach = 0.5;
const biteReach = 0.1;
/** Seconds the mouth stays open after a bite. */
const gulpHold = 0.2;
/** A pellet another koi is already after counts as this many pixels farther away, so koi share the food out. */
const claimedPelletPenalty = 55;
/** On reaching a spot a koi may rest there, more often at night, or trail another koi for a while. */
const restChance: readonly [number, number] = [0.22, 0.5];
const restSeconds: readonly [number, number] = [1.6, 4.2];
const restSpeed = 5;
const followChance = 0.28;
const followSeconds: readonly [number, number] = [4, 9];
/** Koi that overlap move to different depths at this rate, so one passes under the other. */
const layeringRate = 0.7;
/** Koi closing on food crowd in: they keep only this share of their usual distance from each other. */
const feedingCrowd = 0.3;
/** Two koi swap places in the drawing order only once their depths differ by this much and they are apart. */
const layerMargin = 0.06;
/** A koi has arrived once its head is within this many body lengths of where it was going. */
const arrivalReach = 0.3;
/** A roaming koi weighs this many spots and takes the one that needs the least turning. */
const roamChoices = 6;
/** Fish notice the pointer within this many pixels and gather around it. */
const pointerReach = 170;
/** Fish notice food within this many pixels. */
const foodReach = 240;
/** Food pellets dropped per tap, how long uneaten food lasts in seconds, and a pellet's radius in pixels. */
const pelletsPerTap = 4;
const pelletLifetime = 7;
const pelletSize = 2.4;
/** At full night the koi slow to this share of their daytime pace. */
const nightPace = 0.6;
/** How often the garden re-reads the Mumbai clock, in seconds. */
const daylightRefreshSeconds = 20;
/** Shadows render at this fraction of size; scaling them up blurs them for free. */
const shadowScale = 0.22;
/** A tap dents the water this deep; eating a pellet leaves a smaller ring. */
const tapStrength = -2.4;
const biteStrength = -0.7;
/** The pointer stirs the water once it has moved this many pixels. */
const stirDistance = 14;
const stirStrength = -0.35;
/** Fish canvas resolution cap; the water renders at a lower cap to spare the GPU. */
const fishPixelRatioCap = 2;
const waterPixelRatioCap = 1.5;

const random = (min: number, max: number) => min + Math.random() * (max - min);

/** Task fish length for a pond of this height; microtasks are half as long. */
const fishLengthFor = (height: number) => Math.min(76, height * 0.33);

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
    /** Draws one frame in the current light and theme: a paused scene after the theme changes. */
    redraw(): void;
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
    const shadowCanvas = document.createElement("canvas");
    const shadowContext = shadowCanvas.getContext("2d");
    let decor: Decor | undefined;
    let stoneLayer: HTMLCanvasElement | undefined;
    let pointer: Vec | null = null;
    let daylightHour = hourOverride ?? sceneHour();
    let daylightAge = 0;
    // WebGL2 draws the water, stones, koi, and real ripples. Without it the
    // older WebGL1 water and the 2D koi take over.
    const gpu = createGpuPond(waterCanvas);
    const water: Water | null = gpu ? null : createWater(waterCanvas);
    let lastStir: Vec | null = null;
    const context = fishCanvas.getContext("2d");
    const model = new EventLoopModel();
    const fishes: Fish[] = [];
    /** The fish in the order they are drawn, deepest first. See `layer`. */
    const order: Fish[] = [];
    /** Koi that are after a pellet this step. */
    const feeding = new Set<Fish>();
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
        const isMicro = kind === "micro";
        // Garden koi are larger: there is no queue to fit them into.
        const length = isMicro
            ? fishLength() * 0.5
            : isGarden
              ? Math.min(fishLength() * gardenFishScale, width * gardenFishWidthShare) *
                gardenFishSizes[(job.id - 1) % gardenFishSizes.length]
              : fishLength();
        const fish = makeFish(job, at, heading, length, isMicro);
        if (isGarden) fish.depth = fish.depthTarget = random(0.2, 0.85);
        fish.timer = random(...timerRange);
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

    /** Whether two fish are close enough to be drawn over one another. */
    function overlaps(a: Fish, b: Fish) {
        const middle = Math.floor(segments / 2);
        const reach = (a.length + b.length) * 0.5;
        return Math.hypot(a.points[middle].x - b.points[middle].x, a.points[middle].y - b.points[middle].y) < reach;
    }

    /**
     * Keeps the order fish are drawn in: deepest first. Two koi change
     * places only while they are apart, so one never pops through another
     * in the middle of a crossing.
     */
    function layer() {
        for (let i = order.length - 1; i >= 0; i--) {
            if (!fishes.includes(order[i])) order.splice(i, 1);
        }
        for (const fish of fishes) {
            if (!order.includes(fish)) order.push(fish);
        }
        for (let i = 0; i < order.length - 1; i++) {
            const below = order[i];
            const above = order[i + 1];
            if (below.depth < above.depth - layerMargin && !overlaps(below, above)) {
                order[i] = above;
                order[i + 1] = below;
            }
        }
    }

    /**
     * Free-swimming fish drift apart so they never pile on top of each
     * other. In the garden, two koi that do cross settle at different
     * depths, the one drawn on top nearer the surface, so one passes under
     * the other.
     */
    function separate(dt: number) {
        const middle = Math.floor(segments / 2);
        const marks = isGarden ? [0, middle, segments - 1] : [middle];
        for (const fish of fishes) {
            fish.nudgeX = 0;
            fish.nudgeY = 0;
            if (fish.state !== "wander" && fish.state !== "leaving") continue;
            const head = fish.points[0];
            for (const other of fishes) {
                if (other === fish) continue;
                const reach = (fish.length + other.length) * 0.5 * personalSpace;
                // Its head keeps clear of the other's head, middle and tail.
                for (const index of marks) {
                    const near = other.points[index];
                    const dx = head.x - near.x;
                    const dy = head.y - near.y;
                    const distance = Math.hypot(dx, dy) || 1;
                    const space = index === middle ? reach : reach * 0.7;
                    if (distance >= space) continue;
                    const strength = (1 - distance / space) * separationStrength * (feeding.has(fish) ? feedingCrowd : 1);
                    fish.nudgeX += (dx / distance) * strength;
                    fish.nudgeY += (dy / distance) * strength;
                    if (isGarden) {
                        const rises = order.indexOf(fish) > order.indexOf(other);
                        fish.depth = Math.min(1, Math.max(0, fish.depth + (rises ? -1 : 1) * layeringRate * dt));
                    }
                }
            }
        }
    }

    /**
     * Somewhere new to swim to, and a depth to swim at. Of a few spots it
     * takes the one that is a fair swim away and needs the least turning,
     * so a koi sweeps round the pond in long arcs instead of doubling back.
     */
    function roam(fish: Fish) {
        const head = fish.points[0];
        let best = randomFreePoint();
        let bestCost = Infinity;
        for (let i = 0; i < roamChoices; i++) {
            const spot = randomFreePoint();
            const distance = Math.hypot(spot.x - head.x, spot.y - head.y);
            const bearing = Math.atan2(spot.y - head.y, spot.x - head.x) - fish.heading;
            const turning = Math.abs(Math.atan2(Math.sin(bearing), Math.cos(bearing)));
            // A spot closer than a body length is hardly a swim at all.
            let cost = turning + (Math.max(0, fish.length - distance) / fish.length) * 3;
            // And koi spread out: a spot where another koi is, or is heading, costs more.
            for (const other of fishes) {
                if (other === fish) continue;
                const room = (fish.length + other.length) * 0.9;
                cost += Math.max(0, 1 - Math.hypot(spot.x - other.points[0].x, spot.y - other.points[0].y) / room) * 1.2;
                cost += Math.max(0, 1 - Math.hypot(spot.x - other.target.x, spot.y - other.target.y) / room) * 1.6;
            }
            if (cost < bestCost) {
                best = spot;
                bestCost = cost;
            }
        }
        fish.target = best;
        fish.depthTarget = random(0.2, 0.9);
    }

    function gardenStep(dt: number) {
        daylightAge += dt;
        if (hourOverride === undefined && daylightAge > daylightRefreshSeconds) {
            daylightAge = 0;
            daylightHour = sceneHour();
        }
        const night = daylight().night;
        const pace = 1 - night * (1 - nightPace);
        const claims = new Map<Pellet, number>();
        feeding.clear();

        for (const fish of fishes) {
            const head = fish.points[0];
            fish.gulpTimer = Math.max(0, fish.gulpTimer - dt);
            let mouth = fish.gulpTimer > 0 ? 1 : 0;

            if (fish.startle > 0) {
                fish.startle -= dt;
                fish.depthTarget = 0.8;
                steer(fish, fish.target, dartSpeed, dt, "dart");
                if (fish.startle <= 0) roam(fish);
                fish.gulp += (mouth - fish.gulp) * Math.min(1, dt * 14);
                continue;
            }

            let nearest: Pellet | undefined;
            let nearestDistance = Infinity;
            let nearestScore = Infinity;
            for (const pellet of pellets) {
                const distance = Math.hypot(pellet.x - head.x, pellet.y - head.y);
                const score = distance + (claims.get(pellet) ?? 0) * claimedPelletPenalty;
                if (distance < foodReach && score < nearestScore) {
                    nearest = pellet;
                    nearestDistance = distance;
                    nearestScore = score;
                }
            }

            if (nearest) {
                claims.set(nearest, (claims.get(nearest) ?? 0) + 1);
                feeding.add(fish);
                fish.rest = 0;
                fish.leader = undefined;
                // Food floats, so the koi rises to it.
                fish.depthTarget = 0.05;
                steer(fish, nearest, taskSpeed * 1.15 * pace, dt, "feed");
                if (nearestDistance < fish.length * gulpReach) mouth = 1;
                if (nearestDistance < Math.max(6, fish.length * biteReach)) {
                    pellets.splice(pellets.indexOf(nearest), 1);
                    fish.gulpTimer = gulpHold;
                    if (gpu) gpu.drop(nearest.x, nearest.y, biteStrength, 3);
                    else ripples.push({ x: nearest.x, y: nearest.y, age: 0.55 });
                    roam(fish);
                }
                fish.gulp += (mouth - fish.gulp) * Math.min(1, dt * 14);
                continue;
            }
            fish.gulp += (mouth - fish.gulp) * Math.min(1, dt * 14);

            if (pointer && Math.hypot(pointer.x - head.x, pointer.y - head.y) < pointerReach) {
                // Each fish takes its own spot on a slowly turning ring, so they gather instead of piling up.
                const angle = fish.job.id * 2.39996 + time * 0.25;
                const ring = fish.length * (0.6 + 0.3 * ((fish.job.id * 0.618) % 1));
                fish.rest = 0;
                fish.leader = undefined;
                fish.depthTarget = 0.15;
                steer(
                    fish,
                    { x: pointer.x + Math.cos(angle) * ring, y: pointer.y + Math.sin(angle) * ring },
                    taskSpeed * 0.9 * pace,
                    dt,
                );
                continue;
            }

            if (fish.leader) {
                // Trail another koi: a spot behind its tail and a little to one side.
                const leader = fish.leader;
                fish.leaderTimer -= dt;
                if (fish.leaderTimer <= 0 || !fishes.includes(leader)) {
                    fish.leader = undefined;
                    roam(fish);
                } else {
                    const tail = leader.points[segments - 1];
                    const side = fish.job.id % 2 === 0 ? 1 : -1;
                    const gap = fish.length * 0.4;
                    fish.target = {
                        x: tail.x - Math.cos(leader.heading) * gap - Math.sin(leader.heading) * gap * side,
                        y: tail.y - Math.sin(leader.heading) * gap + Math.cos(leader.heading) * gap * side,
                    };
                    fish.depthTarget = leader.depthTarget;
                    steer(fish, fish.target, taskSpeed * 0.6 * pace, dt, "cruise");
                    continue;
                }
            }

            if (fish.rest > 0) {
                // Resting: it hangs low in the water, drifting forward with its fins out.
                fish.rest -= dt;
                steer(fish, fish.target, restSpeed, dt);
                continue;
            }

            if (Math.hypot(fish.target.x - head.x, fish.target.y - head.y) < fish.length * arrivalReach) {
                roam(fish);
                const choice = Math.random();
                const rest = restChance[0] + (restChance[1] - restChance[0]) * night;
                const leaders = fishes.filter((other) => other !== fish && !other.leader && other.startle <= 0);
                if (choice < rest) {
                    fish.rest = random(...restSeconds);
                    fish.depthTarget = random(0.6, 0.95);
                } else if (choice < rest + followChance && leaders.length > 0) {
                    fish.leader = leaders[Math.floor(Math.random() * leaders.length)];
                    fish.leaderTimer = random(...followSeconds);
                }
            }
            steer(fish, fish.target, taskSpeed * 0.55 * pace, dt, "cruise");
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
            if (decor) driftDecor(decor, width, height, dt);
            separate(dt);
            layer();
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
                    steer(fish, { x: lane.front - place * lane.gap, y: lane.y }, speed, dt, "settle");
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
        layer();
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

    function draw(dt = 0) {
        const dark = isDark();
        const light = isGarden ? daylight() : undefined;
        if (gpu) {
            gpu.render({
                time,
                dt,
                light: light ?? { ...waterThemes[dark ? "dark" : "light"], night: 0 },
                fishes: order,
                stones: isGarden && decor ? decor.stones : [],
            });
        } else {
            water?.render(time, light ?? waterThemes[dark ? "dark" : "light"]);
        }
        if (!context) return;

        const ratio = Math.min(fishPixelRatioCap, window.devicePixelRatio || 1);
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        context.clearRect(0, 0, width, height);
        if (!light) {
            drawGuides(context, layout, dark ? "rgba(170, 225, 220, 0.32)" : "rgba(255, 255, 255, 0.7)");
        } else if (!gpu) {
            if (stoneLayer) context.drawImage(stoneLayer, 0, 0, width, height);
            drawMoon(light.night);
        }
        drawShadows(dark || (light !== undefined && light.night > 0.5));

        if (!gpu) {
            for (const fish of order) drawFish(context, fish);
        }

        // Pellets float: a small lit bead that bobs, with its shadow on the floor below.
        for (const pellet of pellets) {
            const fade = Math.min(1, (pelletLifetime - pellet.age) / 1.5) * Math.min(1, pellet.age / 0.12);
            const bob = Math.sin(time * 3 + pellet.x) * 0.5;
            const size = pelletSize * (1 + 0.6 * Math.max(0, 1 - pellet.age / 0.25));
            context.fillStyle = `rgba(0, 0, 0, ${0.16 * fade})`;
            context.beginPath();
            context.ellipse(pellet.x + 5, pellet.y + 9, size * 1.15, size * 0.85, 0, 0, Math.PI * 2);
            context.fill();
            const bead = context.createRadialGradient(pellet.x - size * 0.35, pellet.y + bob - size * 0.4, 0, pellet.x, pellet.y + bob, size);
            bead.addColorStop(0, `rgba(255, 246, 222, ${fade})`);
            bead.addColorStop(0.55, `rgba(232, 184, 120, ${fade})`);
            bead.addColorStop(1, `rgba(176, 118, 66, ${fade})`);
            context.fillStyle = bead;
            context.beginPath();
            context.arc(pellet.x, pellet.y + bob, size, 0, Math.PI * 2);
            context.fill();
        }
        if (light && decor) {
            drawLilyPads(context, decor);
            drawReeds(context, decor, time);
        }

        context.lineWidth = 1.25;
        for (const ripple of ripples) {
            context.strokeStyle = `rgba(255, 255, 255, ${0.65 * (1 - ripple.age)})`;
            context.beginPath();
            context.arc(ripple.x, ripple.y, 6 + ripple.age * 34, 0, Math.PI * 2);
            context.stroke();
        }

        // Night and the dark theme dim everything on this layer, never the empty water.
        const dim = light ? Math.max(0.24 * light.night, dark ? 0.16 * (1 - light.night) : 0) : 0;
        if (dim > 0.02) {
            context.globalCompositeOperation = "source-atop";
            context.fillStyle = `rgba(8, 16, 38, ${dim})`;
            context.fillRect(0, 0, width, height);
            context.globalCompositeOperation = "source-over";
        }
    }

    /** Soft shadows on the pond floor, from a small layer scaled up. */
    function drawShadows(isDeep: boolean) {
        if (!context || !shadowContext) return;
        shadowContext.setTransform(1, 0, 0, 1, 0, 0);
        shadowContext.clearRect(0, 0, shadowCanvas.width, shadowContext.canvas.height);
        shadowContext.fillStyle = "#000";
        // The GPU draws its own koi shadows.
        for (const fish of gpu ? [] : fishes) {
            const depth = fish.length;
            shadowContext.setTransform(
                shadowScale,
                0,
                0,
                shadowScale,
                depth * 0.07 * shadowScale,
                depth * 0.16 * shadowScale,
            );
            shadowContext.globalAlpha = fish.alpha;
            traceFishSilhouette(shadowContext, fish);
        }
        shadowContext.globalAlpha = 1;
        if (isGarden && decor) {
            shadowContext.setTransform(shadowScale, 0, 0, shadowScale, height * 0.035 * shadowScale, height * 0.06 * shadowScale);
            tracePadShadows(shadowContext, decor);
        }
        context.save();
        context.globalAlpha = isDeep ? 0.34 : 0.22;
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "high";
        context.drawImage(shadowCanvas, 0, 0, width, height);
        context.restore();
    }

    function tick(timestamp: number) {
        const dt = lastTimestamp === undefined ? 0 : (timestamp - lastTimestamp) / 1000;
        lastTimestamp = timestamp;
        step(Math.min(dt, maxStepSeconds));
        draw(Math.min(dt, maxStepSeconds));
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
        gpu?.resize(width, height, waterRatio);

        shadowCanvas.width = Math.max(1, Math.ceil(width * shadowScale));
        shadowCanvas.height = Math.max(1, Math.ceil(height * shadowScale));
        if (isGarden) {
            decor = createDecor(width, height);
        }
        if (isGarden && !gpu && decor) {
            stoneLayer ??= document.createElement("canvas");
            stoneLayer.width = Math.round(width * fishRatio);
            stoneLayer.height = Math.round(height * fishRatio);
            const stones = stoneLayer.getContext("2d");
            if (stones) {
                stones.setTransform(fishRatio, 0, 0, fishRatio, 0, 0);
                drawStones(stones, decor);
            }
        }

        if (fishes.length === 0) {
            const count = isGarden ? gardenFishCount - (width < narrowPondWidth ? 1 : 0) : taskFishCount;
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

    /** A tap makes a real ripple on the GPU, or a drawn ring without it. */
    function splash(x: number, y: number) {
        if (gpu) gpu.drop(x, y, tapStrength, 4.5);
        else ripples.push({ x, y, age: 0 });
    }

    function feed(x: number, y: number) {
        splash(x, y);
        // Koi right under the splash dart away from it first.
        for (const fish of fishes) {
            const head = fish.points[0];
            const dx = head.x - x;
            const dy = head.y - y;
            const distance = Math.hypot(dx, dy);
            if (distance > fish.length * startleReach) continue;
            const away = distance > 1 ? Math.atan2(dy, dx) : fish.heading + Math.PI;
            fish.startle = random(...startleSeconds);
            fish.target = { x: head.x + Math.cos(away) * 140, y: head.y + Math.sin(away) * 140 };
            fish.rest = 0;
            fish.leader = undefined;
        }
        for (let i = 0; i < pelletsPerTap; i++) {
            pellets.push({ x: x + random(-14, 14), y: y + random(-10, 10), age: 0 });
        }
        if (reducedMotion && !isActive) advance(3);
        if (!isActive) draw();
    }

    function addTask(x: number, y: number) {
        splash(x, y);
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
            if (!point) {
                lastStir = null;
            } else if (gpu && isActive && (!lastStir || Math.hypot(point.x - lastStir.x, point.y - lastStir.y) > stirDistance)) {
                // A finger trailing through the water leaves a faint wake.
                if (lastStir) gpu.drop(point.x, point.y, stirStrength, 3);
                lastStir = point;
            }
        },
        redraw() {
            draw(0);
        },
        destroy() {
            setActive(false);
            water?.destroy();
            gpu?.destroy();
        },
    };
}
