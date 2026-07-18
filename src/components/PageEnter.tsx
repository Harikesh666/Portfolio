import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
    reducedPageBlock,
    routeFadeBlock,
    routeMaterializeBlock,
} from "../lib/motion";

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

    return (
        <motion.div
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

    return (
        <motion.div
            variants={shouldReduceMotion ? reducedPageBlock : routeFadeBlock}
        >
            {children}
        </motion.div>
    );
}

export const PageEnter = Object.assign(PageEnterRoot, {
    Fade: PageEnterFade,
    Item: PageEnterItem,
});
