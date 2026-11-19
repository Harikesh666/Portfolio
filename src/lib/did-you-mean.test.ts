import { describe, expect, it } from "vitest";
import { posts } from "./content";
import { closestPage, didYouMean, editDistance, type Suggestion } from "./did-you-mean";

const candidates: readonly Suggestion[] = [
    { kind: "page", to: "/about", label: "About" },
    { kind: "page", to: "/articles", label: "Articles" },
    { kind: "page", to: "/resume", label: "Resume" },
    { kind: "article", slug: "closures-function-backpack", label: "Closures" },
    { kind: "article", slug: "closures-beyond-the-basics", label: "Closures, deeper" },
    { kind: "article", slug: "asynchronous-javascript-event-loop", label: "The event loop" },
];

const target = (pathname: string) => {
    const match = closestPage(pathname, candidates);
    return match ? (match.kind === "page" ? match.to : match.slug) : null;
};

describe("editDistance", () => {
    it("counts insertions, deletions, substitutions and swapped neighbours as one edit each", () => {
        expect(editDistance("resume", "resume")).toBe(0);
        expect(editDistance("resum", "resume")).toBe(1);
        expect(editDistance("resumee", "resume")).toBe(1);
        expect(editDistance("rasume", "resume")).toBe(1);
        expect(editDistance("abuot", "about")).toBe(1);
    });
});

describe("closestPage", () => {
    it("forgives a typo in a page name", () => {
        expect(target("/resum")).toBe("/resume");
        expect(target("/abuot")).toBe("/about");
        expect(target("/article")).toBe("/articles");
    });

    it("ignores case, a trailing slash, a query and an .html ending", () => {
        expect(target("/Resume/")).toBe("/resume");
        expect(target("/about.html?ref=x")).toBe("/about");
    });

    it("forgives a typo in an article slug", () => {
        expect(target("/articles/closure-function-backpack")).toBe("closures-function-backpack");
        expect(target("/articles/asyncronous-javascript-event-loop")).toBe("asynchronous-javascript-event-loop");
    });

    it("matches on the last segment, so a wrong folder still finds the article", () => {
        expect(target("/blog/closures-function-backpack")).toBe("closures-function-backpack");
        expect(target("/closures-function-backpack")).toBe("closures-function-backpack");
    });

    it("accepts the start of a slug, or most of its words", () => {
        expect(target("/articles/asynchronous-javascript")).toBe("asynchronous-javascript-event-loop");
        expect(target("/articles/event-loop-javascript")).toBe("asynchronous-javascript-event-loop");
    });

    it("knows what people call a page elsewhere", () => {
        expect(target("/blog")).toBe("/articles");
        expect(target("/cv")).toBe("/resume");
    });

    it("suggests nothing when nothing is close", () => {
        expect(target("/")).toBeNull();
        expect(target("/wp-admin")).toBeNull();
        expect(target("/.env")).toBeNull();
        expect(target("/a")).toBeNull();
        expect(target("/art")).toBeNull();
        expect(target("/articles/how-to-bake-bread")).toBeNull();
    });
});

describe("didYouMean", () => {
    it("finds every published article from its slug with one letter dropped", () => {
        // A slug as short as "v8" has no letter to spare.
        for (const post of posts.filter((entry) => entry.slug.length >= 8)) {
            const match = didYouMean(`/articles/${post.slug.slice(0, 5)}${post.slug.slice(6)}`);
            expect(match).toEqual({ kind: "article", slug: post.slug, label: post.title });
        }
    });
});
