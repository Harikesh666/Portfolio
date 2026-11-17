import { markdownToHast, type HastNode } from "satteri";
import { slugifyHeading } from "./satteri-plugins.ts";

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
    return extractHeadingRecords(source)
        .filter(
            (heading) =>
                heading.level === 2 && !isExcludedHeading(heading.id),
        )
        .map(({ id, title }) => ({ id, title }));
}

type HeadingRecord = Readonly<{
    id: string;
    level: 2 | 3 | 4;
    title: string;
}>;

function extractHeadingRecords(source: string): HeadingRecord[] {
    const tree = markdownToHast(source, {
        features: { frontmatter: true, gfm: true },
    });
    const headings: HeadingRecord[] = [];
    const seenIds = new Map<string, number>();

    function visit(node: HastNode) {
        if (
            node.type === "element" &&
            (node.tagName === "h2" ||
                node.tagName === "h3" ||
                node.tagName === "h4")
        ) {
            const title = getTextContent(node).trim();
            const baseId = slugifyHeading(title);
            const count = (seenIds.get(baseId) ?? 0) + 1;
            seenIds.set(baseId, count);
            headings.push({
                id: count === 1 ? baseId : `${baseId}-${count}`,
                level: Number(node.tagName.slice(1)) as 2 | 3 | 4,
                title,
            });
        }

        if ("children" in node) node.children.forEach(visit);
    }

    visit(tree);
    return headings;
}
