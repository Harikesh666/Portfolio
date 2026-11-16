import { daylightAt, mumbaiHour } from "./pond-daylight";
import { createFullscreenTriangle, fullscreenVertex, glslNoise, link, uniforms } from "./pond-gl";
import { createRipples, glslRippleHeight, type Ripples } from "./pond-ripples";

/** The petal photo: a 1600×520 strip, tiled with mirroring so it never shows a seam. */
const imageUrl = "/footer/petals.webp";
/** How tall one tile of the photo is drawn, in CSS pixels. Petals land at roughly 20px. */
const tileHeight = 170;
/** After the last touch, the garden keeps moving this long so it can settle, in seconds. */
const settleSeconds = 4;
/** The garden grows in over this long the first time it scrolls into view, in seconds. */
const growSeconds = 1.6;
/** The pointer stirs the surface once it has moved this many pixels. */
const stirDistance = 12;
const stirStrength = -0.9;
const tapStrength = -2.4;
/** How far the pointer parts the leaves, and how wide, in CSS pixels. */
const brushPush = 26;
const brushRadius = 85;
const maxStepSeconds = 0.05;
const pixelRatioCap = 1.5;

// The photo seen through a moving surface. Ripples shift and shade it, the
// brush parts it around the pointer, and its ragged top edge rises into
// place the first time it is seen.
const gardenFragment = /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D uImage;
uniform sampler2D uState;
uniform vec2 uSimSize;
uniform vec2 uCss;
uniform float uDpr;
uniform vec2 uTile;
uniform vec4 uBrush;
uniform float uGrow;
uniform float uBrightness;
out vec4 outColor;
${glslNoise}
${glslRippleHeight}

