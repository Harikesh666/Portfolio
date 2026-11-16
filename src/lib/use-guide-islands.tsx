import { useEffect, type RefObject } from "react";
import { hydrateRoot, type Root } from "react-dom/client";
import {
    isIslandName,
    islandNameAttribute,
    islandPropsAttribute,
    islands,
    type IslandProps,
} from "../content/islands";

/**
 * Hydrates the interactive islands inside an article's static HTML. Each
 * island becomes its own React root, so React never manages the prose.
 * Hydration waits for the island's lazy import, so an effect that is torn
 * down first (StrictMode, fast navigation) never hydrates at all.
 */
export function useGuideIslands(
    containerRef: RefObject<HTMLElement | null>,
    slug: string,
) {
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const roots: Root[] = [];
        let isCancelled = false;

        for (const element of container.querySelectorAll<HTMLElement>(
            `[${islandNameAttribute}]`,
        )) {
            const name = element.getAttribute(islandNameAttribute) ?? "";
            if (!isIslandName(name)) continue;
            const props = JSON.parse(
                element.getAttribute(islandPropsAttribute) ?? "{}",
            ) as IslandProps;

            void islands[name]().then((Island) => {
                if (isCancelled || !element.isConnected) return;
                roots.push(hydrateRoot(element, <Island {...props} />));
            });
        }

        return () => {
            isCancelled = true;
            for (const root of roots) root.unmount();
        };
    }, [containerRef, slug]);
}
