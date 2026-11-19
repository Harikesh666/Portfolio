import type { Stone } from "./pond-decor";
import { poseOf, segments, tailFlex, type Fish } from "./pond-fish";
import type { WaterTheme } from "./pond-water";
import { createFullscreenTriangle, fullscreenVertex, glslNoise, link, uniforms } from "./pond-gl";
import { createRipples, glslRippleHeight, simScale, type Ripples } from "./pond-ripples";

/**
 * The WebGL2 pond renderer.
 *
 * 1. A ripple simulation runs in two floating-point textures (height and
 *    velocity), stepped as a damped wave equation. Taps drop ripples and
 *    every tail beat drops a small one, so swimming koi leave wakes.
 * 2. The water pass looks at the floor through that surface: sand and
 *    stones are refracted by the slopes, lit by caustics that the ripples
 *    focus and bend, with glints on ripple crests and moonlight at night.
 * 3. Each koi is a ribbon mesh that follows its spine, with the swimming
 *    wave laid over it. The fragment shader draws the body, head, markings,
 *    scales and translucent rayed fins in the fish's own coordinates, so
 *    every pixel bends with the body. Koi swim at different depths: deeper
 *    ones are drawn first, take on more of the water's colour, and cast a
 *    tighter shadow.
 *
 * Returns null without WebGL2; the 2D renderer takes over.
 */

export type GpuFrame = Readonly<{
    time: number;
    dt: number;
    light: WaterTheme & Readonly<{ night: number }>;
    fishes: readonly Fish[];
    stones: readonly Stone[];
}>;

export type GpuPond = Readonly<{
    resize(width: number, height: number, pixelRatio: number): void;
    /** A ripple at a point in CSS pixels; negative strength dents the surface. */
    drop(x: number, y: number, strength: number, radius?: number): void;
    render(frame: GpuFrame): void;
    destroy(): void;
}>;

/** How far a tilted surface shifts the floor beneath it, in CSS pixels. */
const refraction = 30;
/**
 * Half-width of a koi ribbon in body lengths at a point along it: just
 * wide enough for the body and whatever fins sprout there. A narrow
 * ribbon is cheaper and folds less when the fish turns tightly.
 */
function ribbonHalfWidth(u: number) {
    if (u <= 0.1) return 0.12;
    if (u <= 0.5) return 0.33;
    if (u <= 0.72) return 0.18;
    if (u <= 1) return 0.12;
    return 0.12 + ((u - 1) / tailLength) * 0.14;
}
/**
 * Floats per vertex: x, y, u, v, then variety, seed, alpha, phase, then
 * depth, gulp, fin spread, turn, then effort and the direction across the
 * body in the pond (x, y), so every koi is lit from the same side.
 */
const vertexFloats = 15;
/** Where the pond's light comes from: up and to the left, the way the stones are lit and the shadows fall. */
const sunDirection = [-0.45, -0.55, 0.75] as const;
/** The tail fin's ribbon runs this far past the tail root, in body lengths, over this many samples. */
const tailLength = 0.4;
const tailSamples = 6;
/** Samples along a ribbon: snout, spine joints, and the tail beyond the root. */
const samplesPerFish = 1 + segments + tailSamples;
/** How deep each tail beat dents the surface. A tap is about four times deeper. */
const wakeStrength = -0.55;
/** A koi's shadow lands this far from it, in body lengths: far when it swims at the surface, close when it is near the floor. */
const shadowReach = { surface: [0.085, 0.22], floor: [0.03, 0.06] } as const;

const common = /* glsl */ `
${glslNoise}
vec2 cellPoint(vec2 cell, float t) {
    vec2 seed = vec2(hash(cell), hash(cell + 17.31));
    return 0.5 + 0.42 * sin(t * 0.55 + 6.2831 * seed);
}

float cellEdge(vec2 p, float t) {
    vec2 cell = floor(p);
    vec2 local = fract(p);
    float nearest = 8.0;
    float second = 8.0;
    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 offset = vec2(float(x), float(y));
            float d = length(offset + cellPoint(cell + offset, t) - local);
            if (d < nearest) {
                second = nearest;
                nearest = d;
            } else if (d < second) {
                second = d;
            }
        }
    }
    return second - nearest;
}

// Soft caustic lines: the edges between drifting cells, warped by noise.
float caustic(vec2 p, float t) {
    vec2 warp = vec2(noise(p * 0.6 + t * 0.1), noise(p * 0.6 - t * 0.08 + 4.0)) * 1.15;
    return pow(1.0 - smoothstep(0.0, 0.24, cellEdge(p + warp, t)), 2.2);
}
`;

const waterFragment = /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D uState;
uniform vec2 uSimSize;
uniform vec2 uCss;
uniform float uDpr;
uniform float uTime;
uniform vec3 uDeep;
uniform vec3 uShallow;
uniform vec3 uLight;
uniform float uLightStrength;
uniform float uNight;
uniform vec4 uStones[6];
uniform vec2 uStoneMeta[6];
uniform int uStoneCount;
out vec4 outColor;
${common}
${glslRippleHeight}

