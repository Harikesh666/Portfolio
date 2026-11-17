import type { ComponentType } from "react";
import { ArrayFigure, arraySpecs, ThreeOperationsFigure, UsersChainFigure } from "./data";
import { CallStackFigure, JourneyFigure } from "./engine";
import { ParseFigure } from "./parse";
import { DoubleBufferFigure, ElementsToDomFigure, HookListFigure, HostConfigFigure } from "./react";
import {
    BindingFanFigure,
    EnvironmentAnatomyFigure,
    ErrorKindsFigure,
    ScopeChainFigure,
    scopeSpecs,
    TdzFigure,
} from "./scope";
import {
    CallbackQueueFigure,
    ConcurrencyLoopFigure,
    countdownStack,
    ExecutionContextFigure,
    firstSecondStack,
    MemoryPhaseFigure,
    StackFigure,
    WithLoggingFigure,
} from "./running";
import { AddressSpaceFigure, ClientsServerFigure, ProgramToProcessFigure, SchedulerFigure } from "./processing";
import {
    ClientServerFigure,
    HeapFigure,
    NodeLayersFigure,
    PortabilityFigure,
    ShapeFeedbackFigure,
    TiersFigure,
} from "./v8";

/**
 * Figures a guide places with `<GuideFigure figure="…" />`, each replacing
 * one of the guides' text diagrams. Names are grouped by guide.
 */
const figures = {
    "v8-portability": PortabilityFigure,
    "v8-node-layers": NodeLayersFigure,
    "v8-client-server": ClientServerFigure,
    "v8-parser": () => <ParseFigure engine="V8" source="let x = 1;" />,
    "v8-tiers": TiersFigure,
    "v8-shape-feedback": ShapeFeedbackFigure,
    "v8-heap": HeapFigure,
    "engine-journey": JourneyFigure,
    "engine-parser": () => <ParseFigure engine="The engine" source="let answer = 7;" />,
    "engine-call-stack": CallStackFigure,
    "process-start": ProgramToProcessFigure,
    "process-fifo": () => <SchedulerFigure mode="fifo" />,
    "process-time-slices": () => <SchedulerFigure mode="slice" />,
    "process-clients-server": ClientsServerFigure,
    "process-address-space": AddressSpaceFigure,
    "scope-anatomy": EnvironmentAnatomyFigure,
    "scope-inner-outer": () => <ScopeChainFigure spec={scopeSpecs["scope-inner-outer"]} />,
    "scope-first-second": () => <ScopeChainFigure spec={scopeSpecs["scope-first-second"]} />,
    "scope-route": () => <ScopeChainFigure spec={scopeSpecs["scope-route"]} />,
    "block-outer": () => <ScopeChainFigure spec={scopeSpecs["block-outer"]} />,
    "block-shadowing": () => <ScopeChainFigure spec={scopeSpecs["block-shadowing"]} />,
    "block-no-inward": () => <ScopeChainFigure spec={scopeSpecs["block-no-inward"]} />,
    "tdz-bindings": TdzFigure,
    "tdz-error-kinds": ErrorKindsFigure,
    "backpack-nested": () => <ScopeChainFigure spec={scopeSpecs["backpack-nested"]} />,
    "backpack-global": () => <ScopeChainFigure spec={scopeSpecs["backpack-global"]} />,
    "backpack-three": () => <ScopeChainFigure spec={scopeSpecs["backpack-three"]} />,
    "closures-outest": () => <ScopeChainFigure spec={scopeSpecs["closures-outest"]} />,
    "loop-var-binding": () => <BindingFanFigure kind="var" />,
    "loop-let-bindings": () => <BindingFanFigure kind="let" />,
    "loop-close-bindings": () => <BindingFanFigure kind="close" />,
    "loop-callback-queue": CallbackQueueFigure,
    "ctx-anatomy": ExecutionContextFigure,
    "ctx-memory": MemoryPhaseFigure,
    "ctx-stack-0": () => <StackFigure at={0} spec={firstSecondStack} />,
    "ctx-stack-1": () => <StackFigure at={1} spec={firstSecondStack} />,
    "ctx-stack-2": () => <StackFigure at={2} spec={firstSecondStack} />,
    "ctx-stack-3": () => <StackFigure at={3} spec={firstSecondStack} />,
    "ctx-countdown": () => <StackFigure spec={countdownStack} />,
    "concurrency-loop": ConcurrencyLoopFigure,
    "hof-with-logging": WithLoggingFigure,
    "map-double": () => <ArrayFigure spec={arraySpecs["map-double"]} />,
    "map-positions": () => <ArrayFigure spec={arraySpecs["map-positions"]} />,
    "filter-four": () => <ArrayFigure spec={arraySpecs["filter-four"]} />,
    "users-chain": UsersChainFigure,
    "three-operations": ThreeOperationsFigure,
    "react-elements-to-dom": ElementsToDomFigure,
    "react-host-config": HostConfigFigure,
    "react-double-buffer": DoubleBufferFigure,
    "react-hook-list": HookListFigure,
} satisfies Record<string, ComponentType>;

export type GuideFigureName = keyof typeof figures;

export function isGuideFigureName(value: unknown): value is GuideFigureName {
    return typeof value === "string" && Object.hasOwn(figures, value);
}

export function GuideFigure({ figure }: Readonly<{ figure?: unknown }>) {
    if (!isGuideFigureName(figure)) return null;
    const Figure = figures[figure];
    return <Figure />;
}
