import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { enterItem } from "../lib/motion";

type PageEnterProps = Readonly<{
    children: ReactNode;
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
                        staggerChildren: 0.07,
                        delayChildren: 0.05,
                    },
                },
            }}
        >
            {children}
        </motion.div>
    );
}

function PageEnterItem({ children }: PageEnterProps) {
    const shouldReduceMotion = useReducedMotion();

    if (shouldReduceMotion) return children;

    return <motion.div variants={enterItem}>{children}</motion.div>;
}

export const PageEnter = Object.assign(PageEnterRoot, {
    Item: PageEnterItem,
});
