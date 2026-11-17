import { useId, useState } from "react";
import { FigureFrame, FlowFigure, Note, useStepper, type FlowNode, type FlowStep, type FlowWire } from "./kit";
import { SlotsStage } from "./slots";

/*
 * Scope figures: a name lookup walking a scope chain, the TDZ, the error
 * kinds, and the binding fans of the var/let loop guide.
 */

type Binding = Readonly<{ name: string; value?: string }>;
type Env = Readonly<{ label: string; bindings: readonly Binding[] }>;
type Lookup = Readonly<{
    name: string;
    /** Source line (0-based) that reads the name, if the example has one. */
    line?: number;
    /** Index of the environment the lookup starts in; lookups never look inward. */
    from?: number;
    /** The picker's label, when two lookups share a name. */
    label?: string;
    /** Replaces the opening of the first caption. */
    intro?: string;
}>;

export type ScopeSpec = Readonly<{
    fileName: string;
    source: readonly string[];
    /** Nearest first; the last is the global scope. */
    envs: readonly Env[];
    /** A scope drawn beside the chain that the lookup never visits. */
    aside?: Env & Readonly<{ note: string }>;
    lookups: readonly Lookup[];
    overview: string;
    figcaption: string;
}>;

type ChainStep = Readonly<{
    caption: string;
    at: number | "fail";
    found: boolean;
    /** Environments the search has already left behind. */
    passed: readonly number[];
}>;

const has = (env: Env, name: string) => env.bindings.find((binding) => binding.name === name);

