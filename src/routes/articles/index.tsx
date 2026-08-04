import { Link, createFileRoute } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import { PageEnter } from "../../components/PageEnter";
import { Reveal } from "../../components/Reveal";
import { StaggerReveal } from "../../components/StaggerReveal";
import {
    posts,
    seriesIndex,
    topicIndex,
    type PostSummary,
} from "../../lib/content";
import { snappySpring } from "../../lib/motion";
import { absoluteUrl, site } from "../../lib/site";

const articlesDescription =
    "Long-form guides on JavaScript, React internals, and the mental models behind modern web applications.";
const articlesTitle = `Articles - ${site.name}`;
const articlesUrl = absoluteUrl("/articles");
const articlesImage = absoluteUrl("/og.png");
const series = seriesIndex["react-internals"];
const seriesPosts = posts.filter((post) => post.series === "react-internals");
const standalonePosts = posts.filter((post) => !post.series);
const topics = Object.entries(topicIndex).map(([id, topic]) => ({
    ...topic,
    id,
    posts: standalonePosts.filter((post) => post.topic === id),
}));

export const Route = createFileRoute("/articles/")({
    head: () => ({
        meta: [
            { title: articlesTitle },
            { name: "description", content: articlesDescription },
            { property: "og:title", content: articlesTitle },
            { property: "og:description", content: articlesDescription },
            { property: "og:type", content: "website" },
            { property: "og:url", content: articlesUrl },
            { property: "og:image", content: articlesImage },
            { name: "twitter:card", content: "summary_large_image" },
            { name: "twitter:title", content: articlesTitle },
            { name: "twitter:description", content: articlesDescription },
            { name: "twitter:image", content: articlesImage },
        ],
        links: [{ rel: "canonical", href: articlesUrl }],
    }),
    component: ArticlesPage,
});

function ArticlesPage() {
    const shouldReduceMotion = useReducedMotion();

    return (
        <main
            id="main-content"
            className="mx-auto w-full max-w-2xl px-5 pb-12 pt-10"
        >
            <PageEnter>
                <StaggerReveal as="header">
                    <StaggerReveal.Headline className="text-[1.75rem] font-semibold leading-[1.15] tracking-tight text-foreground-strong sm:text-[2rem]">
                        Articles
                    </StaggerReveal.Headline>
                    <StaggerReveal.Item as="p" className="mt-3 text-foreground">
                        {articlesDescription}
                    </StaggerReveal.Item>
                    <StaggerReveal.Item
                        as="p"
                        className="mt-4 font-mono text-sm text-muted"
                    >
                        {posts.length} guides · {topics.length} topics · 1
                        learning path
                    </StaggerReveal.Item>
                </StaggerReveal>

                <PageEnter.Fade>
                    <ArticleBrowse />
                </PageEnter.Fade>

                <PageEnter.Fade>
                    <section
                        aria-labelledby="react-internals-heading"
                        className="mt-12"
                    >
                        <p className="font-mono text-sm text-accent">
                            Learning path
                        </p>
                        <h2
                            className="mt-2 scroll-mt-8 text-[1.35rem] font-semibold leading-tight tracking-tight text-foreground-strong"
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
                        <ArticleList
                            ordered
                            posts={seriesPosts}
                            shouldReduceMotion={shouldReduceMotion}
                        />
                    </section>
                </PageEnter.Fade>

                {topics.map((topic) => (
                    <PageEnter.Fade key={topic.id}>
                        <section
                            aria-labelledby={`${topic.id}-heading`}
                            className="mt-12"
                        >
                            <h2
                                className="scroll-mt-8 text-[1.35rem] font-semibold leading-tight tracking-tight text-foreground-strong"
                                id={`${topic.id}-heading`}
                            >
                                {topic.title}
                            </h2>
                            <p className="mt-2 text-foreground">
                                {topic.description}
                            </p>
                            <p className="mt-3 font-mono text-sm text-muted">
                                {topic.posts.length} guides · newest first
                            </p>
                            <ArticleList
                                posts={topic.posts}
                                shouldReduceMotion={shouldReduceMotion}
                            />
                        </section>
                    </PageEnter.Fade>
                ))}
            </PageEnter>
        </main>
    );
}

function ArticleBrowse() {
    return (
        <nav aria-labelledby="browse-writing-heading" className="mt-10">
            <h2
                className="text-sm font-semibold text-foreground-strong"
                id="browse-writing-heading"
            >
                Browse
            </h2>
            <ul className="mt-3 border-y border-divider">
                <li className="border-b border-divider">
                    <a
                        className="group flex min-h-11 items-center justify-between gap-4 py-2.5"
                        href="#react-internals-heading"
                    >
                        <span className="min-w-0 font-semibold leading-snug text-foreground-strong group-hover:text-accent">
                            {series.title}
                        </span>
                        <span className="shrink-0 font-mono text-sm text-muted">
                            Path · {seriesPosts.length}
                        </span>
                    </a>
                </li>
                {topics.map((topic) => (
                    <li
                        className="border-b border-divider last:border-b-0"
                        key={topic.id}
                    >
                        <a
                            className="group flex min-h-11 items-center justify-between gap-4 py-2.5"
                            href={`#${topic.id}-heading`}
                        >
                            <span className="min-w-0 font-semibold leading-snug text-foreground-strong group-hover:text-accent">
                                {topic.title}
                            </span>
                            <span className="shrink-0 font-mono text-sm text-muted">
                                {topic.posts.length} guides
                            </span>
                        </a>
                    </li>
                ))}
            </ul>
        </nav>
    );
}

type ArticleListProps = Readonly<{
    ordered?: boolean;
    posts: ReadonlyArray<PostSummary>;
    shouldReduceMotion: boolean | null;
}>;

function ArticleList({
    ordered = false,
    posts: postList,
    shouldReduceMotion,
}: ArticleListProps) {
    return (
        <ol className="mt-6 border-t border-divider">
            {postList.map((post) => (
                <Reveal
                    as="li"
                    className="border-b border-divider"
                    key={post.slug}
                >
                    <Link
                        className="group block py-4"
                        to="/articles/$slug"
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
