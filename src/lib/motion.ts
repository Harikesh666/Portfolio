// Motion rule: scale entrances are limited to small page blocks; larger trees fade only.
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

export const pageEase = [0.16, 1, 0.3, 1] as const;

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

// Opens the mobile TOC sheet with a restrained physical overshoot.
export const sheetSpring = {
    type: "spring" as const,
    visualDuration: 0.4,
    bounce: 0.12,
};

// Dismisses the mobile TOC sheet faster than it opens.
export const sheetCloseSpring = {
    type: "spring" as const,
    visualDuration: 0.28,
    bounce: 0,
};

export const bouncySpring = {
    type: "spring" as const,
    visualDuration: 0.35,
    bounce: 0.35,
};

// Removes outgoing routes quickly enough to keep wait-mode blank time minimal.
export const exitTween = {
    duration: 0.09,
    ease: "easeIn" as const,
};

// Swaps simple routes without crossing a zero-opacity frame.
export const instantRouteTween = {
    duration: 0,
};

// Fades a vacated TOC hover row without delaying the next hover target.
export const hoverExitTween = {
    duration: 0.12,
    ease: "easeIn" as const,
};

// Fades the reduced-motion sheet without positional movement.
export const sheetFadeTween = {
    duration: 0.15,
    ease: pageEase,
};

// Starts reduced-motion section navigation as the sheet quickly fades.
export const sheetNavigationFadeTween = {
    duration: 0.12,
    ease: pageEase,
};

// Reveals mobile TOC rows with a quiet active-outward cascade.
export const sheetRowTween = {
    duration: 0.18,
    ease: pageEase,
};

export const tocItemDelayStep = 0.016;
export const tocItemDelayCap = 0.25;
export const pageEnterStagger = 0.05;

export const pageEnterTween = {
    duration: 2,
    ease: pageEase,
};

export const routePageEnterTween = {
    duration: 2,
    ease: pageEase,
};

export const scrollRevealTween = {
    duration: 2,
    ease: pageEase,
};

// Keeps fallback route lifecycle work aligned with the full page entrance.
export const routeEntranceFallbackMs = routePageEnterTween.duration * 1_000;

export const headerMorphTween = {
    duration: 0.3,
    ease: pageEase,
};

export const headerContentExitTween = {
    duration: 0.12,
    ease: "easeIn" as const,
};

export const reducedPageEnterTween = {
    duration: 0.15,
    ease: pageEase,
};

export const materializeBlock = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
        opacity: 1,
        scale: 1,
    },
};

export const routeMaterializeBlock = {
    hidden: materializeBlock.hidden,
    visible: {
        ...materializeBlock.visible,
        transition: routePageEnterTween,
    },
};

export const scrollRevealBlock = {
    hidden: { opacity: 0, y: 16 },
    visible: {
        opacity: 1,
        y: 0,
        transition: scrollRevealTween,
    },
};

// Fades oversized content trees without rasterizing their full height each frame.
export const scrollRevealTree = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: scrollRevealTween,
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

export const routePageContainer = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            ...routePageEnterTween,
            staggerChildren: pageEnterStagger,
        },
    },
};

export const reducedPageContainer = {
    hidden: {},
    visible: {},
};
