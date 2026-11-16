import { Link, createFileRoute } from "@tanstack/react-router";
import {
    ArrowUpRightIcon,
    CaretDownIcon,
    EnvelopeSimpleIcon,
    FileTextIcon,
    GithubLogoIcon,
    LinkedinLogoIcon,
} from "@phosphor-icons/react";
import { useState } from "react";
import { ContributionGraph } from "../components/ContributionGraph";
import { SectionHeading } from "../components/SectionHeading";
import { StaggerReveal } from "../components/StaggerReveal";
import { homeStructuredData } from "../lib/agent-readiness";
import { authoredPosts } from "../lib/content";
import { workDisclosureTransition } from "../lib/motion";
import { resumeExperience, type ResumeExperience } from "../lib/resume";
import { absoluteUrl, site } from "../lib/site";
import { stackGroups } from "../lib/stack";

const homeTitle = `${site.name} - Software Engineer`;
const homeUrl = absoluteUrl();
const homeImage = absoluteUrl("/og.png");
const homeIntro =
    "I'm a software engineer. I specialize in backend work, and I ship full-stack applications when that's what the work needs.";

/** Guides with a hand-drawn diagram, shown as image tiles above the list. */
const featuredGuides = [
    {
        slug: "how-javascript-keeps-track-of-running-code",
        image: "/diagrams/execution-context.png",
        width: 1273,
        height: 629,
    },
    {
        slug: "asynchronous-javascript-event-loop",
        image: "/diagrams/event-loop-timer-ready.png",
        width: 2008,
        height: 1003,
    },
] as const;

const featuredPosts = featuredGuides.flatMap((guide) => {
    const post = authoredPosts.find((entry) => entry.slug === guide.slug);
    return post ? [{ ...guide, post }] : [];
});
const latestPosts = authoredPosts
    .filter((post) => !featuredPosts.some((entry) => entry.slug === post.slug))
    .slice(0, 4);

