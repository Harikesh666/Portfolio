const storageKey = "portfolio-scroll-positions";
const maxEntries = 50;

/**
 * Remembers the scroll offset of each history entry. Positions live in memory
 * while the page runs and are written to sessionStorage when the page hides,
 * so a reload or a tab the phone discarded in the background still returns
 * the reader to the same place on Back.
 */
export function createScrollPositions() {
    const positions = new Map<string, number>(readStoredPositions());

    function persist() {
        try {
            const entries = Array.from(positions).slice(-maxEntries);
            window.sessionStorage.setItem(storageKey, JSON.stringify(entries));
        } catch {
            // Storage can be full or blocked. Positions then last for this load.
        }
    }

    return {
        get: (key: string) => positions.get(key),
        set(key: string, scrollY: number) {
            positions.delete(key);
            positions.set(key, scrollY);
        },
        persist,
    };
}

export type ScrollPositions = ReturnType<typeof createScrollPositions>;

function readStoredPositions(): Array<[string, number]> {
    if (typeof window === "undefined") return [];
    try {
        const parsed: unknown = JSON.parse(
            window.sessionStorage.getItem(storageKey) ?? "[]",
        );
        if (!Array.isArray(parsed)) return [];
        return parsed.filter(
            (entry): entry is [string, number] =>
                Array.isArray(entry) &&
                typeof entry[0] === "string" &&
                typeof entry[1] === "number",
        );
    } catch {
        return [];
    }
}
