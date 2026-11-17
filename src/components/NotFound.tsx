import { Link, useLocation } from "@tanstack/react-router";
import { PageEnter } from "./PageEnter";
import { Pond } from "./pond/Pond";

/**
 * The 404 page. One sentence says what happened, three links lead back,
 * and the home page's koi pond sits below, so a wrong turn still lands
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
                            <strong>This page swam off.</strong> It isn't here, or it has moved. The koi below
                            know their way around this pond, and these links will get you home.
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
                            caption="Tap to feed the koi while you're here."
                            description="A koi pond lit by the current time of day in Mumbai. The koi gather near the pointer and come to food when the pond is tapped."
                            mode="garden"
                        />
                    </div>
                </PageEnter.Fade>
            </PageEnter>
        </main>
    );
}
