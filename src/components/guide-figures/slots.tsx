import { FigureFrame, Note, useStepper } from "./kit";

/*
 * A slots figure: named values that change step by step beside the code
 * that changes them. "uninitialized" draws a hatched TDZ slot.
 */

export type SlotsSpec = Readonly<{
    fileName: string;
    source: readonly string[];
    /** The bindings or values shown, top to bottom. */
    names: readonly string[];
    /** An optional small label left of each name, such as a keyword. */
    tags?: readonly string[];
    title?: string;
    steps: readonly Readonly<{ caption: string; line: number | null; values: readonly string[]; console?: readonly string[] }>[];
    overview: string;
    figcaption: string;
}>;

const uninitialized = "uninitialized";

export function SlotsFigure({ spec }: Readonly<{ spec: SlotsSpec }>) {
    const stepper = useStepper(spec.steps.length);
    const step = spec.steps[Math.max(0, stepper.index)];
    const last = spec.steps[spec.steps.length - 1];
    const shown = stepper.index >= 0 ? step : last;
    const height = 22 + spec.names.length * 36;
    const output = shown.console ?? [];
    const hasConsole = spec.steps.some((one) => one.console && one.console.length > 0);
    // Long lines would wrap beside the console, so the console moves below the code instead.
    const sideBySide = hasConsole && spec.source.every((text) => text.length <= 36);
    const nameX = spec.tags ? 52 : 8;
    return (
        <FigureFrame
            caption={<Note>{stepper.index >= 0 ? step.caption : spec.overview}</Note>}
            description={spec.names.map((name, index) => `${name}: ${last.values[index]}`)}
            figcaption={spec.figcaption}
            panels={
                <div className={sideBySide ? "el-figure__panels" : "el-figure__panels gf-panels--single"}>
                    <div className="el-code">
                        <div className="el-panel__bar">
                            <span>{spec.fileName}</span>
                        </div>
                        <ol className="el-code__lines">
                            {spec.source.map((text, index) => (
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
                    {hasConsole && (
                        <div className="el-console">
                            <div className="el-panel__bar">
                                <span>console</span>
                            </div>
                            <ol className="el-console__lines gf-console">
                                {output.map((entry, index) => (
                                    // Output only grows within a run: position is identity.
                                    <li className="el-console__line" key={index}>
                                        {entry}
                                    </li>
                                ))}
                            </ol>
                        </div>
                    )}
                </div>
            }
            stage={
                <svg aria-hidden="true" className="gf-flow" viewBox={`0 0 360 ${height}`}>
                    <defs>
                        <pattern height="6" id="gf-hatch-slots" patternTransform="rotate(45)" patternUnits="userSpaceOnUse" width="6">
                            <line className="gf-slot__hatch-line" x1="0" x2="0" y1="0" y2="6" />
                        </pattern>
                    </defs>
                    <text className="gf-group__label" x="8" y="12">
                        {spec.title ?? "values"}
                    </text>
                    {spec.names.map((name, index) => {
                        const value = shown.values[index];
                        const y = 22 + index * 36;
                        const dead = value === uninitialized;
                        const changed = stepper.index > 0 && spec.steps[stepper.index - 1].values[index] !== value;
                        return (
                            <g className="gf-slot" data-dead={dead ? "" : undefined} data-read={changed ? "" : undefined} key={name}>
                                {spec.tags && (
                                    <text className="gf-slot__keyword" x="8" y={y + 18}>
                                        {spec.tags[index]}
                                    </text>
                                )}
                                <text className="gf-node__label" x={nameX} y={y + 18}>
                                    {name}
                                </text>
                                <rect className="gf-slot__box" height="28" rx="4" width="200" x="150" y={y} />
                                {dead && <rect fill="url(#gf-hatch-slots)" height="28" rx="4" width="200" x="150" y={y} />}
                                <text className="gf-slot__value" key={value} x="162" y={y + 18}>
                                    {dead ? "uninitialized · TDZ" : value}
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
