import { Link, createFileRoute } from "@tanstack/react-router";
import { PageEnter } from "../components/PageEnter";
import { Reveal } from "../components/Reveal";
import { StaggerReveal } from "../components/StaggerReveal";
import { absoluteUrl, site } from "../lib/site";
import { stackGroups } from "../lib/stack";

const aboutTitle = `About - ${site.name}`;
const aboutDescription =
    "Harikesh Mishra is a software engineer in Mumbai who leans backend and ships full stack applications. How he learned the work, what he uses, and why he writes.";
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
                        I'm a software engineer in Mumbai. I like backend work
                        most, and I ship full stack applications when that is
                        what the work needs.
                    </StaggerReveal.Item>
                </StaggerReveal>

                <Reveal>
                    <AboutSection title="How I got here">
                        <p>
                            I started out wanting to do frontend, React mostly.
                            During my internship I kept getting handed backend
                            work in Node, and I took it because the experience
                            was falling into my lap. It was overwhelming. I did
                            not have solid footing in frontend yet, let alone
                            backend. I got through it anyway.
                        </p>
                        <p>
                            That set the pattern for how I learn: on demand,
                            with a deadline, and no roadmap. My first full time
                            job started the same way. I was told to work on
                            Python right as I had decided Node might be the
                            right fit for me. It came with cloud work too, which
                            I had not expected and was glad to get. After a
                            couple of months of Python, my managers were kind
                            enough to let me choose the stack for POCs I owned
                            end to end, so I came back to Node on my own terms,
                            and it stuck.
                        </p>
                        <p>
                            My colleagues were already building on generative AI
                            and RAG while I worked the backend layer underneath
                            it. I had touched the AI layer a few times by then.
                            It made me curious enough to stop touching it and
                            actually go learn it properly.
                        </p>
                    </AboutSection>
                </Reveal>

                <Reveal>
                    <AboutSection title="How I think about the work">
                        <p>
                            Mostly I like shipping software and learning things
                            I don't know yet. A course or a tutorial can teach
                            you the shape of something, but curiosity is what
                            takes you past it.
                        </p>
                        <p>
                            That is most of why the writing on this site exists.
                            I work something out, then I write it down properly,
                            and the writing is usually where I find out how much
                            I had wrong.
                        </p>
                        <p>
                            I don't know everything, and I have stopped
                            pretending otherwise. Software engineering corrects
                            you quickly and it keeps you humble. I have come to
                            think that is the best thing about it.
                        </p>
                        <p>
                            I'm fascinated by the work of Matteo Collina, DHH,
                            and Mitchell Hashimoto. A line of Hashimoto's I keep
                            coming back to: the pursuit of excellence does not
                            need justification. I am not close to their level
                            and I know it, but having people to look up to, and
                            something to dream about, does not seem like a bad
                            thing in a mundane world.
                        </p>
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
