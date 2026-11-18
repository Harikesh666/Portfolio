import { createContext, useContext, useState, type RefObject } from "react";

/**
 * True for the route the server rendered. Its HTML is already on screen at
 * first paint, so entrances must leave it visible instead of hiding it until
 * JavaScript arrives. Client-side navigations mount with `false` and animate.
 */
export const ServerRenderedRouteContext = createContext(false);

/**
 * Reads the flag once, at mount. The route that was server-rendered stops being
 * "initial" when the reader navigates away, and an exiting tree must not
 * restart its entrance because of that.
 */
export function useIsServerRenderedRoute() {
    const isServerRendered = useContext(ServerRenderedRouteContext);
    const [atMount] = useState(isServerRendered);
    return atMount;
}

/**
 * Shared by one route's entrance: `performance.now()` at which the hero
 * stagger hands over to the rest of the page. A block that is already on
 * screen when the route mounts waits until then, so the page lands top to
 * bottom instead of showing lower content around a hero that has not arrived.
 */
export const HeroHandoffContext = createContext<RefObject<number>>({
    current: 0,
});

export function useHeroHandoffRef() {
    return useContext(HeroHandoffContext);
}
