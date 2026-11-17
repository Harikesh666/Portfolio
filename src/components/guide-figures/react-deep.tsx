import { BitsFigure, ListFigure, TimelineFigure, TreeFigure, type ListCell, type TimelineBlock } from "./kinds";
import { FlowFigure, type FlowNode, type FlowStep, type FlowWire, type Tone } from "./kit";
import { SlotsFigure } from "./slots";

/*
 * Second-pass figures for the React guides: the hardest mechanisms in each
 * guide, drawn with the tree, timeline, keyed-list and bits kinds.
 */

const node = (id: string, x: number, y: number, w: number, h: number, label: string, sub?: string | readonly string[], tone?: Tone): FlowNode => ({
    id,
    x,
    y,
    w,
    h,
    label,
    sub: sub === undefined ? undefined : typeof sub === "string" ? [sub] : sub,
    tone,
});

const subs = (entries: Record<string, string | readonly string[]>) =>
    Object.fromEntries(Object.entries(entries).map(([id, sub]) => [id, { sub: typeof sub === "string" ? [sub] : sub }]));

const block = (lane: string, start: number, end: number, label?: string, tone?: TimelineBlock["tone"]): TimelineBlock => ({ lane, start, end, label, tone });

const cell = (label: string, identity: number, detail?: string): ListCell => ({ label, identity, detail });

/* ── Rendering and reconciliation ── */

export function KeysReorderFigure() {
    const before = [cell("Ana", 0, "ana"), cell("Bo", 1, "bo"), cell("Cy", 2, "cy")];
    return (
        <ListFigure
            spec={{
                rows: ["before", "after"],
                steps: [
                    { caption: "Three items, each with an input. The text typed in an input belongs to the instance, not to the data.", cells: [before, []] },
                    {
                        caption: "The data is reordered. React must now decide which old fiber each new element reuses.",
                        cells: [before, [cell("Cy", 3, "?"), cell("Ana", 3, "?"), cell("Bo", 3, "?")]],
                    },
                    {
                        caption: "With `key={id}`, keys stop matching by position, so React builds a `Map` from key to old fiber.",
                        cells: [before, [cell("Cy", 3, "key c"), cell("Ana", 3, "key a"), cell("Bo", 3, "key b")]],
                    },
                    {
                        caption: "Each new element finds its key and reuses that fiber. The DOM node is moved, not recreated, so state travels with the item.",
                        cells: [before, [cell("Cy", 2, "cy"), cell("Ana", 0, "ana"), cell("Bo", 1, "bo")]],
                        links: [
                            [2, 0],
                            [0, 1],
                            [1, 2],
                        ],
                    },
                    {
                        caption: "With the index as key, slot 0 is the same fiber, so React reuses it for a different item and only updates props.",
                        cells: [before, [cell("Cy", 0), cell("Ana", 1), cell("Bo", 2)]],
                        links: [
                            [0, 0],
                            [1, 1],
                            [2, 2],
                        ],
                    },
                    {
                        caption: "Uncontrolled input text, focus and transitions stick to the slot, so state lands on the wrong row after a reorder.",
                        cells: [before, [cell("Cy", 0, "ana"), cell("Ana", 1, "bo"), cell("Bo", 2, "cy")]],
                        links: [
                            [0, 0],
                            [1, 1],
                            [2, 2],
                        ],
                        wrong: [
                            [1, 0],
                            [1, 1],
                            [1, 2],
                        ],
                    },
                ],
                overview: "The same reorder, with stable keys and then with index keys. Colour is the fiber, and with it the DOM node and its state. Press Play to compare.",
                figcaption: "Stable keys move state with the item, index keys leave it behind in the slot.",
                description: ["Ana, Bo and Cy are reordered to Cy, Ana, Bo.", "With id keys each fiber moves with its item. With index keys each slot keeps its fiber, so typed text stays in place."],
            }}
        />
    );
}

export function WorkLoopFigure() {
    return (
        <TreeFigure
            spec={{
                nodes: [
                    { id: "app", label: "App", sub: "root of update" },
                    { id: "header", label: "Header", parent: "app" },
                    { id: "main", label: "Main", parent: "app" },
                    { id: "chart", label: "Chart", parent: "main", sub: "props unchanged" },
                    { id: "list", label: "List", parent: "main" },
                    { id: "item", label: "Item", parent: "list" },
                ],
                steps: [
                    {
                        caption: "Going down, `beginWork` calls your component, runs its hooks and reconciles the children. It returns the first child as the next unit of work.",
                        states: { app: "renders" },
                    },
                    {
                        caption: "Header has no children, so `completeWork` runs on it. For host components this creates the DOM node off-screen. Then React moves to the sibling.",
                        states: { app: "renders", header: "renders" },
                    },
                    {
                        caption: "Main is begun next. Between every unit of work the loop checks `shouldYield()`, which is what lets rendering pause.",
                        states: { app: "renders", main: "renders" },
                        subs: { header: "completed" },
                    },
                    {
                        caption: "The bailout: unchanged props, no pending state, unchanged context, and `childLanes` shows no work below. React skips the subtree.",
                        states: { app: "renders", main: "renders", chart: "skipped" },
                        subs: { header: "completed", chart: "skipped" },
                    },
                    {
                        caption: "React goes down into List, then Item. It is depth-first traversal using `child`, `sibling` and `return` pointers, not recursion.",
                        states: { app: "renders", main: "renders", chart: "skipped", list: "renders", item: "renders" },
                        subs: { header: "completed", chart: "skipped" },
                    },
                    {
                        caption: "Going up, `completeWork` finishes each fiber and bubbles `flags` and `lanes` into the parent's `subtreeFlags` and `childLanes`.",
                        states: { chart: "skipped" },
                        subs: { app: "completed", header: "completed", main: "completed", chart: "skipped", list: "completed", item: "completed" },
                    },
                ],
                overview: "A small tree, walked one fiber at a time. Press Play to see where `beginWork` runs, where a subtree is skipped, and where `completeWork` runs.",
                figcaption: "Render is an explicit loop of down, across and up steps, so React can pause between any two of them.",
                description: ["App has children Header and Main. Main has Chart and List. List has Item.", "React begins each fiber on the way down, skips Chart, and completes each fiber on the way up."],
            }}
        />
    );
}

export function CommitPhasesFigure() {
    const steps = [
        { caption: "The render phase builds the work-in-progress tree. It must be pure, and React may pause, restart or discard it.", blocks: [block("Render", 0, 3, "render")] },
        {
            caption: "Commit is one synchronous, uninterruptible burst. Before mutation runs first, and React schedules passive effects for after paint.",
            blocks: [block("Commit", 3, 4.5, "before", "strong")],
        },
        {
            caption: "Mutation inserts, moves and removes nodes, applies prop updates, detaches old refs, and runs `useLayoutEffect` cleanups from the previous render.",
            blocks: [block("Commit", 4.5, 6, "mutate", "strong")],
        },
        {
            caption: "Layout runs after the DOM is updated but before paint: `useLayoutEffect` setup and ref attach. It can measure without flicker, but it blocks paint.",
            blocks: [block("Commit", 6, 7.5, "layout", "strong")],
        },
        { caption: "The browser paints. The user now sees the update.", blocks: [block("Browser", 7.5, 9, "paint", "accent")] },
        {
            caption: "After paint, passive effects flush asynchronously: the previous render's `useEffect` cleanup, then this render's setup. They do not delay what the user sees.",
            blocks: [block("Effects", 9.2, 12, "useEffect")],
        },
    ];
    // Each step adds its block to everything before it.
    const cumulative = steps.map((step, index) => ({ caption: step.caption, blocks: steps.slice(0, index + 1).flatMap((one) => one.blocks), at: steps[index].blocks[0].end }));
    return (
        <TimelineFigure
            spec={{
                lanes: ["Render", "Commit", "Browser", "Effects"],
                span: 12,
                axis: "time →",
                steps: cumulative,
                overview: "One update traced from render through the three commit sub-phases, paint and passive effects. Press Play to see when each hook runs.",
                figcaption: "Render may run many times, commit runs once, and passive effects wait until after paint.",
                description: ["Render, then commit: before mutation, mutation, layout. Then the browser paints. Then useEffect runs."],
            }}
        />
    );
}

/* ── Hooks and effects ── */

