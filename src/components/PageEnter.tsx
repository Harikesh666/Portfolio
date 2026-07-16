import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { enterItem, heroEnter } from "../lib/motion";

type PageEnterProps = Readonly<{
    children: ReactNode;
}>;

type PageEnterItemProps = Readonly<{
    children: ReactNode;
    hero?: boolean;
}>;

function PageEnterRoot({ children }: PageEnterProps) {
    const shouldReduceMotion = useReducedMotion();

    if (shouldReduceMotion) return children;

    return (
        <motion.div
            className="contents"
            initial="hidden"
            animate="visible"
            variants={{
                hidden: {},
                visible: {
                    transition: {
                        staggerChildren: 0.06,
                        delayChildren: 0.1,
                    },
                },
            }}
        >
            {children}
        </motion.div>
    );
}

function PageEnterItem({ children, hero = false }: PageEnterItemProps) {
    const shouldReduceMotion = useReducedMotion();

    if (shouldReduceMotion) return children;

    return (
        <motion.div variants={hero ? heroEnter : enterItem}>
            {children}
        </motion.div>
    );
}

export const PageEnter = Object.assign(PageEnterRoot, {
    Item: PageEnterItem,
});
