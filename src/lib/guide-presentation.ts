import { defineHastPlugin } from "satteri";

const guideSections = new WeakMap<
    object,
    { introductory: boolean; exercise: boolean }
>();

export const guidePresentation = defineHastPlugin({
    name: "guide-presentation",
    element: {
        filter: ["h1", "h2", "h3", "blockquote", "hr"],
        visit(node, context) {
            const parent = context.parent(node);
            if (parent.type !== "root") return;

            const section = guideSections.get(context) ?? {
                introductory: true,
                exercise: false,
            };
            guideSections.set(context, section);

            if (/^h[123]$/.test(node.tagName)) {
                section.introductory = false;
                section.exercise =
                    node.tagName === "h3" &&
                    /^Try it(?:: .+)?$/.test(context.textContent(node).trim());
                return;
            }

            if (node.tagName === "hr") {
                const index = context.indexOf(node);
                if (index === undefined) return;

                const next = parent.children
                    .slice(index + 1)
                    .find(
                        (sibling) =>
                            sibling.type !== "text" ||
                            sibling.value.trim() !== "",
                    );

                if (next?.type === "element" && next.tagName === "h2") {
                    context.removeNode(node);
                }
                return;
            }

            const text = context.textContent(node).trim();
            const introductory =
                section.introductory &&
                /^(?:Current as of React(?:\s|$)|What this guide builds on\.|A note on libraries\.)/.test(
                    text,
                );

            if (!introductory && !section.exercise) return;

            context.replaceNode(node, {
                ...node,
                tagName: introductory ? "aside" : "div",
                properties: {
                    ...node.properties,
                    "data-guide-role": introductory ? "context" : "exercise",
                },
            });
        },
    },
});
