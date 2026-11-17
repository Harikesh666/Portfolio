import type { ReactNode } from "react";
import { FigureFrame, Note, useStepper } from "./kit";

/* "How a JavaScript Engine Runs Your Code" (how-javascript-engine-runs-code.mdx). */

const addSource = ["function add(left, right) {", "    return left + right;", "}", "", "console.log(add(2, 3));"];

const addTokens = ["function", "add", "(", "left", ",", "right", ")", "{", "return", "left", "+", "right", ";", "}"];

type Stage = Readonly<{ label: string; caption: string; artifact: ReactNode; note?: string }>;

const stages: readonly Stage[] = [
    {
        label: "Source code",
        caption: "The engine receives source code: text that follows the rules of JavaScript but means nothing to the processor yet.",
        artifact: (
            <pre className="gf-artifact__code">
                {addSource.map((line, index) => (
                    // A fixed listing: the line number is its identity.
                    <span key={index}>{line || " "}</span>
                ))}
            </pre>
        ),
    },
    {
        label: "Tokens and syntax structures",
        caption: "It splits the text into tokens, then checks their structure: a function declaration whose body returns `left + right`.",
        artifact: (
            <>
                <div className="gf-artifact__tokens">
                    {addTokens.map((token, index) => (
                        // A fixed list: position is identity.
                        <span className="gf-artifact__token" key={index}>
                            {token}
                        </span>
                    ))}
                </div>
                <pre className="gf-artifact__code gf-artifact__code--tree">
                    <span>Function declaration: add</span>
                    <span>├── Parameters: left, right</span>
                    <span>└── Return</span>
                    <span>    └── left + right</span>
                </pre>
            </>
        ),
    },
    {
        label: "Bytecode",
        caption: "The engine compiles that structure into bytecode: compact, engine-specific instructions that an interpreter can execute.",
        note: "V8-style bytecode for add, simplified",
        artifact: (
            <pre className="gf-artifact__code">
                <span>
                    Ldar a1 <i>load right</i>
                </span>
                <span>
                    Add a0, [0] <i>add left, feedback slot 0</i>
                </span>
                <span>
                    Return <i>return the sum</i>
                </span>
            </pre>
        ),
    },
    {
        label: "Execution and runtime feedback",
        caption: "The interpreter runs the bytecode. `add(2, 3)` returns `5`, and the engine notes what it saw: both operands were small integers.",
        artifact: (
            <dl className="gf-artifact__facts">
                <div>
                    <dt>call</dt>
                    <dd>add(2, 3) → 5</dd>
                </div>
                <div>
                    <dt>feedback slot 0</dt>
                    <dd>small integer + small integer</dd>
                </div>
                <div>
                    <dt>calls so far</dt>
                    <dd>many, so add is hot</dd>
                </div>
            </dl>
        ),
    },
    {
        label: "Specialized machine code",
        caption: "For a useful hot path, the engine generates machine code that the CPU runs directly, specialized for small integers. Anything else falls back.",
        note: "what the machine code does, as pseudo-code",
        artifact: (
            <pre className="gf-artifact__code">
                <span>
                    check left is a small integer <i>else deoptimize</i>
                </span>
                <span>
                    check right is a small integer <i>else deoptimize</i>
                </span>
                <span>
                    add left, right <i>on overflow, deoptimize</i>
                </span>
                <span>return the sum</span>
            </pre>
        ),
    },
];

export function JourneyFigure() {
    const stepper = useStepper(stages.length);
    const current = stepper.index;
    const shown = stages[Math.max(0, current)];
    return (
        <FigureFrame
            caption={
                <Note>
                    {current >= 0
                        ? stages[current].caption
                        : "Source code goes through several representations before hot code becomes machine code. Press Play to follow `add` all the way down."}
                </Note>
            }
            description={stages.map((stage, index) => `${index + 1}. ${stage.label}`)}
            figcaption="The same function at each stage of the journey. The exact pipeline differs between engines, and not every function takes the same route."
            stage={
                <div className="gf-journey">
                    <ol className="gf-journey__rail">
                        {stages.map((stage, index) => (
                            <li
                                className="gf-journey__stage"
                                data-state={current < 0 ? undefined : index === current ? "on" : index < current ? "done" : "off"}
                                key={stage.label}
                            >
                                <span className="gf-journey__dot">{index + 1}</span>
                                {stage.label}
                            </li>
                        ))}
                    </ol>
                    <div className="gf-artifact" key={shown.label}>
                        <p className="gf-artifact__bar">{shown.note ?? shown.label.toLowerCase()}</p>
                        {shown.artifact}
                    </div>
                </div>
            }
            stepper={stepper}
        />
    );
}

