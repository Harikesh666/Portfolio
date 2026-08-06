import { defineHastPlugin } from "satteri";

export const slugifyHeading = (value: string) =>
    value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-");

export const headingIds = defineHastPlugin({
    name: "heading-ids",
    element: {
        filter: ["h2", "h3", "h4"],
        visit(node, ctx) {
            ctx.setProperty(node, "id", slugifyHeading(ctx.textContent(node)));
        },
    },
});

export const scrollRevealTargets = defineHastPlugin({
    name: "scroll-reveal-targets",
    element: {
        filter: ["blockquote"],
        visit(node, ctx) {
            ctx.setProperty(node, "data-scroll-reveal", "tree");
        },
    },
});

export const scrollRevealTrees = defineHastPlugin({
    name: "scroll-reveal-trees",
    element: {
        filter: ["figure", "ol", "table", "ul"],
        visit(node, ctx) {
            ctx.setProperty(node, "data-scroll-reveal", "tree");
        },
    },
});
