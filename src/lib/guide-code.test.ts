import { createRequire } from "node:module";
import { markdownToHtml } from "satteri";
import expressiveCode from "satteri-expressive-code";
import { describe, expect, it } from "vitest";
import { createGuideCodeBlock } from "./guide-code";

const { JSDOM }: {
    JSDOM: new (html: string) => { window: { document: Document } };
} = createRequire(import.meta.url)("jsdom");

const renderCode = expressiveCode({
    shiki: false,
    customCreateBlock: createGuideCodeBlock,
    useDarkModeMediaQuery: false,
    themeCssSelector: (theme) => `[data-theme='${theme.type}']`,
});

async function render(source: string) {
    const { html } = await markdownToHtml(source, {
        hastPlugins: [renderCode],
    });
    return new JSDOM(html).window.document.body;
}

describe("guide code roles", () => {
    it.each([
        ["output", "Output", "start\npromise\ntimer"],
        ["diagram", "Diagram", "root\n├── child\n└── sibling"],
    ])("labels explicit %s fences using Expressive Code", async (role, title, code) => {
        const result = await render(`\`\`\`text role="${role}"\n${code}\n\`\`\``);

        expect(result.querySelector(".expressive-code .title")?.textContent).toBe(title);
        expect(result.querySelector(".expressive-code pre")).not.toBeNull();
        expect(result.querySelector("button[data-code]")?.getAttribute("data-code")).toBe(
            code.replace(/\n/g, "\u007f"),
        );
        expect(result.querySelector("style")?.textContent).toContain("data-theme");
        expect(result.querySelector('script[type="module"]')).not.toBeNull();
    });

    it("preserves explicit titles and frames", async () => {
        const result = await render('```text role="output" title="Console result" frame="terminal"\n42\n```');

        expect(result.querySelector(".title")?.textContent).toBe("Console result");
        expect(result.querySelector("figure.is-terminal")).not.toBeNull();
    });

    it("keeps ordinary code, generic text, and unknown roles unclassified", async () => {
        const result = await render('```js\nconsole.log(42);\n```\n\n```text\nA generic block.\n```\n\n```text role="example"\nA generic example.\n```');

        expect(result.querySelectorAll(".expressive-code")).toHaveLength(3);
        expect(result.querySelectorAll(".title")).toHaveLength(0);
        expect(result.querySelectorAll("button[data-code]")).toHaveLength(3);
    });
});
