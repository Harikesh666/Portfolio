import { createRequire } from "node:module";
import { markdownToHtml } from "satteri";
import { describe, expect, it } from "vitest";
import { guideFigures } from "./guide-figures";

const { JSDOM }: {
    JSDOM: new (html: string) => { window: { document: Document } };
} = createRequire(import.meta.url)("jsdom");

function render(source: string) {
    return new JSDOM(markdownToHtml(source, {
        hastPlugins: [guideFigures],
    }).html).window.document.body;
}

describe("guide figures", () => {
    it("preserves alternative text and adds authored captions and local dimensions", () => {
        const result = render('![Timer registers](/diagrams/event-loop-timer-registered.png "The script continues.")');
        const image = result.querySelector("figure.guide-figure img");
        expect(image?.getAttribute("alt")).toBe("Timer registers");
        expect(image?.getAttribute("src")).toBe("/diagrams/event-loop-timer-registered.png");
        expect(Number(image?.getAttribute("width"))).toBeGreaterThan(0);
        expect(Number(image?.getAttribute("height"))).toBeGreaterThan(0);
        expect(image?.hasAttribute("title")).toBe(false);
        expect(result.querySelector("figcaption")?.textContent).toBe("The script continues.");
    });

    it("keeps linked images and does not manufacture captions from alt text", () => {
        const result = render('[![An image](https://example.com/image.png)](/articles/example)');
        expect(result.querySelector("figure a")?.getAttribute("href")).toBe("/articles/example");
        expect(result.querySelector("img")?.getAttribute("alt")).toBe("An image");
        expect(result.querySelector("img")?.hasAttribute("width")).toBe(false);
        expect(result.querySelector("figcaption")).toBeNull();
    });

    it("leaves inline images in their paragraph", () => {
        const result = render('Before ![Inline](/diagrams/execution-context.png) after.');
        expect(result.querySelector("figure")).toBeNull();
        expect(result.querySelector("p img")).not.toBeNull();
        expect(result.textContent).toContain("Before  after.");
    });

    it.each(["/../outside.png", "/%2e%2e/outside.png", "//example.com/image.png", "/missing.png"])(
        "leaves unresolvable dimensions alone for %s", (source) => {
            const result = render(`![Image](${source})`);
            expect(result.querySelector("img")?.hasAttribute("width")).toBe(false);
            expect(result.querySelector("img")?.hasAttribute("height")).toBe(false);
        },
    );
});
