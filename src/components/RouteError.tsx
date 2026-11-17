import { useState } from "react";
import { Link, useLocation, useRouter, type ErrorComponentProps } from "@tanstack/react-router";
import { PageEnter } from "./PageEnter";

/**
 * The page shown when a route fails to load or render. It matches the 404,
 * offers a retry that reloads the route's data, and shows the raw error
 * only in development.
 */
export function RouteError({ error, reset }: ErrorComponentProps) {
    const router = useRouter();
    const pathname = useLocation({ select: (location) => location.pathname });
    const [isRetrying, setIsRetrying] = useState(false);

    async function retry() {
        setIsRetrying(true);
        // Invalidating reruns the failed loader; resetting clears the boundary so the route renders again.
        await router.invalidate();
        reset();
        setIsRetrying(false);
    }

    return (
        <main id="main-content" className="mx-auto w-full max-w-2xl px-5 pb-12 pt-10">
            <PageEnter key={pathname}>
                <PageEnter.Item>
                    <header>
                        <p className="text-[13px] text-muted">Error</p>
                        <h1 className="lost-lead mt-3">
                            <strong>Something went wrong.</strong> This page didn't load properly. It's usually a
                            dropped connection or a brief hiccup, so trying again often fixes it.
                        </h1>
                    </header>
                </PageEnter.Item>

                <PageEnter.Item>
                    <div>
                        <div className="mt-7 flex flex-wrap items-center gap-3">
                            <button className="button-primary" disabled={isRetrying} onClick={() => void retry()} type="button">
                                {isRetrying ? "Trying again…" : "Try again"}
                            </button>
                            <Link className="button-soft" to="/">
                                Back to home
                            </Link>
                        </div>
                        {import.meta.env.DEV ? (
                            <pre className="mt-10 overflow-x-auto rounded-lg bg-hover p-4 font-mono text-xs text-foreground">
                                {error instanceof Error ? (error.stack ?? error.message) : String(error)}
                            </pre>
                        ) : null}
                    </div>
                </PageEnter.Item>
            </PageEnter>
        </main>
    );
}
