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
            { property: "og:image", content: `${site.url}/og.png` },
            { name: "twitter:image", content: `${site.url}/og.png` },
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
        <main
            id="main-content"
            className="mx-auto w-full max-w-[42rem] px-5 pb-12 pt-10"
        >
            <h1 className="text-[1.75rem] font-bold leading-normal tracking-[-0.02em] text-foreground-strong sm:text-[2rem]">
                {series.title}
            </h1>
            <p className="mt-3 text-foreground">{series.description}</p>
            <p className="mt-4 font-mono text-sm text-muted">
                {posts.length} guides · about {series.readingTime} · updated {series.updatedAt}
            </p>

            <ol className="mt-10 border-t border-divider">
                {posts.map((post) => (
                    <li className="border-b border-divider" key={post.slug}>
                        <Link
                            className="group block py-5"
                            to="/writing/$slug"
                            params={{ slug: post.slug }}
                        >
                            <span className="font-mono text-sm text-accent">
                                {String(post.order).padStart(2, "0")}
                            </span>
                            <span className="mt-1 block text-[17px] font-bold text-foreground-strong group-hover:text-accent">
                                {post.title}
                            </span>
                            <span className="mt-1 block text-sm text-muted">
                                {post.description}
                            </span>
                            <span className="mt-2 block text-sm text-foreground">
                                {post.readTime}
                            </span>
                        </Link>
                    </li>
                ))}
            </ol>
        </main>
    );
}
