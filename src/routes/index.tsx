import { Link, createFileRoute } from "@tanstack/react-router";
import { posts } from "../lib/content";
import { site } from "../lib/site";

export const Route = createFileRoute("/")({
    head: () => ({
        meta: [
            {
                title: `${site.name} - Independent designer & creative developer`,
            },
            { name: "description", content: site.description },
            {
                property: "og:title",
                content: `${site.name} - Independent designer & creative developer`,
            },
            { property: "og:description", content: site.description },
            { property: "og:type", content: "website" },
            { property: "og:url", content: site.url },
            { name: "twitter:card", content: "summary_large_image" },
        ],
        links: [{ rel: "canonical", href: site.url }],
        scripts: [
            {
                type: "application/ld+json",
                children: JSON.stringify({
                    "@context": "https://schema.org",
                    "@type": "Person",
                    name: site.name,
                    url: site.url,
                    jobTitle: "Independent designer and creative developer",
                    description: site.description,
                }),
            },
        ],
    }),
    component: HomePage,
});

function SectionDots() {
    return (
        <div className="flex justify-center gap-1.5 py-8" aria-hidden="true">
            <i className="size-1.5 rounded-full bg-marker-coral" />
            <i className="size-1.5 rounded-full bg-marker-amber" />
            <i className="size-1.5 rounded-full bg-marker-green" />
        </div>
    );
}

function HomePage() {
    return (
        <main className="mx-auto w-[calc(100%-2rem)] max-w-[520px] pt-7 sm:w-[calc(100%-3rem)]">
            <h1 className="sr-only">{site.name}</h1>
            <section className="space-y-4 text-[15px] leading-[1.65] tracking-[-0.018em] text-foreground">
                <p>
                    I’m an independent designer and developer making websites
                    and identities for people with something meaningful to
                    share.
                </p>
                <p>
                    I care about the work beneath the surface: a clear idea, a
                    useful experience, and the small details that make a site
                    feel considered.
                </p>
                <p>
                    I also{" "}
                    <Link
                        className="font-semibold italic underline decoration-foreground/25 underline-offset-2 hover:text-foreground-strong"
                        to="/writing"
                    >
                        write
                    </Link>{" "}
                    about design, technology, and the practice of making things
                    on the web.
                </p>
                <p>
                    Open to thoughtful collaborations.{" "}
                    <a
                        className="font-semibold italic underline decoration-foreground/25 underline-offset-2 hover:text-foreground-strong"
                        href={`mailto:${site.email}`}
                    >
                        Say hello
                    </a>{" "}
                    and tell me what you’re working on.
                </p>
            </section>

            <SectionDots />

            <section id="work">
                <h2 className="mb-4 font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-muted">
                    Work
                </h2>
                <ul className="space-y-2">
                    <li className="flex items-baseline gap-2 text-[15px] leading-6">
                        <span className="shrink-0 font-semibold tracking-[-0.025em] text-foreground-strong">
                            Nima Foods
                        </span>
                        <span className="text-muted">/</span>
                        <span className="text-muted">
                            Brand identity and commerce for a thoughtful pantry
                            brand.
                        </span>
                    </li>
                    <li className="flex items-baseline gap-2 text-[15px] leading-6">
                        <span className="shrink-0 font-semibold tracking-[-0.025em] text-foreground-strong">
                            Morrow Studio
                        </span>
                        <span className="text-muted">/</span>
                        <span className="text-muted">
                            Digital product and website for an architecture
                            practice.
                        </span>
                    </li>
                    <li className="flex items-baseline gap-2 text-[15px] leading-6">
                        <span className="shrink-0 font-semibold tracking-[-0.025em] text-foreground-strong">
                            Field Notes
                        </span>
                        <span className="text-muted">/</span>
                        <span className="text-muted">
                            Identity and campaign for a cultural programme.
                        </span>
                    </li>
                </ul>
            </section>

            <SectionDots />

            <section>
                <h2 className="mb-4 font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-muted">
                    Writing
                </h2>
                <ul className="space-y-2">
                    {posts.map((post) => (
                        <li
                            className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-5 text-[15px]"
                            key={post.slug}
                        >
                            <Link
                                className="font-semibold tracking-[-0.025em] text-foreground-strong hover:underline hover:underline-offset-2"
                                to="/writing/$slug"
                                params={{ slug: post.slug }}
                            >
                                {post.title}
                            </Link>
                            <time
                                className="font-mono text-[11px] text-muted font-medium"
                                dateTime={post.publishedAt}
                            >
                                {post.date}
                            </time>
                        </li>
                    ))}
                </ul>
                <Link
                    className="mt-5 inline-flex items-center gap-1 text-[14px] font-semibold italic underline decoration-foreground/25 underline-offset-2 hover:text-foreground-strong"
                    to="/writing"
                >
                    View all <span aria-hidden="true">→</span>
                </Link>
            </section>
        </main>
    );
}
