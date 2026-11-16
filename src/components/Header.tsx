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

const headerLinks = [
    { to: "/articles", label: "Articles" },
    { to: "/about", label: "About" },
    { to: "/resume", label: "Resume" },
] as const;

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
        avatarSize: 40, // h-10 → 40px, the height of the leading-6 name plus leading-4 role
        avatarY: 96, // pt-24 → 96px
        height: 136, // pt-24 + leading-6 name + leading-4 role → 96 + 24 + 16 = 136px
        toggleY: 94, // identity row center (96 + 20) minus half the h-11 target (22) → 94px
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
            // Canvases that only repaint on demand, like the footer water, listen for this.
            window.dispatchEvent(new Event("themechange"));
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
        <div className="relative flex items-center gap-3 px-5 pt-24">
            <span aria-hidden="true" className="h-10 w-10 shrink-0" />
            <p className="flex min-w-0 flex-col pr-14 font-medium sm:pr-0">
                <Link
                    className="w-fit leading-6 text-foreground-strong"
                    to="/"
                >
                    {site.name}
                </Link>
                <span className="leading-4 text-muted">Software Engineer</span>
            </p>
            {/*
              * Phones: the name and links don't fit in one row, so the links sit
              * in the empty band above it (inside pt-24, no geometry change), with
              * 40px targets. From sm they join the row; mr-12 clears the toggle.
              */}
            <nav
                aria-label="Primary"
                className="absolute top-4 right-3 flex items-center text-[13px] font-medium sm:static sm:mr-12 sm:ml-auto sm:gap-5"
            >
                {headerLinks.map((link) => (
                    <Link
                        className="header-link inline-flex h-10 items-center px-2 sm:h-auto sm:px-0"
                        key={link.to}
                        to={link.to}
                    >
                        {link.label}
                    </Link>
                ))}
            </nav>
        </div>
    );
}

function BreadcrumbHeader({ postTitle }: Readonly<{ postTitle: string }>) {
    return (
        <div className="flex min-w-0 items-center gap-2 px-5 py-4 text-sm">
            <span aria-hidden="true" className="h-6 w-6 shrink-0" />
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
            <Link aria-label="Home" className="block h-full w-full rounded-full" to="/">
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
