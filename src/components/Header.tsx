import { useEffect, useRef, useState } from "react";
import { MagnifyingGlassIcon, MoonIcon, SunIcon } from "@phosphor-icons/react";
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
    themeRevealTiming,
    themeToggleIconVariants,
} from "../lib/motion";
import { openCommandPaletteEvent, themeToggleRequestEvent } from "../lib/command-palette";
import { posts } from "../lib/content";
import { site } from "../lib/site";
import { syncThemeColor } from "../lib/theme-color";

type HeaderMode = "breadcrumb" | "identity";

const headerLinks = [
    { to: "/articles", label: "Articles" },
    { to: "/about", label: "About" },
    { to: "/resume", label: "Resume" },
] as const;

const avatarSize = {
    identity: 40, // h-10 → 40px, the height of the leading-6 name plus leading-4 role
    breadcrumb: 24, // h-6 → 24px
} as const;

/*
 * Vertical geometry, as Tailwind classes so phones and wider screens get their
 * own constants with no runtime measuring. Phones have no link band: their
 * pages are reached from the bottom dock, so the identity row moves up to the
 * toggle's line.
 * - Toggle, phones, both modes: py-4 → 16px, so its center is 16 + 44 / 2 →
 *   38px and it stays put when an article opens.
 * - Toggle, from sm, identity: the identity row center (96 + 20) minus half
 *   the h-11 target (22) → 94px. Breadcrumb: py-4 → 16px.
 * - Avatar, identity, phones: centered on the toggle, 38 - 40 / 2 → 18px.
 *   From sm: pt-24 → 96px. Breadcrumb: py-4 (16px) + centered within h-11
 *   ((44px - 24px) / 2) → 26px, also centered on 38px.
 * - Height, identity, phones: pt-[18px] + leading-6 name + leading-4 role →
 *   18 + 24 + 16 = 58px. From sm: 96 + 24 + 16 = 136px. Breadcrumb: py-4 +
 *   h-11 + py-4 → 76px.
 */
const toggleOffsetClassName = {
    identity: "translate-y-4 sm:translate-y-[94px]",
    breadcrumb: "translate-y-4",
} as const;

const avatarOffsetClassName = {
    identity: "translate-y-[18px] sm:translate-y-24",
    breadcrumb: "translate-y-[26px]",
} as const;

const headerHeightClassName = {
    identity: "h-[58px] sm:h-[136px]",
    breadcrumb: "h-[76px]",
} as const;

// `translate` is its own CSS property, so this never fights Motion's scale on `transform`.
const morphTranslateTransition = `translate ${headerMorphTween.duration}s cubic-bezier(${headerMorphTween.ease.join(", ")})`;

const avatarBreadcrumbScale = avatarSize.breadcrumb / avatarSize.identity;

