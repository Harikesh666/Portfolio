export type ContributionLevel = 0 | 1 | 2 | 3 | 4;

export type ContributionDay = Readonly<{
    date: string;
    count: number;
    level: ContributionLevel;
}>;

/** One column of the calendar. Index 0 is Sunday; null pads partial weeks. */
export type ContributionWeek = ReadonlyArray<ContributionDay | null>;

export type ContributionCalendar = Readonly<{
    total: number;
    weeks: ReadonlyArray<ContributionWeek>;
}>;

const cellPattern = /<td\b[^>]*\bdata-date="[^"]*"[^>]*>/g;
const tooltipPattern = /<tool-tip\b[^>]*\bfor="([^"]+)"[^>]*>([^<]*)<\/tool-tip>/g;

function attribute(tag: string, name: string) {
    return tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];
}

function parseCount(label: string) {
    const count = label.match(/^([\d,]+) contributions?/)?.[1];
    return count ? Number(count.replaceAll(",", "")) : 0;
}

/**
 * Parses the HTML fragment GitHub serves at
 * `https://github.com/users/<name>/contributions`. Each day is a `<td>` whose
 * id encodes its weekday row and week column, and its count lives in a
 * sibling `<tool-tip for="<id>">` label.
 */
export function parseContributionCalendar(
    html: string,
): ContributionCalendar | null {
    const counts = new Map<string, number>();
    for (const [, id, label] of html.matchAll(tooltipPattern)) {
        counts.set(id, parseCount(label.trim()));
    }

    const weeks: Array<Array<ContributionDay | null>> = [];
    for (const [tag] of html.matchAll(cellPattern)) {
        const date = attribute(tag, "data-date");
        const id = attribute(tag, "id");
        const level = Number(attribute(tag, "data-level"));
        const position = id?.match(/-(\d+)-(\d+)$/);
        if (!date || !id || !position || !(level >= 0 && level <= 4)) {
            continue;
        }

        const weekday = Number(position[1]);
        const week = Number(position[2]);
        weeks[week] ??= Array.from({ length: 7 }, () => null);
        weeks[week][weekday] = {
            date,
            count: counts.get(id) ?? 0,
            level: level as ContributionLevel,
        };
    }

    const filledWeeks = weeks.filter(Boolean);
    if (filledWeeks.length === 0) return null;

    const total = filledWeeks
        .flat()
        .reduce((sum, day) => sum + (day?.count ?? 0), 0);

    return { total, weeks: filledWeeks };
}
