import { useState } from "react";
import { FigureFrame, FlowFigure, Note, useStepper, type FlowNode, type FlowStep, type FlowWire } from "./kit";

/* "Processes, Threads and Context Switching" (processing.mdx). */

export function ProgramToProcessFigure() {
    const nodes: FlowNode[] = [
        { id: "disk", x: 8, y: 14, w: 104, h: 40, label: "Program on disk", sub: ["a file on the SSD"] },
        { id: "start", x: 128, y: 14, w: 104, h: 40, label: "Start execution", sub: ["compiled or engine"], tone: "task" },
        { id: "process", x: 248, y: 14, w: 104, h: 40, label: "Running process", sub: ["memory, CPU time"], tone: "accent" },
    ];
    const wires: FlowWire[] = [
        { id: "load", d: "M112 34 H126" },
        { id: "run", d: "M232 34 H246" },
    ];
    const steps: FlowStep[] = [
        { caption: "You save code on an HDD or SSD in the form of a file. That file is a program: it does nothing on its own.", lit: { nodes: ["disk"], wires: [] } },
        {
            caption: "Running it depends on the ecosystem. C++ is compiled into an executable binary first, while JavaScript is handled by a JavaScript engine.",
            lit: { nodes: ["start"], wires: ["load"], tone: "task" },
        },
        { caption: "Once it starts running, the program becomes a process.", lit: { nodes: ["process"], wires: ["run"], tone: "accent" } },
    ];
    return (
        <FlowFigure
            description={["Program on disk", "leads to start execution", "which leads to a running process"]}
            figcaption="A program is a file. A process is that program while it runs."
            height={68}
            nodes={nodes}
            overview="A program sits on disk until something runs it. Press Play to start it."
            steps={steps}
            width={360}
            wires={wires}
        />
    );
}

type Mode = "fifo" | "slice";
type Pid = "P1" | "P2" | "P3";

/** Which process holds the CPU in each time unit. P1 needs 6 units, P2 and P3 need 2 each. */
const schedules: Record<Mode, readonly Pid[]> = {
    fifo: ["P1", "P1", "P1", "P1", "P1", "P1", "P2", "P2", "P3", "P3"],
    slice: ["P1", "P2", "P3", "P1", "P2", "P3", "P1", "P1", "P1", "P1"],
};

const captions: Record<Mode, readonly string[]> = {
    fifo: [
        "`P1` starts at t = 0 and keeps the CPU until it finishes.",
        "`P1` is still running. `P2` and `P3` have not started at all.",
        "Still `P1`. Anything waiting on `P2` or `P3` looks frozen.",
        "Still `P1`.",
        "Still `P1`.",
        "`P1` runs its last unit.",
        "`P1` finally finishes. Only now does `P2` start.",
        "`P2` runs to completion.",
        "`P3` starts last, after waiting 8 units.",
        "Everything ran, but `P3` waited 8 units before running even once.",
    ],
    slice: [
        "`P1` runs for one time slice.",
        "Context switch: the OS saves `P1`'s execution state and restores `P2`'s.",
        "`P3` gets a slice too. Every process has run within 3 units.",
        "Back to `P1`. It resumes exactly where it stopped.",
        "`P2` gets its second slice and finishes.",
        "`P3` finishes too.",
        "Only `P1` is left, so it keeps the CPU.",
        "`P1` keeps running.",
        "`P1` keeps running.",
        "Same total work, but every process made progress early. The switches are so fast that we rarely notice them.",
    ],
};

const tones: Record<Pid, string> = { P1: "strong", P2: "task", P3: "accent" };
// Ten units of 25 end at x 294, clear of the "first ran" labels on the right.
const unit = 25;
const left = 44;