void main() {
    vec2 css = vec2(gl_FragCoord.x, uCss.y * uDpr - gl_FragCoord.y) / uDpr;
    float e = 2.8;
    vec2 slope = vec2(heightAt(css + vec2(e, 0.0)) - heightAt(css - vec2(e, 0.0)),
                      heightAt(css + vec2(0.0, e)) - heightAt(css - vec2(0.0, e))) * 0.5;

    // The brush pushes everything outward from the pointer, strongest near it.
    vec2 away = css - uBrush.xy;
    float reach = length(away) / uBrush.z;
    vec2 parted = reach < 1.0 ? normalize(away + 1e-4) * pow(1.0 - reach, 2.0) * uBrush.w : vec2(0.0);

    // Growing in eases the whole bed up from the bottom.
    float grow = 1.0 - pow(1.0 - uGrow, 3.0);
    vec2 rise = vec2(0.0, (1.0 - grow) * 12.0);

    vec2 sampleAt = css - slope * 32.0 + parted + rise;
    vec2 uv = vec2(sampleAt.x, sampleAt.y + (uTile.y - uCss.y) * 0.5) / uTile;
    vec3 color = texture(uImage, uv).rgb;
    float luma = dot(color, vec3(0.299, 0.587, 0.114));
    float petal = smoothstep(0.02, 0.12, color.r - color.g);

    // The top edge is cut from the photo itself: bright leaves and petals stand
    // taller than the dark gaps between them, with a slow wander and a few stray
    // specks, so the skyline is ragged like a real bed of plants. Growing in
    // raises that skyline from below the strip to its resting height.
    float presence = smoothstep(0.12, 0.42, luma) + petal * 0.45;
    float fromBottom = 1.0 - css.y / uCss.y;
    float clumps = fbm(vec2(css.x * 0.018, css.y * 0.03)) * 0.4;
    float height = fromBottom - presence * 0.26 - clumps
        + (hash(gl_FragCoord.xy) - 0.5) * 0.09;
    float alpha = step(height, mix(-0.3, 0.42, grow));

    // Calmer than the raw photo, so it sits under a quiet page.
    color = mix(vec3(luma), color, 0.86);

    // Ripple crests catch the light; troughs and the brushed hollow fall into shade.
    color *= 1.0 + clamp(-slope.x * 1.6 - slope.y * 1.2, -0.25, 0.3);
    color *= 1.0 - 0.24 * (reach < 1.0 ? pow(1.0 - reach, 2.0) : 0.0) * step(0.01, uBrush.w);

    // Lit for the Mumbai hour: as bright as the water, tinted by the light, cool at night.
    // The photo keeps its own colours at every hour (pink stays pink); the
    // dark theme and night only dim it a little.
    color *= uBrightness;
    outColor = vec4(color * alpha, alpha);
}
`;

export type FooterGarden = Readonly<{
    resize(): void;
    setVisible(visible: boolean): void;
    /** The pointer moved over the garden, in CSS pixels; null when it leaves. */
    stir(point: { x: number; y: number } | null): void;
    tap(x: number, y: number): void;
    /** Repaints the still frame, for example after the theme changes. */
    refresh(): void;
    destroy(): void;
}>;

type GardenOptions = Readonly<{
    container: HTMLElement;
    canvas: HTMLCanvasElement;
    reducedMotion: boolean;
    /** Fixes the hour (0 to 24) instead of reading the Mumbai clock, like the pond. */
    hourOverride?: number;
    isDark: () => boolean;
    /** Called once the photo has loaded and the first frame is drawn. */
    onReady: () => void;
}>;

/**
 * A strip of petals on moss along the bottom of the footer. It grows in
 * once, the first time it is seen, then stays a still frame until a
 * pointer moves through it, and runs only until it settles again. Under
 * reduced motion it appears fully grown and never moves. Returns null
 * without WebGL2.
 */
export function createFooterGarden(options: GardenOptions): FooterGarden | null {
    const { container, canvas, reducedMotion, hourOverride, isDark, onReady } = options;
    const context = canvas.getContext("webgl2", {
        alpha: true,
        antialias: false,
        premultipliedAlpha: true,
        powerPreference: "low-power",
    });
    if (!context) return null;
    const gl: WebGL2RenderingContext = context;
    const simulation = createRipples(gl);
    const program = link(gl, fullscreenVertex, gardenFragment);
    if (!simulation || !program) return null;
    const ripples: Ripples = simulation;
    const u = uniforms(gl, program, [
        "uImage", "uState", "uSimSize", "uCss", "uDpr", "uTile", "uBrush", "uGrow",
        "uBrightness",
    ]);
    const screen = createFullscreenTriangle(gl, [program]);
    const imageTexture = gl.createTexture();

    let imageSize: { width: number; height: number } | null = null;
    let isDestroyed = false;
    let width = 0;
    let height = 0;
    let ratio = 1;
    let grow = reducedMotion ? 1 : 0;
    let hasBeenSeen = false;
    let quietFor = settleSeconds;
    let isVisible = false;
    let frame: number | undefined;
    let lastTimestamp: number | undefined;
    let pointer: { x: number; y: number } | null = null;
    let lastStir: { x: number; y: number } | null = null;
    const brush = { x: 0, y: 0, strength: 0 };

    const image = new Image();
    image.decoding = "async";
    image.src = imageUrl;
    void image.decode().then(
        () => {
            if (isDestroyed) return;
            gl.bindTexture(gl.TEXTURE_2D, imageTexture);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
            gl.generateMipmap(gl.TEXTURE_2D);
            imageSize = { width: image.naturalWidth, height: image.naturalHeight };
            render(0);
            onReady();
            maybeStartGrowing();
        },
        () => {
            // A missing photo leaves the strip hidden rather than broken.
        },
    );

    function render(dt: number) {
        if (!imageSize || width === 0 || height === 0) return;
        ripples.step(dt);
        const dark = isDark();
        const light = daylightAt(hourOverride ?? mumbaiHour(), dark);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.useProgram(program);
        gl.bindVertexArray(screen.vao);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, ripples.texture());
        gl.uniform1i(u.uState, 0);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, imageTexture);
        gl.uniform1i(u.uImage, 1);
        gl.uniform2f(u.uSimSize, ripples.width(), ripples.height());
        gl.uniform2f(u.uCss, width, height);
        gl.uniform1f(u.uDpr, ratio);
        gl.uniform2f(u.uTile, (imageSize.width / imageSize.height) * tileHeight, tileHeight);
        gl.uniform4f(u.uBrush, brush.x, brush.y, brushRadius, brush.strength * brushPush);
        gl.uniform1f(u.uGrow, grow);
        gl.uniform1f(u.uBrightness, (dark ? 0.86 : 1) * (1 - 0.1 * light.night));
        gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function tick(timestamp: number) {
        const dt = lastTimestamp === undefined ? 0 : Math.min(maxStepSeconds, (timestamp - lastTimestamp) / 1000);
        lastTimestamp = timestamp;
        quietFor += dt;
        if (grow < 1) grow = Math.min(1, grow + dt / growSeconds);
        // The brush trails the pointer and fades once it stops or leaves.
        if (pointer) {
            brush.x += (pointer.x - brush.x) * Math.min(1, dt * 10);
            brush.y += (pointer.y - brush.y) * Math.min(1, dt * 10);
        }
        const target = pointer && quietFor < 0.6 ? 1 : 0;
        brush.strength += (target - brush.strength) * Math.min(1, dt * (target > brush.strength ? 6 : 1.8));
        render(dt);
        const isMoving = grow < 1 || quietFor < settleSeconds || brush.strength > 0.01;
        frame = isMoving && isVisible && !document.hidden ? window.requestAnimationFrame(tick) : undefined;
    }

    function run() {
        if (frame === undefined && isVisible) {
            lastTimestamp = undefined;
            frame = window.requestAnimationFrame(tick);
        }
    }

    function maybeStartGrowing() {
        if (!isVisible || !imageSize || hasBeenSeen) return;
        hasBeenSeen = true;
        if (grow < 1) run();
    }

    function wake() {
        if (reducedMotion) return;
        quietFor = 0;
        run();
    }

    return {
        resize() {
            width = container.clientWidth;
            height = container.clientHeight;
            if (width === 0 || height === 0) return;
            ratio = Math.min(pixelRatioCap, window.devicePixelRatio || 1);
            canvas.width = Math.round(width * ratio);
            canvas.height = Math.round(height * ratio);
            ripples.resize(width, height);
            render(0);
        },
        setVisible(visible) {
            isVisible = visible;
            if (visible) {
                maybeStartGrowing();
                if (grow < 1 && hasBeenSeen) run();
            } else if (frame !== undefined) {
                window.cancelAnimationFrame(frame);
                frame = undefined;
            }
        },
        stir(point) {
            pointer = point;
            if (!point) {
                lastStir = null;
                if (!reducedMotion) run();
                return;
            }
            if (reducedMotion) return;
            if (!lastStir) {
                brush.x = point.x;
                brush.y = point.y;
            }
            if (lastStir && Math.hypot(point.x - lastStir.x, point.y - lastStir.y) < stirDistance) {
                wake();
                return;
            }
            if (lastStir) ripples.drop(point.x, point.y, stirStrength, 3);
            lastStir = point;
            wake();
        },
        tap(x, y) {
            if (reducedMotion) return;
            ripples.drop(x, y, tapStrength, 4.5);
            wake();
        },
        refresh() {
            render(0);
        },
        destroy() {
            isDestroyed = true;
            if (frame !== undefined) window.cancelAnimationFrame(frame);
            ripples.destroy();
            screen.destroy();
            gl.deleteTexture(imageTexture);
            gl.deleteProgram(program);
        },
    };
}
