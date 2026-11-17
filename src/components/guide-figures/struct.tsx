import { FigureFrame, Note, useStepper } from "./kit";

/*
 * Structure figures: the objects a guide describes field by field (a hook
 * node, a React element, a fiber), drawn as cards of fields. A field that
 * holds a pointer gets an arrow to the object it points at, and each step
 * lights the fields its caption talks about.
 */

type Field = Readonly<{ name: string; value?: string; group?: boolean }>;
type StructObject = Readonly<{ id: string; title: string; x: number; y: number; w: number; fields?: readonly Field[]; tone?: "accent" | "task" }>;
type Pointer = Readonly<{ id: string; from: string; to: string; label?: string }>;

export type StructSpec = Readonly<{
    objects: readonly StructObject[];
    pointers: readonly Pointer[];
    steps: readonly Readonly<{
        caption: string;
        /** "objectId.fieldName" entries to light. */
        fields?: readonly string[];
        objects?: readonly string[];
        pointers?: readonly string[];
        /** Per-step values, keyed "objectId.fieldName". */
        values?: Readonly<Record<string, string>>;
    }>[];
    overview: string;
    figcaption: string;
    description: readonly string[];
}>;

const header = 18;
const rowHeight = (field: Field) => (field.group ? 13 : field.value !== undefined ? 23 : 13);

function rows(object: StructObject) {
    let y = object.y + header + 3;
    return (object.fields ?? []).map((field) => {
        const top = y;
        y += rowHeight(field);
        return { field, top, height: rowHeight(field) };
    });
}

function boxHeight(object: StructObject) {
    const fields = object.fields ?? [];
    return fields.length === 0 ? header + 6 : header + 6 + fields.reduce((sum, field) => sum + rowHeight(field), 0);
}

/** An arrow from a field (or a whole card) to the card it points at, leaving from the side that faces the target. */
function pointerPath(objects: readonly StructObject[], pointer: Pointer) {
    const [fromId, fieldName] = pointer.from.split(".");
    const from = objects.find((object) => object.id === fromId);
    const to = objects.find((object) => object.id === pointer.to);
    if (!from || !to) return "";
    const row = rows(from).find((entry) => entry.field.name === fieldName);
    const fromCentre = from.x + from.w / 2;
    const toCentre = to.x + to.w / 2;
    const overlapX = Math.abs(fromCentre - toCentre) < (from.w + to.w) / 2 - 12;
    if (overlapX) {
        const below = to.y > from.y;
        const startY = below ? from.y + boxHeight(from) : from.y;
        const endY = below ? to.y - 2 : to.y + boxHeight(to) + 2;
        const x = Math.max(from.x + 12, Math.min(from.x + from.w - 12, toCentre));
        return `M${x} ${startY} C${x} ${(startY + endY) / 2} ${toCentre} ${(startY + endY) / 2} ${toCentre} ${endY}`;
    }
    const right = toCentre > fromCentre;
    const startX = right ? from.x + from.w : from.x;
    const startY = row ? row.top + row.height / 2 : from.y + boxHeight(from) / 2;
    const endX = right ? to.x - 2 : to.x + to.w + 2;
    const endY = Math.max(to.y + 8, Math.min(to.y + boxHeight(to) - 8, startY));
    const bend = (startX + endX) / 2;
    return `M${startX} ${startY} C${bend} ${startY} ${bend} ${endY} ${endX} ${endY}`;
}

