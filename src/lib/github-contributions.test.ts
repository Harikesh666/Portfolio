import { describe, expect, it } from "vitest";
import { parseContributionCalendar } from "./github-contributions";

const fixture = `
<table>
  <tr>
    <td data-date="2026-01-04" id="contribution-day-component-0-0" data-level="0" class="day"></td>
    <td data-date="2026-01-11" id="contribution-day-component-0-1" data-level="2" class="day"></td>
  </tr>
  <tr>
    <td data-date="2026-01-12" id="contribution-day-component-1-1" data-level="4" class="day"></td>
  </tr>
</table>
<tool-tip for="contribution-day-component-0-0" class="sr-only">No contributions on January 4th.</tool-tip>
<tool-tip for="contribution-day-component-0-1" class="sr-only">3 contributions on January 11th.</tool-tip>
<tool-tip for="contribution-day-component-1-1" class="sr-only">1,204 contributions on January 12th.</tool-tip>
`;

describe("parseContributionCalendar", () => {
    it("groups days into weekday-indexed week columns with counts", () => {
        const calendar = parseContributionCalendar(fixture);

        expect(calendar?.total).toBe(1207);
        expect(calendar?.weeks).toHaveLength(2);
        expect(calendar?.weeks[0][0]).toEqual({
            date: "2026-01-04",
            count: 0,
            level: 0,
        });
        expect(calendar?.weeks[0][1]).toBeNull();
        expect(calendar?.weeks[1][1]).toEqual({
            date: "2026-01-12",
            count: 1204,
            level: 4,
        });
    });

    it("returns null when the markup has no calendar", () => {
        expect(parseContributionCalendar("<html></html>")).toBeNull();
    });
});
