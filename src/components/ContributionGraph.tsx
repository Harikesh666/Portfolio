import calendar from "virtual:github-contributions";
import { site } from "../lib/site";

/** Weeks kept on narrow screens so each cell stays legible. */
const compactWeekCount = 26;

const numberFormat = new Intl.NumberFormat("en-US");

export function ContributionGraph() {
    if (!calendar) return null;

    const { total, weeks } = calendar;
    const firstCompactWeek = Math.max(0, weeks.length - compactWeekCount);
    const summary = `${numberFormat.format(total)} contributions in the last year`;

    return (
        <figure className="m-0">
            <a
                aria-label={`${summary} on GitHub`}
                className="block rounded-md"
                href={site.socials.github}
                rel="noreferrer"
                target="_blank"
            >
                <div
                    aria-hidden="true"
                    className="grid grid-flow-col grid-rows-7 gap-[3px] [grid-auto-columns:minmax(0,1fr)]"
                >
                    {weeks.flatMap((week, weekIndex) =>
                        week.map((day, weekday) => (
                            <span
                                className={`contribution-cell${
                                    weekIndex < firstCompactWeek
                                        ? " max-sm:hidden"
                                        : ""
                                }${day ? "" : " invisible"}`}
                                data-level={day?.level ?? 0}
                                key={day?.date ?? `${weekIndex}-${weekday}`}
                                title={
                                    day
                                        ? `${day.count} on ${day.date}`
                                        : undefined
                                }
                            />
                        )),
                    )}
                </div>
            </a>
            <figcaption className="mt-3 flex items-center justify-between gap-4 text-[13px] text-muted">
                <span className="tabular-nums">{summary}</span>
                <span aria-hidden="true" className="flex items-center gap-1">
                    Less
                    {([0, 1, 2, 3, 4] as const).map((level) => (
                        <span
                            className="contribution-cell size-2.5"
                            data-level={level}
                            key={level}
                        />
                    ))}
                    More
                </span>
            </figcaption>
        </figure>
    );
}
