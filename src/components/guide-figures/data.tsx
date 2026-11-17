import { useState, type ReactNode } from "react";
import { FigureFrame, Note, useStepper } from "./kit";

/*
 * Array figures for "map, filter and reduce": an input row, the callback
 * call for the current element, and the result row filling in.
 */

type Mode = "map" | "filter" | "reduce";

type ArraySpec = Readonly<{
    mode: Mode;
    input: readonly string[];
    /** The callback's name, as the guide writes it. */
    fn: string;
    /** map: each output; filter: "true" or "false"; reduce: the accumulator after each element. */
    results: readonly string[];
    /** reduce only: the starting accumulator. */
    initial?: string;
    /** Show index labels and lines, to stress one input, one result, one position. */
    positions?: boolean;
    overview: string;
    summary: string;
    figcaption: string;
}>;

const cellW = 40;
const cellGap = 8;

function rowStart(count: number) {
    return 180 - (count * (cellW + cellGap) - cellGap) / 2;
}

function caption(spec: ArraySpec, index: number) {
    const value = spec.input[index];
    const result = spec.results[index];
    const call = `\`${spec.fn}(${value})\``;
    if (spec.mode === "map") {
        return spec.positions
            ? `Index ${index}: one input element, \`${value}\`, gives one callback result, \`${result}\`, in output position ${index}.`
            : `${call} returns \`${result}\`, which becomes position ${index} of the new array.`;
    }
    if (spec.mode === "filter") {
        return result === "true"
            ? `${call} returns \`true\`, so filter keeps \`${value}\`: the original value, not the Boolean.`
            : `${call} returns \`false\`, so \`${value}\` is skipped.`;
    }
    const previous = index === 0 ? spec.initial : spec.results[index - 1];
    return `The accumulator is \`${previous}\`. The callback combines it with \`${value}\` and returns \`${result}\`.`;
}

function ArrayStage({ spec, shown, active }: Readonly<{ spec: ArraySpec; shown: number; active: number | null }>) {
    const start = rowStart(spec.input.length);
    const cellX = (index: number) => start + index * (cellW + cellGap);
    const kept = spec.input.map((_, index) => index).filter((index) => index < shown && spec.results[index] === "true");
    const outY = 132;
    const call =
        active === null
            ? `${spec.fn}${spec.mode === "reduce" ? "(acc, x)" : "(x)"}`
            : spec.mode === "reduce"
              ? `${spec.fn}(${active === 0 ? spec.initial : spec.results[active - 1]}, ${spec.input[active]}) → ${spec.results[active]}`
              : `${spec.fn}(${spec.input[active]}) → ${spec.results[active]}`;
    const target =
        active === null
            ? null
            : spec.mode === "map"
              ? cellX(active) + cellW / 2
              : spec.mode === "filter"
                ? spec.results[active] === "true"
                    ? cellX(kept.indexOf(active)) + cellW / 2
                    : null
                : 180;
    return (
        <svg aria-hidden="true" className="gf-flow gf-array" viewBox="0 0 360 168">
            <defs>
                <marker id={`gf-arrow-array-${spec.fn}`} markerHeight="6" markerWidth="6" orient="auto-start-reverse" refX="5" refY="3" viewBox="0 0 6 6">
                    <path className="gf-arrow" d="M0.5 0.8 5 3 0.5 5.2" />
                </marker>
            </defs>
            <text className="gf-group__label" x="8" y="20">
                input
            </text>
            {spec.input.map((value, index) => (
                <g
                    className="gf-cell"
                    data-state={active === index ? "on" : spec.mode === "filter" && index < shown && spec.results[index] === "false" ? "skip" : undefined}
                    // The input never reorders: the index is the element's identity.
                    key={index}
                >
                    <rect height="26" rx="4" width={cellW} x={cellX(index)} y="26" />
                    <text textAnchor="middle" x={cellX(index) + cellW / 2} y="43">
                        {value}
                    </text>
                    {spec.positions && (
                        <text className="gf-cell__index" textAnchor="middle" x={cellX(index) + cellW / 2} y="62">
                            [{index}]
                        </text>
                    )}
                </g>
            ))}
            <g className="gf-node" data-state={active === null ? undefined : "on"} data-tone="accent">
                <rect height="28" rx="14" width="180" x="90" y="76" />
                <text className="gf-node__label" textAnchor="middle" x="180" y="93.5">
                    {call}
                </text>
            </g>
            {active !== null && (
                <g className="gf-wire" data-state="on" data-tone="accent">
                    <path d={`M${cellX(active) + cellW / 2} 52 C${cellX(active) + cellW / 2} 66 180 62 180 74`} markerEnd={`url(#gf-arrow-array-${spec.fn})`} />
                    {target !== null && <path d={`M180 104 C180 116 ${target} 114 ${target} ${outY - 2}`} markerEnd={`url(#gf-arrow-array-${spec.fn})`} />}
                </g>
            )}
            <text className="gf-group__label" x="8" y={outY - 6}>
                {spec.mode === "reduce" ? "accumulator" : "result"}
            </text>
            {spec.mode === "map" &&
                spec.input.map((_, index) =>
                    index < shown ? (
                        <g className="gf-cell gf-cell--out" data-state={active === index ? "on" : undefined} key={index}>
                            <rect height="26" rx="4" width={cellW} x={cellX(index)} y={outY} />
                            <text textAnchor="middle" x={cellX(index) + cellW / 2} y={outY + 17}>
                                {spec.results[index]}
                            </text>
                            {spec.positions && (
                                <text className="gf-cell__index" textAnchor="middle" x={cellX(index) + cellW / 2} y={outY + 36}>
                                    [{index}]
                                </text>
                            )}
                        </g>
                    ) : (
                        <rect className="gf-cell__empty" height="26" key={index} rx="4" width={cellW} x={cellX(index)} y={outY} />
                    ),
                )}
            {spec.mode === "filter" &&
                kept.map((index, position) => (
                    <g className="gf-cell gf-cell--out" data-state={active === index ? "on" : undefined} key={index}>
                        <rect height="26" rx="4" width={cellW} x={cellX(position)} y={outY} />
                        <text textAnchor="middle" x={cellX(position) + cellW / 2} y={outY + 17}>
                            {spec.input[index]}
                        </text>
                    </g>
                ))}
            {spec.mode === "reduce" && (
                <g className="gf-cell gf-cell--out" data-state={active === null ? undefined : "on"}>
                    <rect height="26" rx="4" width="88" x="136" y={outY} />
                    <text key={shown} textAnchor="middle" x="180" y={outY + 17}>
                        {shown === 0 ? spec.initial : spec.results[shown - 1]}
                    </text>
                </g>
            )}
        </svg>
    );
}

