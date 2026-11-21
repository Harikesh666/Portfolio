import { Link, createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ContributionGraph } from "../components/ContributionGraph";
import { PageEnter } from "../components/PageEnter";
import { SketchMark } from "../components/SketchMark";
import { Reveal } from "../components/Reveal";
import { StaggerReveal } from "../components/StaggerReveal";
import { absoluteUrl, site } from "../lib/site";

const aboutTitle = `About - ${site.name}`;
const aboutDescription =
    "Harikesh Mishra is a software engineer in Mumbai who leans backend and ships full-stack applications. How he learned the work, what he uses, and why he writes.";
const aboutUrl = absoluteUrl("/about");
const aboutImage = absoluteUrl("/og.png");

/*
 * "How I got here" as milestones. The prose is unchanged; each step just
 * gains a label saying when it happened. The last step is where things stand
 * now, so its dot is filled.
 */
const journey: readonly {
    when: string;
    title: string;
    paragraphs: readonly ReactNode[];
    current?: boolean;
}[] = [
    {
        when: "Apr 2025",
        title: "Internship, Rabs Net Solutions",
        paragraphs: [
            "I started out wanting to do frontend, React mostly. During my internship I kept getting handed backend work in Node. I took it because the experience was there, and because saying no to an opportunity simply because I was unprepared seemed worse than being unprepared.",
            <>
                It was overwhelming. I did not have solid footing in frontend
                yet, let alone backend. There was rarely a point where I felt
                ready before the work arrived. I learned to{" "}
                <SketchMark kind="underline">start anyway</SketchMark>.
            </>,
        ],
    },
    {
        when: "Aug 2025",
        title: "First full-time job, EduvanceAI",
        paragraphs: [
            "My first full-time job followed the same pattern. Just as I had begun to think Node might be the right fit for me, I was told I'd be working in Python instead. Cloud work came with it, unexpectedly, and I was glad for that.",
        ],
    },
    {
        when: "A few months in",
        title: "Choosing the stack",
        paragraphs: [
            <>
                After a couple of months, my managers gave me the freedom to
                choose the stack for POCs I owned end to end. I came back to
                Node, this time because I{" "}
                <SketchMark kind="circle">wanted to</SketchMark> rather than
                because it had been handed to me. It stuck.
            </>,
        ],
    },
    {
        when: "Now",
        title: "The AI layer",
        current: true,
        paragraphs: [
            "By then, colleagues around me were building with generative AI and RAG while I worked on the backend underneath it. I had touched the AI layer a few times, just enough to know I didn't understand it properly.",
            "Eventually, touching it stopped being enough. I wanted to know what was actually happening.",
        ],
    },
];

export const Route = createFileRoute("/about")({
    head: () => ({
        meta: [
            { title: aboutTitle },
            { name: "description", content: aboutDescription },
            { property: "og:title", content: aboutTitle },
            { property: "og:description", content: aboutDescription },
            { property: "og:type", content: "profile" },
            { property: "og:url", content: aboutUrl },
            { property: "og:image", content: aboutImage },
            { name: "twitter:card", content: "summary_large_image" },
            { name: "twitter:title", content: aboutTitle },
            { name: "twitter:description", content: aboutDescription },
            { name: "twitter:image", content: aboutImage },
        ],
        links: [{ rel: "canonical", href: aboutUrl }],
    }),
    component: AboutPage,
});

