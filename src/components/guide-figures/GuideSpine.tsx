/*
 * A guide's spine: the order its sections build in, drawn as a rail.
 * Section numbers jump to their headings (the click finds the "N." heading
 * and sets the hash, so the jump joins the browser history like a TOC row).
 * Props come straight from the MDX as plain JSON.
 */

type SpineStop = Readonly<{ title: string; sections: readonly number[]; note?: string }>;

function isStop(value: unknown): value is SpineStop {
    if (typeof value !== "object" || value === null) return false;
    const stop = value as Record<string, unknown>;
    return typeof stop.title === "string" && Array.isArray(stop.sections) && stop.sections.every((n) => typeof n === "number");
}

function jumpTo(section: number) {
    const heading = [...document.querySelectorAll<HTMLHeadingElement>("h2[id]")].find((candidate) =>
        candidate.textContent?.trim().startsWith(`${section}.`),
    );
    if (heading) window.location.hash = heading.id;
}

export function GuideSpine({ steps }: Readonly<{ steps?: unknown }>) {
    const stops = Array.isArray(steps) ? steps.filter(isStop) : [];
    if (stops.length === 0) return null;
    return (
        <figure className="el-figure gf-figure gf-spine not-prose">
            <ol className="gf-spine__stops">
                {stops.map((stop) => (
                    <li className="gf-spine__stop" data-key={stop.note ? "" : undefined} key={stop.title}>
                        <span aria-hidden="true" className="gf-spine__dot" />
                        <span className="gf-spine__title">{stop.title}</span>
                        <span className="gf-spine__sections">
                            {stop.sections.map((section) => (
                                <button
                                    aria-label={`Go to section ${section}`}
                                    className="gf-spine__section"
                                    key={section}
                                    onClick={() => jumpTo(section)}
                                    type="button"
                                >
                                    {section}
                                </button>
                            ))}
                        </span>
                        {stop.note && <span className="gf-spine__note">{stop.note}</span>}
                    </li>
                ))}
            </ol>
            <figcaption className="el-figcaption">The order the sections build in. Select a number to jump to that section.</figcaption>
        </figure>
    );
}
