import { FigureFrame, Flow, Note, useStepper, type FlowNode, type FlowWire, type Lit } from "./kit";

/*
 * Scanner and parser, drawn on a real statement: the source line, the
 * tokens the scanner emits one by one, and the tree the parser builds.
 * The V8 guide uses `let x = 1;`, the engine guide `let answer = 7;`.
 */

type Token = Readonly<{ text: string; kind: "keyword" | "identifier" | "operator" | "number" | "punctuation" }>;

const pipelineNodes: FlowNode[] = [
    { id: "source", x: 8, y: 8, w: 58, h: 22, label: "source" },
    { id: "scanner", x: 86, y: 8, w: 62, h: 22, label: "scanner", tone: "task" },
    { id: "tokens", x: 168, y: 8, w: 56, h: 22, label: "tokens", tone: "task" },
    { id: "parser", x: 244, y: 8, w: 56, h: 22, label: "parser", tone: "accent" },
    { id: "ast", x: 318, y: 8, w: 34, h: 22, label: "AST", tone: "accent" },
];

const pipelineWires: FlowWire[] = [
    { id: "w1", d: "M66 19 H84" },
    { id: "w2", d: "M148 19 H166" },
    { id: "w3", d: "M224 19 H242" },
    { id: "w4", d: "M300 19 H316" },
];

const charWidth = 7.8;

function tokenize(source: string): readonly (Token & { start: number })[] {
    const kinds: Record<string, Token["kind"]> = { let: "keyword", "=": "operator", ";": "punctuation" };
    const tokens: (Token & { start: number })[] = [];
    for (const match of source.matchAll(/[A-Za-z_]\w*|\d+|[=;]/g)) {
        const text = match[0];
        const kind = kinds[text] ?? (/^\d/.test(text) ? "number" : "identifier");
        tokens.push({ text, kind, start: match.index });
    }
    return tokens;
}

export function ParseFigure({ source, engine }: Readonly<{ source: string; engine: string }>) {
    const tokens = tokenize(source);
    const name = tokens[1]?.text ?? "";
    const value = tokens[3]?.text ?? "";
    const tree = [
        { label: "Variable declaration", x: 96, y: 146, w: 124 },
        { label: `Binding: ${name}`, x: 126, y: 178, w: Math.max(96, (9 + name.length) * 5.6 + 18) },
        { label: `Initial value: ${value}`, x: 156, y: 210, w: Math.max(100, (15 + value.length) * 5.6 + 18) },
    ];
    const steps = [
        { caption: `${engine} starts with source text: one string of characters, \`${source}\`.`, lit: ["source"], seen: 0, built: 0 },
        ...tokens.map((token, index) => ({
            caption: `The scanner reads \`${token.text}\` and emits ${token.kind === "identifier" ? "an" : "a"} ${token.kind} token.`,
            lit: ["scanner", "tokens"],
            seen: index + 1,
            built: 0,
        })),
        {
            caption: "The parser checks that the tokens form valid JavaScript and starts a tree: a variable declaration.",
            lit: ["parser", "ast"],
            seen: tokens.length,
            built: 1,
        },
        { caption: `Under it goes the binding, \`${name}\`.`, lit: ["parser", "ast"], seen: tokens.length, built: 2 },
        {
            caption: `Under the binding goes the initial value, \`${value}\`. The tree keeps the structure, not the formatting: the spaces are gone.`,
            lit: ["parser", "ast"],
            seen: tokens.length,
            built: 3,
        },
    ];
    const stepper = useStepper(steps.length);
    const step = stepper.index >= 0 ? steps[stepper.index] : null;
    const seen = step?.seen ?? tokens.length;
    const built = step?.built ?? 3;
    const scanning = step && step.seen > 0 && step.built === 0 ? tokens[step.seen - 1] : null;
    const lit: Lit = step
        ? {
              nodes: step.lit,
              wires: step.lit.includes("scanner") ? ["w1", "w2"] : step.lit.includes("parser") ? ["w3", "w4"] : [],
              tone: step.lit.includes("parser") ? "accent" : step.lit.includes("scanner") ? "task" : "strong",
          }
        : null;
    const sourceLeft = 180 - (source.length * charWidth) / 2;

    // Chips sit in one centred row, each as wide as its text.
    const chipWidths = tokens.map((token) => Math.max(24, token.text.length * 6.6 + 14));
    const rowWidth = chipWidths.reduce((sum, width) => sum + width, 0) + (tokens.length - 1) * 8;
    const chipXs = chipWidths.map(
        (_, index) => 180 - rowWidth / 2 + chipWidths.slice(0, index).reduce((sum, width) => sum + width + 8, 0),
    );

    return (
        <FigureFrame
            caption={
                <Note>
                    {step?.caption ??
                        `The scanner turns source into tokens, and the parser turns tokens into an abstract syntax tree. Press Play to watch \`${source}\` go through.`}
                </Note>
            }
            description={[
                `Source: ${source}`,
                `The scanner produces tokens: ${tokens.map((token) => `${token.text} (${token.kind})`).join(", ")}.`,
                `The parser builds a tree: a variable declaration, containing the binding ${name}, containing the initial value ${value}.`,
            ]}
            figcaption="Characters become tokens, and tokens become a tree that the rest of the engine can work with."
            stage={
                <Flow height={242} lit={lit} nodes={pipelineNodes} width={360} wires={pipelineWires}>
                    {scanning && (
                        <rect
                            className="gf-cursor"
                            height="22"
                            rx="3"
                            style={{ transform: `translate(${sourceLeft + scanning.start * charWidth - 2}px, 52px)` }}
                            width={scanning.text.length * charWidth + 4}
                        />
                    )}
                    {tokens.map((token) => (
                        <text className="gf-source" key={token.start} x={sourceLeft + token.start * charWidth} y="68">
                            {token.text}
                        </text>
                    ))}
                    {tokens.map((token, index) => {
                        const x = chipXs[index];
                        if (index >= seen) return null;
                        return (
                            <g className="gf-chip" data-kind={token.kind} key={token.start} style={{ transform: `translate(${x}px, 92px)` }}>
                                <rect height="20" rx="4" width={chipWidths[index]} />
                                <text className="gf-chip__text" textAnchor="middle" x={chipWidths[index] / 2} y="13.5">
                                    {token.text}
                                </text>
                                <text className="gf-chip__kind" textAnchor="middle" x={chipWidths[index] / 2} y="31">
                                    {token.kind}
                                </text>
                            </g>
                        );
                    })}
                    {tree.slice(0, built).map((node, index) => (
                        <g className="gf-tree" key={node.label}>
                            {index > 0 && (
                                <path
                                    className="gf-tree__edge"
                                    d={`M${tree[index - 1].x + 12} ${tree[index - 1].y + 22} V${node.y + 11} H${node.x}`}
                                />
                            )}
                            <rect height="22" rx="4" width={node.w} x={node.x} y={node.y} />
                            <text className="gf-tree__label" x={node.x + 9} y={node.y + 14.5}>
                                {node.label}
                            </text>
                        </g>
                    ))}
                </Flow>
            }
            stepper={stepper}
        />
    );
}
