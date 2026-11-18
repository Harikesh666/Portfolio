import { Link, useLocation } from "@tanstack/react-router";
import { PageEnter } from "./PageEnter";
import { Pond } from "./pond/Pond";

/**
 * The 404 page. The scene comes first and acts the page out: the branch
 * sways empty, then the bulbul flies in and lands. Under it sit the code,
 * one sentence saying what happened, and three links back.
 */
export function NotFound() {
    const pathname = useLocation({ select: (location) => location.pathname });

    return (
        <main id="main-content" className="mx-auto w-full max-w-2xl px-5 pb-12 pt-6">
            <PageEnter key={pathname}>
                <PageEnter.Fade>
                    <Pond
                        birdArrival="fly-in"
                        caption="Tap the bulbul to hear it sing. Tap the branch and it hops."
                        description="A peepal bough against the sky, lit from behind by the current time of day in Mumbai. The bough starts empty, then a red-vented bulbul flies in, lands on it in silhouette and sings. Tapping the bird makes it sing its call aloud, tapping the branch makes it hop there, and quick taps send it flying off before it comes back."
                        mode="bird"
                    />
                </PageEnter.Fade>

                <PageEnter.Item>
                    <header className="mt-8">
                        <p className="lost-code">
                            <span className="sr-only">Error </span>404
                        </p>
                        <h1 className="lost-lead lost-lead--quiet mt-2">
                            <strong>This page flew off.</strong> A bulbul landed here instead, and these links
                            will get you home.
                        </h1>
                    </header>
                </PageEnter.Item>

                <PageEnter.Item>
                    <nav aria-label="Ways back" className="lost-ways mt-6 flex flex-wrap items-center gap-2.5">
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