export function StructFigure({ spec }: Readonly<{ spec: StructSpec }>) {
    const stepper = useStepper(spec.steps.length);
    const step = stepper.index >= 0 ? spec.steps[stepper.index] : null;
    const height = Math.max(...spec.objects.map((object) => object.y + boxHeight(object))) + 8;
    const value = (object: StructObject, field: Field) => step?.values?.[`${object.id}.${field.name}`] ?? field.value;
    return (
        <FigureFrame
            caption={<Note>{step?.caption ?? spec.overview}</Note>}
            description={spec.description}
            figcaption={spec.figcaption}
            stage={
                <svg aria-hidden="true" className="gf-flow gf-struct" viewBox={`0 0 360 ${height}`}>
                    <defs>
                        <marker id="gf-arrow-struct" markerHeight="6" markerWidth="6" orient="auto-start-reverse" refX="5" refY="3" viewBox="0 0 6 6">
                            <path className="gf-arrow" d="M0.5 0.8 5 3 0.5 5.2" />
                        </marker>
                    </defs>
                    {spec.pointers.map((pointer) => (
                        <g className="gf-wire" data-state={step ? (step.pointers?.includes(pointer.id) ? "on" : "off") : undefined} data-tone="accent" key={pointer.id}>
                            <path d={pointerPath(spec.objects, pointer)} markerEnd="url(#gf-arrow-struct)" />
                        </g>
                    ))}
                    {spec.objects.map((object) => {
                        const lit = step?.objects?.includes(object.id) || step?.fields?.some((entry) => entry.startsWith(`${object.id}.`));
                        return (
                            <g className="gf-struct__object" data-state={step ? (lit ? "on" : "off") : undefined} data-tone={object.tone} key={object.id}>
                                <rect height={boxHeight(object)} rx="5" width={object.w} x={object.x} y={object.y} />
                                <text className="gf-struct__title" x={object.x + 7} y={object.y + 12.5}>
                                    {object.title}
                                </text>
                                {(object.fields?.length ?? 0) > 0 && <line x1={object.x} x2={object.x + object.w} y1={object.y + header} y2={object.y + header} />}
                                {rows(object).map(({ field, top, height: rowH }) => {
                                    const on = step?.fields?.includes(`${object.id}.${field.name}`);
                                    const shown = value(object, field);
                                    return (
                                        <g className="gf-struct__field" data-group={field.group ? "" : undefined} data-on={on ? "" : undefined} key={field.name}>
                                            {!field.group && <rect height={rowH - 2} rx="3" width={object.w - 8} x={object.x + 4} y={top} />}
                                            <text className={field.group ? "gf-struct__group" : "gf-struct__name"} x={object.x + 9} y={top + 9.5}>
                                                {field.name}
                                            </text>
                                            {shown !== undefined && !field.group && (
                                                <text className="gf-struct__value" key={shown} x={object.x + 9} y={top + 19}>
                                                    {shown}
                                                </text>
                                            )}
                                        </g>
                                    );
                                })}
                            </g>
                        );
                    })}
                </svg>
            }
            stepper={stepper}
        />
    );
}

const fieldsOf = (...names: string[]): Field[] => names.map((name) => (name.startsWith("#") ? { name: name.slice(1), group: true } : { name }));

