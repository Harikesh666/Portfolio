export const restoreScrollFromPathStateKey =
    "__portfolioRestoreScrollFromPath";

export type ScrollRestoreState = {
    [restoreScrollFromPathStateKey]?: string;
};

export function getScrollPathKey(pathname: string) {
    return pathname === "/" ? pathname : pathname.replace(/\/+$/, "");
}