void main() {
    vec2 css = vec2(gl_FragCoord.x, uCss.y * uDpr - gl_FragCoord.y) / uDpr;
    float e = ${(1 / simScale).toFixed(3)};
    float h = heightAt(css);
    float hl = heightAt(css - vec2(e, 0.0));
    float hr = heightAt(css + vec2(e, 0.0));
    float hu = heightAt(css - vec2(0.0, e));
    float hd = heightAt(css + vec2(0.0, e));
    vec2 slope = vec2(hr - hl, hd - hu) * 0.5;
    float curvature = hl + hr + hu + hd - 4.0 * h;

    // The floor, seen through the moving surface.
    vec2 fp = css - slope * ${refraction.toFixed(1)};
    vec2 p = fp / 78.0;
    float depth = smoothstep(0.0, 1.0, 0.5 + 0.5 * noise(p * 0.3 + uTime * 0.015));
    vec3 color = mix(uDeep, uShallow, depth);
    color += (noise(fp * 0.45) - 0.5) * 0.028;

    for (int i = 0; i < 6; i++) {
        if (i >= uStoneCount) break;
        vec4 s = uStones[i];
        vec2 meta = uStoneMeta[i];
        vec2 d = fp - s.xy;
        float c = cos(meta.x);
        float sn = sin(meta.x);
        vec2 q = vec2(c * d.x + sn * d.y, -sn * d.x + c * d.y);
        float contact = length((q - vec2(s.z * 0.16, s.w * 0.3)) / s.zw);
        color *= mix(0.7, 1.0, smoothstep(0.85, 1.4, contact));
        vec2 qn = q / s.zw;
        float r = length(qn);
        if (r < 1.0) {
            vec3 n = normalize(vec3(qn * 0.85, sqrt(1.0 - r * r)));
            float lit = clamp(dot(n, normalize(vec3(-0.45, -0.55, 0.75))), 0.0, 1.0);
            float speckle = noise(q * 0.35 + float(i) * 7.0) * 0.12;
            vec3 stone = mix(vec3(0.28, 0.31, 0.3), vec3(0.82, 0.84, 0.8), lit) * (meta.y + speckle);
            // Stones sit under the water: tinted by it, and only as bright as the light.
            float ambient = clamp(dot(uShallow, vec3(0.333)) * 1.5, 0.32, 1.0);
            stone = mix(stone, stone * uShallow * 1.5, 0.3) * ambient;
            float mask = 1.0 - smoothstep(0.92, 1.0, r);
            color = mix(color, mix(color, stone, 0.85), mask);
        }
    }

    // Caustics gather into drifting patches; ripples bend them and focus extra light.
    float pool = smoothstep(0.2, 0.85, noise(p * 0.22 + vec2(uTime * 0.025, -uTime * 0.018)));
    float light = caustic(p + slope * 0.05, uTime) * (0.35 + 0.65 * pool);
    light += caustic(p * 1.85 + 4.1, uTime * 1.1) * 0.22 * pool;
    light += clamp(-curvature * 8.0, 0.0, 1.1);
    color = mix(color, uLight, clamp(light * uLightStrength, 0.0, 1.0));
    color *= 1.0 + clamp(curvature * 2.5, -0.22, 0.0);

    // Glints where ripple crests tilt toward the sun or moon.
    vec3 normal = normalize(vec3(-slope * 4.5, 1.0));
    vec3 halfway = normalize(vec3(-0.3, -0.42, 1.0) + vec3(0.0, 0.0, 1.0));
    float glint = pow(max(dot(normal, halfway), 0.0), 140.0);
    color += mix(uLight, vec3(0.86, 0.91, 1.0), uNight) * glint * 0.55;

    // At night a soft moon glow, its reflection broken by the ripples.
    if (uNight > 0.02) {
        vec2 moon = vec2(uCss.x * 0.82, uCss.y * 0.3);
        vec2 dm = fp - moon;
        float glow = exp(-dot(dm, dm) / (uCss.y * uCss.y * 0.018)) * 0.32;
        // The reflection widens and fades as it runs toward the viewer.
        float below = fp.y - moon.y - uCss.y * 0.06;
        float spread = uCss.y * (0.035 + 0.12 * clamp(below / uCss.y, 0.0, 1.0));
        float column = exp(-pow(dm.x / spread, 2.0)) * smoothstep(0.0, uCss.y * 0.08, below) * exp(-below / (uCss.y * 0.6));
        // Broken glitter, stretched sideways, that the ripples scatter.
        vec2 g = vec2(fp.x * 0.07, fp.y * 0.32) + slope * 3.0;
        float glitter = smoothstep(0.62, 0.92, noise(g + vec2(0.0, uTime * 0.7)));
        color += vec3(0.85, 0.9, 1.0) * (glow + column * glitter * 0.3) * uNight;
    }

    vec2 uv = css / uCss;
    vec2 fromEdge = min(uv, 1.0 - uv);
    color *= mix(0.86, 1.0, smoothstep(0.0, 0.32, min(fromEdge.x * 1.4, fromEdge.y * 2.2)));
    color += (hash(gl_FragCoord.xy + fract(uTime) * 61.0) - 0.5) * 0.03;
    outColor = vec4(color, 1.0);
}
`;

const fishVertex = /* glsl */ `#version 300 es
in vec2 aPosition;
in vec2 aLocal;
in vec4 aFish;
in vec4 aPose;
in vec3 aLit;
uniform vec2 uCss;
uniform vec2 uOffset;
uniform sampler2D uState;
uniform vec2 uSimSize;
out vec2 vLocal;
out vec4 vFish;
out vec4 vPose;
out vec3 vLit;
out vec2 vCss;

