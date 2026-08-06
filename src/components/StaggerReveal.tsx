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

const headlineAttribute = "data-stagger-headline";
const itemAttribute = "data-stagger-item";
const lineClass = "editorial-stagger-line";
const wordClass = "editorial-stagger-word";

type StaggerRevealProps = Readonly<{
    as?: "div" | "header" | "section";
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
    as?: "div" | "p";
    children: ReactNode;
    className?: string;
    id?: string;
}>;

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

    useLayoutEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const initialHeadline = container.querySelector<HTMLElement>(
            `[${headlineAttribute}]`,
        );
        if (!initialHeadline) {
            container.setAttribute("data-stagger-ready", "");
            return;
        }

        if (shouldReduceMotion) {
            const originalText =
                initialHeadline.getAttribute("aria-label") ??
                initialHeadline.textContent ??
                "";
            initialHeadline.textContent = originalText;
            container.setAttribute("data-stagger-ready", "");
            return;
        }

        const animations: AnimationPlaybackControls[] = [];
        let isCancelled = false;

        async function prepareEntrance(currentContainer: HTMLElement) {
            try {
                await document.fonts?.ready;
                if (
                    isCancelled ||
                    containerRef.current !== currentContainer
                ) {
                    return;
                }

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

                        for (const line of lines) {
                            animations.push(
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
                                    { ...editorialLineTransition, delay },
                                ),
                            );
                            delay += editorialLineStagger;
                        }

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
                            { ...editorialFollowerTransition, delay },
                        ),
                    );
                    delay += editorialFollowerStagger;
                }
            } finally {
                if (
                    !isCancelled &&
                    containerRef.current === currentContainer
                ) {
                    currentContainer.setAttribute("data-stagger-ready", "");
                }
            }
        }

        void prepareEntrance(container);

        return () => {
            isCancelled = true;
            for (const animation of animations) animation.stop();
        };
    }, [shouldReduceMotion]);

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
