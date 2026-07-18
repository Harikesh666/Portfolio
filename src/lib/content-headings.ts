import { markdownToHast, type HastNode } from "satteri";
import { slugifyHeading } from "./satteri-plugins";

export type TocItem = {
    id: string;
    title: string;
};

const isExcludedHeading = (id: string) =>
    id === "table-of-contents" || id.startsWith("read-this-first");

function getTextContent(node: HastNode): string {
    if (node.type === "text") return node.value;
    if (!("children" in node)) return "";

    return node.children.map(getTextContent).join("");
}

export function extractTocItems(source: string): TocItem[] {
    const tree = markdownToHast(source, {
        features: { frontmatter: true, gfm: true },
    });
    const items: TocItem[] = [];

    function visit(node: HastNode) {
        if (node.type === "element" && node.tagName === "h2") {
            const title = getTextContent(node).trim();
            const id = slugifyHeading(title);

            if (!isExcludedHeading(id)) items.push({ id, title });
        }

        if ("children" in node) node.children.forEach(visit);
    }

    visit(tree);
    return items;
}
