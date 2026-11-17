import type { SimState } from "../../lib/event-loop-sim";

/**
 * The scopes a closure example has created, drawn like the guide's own
 * diagrams: one row per environment with its bindings, then the callbacks
 * that close over it. The binding the current step reads or writes lights
 * up, and so does the callback that is running.
 */
export function BindingsPanel({ state }: Readonly<{ state: SimState }>) {
    const running = state.stack.at(-1);
    if (state.envs.length === 0) return <p className="el-bindings__empty">No bindings yet.</p>;
    return (
        <ol className="el-bindings">
            {state.envs.map((env) => {
                const touched = state.touched?.env === env.id ? state.touched : null;
                const callbacks = state.closures[env.id] ?? [];
                return (
                    <li className="el-bindings__env" data-touched={touched ? (touched.write ? "write" : "read") : undefined} key={env.id}>
                        <span className="el-bindings__label">{env.label}</span>
                        {Object.entries(env.vars).map(([name, value]) => (
                            <span className="el-bindings__var" key={name}>
                                {name} ={" "}
                                {/* Keyed by value, so a write enters as a new value. */}
                                <span className="el-bindings__value" key={String(value)}>
                                    {value}
                                </span>
                            </span>
                        ))}
                        <span className="el-bindings__closures">
                            {callbacks.length > 0 && (
                                <>
                                    <span aria-hidden="true">←</span>
                                    <span className="el-bindings__word">{callbacks.length === 1 ? "callback" : "callbacks"}</span>
                                    {callbacks.map((label) => (
                                        <span
                                            className="el-bindings__chip"
                                            data-running={running?.label === label && running.kind !== "script" ? "" : undefined}
                                            key={label}
                                            title={label}
                                        >
                                            {label.replace(/^\D+/, "")}
                                        </span>
                                    ))}
                                </>
                            )}
                        </span>
                    </li>
                );
            })}
        </ol>
    );
}