function lookupSteps(spec: ScopeSpec, lookup: Lookup): readonly ChainStep[] {
    const from = lookup.from ?? 0;
    const name = `\`${lookup.name}\``;
    const steps: ChainStep[] = [];
    const opening =
        lookup.intro ?? (lookup.line === undefined ? `Suppose the code reads ${name}. ` : `Line ${lookup.line + 1} reads ${name}. `);
    for (let index = from; index < spec.envs.length; index += 1) {
        const env = spec.envs[index];
        const binding = has(env, lookup.name);
        const start = index === from ? `${opening}JavaScript starts in ${env.label}. ` : "";
        const passed = Array.from({ length: index - from }, (_, offset) => from + offset);
        if (binding) {
            const shadowed = spec.envs.slice(index + 1).find((outer) => has(outer, lookup.name));
            steps.push({
                at: index,
                found: true,
                passed,
                caption:
                    `${start}${name} is in ${env.label}${binding.value ? `, holding \`${binding.value}\`` : ""}. The search stops here.` +
                    (shadowed ? ` The ${name} in ${shadowed.label} is never reached: this one shadows it.` : ""),
            });
            return steps;
        }
        steps.push({
            at: index,
            found: false,
            passed,
            caption:
                index === from
                    ? `${start}It has no ${name}, so the search follows the outer link.`
                    : `Is ${name} in ${env.label}? No, so the search follows the outer link.`,
        });
    }
    const aside = spec.aside && has(spec.aside, lookup.name) ? ` ${spec.aside.label} has a ${name}, but it is not on this chain.` : "";
    steps[steps.length - 1] = {
        ...steps[steps.length - 1],
        caption: steps[steps.length - 1].caption.replace(
            "so the search follows the outer link.",
            "and there is nowhere left to look.",
        ),
    };
    steps.push({
        at: "fail",
        found: false,
        passed: spec.envs.map((_, index) => index).slice(from),
        caption: `No scope on the chain has ${name}, so JavaScript throws a ReferenceError.${aside}`,
    });
    return steps;
}

/* Layout: a column of environment cards joined by "outer" arrows, the search token in the left gutter. */
const cardX = 50;
const cardW = 196;
const chipH = 18;
const gap = 26;

function chipWidth(binding: Binding) {
    return (binding.name.length + (binding.value ? binding.value.length + 3 : 0)) * 5.5 + 14;
}

function cardRows(env: Env, width: number): readonly (readonly Binding[])[] {
    const rows: Binding[][] = [[]];
    let used = 0;
    for (const binding of env.bindings) {
        const width_ = chipWidth(binding) + 6;
        if (used + width_ > width - 12 && rows[rows.length - 1].length > 0) {
            rows.push([]);
            used = 0;
        }
        rows[rows.length - 1].push(binding);
        used += width_;
    }
    return rows;
}

function cardHeight(env: Env, width: number) {
    return 24 + Math.max(1, cardRows(env, width).length) * (chipH + 4) + 4;
}

function EnvCard({
    env,
    x,
    y,
    width,
    state,
    note,
    highlight,
}: Readonly<{ env: Env; x: number; y: number; width: number; state?: string; note?: string; highlight?: string }>) {
    const rows = cardRows(env, width);
    return (
        <g className="gf-env" data-state={state}>
            <rect height={cardHeight(env, width)} rx="5" width={width} x={x} y={y} />
            <line x1={x} x2={x + width} y1={y + 16.5} y2={y + 16.5} />
            <text className="gf-group__label" x={x + 7} y={y + 11.5}>
                {env.label}
            </text>
            {note && state !== "aside" && (
                <text className="gf-env__note" textAnchor="end" x={x + width - 7} y={y + 11.5}>
                    {note}
                </text>
            )}
            {note && state === "aside" && (
                <text className="gf-env__note" x={x + 2} y={y + cardHeight(env, width) + 11}>
                    {note}
                </text>
            )}
            {env.bindings.length === 0 && (
                <text className="gf-env__empty" x={x + 9} y={y + 36}>
                    no local bindings
                </text>
            )}
            {rows.map((row, rowIndex) =>
                row.map((binding, index) => {
                    const left = x + 8 + row.slice(0, index).reduce((sum, other) => sum + chipWidth(other) + 6, 0);
                    return (
                        <g
                            className="gf-binding"
                            data-hit={highlight === binding.name ? "" : undefined}
                            key={binding.name}
                            transform={`translate(${left} ${y + 23 + rowIndex * (chipH + 4)})`}
                        >
                            <rect height={chipH} rx="3" width={chipWidth(binding)} />
                            <text x="7" y="12.4">
                                {binding.name}
                                {binding.value && <tspan className="gf-binding__value"> = {binding.value}</tspan>}
                            </text>
                        </g>
                    );
                }),
            )}
        </g>
    );
}

function ScopeChainBody({ spec, pick, onPick }: Readonly<{ spec: ScopeSpec; pick: number; onPick: (index: number) => void }>) {
    const lookup = spec.lookups[pick];
    const steps = lookupSteps(spec, lookup);
    const stepper = useStepper(steps.length);
    const step = stepper.index >= 0 ? steps[stepper.index] : null;
    const from = lookup.from ?? 0;

    const line = step && lookup.line !== undefined ? lookup.line : null;

    const envState = (index: number) => {
        if (!step) return undefined;
        if (index < from) return "skip";
        if (step.at === index) return step.found ? "found" : "on";
        if (step.passed.includes(index)) return "passed";
        return "off";
    };
    const notes: Record<string, string> = { skip: "not searched", passed: `no ${lookup.name}`, found: "found", on: "checking…" };
    const envNote = (index: number) => notes[envState(index) ?? ""];

    return (
        <FigureFrame
            caption={<Note>{step?.caption ?? spec.overview}</Note>}
            description={[
                `Scope chain, nearest first: ${spec.envs
                    .map((env) => `${env.label}${env.bindings.length ? ` (${env.bindings.map((b) => (b.value ? `${b.name} = ${b.value}` : b.name)).join(", ")})` : ""}`)
                    .join(", then ")}.`,
                ...(spec.aside ? [`${spec.aside.label} is not on the chain.`] : []),
            ]}
            figcaption={spec.figcaption}
            panels={
                <div className="el-figure__panels gf-panels--single">
                    <div className="el-code">
                        <div className="el-panel__bar">
                            <span>{spec.fileName}</span>
                        </div>
                        <ol className="el-code__lines">
                            {spec.source.map((text, index) => (
                                <li
                                    className="el-code__line"
                                    data-active={line === index ? "" : undefined}
                                    data-kind="task"
                                    // A fixed listing: the line number is its identity.
                                    key={index}
                                >
                                    <span className="el-code__number">{index + 1}</span>
                                    <span className="el-code__text">{text || " "}</span>
                                </li>
                            ))}
                        </ol>
                    </div>
                </div>
            }
            stage={
                <>
                    <ChainDrawing envNote={envNote} envState={envState} from={from} layout="wide" lookup={lookup} spec={spec} step={step} />
                    <ChainDrawing envNote={envNote} envState={envState} from={from} layout="narrow" lookup={lookup} spec={spec} step={step} />
                </>
            }
            stepper={stepper}
            tools={
                spec.lookups.length > 1 ? (
                    <div aria-label="Look up a name" className="el-controls__group el-segmented" role="group">
                        {spec.lookups.map((option, index) => (
                            <button
                                aria-pressed={index === pick}
                                className="el-button"
                                key={option.label ?? option.name}
                                onClick={() => onPick(index)}
                                type="button"
                            >
                                {option.label ?? option.name}
                            </button>
                        ))}
                    </div>
                ) : undefined
            }
        />
    );
}

/**
 * The chain itself. The wide drawing puts an off-chain scope beside the
 * chain; the phone drawing puts it below and crops the view to the chain,
 * so on a phone everything renders about 1.4 times larger.
 */
function ChainDrawing({
    spec,
    lookup,
    step,
    from,
    envState,
    envNote,
    layout,
}: Readonly<{
    spec: ScopeSpec;
    lookup: Lookup;
    step: ChainStep | null;
    from: number;
    envState: (index: number) => string | undefined;
    envNote: (index: number) => string | undefined;
    layout: "wide" | "narrow";
}>) {
    const marker = `gf-arrow-${useId().replace(/:/g, "")}`;
    const tops: number[] = [];
    let y = 6;
    for (const env of spec.envs) {
        tops.push(y);
        y += cardHeight(env, cardW) + gap;
    }
    const failY = y - gap + 22;
    // Room for the ReferenceError row only when some lookup in this figure fails, so switching lookups never resizes it.
    const canFail = spec.lookups.some((option) => !spec.envs.slice(option.from ?? 0).some((env) => has(env, option.name)));
    const chainBottom = canFail ? failY + 30 : y - gap + 8;
    const asideBelow = layout === "narrow" && spec.aside;
    const asideY = asideBelow ? chainBottom + 10 : tops[Math.min(1, spec.envs.length - 1)];
    const height = asideBelow && spec.aside ? asideY + cardHeight(spec.aside, cardW) + 22 : chainBottom;
    const width = layout === "narrow" ? cardX + cardW + 6 : 360;
    const tokenY = step ? (step.at === "fail" ? failY + 4 : tops[step.at] + cardHeight(spec.envs[step.at], cardW) / 2 - 9) : 0;
    return (
        <svg aria-hidden="true" className={`gf-flow gf-chain gf-${layout}`} viewBox={`0 0 ${width} ${height}`}>
            <defs>
                <marker id={marker} markerHeight="6" markerWidth="6" orient="auto-start-reverse" refX="5" refY="3" viewBox="0 0 6 6">
                    <path className="gf-arrow" d="M0.5 0.8 5 3 0.5 5.2" />
                </marker>
            </defs>
            {spec.envs.map((env, index) => {
                if (index === spec.envs.length - 1) return null;
                const bottom = tops[index] + cardHeight(env, cardW);
                const traversed = step && (step.passed.includes(index) || (step.at === "fail" && index >= from)) && index >= from;
                return (
                    <g className="gf-wire" data-state={step ? (traversed ? "on" : "off") : undefined} data-tone="task" key={env.label}>
                        <path d={`M${cardX + 30} ${bottom} V${tops[index + 1] - 2}`} markerEnd={`url(#${marker})`} />
                        <text className="gf-wire__label" x={cardX + 37} y={bottom + gap / 2 + 3}>
                            outer
                        </text>
                    </g>
                );
            })}
            {spec.envs.map((env, index) => (
                <EnvCard
                    env={env}
                    highlight={step && step.at === index && step.found ? lookup.name : undefined}
                    key={env.label}
                    note={envNote(index)}
                    state={envState(index)}
                    width={cardW}
                    x={cardX}
                    y={tops[index]}
                />
            ))}
            {spec.aside && (
                <EnvCard
                    env={spec.aside}
                    note={spec.aside.note}
                    state="aside"
                    width={asideBelow ? cardW : 104}
                    x={asideBelow ? cardX : 252}
                    y={asideY}
                />
            )}
            {step?.at === "fail" && (
                <g className="gf-node" data-state="on" data-tone="accent" data-variant="ghost">
                    <rect height="26" rx="5" width={cardW} x={cardX} y={failY} />
                    <text className="gf-node__label" textAnchor="middle" x={cardX + cardW / 2} y={failY + 16}>
                        ReferenceError
                    </text>
                </g>
            )}
            {step && (
                <g
                    className="gf-token"
                    data-fail={step.at === "fail" ? "" : undefined}
                    data-found={step.found ? "" : undefined}
                    style={{ transform: `translate(4px, ${tokenY}px)` }}
                >
                    <rect height="18" rx="9" width="40" />
                    <text textAnchor="middle" x="20" y="12.4">
                        {lookup.name.length > 5 ? `${lookup.name.slice(0, 4)}…` : lookup.name}
                        {step.found ? " ✓" : step.at === "fail" ? " ✗" : "?"}
                    </text>
                </g>
            )}
        </svg>
    );
}

