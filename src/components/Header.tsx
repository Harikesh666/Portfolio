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
        <header className="mx-auto flex w-[calc(100%-2rem)] max-w-[1120px] items-end justify-between gap-6 border-b border-divider py-5 sm:w-[calc(100%-3rem)] sm:py-7">
            <Link className="group min-w-0" to="/">
                <span
                    className="flex size-8 items-center justify-center rounded-md bg-foreground-strong text-[10px] font-bold tracking-[-0.1em] text-surface transition-transform duration-200 ease-out group-hover:-rotate-6 motion-reduce:transition-none"
                    aria-hidden="true"
                >
                    {initials}
                </span>
                <span className="mt-2 block text-[15px] font-bold tracking-[-0.025em] text-foreground-strong">
                    {site.name}
                </span>
                <span className="mt-0.5 block text-xs text-muted">
                    Full-stack developer · Mumbai
                </span>
            </Link>
            <nav className="flex flex-wrap justify-end gap-x-4 gap-y-2 text-sm font-semibold text-foreground" aria-label="Main navigation">
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
                <a className="hidden sm:inline" href="/#work">
                    Work
                </a>
                <a className="text-foreground-strong underline decoration-accent decoration-2 underline-offset-4" href={`mailto:${site.email}`}>
                    Contact
                </a>
            </nav>
        </header>
    );
}
