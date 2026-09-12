import { describe, expect, it } from "vitest";

import { authoredPosts, getPostNeighbors, posts } from "./content";

describe("article collections", () => {
    it("uses topic reading order without changing homepage recency", () => {
        const asyncPosts = posts.filter(
            (post) => post.topic === "async-and-concurrency",
        );

        expect(asyncPosts.map((post) => post.slug)).toEqual([
            "javascript-concurrency-one-thread-many-tasks",
            "asynchronous-javascript-event-loop",
            "settimeout-minimum-not-deadline",
            "settimeout-closures-var-let-loop",
            "callback-hell-pyramid-of-doom",
        ]);
        expect(getPostNeighbors(asyncPosts[2])).toMatchObject({
            previous: { slug: "asynchronous-javascript-event-loop" },
            next: { slug: "settimeout-closures-var-let-loop" },
        });
        expect(authoredPosts.every((post) => !post.series)).toBe(true);
        expect(authoredPosts).toEqual(
            [...authoredPosts].sort((first, second) =>
                second.publishedAt.localeCompare(first.publishedAt),
            ),
        );
    });
});
