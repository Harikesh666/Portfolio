export const snappySpring = {
    type: "spring" as const,
    visualDuration: 0.2,
    bounce: 0.15,
};

export const settleSpring = {
    type: "spring" as const,
    visualDuration: 0.3,
    bounce: 0.1,
};

export const expressiveSpring = {
    type: "spring" as const,
    visualDuration: 0.45,
    bounce: 0.1,
};

export const bouncySpring = {
    type: "spring" as const,
    visualDuration: 0.35,
    bounce: 0.35,
};

export const heroSpring = {
    type: "spring" as const,
    visualDuration: 0.55,
    bounce: 0.08,
};

export const heroEnter = {
    hidden: { opacity: 0, y: -16, filter: "blur(6px)" },
    visible: {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        transition: heroSpring,
        transitionEnd: { filter: "none" },
    },
};

export const enterItem = {
    hidden: { opacity: 0, y: -12, filter: "blur(5px)" },
    visible: {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        transition: expressiveSpring,
        transitionEnd: { filter: "none" },
    },
};