const stackSource = [
    "function multiply(left, right) {",
    "    return left * right;",
    "}",
    "",
    "function area(width, height) {",
    "    return multiply(width, height);",
    "}",
    "",
    "console.log(area(4, 5));",
];

type Frame = Readonly<{ name: string; locals?: string; returns?: string }>;
type StackStep = Readonly<{ caption: string; line: number; frames: readonly Frame[]; output?: string }>;

const globalFrame: Frame = { name: "Global script" };
const areaFrame: Frame = { name: "area(4, 5)", locals: "width = 4, height = 5" };
const multiplyFrame: Frame = { name: "multiply(4, 5)", locals: "left = 4, right = 5" };

const stackSteps: readonly StackStep[] = [
    { caption: "The script runs in the global execution context. To log, it first needs `area(4, 5)`.", line: 8, frames: [globalFrame] },
    { caption: "Calling `area` creates an execution context and places it on the stack.", line: 5, frames: [globalFrame, areaFrame] },
    { caption: "Calling `multiply` places another context above it.", line: 1, frames: [globalFrame, areaFrame, multiplyFrame] },
    {
        caption: "`multiply` returns `20`, and its context leaves the stack. The most recent call finished first.",
        line: 5,
        frames: [globalFrame, { ...areaFrame, returns: "20" }],
    },
    { caption: "Then `area` returns `20`, and its context leaves too.", line: 8, frames: [{ ...globalFrame, returns: "20" }] },
    { caption: "Back in the global code, `console.log` prints `20`.", line: 8, frames: [globalFrame], output: "20" },
];

export function CallStackFigure() {
    const stepper = useStepper(stackSteps.length);
    const step = stepper.index >= 0 ? stackSteps[stepper.index] : null;
    const frames = step?.frames ?? [globalFrame, areaFrame, multiplyFrame];
    return (
        <FigureFrame
            caption={
                <Note>
                    {step?.caption ?? "Every call adds an execution context to the stack, and every return removes one. Press Play to run the program."}
                </Note>
            }
            description={["Global script", "calls area(4, 5)", "which calls multiply(4, 5)"]}
            figcaption="The call stack is last-in, first-out: the most recent active call finishes first."
            panels={
                <div className="el-figure__panels">
                    <div className="el-code">
                        <div className="el-panel__bar">
                            <span>area.js</span>
                        </div>
                        <ol className="el-code__lines">
                            {stackSource.map((text, index) => (
                                <li
                                    className="el-code__line"
                                    data-active={step && step.line === index ? "" : undefined}
                                    // A fixed listing: the line number is its identity.
                                    key={index}
                                >
                                    <span className="el-code__number">{index + 1}</span>
                                    <span className="el-code__text">{text || " "}</span>
                                </li>
                            ))}
                        </ol>
                    </div>
                    <div className="el-console">
                        <div className="el-panel__bar">
                            <span>console</span>
                        </div>
                        <ol className="el-console__lines gf-console">
                            {step?.output && <li className="el-console__line">{step.output}</li>}
                        </ol>
                    </div>
                </div>
            }
            stage={
                <div className="gf-stack">
                    <p className="gf-stack__label">call stack</p>
                    <ol className="gf-stack__frames">
                        {[...frames].reverse().map((frame, index) => (
                            <li
                                className="gf-frame"
                                data-top={index === 0 && step ? "" : undefined}
                                key={frame.name}
                            >
                                <span className="gf-frame__name">{frame.name}</span>
                                {frame.locals && <span className="gf-frame__locals">{frame.locals}</span>}
                                {frame.returns && <span className="gf-frame__returns">received {frame.returns}</span>}
                            </li>
                        ))}
                    </ol>
                </div>
            }
            stepper={stepper}
        />
    );
}
