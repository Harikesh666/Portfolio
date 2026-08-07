import { describe, expect, it } from "vitest";

import { findPostNeighbors } from "./post-neighbors";

const posts = [
    { slug: "series-one", series: "series" },
    { slug: "series-two", series: "series" },
    { slug: "topic-newest", topic: "topic" },
    { slug: "topic-middle", topic: "topic" },
    { slug: "topic-oldest", topic: "topic" },
];

describe("findPostNeighbors", () => {
    it("keeps navigation inside an ordered series", () => {
        const neighbors = findPostNeighbors(posts, posts[0]);

        expect(neighbors.previous).toBeUndefined();
        expect(neighbors.next?.slug).toBe("series-two");
    });

    it("keeps navigation inside an ordered topic", () => {
        const neighbors = findPostNeighbors(posts, posts[3]);

        expect(neighbors.previous?.slug).toBe("topic-newest");
        expect(neighbors.next?.slug).toBe("topic-oldest");
    });
});
