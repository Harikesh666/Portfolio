import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { markdownToHtml } from "satteri";
import { describe, expect, it } from "vitest";
import { guidePresentation } from "./guide-presentation";
import { headingIds } from "./satteri-plugins";

const { JSDOM }: {
    JSDOM: new (html: string) => { window: { document: Document } };
} = createRequire(import.meta.url)("jsdom");

async function render(source: string, presentation = true) {
    const { html } = await markdownToHtml(source, {
        hastPlugins: presentation
            ? [guidePresentation, headingIds]
            : [headingIds],
    });
    return new JSDOM(html).window.document.body;
}

describe("guidePresentation", () => {
    it("marks only recognized introductory context and preserves its children", async () => {
        const source = `> Current as of React 19.2. Keep **every word**.

> **What this guide builds on.** Read [the guide](/articles/example) and use \`Object.is\`.

> **A note on libraries.** Keep the caveat.

> A genuine quotation.

## First chapter

> Current as of React 19.2. This is inside a chapter.
`;
        const original = await render(source, false);
        const result = await render(source);

        expect(result.querySelectorAll('aside[data-guide-role="context"]')).toHaveLength(3);
        expect(result.querySelectorAll("blockquote")).toHaveLength(2);
        expect(result.textContent).toBe(original.textContent);
        expect(result.querySelector("aside strong")?.outerHTML).toBe(
            original.querySelector("blockquote strong")?.outerHTML,
        );
        expect(result.querySelector("a")?.outerHTML).toBe(
            original.querySelector("a")?.outerHTML,
        );
        expect(result.querySelector("code")?.outerHTML).toBe(
            original.querySelector("code")?.outerHTML,
        );
    });

    it("limits exercise treatment to top-level quotes in a Try it section", async () => {
        const result = await render(`### Try it

> Run this example.
>
> > A nested genuine quote.

#### Supporting example

> Check its output.

### You've got this if

> A genuine quote after the exercise.

### Try it: another approach

> Change the input.

## Next chapter

> Another genuine quote.

### Try it later

> Not the named exercise scaffold.

### Try it

> Last exercise.

# Appendix

> Outside the exercise.
`);

        expect(
            Array.from(result.querySelectorAll('[data-guide-role="exercise"]')).map(
                (exercise) => exercise.firstElementChild?.textContent,
            ),
        ).toEqual([
            "Run this example.",
            "Check its output.",
            "Change the input.",
            "Last exercise.",
        ]);
        expect(result.querySelectorAll("blockquote")).toHaveLength(5);
        expect(result.querySelector("div > blockquote")?.textContent?.trim()).toBe(
            "A nested genuine quote.",
        );
    });

    it("removes only top-level rules immediately before chapter headings", async () => {
        const result = await render(`Opening.

---

## Chapter

---

A deliberate thematic break.

---

### Subsection

> Before a nested break.
>
> ---
>
> ## Quoted heading

---
`);

        expect(result.querySelectorAll("hr")).toHaveLength(4);
        expect(result.querySelector("h2")?.previousElementSibling?.tagName).toBe("P");
        expect(result.querySelector("blockquote hr")).not.toBeNull();
        expect(result.lastElementChild?.tagName).toBe("HR");
    });

    it("does not classify near matches, nested introductions, or leak document state", async () => {
        await render("### Try it\n\n> An exercise.");
        const result = await render(`> What this guide builds on without the label.

> Current as of Reactivity 1.0.

> Genuine outer quote.
>
> > Current as of React 19.2.

> A fresh genuine quote.
`);

        expect(result.querySelector("[data-guide-role]")).toBeNull();
        expect(result.querySelectorAll("blockquote")).toHaveLength(5);
    });

    it.each([
        "react-rendering-reconciliation-internals",
        "map-filter-reduce-transform-select-combine",
    ])("preserves all prose, code, and heading anchors in %s", async (slug) => {
        const source = await readFile(
            new URL(`../content/guides/${slug}.md`, import.meta.url),
            "utf8",
        );
        const original = await render(source, false);
        const result = await render(source);
        const meaningfulText = (body: HTMLElement) =>
            body.textContent?.replace(/\s+/g, " ").trim();
        const elements = (body: HTMLElement, selector: string) =>
            Array.from(body.querySelectorAll(selector)).map(
                (element) => element.outerHTML,
            );

        expect(meaningfulText(result)).toBe(meaningfulText(original));
        expect(elements(result, "pre, code")).toEqual(elements(original, "pre, code"));
        expect(elements(result, "h1, h2, h3, h4, h5, h6")).toEqual(
            elements(original, "h1, h2, h3, h4, h5, h6"),
        );
        expect(elements(result, "a")).toEqual(elements(original, "a"));

        if (slug.startsWith("react-")) {
            expect(result.querySelector('[data-guide-role="context"]')).not.toBeNull();
            expect(result.querySelector('[data-guide-role="exercise"]')).not.toBeNull();
            expect(result.querySelectorAll("hr").length).toBeLessThan(
                original.querySelectorAll("hr").length,
            );
        }
    });
});
