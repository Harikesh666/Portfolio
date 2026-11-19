/**
 * The loose petals on the footer's bed of moss.
 *
 * Most of the petals in the footer are in the photo and never move. These
 * few lie on top of it and behave like petals: a hand through them lifts the ones it passes, a
 * tap puffs them up, a breeze now and then picks a few off the bed, and
 * each one tumbles and flutters back down to lie flat again. One or two
 * drift in from above from time to time.
 *
 * This file is their behaviour only, with no drawing and no DOM, so it can
 * be tested. `footer-garden.ts` draws them.
 */

export type Petal = {
    x: number;
    y: number;
    vx: number;
    vy: number;
    /** Where it lies when it is at rest: the height it settles back to. */
    restY: number;
    /** Which way it points, in radians, and how fast that is turning. */
    angle: number;
    spin: number;
    /** Its tumble: it shows its face at 0, its edge at a quarter turn, its underside at a half. */
    flip: number;
    /** Half its length in pixels, and which of the petal drawings it uses. */
    size: number;
    kind: number;
    /** Whether it is in the air. A petal at rest does not move at all. */
    airborne: boolean;
    /** 1 when fully there. A petal that has been replaced fades to 0 and is removed. */
    alpha: number;
    leaving: boolean;
    /** Seconds until a passing breeze lifts it, or a negative number when none is coming, and which way that breeze blows. */
    lift: number;
    wind: 1 | -1;
    /** A value of its own, for the timing of its flutter. */
    seed: number;
};

/** How a petal moves through the air. Distances are in pixels, times in seconds. */
const air = {
    /** Petals are nearly weightless: a gentle pull down and a lot of drag, so they sink at about 30px a second. */
    gravity: 95,
    drag: 3,
    /** Falling, a petal slides from side to side this hard, and tumbles this fast for its speed. */
    flutter: 55,
    tumble: 0.055,
    /** A hand or a tap lifts petals within this radius, at up to this speed. */
    reach: 105,
    lift: 230,
    /** A breeze crosses the bed at this speed, lifts about this share of the petals, and throws them this hard. */
    breezeSpeed: 520,
    breezeShare: 0.3,
    breezeLift: 95,
    /** How quickly a petal that has landed lies flat, and how quickly a replaced one fades, per second. */
    settle: 7,
    fade: 1.4,
} as const;

export type PetalsOptions = Readonly<{
    width: number;
    /** The height of the air above the bed that petals may fly in, and of the bed below it. Petals rest in the top of the bed. */
    headroom: number;
    bed: number;
    /** How many petals lie on the bed. */
    count: number;
    /** Half the length of a typical petal, in pixels. */
    size: number;
    random?: () => number;
}>;

export type Petals = Readonly<{
    petals: readonly Petal[];
    /** Advances the petals. Returns whether anything is still moving. */
    step(dt: number): boolean;
    /** A tap or a hand at a point: lifts the petals near it, and carries them along with the hand's own motion. */
    kick(x: number, y: number, power?: number, carryX?: number, carryY?: number): void;
    /** A breeze crossing the bed, from the left (1) or from the right (-1). */
    breeze(direction: 1 | -1): void;
    /** Lets this many petals drift down from above the frame. */
    drop(count: number): void;
    isStill(): boolean;
    resize(width: number, headroom: number, bed: number): void;
}>;

