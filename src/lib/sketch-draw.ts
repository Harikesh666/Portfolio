import {
    annotationPaths,
    defaultAnimationDuration,
    randomSeed,
    type AnnotationConfig,
    type Rect,
} from "./rough-annotation";

const svgNamespace = "http://www.w3.org/2000/svg";
/** Marks draw once they are comfortably on screen, not while just peeking in. */
const drawMargin = "0px 0px -15% 0px";
/** Margin notes stand beside their passage from xl; below it the bracket lies under it. */
const marginNoteSideQuery = "(min-width: 80rem)";

type SketchSpec = AnnotationConfig &
    Readonly<{
        /** The whole annotation's drawing time, shared by its strokes by length. */
        duration: number;
        /** Wait before the first stroke, in ms. */
        delay: number;
        /** One annotation per line box, as the words wrap. */
        multiline: boolean;
    }>;

/*
 * Each kind as Benji Taylor's site sets Rough Notation, measured from his
 * pages (stroke bounds against the marked words):
 * - circle: 1.5px, two laps in 800ms, padding 5px at the sides but only
 *   about 2.5px above and below, which is what makes it a flat loop;
 * - highlight: 95% of the line, two passes in 700ms;
 * - underline: 1.5px, two passes in 2s, about 3px under the words;
 * - bracket: 1px in 800ms, Rough Notation's default 5px padding.
 */
function specFor(mark: Element): { spec: SketchSpec; target: Element } | null {
    const delay = Number((mark as HTMLElement).dataset.sketchDelay ?? 0);
    if (mark.classList.contains("margin-note")) {
        const target = mark.querySelector(".margin-note__body");
        if (!target) return null;
        const side = window.matchMedia(marginNoteSideQuery).matches ? "left" : "bottom";
        return {
            target,
            spec: { type: "bracket", brackets: side, strokeWidth: 1, duration: defaultAnimationDuration, delay, multiline: false },
        };
    }
    const target = mark.querySelector(".sketch-mark__text");
    if (!target) return null;
    const multiline = mark.classList.contains("sketch-mark--wraps");
    switch ((mark as HTMLElement).dataset.kind) {
        case "circle":
            return { target, spec: { type: "circle", strokeWidth: 1.5, padding: [2.5, 5, 2.5, 5], duration: defaultAnimationDuration, delay, multiline } };
        case "marker":
            return { target, spec: { type: "highlight", duration: 700, delay, multiline } };
        case "underline":
            return { target, spec: { type: "underline", strokeWidth: 1.5, padding: 3, duration: 2000, delay, multiline } };
        default:
            return null;
    }
}

/*
 * Benji's brackets stand at the paragraph's ragged right edge, so the ticks
 * start in the white space after the shortest lines. On the left every line
 * starts at the edge, so the left bracket starts 6px off the text to leave
 * the same breathing room.
 */
const leftBracketGap = 6;

/** The target's line boxes (or its whole box) relative to the SVG's corner. */
function rectsFor(target: Element, svg: SVGSVGElement, multiline: boolean): Rect[] {
    const origin = svg.getBoundingClientRect();
    const boxes = multiline ? Array.from(target.getClientRects()) : [target.getBoundingClientRect()];
    return boxes
        .filter((box) => box.width > 0 && box.height > 0)
        .map((box) => ({ x: box.left - origin.left, y: box.top - origin.top, w: box.width, h: box.height }));
}

const sizeKey = (rects: readonly Rect[]) => rects.map((r) => `${Math.round(r.x)},${Math.round(r.y)},${Math.round(r.w)},${Math.round(r.h)}`).join("|");

type DrawnSketch = { seed: number; size: string; side?: string };
const drawn = new WeakMap<Element, DrawnSketch>();

/**
 * Rough Notation's render: the annotation's time is shared across the line
 * boxes by width, and within a box across its strokes by length. Each stroke
 * draws along itself with ease-out (stroke-dashoffset from its length to 0).
 */
function render(mark: Element, animate: boolean) {
    const found = specFor(mark);
    const svg = mark.querySelector<SVGSVGElement>(":scope > svg.rough-annotation");
    if (!found || !svg) return;
    const { spec, target } = found;
    const state = drawn.get(mark) ?? { seed: randomSeed(), size: "" };
    const rects = rectsFor(target, svg, spec.multiline).map((rect) =>
        spec.type === "bracket" && spec.brackets === "left" ? { ...rect, x: rect.x - leftBracketGap, w: rect.w + leftBracketGap } : rect,
    );
    const totalWidth = rects.reduce((sum, rect) => sum + rect.w, 0);

    svg.replaceChildren();
    let groupDelay = 0;
    for (const rect of rects) {
        const rectDuration = totalWidth ? spec.duration * (rect.w / totalWidth) : 0;
        const { paths, strokeWidth } = annotationPaths(rect, spec, state.seed);
        const elements = paths.map((d) => {
            const path = document.createElementNS(svgNamespace, "path");
            path.setAttribute("d", d);
            path.setAttribute("fill", "none");
            path.setAttribute("stroke", "currentColor");
            path.setAttribute("stroke-width", String(strokeWidth));
            svg.appendChild(path);
            return path;
        });
        if (animate) {
            const lengths = elements.map((path) => path.getTotalLength());
            const totalLength = lengths.reduce((sum, length) => sum + length, 0);
            let strokeDelay = 0;
            elements.forEach((path, index) => {
                const duration = totalLength ? rectDuration * (lengths[index] / totalLength) : 0;
                path.style.strokeDashoffset = `${lengths[index]}`;
                path.style.strokeDasharray = `${lengths[index]}`;
                path.style.animation = `rough-notation-dash ${duration}ms ease-out ${spec.delay + groupDelay + strokeDelay}ms forwards`;
                strokeDelay += duration;
            });
        }
        groupDelay += rectDuration;
    }
    drawn.set(mark, { seed: state.seed, size: sizeKey(rects), side: spec.brackets as string | undefined });
    mark.setAttribute("data-drawn", "");
}

/** Redraws, without animating, when the words reflow or the layout changes. */
function refit(mark: Element) {
    const state = drawn.get(mark);
    const found = specFor(mark);
    const svg = mark.querySelector<SVGSVGElement>(":scope > svg.rough-annotation");
    if (!state || !found || !svg) return;
    const size = sizeKey(rectsFor(found.target, svg, found.spec.multiline));
    if (size !== state.size || found.spec.brackets !== state.side) render(mark, false);
}

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Draws one sketch mark or margin note the first time it scrolls into view,
 * then keeps it fitted to its words. Returns a cleanup function.
 */
export function watchSketch(mark: Element) {
    if (typeof IntersectionObserver === "undefined") {
        render(mark, false);
        return () => {};
    }
    const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => refit(mark));
    const observer = new IntersectionObserver(
        ([entry]) => {
            if (!entry.isIntersecting) return;
            observer.disconnect();
            render(mark, !prefersReducedMotion());
            resizeObserver?.observe(mark);
        },
        { rootMargin: drawMargin },
    );
    observer.observe(mark);
    return () => {
        observer.disconnect();
        resizeObserver?.disconnect();
    };
}

/** Watches every sketch mark and margin note inside an article's static HTML. */
export function observeSketches(container: Element) {
    const cleanups = Array.from(container.querySelectorAll(".sketch-mark, .margin-note"), watchSketch);
    return () => {
        for (const cleanup of cleanups) cleanup();
    };
}
