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