export function ScopeChainFigure({ spec }: Readonly<{ spec: ScopeSpec }>) {
    const [pick, setPick] = useState(0);
    // Picking another name starts its lookup fresh.
    return <ScopeChainBody key={pick} onPick={setPick} pick={pick} spec={spec} />;
}

const global = (bindings: readonly Binding[]): Env => ({ label: "global scope", bindings });

export const scopeSpecs = {
    "scope-inner-outer": {
        fileName: "scope.js",
        source: [
            'let globalVar = "I am global";',
            "",
            "function outerFunction() {",
            '    let outerVar = "I am in outerFunction";',
            "",
            "    function innerFunction() {",
            '        let innerVar = "I am in innerFunction";',
            "        console.log(globalVar);",
            "        console.log(outerVar);",
            "        console.log(innerVar);",
            "    }",
            "",
            "    innerFunction();",
            "}",
            "",
            "outerFunction();",
        ],
        envs: [
            { label: "innerFunction scope", bindings: [{ name: "innerVar" }] },
            { label: "outerFunction scope", bindings: [{ name: "outerVar" }, { name: "innerFunction" }] },
            global([{ name: "globalVar" }, { name: "outerFunction" }]),
        ],
        lookups: [
            { name: "globalVar", line: 7 },
            { name: "outerVar", line: 8 },
            { name: "innerVar", line: 9 },
        ],
        overview: "innerFunction can search outward through outerFunction to the global scope. Pick a name and press Play to watch the search.",
        figcaption: "A lookup starts in the current scope and moves outward one link at a time.",
    },
    "scope-first-second": {
        fileName: "chain.js",
        source: [
            'let globalVar = "global";',
            "",
            "function firstFunction() {",
            '    let firstVar = "first";',
            "",
            "    function secondFunction() {",
            '        let secondVar = "second";',
            "",
            "        console.log(globalVar);",
            "        console.log(firstVar);",
            "        console.log(secondVar);",
            "    }",
            "",
            "    secondFunction();",
            "}",
            "",
            "firstFunction();",
        ],
        envs: [
            { label: "secondFunction environment", bindings: [{ name: "secondVar", value: '"second"' }] },
            { label: "firstFunction environment", bindings: [{ name: "firstVar", value: '"first"' }] },
            { label: "global environment", bindings: [{ name: "globalVar", value: '"global"' }] },
        ],
        lookups: [
            { name: "globalVar", line: 8 },
            { name: "firstVar", line: 9 },
            { name: "secondVar", line: 10 },
        ],
        overview: "Each environment holds its own bindings and a link to the one outside it. Pick a name and press Play to follow the links.",
        figcaption: "Every environment record links to its outer environment. The links form the scope chain.",
    },
    "scope-route": {
        fileName: "counter.js",
        source: [
            "function createCounter() {",
            "    let count = 0;",
            "",
            "    return function increment() {",
            "        count += 1;",
            "        return count;",
            "    };",
            "}",
            "",
            "const counter = createCounter();",
            "",
            "console.log(counter()); // 1",
            "console.log(counter()); // 2",
        ],
        envs: [
            { label: "current scope: increment", bindings: [] },
            { label: "outer function scope", bindings: [{ name: "count", value: "0" }] },
            global([{ name: "createCounter" }, { name: "counter" }]),
        ],
        lookups: [
            { name: "count", line: 4 },
            { name: "total", intro: "Suppose increment read `total`, which no scope declares. " },
        ],
        overview: "Current scope, outer function scope, global scope, stop. Pick a name and press Play to draw the route.",
        figcaption: "The lookup route: current scope, then each outer scope, then global, then stop.",
    },
    "block-outer": {
        fileName: "block.js",
        source: ['const outside = "outer";', "", "{", '    const inside = "inner";', "    console.log(outside, inside);", "}"],
        envs: [
            { label: "block environment", bindings: [{ name: "inside", value: '"inner"' }] },
            { label: "outer environment", bindings: [{ name: "outside", value: '"outer"' }] },
        ],
        lookups: [
            { name: "inside", line: 4 },
            { name: "outside", line: 4 },
        ],
        overview: "The block environment holds `inside` and links to the environment holding `outside`. Press Play to look outward.",
        figcaption: "That outer link is why code inside a block can read names declared outside it.",
    },
    "block-shadowing": {
        fileName: "shadow.js",
        source: [
            "let b = 100;",
            "const c = 100;",
            "",
            "{",
            "    let b = 20;",
            "    const c = 30;",
            "",
            "    console.log(b); // 20",
            "    console.log(c); // 30",
            "}",
            "",
            "console.log(b); // 100",
            "console.log(c); // 100",
        ],
        envs: [
            { label: "inner block", bindings: [{ name: "b", value: "20" }, { name: "c", value: "30" }] },
            { label: "outer scope", bindings: [{ name: "b", value: "100" }, { name: "c", value: "100" }] },
        ],
        lookups: [
            { name: "b", line: 7, label: "b inside" },
            { name: "c", line: 8, label: "c inside" },
            { name: "b", line: 11, from: 1, label: "b outside" },
            { name: "c", line: 12, from: 1, label: "c outside" },
        ],
        overview: "Four different bindings: `b` and `c` in the outer scope, and another `b` and `c` in the inner block. Pick a read and press Play.",
        figcaption: "The nearest binding wins. Outside the block, the search starts outside it and never looks in.",
    },
    "block-no-inward": {
        fileName: "nested.js",
        source: ["{", "    console.log(secret); // ReferenceError", "", "    {", '        const secret = "inside";', "    }", "}"],
        envs: [
            { label: "current scope: outer block", bindings: [] },
            global([]),
        ],
        aside: { label: "nested block", bindings: [{ name: "secret" }], note: "never searched" },
        lookups: [{ name: "secret", line: 1 }],
        overview: "`secret` lives in a nested block. Press Play to see why the outer block cannot reach it.",
        figcaption: "Current scope, outer scope, next outer scope, global scope. The route only ever goes outward.",
    },
    "backpack-nested": {
        fileName: "closure.js",
        source: ["function x() {", "    const a = 7;", "", "    function y() {", "        console.log(a);", "    }", "", "    y();", "}", "", "x(); // 7"],
        envs: [
            { label: "y's local scope", bindings: [] },
            { label: "x's local scope", bindings: [{ name: "a", value: "7" }, { name: "y" }] },
            global([{ name: "x" }]),
        ],
        lookups: [{ name: "a", line: 4 }],
        overview: "`y` was created inside `x`, so its scope chain runs through `x`. Press Play to find `a`.",
        figcaption: "The chain follows where y was written, inside x.",
    },
    "backpack-global": {
        fileName: "callback.js",
        source: [
            "function x(callback) {",
            "    const a = 7;",
            "    callback();",
            "}",
            "",
            "function y() {",
            "    console.log(a);",
            "}",
            "",
            "x(y); // ReferenceError: a is not defined",
        ],
        envs: [
            { label: "y's local scope", bindings: [] },
            global([{ name: "x" }, { name: "y" }]),
        ],
        aside: { label: "x's local scope", bindings: [{ name: "a", value: "7" }], note: "not on y's chain" },
        lookups: [{ name: "a", line: 6 }],
        overview: "`x` calls `y` while `a` exists, but `y` was written in the global scope. Press Play to search for `a`.",
        figcaption: "Where a function is called does not matter. Where it was written does.",
    },
    "backpack-three": {
        fileName: "levels.js",
        source: [
            "function z() {",
            "    const b = 900;",
            "",
            "    function x() {",
            "        const a = 7;",
            "",
            "        function y() {",
            "            console.log(a, b);",
            "        }",
            "",
            "        y();",
            "    }",
            "",
            "    x();",
            "}",
            "",
            "z(); // 7 900",
        ],
        envs: [
            { label: "y's local scope", bindings: [] },
            { label: "x's scope", bindings: [{ name: "a", value: "7" }, { name: "y" }] },
            { label: "z's scope", bindings: [{ name: "b", value: "900" }, { name: "x" }] },
            global([{ name: "z" }]),
        ],
        lookups: [
            { name: "a", line: 7 },
            { name: "b", line: 7 },
        ],
        overview: "`y` sits two functions deep, so its chain has two outer function scopes. Pick `a` or `b` and press Play.",
        figcaption: "A closure can reach every scope it was written inside, not only the nearest one.",
    },
    "closures-outest": {
        fileName: "outest.js",
        source: [
            "function outest() {",
            "    const c = 20;",
            "",
            "    function outer(b) {",
            "        const a = 10;",
            "",
            "        function inner() {",
            "            console.log(a, b, c);",
            "        }",
            "",
            "        return inner;",
            "    }",
            "",
            "    return outer;",
            "}",
            "",
            'const close = outest()("Hello");',
            'close(); // 10 "Hello" 20',
        ],
        envs: [
            { label: "inner's local environment", bindings: [] },
            { label: "outer's environment", bindings: [{ name: "a", value: "10" }, { name: "b", value: '"Hello"' }, { name: "inner" }] },
            { label: "outest's environment", bindings: [{ name: "c", value: "20" }, { name: "outer" }] },
            { label: "global environment", bindings: [{ name: "outest" }, { name: "close" }] },
        ],
        lookups: [
            { name: "a", line: 7 },
            { name: "b", line: 7 },
            { name: "c", line: 7 },
        ],
        overview: "`inner` runs long after `outest` and `outer` returned, but their environments are still reachable. Pick a name and press Play.",
        figcaption: "Nearest to farthest: inner, outer, outest, global. Each environment stays alive while a closure can reach it.",
    },
} as const satisfies Record<string, ScopeSpec>;

