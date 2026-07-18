import { useEffect, useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { Moon, Sun } from "lucide-react";
import {
    AnimatePresence,
    LayoutGroup,
    motion,
    useReducedMotion,
} from "motion/react";
import {
    bouncySpring,
    headerContentExitTween,
    headerMorphTween,
    routePageEnterTween,
    snappySpring,
} from "../lib/motion";
import { posts } from "../lib/content";
import { site } from "../lib/site";

const navLinkClassName =
    "py-1 text-muted hover:text-foreground-strong data-[status=active]:font-semibold data-[status=active]:text-foreground-strong";

type HeaderMode = "breadcrumb" | "identity";

function Avatar({ size }: Readonly<{ size: number }>) {
    const initials = site.name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2);

    if (site.avatar) {
        return (
            <img
                alt=""
                className="rounded-full object-cover"
                height={size}
                src={site.avatar}
                style={{ width: size, height: size }}
                width={size}
            />
        );
    }

    return (
        <span
            aria-hidden="true"
            className="flex select-none items-center justify-center rounded-full bg-accent-soft font-mono font-bold text-accent"
            style={{ width: size, height: size, fontSize: size * 0.36 }}
        >
            {initials}
        </span>
    );
}

function ThemeToggle({ mode }: Readonly<{ mode: HeaderMode }>) {
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
        const applyTheme = () => {
            document.documentElement.dataset.theme = nextTheme;
            window.localStorage.setItem("theme", nextTheme);
            setTheme(nextTheme);
        };

        if (shouldReduceMotion || !document.startViewTransition) {
            applyTheme();
            return;
        }

        document.startViewTransition(applyTheme);
    }

    return (
        <motion.button
            className="absolute z-10 inline-flex min-h-11 min-w-11 items-center justify-center text-foreground-strong hover:text-accent"
            layout={shouldReduceMotion ? false : true}
            layoutId={
                shouldReduceMotion ? undefined : "header-theme-toggle"
            }
            style={
                mode === "breadcrumb"
                    ? { top: 16, right: 20 }
                    : { right: 20, bottom: 8 }
            }
            type="button"
            aria-label="Toggle theme"
            aria-pressed={theme === "dark"}
            onClick={toggleTheme}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
            transition={
                shouldReduceMotion
                    ? { duration: 0 }
                    : { layout: headerMorphTween, scale: snappySpring }
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
                        initial={{ rotate: -90, scale: 0.5, opacity: 0 }}
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
    );
}

function IdentityHeader() {
    return (
        <div className="flex flex-col px-5 pb-2 pt-8">
            <span aria-hidden="true" className="h-11 w-11" />
            <p className="mt-4 flex flex-wrap items-baseline gap-x-2">
                <Link
                    className="text-[1.4rem] font-bold tracking-[-0.02em] text-foreground-strong"
                    to="/"
                >
                    {site.name}
                </Link>
                {site.handle ? (
                    <span className="text-[1.05rem] text-muted">
                        <span className="font-serif italic">aka</span>{" "}
                        <a
                            className="hover:text-accent"
                            href={site.socials.github}
                            rel="noreferrer"
                            target="_blank"
                        >
                            {site.handle}
                        </a>
                    </span>
                ) : null}
            </p>
            <nav
                aria-label="Main navigation"
                className="mt-2 flex items-center gap-5 whitespace-nowrap text-sm"
            >
                <Link
                    activeOptions={{ exact: true }}
                    className={navLinkClassName}
                    to="/"
                >
                    Home
                </Link>
                <Link className={navLinkClassName} to="/writing">
                    Writing
                </Link>
                <Link className={navLinkClassName} to="/resume">
                    Resume
                </Link>
                <a
                    className="py-1 text-muted hover:text-foreground-strong"
                    href={site.socials.github}
                    rel="noreferrer"
                    target="_blank"
                >
                    GitHub
                </a>
                <span aria-hidden="true" className="ml-auto h-11 w-11" />
            </nav>
        </div>
    );
}

function BreadcrumbHeader({ postTitle }: Readonly<{ postTitle: string }>) {
    return (
        <div className="flex min-w-0 items-center gap-2 px-5 py-4 text-sm">
            <span aria-hidden="true" className="h-6 w-6 shrink-0" />
            <Link
                className="hidden shrink-0 font-medium text-foreground-strong hover:text-accent sm:inline"
                to="/"
            >
                {site.name}
            </Link>
            <span aria-hidden="true" className="shrink-0 text-divider">
                /
            </span>
            <Link
                className="shrink-0 font-medium text-foreground-strong hover:text-accent"
                to="/writing"
            >
                Writing
            </Link>
            <span aria-hidden="true" className="shrink-0 text-divider">
                /
            </span>
            <span className="min-w-0 truncate text-muted">{postTitle}</span>
            <span
                aria-hidden="true"
                className="ml-auto h-11 w-[3.25rem] shrink-0"
            />
        </div>
    );
}

function SharedAvatar({
    mode,
    shouldReduceMotion,
}: Readonly<{
    mode: HeaderMode;
    shouldReduceMotion: boolean;
}>) {
    const size = mode === "breadcrumb" ? 24 : 44;

    return (
        <motion.div
            className="absolute z-10"
            layout={shouldReduceMotion ? false : true}
            layoutId={shouldReduceMotion ? undefined : "header-avatar"}
            style={{
                top: mode === "breadcrumb" ? 26 : 32,
                left: 20,
                width: size,
                height: size,
                borderRadius: 9999,
            }}
            transition={
                shouldReduceMotion
                    ? { duration: 0 }
                    : { layout: headerMorphTween }
            }
        >
            <Link aria-label="Home" className="block h-full w-full" to="/">
                <Avatar size={size} />
            </Link>
        </motion.div>
    );
}

export default function Header() {
    const pathname = useLocation({ select: (location) => location.pathname });
    const shouldReduceMotion = useReducedMotion() ?? false;

    const slug = pathname.match(/^\/writing\/([^/]+)\/?$/)?.[1];
    const post = slug ? posts.find((entry) => entry.slug === slug) : undefined;
    const mode: HeaderMode = post ? "breadcrumb" : "identity";

    return (
        <header className="mx-auto w-full max-w-2xl">
            <LayoutGroup id="site-header">
                <motion.div
                    className="relative min-w-0"
                    layout={shouldReduceMotion ? false : true}
                    layoutDependency={mode}
                    transition={
                        shouldReduceMotion
                            ? { duration: 0 }
                            : { layout: headerMorphTween }
                    }
                >
                    <AnimatePresence initial={false} mode="popLayout">
                        <motion.div
                            animate={{
                                opacity: 1,
                                y: 0,
                                transition: shouldReduceMotion
                                    ? { duration: 0 }
                                    : routePageEnterTween,
                            }}
                            className="relative min-w-0"
                            exit={{
                                opacity: shouldReduceMotion ? 1 : 0,
                                transition: shouldReduceMotion
                                    ? { duration: 0 }
                                    : headerContentExitTween,
                            }}
                            initial={
                                shouldReduceMotion
                                    ? false
                                    : {
                                          opacity: 0,
                                          y: mode === "breadcrumb" ? -4 : 4,
                                      }
                            }
                            key={mode}
                        >
                            {post ? (
                                <BreadcrumbHeader postTitle={post.title} />
                            ) : (
                                <IdentityHeader />
                            )}
                        </motion.div>
                    </AnimatePresence>
                    <SharedAvatar
                        mode={mode}
                        shouldReduceMotion={shouldReduceMotion}
                    />
                    <ThemeToggle mode={mode} />
                </motion.div>
            </LayoutGroup>
        </header>
    );
}
