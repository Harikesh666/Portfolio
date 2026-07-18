import { useRef } from "react";
import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import {
    FloatingToc,
    useHasFloatingTocRegistration,
} from "../../components/FloatingToc";
import { PageEnter } from "../../components/PageEnter";
import { TocSheet } from "../../components/TocSheet";
import { getPost, getPostNeighbors, posts } from "../../lib/content";
import { snappySpring } from "../../lib/motion";
import { absoluteUrl, site } from "../../lib/site";
import { desktopQuery } from "../../lib/toc";
import { useMediaQuery } from "../../lib/use-media-query";
import { useTocNavigation } from "../../lib/use-toc-navigation";

export const Route = createFileRoute("/writing/$slug")({
    loader: async ({ params }) => {
        const post = await getPost(params.slug);
        if (!post) throw notFound();
        return post;
    },
    head: ({ loaderData }) => {
        const title = loaderData?.title ?? "Writing";
        const description = loaderData?.description ?? site.description;
        const canonicalUrl = absoluteUrl(`/writing/${loaderData?.slug ?? ""}`);
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

function PostPage() {
    const shouldReduceMotion = useReducedMotion();
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
                <PageEnter.Item>
                <header>
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
                </header>
                </PageEnter.Item>

                <PageEnter.Fade>
                    <article
                        className="guide-content prose dark:prose-invert mt-10 min-w-0 max-w-none prose-a:font-medium prose-a:text-foreground-strong prose-a:underline prose-a:underline-offset-2 prose-blockquote:border-foreground-strong/20 prose-blockquote:text-foreground prose-headings:text-foreground-strong prose-headings:tracking-[-0.02em] prose-h2:text-2xl prose-h3:text-xl prose-img:rounded-md prose-li:marker:text-accent prose-p:text-foreground prose-strong:text-foreground-strong prose-table:block prose-table:overflow-x-auto prose-code:before:content-none prose-code:after:content-none"
                        dangerouslySetInnerHTML={{ __html: post.html }}
                        ref={articleRef}
                    />

                    {(previous || next) && (
                        <nav
                            className="mt-14 space-y-4 border-t border-divider pt-5"
                            aria-label="Series navigation"
                        >
                            {previous && (
                                <motion.div
                                    initial="idle"
                                    animate="idle"
                                    whileHover={
                                        shouldReduceMotion
                                            ? undefined
                                            : "hover"
                                    }
                                >
                                    <Link
                                        className="block text-[17px] font-bold text-foreground-strong hover:text-accent"
                                        to="/writing/$slug"
                                        params={{ slug: previous.slug }}
                                    >
                                        <motion.span
                                            className="inline-block"
                                            variants={{
                                                idle: { x: 0 },
                                                hover: { x: -2 },
                                            }}
                                            transition={snappySpring}
                                        >
                                            ←
                                        </motion.span>{" "}
                                        {previous.title}
                                    </Link>
                                </motion.div>
                            )}
                            {next && (
                                <motion.div
                                    initial="idle"
                                    animate="idle"
                                    whileHover={
                                        shouldReduceMotion
                                            ? undefined
                                            : "hover"
                                    }
                                >
                                    <Link
                                        className="block text-[17px] font-bold text-foreground-strong hover:text-accent"
                                        to="/writing/$slug"
                                        params={{ slug: next.slug }}
                                    >
                                        {next.title}{" "}
                                        <motion.span
                                            className="inline-block"
                                            variants={{
                                                idle: { x: 0 },
                                                hover: { x: 2 },
                                            }}
                                            transition={snappySpring}
                                        >
                                            →
                                        </motion.span>
                                    </Link>
                                </motion.div>
                            )}
                        </nav>
                    )}
                </PageEnter.Fade>
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
