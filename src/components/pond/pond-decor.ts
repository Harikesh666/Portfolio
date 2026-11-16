type Stone = Readonly<{ x: number; y: number; rx: number; ry: number; rotation: number; tone: number }>;
type Blade = Readonly<{ angle: number; length: number; bend: number; phase: number; width: number }>;
type Reeds = Readonly<{ x: number; y: number; blades: readonly Blade[] }>;
type LilyPad = { x: number; y: number; radius: number; rotation: number; notch: number; vx: number; vy: number; spin: number };

export type Decor = Readonly<{
    stones: readonly Stone[];
    reeds: readonly Reeds[];
    pads: LilyPad[];
}>;

const random = (min: number, max: number) => min + Math.random() * (max - min);

/**
 * Pond furniture placed near the edges, leaving the middle for the koi
 * and the upper right clear for the moon's reflection.
 */
export function createDecor(width: number, height: number): Decor {
    const unit = height;
    const stoneSpots = [
        [0.1, 0.82, 1],
        [0.18, 0.9, 0.62],
        [0.9, 0.78, 0.9],
        [0.56, 0.9, 0.55],
        [0.06, 0.24, 0.7],
    ] as const;
    const stones = stoneSpots.map(([fx, fy, scale]) => {
        const rx = unit * random(0.075, 0.1) * scale;
        return {
            x: width * fx + random(-6, 6),
            y: height * fy + random(-4, 4),
            rx,
            ry: rx * random(0.62, 0.8),
            rotation: random(-0.5, 0.5),
            tone: random(0.85, 1.1),
        };
    });

    const clump = (x: number, y: number, lean: number): Reeds => ({
        x,
        y,
        blades: Array.from({ length: 6 }, () => ({
            angle: lean + random(-0.45, 0.45),
            length: unit * random(0.22, 0.38),
            bend: random(-0.35, 0.35),
            phase: random(0, Math.PI * 2),
            width: random(1.4, 2.4),
        })),
    });
    const reeds = [clump(width * 0.03, height * 0.98, -1.25), clump(width * 0.985, height * 0.06, 1.95)];

    const pads: LilyPad[] = [
        [0.3, 0.2, 0.12],
        [0.38, 0.27, 0.075],
        [0.7, 0.86, 0.1],
    ].map(([fx, fy, size]) => ({
        x: width * fx,
        y: height * fy,
        radius: unit * size,
        rotation: random(0, Math.PI * 2),
        notch: random(0, Math.PI * 2),
        vx: random(-1.2, 1.2),
        vy: random(-0.6, 0.6),
        spin: random(-0.04, 0.04),
    }));

    return { stones, reeds, pads };
}

/** Lily pads drift very slowly and turn back at the pond's edge. */
export function driftDecor(decor: Decor, width: number, height: number, dt: number) {
    for (const pad of decor.pads) {
        pad.x += pad.vx * dt;
        pad.y += pad.vy * dt;
        pad.rotation += pad.spin * dt;
        if (pad.x < width * 0.08 || pad.x > width * 0.92) pad.vx *= -1;
        if (pad.y < height * 0.1 || pad.y > height * 0.9) pad.vy *= -1;
    }
}

/** Smooth stones on the pond floor, lit from the upper left. Drawn once per resize. */
export function drawStones(context: CanvasRenderingContext2D, decor: Decor) {
    for (const stone of decor.stones) {
        context.save();
        context.translate(stone.x, stone.y);
        context.rotate(stone.rotation);

        context.fillStyle = "rgba(10, 25, 24, 0.22)";
        context.beginPath();
        context.ellipse(stone.rx * 0.18, stone.ry * 0.3, stone.rx * 1.04, stone.ry * 0.98, 0, 0, Math.PI * 2);
        context.fill();

        const lit = context.createRadialGradient(
            -stone.rx * 0.35,
            -stone.ry * 0.45,
            stone.rx * 0.1,
            0,
            0,
            stone.rx * 1.1,
        );
        const t = stone.tone;
        lit.addColorStop(0, `rgba(${226 * t}, ${230 * t}, ${224 * t}, 0.62)`);
        lit.addColorStop(0.45, `rgba(${132 * t}, ${142 * t}, ${136 * t}, 0.6)`);
        lit.addColorStop(1, `rgba(${58 * t}, ${68 * t}, ${66 * t}, 0.66)`);
        context.fillStyle = lit;
        context.beginPath();
        context.ellipse(0, 0, stone.rx, stone.ry, 0, 0, Math.PI * 2);
        context.fill();
        context.restore();
    }
}

function tracePad(context: CanvasRenderingContext2D, pad: LilyPad, radius = pad.radius) {
    const gap = 0.32;
    const start = pad.rotation + pad.notch + gap / 2;
    context.beginPath();
    context.moveTo(pad.x, pad.y);
    context.arc(pad.x, pad.y, radius, start, start + Math.PI * 2 - gap);
    context.closePath();
}

/** Pad silhouettes for the blurred shadow layer. */
export function tracePadShadows(context: CanvasRenderingContext2D, decor: Decor) {
    for (const pad of decor.pads) {
        tracePad(context, pad);
        context.fill();
    }
}

export function drawLilyPads(context: CanvasRenderingContext2D, decor: Decor) {
    for (const pad of decor.pads) {
        const leaf = context.createRadialGradient(
            pad.x - pad.radius * 0.3,
            pad.y - pad.radius * 0.35,
            pad.radius * 0.1,
            pad.x,
            pad.y,
            pad.radius,
        );
        leaf.addColorStop(0, "#86b06a");
        leaf.addColorStop(0.65, "#5d8c4a");
        leaf.addColorStop(1, "#46723a");
        tracePad(context, pad);
        context.fillStyle = leaf;
        context.fill();

        // Veins radiate from the stem.
        context.strokeStyle = "rgba(220, 240, 200, 0.22)";
        context.lineWidth = 0.8;
        for (let i = 1; i < 8; i++) {
            const angle = pad.rotation + pad.notch + (i / 8) * Math.PI * 2;
            context.beginPath();
            context.moveTo(pad.x, pad.y);
            context.lineTo(pad.x + Math.cos(angle) * pad.radius * 0.88, pad.y + Math.sin(angle) * pad.radius * 0.88);
            context.stroke();
        }
        context.strokeStyle = "rgba(40, 70, 34, 0.35)";
        context.lineWidth = 1;
        tracePad(context, pad, pad.radius - 0.5);
        context.stroke();
    }
}

/** Reeds growing up through the water at the corners, swaying gently. */
export function drawReeds(context: CanvasRenderingContext2D, decor: Decor, time: number) {
    context.lineCap = "round";
    for (const clump of decor.reeds) {
        for (const blade of clump.blades) {
            const sway = Math.sin(time * 0.55 + blade.phase) * 0.06;
            const angle = blade.angle + sway;
            const tip = {
                x: clump.x + Math.cos(angle) * blade.length,
                y: clump.y + Math.sin(angle) * blade.length,
            };
            const bendAngle = angle + Math.PI / 2;
            const control = {
                x: (clump.x + tip.x) / 2 + Math.cos(bendAngle) * blade.length * blade.bend * 0.4,
                y: (clump.y + tip.y) / 2 + Math.sin(bendAngle) * blade.length * blade.bend * 0.4,
            };
            context.strokeStyle = "rgba(38, 74, 44, 0.62)";
            context.lineWidth = blade.width;
            context.beginPath();
            context.moveTo(clump.x, clump.y);
            context.quadraticCurveTo(control.x, control.y, tip.x, tip.y);
            context.stroke();
        }
    }
}
