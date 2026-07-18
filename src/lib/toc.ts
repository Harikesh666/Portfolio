import { tocItemDelayCap, tocItemDelayStep } from "./motion";

export const desktopQuery = "(min-width: 1280px)";

export function getTocItemDelay(distance: number): number {
    return Math.min(distance * tocItemDelayStep, tocItemDelayCap);
}

export function shouldDismissSheet(
    offset: number,
    velocity: number,
    sheetHeight: number,
): boolean {
    return offset > sheetHeight * 0.25 || velocity > 500;
}
