import { useEffect, type RefObject } from "react";
import { observeSketches } from "./sketch-draw";

/**
 * Draws the pen marks and margin notes in an article's static HTML as each
 * scrolls into view. The prose stays plain HTML: this only sets attributes
 * and fits strokes, so React never manages it.
 */
export function useGuideSketches(
    containerRef: RefObject<HTMLElement | null>,
    slug: string,
) {
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        return observeSketches(container);
    }, [containerRef, slug]);
}
