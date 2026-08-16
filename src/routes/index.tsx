import { Link, createFileRoute } from "@tanstack/react-router";
import { CaretDownIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { StaggerReveal } from "../components/StaggerReveal";
import { authoredPosts } from "../lib/content";
import { workDisclosureTransition } from "../lib/motion";
import { resumeExperience, type ResumeExperience } from "../lib/resume";
import { absoluteUrl, site } from "../lib/site";

const homeTitle = `${site.name} - Software Developer`;
const homeUrl = absoluteUrl();
const homeImage = absoluteUrl("/og.png");
const homeIntro =
    "I'm a software engineer. I like backend work most, and I ship full stack applications when that is what the work needs.";

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
                children: JSON.stringify({
                    "@context": "https://schema.org",
                    "@graph": [
                        {
                            "@type": "WebSite",
                            "@id": `${absoluteUrl()}#website`,
                            url: absoluteUrl(),
                            name: site.name,
                        },
                        {
                            "@type": "Person",
                            "@id": `${absoluteUrl()}#person`,
                            name: site.name,
                            url: absoluteUrl(),
                            jobTitle: "Software Developer",
                            sameAs: [
                                site.socials.github,
                                site.socials.linkedin,
                            ],
                        },
                    ],
                }),
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
                <StaggerReveal.Item
                    as="p"
                    className="font-mono text-[13px] font-medium tracking-[-0.005em] text-muted"
                >
                    Software Developer, Mumbai
                </StaggerReveal.Item>
                <h1 className="sr-only">
                    Harikesh Mishra, Software Developer in Mumbai
                </h1>
                <StaggerReveal.Headline
                    as="p"
                    className="mt-7 text-pretty leading-relaxed text-foreground"
                >
                    {homeIntro}
                </StaggerReveal.Headline>
                <StaggerReveal.Item
                    as="p"
                    className="mt-5 flex flex-wrap items-center gap-x-2 font-mono text-sm text-foreground"
                >
                    <a
                        className="underline decoration-accent underline-offset-4 hover:text-accent"
                        href={`mailto:${site.email}`}
                    >
                        Email
                    </a>
                    <span aria-hidden="true">·</span>
                    <a
                        className="underline decoration-accent underline-offset-4 hover:text-accent"
                        href={site.socials.github}
                        target="_blank"
                        rel="noreferrer"
                    >
                        GitHub
                    </a>
                    <span aria-hidden="true">·</span>
                    <a
                        className="underline decoration-accent underline-offset-4 hover:text-accent"
                        href={site.socials.linkedin}
                        target="_blank"
                        rel="noreferrer"
                    >
                        LinkedIn
                    </a>
                    <span aria-hidden="true">·</span>
                    <a
                        className="underline decoration-accent underline-offset-4 hover:text-accent"
                        href={site.resumePdfPath}
                        target="_blank"
                        rel="noreferrer"
                    >
                        Resume
                    </a>
                </StaggerReveal.Item>
            </StaggerReveal>
            <section aria-labelledby="about-heading" className="mt-14">
                <h2
                    className="font-mono text-[12px] font-medium uppercase tracking-widest text-muted"
                    id="about-heading"
                >
                    About
                </h2>
                <div className="mt-4 space-y-4 text-foreground">
                    <p>
                        Mostly I like shipping software and learning things I
                        don't know yet. A course or a tutorial can teach you,
                        but curiosity takes you further, into the parts nobody
                        wrote down.
                    </p>
                    <p>
                        That is most of why the writing on this site exists. I
                        work something out, then I write it down properly, and
                        the writing is usually where I find out how much I had
                        wrong.
                    </p>
                    <p>
                        I don't know everything, and I have stopped pretending
                        otherwise. Software engineering has a way of correcting
                        you quickly, and of keeping you humble. I have come to
                        think that is the best thing about it.
                    </p>
                    <p>
                        I'm fascinated by the work of Matteo Collina, DHH, and
                        Mitchell Hashimoto. A line of Hashimoto's I keep
                        coming back to: the pursuit
                        of excellence does not need justification. I am not
                        close to their level and I know it, but having people
                        to look up to, and something to dream about, does not
                        seem like a bad thing in a mundane world.
                    </p>
                </div>
            </section>

            <section id="work" className="mt-14">
                <h2 className="font-mono text-[12px] font-medium uppercase tracking-widest text-muted">
                    Work
                </h2>
                <div className="mt-4 border-t border-divider">
                    {resumeExperience.map((experience) => (
                        <article
                            className="border-b border-divider py-5"
                            key={experience.company}
                        >
                            <WorkExperience experience={experience} />
                        </article>
                    ))}
                </div>
            </section>

            <section className="mt-14">
                <h2 className="font-mono text-[12px] font-medium uppercase tracking-widest text-muted">
                    Articles
                </h2>
                <ol className="mt-4 border-t border-divider">
                    {authoredPosts.slice(0, 3).map((post) => (
                        <li
                            className="border-b border-divider"
                            key={post.slug}
                        >
                            <Link
                                className="group block py-5"
                                to="/articles/$slug"
                                params={{ slug: post.slug }}
                            >
                                <span className="font-mono text-sm text-accent">
                                    {post.category}
                                </span>
                                <span className="mt-1 block text-[17px] font-semibold leading-snug text-foreground-strong group-hover:text-accent">
                                    {post.title}
                                </span>
                                <span className="mt-1 block text-sm text-muted">
                                    {post.description}
                                </span>
                                <span className="mt-2 block text-sm text-muted">
                                    {post.date} · {post.readTime}
                                </span>
                            </Link>
                        </li>
                    ))}
                </ol>
                <Link
                    className="mt-5 inline-block font-mono text-sm underline decoration-accent underline-offset-4 hover:text-accent"
                    to="/articles"
                >
                    View all articles →
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
                    className="group flex w-full flex-col gap-1 text-left sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
                    onClick={() => setIsExpanded((value) => !value)}
                    type="button"
                >
                    <span className="font-semibold text-foreground-strong">
                        {experience.role}, {experience.company}
                    </span>
                    <span className="flex w-full items-center justify-between gap-2.5 font-mono text-sm text-muted sm:w-auto sm:shrink-0 sm:justify-start">
                        {experience.dates}
                        <CaretDownIcon
                            aria-hidden="true"
                            className={`size-3.5 text-muted group-hover:text-foreground-strong ${
                                isExpanded ? "rotate-180" : "rotate-0"
                            }`}
                            style={{ transition: workDisclosureTransition }}
                        />
                    </span>
                </button>
            </h3>

            {experience.outcome && (
                <p className="mt-2 text-sm text-foreground">
                    {experience.outcome}
                </p>
            )}

            {experience.stack && (
                <p className="mt-2 font-mono text-[12px] text-muted">
                    {experience.stack.join(" · ")}
                </p>
            )}

            {isExpanded && (
                <div
                    className="mt-4 border-l border-divider pl-4"
                    id={detailsId}
                >
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
