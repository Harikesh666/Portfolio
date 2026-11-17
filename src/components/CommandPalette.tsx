import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import {
    ArticleIcon,
    AtIcon,
    CopyIcon,
    DownloadSimpleIcon,
    EnvelopeIcon,
    FileTextIcon,
    FilesIcon,
    HouseIcon,
    MagnifyingGlassIcon,
    MoonIcon,
    UserIcon,
    type Icon,
} from "@phosphor-icons/react";
import { useNavigate } from "@tanstack/react-router";
import {
    filterCommands,
    openCommandPaletteEvent,
    themeToggleRequestEvent,
    type CommandItem,
} from "../lib/command-palette";
import { authoredPosts, posts } from "../lib/content";
import { site } from "../lib/site";

type PaletteAction =
    | { kind: "route"; to: "/" | "/articles" | "/about" | "/resume" | "/contact" }
    | { kind: "guide"; slug: string }
    | { kind: "theme" }
    | { kind: "copy-email" }
    | { kind: "href"; href: string };

type PaletteItem = CommandItem<PaletteAction> & { icon: Icon };

const fixedCommands: readonly PaletteItem[] = [
    { id: "page-home", group: "Pages", title: "Home", hint: "The front page", icon: HouseIcon, action: { kind: "route", to: "/" } },
    { id: "page-articles", group: "Pages", title: "Articles", hint: "Every guide, by topic", keywords: "guides writing blog", icon: FilesIcon, action: { kind: "route", to: "/articles" } },
    { id: "page-about", group: "Pages", title: "About", hint: "How I got here", icon: UserIcon, action: { kind: "route", to: "/about" } },
    { id: "page-resume", group: "Pages", title: "Resume", hint: "Experience and skills", keywords: "cv work node", icon: FileTextIcon, action: { kind: "route", to: "/resume" } },
    { id: "page-contact", group: "Pages", title: "Contact", hint: "Ways to reach me", icon: AtIcon, action: { kind: "route", to: "/contact" } },
    { id: "action-theme", group: "Actions", title: "Switch theme", hint: "Light or dark", keywords: "dark light mode", icon: MoonIcon, action: { kind: "theme" } },
    { id: "action-email", group: "Actions", title: "Send an email", hint: site.email, keywords: "mail hire contact", icon: EnvelopeIcon, action: { kind: "href", href: `mailto:${site.email}` } },
    { id: "action-copy-email", group: "Actions", title: "Copy email address", keywords: "clipboard mail", icon: CopyIcon, action: { kind: "copy-email" } },
    { id: "action-resume-pdf", group: "Actions", title: "Download resume", hint: "PDF", keywords: "cv pdf", icon: DownloadSimpleIcon, action: { kind: "href", href: site.resumePdfPath } },
];

const guideCommand = (post: (typeof posts)[number]): PaletteItem => ({
    id: `guide-${post.slug}`,
    group: "Guides",
    title: post.title,
    // Guide titles are long, so the description only helps matching; it is not shown.
    keywords: `${post.description} ${post.category}`,
    icon: ArticleIcon,
    action: { kind: "guide", slug: post.slug },
});

/** Typing searches every guide. */
const allCommands: readonly PaletteItem[] = [...fixedCommands, ...posts.map(guideCommand)];
/** An empty query shows the short list: pages, actions and the five newest guides. */
const restingCommands: readonly PaletteItem[] = [...fixedCommands, ...authoredPosts.slice(0, 5).map(guideCommand)];

