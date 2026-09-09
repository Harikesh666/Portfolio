import { createRequire } from "node:module";
import { defineHastPlugin, markdownToHtml } from "satteri";
import { describe, expect, it } from "vitest";
import { guideTables } from "./guide-tables";

const { JSDOM }: {
    JSDOM: new (html: string) => { window: { document: Document } };
} = createRequire(import.meta.url)("jsdom");

const source = `| Name | Count | Result |
| :--- | ---: | :---: |
| [Example](/articles/example) | 42 | \`ready\` |
`;

describe("guideTables", () => {
    it("preserves table markup and alignment inside a keyboard-focusable region", async () => {
        const original = await markdownToHtml(source);
        const result = await markdownToHtml(source, { hastPlugins: [guideTables] });
        const document = new JSDOM(result.html).window.document;
        const originalTable = new JSDOM(original.html).window.document.querySelector("table");
        const wrapper = document.querySelector(".guide-table-scroll");
        const table = wrapper?.querySelector("table");

        expect(wrapper?.getAttribute("role")).toBe("region");
        expect(wrapper?.getAttribute("aria-label")).toBe("Scrollable table");
        expect(wrapper?.getAttribute("tabindex")).toBe("0");
        expect(table?.parentElement).toBe(wrapper);
        expect(table?.querySelectorAll('thead th[scope="col"]')).toHaveLength(3);
        expect(table?.querySelectorAll("tbody td")).toHaveLength(3);
        table?.querySelectorAll("th").forEach((cell) => cell.removeAttribute("scope"));
        expect(table?.outerHTML).toBe(originalTable?.outerHTML);
    });

    it("preserves authored IDs and scope and does not wrap a table twice", async () => {
        const authoredProperties = defineHastPlugin({
            name: "authored-table-properties",
            element: {
                filter: ["table", "th"],
                visit(node, context) {
                    if (node.tagName === "table") {
                        context.setProperty(node, "id", "comparison");
                    } else {
                        context.setProperty(node, "scope", "colgroup");
                    }
                },
            },
        });
        const { html } = await markdownToHtml(source, {
            hastPlugins: [authoredProperties, guideTables, guideTables],
        });
        const document = new JSDOM(html).window.document;

        expect(document.querySelectorAll(".guide-table-scroll")).toHaveLength(1);
        expect(document.querySelector(".guide-table-scroll > table")?.id).toBe("comparison");
        expect(document.querySelectorAll('th[scope="colgroup"]')).toHaveLength(3);
    });

    it("leaves body row headers without an inferred column scope", async () => {
        const bodyHeaders = defineHastPlugin({
            name: "body-row-headers",
            element: {
                filter: ["td"],
                visit(node, context) {
                    context.replaceNode(node, { ...node, tagName: "th" });
                },
            },
        });
        const { html } = await markdownToHtml(source, {
            hastPlugins: [bodyHeaders, guideTables],
        });
        const document = new JSDOM(html).window.document;

        expect(document.querySelectorAll("tbody th")).toHaveLength(3);
        expect(document.querySelector("tbody th[scope]")).toBeNull();
    });
});
