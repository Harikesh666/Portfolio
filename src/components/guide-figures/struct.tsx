import { useId } from "react";
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
    const marker = `gf-arrow-${useId().replace(/:/g, "")}`;
    return (
        <FigureFrame
            caption={<Note>{step?.caption ?? spec.overview}</Note>}
            description={spec.description}
            figcaption={spec.figcaption}
            stage={
                <>
                <svg aria-hidden="true" className="gf-flow gf-struct gf-wide" viewBox={`0 0 360 ${height}`}>
                    <defs>
                        <marker id={marker} markerHeight="6" markerWidth="6" orient="auto-start-reverse" refX="5" refY="3" viewBox="0 0 6 6">
                            <path className="gf-arrow" d="M0.5 0.8 5 3 0.5 5.2" />
                        </marker>
                    </defs>
                    {spec.pointers.map((pointer) => (
                        <g className="gf-wire" data-state={step ? (step.pointers?.includes(pointer.id) ? "on" : "off") : undefined} data-tone="accent" key={pointer.id}>
                            <path d={pointerPath(spec.objects, pointer)} markerEnd={`url(#${marker})`} />
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
                                                <text className="gf-struct__value" key={shown} x={object.x + 9} y={top + 19.5}>
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
                <StructNarrow spec={spec} step={step} />
                </>
            }
            stepper={stepper}
        />
    );
}

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

/* Phone layout: the cards stacked in reading order at full width, with
 * larger field text; each pointer runs down a lane in the right margin. */
function StructNarrow({ spec, step }: Readonly<{ spec: StructSpec; step: StructSpec["steps"][number] | null }>) {
    const marker = `gf-arrow-${useId().replace(/:/g, "")}`;
    const narrowRow = (field: Field) => (field.group ? 18 : field.value !== undefined ? 32 : 20);
    const ordered = [...spec.objects].sort((a, b) => a.y - b.y || a.x - b.x);
    // Cards stack top to bottom; each field row sits under the one before it.
    const layout: { object: StructObject; top: number; height: number; fieldRows: { field: Field; top: number; height: number }[] }[] = [];
    let y = 8;
    for (const object of ordered) {
        const fieldRows: { field: Field; top: number; height: number }[] = [];
        let rowTop = y + 24;
        for (const field of object.fields ?? []) {
            fieldRows.push({ field, top: rowTop, height: narrowRow(field) });
            rowTop += narrowRow(field);
        }
        const boxHeight = fieldRows.length === 0 ? 30 : rowTop - y + 6;
        layout.push({ object, top: y, height: boxHeight, fieldRows });
        y += boxHeight + 18;
    }
    const height = y - 10;
    const find = (id: string) => layout.find((entry) => entry.object.id === id);
    const value = (object: StructObject, field: Field) => step?.values?.[`${object.id}.${field.name}`] ?? field.value;
    return (
        <svg aria-hidden="true" className="gf-flow gf-struct gf-narrow" viewBox={`0 0 360 ${height}`}>
            <defs>
                <marker id={marker} markerHeight="6" markerWidth="6" orient="auto-start-reverse" refX="5" refY="3" viewBox="0 0 6 6">
                    <path className="gf-arrow" d="M0.5 0.8 5 3 0.5 5.2" />
                </marker>
            </defs>
            {spec.pointers.map((pointer, lane) => {
                const [fromId, fieldName] = pointer.from.split(".");
                const from = find(fromId);
                const to = find(pointer.to);
                if (!from || !to) return null;
                const row = from.fieldRows.find((entry) => entry.field.name === fieldName);
                const startY = row ? row.top + row.height / 2 : from.top + from.height / 2;
                const endY = to.top + 15;
                const laneX = Math.min(356, 338 + lane * 6);
                const turn = endY > startY ? 5 : -5;
                return (
                    <g className="gf-wire" data-state={step ? (step.pointers?.includes(pointer.id) ? "on" : "off") : undefined} data-tone="accent" key={pointer.id}>
                        <path
                            d={`M330 ${startY} H${laneX - 5} Q${laneX} ${startY} ${laneX} ${startY + turn} V${endY - turn} Q${laneX} ${endY} ${laneX - 5} ${endY} H332`}
                            markerEnd={`url(#${marker})`}
                        />
                    </g>
                );
            })}
            {layout.map(({ object, top, height: boxH, fieldRows }) => {
                const lit = step?.objects?.includes(object.id) || step?.fields?.some((entry) => entry.startsWith(`${object.id}.`));
                return (
                    <g className="gf-struct__object" data-state={step ? (lit ? "on" : "off") : undefined} data-tone={object.tone} key={object.id}>
                        <rect height={boxH} rx="6" width="322" x="8" y={top} />
                        <text className="gf-struct__title" fontSize="11" x="18" y={top + 17}>
                            {object.title}
                        </text>
                        {fieldRows.length > 0 && <line x1="8" x2="330" y1={top + 24} y2={top + 24} />}
                        {fieldRows.map(({ field, top: rowTop, height: rowH }) => {
                            const on = step?.fields?.includes(`${object.id}.${field.name}`);
                            const shown = value(object, field);
                            return (
                                <g className="gf-struct__field" data-group={field.group ? "" : undefined} data-on={on ? "" : undefined} key={field.name}>
                                    {!field.group && <rect height={rowH - 3} rx="4" width="310" x="14" y={rowTop + 1} />}
                                    <text className={field.group ? "gf-struct__group" : "gf-struct__name"} fontSize={field.group ? 8.5 : 12} x="22" y={rowTop + (field.group ? 13 : 14)}>
                                        {field.name}
                                    </text>
                                    {shown !== undefined && !field.group && (
                                        <text className="gf-struct__value" fontSize="10" key={shown} x="22" y={rowTop + 27}>
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
    );
}
