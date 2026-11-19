import { daylightAt, mumbaiHour } from "./pond-daylight";
import { createFullscreenTriangle, fullscreenVertex, glslNoise, link, uniforms } from "./pond-gl";
import { createPetals, type Petals } from "./footer-petals";
import { createSway, swayFeel, type Sway } from "./footer-sway";

/** The petal photo: a 1600×520 strip. The shader tiles it sideways and hides each seam under a second, shifted copy. */
const imageUrl = "/footer/petals.webp";
/**
 * How tall one tile of the photo is drawn, in CSS pixels: 1.3 strip heights,
 * at most 170px. Petals land near 20px on a desktop strip and stay in
 * proportion on the shorter phone strip.
 */
const tileHeightFor = (stripHeight: number) => Math.min(170, stripHeight * 1.3);
/** The air above the bed that loose petals may fly in, in CSS pixels: about a strip's height, at most 120px. */
const headroomFor = (stripHeight: number) => Math.min(120, Math.round(stripHeight * 1.1));
/** One loose petal for about every this many pixels of width, within these limits. */
const petalSpacing = 27;
const petalLimits: readonly [number, number] = [12, 56];
/** The garden grows in over this long the first time it scrolls into view, in seconds. */
const growSeconds = 1.6;
/** As it grows in, this many petals drift down onto it. */
const arrivingPetals = 4;
/** The hand is felt from this far above the petals' layer, in CSS pixels, so floating petals can be chased a little past it. */
const handMargin = 60;
/** A hand that has not moved for this long, in seconds, has stopped, and its speed dies away this quickly. */
const handStill = 0.08;
const handFade = 14;
/** No hand is taken to move faster than this, in pixels a second: one wild event must not throw petals across the page. */
const handFastest = 2400;
/** A tap shakes this many fresh petals loose. */
const tapPetals = 7;
/** Bent plants also dip: their tops come down by this share of how far they are carried sideways. */
const swayDip = 0.24;
/** A loose petal lying on the plants rides this share of their sway. */
const petalRide = 0.8;
/** A breeze blows this long, in seconds, and something stirs on its own this often while the bed is on screen. */
const breezeSeconds = 2.8;
const idleEvery: readonly [number, number] = [7, 13];
const maxStepSeconds = 0.05;
const pixelRatioCap = 1.5;
/** Loose petals are small and sharp-edged, so their layer may use the screen's full density up to this. */
const petalPixelRatioCap = 2;

// The photo seen as a bed of plants. Its top edge is cut from the photo
// itself, a breeze sways it, a hand through it carries the plants along and
// leaves a wake of sway behind it, and it rises into place the first time
// it is seen.
const tiling = /* glsl */ `
// Every other tile is turned upside down, so two neighbours never look like the same picture.
vec2 tileUv(vec2 uv) {
    return vec2(uv.x, mix(uv.y, 1.0 - uv.y, mod(floor(uv.x), 2.0)));
}

// The photo at a point, at a level of blur. Near a tile's seam it crossfades
// to a copy shifted most of half a tile along, which has no seam there. The
// crossfade follows a wavering line, so the join is not a straight stripe.
vec3 bed(sampler2D image, vec2 uv, float blur) {
    float along = fract(uv.x + (noise(vec2(uv.y * 9.0, floor(uv.x + 0.5))) - 0.5) * 0.05);
    float own = smoothstep(0.0, 0.035, along) * (1.0 - smoothstep(0.965, 1.0, along));
    vec3 here = textureLod(image, tileUv(uv), blur).rgb;
    vec3 shifted = textureLod(image, tileUv(uv + vec2(0.43, 0.0)), blur).rgb;
    return mix(shifted, here, own);
}
`;
const gardenFragment = /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D uImage;
uniform vec2 uCss;
uniform float uDpr;
uniform vec2 uTile;
uniform sampler2D uSway;
uniform float uSwayMost;
uniform float uGrow;
uniform float uBrightness;
uniform vec2 uWind;
out vec4 outColor;
${glslNoise}
${tiling}

