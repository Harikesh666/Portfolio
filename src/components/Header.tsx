import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Moon, Sun } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
    bouncySpring,
    expressiveSpring,
    snappySpring,
} from "../lib/motion";
import { site } from "../lib/site";

const navLinkClassName =
    "relative py-1 hover:text-accent after:absolute after:inset-x-0 after:bottom-0 after:h-px after:origin-left after:scale-x-0 after:bg-accent after:transition-transform after:duration-200 after:ease-out hover:after:scale-x-100 focus-visible:after:scale-x-100 motion-reduce:after:transition-none";

export default function Header() {
    const [theme, setTheme] = useState<"light" | "dark">("light");
    const shouldReduceMotion = useReducedMotion();

    useEffect(() => {
        setTheme(
            document.documentElement.dataset.theme === "dark"
                ? "dark"
                : "light",
        );
    }, []);

    function toggleTheme() {
        const nextTheme = theme === "dark" ? "light" : "dark";
        document.documentElement.dataset.theme = nextTheme;
        window.localStorage.setItem("theme", nextTheme);
        setTheme(nextTheme);
    }

    return (
        <motion.header
            className="mx-auto flex w-full max-w-2xl items-center justify-between gap-2 border-b border-divider px-5 py-4"
            initial={shouldReduceMotion ? false : { opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={
                shouldReduceMotion ? { duration: 0 } : expressiveSpring
            }
        >
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
                <Link className={navLinkClassName} to="/writing">
                    Writing
                </Link>
                <a
                    className={navLinkClassName}
                    href={site.socials.github}
                    target="_blank"
                    rel="noreferrer"
                >
                    GitHub
                </a>
                <Link className={navLinkClassName} to="/resume">
                    Resume
                </Link>
                <motion.button
                    className="inline-flex min-h-11 min-w-11 items-center justify-center text-foreground-strong hover:text-accent"
                    type="button"
                    aria-label="Toggle theme"
                    aria-pressed={theme === "dark"}
                    onClick={toggleTheme}
                    whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
                    transition={
                        shouldReduceMotion ? { duration: 0 } : snappySpring
                    }
                >
                    {shouldReduceMotion ? (
                        theme === "dark" ? (
                            <Sun aria-hidden="true" size={18} />
                        ) : (
                            <Moon aria-hidden="true" size={18} />
                        )
                    ) : (
                        <AnimatePresence initial={false} mode="wait">
                            <motion.span
                                className="inline-flex"
                                key={theme}
                                initial={{
                                    rotate: -90,
                                    scale: 0.5,
                                    opacity: 0,
                                }}
                                animate={{ rotate: 0, scale: 1, opacity: 1 }}
                                exit={{
                                    rotate: 90,
                                    scale: 0.5,
                                    opacity: 0,
                                    transition: snappySpring,
                                }}
                                transition={bouncySpring}
                            >
                                {theme === "dark" ? (
                                    <Sun aria-hidden="true" size={18} />
                                ) : (
                                    <Moon aria-hidden="true" size={18} />
                                )}
                            </motion.span>
                        </AnimatePresence>
                    )}
                </motion.button>
            </nav>
        </motion.header>
    );
}
