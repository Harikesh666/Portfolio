import { daylightAt, homeHour } from "./pond-daylight";
import type { Pond } from "./pond-engine";
import { createFullscreenTriangle, fullscreenVertex, glslNoise, link, uniforms } from "./pond-gl";
import { bakeKund, bakeSize, horizon, sunAt, tank, townDepth, vanishX } from "./kund-bake";
import { createRipples, simScale } from "./pond-ripples";

/**
 * Makari Kund at Bijethua: Harikesh's photo, set on a 3D model of the tank.
 *
 * `kund-bake.ts` matches a model of the tank to the photo and bakes what it
 * sees from the photo's camera: depth, surface normals, where each patch of
 * water reflects, and the sun's shadows. This shader uses that to treat the
 * photo as a place. The camera drifts with true parallax. The water is
 * recomputed, not filmed: it mirrors the real walls and temple from the
 * photo, and its wind and the rings from taps bend those reflections. Low
 * sun rakes the real steps with shadows from the walls; at night lamps and
 * diyas throw pools of light onto the stone nearest them. Trees sway, birds
 * cross by day and fireflies come out after dark.
 *
 * The light follows the sun at home. Frame units: x runs 0 to 1 across,
 * y 0 to 1 down the 2:1 photo.
 */

/** Where the far steps meet the water, and the side shores' near ends. */
const farShore = horizon + 1 / tank.far;
const leftShore = { x0: 0.21, x1: 0, y1: 0.69 };
const rightShore = { x0: 0.72, x1: 1, y1: 0.76 };
/** The lamps beyond the far wall stand in the town, so their reflections fold about its water line. */
const mirrorLine = horizon + 1 / townDepth;
/** The water plane: X across the tank, z in depth. The shores sit at constant X. */
const plane = { left: -3.6, right: 3.6, near: 1.5, far: 6.2, unit: 100 };
const waterX: readonly [number, number] = [-2.7, 2.4];
const waterZ: readonly [number, number] = [1.7, 5.3];
/** Where the frame crops around when it is not 2:1. */
const focus = { x: 0.48, y: 0.55 };
/** Lights the shader can draw at once: fixed lamps plus floating diyas. */
const maxLights = 44;
const maxFloating = 8;
/** A tap's ring, a fish breaking the surface, and a finger trailing through the water. */
const tapStrength = -2.6;
const riseStrength = -0.9;
const stirStrength = -0.35;
const stirPixels = 14;
/** Seconds between fish rising somewhere on the tank. */
const riseEvery: readonly [number, number] = [2.5, 7];
/** How often the scene re-reads the clock at home, in seconds. */
const clockSeconds = 20;
/**
 * The camera breathes like someone standing on the steps: it drifts a
 * little, or follows the mouse, and near things move more than far ones.
 * Zooming in slightly once the scene starts leaves room at the edges.
 */
const cameraZoom = 1.04;
const cameraDrift = { x: 0.025, y: 0.012 };
const cameraFollow = { x: 0.08, y: 0.035 };
/** Seconds between clouds passing over the sun, and how long one takes to pass. */
const shadeGap: readonly [number, number] = [30, 70];
const shadeLength: readonly [number, number] = [12, 20];
/** Birds: a kite circles over the trees, and flocks cross every so often. */
const maxBirds = 10;
const flockEvery: readonly [number, number] = [12, 28];
/** Leaves and marigolds afloat on the tank. */
const petalCount = 7;
const pixelRatioCap = 1.5;
const maxStepSeconds = 0.05;

const random = (min: number, max: number) => min + Math.random() * (max - min);
const smoothstep = (a: number, b: number, x: number) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
};

type Rgb = readonly [number, number, number];
type Lamp = Readonly<{
    x: number;
    y: number;
    /** Glow radius in frame heights. */
    radius: number;
    color: Rgb;
    strength: number;
    /** Night level at which this lamp comes on, so they light one by one. */
    threshold: number;
    /** Where its reflection folds, or 0 for no reflection. */
    axis: number;
    /** How far away it stands, so its light falls on the right stones. */
    depth: number;
    flicker: boolean;
    seed: number;
}>;

type Floating = { x: number; z: number; vx: number; vz: number; pushX: number; pushZ: number; alpha: number; seed: number };
type Petal = { x: number; z: number; vx: number; vz: number; pushX: number; pushZ: number; angle: number; spin: number; kind: number };
type Bird = { x: number; y: number; vx: number; size: number; phase: number; rate: number; bob: number };

const sodium: Rgb = [1, 0.7, 0.38];
const flame: Rgb = [1, 0.62, 0.26];

