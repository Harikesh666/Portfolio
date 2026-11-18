import { Link, useLocation } from "@tanstack/react-router";
import { PageEnter } from "./PageEnter";
import { Pond } from "./pond/Pond";

/**
 * The 404 page. One sentence says what happened, three links lead back,
 * and the bulbul sits on its branch below, so a wrong turn still lands
 * somewhere worth a moment.
 */
export function NotFound() {
    const pathname = useLocation({ select: (location) => location.pathname });

    return (
        <main id="main-content" className="mx-auto w-full max-w-2xl px-5 pb-12 pt-10">
            <PageEnter key={pathname}>
                <PageEnter.Item>
                    <header>
                        <p className="text-[13px] text-muted">Error 404</p>
                        <h1 className="lost-lead mt-3">
                            <strong>This page flew off.</strong> It isn't here, or it has moved. The bulbul
                            below stayed put, and these links will get you home.
                        </h1>
                    </header>
                </PageEnter.Item>

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

                <PageEnter.Fade>
                    <div className="mt-16">
                        <Pond
                            caption="Tap the bulbul and it sings; tap the branch and it hops."
                            description="A red-vented bulbul in silhouette on a peepal bough against the sky, lit from behind by the current time of day in Mumbai. Tapping the bird makes it sing, tapping the branch makes it hop there, and quick taps send it flying off before it comes back."
                            mode="bird"
                        />
                    </div>
                </PageEnter.Fade>
            </PageEnter>
        </main>
    );
}