export function UpdaterFoldFigure() {
    return (
        <SlotsFigure
            spec={{
                fileName: "handleClick.js",
                source: ["// value form", "setCount(count + 1);", "setCount(count + 1);", "setCount(count + 1);", "", "// updater form", "setCount((c) => c + 1);", "setCount((c) => c + 1);", "setCount((c) => c + 1);"],
                names: ["count in this render", "update queue", "next render's count"],
                title: "one click",
                steps: [
                    { caption: "In `handleClick`, `count` is `0` for this whole render. It is a snapshot, and snapshots do not move.", line: 1, values: ["0", "empty", "—"] },
                    {
                        caption: "Each `setCount(count + 1)` appends an update to the hook's queue. All three read the same snapshot, so each holds the literal value `1`.",
                        line: 3,
                        values: ["0", "1, 1, 1", "—"],
                    },
                    { caption: "Batching means one render, and your function does not re-run between the setter calls.", line: null, values: ["0", "1, 1, 1", "—"] },
                    {
                        caption: "On the next render `useState` folds the queue, starting from the last committed value. Three \"set to 1\" updates land on `1`.",
                        line: null,
                        values: ["0", "1, 1, 1", "0 → 1 → 1 → 1"],
                    },
                    { caption: "With `setCount((c) => c + 1)`, each update holds a function instead of a value.", line: 8, values: ["0", "(c) => c + 1, three times", "—"] },
                    {
                        caption: "Each updater receives the running result of the previous one, so they compose to `3`. When next state depends on previous state, use the updater form.",
                        line: null,
                        values: ["0", "(c) => c + 1, three times", "0 → 1 → 2 → 3"],
                    },
                ],
                overview: "The same three setter calls, written two ways and folded through the hook's update queue. Press Play to watch the fold produce 1, and then 3.",
                figcaption: "The value form reads a stale snapshot, the updater form reads the running result.",
            }}
        />
    );
}

export function EffectCleanupFigure() {
    const steps = [
        {
            caption: "On the first run React calls `create`, which subscribes to room A, and stores the returned function as `destroy`.",
            blocks: [block("Render", 0, 1.6, "A"), block("Effect A", 1.6, 3.6, "subscribe"), block("Active", 3.6, 4.4, "A", "accent")],
        },
        {
            caption: "If the dependencies are unchanged, React does nothing: no cleanup and no setup.",
            blocks: [block("Render", 0, 1.6, "A"), block("Effect A", 1.6, 3.6, "subscribe"), block("Render", 4.4, 6, "A"), block("Active", 3.6, 6, "A", "accent")],
        },
        {
            caption: "`roomId` changed from `A` to `B`, so the dependencies changed.",
            blocks: [block("Render", 0, 1.6, "A"), block("Effect A", 1.6, 3.6, "subscribe"), block("Render", 4.4, 6, "A"), block("Render", 6, 7.6, "B"), block("Active", 3.6, 7.6, "A", "accent")],
        },
        {
            caption: "React first calls the stored `destroy`, cleaning up the previous render's synchronization.",
            blocks: [
                block("Render", 0, 1.6, "A"),
                block("Effect A", 1.6, 3.6, "subscribe"),
                block("Render", 4.4, 6, "A"),
                block("Render", 6, 7.6, "B"),
                block("Active", 3.6, 7.6, "A", "accent"),
                block("Effect A", 7.6, 9.6, "cleanup", "accent"),
            ],
        },
        {
            caption: "Then it calls `create` again and stores the new cleanup. Exactly one subscription is active.",
            blocks: [
                block("Render", 0, 1.6, "A"),
                block("Effect A", 1.6, 3.6, "subscribe"),
                block("Render", 4.4, 6, "A"),
                block("Render", 6, 7.6, "B"),
                block("Active", 3.6, 7.6, "A", "accent"),
                block("Effect A", 7.6, 9.6, "cleanup", "accent"),
                block("Effect B", 9.6, 11.4, "subscribe"),
                block("Active", 11.4, 12, "B", "accent"),
            ],
        },
        {
            caption: "On unmount React calls the stored `destroy` one last time, with no setup after it. Every setup had its cleanup.",
            blocks: [
                block("Render", 0, 1.6, "A"),
                block("Effect A", 1.6, 3.6, "subscribe"),
                block("Render", 4.4, 6, "A"),
                block("Render", 6, 7.6, "B"),
                block("Active", 3.6, 7.6, "A", "accent"),
                block("Effect A", 7.6, 9.6, "cleanup", "accent"),
                block("Effect B", 9.6, 11.4, "subscribe"),
                block("Effect B", 11.4, 12, undefined, "accent"),
            ],
        },
    ];
    return (
        <TimelineFigure
            spec={{
                lanes: ["Render", "Effect A", "Effect B", "Active"],
                span: 12,
                axis: "mount → change to B → unmount",
                steps: steps.map((step) => ({ ...step, at: Math.max(...step.blocks.map((one) => one.end)) })),
                overview: "A subscription effect followed through mount, a change from room A to B, and unmount. Press Play to see cleanup run before every re-run.",
                figcaption: "Cleanup is not unmount-only: it runs before every re-synchronization, so each setup has its pair.",
                description: ["Mount subscribes to A. Changing to B unsubscribes A, then subscribes B. Unmount unsubscribes B."],
            }}
        />
    );
}

export function LayoutEffectFigure() {
    const run1 = [block("React commit", 0, 1.5, "mutate", "strong"), block("Browser paint", 1.5, 3, "initial", "accent"), block("Effects", 3, 4.6, "measure")];
    const flash = [...run1, block("React commit", 4.6, 5.4, undefined, "strong"), block("Browser paint", 5.4, 6, undefined, "accent")];
    const run2 = [block("React commit", 6.4, 7.8, "mutate", "strong"), block("React commit", 7.8, 10.6, "layout effect", "strong")];
    const markers = [{ at: 0.1, label: "useEffect" }];
    const both = [...markers, { at: 6.4, label: "useLayoutEffect" }];
    return (
        <TimelineFigure
            spec={{
                lanes: ["React commit", "Browser paint", "Effects"],
                span: 12,
                steps: [
                    { caption: "React mutates the real DOM to match the new render. The browser has not painted it yet.", blocks: run1.slice(0, 1), markers, at: 1.5 },
                    { caption: "With `useEffect`, the browser paints the element in its initial position first.", blocks: run1.slice(0, 2), markers, at: 3 },
                    { caption: "Later, asynchronously, the effect measures and sets state, causing another render and another paint.", blocks: run1, markers, at: 4.6 },
                    { caption: "The user sees the intermediate frame: a flash.", blocks: flash, markers, at: 6 },
                    {
                        caption: "`useLayoutEffect` runs synchronously after the DOM mutation, before paint. Measuring and repositioning happen here.",
                        blocks: [...flash, ...run2],
                        markers: both,
                        at: 10.6,
                    },
                    {
                        caption: "The user only ever sees the corrected position. The cost is that this step blocks paint, so keep it cheap.",
                        blocks: [...flash, ...run2, block("Browser paint", 10.6, 12, "final", "accent")],
                        markers: both,
                        at: 12,
                    },
                ],
                overview: "The same positioning, first in `useEffect` and then in `useLayoutEffect`, with paint marked on the timeline. Press Play to see where the flicker comes from.",
                figcaption: "Use `useEffect` by default, and `useLayoutEffect` only to prevent a visible flicker.",
                description: ["useEffect: mutate, paint, measure, re-render, paint again. A flash.", "useLayoutEffect: mutate, measure before paint, one paint."],
            }}
        />
    );
}

/* ── Scheduler and lanes ── */

