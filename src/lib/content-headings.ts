import { markdownToHast, type HastNode } from "satteri";
import { slugifyHeading } from "./satteri-plugins";

export type TocItem = {
    id: string;
    title: string;
};

export type MinimapKind = "title" | "subtitle" | "section" | "body";

export type MinimapItem = TocItem & {
    kind: MinimapKind;
};

const isExcludedHeading = (id: string) =>
    id === "table-of-contents" || id.startsWith("read-this-first");
const maximumMinimapItems = 34;
const maximumMajorMinimapItems = 6;

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

export function extractMinimapItems(source: string): MinimapItem[] {
    const headings = extractHeadingRecords(source);
    let excludeCurrentSection = false;
    const eligibleHeadings = headings.filter((heading) => {
        if (heading.level === 2) {
            excludeCurrentSection = isExcludedHeading(heading.id);
        }
        return !excludeCurrentSection;
    });
    const sampledHeadings = evenlySample(
        eligibleHeadings,
        Math.min(eligibleHeadings.length, maximumMinimapItems),
    );
    const majorHeadingCount =
        sampledHeadings.length === 0
            ? 0
            : Math.max(
                  1,
                  Math.round(
                      (sampledHeadings.length * maximumMajorMinimapItems) /
                          maximumMinimapItems,
                  ),
              );
    const sampledMajorHeadings = evenlySampleIncludingEndpoints(
        sampledHeadings,
        majorHeadingCount,
    );
    const majorHeadingIds = new Set(
        sampledMajorHeadings.map((heading) => heading.id),
    );

    return sampledHeadings.map((heading) => ({
        id: heading.id,
        title: heading.title,
        kind: majorHeadingIds.has(heading.id) ? "title" : "body",
    }));
}

function evenlySampleIncludingEndpoints<T>(items: T[], limit: number): T[] {
    if (limit <= 0) return [];
    if (limit === 1) return [items[0]];
    if (limit >= items.length) return items;

    return Array.from({ length: limit }, (_, index) => {
        const itemIndex = Math.round(
            (index * (items.length - 1)) / (limit - 1),
        );
        return items[itemIndex];
    });
}

function evenlySample<T>(items: T[], limit: number): T[] {
    if (limit <= 0) return [];
    if (limit >= items.length) return items;

    return Array.from({ length: limit }, (_, index) => {
        const itemIndex = Math.floor((index * items.length) / limit);
        return items[itemIndex];
    });
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
