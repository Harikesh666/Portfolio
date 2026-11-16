import type { Icon } from "@phosphor-icons/react";

type IntroKeywordProps = Readonly<{
    children: string;
    icon: Icon;
    /** Picks the hue token the keyword turns when the paragraph is hovered. */
    tone: "ship" | "learn" | "backend";
    /** Position in the paragraph; staggers the colour change left to right. */
    index: number;
}>;

/**
 * A word in the home intro that warms from neutral to its own colour, with
 * a small icon, while the reader's pointer or focus is in the paragraph.
 * Styling and timing live in `styles.css` (`.intro-keyword`).
 */
export function IntroKeyword({ children, icon: KeywordIcon, index, tone }: IntroKeywordProps) {
    return (
        <span
            className="intro-keyword"
            data-tone={tone}
            style={{ "--keyword-index": index } as React.CSSProperties}
        >
            {children}
            <KeywordIcon
                aria-hidden="true"
                className="intro-keyword__icon"
                weight="fill"
            />
        </span>
    );
}
