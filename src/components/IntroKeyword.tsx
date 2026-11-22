import type { Icon } from "@phosphor-icons/react";
import { useEffect, useRef } from "react";
import { warmKeywordsInView } from "../lib/keyword-warmth";

type IntroKeywordProps = Readonly<{
    children: string;
    icon: Icon;
    /** Picks the hue token the keyword turns when the paragraph warms. */
    tone: "ship" | "learn" | "backend";
    /** Position in the paragraph; staggers the colour change left to right. */
    index: number;
}>;

/**
 * A word in an intro paragraph (inside `.intro-keywords`) that warms from
 * neutral to its own colour, with a small icon: while the pointer or focus is
 * in the paragraph, or, on touch screens, while the paragraph is in the middle
 * of the screen. Styling and timing live in `styles.css` (`.intro-keyword`).
 */
export function IntroKeyword({ children, icon: KeywordIcon, index, tone }: IntroKeywordProps) {
    const ref = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        if (!ref.current) return;
        return warmKeywordsInView(ref.current);
    }, []);

    return (
        <span
            className="intro-keyword"
            data-tone={tone}
            ref={ref}
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
