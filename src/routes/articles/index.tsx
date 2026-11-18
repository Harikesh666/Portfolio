import { Link, createFileRoute } from "@tanstack/react-router";
import { SectionHeading } from "../../components/SectionHeading";
import { StaggerReveal } from "../../components/StaggerReveal";
import { GuidePreview } from "../../components/guide-previews";
import { PageEnter } from "../../components/PageEnter";
import {
    posts,
    seriesIndex,
    topicIndex,
    type PostSummary,
} from "../../lib/content";
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

const metaClassName = "text-[13px] tabular-nums text-muted";

function ArticlesPage() {
    return (
        <main
            id="main-content"
            className="mx-auto w-full max-w-2xl px-5 pb-12 pt-10"
        >
            <StaggerReveal as="header">
                <StaggerReveal.Headline className="text-[1.375rem] font-semibold leading-tight tracking-[-0.02em] text-foreground-strong">
                    Articles
                </StaggerReveal.Headline>
                <StaggerReveal.Item
                    as="p"
                    className="mt-3 text-pretty leading-relaxed text-foreground"
                >
                    {articlesDescription}
                </StaggerReveal.Item>
                <StaggerReveal.Item as="p" className={`mt-3 ${metaClassName}`}>
                    {posts.length} guides · {topics.length} topics · 1 learning
                    path
                </StaggerReveal.Item>
            </StaggerReveal>

            {/* Everything under the hero fades in as one tree, after the hero's
                stagger, so the list never shows before the intro above it. */}
            <PageEnter.Fade>
                <ArticleBrowse />

                <section
                    aria-labelledby="react-internals-heading"
                    className="mt-16 sm:mt-20"
                >
                    <p className={metaClassName}>Learning path</p>
                    <SectionHeading id="react-internals-heading">
                        {series.title}
                    </SectionHeading>
                    <p className="mt-1 text-pretty text-sm leading-normal text-foreground">
                        {series.description}
                    </p>
                    <p className={`mt-2 ${metaClassName}`}>
                        {seriesPosts.length} guides · about {series.readingTime} ·
                        updated {series.updatedAt}
                    </p>
                    <ArticleList ordered posts={seriesPosts} />
                </section>

                {topics.map((topic) => (
                    <section
                        aria-labelledby={`${topic.id}-heading`}
                        className="mt-16 sm:mt-20"
                        key={topic.id}
                    >
                        <SectionHeading id={`${topic.id}-heading`}>
                            {topic.title}
                        </SectionHeading>
                        <p className="mt-1 text-pretty text-sm leading-normal text-foreground">
                            {topic.description}
                        </p>
                        <p className={`mt-2 ${metaClassName}`}>
                            {topic.posts.length} guides · recommended reading order
                        </p>
                        <ArticleList ordered posts={topic.posts} />
                    </section>
                ))}
            </PageEnter.Fade>
        </main>
    );
}

function ArticleBrowse() {
    const entries = [
        {
            href: "#react-internals-heading",
            title: series.title,
            meta: `Path · ${seriesPosts.length}`,
        },
        ...topics.map((topic) => ({
            href: `#${topic.id}-heading`,
            title: topic.title,
            meta: `${topic.posts.length} guides`,
        })),
    ];

    return (
        <nav aria-labelledby="browse-writing-heading" className="mt-12">
            <SectionHeading id="browse-writing-heading">Browse</SectionHeading>
            <ul className="dim-siblings mt-3">
                {entries.map((entry) => (
                    <li key={entry.href}>
                        <a
                            className="hover-row flex min-h-11 items-center justify-between gap-4 py-2"
                            href={entry.href}
                        >
                            <span className="min-w-0 leading-snug text-foreground-strong">
                                {entry.title}
                            </span>
                            <span className={`shrink-0 ${metaClassName}`}>
                                {entry.meta}
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
}>;

function ArticleList(props: ArticleListProps) {
    const ordered = props.ordered ?? false;
    const postList = props.posts;

    return (
        <ol className="dim-siblings mt-4">
            {postList.map((post) => (
                <li key={post.slug}>
                    <GuidePreview slug={post.slug}>
                    <Link
                        className="hover-row flex gap-3"
                        to="/articles/$slug"
                        params={{ slug: post.slug }}
                    >
                        {ordered && (
                            <span
                                className={`w-5 shrink-0 pt-px ${metaClassName}`}
                            >
                                {String(post.order).padStart(2, "0")}
                            </span>
                        )}
                        <span className="block min-w-0">
                            <span className="block font-medium leading-snug text-foreground-strong">
                                {post.title}
                            </span>
                            <span className="mt-0.5 block text-sm leading-normal text-muted">
                                {post.description}
                            </span>
                            <span className={`mt-1 block ${metaClassName}`}>
                                {post.series
                                    ? post.readTime
                                    : `${post.date} · ${post.readTime}`}
                            </span>
                        </span>
                    </Link>
                    </GuidePreview>
                </li>
            ))}
        </ol>
    );
}
