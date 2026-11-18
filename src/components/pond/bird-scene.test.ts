import { describe, expect, it } from "vitest";
import { spring } from "./bird-scene";

/** The head spring's constants, the stiffest in the scene. */
const headStiffness = 1600;
const headDamping = 80;

function settle(frameSeconds: number) {
    const head = { x: 0, v: 0 };
    for (let elapsed = 0; elapsed < 2; elapsed += frameSeconds) spring(head, 0.3, headStiffness, headDamping, frameSeconds);
    return head.x;
}

describe("spring", () => {
    it.each([
        ["144fps", 1 / 144],
        ["60fps", 1 / 60],
        ["30fps", 1 / 30],
        ["the longest frame the scene allows", 0.05],
    ])("settles the head on its target at %s", (_name, frameSeconds) => {
        expect(settle(frameSeconds)).toBeCloseTo(0.3, 3);
    });
});