/** The lamps that exist at the kund: the high mast, the two posts, the temple, and diyas along the steps. */
function makeLamps(): Lamp[] {
    const lamps: Lamp[] = [
        { x: 0.612, y: 0.036, radius: 0.2, color: [0.96, 0.92, 0.82], strength: 0.9, threshold: 0.18, axis: mirrorLine, depth: townDepth, flicker: false, seed: 1 },
        { x: 0.126, y: 0.198, radius: 0.085, color: sodium, strength: 0.75, threshold: 0.24, axis: mirrorLine, depth: 7.5, flicker: false, seed: 2 },
        { x: 0.805, y: 0.197, radius: 0.085, color: sodium, strength: 0.75, threshold: 0.22, axis: mirrorLine, depth: 7.5, flicker: false, seed: 3 },
        { x: 0.468, y: 0.232, radius: 0.095, color: [1, 0.56, 0.26], strength: 0.75, threshold: 0.12, axis: mirrorLine, depth: townDepth, flicker: false, seed: 4 },
        { x: 0.447, y: 0.3, radius: 0.05, color: [1, 0.66, 0.34], strength: 0.7, threshold: 0.14, axis: mirrorLine, depth: 8.4, flicker: false, seed: 5 },
        { x: 0.234, y: 0.228, radius: 0.05, color: [1, 0.72, 0.42], strength: 0.45, threshold: 0.3, axis: mirrorLine, depth: townDepth, flicker: false, seed: 6 },
    ];
    // Diyas on the lowest dry step: along the far side, then down each side shore, larger as they come nearer.
    const diya = (x: number, y: number) => {
        const near = (y - horizon) / (farShore - horizon);
        // A diya stands on the lowest dry step, one step above the water.
        const depth = (1 - 0.52 / 12) / Math.max(y - horizon, 0.02);
        lamps.push({ x, y, radius: 0.016 * near, color: flame, strength: 1, threshold: random(0.12, 0.5), axis: y + 0.006 * near, depth, flicker: true, seed: random(0, 100) });
    };
    for (let x = 0.236; x < 0.705; x += random(0.022, 0.036)) {
        if (Math.abs(x - 0.478) > 0.012) diya(x, farShore - 0.012);
    }
    for (let t = 0.12; t < 0.92; t += random(0.13, 0.19)) {
        diya(leftShore.x0 + (leftShore.x1 - leftShore.x0) * t, farShore + (leftShore.y1 - farShore) * t - 0.014 - 0.01 * t);
    }
    for (let t = 0.1; t < 0.92; t += random(0.12, 0.17)) {
        diya(rightShore.x0 + (rightShore.x1 - rightShore.x0) * t, farShore + (rightShore.y1 - farShore) * t - 0.014 - 0.01 * t);
    }
    return lamps.slice(0, maxLights - maxFloating);
}

const fragment = /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D uPhoto;
uniform sampler2D uMask;
uniform sampler2D uSurface;
uniform sampler2D uDepth;
uniform sampler2D uMirror;
uniform sampler2D uShadow;
uniform sampler2D uState;
uniform vec2 uSimSize;
uniform vec2 uRes;
uniform vec4 uCover;
uniform float uTime;
uniform float uMotion;
uniform float uNight;
uniform float uDusk;
uniform float uGold;
uniform float uDim;
uniform vec3 uSun;
uniform float uLit;
uniform vec4 uLights[${maxLights}];
uniform vec4 uColors[${maxLights}];
uniform float uLampDepth[${maxLights}];
uniform int uLightCount;
uniform vec2 uCam;
uniform float uZoom;
uniform float uShade;
uniform vec4 uBirds[${maxBirds}];
uniform float uBirdAlpha[${maxBirds}];
uniform int uBirdCount;
uniform vec4 uPetals[${petalCount}];
out vec4 outColor;
${glslNoise}

const float HORIZON = ${horizon.toFixed(4)};
const float VANISH = ${vanishX.toFixed(4)};
const float FAR = ${farShore.toFixed(4)};
const vec2 BAKE = vec2(${bakeSize.width.toFixed(1)}, ${bakeSize.height.toFixed(1)});

float unpack16(vec2 bytes) {
    return (bytes.x * 255.0 * 256.0 + bytes.y * 255.0) / 65535.0;
}

// The baked data, read exactly at its texel: packed values must never be blended.
vec4 baked(sampler2D map, vec2 p) {
    return texelFetch(map, ivec2(clamp(p, 0.0, 0.9999) * BAKE), 0);
}

// How far away the surface at a photo point is, from the model.
float depthAt(vec2 p) {
    vec4 surface = baked(uSurface, p);
    return surface.a < 0.1 ? 40.0 : max(unpack16(baked(uDepth, p).rg) * 64.0, 1.0);
}

// The tree crowns sway as gusts roll across them.
float swayAt(vec2 p) {
    float gustOnTrees = noise(vec2(p.x * 2.2 - uTime * 0.32, 4.0));
    return (sin(uTime * 1.25 + p.x * 5.0) * 0.35 + (gustOnTrees - 0.35) * 1.4) * texture(uMask, p).b * 0.006 * uMotion;
}

// Low sun on the photo: what faces it and is not shadowed by the walls glows warm, the rest falls cool.
vec3 sunOn(vec3 colour, vec2 p) {
    if (uGold < 0.001) return colour;
    vec4 surface = texture(uSurface, p);
    float kind = surface.a * 3.0;
    if (kind < 0.5) return colour;
    vec3 n = normalize(surface.rgb * 2.0 - 1.0);
    float facing = kind < 1.5 ? 0.55 : max(dot(n, uSun), 0.0) * texture(uShadow, p).r;
    vec3 light = vec3(0.6, 0.6, 0.7) + vec3(1.0, 0.66, 0.36) * facing * 1.25;
    return colour * mix(vec3(1.0), light, uGold);
}

// The overcast sky in the photo, measured behind the trees from top to bottom of their band.
vec3 photoSky(float y) {
    return mix(vec3(0.635, 0.679, 0.711), vec3(0.66, 0.688, 0.692), clamp(y / 0.3, 0.0, 1.0));
}

// What the sky looks like at a pixel: its own colour in open sky, so clouds keep their shape,
// and the measured sky behind a leaf's edge.
vec3 skyBehind(float y, vec3 photo, float alpha) {
    return mix(photoSky(y), photo, smoothstep(0.85, 1.0, alpha));
}

vec3 rayAt(vec2 p) {
    return vec3((p.x - VANISH) * 2.0, HORIZON - p.y, 1.0);
}

// A bird seen from below: two wings that beat, and a small body.
float bird(vec2 p, vec4 b) {
    vec2 l = vec2((p.x - b.x) * 2.0, p.y - b.y) / b.z;
    if (abs(l.x) > 1.3 || abs(l.y) > 1.3) return 0.0;
    float ax = abs(l.x);
    float wingY = -b.w * 0.6 * ax + (1.0 - b.w) * 0.14 * ax * ax;
    float aa = fwidth(l.y) + 0.001;
    float thick = mix(0.17, 0.06, ax) + aa * 0.5;
    float wing = (1.0 - smoothstep(thick, thick + aa, abs(l.y - wingY))) * (1.0 - smoothstep(1.0 - aa * 2.0, 1.0, ax));
    float body = 1.0 - smoothstep(0.15, 0.15 + aa, length(l * vec2(1.5, 1.0)));
    return max(wing, body);
}

