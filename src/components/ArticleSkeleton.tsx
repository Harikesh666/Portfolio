/**
 * The shape of an article body while it loads: paragraphs, a section
 * heading and a code block, in the prose column's rhythm. It fades in only
 * if loading takes a moment, so quick loads never flash it.
 */

/** Line widths per paragraph, as a share of the column. */
const opening = [100, 96, 98, 64];
const second = [97, 100, 93, 99, 41];
const afterHeading = [100, 94, 98, 72];
const afterCode = [98, 100, 88];

function Paragraph({ lines, start }: Readonly<{ lines: readonly number[]; start: number }>) {
    return (
        <div className="article-skeleton__paragraph">
            {lines.map((width, index) => (
                <span
                    className="article-skeleton__line"
                    key={index}
                    style={{ width: `${width}%`, "--line": start + index } as React.CSSProperties}
                />
            ))}
        </div>
    );
}

export function ArticleSkeleton() {
    return (
        <div aria-hidden="true" className="article-skeleton mt-10">
            <Paragraph lines={opening} start={0} />
            <Paragraph lines={second} start={4} />
            <span className="article-skeleton__heading" style={{ "--line": 9 } as React.CSSProperties} />
            <Paragraph lines={afterHeading} start={10} />
            <span className="article-skeleton__code" style={{ "--line": 14 } as React.CSSProperties} />
            <Paragraph lines={afterCode} start={15} />
        </div>
    );
}
