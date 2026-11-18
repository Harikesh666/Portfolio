import {
    createElement,
    useLayoutEffect,
    useRef,
    type ReactNode,
} from "react";
import {
    animate,
    useReducedMotion,
    type AnimationPlaybackControls,
} from "motion/react";
import {
    editorialBlurFrom,
    editorialBlurTo,
    editorialFollowerMaxDelay,
    editorialFollowerStagger,
    editorialFollowerTransformFrom,
    editorialFollowerTransformTo,
    editorialFollowerTransition,
    editorialHeadlinePause,
    editorialLineStagger,
    editorialLineTransformFrom,
    editorialLineTransformTo,
    editorialLineTransition,
} from "../lib/motion";
import {
    useIsServerRenderedRoute,
    useHeroHandoffRef,
} from "../lib/route-entrance";

const headlineAttribute = "data-stagger-headline";
const itemAttribute = "data-stagger-item";
const lineClass = "editorial-stagger-line";
const wordClass = "editorial-stagger-word";

type StaggerRevealProps = Readonly<{
    as?: "div" | "header" | "main" | "section";
    children: ReactNode;
    className?: string;
    id?: string;
}>;

type StaggerRevealHeadlineProps = Readonly<{
    as?: "h1" | "p";
    children: string;
    className?: string;
    id?: string;
}>;

type StaggerRevealItemProps = Readonly<{
    as?: "div" | "li" | "p";
    children: ReactNode;
    className?: string;
    id?: string;
}>;

type EditorialTransition =
    | typeof editorialFollowerTransition
    | typeof editorialLineTransition;

/**
 * Applies a stagger delay to every property. A value-specific transition
 * such as `opacity` does not inherit the top-level `delay`, so without this
 * an element would fade in at once and only slide up later.
 */
function withDelay(transition: EditorialTransition, delay: number) {
    return {
        ...transition,
        delay,
        opacity: { ...transition.opacity, delay },
    };
}

let fontsHaveSettled = false;
let fontSettlement: Promise<void> | undefined;

/**
 * Starts watching the page fonts once. Reading `document.fonts.ready` flushes
 * style for the whole document, so it is read once per page load, not once
 * per navigation.
 */
function primeFontSettlement() {
    if (fontsHaveSettled || fontSettlement || typeof document === "undefined") {
        return;
    }
    if (!document.fonts) {
        fontsHaveSettled = true;
        return;
    }
    fontSettlement = document.fonts.ready.then(() => {
        fontsHaveSettled = true;
    });
}

/** Resolves when fonts have settled, or returns null if they already have. */
function whenFontsSettle() {
    primeFontSettlement();
    return fontsHaveSettled ? null : (fontSettlement ?? null);
}

function createSplitSpan(className: string) {
    const span = document.createElement("span");
    span.className = className;
    span.style.display = "inline-block";
    span.style.verticalAlign = "top";
    return span;
}

function splitHeadlineLines(headline: HTMLElement) {
    const text = headline.getAttribute("aria-label") ?? headline.textContent ?? "";
    const words = text.split(" ");
    const wordElements: HTMLElement[] = [];
    const spaces: Text[] = [];

    headline.setAttribute("aria-label", text);
    headline.textContent = "";

    words.forEach((word, index) => {
        const wordElement = createSplitSpan(wordClass);
        wordElement.textContent = word;
        wordElements.push(wordElement);
        headline.append(wordElement);

        if (index < words.length - 1) {
            const space = document.createTextNode(" ");
            spaces.push(space);
            headline.append(space);
        }
    });

    const measuredWords = wordElements.map((element, index) => ({
        element,
        top: element.offsetTop,
        space: spaces[index],
    }));
    const groupedLines: Array<Array<HTMLElement | Text>> = [];
    let currentLine: Array<HTMLElement | Text> = [];
    let currentTop = measuredWords[0]?.top ?? 0;

    for (const { element, space, top } of measuredWords) {
        if (top > currentTop && currentLine.length > 0) {
            groupedLines.push(currentLine);
            currentLine = [];
            currentTop = top;
        }

        currentLine.push(element);
        if (space) currentLine.push(space);
    }

    if (currentLine.length > 0) groupedLines.push(currentLine);
    headline.textContent = "";

    return groupedLines.map((elements) => {
        const line = createSplitSpan(lineClass);
        line.style.display = "block";
        for (const element of elements) line.append(element);
        headline.append(line);
        return line;
    });
}

