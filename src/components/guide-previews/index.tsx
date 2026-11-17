import { lazy, Suspense, type ReactNode } from "react";
import type { FigureExampleName } from "../event-loop/examples";
import { HoverPeek } from "../HoverPeek";

/** One lazy chunk for every loop preview; a page only downloads it when someone hovers. */
const LoopPreview = lazy(() => import("./LoopPreview"));

/** Guides that have a live preview, by slug, and the example each one plays. */
const previews: Partial<Record<string, FigureExampleName>> = {
    "asynchronous-javascript-event-loop": "tasks-and-microtasks",
    "settimeout-minimum-not-deadline": "blocked-timer",
};

/**
 * Wraps a guide row. If the guide has a preview, hovering the row (or
 * focusing it with the keyboard) opens a card that plays it; otherwise the
 * row renders unchanged.
 */
export function GuidePreview({ children, slug }: Readonly<{ children: ReactNode; slug: string }>) {
    const example = previews[slug];
    if (!example) return children;

    return (
        <HoverPeek
            as="div"
            cardClassName="hover-peek--scene"
            className="contents"
            peek={(isOpen) => (
                <Suspense fallback={<div className="el-card" />}>
                    {/* Remount on each open so the story always starts from the top. */}
                    <LoopPreview example={example} isRunning={isOpen} key={String(isOpen)} />
                </Suspense>
            )}
        >
            {children}
        </HoverPeek>
    );
}
