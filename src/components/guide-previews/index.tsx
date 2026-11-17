import { lazy, Suspense, type ComponentType, type ReactNode } from "react";
import { HoverPeek } from "../HoverPeek";

type PreviewScene = ComponentType<{ isRunning: boolean }>;

/**
 * Guides that have a live preview scene, by slug. Each scene is its own lazy
 * chunk, so a page only downloads the scenes someone actually hovers.
 */
const scenes: Partial<Record<string, PreviewScene>> = {
    "asynchronous-javascript-event-loop": lazy(() => import("./EventLoopPreview")),
};

/**
 * Wraps a guide row. If the guide has a preview scene, hovering the row (or
 * focusing it with the keyboard) opens a card that plays it; otherwise the
 * row renders unchanged.
 */
export function GuidePreview({ children, slug }: Readonly<{ children: ReactNode; slug: string }>) {
    const Scene = scenes[slug];
    if (!Scene) return children;

    return (
        <HoverPeek
            as="div"
            cardClassName="hover-peek--scene"
            className="contents"
            peek={(isOpen) => (
                <Suspense fallback={<div className="loop-scene" />}>
                    {/* Remount on each open so the story always starts from the top. */}
                    <Scene isRunning={isOpen} key={String(isOpen)} />
                </Suspense>
            )}
        >
            {children}
        </HoverPeek>
    );
}
