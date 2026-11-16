import type { ComponentType } from "react";

/** Plain data only: island props travel through the HTML as JSON. */
export type IslandProps = Record<string, unknown>;

type IslandLoader = () => Promise<ComponentType<IslandProps>>;

/**
 * Interactive components a guide may place in its MDX. Each one is
 * rendered to HTML on the server and hydrated as its own small React root
 * in the browser; the prose around it stays static HTML. Loaders are lazy
 * so guides without a given island never download its code.
 */
export const islands = {
    TimerOrderDemo: () =>
        import("../components/demos/TimerOrderDemo").then(
            (module) => module.TimerOrderDemo as ComponentType<IslandProps>,
        ),
} satisfies Record<string, IslandLoader>;

export type IslandName = keyof typeof islands;

export function isIslandName(value: string): value is IslandName {
    return Object.hasOwn(islands, value);
}

export const islandNameAttribute = "data-island";
export const islandPropsAttribute = "data-island-props";