export function TimeSlicingFigure() {
    const all = [
        block("React work", 0, 2, "slice 1"),
        block("MessageChannel", 2, 3, "post", "accent"),
        block("Browser", 3, 5.5, "paint, input", "strong"),
        block("MessageChannel", 5.5, 7, "message", "accent"),
        block("React work", 7, 9, "slice 2"),
        block("Browser", 9, 10.4, "paint", "strong"),
        block("React work", 10.4, 12, "slice 3"),
    ];
    const deadline = [{ at: 2, label: "about 5ms" }];
    return (
        <TimelineFigure
            spec={{
                lanes: ["React work", "Browser", "MessageChannel"],
                span: 12,
                axis: "time →",
                steps: [
                    {
                        caption: "`performWorkUntilDeadline` records a deadline, then runs scheduled work, checking after each unit whether `now >= deadline`.",
                        blocks: all.slice(0, 1),
                        markers: deadline,
                        at: 2,
                    },
                    {
                        caption: "The deadline arrives with work left, so the scheduler posts a message to schedule the next chunk as a macrotask, then returns and yields.",
                        blocks: all.slice(0, 2),
                        markers: deadline,
                        at: 3,
                    },
                    { caption: "A macrotask runs after the browser has had the chance to paint and handle input, unlike a microtask.", blocks: all.slice(0, 3), markers: deadline, at: 5.5 },
                    {
                        caption: "The `message` event arrives promptly, with no 4ms `setTimeout` clamp, and calls `performWorkUntilDeadline` again for another slice.",
                        blocks: all.slice(0, 5),
                        markers: deadline,
                        at: 9,
                    },
                    { caption: "This repeats until the render finishes: the chopped-up pattern you see in a Performance panel trace.", blocks: all, markers: deadline, at: 12 },
                ],
                overview: "A render, sliced into chunks of about 5ms, each ending with a `MessageChannel` post and a browser turn. Press Play to watch the yield-and-resume cycle.",
                figcaption: "Posting a `MessageChannel` message yields after paint, without the `setTimeout` delay.",
                description: ["React works for about 5ms, posts a message, lets the browser paint and handle input, then resumes on the message event."],
            }}
        />
    );
}

export function StarvationFigure() {
    const pending = (on: number[]) => ({ label: "pendingLanes", on });
    const expired = (on: number[]) => ({ label: "expiredLanes", on, tone: "accent" as const });
    const render = (on: number[]) => ({ label: "renderLanes", on, tone: "strong" as const });
    return (
        <BitsFigure
            spec={{
                bits: ["DefaultLane", "TransitionLane"],
                steps: [
                    {
                        caption: "Each lane gets an expiration time when it first becomes pending. Lower priority lanes get later times.",
                        rows: [pending([0, 1]), expired([]), render([])],
                    },
                    { caption: "`getNextLanes` picks the highest priority pending lane, so the urgent work renders first.", rows: [pending([0, 1]), expired([]), render([0])] },
                    {
                        caption: "Urgent updates keep arriving, so the transition is deferred again and again. This is starvation.",
                        rows: [pending([0, 1]), expired([]), render([0])],
                    },
                    {
                        caption: "On each scheduling pass, before choosing lanes, `markStarvedLanesAsExpired` walks the pending lanes and checks their expiration times.",
                        rows: [pending([0, 1]), expired([]), render([])],
                    },
                    { caption: "A lane that has waited past its expiration time is added to the root's `expiredLanes` set.", rows: [pending([0, 1]), expired([1]), render([])] },
                    {
                        caption: "Expired lanes are forced in regardless of priority and render synchronously, not time-sliced. The stale work finishes.",
                        rows: [pending([0, 1]), expired([1]), render([1])],
                    },
                ],
                overview: "A low-priority transition lane is outranked by constant urgent updates until its expiration time passes. Press Play to see it forced through.",
                figcaption: "Priority sets the normal order, and expiration puts a deadline on that order.",
                description: ["The transition lane waits behind the default lane until it expires, then it renders synchronously."],
            }}
        />
    );
}

export function EntanglementFigure() {
    const rows = (pending: number[], entangled: number[], render: number[]) => [
        { label: "pendingLanes", on: pending },
        { label: "entangled", on: entangled, tone: "accent" as const },
        { label: "renderLanes", on: render, tone: "strong" as const },
    ];
    return (
        <BitsFigure
            spec={{
                bits: ["DefaultLane", "Transition A", "Transition B"],
                steps: [
                    { caption: "Lanes let React render updates in separate passes. That is what lets urgent work jump ahead.", rows: rows([0, 1, 2], [], []) },
                    { caption: "Normally an urgent update renders in its own pass, ahead of the transitions.", rows: rows([0, 1, 2], [], [0]) },
                    {
                        caption: "If two related updates split into different passes, the user can see one applied and the other not: an inconsistent, torn state.",
                        rows: rows([1, 2], [], [1]),
                    },
                    {
                        caption: "Entanglement declares that if either lane renders, the other must render in the same pass. Transitions touching the same state are one case.",
                        rows: rows([1, 2], [1, 2], []),
                    },
                    {
                        caption: "When `getNextLanes` selects an entangled lane, it adds every lane entangled with it to `renderLanes` for that pass.",
                        rows: rows([1, 2], [1, 2], [1, 2]),
                    },
                    {
                        caption: "The related updates apply together. React splits by default for responsiveness, and entangles where splitting would break consistency.",
                        rows: rows([], [1, 2], [1, 2]),
                    },
                ],
                overview: "Two related transition lanes, first split across passes, then entangled so they render together. Press Play to see the difference.",
                figcaption: "Split lanes for responsiveness, entangle lanes where splitting would show an inconsistent UI.",
                description: ["Transition A and B, when entangled, are always in the same renderLanes."],
            }}
        />
    );
}

/* ── Suspense ── */

export function SuspensePingFigure() {
    const nodes = [
        node("comp", 8, 8, 150, 38, "Comp", "reads the async value", "accent"),
        node("promise", 202, 8, 150, 38, "thrown promise", "pending", "accent"),
        node("subtree", 8, 82, 150, 38, "suspended subtree", "waits", "task"),
        node("boundary", 202, 82, 150, 38, "<Suspense>", "nearest boundary"),
        node("lane", 8, 156, 150, 38, "retry lane", "dedicated lanes", "task"),
        node("ping", 202, 156, 150, 38, "ping callback", ".then on the thenable", "task"),
    ];
    const wires: FlowWire[] = [
        { id: "throws", d: "M158 27 H200", tone: "accent", label: { text: "throws", x: 179, y: 21 } },
        { id: "caught", d: "M277 46 V80", tone: "accent", label: { text: "caught in unwind", x: 283, y: 66, anchor: "start" } },
        { id: "subscribes", d: "M277 120 V154", label: { text: "subscribes", x: 283, y: 140, anchor: "start" } },
        { id: "schedules", d: "M202 175 H160", tone: "task", label: { text: "resolves", x: 181, y: 169 } },
        { id: "retry", d: "M83 156 V122", tone: "task", label: { text: "retry render", x: 89, y: 142, anchor: "start" } },
        { id: "replaces", d: "M158 101 H200", tone: "task", label: { text: "content", x: 179, y: 95 } },
    ];
    const steps: FlowStep[] = [
        { caption: "A component suspends by throwing a promise. The value it read was still pending.", lit: { nodes: ["comp", "promise"], wires: ["throws"], tone: "accent" } },
        {
            caption: "The unwind reaches the nearest `<Suspense>` boundary, which shows its fallback, so the user sees a loading state.",
            lit: { nodes: ["promise", "boundary"], wires: ["caught"], tone: "accent" },
            patch: subs({ boundary: "shows fallback" }),
        },
        {
            caption: "React subscribes to the thrown promise by attaching a callback, a \"ping\". It does not poll or guess.",
            lit: { nodes: ["boundary", "ping"], wires: ["subscribes"], tone: "task" },
            patch: subs({ boundary: "shows fallback", ping: "attached" }),
        },
        {
            caption: "When the promise resolves, the callback fires. It tells React the thing the component was waiting on is ready.",
            lit: { nodes: ["promise", "ping"], wires: [], tone: "task" },
            patch: subs({ boundary: "shows fallback", ping: "fired", promise: "resolved" }),
        },
        {
            caption: "React schedules a retry on a retry lane. The subtree re-renders as normal prioritized work, picked up like any pending lane.",
            lit: { nodes: ["ping", "lane", "subtree"], wires: ["schedules", "retry"], tone: "task" },
            patch: subs({ boundary: "shows fallback", promise: "resolved", subtree: "re-renders" }),
        },
        {
            caption: "The component reads the resolved promise, so it does not suspend this time. The content replaces the fallback.",
            lit: { nodes: ["subtree", "boundary", "comp"], wires: ["replaces"], tone: "task" },
            patch: subs({ boundary: "shows content", promise: "resolved", subtree: "rendered", comp: "reads resolved value" }),
        },
        {
            caption: "If the component creates a new promise on retry, it suspends again and loops forever. Cache the promise so the retry reads the resolved one.",
            lit: { nodes: ["comp", "promise"], wires: ["throws"], tone: "accent" },
            patch: subs({ comp: "fresh fetch on retry", promise: "new, pending again" }),
        },
    ];
    return (
        <FlowFigure
            description={["A component throws a pending promise. The nearest Suspense boundary shows its fallback and subscribes to the promise.", "When it resolves, a retry on a retry lane re-renders the subtree, and the content replaces the fallback."]}
            figcaption="React subscribes to the thrown promise, so a resolve schedules a retry on a retry lane."
            height={202}
            nodes={nodes}
            overview="A suspended component never asks to be re-rendered, because React listens to the very promise it threw. Press Play to follow one suspension to its retry."
            steps={steps}
            width={360}
            wires={wires}
        />
    );
}

