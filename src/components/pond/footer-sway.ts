/**
 * How the footer's bed of plants answers a hand.
 *
 * The bed is cut into narrow columns, and each column is a spring: how far
 * its plants are bent sideways, and how fast that bend is changing. A hand
 * moving through the bed carries the columns under it along with it at
 * once, so the plants move in the same frame the hand does. Each column
 * then springs back and overshoots a few times, and pulls on its two
 * neighbours as it goes, so the sway runs outward along the bed as a wave
 * and what the hand has passed keeps rustling behind it.
 *
 * This file is that behaviour only, with no drawing and no DOM, so it can
 * be tested. `footer-garden.ts` hands the bends to its shader as a texture
 * one column wide per pixel.
 */

/** How the bed sways. Distances are in CSS pixels, times in seconds. */
export const swayFeel = {
    /** A column is this wide. */
    column: 6,
    /** A column swings back about two and a half times a second, and loses its swing over three or four of them. */
    stiffness: 250,
    damping: 4.6,
    /**
     * How hard a column pulls on its neighbours. The sway runs along the bed at
     * about 700px a second and dies out some 45px from where it began, so the
     * plants beside the hand follow it a beat late instead of standing still.
     */
    spread: 14000,
    /** How much of the hand's travel the plants right under it are carried, and how far from it the carry reaches. */
    carry: 0.62,
    reach: 54,
    /** A moving hand also leaves the plants with some of its speed, so a quick pass throws them further than a slow one. */
    fling: 5.5,
    /** A tap pushes the plants on either side of it this far apart. */
    puff: 7,
    /** No plant's top is ever carried further than this. */
    most: 13,
    /** The longest step the springs take at once. A slower frame is split, because the wave is unstable past about 8ms. */
    step: 1 / 240,
} as const;

export type Sway = Readonly<{
    /** Each column's bend in pixels, positive to the right. */
    bends: Float32Array;
    /** The bend at a point along the bed, in pixels, eased between its two columns. */
    bendAt(x: number): number;
    /** A hand at x that has just moved `dx` pixels sideways. */
    push(x: number, dx: number): void;
    /** A tap at x: the plants on either side lean away from it. */
    puff(x: number): void;
    /** Advances the springs. Returns whether anything is still moving. */
    step(dt: number): boolean;
    resize(width: number): void;
}>;

export function createSway(width: number): Sway {
    let count = Math.max(2, Math.ceil(width / swayFeel.column) + 1);
    let bends = new Float32Array(count);
    let speeds = new Float32Array(count);
    let pulls = new Float32Array(count);

    const clampBend = (bend: number) => Math.min(swayFeel.most, Math.max(-swayFeel.most, bend));

    /** Calls back for every column within the hand's reach, with how strongly it is held, 1 right under the hand. */
    function near(x: number, each: (index: number, hold: number, offset: number) => void) {
        const from = Math.max(0, Math.floor((x - swayFeel.reach * 1.6) / swayFeel.column));
        const to = Math.min(count - 1, Math.ceil((x + swayFeel.reach * 1.6) / swayFeel.column));
        for (let i = from; i <= to; i++) {
            const offset = i * swayFeel.column - x;
            each(i, Math.exp(-((offset / swayFeel.reach) ** 2) * 2), offset);
        }
    }

    return {
        get bends() {
            return bends;
        },
        bendAt(x) {
            const at = Math.min(count - 1, Math.max(0, x / swayFeel.column));
            const i = Math.min(count - 2, Math.floor(at));
            return bends[i] + (bends[i + 1] - bends[i]) * (at - i);
        },
        push(x, dx) {
            near(x, (i, hold) => {
                bends[i] = clampBend(bends[i] + dx * swayFeel.carry * hold);
                speeds[i] += dx * swayFeel.fling * hold;
            });
        },
        puff(x) {
            near(x, (i, hold, offset) => {
                // Away from the tap on both sides, most a little way out and nothing right under it.
                const away = Math.sign(offset) * Math.min(1, Math.abs(offset) / (swayFeel.reach * 0.5));
                bends[i] = clampBend(bends[i] + away * swayFeel.puff * hold);
                speeds[i] += away * swayFeel.puff * 9 * hold;
            });
        },
        step(dt) {
            let moving = false;
            const steps = Math.max(1, Math.ceil(dt / swayFeel.step));
            const h = dt / steps;
            for (let step = 0; step < steps; step++) {
                // Work out every column's pull from its neighbours first, so the wave runs the same both ways.
                for (let i = 0; i < count; i++) {
                    const left = bends[Math.max(0, i - 1)];
                    const right = bends[Math.min(count - 1, i + 1)];
                    pulls[i] = (left + right - 2 * bends[i]) * swayFeel.spread;
                }
                for (let i = 0; i < count; i++) {
                    speeds[i] += (pulls[i] - swayFeel.stiffness * bends[i] - swayFeel.damping * speeds[i]) * h;
                    bends[i] = clampBend(bends[i] + speeds[i] * h);
                }
            }
            for (let i = 0; i < count; i++) {
                if (Math.abs(bends[i]) > 0.04 || Math.abs(speeds[i]) > 0.6) {
                    moving = true;
                    break;
                }
            }
            if (!moving) {
                bends.fill(0);
                speeds.fill(0);
            }
            return moving;
        },
        resize(nextWidth) {
            const next = Math.max(2, Math.ceil(nextWidth / swayFeel.column) + 1);
            if (next === count) return;
            count = next;
            bends = new Float32Array(count);
            speeds = new Float32Array(count);
            pulls = new Float32Array(count);
        },
    };
}
