import {
    ExpressiveCodeBlock,
    type SatteriExpressiveCodeOptions,
} from "satteri-expressive-code";

export const createGuideCodeBlock: NonNullable<
    SatteriExpressiveCodeOptions["customCreateBlock"]
> = ({ input }) => {
    const block = new ExpressiveCodeBlock(input);
    const role = block.metaOptions.getString("role");
    if (role !== "output" && role !== "diagram") return block;

    const defaults: string[] = [];
    if (block.metaOptions.getString("title") === undefined) {
        defaults.push(`title="${role === "output" ? "Output" : "Diagram"}"`);
    }
    if (block.metaOptions.getString("frame") === undefined) {
        defaults.push('frame="code"');
    }

    return new ExpressiveCodeBlock({
        ...input,
        meta: [input.meta, ...defaults].filter(Boolean).join(" "),
    });
};