export function SuspenseNestingFigure() {
    return (
        <TreeFigure
            spec={{
                nodes: [
                    { id: "outer", label: "outer Suspense", sub: "PageSkeleton" },
                    { id: "frame", label: "PageFrame", parent: "outer", sub: "needs page data" },
                    { id: "inner", label: "inner Suspense", parent: "frame", sub: "DetailSkeleton" },
                    { id: "detail", label: "Detail", parent: "inner", sub: "needs slower data" },
                ],
                initial: { outer: "boundary", inner: "boundary" },
                steps: [
                    {
                        caption: "First render, with both data pending. `PageFrame` suspends and unwinds to the outer boundary, the nearest above it.",
                        states: { outer: "boundary", frame: "suspended" },
                    },
                    {
                        caption: "The outer boundary shows `PageSkeleton`. The inner boundary is not relevant yet, because its parent has not rendered.",
                        states: { outer: "fallback", frame: "suspended" },
                        subs: { outer: "shows PageSkeleton" },
                    },
                    {
                        caption: "`PageFrame`'s data resolves and the outer boundary retries. Its children now render, and `Detail`, still pending, suspends.",
                        states: { outer: "boundary", frame: "renders", inner: "boundary", detail: "suspended" },
                    },
                    {
                        caption: "`Detail` unwinds to the inner boundary, now the nearest above it. The frame is visible while the inner boundary shows `DetailSkeleton`.",
                        states: { outer: "boundary", frame: "renders", inner: "fallback", detail: "suspended" },
                        subs: { inner: "shows DetailSkeleton" },
                    },
                    {
                        caption: "`Detail`'s data resolves and the inner boundary retries. The user saw the page skeleton, then the frame with a detail skeleton, then the full page.",
                        states: { outer: "boundary", frame: "renders", inner: "boundary", detail: "renders" },
                    },
                    {
                        caption: "If the outer data were slower than the inner, the inner could not reveal first: it does not render until its parent renders.",
                        states: { outer: "fallback", frame: "suspended" },
                        subs: { frame: "slower than Detail", outer: "shows PageSkeleton" },
                    },
                ],
                overview: "Each suspension is caught by the nearest enclosing boundary, so nesting decides the reveal order. Press Play to watch the shell appear before the detail.",
                figcaption: "An outer boundary reveals its content while an inner boundary still shows its fallback.",
                description: ["outer Suspense wraps PageFrame, which wraps inner Suspense, which wraps Detail."],
            }}
        />
    );
}

export function FallbackThrottleFigure() {
    const fast = [block("Promise", 0, 1.5, "pending", "muted")];
    const flash = [...fast, block("Naive", 0, 1.5, "flash", "accent"), block("Naive", 1.5, 3, "content")];
    const skip = [...flash, block("React", 1.5, 3, "content")];
    const resolves = [...skip, block("Promise", 4, 4.6, undefined, "muted"), block("Promise", 4.8, 5.4, undefined, "muted"), block("Promise", 5.6, 6.2, undefined, "muted")];
    const popcorn = [...resolves, block("Naive", 4.6, 5.4), block("Naive", 5.4, 6.2), block("Naive", 6.2, 7), block("React", 6.2, 8.2, "together")];
    const slow = [...popcorn, block("Promise", 8.6, 12, "slow", "muted"), block("React", 8.6, 10.6, "fallback", "accent"), block("React", 10.6, 12, "content")];
    return (
        <TimelineFigure
            spec={{
                lanes: ["Promise", "Naive", "React"],
                span: 12,
                axis: "time →",
                steps: [
                    { caption: "A component suspends on a very fast promise: tens of milliseconds, from a warm cache or a fast network.", blocks: fast, at: 1.5 },
                    {
                        caption: "A naive implementation shows the fallback the instant it suspends. It flashes and vanishes, which feels broken and is worse than no fallback.",
                        blocks: flash,
                        at: 3,
                    },
                    {
                        caption: "React throttles fallbacks. If the suspension resolves within a short window, it skips the fallback and the content appears directly.",
                        blocks: skip,
                        at: 3,
                    },
                    { caption: "Several boundaries resolve at slightly different times. Revealing each at once would pop content in piece by piece: the popcorn UI.", blocks: resolves, at: 6.2 },
                    { caption: "React staggers or batches the reveals. It trades a little reveal latency for fewer distinct visual updates.", blocks: popcorn, at: 8.2 },
                    {
                        caption: "When content is clearly slow, the fallback does show. Throttling smooths small timing differences, not slow data.",
                        blocks: slow,
                        at: 12,
                    },
                ],
                overview: "React deliberately does not show every fallback or reveal every boundary the instant it could. Press Play to compare naive Suspense with React's.",
                figcaption: "Throttling suppresses fallback flashes and popcorn reveals at the cost of a little latency.",
                description: ["A fast promise: naive Suspense flashes a fallback, React shows content directly.", "Staggered resolves: naive reveals pop in one by one, React reveals together."],
            }}
        />
    );
}

/* ── Error boundaries ── */

export function BoundaryMethodsFigure() {
    const nodes = [
        node("child", 8, 8, 150, 38, "child component", "renders", "accent"),
        node("derive", 202, 8, 150, 38, "getDerivedStateFromError", "render phase, pure", "task"),
        node("service", 8, 82, 150, 38, "error service", "logging", "accent"),
        node("render", 202, 82, 150, 38, "boundary render()", "children", "task"),
        node("catch", 8, 156, 150, 38, "componentDidCatch", "side effects", "accent"),
        node("commit", 202, 156, 150, 38, "commit phase", "—", "strong"),
    ];
    const wires: FlowWire[] = [
        { id: "caught", d: "M158 27 H200", tone: "accent", label: { text: "error", x: 179, y: 21 } },
        { id: "state", d: "M277 46 V80", tone: "task", label: { text: "returns state", x: 283, y: 66, anchor: "start" } },
        { id: "fallback", d: "M277 120 V154", label: { text: "fallback", x: 283, y: 140, anchor: "start" } },
        { id: "info", d: "M202 175 H160", tone: "accent", label: { text: "error", x: 181, y: 169 } },
        { id: "log", d: "M83 156 V122", tone: "accent", label: { text: "componentStack", x: 89, y: 142, anchor: "start" } },
    ];
    const steps: FlowStep[] = [
        { caption: "A component below the boundary throws during render, and React catches the error.", lit: { nodes: ["child"], wires: [], tone: "accent" }, patch: subs({ child: "throws" }) },
        {
            caption: "React re-renders the boundary and calls `getDerivedStateFromError` with the thrown error. It runs in the render phase, so it must be pure.",
            lit: { nodes: ["child", "derive"], wires: ["caught"], tone: "task" },
            patch: subs({ child: "throws" }),
        },
        {
            caption: "It returns state, which is merged into the boundary's state. No logging, network calls or DOM work belong here.",
            lit: { nodes: ["derive", "render"], wires: ["state"], tone: "task" },
            patch: subs({ child: "throws", derive: "returns { hasError: true }" }),
        },
        { caption: "`render()` now returns the fallback instead of the children.", lit: { nodes: ["render"], wires: [], tone: "task" }, patch: subs({ child: "throws", render: "returns the fallback" }) },
        {
            caption: "React commits the fallback. Side effects are now appropriate, as in `componentDidMount` or an effect.",
            lit: { nodes: ["render", "commit"], wires: ["fallback"], tone: "strong" },
            patch: subs({ render: "returns the fallback", commit: "fallback on screen" }),
        },
        {
            caption: "`componentDidCatch` runs in the commit phase with the `error` and an `errorInfo` carrying `componentStack`, the component tree path.",
            lit: { nodes: ["commit", "catch"], wires: ["info"], tone: "accent" },
            patch: subs({ commit: "fallback on screen" }),
        },
        {
            caption: "Logging to your service belongs here. The fallback is the pure render-phase half, reporting is the commit-phase half.",
            lit: { nodes: ["catch", "service"], wires: ["log"], tone: "accent" },
            patch: subs({ commit: "fallback on screen" }),
        },
    ];
    return (
        <FlowFigure
            description={["getDerivedStateFromError runs in the render phase and picks the fallback.", "componentDidCatch runs in the commit phase and logs the error with its component stack."]}
            figcaption="`getDerivedStateFromError` picks the fallback purely, and `componentDidCatch` does the logging."
            height={202}
            nodes={nodes}
            overview="A boundary has two methods because catching an error needs work in two different phases. Press Play to see which method runs when."
            steps={steps}
            width={360}
            wires={wires}
        />
    );
}

