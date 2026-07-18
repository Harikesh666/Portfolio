export const snappySpring = {
    type: "spring" as const,
    visualDuration: 0.2,
    bounce: 0.15,
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

export const pageEase = [0.16, 1, 0.3, 1] as const;

export const pageEnterTween = {
    duration: 0.4,
    ease: pageEase,
};

export const routePageEnterTween = {
    duration: 0.28,
    ease: pageEase,
};

export const reducedPageEnterTween = {
    duration: 0.15,
    ease: pageEase,
};

export const pageBlock = {
    hidden: { opacity: 0, y: 10, scale: 0.985 },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
    },
};

export const routePageBlock = {
    hidden: pageBlock.hidden,
    visible: {
        ...pageBlock.visible,
        transition: routePageEnterTween,
    },
};

export const reducedPageBlock = {
    hidden: { opacity: 0, y: 0, scale: 1 },
    visible: { opacity: 1, y: 0, scale: 1 },
};

export const pageContainer = {
    hidden: {},
    visible: {
        transition: {
            staggerChildren: pageEnterStagger,
        },
    },
};

export const reducedPageContainer = {
    hidden: {},
    visible: {},
};
