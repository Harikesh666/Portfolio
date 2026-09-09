import { useRef } from "react";
import { ArrowUUpLeftIcon } from "@phosphor-icons/react";
import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { DiagramViewer } from "../../components/DiagramViewer";
import { FloatingToc } from "../../components/FloatingToc";
import { PageEnter } from "../../components/PageEnter";
import { StaggerReveal } from "../../components/StaggerReveal";
import { TocSheet } from "../../components/TocSheet";
import { useHasFloatingTocRegistration } from "../../components/TocRegistry";
import { getPostNeighbors, posts } from "../../lib/content";
import { getPost } from "../../lib/content.functions";
import { absoluteUrl, site } from "../../lib/site";
import { desktopQuery } from "../../lib/toc";
import { useMediaQuery } from "../../lib/use-media-query";
import { useTocNavigation } from "../../lib/use-toc-navigation";

export const Route = createFileRoute("/articles/$slug")({
    pendingComponent: PostPending,
    pendingMs: 0,
    pendingMinMs: 0,
    staleTime: Infinity,
    preloadStaleTime: Infinity,
    loader: async ({ params }) => {
        const post = await getPost({ data: { slug: params.slug } });
        if (!post) throw notFound();
        return post;
    },
    head: ({ loaderData }) => {
        const title = loaderData?.title ?? "Articles";
        const description = loaderData?.description ?? site.description;
        const canonicalUrl = absoluteUrl(`/articles/${loaderData?.slug ?? ""}`);
        const imageUrl = absoluteUrl(`/og/${loaderData?.slug ?? ""}.png`);

        return {
            meta: [
                { title: `${title} - ${site.name}` },
                { name: "description", content: description },
                { property: "og:title", content: title },
                { property: "og:description", content: description },
                { property: "og:type", content: "article" },
                { property: "og:url", content: canonicalUrl },
                { property: "og:image", content: imageUrl },
                {
                    property: "article:published_time",
                    content: loaderData?.publishedAt ?? "",
                },
                {
                    property: "article:modified_time",
                    content: loaderData?.publishedAt ?? "",
                },
                { property: "article:author", content: absoluteUrl() },
                { name: "twitter:card", content: "summary_large_image" },
                { name: "twitter:title", content: title },
                { name: "twitter:description", content: description },
                { name: "twitter:image", content: imageUrl },
            ],
            links: [{ rel: "canonical", href: canonicalUrl }],
            scripts: loaderData
                ? [
                      {
                          type: "application/ld+json",
                          children: JSON.stringify({
                              "@context": "https://schema.org",
                              "@type": "TechArticle",
                              headline: loaderData.title,
                              description: loaderData.description,
                              datePublished: loaderData.publishedAt,
                              dateModified: loaderData.publishedAt,
                              inLanguage: "en",
                              author: {
                                  "@type": "Person",
                                  "@id": `${absoluteUrl()}#person`,
                                  name: site.name,
                                  url: absoluteUrl(),
                              },
                              image: absoluteUrl(`/og/${loaderData.slug}.png`),
                              mainEntityOfPage: canonicalUrl,
                          }),
                      },
                  ]
                : [],
        };
    },
    component: PostPage,
});

function PostPending() {
    return (
        <main
            id="main-content"
            className="mx-auto w-full max-w-2xl px-5 pb-12 pt-8"
        >
            <div
                aria-live="polite"
                className="font-mono text-sm text-muted"
                role="status"
            >
                Loading article…
            </div>
        </main>
    );
}

function PostPage() {
    const isDesktop = useMediaQuery(desktopQuery);
    const hasDesktopTocRegistration = useHasFloatingTocRegistration();
    const post = Route.useLoaderData();
    const articleRef = useRef<HTMLElement>(null);
    const navigateToTocItem = useTocNavigation(articleRef);
    const { previous, next } = getPostNeighbors(post);
    const seriesPostCount = post.series
        ? posts.filter((item) => item.series === post.series).length
        : 0;

    return (
        <>
            <div aria-hidden="true" className="reading-progress" />
            <main
                id="main-content"
                className="mx-auto w-full max-w-2xl px-5 pb-12 pt-8"
            >
                <PageEnter key={post.slug}>
                    <header>
                        <Link
                            className="inline-flex items-center gap-2 font-mono text-[13px] font-medium tracking-[-0.005em] text-muted hover:text-accent"
                            to="/articles"
                        >
                            <ArrowUUpLeftIcon aria-hidden="true" size={18} />
                            Articles
                        </Link>

                        <StaggerReveal className="mt-7">
                            <StaggerReveal.Headline className="text-[1.75rem] font-semibold leading-[1.15] tracking-[-0.03em] text-foreground-strong sm:text-[2rem]">
                                {post.title}
                            </StaggerReveal.Headline>
                            <StaggerReveal.Item
                                as="p"
                                className="mt-3 font-mono text-[13px] font-medium tabular-nums tracking-[-0.005em] text-muted"
                            >
                                {post.date} · {post.readTime}
                                {post.series && post.order !== undefined
                                    ? ` · ${String(post.order).padStart(2, "0")} of ${seriesPostCount}`
                                    : ""}
                            </StaggerReveal.Item>
                        </StaggerReveal>
                    </header>

                    <article
                        className="guide-content prose dark:prose-invert mt-10 min-w-0 max-w-none prose-a:font-medium prose-a:text-foreground-strong prose-a:underline prose-a:decoration-accent prose-a:decoration-1 prose-a:underline-offset-2 prose-blockquote:border-foreground-strong/20 prose-blockquote:text-foreground prose-headings:font-semibold prose-headings:text-foreground-strong prose-h2:text-2xl prose-h3:text-lg prose-img:rounded-md prose-li:marker:text-accent prose-p:text-foreground prose-strong:font-semibold prose-strong:text-foreground-strong prose-code:font-medium prose-code:before:content-none prose-code:after:content-none"
                        dangerouslySetInnerHTML={{ __html: post.html }}
                        ref={articleRef}
                    />
                    <DiagramViewer containerRef={articleRef} key={post.slug} />

                    {(previous || next) && (
                        <nav
                            className="mt-14 grid grid-cols-1 gap-4 border-t border-divider pt-5 sm:grid-cols-2"
                            aria-label="Article navigation"
                        >
                            {previous && (
                                <Link
                                    className="block min-w-0 text-[1rem] font-medium leading-5 tracking-[-0.008em] text-foreground-strong hover:text-accent"
                                    to="/articles/$slug"
                                    params={{ slug: previous.slug }}
                                >
                                    ← {previous.title}
                                </Link>
                            )}
                            {next && (
                                <Link
                                    className="block min-w-0 text-[1rem] font-medium leading-5 tracking-[-0.008em] text-foreground-strong hover:text-accent sm:col-start-2 sm:text-right"
                                    to="/articles/$slug"
                                    params={{ slug: next.slug }}
                                >
                                    {next.title} →
                                </Link>
                            )}
                        </nav>
                    )}
                </PageEnter>
            </main>
            {isDesktop === true && (
                <FloatingToc
                    containerRef={articleRef}
                    items={post.toc}
                    key={post.slug}
                    onNavigate={navigateToTocItem}
                    slug={post.slug}
                />
            )}
            {isDesktop === false && !hasDesktopTocRegistration && (
                <TocSheet
                    containerRef={articleRef}
                    items={post.toc}
                    key={post.slug}
                    onNavigate={navigateToTocItem}
                    slug={post.slug}
                />
            )}
        </>
    );
}