void main() {
    vec2 css = vec2(gl_FragCoord.x, uCss.y * uDpr - gl_FragCoord.y) / uDpr;
    float fromBottom = 1.0 - css.y / uCss.y;

    // Growing in eases the whole bed up from the bottom.
    float grow = 1.0 - pow(1.0 - uGrow, 3.0);
    vec2 rise = vec2(0.0, (1.0 - grow) * 12.0);

    // A breeze: a wave that travels along the bed, swaying the tops of the plants more than their feet.
    float sway = sin(css.x * 0.021 - uWind.y * 2.4) + 0.5 * sin(css.x * 0.047 + uWind.y * 3.1);
    vec2 breeze = vec2(sway * 2.6, sway * 0.7) * uWind.x * smoothstep(0.0, 0.9, fromBottom);

    // How far the plants here are bent, from the row of springs along the bed.
    // They bend sideways and dip a little as they do, their tops further than
    // their feet, so it reads as stems swaying and never as a lens over the photo.
    float bent = (texture(uSway, vec2(css.x / uCss.x, 0.5)).r - 0.5) * 2.0 * uSwayMost;
    vec2 swept = vec2(bent, abs(bent) * ${swayDip.toFixed(2)}) * smoothstep(0.0, 0.8, fromBottom);

    // Sampling the photo along a slow wander keeps its repeats from lining up.
    vec2 wander = vec2(fbm(vec2(css.x * 0.0035, 2.0)) - 0.5, fbm(vec2(css.x * 0.005, 9.0)) - 0.5) * vec2(26.0, 14.0);

    vec2 sampleAt = css - swept + rise + breeze + wander;
    vec2 uv = vec2(sampleAt.x, sampleAt.y + (uTile.y - uCss.y) * 0.5) / uTile;
    // The mip level a pixel needs, worked out from the unbroken position, since a tile's edge breaks the texture's own.
    float lod = max(0.0, log2(float(textureSize(uImage, 0).y) / (uTile.y * uDpr)));
    vec3 color = bed(uImage, uv, lod);
    vec3 weights = vec3(0.299, 0.587, 0.114);
    float luma = dot(color, weights);
    float softLuma = dot(bed(uImage, uv, lod + 2.6), weights);
    float petal = smoothstep(0.02, 0.12, color.r - color.g);

    // The top edge is cut from the photo itself: bright leaves and petals stand
    // taller than the dark gaps between them, over clumps that rise and dip, so
    // the skyline is ragged like a real bed of plants. The edge is a soft pixel
    // wide, never a hard step, and growing in raises it from below the strip.
    float presence = mix(smoothstep(0.12, 0.42, softLuma), smoothstep(0.12, 0.42, luma), 0.2) + petal * 0.22;
    float clumps = fbm(vec2(css.x * 0.018, 4.0)) * 0.42 + fbm(vec2(css.x * 0.07, 11.0)) * 0.1;
    float skyline = mix(-0.4, 0.3, grow) + presence * 0.24 + clumps;
    float pixel = 1.0 / (uCss.y * uDpr);
    float alpha = 1.0 - smoothstep(skyline - pixel, skyline + pixel * 1.5, fromBottom);

    // Calmer than the raw photo, so it sits under a quiet page.
    color = mix(vec3(luma), color, 0.86);

    // The tips of the plants catch the light, and a breeze brightens the side
    // of each wave that turns up to it.
    color *= 1.0 + 0.1 * smoothstep(skyline - 0.18, skyline, fromBottom);
    color *= 1.0 + 0.05 * sway * uWind.x;

    // The photo keeps its own colours at every hour (pink stays pink); the
    // dark theme and night only dim it a little.
    color *= uBrightness;
    outColor = vec4(color * alpha, alpha);
}
`;

export type FooterGarden = Readonly<{
    resize(): void;
    setVisible(visible: boolean): void;
    tap(x: number, y: number): void;
    /** Repaints the still frame, for example after the theme changes. */
    refresh(): void;
    destroy(): void;
}>;

type GardenOptions = Readonly<{
    container: HTMLElement;
    canvas: HTMLCanvasElement;
    /** A second canvas over the bed and the air above it, where the loose petals are drawn. */
    petalCanvas: HTMLCanvasElement;
    reducedMotion: boolean;
    /** Fixes the hour (0 to 24) instead of reading the Mumbai clock, like the pond. */
    hourOverride?: number;
    isDark: () => boolean;
    /** Called once the photo has loaded and the first frame is drawn. */
    onReady: () => void;
}>;

/**
 * The petal drawings: four pinks seen from above, and one paler underside,
 * matched to the photo's own dusty pink so a loose petal looks like one of
 * its petals come free. Each is a square cell of this many pixels.
 */
const petalCell = 48;
const petalColours: readonly (readonly [string, string, string])[] = [
    ["#e6bcc8", "#d39aae", "#b67890"],
    ["#e2b3c1", "#cc8fa5", "#ad6e87"],
    ["#eac6d0", "#d8a5b6", "#bc8398"],
    ["#dfabbb", "#c7879f", "#a5647f"],
    ["#eed4db", "#e2bcc8", "#cba3b2"],
];
const undersideKind = petalColours.length - 1;

/** Paints the sheet of petal drawings: a rounded teardrop with a small cleft at its tip, a pale edge and a centre vein. */
function paintPetalSheet() {
    const sheet = document.createElement("canvas");
    sheet.width = petalCell * petalColours.length;
    sheet.height = petalCell;
    const context = sheet.getContext("2d");
    if (!context) return sheet;
    petalColours.forEach(([pale, body, deep], kind) => {
        const unit = petalCell * 0.44;
        context.setTransform(unit, 0, 0, unit, petalCell * (kind + 0.5), petalCell * 0.5);
        context.beginPath();
        context.moveTo(-1, 0);
        context.bezierCurveTo(-0.55, -0.62, 0.35, -0.86, 0.88, -0.4);
        context.quadraticCurveTo(1.04, -0.14, 0.82, 0);
        context.quadraticCurveTo(1.04, 0.14, 0.88, 0.4);
        context.bezierCurveTo(0.35, 0.86, -0.55, 0.62, -1, 0);
        context.closePath();
        // Deeper where it joined the flower, paler toward its edge.
        const fill = context.createRadialGradient(-0.5, 0, 0.05, 0.1, 0, 1.15);
        fill.addColorStop(0, deep);
        fill.addColorStop(0.45, body);
        fill.addColorStop(1, pale);
        context.fillStyle = fill;
        context.fill();
        context.strokeStyle = deep;
        context.globalAlpha = 0.45;
        context.lineWidth = 0.035;
        context.beginPath();
        context.moveTo(-0.9, 0);
        context.quadraticCurveTo(0, 0.05, 0.72, 0);
        context.moveTo(-0.4, 0);
        context.quadraticCurveTo(0.1, -0.3, 0.55, -0.42);
        context.moveTo(-0.4, 0);
        context.quadraticCurveTo(0.1, 0.3, 0.55, 0.42);
        context.stroke();
        context.globalAlpha = 1;
    });
    // A little tooth in the colour, like the photo's own grain. It only touches what is already painted.
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.globalCompositeOperation = "source-atop";
    let state = 7;
    for (let i = 0; i < 2600; i++) {
        state = (state * 1664525 + 1013904223) % 4294967296;
        const x = (state / 4294967296) * sheet.width;
        state = (state * 1664525 + 1013904223) % 4294967296;
        const y = (state / 4294967296) * sheet.height;
        context.fillStyle = i % 2 === 0 ? "rgba(255, 255, 255, 0.07)" : "rgba(70, 30, 50, 0.07)";
        context.fillRect(x, y, 1.6, 1.6);
    }
    context.globalCompositeOperation = "source-over";
    return sheet;
}

/**
 * A strip of petals on moss along the bottom of the footer. It grows in
 * once, the first time it is seen, as a few petals drift down onto it.
 * After that it is a still frame until something stirs it. A pointer
 * through the bed lifts the petals it passes, shakes fresh ones loose and
 * moves the air, so floating petals follow it and swirl round it
 * (`footer-petals.ts`), while the plants sway under it (`footer-sway.ts`).
 * A tap puffs petals up, and now and then a breeze or a falling petal
 * stirs it on its own. It runs only until everything
 * has settled again. Under reduced motion it appears fully grown and never
 * moves. Returns null without WebGL2.
 */
export function createFooterGarden(options: GardenOptions): FooterGarden | null {
    const { container, canvas, petalCanvas, reducedMotion, hourOverride, isDark, onReady } = options;
    const context = canvas.getContext("webgl2", {
        alpha: true,
        antialias: false,
        premultipliedAlpha: true,
        powerPreference: "low-power",
    });
    if (!context) return null;
    const gl: WebGL2RenderingContext = context;
    const program = link(gl, fullscreenVertex, gardenFragment);
    if (!program) return null;
    const u = uniforms(gl, program, [
        "uImage", "uCss", "uDpr", "uTile", "uSway", "uSwayMost", "uGrow", "uBrightness", "uWind",
    ]);
    const screen = createFullscreenTriangle(gl, [program]);
    const imageTexture = gl.createTexture();
    // The plants' sway, one byte per column: a row the shader reads smoothly along the bed.
    const swayTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, swayTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    let swayBytes = new Uint8Array(2);
    const petalContext = petalCanvas.getContext("2d");
    const petalSheet = paintPetalSheet();

    let imageSize: { width: number; height: number } | null = null;
    let isDestroyed = false;
    let width = 0;
    let height = 0;
    let headroom = 0;
    let ratio = 1;
    let petalRatio = 1;
    let grow = reducedMotion ? 1 : 0;
    let hasBeenSeen = false;
    let isVisible = false;
    let frame: number | undefined;
    let idleTimer: number | undefined;
    let lastTimestamp: number | undefined;
    /** The hand: where the pointer is in the petals' layer, how fast it is moving, and when it last moved. */
    const hand = { x: 0, y: 0, vx: 0, vy: 0, at: 0, near: false };
    let petals: Petals | undefined;
    /** The breeze: how hard it is blowing, 0 to 1, how long it has left, and a clock for its sway. */
    let gust = 0;
    let gustLeft = 0;
    let windTime = 0;
    let sway: Sway | undefined;

    const image = new Image();
    image.decoding = "async";
    image.src = imageUrl;
    void image.decode().then(
        () => {
            if (isDestroyed) return;
            gl.bindTexture(gl.TEXTURE_2D, imageTexture);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
            gl.generateMipmap(gl.TEXTURE_2D);
            imageSize = { width: image.naturalWidth, height: image.naturalHeight };
            render();
            onReady();
            maybeStartGrowing();
        },
        () => {
            // A missing photo leaves the strip hidden rather than broken.
        },
    );

    /** As bright as the photo is shown: the dark theme and night only dim it a little. */
    function brightness() {
        const dark = isDark();
        return (dark ? 0.86 : 1) * (1 - 0.1 * daylightAt(hourOverride ?? mumbaiHour(), dark).night);
    }

    /** The loose petals: a soft shadow under each, then the petal, turned and tumbled, all dimmed like the photo. */
    function drawPetals() {
        if (!petalContext || !petals) return;
        const k = petalRatio;
        petalContext.setTransform(1, 0, 0, 1, 0, 0);
        petalContext.globalAlpha = 1;
        petalContext.globalCompositeOperation = "source-over";
        petalContext.clearRect(0, 0, petalCanvas.width, petalCanvas.height);
        // Until the photo has drawn there is no bed for them to lie on.
        if (!imageSize) return;
        const shown = 1 - (1 - grow) ** 3;
        for (const petal of petals.petals) {
            // Its tumble squeezes it toward its edge and back; past a quarter turn it shows its paler underside.
            const face = Math.cos(petal.flip);
            const squeeze = Math.max(0.16, Math.abs(face));
            const cos = Math.cos(petal.angle) * petal.size * k;
            const sin = Math.sin(petal.angle) * petal.size * k;
            const alpha = petal.alpha * (petal.airborne ? 1 : shown);
            // A petal lying on the plants rides their sway, the more the higher up the bed it lies.
            const ride = petal.airborne || !sway ? 0 : sway.bendAt(petal.x) * petalRide * Math.min(1, (height + headroom - petal.y) / (height * 0.8));
            const x = petal.x + ride;
            // A petal on the bed sits just above it; one in the air throws no shadow here.
            if (!petal.airborne) {
                petalContext.setTransform(cos, sin, -sin * squeeze, cos * squeeze, (x + 1.2) * k, (petal.y + 2.2) * k);
                petalContext.globalAlpha = alpha * 0.2;
                petalContext.fillStyle = "#0b1a08";
                petalContext.beginPath();
                petalContext.ellipse(0, 0, 0.95, 0.62, 0, 0, Math.PI * 2);
                petalContext.fill();
            }
            petalContext.setTransform(cos, sin, -sin * squeeze, cos * squeeze, x * k, petal.y * k);
            petalContext.globalAlpha = alpha;
            const kind = face < 0 ? undersideKind : petal.kind;
            petalContext.drawImage(petalSheet, kind * petalCell, 0, petalCell, petalCell, -1.14, -1.14, 2.28, 2.28);
        }
        // Dim what was drawn, and only that, by as much as the photo is dimmed.
        const dim = 1 - brightness();
        if (dim > 0.005) {
            petalContext.setTransform(1, 0, 0, 1, 0, 0);
            petalContext.globalAlpha = dim;
            petalContext.globalCompositeOperation = "source-atop";
            petalContext.fillStyle = "#000";
            petalContext.fillRect(0, 0, petalCanvas.width, petalCanvas.height);
        }
    }

    function render() {
        if (!imageSize || width === 0 || height === 0) return;
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.useProgram(program);
        gl.bindVertexArray(screen.vao);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, imageTexture);
        gl.uniform1i(u.uImage, 0);
        gl.uniform2f(u.uCss, width, height);
        gl.uniform1f(u.uDpr, ratio);
        const tileHeight = tileHeightFor(height);
        gl.uniform2f(u.uTile, (imageSize.width / imageSize.height) * tileHeight, tileHeight);
        // The sway goes to the shader as a row of bytes, 128 for a plant at rest.
        const bends = sway?.bends;
        if (bends) {
            if (swayBytes.length !== bends.length) swayBytes = new Uint8Array(bends.length);
            for (let i = 0; i < bends.length; i++) swayBytes[i] = Math.round(127.5 + (bends[i] / swayFeel.most) * 127.5);
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, swayTexture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, bends.length, 1, 0, gl.RED, gl.UNSIGNED_BYTE, swayBytes);
            gl.uniform1i(u.uSway, 1);
        }
        gl.uniform1f(u.uSwayMost, swayFeel.most);
        gl.uniform1f(u.uGrow, grow);
        gl.uniform1f(u.uBrightness, brightness());
        gl.uniform2f(u.uWind, gust, windTime);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        drawPetals();
    }

    function tick(timestamp: number) {
        const dt = lastTimestamp === undefined ? 0 : Math.min(maxStepSeconds, (timestamp - lastTimestamp) / 1000);
        lastTimestamp = timestamp;
        if (grow < 1) grow = Math.min(1, grow + dt / growSeconds);
        const swaying = sway?.step(dt) ?? false;
        // The hand moves the petals and the air for as long as it is moving; once it stops, so does its wind.
        if (hand.near) {
            if (timestamp - hand.at > handStill * 1000) {
                const fade = Math.min(1, dt * handFade);
                hand.vx -= hand.vx * fade;
                hand.vy -= hand.vy * fade;
            }
            petals?.sweep(hand.x, hand.y, hand.vx, hand.vy, dt, hand.y >= headroom);
        }
        const handMoving = hand.near && Math.hypot(hand.vx, hand.vy) > 4;
        // A breeze rises quickly and dies away slowly.
        gustLeft = Math.max(0, gustLeft - dt);
        gust += ((gustLeft > 0 ? 1 : 0) - gust) * Math.min(1, dt * (gustLeft > 0 ? 3 : 1.1));
        windTime += dt;
        const petalsMoving = petals?.step(dt) ?? false;
        render();
        const isMoving = grow < 1 || gust > 0.01 || petalsMoving || swaying || handMoving;
        frame = isMoving && isVisible && !document.hidden ? window.requestAnimationFrame(tick) : undefined;
    }

    function run() {
        if (frame === undefined && isVisible) {
            lastTimestamp = undefined;
            frame = window.requestAnimationFrame(tick);
        }
    }

    /** Now and then, while the bed is on screen, a breeze crosses it or a petal or two drifts down. */
    function idle() {
        idleTimer = undefined;
        if (!isVisible || reducedMotion || isDestroyed) return;
        if (!document.hidden && petals && grow >= 1) {
            if (Math.random() < 0.55) {
                gustLeft = breezeSeconds;
                petals.breeze(Math.random() < 0.5 ? 1 : -1);
            } else {
                petals.drop(Math.random() < 0.4 ? 2 : 1);
            }
            run();
        }
        idleTimer = window.setTimeout(idle, (idleEvery[0] + Math.random() * (idleEvery[1] - idleEvery[0])) * 1000);
    }

    /**
     * Follows the pointer wherever it is on the page, since floating petals
     * leave the strip and the hand may follow them. Only a pointer over the
     * petals' layer, or just above it, counts as near.
     */
    function onPointerMove(event: PointerEvent) {
        if (!isVisible || reducedMotion || !petals) return;
        const bounds = petalCanvas.getBoundingClientRect();
        const x = event.clientX - bounds.left;
        const y = event.clientY - bounds.top;
        if (x < 0 || x > bounds.width || y < -handMargin || y > bounds.height) {
            hand.near = false;
            return;
        }
        const elapsed = (event.timeStamp - hand.at) / 1000;
        if (hand.near && elapsed > 0 && elapsed < 0.12) {
            // Eased between events, so the hand's speed is a steady figure and not one event's guess.
            let vx = (x - hand.x) / elapsed;
            let vy = (y - hand.y) / elapsed;
            const speed = Math.hypot(vx, vy);
            if (speed > handFastest) {
                vx *= handFastest / speed;
                vy *= handFastest / speed;
            }
            hand.vx += (vx - hand.vx) * 0.5;
            hand.vy += (vy - hand.vy) * 0.5;
            // The plants under it are carried along in the same frame.
            if (y >= headroom) sway?.push(x, x - hand.x);
        } else {
            hand.vx = 0;
            hand.vy = 0;
        }
        hand.x = x;
        hand.y = y;
        hand.at = event.timeStamp;
        hand.near = true;
        run();
    }
    /** A finger lifted is a hand gone. A mouse stays where it is. */
    function onPointerGone(event: PointerEvent) {
        if (event.pointerType !== "mouse") hand.near = false;
    }
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerup", onPointerGone, { passive: true });
    window.addEventListener("pointercancel", onPointerGone, { passive: true });

    function maybeStartGrowing() {
        if (!isVisible || !imageSize || hasBeenSeen) return;
        hasBeenSeen = true;
        if (grow < 1) {
            petals?.drop(arrivingPetals);
            run();
        }
    }

    return {
        resize() {
            width = container.clientWidth;
            height = container.clientHeight;
            if (width === 0 || height === 0) return;
            ratio = Math.min(pixelRatioCap, window.devicePixelRatio || 1);
            canvas.width = Math.round(width * ratio);
            canvas.height = Math.round(height * ratio);

            headroom = headroomFor(height);
            petalRatio = Math.min(petalPixelRatioCap, window.devicePixelRatio || 1);
            petalCanvas.style.height = `${height + headroom}px`;
            petalCanvas.width = Math.round(width * petalRatio);
            petalCanvas.height = Math.round((height + headroom) * petalRatio);
            if (sway) sway.resize(width);
            else sway = createSway(width);
            if (petals) {
                petals.resize(width, headroom, height);
            } else {
                const count = Math.round(Math.min(petalLimits[1], Math.max(petalLimits[0], width / petalSpacing)));
                petals = createPetals({ width, headroom, bed: height, count, size: tileHeightFor(height) * 0.05 });
            }
            render();
        },
        setVisible(visible) {
            isVisible = visible;
            if (visible) {
                maybeStartGrowing();
                if (grow < 1 && hasBeenSeen) run();
                if (!reducedMotion && idleTimer === undefined) {
                    idleTimer = window.setTimeout(idle, idleEvery[0] * 1000);
                }
                return;
            }
            if (frame !== undefined) {
                window.cancelAnimationFrame(frame);
                frame = undefined;
            }
            if (idleTimer !== undefined) {
                window.clearTimeout(idleTimer);
                idleTimer = undefined;
            }
        },
        tap(x, y) {
            if (reducedMotion) return;
            // The plants lean away from the tap on both sides, and the petals near it puff up into the air above the bed.
            sway?.puff(x);
            petals?.kick(x, y + headroom, 1);
            petals?.burst(x, y + headroom, tapPetals);
            run();
        },
        refresh() {
            render();
        },
        destroy() {
            isDestroyed = true;
            if (frame !== undefined) window.cancelAnimationFrame(frame);
            if (idleTimer !== undefined) window.clearTimeout(idleTimer);
            window.removeEventListener("pointermove", onPointerMove);
            window.removeEventListener("pointerup", onPointerGone);
            window.removeEventListener("pointercancel", onPointerGone);
            screen.destroy();
            gl.deleteTexture(imageTexture);
            gl.deleteTexture(swayTexture);
            gl.deleteProgram(program);
        },
    };
}
