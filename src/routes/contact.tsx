import { Link, createFileRoute } from "@tanstack/react-router";
import { PageEnter } from "../components/PageEnter";
import { Reveal } from "../components/Reveal";
import { StaggerReveal } from "../components/StaggerReveal";
import { contactText } from "../lib/trust-pages";
import { absoluteUrl, site } from "../lib/site";

const contactTitle = `Contact - ${site.name}`;
const contactDescription =
    "Contact Harikesh Mishra in Mumbai about software engineering roles, backend or full-stack projects, technical collaboration, and questions about his writing.";
const contactUrl = absoluteUrl("/contact");
const contactImage = absoluteUrl("/og.png");

export const Route = createFileRoute("/contact")({
    head: () => ({
        meta: [
            { title: contactTitle },
            { name: "description", content: contactDescription },
            { property: "og:title", content: contactTitle },
            { property: "og:description", content: contactDescription },
            { property: "og:type", content: "profile" },
            { property: "og:url", content: contactUrl },
            { property: "og:image", content: contactImage },
            { name: "twitter:card", content: "summary_large_image" },
            { name: "twitter:title", content: contactTitle },
            { name: "twitter:description", content: contactDescription },
            { name: "twitter:image", content: contactImage },
        ],
        links: [{ rel: "canonical", href: contactUrl }],
    }),
    component: ContactPage,
});

function ContactPage() {
    return (
        <main
            id="main-content"
            className="mx-auto w-full max-w-2xl px-5 pb-12 pt-10"
        >
            <PageEnter>
                <StaggerReveal as="header">
                    <StaggerReveal.Headline className="text-[1.375rem] font-semibold leading-tight tracking-[-0.02em] text-foreground-strong">
                        Contact
                    </StaggerReveal.Headline>
                    <StaggerReveal.Item
                        as="p"
                        className="mt-3 text-[1.0625rem] leading-7 text-foreground"
                    >
                        The best first step is a clear email with enough context
                        to understand what you need.
                    </StaggerReveal.Item>
                </StaggerReveal>

                <Reveal>
                    <section className="mt-12" aria-labelledby="details-heading">
                        <h2
                            className="text-[15px] font-medium text-foreground-strong"
                            id="details-heading"
                        >
                            Contact details
                        </h2>
                        <dl className="mt-4 space-y-3 text-foreground">
                            <div className="grid gap-1 sm:grid-cols-[6rem_minmax(0,1fr)] sm:gap-4">
                                <dt className="font-semibold text-foreground-strong">Email</dt>
                                <dd>
                                    <a className="text-link" href={`mailto:${site.email}`}>
                                        {site.email}
                                    </a>
                                </dd>
                            </div>
                            <div className="grid gap-1 sm:grid-cols-[6rem_minmax(0,1fr)] sm:gap-4">
                                <dt className="font-semibold text-foreground-strong">Phone</dt>
                                <dd>
                                    <a className="text-link" href={`tel:${site.phone.replaceAll(" ", "")}`}>
                                        {site.phone}
                                    </a>
                                </dd>
                            </div>
                            <div className="grid gap-1 sm:grid-cols-[6rem_minmax(0,1fr)] sm:gap-4">
                                <dt className="font-semibold text-foreground-strong">Location</dt>
                                <dd>Mumbai, Maharashtra, India</dd>
                            </div>
                        </dl>
                    </section>
                </Reveal>

                <Reveal>
                    <section className="mt-12 space-y-4 text-foreground" aria-labelledby="before-heading">
                        <h2
                            className="text-[15px] font-medium text-foreground-strong"
                            id="before-heading"
                        >
                            Before you write
                        </h2>
                        {contactText.map((paragraph) => (
                            <p key={paragraph}>{paragraph}</p>
                        ))}
                        <p>
                            Read the <Link className="text-link" to="/about">About page</Link> or review my <Link className="text-link" to="/resume">resume</Link> before getting in touch.
                        </p>
                    </section>
                </Reveal>
            </PageEnter>
        </main>
    );
}

