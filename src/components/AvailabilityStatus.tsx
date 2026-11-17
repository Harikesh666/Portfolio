import { LocalTime } from "./LocalTime";
import { site } from "../lib/site";

/**
 * "Open to Node.js backend and cloud roles · Mumbai 2:14 pm IST" with a softly pulsing
 * green dot, so a recruiter sees availability before anything else. Renders
 * inline content only; the caller supplies the block element. Styling lives in
 * `styles.css` (`.availability`).
 */
export function AvailabilityStatus() {
    return (
        <span className="availability">
            <span aria-hidden="true" className="availability__dot" />
            <span className="text-foreground-strong">{site.availability}</span>
            <span aria-hidden="true">·</span>
            <LocalTime />
        </span>
    );
}
