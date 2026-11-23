import { FlowFigure, type FlowNode, type FlowStep, type FlowWire } from "./kit";

/* "React Rendering and Reconciliation Internals". */

export function ElementsToDomFigure() {
    const row = (id: string, y: number, label: string, sub: string, tone?: "task" | "accent"): FlowNode => ({
        id,
        x: 70,
        y,
        w: 220,
        h: 36,
        label,
        sub: [sub],
        tone,
    });
    const nodes: FlowNode[] = [
        row("component", 8, "You write a component", "the recipe"),
        row("elements", 66, "it returns elements", "plain descriptions", "task"),
        row("fibers", 124, "React reconciles against fibers", "the live instances + state", "accent"),
        row("dom", 182, "React mutates host nodes", "the real DOM", "task"),
    ];
    const wires: FlowWire[] = [
        { id: "a", d: "M180 44 V64" },
        { id: "b", d: "M180 102 V122" },
        { id: "c", d: "M180 160 V180" },
    ];
    const steps: FlowStep[] = [
        { caption: "You write a component. It is a recipe: a function React calls when it needs to know what to show.", lit: { nodes: ["component"], wires: [] } },
        {
            caption: "Calling it returns elements: cheap, immutable descriptions of what the UI should look like. They are not the DOM.",
            lit: { nodes: ["elements"], wires: ["a"], tone: "task" },
        },
        {
            caption: "React reconciles those elements against the existing fibers, its record of each element at its position, holding state across renders.",
            lit: { nodes: ["fibers"], wires: ["b"], tone: "accent" },
        },
        { caption: "Only then does React mutate host nodes, the real DOM, and only where something changed.", lit: { nodes: ["dom"], wires: ["c"], tone: "task" } },
    ];
    return (
        <FlowFigure
            description={["You write a component (recipe)", "it returns elements (descriptions)", "React reconciles them against fibers (instances and state)", "React mutates host nodes (the real DOM)"]}
            figcaption="Recipe, description, live instance, real node. Each layer has a different job."
            height={226}
            nodes={nodes}
            overview="The chain of meaning, worth memorizing. Press Play to follow it down."
            steps={steps}
            width={360}
            wires={wires}
        />
    );
}

export function HostConfigFigure() {
    const calls = [
        { id: "create", label: "createInstance(type, props)", sub: "'div' → a real <div>" },
        { id: "text", label: "createTextInstance(text)", sub: "a text node" },
        { id: "structure", label: "appendChild, insertBefore", sub: "and removeChild: structure" },
        { id: "update", label: "commitUpdate(instance, ...)", sub: "diff old and new props" },
    ];
    const nodes: FlowNode[] = [
        { id: "reconciler", x: 8, y: 64, w: 104, h: 48, label: "reconciler", sub: ["knows nothing", "about the DOM"], tone: "accent" },
        ...calls.map((call, index) => ({
            id: call.id,
            x: 142,
            y: 8 + index * 42,
            w: 210,
            h: 34,
            label: call.label,
            sub: [call.sub],
            tone: "task" as const,
        })),
    ];
    const wires: FlowWire[] = calls.map((call, index) => {
        const y = 25 + index * 42;
        return { id: `to-${call.id}`, d: `M112 88 H120 Q126 88 126 ${y > 88 ? 94 : 82} V${y > 88 ? y - 6 : y + 6} Q126 ${y} 132 ${y} H140`, tone: "task" };
    });
    const captions = [
        "To make a node, the reconciler calls the renderer's `createInstance`. In React DOM, `'div'` becomes a real `<div>`.",
        "Text gets its own call, `createTextInstance`, which makes a text node.",
        "Structural changes go through `appendChild`, `insertBefore` and `removeChild`.",
        "And a changed node gets `commitUpdate`, which diffs the old and new props and applies the difference.",
    ];
    const steps: FlowStep[] = calls.map((call, index) => ({
        caption: captions[index],
        lit: { nodes: ["reconciler", call.id], wires: [`to-${call.id}`], tone: "task" },
    }));
    return (
        <FlowFigure
            description={calls.map((call) => `${call.label}: ${call.sub}`)}
            figcaption="The host config: a renderer's answer to 'how do you make and change a node on this platform?'"
            height={176}
            nodes={nodes}
            overview="The reconciler decides what changes. The renderer's host config says how. Press Play to see each call."
            steps={steps}
            width={360}
            wires={wires}
        />
    );
}

