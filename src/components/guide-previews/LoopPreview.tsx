import { useReducedMotion } from "motion/react";
import { createSim, step, type SimState } from "../../lib/event-loop-sim";
import { guidePreviewBeatMs } from "../../lib/motion";
import { describeEvent } from "../event-loop/captions";
import { EventLoopDiagram } from "../event-loop/EventLoopDiagram";
import { figureExamples, type FigureExample, type FigureExampleName } from "../event-loop/examples";
import { useEventLoopPlayer } from "../event-loop/use-event-loop-player";

/** The first state the example calls its key moment, for reduced motion. */
function keyMoment(example: FigureExample): SimState {
    let state = createSim(example.program, example.simOptions);
    for (let index = 0; index < 200 && !example.isKeyMoment(state); index += 1) state = step(state);
    return state;
}

function Frame({ example, state, animate }: Readonly<{ example: FigureExample; state: SimState; animate: boolean }>) {
    const seconds = example.secondsPerTick;
    return (
        <div className="el-card">
            <EventLoopDiagram
                animate={animate}
                readout={seconds ? `T = ${state.time * seconds}s` : undefined}
                state={state}
            />
            <p className="el-card__caption">{describeEvent(state, { secondsPerTick: seconds })}</p>
        </div>
    );
}

function Playing({ example }: Readonly<{ example: FigureExample }>) {
    const { sim } = useEventLoopPlayer({
        program: example.program,
        options: example.simOptions,
        beatMs: guidePreviewBeatMs,
        autoplay: true,
        loop: true,
    });
    return <Frame animate example={example} state={sim} />;
}

/**
 * A guide's hover preview: the same simulator and diagram as the figure in
 * the guide, playing one of its examples on a loop while the card is open.
 * The parent remounts it on every open, so it always starts from the top.
 * Under reduced motion it holds the example's key moment instead.
 */
export default function LoopPreview({
    example: name,
    isRunning,
}: Readonly<{ example: FigureExampleName; isRunning: boolean }>) {
    const example: FigureExample = figureExamples[name];
    const shouldReduceMotion = useReducedMotion();
    if (shouldReduceMotion) return <Frame animate={false} example={example} state={keyMoment(example)} />;
    if (!isRunning) return <Frame animate={false} example={example} state={createSim(example.program, example.simOptions)} />;
    return <Playing example={example} />;
}
