import { useLayoutEffect, useRef, useState } from "react";
import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { ArticleHeader } from "../../components/ArticleHeader";
import { ArticleSkeleton } from "../../components/ArticleSkeleton";
import { DiagramViewer } from "../../components/DiagramViewer";
import { FloatingToc } from "../../components/FloatingToc";
import { PageEnter } from "../../components/PageEnter";
import { TocSheet } from "../../components/TocSheet";
import { useHasFloatingTocRegistration } from "../../components/TocRegistry";
import { getPostNeighbors, posts, type PostSummary } from "../../lib/content";
import { getPost } from "../../lib/content.functions";
import { absoluteUrl, site } from "../../lib/site";
import { desktopQuery } from "../../lib/toc";
import { useMediaQuery } from "../../lib/use-media-query";
import { useGuideIslands } from "../../lib/use-guide-islands";
import { useTocNavigation } from "../../lib/use-toc-navigation";
import { notFoundMeta } from "../../lib/not-found-head";

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
        if (!loaderData) return { meta: notFoundMeta };

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

/** The meta line under an article's title: date, read time, and its place in a series or topic. */
function metaLine(post: PostSummary) {
    const collectionPostCount = post.series
        ? posts.filter((item) => item.series === post.series).length
        : posts.filter((item) => item.topic === post.topic).length;
    const place = post.order !== undefined ? ` · ${String(post.order).padStart(2, "0")} of ${collectionPostCount}` : "";
    return `${post.date} · ${post.readTime}${place}`;
}

/**
 * Articles whose loading state already played the header's entrance. The
 * article that replaces it shows the header still, so the title animates once.
 */
const headersShown = new Set<string>();

/**
 * While an article loads, its real header shows at once (the article list
 * is already on the client) and a skeleton holds the body's place.
 */
function PostPending() {
    const { slug } = Route.useParams();
    const summary = posts.find((post) => post.slug === slug);

    useLayoutEffect(() => {
        if (summary) headersShown.add(slug);
    }, [slug, summary]);

    return (
        <main
            aria-busy="true"
            id="main-content"
            className="mx-auto w-full max-w-2xl px-5 pb-12 pt-8"
        >
            <p aria-live="polite" className="sr-only" role="status">
                Loading article
            </p>
            {summary ? (
                <ArticleHeader animate meta={metaLine(summary)} title={summary.title} />
            ) : (
                <div aria-hidden="true" className="article-skeleton article-skeleton--header">
                    <span className="article-skeleton__chip" />
                    <span className="article-skeleton__title" />
                    <span className="article-skeleton__meta" />
                </div>
            )}
            <ArticleSkeleton />
        </main>
    );
}

function PostPage() {
    const isDesktop = useMediaQuery(desktopQuery);
    const hasDesktopTocRegistration = useHasFloatingTocRegistration();
    const post = Route.useLoaderData();
    const articleRef = useRef<HTMLElement>(null);
    const navigateToTocItem = useTocNavigation(articleRef);
    useGuideIslands(articleRef, post.slug);
    const { previous, next } = getPostNeighbors(post);
    // If the loading state already played the header's entrance, show it still.
    const [headerShown] = useState(() => headersShown.delete(post.slug));

    // Heading self-links share the TOC's hash-history navigation.
    function handleHeadingAnchorClick(event: React.MouseEvent<HTMLElement>) {
        if (
            event.defaultPrevented ||
            event.button !== 0 ||
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey
        ) {
            return;
        }
        const anchor = (event.target as Element).closest("a.heading-anchor");
        const id = anchor?.getAttribute("href")?.slice(1);
        if (!id) return;

        event.preventDefault();
        void navigateToTocItem(decodeURIComponent(id));
    }

    return (
        <>
            <div aria-hidden="true" className="reading-progress" />
            <main
                id="main-content"
                className="mx-auto w-full max-w-2xl px-5 pb-12 pt-8"
            >
                <PageEnter key={post.slug}>
                    <ArticleHeader animate={!headerShown} meta={metaLine(post)} title={post.title} />

                    <article
                        className="guide-content prose dark:prose-invert mt-10 min-w-0 max-w-none prose-a:font-medium prose-a:text-foreground-strong prose-a:underline prose-a:decoration-foreground-strong/30 prose-a:decoration-1 prose-a:underline-offset-[3px] hover:prose-a:decoration-foreground-strong prose-blockquote:border-foreground-strong/20 prose-blockquote:text-foreground prose-headings:font-semibold prose-headings:text-foreground-strong prose-h2:mb-5 prose-h2:mt-14 prose-h2:text-[1.125rem] prose-h3:mb-3 prose-h3:mt-9 prose-h3:text-base prose-img:rounded-lg prose-li:marker:text-muted prose-li:text-foreground [&>p]:my-7 prose-p:text-foreground prose-strong:font-semibold prose-strong:text-foreground-strong prose-code:font-medium prose-code:before:content-none prose-code:after:content-none"
                        dangerouslySetInnerHTML={{ __html: post.html }}
                        onClick={handleHeadingAnchorClick}
                        ref={articleRef}
                    />
                    <DiagramViewer containerRef={articleRef} key={post.slug} />

                    {(previous || next) && (
                        <nav
                            className="mt-16 grid grid-cols-1 gap-x-6 gap-y-2 border-t border-divider pt-6 sm:grid-cols-2"
                            aria-label="Article navigation"
                        >
                            {previous && (
                                <Link
                                    className="hover-row min-w-0"
                                    to="/articles/$slug"
                                    params={{ slug: previous.slug }}
                                >
                                    <span className="block text-[13px] text-muted">
                                        Previous
                                    </span>
                                    <span className="mt-0.5 block font-medium leading-snug text-foreground-strong">
                                        {previous.title}
                                    </span>
                                </Link>
                            )}
                            {next && (
                                <Link
                                    className="hover-row min-w-0 sm:col-start-2 sm:text-right"
                                    to="/articles/$slug"
                                    params={{ slug: next.slug }}
                                >
                                    <span className="block text-[13px] text-muted">
                                        Next
                                    </span>
                                    <span className="mt-0.5 block font-medium leading-snug text-foreground-strong">
                                        {next.title}
                                    </span>
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