void main() {
    vec2 p = aPosition + uOffset;
    // The surface above bends how the fish looks, just as it bends the floor.
    vec2 uv = vec2(p.x, uCss.y - p.y) * ${simScale.toFixed(3)} / uSimSize;
    vec2 t = 1.0 / uSimSize;
    float hx = texture(uState, uv + vec2(t.x, 0.0)).r - texture(uState, uv - vec2(t.x, 0.0)).r;
    float hy = texture(uState, uv + vec2(0.0, t.y)).r - texture(uState, uv - vec2(0.0, t.y)).r;
    p -= vec2(hx, -hy) * ${(refraction * 0.3).toFixed(1)};
    vLocal = aLocal;
    vFish = aFish;
    vPose = aPose;
    vLit = aLit;
    vCss = p;
    gl_Position = vec4(p.x / uCss.x * 2.0 - 1.0, 1.0 - p.y / uCss.y * 2.0, 0.0, 1.0);
}
`;

// The koi in its own coordinates: u runs from the snout (0) to the tail root
// (1) and on into the tail; v runs across, in body lengths.
const fishFragment = /* glsl */ `#version 300 es
precision highp float;
in vec2 vLocal;
in vec4 vFish;
in vec4 vPose;
in vec3 vLit;
in vec2 vCss;
uniform vec4 uBody[7];
uniform vec4 uMarkA[7];
uniform vec4 uMarkB[7];
uniform vec4 uFlags[7];
uniform vec3 uLight;
uniform float uLightStrength;
uniform float uNight;
uniform vec3 uWater;
uniform float uTime;
uniform float uShadow;
out vec4 outColor;
${common}

// A koi from above: a blunt rounded head, shoulders that swell just behind
// the gill covers, then a long taper to the wrist of the tail. Matches
// bodyProfile in pond-fish.ts.
float bodyHalfWidth(float u) {
    if (u <= 0.0 || u > 1.0) return 0.0;
    float nose = max(0.2 - u, 0.0) / 0.2;
    float head = pow(max(0.0, 1.0 - nose * nose), 0.55);
    float shoulder = mix(0.09, 0.118, smoothstep(0.16, 0.38, u));
    float taper = 1.0 - 0.75 * pow(smoothstep(0.36, 1.0, u), 1.15);
    return shoulder * taper * head;
}

// A fin as a fan of rays from one base point. Returns its membrane (x), how
// near a ray this pixel is (y), and how far out along the fin it lies, 0 at
// the base and 1 at the edge (z). fork carves the middle back like a koi
// tail; bend sweeps the rays back as they grow; lead says where across the
// fan (-1 to 1) the rays reach farthest, so a paddle fin rounds off there.
// texel is the size of a pixel in body lengths: rays closer together than a
// few pixels fade into the membrane instead of shimmering.
vec3 fin(vec2 q, vec2 base, float dir, float spread, float len, float count, float fork, float bend, float lead, float texel) {
    vec2 d = q - base;
    float r = length(d) / len;
    if (r > 1.1 || r < 1e-4) return vec3(0.0);
    float angle = atan(d.y, d.x) - dir;
    angle = atan(sin(angle), cos(angle)) + bend * r * r;
    float across = angle / spread + 0.5;
    if (across < -0.06 || across > 1.06) return vec3(0.0);
    float centre = 2.0 * across - 1.0;
    float reach = (1.0 - fork * (1.0 - pow(abs(centre), 0.8))) * (1.0 - 0.3 * pow(abs(centre - lead), 2.4));
    float k = clamp(across, 0.0, 1.0) * (count - 1.0);
    float toRay = abs(fract(k + 0.5) - 0.5);
    // The membrane dips a little between ray tips, so the edge is scalloped, not cut.
    reach *= 1.0 - 0.05 * smoothstep(0.1, 0.5, toRay) * smoothstep(2.0, 4.5, spread / (count - 1.0) * len / max(texel, 1e-5));
    float sides = smoothstep(-0.06, 0.02, across) * (1.0 - smoothstep(0.98, 1.06, across));
    float web = (1.0 - smoothstep(reach * 0.88, reach, r)) * sides;
    float gap = spread / (count - 1.0) * r * len / max(texel, 1e-5);
    float ray = (1.0 - smoothstep(0.06, 0.32, toRay)) * web * smoothstep(1.5, 3.5, gap);
    return vec3(web, ray, clamp(r / reach, 0.0, 1.0));
}