export function ErrorForwardingFigure() {
    const nodes = [
        node("handler", 8, 8, 150, 38, "event handler", "try / catch", "accent"),
        node("local", 202, 8, 150, 38, "local handling", "setSaveError", "task"),
        node("state", 8, 82, 150, 38, "setError(e)", "error state", "accent"),
        node("show", 202, 82, 150, 38, "showBoundary(e)", "react-error-boundary", "accent"),
        node("render", 8, 156, 150, 38, "re-render", "if (error) throw error", "accent"),
        node("boundary", 202, 156, 150, 38, "nearest boundary", "—", "task"),
    ];
    const wires: FlowWire[] = [
        { id: "recoverable", d: "M158 27 H200", tone: "task", label: { text: "local", x: 179, y: 21 } },
        { id: "fatal", d: "M83 46 V80", tone: "accent", label: { text: "fatal", x: 89, y: 66, anchor: "start" } },
        { id: "or", d: "M158 38 H170 Q176 38 176 44 V95 Q176 101 182 101 H200", tone: "accent", label: { text: "or", x: 181, y: 70, anchor: "start" } },
        { id: "rerender", d: "M83 120 V154", tone: "accent", label: { text: "triggers", x: 89, y: 140, anchor: "start" } },
        { id: "same", d: "M277 120 V132 Q277 138 271 138 H170 Q164 138 164 144 V168 H160", tone: "accent", label: { text: "same dance", x: 283, y: 136, anchor: "start" } },
        { id: "throws", d: "M158 182 H200", tone: "task", label: { text: "throws", x: 179, y: 176 } },
    ];
    const steps: FlowStep[] = [
        {
            caption: "An error is thrown in an event handler or async code. Boundaries do not catch it directly, because they catch render errors only.",
            lit: { nodes: ["handler"], wires: [], tone: "accent" },
        },
        {
            caption: "Strategy one: catch it with `try`/`catch` and show an inline message. Right for local, recoverable failures, and the error never reaches a boundary.",
            lit: { nodes: ["handler", "local"], wires: ["recoverable"], tone: "task" },
        },
        {
            caption: "Strategy two, for a fatal failure that should show the same fallback as a render crash: catch the error and store it with `setError`.",
            lit: { nodes: ["handler", "state"], wires: ["fatal"], tone: "accent" },
        },
        { caption: "Setting state causes a re-render, and `if (error) throw error` makes that render throw.", lit: { nodes: ["state", "render"], wires: ["rerender"], tone: "accent" } },
        {
            caption: "Now it is a render-time error, so the unwind can catch it. The nearest boundary shows its fallback.",
            lit: { nodes: ["render", "boundary"], wires: ["throws"], tone: "task" },
            patch: subs({ boundary: "shows its fallback" }),
        },
        {
            caption: "`showBoundary(e)` from `useErrorBoundary()` is the cleaner version. Internally it does the same set-state-and-throw dance for you.",
            lit: { nodes: ["handler", "show", "render", "boundary"], wires: ["or", "same", "throws"], tone: "accent" },
            patch: subs({ boundary: "shows its fallback" }),
        },
    ];
    return (
        <FlowFigure
            description={["Recoverable errors are handled locally.", "Fatal ones are stored in state and re-thrown during render, or passed to showBoundary, so the nearest boundary catches them."]}
            figcaption="Forwarding turns a non-render error into a render-time throw, so a boundary can catch it."
            height={202}
            nodes={nodes}
            overview="React only routes render errors to boundaries, so other errors need your help. Press Play to see local handling and forwarding side by side."
            steps={steps}
            width={360}
            wires={wires}
        />
    );
}

export function BoundaryResetFigure() {
    return (
        <TreeFigure
            spec={{
                nodes: [
                    { id: "page", label: "Page", sub: "userId" },
                    { id: "boundary", label: "ErrorBoundary", parent: "page", sub: "resetKeys" },
                    { id: "profile", label: "UserProfile", parent: "boundary", sub: "userId" },
                    { id: "fallback", label: "Fallback", parent: "boundary", sub: "onRetry" },
                ],
                initial: { boundary: "boundary" },
                steps: [
                    {
                        caption: "`UserProfile` throws for one `userId`. `getDerivedStateFromError` has set the boundary's error state.",
                        states: { boundary: "boundary", profile: "error" },
                    },
                    {
                        caption: "The boundary renders the fallback on every render until that error state is cleared.",
                        states: { boundary: "boundary", profile: "skipped", fallback: "fallback" },
                    },
                    {
                        caption: "Manual reset: `reset` sets `hasError: false`, so the next render returns the children again.",
                        states: { boundary: "boundary", fallback: "fallback" },
                        subs: { fallback: "try again clicked" },
                    },
                    {
                        caption: "The identical conditions throw again, and the boundary catches again. Resetting with no change is the error-reset loop.",
                        states: { boundary: "boundary", profile: "error", fallback: "skipped" },
                    },
                    {
                        caption: "With `resetKeys`, a changed `userId` resets the boundary, so the children try again with different inputs and can succeed.",
                        states: { page: "renders", boundary: "boundary", profile: "renders", fallback: "skipped" },
                        subs: { page: "userId changed", boundary: "resetKeys changed" },
                    },
                    {
                        caption: "Changing the `key` remounts the subtree and clears the error along with all other state. It is heavier, but a clean start.",
                        states: { boundary: "renders", profile: "renders", fallback: "skipped" },
                        subs: { boundary: "new key: remount", profile: "fresh instance" },
                    },
                ],
                overview: "A boundary stays on its fallback until its error state is cleared, and clearing it blindly can loop. Press Play to compare a blind reset with one tied to a change.",
                figcaption: "Pair every reset with a change in conditions, or it just throws again.",
                description: ["Page renders an ErrorBoundary with resetKeys, which renders UserProfile or a Fallback."],
            }}
        />
    );
}

/* ── Event system ── */

export function CaptureBubbleFigure() {
    const all = [
        block("outer div", 0, 2, "capture", "accent"),
        block("inner section", 2, 4, "capture", "accent"),
        block("button", 4, 6, "capture", "accent"),
        block("button", 6, 8, "bubble"),
        block("inner section", 8, 10, "bubble"),
        block("outer div", 10, 12, "bubble"),
    ];
    const path = [{ at: 0.1, label: "path built" }];
    return (
        <TimelineFigure
            spec={{
                lanes: ["outer div", "inner section", "button"],
                span: 12,
                axis: "handler order →",
                steps: [
                    { caption: "A click lands on the button. The real listener is at the root container, not on your elements.", blocks: [] },
                    { caption: "React finds the target fiber and walks up to the root, building the propagation path from the fiber tree.", blocks: [], markers: path },
                    { caption: "The capture phase fires `onClickCapture` handlers in root-to-target order. The outermost handler runs first.", blocks: all.slice(0, 1), markers: path, at: 2 },
                    { caption: "Capture continues down to the button. Every React event has a `Capture` variant.", blocks: all.slice(0, 3), markers: path, at: 6 },
                    { caption: "The bubble phase fires `onClick` handlers in target-to-root order. The button runs first.", blocks: all.slice(0, 4), markers: path, at: 8 },
                    {
                        caption: "Bubble continues up to the outermost ancestor. React collected these handlers itself, with no per-element DOM listeners.",
                        blocks: all,
                        markers: path,
                        at: 12,
                    },
                ],
                overview: "React rebuilds capture and bubble order by walking its own fiber tree. Press Play to watch one click fire six handlers.",
                figcaption: "Capture runs root to target, then bubble runs target to root, along the fiber path.",
                description: ["Capture: outer, inner, button. Bubble: button, inner, outer."],
            }}
        />
    );
}