function SchedulerBody({ mode, onMode }: Readonly<{ mode: Mode; onMode: (mode: Mode) => void }>) {
    const schedule = schedules[mode];
    const stepper = useStepper(schedule.length);
    const shown = stepper.index < 0 ? schedule.length : stepper.index + 1;
    const lanes: readonly Pid[] = ["P1", "P2", "P3"];
    return (
        <FigureFrame
            caption={
                <Note>
                    {stepper.index >= 0
                        ? captions[mode][stepper.index]
                        : mode === "fifo"
                          ? "Run each process to completion, first come, first served. Press Play to watch the CPU over time."
                          : "Give each process a short slice of time, then switch. Press Play to watch the CPU over time."}
                </Note>
            }
            description={[
                mode === "fifo"
                    ? "Over time, the CPU runs P1 until finished, then P2, then P3."
                    : "Over time, the CPU runs P1, P2, P3, P1, P2, and so on: execute, then resume.",
            ]}
            figcaption="One core, three processes, ten units of time. Compare when each process first gets the CPU."
            stage={
                <svg aria-hidden="true" className="gf-flow gf-schedule" viewBox="0 0 360 132">
                    <text className="gf-group__label" x="8" y="20">
                        CPU
                    </text>
                    <rect className="gf-schedule__track" height="18" rx="3" width={unit * 10} x={left} y="8" />
                    {schedule.slice(0, shown).map((pid, index) => (
                        // Time units never reorder: the index is the unit.
                        <g className="gf-slice" data-tone={tones[pid]} key={`${mode}-${index}`}>
                            <rect height="18" rx="2" width={unit - 2} x={left + index * unit + 1} y="8" />
                            <text textAnchor="middle" x={left + index * unit + unit / 2} y="20.5">
                                {pid}
                            </text>
                            {index > 0 && schedule[index - 1] !== pid && (
                                <line className="gf-slice__switch" x1={left + index * unit} x2={left + index * unit} y1="4" y2="30" />
                            )}
                        </g>
                    ))}
                    {lanes.map((pid, lane) => {
                        const y = 50 + lane * 22;
                        const first = schedule.indexOf(pid);
                        return (
                            <g key={pid}>
                                <text className="gf-group__label" x="8" y={y + 4}>
                                    {pid}
                                </text>
                                <line className="gf-schedule__lane" x1={left} x2={left + unit * 10} y1={y} y2={y} />
                                {schedule.slice(0, shown).map((holder, index) => (
                                    <rect
                                        className="gf-schedule__run"
                                        data-state={holder === pid ? "running" : "waiting"}
                                        data-tone={tones[pid]}
                                        height={holder === pid ? 6 : 1.5}
                                        // Time units never reorder: the index is the unit.
                                        key={index}
                                        width={unit - 2}
                                        x={left + index * unit + 1}
                                        y={holder === pid ? y - 3 : y - 0.75}
                                    />
                                ))}
                                {shown > first && (
                                    <text className="gf-schedule__first" textAnchor="end" x="356" y={y + 3}>
                                        first t={first}
                                    </text>
                                )}
                            </g>
                        );
                    })}
                    <line className="gf-schedule__head" x1={left + shown * unit} x2={left + shown * unit} y1="4" y2="118" />
                    <text className="gf-wire__label" x={left} y="128">
                        t = 0
                    </text>
                    <text className="gf-wire__label" textAnchor="end" x={left + unit * 10} y="128">
                        time →
                    </text>
                </svg>
            }
            stepper={stepper}
            tools={
                <div aria-label="Scheduling" className="el-controls__group el-segmented" role="group">
                    {(["fifo", "slice"] as const).map((option) => (
                        <button aria-pressed={option === mode} className="el-button" key={option} onClick={() => onMode(option)} type="button">
                            {option === "fifo" ? "to completion" : "time slices"}
                        </button>
                    ))}
                </div>
            }
        />
    );
}

export function SchedulerFigure({ mode: initial }: Readonly<{ mode: Mode }>) {
    const [mode, setMode] = useState(initial);
    // Switching the policy starts the timeline over.
    return <SchedulerBody key={mode} mode={mode} onMode={setMode} />;
}

export function ClientsServerFigure() {
    const clients = ["Phone app", "Browser", "Other app"];
    const nodes: FlowNode[] = [
        ...clients.map((label, index) => ({ id: `c${index}`, x: 8, y: 8 + index * 40, w: 92, h: 28, label })),
        { id: "server", x: 236, y: 38, w: 116, h: 48, label: "Server process", sub: ["accepts, processes,", "responds"], tone: "task" },
    ];
    const ys = [22, 62, 102];
    const wires: FlowWire[] = [
        // Requests fan into the top half of the server, responses fan out of the bottom half.
        ...ys.map((y, index) => {
            const end = 46 + index * 7;
            return { id: `req${index}`, d: `M100 ${y - 3} C168 ${y - 3} 166 ${end} 234 ${end}` };
        }),
        ...ys.map((y, index) => {
            const start = 64 + index * 7;
            return { id: `res${index}`, d: `M236 ${start} C170 ${start} 168 ${y + 3} 102 ${y + 3}`, tone: "task" as const };
        }),
    ];
    const all = (prefix: string) => [0, 1, 2].map((index) => `${prefix}${index}`);
    const steps: FlowStep[] = [
        {
            caption: "A client is any process that raises a request: an app on your phone, a browser, or another program. It need not have a user interface.",
            lit: { nodes: all("c"), wires: [] },
        },
        { caption: "Each client sends its request to the server process.", lit: { nodes: [], wires: all("req") } },
        { caption: "A server is a process that accepts a request, processes it, and sends a response back.", lit: { nodes: ["server"], wires: [], tone: "task" } },
        { caption: "The responses go back to each client.", lit: { nodes: [], wires: all("res"), tone: "task" } },
        {
            caption: "Millions of clients can do this at once. Handling them one by one would be far too slow.",
            lit: { nodes: [...all("c"), "server"], wires: [...all("req"), ...all("res")], tone: "task" },
        },
    ];
    return (
        <FlowFigure
            description={["A phone app, a browser and another app send requests to a server process.", "The server process sends responses back."]}
            figcaption="Clients raise requests; a server process accepts them and responds."
            height={124}
            nodes={nodes}
            overview="Many clients, one server process. Press Play to send requests."
            steps={steps}
            width={360}
            wires={wires}
        />
    );
}

