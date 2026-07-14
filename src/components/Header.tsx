import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Moon, Sun } from "lucide-react";
import { site } from "../lib/site";

export default function Header() {
    const [theme, setTheme] = useState<"light" | "dark">("light");

    useEffect(() => {
        setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
    }, []);

    function toggleTheme() {
        const nextTheme = theme === "dark" ? "light" : "dark";
        document.documentElement.dataset.theme = nextTheme;
        window.localStorage.setItem("theme", nextTheme);
        setTheme(nextTheme);
    }

    return (
        <header className="mx-auto flex w-full max-w-[42rem] items-center justify-between gap-2 border-b border-divider px-5 py-4">
            <Link
                className="shrink-0 text-[15px] font-bold tracking-[-0.02em] text-foreground-strong"
                to="/"
            >
                {site.name}
            </Link>
            <nav
                className="flex shrink-0 items-center gap-2 whitespace-nowrap text-sm text-foreground"
                aria-label="Main navigation"
            >
                <Link className="hover:text-accent" to="/writing">
                    Writing
                </Link>
                <a
                    className="hover:text-accent"
                    href={site.socials.github}
                    target="_blank"
                    rel="noreferrer"
                >
                    GitHub
                </a>
                <a
                    className="hover:text-accent"
                    href="/Harikesh_Mishra_Resume.pdf"
                    target="_blank"
                    rel="noreferrer"
                >
                    Resume
                </a>
                <button
                    className="inline-flex min-h-11 min-w-11 items-center justify-center text-foreground-strong hover:text-accent"
                    type="button"
                    aria-label="Toggle theme"
                    aria-pressed={theme === "dark"}
                    onClick={toggleTheme}
                >
                    {theme === "dark" ? (
                        <Sun aria-hidden="true" size={18} />
                    ) : (
                        <Moon aria-hidden="true" size={18} />
                    )}
                </button>
            </nav>
        </header>
    );
}
