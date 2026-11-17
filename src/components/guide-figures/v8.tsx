import { useState } from "react";
import { Flow, FigureFrame, FlowFigure, Note, useStepper, type FlowNode, type FlowStep, type FlowWire } from "./kit";

/* "Node.js Runtime and the V8 Engine" (v8.mdx). Each figure replaces one of the guide's text diagrams. */

const platforms = ["Windows", "macOS", "Linux"] as const;
const columns = [8, 128, 248];

export function PortabilityFigure() {
    const nodes: FlowNode[] = [
        { id: "app", x: 120, y: 8, w: 120, h: 32, label: "app.js", sub: ["same source"] },
        ...platforms.map((name, index) => ({
            id: `node-${index}`,
            x: columns[index],
            y: 78,
            w: 104,
            h: 34,
            label: "Node.js",
            sub: [`for ${name}`],
            tone: "task" as const,
        })),
        ...platforms.map((name, index) => ({
            id: `os-${index}`,
            x: columns[index],
            y: 150,
            w: 104,
            h: 34,
            label: name,
            sub: ["+ target CPU"],
        })),
    ];
    const wires: FlowWire[] = [
        { id: "fan-0", d: "M180 40 V52 Q180 58 174 58 H66 Q60 58 60 64 V76" },
        { id: "fan-1", d: "M180 40 V76" },
        { id: "fan-2", d: "M180 40 V52 Q180 58 186 58 H294 Q300 58 300 64 V76" },
        ...columns.map((x, index) => ({ id: `down-${index}`, d: `M${x + 52} 112 V148` })),
    ];
    const all = (prefix: string) => [0, 1, 2].map((index) => `${prefix}-${index}`);
    const steps: FlowStep[] = [
        {
            caption: "`app.js` is the same file everywhere. It is JavaScript source, not a compiled executable, so nothing in it is tied to one platform.",
            lit: { nodes: ["app"], wires: [] },
        },
        {
            caption: "The platform-specific part is Node.js itself. A separate Node.js binary is built for each supported platform, and each one runs the same `app.js`.",
            lit: { nodes: ["app", ...all("node")], wires: all("fan"), tone: "task" },
        },
        {
            caption: "Each build carries the differences: V8 supports multiple CPU architectures, libuv handles many operating-system differences, and Node.js adds platform code where required.",
            lit: { nodes: [...all("node"), ...all("os")], wires: all("down"), tone: "task" },
        },
    ];
    return (
        <FlowFigure
            description={[
                "The same app.js goes to Node.js for Windows, Node.js for macOS and Node.js for Linux.",
                "Each Node.js build runs on its own operating system and target CPU.",
            ]}
            figcaption="One source file, three runtime builds. The source is portable because the runtime is not."
            height={192}
            nodes={nodes}
            overview="One `app.js` runs on Windows, macOS and Linux. Press Play to see which part has to change per platform."
            steps={steps}
            width={360}
            wires={wires}
        />
    );
}

const layerNodes: FlowNode[] = [
    { id: "js", x: 8, y: 8, w: 112, h: 28, label: "Your JavaScript" },
    { id: "api", x: 8, y: 64, w: 112, h: 34, label: "Node.js APIs", sub: ["timers, fs, http"] },
    { id: "bind", x: 144, y: 64, w: 96, h: 34, label: "native bindings", sub: ["C++"] },
    { id: "os", x: 262, y: 64, w: 90, h: 34, label: "operating system" },
    { id: "v8", x: 34, y: 124, w: 86, h: 44, label: "V8", sub: ["executes", "JavaScript"] },
    { id: "uv", x: 144, y: 124, w: 118, h: 44, label: "libuv", sub: ["event loop, threads,", "files, sockets, timers"] },
    { id: "result", x: 8, y: 196, w: 112, h: 28, label: "Application result" },
];