export function EnvironmentAnatomyFigure() {
    const nodes: FlowNode[] = [
        { id: "env", x: 70, y: 8, w: 220, h: 18, label: "Current lexical environment", variant: "group" },
        { id: "record", x: 82, y: 32, w: 196, h: 34, label: "local bindings", sub: ['"Do I have this name?"'], tone: "task" },
        { id: "link", x: 82, y: 72, w: 196, h: 34, label: "link to outer environment", sub: ['"Where do I look next?"'], tone: "accent" },
        { id: "outer", x: 70, y: 138, w: 220, h: 30, label: "outer lexical environment", variant: "ghost" },
    ];
    nodes[0] = { ...nodes[0], h: 104 };
    const wires: FlowWire[] = [{ id: "next", d: "M180 106 V136", tone: "accent" }];
    const steps: FlowStep[] = [
        { caption: "The first part is a record of the bindings available here. It answers, \"Do I have this name?\"", lit: { nodes: ["env", "record"], wires: [], tone: "task" } },
        { caption: "The second part is a link to the surrounding environment. It answers, \"If I do not, where should I look next?\"", lit: { nodes: ["env", "link"], wires: [], tone: "accent" } },
        { caption: "Following that link reaches the outer environment, which has its own record and its own link.", lit: { nodes: ["link", "outer"], wires: ["next"], tone: "accent" } },
    ];
    return (
        <FlowFigure
            description={["Current lexical environment: local bindings, and a link to the outer lexical environment."]}
            figcaption="Two parts: a record of bindings, and a link outward."
            height={176}
            nodes={nodes}
            overview="A lexical environment has two parts. Press Play to see what each one answers."
            steps={steps}
            width={360}
            wires={wires}
        />
    );
}

