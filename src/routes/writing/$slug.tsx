import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import {
    getPost,
    getPostNeighbors,
    posts,
    series,
} from "../../lib/content";
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
    const { previous, next } = getPostNeighbors(post.order);

    return (
        <main id="main-content" className="mx-auto w-[calc(100%-2rem)] max-w-190 pb-16 pt-7 sm:w-[calc(100%-3rem)] sm:pt-10">
            <nav
                className="flex items-center gap-3 text-[13px] font-medium text-muted"
                aria-label="Breadcrumb"
            >
                <Link className="editorial-link" to="/writing">
                    ← All guides
                </Link>
                <span aria-hidden="true">/</span>
                <span>{String(post.order).padStart(2, "0")}</span>
            </nav>

            <header className="article-intro border-b border-divider pb-10 pt-12 sm:pb-14 sm:pt-16">
                <p className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-marker-coral">
                    {post.category} / Guide {String(post.order).padStart(2, "0")} of {posts.length}
                </p>
                <h1 className="mt-5 max-w-[940px] text-balance font-serif text-[clamp(3rem,7vw,6rem)] font-medium leading-[0.93] tracking-[-0.038em] text-foreground-strong">
                    {post.title}
                </h1>
                <p className="mt-7 max-w-[700px] text-[18px] leading-8 tracking-[-0.02em] text-foreground sm:text-[21px]">
                    {post.description}
                </p>
                <dl className="mt-9 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-divider pt-5 text-[13px] text-foreground sm:flex sm:flex-wrap sm:gap-x-8">
                    <div className="col-span-2 sm:col-span-1">
                        <dt className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
                            Read
                        </dt>
                        <dd className="mt-1 font-medium text-foreground-strong">
                            {post.readTime}
                        </dd>
                    </div>
                    <div>
                        <dt className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
                            Updated
                        </dt>
                        <dd className="mt-1 font-medium text-foreground-strong">
                            {post.date}
                        </dd>
                    </div>
                    <div>
                        <dt className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
                            Series
                        </dt>
                        <dd className="mt-1 font-medium text-foreground-strong">
                            {series.title}
                        </dd>
                    </div>
                </dl>
            </header>

            <div className=" min-w-0 gap-10 pt-10 xl:grid-cols-[170px_minmax(0,720px)] xl:justify-center xl:gap-14">
                <aside className="min-w-0 border-y border-divider py-5 xl:sticky xl:top-8 xl:self-start xl:border-b-0">
                    <p className="font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-muted">
                        In this series
                    </p>
                    <p className="mt-3 font-serif text-2xl font-medium leading-none tracking-[-0.04em] text-foreground-strong">
                        {String(post.order).padStart(2, "0")} / {String(posts.length).padStart(2, "0")}
                    </p>
                    <p className="mt-4 text-[13px] leading-5 text-foreground">
                        Read this guide in three passes, then continue when the
                        next question arrives.
                    </p>
                    <Link
                        className="editorial-link mt-4 inline-flex text-[13px] font-semibold text-foreground-strong"
                        to="/writing"
                    >
                        View reading path →
                    </Link>
                </aside>
                <article
                    className="guide-content prose prose-zinc min-w-0 max-w-none prose-a:font-medium prose-a:text-foreground-strong prose-a:underline prose-a:underline-offset-2 prose-blockquote:border-foreground-strong/20 prose-blockquote:text-foreground prose-headings:font-serif prose-headings:font-medium prose-headings:tracking-[-0.035em] prose-headings:text-foreground-strong prose-h2:text-3xl prose-h3:text-xl prose-img:rounded-lg prose-li:marker:text-marker-coral prose-p:text-foreground prose-strong:text-foreground-strong prose-table:block prose-table:overflow-x-auto"
                    dangerouslySetInnerHTML={{ __html: post.html }}
                />
            </div>

            <nav
                className="mt-16 grid gap-px overflow-hidden border border-divider bg-divider sm:grid-cols-2"
                aria-label="Series navigation"
            >
                {previous ? (
                    <Link
                        className="article-next-link min-w-0 bg-surface p-6 sm:p-8"
                        to="/writing/$slug"
                        params={{ slug: previous.slug }}
                    >
                        <span className="font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-muted">
                            Previous guide
                        </span>
                        <span className="mt-3 block font-serif text-2xl font-medium leading-[0.98] tracking-[-0.04em] text-foreground-strong">
                            ← {previous.title}
                        </span>
                    </Link>
                ) : (
                    <div className="bg-surface p-6 sm:p-8">
                        <span className="font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-muted">
                            You are here
                        </span>
                        <span className="mt-3 block font-serif text-2xl font-medium leading-[0.98] tracking-[-0.04em] text-foreground-strong">
                            Start of the series
                        </span>
                    </div>
                )}
                {next ? (
                    <Link
                        className="article-next-link min-w-0 bg-surface p-6 text-right sm:p-8"
                        to="/writing/$slug"
                        params={{ slug: next.slug }}
                    >
                        <span className="font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-muted">
                            Next guide
                        </span>
                        <span className="mt-3 block font-serif text-2xl font-medium leading-[0.98] tracking-[-0.04em] text-foreground-strong">
                            {next.title} →
                        </span>
                    </Link>
                ) : (
                    <div className="bg-surface p-6 text-right sm:p-8">
                        <span className="font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-muted">
                            Complete
                        </span>
                        <span className="mt-3 block font-serif text-2xl font-medium leading-[0.98] tracking-[-0.04em] text-foreground-strong">
                            End of the series
                        </span>
                    </div>
                )}
            </nav>
        </main>
    );
}
