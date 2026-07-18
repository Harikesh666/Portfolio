import { describe, expect, it } from "vitest";
import { getTocItemDelay, shouldDismissSheet } from "./toc";

describe("mobile table of contents physics", () => {
    it("uses distance-capped outward row delays", () => {
        expect(getTocItemDelay(3)).toBe(0.048);
        expect(getTocItemDelay(100)).toBe(0.25);
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
