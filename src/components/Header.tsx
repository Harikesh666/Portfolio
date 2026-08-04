import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { Moon, Sun } from "lucide-react";
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

const navLinkClassName =
    "py-1 text-muted hover:text-foreground-strong data-[status=active]:font-semibold data-[status=active]:text-foreground-strong";

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
        avatarSize: 44, // h-11 → 44px
        avatarY: 32, // pt-8 → 32px
        height: 188, // pt-8 + h-11 + mt-4 + leading-9 + mt-2 + h-11 + pb-2 → 188px
        toggleY: 136, // 188px header - pb-2 (8px) - h-11 (44px) → 136px
    },
    breadcrumb: {
        avatarSize: 24, // h-6 → 24px
        avatarY: 26, // py-4 (16px) + centered within h-11 ((44px - 24px) / 2) → 26px
        height: 76, // py-4 + h-11 + py-4 → 76px
        toggleY: 16, // py-4 → 16px
    },
} as const;

const avatarBreadcrumbScale =
    headerGeometry.breadcrumb.avatarSize / headerGeometry.identity.avatarSize;

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
            className="absolute z-10 inline-flex min-h-11 min-w-11 items-center justify-center text-foreground-strong hover:text-accent"
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
                    <Sun aria-hidden="true" size={18} />
                ) : (
                    <Moon aria-hidden="true" size={18} />
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
            <p className="mt-4 flex flex-wrap items-baseline gap-x-2 leading-9">
                <Link
                    className="text-[1.4rem] font-semibold tracking-[-0.025em] text-foreground-strong"
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
                <Link className={navLinkClassName} to="/articles">
                    Articles
                </Link>
                <Link className={navLinkClassName} to="/resume">
                    Resume
                </Link>
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

function SharedAvatar({
    mode,
    shouldReduceMotion,
}: Readonly<{
    mode: HeaderMode;
    shouldReduceMotion: boolean;
}>) {
    const scale = mode === "breadcrumb" ? avatarBreadcrumbScale : 1;

    return (
        <motion.div
            animate={{
                scale,
                y: headerGeometry[mode].avatarY,
            }}
            className="absolute z-10"
            initial={false}
            style={{
                top: 0,
                left: 20,
                width: headerGeometry.identity.avatarSize,
                height: headerGeometry.identity.avatarSize,
                borderRadius: 9999,
                transformOrigin: "top left",
            }}
            transition={shouldReduceMotion ? { duration: 0 } : headerMorphTween}
        >
            <Link aria-label="Home" className="block h-full w-full" to="/">
                <Avatar size={headerGeometry.identity.avatarSize} />
            </Link>
        </motion.div>
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
                <SharedAvatar
                    mode={mode}
                    shouldReduceMotion={shouldReduceMotion}
                />
                <ThemeToggle
                    mode={mode}
                    shouldReduceMotion={shouldReduceMotion}
                />
            </div>
        </header>
    );
}
