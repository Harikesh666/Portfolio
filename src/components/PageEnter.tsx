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
    const isInView = useRevealInView(revealRef, shouldReduceMotion);

    return (
        <motion.div
            animate={shouldReduceMotion || isInView ? "visible" : "hidden"}
            initial={shouldReduceMotion ? false : "hidden"}
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
    const isInView = useRevealInView(revealRef, shouldReduceMotion);

    return (
        <motion.div
            animate={shouldReduceMotion || isInView ? "visible" : "hidden"}
            initial={shouldReduceMotion ? false : "hidden"}
            ref={revealRef}
            variants={shouldReduceMotion ? reducedPageBlock : scrollRevealTree}
        >
            {children}
        </motion.div>
    );
}

export const PageEnter = Object.assign(PageEnterRoot, {
    Fade: PageEnterFade,
    Item: PageEnterItem,
});
