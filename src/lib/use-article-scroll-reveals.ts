import { useLayoutEffect, type RefObject } from "react";
import { animate } from "motion";
import { scrollRevealBlock, scrollRevealTree } from "./motion";

const articleRevealSelector = "[data-scroll-reveal]";

function getRevealVariant(element: HTMLElement) {
    return element.dataset.scrollReveal === "tree"
        ? scrollRevealTree
        : scrollRevealBlock;
}

export function useArticleScrollReveals(
    articleRef: RefObject<HTMLElement | null>,
    shouldReduceMotion: boolean | null,
) {
    useLayoutEffect(() => {
        if (shouldReduceMotion) return;

        const article = articleRef.current;
        if (!article || typeof IntersectionObserver === "undefined") return;

        const targets = Array.from(
            article.querySelectorAll<HTMLElement>(articleRevealSelector),
        );
        const controls = new Map<HTMLElement, ReturnType<typeof animate>>();

        for (const target of targets) {
            const { hidden } = getRevealVariant(target);
            controls.set(target, animate(target, hidden, { duration: 0 }));
        }

        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (!entry.isIntersecting || !(entry.target instanceof HTMLElement)) {
                        continue;
                    }

                    const target = entry.target;
                    const { visible } = getRevealVariant(target);
                    controls.get(target)?.stop();
                    controls.set(
                        target,
                        animate(target, visible, visible.transition),
                    );
                    observer.unobserve(target);
                }
            },
            {
                rootMargin: "0px 0px -64px 0px",
                threshold: 0.01,
            },
        );

        for (const target of targets) observer.observe(target);

        return () => {
            observer.disconnect();
            for (const control of controls.values()) control.stop();
        };
    }, [articleRef, shouldReduceMotion]);
}
