import { Link, useLocation } from "@tanstack/react-router";
import { site } from "../lib/site";

const initials = site.name
    .split(" ")
    .map((part) => part[0])
    .join("");

export default function Header() {
    const pathname = useLocation({ select: (location) => location.pathname });
    const isArticle =
        pathname.startsWith("/writing/") && pathname !== "/writing/";

    if (isArticle) return null;

    return (
        <header className="mx-auto w-[calc(100%-2rem)] max-w-[490px] pt-9 sm:w-[calc(100%-3rem)]">
            <div
                className="flex size-6 items-center justify-center rounded-full bg-foreground-strong font-mono text-[8px] tracking-[-0.12em] text-surface"
                aria-hidden="true"
            >
                {initials}
            </div>
            <p className="mt-2 text-[18px] font-semibold tracking-[-0.045em] text-foreground-strong">
                {site.name}
            </p>
            <nav
                className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[14px] font-medium text-muted"
                aria-label="Main navigation"
            >
                <Link
                    to="/"
                    activeOptions={{ exact: true }}
                    activeProps={{ className: "text-foreground-strong" }}
                >
                    Home
                </Link>
                <Link
                    to="/writing"
                    activeProps={{ className: "text-foreground-strong" }}
                >
                    Writing
                </Link>
                <a href="/#work">Work</a>
                <a href={`mailto:${site.email}`}>Contact</a>
            </nav>
        </header>
    );
}
