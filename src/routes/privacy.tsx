import { Link, createFileRoute } from "@tanstack/react-router";
import { PageEnter } from "../components/PageEnter";
import { Reveal } from "../components/Reveal";
import { StaggerReveal } from "../components/StaggerReveal";
import { privacyText } from "../lib/trust-pages";
import { absoluteUrl, site } from "../lib/site";

const privacyTitle = `Privacy - ${site.name}`;
const privacyDescription =
    "Privacy information for harikesh.xyz, including local theme storage, hosting logs, direct communications, external links, and contact details.";
const privacyUrl = absoluteUrl("/privacy");
const privacyImage = absoluteUrl("/og.png");

export const Route = createFileRoute("/privacy")({
    head: () => ({
        meta: [
            { title: privacyTitle },
            { name: "description", content: privacyDescription },
            { property: "og:title", content: privacyTitle },
            { property: "og:description", content: privacyDescription },
            { property: "og:type", content: "website" },
            { property: "og:url", content: privacyUrl },
            { property: "og:image", content: privacyImage },
            { name: "twitter:card", content: "summary_large_image" },
            { name: "twitter:title", content: privacyTitle },
            { name: "twitter:description", content: privacyDescription },
            { name: "twitter:image", content: privacyImage },
        ],
        links: [{ rel: "canonical", href: privacyUrl }],
    }),
    component: PrivacyPage,
});

function PrivacyPage() {
    return (
        <main
            id="main-content"
            className="mx-auto w-full max-w-2xl px-5 pb-12 pt-10"
        >
            <PageEnter>
                <StaggerReveal as="header">
                    <StaggerReveal.Headline className="text-[1.375rem] font-semibold leading-tight tracking-[-0.02em] text-foreground-strong">
                        Privacy
                    </StaggerReveal.Headline>
                    <StaggerReveal.Item
                        as="p"
                        className="mt-3 text-[1.0625rem] leading-7 text-foreground"
                    >
                        A plain-language account of what this site stores,
                        what its infrastructure may process, and what it does
                        not collect.
                    </StaggerReveal.Item>
                    <StaggerReveal.Item
                        as="p"
                        className="mt-3 text-[13px] text-muted"
                    >
                        Effective 30 August 2026
                    </StaggerReveal.Item>
                </StaggerReveal>

                <Reveal>
                    <section className="mt-12 space-y-4 text-foreground" aria-labelledby="policy-heading">
                        <h2
                            className="text-[15px] font-medium text-foreground-strong"
                            id="policy-heading"
                        >
                            Privacy policy
                        </h2>
                        {privacyText.map((paragraph) => (
                            <p key={paragraph}>{paragraph}</p>
                        ))}
                        <p>
                            Questions can be sent through the <Link className="text-link" to="/contact">Contact page</Link> or directly to <a className="text-link" href={`mailto:${site.email}`}>{site.email}</a>.
                        </p>
                    </section>
                </Reveal>
            </PageEnter>
        </main>
    );
}
