import { createFileRoute } from "@tanstack/react-router";
import { DownloadSimpleIcon } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import { PageEnter } from "../components/PageEnter";
import { Reveal } from "../components/Reveal";
import { StaggerReveal } from "../components/StaggerReveal";
import { snappySpring } from "../lib/motion";
import { resumeExperience } from "../lib/resume";
import { absoluteUrl, site } from "../lib/site";

const resumeTitle = `Resume - ${site.name}`;
const resumeDescription =
    "Harikesh Mishra is a software developer building production backend and full-stack applications with FastAPI, Node.js, TypeScript, React, and PostgreSQL.";
const resumeUrl = absoluteUrl("/resume");
const resumeImage = absoluteUrl("/og.png");

export const Route = createFileRoute("/resume")({
    head: () => ({
        meta: [
            { title: resumeTitle },
            { name: "description", content: resumeDescription },
            { property: "og:title", content: resumeTitle },
            { property: "og:description", content: resumeDescription },
            { property: "og:type", content: "website" },
            { property: "og:url", content: resumeUrl },
            { property: "og:image", content: resumeImage },
            { name: "twitter:card", content: "summary_large_image" },
            { name: "twitter:title", content: resumeTitle },
            { name: "twitter:description", content: resumeDescription },
            { name: "twitter:image", content: resumeImage },
        ],
        links: [{ rel: "canonical", href: resumeUrl }],
    }),
    component: ResumePage,
});

