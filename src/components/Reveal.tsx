import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { materializeBlock } from "../lib/motion";

type RevealProps = Readonly<{
    children: ReactNode;
    as?: "div" | "li";
    className?: string;
}>;

export function Reveal({
    children,
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
        initial: "hidden",
        whileInView: "visible",
        viewport: { once: true, margin: "-40px" },
        variants: materializeBlock,
    };

    return as === "li" ? (
        <motion.li {...motionProps}>{children}</motion.li>
    ) : (
        <motion.div {...motionProps}>{children}</motion.div>
    );
}
