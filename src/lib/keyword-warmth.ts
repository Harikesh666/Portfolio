/*
 * Touch screens have no hover, so intro keywords warm by where the reader is
 * looking instead: while their paragraph sits in the middle band of the
 * screen, the paragraph carries `data-warm`, and CSS turns the keywords to
 * their own colours (`.intro-keywords[data-warm]` in styles.css). Leaving the
 * band cools them again, the way moving the pointer away does on desktop.
 * Pointer devices keep hover and never get the attribute.
 */

/** The same test as the CSS that gives fine pointers the hover version. */
const hoverQuery = "(hover: hover) and (pointer: fine)";
/** The middle 40% of the viewport: comfortably in view, not just peeking in. */
const readingBand = "-30% 0px -30% 0px";

type Watch = { users: number; stop: () => void };
const watches = new WeakMap<Element, Watch>();

function watch(host: Element) {
    const observer = new IntersectionObserver(([entry]) => {
        host.toggleAttribute("data-warm", entry.isIntersecting);
    }, { rootMargin: readingBand });
    observer.observe(host);
    return () => {
        observer.disconnect();
        host.removeAttribute("data-warm");
    };
}

/**
 * Starts watching the keyword's `.intro-keywords` paragraph on touch screens.
 * Every keyword in a paragraph calls this, and the paragraph is watched once.
 * Returns the cleanup.
 */
export function warmKeywordsInView(keyword: Element) {
    const host = keyword.closest(".intro-keywords");
    if (!host || typeof IntersectionObserver === "undefined" || window.matchMedia(hoverQuery).matches) return () => {};
    const existing = watches.get(host);
    const current = existing ?? { users: 0, stop: watch(host) };
    current.users += 1;
    watches.set(host, current);
    return () => {
        current.users -= 1;
        if (current.users > 0) return;
        current.stop();
        watches.delete(host);
    };
}
