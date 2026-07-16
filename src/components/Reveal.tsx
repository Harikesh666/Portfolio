import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { settleSpring } from "../lib/motion";

type RevealProps = Readonly<{
    children: ReactNode;
    index: number;
    as?: "div" | "li";
    className?: string;
}>;

export function Reveal({
    children,
    index,
    as = "div",
    className,
}: RevealProps) {
    const shouldReduceMotion = useReducedMotion();

    if (shouldReduceMotion) {
        return as === "li" ? (
            <li className={className}>{children}</li>
        ) : (
            <div className={className}>{children}</div>
        );
    }

    const motionProps = {
        className,
        initial: { opacity: 0, y: 8 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: "-40px" },
        transition: {
            ...settleSpring,
            delay: Math.min(index * 0.04, 0.3),
        },
    };

    return as === "li" ? (
        <motion.li {...motionProps}>{children}</motion.li>
    ) : (
        <motion.div {...motionProps}>{children}</motion.div>
    );
}
