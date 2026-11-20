import { describe, expect, it } from "vitest";
import golden from "./rough-annotation.golden.json";
import { annotationPaths, type AnnotationConfig, type Rect } from "./rough-annotation";

/*
 * rough-annotation.golden.json is the output of Rough Notation 0.5.1 itself
 * (loaded in a browser, seeded from Math.random = 0.3141592) for six
 * annotations: their measured rects, config and path strings. The port must
 * reproduce them, so its strokes are the library's strokes, not a lookalike.
 */
const seed = Math.floor(0.3141592 * 2 ** 31);
const numbers = (d: string) => d.match(/-?\d+(?:\.\d+)?(?:e-?\d+)?/g)!.map(Number);

type GoldenCase = { id: string; config: AnnotationConfig & { multiline?: boolean }; rects: Rect[]; paths: string[]; width: string };

describe("rough annotation port", () => {
    for (const sample of golden as GoldenCase[]) {
        it(`draws the same ${sample.id} strokes as Rough Notation`, () => {
            const ours = sample.rects.flatMap((rect) => annotationPaths(rect, sample.config, seed).paths);
            expect(ours).toHaveLength(sample.paths.length);
            sample.paths.forEach((theirs, index) => {
                const expected = numbers(theirs);
                const actual = numbers(ours[index]);
                expect(actual).toHaveLength(expected.length);
                actual.forEach((value, i) => expect(Math.abs(value - expected[i])).toBeLessThan(0.02));
            });
        });
    }

    it("sizes a highlight to 95% of the line and keeps other widths as configured", () => {
        expect(annotationPaths({ x: 0, y: 0, w: 100, h: 20 }, { type: "highlight" }, seed).strokeWidth).toBe(19);
        expect(annotationPaths({ x: 0, y: 0, w: 100, h: 20 }, { type: "circle", strokeWidth: 1.5 }, seed).strokeWidth).toBe(1.5);
    });

    it("lifts the pen between strokes: two laps for a circle, three for a bracket", () => {
        const rect = { x: 0, y: 0, w: 80, h: 20 };
        expect(annotationPaths(rect, { type: "circle" }, seed).paths).toHaveLength(2);
        expect(annotationPaths(rect, { type: "bracket", brackets: "left" }, seed).paths).toHaveLength(3);
        expect(annotationPaths(rect, { type: "underline" }, seed).paths).toHaveLength(2);
    });
});
