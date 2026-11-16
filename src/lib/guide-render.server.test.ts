import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { renderGuideHtml } from "./guide-render.server";

const { JSDOM }: {
    JSDOM: new (html: string) => { window: { document: Document } };
} = createRequire(import.meta.url)("jsdom");

function parse(html: string) {
    return new JSDOM(`<article>${html}</article>`).window.document;
}

describe("renderGuideHtml", () => {
    it("renders prose as static HTML and islands as hydratable wrappers", async () => {
        const html = await renderGuideHtml(
            "../content/guides/asynchronous-javascript-event-loop.mdx",
        );
        const document = parse(html);
        const islands = document.querySelectorAll("[data-island]");

        expect(islands).toHaveLength(1);
        expect(islands[0].getAttribute("data-island")).toBe("TimerOrderDemo");
        expect(JSON.parse(islands[0].getAttribute("data-island-props") ?? "")).toEqual({});
        expect(islands[0].querySelector("button")?.textContent).toBe("Run");
        expect(html).not.toContain("data-island-index");
        expect(document.querySelectorAll("h2 a.heading-anchor").length).toBeGreaterThan(0);
        expect(document.querySelector('link[rel="preload"]')).toBeNull();
    });

    it("leaves guides without islands as plain prose", async () => {
        const html = await renderGuideHtml(
            "../content/guides/closures-function-backpack.mdx",
        );

        expect(html).not.toContain("data-island");
        expect(parse(html).querySelector("h2")).not.toBeNull();
    });

    it("rejects unknown guide paths", async () => {
        await expect(renderGuideHtml("../content/guides/missing.mdx")).rejects.toThrow(
            "Missing MDX guide",
        );
    });
});
