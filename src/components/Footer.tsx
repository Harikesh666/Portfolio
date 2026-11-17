import { Link } from "@tanstack/react-router";
import { ArrowUpRightIcon } from "@phosphor-icons/react";
import { openCommandPaletteEvent } from "../lib/command-palette";
import { LocalTime } from "./LocalTime";
import { FooterGarden } from "./pond/FooterGarden";
import { SectionHeading } from "./SectionHeading";
import { site } from "../lib/site";

const elsewhere = [
    { label: "Email", href: `mailto:${site.email}`, external: false },
    { label: "GitHub", href: site.socials.github, external: true },
    { label: "LinkedIn", href: site.socials.linkedin, external: true },
    // The feed stays discoverable through the <link rel="alternate"> in the page head.
    { label: "Contact", href: "/contact", external: false },
] as const;

const siteLinks = [
    { to: "/", label: "Home" },
    { to: "/articles", label: "Articles" },
    { to: "/about", label: "About" },
    { to: "/resume", label: "Resume" },
    { to: "/contact", label: "Contact" },
    { to: "/privacy", label: "Privacy" },
] as const;

export default function Footer() {
    return (
        <footer
            className="mx-auto mt-16 w-full max-w-2xl px-5 sm:mt-32"
            data-site-footer=""
        >
            <SectionHeading>Elsewhere</SectionHeading>
            <p className="mt-1 text-muted">
                Interested in working together? Reach me on any of these.
            </p>
            <ul
                className="mt-4 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm"
                role="list"
            >
                {elsewhere.map((item, index) => (
                    <li className="flex items-center gap-1.5" key={item.label}>
                        {index > 0 && (
                            <span aria-hidden="true" className="text-muted">
                                ·
                            </span>
                        )}
                        {item.href === "/contact" ? (
                            <Link className="text-link" to="/contact">
                                {item.label}
                            </Link>
                        ) : (
                        <a
                            className="inline-flex items-center gap-0.5 text-link"
                            href={item.href}
                            {...(item.external
                                ? { rel: "noreferrer", target: "_blank" }
                                : {})}
                        >
                            {item.label}
                            {item.external && (
                                <ArrowUpRightIcon
                                    aria-hidden="true"
                                    className="nudge-arrow"
                                    data-direction="up-right"
                                    size={11}
                                />
                            )}
                        </a>
                        )}
                    </li>
                ))}
            </ul>
            <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-divider pt-5 text-[13px] text-muted">
                <nav
                    aria-label="Site"
                    className="flex flex-wrap items-center gap-x-3 gap-y-1"
                >
                    {siteLinks.map((link) => (
                        <Link
                            activeOptions={{ exact: link.to === "/" }}
                            className="hover:text-foreground-strong data-[status=active]:text-foreground-strong"
                            key={link.to}
                            to={link.to}
                        >
                            {link.label}
                        </Link>
                    ))}
                    <button
                        className="inline-flex items-center gap-1.5 hover:text-foreground-strong"
                        onClick={() => window.dispatchEvent(new Event(openCommandPaletteEvent))}
                        type="button"
                    >
                        Search
                        <kbd className="palette-hint">/</kbd>
                    </button>
                </nav>
                <span className="flex flex-wrap items-baseline gap-x-2">
                    <LocalTime />
                    <span aria-hidden="true">·</span>
                    <span>
                        © {new Date().getFullYear()} {site.name}
                    </span>
                </span>
            </div>
            <FooterGarden />
        </footer>
    );
}
