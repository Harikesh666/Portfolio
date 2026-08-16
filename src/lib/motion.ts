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

// Reveals the incoming theme through the supplied Skiper GIF mask.
export const themeGifMaskTransitionStyles = `
html[data-theme-transition]::view-transition-group(root) {
    animation-timing-function: ease-in;
}

html[data-theme-transition]::view-transition-new(root) {
    mask: url("/assets/theme-transition-mask.gif") center / 0 no-repeat;
    animation: theme-gif-mask-scale 1.8s;
}

html[data-theme-transition]::view-transition-old(root) {
    animation: theme-gif-mask-scale 1.8s;
}

@keyframes theme-gif-mask-scale {
    0% {
        mask-size: 0;
    }

    10% {
        mask-size: 50vmax;
    }

    90% {
        mask-size: 50vmax;
    }

    100% {
        mask-size: 2000vmax;
    }
}
`;

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

// Fades in the diagram scrim before the study sheet reaches its final position.
export const diagramDialogBackdropOpenTween = {
    duration: 0.16,
    ease: pageEase,
};

// Removes the diagram scrim quickly once the reader has dismissed the sheet.
export const diagramDialogBackdropCloseTween = {
    duration: 0.12,
    ease: "easeIn" as const,
};

// Lets the viewport-bounded diagram study sheet settle after its fast visual handoff.
export const diagramDialogSheetOpenTransition = {
    transform: {
        type: "spring" as const,
        visualDuration: 0.24,
        bounce: 0.06,
        delay: 0.04,
    },
    opacity: {
        type: "tween" as const,
        duration: 0.16,
        ease: pageEase,
        delay: 0.04,
    },
};

// Returns the study sheet to reading faster than it entered and without bounce.
export const diagramDialogSheetCloseTransition = {
    transform: {
        type: "spring" as const,
        visualDuration: 0.16,
        bounce: 0,
    },
    opacity: {
        type: "tween" as const,
        duration: 0.12,
        ease: "easeIn" as const,
    },
};

// Honors keyboard activation and reduced-motion preferences without a delayed state change.
export const diagramDialogInstantTween = {
    duration: 0,
};

// Separates the ambient scrim from the centered paper-sheet movement.
export const diagramDialogBackdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
};

// Keeps the paper study sheet visible before it lifts a short, physical distance.
export const diagramDialogSheetVariants = {
    hidden: { opacity: 0, transform: "translateY(10px) scale(0.985)" },
    visible: { opacity: 1, transform: "translateY(0px) scale(1)" },
};

// Reveals mobile TOC rows with a quiet active-outward cascade.
export const sheetRowTween = {
    duration: 0.18,
    ease: pageEase,
};

export const tocItemDelayStep = 0.016;
export const tocItemDelayCap = 0.25;
export const pageEnterStagger = 0.05;

// Preserves reading order while keeping editorial headline lines within one gesture.
export const editorialLineStagger = 0.06;
// Carries supporting hero elements forward without stretching the sequence.
export const editorialFollowerStagger = 0.05;
// Gives the headline a deliberate handoff before supporting content begins.
export const editorialHeadlinePause = 0.18;
export const editorialLineTransformFrom = "translateY(0.4em)";
export const editorialLineTransformTo = "translateY(0em)";
// Lifts supporting hero elements without competing with the headline.
export const editorialFollowerTransformFrom = "translateY(14px)";
export const editorialFollowerTransformTo = "translateY(0px)";
export const editorialBlurFrom = "blur(4px)";
export const editorialBlurTo = "blur(0px)";

// Restores desktop article-list focus over 140ms without spatial motion.
export const articleListFocusTransition = "opacity 140ms ease-out";

// Work disclosure caret: one glyph rotating, matched to the article list's feedback speed.
export const workDisclosureTransition =
    "transform 160ms ease-out, color 160ms ease-out";

// Drives each masked editorial headline line with the reference's gentle spring.
export const editorialLineTransition = {
    type: "spring" as const,
    visualDuration: 0.32,
    bounce: 0.1,
    opacity: {
        type: "tween" as const,
        duration: 0.32,
        ease: pageEase,
    },
};

// Moves supporting hero elements with a shorter, quieter spring.
export const editorialFollowerTransition = {
    type: "spring" as const,
    visualDuration: 0.24,
    bounce: 0.1,
    opacity: {
        type: "tween" as const,
        duration: 0.24,
        ease: pageEase,
    },
};

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

// Gives the theme glyph a directional orbital swap between celestial states.
export const themeToggleIconVariants = {
    initial: (direction: number) => ({
        rotate: -140 * direction,
        scale: 0.45,
        opacity: 0,
    }),
    animate: {
        rotate: 0,
        scale: 1,
        opacity: 1,
    },
    exit: (direction: number) => ({
        rotate: 140 * direction,
        scale: 0.45,
        opacity: 0,
    }),
};

export const themeToggleButtonHover = { scale: 1.08 };
export const themeToggleButtonTap = { scale: 0.9 };

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
        transition: instantRouteTween,
    },
};

export const reducedPageContainer = {
    hidden: {},
    visible: {},
};