function StaggerRevealRoot({
    as = "div",
    children,
    className,
    id,
}: StaggerRevealProps) {
    const containerRef = useRef<HTMLElement>(null);
    const shouldReduceMotion = useReducedMotion();
    const isServerRendered = useIsServerRenderedRoute();
    const heroHandoffRef = useHeroHandoffRef();

    useLayoutEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const initialHeadline = container.querySelector<HTMLElement>(
            `[${headlineAttribute}]`,
        );
        // The server-rendered route keeps its HTML as painted. Hiding it here
        // would blank text the reader can already see.
        if (!initialHeadline || shouldReduceMotion || isServerRendered) {
            primeFontSettlement();
            return;
        }

        const animations: AnimationPlaybackControls[] = [];
        let isCancelled = false;

        function playEntrance(currentContainer: HTMLElement) {
            const headline = currentContainer.querySelector<HTMLElement>(
                `[${headlineAttribute}]`,
            );
            if (!headline) return;

            const originalText =
                headline.getAttribute("aria-label") ??
                headline.textContent ??
                "";
            headline.textContent = originalText;
            const sequence = Array.from(
                currentContainer.querySelectorAll<HTMLElement>(
                    `[${headlineAttribute}], [${itemAttribute}]`,
                ),
            );
            let delay = 0;

            for (const element of sequence) {
                if (element.hasAttribute(headlineAttribute)) {
                    const lines = splitHeadlineLines(element);
                    const lineAnimations: AnimationPlaybackControls[] = [];

                    for (const line of lines) {
                        lineAnimations.push(
                            animate(
                                line,
                                {
                                    opacity: [0, 1],
                                    transform: [
                                        editorialLineTransformFrom,
                                        editorialLineTransformTo,
                                    ],
                                    filter: [
                                        editorialBlurFrom,
                                        editorialBlurTo,
                                    ],
                                },
                                withDelay(editorialLineTransition, delay),
                            ),
                        );
                        delay += editorialLineStagger;
                    }
                    animations.push(...lineAnimations);

                    // The split lines are frozen at the width they were
                    // measured at. Once they have landed, hand the headline
                    // back as plain text so it reflows on rotation and resize.
                    const headlineElement = element;
                    void Promise.all(lineAnimations).then(() => {
                        if (isCancelled || !headlineElement.isConnected) return;
                        headlineElement.textContent = originalText;
                    });

                    if (lines.length > 0) delay += editorialHeadlinePause;
                    continue;
                }

                animations.push(
                    animate(
                        element,
                        {
                            opacity: [0, 1],
                            transform: [
                                editorialFollowerTransformFrom,
                                editorialFollowerTransformTo,
                            ],
                        },
                        withDelay(
                            editorialFollowerTransition,
                            Math.min(delay, editorialFollowerMaxDelay),
                        ),
                    ),
                );
                delay += editorialFollowerStagger;
            }

            // Blocks below the hero that are already on screen start here.
            heroHandoffRef.current =
                performance.now() +
                Math.min(
                    delay,
                    editorialFollowerMaxDelay + editorialFollowerStagger,
                ) *
                    1000;
        }

        // Lines are measured from the real font. Once fonts have settled,
        // which is true on every navigation after the first page, the split
        // runs before this frame paints, so the hero never shows a blank frame.
        const fontsPending = whenFontsSettle();
        if (!fontsPending) {
            playEntrance(container);
        } else {
            container.style.visibility = "hidden";
            void fontsPending.then(() => {
                if (isCancelled || containerRef.current !== container) return;
                playEntrance(container);
                container.style.visibility = "";
            });
        }

        return () => {
            isCancelled = true;
            for (const animation of animations) animation.stop();
        };
    }, [heroHandoffRef, isServerRendered, shouldReduceMotion]);

    return createElement(
        as,
        {
            "data-stagger-reveal": "",
            className,
            id,
            ref: containerRef,
        },
        children,
    );
}

/**
 * Keep headlines on ordinary greedy wrapping (no `text-pretty` or
 * `text-balance`): the entrance measures lines with words split apart, and
 * those lines must match the plain text the headline returns to afterwards.
 */
function StaggerRevealHeadline({
    as = "h1",
    children,
    className,
    id,
}: StaggerRevealHeadlineProps) {
    return createElement(
        as,
        {
            "aria-label": children,
            [headlineAttribute]: "",
            className,
            id,
        },
        children,
    );
}

function StaggerRevealItem({
    as = "div",
    children,
    className,
    id,
}: StaggerRevealItemProps) {
    return createElement(
        as,
        { [itemAttribute]: "", className, id },
        children,
    );
}

export const StaggerReveal = Object.assign(StaggerRevealRoot, {
    Headline: StaggerRevealHeadline,
    Item: StaggerRevealItem,
});
