import { createRequire } from "node:module";
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderGuideHtml } from "./guide-render.server";

const { JSDOM }: {
    JSDOM: new (html: string) => { window: { document: Document } };
} = createRequire(import.meta.url)("jsdom");

/*
 * House rules for the hand-drawn marks and margin notes in the guides. They
 * are decoration on top of the prose, so they stay sparse, sit only in
 * running text, and never change a word of it. Margin notes are new text, so
 * they also keep to the guide style: short, no semicolons, plain words.
 */
const guidesDirectory = new URL("../content/guides/", import.meta.url);
const guides = readdirSync(guidesDirectory).filter((file) => file.endsWith(".mdx"));

const limits = {
    /** Per 1,000 words of guide, rounded up, so a long guide may carry a few more. */
    notesPer1k: 1,
    marksPer1k: 1.5,
    minimumNotes: 1,
    maximumNotes: 6,
    maximumMarks: 8,
    noteWords: [2, 12],
    circleWords: 3,
} as const;

const words = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

describe.each(guides)("annotations in %s", (file) => {
    const source = readFileSync(new URL(file, guidesDirectory), "utf8");
    const guideWords = words(source.replace(/^---[\s\S]*?---/, "").replace(/```[\s\S]*?```/g, ""));
    const marksInSource = (source.match(/<Mark\b/g) ?? []).length;
    const notesInSource = (source.match(/<MarginNote\b/g) ?? []).length;

    it("renders, with every mark and note intact", async () => {
        const html = await renderGuideHtml(`../content/guides/${file}`);
        const document = new JSDOM(`<article>${html}</article>`).window.document;
        expect(document.querySelectorAll(".sketch-mark")).toHaveLength(marksInSource);
        expect(document.querySelectorAll(".margin-note")).toHaveLength(notesInSource);

        for (const mark of document.querySelectorAll(".sketch-mark")) {
            // Running text only: never in a heading, a code block, a table or a link.
            expect(mark.closest("h1, h2, h3, h4, pre, code, table, a"), mark.textContent ?? "").toBeNull();
            expect(mark.textContent?.trim().length, "a mark needs words").toBeGreaterThan(0);
            if (mark.getAttribute("data-kind") === "circle") {
                expect(words(mark.textContent ?? ""), `circle "${mark.textContent}"`).toBeLessThanOrEqual(limits.circleWords);
            }
        }
        for (const note of document.querySelectorAll(".margin-note")) {
            // A note frames prose: its passage is paragraphs, never a list, code or figure.
            const body = note.querySelector(".margin-note__body")!;
            for (const child of body.children) expect(child.tagName, "a note wraps paragraphs only").toBe("P");
            expect(note.closest("li, blockquote, table")).toBeNull();
        }
    }, 60_000); // the first guide compiles MDX cold

    it("keeps margin notes short and in the house style", () => {
        const notes = [...source.matchAll(/<MarginNote note="([^"]*)">/g)].map((match) => match[1]);
        expect(notes).toHaveLength(notesInSource);
        for (const note of notes) {
            expect(words(note), `note "${note}"`).toBeGreaterThanOrEqual(limits.noteWords[0]);
            expect(words(note), `note "${note}"`).toBeLessThanOrEqual(limits.noteWords[1]);
            expect(note, `note "${note}" uses a semicolon`).not.toContain(";");
            expect(note, `note "${note}" uses a dash`).not.toMatch(/[—–]/);
        }
    });

    it("stays sparse", () => {
        expect(notesInSource, "notes").toBeGreaterThanOrEqual(limits.minimumNotes);
        expect(notesInSource, "notes").toBeLessThanOrEqual(Math.min(limits.maximumNotes, Math.ceil((guideWords / 1000) * limits.notesPer1k) + 1));
        expect(marksInSource, "marks").toBeLessThanOrEqual(Math.min(limits.maximumMarks, Math.ceil((guideWords / 1000) * limits.marksPer1k) + 1));
    });
});
