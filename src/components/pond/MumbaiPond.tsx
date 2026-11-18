import { Pond } from "./Pond";

/** The home pond: lit by Mumbai's time of day, with koi that come to visitors. */
export function MumbaiPond() {
    return (
        <Pond
            caption={
                "Tap to feed the koi. The light follows my local time in Mumbai."
            }
            description="A koi pond lit by the current time of day in Mumbai: bright by day, golden at dusk, and moonlit at night. The koi gather near the pointer and come to food when the pond is tapped."
            mode="garden"
        />
    );
}
