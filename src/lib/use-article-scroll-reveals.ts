import { useLayoutEffect, type RefObject } from "react";
import { animate } from "motion";
import { articleScrollRevealTween } from "./motion";

const articleRevealSelector = "[data-scroll-reveal]";

function isInInitialViewport(element: HTMLElement) {
    const { bottom, top } = element.getBoundingClientRect();

    return bottom > 0 && top < window.innerHeight;
}

function getOutermostRevealTargets(article: HTMLElement) {
    return Array.from(
        article.querySelectorAll<HTMLElement>(articleRevealSelector),
    ).filter(
        (target) =>
            !target.parentElement?.closest<HTMLElement>(articleRevealSelector),
    );
}

export function useArticleScrollReveals(
    articleRef: RefObject<HTMLElement | null>,
    shouldReduceMotion: boolean | null,
    revealKey: string,
) {
    useLayoutEffect(() => {
        if (shouldReduceMotion) return;

        const article = articleRef.current;
        if (!article || typeof IntersectionObserver === "undefined") return;

        const targets = getOutermostRevealTargets(article);
        const controls = new Map<HTMLElement, ReturnType<typeof animate>>();

        const reveal = (target: HTMLElement) => {
            controls.get(target)?.stop();
            controls.set(
                target,
                animate(
                    target,
                    { opacity: [0, 1] },
                    articleScrollRevealTween,
                ),
            );
            observer.unobserve(target);
        };

        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (
                        !entry.isIntersecting ||
                        !(entry.target instanceof HTMLElement)
                    ) {
                        continue;
                    }

                    reveal(entry.target);
                }
            },
            {
                rootMargin: "0px 0px -64px 0px",
                threshold: 0.01,
            },
        );

        for (const target of targets) {
            if (isInInitialViewport(target)) continue;

            target.style.opacity = "0";
            observer.observe(target);
        }

        return () => {
            observer.disconnect();
            for (const [target, control] of controls) {
                control.stop();
                target.style.removeProperty("opacity");
            }
        };
    }, [articleRef, revealKey, shouldReduceMotion]);
}
