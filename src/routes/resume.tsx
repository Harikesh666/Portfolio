import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ArrowUpRightIcon, DownloadSimpleIcon } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import { AvailabilityStatus } from "../components/AvailabilityStatus";
import { PageEnter } from "../components/PageEnter";
import { Reveal } from "../components/Reveal";
import { StaggerReveal } from "../components/StaggerReveal";
import { snappySpring } from "../lib/motion";
import { resumeExperience, type ResumeHighlight } from "../lib/resume";
import { absoluteUrl, site } from "../lib/site";

const resumeTitle = `Resume - ${site.name}`;
const resumeDescription =
    "Harikesh Mishra is a software engineer building production Node.js and TypeScript backends, plus full-stack applications with React, PostgreSQL, and FastAPI.";
const resumeUrl = absoluteUrl("/resume");
const resumeImage = absoluteUrl("/og.png");

/*
 * The four figures a hiring reader should see first, each lifted from a
 * highlight below. Nothing here is a number the resume doesn't already state.
 */
const proofPoints = [
    { value: "6", label: "agentic workflows on one streaming TypeScript API" },
    { value: "130K+", label: "records behind server-side pagination" },
    { value: "~190 ms", label: "typical response time on that data" },
    { value: "5", label: "client organizations, each with its own database" },
] as const;

/** Figures inside a highlight: 130K+, 190 ms, 6.4 KB, ~60%, 35+, 27K. */
const figurePattern = /(~?\d[\d.,]*(?:K\+?|\+|%)?(?:\s(?:KB|ms))?)/;

