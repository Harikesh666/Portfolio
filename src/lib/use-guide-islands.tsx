import { useEffect, type RefObject } from "react";
import { hydrateRoot, type Root } from "react-dom/client";
import {
    isIslandName,
    islandNameAttribute,
    islandPropsAttribute,
    islands,
    type IslandName,
    type IslandProps,
} from "../content/islands";

/** Starts an island's download about one screen before it scrolls into view. */
const islandLookahead = "100% 0px";

/**
 * Hydrates the interactive islands inside an article's static HTML. Each
 * island becomes its own React root, so React never manages the prose.
 * An island's code downloads only as the reader nears it: its server HTML is
 * already on screen, and a figure far down the page must not compete with
 * the article on a slow connection. Hydration waits for the lazy import, so
 * an effect that is torn down first (StrictMode, fast navigation) never
 * hydrates at all.
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
        const pending = new Map<Element, IslandName>();

        function hydrateIsland(element: HTMLElement, name: IslandName) {
            const props = JSON.parse(
                element.getAttribute(islandPropsAttribute) ?? "{}",
            ) as IslandProps;

            void islands[name]().then((Island) => {
                if (isCancelled || !element.isConnected) return;
                roots.push(hydrateRoot(element, <Island {...props} />));
            });
        }

        const observer =
            typeof IntersectionObserver === "undefined"
                ? null
                : new IntersectionObserver(
                      (entries) => {
                          for (const entry of entries) {
                              const name = pending.get(entry.target);
                              if (!entry.isIntersecting || !name) continue;
                              pending.delete(entry.target);
                              observer?.unobserve(entry.target);
                              if (entry.target instanceof HTMLElement) {
                                  hydrateIsland(entry.target, name);
                              }
                          }
                      },
                      { rootMargin: islandLookahead },
                  );

        for (const element of container.querySelectorAll<HTMLElement>(
            `[${islandNameAttribute}]`,
        )) {
            const name = element.getAttribute(islandNameAttribute) ?? "";
            if (!isIslandName(name)) continue;
            if (!observer) {
                hydrateIsland(element, name);
                continue;
            }
            pending.set(element, name);
            observer.observe(element);
        }

        return () => {
            isCancelled = true;
            observer?.disconnect();
            for (const root of roots) root.unmount();
        };
    }, [containerRef, slug]);
}