function ResumePage() {
    const shouldReduceMotion = useReducedMotion();

    return (
        <main
            id="main-content"
            className="mx-auto w-full max-w-2xl px-5 pb-12 pt-10"
        >
            <PageEnter>
                <StaggerReveal as="header">
                    <StaggerReveal.Headline className="text-[1.75rem] font-semibold leading-[1.15] tracking-tight text-foreground-strong sm:text-[2rem]">
                        Harikesh Mishra
                    </StaggerReveal.Headline>
                    <StaggerReveal.Item
                        as="p"
                        className="mt-2 flex flex-wrap items-center gap-x-2 font-mono text-sm text-muted"
                    >
                        <span>Mumbai, IN</span>
                        <span aria-hidden="true">·</span>
                        <a
                            className="hover:text-accent"
                            href={`tel:${site.phone.replaceAll(" ", "")}`}
                        >
                            {site.phone}
                        </a>
                        <span aria-hidden="true">·</span>
                        <a
                            className="hover:text-accent"
                            href={`mailto:${site.email}`}
                        >
                            {site.email}
                        </a>
                        <span aria-hidden="true">·</span>
                        <a
                            className="hover:text-accent"
                            href={site.socials.linkedin}
                            target="_blank"
                            rel="noreferrer"
                        >
                            LinkedIn
                        </a>
                        <span aria-hidden="true">·</span>
                        <a
                            className="hover:text-accent"
                            href={site.socials.github}
                            target="_blank"
                            rel="noreferrer"
                        >
                            GitHub
                        </a>
                    </StaggerReveal.Item>
                    <StaggerReveal.Item className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-3">
                        <motion.a
                            className="inline-flex items-center gap-2 border border-divider px-3 py-2 font-mono text-sm text-foreground-strong hover:border-accent hover:text-accent"
                            href={site.resumePdfPath}
                            download={site.resumePdfPath.slice(1)}
                            whileHover={
                                shouldReduceMotion ? undefined : { y: -1 }
                            }
                            whileTap={
                                shouldReduceMotion ? undefined : { scale: 0.97 }
                            }
                            transition={
                                shouldReduceMotion
                                    ? { duration: 0 }
                                    : snappySpring
                            }
                        >
                            <DownloadSimpleIcon aria-hidden="true" size={16} />
                            Download PDF
                        </motion.a>
                        <a
                            className="font-mono text-sm text-muted underline decoration-accent underline-offset-4 hover:text-accent"
                            href={site.resumePdfPath}
                            target="_blank"
                            rel="noreferrer"
                        >
                            Open in new tab
                        </a>
                    </StaggerReveal.Item>
                </StaggerReveal>

                <Reveal>
                    <ResumeSection title="Summary">
                        <p className="text-foreground">
                            Software developer with over one year of combined
                            professional experience delivering production
                            backend and full-stack applications using FastAPI,
                            Node.js, TypeScript, React, and PostgreSQL. Built
                            data tooling for 130K+ records, multi-tenant systems
                            across five client organizations, and streaming
                            workflow APIs, with experience in production
                            debugging, performance optimization, automated
                            testing, and AWS/GCP deployment.
                        </p>
                    </ResumeSection>
                </Reveal>

                <Reveal>
                    <ResumeSection title="Technical Skills">
                        <dl className="space-y-2 text-sm text-foreground">
                            <SkillRow
                                label="Languages"
                                value="JavaScript, TypeScript, Python, SQL"
                            />
                            <SkillRow
                                label="Backend"
                                value="FastAPI, Node.js, Express, Bun, REST APIs, Server-Sent Events, Zod, OpenAI API"
                            />
                            <SkillRow
                                label="Frontend"
                                value="React, Next.js, TanStack Query, TanStack Start, TanStack Router, TanStack Table, React Hook Form, Tailwind CSS, Vite"
                            />
                            <SkillRow
                                label="Databases"
                                value="PostgreSQL, multi-tenant schema design, query optimization, CTEs, schema migrations"
                            />
                            <SkillRow
                                label="Cloud & DevOps"
                                value="AWS (Lambda, ECR, EC2, S3, Amplify, CloudTrail), GCP Cloud Run, Docker, Vercel, CI/CD"
                            />
                            <SkillRow
                                label="Testing & Practices"
                                value="Vitest, React Testing Library, Mock Service Worker, structured logging, production debugging"
                            />
                        </dl>
                    </ResumeSection>
                </Reveal>

                <PageEnter.Fade>
                    <ResumeSection title="Experience">
                        <div className="border-t border-divider">
                            {resumeExperience.map((experience) => (
                                <Reveal
                                    as="article"
                                    className="border-b border-divider py-5"
                                    key={experience.company}
                                >
                                    <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                                        <h3 className="font-semibold text-foreground-strong">
                                            {experience.role},{" "}
                                            {experience.company}
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
                                                <h4 className="text-sm font-semibold text-foreground-strong">
                                                    {project.name}
                                                </h4>
                                                <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-foreground marker:text-divider">
                                                    {project.highlights.map(
                                                        (highlight) => (
                                                            <li
                                                                key={
                                                                    highlight.content
                                                                }
                                                            >
                                                                {
                                                                    highlight.content
                                                                }
                                                            </li>
                                                        ),
                                                    )}
                                                </ul>
                                            </section>
                                        ))}

                                    {"highlights" in experience &&
                                        experience.highlights && (
                                            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-foreground marker:text-divider">
                                                {experience.highlights.map(
                                                    (highlight) => (
                                                        <li
                                                            key={
                                                                highlight.content
                                                            }
                                                        >
                                                            {highlight.content}
                                                        </li>
                                                    ),
                                                )}
                                            </ul>
                                        )}
                                </Reveal>
                            ))}
                        </div>
                    </ResumeSection>
                </PageEnter.Fade>

                <Reveal>
                    <ResumeSection title="Education">
                        <div className="space-y-4 text-foreground">
                            <p>
                                <span className="font-semibold text-foreground-strong">
                                    M.Sc. Information Technology
                                </span>{" "}
                                · Sathaye College · 2022 to 2024
                            </p>
                            <p>
                                <span className="font-semibold text-foreground-strong">
                                    B.Sc. Information Technology
                                </span>{" "}
                                · Raheja College of Arts and Commerce ·
                                2019 to 2022
                            </p>
                        </div>
                    </ResumeSection>
                </Reveal>
            </PageEnter>
        </main>
    );
}

function ResumeSection({
    children,
    title,
}: Readonly<{
    children: React.ReactNode;
    title: string;
}>) {
    return (
        <section className="mt-14">
            <h2 className="font-mono text-[12px] font-medium uppercase tracking-widest text-muted">
                {title}
            </h2>
            <div className="mt-4">{children}</div>
        </section>
    );
}

function SkillRow({
    label,
    value,
}: Readonly<{ label: string; value: string }>) {
    return (
        <div className="grid gap-1 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-4">
            <dt className="font-semibold text-foreground-strong">{label}:</dt>
            <dd>{value}</dd>
        </div>
    );
}