const layerWires: FlowWire[] = [
    { id: "js-api", d: "M64 36 V62" },
    { id: "api-bind", d: "M120 81 H142" },
    { id: "bind-os", d: "M240 81 H260" },
    { id: "api-v8", d: "M18 98 V140 Q18 146 24 146 H32" },
    { id: "api-result", d: "M18 98 V194" },
    { id: "bind-uv", d: "M192 98 V122" },
    { id: "uv-os", d: "M262 146 H301 Q307 146 307 140 V100" },
    { id: "v8-result", d: "M77 168 V194" },
    {
        id: "js-v8",
        d: "M120 22 H126 Q132 22 132 28 V140 Q132 146 126 146 H122",
        label: { text: "built-ins", x: 136, y: 40, anchor: "start" },
    },
];

type Scenario = Readonly<{ call: string; tone: "strong" | "accent" | "task"; steps: readonly FlowStep[] }>;

const scenarios: readonly Scenario[] = [
    {
        call: "setTimeout",
        tone: "task",
        steps: [
            { caption: "Your code calls `setTimeout(cb, 10)`. The function comes from Node, not from the JavaScript language.", lit: { nodes: ["js"], wires: [] } },
            { caption: "Node's timers module, written in JavaScript inside Node core, records the timer.", lit: { nodes: ["api"], wires: ["js-api"] } },
            { caption: "To be woken up later, it crosses into C++ through a native binding.", lit: { nodes: ["bind"], wires: ["api-bind"] } },
            { caption: "libuv keeps a timer for it. Its event loop checks due timers on every turn, without blocking JavaScript.", lit: { nodes: ["uv"], wires: ["bind-uv"] } },
            { caption: "About 10ms later the timer is due. Node calls back into V8, which executes `cb`.", lit: { nodes: ["api", "v8"], wires: ["api-v8"] } },
            { caption: "`cb` runs to completion, and its work becomes part of the application result.", lit: { nodes: ["result"], wires: ["v8-result"] } },
        ],
    },
    {
        call: "fs.readFile",
        tone: "accent",
        steps: [
            { caption: "Your code calls `fs.readFile(path, cb)` and moves on. Reading the file happens elsewhere.", lit: { nodes: ["js"], wires: [] } },
            { caption: "Node's `fs` module checks the arguments in JavaScript.", lit: { nodes: ["api"], wires: ["js-api"] } },
            { caption: "A native binding hands the request to C++.", lit: { nodes: ["bind"], wires: ["api-bind"] } },
            { caption: "libuv sends the read to its thread pool, so the main thread stays free for other JavaScript.", lit: { nodes: ["uv"], wires: ["bind-uv"] } },
            { caption: "A worker thread asks the operating system for the file's bytes.", lit: { nodes: ["os"], wires: ["uv-os"] } },
            { caption: "When the read finishes, the event loop runs the callback, and V8 executes `cb` with the data.", lit: { nodes: ["api", "v8"], wires: ["api-v8"] } },
            { caption: "The file's contents reach your code through `cb`.", lit: { nodes: ["result"], wires: ["v8-result"] } },
        ],
    },
    {
        call: "JSON.parse",
        tone: "strong",
        steps: [
            { caption: "Your code calls `JSON.parse(text)`. `JSON` is part of the JavaScript language itself.", lit: { nodes: ["js"], wires: [] } },
            { caption: "So V8 implements it as a built-in and runs it directly. No Node API, binding or libuv is involved.", lit: { nodes: ["v8"], wires: ["js-v8"] } },
            { caption: "The parsed object comes straight back to your code.", lit: { nodes: ["result"], wires: ["v8-result"] } },
        ],
    },
];

