import { useSyncExternalStore } from "react";

const timeZone = "Asia/Kolkata";

const timeFormat = new Intl.DateTimeFormat("en-IN", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
});

/** Notifies subscribers at each minute boundary, the clock's only change. */
function subscribe(onMinute: () => void) {
    let interval: number | undefined;
    const msToNextMinute = 60_000 - (Date.now() % 60_000);
    const timeout = window.setTimeout(() => {
        onMinute();
        interval = window.setInterval(onMinute, 60_000);
    }, msToNextMinute);

    return () => {
        window.clearTimeout(timeout);
        window.clearInterval(interval);
    };
}

/** Same string for every call within a minute, as useSyncExternalStore needs. */
function getSnapshot() {
    return timeFormat.format(Date.now());
}

/** Prerendered HTML has no time, so hydration always matches. */
function getServerSnapshot() {
    return null;
}

/**
 * Harikesh's local time in Mumbai. It renders only after hydration. Every
 * caller places it last on its line, so nothing after it shifts when the time
 * appears, and no fixed-width slot is needed to hold the space.
 */
export function LocalTime() {
    const time = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

    return (
        <span className="inline-flex items-baseline gap-1">
            Mumbai
            <span className="tabular-nums">
                {time ? (
                    <>
                        <span className="sr-only">, local time </span>
                        {time.toLowerCase()} IST
                    </>
                ) : null}
            </span>
        </span>
    );
}