type Slot = "undefined" | "uninitialized" | string;
type TdzStep = Readonly<{ caption: string; line: number | null; slots: readonly [Slot, Slot, Slot] }>;

const tdzSource = ["var score = 10;", 'let message = "Hello";', "const limit = 10;"];
const tdzNames = ["score", "message", "limit"] as const;
const tdzKeywords = ["var", "let", "const"] as const;
const tdzSteps: readonly TdzStep[] = [
    {
        caption: "Before any line runs, JavaScript creates all three bindings. `var` initializes `score` to `undefined`. `let` and `const` leave theirs uninitialized.",
        line: null,
        slots: ["undefined", "uninitialized", "uninitialized"],
    },
    { caption: "`var score = 10` assigns `10` to the binding that already existed.", line: 0, slots: ["10", "uninitialized", "uninitialized"] },
    { caption: "Evaluating the `let` declaration initializes `message`. Its Temporal Dead Zone ends here.", line: 1, slots: ["10", '"Hello"', "uninitialized"] },
    { caption: "The same happens for `const limit`. Now every binding can be read.", line: 2, slots: ["10", '"Hello"', "10"] },
];

function readResult(name: string, slot: Slot) {
    if (slot === "uninitialized") return `ReferenceError: Cannot access '${name}' before initialization`;
    return slot;
}