function ArrayBody({ spec, tools }: Readonly<{ spec: ArraySpec; tools?: ReactNode }>) {
    const count = spec.input.length;
    const stepper = useStepper(count + 1);
    const index = stepper.index;
    const active = index >= 0 && index < count ? index : null;
    const shown = index < 0 || index >= count ? count : index + 1;
    return (
        <FigureFrame
            caption={<Note>{index < 0 ? spec.overview : index >= count ? spec.summary : caption(spec, index)}</Note>}
            description={spec.input.map((value, position) =>
                spec.mode === "filter"
                    ? `${spec.fn}(${value}) → ${spec.results[position]} → ${spec.results[position] === "true" ? "keep" : "skip"} ${value}`
                    : `${spec.fn}(${value}) → ${spec.results[position]}`,
            )}
            figcaption={spec.figcaption}
            stage={<ArrayStage active={active} shown={shown} spec={spec} />}
            stepper={stepper}
            tools={tools}
        />
    );
}

const numbers = ["5", "1", "3", "2", "6"];

export const arraySpecs = {
    "map-double": {
        mode: "map",
        input: numbers,
        fn: "double",
        results: ["10", "2", "6", "4", "12"],
        overview: "`numbers.map(double)` calls `double` once per element. Press Play to watch the new array fill in.",
        summary: "Five elements in, five results out, in the same order. `numbers` itself is unchanged.",
        figcaption: "map transforms every element into one new value.",
    },
    "map-positions": {
        mode: "map",
        input: numbers,
        fn: "transform",
        results: ["10", "2", "6", "4", "12"],
        positions: true,
        overview: "`mapValues` pushes `transform(array[index], index, array)` for each index. Press Play to follow the positions.",
        summary: "One input element, one callback result, one output position, every time.",
        figcaption: "Output position i always holds the result for input position i.",
    },
    "filter-four": {
        mode: "filter",
        input: numbers,
        fn: "isGreaterThanFour",
        results: ["true", "false", "false", "false", "true"],
        overview: "`numbers.filter(isGreaterThanFour)` asks the callback about each element. Press Play to see what stays.",
        summary: "Only `5` and `6` passed, and the new array holds those original values: `[5, 6]`.",
        figcaption: "filter keeps the elements whose callback returned true.",
    },
} as const satisfies Record<string, ArraySpec>;

export function ArrayFigure({ spec }: Readonly<{ spec: ArraySpec }>) {
    return <ArrayBody spec={spec} />;
}

