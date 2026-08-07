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
            const base = slugifyHeading(ctx.textContent(node));
            const seen = seenSlugs.get(ctx) ?? new Map<string, number>();
            seenSlugs.set(ctx, seen);

            const count = (seen.get(base) ?? 0) + 1;
            seen.set(base, count);

            ctx.setProperty(node, "id", count === 1 ? base : `${base}-${count}`);
        },
    },
});

const seenSlugs = new WeakMap<object, Map<string, number>>();