export function TdzFigure() {
    const stepper = useStepper(tdzSteps.length);
    const [read, setRead] = useState<number | null>(null);
    const step = stepper.index >= 0 ? tdzSteps[stepper.index] : tdzSteps[0];
    return (
        <FigureFrame
            caption={
                <Note>
                    {stepper.index >= 0
                        ? tdzSteps[stepper.index].caption
                        : "All three keywords create their binding when the scope starts, but only `var` initializes it early. Press Play, and try reading a binding at any step."}
                </Note>
            }
            description={[
                "var: binding created and initialized to undefined.",
                "let: binding created but uninitialized.",
                "const: binding created but uninitialized.",
            ]}
            figcaption="The binding exists from the start of the scope. What differs is when it becomes readable."
            panels={
                <div className="el-figure__panels">
                    <div className="el-code">
                        <div className="el-panel__bar">
                            <span>scope.js</span>
                        </div>
                        <ol className="el-code__lines">
                            {tdzSource.map((text, index) => (
                                <li
                                    className="el-code__line"
                                    data-active={stepper.index >= 0 && step.line === index ? "" : undefined}
                                    // A fixed listing: the line number is its identity.
                                    key={index}
                                >
                                    <span className="el-code__number">{index + 1}</span>
                                    <span className="el-code__text">{text}</span>
                                </li>
                            ))}
                        </ol>
                    </div>
                    <div className="el-console">
                        <div className="el-panel__bar">
                            <span>console</span>
                        </div>
                        <ol className="el-console__lines gf-console">
                            {read !== null && (
                                <li className="el-console__line" data-kind={step.slots[read] === "uninitialized" ? "micro" : undefined} key={`${read}-${stepper.index}`}>
                                    {readResult(tdzNames[read], step.slots[read])}
                                </li>
                            )}
                        </ol>
                    </div>
                </div>
            }
            stage={<SlotsStage highlight={read} names={tdzNames} tags={tdzKeywords} title="bindings in this scope" values={step.slots} />}
            stepper={stepper}
            tools={
                <div aria-label="Read a binding" className="el-controls__group el-segmented" role="group">
                    {tdzNames.map((name, index) => (
                        <button aria-pressed={read === index} className="el-button" key={name} onClick={() => setRead(index)} type="button">
                            read {name}
                        </button>
                    ))}
                </div>
            }
        />
    );
}

