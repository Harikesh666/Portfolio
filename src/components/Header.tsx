import { useEffect, useRef, useState } from "react";
import { MoonIcon, SunIcon } from "@phosphor-icons/react";
import { Link, useLocation } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
    bouncySpring,
    headerContentExitTween,
    headerMorphTween,
    routePageEnterTween,
    snappySpring,
    themeToggleButtonHover,
    themeToggleButtonTap,
    themeToggleIconVariants,
    themeGifMaskTransitionStyles,
} from "../lib/motion";
import { posts } from "../lib/content";
import { site } from "../lib/site";

type HeaderMode = "breadcrumb" | "identity";

const themeTransitionStyleId = "theme-gif-mask-transition";

function ensureThemeGifTransitionStyles() {
    let styleElement = document.getElementById(
        themeTransitionStyleId,
    ) as HTMLStyleElement | null;

    if (!styleElement) {
        styleElement = document.createElement("style");
        styleElement.id = themeTransitionStyleId;
        document.head.appendChild(styleElement);
    }

    styleElement.textContent = themeGifMaskTransitionStyles;
}

const headerGeometry = {
    identity: {
        height: 136, // pt-24 + leading-6 name + leading-4 role → 96 + 24 + 16 = 136px
        toggleY: 86, // name line center (96 + 12) minus half the h-11 target (22) → 86px
    },
    breadcrumb: {
        height: 76, // py-4 + h-11 + py-4 → 76px
        toggleY: 16, // py-4 → 16px
    },
} as const;

function getHeaderPost(pathname: string) {
    const slug = pathname.match(/^\/articles\/([^/]+)\/?$/)?.[1];

    return slug ? posts.find((entry) => entry.slug === slug) : undefined;
}

export function getHeaderHeight(pathname: string) {
    return headerGeometry[getHeaderPost(pathname) ? "breadcrumb" : "identity"]
        .height;
}

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
            className="flex select-none items-center justify-center rounded-full bg-accent-soft font-mono font-semibold text-accent"
            style={{ width: size, height: size, fontSize: size * 0.36 }}
        >
            {initials}
        </span>
    );
}

function ThemeToggle({
    mode,
    shouldReduceMotion,
}: Readonly<{ mode: HeaderMode; shouldReduceMotion: boolean }>) {
    const [theme, setTheme] = useState<"light" | "dark">("light");
    const themeTransitionId = useRef(0);
    const iconDirection = theme === "dark" ? 1 : -1;

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

        ensureThemeGifTransitionStyles();
        themeTransitionId.current += 1;
        const transitionId = String(themeTransitionId.current);
        document.documentElement.dataset.themeTransition = transitionId;

        const transition = document.startViewTransition(applyTheme);
        void transition.finished.finally(() => {
            if (
                document.documentElement.dataset.themeTransition ===
                transitionId
            ) {
                delete document.documentElement.dataset.themeTransition;
            }
        });
    }

    return (
        <motion.button
            animate={{ y: headerGeometry[mode].toggleY }}
            className="absolute z-10 inline-flex min-h-11 min-w-11 items-center justify-center text-muted hover:text-foreground-strong"
            initial={false}
            style={{ top: 0, right: 20 }}
            type="button"
            aria-label="Toggle theme"
            aria-pressed={theme === "dark"}
            onClick={toggleTheme}
            whileHover={shouldReduceMotion ? undefined : themeToggleButtonHover}
            whileTap={shouldReduceMotion ? undefined : themeToggleButtonTap}
            transition={
                shouldReduceMotion
                    ? { duration: 0 }
                    : { y: headerMorphTween, scale: snappySpring }
            }
        >
            {shouldReduceMotion ? (
                theme === "dark" ? (
                    <SunIcon aria-hidden="true" size={18} />
                ) : (
                    <MoonIcon aria-hidden="true" size={18} />
                )
            ) : (
                <AnimatePresence
                    custom={iconDirection}
                    initial={false}
                    mode="wait"
                >
                    <motion.span
                        className="inline-flex"
                        custom={iconDirection}
                        key={theme}
                        animate="animate"
                        exit="exit"
                        initial="initial"
                        transition={bouncySpring}
                        variants={themeToggleIconVariants}
                    >
                        {theme === "dark" ? (
                            <SunIcon aria-hidden="true" size={18} />
                        ) : (
                            <MoonIcon aria-hidden="true" size={18} />
                        )}
                    </motion.span>
                </AnimatePresence>
            )}
        </motion.button>
    );
}

function IdentityHeader() {
    return (
        <div className="px-5 pt-24">
            <p className="flex flex-col pr-14 font-medium">
                <Link
                    className="w-fit leading-6 text-foreground-strong"
                    to="/"
                >
                    {site.name}
                </Link>
                <span className="leading-4 text-muted">Software Engineer</span>
            </p>
        </div>
    );
}

function BreadcrumbHeader({ postTitle }: Readonly<{ postTitle: string }>) {
    return (
        <div className="flex min-w-0 items-center gap-2 px-5 py-4 text-sm">
            <Link aria-label="Home" className="shrink-0 rounded-full" to="/">
                <Avatar size={24} />
            </Link>
            <Link
                className="hidden shrink-0 font-medium text-foreground-strong hover:text-muted sm:inline"
                to="/"
            >
                {site.name}
            </Link>
            <span aria-hidden="true" className="shrink-0 text-divider">
                /
            </span>
            <Link
                className="shrink-0 font-medium text-foreground-strong hover:text-muted"
                to="/articles"
            >
                Articles
            </Link>
            <span aria-hidden="true" className="shrink-0 text-divider">
                /
            </span>
            <span className="min-w-0 truncate text-muted">{postTitle}</span>
            <span aria-hidden="true" className="ml-auto h-11 w-13 shrink-0" />
        </div>
    );
}

export default function Header() {
    const pathname = useLocation({ select: (location) => location.pathname });
    const shouldReduceMotion = useReducedMotion() ?? false;

    const post = getHeaderPost(pathname);
    const mode: HeaderMode = post ? "breadcrumb" : "identity";

    return (
        <header className="mx-auto w-full max-w-2xl">
            <div
                className="relative min-w-0"
                style={{ height: headerGeometry[mode].height }}
            >
                <AnimatePresence initial={false}>
                    <motion.div
                        animate={{
                            opacity: 1,
                            y: 0,
                            transition: shouldReduceMotion
                                ? { duration: 0 }
                                : routePageEnterTween,
                        }}
                        className="absolute inset-x-0 top-0 min-w-0"
                        exit={{
                            opacity: 0,
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
                <ThemeToggle
                    mode={mode}
                    shouldReduceMotion={shouldReduceMotion}
                />
            </div>
        </header>
    );
}