// How far a point sits inside the water, in frame units: negative on the steps.
float intoWater(vec2 p) {
    float far = p.y - FAR;
    float left = p.y - (FAR + (${leftShore.x0.toFixed(3)} - p.x) * ${((leftShore.y1 - farShore) / (leftShore.x0 - leftShore.x1)).toFixed(4)});
    float right = p.y - (FAR + (p.x - ${rightShore.x0.toFixed(3)}) * ${((rightShore.y1 - farShore) / (rightShore.x1 - rightShore.x0)).toFixed(4)});
    return min(far, min(p.x < ${leftShore.x0.toFixed(3)} ? left : 1.0, p.x > ${rightShore.x0.toFixed(3)} ? right : 1.0));
}

float simHeight(vec2 q) {
    vec2 css = vec2((q.x - ${plane.left.toFixed(1)}) * ${plane.unit.toFixed(1)}, (q.y - ${plane.near.toFixed(1)}) * ${plane.unit.toFixed(1)});
    vec2 uv = vec2(css.x, ${((plane.far - plane.near) * plane.unit).toFixed(1)} - css.y) * ${simScale.toFixed(3)} / uSimSize;
    return texture(uState, uv).r;
}

// Wind on the tank: a few trains of small waves plus a little noise, as slopes on the plane.
vec2 windSlope(vec2 q, float t) {
    vec2 g = vec2(0.0);
    vec4 trains[4] = vec4[4](
        vec4(0.82, 0.57, 15.0, 1.3),
        vec4(-0.6, 0.8, 21.0, 1.7),
        vec4(0.2, 0.98, 28.0, 2.2),
        vec4(0.97, -0.25, 11.0, 0.9)
    );
    for (int i = 0; i < 4; i++) {
        vec2 dir = trains[i].xy;
        float k = trains[i].z;
        g += dir * cos(dot(dir, q) * k + t * trains[i].w * 2.0 + float(i) * 1.7) * (0.11 / sqrt(float(i) + 1.0));
    }
    g += (vec2(noise(q * vec2(7.0, 11.0) + vec2(t * 0.35, t * 0.5)), noise(q * vec2(9.0, 6.0) - vec2(t * 0.4, -t * 0.3) + 7.0)) - 0.5) * 0.35;
    return g;
}

