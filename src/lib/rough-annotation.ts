/*
 * Hand-drawn annotation strokes: a port of the stroke geometry from rough.js
 * (lines, linear paths and ellipses) and the annotation layout from Rough
 * Notation (underline, box, circle, highlight, bracket), both by Preet Shihn,
 * MIT licensed: https://github.com/rough-stuff/rough and
 * https://github.com/rough-stuff/rough-notation. Ported rather than installed
 * because this site takes no new runtime dependencies, and kept faithful so
 * the strokes, their wobble and their timing match the originals exactly.
 * The DOM side (measuring, path lengths, animation) lives in sketch-draw.ts.
 */

export type AnnotationType = "underline" | "box" | "circle" | "highlight" | "bracket";
export type BracketSide = "left" | "right" | "top" | "bottom";

export type Rect = Readonly<{ x: number; y: number; w: number; h: number }>;

export type AnnotationConfig = Readonly<{
    type: AnnotationType;
    /** Stroke width in px. Highlights ignore it and use 95% of the line height. */
    strokeWidth?: number;
    /** Space between the words and the stroke, in px: [top, right, bottom, left]. */
    padding?: number | readonly [number, number, number, number];
    /** How many passes the pen makes. */
    iterations?: number;
    brackets?: BracketSide | readonly BracketSide[];
}>;

/** Rough Notation's defaults. */
export const defaultAnimationDuration = 800;
const defaultPadding = 5;

type Op = { op: "move" | "bcurveTo"; data: number[] };
type Point = readonly [number, number];

type Options = {
    maxRandomnessOffset: number;
    roughness: number;
    bowing: number;
    curveFitting: number;
    curveTightness: number;
    curveStepCount: number;
    disableMultiStroke: boolean;
    seed: number;
    randomizer?: Random;
};

/** rough.js's seeded random (Park–Miller); seed 0 falls back to Math.random. */
class Random {
    constructor(private seed: number) {}
    next() {
        if (this.seed) {
            return ((2 ** 31 - 1) & (this.seed = Math.imul(48271, this.seed))) / 2 ** 31;
        }
        return Math.random();
    }
}

/** A seed like Rough Notation's: a fresh one for every annotation. */
export function randomSeed() {
    return Math.floor(Math.random() * 2 ** 31);
}

/** Rough Notation's options: rougher for highlights, two strokes for circles. */
function getOptions(type: "single" | "double" | "highlight", seed: number): Options {
    return {
        maxRandomnessOffset: 2,
        roughness: type === "highlight" ? 3 : 1.5,
        bowing: 1,
        curveFitting: 0.95,
        curveTightness: 0,
        curveStepCount: 9,
        disableMultiStroke: type !== "double",
        seed,
    };
}

function random(o: Options) {
    o.randomizer ??= new Random(o.seed || 0);
    return o.randomizer.next();
}

function offset(min: number, max: number, o: Options, roughnessGain = 1) {
    return o.roughness * roughnessGain * (random(o) * (max - min) + min);
}

function offsetOpt(x: number, o: Options, roughnessGain = 1) {
    return offset(-x, x, o, roughnessGain);
}

function roughLine(x1: number, y1: number, x2: number, y2: number, o: Options, move: boolean, overlay: boolean): Op[] {
    const lengthSq = (x1 - x2) ** 2 + (y1 - y2) ** 2;
    const length = Math.sqrt(lengthSq);
    let roughnessGain = 1;
    if (length < 200) roughnessGain = 1;
    else if (length > 500) roughnessGain = 0.4;
    else roughnessGain = -0.0016668 * length + 1.233334;

    let lineOffset = o.maxRandomnessOffset || 0;
    if (lineOffset * lineOffset * 100 > lengthSq) lineOffset = length / 10;
    const halfOffset = lineOffset / 2;
    const divergePoint = 0.2 + random(o) * 0.2;
    let midDispX = (o.bowing * o.maxRandomnessOffset * (y2 - y1)) / 200;
    let midDispY = (o.bowing * o.maxRandomnessOffset * (x1 - x2)) / 200;
    midDispX = offsetOpt(midDispX, o, roughnessGain);
    midDispY = offsetOpt(midDispY, o, roughnessGain);
    const randomHalf = () => offsetOpt(halfOffset, o, roughnessGain);
    const randomFull = () => offsetOpt(lineOffset, o, roughnessGain);

    const ops: Op[] = [];
    if (move) {
        ops.push(
            overlay
                ? { op: "move", data: [x1 + randomHalf(), y1 + randomHalf()] }
                : { op: "move", data: [x1 + offsetOpt(lineOffset, o, roughnessGain), y1 + offsetOpt(lineOffset, o, roughnessGain)] },
        );
    }
    const jitter = overlay ? randomHalf : randomFull;
    ops.push({
        op: "bcurveTo",
        data: [
            midDispX + x1 + (x2 - x1) * divergePoint + jitter(),
            midDispY + y1 + (y2 - y1) * divergePoint + jitter(),
            midDispX + x1 + 2 * (x2 - x1) * divergePoint + jitter(),
            midDispY + y1 + 2 * (y2 - y1) * divergePoint + jitter(),
            x2 + jitter(),
            y2 + jitter(),
        ],
    });
    return ops;
}