export function ErrorKindsFigure() {
    const nodes: FlowNode[] = [
        { id: "code", x: 8, y: 50, w: 156, h: 44, label: "which error?", sub: ["each step tries a snippet"] },
        { id: "syntax", x: 200, y: 4, w: 152, h: 42, label: "SyntaxError", sub: ["the declaration", "arrangement is invalid"], tone: "accent" },
        { id: "reference", x: 200, y: 51, w: 152, h: 42, label: "ReferenceError", sub: ["the name cannot be", "accessed here"], tone: "accent" },
        { id: "type", x: 200, y: 98, w: 152, h: 42, label: "TypeError", sub: ["the attempted operation", "is not allowed"], tone: "accent" },
    ];
    const wires: FlowWire[] = [
        { id: "to-syntax", d: "M164 66 H174 Q182 66 182 58 V35 Q182 27 190 27 H198", tone: "accent" },
        { id: "to-reference", d: "M164 72 H198", tone: "accent" },
        { id: "to-type", d: "M164 78 H174 Q182 78 182 86 V109 Q182 117 190 117 H198", tone: "accent" },
    ];
    const snippet = (first: string, second: string) => ({ code: { label: first, sub: [second] } });
    const steps: FlowStep[] = [
        {
            caption: "Two `let` declarations of `count` in one scope cannot be parsed as valid code. The error comes before anything runs.",
            lit: { nodes: ["code", "syntax"], wires: ["to-syntax"], tone: "accent" },
            patch: snippet("let count = 1;", "let count = 2;"),
        },
        {
            caption: "The binding `message` exists, but it is still in its TDZ, so the name cannot be accessed here.",
            lit: { nodes: ["code", "reference"], wires: ["to-reference"], tone: "accent" },
            patch: snippet("console.log(message);", 'let message = "Hello";'),
        },
        {
            caption: "The declaration is valid, but assigning to a constant binding is not allowed.",
            lit: { nodes: ["code", "type"], wires: ["to-type"], tone: "accent" },
            patch: snippet("const price = 100;", "price = 200;"),
        },
    ];
    return (
        <FlowFigure
            description={[
                "SyntaxError: the declaration arrangement is invalid.",
                "ReferenceError: the name cannot be accessed here.",
                "TypeError: the attempted operation is not allowed.",
            ]}
            figcaption="The error type tells you which rule was broken."
            height={144}
            nodes={nodes}
            overview="Three error types, three different broken rules. Press Play to try a snippet for each."
            steps={steps}
            width={360}
            wires={wires}
        />
    );
}

type FanKind = "var" | "let" | "close";

