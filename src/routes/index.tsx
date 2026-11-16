import { Link, createFileRoute } from "@tanstack/react-router";
import { SectionHeading } from "../components/SectionHeading";
import { StaggerReveal } from "../components/StaggerReveal";
import { homeStructuredData } from "../lib/agent-readiness";
import { authoredPosts } from "../lib/content";
import { resumeExperience } from "../lib/resume";
import { absoluteUrl, site } from "../lib/site";
import { stackGroups } from "../lib/stack";

const homeTitle = `${site.name} - Software Engineer`;
const homeUrl = absoluteUrl();
const homeImage = absoluteUrl("/og.png");
const homeIntro =
    "I'm a software engineer. I specialize in backend work, and I ship full-stack applications when that's what the work needs.";

const latestPosts = authoredPosts.slice(0, 6);
const sectionClassName = "mt-16 sm:mt-32";
const listClassName = "mt-4 -mb-3 flex flex-col gap-1";

export const Route = createFileRoute("/")({
    head: () => ({
        meta: [
            { title: homeTitle },
            { name: "description", content: site.description },
            { property: "og:title", content: homeTitle },
            { property: "og:description", content: site.description },
            { property: "og:type", content: "website" },
            { property: "og:url", content: homeUrl },
            { property: "og:image", content: homeImage },
            { name: "twitter:card", content: "summary_large_image" },
            { name: "twitter:title", content: homeTitle },
            { name: "twitter:description", content: site.description },
            { name: "twitter:image", content: homeImage },
        ],
        links: [{ rel: "canonical", href: homeUrl }],
        scripts: [
            {
                type: "application/ld+json",
                children: JSON.stringify(homeStructuredData),
            },
        ],
    }),
    component: HomePage,
});

function HomePage() {
    return (
        <StaggerReveal
            as="main"
            className="mx-auto w-full max-w-2xl px-5 pb-12 pt-16 sm:pt-32"
            id="main-content"
        >
            <header>
                <StaggerReveal.Headline
                    as="h1"
                    className="text-pretty leading-relaxed text-foreground-strong"
                >
                    {homeIntro}
                </StaggerReveal.Headline>
                <StaggerReveal.Item
                    as="p"
                    className="mt-4 text-pretty leading-relaxed text-muted"
                >
                    Mostly I like shipping software and learning things I
                    don't know yet. I learned backend on demand, with deadlines
                    and no roadmap, and I write{" "}
                    <Link className="text-link" to="/articles">
                        guides
                    </Link>{" "}
                    to find out how much I had wrong.
                </StaggerReveal.Item>
                <StaggerReveal.Item
                    as="p"
                    className="mt-4 text-pretty leading-relaxed text-muted"
                >
                    Want to work together?{" "}
                    <a className="text-link" href={`mailto:${site.email}`}>
                        Send an email
                    </a>{" "}
                    or find me on{" "}
                    <a
                        className="text-link"
                        href={site.socials.github}
                        rel="noreferrer"
                        target="_blank"
                    >
                        GitHub
                    </a>{" "}
                    and{" "}
                    <a
                        className="text-link"
                        href={site.socials.linkedin}
                        rel="noreferrer"
                        target="_blank"
                    >
                        LinkedIn
                    </a>
                    .
                </StaggerReveal.Item>
            </header>

            <section aria-labelledby="work-heading" className={sectionClassName}>
                <StaggerReveal.Item>
                    <SectionHeading id="work-heading">Work</SectionHeading>
                </StaggerReveal.Item>
                <ul className={listClassName}>
                    {resumeExperience.map((experience) => (
                        <StaggerReveal.Item as="li" key={experience.company}>
                            <Link className="hover-row" to="/resume">
                                <span className="flex items-baseline justify-between gap-4">
                                    <span className="min-w-0 text-foreground-strong">
                                        {experience.company}
                                    </span>
                                    <span className="hidden shrink-0 text-sm tabular-nums text-muted sm:inline">
                                        {experience.dates}
                                    </span>
                                </span>
                                <span className="block text-muted">
                                    {experience.role}
                                </span>
                            </Link>
                        </StaggerReveal.Item>
                    ))}
                </ul>
            </section>

            <section
                aria-labelledby="writing-heading"
                className={sectionClassName}
            >
                <StaggerReveal.Item>
                    <SectionHeading id="writing-heading">Writing</SectionHeading>
                </StaggerReveal.Item>
                <ul className={listClassName}>
                    {latestPosts.map((post) => (
                        <StaggerReveal.Item as="li" key={post.slug}>
                            <Link
                                className="hover-row"
                                params={{ slug: post.slug }}
                                to="/articles/$slug"
                            >
                                <span className="block text-foreground-strong">
                                    {post.title}
                                </span>
                                <span className="block text-muted">
                                    {post.description}
                                </span>
                            </Link>
                        </StaggerReveal.Item>
                    ))}
                    <StaggerReveal.Item as="li">
                        <Link className="hover-row" to="/articles">
                            <span className="block text-foreground-strong">
                                All {authoredPosts.length} guides
                            </span>
                            <span className="block text-muted">
                                JavaScript, runtimes, and React internals.
                            </span>
                        </Link>
                    </StaggerReveal.Item>
                </ul>
            </section>

            <section aria-labelledby="stack-heading" className={sectionClassName}>
                <StaggerReveal.Item>
                    <SectionHeading id="stack-heading">Stack</SectionHeading>
                </StaggerReveal.Item>
                <StaggerReveal.Item>
                    <dl className="mt-4 divide-y divide-divider border-y border-divider">
                        {stackGroups.map((group) => (
                            <div
                                className="flex flex-col gap-0.5 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
                                key={group.label}
                            >
                                <dt className="shrink-0 text-foreground-strong">
                                    {group.label}
                                </dt>
                                <dd className="text-muted sm:text-right">
                                    {group.items
                                        .map((item) => item.name)
                                        .join(", ")}
                                </dd>
                            </div>
                        ))}
                    </dl>
                </StaggerReveal.Item>
            </section>
        </StaggerReveal>
    );
}
