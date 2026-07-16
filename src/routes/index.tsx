import { Link, createFileRoute } from "@tanstack/react-router";
import { posts } from "../lib/content";
import { resumeExperience } from "../lib/resume";
import { absoluteUrl, site } from "../lib/site";

const homeTitle = `${site.name} - Software developer`;
const homeUrl = absoluteUrl();
const homeImage = absoluteUrl("/og.png");

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
                            jobTitle: "Software developer",
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
            <section className="rise-in">
                <h1 className="text-[1.75rem] font-bold leading-normal tracking-[-0.02em] text-foreground-strong sm:text-[2rem]">
                    Harikesh Mishra
                </h1>
                <p className="mt-1 text-muted">Software developer, Mumbai</p>
                <p className="mt-7 text-foreground">
                    I work across React, Node.js, FastAPI, and PostgreSQL -
                    shipping reliable product features, finding the bugs that
                    matter, and making complex systems easier to operate.
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
            </section>

            <div>
                <section id="work" className="mt-14">
                    <h2 className="font-mono text-[12px] uppercase tracking-[0.08em] text-muted">
                        Work
                    </h2>
                    <div className="mt-4 border-t border-divider">
                        {resumeExperience.map((experience, experienceIndex) => (
                            <article
                                className="list-enter border-b border-divider py-5"
                                key={experience.company}
                                style={{
                                    animationDelay: `${Math.min(experienceIndex * 40, 240)}ms`,
                                }}
                            >
                                <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                                    <h3 className="font-bold text-foreground-strong">
                                        {experience.role}, {experience.company}
                                    </h3>
                                    <p className="shrink-0 font-mono text-sm text-muted">
                                        {experience.dates}
                                    </p>
                                </div>

                                {"projects" in experience &&
                                    experience.projects?.map((project) => (
                                        <section
                                            className="mt-5"
                                            key={project.name}
                                        >
                                            <h4 className="text-sm font-bold text-foreground-strong">
                                                {project.name}
                                            </h4>
                                            <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-foreground marker:text-divider">
                                                {project.highlights
                                                    .filter(
                                                        (highlight) =>
                                                            !highlight.resumeOnly,
                                                    )
                                                    .map((highlight) => (
                                                        <li
                                                            key={
                                                                highlight.content
                                                            }
                                                        >
                                                            {highlight.content}
                                                        </li>
                                                    ))}
                                            </ul>
                                        </section>
                                    ))}

                                {"highlights" in experience &&
                                    experience.highlights && (
                                        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-foreground marker:text-divider">
                                            {experience.highlights.map(
                                                (highlight) => (
                                                    <li key={highlight.content}>
                                                        {highlight.content}
                                                    </li>
                                                ),
                                            )}
                                        </ul>
                                    )}
                            </article>
                        ))}
                    </div>
                </section>

                <section className="mt-14">
                    <h2 className="font-mono text-[12px] uppercase tracking-[0.08em] text-muted">
                        Writing
                    </h2>
                    <ol className="mt-4 border-t border-divider">
                        {posts.map((post, index) => (
                            <li
                                className="list-enter border-b border-divider"
                                key={post.slug}
                                style={{
                                    animationDelay: `${Math.min(index * 40, 240)}ms`,
                                }}
                            >
                                <Link
                                    className="group block py-5"
                                    to="/writing/$slug"
                                    params={{ slug: post.slug }}
                                >
                                    <span className="font-mono text-sm text-accent">
                                        {String(post.order).padStart(2, "0")}
                                    </span>
                                    <span className="mt-1 block text-[17px] font-bold text-foreground-strong group-hover:text-accent">
                                        {post.title}
                                    </span>
                                    <span className="mt-1 block text-sm text-muted">
                                        {post.description}
                                    </span>
                                    <span className="mt-2 block text-sm text-foreground">
                                        {post.readTime}
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </ol>
                    <Link
                        className="mt-5 inline-block font-mono text-sm underline decoration-accent underline-offset-4 hover:text-accent"
                        to="/writing"
                    >
                        View all writing →
                    </Link>
                </section>
            </div>
        </main>
    );
}
