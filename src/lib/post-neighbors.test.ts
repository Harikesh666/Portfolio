import { describe, expect, it } from "vitest";

import { findPostNeighbors } from "./post-neighbors";

const posts = [
    { slug: "series-one", series: "series" },
    { slug: "series-two", series: "series" },
    { slug: "topic-first", topic: "topic" },
    { slug: "topic-second", topic: "topic" },
    { slug: "topic-third", topic: "topic" },
];

describe("findPostNeighbors", () => {
    it("keeps navigation inside an ordered series", () => {
        const neighbors = findPostNeighbors(posts, posts[0]);

        expect(neighbors.previous).toBeUndefined();
        expect(neighbors.next?.slug).toBe("series-two");
    });

    it("keeps navigation inside a topic reading path", () => {
        const neighbors = findPostNeighbors(posts, posts[3]);

        expect(neighbors.previous?.slug).toBe("topic-first");
        expect(neighbors.next?.slug).toBe("topic-third");
    });
});