/** Sets the figures in a highlight in Strong, so a skim lands on the proof. */
function emphasizeFigures(text: string): ReactNode[] {
    return text.split(figurePattern).map((part, index) =>
        index % 2 === 1 ? (
            <strong
                className="font-medium tabular-nums text-foreground-strong"
                // Split positions are fixed for a given string, so the index is stable.
                key={index}
            >
                {part}
            </strong>
        ) : (
            part
        ),
    );
}

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
                    <StaggerReveal.Headline className="text-[1.375rem] font-semibold leading-tight tracking-[-0.02em] text-foreground-strong">
                        Harikesh Mishra
                    </StaggerReveal.Headline>
                    <StaggerReveal.Item as="p" className="mt-2">
                        <AvailabilityStatus />
                    </StaggerReveal.Item>
                    <StaggerReveal.Item
                        as="p"
                        className="mt-2 flex flex-wrap items-center gap-x-2 text-sm text-muted"
                    >
                        <span>Mumbai, IN</span>
                        <span aria-hidden="true">·</span>
                        <a
                            className="hover:text-foreground-strong"
                            href={`tel:${site.phone.replaceAll(" ", "")}`}
                        >
                            {site.phone}
                        </a>
                        <span aria-hidden="true">·</span>
                        <a
                            className="hover:text-foreground-strong"
                            href={`mailto:${site.email}`}
                        >
                            {site.email}
                        </a>
                        <span aria-hidden="true">·</span>
                        <a
                            className="hover:text-foreground-strong"
                            href={site.socials.linkedin}
                            target="_blank"
                            rel="noreferrer"
                        >
                            LinkedIn
                        </a>
                        <span aria-hidden="true">·</span>
                        <a
                            className="hover:text-foreground-strong"
                            href={site.socials.github}
                            target="_blank"
                            rel="noreferrer"
                        >
                            GitHub
                        </a>
                    </StaggerReveal.Item>
                    <StaggerReveal.Item className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-3">
                        <motion.a
                            className="chip-link"
                            href={site.resumePdfPath}
                            download={site.resumePdfDownloadName}
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
                            className="inline-flex items-center gap-1 text-sm text-link"
                            href={site.resumePdfPath}
                            target="_blank"
                            rel="noreferrer"
                        >
                            Open in new tab
                            <ArrowUpRightIcon
                                aria-hidden="true"
                                className="nudge-arrow"
                                data-direction="up-right"
                                size={12}
                            />
                        </a>
                    </StaggerReveal.Item>
                    <StaggerReveal.Item className="mt-10">
                        <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
                        {proofPoints.map((point) => (
                            <div
                                className="flex min-w-0 flex-col gap-1"
                                key={point.label}
                            >
                                <dt className="text-[13px] leading-snug text-muted">
                                    {point.label}
                                </dt>
                                <dd className="order-first text-xl font-semibold tabular-nums tracking-[-0.01em] text-foreground-strong">
                                    {point.value}
                                </dd>
                            </div>
                        ))}
                        </dl>
                    </StaggerReveal.Item>
                </StaggerReveal>

                <Reveal>
                    <ResumeSection title="Summary">
                        <div className="space-y-3 text-foreground">
                            <p>
                                Software engineer focused on Node.js and
                                TypeScript backends, with one year at
                                EduvanceAI shipping production systems.
                            </p>
                            <p>
                                Built a job-based workflow API in Bun,
                                TypeScript, and Express with Server-Sent
                                Events, Zod-validated contracts, and
                                reconnection after dropped streams. Also
                                delivered server-side pagination over 130K+
                                records and database isolation for five client
                                organizations, with Python (FastAPI) and React
                                where the work needed them.
                            </p>
                        </div>
                    </ResumeSection>
                </Reveal>

                <Reveal>
                    <ResumeSection title="Technical Skills">
                        <dl className="space-y-2 text-sm text-foreground">
                            <SkillRow
                                label="Backend"
                                value="Node.js, Express, Bun, REST APIs, Server-Sent Events, Zod, FastAPI, OpenAI API"
                            />
                            <SkillRow
                                label="Languages"
                                value="TypeScript, JavaScript, Python, SQL"
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
                        </dl>
                    </ResumeSection>
                </Reveal>

                <PageEnter.Fade>
                    <ResumeSection title="Experience">
                        <ol className="journey">
                            {resumeExperience.map((experience, roleIndex) => (
                                <Reveal
                                    as="li"
                                    // The first role is the current one.
                                    className={`journey__step${roleIndex === 0 ? " journey__step--current" : ""}`}
                                    key={experience.company}
                                >
                                    <p className="journey__label tabular-nums">
                                        {experience.dates}
                                    </p>
                                    <h3 className="mt-1 font-semibold text-foreground-strong">
                                        {experience.role}, {experience.company}
                                    </h3>
                                    {experience.stack && (
                                        <p className="mt-1 text-[13px] text-muted">
                                            {experience.stack.join(" · ")}
                                        </p>
                                    )}

                                    {experience.projects?.map((project) => (
                                        <section className="mt-5" key={project.name}>
                                            <h4 className="text-sm font-semibold text-foreground-strong">
                                                {project.name}
                                            </h4>
                                            <HighlightList highlights={project.highlights} />
                                        </section>
                                    ))}

                                    {experience.highlights && (
                                        <HighlightList highlights={experience.highlights} />
                                    )}
                                </Reveal>
                            ))}
                        </ol>
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
            <h2 className="text-[15px] font-medium text-foreground-strong">
                {title}
            </h2>
            <div className="mt-4">{children}</div>
        </section>
    );
}

function HighlightList({
    highlights,
}: Readonly<{ highlights: readonly ResumeHighlight[] }>) {
    return (
        <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-foreground marker:text-divider">
            {highlights.map((highlight) => (
                <li key={highlight.content}>
                    {emphasizeFigures(highlight.content)}
                </li>
            ))}
        </ul>
    );
}

function SkillRow({
    label,
    value,
}: Readonly<{ label: string; value: string }>) {
    return (
        <div className="grid gap-1 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-4">
            <dt className="text-muted">{label}</dt>
            <dd>{value}</dd>
        </div>
    );
}
