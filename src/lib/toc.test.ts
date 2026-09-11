import { describe, expect, it } from "vitest";
import { getTocItemDelay, shouldDismissSheet } from "./toc";

describe("mobile table of contents physics", () => {
    it("uses source-order row delays with a long-list cap", () => {
        expect(getTocItemDelay(0)).toBe(0.04);
        expect(getTocItemDelay(3)).toBeCloseTo(0.13);
        expect(getTocItemDelay(100)).toBe(0.4);
    });

    it("dismisses by distance or downward velocity", () => {
        expect(shouldDismissSheet(151, 0, 600)).toBe(true);
        expect(shouldDismissSheet(20, 501, 600)).toBe(true);
    });

    it("settles releases at or below both thresholds", () => {
        expect(shouldDismissSheet(150, 500, 600)).toBe(false);
        expect(shouldDismissSheet(149, -900, 600)).toBe(false);
    });
});