function getHeaderPost(pathname: string) {
    const slug = pathname.match(/^\/articles\/([^/]+)\/?$/)?.[1];

    return slug ? posts.find((entry) => entry.slug === slug) : undefined;
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
                // The dark hair and backdrop melt into the dark page without a hairline edge.
                className="rounded-full object-cover dark:ring-1 dark:ring-divider"
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
    const buttonRef = useRef<HTMLButtonElement>(null);
    const iconDirection = theme === "dark" ? 1 : -1;

    useEffect(() => {
        const current = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
        setTheme(current);
        // The status bar follows the saved theme, not only the phone's own setting.
        syncThemeColor(current);
    }, []);

    // The command palette's "Switch theme" asks for the same toggle, reveal included.
    useEffect(() => {
        window.addEventListener(themeToggleRequestEvent, toggleTheme);
        return () => window.removeEventListener(themeToggleRequestEvent, toggleTheme);
    });

    function toggleTheme() {
        const nextTheme = theme === "dark" ? "light" : "dark";
        const applyTheme = () => {
            document.documentElement.dataset.theme = nextTheme;
            syncThemeColor(nextTheme);
            window.localStorage.setItem("theme", nextTheme);
            setTheme(nextTheme);
            // Canvases that only repaint on demand, like the footer water, listen for this.
            window.dispatchEvent(new Event("themechange"));
        };

        if (shouldReduceMotion || !document.startViewTransition) {
            applyTheme();
            return;
        }

        // The new theme grows as a circle from the toggle until it covers the farthest corner.
        const bounds = buttonRef.current?.getBoundingClientRect() ?? new DOMRect(window.innerWidth, 0, 0, 0);
        const x = bounds.left + bounds.width / 2;
        const y = bounds.top + bounds.height / 2;
        const radius = Math.hypot(
            Math.max(x, window.innerWidth - x),
            Math.max(y, window.innerHeight - y),
        );

        themeTransitionId.current += 1;
        const transitionId = String(themeTransitionId.current);
        document.documentElement.dataset.themeTransition = transitionId;

        const transition = document.startViewTransition(applyTheme);
        void transition.ready.then(() => {
            document.documentElement.animate(
                {
                    clipPath: [
                        `circle(0px at ${x}px ${y}px)`,
                        `circle(${radius}px at ${x}px ${y}px)`,
                    ],
                },
                {
                    ...themeRevealTiming,
                    pseudoElement: "::view-transition-new(root)",
                },
            );
        });
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
            className={`absolute z-10 inline-flex min-h-11 min-w-11 items-center justify-center text-muted hover:text-foreground-strong ${toggleOffsetClassName[mode]}`}
            style={{
                top: 0,
                right: 20,
                transition: shouldReduceMotion ? "none" : morphTranslateTransition,
            }}
            type="button"
            aria-label="Toggle theme"
            aria-pressed={theme === "dark"}
            onClick={toggleTheme}
            ref={buttonRef}
            whileHover={shouldReduceMotion ? undefined : themeToggleButtonHover}
            whileTap={shouldReduceMotion ? undefined : themeToggleButtonTap}
            transition={shouldReduceMotion ? { duration: 0 } : snappySpring}
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
        <div className="relative flex items-center gap-3 px-5 pt-[18px] sm:pt-24">
            <span aria-hidden="true" className="h-10 w-10 shrink-0" />
            <p className="flex min-w-0 flex-col font-medium">
                <Link
                    className="w-fit leading-6 text-foreground-strong"
                    to="/"
                >
                    {site.name}
                </Link>
                <span className="leading-4 text-muted">Software Engineer</span>
            </p>
            {/*
              * From sm the links and search join the identity row; mr-12 clears
              * the toggle. Phones have no links here: the bottom dock carries
              * them, so the header is only the name and the toggle.
              */}
            <nav
                aria-label="Primary"
                className="ml-auto mr-12 hidden items-center gap-5 text-[13px] font-medium sm:flex"
            >
                {headerLinks.map((link) => (
                    <Link
                        className="header-link inline-flex items-center"
                        key={link.to}
                        to={link.to}
                    >
                        {link.label}
                    </Link>
                ))}
                <button
                    aria-label="Search the site"
                    className="header-link -mx-1 inline-flex h-7 w-7 items-center justify-center"
                    onClick={() => window.dispatchEvent(new Event(openCommandPaletteEvent))}
                    title="Search (press /)"
                    type="button"
                >
                    <MagnifyingGlassIcon aria-hidden="true" size={16} />
                </button>
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
            animate={{ scale }}
            className={`absolute z-10 ${avatarOffsetClassName[mode]}`}
            initial={false}
            style={{
                top: 0,
                left: 20,
                width: avatarSize.identity,
                height: avatarSize.identity,
                borderRadius: 9999,
                transformOrigin: "top left",
                transition: shouldReduceMotion ? "none" : morphTranslateTransition,
            }}
            transition={shouldReduceMotion ? { duration: 0 } : headerMorphTween}
        >
            <Link aria-label="Home" className="block h-full w-full rounded-full" to="/">
                <Avatar size={avatarSize.identity} />
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
            <div className={`relative min-w-0 ${headerHeightClassName[mode]}`}>
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
