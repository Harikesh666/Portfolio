import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { ListIcon, MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { openCommandPaletteEvent } from "../lib/command-palette";
import {
    siteDockMenuExitTween,
    siteDockMenuFrom,
    siteDockMenuSpring,
    siteDockMenuTo,
} from "../lib/motion";
import { useDockTuck } from "../lib/use-dock-tuck";

const dockLinks = [
    { to: "/", label: "Home" },
    { to: "/articles", label: "Articles" },
    { to: "/about", label: "About" },
    { to: "/resume", label: "Resume" },
    { to: "/contact", label: "Contact" },
] as const;

const articlePathPattern = /^\/articles\/[^/]+\/?$/;

/**
 * Phones only: a pill at the bottom with Search and a menu of the site's
 * pages. Phones have no header links, so this is their navigation, from the
 * top of the page down. It steps aside with the same rules as the article TOC
 * pill. Articles have no dock, because their TOC sheet carries the same links.
 */
export function SiteDock() {
    const pathname = useLocation({ select: (location) => location.pathname });
    const isArticle = articlePathPattern.test(pathname);
    const shouldReduceMotion = useReducedMotion();
    const menuId = useId();
    const menuButtonRef = useRef<HTMLButtonElement>(null);
    // The menu belongs to the page it was opened on, so it closes on navigation.
    const [openPathname, setOpenPathname] = useState<string | null>(null);
    const [isFocused, setIsFocused] = useState(false);
    const isOpen = openPathname === pathname;
    const { isFooterInView, isReadingDown } = useDockTuck(!isArticle);
    const isTucked =
        !isOpen && (isFooterInView || (isReadingDown && !isFocused));

    useEffect(() => {
        if (!isOpen) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== "Escape") return;
            setOpenPathname(null);
            menuButtonRef.current?.focus();
        };
        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [isOpen]);

    if (isArticle) return null;

    return (
        <>
            {/* A tap outside the open menu only closes it, and never also
                opens whatever link sits underneath. */}
            {isOpen && (
                <div
                    aria-hidden="true"
                    className="fixed inset-0 z-40 sm:hidden"
                    onClick={() => setOpenPathname(null)}
                />
            )}
            <div
                aria-hidden={isTucked ? true : undefined}
                className="site-dock pointer-events-none fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-1/2 z-40 -translate-x-1/2 sm:hidden"
                data-tucked={isTucked ? "" : undefined}
                inert={isTucked ? true : undefined}
                onBlur={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget)) {
                        setIsFocused(false);
                        setOpenPathname(null);
                    }
                }}
                onFocus={() => setIsFocused(true)}
            >
                <AnimatePresence>
                    {isOpen && (
                        <motion.nav
                            animate={siteDockMenuTo}
                            aria-label="Site"
                            className="pointer-events-auto absolute bottom-full left-1/2 mb-2 w-44 -translate-x-1/2 origin-bottom rounded-[1.25rem] border border-(--toc-border) bg-(--toc-surface) p-1.5 shadow-lg [corner-shape:squircle]"
                            exit={{
                                ...(shouldReduceMotion
                                    ? { opacity: 0 }
                                    : siteDockMenuFrom),
                                transition: shouldReduceMotion
                                    ? { duration: 0 }
                                    : siteDockMenuExitTween,
                            }}
                            id={menuId}
                            initial={
                                shouldReduceMotion
                                    ? { opacity: 0 }
                                    : siteDockMenuFrom
                            }
                            transition={
                                shouldReduceMotion
                                    ? { duration: 0 }
                                    : siteDockMenuSpring
                            }
                        >
                            <ul className="flex flex-col">
                                {dockLinks.map((link) => (
                                    <li key={link.to}>
                                        <Link
                                            activeOptions={{ exact: true }}
                                            className="header-link flex h-11 items-center rounded-xl px-3 text-sm font-medium"
                                            onClick={() => setOpenPathname(null)}
                                            to={link.to}
                                        >
                                            {link.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </motion.nav>
                    )}
                </AnimatePresence>
                <div className="pointer-events-auto flex h-11 items-center rounded-[1.25rem] border border-(--toc-border) bg-(--toc-surface) text-(--toc-major) shadow-lg [corner-shape:squircle]">
                    <button
                        className="inline-flex h-full items-center gap-2 rounded-l-[1.25rem] pr-3 pl-4 text-sm font-medium"
                        onClick={() => {
                            setOpenPathname(null);
                            window.dispatchEvent(new Event(openCommandPaletteEvent));
                        }}
                        type="button"
                    >
                        <MagnifyingGlassIcon aria-hidden="true" size={16} />
                        Search
                    </button>
                    <span aria-hidden="true" className="h-5 w-px bg-(--toc-border)" />
                    <button
                        aria-controls={isOpen ? menuId : undefined}
                        aria-expanded={isOpen}
                        aria-label="Site menu"
                        className="inline-flex h-full w-12 items-center justify-center rounded-r-[1.25rem]"
                        onClick={() => setOpenPathname(isOpen ? null : pathname)}
                        ref={menuButtonRef}
                        type="button"
                    >
                        {isOpen ? (
                            <XIcon aria-hidden="true" size={16} />
                        ) : (
                            <ListIcon aria-hidden="true" size={16} />
                        )}
                    </button>
                </div>
            </div>
        </>
    );
}
