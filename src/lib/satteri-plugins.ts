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

            const id = count === 1 ? base : `${base}-${count}`;
            ctx.setProperty(node, "id", id);

            // A pointer-only self-link stretched over the heading by CSS.
            // Hidden from assistive tech and the tab order so heading names
            // stay clean; the table of contents is the semantic route.
            ctx.appendChild(node, {
                type: "element",
                tagName: "a",
                properties: {
                    className: ["heading-anchor"],
                    href: `#${id}`,
                    ariaHidden: "true",
                    tabIndex: -1,
                },
                children: [],
            });
        },
    },
});

const seenSlugs = new WeakMap<object, Map<string, number>>();
