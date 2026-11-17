import { lazy, Suspense, type ReactNode } from "react";
import type { FigureExampleName } from "../event-loop/examples";
import type { GuideFigureName } from "../guide-figures/GuideFigure";
import { HoverPeek } from "../HoverPeek";

/** Lazy chunks: a page only downloads a preview's code when someone hovers. */
const LoopPreview = lazy(() => import("./LoopPreview"));
const FigurePreviewCard = lazy(() => import("./FigurePreviewCard"));

type Preview = Readonly<{ loop: FigureExampleName }> | Readonly<{ figure: GuideFigureName }>;

/** Guides with a live preview, by slug: an event-loop example, or one of the guide's own figures. */
const previews: Partial<Record<string, Preview>> = {
    "asynchronous-javascript-event-loop": { loop: "tasks-and-microtasks" },
    "settimeout-minimum-not-deadline": { loop: "blocked-timer" },
    "settimeout-closures-var-let-loop": { loop: "var-loop" },
    v8: { figure: "v8-node-layers" },
    "how-javascript-engine-runs-code": { figure: "engine-parser" },
    processing: { figure: "process-time-slices" },
    "javascript-scope-how-names-find-values": { figure: "scope-first-second" },
    "javascript-block-scope-and-shadowing": { figure: "block-shadowing" },
    "var-let-const-and-temporal-dead-zone": { figure: "tdz-bindings" },
    "closures-function-backpack": { figure: "backpack-nested" },
    "closures-beyond-the-basics": { figure: "closures-outest" },
    "how-javascript-keeps-track-of-running-code": { figure: "ctx-countdown" },
    "javascript-concurrency-one-thread-many-tasks": { figure: "concurrency-loop" },
    "higher-order-functions-stop-rewriting-the-loop": { figure: "hof-with-logging" },
    "map-filter-reduce-transform-select-combine": { figure: "filter-four" },
    "react-rendering-reconciliation-internals": { figure: "react-double-buffer" },
};

/**
 * Wraps a guide row. If the guide has a preview, hovering the row (or
 * focusing it with the keyboard) opens a card that plays it; otherwise the
 * row renders unchanged.
 */
export function GuidePreview({ children, slug }: Readonly<{ children: ReactNode; slug: string }>) {
    const preview = previews[slug];
    if (!preview) return children;

    return (
        <HoverPeek
            as="div"
            cardClassName="hover-peek--scene"
            className="contents"
            peek={(isOpen) => (
                <Suspense fallback={<div className="el-card" />}>
                    {/* Remount on each open so the story always starts from the top. */}
                    {"loop" in preview ? (
                        <LoopPreview example={preview.loop} isRunning={isOpen} key={String(isOpen)} />
                    ) : (
                        <FigurePreviewCard figure={preview.figure} isRunning={isOpen} key={String(isOpen)} />
                    )}
                </Suspense>
            )}
        >
            {children}
        </HoverPeek>
    );
}
