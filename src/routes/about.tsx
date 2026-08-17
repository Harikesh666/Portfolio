import { Link, createFileRoute } from "@tanstack/react-router";
import { PageEnter } from "../components/PageEnter";
import { Reveal } from "../components/Reveal";
import { StaggerReveal } from "../components/StaggerReveal";
import { absoluteUrl, site } from "../lib/site";
import { stackGroups } from "../lib/stack";

const aboutTitle = `About - ${site.name}`;
const aboutDescription =
    "Harikesh Mishra is a software engineer in Mumbai who leans backend and ships full-stack applications. How he learned the work, what he uses, and why he writes.";
const aboutUrl = absoluteUrl("/about");
const aboutImage = absoluteUrl("/og.png");

const stack = stackGroups.map((group) => ({
    label: group.label,
    value: group.items.map((item) => item.name).join(", "),
}));

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
                    <StaggerReveal.Headline className="text-[1.75rem] font-semibold leading-[1.15] tracking-[-0.03em] text-foreground-strong sm:text-[2rem]">
                        About
                    </StaggerReveal.Headline>
                    <StaggerReveal.Item
                        as="p"
                        className="mt-3 text-[1.0625rem] leading-7 text-foreground"
                    >
                        <p>
                            I'm a software engineer in Mumbai. I excel most at
                            backend work, and I ship full-stack
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
                        <p>
                            I started out wanting to do frontend, React mostly.
                            During my internship I kept getting handed backend
                            work in Node. I took it because the experience was
                            there, and because saying no to an opportunity
                            simply because I was unprepared seemed worse than
                            being unprepared.
                        </p>
                        <p>
                            It was overwhelming. I did not have solid footing in
                            frontend yet, let alone backend. There was rarely a
                            point where I felt ready before the work arrived. I
                            learned to start anyway.
                        </p>
                        <p>
                            My first full-time job followed the same pattern.
                            Just as I had begun to think Node might be the right
                            fit for me, I was told I'd be working in Python
                            instead. Cloud work came with it, unexpectedly, and I
                            was glad for that.
                        </p>
                        <p>
                            After a couple of months, my managers gave me the
                            freedom to choose the stack for POCs I owned end to
                            end. I came back to Node, this time because I wanted
                            to rather than because it had been handed to me. It
                            stuck.
                        </p>
                        <p>
                            By then, colleagues around me were building with
                            generative AI and RAG while I worked on the backend
                            underneath it. I had touched the AI layer a few
                            times, just enough to know I didn't understand it
                            properly.
                        </p>
                        <p>
                            Eventually, touching it stopped being enough. I
                            wanted to know what was actually happening.
                        </p>
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
                            something. Curiosity is what takes you past it.
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
                            Hashimoto's I keep coming back to is that{" "}
                            <i>
                                "The pursuit of excellence does not need
                                justification."
                            </i>
                        </p>
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
                    <AboutSection title="What I work with">
                        <dl className="space-y-2 text-sm">
                            {stack.map((row) => (
                                <div
                                    className="sm:flex sm:gap-3"
                                    key={row.label}
                                >
                                    <dt className="shrink-0 font-mono text-[13px] font-medium text-muted sm:w-32">
                                        {row.label}
                                    </dt>
                                    <dd className="text-foreground">
                                        {row.value}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                        <p className="text-sm text-muted">
                            The{" "}
                            <Link
                                className="underline decoration-accent underline-offset-4 hover:text-accent"
                                to="/resume"
                            >
                                resume
                            </Link>{" "}
                            has the full list and what I built with it.
                        </p>
                    </AboutSection>
                </Reveal>

                <Reveal>
                    <AboutSection title="Elsewhere">
                        <p className="flex flex-wrap items-center gap-x-2 font-mono text-sm">
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
                                Resume PDF
                            </a>
                        </p>
                    </AboutSection>
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
                className="font-mono text-[12px] font-medium uppercase tracking-widest text-muted"
                id={headingId}
            >
                {title}
            </h2>
            <div className="mt-4 space-y-4 text-foreground">{children}</div>
        </section>
    );
}
