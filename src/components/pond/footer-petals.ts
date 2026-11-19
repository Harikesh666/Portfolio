/**
 * The loose petals on the footer's bed of moss.
 *
 * Most of the petals in the footer are in the photo and never move. These
 * few lie on top of it and behave like petals. A hand moving through the
 * bed lifts the ones it passes and shakes fresh ones loose, and it moves
 * the air: petals already floating are carried along with it, swirl round
 * it, and stay up for as long as it keeps moving. A tap puffs them up, a
 * breeze now and then picks a few off the bed, and each one tumbles and
 * flutters back down to lie flat again. One or two drift in from above
 * from time to time.
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
    /**
     * Shaken loose by a hand, not one of the bed's own: once it lands it lies
     * for `lie` seconds and then fades into the bed, so the bed never fills up.
     */
    stray: boolean;
    lie: number;
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
    /** A moving hand lifts the petals lying within this radius of it, once it is moving at least this fast. */
    touch: 44,
    touchSpeed: 45,
    /** How much of the hand's speed a lifted petal leaves with, sideways and upward, and the most it is thrown up. */
    throwAlong: 0.42,
    throwUp: 0.3,
    throwMost: 300,
    /** A hand through the bed shakes a fresh petal loose for every so many pixels it travels, up to this many in the air at once. */
    shed: 22,
    strays: 46,
    /** A stray lies this long after it lands before it fades into the bed. */
    strayLies: 1.1,
    /** A moving hand moves the air within this radius: floating petals take up this share of its speed, this quickly. */
    draft: 110,
    draftShare: 0.6,
    draftGrip: 6,
    /** The moving air also turns round the hand and lifts, each as a share of the hand's speed per second. */
    swirl: 1.6,
    updraft: 1.5,
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
    /**
     * A hand near the petals, moving at (vx, vy) pixels a second: called every
     * frame it is there. `onBed` says whether it is over the bed itself, where
     * it can lift petals and shake new ones loose; anywhere it moves the air.
     */
    sweep(x: number, y: number, vx: number, vy: number, dt: number, onBed: boolean): void;
    /** Shakes this many fresh petals loose at a point on the bed, thrown up and outward. */
    burst(x: number, y: number, count: number): void;
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
            stray: false,
            lie: 0,
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
            } else if (petal.alpha < 1) {
                // A petal just shaken loose comes into view quickly, not all at once.
                petal.alpha = Math.min(1, petal.alpha + dt * 9);
                moving = true;
            }
            if (petal.stray && !petal.airborne && !petal.leaving) {
                petal.lie -= dt;
                moving = true;
                if (petal.lie <= 0) petal.leaving = true;
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
                petal.lie = air.strayLies;
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

    /** A fresh petal on the bed at a point, about to be thrown: it starts unseen and comes into view as it leaves. */
    function shed(x: number, y: number) {
        const petal = make(x, Math.min(headroom + bed * 0.9, Math.max(headroom + bed * 0.3, y)), false);
        petal.stray = true;
        petal.alpha = 0;
        petals.push(petal);
        return petal;
    }

    let travelled = 0;

    function sweep(x: number, y: number, vx: number, vy: number, dt: number, onBed: boolean) {
        const speed = Math.hypot(vx, vy);
        if (speed < 1) return;
        const lift = Math.min(air.throwMost, 60 + speed * air.throwUp);
        const toss = (petal: Petal) =>
            launch(petal, vx * air.throwAlong * between(0.6, 1.2) + between(-28, 28), -lift * between(0.55, 1.1) + Math.min(0, vy) * 0.3);

        if (onBed && speed > air.touchSpeed) {
            // Petals lying under the hand go up with it.
            for (const petal of petals) {
                if (petal.airborne || petal.leaving) continue;
                if (Math.hypot(petal.x - x, petal.y - y) < air.touch) toss(petal);
            }
            // And the hand shakes fresh ones loose as it goes, more the further it travels.
            travelled += speed * dt;
            while (travelled >= air.shed) {
                travelled -= air.shed;
                if (petals.reduce((count, petal) => count + (petal.stray ? 1 : 0), 0) >= air.strays) break;
                toss(shed(x + between(-16, 16), y + between(-10, 14)));
            }
        }

        // The hand moves the air. Floating petals near it take up its motion,
        // turn round it, and are held up for as long as it keeps moving.
        for (const petal of petals) {
            if (!petal.airborne) continue;
            const dx = petal.x - x;
            const dy = petal.y - y;
            const distance = Math.hypot(dx, dy) || 1;
            if (distance >= air.draft) continue;
            const near = (1 - distance / air.draft) ** 2;
            const grip = Math.min(1, air.draftGrip * near * dt);
            petal.vx += (vx * air.draftShare - petal.vx) * grip;
            petal.vy += (vy * air.draftShare - petal.vy) * grip;
            const turn = (petal.seed > 0.5 ? 1 : -1) * speed * air.swirl * near * dt;
            petal.vx += (-dy / distance) * turn;
            petal.vy += (dx / distance) * turn;
            petal.vy -= speed * air.updraft * near * dt;
            petal.spin += between(-1, 1) * speed * 0.02 * near;
        }
    }

    function burst(x: number, y: number, count: number) {
        for (let i = 0; i < count; i++) {
            if (petals.reduce((total, petal) => total + (petal.stray ? 1 : 0), 0) >= air.strays) break;
            const angle = -Math.PI / 2 + between(-1.1, 1.1);
            const power = air.lift * between(0.5, 1.05);
            launch(shed(x + between(-12, 12), y + between(-8, 10)), Math.cos(angle) * power, Math.sin(angle) * power);
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

    const isStill = () => petals.every((petal) => !petal.airborne && !petal.leaving && !petal.stray && petal.lift < 0);

    return { petals, step, kick, sweep, burst, breeze, drop, isStill, resize };
}
