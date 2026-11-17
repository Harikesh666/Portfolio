import { useEffect, useReducer } from "react";
import {
    addMicrotask,
    addTimer,
    createSim,
    isSettled,
    step,
    type CallbackSpec,
    type SimState,
} from "../../lib/event-loop-sim";

export type PlayerSpeed = 0.5 | 1 | 2;

type PlayerState = Readonly<{
    sim: SimState;
    isPlaying: boolean;
    /** False until the reader first presses play or step, so the figure can show its start overlay. */
    hasStarted: boolean;
    speed: PlayerSpeed;
    extraCount: number;
}>;

type PlayerAction =
    | { type: "tick" }
    | { type: "play" }
    | { type: "pause" }
    | { type: "step" }
    | { type: "restart" }
    | { type: "speed"; speed: PlayerSpeed }
    | { type: "add-timer" }
    | { type: "add-microtask" };

function reducer(program: CallbackSpec, loop: boolean) {
    return (state: PlayerState, action: PlayerAction): PlayerState => {
        switch (action.type) {
            case "tick": {
                if (isSettled(state.sim) && state.sim.event.type === "idle") {
                    // Finished: start over when looping (the hover card), otherwise stop on the last frame.
                    return loop ? { ...state, sim: createSim(program) } : { ...state, isPlaying: false };
                }
                return { ...state, sim: step(state.sim) };
            }
            case "play": {
                const finished = isSettled(state.sim) && state.sim.event.type === "idle";
                return { ...state, sim: finished ? createSim(program) : state.sim, isPlaying: true, hasStarted: true };
            }
            case "pause":
                return { ...state, isPlaying: false };
            case "step":
                return isSettled(state.sim) && state.sim.event.type === "idle"
                    ? { ...state, hasStarted: true }
                    : { ...state, sim: step(state.sim), isPlaying: false, hasStarted: true };
            case "restart":
                return { ...state, sim: createSim(program), isPlaying: false, extraCount: 0 };
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
                return { ...state, sim, extraCount: count, isPlaying: true, hasStarted: true };
            }
        }
    };
}

/**
 * Drives an event-loop simulation for a figure: playback on a fixed beat
 * scaled by speed, stepping, restarting and adding work. `autoplay` starts
 * immediately (the hover card); otherwise the reader starts it.
 */
export function useEventLoopPlayer({
    program,
    beatMs,
    autoplay = false,
    loop = false,
}: Readonly<{ program: CallbackSpec; beatMs: number; autoplay?: boolean; loop?: boolean }>) {
    const [state, dispatch] = useReducer(reducer(program, loop), undefined, () => ({
        sim: createSim(program),
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

    return { ...state, dispatch };
}
