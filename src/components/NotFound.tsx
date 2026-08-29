import { Link, useLocation } from "@tanstack/react-router";
import { PageEnter } from "./PageEnter";

const linkClassName =
    "underline decoration-accent underline-offset-4 hover:text-accent";

export function NotFound() {
    const pathname = useLocation({ select: (location) => location.pathname });

    return (
        <main
            id="main-content"
            className="mx-auto w-full max-w-2xl px-5 pb-12 pt-10"
        >
            <PageEnter key={pathname}>
            <PageEnter.Item>
            <header>
                <p className="font-mono text-sm text-muted">404</p>
                <h1 className="mt-3 text-[1.75rem] font-semibold leading-[1.15] tracking-tight text-foreground-strong sm:text-[2rem]">
                    This page doesn't exist
                </h1>
            </header>
            </PageEnter.Item>

            <PageEnter.Item>
            <div>
                <p className="mt-5 text-foreground">
                    The link may be broken, or the page may have been moved.
                    If you typed the address, double-check the spelling.
                    Otherwise, these should get you back on track.
                </p>
                <p className="mt-7 flex flex-wrap items-center gap-x-4 font-mono text-sm text-foreground">
                    <Link className={linkClassName} to="/">
                        ← Home
                    </Link>
                    <Link className={linkClassName} to="/articles">
                        Articles
                    </Link>
                    <Link className={linkClassName} to="/resume">
                        Resume
                    </Link>
                    <a className={linkClassName} href="/sitemap.xml">
                        Sitemap
                    </a>
                    <a className={linkClassName} href="/llms.txt">
                        Agent guide
                    </a>
                </p>
            </div>
            </PageEnter.Item>
            </PageEnter>
        </main>
    );
}