/** True while the user is typing somewhere, so "/" belongs to the field. */
function isEditable(target: EventTarget | null) {
    return (
        target instanceof HTMLElement &&
        (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
    );
}

/**
 * The site's command palette: "/" or Ctrl/⌘ K opens it from anywhere, and the
 * header's search button does the same on touch. It searches pages, a few
 * actions and every guide. Built on the native <dialog>, which supplies the
 * focus trap, the inert page behind it, Escape and focus return. While open it
 * tracks the visual viewport, so on a phone the list ends above the keyboard.
 * Styling and timing live in `styles.css` (`.command-palette`).
 */
export function CommandPalette() {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [query, setQuery] = useState("");
    const [activeIndex, setActiveIndex] = useState(0);
    const [copied, setCopied] = useState(false);
    const navigate = useNavigate();

    const isSearching = query.trim() !== "";
    const results = filterCommands(isSearching ? allCommands : restingCommands, query);
    const active = results[Math.min(activeIndex, results.length - 1)];

    function syncViewportHeight() {
        const height = window.visualViewport?.height ?? window.innerHeight;
        dialogRef.current?.style.setProperty("--palette-viewport", `${Math.round(height)}px`);
    }

    function open() {
        const dialog = dialogRef.current;
        if (!dialog || dialog.open || document.querySelector("dialog[open]")) return;
        setQuery("");
        setActiveIndex(0);
        setCopied(false);
        syncViewportHeight();
        window.visualViewport?.addEventListener("resize", syncViewportHeight);
        dialog.showModal();
        document.documentElement.style.overflow = "hidden";
        inputRef.current?.focus();
    }

    function close() {
        dialogRef.current?.close();
    }

    useEffect(() => {
        function handleKeyDown(event: globalThis.KeyboardEvent) {
            const isShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
            const isSlash = event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey && !isEditable(event.target);
            if (!isShortcut && !isSlash) return;
            event.preventDefault();
            open();
        }
        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener(openCommandPaletteEvent, open);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener(openCommandPaletteEvent, open);
            window.visualViewport?.removeEventListener("resize", syncViewportHeight);
        };
    }, []);

    // Keep the highlighted row in view as the arrow keys move through a long list.
    useEffect(() => {
        if (!active) return;
        document.getElementById(`palette-${active.id}`)?.scrollIntoView({ block: "nearest" });
    }, [active]);

    function run(item: PaletteItem) {
        const action = item.action;
        if (action.kind === "copy-email") {
            void navigator.clipboard?.writeText(site.email).then(() => setCopied(true));
            return;
        }
        close();
        if (action.kind === "route") void navigate({ to: action.to });
        else if (action.kind === "guide") void navigate({ to: "/articles/$slug", params: { slug: action.slug } });
        else if (action.kind === "href") window.location.href = action.href;
        else {
            // Let the palette leave the top layer first, so the theme reveal snapshot doesn't catch it.
            requestAnimationFrame(() => window.dispatchEvent(new Event(themeToggleRequestEvent)));
        }
    }

    function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
        if (results.length === 0) return;
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            const step = event.key === "ArrowDown" ? 1 : -1;
            setActiveIndex((index) => (Math.min(index, results.length - 1) + step + results.length) % results.length);
        } else if (event.key === "Enter" && active) {
            event.preventDefault();
            run(active);
        }
    }

    return (
        <dialog
            aria-label="Search the site"
            className="command-palette"
            onClick={(event) => {
                // A click on the dialog itself, outside the panel, is a click on the backdrop.
                if (event.target === event.currentTarget) close();
            }}
            onClose={() => {
                document.documentElement.style.overflow = "";
                window.visualViewport?.removeEventListener("resize", syncViewportHeight);
            }}
            ref={dialogRef}
        >
            <div className="command-palette__panel">
                <div className="command-palette__field">
                    <MagnifyingGlassIcon aria-hidden="true" className="shrink-0" size={18} />
                    <input
                        aria-activedescendant={active ? `palette-${active.id}` : undefined}
                        aria-autocomplete="list"
                        aria-controls="palette-results"
                        aria-expanded="true"
                        autoComplete="off"
                        className="command-palette__input"
                        enterKeyHint="go"
                        onChange={(event) => {
                            setQuery(event.target.value);
                            setActiveIndex(0);
                        }}
                        onKeyDown={handleInputKeyDown}
                        placeholder="Search guides and pages"
                        ref={inputRef}
                        role="combobox"
                        spellCheck={false}
                        type="text"
                        value={query}
                    />
                    <button
                        aria-label="Close search"
                        className="command-palette__close"
                        onClick={close}
                        type="button"
                    >
                        <span className="command-palette__esc">esc</span>
                        <span className="command-palette__cancel">Cancel</span>
                    </button>
                </div>
                <ul
                    aria-label="Results"
                    className="command-palette__list"
                    id="palette-results"
                    role="listbox"
                >
                    {results.map((item, index) => {
                        const showGroup = index === 0 || results[index - 1].group !== item.group;
                        const isActive = item.id === active?.id;
                        const ItemIcon = item.icon;
                        const groupLabel = item.group === "Guides" && !isSearching ? "Latest guides" : item.group;
                        return (
                            <li key={item.id} role="presentation">
                                {showGroup && (
                                    <p aria-hidden="true" className="command-palette__group">
                                        {groupLabel}
                                    </p>
                                )}
                                <div
                                    aria-selected={isActive}
                                    className="command-palette__option"
                                    data-active={isActive ? "" : undefined}
                                    id={`palette-${item.id}`}
                                    onClick={() => run(item)}
                                    onPointerMove={() => {
                                        if (!isActive) setActiveIndex(index);
                                    }}
                                    role="option"
                                >
                                    <ItemIcon aria-hidden="true" className="command-palette__icon" size={16} />
                                    <span className="command-palette__title">
                                        {item.action.kind === "copy-email" && copied ? "Copied to clipboard" : item.title}
                                    </span>
                                    {item.hint && <span className="command-palette__hint">{item.hint}</span>}
                                </div>
                            </li>
                        );
                    })}
                </ul>
                {results.length === 0 && (
                    <p className="command-palette__empty">No matches for “{query.trim()}”.</p>
                )}
                <p aria-hidden="true" className="command-palette__keys">
                    <span><kbd>↑</kbd><kbd>↓</kbd> to move</span>
                    <span><kbd>↵</kbd> to open</span>
                    <span><kbd>esc</kbd> to close</span>
                </p>
            </div>
        </dialog>
    );
}
