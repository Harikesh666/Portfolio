import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowDownIcon, ArrowUpIcon } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { PageEnter } from "../components/PageEnter";
import { Reveal } from "../components/Reveal";
import { posts } from "../lib/content";
import { snappySpring } from "../lib/motion";
import { resumeExperience, type ResumeExperience } from "../lib/resume";
import { absoluteUrl, site } from "../lib/site";

const homeTitle = `${site.name} - Software Developer`;
const homeUrl = absoluteUrl();
const homeImage = absoluteUrl("/og.png");

const skills = [
    {
        name: "TypeScript",
        color: "#3178C6",
        icon: "/icons/skills/typescript.svg",
    },
    {
        name: "JavaScript",
        color: "#F7DF1E",
        icon: "/icons/skills/javascript.svg",
    },
    { name: "React", color: "#61DAFB", icon: "/icons/skills/react.svg" },
    {
        name: "TanStack Query",
        color: "#FF4154",
        icon: "/icons/skills/tanstack-black.svg",
    },
    {
        name: "TanStack Start",
        color: "#FF4154",
        icon: "/icons/skills/tanstack-black.svg",
    },
    {
        name: "TanStack Router",
        color: "#FF4154",
        icon: "/icons/skills/tanstack-black.svg",
    },
    { name: "Node.js", color: "#5FA04E", icon: "/icons/skills/nodedotjs.svg" },
    {
        name: "Express",
        color: "currentColor",
        icon: "/icons/skills/express.svg",
    },
    { name: "Python", color: "#3776AB", icon: "/icons/skills/python.svg" },
    {
        name: "PostgreSQL",
        color: "#4169E1",
        icon: "/icons/skills/postgresql.svg",
    },
    { name: "AWS", color: "#FF9900", icon: "/icons/skills/amazonaws.svg" },
    { name: "Bun", color: "#E76F00", icon: "/icons/skills/bun.svg" },
    {
        name: "Tailwind CSS",
        color: "#06B6D4",
        icon: "/icons/skills/tailwindcss.svg",
    },
] as const;

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
    const shouldReduceMotion = useReducedMotion();

    return (
        <main
            id="main-content"
            className="mx-auto w-full max-w-2xl px-5 pb-12 pt-10"
        >
            <PageEnter.Item>
                <header>
                    <h1 className="sr-only">
                        Harikesh Mishra — Software Developer in Mumbai
                    </h1>
                    <p className="font-medium text-muted">Software Developer, Mumbai</p>
                </header>
            </PageEnter.Item>
            <PageEnter.Item>
                <div>
                    <p className="mt-7 leading-relaxed text-foreground">
                        I work across React, Node.js, FastAPI, and PostgreSQL -
                        shipping reliable product features, finding the bugs
                        that matter, and making complex systems easier to
                        operate.
                    </p>
                    <p className="mt-5 flex flex-wrap items-center gap-x-2 font-mono text-sm text-foreground">
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
                            href="/Harikesh_Mishra_Resume.pdf"
                            target="_blank"
                            rel="noreferrer"
                        >
                            Resume
                        </a>
                    </p>
                </div>
            </PageEnter.Item>
            <PageEnter>
                <PageEnter.Item>
                    <section aria-labelledby="skills-heading" className="mt-14">
                        <h2
                            className="font-mono text-[12px] font-medium uppercase tracking-[0.1em] text-muted"
                            id="skills-heading"
                        >
                            Skills
                        </h2>
                        <ul className="mt-4 flex flex-wrap gap-2" role="list">
                            {skills.map((skill) => (
                                <li
                                    className="inline-flex items-center gap-2 border border-divider px-3 py-2 font-mono text-[11.6px] text-foreground-strong"
                                    key={skill.name}
                                >
                                    <span
                                        aria-hidden="true"
                                        className="size-3.5 shrink-0"
                                        style={{
                                            backgroundColor: skill.color,
                                            maskImage: `url(${skill.icon})`,
                                            maskPosition: "center",
                                            maskRepeat: "no-repeat",
                                            maskSize: "contain",
                                            WebkitMaskImage: `url(${skill.icon})`,
                                            WebkitMaskPosition: "center",
                                            WebkitMaskRepeat: "no-repeat",
                                            WebkitMaskSize: "contain",
                                        }}
                                    />
                                    {skill.name}
                                </li>
                            ))}
                        </ul>
                    </section>
                </PageEnter.Item>

                <PageEnter.Fade>
                    <section id="work" className="mt-14">
                        <h2 className="font-mono text-[12px] font-medium uppercase tracking-[0.1em] text-muted">
                            Work
                        </h2>
                        <div className="mt-4 border-t border-divider">
                            {resumeExperience.map((experience) => (
                                <Reveal
                                    as="article"
                                    className="border-b border-divider py-5"
                                    key={experience.company}
                                >
                                    <WorkExperience experience={experience} />
                                </Reveal>
                            ))}
                        </div>
                    </section>
                </PageEnter.Fade>

                <PageEnter.Fade>
                    <section className="mt-14">
                        <h2 className="font-mono text-[12px] font-medium uppercase tracking-[0.1em] text-muted">
                            Writing
                        </h2>
                        <ol className="mt-4 border-t border-divider">
                            {posts.slice(0, 3).map((post) => (
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
                        <Link
                            className="mt-5 inline-block font-mono text-sm underline decoration-accent underline-offset-4 hover:text-accent"
                            to="/writing"
                        >
                            View all writing →
                        </Link>
                    </section>
                </PageEnter.Fade>
            </PageEnter>
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
                    className="flex w-full flex-col gap-1 text-left sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
                    onClick={() => setIsExpanded((value) => !value)}
                    type="button"
                >
                    <span className="font-semibold text-foreground-strong">
                        {experience.role}, {experience.company}
                    </span>
                    <span className="flex shrink-0 items-center gap-3 font-mono text-sm text-muted">
                        {experience.dates}
                        {isExpanded ? (
                            <ArrowUpIcon
                                aria-hidden="true"
                                className="size-4 text-foreground-strong"
                                weight="bold"
                            />
                        ) : (
                            <ArrowDownIcon
                                aria-hidden="true"
                                className="size-4 text-foreground-strong"
                                weight="bold"
                            />
                        )}
                    </span>
                </button>
            </h3>

            {isExpanded && (
                <div id={detailsId}>
                    {experience.projects?.map((project) => (
                        <section className="mt-5" key={project.name}>
                            <h4 className="text-sm font-semibold text-foreground-strong">
                                {project.name}
                            </h4>
                            <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-foreground marker:text-divider">
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
                        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-foreground marker:text-divider">
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
