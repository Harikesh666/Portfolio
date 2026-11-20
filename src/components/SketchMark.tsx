import { useEffect, useRef, type ReactNode } from "react";
import { watchSketch } from "../lib/sketch-draw";

type SketchMarkKind = "underline" | "marker" | "circle";

type SketchMarkProps = Readonly<{
    children: ReactNode;
    /** A pen underline, a highlighter swipe behind the words, or a pen circling them. */
    kind: SketchMarkKind;
    /** Order among the marks on a page; each later mark waits a beat longer. */
    index?: number;
    /**
     * For phrases that wrap on a phone: every line gets its own strokes, and
     * the drawing time is shared across the lines by width.
     */
    wraps?: boolean;
    /** Wait before drawing, in ms. Defaults to a beat after the page settles. */
    delay?: number;
}>;

/** Page marks wait for the entrance to settle; "New" waits long enough to be read first. */
function defaultDelay(kind: SketchMarkKind, index: number) {
    return kind === "circle" ? 800 : 300 + index * 420;
}

/**
 * Hand-drawn marks on a few words, like someone annotated the page: Rough
 * Notation's strokes (ported in `rough-annotation.ts`), drawn once the first
 * time the words scroll into view, then kept fitted to them. The server
 * renders only the words and an empty SVG, so the markup is the same
 * everywhere; the strokes are made in the browser, where the words can be
 * measured. Words stay plain text for screen readers.
 */
export function SketchMark({ children, kind, index = 0, wraps = false, delay }: SketchMarkProps) {
    const ref = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;
        return watchSketch(element);
    }, []);

    return (
        <span
            className={wraps ? "sketch-mark sketch-mark--wraps" : "sketch-mark"}
            data-kind={kind}
            data-sketch-delay={delay ?? defaultDelay(kind, index)}
            ref={ref}
        >
            {/* First, so a highlighter swipe paints under the words. */}
            <svg aria-hidden="true" className="rough-annotation" focusable="false" />
            <span className="sketch-mark__text">{children}</span>
        </span>
    );
}

/** "New" in the pink pen, circled twice, beside the newest guide's title. */
export function NewTag() {
    return (
        <span className="new-tag">
            <SketchMark kind="circle">New</SketchMark>
        </span>
    );
}

/**
 * A handwritten aside beside a passage, joined to it by a pen bracket, like
 * a note in the margin of a book. On wide screens the note sits in the left
 * margin and the bracket stands on the passage's left; on narrower ones the
 * bracket runs under the passage and the note sits centred below it. Static
 * markup only: in a guide, `observeSketches` draws it as it scrolls in.
 */
export function MarginNote({ children, note }: Readonly<{ children: ReactNode; note: string }>) {
    return (
        <div className="margin-note" data-sketch-delay={0}>
            <svg aria-hidden="true" className="rough-annotation" focusable="false" />
            <div className="margin-note__body">{children}</div>
            <aside className="margin-note__text">{note}</aside>
        </div>
    );
}
