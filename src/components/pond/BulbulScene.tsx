import { LocalTime } from "../LocalTime";
import { Pond } from "./Pond";

/** A red-vented bulbul on a branch against the sky, lit by the time of day in Mumbai. */
export function BulbulScene() {
    return (
        <Pond
            caption={
                <>
                    Tap the bulbul to hear it sing. Tap the branch and it hops. The light follows my local time:{" "}
                    <LocalTime />
                </>
            }
            description="A red-vented bulbul in silhouette on a peepal bough of heart-shaped leaves against the sky, lit from behind by the current time of day in Mumbai: a bright hazy sun by day, a warm glow at dusk, and moonlight at night, when it sleeps with its head tucked in. Its head turns in quick glances, it flicks its tail, preens, shakes out its feathers and stretches a wing, and the leaves tremble in the wind. Tapping the bird makes it sing its call aloud, tapping the branch makes it hop there, and quick taps send it flying off before it comes back."
            mode="bird"
        />
    );
}