export function EventBatchingFigure() {
    const nodes = [
        node("dispatch", 8, 8, 150, 38, "event dispatch", "batched context", "task"),
        node("handlers", 202, 8, 150, 38, "your handleClick", "runs", "task"),
        node("flush", 8, 82, 150, 38, "flush", "after handlers finish", "accent"),
        node("queue", 202, 82, 150, 38, "update queue", "empty", "accent"),
        node("render", 8, 156, 150, 38, "one render", "at the event's priority", "task"),
        node("commit", 202, 156, 150, 38, "render and commit", "scheduler", "strong"),
    ];
    const wires: FlowWire[] = [
        { id: "enters", d: "M158 27 H200", tone: "task" },
        { id: "enqueue", d: "M277 46 V80", tone: "accent", label: { text: "enqueues", x: 283, y: 66, anchor: "start" } },
        { id: "done", d: "M202 101 H160", tone: "accent", label: { text: "done", x: 181, y: 95 } },
        { id: "once", d: "M83 120 V154", tone: "task", label: { text: "one render", x: 89, y: 140, anchor: "start" } },
        { id: "schedule", d: "M158 175 H200", tone: "task" },
    ];
    const steps: FlowStep[] = [
        { caption: "React begins dispatching the event and enters a batched context.", lit: { nodes: ["dispatch"], wires: [], tone: "task" } },
        {
            caption: "React calls the collected handlers. The first `setCount` enqueues an update but does not render, because React is batching.",
            lit: { nodes: ["handlers", "queue"], wires: ["enters", "enqueue"], tone: "accent" },
            patch: subs({ queue: "1 update" }),
        },
        { caption: "The second and third `setCount` calls enqueue too. Nothing has rendered yet.", lit: { nodes: ["queue"], wires: ["enqueue"], tone: "accent" }, patch: subs({ queue: "3 updates" }) },
        { caption: "When every handler for the event has finished, React flushes the enqueued updates.", lit: { nodes: ["queue", "flush"], wires: ["done"], tone: "accent" }, patch: subs({ queue: "3 updates" }) },
        {
            caption: "One render reflects all three updates, at the priority the event established. The updater form makes them compose.",
            lit: { nodes: ["flush", "render"], wires: ["once"], tone: "task" },
            patch: subs({ queue: "folded", render: "count renders once" }),
        },
        {
            caption: "The scheduler runs render and commit. `flushSync` is the escape hatch that flushes immediately, at the cost of an extra render.",
            lit: { nodes: ["render", "commit"], wires: ["schedule"], tone: "strong" },
            patch: subs({ queue: "folded", render: "count renders once", commit: "flushSync opts out" }),
        },
    ];
    return (
        <FlowFigure
            description={["During the event, each setState enqueues an update. When the handlers finish, React flushes them as one render."]}
            figcaption="Updates enqueue during the handler and flush together as a single render."
            height={202}
            nodes={nodes}
            overview="The event handler is where an interaction becomes batched, prioritized updates. Press Play to follow three `setState` calls into one render."
            steps={steps}
            width={360}
            wires={wires}
        />
    );
}

export function PortalEventsFigure() {
    return (
        <TreeFigure
            spec={{
                nodes: [
                    { id: "root", label: "root container", sub: "listener lives here" },
                    { id: "sidebar", label: "Sidebar", parent: "root", sub: "onClick" },
                    { id: "body", label: "document.body", parent: "root", sub: "modal's DOM lives here" },
                    { id: "modal", label: "Modal", parent: "sidebar", sub: "portal into body" },
                    { id: "button", label: "button", parent: "modal", sub: "target" },
                ],
                steps: [
                    {
                        caption: "The portal's component stays in the React tree where you wrote it, inside `Sidebar`. Its DOM goes to `document.body`.",
                        states: {},
                        subs: { modal: "written inside Sidebar" },
                    },
                    {
                        caption: "The user clicks inside the modal. The native click bubbles up the real DOM through `body` and still reaches the root container's listener.",
                        states: { button: "renders", body: "renders", root: "renders" },
                    },
                    { caption: "React finds the target fiber: the clicked element's fiber.", states: { button: "renders" } },
                    {
                        caption: "React walks up the fiber tree. The modal's parent is `Sidebar`, the component that rendered the portal, not `body`.",
                        states: { button: "renders", modal: "renders", sidebar: "renders", root: "renders" },
                    },
                    {
                        caption: "The `onClick` on `Sidebar` fires, even though the modal's DOM is not inside `Sidebar`'s DOM.",
                        states: { button: "renders", modal: "renders", sidebar: "renders" },
                        subs: { sidebar: "onClick fires" },
                    },
                    {
                        caption: "A native listener on `Sidebar`'s DOM node does not see the click. Native listeners follow the DOM path, React follows fibers.",
                        states: { sidebar: "error" },
                        subs: { sidebar: "native: no event" },
                    },
                ],
                legend: false,
                overview: "Portals split the DOM tree from the React tree, and events follow React's. Press Play to trace a click inside a portaled modal.",
                figcaption: "React propagation follows the component tree you wrote, not the DOM.",
                description: ["The root container holds Sidebar and document.body. Modal is written inside Sidebar but its DOM lives in body."],
            }}
        />
    );
}

/* ── Data fetching ── */

export function DedupeFigure() {
    const nodes = [
        node("a", 8, 8, 104, 34, "Component A", "useQuery", "task"),
        node("b", 128, 8, 104, 34, "Component B", "useQuery", "task"),
        node("c", 248, 8, 104, 34, "Component C", "useQuery", "task"),
        node("entry", 90, 78, 180, 38, "cache ['user', 5]", "empty", "accent"),
        node("promise", 90, 146, 180, 34, "in-flight promise", "—", "accent"),
        node("network", 90, 206, 180, 30, "network request", undefined, "strong"),
    ];
    const wires: FlowWire[] = [
        { id: "wa", d: "M60 42 V54 Q60 60 66 60 H124 Q130 60 130 66 V76", tone: "task" },
        { id: "wb", d: "M180 42 V76", tone: "task" },
        { id: "wc", d: "M300 42 V54 Q300 60 294 60 H236 Q230 60 230 66 V76", tone: "task" },
        { id: "fetch", d: "M180 116 V144", tone: "accent", label: { text: "one fetch", x: 186, y: 134, anchor: "start" } },
        { id: "net", d: "M180 180 V204", tone: "strong" },
    ];
    const steps: FlowStep[] = [
        {
            caption: "Three components mount at the same time, and each calls `useQuery` with `['user', 5]`. They subscribe to one cache entry and own no data.",
            lit: { nodes: ["a", "b", "c", "entry"], wires: ["wa", "wb", "wc"], tone: "task" },
        },
        {
            caption: "The entry is empty, so the first consumer triggers one fetch for `['user', 5]`. The cache now has a fetch in flight.",
            lit: { nodes: ["a", "entry", "promise", "network"], wires: ["wa", "fetch", "net"], tone: "accent" },
            patch: subs({ entry: "fetching", promise: "pending" }),
        },
        {
            caption: "B and C arrive while it is in flight. They do not start their own calls: they await the same promise.",
            lit: { nodes: ["b", "c", "entry", "promise"], wires: ["wb", "wc"], tone: "task" },
            patch: subs({ entry: "fetching", promise: "pending", b: "awaits it", c: "awaits it" }),
        },
        {
            caption: "One request resolves, and the entry now holds the data.",
            lit: { nodes: ["network", "promise", "entry"], wires: ["net", "fetch"], tone: "accent" },
            patch: subs({ entry: "success", promise: "resolved" }),
        },
        {
            caption: "All three subscribers are notified and re-render with the data. No lifting, no prop drilling, no common ancestor holding it.",
            lit: { nodes: ["a", "b", "c", "entry"], wires: ["wa", "wb", "wc"], tone: "task" },
            patch: subs({ entry: "success", a: "re-renders", b: "re-renders", c: "re-renders" }),
        },
        {
            caption: "While the data is fresh, new subscribers get the cached copy with no request at all. Once stale, the first one revalidates and the rest join that request.",
            lit: { nodes: ["entry"], wires: [], tone: "accent" },
            patch: subs({ entry: "fresh" }),
        },
    ];
    return (
        <FlowFigure
            description={["Three components subscribe to the cache entry ['user', 5].", "The first triggers one fetch; the others await the same promise; all re-render when it resolves."]}
            figcaption="One keyed cache entry means one request, however many components ask."
            height={244}
            nodes={nodes}
            overview="Three components ask for the same query key at once. Press Play to watch the cache turn that into a single request."
            steps={steps}
            width={360}
            wires={wires}
        />
    );
}

