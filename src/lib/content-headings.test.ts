import { describe, expect, it } from "vitest";
import { extractTocItems } from "./content-headings";

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
