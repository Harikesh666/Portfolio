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

// Carries TOC items between the compact rail and expanded panel.
export const tocMorphSpring = {
    type: "spring" as const,
    visualDuration: 0.34,
    bounce: 0.08,
};

// Reverses the TOC morph faster than expansion without losing interruptibility.
export const tocCollapseSpring = {
    type: "spring" as const,
    visualDuration: 0.22,
    bounce: 0,
};

// Settles the directional active-section stretch without overshooting its row.
export const stretchSpring = {
    type: "spring" as const,
    visualDuration: 0.36,
    bounce: 0,
};

export const bouncySpring = {
    type: "spring" as const,
    visualDuration: 0.35,
    bounce: 0.35,
};

export const heroSpring = {
    type: "spring" as const,
    visualDuration: 0.48,
    bounce: 0.08,
};

// Removes outgoing routes before the faster incoming content settle.
export const exitTween = {
    duration: 0.15,
    ease: "easeIn" as const,
};

// Fades a vacated TOC hover row without delaying the next hover target.
export const hoverExitTween = {
    duration: 0.12,
    ease: "easeIn" as const,
};

export const tocItemDelayStep = 0.016;
export const tocItemDelayCap = 0.25;
export const pageEnterStagger = 0.04;
export const pageEnterDelay = 0.05;

export const heroEnter = {
    hidden: { opacity: 0, y: -12 },
    visible: {
        opacity: 1,
        y: 0,
        transition: heroSpring,
    },
};

export const enterItem = {
    hidden: { opacity: 0, y: -8 },
    visible: {
        opacity: 1,
        y: 0,
        transition: settleSpring,
    },
};
