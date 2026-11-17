import { useReducedMotion } from "motion/react";
import { createSim, eventLoopExample, step, type SimState } from "../../lib/event-loop-sim";
import { guidePreviewBeatMs } from "../../lib/motion";
import { describeEvent } from "../event-loop/captions";
import { EventLoopDiagram } from "../event-loop/EventLoopDiagram";
import { useEventLoopPlayer } from "../event-loop/use-event-loop-player";

/** Under reduced motion the card holds the key moment: the microtask runs while the timer's task waits. */
const stillFrame: SimState = (() => {
    let state = createSim(eventLoopExample);
    while (!(state.event.type === "run" && state.event.from === "micro")) state = step(state);
    return state;
})();

function PlayingPreview() {
    const { sim } = useEventLoopPlayer({ program: eventLoopExample, beatMs: guidePreviewBeatMs, autoplay: true, loop: true });
    return <PreviewFrame animate state={sim} />;
}

function PreviewFrame({ state, animate }: Readonly<{ state: SimState; animate: boolean }>) {
    return (
        <div className="el-card">
            <EventLoopDiagram animate={animate} state={state} />
            <p className="el-card__caption">{describeEvent(state)}</p>
        </div>
    );
}

/**
 * The event-loop guide's hover preview: the same simulator and diagram as
 * the figure inside the guide, playing the guide's example on a loop while
 * the card is open. The parent remounts it on every open, so it always
 * starts from the top.
 */
export default function EventLoopPreview({ isRunning }: Readonly<{ isRunning: boolean }>) {
    const shouldReduceMotion = useReducedMotion();
    if (shouldReduceMotion) return <PreviewFrame animate={false} state={stillFrame} />;
    if (!isRunning) return <PreviewFrame animate={false} state={createSim(eventLoopExample)} />;
    return <PlayingPreview />;
}