function doubleLine(x1: number, y1: number, x2: number, y2: number, o: Options): Op[] {
    const first = roughLine(x1, y1, x2, y2, o, true, false);
    if (o.disableMultiStroke) return first;
    return first.concat(roughLine(x1, y1, x2, y2, o, true, true));
}

function line(x1: number, y1: number, x2: number, y2: number, o: Options): Op[] {
    return doubleLine(x1, y1, x2, y2, o);
}

function linearPath(points: readonly Point[], close: boolean, o: Options): Op[] {
    const ops: Op[] = [];
    if (points.length > 2) {
        for (let i = 0; i < points.length - 1; i++) {
            ops.push(...doubleLine(points[i][0], points[i][1], points[i + 1][0], points[i + 1][1], o));
        }
        if (close) {
            const last = points.at(-1)!;
            ops.push(...doubleLine(last[0], last[1], points[0][0], points[0][1], o));
        }
    } else if (points.length === 2) {
        ops.push(...line(points[0][0], points[0][1], points[1][0], points[1][1], o));
    }
    return ops;
}

function rectangle(x: number, y: number, width: number, height: number, o: Options): Op[] {
    return linearPath(
        [
            [x, y],
            [x + width, y],
            [x + width, y + height],
            [x, y + height],
        ],
        true,
        o,
    );
}

function curve(points: readonly Point[], o: Options): Op[] {
    const ops: Op[] = [];
    if (points.length > 3) {
        const s = 1 - o.curveTightness;
        ops.push({ op: "move", data: [points[1][0], points[1][1]] });
        for (let i = 1; i + 2 < points.length; i++) {
            const current = points[i];
            ops.push({
                op: "bcurveTo",
                data: [
                    current[0] + (s * points[i + 1][0] - s * points[i - 1][0]) / 6,
                    current[1] + (s * points[i + 1][1] - s * points[i - 1][1]) / 6,
                    points[i + 1][0] + (s * points[i][0] - s * points[i + 2][0]) / 6,
                    points[i + 1][1] + (s * points[i][1] - s * points[i + 2][1]) / 6,
                    points[i + 1][0],
                    points[i + 1][1],
                ],
            });
        }
    }
    return ops;
}

function computeEllipsePoints(increment: number, cx: number, cy: number, rx: number, ry: number, pointOffset: number, overlap: number, o: Options): Point[] {
    const points: Point[] = [];
    const radOffset = offsetOpt(0.5, o) - Math.PI / 2;
    points.push([
        offsetOpt(pointOffset, o) + cx + 0.9 * rx * Math.cos(radOffset - increment),
        offsetOpt(pointOffset, o) + cy + 0.9 * ry * Math.sin(radOffset - increment),
    ]);
    const endAngle = Math.PI * 2 + radOffset - 0.01;
    for (let angle = radOffset; angle < endAngle; angle += increment) {
        points.push([offsetOpt(pointOffset, o) + cx + rx * Math.cos(angle), offsetOpt(pointOffset, o) + cy + ry * Math.sin(angle)]);
    }
    points.push([
        offsetOpt(pointOffset, o) + cx + rx * Math.cos(radOffset + Math.PI * 2 + overlap * 0.5),
        offsetOpt(pointOffset, o) + cy + ry * Math.sin(radOffset + Math.PI * 2 + overlap * 0.5),
    ]);
    points.push([
        offsetOpt(pointOffset, o) + cx + 0.98 * rx * Math.cos(radOffset + overlap),
        offsetOpt(pointOffset, o) + cy + 0.98 * ry * Math.sin(radOffset + overlap),
    ]);
    points.push([
        offsetOpt(pointOffset, o) + cx + 0.9 * rx * Math.cos(radOffset + overlap * 0.5),
        offsetOpt(pointOffset, o) + cy + 0.9 * ry * Math.sin(radOffset + overlap * 0.5),
    ]);
    return points;
}

function ellipse(x: number, y: number, width: number, height: number, o: Options): Op[] {
    const psq = Math.sqrt(Math.PI * 2 * Math.sqrt(((width / 2) ** 2 + (height / 2) ** 2) / 2));
    // Not rounded: Rough Notation's bundled rough.js uses the fractional step count.
    const stepCount = Math.max(o.curveStepCount, (o.curveStepCount / Math.sqrt(200)) * psq);
    const increment = (Math.PI * 2) / stepCount;
    let rx = Math.abs(width / 2);
    let ry = Math.abs(height / 2);
    const curveFitRandomness = 1 - o.curveFitting;
    rx += offsetOpt(rx * curveFitRandomness, o);
    ry += offsetOpt(ry * curveFitRandomness, o);

    const overlap = increment * offset(0.1, offset(0.4, 1, o), o);
    let ops = curve(computeEllipsePoints(increment, x, y, rx, ry, 1, overlap, o), o);
    if (!o.disableMultiStroke) {
        ops = ops.concat(curve(computeEllipsePoints(increment, x, y, rx, ry, 1.5, 0, o), o));
    }
    return ops;
}

