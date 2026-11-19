import { posts } from "./content";

/** A real page a mistyped path probably meant: one of the site's pages, or an article by its slug. */
export type Suggestion =
    | Readonly<{ kind: "page"; to: PagePath; label: string }>
    | Readonly<{ kind: "article"; slug: string; label: string }>;

type PagePath = (typeof pages)[number]["to"];

/** The site's own pages. Home is left out: "Back to home" is always offered. */
const pages = [
    { kind: "page", to: "/about", label: "About" },
    { kind: "page", to: "/articles", label: "Articles" },
    { kind: "page", to: "/contact", label: "Contact" },
    { kind: "page", to: "/resume", label: "Resume" },
    { kind: "page", to: "/privacy", label: "Privacy" },
] as const;

/** Words people type for a page that is called something else here. */
const aliases: Readonly<Record<string, PagePath>> = {
    blog: "/articles",
    posts: "/articles",
    guides: "/articles",
    writing: "/articles",
    cv: "/resume",
    work: "/resume",
    experience: "/resume",
    me: "/about",
    bio: "/about",
    hire: "/contact",
    email: "/contact",
};

/** A path is a match within this share of the candidate's length in edits, and always within two. */
const editShare = 0.3;
/** A typed start of a slug counts from this many characters, and shared words from this share of the typed ones. */
const prefixLength = 4;
const wordShare = 0.6;

/** Lowercased, decoded, and without a query, a hash or stray slashes. */
function normalise(pathname: string) {
    let path = pathname.split(/[?#]/)[0];
    try {
        path = decodeURIComponent(path);
    } catch {
        // A malformed escape: match against the raw text.
    }
    return path
        .toLowerCase()
        .replace(/\.html?$/, "")
        .split("/")
        .filter(Boolean);
}

/** Edits between two strings: insertions, deletions, substitutions, and swaps of two neighbouring letters. */
export function editDistance(a: string, b: string) {
    const rows = a.length + 1;
    const columns = b.length + 1;
    const table = Array.from({ length: rows }, (_, i) => {
        const row = new Array<number>(columns).fill(0);
        row[0] = i;
        return row;
    });
    for (let j = 0; j < columns; j++) table[0][j] = j;
    for (let i = 1; i < rows; i++) {
        for (let j = 1; j < columns; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            table[i][j] = Math.min(table[i - 1][j] + 1, table[i][j - 1] + 1, table[i - 1][j - 1] + cost);
            if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
                table[i][j] = Math.min(table[i][j], table[i - 2][j - 2] + 1);
            }
        }
    }
    return table[a.length][b.length];
}

/**
 * How far a typed last segment is from a candidate's, from 0 (the same) up;
 * anything above 1 is not a match. Three ways to be close: a few typos, the
 * start of the slug, or most of its words in any order.
 */
function distanceTo(typed: string, slug: string) {
    const allowed = Math.max(2, Math.floor(slug.length * editShare));
    // Two edits forgive more in a long slug than in a short word like "cv".
    let score = typed.length < 4 ? Infinity : editDistance(typed, slug) / allowed;
    if (typed.length >= prefixLength && slug.startsWith(typed)) {
        score = Math.min(score, 0.5 + (0.4 * (slug.length - typed.length)) / slug.length);
    }
    const words = typed.split(/[^a-z0-9]+/).filter((word) => word.length > 2);
    const slugWords = new Set(slug.split("-"));
    const shared = words.filter((word) => slugWords.has(word)).length;
    if (shared >= 2 && shared / words.length >= wordShare) {
        score = Math.min(score, 1 - 0.5 * (shared / Math.max(words.length, slugWords.size)));
    }
    return score;
}

/**
 * The page a path that was not found most likely meant, or null when
 * nothing on the site is close. Only the last segment has to match, so
 * `/blog/closures-function-backpack` still finds the article.
 */
export function closestPage(pathname: string, candidates: readonly Suggestion[]): Suggestion | null {
    const segments = normalise(pathname);
    const typed = segments[segments.length - 1];
    if (!typed) return null;

    const alias = aliases[typed];
    if (alias) return candidates.find((candidate) => candidate.kind === "page" && candidate.to === alias) ?? null;

    let best: Suggestion | null = null;
    let bestScore = 1;
    for (const candidate of candidates) {
        const slug = candidate.kind === "page" ? candidate.to.slice(1) : candidate.slug;
        const score = distanceTo(typed, slug);
        if (score < bestScore || (score === bestScore && best === null && score <= 1)) {
            best = candidate;
            bestScore = score;
        }
    }
    return best;
}

const candidates: readonly Suggestion[] = [
    ...pages,
    ...posts.map((post) => ({ kind: "article", slug: post.slug, label: post.title }) as const),
];

/** The closest real page or article to a path that was not found, or null. */
export const didYouMean = (pathname: string) => closestPage(pathname, candidates);
