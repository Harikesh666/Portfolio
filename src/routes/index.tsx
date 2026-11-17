import { Link, createFileRoute } from "@tanstack/react-router";
import {
    ArrowRightIcon,
    BookOpenTextIcon,
    HardDrivesIcon,
    RocketLaunchIcon,
} from "@phosphor-icons/react";
import { AvailabilityStatus } from "../components/AvailabilityStatus";
import { HoverPeek } from "../components/HoverPeek";
import { IntroKeyword } from "../components/IntroKeyword";
import { SketchMark } from "../components/SketchMark";
import { MumbaiPond } from "../components/pond/MumbaiPond";
import { SectionHeading } from "../components/SectionHeading";
import { StaggerReveal } from "../components/StaggerReveal";
import { homeStructuredData } from "../lib/agent-readiness";
import { authoredPosts } from "../lib/content";
import { resumeExperience, type ResumeExperience } from "../lib/resume";
import { absoluteUrl, site } from "../lib/site";
import { stackGroups } from "../lib/stack";

const homeTitle = `${site.name} - Software Engineer`;
const homeUrl = absoluteUrl();
const homeImage = absoluteUrl("/og.png");
const homeIntro =
    "I'm a software engineer. I specialize in backend work, and I ship full-stack applications when that's what the work needs.";

const latestPosts = authoredPosts.slice(0, 6);
const sectionClassName = "mt-16 sm:mt-32";
// dim-siblings: hovering one row fades the others (fine pointers only, see styles.css).
const listClassName = "dim-siblings mt-4 -mb-3 flex flex-col gap-1";

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
            className="mx-auto w-full max-w-2xl px-5 pb-12 pt-12 sm:pt-16"
            id="main-content"
        >
            <StaggerReveal.Item className="mb-12 sm:mb-16">
                <MumbaiPond />
            </StaggerReveal.Item>
            <header>
                <StaggerReveal.Item as="p" className="mb-4">
                    <AvailabilityStatus />
                </StaggerReveal.Item>
                <StaggerReveal.Headline
                    as="h1"
                    className="leading-relaxed text-foreground-strong"
                >
                    {homeIntro}
                </StaggerReveal.Headline>
                <StaggerReveal.Item
                    as="p"
                    className="intro-keywords mt-4 text-pretty leading-relaxed text-muted"
                >
                    Mostly I like{" "}
                    <IntroKeyword icon={RocketLaunchIcon} index={0} tone="ship">
                        shipping software
                    </IntroKeyword>{" "}
                    and{" "}
                    <IntroKeyword icon={BookOpenTextIcon} index={1} tone="learn">
                        learning things
                    </IntroKeyword>{" "}
                    I don't know yet. I learned{" "}
                    <IntroKeyword icon={HardDrivesIcon} index={2} tone="backend">
                        backend
                    </IntroKeyword>{" "}
                    on demand, with{" "}
                    <SketchMark index={0} kind="underline">
                        deadlines and no roadmap
                    </SketchMark>
                    , and I write{" "}
                    <HoverPeek peek={<LatestGuidesPeek />}>
                        <Link className="text-link" to="/articles">
                            guides
                        </Link>
                    </HoverPeek>{" "}
                    to find out how much I had wrong.
                </StaggerReveal.Item>
                <StaggerReveal.Item
                    as="p"
                    className="mt-4 text-pretty leading-relaxed text-muted"
                >
                    Want to{" "}
                    <SketchMark index={1} kind="marker">
                        work together
                    </SketchMark>
                    ?{" "}
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
                            <HoverPeek
                                as="div"
                                className="contents"
                                peek={<WorkPeek experience={experience} />}
                            >
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
                            </HoverPeek>
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
                            <span className="flex items-center gap-1.5 text-foreground-strong">
                                All {authoredPosts.length} guides
                                <ArrowRightIcon
                                    aria-hidden="true"
                                    className="nudge-arrow"
                                    data-direction="right"
                                    size={14}
                                />
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
                <dl className="mt-4 divide-y divide-divider border-y border-divider">
                    {stackGroups.map((group) => (
                        <StaggerReveal.Item
                            className="stack-row grid gap-2.5 py-4 sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:items-center sm:gap-6"
                            key={group.label}
                        >
                            <dt className="text-sm text-muted">{group.label}</dt>
                            <dd className="flex flex-wrap gap-2">
                                {group.items.map((item, index) => (
                                    <span
                                        className="stack-chip"
                                        key={item.name}
                                        style={
                                            {
                                                "--brand": item.color === "currentColor" ? "var(--foreground-strong)" : item.color,
                                                "--chip-index": index,
                                            } as React.CSSProperties
                                        }
                                    >
                                        {item.icon && (
                                            <span
                                                aria-hidden="true"
                                                className="stack-chip__icon"
                                                style={{
                                                    maskImage: `url(${item.icon})`,
                                                    WebkitMaskImage: `url(${item.icon})`,
                                                }}
                                            />
                                        )}
                                        {item.name}
                                    </span>
                                ))}
                            </dd>
                        </StaggerReveal.Item>
                    ))}
                </dl>
            </section>
        </StaggerReveal>
    );
}

/** Hover card on "guides": the three newest titles, so the link previews where it goes. */
function LatestGuidesPeek() {
    return (
        <>
            <span className="hover-peek__label">Latest guides</span>
            <span className="mt-1.5 flex flex-col gap-1">
                {authoredPosts.slice(0, 3).map((post) => (
                    <span className="text-foreground-strong" key={post.slug}>
                        {post.title}
                    </span>
                ))}
            </span>
        </>
    );
}

/** Hover card on a work row: what the role delivered, then the stack, from `resume.ts`. */
function WorkPeek({ experience }: Readonly<{ experience: ResumeExperience }>) {
    return (
        <>
            {experience.outcome && (
                <span className="block text-foreground-strong">
                    {experience.outcome}
                </span>
            )}
            {experience.stack && (
                <span className="mt-1.5 block text-muted">
                    {experience.stack.slice(0, 5).join(" · ")}
                </span>
            )}
        </>
    );
}
