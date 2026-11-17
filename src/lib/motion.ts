// Motion rule: scale entrances are limited to small page blocks; larger trees fade only.
export const snappySpring = {
    type: "spring" as const,
    visualDuration: 0.2,
    bounce: 0.15,
};

export const pageEase = [0.16, 1, 0.3, 1] as const;

// Guide preview scenes: one event every 1.1s in the hover card, long enough to read its caption.
export const guidePreviewBeatMs = 1100;

// Guide figures (GuideFigure): one step per 2.2s when playing, long enough to read a two-line caption.
export const guideFigureBeatMs = 2200;

// A pulse runs the length of a lit wire in 1.4s, then repeats while the step is shown.
export const guideFigurePulseMs = 1400;

// The event-loop figure in the guide: one event per 1.3s at 1x, slow enough to read the caption and follow the code.
export const eventLoopBeatMs = 1300;

export const tocLayerEase = [0.65, 0, 0.35, 1] as const;
export const tocLabelEase = [0.22, 1, 0.36, 1] as const;

// Desktop hook sidebar: the dashed rail and its hook travel to a row on Rare UI's spring.
export const tocHookSpring = {
    type: "spring" as const,
    stiffness: 420,
    damping: 34,
    mass: 0.7,
};

// Desktop hook sidebar: a rail fades in or out when it gains or loses a row.
export const tocHookFadeTween = {
    duration: 0.2,
    ease: tocLabelEase,
};

// Removes the desktop hook sidebar's motion under reduced motion.
export const tocHookInstantTween = {
    duration: 0,
};

// Morphs the mobile TOC pill into its bounded section menu.
export const tocSurfaceSpring = {
    type: "spring" as const,
    duration: 0.5,
    bounce: 0.16,
};

// Crossfades the mobile TOC surface layers without blur.
export const tocSurfaceFadeTween = {
    duration: 0.24,
    ease: tocLayerEase,
};

// Crossfades the mobile TOC label without spatial or blur motion.
export const tocLabelCrossfadeTween = {
    duration: 0.22,
    ease: tocLabelEase,
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

// Theme switch: the new theme grows as a circle out of the toggle. A rare, chosen action, so a calm ease-out.
export const themeRevealTiming = {
    duration: 520,
    easing: "cubic-bezier(0.22, 1, 0.36, 1)",
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

// Reveals mobile TOC rows in Rare UI's source-order cadence.
export const sheetRowTween = {
    duration: 0.3,
    ease: tocLayerEase,
};

export const tocItemDelayInitial = 0.04;
export const tocItemDelayStep = 0.03;
export const tocItemDelayCap = 0.4;
export const pageEnterStagger = 0.05;

// Preserves reading order while keeping editorial headline lines within one gesture.
export const editorialLineStagger = 0.06;
// Carries supporting hero elements forward without stretching the sequence.
export const editorialFollowerStagger = 0.05;
// Caps follower delays so long below-the-fold lists never stretch the entrance.
export const editorialFollowerMaxDelay = 0.6;
// Gives the headline a deliberate handoff before supporting content begins.
export const editorialHeadlinePause = 0.18;
export const editorialLineTransformFrom = "translateY(0.4em)";
export const editorialLineTransformTo = "translateY(0em)";
// Lifts supporting hero elements without competing with the headline.
export const editorialFollowerTransformFrom = "translateY(14px)";
export const editorialFollowerTransformTo = "translateY(0px)";
export const editorialBlurFrom = "blur(4px)";
export const editorialBlurTo = "blur(0px)";

// Work disclosure caret: one glyph rotating at the same speed as other row feedback.
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