export function HookNodesFigure() {
    const hook = (id: string, x: number, y: number, title: string, state: string, queue: string, next: string): StructObject => ({
        id,
        title,
        x,
        y,
        w: 166,
        tone: "task",
        fields: [
            { name: "memoizedState", value: state },
            { name: "queue", value: queue },
            { name: "next", value: next },
        ],
    });
    return (
        <StructFigure
            spec={{
                objects: [
                    { id: "fiber", title: "fiber (function component)", x: 8, y: 8, w: 170, tone: "accent", fields: [{ name: "memoizedState", value: "head of the hook list" }] },
                    hook("useState", 8, 74, "hook 1 · useState", "0", "update queue", "→ hook 2"),
                    hook("useEffect", 186, 74, "hook 2 · useEffect", "{deps, create, destroy}", "null", "→ hook 3"),
                    hook("useMemo", 186, 184, "hook 3 · useMemo", "{value, deps}", "null", "null"),
                ],
                pointers: [
                    { id: "head", from: "fiber.memoizedState", to: "useState" },
                    { id: "next-1", from: "useState.next", to: "useEffect" },
                    { id: "next-2", from: "useEffect.next", to: "useMemo" },
                ],
                steps: [
                    {
                        caption: "The hook list lives on the fiber's `memoizedState` field. It points at the first hook node.",
                        fields: ["fiber.memoizedState"],
                        pointers: ["head"],
                    },
                    { caption: "For `useState`, the node's `memoizedState` is the state value itself.", fields: ["useState.memoizedState"] },
                    { caption: "`queue` is the update queue, for `useState` and `useReducer`.", fields: ["useState.queue"] },
                    {
                        caption: "For an effect, `memoizedState` holds `{deps, create, destroy}`, and `queue` is null.",
                        fields: ["useEffect.memoizedState", "useEffect.queue"],
                    },
                    { caption: "For `useMemo`, `memoizedState` holds the cached `{value, deps}`.", fields: ["useMemo.memoizedState"] },
                    {
                        caption: "`next` points to the next hook called in this component, or is null at the end. React binds the Nth call to the Nth node by position, never by name.",
                        fields: ["useState.next", "useEffect.next", "useMemo.next"],
                        pointers: ["next-1", "next-2"],
                    },
                ],
                overview: "Every hook call gets a node with three fields, chained from the fiber. Press Play to read each field across three kinds of hook.",
                figcaption: "Each hook is a node of `memoizedState`, `queue` and `next`, found by call order.",
                description: ["fiber.memoizedState points to hook 1 (useState: value 0, an update queue), whose next is hook 2 (useEffect: deps, create, destroy), whose next is hook 3 (useMemo: value, deps), whose next is null."],
            }}
        />
    );
}

export function ElementObjectFigure() {
    return (
        <StructFigure
            spec={{
                objects: [
                    {
                        id: "host",
                        title: "<button className=\"primary\">Save</button>",
                        x: 8,
                        y: 8,
                        w: 216,
                        tone: "task",
                        fields: [
                            { name: "$$typeof", value: "Symbol.for('react.transitional.element')" },
                            { name: "type", value: "'button'" },
                            { name: "key", value: "null" },
                            { name: "ref", value: "null" },
                            { name: "props", value: "{ className: 'primary', children: 'Save' }" },
                        ],
                    },
                    {
                        id: "composite",
                        title: "<Toolbar />",
                        x: 240,
                        y: 8,
                        w: 112,
                        tone: "accent",
                        fields: [
                            { name: "type", value: "Toolbar (a function)" },
                            { name: "props", value: "{}" },
                        ],
                    },
                ],
                pointers: [],
                steps: [
                    {
                        caption: "JSX becomes a plain, immutable object. Every render makes brand-new ones, which is what makes it safe to hold last render's elements and compare.",
                        objects: ["host"],
                    },
                    {
                        caption: "`$$typeof` is a real Symbol on purpose. A Symbol cannot survive `JSON.parse`, so React can spot a fake element and refuse to render it.",
                        fields: ["host.$$typeof"],
                    },
                    {
                        caption: "`type` tells you the kind. The string `'button'` means a host element: the renderer knows how to make a real node for it.",
                        fields: ["host.type"],
                    },
                    {
                        caption: "A function or class as `type` means a composite element: React has to call it to find out what it produces.",
                        fields: ["composite.type"],
                    },
                    {
                        caption: "`key` is null here. In React 19 `ref` is a normal prop, so new code no longer needs `forwardRef` to pass one through.",
                        fields: ["host.key", "host.ref"],
                    },
                    { caption: "`props` holds everything else: here `className` and the children, the text `Save`.", fields: ["host.props"] },
                ],
                overview: "A React element is just an object. Press Play to read its fields, and to compare a host element with a composite one.",
                figcaption: "An element is a cheap description: a string `type` for host nodes, a function or class for components.",
                description: ["The button element has $$typeof (a Symbol), type 'button', key null, ref null, and props with className and children.", "A Toolbar element has type set to the Toolbar function."],
            }}
        />
    );
}

