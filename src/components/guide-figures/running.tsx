import { FigureFrame, FlowFigure, Note, useStepper, type FlowNode, type FlowStep, type FlowWire } from "./kit";

/*
 * "How JavaScript Keeps Track of Running Code", the event-loop and
 * concurrency guides' queue pictures, and the higher-order functions guide.
 */

export function ExecutionContextFigure() {
    const nodes: FlowNode[] = [
        { id: "context", x: 60, y: 8, w: 240, h: 104, label: "Execution context", variant: "group" },
        { id: "memory", x: 72, y: 30, w: 216, h: 34, label: "Variable environment", sub: ["memory: variables and functions"], tone: "task" },
        { id: "code", x: 72, y: 70, w: 216, h: 34, label: "Thread of execution", sub: ["code: running line by line"], tone: "accent" },
    ];
    const steps: FlowStep[] = [
        {
            caption: "The variable environment, also called the memory component, holds the variables and functions this code can use.",
            lit: { nodes: ["context", "memory"], wires: [], tone: "task" },
        },
        {
            caption: "The thread of execution, also called the code component, runs the code one line at a time.",
            lit: { nodes: ["context", "code"], wires: [], tone: "accent" },
        },
    ];
    return (
        <FlowFigure
            description={["Execution context: a variable environment for variables and functions, and a thread of execution running code line by line."]}
            figcaption="Memory and code: the two parts of every execution context in the beginner model."
            height={120}
            nodes={nodes}
            overview="An execution context has two components. Press Play to look at each."
            steps={steps}
            width={360}
            wires={[]}
        />
    );
}

const memorySource = ["var score = 10;", "", "function double(value) {", "    return value * 2;", "}"];
const memorySteps = [
    {
        caption: "Before running any statement, JavaScript prepares the declarations. `score` gets `undefined`, and `double` gets the whole function.",
        line: null,
        slots: ["undefined", "ƒ double(value)"],
    },
    { caption: "Now the code runs line by line. Line 1 assigns `10` to `score`.", line: 0, slots: ["10", "ƒ double(value)"] },
    {
        caption: "Line 3 is the function declaration. `double` was already stored during preparation, so there is nothing left to do.",
        line: 2,
        slots: ["10", "ƒ double(value)"],
    },
] as const;