const threeOps: Record<Mode, ArraySpec> = {
    map: { ...arraySpecs["map-double"], overview: "map: what should each element become? Press Play." },
    filter: { ...arraySpecs["filter-four"], overview: "filter: which elements should stay? Press Play." },
    reduce: {
        mode: "reduce",
        input: numbers,
        fn: "sum",
        initial: "0",
        results: ["5", "6", "9", "11", "17"],
        overview: "reduce: what should all elements become together? Press Play.",
        summary: "All five elements became one value: `17`.",
        figcaption: "reduce combines every element into one value.",
    },
};

export function ThreeOperationsFigure() {
    const [mode, setMode] = useState<Mode>("map");
    const tools = (
        <div aria-label="Operation" className="el-controls__group el-segmented" role="group">
            {(["map", "filter", "reduce"] as const).map((option) => (
                <button aria-pressed={option === mode} className="el-button" key={option} onClick={() => setMode(option)} type="button">
                    {option}
                </button>
            ))}
        </div>
    );
    // Switching the operation starts its walk-through fresh.
    return <ArrayBody key={mode} spec={{ ...threeOps[mode], figcaption: "map: each element becomes something. filter: some elements stay. reduce: all become one." }} tools={tools} />;
}

const users = [
    { firstName: "akshay", age: 26 },
    { firstName: "donald", age: 75 },
    { firstName: "elon", age: 50 },
    { firstName: "deepika", age: 26 },
];

export function UsersChainFigure() {
    const kept = users.filter((user) => user.age < 30);
    const steps = [
        ...users.map((user) =>
            user.age < 30
                ? `\`${user.firstName}\` is ${user.age}, younger than 30, so \`filter\` keeps the whole user object.`
                : `\`${user.firstName}\` is ${user.age}, so \`filter\` leaves this user out.`,
        ),
        ...kept.map((user) => `\`map\` takes the remaining user \`${user.firstName}\` and returns just the first name.`),
        "Read left to right: users, keep the ones younger than 30, take each remaining first name.",
    ];
    const stepper = useStepper(steps.length);
    const index = stepper.index;
    const filtered = index < 0 ? users.length : Math.min(users.length, index + 1);
    const mapped = index < 0 ? kept.length : Math.max(0, Math.min(kept.length, index - users.length + 1));
    const activeUser = index >= 0 && index < users.length ? index : null;
    const activeKept = index >= users.length && index < users.length + kept.length ? index - users.length : null;
    const keptShown = kept.filter((user) => users.indexOf(user) < filtered);
    return (
        <FigureFrame
            caption={<Note>{index < 0 ? "`users.filter(...).map(...)` runs in two stages. Press Play to push the users through." : steps[index]}</Note>}
            description={["users", "keep users younger than 30: akshay and deepika", 'take each remaining first name: ["akshay", "deepika"]']}
            figcaption="Each stage gets the previous stage's output: four users, two users, two names."
            stage={
                <svg aria-hidden="true" className="gf-flow gf-array" viewBox="0 0 360 150">
                    <text className="gf-group__label" x="8" y="12">
                        users
                    </text>
                    <text className="gf-group__label" x="132" y="12">
                        age {"<"} 30
                    </text>
                    <text className="gf-group__label" x="252" y="12">
                        first names
                    </text>
                    {users.map((user, position) => (
                        <g
                            className="gf-cell"
                            data-state={activeUser === position ? "on" : position < filtered && user.age >= 30 && index >= 0 ? "skip" : undefined}
                            key={user.firstName}
                        >
                            <rect height="24" rx="4" width="104" x="8" y={20 + position * 30} />
                            <text x="16" y={36 + position * 30}>
                                {user.firstName} · {user.age}
                            </text>
                        </g>
                    ))}
                    {keptShown.map((user, position) => (
                        <g className="gf-cell gf-cell--out" data-state={activeKept === position || activeUser === users.indexOf(user) ? "on" : undefined} key={user.firstName}>
                            <rect height="24" rx="4" width="104" x="128" y={20 + position * 30} />
                            <text x="136" y={36 + position * 30}>
                                {user.firstName} · {user.age}
                            </text>
                        </g>
                    ))}
                    {kept.slice(0, mapped).map((user, position) => (
                        <g className="gf-cell gf-cell--out" data-state={activeKept === position ? "on" : undefined} key={user.firstName}>
                            <rect height="24" rx="4" width="100" x="252" y={20 + position * 30} />
                            <text x="260" y={36 + position * 30}>
                                "{user.firstName}"
                            </text>
                        </g>
                    ))}
                    <text className="gf-wire__label" x="8" y="146">
                        filter →
                    </text>
                    <text className="gf-wire__label" x="132" y="146">
                        map →
                    </text>
                </svg>
            }
            stepper={stepper}
        />
    );
}
