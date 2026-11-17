import { describe, expect, it } from "vitest";
import { filterCommands, type CommandItem } from "./command-palette";

const items: CommandItem<string>[] = [
    { id: "g1", group: "Guides", title: "The event loop", hint: "How JavaScript schedules work", action: "a" },
    { id: "p1", group: "Pages", title: "Resume", hint: "Experience and skills", action: "b" },
    { id: "g2", group: "Guides", title: "Promises and the microtask queue", hint: "Why then runs later", action: "c" },
    { id: "a1", group: "Actions", title: "Switch theme", keywords: "dark light mode", action: "d" },
    { id: "g3", group: "Guides", title: "Loop optimisation in V8", hint: "Hot loops", action: "e" },
];

const ids = (query: string) => filterCommands(items, query).map((item) => item.id);

describe("filterCommands", () => {
    it("keeps every item, grouped Pages, Actions, Guides, for an empty query", () => {
        expect(ids("")).toEqual(["p1", "a1", "g1", "g2", "g3"]);
    });

    it("matches every word in any order, across title, hint and keywords", () => {
        expect(ids("queue microtask")).toEqual(["g2"]);
        expect(ids("dark")).toEqual(["a1"]);
        expect(ids("schedules")).toEqual(["g1"]);
    });

    it("ranks titles that start with the query above titles that only contain it", () => {
        expect(ids("loop")).toEqual(["g3", "g1"]);
    });

    it("ignores case and surrounding spaces, and returns nothing when a word is missing", () => {
        expect(ids("  RESUME ")).toEqual(["p1"]);
        expect(ids("resume kafka")).toEqual([]);
    });
});
