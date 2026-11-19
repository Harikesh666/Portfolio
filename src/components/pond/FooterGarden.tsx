import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import type { FooterGarden as FooterGardenEngine } from "./footer-garden";
import { readHourOverride } from "./pond-hour";

/**
 * Decorative petals on moss along the bottom of the footer: move a pointer
 * through them and the plants bend the way it moves and spring back, and
 * the loose petals lift and flutter back down. A tap puffs the petals up. The renderer and photo load only when the strip comes
 * near the viewport, and the strip stays hidden without WebGL2.
 */
export function FooterGarden() {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const petalCanvasRef = useRef<HTMLCanvasElement>(null);
    const gardenRef = useRef<FooterGardenEngine | null>(null);
    const [isReady, setIsReady] = useState(false);
    const shouldReduceMotion = useReducedMotion() ?? false;

    useEffect(() => {
        const container = containerRef.current;
        const canvas = canvasRef.current;
        const petalCanvas = petalCanvasRef.current;
        if (!container || !canvas || !petalCanvas) return;

        let isCancelled = false;
        let isLoading = false;
        let isVisible = false;
        const refresh = () => gardenRef.current?.refresh();

        const load = () => {
            isLoading = true;
            void import("./footer-garden").then(({ createFooterGarden }) => {
                if (isCancelled) return;
                gardenRef.current = createFooterGarden({
                    container,
                    canvas,
                    petalCanvas,
                    reducedMotion: shouldReduceMotion,
                    hourOverride: readHourOverride(),
                    isDark: () => document.documentElement.dataset.theme === "dark",
                    onReady: () => setIsReady(true),
                });
                gardenRef.current?.resize();
                gardenRef.current?.setVisible(isVisible);
            });
        };

        // Load a little before the strip scrolls into view.
        const nearby = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !isLoading) load();
            },
            { rootMargin: "300px 0px" },
        );
        nearby.observe(container);
        const visibility = new IntersectionObserver(([entry]) => {
            isVisible = entry.isIntersecting;
            gardenRef.current?.setVisible(isVisible);
        });
        visibility.observe(container);
        const sizing = new ResizeObserver(() => gardenRef.current?.resize());
        sizing.observe(container);
        window.addEventListener("themechange", refresh);

        return () => {
            isCancelled = true;
            nearby.disconnect();
            visibility.disconnect();
            sizing.disconnect();
            window.removeEventListener("themechange", refresh);
            gardenRef.current?.destroy();
            gardenRef.current = null;
        };
    }, [shouldReduceMotion]);

    function pointFrom(event: React.PointerEvent<HTMLDivElement>) {
        const bounds = event.currentTarget.getBoundingClientRect();
        return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
    }

    return (
        <div
            aria-hidden="true"
            className="footer-garden"
            data-ready={isReady ? "" : undefined}
            onPointerDown={(event) => {
                const point = pointFrom(event);
                gardenRef.current?.tap(point.x, point.y);
            }}
            onPointerLeave={() => gardenRef.current?.stir(null)}
            onPointerMove={(event) => gardenRef.current?.stir(pointFrom(event))}
            ref={containerRef}
        >
            <canvas className="footer-garden__canvas" ref={canvasRef} />
            {/* The loose petals, and the air above the bed that they fly in. Taps pass through it to the page. */}
            <canvas className="footer-garden__petals" ref={petalCanvasRef} />
        </div>
    );
}