function parsePadding(padding: AnnotationConfig["padding"]): readonly [number, number, number, number] {
    if (padding === undefined) return [defaultPadding, defaultPadding, defaultPadding, defaultPadding];
    if (typeof padding === "number") return [padding, padding, padding, padding];
    return padding;
}

const round = (value: number) => Math.round(value * 100) / 100;

/** Splits ops into one path string per pen stroke: every "move" lifts the pen. */
function opsToPaths(ops: readonly Op[]): string[] {
    const paths: string[] = [];
    let path = "";
    for (const { op, data } of ops) {
        if (op === "move") {
            if (path.trim()) paths.push(path.trim());
            path = `M${round(data[0])} ${round(data[1])} `;
        } else {
            path += `C${round(data[0])} ${round(data[1])}, ${round(data[2])} ${round(data[3])}, ${round(data[4])} ${round(data[5])} `;
        }
    }
    if (path.trim()) paths.push(path.trim());
    return paths;
}

/**
 * The pen strokes for one annotation round one rect (Rough Notation's
 * `renderAnnotation`), as SVG path strings in drawing order, plus the stroke
 * width they are drawn with.
 */
export function annotationPaths(rect: Rect, config: AnnotationConfig, seed: number): { paths: string[]; strokeWidth: number } {
    const ops: Op[] = [];
    let strokeWidth = config.strokeWidth || 2;
    const padding = parsePadding(config.padding);
    const iterations = config.iterations || 2;
    const o = getOptions("single", seed);

    switch (config.type) {
        case "underline": {
            const y = rect.y + rect.h + padding[2];
            for (let i = 0; i < iterations; i++) {
                ops.push(...(i % 2 ? line(rect.x + rect.w, y, rect.x, y, o) : line(rect.x, y, rect.x + rect.w, y, o)));
            }
            break;
        }
        case "box": {
            const x = rect.x - padding[3];
            const y = rect.y - padding[0];
            const width = rect.w + (padding[1] + padding[3]);
            const height = rect.h + (padding[0] + padding[2]);
            for (let i = 0; i < iterations; i++) ops.push(...rectangle(x, y, width, height, o));
            break;
        }
        case "bracket": {
            const sides: readonly BracketSide[] = Array.isArray(config.brackets)
                ? (config.brackets as readonly BracketSide[])
                : config.brackets
                  ? [config.brackets as BracketSide]
                  : ["right"];
            const lx = rect.x - padding[3] * 2;
            const rx = rect.x + rect.w + padding[1] * 2;
            const ty = rect.y - padding[0] * 2;
            const by = rect.y + rect.h + padding[2] * 2;
            for (const side of sides) {
                const points: Point[] =
                    side === "bottom"
                        ? [[lx, rect.y + rect.h], [lx, by], [rx, by], [rx, rect.y + rect.h]]
                        : side === "top"
                          ? [[lx, rect.y], [lx, ty], [rx, ty], [rx, rect.y]]
                          : side === "left"
                            ? [[rect.x, ty], [lx, ty], [lx, by], [rect.x, by]]
                            : [[rect.x + rect.w, ty], [rx, ty], [rx, by], [rect.x + rect.w, by]];
                ops.push(...linearPath(points, false, o));
            }
            break;
        }
        case "circle": {
            const doubleO = getOptions("double", seed);
            const width = rect.w + (padding[1] + padding[3]);
            const height = rect.h + (padding[0] + padding[2]);
            const x = rect.x - padding[3] + width / 2;
            const y = rect.y - padding[0] + height / 2;
            const fullIterations = Math.floor(iterations / 2);
            const singleIterations = iterations - fullIterations * 2;
            for (let i = 0; i < fullIterations; i++) ops.push(...ellipse(x, y, width, height, doubleO));
            for (let i = 0; i < singleIterations; i++) ops.push(...ellipse(x, y, width, height, o));
            break;
        }
        case "highlight": {
            const highlightO = getOptions("highlight", seed);
            strokeWidth = rect.h * 0.95;
            const y = rect.y + rect.h / 2;
            for (let i = 0; i < iterations; i++) {
                ops.push(...(i % 2 ? line(rect.x + rect.w, y, rect.x, y, highlightO) : line(rect.x, y, rect.x + rect.w, y, highlightO)));
            }
            break;
        }
    }
    return { paths: opsToPaths(ops), strokeWidth };
}