function LayerScenario({ scenario, onPick, picked }: Readonly<{ scenario: Scenario | null; picked: number; onPick: (index: number) => void }>) {
    const steps = scenario?.steps ?? scenarios[0].steps;
    const stepper = useStepper(steps.length);
    const step = scenario && stepper.index >= 0 ? steps[stepper.index] : null;
    return (
        <FigureFrame
            caption={
                <Note>
                    {step?.caption ??
                        `Pick a call, then press Play to follow it. ${scenario ? `\`${scenario.call}\` is selected.` : "`setTimeout` is selected."}`}
                </Note>
            }
            description={[
                "Your JavaScript calls Node.js APIs.",
                "Node.js APIs reach native bindings, which reach the operating system.",
                "Node.js APIs run JavaScript on V8, which executes it.",
                "Native bindings use libuv: the event loop, threads, files, sockets and timers.",
                "JavaScript built-ins such as JSON.parse go straight to V8.",
                "The work becomes the application result.",
            ]}
            figcaption="Node gives JavaScript functions like setTimeout. Some are JavaScript all the way down, others cross into C++ and libuv."
            stage={
                <Flow height={232} lit={step ? { ...step.lit, tone: scenario?.tone } : null} nodes={layerNodes} width={360} wires={layerWires} />
            }
            stepper={stepper}
            tools={
                <div aria-label="Follow a call" className="el-controls__group el-segmented" role="group">
                    {scenarios.map((option, index) => (
                        <button
                            aria-pressed={index === picked}
                            className="el-button"
                            key={option.call}
                            onClick={() => onPick(index)}
                            type="button"
                        >
                            {option.call}
                        </button>
                    ))}
                </div>
            }
        />
    );
}

export function NodeLayersFigure() {
    const [picked, setPicked] = useState(0);
    // Picking a call starts its walk-through fresh.
    return <LayerScenario key={picked} onPick={setPicked} picked={picked} scenario={scenarios[picked]} />;
}

export function ClientServerFigure() {
    const rows = (prefix: string, x: number, labels: readonly string[]): FlowNode[] =>
        labels.map((label, index) => ({ id: `${prefix}-${index}`, x: x + 8, y: 36 + index * 22, w: 124, h: 18, label }));
    const nodes: FlowNode[] = [
        { id: "browser", x: 8, y: 16, w: 140, h: 92, label: "Browser process", variant: "group" },
        ...rows("b", 8, ["Browser APIs and UI", "JavaScript engine", "fetch()"]),
        { id: "node", x: 212, y: 16, w: 140, h: 92, label: "Node.js process", variant: "group" },
        ...rows("n", 212, ["Node.js server APIs", "V8 and libuv", "http server"]),
    ];
    const wires: FlowWire[] = [
        { id: "request", d: "M148 67 H210", label: { text: "HTTP request", x: 180, y: 61 } },
        { id: "response", d: "M212 89 H150", label: { text: "HTTP response", x: 180, y: 101 }, tone: "task" },
    ];
    const steps: FlowStep[] = [
        { caption: "In the browser, `fetch()` starts an HTTP request. The browser is the client.", lit: { nodes: ["browser", "b-2", "b-1"], wires: [] } },
        {
            caption: "The request travels over the network. The two processes can run on different machines, so this is networking, not inter-process communication.",
            lit: { nodes: [], wires: ["request"] },
        },
        { caption: "Node's `http` server receives it. V8 runs the handler you wrote, and libuv handles the socket.", lit: { nodes: ["node", "n-2", "n-1"], wires: [] } },
        { caption: "The server writes an HTTP response, which travels back over the network.", lit: { nodes: [], wires: ["response"], tone: "task" } },
        { caption: "`fetch()` resolves in the browser, and the page's JavaScript reads the response.", lit: { nodes: ["browser", "b-2", "b-1"], wires: [], tone: "task" } },
    ];
    return (
        <FlowFigure
            description={[
                "Browser process (the client): browser APIs and UI, a JavaScript engine, fetch().",
                "Node.js process (the server): Node.js server APIs, V8 and libuv, an http server.",
                "The browser sends an HTTP request to Node.js, and Node.js sends an HTTP response back.",
            ]}
            figcaption="Two runtimes, two processes, often two machines. They talk over the network."
            height={124}
            nodes={nodes}
            overview="A browser and a Node.js server are both runtimes. Press Play to send a request from one to the other."
            steps={steps}
            width={360}
            wires={wires}
        />
    );
}

export function ShapeFeedbackFigure() {
    const nodes: FlowNode[] = [
        { id: "shapes", x: 8, y: 8, w: 150, h: 36, label: "repeated object shapes", sub: ["{ name } again and again"] },
        { id: "feedback", x: 8, y: 76, w: 150, h: 36, label: "runtime feedback", sub: ["map M1 seen"], tone: "task" },
        { id: "code", x: 196, y: 76, w: 156, h: 36, label: "specialized machine code", sub: ["guard: map is M1"], tone: "task" },
        { id: "deopt", x: 196, y: 162, w: 156, h: 30, label: "deoptimize", tone: "accent" },
        { id: "retry", x: 196, y: 216, w: 156, h: 30, label: "collect feedback, try again" },
    ];
    const wires: FlowWire[] = [
        { id: "shapes-feedback", d: "M83 44 V74" },
        { id: "feedback-code", d: "M158 94 H194" },
        { id: "guard", d: "M274 112 V160", label: { text: "new shape breaks a guard", x: 280, y: 140, anchor: "start" }, tone: "accent" },
        { id: "deopt-retry", d: "M274 192 V214" },
        { id: "loop", d: "M196 231 H89 Q83 231 83 225 V114" },
    ];
    const steps: FlowStep[] = [
        {
            caption: "The function `f({ name = \"\" })` keeps receiving objects with the same shape. V8 calls an object shape a map.",
            lit: { nodes: ["shapes"], wires: [] },
            patch: { shapes: { sub: ['{ name: "Ada" }, { name: "Lin" }'] } },
        },
        {
            caption: "Each call records feedback at the property access: the same map, again and again.",
            lit: { nodes: ["feedback"], wires: ["shapes-feedback"], tone: "task" },
            patch: { feedback: { sub: ["map M1, every call"] } },
        },
        {
            caption: "An optimizing compiler generates machine code specialized for that map. A guard checks the map, then reads `name` from a known place.",
            lit: { nodes: ["code"], wires: ["feedback-code"], tone: "task" },
        },
        {
            caption: "Then an object with a new shape arrives. The guard fails, because this machine code was never meant for it.",
            lit: { nodes: ["shapes", "code"], wires: ["guard"], tone: "accent" },
            patch: { shapes: { sub: ['{ name: "Ada", id: 7 }'] } },
        },
        {
            caption: "V8 deoptimizes. Execution resumes in a less optimized tier, so the call still gives the right answer.",
            lit: { nodes: ["deopt"], wires: ["guard"], tone: "accent" },
        },
        {
            caption: "It collects more feedback, now with two maps, and may optimize the function again later.",
            lit: { nodes: ["retry", "feedback"], wires: ["deopt-retry", "loop"] },
            patch: { feedback: { sub: ["maps M1 and M2"] } },
        },
    ];
    return (
        <FlowFigure
            description={[
                "Repeated object shapes produce runtime feedback.",
                "Runtime feedback produces specialized machine code.",
                "When a new shape breaks a guard, V8 deoptimizes, collects feedback and tries again.",
            ]}
            figcaption="Optimized code is a bet on the shapes seen so far. A guard checks the bet on every call."
            height={254}
            nodes={nodes}
            overview="Optimization follows the shapes V8 has seen. Press Play to break its assumption."
            steps={steps}
            width={360}
            wires={wires}
        />
    );
}

export function TiersFigure() {
    const tier = (id: string, y: number, label: string, sub?: string): FlowNode => ({
        id,
        x: 168,
        y,
        w: 184,
        h: sub ? 32 : 28,
        label,
        sub: sub ? [sub] : undefined,
        tone: "task",
    });
    const nodes: FlowNode[] = [
        { id: "source", x: 8, y: 8, w: 118, h: 26, label: "JavaScript source" },
        { id: "ast", x: 8, y: 58, w: 118, h: 26, label: "AST" },
        { id: "bytecode", x: 8, y: 108, w: 118, h: 30, label: "Ignition bytecode" },
        { id: "fn", x: 214, y: 8, w: 138, h: 44, label: "f(point)", sub: ["heat: cold", "tier: none yet"], variant: "readout" },
        tier("ignition", 108, "Ignition interpreter"),
        tier("sparkplug", 150, "Sparkplug", "baseline machine code"),
        tier("maglev", 194, "Maglev", "optimized machine code"),
        tier("turbofan", 238, "TurboFan", "optimized machine code"),
        { id: "deopt", x: 168, y: 306, w: 184, h: 28, label: "deoptimization", tone: "accent", variant: "ghost" },
    ];
    const wires: FlowWire[] = [
        { id: "source-ast", d: "M67 34 V56" },
        { id: "ast-bytecode", d: "M67 84 V106" },
        { id: "to-ignition", d: "M126 122 H166" },
        { id: "to-sparkplug", d: "M126 130 H136 Q142 130 142 136 V160 Q142 166 148 166 H166" },
        { id: "to-maglev", d: "M126 130 H136 Q142 130 142 136 V204 Q142 210 148 210 H166" },
        { id: "to-turbofan", d: "M126 130 H136 Q142 130 142 136 V248 Q142 254 148 254 H166" },
        { id: "fails", d: "M260 270 V304", label: { text: "assumption fails", x: 266, y: 291, anchor: "start" }, tone: "accent" },
    ];
    const readout = (heat: string, at: string) => ({ fn: { sub: [`heat: ${heat}`, `tier: ${at}`] } });
    const steps: FlowStep[] = [
        { caption: "V8 parses the source into an AST.", lit: { nodes: ["source", "ast"], wires: ["source-ast"] } },
        {
            caption: "Ignition's bytecode compiler turns the AST into bytecode, and the Ignition interpreter starts running it at once. Every run collects feedback.",
            lit: { nodes: ["bytecode", "ignition", "fn"], wires: ["ast-bytecode", "to-ignition"], tone: "task" },
            patch: readout("cold", "Ignition"),
        },
        {
            caption: "The function keeps running. Sparkplug quickly generates baseline machine code from the bytecode, without optimizing it.",
            lit: { nodes: ["sparkplug", "fn"], wires: ["to-sparkplug"], tone: "task" },
            patch: readout("warm", "Sparkplug"),
        },
        {
            caption: "With more runs and stable feedback, Maglev applies mid-tier optimizations.",
            lit: { nodes: ["maglev", "fn"], wires: ["to-maglev"], tone: "task" },
            patch: readout("hot", "Maglev"),
        },
        {
            caption: "For hot code, TurboFan produces more heavily optimized machine code, specialized for the types and shapes V8 has seen.",
            lit: { nodes: ["turbofan", "fn"], wires: ["to-turbofan"], tone: "task" },
            patch: readout("very hot", "TurboFan"),
        },
        {
            caption: "Then a value breaks an assumption that the optimized code relied on. V8 deoptimizes the function.",
            lit: { nodes: ["turbofan", "deopt", "fn"], wires: ["fails"], tone: "accent" },
            patch: readout("very hot", "deoptimizing"),
        },
        {
            caption: "Execution resumes in a less optimized tier. It collects more feedback and may be optimized again later.",
            lit: { nodes: ["bytecode", "ignition", "fn"], wires: ["to-ignition"], tone: "task" },
            patch: readout("cooling", "Ignition"),
        },
    ];
    return (
        <FlowFigure
            description={[
                "JavaScript source becomes an AST, then Ignition bytecode.",
                "Ignition bytecode runs in the Ignition interpreter.",
                "It can also become Sparkplug baseline machine code, Maglev optimized machine code, or TurboFan optimized machine code.",
                "If an assumption fails, TurboFan's code is deoptimized.",
            ]}
            figcaption="A function climbs tiers as it gets hotter, and can fall back when its assumptions break. The heat labels are illustrative, not V8's real thresholds."
            height={342}
            nodes={nodes}
            overview="V8 does not compile everything the same way. Press Play to follow one function as it gets hotter."
            steps={steps}
            width={360}
            wires={wires}
        />
    );
}

/* Generational heap: objects move between regions as collections run. */

type HeapObject = Readonly<{ id: string; at: "young" | "old" | "reclaimed"; dead?: boolean; age?: number }>;
type HeapStep = Readonly<{ caption: string; objects: readonly HeapObject[]; collecting?: "young" | "old" }>;

const heapSteps: readonly HeapStep[] = (() => {
    const o = (id: string, at: HeapObject["at"], extra: Partial<HeapObject> = {}): HeapObject => ({ id, at, ...extra });
    return [
        {
            caption: "Newly created heap objects begin in the young generation: `a`, `b`, `c` and `d`.",
            objects: [o("a", "young"), o("b", "young"), o("c", "young"), o("d", "young")],
        },
        {
            caption: "Many objects become unreachable shortly after they are created. Nothing reaches `b` or `d` any more.",
            objects: [o("a", "young"), o("b", "young", { dead: true }), o("c", "young"), o("d", "young", { dead: true })],
        },
        {
            caption: "A minor collection runs often. It reclaims `b` and `d`. `a` and `c` survived one collection.",
            collecting: "young",
            objects: [o("a", "young", { age: 1 }), o("b", "reclaimed"), o("c", "young", { age: 1 }), o("d", "reclaimed")],
        },
        {
            caption: "The program keeps allocating: `e`, `f` and `g` join the young generation.",
            objects: [o("a", "young", { age: 1 }), o("b", "reclaimed"), o("c", "young", { age: 1 }), o("d", "reclaimed"), o("e", "young"), o("f", "young"), o("g", "young")],
        },
        {
            caption: "Again, most new objects die young: `e` and `g` become unreachable.",
            objects: [
                o("a", "young", { age: 1 }),
                o("b", "reclaimed"),
                o("c", "young", { age: 1 }),
                o("d", "reclaimed"),
                o("e", "young", { dead: true }),
                o("f", "young"),
                o("g", "young", { dead: true }),
            ],
        },
        {
            caption: "Another minor collection. `a` and `c` survived again, so they are promoted to the old generation. `f` survived its first.",
            collecting: "young",
            objects: [
                o("a", "old", { age: 2 }),
                o("b", "reclaimed"),
                o("c", "old", { age: 2 }),
                o("d", "reclaimed"),
                o("e", "reclaimed"),
                o("f", "young", { age: 1 }),
                o("g", "reclaimed"),
            ],
        },
        {
            caption: "Promotion is about surviving, not a promise of future use. Old objects can die too: nothing reaches `c` now.",
            objects: [
                o("a", "old", { age: 2 }),
                o("b", "reclaimed"),
                o("c", "old", { age: 2, dead: true }),
                o("d", "reclaimed"),
                o("e", "reclaimed"),
                o("f", "young", { age: 1 }),
                o("g", "reclaimed"),
            ],
        },
        {
            caption: "A major collection covers the whole heap. It marks what is reachable, sweeps `c` away, and can compact the survivors.",
            collecting: "old",
            objects: [
                o("a", "old", { age: 2 }),
                o("b", "reclaimed"),
                o("c", "reclaimed"),
                o("d", "reclaimed"),
                o("e", "reclaimed"),
                o("f", "young", { age: 1 }),
                o("g", "reclaimed"),
            ],
        },
    ];
})();

const tile = 26;

function heapPlace(objects: readonly HeapObject[], object: HeapObject): readonly [number, number] {
    const index = objects.filter((other) => other.at === object.at).indexOf(object);
    if (object.at === "young") return [20 + (index % 5) * 36, 34 + Math.floor(index / 5) * 36];
    if (object.at === "old") return [240 + (index % 3) * 36, 34 + Math.floor(index / 3) * 36];
    return [20 + index * 30, 156];
}

export function HeapFigure() {
    const stepper = useStepper(heapSteps.length);
    const step = stepper.index >= 0 ? heapSteps[stepper.index] : null;
    const objects = step?.objects ?? heapSteps[3].objects;
    return (
        <FigureFrame
            caption={
                <Note>
                    {step?.caption ??
                        "V8's heap has a young generation, collected often, and an old generation for objects that keep surviving. Press Play to follow a few objects."}
                </Note>
            }
            description={[
                "A new object starts in the young generation, which has minor collections.",
                "Unreachable young objects are reclaimed. Objects that survive collections move to the old generation.",
                "The old generation has major collections. Unreachable old objects are reclaimed.",
            ]}
            figcaption="Most objects die young, so V8 collects the young generation often and the whole heap rarely."
            stage={
                <svg aria-hidden="true" className="gf-flow gf-heap" viewBox="0 0 360 196">
                    <defs>
                        <marker id="gf-arrow-heap" markerHeight="6" markerWidth="6" orient="auto-start-reverse" refX="5" refY="3" viewBox="0 0 6 6">
                            <path className="gf-arrow" d="M0.5 0.8 5 3 0.5 5.2" />
                        </marker>
                    </defs>
                    <g className="gf-group" data-state={step?.collecting === "young" ? "on" : undefined}>
                        <rect height="114" rx="5" width="206" x="8" y="8" />
                        <line x1="8" x2="214" y1="22.5" y2="22.5" />
                        <text className="gf-group__label" x="15" y="18">
                            young generation · minor collection
                        </text>
                    </g>
                    <g className="gf-group" data-state={step?.collecting === "old" ? "on" : undefined}>
                        <rect height="114" rx="5" width="124" x="228" y="8" />
                        <line x1="228" x2="352" y1="22.5" y2="22.5" />
                        <text className="gf-group__label" x="235" y="18">
                            old generation · major
                        </text>
                    </g>
                    <g className="gf-node" data-variant="ghost">
                        <rect height="46" rx="5" width="344" x="8" y="142" />
                    </g>
                    <g className="gf-wire">
                        <path d="M214 64 H226" markerEnd="url(#gf-arrow-heap)" />
                        <path d="M60 122 V140" markerEnd="url(#gf-arrow-heap)" />
                        <path d="M290 122 V140" markerEnd="url(#gf-arrow-heap)" />
                        <text className="gf-wire__label" x="66" y="134">
                            unreachable
                        </text>
                        <text className="gf-wire__label" x="296" y="134">
                            unreachable
                        </text>
                        <text className="gf-wire__label" textAnchor="middle" x="221" y="58">
                            survives
                        </text>
                    </g>
                    <text className="gf-group__label" x="15" y="138">
                        reclaimed
                    </text>
                    {objects.map((object) => {
                        const [x, y] = heapPlace(objects, object);
                        return (
                            <g
                                className="gf-object"
                                data-at={object.at}
                                data-dead={object.dead ? "" : undefined}
                                key={object.id}
                                style={{ transform: `translate(${x}px, ${y}px)` }}
                            >
                                <rect height={tile} rx="4" width={tile} />
                                <text className="gf-object__label" textAnchor="middle" x={tile / 2} y={tile / 2 + 3.5}>
                                    {object.id}
                                </text>
                                {Array.from({ length: object.at === "reclaimed" ? 0 : (object.age ?? 0) }, (_, index) => (
                                    <circle className="gf-object__age" cx={tile / 2 - 3 + index * 6} cy={tile + 5} key={index} r="1.6" />
                                ))}
                            </g>
                        );
                    })}
                </svg>
            }
            stepper={stepper}
        />
    );
}
