import { Link, useLocation } from "@tanstack/react-router";
import { didYouMean } from "../lib/did-you-mean";
import { PageEnter } from "./PageEnter";
import { LostSky } from "./pond/LostSky";

/**
 * The 404 page. The scene comes first and says it: a flock gathers in the
 * sky over Mumbai's rooftops and writes "404". Under it sit a small label,
 * one sentence saying what happened, the closest real page when the path
 * looks like a typo, and three links back.
 */
export function NotFound() {
    const pathname = useLocation({ select: (location) => location.pathname });
    const suggestion = didYouMean(pathname);

    return (
        <main id="main-content" className="mx-auto w-full max-w-2xl px-5 pb-12 pt-6">
            <PageEnter key={pathname}>
                <PageEnter.Fade>
                    <LostSky />
                </PageEnter.Fade>

                <PageEnter.Item>
                    <header className="mt-8">
                        <p className="text-[13px] text-muted">Error 404</p>
                        <h1 className="lost-lead mt-3">
                            <strong>This page flew off.</strong> The sky above is spelling out what happened, and
                            these links will get you home.
                        </h1>
                    </header>
                </PageEnter.Item>

                {suggestion ? (
                    <PageEnter.Item>
                        <p className="mt-5 text-[15px] text-muted">
                            Did you mean{" "}
                            {suggestion.kind === "article" ? (
                                <Link className="text-link" params={{ slug: suggestion.slug }} to="/articles/$slug">
                                    {suggestion.label}
                                </Link>
                            ) : (
                                <Link className="text-link" to={suggestion.to}>
                                    {suggestion.label}
                                </Link>
                            )}
                            ?
                        </p>
                    </PageEnter.Item>
                ) : null}

                <PageEnter.Item>
                    <nav aria-label="Ways back" className="mt-7 flex flex-wrap items-center gap-3">
                        <Link className="button-primary" to="/">
                            Back to home
                        </Link>
                        <Link className="button-soft" to="/articles">
                            Articles
                        </Link>
                        <Link className="button-soft" to="/resume">
                            Resume
                        </Link>
                    </nav>
                </PageEnter.Item>
            </PageEnter>
        </main>
    );
}
