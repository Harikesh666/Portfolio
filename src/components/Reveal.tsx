import { useRef, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { reducedPageBlock, scrollRevealBlock } from "../lib/motion";
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

    // Same elements under reduced motion, so the server's markup hydrates as is.
    // useRevealInView pins them visible, and these variants carry no transform.
    const variants = shouldReduceMotion ? reducedPageBlock : scrollRevealBlock;

    if (as === "li") {
        return (
            <motion.li
                {...listItemReveal}
                className={className}
                ref={listItemRef}
                variants={variants}
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
                variants={variants}
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
            variants={variants}
        >
            {children}
        </motion.div>
    );
}