export function createPetals(options: PetalsOptions): Petals {
    const random = options.random ?? Math.random;
    const between = (min: number, max: number) => min + random() * (max - min);
    let { width, headroom, bed } = options;
    const petals: Petal[] = [];

    /** Somewhere to lie: on the bed, below its ragged top edge, so a petal always has leaves under it. */
    const restingHeight = () => headroom + bed * between(0.36, 0.86);

    function make(x: number, y: number, airborne: boolean): Petal {
        return {
            x,
            y,
            vx: 0,
            vy: 0,
            restY: airborne ? restingHeight() : y,
            angle: between(0, Math.PI * 2),
            spin: 0,
            flip: 0,
            size: options.size * between(0.75, 1.25),
            kind: Math.floor(between(0, 4)),
            airborne,
            alpha: 1,
            leaving: false,
            lift: -1,
            wind: 1,
            seed: random(),
        };
    }

    for (let i = 0; i < options.count; i++) {
        petals.push(make(((i + between(0.1, 0.9)) / options.count) * width, restingHeight(), false));
    }

    function launch(petal: Petal, vx: number, vy: number) {
        petal.airborne = true;
        petal.vx += vx;
        petal.vy += vy;
        petal.spin = between(-5, 5);
        petal.restY = restingHeight();
    }

    function step(dt: number) {
        let moving = false;
        for (let i = petals.length - 1; i >= 0; i--) {
            const petal = petals[i];
            if (petal.leaving) {
                petal.alpha -= dt * air.fade;
                if (petal.alpha <= 0) {
                    petals.splice(i, 1);
                    continue;
                }
                moving = true;
            }
            if (petal.lift >= 0) {
                petal.lift -= dt;
                moving = true;
                if (petal.lift < 0 && !petal.airborne) launch(petal, between(0.5, 1.1) * air.breezeLift * petal.wind, -air.breezeLift * between(0.6, 1.2));
            }
            if (!petal.airborne) {
                // On the bed it only finishes lying flat.
                const flat = Math.round(petal.flip / Math.PI) * Math.PI;
                if (Math.abs(petal.flip - flat) > 0.01) {
                    petal.flip += (flat - petal.flip) * Math.min(1, dt * air.settle);
                    moving = true;
                }
                continue;
            }
            moving = true;
            // It slides from side to side as it falls, the way a petal or a leaf does.
            const slide = Math.sin(petal.flip * 0.8 + petal.seed * 20) * air.flutter * Math.min(1, Math.abs(petal.vy) / 40);
            petal.vx += (slide - petal.vx * air.drag) * dt;
            petal.vy += (air.gravity - petal.vy * air.drag) * dt;
            petal.x += petal.vx * dt;
            petal.y += petal.vy * dt;
            const speed = Math.hypot(petal.vx, petal.vy);
            petal.flip += speed * air.tumble * dt * (petal.seed > 0.5 ? 1 : -1) + dt * 1.2;
            petal.angle += petal.spin * dt;
            petal.spin *= 1 - Math.min(1, dt * 1.5);
            // Off one side, it comes back on the other: the bed runs the width of the page.
            if (petal.x < -petal.size) petal.x += width + petal.size * 2;
            if (petal.x > width + petal.size) petal.x -= width + petal.size * 2;
            if (petal.vy > 0 && petal.y >= petal.restY) {
                petal.y = petal.restY;
                petal.vx = 0;
                petal.vy = 0;
                petal.spin = 0;
                petal.airborne = false;
            }
        }
        return moving;
    }

    function kick(x: number, y: number, power = 1, carryX = 0, carryY = 0) {
        for (const petal of petals) {
            const dx = petal.x - x;
            const dy = petal.y - y;
            const distance = Math.hypot(dx, dy) || 1;
            if (distance >= air.reach) continue;
            const near = (1 - distance / air.reach) ** 1.5 * power;
            launch(
                petal,
                (dx / distance) * air.lift * 0.55 * near + carryX * near,
                -air.lift * between(0.55, 1) * near + Math.min(0, carryY) * near,
            );
        }
    }

    function breeze(direction: 1 | -1) {
        for (const petal of petals) {
            if (petal.airborne || petal.leaving || random() > air.breezeShare) continue;
            // The breeze reaches each petal in turn as it crosses the bed.
            petal.lift = (direction === 1 ? petal.x : width - petal.x) / air.breezeSpeed;
            petal.wind = direction;
        }
    }

    function drop(count: number) {
        for (let i = 0; i < count; i++) {
            const petal = make(between(0, width), -options.size * 2 - between(0, headroom * 0.4), true);
            petal.vx = between(-20, 20);
            petal.vy = between(10, 30);
            petal.flip = between(0, Math.PI * 2);
            petals.push(petal);
            // Each newcomer takes the place of a petal that has been lying there, which fades away.
            const resting = petals.filter((other) => !other.airborne && !other.leaving);
            if (resting.length > 0) resting[Math.floor(between(0, resting.length))].leaving = true;
        }
    }

    function resize(nextWidth: number, nextHeadroom: number, nextBed: number) {
        const sx = nextWidth / width;
        for (const petal of petals) {
            petal.x *= sx;
            // Keep each petal the same way down the bed.
            const down = (petal.restY - headroom) / bed;
            petal.restY = nextHeadroom + nextBed * down;
            if (!petal.airborne) petal.y = petal.restY;
        }
        width = nextWidth;
        headroom = nextHeadroom;
        bed = nextBed;
    }

    const isStill = () => petals.every((petal) => !petal.airborne && !petal.leaving && petal.lift < 0);

    return { petals, step, kick, breeze, drop, isStill, resize };
}
