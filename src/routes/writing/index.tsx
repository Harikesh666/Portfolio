import { Link, createFileRoute } from "@tanstack/react-router";
import { posts } from "../../lib/content";
import { site } from "../../lib/site";

const writingDescription =
    "Notes on design, the web, creative practice, and making things with a point of view.";

export const Route = createFileRoute("/writing/")({
    head: () => ({
        meta: [
            { title: `Writing — ${site.name}` },
            { name: "description", content: writingDescription },
            { property: "og:title", content: `Writing — ${site.name}` },
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
        <main className="mx-auto w-[calc(100%-2rem)] max-w-[520px] pt-7 sm:w-[calc(100%-3rem)]">
            <section className="max-w-[500px] text-[15px] leading-[1.65] tracking-[-0.018em] text-foreground">
                <p>
                    I write when there’s something worth saying about design,
                    building for the web, and the long practice of learning how
                    to make useful things.
                </p>
            </section>
            <ul className="mt-7 space-y-3">
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
            <div className="pt-10 text-center">
                <div
                    className="mb-3 flex justify-center gap-1.5"
                    aria-hidden="true"
                >
                    <i className="size-1.5 rounded-full bg-marker-coral" />
                    <i className="size-1.5 rounded-full bg-marker-amber" />
                    <i className="size-1.5 rounded-full bg-marker-green" />
                </div>
                <p className="text-[12px] text-muted">
                    Occasional notes, when there is something worth sharing.
                </p>
                <a
                    className="mt-3 inline-flex text-[14px] font-semibold italic underline decoration-foreground/25 underline-offset-2 hover:text-foreground-strong"
                    href={`mailto:${site.email}?subject=Newsletter`}
                >
                    Get in touch <span aria-hidden="true">→</span>
                </a>
            </div>
        </main>
    );
}
