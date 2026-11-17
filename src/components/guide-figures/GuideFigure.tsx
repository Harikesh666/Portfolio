import type { ComponentType } from "react";
import { CallStackFigure, JourneyFigure } from "./engine";
import { ParseFigure } from "./parse";
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
