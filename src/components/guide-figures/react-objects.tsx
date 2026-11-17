import { FlowFigure, type FlowNode, type FlowStep, type FlowWire, type Tone } from "./kit";

/*
 * The React element and the fiber, drawn as what their fields do rather
 * than as field lists: the guide's code block already lists the fields.
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

export function ElementFieldsFigure() {
    const nodes = [
        node("jsx", 8, 8, 104, 38, "<button>", "className=\"primary\"", "task"),
        node("element", 128, 8, 104, 38, "element", "type: 'button'", "task"),
        node("host", 248, 8, 104, 38, "a real <button>", "made by React DOM", "task"),
        node("jsx2", 8, 78, 104, 38, "<Toolbar />", undefined, "accent"),
        node("element2", 128, 78, 104, 38, "element", "type: Toolbar", "accent"),
        node("call", 248, 78, 104, 38, "Toolbar()", "returns elements", "accent"),
        node("fake", 8, 148, 164, 38, "lookalike from JSON", "$$typeof is a string", "strong"),
        node("refuse", 188, 148, 164, 38, "not rendered", "no Symbol, no element", "strong"),
    ];
    const wires: FlowWire[] = [
        { id: "compile", d: "M112 27 H126", tone: "task" },
        { id: "host", d: "M232 27 H246", tone: "task" },
        { id: "compile2", d: "M112 97 H126", tone: "accent" },
        { id: "call", d: "M232 97 H246", tone: "accent" },
        { id: "check", d: "M172 167 H186" },
    ];
    const steps: FlowStep[] = [
        {
            caption: "JSX compiles to a call that returns a plain, immutable object. Every render makes brand-new ones, which is what makes comparing them safe.",
            lit: { nodes: ["jsx", "element"], wires: ["compile"], tone: "task" },
        },
        {
            caption: "`type` is the string `'button'`, so this is a host element: the renderer knows how to make a real node for it.",
            lit: { nodes: ["element", "host"], wires: ["host"], tone: "task" },
        },
        { caption: "For `<Toolbar />`, `type` is the function itself. That makes it a composite element.", lit: { nodes: ["jsx2", "element2"], wires: ["compile2"], tone: "accent" } },
        {
            caption: "React has to call `Toolbar` to find out what it produces: more elements, which it reconciles the same way.",
            lit: { nodes: ["element2", "call"], wires: ["call"], tone: "accent" },
        },
        {
            caption: "`$$typeof` is a real Symbol on purpose. Something serialized from user input can only look like an element: JSON has no Symbols.",
            lit: { nodes: ["fake"], wires: [], tone: "strong" },
        },
        {
            caption: "React checks `$$typeof`, sees the fake, and refuses to render it. That closes off a class of injection attacks.",
            lit: { nodes: ["fake", "refuse"], wires: ["check"], tone: "strong" },
        },
    ];
    return (
        <FlowFigure
            description={[
                "A host element has a string type, and React DOM makes a real node for it.",
                "A composite element has a function type, and React calls it to get more elements.",
                "A lookalike parsed from JSON has no Symbol in $$typeof, so React refuses to render it.",
            ]}
            figcaption="`type` decides what React does with an element, and `$$typeof` decides whether it is one at all."
            height={194}
            nodes={nodes}
            overview="Two elements and one impostor. Press Play to see what `type` and `$$typeof` make React do."
            steps={steps}
            width={360}
            wires={wires}
        />
    );
}

export function FiberLinksFigure() {
    const nodes = [
        node("app", 128, 8, 104, 38, "App", "function component", "task"),
        node("twin", 256, 8, 96, 38, "App′", "the other tree", "accent"),
        node("hooks", 8, 8, 96, 38, "hook list", "first hook node", "accent"),
        node("header", 40, 92, 104, 38, "Header", "host: <header>", "task"),
        node("main", 216, 92, 104, 38, "Main", undefined, "task"),
        node("dom", 40, 176, 104, 30, "<header> node", undefined, "strong"),
        node("list", 216, 176, 104, 30, "List", undefined, "task"),
    ];
    const wires: FlowWire[] = [
        { id: "child", d: "M160 46 V60 Q160 66 154 66 H98 Q92 66 92 72 V90", tone: "task", label: { text: "child", x: 124, y: 61 } },
        { id: "sibling", d: "M144 111 H214", tone: "task", label: { text: "sibling", x: 179, y: 105 } },
        { id: "return", d: "M268 92 V72 Q268 66 262 66 H206 Q200 66 200 60 V48", tone: "accent", label: { text: "return", x: 236, y: 61 } },
        { id: "child2", d: "M268 130 V174", tone: "task", label: { text: "child", x: 274, y: 156, anchor: "start" } },
        { id: "state-node", d: "M92 130 V174", tone: "strong", label: { text: "stateNode", x: 98, y: 156, anchor: "start" } },
        { id: "memoized", d: "M128 27 H106", tone: "accent" },
        { id: "alternate", d: "M232 27 H254", tone: "accent", both: true },
    ];
    const steps: FlowStep[] = [
        {
            caption: "`child` points to the first child only. A fiber keeps no array of children.",
            lit: { nodes: ["app", "header"], wires: ["child"], tone: "task" },
        },
        {
            caption: "The other children hang off `sibling`, one after another, so the tree is a set of linked fibers rather than a call stack.",
            lit: { nodes: ["header", "main"], wires: ["sibling"], tone: "task" },
        },
        {
            caption: "`return` points back to the parent: the return address the work loop goes to after finishing this fiber's subtree.",
            lit: { nodes: ["main", "app"], wires: ["return"], tone: "accent" },
        },
        {
            caption: "`stateNode` is the backing thing: the real DOM node for a host component, a class instance, or the root.",
            lit: { nodes: ["header", "dom"], wires: ["state-node"], tone: "strong" },
        },
        {
            caption: "For a function component, `memoizedState` is the head of the hooks linked list.",
            lit: { nodes: ["app", "hooks"], wires: ["memoized"], tone: "accent" },
        },
        {
            caption: "`childLanes` is the union of the lanes below a fiber. Only List has work, so one bitwise check lets React skip Header's whole subtree.",
            lit: { nodes: ["list", "main", "app", "header"], wires: ["child2"], tone: "task" },
            patch: subs({ list: "lanes: update", main: "childLanes: work below", app: "childLanes: work below", header: "childLanes: none, skip" }),
        },
        {
            caption: "`alternate` points to this fiber's twin in the other tree: the double buffering of Section 8.",
            lit: { nodes: ["app", "twin"], wires: ["alternate"], tone: "accent" },
        },
    ];
    return (
        <FlowFigure
            description={[
                "App's child is Header; Header's sibling is Main; Main's return is App; Main's child is List.",
                "Header's stateNode is its DOM node. App's memoizedState is its hook list. App's alternate is its twin in the other tree.",
            ]}
            figcaption="A fiber is linked, not nested: `child`, `sibling` and `return` let React pause anywhere and pick up again."
            height={214}
            narrow={{
                height: 306,
                place: {
                    app: [104, 8, 152, 44],
                    header: [8, 96, 160, 44],
                    main: [192, 96, 160, 44],
                    dom: [8, 180, 160, 34],
                    list: [192, 180, 160, 44],
                    hooks: [8, 258, 160, 44],
                    twin: [192, 258, 160, 44],
                },
                wires: {
                    child: { d: "M150 52 V64 Q150 70 144 70 H94 Q88 70 88 76 V94", label: { text: "child", x: 120, y: 65 } },
                    sibling: { d: "M168 118 H190", label: undefined },
                    return: { d: "M272 96 V76 Q272 70 266 70 H216 Q210 70 210 64 V54", label: { text: "return", x: 240, y: 65 } },
                    child2: { d: "M272 140 V178", label: { text: "child", x: 278, y: 163, anchor: "start" } },
                    "state-node": { d: "M88 140 V178", label: { text: "stateNode", x: 94, y: 163, anchor: "start" } },
                    memoized: { d: "M104 30 H8 Q4 30 4 36 V274 Q4 280 8 280 H6" },
                    alternate: { d: "M256 30 H352 Q356 30 356 36 V274 Q356 280 352 280 H354" },
                },
            }}
            nodes={nodes}
            overview="A few fibers and the pointers between them. Press Play to follow each pointer to what it points at."
            steps={steps}
            width={360}
            wires={wires}
        />
    );
}
