import { describe, expect, it } from "vitest";
import { bulbulPhrase } from "./bird-song";

describe("bulbul call", () => {
    it("sings three whistled notes in the red-vented bulbul's range, one after another", () => {
        for (let attempt = 0; attempt < 50; attempt++) {
            const notes = bulbulPhrase();
            expect(notes).toHaveLength(3);
            for (const [index, note] of notes.entries()) {
                for (const pitch of [note.from, note.to, note.mid ?? note.from]) {
                    expect(pitch).toBeGreaterThan(1800);
                    expect(pitch).toBeLessThan(3400);
                }
                expect(note.length).toBeGreaterThan(0.04);
                if (index > 0) expect(note.at).toBeGreaterThanOrEqual(notes[index - 1].at + notes[index - 1].length);
            }
        }
    });

    it("keeps a phrase short, under a second", () => {
        for (let attempt = 0; attempt < 50; attempt++) {
            const last = bulbulPhrase().at(-1);
            expect(last && last.at + last.length).toBeLessThan(1);
        }
    });
});
