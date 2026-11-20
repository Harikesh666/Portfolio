import { Link, createFileRoute } from "@tanstack/react-router";
import {
    ArrowRightIcon,
    BookOpenTextIcon,
    EnvelopeSimpleIcon,
    FileTextIcon,
    GithubLogoIcon,
    HardDrivesIcon,
    LinkedinLogoIcon,
    RocketLaunchIcon,
} from "@phosphor-icons/react";
import { AvailabilityStatus } from "../components/AvailabilityStatus";
import { GuidePreview } from "../components/guide-previews";
import { IntroKeyword } from "../components/IntroKeyword";
import { NewTag, SketchMark } from "../components/SketchMark";
import { HomeScene } from "../components/pond/HomeScene";
import { SectionHeading } from "../components/SectionHeading";
import { StaggerReveal } from "../components/StaggerReveal";
import { homeStructuredData } from "../lib/agent-readiness";
import { authoredPosts, newPostSlug, posts } from "../lib/content";
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
// dim-siblings: hovering one row fades the others (fine pointers only, see styles.css).
const listClassName = "dim-siblings mt-4 -mb-3 flex flex-col gap-1";
// 44px tall on phones for thumbs, compact from sm where a pointer is precise.
const recruiterLinkClassName =
    "header-link inline-flex h-11 items-center gap-1 px-1.5 font-medium sm:h-9 sm:gap-1.5 sm:px-2";

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
                <HomeScene />
            </StaggerReveal.Item>
            <header>
                <StaggerReveal.Item as="p">
                    <AvailabilityStatus />
                </StaggerReveal.Item>
                {/* What a recruiter came for, right under the availability
                    line: the resume and three ways to reach me. */}
                <StaggerReveal.Item className="recruiter-links mb-4 -ml-1.5 flex flex-wrap items-center text-sm sm:-ml-2">
                    <Link className={recruiterLinkClassName} to="/resume">
                        <FileTextIcon aria-hidden="true" size={15} />
                        Resume
                    </Link>
                    <a
                        className={recruiterLinkClassName}
                        href={`mailto:${site.email}`}
                    >
                        <EnvelopeSimpleIcon aria-hidden="true" size={15} />
                        Email
                    </a>
                    <a
                        className={recruiterLinkClassName}
                        href={site.socials.github}
                        rel="noreferrer"
                        target="_blank"
                    >
                        <GithubLogoIcon aria-hidden="true" size={15} />
                        GitHub
                    </a>
                    <a
                        className={recruiterLinkClassName}
                        href={site.socials.linkedin}
                        rel="noreferrer"
                        target="_blank"
                    >
                        <LinkedinLogoIcon aria-hidden="true" size={15} />
                        LinkedIn
                    </a>
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
                    <Link className="text-link" to="/articles">
                        guides
                    </Link>{" "}
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
                            <GuidePreview slug={post.slug}>
                                <Link
                                    className="hover-row"
                                    params={{ slug: post.slug }}
                                    to="/articles/$slug"
                                >
                                    <span className="block text-foreground-strong">
                                        {post.title}
                                        {post.slug === newPostSlug && <NewTag />}
                                    </span>
                                    <span className="block text-muted">
                                        {post.description}
                                    </span>
                                </Link>
                            </GuidePreview>
                        </StaggerReveal.Item>
                    ))}
                    <StaggerReveal.Item as="li">
                        <Link className="hover-row" to="/articles">
                            <span className="flex items-center gap-1.5 text-foreground-strong">
                                All {posts.length} guides
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