const sectionClassName = "mt-16 sm:mt-24";

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
        <main
            id="main-content"
            className="mx-auto w-full max-w-2xl px-5 pb-12 pt-10"
        >
            <StaggerReveal as="header">
                <StaggerReveal.Headline
                    as="h1"
                    className="text-pretty text-[17px] leading-relaxed text-foreground-strong"
                >
                    {homeIntro}
                </StaggerReveal.Headline>
                <StaggerReveal.Item
                    as="p"
                    className="mt-4 text-pretty leading-relaxed text-foreground"
                >
                    Mostly I like shipping software and learning things I
                    don't know yet. I learned backend on demand, with deadlines
                    and no roadmap, and I write{" "}
                    <Link className="text-link" to="/articles">
                        guides
                    </Link>{" "}
                    to find out how much I had wrong.{" "}
                    <Link className="text-link" to="/about">
                        More about me
                    </Link>
                    .
                </StaggerReveal.Item>
                <StaggerReveal.Item
                    as="div"
                    className="mt-6 flex flex-wrap items-center gap-2"
                >
                    <a className="chip-link" href={`mailto:${site.email}`}>
                        <EnvelopeSimpleIcon aria-hidden="true" size={15} />
                        Email me
                    </a>
                    <a
                        className="chip-link"
                        href={site.socials.github}
                        rel="noreferrer"
                        target="_blank"
                    >
                        <GithubLogoIcon aria-hidden="true" size={15} />
                        GitHub
                    </a>
                    <a
                        className="chip-link"
                        href={site.socials.linkedin}
                        rel="noreferrer"
                        target="_blank"
                    >
                        <LinkedinLogoIcon aria-hidden="true" size={15} />
                        LinkedIn
                    </a>
                    <a
                        className="chip-link"
                        href={site.resumePdfPath}
                        rel="noreferrer"
                        target="_blank"
                    >
                        <FileTextIcon aria-hidden="true" size={15} />
                        Resume
                    </a>
                </StaggerReveal.Item>
            </StaggerReveal>

            <section
                aria-labelledby="writing-heading"
                className={sectionClassName}
            >
                <SectionHeading id="writing-heading">Writing</SectionHeading>
                <ul
                    className="mt-5 grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2"
                    role="list"
                >
                    {featuredPosts.map(({ height, image, post, width }) => (
                        <li className="min-w-0" key={post.slug}>
                            <Link
                                className="group block rounded-xl"
                                params={{ slug: post.slug }}
                                to="/articles/$slug"
                            >
                                <span className="block overflow-hidden rounded-xl border border-divider bg-white p-4">
                                    <img
                                        alt=""
                                        className="tile-image aspect-[16/10] w-full object-contain"
                                        decoding="async"
                                        height={height}
                                        loading="lazy"
                                        src={image}
                                        width={width}
                                    />
                                </span>
                                <span className="mt-3 block font-medium leading-snug text-foreground-strong">
                                    {post.title}
                                </span>
                                <span className="mt-1 block text-sm leading-normal text-muted">
                                    {post.description}
                                </span>
                            </Link>
                        </li>
                    ))}
                </ul>
                <ol className="mt-6">
                    {latestPosts.map((post) => (
                        <li key={post.slug}>
                            <Link
                                className="hover-row"
                                params={{ slug: post.slug }}
                                to="/articles/$slug"
                            >
                                <span className="flex items-baseline justify-between gap-4">
                                    <span className="min-w-0 font-medium leading-snug text-foreground-strong">
                                        {post.title}
                                    </span>
                                    <span className="hidden shrink-0 text-[13px] tabular-nums text-muted sm:inline">
                                        {post.readTime}
                                    </span>
                                </span>
                                <span className="mt-0.5 block text-sm leading-normal text-muted">
                                    {post.description}
                                </span>
                            </Link>
                        </li>
                    ))}
                </ol>
                <Link className="chip-link mt-6" to="/articles">
                    All {authoredPosts.length} guides
                    <ArrowUpRightIcon aria-hidden="true" size={13} />
                </Link>
            </section>

            <section
                aria-labelledby="work-heading"
                className={sectionClassName}
                id="work"
            >
                <SectionHeading id="work-heading">Work</SectionHeading>
                <div className="mt-4">
                    {resumeExperience.map((experience) => (
                        <article key={experience.company}>
                            <WorkExperience experience={experience} />
                        </article>
                    ))}
                </div>
            </section>

            <section
                aria-labelledby="activity-heading"
                className={sectionClassName}
            >
                <SectionHeading id="activity-heading">
                    GitHub activity
                </SectionHeading>
                <div className="mt-5">
                    <ContributionGraph />
                </div>
            </section>

            <section
                aria-labelledby="stack-heading"
                className={sectionClassName}
            >
                <SectionHeading id="stack-heading">Stack</SectionHeading>
                <div className="stack-groups mt-5 space-y-5">
                    {stackGroups.map((group) => (
                        <div key={group.label}>
                            <p className="flex items-center gap-3">
                                <span className="shrink-0 text-[13px] text-muted">
                                    {group.label}
                                </span>
                                <span
                                    aria-hidden="true"
                                    className="stack-rule"
                                />
                            </p>
                            <ul
                                className="mt-3 flex flex-wrap gap-2"
                                role="list"
                            >
                                {group.items.map((item) => (
                                    <li
                                        className="stack-item"
                                        key={item.name}
                                        style={
                                            {
                                                "--stack-color": item.color,
                                            } as React.CSSProperties
                                        }
                                    >
                                        {item.icon && (
                                            <span
                                                aria-hidden="true"
                                                className="stack-item__icon"
                                                style={{
                                                    maskImage: `url(${item.icon})`,
                                                    WebkitMaskImage: `url(${item.icon})`,
                                                }}
                                            />
                                        )}
                                        {item.name}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
                <Link className="chip-link mt-6" to="/resume">
                    What I built with it
                    <ArrowUpRightIcon aria-hidden="true" size={13} />
                </Link>
            </section>
        </main>
    );
}

function WorkExperience({
    experience,
}: Readonly<{ experience: ResumeExperience }>) {
    const [isExpanded, setIsExpanded] = useState(false);
    const detailsId = `work-details-${experience.company
        .toLowerCase()
        .replaceAll(" ", "-")}`;

    return (
        <>
            <h3>
                <button
                    aria-controls={detailsId}
                    aria-expanded={isExpanded}
                    className="hover-row group w-[calc(100%+1.5rem)] text-left"
                    onClick={() => setIsExpanded((value) => !value)}
                    type="button"
                >
                    <span className="flex items-baseline justify-between gap-4">
                        <span className="min-w-0 font-medium leading-snug text-foreground-strong">
                            {experience.company}
                        </span>
                        <span className="flex shrink-0 items-center gap-2 text-[13px] tabular-nums text-muted">
                            {experience.dates}
                            <CaretDownIcon
                                aria-hidden="true"
                                className={`size-3.5 text-muted group-hover:text-foreground-strong ${
                                    isExpanded ? "rotate-180" : "rotate-0"
                                }`}
                                style={{ transition: workDisclosureTransition }}
                            />
                        </span>
                    </span>
                    <span className="mt-0.5 block text-sm font-normal text-muted">
                        {experience.role}
                    </span>
                    {experience.outcome && (
                        <span className="mt-2 block text-sm font-normal leading-normal text-foreground">
                            {experience.outcome}
                        </span>
                    )}
                </button>
            </h3>

            {isExpanded && (
                <div
                    className="mb-4 mt-2 border-l border-divider pl-4"
                    id={detailsId}
                >
                    {experience.stack && (
                        <p className="mb-4 text-[13px] text-muted">
                            {experience.stack.join(" · ")}
                        </p>
                    )}
                    {experience.projects?.map((project, index) => (
                        <section
                            className={index === 0 ? "" : "mt-5"}
                            key={project.name}
                        >
                            <h4 className="text-[13px] font-semibold text-foreground-strong">
                                {project.name}
                            </h4>
                            <ul className="mt-2 list-disc space-y-2 pl-4 text-sm text-foreground marker:text-divider">
                                {project.highlights
                                    .filter(
                                        (highlight) => !highlight.resumeOnly,
                                    )
                                    .map((highlight) => (
                                        <li key={highlight.content}>
                                            {highlight.content}
                                        </li>
                                    ))}
                            </ul>
                        </section>
                    ))}

                    {experience.highlights && (
                        <ul className="list-disc space-y-2 pl-4 text-sm text-foreground marker:text-divider">
                            {experience.highlights.map((highlight) => (
                                <li key={highlight.content}>
                                    {highlight.content}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </>
    );
}