const fanText: Record<FanKind, Readonly<{ env: (k: number) => string; name: string; step: (k: number) => string; last: string; overview: string; figcaption: string }>> = {
    var: {
        env: () => "x environment",
        name: "i",
        step: (k) => `Iteration ${k}: the loop sets the one \`i\` binding to ${k} and creates callback ${k}, which closes over that same binding.`,
        last: "`i++` makes `i` 6, and `6 <= 5` is false, so the loop stops. Five callbacks, one binding, and it holds 6.",
        overview: "`var` gives the whole loop one `i` binding. Press Play to watch every callback close over it.",
        figcaption: "One labeled slot, five callbacks reaching it.",
    },
    let: {
        env: (k) => `iteration ${k} environment`,
        name: "i",
        step: (k) => `Iteration ${k} gets a fresh binding, \`i\` = ${k}, and callback ${k} closes over that binding.`,
        last: "Five iterations, five bindings. When the callbacks run, each reads its own: 1 through 5.",
        overview: "With `let`, each iteration gets its own `i` binding. Press Play to watch the bindings appear.",
        figcaption: "A different binding for each iteration, and each callback reaches its own.",
    },
    close: {
        env: (k) => `close call ${k}`,
        name: "x",
        step: (k) => `Call ${k} to \`close\` creates a fresh parameter binding, \`x\` = ${k}, and callback ${k} closes over it.`,
        last: "Five calls, five `x` bindings. Renaming the variable changed nothing. Creating a new binding did.",
        overview: "Each call to `close` gets its own parameter binding. Press Play to watch the calls.",
        figcaption: "A function call is another way to make a fresh binding.",
    },
};

export function BindingFanFigure({ kind }: Readonly<{ kind: FanKind }>) {
    const text = fanText[kind];
    const shared = kind === "var";
    const stepper = useStepper(6);
    const made = stepper.index < 0 ? 5 : Math.min(5, stepper.index + 1);
    const done = stepper.index < 0 || stepper.index === 5;
    const rowY = (k: number) => 8 + (k - 1) * 30;
    const sharedValue = done ? 6 : made;
    return (
        <FigureFrame
            caption={<Note>{stepper.index < 0 ? text.overview : stepper.index === 5 ? text.last : text.step(made)}</Note>}
            description={
                shared
                    ? ["x environment holds one i binding. Callbacks 1 to 5 all close over it."]
                    : [1, 2, 3, 4, 5].map((k) => `${text.env(k)}: ${text.name} = ${k}, closed over by callback ${k}.`)
            }
            figcaption={text.figcaption}
            stage={
                <svg aria-hidden="true" className="gf-flow" viewBox="0 0 360 154">
                    <defs>
                        <marker id={`gf-arrow-fan-${kind}`} markerHeight="6" markerWidth="6" orient="auto-start-reverse" refX="5" refY="3" viewBox="0 0 6 6">
                            <path className="gf-arrow" d="M0.5 0.8 5 3 0.5 5.2" />
                        </marker>
                    </defs>
                    {shared ? (
                        <g className="gf-node" data-state={stepper.index >= 0 ? "on" : undefined} data-tone="task">
                            <rect height="42" rx="5" width="150" x="8" y={rowY(3) - 8} />
                            <text className="gf-group__label" x="16" y={rowY(3) + 4}>
                                x environment
                            </text>
                            <text className="gf-node__label" key={sharedValue} x="16" y={rowY(3) + 22}>
                                i = {sharedValue}
                            </text>
                        </g>
                    ) : (
                        [1, 2, 3, 4, 5].slice(0, made).map((k) => (
                            <g className="gf-node gf-fan__env" data-state={stepper.index >= 0 && k === made && !done ? "on" : undefined} data-tone="task" key={k}>
                                <rect height="24" rx="4" width="200" x="8" y={rowY(k)} />
                                <text className="gf-node__sub" x="16" y={rowY(k) + 15.5}>
                                    {text.env(k)}
                                </text>
                                <text className="gf-node__label" textAnchor="end" x="200" y={rowY(k) + 15.5}>
                                    {text.name} = {k}
                                </text>
                            </g>
                        ))
                    )}
                    {[1, 2, 3, 4, 5].slice(0, made).map((k) => {
                        const y = rowY(k) + 12;
                        const target = shared ? `M250 ${y} C214 ${y} 196 ${rowY(3) + 13} 160 ${rowY(3) + 13}` : `M250 ${y} H210`;
                        const current = stepper.index >= 0 && k === made && !done;
                        return (
                            <g className="gf-fan__callback" key={k}>
                                <g className="gf-wire" data-state={current ? "on" : undefined} data-tone="task">
                                    <path d={target} markerEnd={`url(#gf-arrow-fan-${kind})`} />
                                </g>
                                <g className="gf-node" data-state={current ? "on" : undefined} data-tone="task">
                                    <rect height="24" rx="12" width="96" x="252" y={rowY(k)} />
                                    <text className="gf-node__label" textAnchor="middle" x="300" y={rowY(k) + 15.5}>
                                        callback {k}
                                    </text>
                                </g>
                            </g>
                        );
                    })}
                </svg>
            }
            stepper={stepper}
        />
    );
}
