import { describe, expect, it } from "vitest";
import { extractMinimapItems, extractTocItems } from "./content-headings";

describe("extractTocItems", () => {
    it("matches rendered heading ids and excludes guide-only sections", () => {
        const source = `---
title: Example
---

## Read this first
## Table of Contents
## 1. State **updates** & queues
### Nested heading
## Further reading (primary sources)
`;

        expect(extractTocItems(source)).toEqual([
            { id: "1-state-updates-queues", title: "1. State updates & queues" },
            {
                id: "further-reading-primary-sources",
                title: "Further reading (primary sources)",
            },
        ]);
    });
});

describe("extractMinimapItems", () => {
    it("keeps duplicate ids aligned with rendered heading ids", () => {
        const source = `
## Same
### Same
## Same
`;

        expect(extractTocItems(source)).toEqual([
            { id: "same", title: "Same" },
            { id: "same-3", title: "Same" },
        ]);
    });

    it("keeps Rare's major-to-body rhythm in source order", () => {
        const source = `
## First
### The itch
#### Deep one
#### Deep two
#### Deep three
### Meaningful fallback
## Second
### The short version
### Another section
`;

        expect(extractMinimapItems(source)).toEqual([
            { id: "first", title: "First", kind: "title" },
            { id: "the-itch", title: "The itch", kind: "body" },
            { id: "deep-one", title: "Deep one", kind: "body" },
            { id: "deep-two", title: "Deep two", kind: "body" },
            { id: "deep-three", title: "Deep three", kind: "body" },
            {
                id: "meaningful-fallback",
                title: "Meaningful fallback",
                kind: "body",
            },
            { id: "second", title: "Second", kind: "body" },
            {
                id: "the-short-version",
                title: "The short version",
                kind: "body",
            },
            {
                id: "another-section",
                title: "Another section",
                kind: "title",
            },
        ]);
    });

    it("caps large minimaps at Rare's six-to-thirty-four rhythm", () => {
        const source = Array.from(
            { length: 45 },
            (_, index) => `## Section ${index + 1}`,
        ).join("\n");
        const minimap = extractMinimapItems(source);

        expect(minimap).toHaveLength(34);
        expect(minimap[0]).toEqual({
            id: "section-1",
            title: "Section 1",
            kind: "title",
        });
        expect(minimap.filter((item) => item.kind === "title")).toHaveLength(6);
        expect(minimap.filter((item) => item.kind === "body")).toHaveLength(28);
        expect(
            minimap.flatMap((item, index) =>
                item.kind === "title" ? [index] : [],
            ),
        ).toEqual([0, 7, 13, 20, 26, 33]);
    });
});
