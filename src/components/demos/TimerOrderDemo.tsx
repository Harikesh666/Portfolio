import { useEffect, useRef, useState } from "react";

/** The demo shortens the 5000ms timer so the reader is not kept waiting. */
const demoDelayMs = 1500;

type LogLine = Readonly<{ text: string; note?: string }>;

/**
 * Replays the guide's setTimeout example: the two synchronous logs appear
 * at once, and the callback appears only after the timer fires.
 */
export function TimerOrderDemo() {
    const [lines, setLines] = useState<ReadonlyArray<LogLine>>([]);
    const [isWaiting, setIsWaiting] = useState(false);
    const timer = useRef<number | undefined>(undefined);

    useEffect(() => () => window.clearTimeout(timer.current), []);

    function run() {
        window.clearTimeout(timer.current);
        setLines([{ text: "Start" }, { text: "End" }]);
        setIsWaiting(true);
        timer.current = window.setTimeout(() => {
            setLines((current) => [
                ...current,
                { text: "Callback", note: "timer fired, stack was empty" },
            ]);
            setIsWaiting(false);
        }, demoDelayMs);
    }

    return (
        <figure className="not-prose my-8">
            <div className="rounded-xl border border-divider bg-surface p-4">
                <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-muted">Console</span>
                    <button className="chip-link" onClick={run} type="button">
                        {lines.length === 0 ? "Run" : "Run again"}
                    </button>
                </div>
                <ol
                    aria-live="polite"
                    className="mt-3 min-h-[5.25rem] font-mono text-sm leading-7 text-foreground-strong"
                >
                    {lines.map((line) => (
                        <li className="flex gap-3" key={line.text}>
                            <span>{line.text}</span>
                            {line.note && (
                                <span className="text-muted">// {line.note}</span>
                            )}
                        </li>
                    ))}
                    {isWaiting && (
                        <li className="text-muted">
                            Timer running in the browser…
                        </li>
                    )}
                </ol>
            </div>
            <figcaption className="mt-3 text-center text-sm text-muted">
                Press Run to watch the order. The 5000ms timer is shortened to
                1.5s.
            </figcaption>
        </figure>
    );
}