type ThreadStep = Readonly<{ caption: string; lit: readonly string[]; t1?: string; t2?: string; heap?: boolean }>;

const threadSteps: readonly ThreadStep[] = [
    { caption: "One process address space. Its code, globals and heap are shared by every thread in the process.", lit: ["code", "globals", "heap"] },
    { caption: "Thread T1 has its own stack, its own execution position (the program counter) and its own register state.", lit: ["s1", "t1"] },
    { caption: "T2 also has its own stack, program counter and registers. Its program counter can point somewhere different from T1's.", lit: ["s2", "t2"] },
    {
        caption: "If `f1` runs on both threads, each call gets its own local variables on its own stack.",
        lit: ["s1", "s2", "t1", "t2"],
        t1: "f1: count = 1",
        t2: "f1: count = 9",
    },
    {
        caption: "Both threads can reach the same objects on the heap. Sharing one address space is what makes threads cheaper than whole processes.",
        lit: ["heap", "s1", "s2"],
        t1: "f1: count = 1",
        t2: "f1: count = 9",
        heap: true,
    },
];

export function AddressSpaceFigure() {
    const stepper = useStepper(threadSteps.length);
    const step = stepper.index >= 0 ? threadSteps[stepper.index] : null;
    const state = (id: string) => (step ? (step.lit.includes(id) ? "on" : "off") : undefined);
    const region = (id: string, y: number, h: number, label: string, tone?: string, sub?: string) => (
        <g className="gf-node" data-state={state(id)} data-tone={tone}>
            <rect height={h} rx="3" width="150" x="8" y={y} />
            <text className="gf-node__label" x="16" y={y + (sub ? h / 2 - 1 : h / 2 + 3.4)}>
                {label}
            </text>
            {sub && (
                <text className="gf-node__sub" x="16" y={y + h / 2 + 10}>
                    {sub}
                </text>
            )}
        </g>
    );
    const thread = (id: string, y: number, name: string, pc: string, tone: string) => (
        <g className="gf-node" data-state={state(id)} data-tone={tone}>
            <rect height="40" rx="5" width="148" x="204" y={y} />
            <text className="gf-node__label" x="214" y={y + 15}>
                {name}
            </text>
            <text className="gf-node__sub" x="214" y={y + 28}>
                {pc}
            </text>
        </g>
    );
    return (
        <FigureFrame
            caption={
                <Note>
                    {step?.caption ?? "Threads live inside one process. Press Play to see what they share and what each keeps for itself."}
                </Note>
            }
            description={[
                "Process address space: shared code, globals and heap; thread T1 stack; thread T2 stack.",
                "T1 and T2 each have their own execution position and register state.",
            ]}
            figcaption="Shared code and heap, private stacks and program counters."
            stage={
                <svg aria-hidden="true" className="gf-flow" viewBox="0 0 360 222">
                    <defs>
                        <marker id="gf-arrow-threads" markerHeight="6" markerWidth="6" orient="auto-start-reverse" refX="5" refY="3" viewBox="0 0 6 6">
                            <path className="gf-arrow" d="M0.5 0.8 5 3 0.5 5.2" />
                        </marker>
                    </defs>
                    <text className="gf-group__label" x="8" y="10">
                        process address space
                    </text>
                    {region("code", 16, 38, "code (text)", undefined, "shared by all threads")}
                    {region("globals", 58, 24, "globals")}
                    {region("heap", 86, 50, "heap", undefined, step?.heap ? "{ likes: 41 } shared" : "objects, shared")}
                    {region("s1", 140, 36, "T1 stack", "task", step?.t1)}
                    {region("s2", 180, 36, "T2 stack", "accent", step?.t2)}
                    {thread("t1", 120, "Thread T1", "PC → f1, line 3", "task")}
                    {thread("t2", 172, "Thread T2", "PC → f1, line 7", "accent")}
                    <g className="gf-wire" data-state={state("t1")} data-tone="task">
                        <path d="M204 140 H184 Q178 140 178 134 V30 Q178 26 174 26 H160" markerEnd="url(#gf-arrow-threads)" />
                    </g>
                    <g className="gf-wire" data-state={state("t2")} data-tone="accent">
                        <path d="M204 192 H196 Q190 192 190 186 V44 Q190 40 186 40 H160" markerEnd="url(#gf-arrow-threads)" />
                    </g>
                    {step?.heap && (
                        <>
                            <g className="gf-wire" data-state="on" data-tone="task">
                                <path d="M140 150 Q150 150 150 140 V122" markerEnd="url(#gf-arrow-threads)" />
                            </g>
                            <g className="gf-wire" data-state="on" data-tone="accent">
                                <path d="M128 190 Q138 190 138 180 V122" markerEnd="url(#gf-arrow-threads)" />
                            </g>
                        </>
                    )}
                </svg>
            }
            stepper={stepper}
        />
    );
}
