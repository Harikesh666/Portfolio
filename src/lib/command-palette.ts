/** Dispatch on `window` to open the palette, e.g. from the footer's Search button. */
export const openCommandPaletteEvent = "open-command-palette";
/** Dispatch on `window` to ask the header's theme toggle to switch, with its reveal. */
export const themeToggleRequestEvent = "theme-toggle-request";

export type CommandGroup = "Pages" | "Actions" | "Guides";

export type CommandItem<Action> = Readonly<{
    id: string;
    group: CommandGroup;
    title: string;
    /** A short second line: a page's purpose or a guide's description. */
    hint?: string;
    /** Extra words that should match but are not shown. */
    keywords?: string;
    action: Action;
}>;

const groupOrder: readonly CommandGroup[] = ["Pages", "Actions", "Guides"];

/**
 * Filters and orders palette items for a query. Every word of the query must
 * appear somewhere in the item (title, hint or keywords), in any order. Within
 * each group, titles that start with the query come first, then titles that
 * contain it, then items that only match elsewhere. An empty query keeps the
 * original order. Groups always appear Pages, Actions, Guides.
 */
export function filterCommands<Item extends CommandItem<unknown>>(
    items: readonly Item[],
    query: string,
): Item[] {
    const needle = query.trim().toLowerCase();
    const words = needle.split(/\s+/).filter(Boolean);

    const scored = items
        .map((item, index) => {
            const title = item.title.toLowerCase();
            const haystack = `${title} ${item.hint ?? ""} ${item.keywords ?? ""}`.toLowerCase();
            if (!words.every((word) => haystack.includes(word))) return undefined;
            const rank = !needle ? 0 : title.startsWith(needle) ? 0 : title.includes(needle) ? 1 : 2;
            return { item, index, rank };
        })
        .filter((entry) => entry !== undefined);

    return scored
        .sort(
            (a, b) =>
                groupOrder.indexOf(a.item.group) - groupOrder.indexOf(b.item.group) ||
                a.rank - b.rank ||
                a.index - b.index,
        )
        .map((entry) => entry.item);
}