export function OptimisticUpdateFigure() {
    const s1 = [block("Mutation", 0, 2, "onMutate")];
    const s2 = [...s1, block("Cache", 2, 4, "snapshot", "strong")];
    const s3 = [...s2, block("Cache", 4, 6.2, "optimistic", "accent"), block("UI", 4, 6.2, "new value", "accent")];
    const s4 = [...s3, block("Mutation", 2, 8, "write in flight", "muted"), block("UI", 6.2, 8, undefined, "accent")];
    const s5 = [...s4, block("Mutation", 8, 9.8, "error", "accent"), block("Cache", 8, 9.8, "restore", "strong"), block("UI", 8, 9.8, "rollback", "strong")];
    const s6 = [...s5, block("Cache", 9.8, 12, "invalidate"), block("UI", 9.8, 12, "server truth")];
    return (
        <TimelineFigure
            spec={{
                lanes: ["Mutation", "Cache", "UI"],
                span: 12,
                axis: "time →",
                steps: [
                    {
                        caption: "The mutation starts and `onMutate` runs. First it calls `cancelQueries`, so an in-flight refetch cannot overwrite the optimistic value.",
                        blocks: s1,
                        at: 2,
                    },
                    {
                        caption: "Next, `getQueryData` takes a snapshot as the rollback point. It is returned from `onMutate` and arrives as `context` in `onError`.",
                        blocks: s2,
                        at: 4,
                    },
                    {
                        caption: "`setQueryData` writes the expected value. Every consumer of `['todos']` re-renders with it at once, before the server answers.",
                        blocks: s3,
                        at: 6.2,
                    },
                    { caption: "The write is still pending while the UI already shows the new value. This trusts that the write will succeed.", blocks: s4, at: 8 },
                    {
                        caption: "If the write fails, `onError` restores the snapshot with `context.previous`. Without this, the UI keeps showing a change that never happened.",
                        blocks: s5,
                        at: 9.8,
                    },
                    {
                        caption: "Success or failure, `onSettled` invalidates the query, so the cache is reconciled with the server's actual state, which may differ from the guess.",
                        blocks: s6,
                        at: 12,
                    },
                ],
                overview: "An optimistic update shows the result now, then must undo it if the write fails. Press Play to follow the cache through a failed write.",
                figcaption: "Snapshot, write, roll back on error, then invalidate on settle.",
                description: ["onMutate snapshots the cache and writes the optimistic value.", "onError restores the snapshot. onSettled invalidates the query."],
            }}
        />
    );
}

/* ── Performance ── */

export function InsertKeysFigure() {
    const indexBefore = [cell("A · 0", 0, "typed: hi"), cell("B · 1", 1), cell("C · 2", 2)];
    const idBefore = [cell("A · a", 0, "typed: hi"), cell("B · b", 1), cell("C · c", 2)];
    return (
        <ListFigure
            spec={{
                rows: ["before", "after"],
                steps: [
                    {
                        caption: "With `key={i}` the key is the position. The input the user typed into belongs to key `0`, which is item A.",
                        cells: [indexBefore, []],
                    },
                    {
                        caption: "Insert X at the front. React sees key `0` in both renders and concludes it is the same element with new content.",
                        cells: [indexBefore, [cell("X · 0", 0), cell("A · 1", 1), cell("B · 2", 2), cell("C · 3", 3, "new")]],
                        links: [
                            [0, 0],
                            [1, 1],
                            [2, 2],
                        ],
                    },
                    {
                        caption: "Every row is mutated in place, which is maximal DOM work. The typed input stays with the position, so it now appears on X.",
                        cells: [indexBefore, [cell("X · 0", 0, "typed: hi"), cell("A · 1", 1, "rewritten"), cell("B · 2", 2, "rewritten"), cell("C · 3", 3, "inserted")]],
                        links: [
                            [0, 0],
                            [1, 1],
                            [2, 2],
                        ],
                        wrong: [[1, 0]],
                    },
                    { caption: "Now key each item by a stable `item.id`. The key travels with the item.", cells: [idBefore, []] },
                    {
                        caption: "React sees a new key `x` appear and matches the existing keys to their rows. It inserts one node, and every existing row keeps its identity.",
                        cells: [idBefore, [cell("X · x", 3, "new"), cell("A · a", 0), cell("B · b", 1), cell("C · c", 2)]],
                        links: [
                            [0, 1],
                            [1, 2],
                            [2, 3],
                        ],
                    },
                    {
                        caption: "State follows the item, not the position. A good key turns \"rewrite many rows\" into \"move and insert a few nodes\".",
                        cells: [idBefore, [cell("X · x", 3, "new"), cell("A · a", 0, "typed: hi"), cell("B · b", 1), cell("C · c", 2)]],
                        links: [
                            [0, 1],
                            [1, 2],
                            [2, 3],
                        ],
                    },
                ],
                overview: "Insert one item at the front of a list, and compare index keys with stable id keys. Colour is the row React reuses. Press Play.",
                figcaption: "Keys decide whether React reuses a row or rewrites it, so use a stable id.",
                description: ["Inserting X at the front: index keys rewrite every row and move the typed text onto X; id keys insert one row."],
            }}
        />
    );
}

export function TransitionTypingFigure() {
    const k1 = [block("Urgent", 0, 1.2, "key 1")];
    const t1 = [...k1, block("Transition", 1.2, 3, "results 1", "accent")];
    const k2 = [...t1, block("Urgent", 3, 4.2, "key 2")];
    const abandon = [...k1, block("Transition", 1.2, 3, "abandoned", "muted"), block("Urgent", 3, 4.2, "key 2")];
    const t2 = [...abandon, block("Transition", 4.2, 10, "results 2", "accent")];
    const main = [...t2, block("Main thread", 0, 1.2, "key", "strong"), block("Main thread", 1.2, 3, "render"), block("Main thread", 3, 4.2, "key", "strong"), block("Main thread", 4.2, 10, "render")];
    return (
        <TimelineFigure
            spec={{
                lanes: ["Urgent", "Transition", "Main thread"],
                span: 12,
                axis: "time →",
                steps: [
                    { caption: "The user types. `setQuery` is urgent, so the input reflects the keystroke at once, at high priority.", blocks: k1, at: 1.2 },
                    {
                        caption: "`setResults` sits inside `startTransition`, so it is non-urgent. React renders the expensive results at lower priority, and `isPending` is true.",
                        blocks: t1,
                        at: 3,
                    },
                    { caption: "The user types again before the results finish. The keystroke is not blocked behind the stale render.", blocks: k2, at: 4.2 },
                    { caption: "React can abandon the in-progress results render and start over with the newer query.", blocks: abandon, at: 4.2 },
                    { caption: "The results render finishes for the latest value. The filter still ran, and it still took just as long.", blocks: t2, at: 10 },
                    {
                        caption: "Concurrency does not reduce the work, it reschedules it. Make renders cheap first, and use transitions for irreducible heavy work.",
                        blocks: main,
                        at: 10,
                    },
                ],
                overview: "A keystroke arrives while a heavy filter renders at low priority. Press Play to see urgent work jump ahead of the transition.",
                figcaption: "`useTransition` keeps typing responsive by moving the slow render out of the keystroke's way.",
                description: ["Keystrokes render urgently. The results render as a transition, is abandoned when a new key arrives, and finishes for the latest query."],
            }}
        />
    );
}

/* ── State management ── */