void main() {
    float u = vLocal.x;
    float v = vLocal.y;
    int k = int(vFish.x + 0.5);
    float seed = vFish.y;
    float alpha = vFish.z;
    float phase = vFish.w;
    float depth = vPose.x;
    float gulp = vPose.y;
    float flare = vPose.z;
    float turn = vPose.w;
    float effort = vLit.x;
    float side = v < 0.0 ? -1.0 : 1.0;
    float av = abs(v);
    vec2 q = vec2(u, av);

    float hw = bodyHalfWidth(u);
    float aa = max(fwidth(v), 0.0015) * 1.2;
    float texel = fwidth(u);
    float body = (u > 0.0 && u < 1.0) ? 1.0 - smoothstep(-aa, aa, av - hw) : 0.0;

    // Fins. The paired ones mirror across the spine, so one fan drawn against |v| serves both sides.
    vec3 f = vec3(0.0);
    float silk = 0.0;
    if (u > 0.9) {
        // The tail is thin as silk: a ripple runs out along it, larger toward the tips and while the koi strokes.
        float along = clamp((u - 0.95) / 0.4, 0.0, 1.0);
        float wave = along * 8.0 - uTime * (2.6 + 2.2 * effort) + seed * 3.0 + v * 26.0;
        silk = cos(wave) * along;
        f = fin(vec2(u, v + sin(wave) * 0.013 * along * (0.45 + 0.55 * effort)), vec2(0.95, 0.0), 0.0, 1.2, 0.42, 17.0, 0.32, 0.0, 0.0, texel);
    } else if (u > 0.16 && u < 0.5) {
        // Pectorals: broad paddles. The one inside a turn flares to brake, and both scull while the koi hovers.
        float open = clamp(flare - side * turn * 0.2, 0.0, 1.0);
        float scull = sin(uTime * 2.4 + seed * 6.0 + side * 0.9) * 0.14 * open;
        f = fin(q, vec2(0.215, bodyHalfWidth(0.215) * 0.8), mix(0.42, 1.12, open) + scull, mix(0.55, 1.0, open), 0.25, 11.0, 0.0, 0.3, 0.35, texel);
    } else if (u > 0.5 && u < 0.7) {
        f = fin(q, vec2(0.55, bodyHalfWidth(0.55) * 0.75), 0.5 + flare * 0.2, 0.7, 0.1, 7.0, 0.0, 0.2, 0.2, texel);
    }
    // Thick and coloured at the base, thinning to a clear edge.
    float finAlpha = f.x * mix(0.88, 0.34, f.z) + f.y * 0.16;

    if (uShadow > 0.0) {
        // A blurred body: soft at the sides and faded out at snout and tail. Sharper when the koi is near the floor.
        float hs = bodyHalfWidth(clamp(u, 0.001, 0.999));
        float shape = 1.0 - smoothstep(-0.01, mix(0.05, 0.02, depth), av - hs * 1.05);
        shape *= smoothstep(-0.06, 0.03, u) * (1.0 - smoothstep(0.92, 1.1, u));
        outColor = vec4(0.0, 0.0, 0.0, max(shape, finAlpha * 0.5) * alpha * uShadow * mix(0.7, 1.15, depth));
        return;
    }

    // Scales: staggered rows of overlapping discs behind the head, each shaded
    // along its trailing rim. They fade out where a scale is smaller than a few pixels.
    float across = clamp(v / max(hw, 1e-4), -1.0, 1.0);
    float nz = sqrt(max(0.0, 1.0 - across * across));
    vec2 sp = vec2(u, v) * 38.0;
    float row = floor(sp.y);
    sp.x += 0.5 * mod(row, 2.0);
    float rim = smoothstep(0.3, 0.62, length(fract(sp) - vec2(0.3, 0.5)));
    float scaled = (1.0 - smoothstep(0.3, 0.55, texel * 38.0)) * smoothstep(0.2, 0.27, u) * (1.0 - smoothstep(0.86, 0.97, u)) * nz;

    vec3 base = uBody[k].rgb;
    // Markings: noise patches across the back. Where scales show, a patch ends on
    // whole scales, the stepped edge a koi's pattern really has; elsewhere its edge is crisp but uneven.
    vec2 scaleCentre = vec2(floor(sp.x) + 0.5 - 0.5 * mod(row, 2.0), row + 0.5) / 38.0;
    vec2 m = mix(vec2(u, v), scaleCentre, scaled * 0.9);
    float grit = (noise(vec2(u * 46.0, v * 110.0) + seed) - 0.5) * 0.05 * (1.0 - scaled);
    float coverA = uMarkA[k].w;
    float coverB = uMarkB[k].w;
    float nA = fbm(vec2(m.x * 4.2, m.y * 13.0) + seed * 1.73) + grit;
    float markA = coverA > 0.0 ? smoothstep(1.0 - coverA - 0.02, 1.0 - coverA + 0.02, nA) : 0.0;
    markA *= smoothstep(0.03, 0.08, u) * (1.0 - smoothstep(0.82, 0.92, u));
    float nB = fbm(vec2(m.x * 7.0, m.y * 21.0) * uFlags[k].w + seed * 3.17 + 9.0) + grit;
    float markB = coverB > 0.0 ? smoothstep(1.0 - coverB - 0.02, 1.0 - coverB + 0.02, nB) : 0.0;
    markB *= smoothstep(0.1, 0.16, u) * (1.0 - smoothstep(0.76, 0.86, u));
    if (uFlags[k].x > 0.5) {
        float crown = 1.0 - smoothstep(0.036, 0.044, length(vec2(u - 0.115, v)));
        markA = max(markA, crown);
    }
    base = mix(base, uMarkA[k].rgb, markA);
    base = mix(base, uMarkB[k].rgb, markB);

    // A rounded body lit from the pond's one light: the flank toward it is
    // bright and the far flank falls into shade, whichever way the koi faces.
    vec3 normal = normalize(vec3(normalize(vLit.yz) * across, nz + 0.001));
    vec3 sun = normalize(vec3(${sunDirection.join(", ")}));
    float lit = clamp(dot(normal, sun), 0.0, 1.0);
    float metallic = uFlags[k].y;
    vec3 bodyColor = base * (0.52 + 0.56 * lit);
    bodyColor *= 1.0 - 0.1 * rim * scaled;
    bodyColor += base * metallic * 0.1 * (1.0 - rim) * scaled;

    // A wet highlight where the back turns toward the light: brighter on the
    // metallic koi, and on one swimming up at the surface.
    float glance = max(dot(normal, normalize(sun + vec3(0.0, 0.0, 1.0))), 0.0);
    float sheen = pow(glance, 26.0) * smoothstep(0.05, 0.3, u) * (1.0 - smoothstep(0.75, 1.0, u));
    bodyColor += vec3(1.0) * (0.13 + metallic * 0.2) * sheen * (1.25 - 0.5 * depth);

    // Gill covers: a curved seam on each side of the head.
    float seam = 1.0 - smoothstep(0.003, 0.009, abs(u - (0.15 + 0.055 * abs(across))));
    bodyColor *= 1.0 - 0.2 * seam * smoothstep(0.3, 0.7, abs(across));

    // Dorsal fin: a thin ridge along the back that ripples with the stroke and leans out of a turn.
    vec3 finPale = mix(uBody[k].rgb, vec3(1.0), uFlags[k].z);
    float lean = clamp(turn * 0.004, -0.012, 0.012) + 0.004 * sin(phase - u * 5.3);
    float ridgeEnds = smoothstep(0.36, 0.42, u) * (1.0 - smoothstep(0.66, 0.76, u));
    float ridge = (1.0 - smoothstep(0.004, 0.01, abs(v - lean))) * ridgeEnds;
    bodyColor *= 1.0 - 0.14 * (1.0 - smoothstep(0.004, 0.016, abs(v - lean - 0.01))) * ridgeEnds;
    bodyColor = mix(bodyColor, finPale, ridge * 0.5);

    // Eyes on top of the head: a pale ring, a dark pupil, and a point of light.
    vec2 eye = vec2(0.085, bodyHalfWidth(0.085) * 0.74);
    float eyeDistance = length(q - eye);
    bodyColor = mix(bodyColor, vec3(0.74, 0.66, 0.5), (1.0 - smoothstep(0.011, 0.015, eyeDistance)) * 0.85);
    bodyColor = mix(bodyColor, vec3(0.06, 0.05, 0.04), 1.0 - smoothstep(0.0075, 0.0105, eyeDistance));
    bodyColor += vec3(0.8) * (1.0 - smoothstep(0.002, 0.0045, length(q - eye + vec2(0.004, 0.003))));

    // The mouth: a small dark line that opens round for a pellet.
    float lips = length((vec2(u, v) - vec2(0.016 + 0.006 * gulp, 0.0)) / vec2(0.008 + 0.007 * gulp, 0.013 + 0.011 * gulp));
    bodyColor = mix(bodyColor, vec3(0.26, 0.12, 0.1), (1.0 - smoothstep(0.7, 1.0, lips)) * (0.3 + 0.5 * gulp));

    // Barbels: two short whiskers at the corners of the mouth.
    vec2 barbelStart = vec2(0.02, bodyHalfWidth(0.02));
    vec2 barbelRun = vec2(0.034, 0.03);
    float along = clamp(dot(q - barbelStart, barbelRun) / dot(barbelRun, barbelRun), 0.0, 1.0);
    float barbel = (1.0 - smoothstep(0.002, 0.005, length(q - barbelStart - barbelRun * along))) * (1.0 - 0.6 * along);

    // Fins take the body's colour at the base and pale toward the edge; rays show a little lighter than the membrane.
    vec3 finColor = mix(uBody[k].rgb * 0.96, finPale, smoothstep(0.0, 0.7, f.z));
    finColor *= mix(0.9, 1.06, f.y) * (1.0 + 0.09 * silk);
    vec3 color = mix(finColor, bodyColor, body);
    float a = max(body, max(finAlpha, barbel * 0.6));

    // Under the surface: more of the water's colour the deeper it swims, and caustic light dappling the back.
    color = mix(color, uWater, 0.08 + 0.3 * depth);
    color += uLight * caustic(vCss / 78.0, uTime) * uLightStrength * 0.32 * body;
    // As bright as the water around it: the dark theme dims daylight, night dims the rest.
    float daylight = clamp(dot(uWater, vec3(0.333)) / 0.7, 0.5, 1.0);
    color *= mix(daylight, 1.0, uNight) * mix(1.0, 0.7, uNight);
    color = mix(color, color * vec3(0.76, 0.86, 1.1), uNight * 0.5);
    // Moonlight: a cool sheen along the back, so even a black koi keeps its shape at night.
    color += vec3(0.42, 0.52, 0.72) * uNight * (0.1 * nz + 0.25 * sheen) * body;
    outColor = vec4(color, a * alpha);
}
`;

/** Koi palettes in index order, matching the varieties in pond-fish.ts. */
const palette = {
    // rgb + unused, mark A rgb + coverage, mark B rgb + coverage, flags: crown, metallic, fin paleness, mark B patch scale.
    body: [
        [0.97, 0.95, 0.92, 0], [0.94, 0.68, 0.24, 0], [0.97, 0.95, 0.91, 0],
        [0.98, 0.96, 0.93, 0], [0.16, 0.14, 0.13, 0], [0.95, 0.81, 0.43, 0], [0.86, 0.93, 0.95, 0],
    ],
    markA: [
        [0.85, 0.28, 0.15, 0.46], [0, 0, 0, 0], [0.84, 0.27, 0.15, 0.42],
        [0.84, 0.24, 0.15, 0], [0.82, 0.28, 0.16, 0.42], [0.98, 0.95, 0.88, 0.22], [0, 0, 0, 0],
    ],
    markB: [
        [0, 0, 0, 0], [0, 0, 0, 0], [0.12, 0.1, 0.1, 0.14],
        [0, 0, 0, 0], [0.95, 0.92, 0.88, 0.4], [0, 0, 0, 0], [0, 0, 0, 0],
    ],
    flags: [
        [0, 0, 0.55, 1], [0, 1, 0.45, 1], [0, 0, 0.55, 1],
        [1, 0, 0.55, 1], [0, 0, 0.6, 0.55], [0, 0.5, 0.5, 1], [0, 0, 0.6, 1],
    ],
} as const;

export function createGpuPond(canvas: HTMLCanvasElement): GpuPond | null {
    const context = canvas.getContext("webgl2", {
        alpha: false,
        antialias: false,
        premultipliedAlpha: false,
        powerPreference: "low-power",
    });
    if (!context) return null;
    const gl: WebGL2RenderingContext = context;
    // Without float render targets the surface stays flat, but everything else still draws.
    const simulation = createRipples(gl);
    const waterProgram = link(gl, fullscreenVertex, waterFragment);
    const fishProgram = link(gl, fishVertex, fishFragment);
    if (!simulation || !waterProgram || !fishProgram) return null;
    const ripples: Ripples = simulation;

    const waterU = uniforms(gl, waterProgram, [
        "uState", "uSimSize", "uCss", "uDpr", "uTime", "uDeep", "uShallow", "uLight",
        "uLightStrength", "uNight", "uStones", "uStoneMeta", "uStoneCount",
    ]);
    const fishU = uniforms(gl, fishProgram, [
        "uCss", "uOffset", "uState", "uSimSize", "uBody", "uMarkA", "uMarkB", "uFlags",
        "uLight", "uLightStrength", "uNight", "uWater", "uTime", "uShadow",
    ]);

    const screen = createFullscreenTriangle(gl, [waterProgram]);

    // Koi ribbons are rebuilt every frame from the spines.
    const fishVao = gl.createVertexArray();
    const fishBuffer = gl.createBuffer();
    gl.bindVertexArray(fishVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, fishBuffer);
    const stride = vertexFloats * 4;
    const attribute = (name: string, size: number, offset: number) => {
        const location = gl.getAttribLocation(fishProgram, name);
        gl.enableVertexAttribArray(location);
        gl.vertexAttribPointer(location, size, gl.FLOAT, false, stride, offset * 4);
    };
    attribute("aPosition", 2, 0);
    attribute("aLocal", 2, 2);
    attribute("aFish", 4, 4);
    attribute("aPose", 4, 8);
    attribute("aLit", 3, 12);
    gl.bindVertexArray(null);
    let vertices = new Float32Array(0);

    let cssWidth = 1;
    let cssHeight = 1;
    let ratio = 1;
    const lastBeat = new WeakMap<Fish, number>();

    /**
     * Every beat of a fish's tail drops a small ripple at its shoulders; the
     * rings read as its wake. A gliding koi, or one down near the floor,
     * barely marks the surface.
     */
    function dropWakes(fishes: readonly Fish[]) {
        for (const fish of fishes) {
            const beat = Math.floor(fish.phase / Math.PI);
            const previous = lastBeat.get(fish);
            lastBeat.set(fish, beat);
            if (previous === undefined || previous === beat) continue;
            const effort = Math.min(1.5, fish.speed / 40) * fish.alpha * (0.3 + 0.7 * fish.effort) * (1 - 0.7 * fish.depth);
            if (effort < 0.12) continue;
            const side = beat % 2 === 0 ? 1 : -1;
            const shoulder = fish.points[2];
            const offset = fish.length * 0.06 * side;
            ripples.drop(
                shoulder.x - Math.sin(fish.heading) * offset,
                shoulder.y + Math.cos(fish.heading) * offset,
                wakeStrength * effort,
                2.6,
            );
        }
    }

    /** Builds each fish's ribbon along its drawn pose: snout, spine joints, then the tail fin beyond the root. */
    function buildRibbons(fishes: readonly Fish[]) {
        const needed = fishes.length * samplesPerFish * 2 * vertexFloats;
        if (vertices.length < needed) vertices = new Float32Array(needed);
        let w = 0;
        const centres: Array<[number, number, number]> = new Array(samplesPerFish);
        for (const fish of fishes) {
            const { length } = fish;
            const spine = poseOf(fish);
            const root = spine[segments - 1];
            const beforeRoot = spine[segments - 3];
            const back = Math.atan2(root.y - beforeRoot.y, root.x - beforeRoot.x);
            centres[0] = [
                spine[0].x + Math.cos(fish.heading) * length * 0.04,
                spine[0].y + Math.sin(fish.heading) * length * 0.04,
                -0.04,
            ];
            for (let i = 0; i < segments; i++) centres[i + 1] = [spine[i].x, spine[i].y, i / (segments - 1)];
            // The tail fin is a soft sheet: each sample along it bends a little further from the body's line.
            for (let j = 1; j <= tailSamples; j++) {
                const t = j / tailSamples;
                const angle = back + tailFlex(fish, t);
                const reach = tailLength * t;
                centres[segments + j] = [
                    root.x + Math.cos(angle) * length * reach,
                    root.y + Math.sin(angle) * length * reach,
                    1 + reach,
                ];
            }
            for (let i = 0; i < samplesPerFish; i++) {
                const before = centres[Math.max(0, i - 1)];
                const after = centres[Math.min(samplesPerFish - 1, i + 1)];
                const tx = after[0] - before[0];
                const ty = after[1] - before[1];
                const tl = Math.hypot(tx, ty) || 1;
                const nx = -ty / tl;
                const ny = tx / tl;
                const [cx, cy, u] = centres[i];
                // On the inside of a bend the ribbon must stay narrower than the
                // bend's radius, or it folds over itself. A fin there tucks in.
                const far = centres[Math.max(0, i - 2)];
                const next = centres[Math.min(samplesPerFish - 1, i + 2)];
                const turn = Math.atan2(
                    (cx - far[0]) * (next[1] - cy) - (cy - far[1]) * (next[0] - cx),
                    (cx - far[0]) * (next[0] - cx) + (cy - far[1]) * (next[1] - cy),
                );
                const span = Math.hypot(next[0] - far[0], next[1] - far[1]) / 2;
                const radius = Math.abs(turn) > 1e-3 ? span / Math.abs(turn) / length : Infinity;
                const inner = Math.sign(turn);
                for (const side of [1, -1]) {
                    const half = side === inner ? Math.min(ribbonHalfWidth(u), radius * 0.8) : ribbonHalfWidth(u);
                    vertices[w++] = cx + nx * half * length * side;
                    vertices[w++] = cy + ny * half * length * side;
                    vertices[w++] = u;
                    vertices[w++] = half * side;
                    vertices[w++] = fish.varietyIndex;
                    vertices[w++] = fish.seed;
                    vertices[w++] = fish.alpha;
                    vertices[w++] = fish.phase;
                    vertices[w++] = fish.depth;
                    vertices[w++] = fish.gulp;
                    vertices[w++] = fish.spread;
                    vertices[w++] = fish.turn;
                    vertices[w++] = fish.effort;
                    vertices[w++] = nx;
                    vertices[w++] = ny;
                }
            }
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, fishBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices.subarray(0, w), gl.DYNAMIC_DRAW);
    }

    function render(frame: GpuFrame) {
        const { time, dt, light, fishes, stones } = frame;
        dropWakes(fishes);
        ripples.step(dt);
        const state = ripples.texture();
        const simWidth = ripples.width();
        const simHeight = ripples.height();

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.disable(gl.BLEND);
        gl.useProgram(waterProgram);
        gl.bindVertexArray(screen.vao);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, state);
        gl.uniform1i(waterU.uState, 0);
        gl.uniform2f(waterU.uSimSize, simWidth, simHeight);
        gl.uniform2f(waterU.uCss, cssWidth, cssHeight);
        gl.uniform1f(waterU.uDpr, ratio);
        gl.uniform1f(waterU.uTime, time);
        gl.uniform3fv(waterU.uDeep, light.deep);
        gl.uniform3fv(waterU.uShallow, light.shallow);
        gl.uniform3fv(waterU.uLight, light.light);
        gl.uniform1f(waterU.uLightStrength, light.lightStrength);
        gl.uniform1f(waterU.uNight, light.night);
        const stoneData = new Float32Array(24);
        const stoneMeta = new Float32Array(12);
        stones.slice(0, 6).forEach((stone, i) => {
            stoneData.set([stone.x, stone.y, stone.rx, stone.ry], i * 4);
            stoneMeta.set([stone.rotation, stone.tone], i * 2);
        });
        gl.uniform4fv(waterU.uStones, stoneData);
        gl.uniform2fv(waterU.uStoneMeta, stoneMeta);
        gl.uniform1i(waterU.uStoneCount, Math.min(6, stones.length));
        gl.drawArrays(gl.TRIANGLES, 0, 3);

        if (fishes.length === 0) return;
        // The engine hands the fish over deepest first, so a koi near the surface passes over one below it.
        const sorted = fishes;
        buildRibbons(sorted);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.useProgram(fishProgram);
        gl.bindVertexArray(fishVao);
        gl.uniform2f(fishU.uCss, cssWidth, cssHeight);
        gl.uniform1i(fishU.uState, 0);
        gl.uniform2f(fishU.uSimSize, simWidth, simHeight);
        gl.uniform3fv(fishU.uLight, light.light);
        gl.uniform1f(fishU.uLightStrength, light.lightStrength);
        gl.uniform1f(fishU.uNight, light.night);
        gl.uniform3fv(fishU.uWater, light.shallow);
        gl.uniform1f(fishU.uTime, time);
        gl.uniform4fv(fishU.uBody, palette.body.flat());
        gl.uniform4fv(fishU.uMarkA, palette.markA.flat());
        gl.uniform4fv(fishU.uMarkB, palette.markB.flat());
        gl.uniform4fv(fishU.uFlags, palette.flags.flat());

        const perFish = samplesPerFish * 2;
        // Shadows first, offset down and right onto the floor, then the koi.
        gl.uniform1f(fishU.uShadow, light.night > 0.5 ? 0.3 : 0.2);
        sorted.forEach((fish, i) => {
            const rise = 1 - fish.depth;
            gl.uniform2f(
                fishU.uOffset,
                fish.length * (shadowReach.floor[0] + (shadowReach.surface[0] - shadowReach.floor[0]) * rise),
                fish.length * (shadowReach.floor[1] + (shadowReach.surface[1] - shadowReach.floor[1]) * rise),
            );
            gl.drawArrays(gl.TRIANGLE_STRIP, i * perFish, perFish);
        });
        gl.uniform1f(fishU.uShadow, 0);
        gl.uniform2f(fishU.uOffset, 0, 0);
        sorted.forEach((_, i) => gl.drawArrays(gl.TRIANGLE_STRIP, i * perFish, perFish));
        gl.disable(gl.BLEND);
        gl.bindVertexArray(null);
    }

    return {
        resize(width, height, pixelRatio) {
            cssWidth = width;
            cssHeight = height;
            ratio = pixelRatio;
            ripples.resize(width, height);
        },
        drop: ripples.drop,
        render,
        destroy() {
            ripples.destroy();
            screen.destroy();
            gl.deleteBuffer(fishBuffer);
            gl.deleteVertexArray(fishVao);
            gl.deleteProgram(waterProgram);
            gl.deleteProgram(fishProgram);
        },
    };
}
