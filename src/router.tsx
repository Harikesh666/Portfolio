import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { NotFound } from "./components/NotFound";

export function getRouter() {
    const router = createTanStackRouter({
        routeTree,
        scrollRestoration: true,
        // View transitions are intentionally NOT enabled router-wide:
        // they snapshot the incoming page while Motion enter states are
        // still hidden, masking the page-assembly cascade. The theme
        // toggle drives its own document.startViewTransition directly.
        defaultNotFoundComponent: NotFound,
        defaultPreload: "intent",
        defaultPreloadStaleTime: 0,
    });

    return router;
}

declare module "@tanstack/react-router" {
    interface Register {
        router: ReturnType<typeof getRouter>;
    }
}