export function MemoryPhaseFigure() {
    const stepper = useStepper(memorySteps.length);
    const step = memorySteps[Math.max(0, stepper.index)];
    const names = ["score", "double"];
    return (
        <FigureFrame
            caption={
                <Note>
                    {stepper.index >= 0
                        ? step.caption
                        : "JavaScript prepares the memory before it runs the code. Press Play to see both phases."}
                </Note>
            }
            description={["score → undefined", "double → function"]}
            figcaption="Preparation fills the memory; execution then runs the code against it."
            panels={
                <div className="el-figure__panels gf-panels--single">
                    <div className="el-code">
                        <div className="el-panel__bar">
                            <span>memory.js</span>
                            <span>{stepper.index <= 0 ? "phase 1: memory creation" : "phase 2: execution"}</span>
                        </div>
                        <ol className="el-code__lines">
                            {memorySource.map((text, index) => (
                                <li
                                    className="el-code__line"
                                    data-active={stepper.index >= 0 && step.line === index ? "" : undefined}
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
                <svg aria-hidden="true" className="gf-flow" viewBox="0 0 360 94">
                    <text className="gf-group__label" x="8" y="12">
                        variable environment
                    </text>
                    {names.map((name, index) => {
                        const y = 22 + index * 36;
                        return (
                            <g className="gf-slot" key={name}>
                                <text className="gf-node__label" x="8" y={y + 18}>
                                    {name}
                                </text>
                                <rect className="gf-slot__box" height="28" rx="4" width="220" x="132" y={y} />
                                <text className="gf-slot__value" key={step.slots[index]} x="144" y={y + 18}>
                                    {step.slots[index]}
                                </text>
                            </g>
                        );
                    })}
                </svg>
            }
            stepper={stepper}
        />
    );
}

type StackStep = Readonly<{ caption: string; line: number | null; frames: readonly Readonly<{ name: string; locals?: string }>[]; output: readonly string[] }>;

type StackSpec = Readonly<{
    fileName: string;
    source: readonly string[];
    steps: readonly StackStep[];
    overview: string;
    figcaption: string;
}>;

function StackStage({ frames, live }: Readonly<{ frames: StackStep["frames"]; live: boolean }>) {
    return (
        <div className="gf-stack">
            <p className="gf-stack__label">
                call stack <span>top</span>
            </p>
            <ol className="gf-stack__frames">
                {frames.length === 0 && <li className="gf-stack__empty">empty</li>}
                {[...frames].reverse().map((frame, index) => (
                    <li className="gf-frame" data-top={index === 0 && live ? "" : undefined} key={`${frame.name}-${frames.length - index}`}>
                        <span className="gf-frame__name">{frame.name}</span>
                        {frame.locals && <span className="gf-frame__locals">{frame.locals}</span>}
                    </li>
                ))}
            </ol>
            <p className="gf-stack__label gf-stack__label--bottom">bottom</p>
        </div>
    );
}

/** Listings longer than this would wrap in a half-width panel, so the console moves below the code instead. */
const sideBySideChars = 36;

function StackPanels({ spec, line, output }: Readonly<{ spec: StackSpec; line: number | null; output: readonly string[] }>) {
    const isWide = spec.source.some((text) => text.length > sideBySideChars);
    return (
        <div className={isWide ? "el-figure__panels gf-panels--single" : "el-figure__panels"}>
            <div className="el-code">
                <div className="el-panel__bar">
                    <span>{spec.fileName}</span>
                </div>
                <ol className="el-code__lines">
                    {spec.source.map((text, index) => (
                        <li
                            className="el-code__line"
                            data-active={line === index ? "" : undefined}
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
                    {output.map((entry, index) => (
                        // The output only grows: position is identity.
                        <li className="el-console__line" key={index}>
                            {entry}
                        </li>
                    ))}
                </ol>
            </div>
        </div>
    );
}

/** A program's call stack, stepped; or, with `at`, one still moment of it for a guide that narrates the steps itself. */
export function StackFigure({ spec, at }: Readonly<{ spec: StackSpec; at?: number }>) {
    const stepper = useStepper(spec.steps.length);
    if (at !== undefined) {
        const step = spec.steps[at];
        return (
            <FigureFrame
                caption={<Note>{step.caption}</Note>}
                description={[`Call stack, top first: ${[...step.frames].reverse().map((frame) => frame.name).join(", ")}.`]}
                figcaption={spec.figcaption}
                panels={<StackPanels line={step.line} output={step.output} spec={spec} />}
                stage={<StackStage frames={step.frames} live />}
            />
        );
    }
    const step = stepper.index >= 0 ? spec.steps[stepper.index] : null;
    const last = spec.steps[spec.steps.length - 1];
    return (
        <FigureFrame
            caption={<Note>{step?.caption ?? spec.overview}</Note>}
            description={spec.steps.map((one) => `${one.frames.map((frame) => frame.name).join(" → ") || "empty"}`)}
            figcaption={spec.figcaption}
            panels={<StackPanels line={step?.line ?? null} output={step?.output ?? last.output} spec={spec} />}
            stage={<StackStage frames={step?.frames ?? spec.steps[3]?.frames ?? []} live={step !== null} />}
            stepper={stepper}
        />
    );
}

const firstSecondSource = [
    "function first() {",
    '    console.log("Inside first function");',
    "    second();",
    '    console.log("Exiting first function");',
    "}",
    "",
    "function second() {",
    '    console.log("Inside second function");',
    "}",
    "",
    "first();",
];

const script = { name: "Script" };
const first = { name: "first()" };
const second = { name: "second()" };

export const firstSecondStack: StackSpec = {
    fileName: "stack.js",
    source: firstSecondSource,
    steps: [
        { caption: "JavaScript begins with the script's execution context. It is the only frame on the stack.", line: 10, frames: [script], output: [] },
        {
            caption: "Calling `first()` creates a new execution context and pushes it on top. It logs \"Inside first function\".",
            line: 1,
            frames: [script, first],
            output: ["Inside first function"],
        },
        {
            caption: "`first` calls `second()`. Another execution context goes on top, and it logs \"Inside second function\".",
            line: 7,
            frames: [script, first, second],
            output: ["Inside first function", "Inside second function"],
        },
        {
            caption: "`second` finishes, so its context is popped. `first` continues where it paused and logs \"Exiting first function\".",
            line: 3,
            frames: [script, first],
            output: ["Inside first function", "Inside second function", "Exiting first function"],
        },
    ],
    overview: "",
    figcaption: "Top of the stack is the code running right now.",
};

export const countdownStack: StackSpec = {
    fileName: "countdown.js",
    source: [
        "function countdown(number) {",
        "    if (number === 0) {",
        "        return;",
        "    }",
        "",
        "    console.log(number);",
        "    countdown(number - 1);",
        "}",
        "",
        "countdown(3);",
    ],
    steps: [
        { caption: "`countdown(3)` gets its own execution context and logs 3.", line: 5, frames: [{ name: "countdown(3)", locals: "number = 3" }], output: ["3"] },
        {
            caption: "It calls `countdown(2)`, which gets another context, with its own `number`, and logs 2.",
            line: 5,
            frames: [
                { name: "countdown(3)", locals: "number = 3" },
                { name: "countdown(2)", locals: "number = 2" },
            ],
            output: ["3", "2"],
        },
        {
            caption: "Then `countdown(1)` logs 1. Three calls are waiting on the stack at once.",
            line: 5,
            frames: [
                { name: "countdown(3)", locals: "number = 3" },
                { name: "countdown(2)", locals: "number = 2" },
                { name: "countdown(1)", locals: "number = 1" },
            ],
            output: ["3", "2", "1"],
        },
        {
            caption: "`countdown(0)` reaches the base case and returns at once. Without that base case the stack would keep growing.",
            line: 2,
            frames: [
                { name: "countdown(3)", locals: "number = 3" },
                { name: "countdown(2)", locals: "number = 2" },
                { name: "countdown(1)", locals: "number = 1" },
                { name: "countdown(0)", locals: "number = 0" },
            ],
            output: ["3", "2", "1"],
        },
        {
            caption: "Its context is popped, and `countdown(1)` finishes too.",
            line: 6,
            frames: [
                { name: "countdown(3)", locals: "number = 3" },
                { name: "countdown(2)", locals: "number = 2" },
            ],
            output: ["3", "2", "1"],
        },
        { caption: "Then `countdown(2)` finishes.", line: 6, frames: [{ name: "countdown(3)", locals: "number = 3" }], output: ["3", "2", "1"] },
        { caption: "Finally `countdown(3)` returns, and the stack is empty again.", line: 9, frames: [], output: ["3", "2", "1"] },
    ],
    overview: "Every recursive call gets its own execution context. Press Play to watch the stack grow and shrink.",
    figcaption: "countdown(3) → countdown(2) → countdown(1) → countdown(0), each with its own number.",
};

/** The beginner queue pictures: work leaves a browser API, waits in a queue, and reaches the call stack. */
export function CallbackQueueFigure() {
    const nodes: FlowNode[] = [
        { id: "api", x: 8, y: 14, w: 100, h: 38, label: "Browser API", sub: ["a timer"], tone: "task" },
        { id: "queue", x: 130, y: 14, w: 100, h: 38, label: "Callback queue", sub: ["waiting"], tone: "task" },
        { id: "stack", x: 252, y: 14, w: 100, h: 38, label: "Call stack", sub: ["running"], tone: "task" },
    ];
    const wires: FlowWire[] = [
        { id: "to-queue", d: "M108 33 H128" },
        { id: "to-stack", d: "M230 33 H250" },
    ];
    const steps: FlowStep[] = [
        { caption: "A browser API does the waiting, such as a timer counting down, outside the JavaScript engine.", lit: { nodes: ["api"], wires: [], tone: "task" }, patch: { api: { sub: ["timer running"] } } },
        { caption: "When it finishes, its callback joins the callback queue and waits.", lit: { nodes: ["queue"], wires: ["to-queue"], tone: "task" }, patch: { queue: { sub: ["callback waits"] } } },
        { caption: "Once the call stack is empty, the callback moves onto it and runs.", lit: { nodes: ["stack"], wires: ["to-stack"], tone: "task" }, patch: { stack: { sub: ["callback runs"] } } },
    ];
    return (
        <FlowFigure
            description={["Browser API, then callback queue, then call stack."]}
            figcaption="The one-queue picture. The real model has several task queues and a microtask queue, as the guide explains next."
            height={66}
            nodes={nodes}
            overview="The beginner picture has one queue. Press Play to send a callback through it."
            steps={steps}
            width={360}
            wires={wires}
        />
    );
}

export function ConcurrencyLoopFigure() {
    const nodes: FlowNode[] = [
        { id: "apis", x: 100, y: 8, w: 160, h: 30, label: "Browser APIs", sub: ["the network request"], tone: "task" },
        { id: "queue", x: 100, y: 62, w: 160, h: 30, label: "Callback queue", sub: ["ready work waits"], tone: "task" },
        { id: "loop", x: 100, y: 116, w: 160, h: 30, label: "Event loop", sub: ["is the stack empty?"], tone: "accent" },
        { id: "stack", x: 100, y: 170, w: 160, h: 30, label: "Call stack", sub: ["runs one thing at a time"], tone: "task" },
    ];
    const wires: FlowWire[] = [
        { id: "a", d: "M180 38 V60" },
        { id: "b", d: "M180 92 V114" },
        { id: "c", d: "M180 146 V168" },
    ];
    const steps: FlowStep[] = [
        {
            caption: "`fetch` hands the request to the browser and returns at once, so \"Request started\" logs while the network works.",
            lit: { nodes: ["apis"], wires: [], tone: "task" },
        },
        { caption: "When the response is ready, the work that continues it waits its turn in a queue.", lit: { nodes: ["queue"], wires: ["a"], tone: "task" } },
        { caption: "The event loop connects ready work to execution time. It waits until the call stack is free.", lit: { nodes: ["loop"], wires: ["b"], tone: "accent" } },
        { caption: "Then the waiting work moves onto the call stack and runs, logging the user.", lit: { nodes: ["stack"], wires: ["c"], tone: "task" } },
    ];
    return (
        <FlowFigure
            description={["Browser APIs, then the callback queue, then the event loop, then the call stack."]}
            figcaption="One thread runs JavaScript; the browser does the waiting. The event loop decides when ready work gets the thread."
            height={208}
            nodes={nodes}
            overview="Concurrency on one thread: the waiting happens elsewhere. Press Play to follow the request."
            steps={steps}
            width={360}
            wires={wires}
        />
    );
}

export function WithLoggingFigure() {
    const nodes: FlowNode[] = [
        { id: "add", x: 8, y: 8, w: 100, h: 40, label: "add", sub: ["behavior in"] },
        { id: "wrap", x: 130, y: 8, w: 100, h: 40, label: "withLogging", sub: ["wraps it"], tone: "accent" },
        { id: "logged", x: 252, y: 8, w: 100, h: 40, label: "loggedAdd", sub: ["enhanced behavior out"], tone: "task" },
        { id: "console", x: 8, y: 102, w: 344, h: 40, label: "console", sub: ["(nothing yet)"], variant: "readout" },
    ];
    const wires: FlowWire[] = [
        { id: "in", d: "M108 28 H128", tone: "accent" },
        { id: "out", d: "M230 28 H250", tone: "task" },
        { id: "call", d: "M302 48 V70 Q302 76 296 76 H64 Q58 76 58 70 V50", label: { text: "calls the original", x: 180, y: 72 } },
    ];
    const log = (...lines: string[]) => ({ console: { sub: lines } });
    const steps: FlowStep[] = [
        { caption: "`add` is the behavior going in. It only knows how to add two numbers.", lit: { nodes: ["add"], wires: [] } },
        {
            caption: "`withLogging(add)` does not run `add`. It returns a new function, `loggedOperation`, that surrounds it.",
            lit: { nodes: ["wrap"], wires: ["in"], tone: "accent" },
        },
        { caption: "That new function is stored as `loggedAdd`: enhanced behavior out.", lit: { nodes: ["logged"], wires: ["out"], tone: "task" } },
        {
            caption: "Calling `loggedAdd(2, 3)` logs the arguments first.",
            lit: { nodes: ["logged", "console"], wires: [], tone: "task" },
            patch: log("Arguments: [2, 3]"),
        },
        {
            caption: "Then it calls the original `add(2, 3)`, which returns `5`.",
            lit: { nodes: ["add"], wires: ["call"] },
            patch: log("Arguments: [2, 3]"),
        },
        {
            caption: "It logs the result and returns `5`. `add` itself never changed.",
            lit: { nodes: ["logged", "console"], wires: [], tone: "task" },
            patch: log("Arguments: [2, 3]", "Result: 5"),
        },
    ];
    return (
        <FlowFigure
            description={["Behavior in: add. withLogging wraps it. Enhanced behavior out: loggedAdd, which logs its arguments and result around add."]}
            figcaption="Behavior in, enhanced behavior out. The wrapper adds logging without knowing how addition works."
            height={150}
            nodes={nodes}
            overview="A higher-order function can take behavior and return enhanced behavior. Press Play to wrap `add`."
            steps={steps}
            width={360}
            wires={wires}
        />
    );
}
