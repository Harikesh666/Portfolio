import { createRequire } from "node:module";
import { markdownToHtml } from "satteri";
import { describe, expect, it } from "vitest";
import { headingIds } from "./satteri-plugins";

const { JSDOM }: {
    JSDOM: new (html: string) => { window: { document: Document } };
} = createRequire(import.meta.url)("jsdom");

async function render(source: string) {
    const { html } = await markdownToHtml(source, { hastPlugins: [headingIds] });
    return new JSDOM(html).window.document.body;
}

describe("headingIds", () => {
    it("adds a hidden self-link whose hash matches each heading id", async () => {
        const body = await render("## The itch\n\n### The itch\n\n#### Deep `code`\n");
        const headings = [...body.querySelectorAll("h2, h3, h4")];

        expect(headings.map((heading) => heading.id)).toEqual([
            "the-itch",
            "the-itch-2",
            "deep-code",
        ]);
        for (const heading of headings) {
            const anchor = heading.querySelector("a.heading-anchor");
            expect(anchor?.getAttribute("href")).toBe(`#${heading.id}`);
            expect(anchor?.getAttribute("aria-hidden")).toBe("true");
            expect(anchor?.getAttribute("tabindex")).toBe("-1");
            expect(anchor?.textContent).toBe("");
        }
        expect(headings[2].textContent).toBe("Deep code");
    });
});
