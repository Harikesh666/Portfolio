import { useEffect, useReducer } from "react";
import {
    addMicrotask,
    addTimer,
    createSim,
    isSettled,
    step,
    type CallbackSpec,
    type SimOptions,
    type SimState,
} from "../../lib/event-loop-sim";

export type PlayerSpeed = 0.5 | 1 | 2;

/** How many earlier states Back can return to. */
const historyLimit = 400;

type PlayerState = Readonly<{
    sim: SimState;
    /** Earlier states, newest last, so a reader can step back. */
    past: readonly SimState[];
    isPlaying: boolean;
    /** False until the reader first presses play or step, so the figure can show its start overlay. */
    hasStarted: boolean;
    speed: PlayerSpeed;
    extraCount: number;
}>;

export type PlayerAction =
    | { type: "tick" }
    | { type: "play" }
    | { type: "pause" }
    | { type: "toggle" }
    | { type: "step" }
    | { type: "back" }
    | { type: "restart" }
    | { type: "speed"; speed: PlayerSpeed }
    | { type: "add-timer" }
    | { type: "add-microtask" };

const isFinished = (sim: SimState) => isSettled(sim) && sim.event.type === "idle";

function advance(state: PlayerState, sim: SimState): PlayerState {
    return { ...state, sim, past: [...state.past, state.sim].slice(-historyLimit) };
}

function reducer(program: CallbackSpec, options: SimOptions | undefined, loop: boolean) {
    const fresh = (state: PlayerState): PlayerState => ({ ...state, sim: createSim(program, options), past: [] });
    return (state: PlayerState, action: PlayerAction): PlayerState => {
        switch (action.type) {
            case "tick":
                if (isFinished(state.sim)) {
                    // Finished: start over when looping (the hover card), otherwise stop on the last frame.
                    return loop ? fresh(state) : { ...state, isPlaying: false };
                }
                return advance(state, step(state.sim));
            case "play":
                return { ...(isFinished(state.sim) ? fresh(state) : state), isPlaying: true, hasStarted: true };
            case "pause":
                return { ...state, isPlaying: false };
            case "toggle":
                return state.isPlaying
                    ? { ...state, isPlaying: false }
                    : { ...(isFinished(state.sim) ? fresh(state) : state), isPlaying: true, hasStarted: true };
            case "step":
                if (isFinished(state.sim)) return { ...state, isPlaying: false, hasStarted: true };
                return { ...advance(state, step(state.sim)), isPlaying: false, hasStarted: true };
            case "back": {
                const previous = state.past.at(-1);
                if (!previous) return { ...state, isPlaying: false };
                return { ...state, sim: previous, past: state.past.slice(0, -1), isPlaying: false, hasStarted: true };
            }
            case "restart":
                return { ...fresh(state), isPlaying: false, extraCount: 0 };
            case "speed":
                return { ...state, speed: action.speed };
            case "add-timer":
            case "add-microtask": {
                const count = state.extraCount + 1;
                const sim =
                    action.type === "add-timer"
                        ? addTimer(state.sim, `timer${count}`)
                        : addMicrotask(state.sim, `micro${count}`);
                // New work should be seen moving, so adding it also plays.
                return { ...advance(state, sim), extraCount: count, isPlaying: true, hasStarted: true };
            }
        }
    };
}

/**
 * Drives an event-loop simulation for a figure: playback on a fixed beat
 * scaled by speed, stepping forward and back, restarting and adding work.
 * `autoplay` starts immediately (the hover card); otherwise the reader
 * starts it.
 */
export function useEventLoopPlayer({
    program,
    options,
    beatMs,
    autoplay = false,
    loop = false,
}: Readonly<{ program: CallbackSpec; options?: SimOptions; beatMs: number; autoplay?: boolean; loop?: boolean }>) {
    const [state, dispatch] = useReducer(reducer(program, options, loop), undefined, () => ({
        sim: createSim(program, options),
        past: [],
        isPlaying: autoplay,
        hasStarted: autoplay,
        speed: 1 as PlayerSpeed,
        extraCount: 0,
    }));

    useEffect(() => {
        if (!state.isPlaying) return;
        const interval = window.setInterval(() => dispatch({ type: "tick" }), beatMs / state.speed);
        return () => window.clearInterval(interval);
    }, [state.isPlaying, state.speed, beatMs]);

    return { ...state, canGoBack: state.past.length > 0, dispatch };
}
