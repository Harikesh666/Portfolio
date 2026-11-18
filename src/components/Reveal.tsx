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
    const articleReveal = useRevealInView(articleRef, shouldReduceMotion);
    const divReveal = useRevealInView(divRef, shouldReduceMotion);
    const listItemReveal = useRevealInView(listItemRef, shouldReduceMotion);

    if (shouldReduceMotion) {
        if (as === "li") return <li className={className}>{children}</li>;
        if (as === "article") {
            return <article className={className}>{children}</article>;
        }

        return <div className={className}>{children}</div>;
    }

    if (as === "li") {
        return (
            <motion.li
                {...listItemReveal}
                className={className}
                ref={listItemRef}
                variants={scrollRevealBlock}
            >
                {children}
            </motion.li>
        );
    }

    if (as === "article") {
        return (
            <motion.article
                {...articleReveal}
                className={className}
                ref={articleRef}
                variants={scrollRevealBlock}
            >
                {children}
            </motion.article>
        );
    }

    return (
        <motion.div
            {...divReveal}
            className={className}
            ref={divRef}
            variants={scrollRevealBlock}
        >
            {children}
        </motion.div>
    );
}