void main() {
    vec2 uv = vec2(gl_FragCoord.x / uRes.x, 1.0 - gl_FragCoord.y / uRes.y);
    vec2 frame = uCover.zw + uCover.xy * 0.5 + (uv - 0.5) * uCover.xy / uZoom;
    // Parallax from the model's depth: the camera's small moves shift near surfaces more than far ones.
    float depth = depthAt(frame);
    vec2 p = frame + vec2(uCam.x / (2.0 * depth), -uCam.y / depth);
    vec2 sp = p;

    // The trees sway; leaves flutter on top of that.
    sp.x -= swayAt(p);
    float leaves = texture(uMask, sp).g;
    sp += (vec2(noise(p * vec2(90.0, 140.0) + uTime * 1.7), noise(p * vec2(110.0, 120.0) - uTime * 1.5)) - 0.5) * 0.0018 * leaves * uMotion;

    vec4 mask = texture(uMask, sp);
    // Unmix each pixel: the matte says how much of it is daytime sky. Take that out exactly,
    // light and grade what is left as solid, and add the hour's sky back in its place.
    vec3 photo = texture(uPhoto, sp).rgb;
    vec3 skyHere = skyBehind(sp.y, photo, mask.r);
    vec3 land = sunOn(max(photo - mask.r * skyHere, 0.0), sp);
    // Leaves turning in the wind catch the light.
    land *= 1.0 + (noise(p * vec2(220.0, 330.0) + uTime * vec2(2.1, -1.7)) - 0.5) * 0.24 * mask.g * uMotion;

    float inside = intoWater(p);
    float water = smoothstep(-0.002, 0.002, inside);
    float skyAlpha = mask.r;
    vec3 skyPixel = skyHere;
    vec3 skyTint = vec3(1.0);
    float skyHeight = p.y;
    vec3 base = land;
    if (inside > -0.003) {
        float z = 1.0 / max(p.y - HORIZON, 0.02);
        vec2 q = vec2((p.x - VANISH) * 2.0 * z, z);
        // Gusts cross the tank as rougher patches, the way wind shows on still water.
        float gust = smoothstep(0.42, 0.78, fbm(q * vec2(0.55, 0.9) - vec2(uTime * 0.22, uTime * 0.05))) * uMotion;
        vec2 slope = windSlope(q, uTime) * uMotion * (0.5 + 1.5 * gust);
        float e = ${(1 / plane.unit / simScale).toFixed(4)};
        float hl = simHeight(q - vec2(e, 0.0));
        float hr = simHeight(q + vec2(e, 0.0));
        float hn = simHeight(q - vec2(0.0, e));
        float hf = simHeight(q + vec2(0.0, e));
        vec2 rings = vec2(hr - hl, hn - hf) * 3.0;
        slope += rings;
        // Near the shore the reflections stay put, so the steps never smear.
        float settle = smoothstep(0.0, 0.03, inside);

        // The reflection: where the model says this water mirrors, bent by the surface's slope.
        vec4 packed = baked(uMirror, p);
        vec2 m = vec2(unpack16(packed.rg), unpack16(packed.ba));
        m += vec2(slope.x * 0.45, slope.y) * (0.02 / z) * settle + rings * vec2(0.45, 1.0) * (0.012 / z) * settle;
        m.x -= swayAt(m);
        // The reflection is unmixed the same way, so the sky it shows can change with the hour.
        float seenAlpha = texture(uMask, m).r;
        vec3 seenPhoto = texture(uPhoto, m).rgb;
        vec3 seenSky = skyBehind(m.y, seenPhoto, seenAlpha);
        vec3 reflected = sunOn(max(seenPhoto - seenAlpha * seenSky, 0.0), m);
        // Rough water scatters the reflection into a blur of what it mirrors.
        reflected = mix(reflected, max(textureLod(uPhoto, m, 3.5).rgb - seenAlpha * seenSky, 0.0), gust * 0.5);
        vec3 ray = normalize(rayAt(p));
        float fresnel = 0.04 + 0.96 * pow(1.0 - clamp(-ray.y, 0.0, 1.0), 4.0);
        vec3 tint = mix(vec3(0.5, 0.6, 0.4), vec3(0.85, 0.9, 0.8), fresnel);
        vec3 surface = reflected * tint + vec3(0.03, 0.05, 0.018);
        // The tank's own murk, from the photo's water, blurred far past any reflection in it.
        float murk = 0.18;
        surface = mix(surface, textureLod(uPhoto, p, 5.5).rgb * (1.0 - uNight * 0.85), murk);
        // Ring crests tilt toward the bright sky and catch it.
        surface += vec3(0.9, 0.94, 1.0) * clamp(rings.y * 0.6 + length(rings) * 0.25, 0.0, 0.5) * 0.16;

        // Leaves and marigolds ride the surface, flattened by the low view.
        vec2 bob = q + slope * 0.02;
        vec4 petal = vec4(0.0);
        for (int i = 0; i < ${petalCount}; i++) {
            vec4 leaf = uPetals[i];
            vec2 d = bob - leaf.xy;
            float ca = cos(leaf.z);
            float sa = sin(leaf.z);
            d = vec2(ca * d.x + sa * d.y, -sa * d.x + ca * d.y);
            vec2 radius = leaf.w > 0.5 ? vec2(0.024, 0.024) : vec2(0.05, 0.022);
            float r = length(d / radius);
            float aa = fwidth(r) + 0.02;
            float a = 1.0 - smoothstep(1.0 - aa, 1.0 + aa, r);
            vec3 colour = leaf.w > 0.5 ? vec3(0.86, 0.5, 0.1) : vec3(0.5, 0.42, 0.18);
            colour *= 0.78 + 0.22 * smoothstep(1.0, 0.0, r);
            if (a > petal.a) petal = vec4(colour, a);
        }
        surface = mix(surface, petal.rgb, petal.a * settle);
        base = mix(land, surface, water);
        skyAlpha = mix(mask.r, seenAlpha * (1.0 - murk) * (1.0 - petal.a * settle), water);
        skyPixel = mix(skyHere, seenSky, water);
        skyTint = mix(vec3(1.0), tint, water);
        skyHeight = mix(p.y, m.y, water);
    }

    // Cloud shadows: now and then a cloud passes and its shadow crosses the scene.
    vec2 ground = vec2((p.x - VANISH) * 2.0 * min(depth, 12.0), min(depth, 12.0) + p.y * 3.0);
    float cloudShadow = smoothstep(0.5, 0.66, fbm(ground * 0.3 - vec2(uTime * 0.09, uTime * 0.02))) * uShade * (1.0 - uNight);
    base *= 1.0 - cloudShadow * 0.2;
    float height = clamp((HORIZON - skyHeight) / HORIZON, 0.0, 1.0);

    // The solid share: dusk warms it, night turns it moonlit blue.
    vec3 c = mix(base, base * vec3(1.08, 0.92, 0.78), uDusk * 0.45);
    c = mix(c, c * vec3(0.12, 0.15, 0.25), uNight);

    // The sky share for the hour: the overcast as it is by day, glowing at dusk, dark at night with a few stars.
    float skyLum = dot(skyPixel, vec3(0.299, 0.587, 0.114));
    vec3 sky = mix(skyPixel, mix(vec3(1.0, 0.64, 0.4), vec3(0.56, 0.46, 0.64), height) * (0.5 + 0.75 * skyLum), uDusk * 0.8);
    vec3 nightSky = mix(vec3(0.1, 0.12, 0.22), vec3(0.035, 0.05, 0.11), height) * (0.7 + 0.6 * skyLum);
    vec2 starAt = vec2(p.x, skyHeight) * vec2(600.0, 300.0);
    float star = step(0.9978, hash(floor(starAt) * 0.0731 + 0.37)) * smoothstep(0.4, 0.1, length(fract(starAt) - 0.5));
    nightSky += vec3(0.8, 0.85, 1.0) * star * (0.6 + 0.4 * sin(uTime * 2.0 + p.x * 900.0)) * (1.0 - water) * smoothstep(0.92, 1.0, skyAlpha) * 0.6;
    sky = mix(sky, nightSky, uNight);
    c += skyTint * skyAlpha * sky;

    // Birds cross the sky.
    for (int i = 0; i < ${maxBirds}; i++) {
        if (i >= uBirdCount) break;
        vec3 silhouette = mix(vec3(0.1, 0.1, 0.11), vec3(0.02, 0.025, 0.04), uNight);
        c = mix(c, silhouette, bird(p, uBirds[i]) * uBirdAlpha[i] * 0.85);
    }
    c *= uDim;

    if (uLit > 0.001) {
        // Where this pixel is in the tank, and which way it faces.
        vec3 here = rayAt(p) * (water > 0.5 ? 1.0 / max(p.y - HORIZON, 0.02) : depth);
        vec4 surface = texture(uSurface, p);
        vec3 n = normalize(surface.rgb * 2.0 - 1.0);
        float solid = step(0.5, surface.a * 3.0) * (1.0 - water);
        vec3 onSurfaces = vec3(0.0);
        vec3 added = vec3(0.0);
        for (int i = 0; i < ${maxLights}; i++) {
            if (i >= uLightCount) break;
            vec4 light = uLights[i];
            vec4 colour = uColors[i];
            if (light.w < 0.002) continue;
            vec2 d = (p - light.xy) * vec2(2.0, 1.0);
            float d2 = dot(d, d);
            float r = light.z;
            float core = max(r * 0.07, 0.0042);
            // Light falls off with real distance and lands on the faces turned toward it.
            vec3 toLight = rayAt(light.xy) * uLampDepth[i] - here;
            float reach = r * uLampDepth[i] * 1.3;
            float facing = surface.a * 3.0 < 1.5 ? 0.35 : max(dot(n, normalize(toLight)), 0.0);
            onSurfaces += colour.rgb * light.w * facing * solid / (1.0 + dot(toLight, toLight) / (reach * reach));
            added += colour.rgb * (exp(-d2 / (core * core)) * 1.5 + exp(-d2 / (r * r * 0.12)) * 0.25) * light.w;
            if (colour.a > 0.0 && water > 0.0) {
                // Each light draws a long trembling streak on the water below its reflection.
                float ry = 2.0 * colour.a - light.y;
                vec2 s = vec2((sp.x - light.x) * 2.0 / max(r * 0.28, 0.003), (sp.y - ry) / (r * 2.2 + 0.03));
                float shimmer = 0.5 + 0.5 * noise(vec2(sp.x * 420.0, sp.y * 260.0 - uTime * 2.4));
                added += colour.rgb * exp(-dot(s, s)) * shimmer * light.w * 0.8 * water;
            }
        }
        // Only the solid share takes lamplight; the sky between leaves stays dark.
        c += base * onSurfaces * 1.4 * uLit + added * uLit;
    }

    // Fireflies over the steps and under the trees on a dark night.
    float flies = smoothstep(0.55, 0.9, uNight) * uMotion;
    if (flies > 0.001) {
        for (int i = 0; i < 14; i++) {
            float seed = float(i);
            float low = step(7.0, seed);
            vec2 home = vec2(0.04 + 0.92 * hash(vec2(seed, 1.3)), mix(mix(0.1, 0.33, hash(vec2(seed, 7.1))), mix(0.38, 0.62, hash(vec2(seed, 3.7))), low));
            vec2 wander = vec2(noise(vec2(uTime * 0.13, seed * 3.1)), noise(vec2(seed * 5.3, uTime * 0.11))) - 0.5;
            vec2 d = (p - home - wander * vec2(0.06, 0.03)) * vec2(2.0, 1.0);
            float blink = pow(max(0.0, sin(uTime * (0.8 + hash(vec2(seed, 9.9))) * 1.4 + seed * 4.0)), 6.0);
            float dd = dot(d, d);
            c += vec3(0.78, 1.0, 0.42) * (exp(-dd / 0.0000064) * 1.3 + exp(-dd / 0.00008) * 0.18) * blink * flies;
        }
    }

    // The photo's own grain keeps moving, so the frame never freezes into a still.
    c += (hash(gl_FragCoord.xy + fract(uTime * 7.0) * 61.0) - 0.5) * 0.012;
    outColor = vec4(c, 1.0);
}
`;

type KundOptions = Readonly<{
    hourOverride?: number;
    container: HTMLElement;
    canvas: HTMLCanvasElement;
    /** The still photo already on the page; its loaded image becomes the texture. */
    photo: HTMLImageElement;
    maskUrl: string;
    reducedMotion: boolean;
    isDark: () => boolean;
}>;

function loadImage(src: string) {
    return new Promise<HTMLImageElement | null>((resolve) => {
        const image = new Image();
        image.decoding = "async";
        image.onload = () => resolve(image);
        image.onerror = () => resolve(null);
        image.src = src;
    });
}

/** Mipmaps let rough water blur its reflections, and keep the steps from shimmering when small. */
function texture(gl: WebGL2RenderingContext, image: HTMLImageElement) {
    const handle = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, handle);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.generateMipmap(gl.TEXTURE_2D);
    return handle;
}

/**
 * Sets the photo on the model and brings it to life. Resolves to null
 * without WebGL2 or the images, and the still photo stays as it is.
 */
export async function createKundScene(options: KundOptions): Promise<Pond | null> {
    const { hourOverride, container, canvas, photo, maskUrl, reducedMotion, isDark } = options;
    const [photoImage, maskImage] = await Promise.all([loadImage(photo.currentSrc || photo.src), loadImage(maskUrl)]);
    if (!photoImage || !maskImage) return null;
    const context = canvas.getContext("webgl2", { alpha: false, antialias: false, powerPreference: "low-power" });
    if (!context) return null;
    const gl: WebGL2RenderingContext = context;
    const ripples = createRipples(gl);
    const program = link(gl, fullscreenVertex, fragment);
    if (!ripples || !program) return null;
    let hour = hourOverride ?? homeHour();
    let sun = sunAt(hour);
    const photoTexture = texture(gl, photoImage);
    const maskTexture = texture(gl, maskImage);
    const baking = await bakeKund(gl, maskTexture, sun);
    if (!baking) {
        gl.deleteTexture(photoTexture);
        gl.deleteTexture(maskTexture);
        return null;
    }
    const bake = baking;
    ripples.resize((plane.right - plane.left) * plane.unit, (plane.far - plane.near) * plane.unit);

    const u = uniforms(gl, program, [
        "uPhoto", "uMask", "uSurface", "uDepth", "uMirror", "uShadow", "uState", "uSimSize", "uRes",
        "uCover", "uTime", "uMotion", "uNight", "uDusk", "uGold", "uDim", "uLit", "uLights", "uColors",
        "uLampDepth", "uLightCount", "uCam", "uZoom", "uShade", "uBirds", "uBirdAlpha", "uBirdCount",
        "uPetals", "uSun",
    ]);
    const screen = createFullscreenTriangle(gl, [program]);

    const lamps = makeLamps();
    const floating: Floating[] = [];
    const lightData = new Float32Array(maxLights * 4);
    const colourData = new Float32Array(maxLights * 4);
    const lampDepth = new Float32Array(maxLights);
    let width = 1;
    let height = 1;
    let cover = { sx: 1, sy: 1, ox: 0, oy: 0 };
    let time = random(0, 100);
    let clockAge = 0;
    let nextRise = random(...riseEvery);
    let frame: number | undefined;
    let lastTimestamp: number | undefined;
    let isActive = false;
    let lastStir: { x: number; y: number } | null = null;
    // The camera starts square on, then eases into its drift.
    let zoom = 1;
    const camera = { x: 0, y: 0 };
    let follow: { x: number; y: number } | null = null;
    let shade = 0;
    let shadeAge = 0;
    let shadeFor = 0;
    let nextShade = random(10, 25);
    const birds: Bird[] = [];
    let nextFlock = random(3, 8);
    let kiteAngle = random(0, Math.PI * 2);
    let kiteSeen = 0;
    const birdData = new Float32Array(maxBirds * 4);
    const birdAlpha = new Float32Array(maxBirds);
    const petals: Petal[] = Array.from({ length: petalCount }, (_, index) => ({
        x: random(...waterX),
        z: random(...waterZ),
        vx: random(-0.02, 0.02),
        vz: random(-0.015, 0.015),
        pushX: 0,
        pushZ: 0,
        angle: random(0, Math.PI),
        spin: random(-0.08, 0.08),
        kind: index < 3 ? 1 : 0,
    }));
    const petalData = new Float32Array(petalCount * 4);

    const light = () => daylightAt(hour, isDark());
    /** Dusk and dawn: how warm the light is, from its colour on the daylight curve. */
    const duskOf = (tint: Rgb, night: number) => Math.min(1, Math.max(0, (tint[0] - tint[2]) * 3.2)) * (1 - night * 0.6);

    /** How far the camera has eased in: its moves only start once the zoom leaves room for them. */
    const cameraReach = () => (zoom - 1) / (cameraZoom - 1);

    /** A point in the frame (CSS pixels) to frame units, through the camera's zoom and its shift over the water. */
    function toFrame(x: number, y: number) {
        const point = {
            x: cover.ox + cover.sx * (0.5 + (x / width - 0.5) / zoom),
            y: cover.oy + cover.sy * (0.5 + (y / height - 0.5) / zoom),
        };
        if (point.y > horizon + 0.02) {
            const z = 1 / (point.y - horizon);
            point.x += (camera.x * cameraReach()) / (2 * z);
            point.y -= (camera.y * cameraReach()) / z;
        }
        return point;
    }

    /** Pushes floating things away from a tap. */
    function pushAway(items: { x: number; z: number; pushX: number; pushZ: number }[], x: number, z: number) {
        for (const item of items) {
            const dx = item.x - x;
            const dz = item.z - z;
            const distance = Math.hypot(dx, dz) || 1;
            if (distance < 1.2) {
                item.pushX += (dx / distance) * (1.2 - distance) * 0.8;
                item.pushZ += (dz / distance) * (1.2 - distance) * 0.8;
            }
        }
    }

    /** Drifts something afloat, easing off any push, and keeps it on the water. */
    function drift(item: { x: number; z: number; vx: number; vz: number; pushX: number; pushZ: number }, dt: number) {
        item.x += (item.vx + item.pushX) * dt;
        item.z += (item.vz + item.pushZ) * dt;
        const damping = Math.exp(-1.4 * dt);
        item.pushX *= damping;
        item.pushZ *= damping;
        if (item.x < waterX[0] || item.x > waterX[1]) item.vx = -item.vx;
        if (item.z < waterZ[0] || item.z > waterZ[1]) item.vz = -item.vz;
        Object.assign(item, clampToWater(item));
    }

    /** A flock crossing the sky from one side, loosely strung out. */
    function spawnFlock() {
        const fromLeft = Math.random() < 0.5;
        const count = Math.round(random(3, 7));
        const speed = random(0.03, 0.055);
        const y = random(0.05, 0.22);
        for (let i = 0; i < count && birds.length < maxBirds - 1; i++) {
            const offset = 0.03 + i * random(0.018, 0.034);
            birds.push({
                x: fromLeft ? -offset : 1 + offset,
                y: y + random(-0.025, 0.025) + i * 0.004,
                vx: (fromLeft ? 1 : -1) * speed * random(0.94, 1.06),
                size: random(0.007, 0.011),
                phase: random(0, Math.PI * 2),
                rate: random(9, 13),
                bob: random(0, Math.PI * 2),
            });
        }
    }
    function toPlane(px: number, py: number) {
        const z = 1 / Math.max(py - horizon, 0.02);
        return { x: (px - vanishX) * 2 * z, z };
    }
    function planeToFrame(x: number, z: number) {
        return { x: vanishX + x / (2 * z), y: horizon + 1 / z };
    }
    const clampToWater = (point: { x: number; z: number }) => ({
        x: Math.min(Math.max(point.x, waterX[0]), waterX[1]),
        z: Math.min(Math.max(point.z, waterZ[0]), waterZ[1]),
    });
    /** A ring on the water at a plane point; the simulation runs in plane units, so rings shrink with distance. */
    function ring(x: number, z: number, strength: number, radius: number) {
        ripples?.drop((x - plane.left) * plane.unit, (z - plane.near) * plane.unit, strength, radius);
    }
    const isOverWater = (px: number, py: number) => {
        if (py <= farShore) return false;
        const z = toPlane(px, py);
        return z.x > waterX[0] - 0.2 && z.x < waterX[1] + 0.2;
    };

    function step(dt: number) {
        time += dt;
        clockAge += dt;
        if (hourOverride === undefined && clockAge > clockSeconds) {
            clockAge = 0;
            hour = homeHour();
            // The sun has moved on: bake its shadows again, a strip a frame.
            sun = sunAt(hour);
            void bake.shadows(sun);
        }
        nextRise -= dt;
        if (nextRise <= 0) {
            nextRise = random(...riseEvery);
            ring(random(...waterX), random(...waterZ), riseStrength, random(2.2, 3.2));
        }
        const night = light().night;

        // The camera eases in, then drifts on its own or leans toward the mouse.
        zoom += (cameraZoom - zoom) * (1 - Math.exp(-dt * 0.8));
        const target = follow
            ? { x: follow.x * cameraFollow.x, y: follow.y * cameraFollow.y }
            : {
                  x: cameraDrift.x * (Math.sin(time * 0.13) * 0.7 + Math.sin(time * 0.31 + 1.3) * 0.3),
                  y: cameraDrift.y * Math.sin(time * 0.17 + 0.7),
              };
        const ease = 1 - Math.exp(-dt * (follow ? 2.2 : 1.2));
        camera.x += (target.x - camera.x) * ease;
        camera.y += (target.y - camera.y) * ease;

        // Now and then a cloud passes over the sun.
        if (shadeFor > 0) {
            shadeAge += dt;
            shade = Math.sin((Math.PI * Math.min(shadeAge, shadeFor)) / shadeFor) ** 2;
            if (shadeAge >= shadeFor) {
                shadeFor = 0;
                shade = 0;
                nextShade = random(...shadeGap);
            }
        } else {
            nextShade -= dt;
            if (nextShade <= 0) {
                shadeAge = 0;
                shadeFor = random(...shadeLength);
            }
        }

        // Birds keep to daylight: flocks cross, and a kite circles over the trees.
        nextFlock -= dt;
        if (nextFlock <= 0) {
            nextFlock = random(...flockEvery);
            if (night < 0.4) spawnFlock();
        }
        for (let i = birds.length - 1; i >= 0; i--) {
            const bird = birds[i];
            bird.x += bird.vx * dt;
            bird.y += Math.sin(time * 1.3 + bird.bob) * 0.004 * dt;
            bird.phase += bird.rate * dt;
            if (bird.x < -0.4 || bird.x > 1.4) birds.splice(i, 1);
        }
        kiteAngle += dt * 0.11;
        kiteSeen += ((night < 0.3 ? 1 : 0) - kiteSeen) * (1 - Math.exp(-dt * 0.5));

        for (const leaf of petals) {
            drift(leaf, dt);
            leaf.angle += (leaf.spin + (leaf.pushX - leaf.pushZ) * 0.6) * dt;
        }
        for (let i = floating.length - 1; i >= 0; i--) {
            const diya = floating[i];
            drift(diya, dt);
            // Floating diyas burn out with the dawn.
            diya.alpha = night < 0.15 ? diya.alpha - dt * 0.4 : Math.min(1, diya.alpha + dt * 2);
            if (diya.alpha <= 0) floating.splice(i, 1);
        }
        ripples?.step(dt);
    }

    function render() {
        const daylight = light();
        const night = daylight.night;
        const lit = smoothstep(0.08, 0.5, night);
        let count = 0;
        const add = (x: number, y: number, radius: number, colour: Rgb, strength: number, axis: number, depth: number) => {
            if (count >= maxLights) return;
            lightData.set([x, y, radius, strength], count * 4);
            colourData.set([colour[0], colour[1], colour[2], axis], count * 4);
            lampDepth[count] = depth;
            count += 1;
        };
        if (lit > 0.001) {
            for (const lamp of lamps) {
                const on = smoothstep(lamp.threshold, lamp.threshold + 0.1, night);
                if (on <= 0.001) continue;
                const flicker = lamp.flicker && !reducedMotion ? 0.82 + 0.18 * Math.sin(time * 9.1 + lamp.seed) * Math.sin(time * 5.3 + lamp.seed * 1.9) : 1;
                add(lamp.x, lamp.y, lamp.radius, lamp.color, lamp.strength * on * flicker, lamp.axis, lamp.depth);
            }
        }
        for (const diya of floating) {
            const at = planeToFrame(diya.x, diya.z);
            const near = (at.y - horizon) / (farShore - horizon);
            const flicker = reducedMotion ? 1 : 0.85 + 0.15 * Math.sin(time * 8.7 + diya.seed);
            add(at.x, at.y - 0.004 * near, 0.017 * near, flame, diya.alpha * flicker * Math.max(lit, 0.4), at.y + 0.002 * near, diya.z);
        }

        let birdCount = 0;
        const addBird = (x: number, y: number, size: number, flap: number, alpha: number) => {
            if (birdCount >= maxBirds || alpha < 0.01) return;
            birdData.set([x, y, size, flap], birdCount * 4);
            birdAlpha[birdCount] = alpha;
            birdCount += 1;
        };
        // The kite mostly soars, with a few beats now and then.
        const kiteFlap = Math.sin(time * 0.37) > 0.9 ? Math.sin(time * 7) : 0.3;
        addBird(0.3 + 0.09 * Math.cos(kiteAngle), 0.11 + 0.025 * Math.sin(kiteAngle), 0.016, kiteFlap, kiteSeen);
        for (const bird of birds) addBird(bird.x, bird.y, bird.size, Math.sin(bird.phase), 1);
        petals.forEach((leaf, index) => petalData.set([leaf.x, leaf.z, leaf.angle, leaf.kind], index * 4));

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.useProgram(program);
        gl.bindVertexArray(screen.vao);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, ripples?.texture() ?? null);
        gl.uniform1i(u.uState, 0);
        const bound: [WebGLUniformLocation | null, WebGLTexture][] = [
            [u.uPhoto, photoTexture],
            [u.uMask, maskTexture],
            [u.uSurface, bake.surface],
            [u.uDepth, bake.depth],
            [u.uMirror, bake.mirror],
            [u.uShadow, bake.shadow],
        ];
        bound.forEach(([location, handle], index) => {
            gl.activeTexture(gl.TEXTURE1 + index);
            gl.bindTexture(gl.TEXTURE_2D, handle);
            gl.uniform1i(location, 1 + index);
        });
        gl.uniform2f(u.uSimSize, ripples?.width() ?? 1, ripples?.height() ?? 1);
        gl.uniform2f(u.uRes, canvas.width, canvas.height);
        gl.uniform4f(u.uCover, cover.sx, cover.sy, cover.ox, cover.oy);
        gl.uniform1f(u.uTime, time);
        gl.uniform1f(u.uMotion, 1);
        gl.uniform1f(u.uNight, night);
        const dusk = duskOf(daylight.light, night);
        gl.uniform1f(u.uDusk, dusk);
        // Low sun: strongest in the golden hour, gone by full night.
        gl.uniform1f(u.uGold, Math.min(1, dusk * 1.4) * (1 - smoothstep(0.2, 0.6, night)));
        // The dark theme softens daylight so the scene never glares; night is already dark.
        gl.uniform1f(u.uDim, isDark() ? 0.82 + 0.18 * night : 1);
        gl.uniform1f(u.uLit, Math.max(lit, floating.length > 0 ? 1 : 0));
        gl.uniform4fv(u.uLights, lightData);
        gl.uniform4fv(u.uColors, colourData);
        gl.uniform1fv(u.uLampDepth, lampDepth);
        gl.uniform1i(u.uLightCount, count);
        gl.uniform2f(u.uCam, camera.x * cameraReach(), camera.y * cameraReach());
        gl.uniform1f(u.uZoom, zoom);
        gl.uniform1f(u.uShade, shade);
        gl.uniform4fv(u.uBirds, birdData);
        gl.uniform1fv(u.uBirdAlpha, birdAlpha);
        gl.uniform1i(u.uBirdCount, birdCount);
        gl.uniform3f(u.uSun, sun[0], sun[1], sun[2]);
        gl.uniform4fv(u.uPetals, petalData);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function tick(timestamp: number) {
        const dt = lastTimestamp === undefined ? 0 : Math.min((timestamp - lastTimestamp) / 1000, maxStepSeconds);
        lastTimestamp = timestamp;
        step(dt);
        render();
        frame = window.requestAnimationFrame(tick);
    }

    /** Runs time forward without drawing, so a paused scene can still show a tap's ring. */
    function advance(seconds: number) {
        for (let elapsed = 0; elapsed < seconds; elapsed += 1 / 60) step(1 / 60);
    }

    return {
        redraw() {
            render();
        },
        resize() {
            width = container.clientWidth;
            height = container.clientHeight;
            if (width === 0 || height === 0) return;
            const ratio = Math.min(pixelRatioCap, window.devicePixelRatio || 1);
            canvas.width = Math.round(width * ratio);
            canvas.height = Math.round(height * ratio);
            // Cover the frame like the still image does, cropping around the same focus.
            const aspect = width / height;
            cover = aspect >= 2
                ? { sx: 1, sy: 2 / aspect, ox: 0, oy: (1 - 2 / aspect) * focus.y }
                : { sx: aspect / 2, sy: 1, ox: (1 - aspect / 2) * focus.x, oy: 0 };
            render();
        },
        setActive(active) {
            if (active === isActive) return;
            isActive = active;
            if (active) {
                lastTimestamp = undefined;
                frame = window.requestAnimationFrame(tick);
            } else if (frame !== undefined) {
                window.cancelAnimationFrame(frame);
                frame = undefined;
            }
        },
        poke(x, y) {
            const at = toFrame(x, y);
            const point = clampToWater(toPlane(at.x, Math.max(at.y, farShore + 0.01)));
            ring(point.x, point.z, tapStrength, 4.2);
            pushAway(floating, point.x, point.z);
            pushAway(petals, point.x, point.z);
            // After dark, a tap sets a diya afloat where it lands.
            if (light().night > 0.35) {
                if (floating.length >= maxFloating) floating.shift();
                floating.push({ x: point.x, z: point.z, vx: random(-0.04, 0.04), vz: random(-0.05, 0.05), pushX: 0, pushZ: 0, alpha: 0.3, seed: random(0, 100) });
            }
            if (!isActive) {
                advance(reducedMotion ? 0.5 : 0.25);
                render();
            }
        },
        setPointer(point) {
            if (!point) {
                lastStir = null;
                follow = null;
                return;
            }
            follow = { x: point.x / width - 0.5, y: point.y / height - 0.5 };
            const at = toFrame(point.x, point.y);
            if (!isActive || !isOverWater(at.x, at.y)) {
                lastStir = null;
                return;
            }
            if (!lastStir || Math.hypot(point.x - lastStir.x, point.y - lastStir.y) > stirPixels) {
                if (lastStir) {
                    const onWater = toPlane(at.x, at.y);
                    ring(onWater.x, onWater.z, stirStrength, 2.6);
                }
                lastStir = point;
            }
        },
        destroy() {
            if (frame !== undefined) window.cancelAnimationFrame(frame);
            ripples?.destroy();
            screen.destroy();
            bake.destroy();
            gl.deleteTexture(photoTexture);
            gl.deleteTexture(maskTexture);
            gl.deleteProgram(program);
        },
    };
}
