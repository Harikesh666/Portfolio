import { Link, useLocation } from "@tanstack/react-router";

const dockLinks = [
    { to: "/", label: "Home" },
    { to: "/articles", label: "Articles" },
    { to: "/about", label: "About" },
    { to: "/resume", label: "Resume" },
] as const;

/** Article pages have their breadcrumb and the table-of-contents pill instead. */
const articlePath = /^\/articles\/[^/]+\/?$/;

/**
 * Primary navigation on phones: a small pill fixed to the bottom of the
 * screen, within thumb reach. Wider screens show these links in the header.
 */
export function MobileDock() {
    const pathname = useLocation({ select: (location) => location.pathname });
    if (articlePath.test(pathname)) return null;

    return (
        <nav aria-label="Primary" className="mobile-dock sm:hidden">
            {dockLinks.map((link) => (
                <Link
                    activeOptions={{ exact: link.to === "/" }}
                    className="mobile-dock__link"
                    key={link.to}
                    to={link.to}
                >
                    {link.label}
                </Link>
            ))}
        </nav>
    );
}
