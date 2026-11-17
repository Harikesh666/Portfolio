import { Pond, type PondStill } from "./Pond";

const still: PondStill = {
    src: "/kund/makari-kund-1344.webp",
    srcSet: "/kund/makari-kund-800.webp 800w, /kund/makari-kund-1344.webp 1344w",
    sizes: "(min-width: 40rem) 42rem, 100vw",
    mask: "/kund/makari-kund-mask.png",
};

/**
 * The home scene: Makari Kund, the temple tank at Bijethua Mahaviran near
 * Harikesh's home in Pratapgarh, from his photo set on a 3D model of the
 * tank, and lit by the sun there right now.
 */
export function KundPond() {
    return (
        <Pond
            caption="Makari Kund at Bijethua, near my home in Pratapgarh, lit by the sun there now. Tap the water."
            description="Makari Kund, the stepped temple tank at Bijethua Mahaviran near Pratapgarh, from the near steps: saffron and yellow walls, grey steps on three sides, a pillar in the middle of green water, and the temple beyond among swaying trees. The light follows the time of day there, from an overcast day to low evening sun and a moonlit night, when the lamps and diyas along the steps are lit. Birds cross by day and fireflies come out at night. Tapping the water sends out ripples, and after dark a tap floats a diya."
            mode="kund"
            still={still}
        />
    );
}
