import { describe, expect, it } from "vitest";
import { resumeExperience } from "./resume";

const highlights = resumeExperience.flatMap((experience) => [
    ...(experience.highlights ?? []),
    ...(experience.projects ?? []).flatMap((project) => project.highlights),
]);

describe("resume annotations", () => {
    it("marks only phrases that appear word for word in their highlight", () => {
        for (const highlight of highlights) {
            for (const mark of highlight.marks ?? []) expect(highlight.content).toContain(mark.text);
        }
    });

    it("annotates every project, but never every line of one", () => {
        for (const experience of resumeExperience) {
            for (const project of experience.projects ?? []) {
                const marks = project.highlights.filter((highlight) => highlight.marks?.length).length;
                expect(marks).toBeGreaterThanOrEqual(1);
                expect(marks).toBeLessThan(project.highlights.length);
            }
        }
    });
});
