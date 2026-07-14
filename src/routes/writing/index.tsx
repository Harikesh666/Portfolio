import { Link, createFileRoute } from "@tanstack/react-router";
import { posts, series } from "../../lib/content";
import { site } from "../../lib/site";

const writingDescription =
    "A long-form React guide series about the mental models behind modern React applications.";

export const Route = createFileRoute("/writing/")({
    head: () => ({
        meta: [
            { title: `Writing - ${site.name}` },
            { name: "description", content: writingDescription },
            { property: "og:title", content: `Writing - ${site.name}` },
            { property: "og:description", content: writingDescription },
        ],
        links: [{ rel: "canonical", href: `${site.url}/writing` }],
        scripts: [
            {
                type: "application/ld+json",
                children: JSON.stringify({
                    "@context": "https://schema.org",
                    "@type": "CollectionPage",
                    name: `Writing by ${site.name}`,
                    description: writingDescription,
                    url: `${site.url}/writing`,
                    mainEntity: {
                        "@type": "ItemList",
                        itemListElement: posts.map((post, index) => ({
                            "@type": "ListItem",
                            position: index + 1,
                            url: `${site.url}/writing/${post.slug}`,
                            name: post.title,
                        })),
                    },
                }),
            },
        ],
    }),
    component: WritingPage,
});

function WritingPage() {
    return (
        <main id="main-content" className="mx-auto w-[calc(100%-2rem)] max-w-[1120px] pb-16 pt-10 sm:w-[calc(100%-3rem)] sm:pt-16">
            <section className="border-y border-divider py-8 sm:grid sm:grid-cols-[minmax(0,1.4fr)_minmax(220px,0.6fr)] sm:gap-12 sm:py-14">
                <div className="min-w-0">
                    <p className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-marker-coral">
                        Writing / React internals
                    </p>
                    <h1 className="mt-5 max-w-[720px] text-balance font-serif text-[clamp(3rem,7vw,6.5rem)] font-medium leading-[0.93] tracking-[-0.038em] text-foreground-strong">
                        {series.title}
                    </h1>
                    <p className="mt-6 max-w-[610px] text-[17px] leading-7 tracking-[-0.02em] text-foreground sm:text-[19px]">
                        {series.description}
                    </p>
                    <Link
                        className="editorial-link mt-8 inline-flex items-center gap-3 border-b border-foreground-strong pb-1 text-[15px] font-semibold text-foreground-strong"
                        to="/writing/$slug"
                        params={{ slug: posts[0].slug }}
                    >
                        Start with the foundation
                        <span aria-hidden="true">→</span>
                    </Link>
                </div>
                <aside className="mt-10 border-l border-divider pl-5 sm:mt-1 sm:self-end">
                    <p className="font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-muted">
                        The series
                    </p>
                    <dl className="mt-5 grid gap-4 text-[14px] leading-5 text-foreground">
                        <div>
                            <dt className="text-muted">Format</dt>
                            <dd className="font-medium text-foreground-strong">
                                {posts.length} guided essays
                            </dd>
                        </div>
                        <div>
                            <dt className="text-muted">Reading time</dt>
                            <dd className="font-medium text-foreground-strong">
                                About {series.readingTime}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-muted">Updated</dt>
                            <dd className="font-medium text-foreground-strong">
                                {series.updatedAt}
                            </dd>
                        </div>
                    </dl>
                </aside>
            </section>

            <section className="grid min-w-0 gap-10 pt-14 lg:grid-cols-[minmax(0,1fr)_240px] lg:gap-16">
                <div className="min-w-0">
                    <div className="flex items-end justify-between gap-6 border-b border-divider pb-4">
                        <div>
                            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-muted">
                                Reading path
                            </p>
                            <h2 className="mt-2 font-serif text-3xl font-medium tracking-[-0.045em] text-foreground-strong">
                                Learn in order, or follow the question.
                            </h2>
                        </div>
                    </div>
                    <ol className="mt-2">
                        {posts.map((post) => (
                            <li className="series-card" key={post.slug}>
                                <Link
                                    className="group grid gap-4 py-6 sm:grid-cols-[52px_minmax(0,1fr)_auto] sm:gap-6"
                                    to="/writing/$slug"
                                    params={{ slug: post.slug }}
                                >
                                    <span className="font-mono text-[12px] font-medium text-marker-coral">
                                        {String(post.order).padStart(2, "0")}
                                    </span>
                                    <span>
                                        <span className="font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-muted">
                                            {post.category}
                                        </span>
                                        <span className="mt-2 block font-serif text-[clamp(1.65rem,3vw,2.35rem)] font-medium leading-[0.98] tracking-[-0.04em] text-foreground-strong">
                                            {post.title}
                                        </span>
                                        <span className="mt-3 block max-w-[650px] text-[15px] leading-6 text-foreground">
                                            {post.description}
                                        </span>
                                    </span>
                                    <span className="flex items-center gap-3 text-[13px] text-muted sm:pt-1">
                                        {post.readTime}
                                        <span
                                            className="text-[18px] text-foreground-strong"
                                            aria-hidden="true"
                                        >
                                            →
                                        </span>
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </ol>
                </div>
                <aside className="self-start border-t border-divider pt-5 lg:sticky lg:top-8">
                    <p className="font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-muted">
                        How to read it
                    </p>
                    <ol className="mt-5 space-y-5 text-[14px] leading-6 text-foreground">
                        <li>
                            <span className="font-medium text-foreground-strong">
                                First pass.
                            </span>{" "}
                            Read the itch and short version to build the map.
                        </li>
                        <li>
                            <span className="font-medium text-foreground-strong">
                                Second pass.
                            </span>{" "}
                            Return when a real problem makes the mechanism useful.
                        </li>
                        <li>
                            <span className="font-medium text-foreground-strong">
                                Third pass.
                            </span>{" "}
                            Follow the primary sources when you want to go deeper.
                        </li>
                    </ol>
                </aside>
            </section>
        </main>
    );
}
