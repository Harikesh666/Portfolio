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
    const output = shown.console ?? [];
    const hasConsole = spec.steps.some((one) => one.console && one.console.length > 0);
    // Long lines would wrap beside the console, so the console moves below the code instead.
    const sideBySide = hasConsole && spec.source.every((text) => text.length <= 36);
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
                <SlotsStage
                    changed={spec.names.map((_, index) => stepper.index > 0 && spec.steps[stepper.index - 1].values[index] !== shown.values[index])}
                    names={spec.names}
                    tags={spec.tags}
                    title={spec.title ?? "values"}
                    values={shown.values}
                />
            }
            stepper={stepper}
        />
    );
}

/**
 * Named values as rows: the name (with an optional tag such as a keyword)
 * and a value box that refreshes when it changes. An uninitialized value
 * is drawn hatched, as a binding in its TDZ. Plain HTML, so it reflows on
 * any screen with text at reading size.
 */
export function SlotsStage({
    title,
    names,
    tags,
    values,
    changed = [],
    highlight,
}: Readonly<{ title: string; names: readonly string[]; tags?: readonly string[]; values: readonly string[]; changed?: readonly boolean[]; highlight?: number | null }>) {
    return (
        <div aria-hidden="true" className="gf-slots">
            <p className="gf-slots__title">{title}</p>
            {names.map((name, index) => {
                const value = values[index];
                const dead = value === uninitialized;
                return (
                    <div className="gf-slots__row" data-changed={changed[index] ? "" : undefined} data-dead={dead ? "" : undefined} data-read={highlight === index ? "" : undefined} key={name}>
                        <span className="gf-slots__name">
                            {tags && <span className="gf-slots__tag">{tags[index]}</span>}
                            {name}
                        </span>
                        <span className="gf-slots__value" key={value}>
                            {dead ? "uninitialized · TDZ" : value}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}