export function DoubleBufferFigure() {
    const nodes: FlowNode[] = [
        { id: "root", x: 130, y: 8, w: 100, h: 28, label: "FiberRoot", tone: "accent" },
        { id: "current", x: 8, y: 84, w: 140, h: 40, label: "current tree", sub: ["on screen, safe"], tone: "task" },
        { id: "wip", x: 212, y: 84, w: 140, h: 40, label: "work-in-progress tree", sub: ["being built, disposable"], tone: "accent" },
    ];
    const wires: FlowWire[] = [
        { id: "to-current", d: "M150 36 V48 Q150 54 144 54 H84 Q78 54 78 60 V82", label: { text: "current", x: 112, y: 49 } },
        { id: "to-wip", d: "M210 36 V48 Q210 54 216 54 H276 Q282 54 282 60 V82", tone: "accent", label: { text: "current, after commit", x: 248, y: 49 } },
        { id: "alternate", d: "M150 104 H210", both: true, label: { text: "alternate", x: 180, y: 98 } },
    ];
    const steps: FlowStep[] = [
        {
            caption: "The current tree is committed and on screen. It is always complete, and `FiberRoot.current` points at it.",
            lit: { nodes: ["root", "current"], wires: ["to-current"], tone: "task" },
        },
        {
            caption: "An update starts. React clones or reuses fibers into the work-in-progress tree through `alternate`, and applies changes there.",
            lit: { nodes: ["current", "wip"], wires: ["alternate"], tone: "accent" },
            patch: { wip: { sub: ["can be incomplete"] } },
        },
        {
            caption: "If the render is interrupted, nothing on screen was touched. All the half-finished work sits in the disposable tree.",
            lit: { nodes: ["wip"], wires: [], tone: "accent" },
            patch: { wip: { sub: ["interrupted? throw it away"] } },
        },
        {
            caption: "Commit applies the DOM changes in one synchronous pass, then swaps the pointer: `FiberRoot.current` now points at the finished tree.",
            lit: { nodes: ["root", "wip"], wires: ["to-wip"], tone: "accent" },
            patch: { wip: { label: "new current tree", sub: ["now on screen"] }, current: { label: "old tree", sub: ["next update's WIP"] } },
        },
    ];
    return (
        <FlowFigure
            description={["FiberRoot points at the current tree.", "The current tree and the work-in-progress tree point at each other through alternate.", "Committing swaps which tree is current."]}
            figcaption="Double buffering: draw the next frame off screen, then swap it in."
            height={134}
            nodes={nodes}
            overview="Two fiber trees, twinned by `alternate`. Press Play to run an update and commit it."
            steps={steps}
            width={360}
            wires={wires}
        />
    );
}

export function HookListFigure() {
    const hooks = ["useState", "useState", "useEffect"];
    const nodes: FlowNode[] = [
        { id: "fiber", x: 8, y: 30, w: 72, h: 34, label: "fiber", sub: [".memoizedState"], tone: "accent" },
        ...hooks.map((hook, index) => ({
            id: `hook-${index}`,
            x: 96 + index * 80,
            y: 30,
            w: 68,
            h: 34,
            label: `#${index + 1}`,
            sub: [hook],
            tone: "task" as const,
        })),
        { id: "null", x: 336, y: 38, w: 20, h: 18, label: "∅", variant: "ghost" },
    ];
    const wires: FlowWire[] = [
        { id: "head", d: "M80 47 H94" },
        { id: "n0", d: "M164 47 H174", label: { text: "next", x: 170, y: 26 } },
        { id: "n1", d: "M244 47 H254", label: { text: "next", x: 250, y: 26 } },
        { id: "n2", d: "M324 47 H334" },
    ];
    const steps: FlowStep[] = [
        {
            caption: "A function component has no `this`, so React keeps its hooks on the fiber: `memoizedState` holds the head of a linked list.",
            lit: { nodes: ["fiber"], wires: [], tone: "accent" },
        },
        { caption: "The first `useState` call gets the first hook object.", lit: { nodes: ["hook-0"], wires: ["head"], tone: "task" } },
        { caption: "The second `useState` gets the next one, linked through `next`.", lit: { nodes: ["hook-1"], wires: ["n0"], tone: "task" } },
        { caption: "Then `useEffect` gets the third, and its `next` is `null`: the end of the list.", lit: { nodes: ["hook-2", "null"], wires: ["n1", "n2"], tone: "task" } },
        {
            caption: "On the next render React walks the same list in call order. A hook called conditionally would shift the order, and React would read the wrong slot.",
            lit: { nodes: ["fiber", "hook-0", "hook-1", "hook-2"], wires: ["head", "n0", "n1"], tone: "accent" },
        },
    ];
    return (
        <FlowFigure
            description={["fiber.memoizedState, then hook 1 (useState), then hook 2 (useState), then hook 3 (useEffect), then null."]}
            figcaption="Hooks are matched by call order, never by name. That is the whole reason for the rules of hooks."
            height={76}
            nodes={nodes}
            overview="`useState`, `useState`, `useEffect` builds a linked list on the fiber. Press Play to build it."
            steps={steps}
            width={360}
            wires={wires}
        />
    );
}
