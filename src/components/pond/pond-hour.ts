/** `?pond-hour=19.5` previews the pond and footer water at another Mumbai hour. */
export function readHourOverride() {
    const value = new URLSearchParams(window.location.search).get("pond-hour");
    const hour = value === null ? Number.NaN : Number(value);
    return Number.isFinite(hour) ? hour : undefined;
}
