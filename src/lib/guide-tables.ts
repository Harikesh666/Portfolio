import { defineHastPlugin } from "satteri";

export const guideTables = defineHastPlugin({
    name: "guide-tables",
    element: {
        filter: ["table", "th"],
        visit(node, context) {
            const parent = context.parent(node);

            if (node.tagName === "th") {
                if (node.properties.scope !== undefined) return;
                if (parent.type !== "element" || parent.tagName !== "tr") return;

                const section = context.parent(parent);
                if (section.type === "element" && section.tagName === "thead") {
                    context.setProperty(node, "scope", "col");
                }
                return;
            }

            if (parent.type === "element") {
                const classes = parent.properties.className;
                const classNames = Array.isArray(classes)
                    ? classes
                    : String(classes ?? "").split(/\s+/);
                if (classNames.includes("guide-table-scroll")) return;
            }

            context.wrapNode(node, {
                type: "element",
                tagName: "div",
                properties: {
                    className: ["guide-table-scroll"],
                    role: "region",
                    ariaLabel: "Scrollable table",
                    tabIndex: 0,
                },
                children: [],
            });
        },
    },
});
