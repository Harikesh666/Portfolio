import { useEffect, useRef, useState, type ReactNode } from "react";

type SketchMarkProps = Readonly<{
    children: ReactNode;
    /** A quick double pencil underline, or a translucent highlighter swipe behind the words. */
    kind: "underline" | "marker";
    /** Order among the marks on the page; later marks draw a beat after earlier ones. */
    index?: number;
}>;

/*
 * Fixed, hand-drawn-looking strokes. They stretch to the words' width
 * (preserveAspectRatio="none") while vector-effect keeps the line weight
 * constant, so a short word and a long phrase both look drawn by the same pen.
 * They are constants, not random, so server and client markup always match.
 */
const strokes = {
    underline: {
        viewBox: "0 0 100 10",
        paths: [
            { d: "M1.5 5.6 C 18 4.1, 38 7.3, 58 5.5 S 88 4.6, 98.5 5.2", width: 1.7, opacity: 0.9 },
            { d: "M9 8.4 C 30 7.1, 55 9.2, 76 7.8 S 92 7.6, 95 7.4", width: 1.2, opacity: 0.55 },
        ],
    },
    marker: {
        viewBox: "0 0 100 20",
        paths: [{ d: "M1.5 11.6 C 22 10.2, 46 12.2, 70 10.6 S 94 10.4, 98.5 9.6", width: 15, opacity: 1 }],
    },
} as const;

/**
 * Pencil marks on a few words in the prose, like someone annotated the page.
 * Each draws itself once, left to right, the first time it scrolls into view,
 * and then stays. The words themselves are untouched for screen readers.
 * Styling and timing live in `styles.css` (`.sketch-mark`).
 */
export function SketchMark({ children, kind, index = 0 }: SketchMarkProps) {
    const ref = useRef<HTMLSpanElement>(null);
    const [isDrawn, setIsDrawn] = useState(false);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (!entry.isIntersecting) return;
                setIsDrawn(true);
                observer.disconnect();
            },
            // Wait until the words are comfortably on screen, not just peeking in.
            { rootMargin: "0px 0px -15% 0px" },
        );
        observer.observe(element);
        return () => observer.disconnect();
    }, []);

    const stroke = strokes[kind];
    return (
        <span
            className="sketch-mark"
            data-drawn={isDrawn ? "" : undefined}
            data-kind={kind}
            ref={ref}
            style={{ "--sketch-index": index } as React.CSSProperties}
        >
            {children}
            <svg
                aria-hidden="true"
                className="sketch-mark__stroke"
                focusable="false"
                preserveAspectRatio="none"
                viewBox={stroke.viewBox}
            >
                {stroke.paths.map((path) => (
                    <path
                        d={path.d}
                        fill="none"
                        key={path.d}
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeOpacity={path.opacity}
                        strokeWidth={path.width}
                        vectorEffect="non-scaling-stroke"
                    />
                ))}
            </svg>
        </span>
    );
}