function AboutPage() {
    return (
        <main
            id="main-content"
            className="mx-auto w-full max-w-2xl px-5 pb-12 pt-10"
        >
            <PageEnter>
                <StaggerReveal as="header">
                    <StaggerReveal.Headline className="text-[1.375rem] font-semibold leading-tight tracking-[-0.02em] text-foreground-strong">
                        About
                    </StaggerReveal.Headline>
                    <StaggerReveal.Item
                        as="div"
                        className="mt-3 text-[1.0625rem] leading-7 text-foreground"
                    >
                        <p>
                            I'm a software engineer in Mumbai. I excel most at{" "}
                            <SketchMark kind="marker">backend work</SketchMark>,
                            and I ship full-stack
                            applications when that is what the work needs.
                        </p>
                        <p className="mt-4">
                            Most of the things I know to do in software began
                            with someone asking me to do them before I felt
                            ready.
                        </p>
                    </StaggerReveal.Item>
                </StaggerReveal>

                <Reveal>
                    <AboutSection title="How I got here">
                        <ol className="journey">
                            {journey.map((step) => (
                                <li
                                    className={`journey__step${step.current ? " journey__step--current" : ""}`}
                                    key={step.when}
                                >
                                    <p className="journey__label">
                                        <span className="tabular-nums text-foreground-strong">
                                            {step.when}
                                        </span>{" "}
                                        · {step.title}
                                    </p>
                                    <div className="mt-2 space-y-4">
                                        {step.paragraphs.map((paragraph, index) => (
                                            // A fixed list that never reorders, so the index is a stable key.
                                            <p key={index}>{paragraph}</p>
                                        ))}
                                    </div>
                                </li>
                            ))}
                        </ol>
                    </AboutSection>
                </Reveal>

                <Reveal>
                    <AboutSection title="How I think about the work">
                        <p>
                            I like shipping software, but I think I like the
                            part before competence even more: when something is
                            unfamiliar, slightly uncomfortable and still has to
                            be figured out.
                        </p>
                        <p>
                            Courses and tutorials can teach you the shape of
                            something.{" "}
                            <SketchMark kind="marker">Curiosity</SketchMark> is
                            what takes you past it.
                        </p>
                        <p>
                            That is mostly why the writing on this site exists.
                            I work something out, then I try to write it down
                            properly. The writing is usually where I discover
                            how much of it I had only half understood.
                        </p>
                        <p>
                            I don't know everything and I've stopped pretending
                            otherwise. Software engineering corrects you too
                            quickly for that. You build something, reality
                            answers, and sometimes the answer is that you were
                            wrong.
                        </p>
                        <p>
                            I've come to think that is one of the best things
                            about the work.
                        </p>
                        <p>
                            I'm fascinated by the work of Matteo Collina, DHH,
                            and Mitchell Hashimoto, to name a few. A line of
                            Hashimoto's I keep coming back to:
                        </p>
                        <figure className="pull-quote">
                            <blockquote>
                                <p>
                                    The pursuit of excellence does not need
                                    justification.
                                </p>
                            </blockquote>
                            <figcaption>Mitchell Hashimoto</figcaption>
                        </figure>
                        <p>
                            I am nowhere close to their level, and I know that.
                            But I like having people to look up to. I like the
                            idea that there is always a better version of the
                            work, and perhaps of yourself, somewhere ahead.
                        </p>
                        <p>There are worse things to spend a life chasing.</p>
                    </AboutSection>
                </Reveal>


                <Reveal>
                    <AboutSection title="GitHub activity">
                        <ContributionGraph />
                    </AboutSection>
                </Reveal>

                <Reveal>
                    <p className="mt-12 text-foreground">
                        The{" "}
                        <Link className="text-link" to="/resume">
                            resume
                        </Link>{" "}
                        has what I've built and the tools I built it with.
                    </p>
                </Reveal>
            </PageEnter>
        </main>
    );
}

function AboutSection({
    children,
    title,
}: Readonly<{ children: React.ReactNode; title: string }>) {
    const headingId = `${title.toLowerCase().replaceAll(" ", "-")}-heading`;

    return (
        <section aria-labelledby={headingId} className="mt-12">
            <h2
                className="text-[15px] font-medium text-foreground-strong"
                id={headingId}
            >
                {title}
            </h2>
            <div className="mt-4 space-y-4 text-foreground">{children}</div>
        </section>
    );
}
