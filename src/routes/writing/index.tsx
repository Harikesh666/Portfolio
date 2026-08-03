import { Link, createFileRoute } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import { PageEnter } from "../../components/PageEnter";
import { Reveal } from "../../components/Reveal";
import { StaggerReveal } from "../../components/StaggerReveal";
import { posts, seriesIndex, type PostSummary } from "../../lib/content";
import { snappySpring } from "../../lib/motion";
import { absoluteUrl, site } from "../../lib/site";

const writingDescription =
    "Long-form guides on JavaScript, React internals, and the mental models behind modern web applications.";
const writingTitle = `Writing - ${site.name}`;
const writingUrl = absoluteUrl("/writing");
const writingImage = absoluteUrl("/og.png");
const categoryDescriptions: Partial<Record<string, string>> = {
    JavaScript:
        "Scope, closures, asynchronous behavior, functions, and the language rules behind everyday code.",
};

export const Route = createFileRoute("/writing/")({
    head: () => ({
        meta: [
            { title: writingTitle },
            { name: "description", content: writingDescription },
            { property: "og:title", content: writingTitle },
            { property: "og:description", content: writingDescription },
            { property: "og:type", content: "website" },
            { property: "og:url", content: writingUrl },
            { property: "og:image", content: writingImage },
            { name: "twitter:card", content: "summary_large_image" },
            { name: "twitter:title", content: writingTitle },
            { name: "twitter:description", content: writingDescription },
            { name: "twitter:image", content: writingImage },
        ],
        links: [{ rel: "canonical", href: writingUrl }],
    }),
    component: WritingPage,
});

function WritingPage() {
    const shouldReduceMotion = useReducedMotion();
    const series = seriesIndex["react-internals"];
    const seriesPosts = posts.filter(
        (post) => post.series === "react-internals",
    );
    const standalonePosts = posts.filter((post) => !post.series);
    const standaloneCategories = Array.from(
        new Set(standalonePosts.map((post) => post.category)),
    );
    const topicNames = new Intl.ListFormat("en", {
        style: "long",
        type: "conjunction",
    }).format(Array.from(new Set(posts.map((post) => post.category))).sort());

    return (
        <main
            id="main-content"
            className="mx-auto w-full max-w-2xl px-5 pb-12 pt-10"
        >
            <PageEnter>
                <StaggerReveal as="header">
                    <StaggerReveal.Headline className="text-[1.75rem] font-semibold leading-[1.15] tracking-tight text-foreground-strong sm:text-[2rem]">
                        Writing
                    </StaggerReveal.Headline>
                    <StaggerReveal.Item as="p" className="mt-3 text-foreground">
                        {writingDescription}
                    </StaggerReveal.Item>
                    <StaggerReveal.Item
                        as="p"
                        className="mt-4 font-mono text-sm text-muted"
                    >
                        {posts.length} guides · {topicNames}
                    </StaggerReveal.Item>
                </StaggerReveal>

                <PageEnter.Fade>
                    <section
                        aria-labelledby="react-internals-heading"
                        className="mt-14"
                    >
                        <h2
                            className="text-[1.35rem] font-semibold leading-tight tracking-tight text-foreground-strong"
                            id="react-internals-heading"
                        >
                            {series.title}
                        </h2>
                        <p className="mt-2 text-foreground">
                            {series.description}
                        </p>
                        <p className="mt-3 font-mono text-sm text-muted">
                            {seriesPosts.length} guides · about{" "}
                            {series.readingTime} · updated {series.updatedAt}
                        </p>
                        <WritingPostList
                            ordered
                            posts={seriesPosts}
                            shouldReduceMotion={shouldReduceMotion}
                        />
                    </section>
                </PageEnter.Fade>

                {standaloneCategories.map((category) => {
                    const categoryPosts = standalonePosts.filter(
                        (post) => post.category === category,
                    );
                    const categoryId = `${category
                        .toLowerCase()
                        .replaceAll(/[^a-z0-9]+/g, "-")}-heading`;
                    const categoryDescription =
                        categoryDescriptions[category];

                    return (
                        <PageEnter.Fade key={category}>
                            <section
                                aria-labelledby={categoryId}
                                className="mt-14"
                            >
                                <h2
                                    className="text-[1.35rem] font-semibold leading-tight tracking-tight text-foreground-strong"
                                    id={categoryId}
                                >
                                    {category}
                                </h2>
                                {categoryDescription && (
                                    <p className="mt-2 text-foreground">
                                        {categoryDescription}
                                    </p>
                                )}
                                <p className="mt-3 font-mono text-sm text-muted">
                                    {categoryPosts.length} guides · newest first
                                </p>
                                <WritingPostList
                                    posts={categoryPosts}
                                    shouldReduceMotion={shouldReduceMotion}
                                />
                            </section>
                        </PageEnter.Fade>
                    );
                })}
            </PageEnter>
        </main>
    );
}

type WritingPostListProps = Readonly<{
    ordered?: boolean;
    posts: ReadonlyArray<PostSummary>;
    shouldReduceMotion: boolean | null;
}>;

function WritingPostList({
    ordered = false,
    posts: postList,
    shouldReduceMotion,
}: WritingPostListProps) {
    return (
        <ol className="mt-6 border-t border-divider">
            {postList.map((post) => (
                <Reveal
                    as="li"
                    className="border-b border-divider"
                    key={post.slug}
                >
                    <Link
                        className="group block py-5"
                        to="/writing/$slug"
                        params={{ slug: post.slug }}
                    >
                        <motion.div
                            whileHover={
                                shouldReduceMotion ? undefined : { x: 2 }
                            }
                            transition={snappySpring}
                        >
                            {ordered && (
                                <span className="mb-1 block font-mono text-sm text-accent">
                                    {String(post.order).padStart(2, "0")}
                                </span>
                            )}
                            <span className="block text-[17px] font-semibold leading-snug text-foreground-strong group-hover:text-accent">
                                {post.title}
                            </span>
                            <span className="mt-1 block text-sm text-muted">
                                {post.description}
                            </span>
                            <span className="mt-2 block text-sm text-muted">
                                {ordered
                                    ? post.readTime
                                    : `${post.date} · ${post.readTime}`}
                            </span>
                        </motion.div>
                    </Link>
                </Reveal>
            ))}
        </ol>
    );
}
