import { Link, createFileRoute } from "@tanstack/react-router";
import { posts } from "../lib/content";
import { site } from "../lib/site";

export const Route = createFileRoute("/")({
    head: () => ({
        meta: [
            { title: `${site.name} - Full-stack developer` },
            { name: "description", content: site.description },
            { property: "og:title", content: `${site.name} - Full-stack developer` },
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
                    jobTitle: "Full-stack developer",
                    description: site.description,
                }),
            },
        ],
    }),
    component: HomePage,
});

function HomePage() {
    return (
        <main
            id="main-content"
            className="mx-auto w-[calc(100%-2rem)] max-w-[1120px] pb-4 pt-12 sm:w-[calc(100%-3rem)] sm:pt-20"
        >
            <section className="max-w-[890px] border-b border-divider pb-14 sm:pb-20">
                <p className="text-sm font-bold text-accent">
                    Harikesh Mishra · Full-stack developer
                </p>
                <h1 className="mt-5 max-w-[860px] text-balance font-serif text-[clamp(3.35rem,8vw,6rem)] font-medium leading-[0.93] tracking-[-0.038em] text-foreground-strong">
                    I build systems that stay useful when production gets messy.
                </h1>
                <p className="mt-7 max-w-[680px] text-pretty text-lg leading-8 text-foreground sm:text-xl sm:leading-9">
                    I work across React, Node.js, FastAPI, and PostgreSQL—shipping reliable product features, finding the bugs that matter, and making complex systems easier to operate.
                </p>
                <div className="mt-9 flex flex-wrap gap-3">
                    <a
                        className="rounded-md bg-foreground-strong px-5 py-3 text-sm font-bold text-surface transition-colors hover:bg-accent motion-reduce:transition-none"
                        href={`mailto:${site.email}`}
                    >
                        Email me about a role
                    </a>
                    <Link
                        className="rounded-md border border-divider px-5 py-3 text-sm font-bold text-foreground-strong transition-colors hover:border-foreground-strong hover:bg-accent-soft motion-reduce:transition-none"
                        to="/writing"
                    >
                        Start reading
                    </Link>
                </div>
            </section>

            <section
                id="work"
                className="grid gap-10 border-b border-divider py-14 sm:py-20 lg:grid-cols-[minmax(0,1.5fr)_minmax(260px,0.55fr)] lg:gap-20"
            >
                <div>
                    <p className="text-sm font-bold text-accent">
                        Selected production work
                    </p>
                    <h2 className="mt-3 max-w-[650px] text-balance font-serif text-[clamp(2.2rem,5vw,4rem)] font-medium leading-[0.98] tracking-[-0.035em] text-foreground-strong">
                        Evidence over adjectives.
                    </h2>
                    <div className="mt-9 divide-y divide-divider border-y border-divider">
                        <article className="py-6 sm:grid sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-7">
                            <p className="font-bold text-foreground-strong">
                                Sales Copilot
                            </p>
                            <div className="mt-2 sm:mt-0">
                                <p className="text-foreground">
                                    Built eight admin data-management pages end to end, then established reusable table, modal, and edit-form patterns across the module.
                                </p>
                                <p className="mt-3 text-sm font-bold text-accent">
                                    130K+ records · ~190ms page requests · 60% fewer files per page
                                </p>
                            </div>
                        </article>
                        <article className="py-6 sm:grid sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-7">
                            <p className="font-bold text-foreground-strong">
                                Multi-tenant LMS
                            </p>
                            <div className="mt-2 sm:mt-0">
                                <p className="text-foreground">
                                    Architected tenant isolation for five client organizations and traced a critical routing defect before it continued sending new chatbots to the wrong database.
                                </p>
                                <p className="mt-3 text-sm font-bold text-accent">
                                    5 organizations · 35+ frontend files · critical fix shipped same day
                                </p>
                            </div>
                        </article>
                        <article className="py-6 sm:grid sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-7">
                            <p className="font-bold text-foreground-strong">
                                Reporting & AI
                            </p>
                            <div className="mt-2 sm:mt-0">
                                <p className="text-foreground">
                                    Built dynamic reporting for training leadership and a solo interview chatbot with LLM scoring, deployed across Vercel and GCP Cloud Run.
                                </p>
                                <p className="mt-3 text-sm font-bold text-accent">
                                    35% faster SQL · stakeholder demoed · end-to-end delivery
                                </p>
                            </div>
                        </article>
                    </div>
                </div>
                <aside className="self-start border-y border-divider py-5 text-[15px] leading-7 text-foreground lg:border-y-0">
                    <p className="font-serif text-2xl leading-tight tracking-[-0.025em] text-foreground-strong">
                        The work I enjoy most lives at the boundaries: product intent, operational reality, and the code that has to hold both together.
                    </p>
                    <p className="mt-5">
                        React · TypeScript · Node.js · FastAPI · PostgreSQL · AWS · GCP
                    </p>
                </aside>
            </section>

            <section className="grid gap-10 py-14 sm:py-20 lg:grid-cols-[minmax(0,1.5fr)_minmax(260px,0.55fr)] lg:gap-20">
                <div>
                    <p className="text-sm font-bold text-accent">Writing</p>
                    <h2 className="mt-3 max-w-[640px] text-balance font-serif text-[clamp(2.2rem,5vw,4rem)] font-medium leading-[0.98] tracking-[-0.035em] text-foreground-strong">
                        Technical notes for people who want the mechanism, not just the API.
                    </h2>
                    <ol className="mt-9 divide-y divide-divider border-y border-divider">
                        {posts.slice(0, 3).map((post) => (
                            <li key={post.slug}>
                                <Link
                                    className="group grid gap-2 py-5 sm:grid-cols-[52px_minmax(0,1fr)_auto] sm:items-baseline sm:gap-5"
                                    to="/writing/$slug"
                                    params={{ slug: post.slug }}
                                >
                                    <span className="text-sm font-bold text-accent">
                                        {String(post.order).padStart(2, "0")}
                                    </span>
                                    <span>
                                        <span className="font-serif text-2xl font-medium leading-tight tracking-[-0.025em] text-foreground-strong transition-colors group-hover:text-accent motion-reduce:transition-none">
                                            {post.title}
                                        </span>
                                        <span className="mt-1.5 block max-w-[620px] text-sm leading-6 text-foreground">
                                            {post.description}
                                        </span>
                                    </span>
                                    <span className="text-sm font-semibold text-muted">
                                        {post.readTime}
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </ol>
                    <Link
                        className="mt-6 inline-flex items-center gap-2 font-bold text-foreground-strong underline decoration-accent decoration-2 underline-offset-4 hover:text-accent"
                        to="/writing"
                    >
                        Read the full series <span aria-hidden="true">→</span>
                    </Link>
                </div>
                <aside className="self-start border-t border-divider pt-5 text-sm leading-6 text-foreground">
                    <p className="font-bold text-foreground-strong">
                        The current series
                    </p>
                    <p className="mt-2">
                        Ten long-form guides on how React renders, schedules work, handles state, and behaves under pressure.
                    </p>
                    <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-divider pt-5">
                        <div>
                            <dt className="text-muted">Format</dt>
                            <dd className="mt-1 font-bold text-foreground-strong">
                                10 guides
                            </dd>
                        </div>
                        <div>
                            <dt className="text-muted">Reading time</dt>
                            <dd className="mt-1 font-bold text-foreground-strong">
                                8 hours
                            </dd>
                        </div>
                    </dl>
                </aside>
            </section>
        </main>
    );
}
