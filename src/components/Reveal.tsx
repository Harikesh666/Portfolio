import { useRef, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { scrollRevealBlock } from "../lib/motion";
import { useRevealInView } from "../lib/use-reveal-in-view";

type RevealProps = Readonly<{
    children: ReactNode;
    as?: "article" | "div" | "li";
    className?: string;
}>;

export function Reveal({
    children,
    as = "div",
    className,
}: RevealProps) {
    const shouldReduceMotion = useReducedMotion();
    const articleRef = useRef<HTMLElement>(null);
    const divRef = useRef<HTMLDivElement>(null);
    const listItemRef = useRef<HTMLLIElement>(null);
    const articleIsInView = useRevealInView(articleRef, shouldReduceMotion);
    const divIsInView = useRevealInView(divRef, shouldReduceMotion);
    const listItemIsInView = useRevealInView(listItemRef, shouldReduceMotion);

    if (shouldReduceMotion) {
        if (as === "li") return <li className={className}>{children}</li>;
        if (as === "article") {
            return <article className={className}>{children}</article>;
        }

        return <div className={className}>{children}</div>;
    }

    const motionProps = {
        className,
        initial: "hidden",
        variants: scrollRevealBlock,
    };

    if (as === "li") {
        return (
            <motion.li
                {...motionProps}
                animate={listItemIsInView ? "visible" : "hidden"}
                ref={listItemRef}
            >
                {children}
            </motion.li>
        );
    }

    if (as === "article") {
        return (
            <motion.article
                {...motionProps}
                animate={articleIsInView ? "visible" : "hidden"}
                ref={articleRef}
            >
                {children}
            </motion.article>
        );
    }

    return (
        <motion.div
            {...motionProps}
            animate={divIsInView ? "visible" : "hidden"}
            ref={divRef}
        >
            {children}
        </motion.div>
    );
}