export function FiberFieldsFigure() {
    return (
        <StructFigure
            spec={{
                objects: [
                    {
                        id: "fiber",
                        title: "fiber",
                        x: 120,
                        y: 8,
                        w: 120,
                        tone: "task",
                        fields: fieldsOf(
                            "#what it represents",
                            "tag",
                            "key",
                            "type",
                            "stateNode",
                            "#tree structure",
                            "return",
                            "child",
                            "sibling",
                            "index",
                            "#input and output",
                            "pendingProps",
                            "memoizedProps",
                            "memoizedState",
                            "updateQueue",
                            "#scheduling and effects",
                            "lanes",
                            "childLanes",
                            "flags",
                            "subtreeFlags",
                            "deletions",
                            "#double buffering",
                            "alternate",
                        ),
                    },
                    { id: "dom", title: "DOM node", x: 8, y: 52, w: 88 },
                    { id: "parent", title: "parent fiber", x: 264, y: 74, w: 88 },
                    { id: "first", title: "first child", x: 264, y: 104, w: 88 },
                    { id: "next", title: "next sibling", x: 264, y: 134, w: 88 },
                    { id: "hooks", title: "hook list", x: 8, y: 186, w: 88 },
                    { id: "twin", title: "twin fiber", x: 264, y: 290, w: 88, tone: "accent" },
                ],
                pointers: [
                    { id: "state-node", from: "fiber.stateNode", to: "dom" },
                    { id: "return", from: "fiber.return", to: "parent" },
                    { id: "child", from: "fiber.child", to: "first" },
                    { id: "sibling", from: "fiber.sibling", to: "next" },
                    { id: "hooks", from: "fiber.memoizedState", to: "hooks" },
                    { id: "alternate", from: "fiber.alternate", to: "twin" },
                ],
                steps: [
                    {
                        caption: "What this fiber represents: `tag` is its kind, `type` the function, class or string it came from, and `stateNode` the real DOM node, class instance or root behind it.",
                        fields: ["fiber.tag", "fiber.key", "fiber.type", "fiber.stateNode"],
                        objects: ["dom"],
                        pointers: ["state-node"],
                    },
                    {
                        caption: "The tree structure, the rebuilt call stack. `return` is the parent: the return address the loop goes back to after finishing this fiber's subtree.",
                        fields: ["fiber.return", "fiber.child", "fiber.sibling", "fiber.index"],
                        objects: ["parent", "first", "next"],
                        pointers: ["return", "child", "sibling"],
                    },
                    {
                        caption: "Input and output of rendering: new and committed props, and committed state. For a function component, `memoizedState` is the head of the hooks linked list.",
                        fields: ["fiber.pendingProps", "fiber.memoizedProps", "fiber.memoizedState", "fiber.updateQueue"],
                        objects: ["hooks"],
                        pointers: ["hooks"],
                    },
                    {
                        caption: "`lanes` is the pending work on this fiber. `childLanes` is the union of all its descendants' lanes, so one bitwise check can skip a whole subtree.",
                        fields: ["fiber.lanes", "fiber.childLanes"],
                    },
                    {
                        caption: "`flags` is a bitmask of effects to do at commit: placement, update, deletion, ref, passive. `subtreeFlags` lets commit skip clean subtrees.",
                        fields: ["fiber.flags", "fiber.subtreeFlags", "fiber.deletions"],
                    },
                    {
                        caption: "`alternate` points to this fiber's twin in the other tree: double buffering, Section 8.",
                        fields: ["fiber.alternate"],
                        objects: ["twin"],
                        pointers: ["alternate"],
                    },
                ],
                overview: "A fiber is both a virtual stack frame and an instance at a position. Press Play to read its fields by job, and to see what each pointer points at.",
                figcaption: "`childLanes` and `subtreeFlags` are the summaries that let React skip untouched subtrees in one check.",
                description: [
                    "Fiber fields: tag, key, type, stateNode; return, child, sibling, index; pendingProps, memoizedProps, memoizedState, updateQueue; lanes, childLanes, flags, subtreeFlags, deletions; alternate.",
                    "stateNode points to the DOM node, return to the parent, child to the first child, sibling to the next sibling, memoizedState to the hook list, alternate to the twin fiber.",
                ],
            }}
        />
    );
}