export function LiftStateFigure() {
    return (
        <TreeFigure
            spec={{
                nodes: [
                    { id: "app", label: "App" },
                    { id: "header", label: "Header", parent: "app" },
                    { id: "sidebar", label: "Sidebar", parent: "app" },
                    { id: "footer", label: "Footer", parent: "sidebar" },
                    { id: "panel", label: "Panel", parent: "app", sub: "common ancestor" },
                    { id: "list", label: "List", parent: "panel", sub: "needs selectedId" },
                    { id: "detail", label: "Detail", parent: "panel", sub: "needs selectedId" },
                ],
                steps: [
                    {
                        caption: "Two siblings, `List` and `Detail`, need the same value. Neither is an ancestor of the other, and data only flows down.",
                        states: { list: "renders", detail: "renders" },
                    },
                    {
                        caption: "Move the state up to their nearest common ancestor, `Panel`. It becomes the single owner of the value.",
                        states: { panel: "boundary" },
                        subs: { panel: "owns selectedId" },
                    },
                    {
                        caption: "`Panel` passes the value and a callback down. The children are controlled: they reflect the state and request changes.",
                        states: { panel: "boundary", list: "renders", detail: "renders" },
                        subs: { panel: "owns selectedId", list: "value + onSelect", detail: "value" },
                    },
                    {
                        caption: "A change re-renders the owner's subtree and nothing more: the smallest subtree containing every component that needs it.",
                        states: { panel: "renders", list: "renders", detail: "renders", app: "skipped", header: "skipped", sidebar: "skipped", footer: "skipped" },
                        subs: { panel: "owns selectedId" },
                    },
                    {
                        caption: "Lift it to `App` \"to be safe\" and the same change re-renders `Header`, `Sidebar` and `Footer`, which have nothing to do with this state.",
                        states: { app: "renders", header: "renders", sidebar: "renders", footer: "renders", panel: "renders", list: "renders", detail: "renders" },
                        subs: { app: "owns selectedId" },
                    },
                    {
                        caption: "The rule is as high as necessary and no higher: the same discipline as colocation, applied in the other direction.",
                        states: { panel: "boundary" },
                        subs: { panel: "owns selectedId" },
                    },
                ],
                overview: "Two siblings need one value, so the state moves up. Press Play to see how high is high enough.",
                figcaption: "Lift state to the nearest common ancestor, and no higher.",
                description: ["App renders Header, Sidebar (with Footer) and Panel. Panel renders List and Detail, which both need selectedId."],
            }}
        />
    );
}

export function StoreSelectorFigure() {
    const nodes = [
        node("store", 105, 8, 150, 38, "store", "outside the tree", "accent"),
        node("user", 8, 96, 150, 38, "user name reader", "selects user.name", "task"),
        node("cart", 202, 96, 150, 38, "cart reader", "selects cart", "task"),
        node("sync", 105, 172, 150, 30, "useSyncExternalStore", undefined, "strong"),
    ];
    const wires: FlowWire[] = [
        { id: "to-user", d: "M150 46 V58 Q150 64 144 64 H89 Q83 64 83 70 V94", tone: "accent" },
        { id: "to-cart", d: "M210 46 V58 Q210 64 216 64 H271 Q277 64 277 70 V94", tone: "accent" },
        { id: "bind-user", d: "M83 134 V181 H103", tone: "strong" },
        { id: "bind-cart", d: "M277 134 V181 H257", tone: "strong" },
    ];
    const steps: FlowStep[] = [
        {
            caption: "A store is state in a module-level object or closure, outside any component's render. Changing it skips React's top-down re-render propagation.",
            lit: { nodes: ["store"], wires: [], tone: "accent" },
            patch: subs({ store: "user, cart" }),
        },
        {
            caption: "Each component subscribes with a selector that picks its slice. `useSyncExternalStore(subscribe, getSnapshot)` is the safe React binding.",
            lit: { nodes: ["user", "cart", "sync", "store"], wires: ["to-user", "to-cart", "bind-user", "bind-cart"], tone: "strong" },
            patch: subs({ store: "user, cart" }),
        },
        {
            caption: "The store state changes. It keeps a list of subscribers and calls their callbacks.",
            lit: { nodes: ["store"], wires: [], tone: "accent" },
            patch: subs({ store: "cart changed" }),
        },
        {
            caption: "The store notifies. Each component runs its selector and compares the output to the previous one.",
            lit: { nodes: ["store", "user", "cart"], wires: ["to-user", "to-cart"], tone: "accent" },
            patch: subs({ store: "cart changed" }),
        },
        {
            caption: "`store.cart` changed, so the cart reader re-renders. The other reads `store.user.name`, whose output is unchanged, so it does not.",
            lit: { nodes: ["cart"], wires: [], tone: "task" },
            patch: subs({ store: "cart changed", cart: "re-renders", user: "same output: skipped" }),
        },
        {
            caption: "`useSyncExternalStore` gives one consistent snapshot per render. This prevents tearing when React pauses mid-render.",
            lit: { nodes: ["sync", "user", "cart"], wires: ["bind-user", "bind-cart"], tone: "strong" },
            patch: subs({ store: "cart changed" }),
        },
    ];
    return (
        <FlowFigure
            description={["A store outside the tree notifies its subscribers.", "Each component compares its selector's output and re-renders only if its slice changed."]}
            figcaption="Selectors let a store re-render only the components whose slice changed."
            height={210}
            nodes={nodes}
            overview="Components pull only the slice they select from a store outside the tree. Press Play to see one update reach only the right component."
            steps={steps}
            width={360}
            wires={wires}
        />
    );
}

/* ── Server Components ── */

export function PayloadTreeFigure() {
    const server = { page: "server", header: "server", post: "server", comments: "server" } as const;
    return (
        <TreeFigure
            spec={{
                nodes: [
                    { id: "page", label: "Page" },
                    { id: "header", label: "Header", parent: "page" },
                    { id: "post", label: "Post", parent: "page", sub: "awaits data" },
                    { id: "like", label: "LikeButton", parent: "post" },
                    { id: "comments", label: "Comments", parent: "page" },
                ],
                steps: [
                    { caption: "Server Components render on the server, and a Client Component sits inside the tree.", states: { ...server, like: "client" } },
                    {
                        caption: "Server output is serialized as plain data: tag names, props, text and nested structure. This is the RSC payload.",
                        states: { ...server, like: "client" },
                        subs: { header: "plain element data", post: "plain element data", comments: "plain element data" },
                    },
                    {
                        caption: "Where a Client Component appears, the payload holds a module reference, enough to load the right chunk, and its props. Never its source code.",
                        states: { ...server, like: "client" },
                        subs: { like: "module ref + props" },
                    },
                    { caption: "The payload is streamable: a boundary's content can be sent in a later chunk when its data resolves.", states: { ...server, post: "suspended", like: "client" } },
                    { caption: "The browser reconstructs the element tree from the payload. Plain output is used as is.", states: { ...server, like: "client" } },
                    {
                        caption: "For the module reference, the browser loads that component's code and renders it with the given props. Navigations fetch a new payload, not a new HTML document.",
                        states: { ...server, like: "client" },
                        subs: { like: "loaded, interactive" },
                    },
                ],
                overview: "A server tree becomes a stream of plain data, with holes for client code. Press Play to see the browser rebuild the tree.",
                figcaption: "The payload is a streamable tree description that points to client components instead of embedding them.",
                description: ["Page, Header, Post and Comments are Server Components. LikeButton, inside Post, is a Client Component."],
            }}
        />
    );
}

export function FirstLoadFigure() {
    const s1 = [block("RSC render", 0, 3.6, "server components", "accent")];
    const s2 = [...s1, block("SSR to HTML", 2, 5.5, "HTML", "accent")];
    const s3 = [...s2, block("Browser", 5.5, 8, "HTML visible", "strong")];
    const s4 = [...s3, block("Hydration", 6, 9, "client code")];
    const nav = [{ at: 10, label: "navigation" }];
    const s6 = [...s4, block("RSC render", 10, 12, "payload", "accent"), block("Browser", 10, 12, "update", "strong")];
    return (
        <TimelineFigure
            spec={{
                lanes: ["RSC render", "SSR to HTML", "Browser", "Hydration"],
                span: 12,
                axis: "time →",
                steps: [
                    {
                        caption: "React runs your Server Components. They `await` their data, and the result is serialized into the RSC payload with module-reference holes.",
                        blocks: s1,
                        at: 3.6,
                    },
                    {
                        caption: "Separately, React renders the combined tree, including client components' first markup, into HTML. The server streams the HTML and the payload together.",
                        blocks: s2,
                        at: 5.5,
                    },
                    { caption: "The browser displays the HTML at once. The user sees content before any JavaScript runs.", blocks: s3, at: 8 },
                    {
                        caption: "React loads the client component code and hydrates. It walks the existing DOM and uses the payload to find client components and their props.",
                        blocks: s4,
                        at: 9,
                    },
                    {
                        caption: "Server Components do not hydrate. Client Components render twice on first load: once on the server and once in the browser.",
                        blocks: s4,
                        at: 9,
                    },
                    { caption: "Later navigations get no fresh HTML document. The browser fetches a new RSC payload and updates the tree in place.", blocks: s6, markers: nav, at: 12 },
                ],
                overview: "A first load runs three stages across the server and the browser. Press Play to follow RSC render, SSR and hydration.",
                figcaption: "Server Components never hydrate, and only Client Components make the page interactive.",
                description: ["Server Components render, then SSR produces HTML, the browser shows it, and client code hydrates. Navigations fetch payloads."],
            }}
        />
    );
}
