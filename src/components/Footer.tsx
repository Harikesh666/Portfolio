import { Link } from "@tanstack/react-router";
import { SectionHeading } from "./SectionHeading";
import { site } from "../lib/site";

const elsewhere = [
    { label: "Email", href: `mailto:${site.email}`, external: false },
    { label: "GitHub", href: site.socials.github, external: true },
    { label: "LinkedIn", href: site.socials.linkedin, external: true },
    { label: "RSS", href: "/feed.xml", external: false },
] as const;

export default function Footer() {
    return (
        <footer className="mx-auto mt-16 w-full max-w-2xl px-5 pb-10 sm:mt-24">
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
                            <span aria-hidden="true" className="text-divider">
                                ·
                            </span>
                        )}
                        <a
                            className="text-link"
                            href={item.href}
                            {...(item.external
                                ? { rel: "noreferrer", target: "_blank" }
                                : {})}
                        >
                            {item.label}
                        </a>
                    </li>
                ))}
            </ul>
            <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-divider pt-5 text-[13px] text-muted">
                <div className="flex items-center gap-3">
                    <Link className="hover:text-foreground-strong" to="/contact">
                        Contact
                    </Link>
                    <Link className="hover:text-foreground-strong" to="/privacy">
                        Privacy
                    </Link>
                </div>
                <span>
                    © {new Date().getFullYear()} {site.name}
                </span>
            </div>
        </footer>
    );
}
