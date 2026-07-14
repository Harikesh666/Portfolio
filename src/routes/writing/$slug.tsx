import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { getPost, getPostNeighbors, posts } from "../../lib/content";
import { site } from "../../lib/site";

export const Route = createFileRoute("/writing/$slug")({
    loader: async ({ params }) => {
        const post = await getPost(params.slug);
        if (!post) throw notFound();
        return post;
    },
    head: ({ loaderData }) => ({
        meta: [
            { title: `${loaderData?.title ?? "Writing"} - ${site.name}` },
            {
                name: "description",
                content: loaderData?.description ?? site.description,
            },
            { property: "og:title", content: loaderData?.title ?? "Writing" },
            {
                property: "og:description",
                content: loaderData?.description ?? site.description,
            },
            { property: "og:type", content: "article" },
            { property: "og:image", content: `${site.url}/og.png` },
            { name: "twitter:image", content: `${site.url}/og.png` },
        ],
        links: [
            {
                rel: "canonical",
                href: `${site.url}/writing/${loaderData?.slug ?? ""}`,
            },
        ],
        scripts: loaderData
            ? [
                  {
                      type: "application/ld+json",
                      children: JSON.stringify({
                          "@context": "https://schema.org",
                          "@type": "Article",
                          headline: loaderData.title,
                          description: loaderData.description,
                          datePublished: loaderData.publishedAt,
                          author: { "@type": "Person", name: site.name },
                          mainEntityOfPage: `${site.url}/writing/${loaderData.slug}`,
                      }),
                  },
              ]
            : [],
    }),
    component: PostPage,
});

function PostPage() {
    const post = Route.useLoaderData();
    const { previous, next } = getPostNeighbors(post);
    const seriesPostCount = post.series
        ? posts.filter((item) => item.series === post.series).length
        : 0;

    return (
        <main
            id="main-content"
            className="mx-auto w-full max-w-[42rem] px-5 pb-12 pt-8"
        >
            <Link
                className="font-mono text-sm text-muted hover:text-accent"
                to="/writing"
            >
                ← Writing
            </Link>

            <h1 className="mt-7 text-[1.75rem] font-bold leading-normal tracking-[-0.02em] text-foreground-strong sm:text-[2rem]">
                {post.title}
            </h1>
            <p className="mt-3 font-mono text-sm text-muted">
                {post.date} · {post.readTime}
                {post.series && post.order !== undefined
                    ? ` · ${String(post.order).padStart(2, "0")} of ${seriesPostCount}`
                    : ""}
            </p>

            <article
                className="guide-content prose dark:prose-invert mt-10 min-w-0 max-w-none prose-a:font-medium prose-a:text-foreground-strong prose-a:underline prose-a:underline-offset-2 prose-blockquote:border-foreground-strong/20 prose-blockquote:text-foreground prose-headings:text-foreground-strong prose-headings:tracking-[-0.02em] prose-h2:text-2xl prose-h3:text-xl prose-img:rounded-md prose-li:marker:text-accent prose-p:text-foreground prose-strong:text-foreground-strong prose-table:block prose-table:overflow-x-auto prose-code:before:content-none prose-code:after:content-none"
                dangerouslySetInnerHTML={{ __html: post.html }}
            />

            {(previous || next) && (
                <nav
                    className="mt-14 space-y-4 border-t border-divider pt-5"
                    aria-label="Series navigation"
                >
                    {previous && (
                        <Link
                            className="block text-[17px] font-bold text-foreground-strong hover:text-accent"
                            to="/writing/$slug"
                            params={{ slug: previous.slug }}
                        >
                            ← {previous.title}
                        </Link>
                    )}
                    {next && (
                        <Link
                            className="block text-[17px] font-bold text-foreground-strong hover:text-accent"
                            to="/writing/$slug"
                            params={{ slug: next.slug }}
                        >
                            {next.title} →
                        </Link>
                    )}
                </nav>
            )}
        </main>
    );
}
