import { useReducedMotion } from "motion/react";
import { GuideFigure, type GuideFigureName } from "../guide-figures/GuideFigure";
import { FigurePreview } from "../guide-figures/kit";

/**
 * A guide's hover preview built from one of its figures: the drawing and
 * caption only, playing its steps on a loop while the card is open. The
 * parent remounts it on every open, so it starts from the first step.
 * Under reduced motion it holds the figure's overview.
 */
export default function FigurePreviewCard({ figure, isRunning }: Readonly<{ figure: GuideFigureName; isRunning: boolean }>) {
    const shouldReduceMotion = useReducedMotion() ?? false;
    return (
        <FigurePreview.Provider value={{ playing: isRunning && !shouldReduceMotion }}>
            <GuideFigure figure={figure} />
        </FigurePreview.Provider>
    );
}
