import { Link, createFileRoute } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import { PageEnter } from "../../components/PageEnter";
import { Reveal } from "../../components/Reveal";
import { StaggerReveal } from "../../components/StaggerReveal";
import { posts, seriesIndex } from "../../lib/content";
import { snappySpring } from "../../lib/motion";
import { absoluteUrl, site } from "../../lib/site";

const writingDescription =
    "A long-form React guide series about the mental models behind modern React applications.";
const writingTitle = `Writing - ${site.name}`;
const writingUrl = absoluteUrl("/writing");
const writingImage = absoluteUrl("/og.png");

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

    return (
        <main
            id="main-content"
            className="mx-auto w-full max-w-2xl px-5 pb-12 pt-10"
        >
            <PageEnter>
                <StaggerReveal as="header">
                    <StaggerReveal.Headline className="text-[1.75rem] font-semibold leading-[1.15] tracking-tight text-foreground-strong sm:text-[2rem]">
                        {series.title}
                    </StaggerReveal.Headline>
                    <StaggerReveal.Item as="p" className="mt-3 text-foreground">
                        {series.description}
                    </StaggerReveal.Item>
                    <StaggerReveal.Item
                        as="p"
                        className="mt-4 font-mono text-sm text-muted"
                    >
                        {seriesPosts.length} guides · about {series.readingTime}{" "}
                        · updated {series.updatedAt}
                    </StaggerReveal.Item>
                </StaggerReveal>

                <PageEnter.Fade>
                    <ol className="mt-10 border-t border-divider">
                        {seriesPosts.map((post) => (
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
                                            shouldReduceMotion
                                                ? undefined
                                                : { x: 2 }
                                        }
                                        transition={snappySpring}
                                    >
                                        <span className="font-mono text-sm text-accent">
                                            {String(post.order).padStart(
                                                2,
                                                "0",
                                            )}
                                        </span>
                                        <span className="mt-1 block text-[17px] font-semibold leading-snug text-foreground-strong group-hover:text-accent">
                                            {post.title}
                                        </span>
                                        <span className="mt-1 block text-sm text-muted">
                                            {post.description}
                                        </span>
                                        <span className="mt-2 block text-sm text-muted">
                                            {post.readTime}
                                        </span>
                                    </motion.div>
                                </Link>
                            </Reveal>
                        ))}
                    </ol>
                </PageEnter.Fade>

                {standalonePosts.length > 0 && (
                    <PageEnter.Fade>
                        <section className="mt-14">
                            <h2 className="font-mono text-[12px] font-medium uppercase tracking-widest text-muted">
                                Standalone
                            </h2>
                            <ol className="mt-4 border-t border-divider">
                                {standalonePosts.map((post) => (
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
                                                    shouldReduceMotion
                                                        ? undefined
                                                        : { x: 2 }
                                                }
                                                transition={snappySpring}
                                            >
                                                <span className="block text-[17px] font-semibold leading-snug text-foreground-strong group-hover:text-accent">
                                                    {post.title}
                                                </span>
                                                <span className="mt-1 block text-sm text-muted">
                                                    {post.description}
                                                </span>
                                                <span className="mt-2 block text-sm text-muted">
                                                    {post.readTime}
                                                </span>
                                            </motion.div>
                                        </Link>
                                    </Reveal>
                                ))}
                            </ol>
                        </section>
                    </PageEnter.Fade>
                )}
            </PageEnter>
        </main>
    );
}
