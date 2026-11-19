import { useRef, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
    reducedPageBlock,
    routeMaterializeBlock,
    scrollRevealTree,
} from "../lib/motion";
import { useRevealInView } from "../lib/use-reveal-in-view";

type PageEnterProps = Readonly<{
    children: ReactNode;
}>;

type PageEnterItemProps = Readonly<{
    children: ReactNode;
}>;

function PageEnterRoot({ children }: PageEnterProps) {
    return children;
}

function PageEnterItem({ children }: PageEnterItemProps) {
    const shouldReduceMotion = useReducedMotion();
    const revealRef = useRef<HTMLDivElement>(null);
    const reveal = useRevealInView(revealRef, shouldReduceMotion);

    return (
        <motion.div
            {...reveal}
            ref={revealRef}
            variants={
                shouldReduceMotion ? reducedPageBlock : routeMaterializeBlock
            }
        >
            {children}
        </motion.div>
    );
}

function PageEnterFade({ children }: PageEnterItemProps) {
    const shouldReduceMotion = useReducedMotion();
    const revealRef = useRef<HTMLDivElement>(null);
    const reveal = useRevealInView(revealRef, shouldReduceMotion);

    return (
        <motion.div
            {...reveal}
            ref={revealRef}
            // The same opacity-only variant with reduced motion on: `reveal` then never
            // leaves "visible", so nothing animates, and the server's markup still matches.
            variants={scrollRevealTree}
        >
            {children}
        </motion.div>
    );
}

export const PageEnter = Object.assign(PageEnterRoot, {
    Fade: PageEnterFade,
    Item: PageEnterItem,
});
