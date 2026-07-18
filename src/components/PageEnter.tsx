import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { reducedPageBlock, routePageBlock } from "../lib/motion";

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
            variants={shouldReduceMotion ? reducedPageBlock : routePageBlock}
        >
            {children}
        </motion.div>
    );
}

export const PageEnter = Object.assign(PageEnterRoot, {
    Item: PageEnterItem,
});
