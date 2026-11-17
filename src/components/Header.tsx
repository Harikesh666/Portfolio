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

type HeaderMode = "breadcrumb" | "identity";

const headerLinks = [
    { to: "/articles", label: "Articles" },
    { to: "/about", label: "About" },
    { to: "/resume", label: "Resume" },
] as const;

const headerGeometry = {
    identity: {
        avatarSize: 40, // h-10 → 40px, the height of the leading-6 name plus leading-4 role
        avatarY: 96, // pt-24 → 96px
        height: 136, // pt-24 + leading-6 name + leading-4 role → 96 + 24 + 16 = 136px
    },
    breadcrumb: {
        avatarSize: 24, // h-6 → 24px
        avatarY: 26, // py-4 (16px) + centered within h-11 ((44px - 24px) / 2) → 26px
        height: 76, // py-4 + h-11 + py-4 → 76px
    },
} as const;

/*
 * The toggle's vertical offset, as Tailwind `translate` classes so phones and
 * wider screens get their own constants with no runtime measuring.
 * - Phones, both modes: in the link band at the top, py-4 → 16px. So on phones
 *   the toggle stays put when an article opens.
 * - From sm, identity: the identity row center (96 + 20) minus half the h-11
 *   target (22) → 94px. Breadcrumb: py-4 → 16px.
 */
const toggleOffsetClassName = {
    identity: "translate-y-4 sm:translate-y-[94px]",
    breadcrumb: "translate-y-4",
} as const;

// `translate` is its own CSS property, so this never fights Motion's hover scale on `transform`.
const toggleMorphTransition = `translate ${headerMorphTween.duration}s cubic-bezier(${headerMorphTween.ease.join(", ")})`;

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
    const buttonRef = useRef<HTMLButtonElement>(null);
    const iconDirection = theme === "dark" ? 1 : -1;

    useEffect(() => {
        setTheme(
            document.documentElement.dataset.theme === "dark"
                ? "dark"
                : "light",
        );
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
                transition: shouldReduceMotion ? "none" : toggleMorphTransition,
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
        <div className="relative flex items-center gap-3 px-5 pt-24">
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
              * Phones: the name and links don't fit in one row, so the links, the
              * search button and the theme toggle share the empty band above it
              * (inside pt-24, no geometry change) as one bar, with 44px targets. right-16 clears the toggle
              * (right 20px + 44px). From sm the links join the row; mr-12 clears it.
              */}
            <nav
                aria-label="Primary"
                className="absolute top-4 right-16 flex items-center text-[13px] font-medium sm:static sm:mr-12 sm:ml-auto sm:gap-5"
            >
                {headerLinks.map((link) => (
                    <Link
                        className="header-link inline-flex h-11 items-center px-2 sm:h-auto sm:px-0"
                        key={link.to}
                        to={link.to}
                    >
                        {link.label}
                    </Link>
                ))}
                <button
                    aria-label="Search the site"
                    className="header-link inline-flex h-11 w-10 items-center justify-center sm:-mx-1 sm:h-7 sm:w-7"
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
