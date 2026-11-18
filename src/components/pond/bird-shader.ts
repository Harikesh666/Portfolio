import { glslNoise } from "./pond-gl";

/** Sizes the shader is compiled for; the scene fills these arrays every frame. */
export const birdShaderSizes = { branchPoints: 14, twigs: 18, leaves: 72 } as const;

/**
 * The bulbul scene's fragment shader. Everything is a signed distance in
 * frame height units (y up, x centred), lit as a long-lens photograph shot
 * into the light:
 *
 * - the background is far trees thrown out of focus, with bokeh where the
 *   sun glints through them, under a sky that follows the hour;
 * - the branch has a knobbly outline, furrowed bark with lichen, and round
 *   shading;
 * - leaves twist in 3D as they flutter, so their width foreshortens and their
 *   paler undersides flip into view; they glow through when backlit, with
 *   darker veins, darker still where two overlap, and glints of sun;
 * - the bird is rounded by its interior distance, with scaled breast
 *   feathers, layered wing primaries, separate tail feathers with a pale tip,
 *   and a glowing fringe of feather tips where its outline faces the light.
 *
 * A filmic tone curve, a gentle grade, faint god rays, grain and a vignette
 * finish it.
 */
export function birdFragment(birdScale: number) {
    const { branchPoints, twigs, leaves } = birdShaderSizes;
    return /* glsl */ `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uNight;
uniform float uDusk;
uniform float uDim;
uniform vec2 uSun;
uniform vec2 uMoon;
uniform float uGust;
uniform vec3 uBranch[${branchPoints}];
uniform vec4 uTwigs[${twigs}];
uniform int uTwigCount;
uniform vec4 uLeaves[${leaves}];
uniform vec4 uLeafShape[${leaves}];
uniform int uLeafCount;
uniform vec2 uBird;
uniform float uFacing;
uniform float uTilt;
uniform float uHead;
uniform float uBeak;
uniform float uPuff;
uniform float uCrest;
uniform float uTail;
uniform float uBreath;
uniform float uFluff;
uniform float uFly;
uniform float uFlap;
uniform float uEye;
uniform float uPreen;
uniform float uStretch;
uniform float uMotion;
out vec4 outColor;
${glslNoise}

const float SCALE = ${birdScale.toFixed(3)};
const float PI = 3.14159265;

vec2 rot(vec2 v, float a) {
    float c = cos(a);
    float s = sin(a);
    return vec2(c * v.x - s * v.y, s * v.x + c * v.y);
}

// A segment whose radius runs from ra at a to rb at b.
float taper(vec2 p, vec2 a, vec2 b, float ra, float rb) {
    vec2 pa = p - a;
    vec2 ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h) - mix(ra, rb, h);
}

float ellipse(vec2 p, vec2 r) {
    return (length(p / r) - 1.0) * min(r.x, r.y);
}

float smin(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
}

// The light: warm sun by day and at dusk, a faint cool moon at night.
vec3 sunColour() {
    return mix(mix(vec3(1.0, 0.92, 0.76), vec3(1.0, 0.56, 0.26), uDusk), vec3(0.55, 0.65, 0.9) * 0.35, uNight);
}

vec2 lightAt() {
    return mix(uSun, uMoon, uNight);
}

vec3 skyAt(vec2 p) {
    float h = clamp(p.y, 0.0, 1.0);
    vec3 zenith = mix(mix(vec3(0.28, 0.48, 0.8), vec3(0.25, 0.22, 0.45), uDusk), vec3(0.01, 0.018, 0.055), uNight);
    vec3 horizon = mix(mix(vec3(0.88, 0.86, 0.8), vec3(1.0, 0.55, 0.28), uDusk), vec3(0.05, 0.07, 0.15), uNight);
    vec3 c = mix(horizon, zenith, smoothstep(0.08, 1.0, h));
    float dSun = length((p - uSun) * vec2(1.0, 1.12));
    vec3 sun = sunColour();
    float day = 1.0 - uNight;
    c += sun * (exp(-dSun * 3.0) * 0.34 + exp(-dSun * dSun * 80.0) * 0.7) * day;
    c = mix(c, vec3(1.0, 0.98, 0.93) * 1.4, smoothstep(0.032, 0.027, dSun) * day);
    // Thin high cloud, lit from behind with bright linings near the sun.
    float band = smoothstep(0.38, 0.62, h) * (1.0 - smoothstep(0.94, 1.05, h));
    vec2 drift = vec2(p.x * 1.3 + uTime * 0.007, p.y * 3.4);
    float cloud = smoothstep(0.52, 0.8, fbm(drift)) * band;
    float lining = cloud * (1.0 - smoothstep(0.56, 0.86, fbm(drift + 0.06)));
    c = mix(c, mix(c * 0.93, mix(vec3(1.0), sun, 0.4), 0.42 * day) * mix(1.0, 0.25, uNight), cloud * 0.75);
    c += sun * lining * exp(-dSun * 2.2) * day;
    // Night: the moon with a soft halo, and stars between the clouds.
    float dMoon = length(p - uMoon);
    c += vec3(0.92, 0.93, 1.0) * (smoothstep(0.022, 0.017, dMoon) * 0.95 + exp(-dMoon * 9.0) * 0.12 + exp(-dMoon * 2.5) * 0.04) * uNight;
    vec2 cell = floor(p * 230.0);
    float star = step(0.993, hash(cell * 0.0731 + 0.37)) * smoothstep(0.38, 0.1, length(fract(p * 230.0) - 0.5));
    c += vec3(0.85, 0.88, 1.0) * star * (0.55 + 0.45 * sin(uTime * 2.3 + hash(cell + 3.1) * 40.0)) * smoothstep(0.6, 0.95, uNight) * (1.0 - cloud) * smoothstep(0.25, 0.5, h);
    // Far trees thrown out of focus by a long lens: a soft green mass with no edges.
    float rise = 0.44 + 0.16 * (fbm(vec2(p.x * 0.9 + 3.0, 1.0)) - 0.5) + 0.08 * sin(p.x * 2.3 + 1.0);
    float foliage = smoothstep(rise + 0.14, rise - 0.2, p.y);
    vec3 green = mix(vec3(0.13, 0.21, 0.08), vec3(0.3, 0.38, 0.15), fbm(p * 2.0 + 4.0));
    green = mix(green * mix(1.0, 0.68, uDusk) + sun * 0.13 * day, vec3(0.02, 0.03, 0.04), uNight * 0.9);
    c = mix(c, mix(green, c, 0.22), foliage * 0.93);
    // Bokeh: the sun glinting through those far leaves, each glint a soft disc with a brighter rim.
    for (int i = 0; i < 18; i++) {
        float seed = float(i);
        vec2 centre = vec2((hash(vec2(seed, 2.7)) - 0.5) * 2.4, mix(0.04, 0.58, hash(vec2(seed, 8.1))));
        centre.x += sin(uTime * 0.07 + seed) * 0.012;
        float radius = mix(0.026, 0.08, hash(vec2(seed, 4.4)));
        float r = length(p - centre) / radius;
        float disc = smoothstep(1.0, 0.88, r) * (0.7 + 0.3 * smoothstep(0.55, 0.96, r));
        vec3 glint = mix(vec3(1.0, 0.97, 0.78), vec3(0.6, 0.8, 0.34), hash(vec2(seed, 6.6)));
        float near = 1.0 - smoothstep(0.0, 1.4, length(centre - uSun));
        c += glint * sun * disc * mix(0.08, 0.26, hash(vec2(seed, 1.9))) * (0.6 + 0.8 * near) * day * foliage;
    }
    return c;
}

// The direction a 2D outline normal leans toward the light, as 0 to 1.
float facingLight(vec2 normal, vec2 p) {
    return clamp(dot(normal, normalize(lightAt() - p)) * 0.75 + 0.25, 0.0, 1.0);
}

// The branch, with its bark, rounded and backlit. Returns colour and coverage.
vec4 branchAt(vec2 p, float px) {
    float best = 1e9;
    float along = 0.0;
    float across = 0.0;
    vec2 side = vec2(0.0, 1.0);
    float travelled = 0.0;
    for (int i = 0; i < ${branchPoints - 1}; i++) {
        vec3 a = uBranch[i];
        vec3 e = uBranch[i + 1];
        vec2 ab = e.xy - a.xy;
        float h = clamp(dot(p - a.xy, ab) / dot(ab, ab), 0.0, 1.0);
        float r = mix(a.z, e.z, h);
        vec2 off = p - a.xy - ab * h;
        float s = travelled + h * length(ab);
        // A knobbly outline: bark bulges and dips along the grain.
        r *= 1.0 + 0.16 * (noise(vec2(s * 26.0, sign(dot(off, vec2(-ab.y, ab.x))) * 3.0)) - 0.5) + 0.06 * (noise(vec2(s * 90.0, 1.0)) - 0.5);
        float dist = length(off) - r;
        if (dist < best) {
            best = dist;
            vec2 n = normalize(vec2(-ab.y, ab.x));
            across = clamp(dot(off, n) / r, -1.0, 1.0);
            side = n;
            along = s;
        }
        travelled += length(ab);
    }
    float twigAcross = 0.0;
    for (int i = 0; i < ${twigs}; i++) {
        if (i >= uTwigCount) break;
        vec4 t = uTwigs[i];
        float dist = taper(p, t.xy, t.zw, 0.006, 0.0022);
        if (dist < best) {
            best = dist;
            vec2 ab = t.zw - t.xy;
            vec2 n = normalize(vec2(-ab.y, ab.x));
            across = clamp(dot(p - t.xy, n) / 0.0045, -1.0, 1.0);
            side = n;
            along = dot(p - t.xy, normalize(ab)) + 9.0;
            twigAcross = 1.0;
        }
    }
    if (best > px * 2.0) return vec4(0.0);
    // Bark: long furrows that wander, darker in the cracks, with patches of grey-green lichen.
    float wander = noise(vec2(along * 9.0, across * 1.5)) * 3.0;
    float furrow = abs(noise(vec2(along * 48.0 + wander, across * 5.0)) - 0.5) * 2.0;
    float crack = smoothstep(0.18, 0.0, furrow);
    float lichen = smoothstep(0.6, 0.7, fbm(vec2(along * 7.0, across * 1.2 + 4.0))) * (1.0 - twigAcross);
    vec3 bark = vec3(0.21, 0.15, 0.11) * (0.75 + 0.5 * noise(vec2(along * 140.0, across * 12.0)));
    bark = mix(bark, vec3(0.32, 0.34, 0.27), lichen * 0.7);
    bark *= 1.0 - 0.55 * crack;
    // Round shading: the sky lights the top, the underside falls into shade.
    float roundness = sqrt(max(1.0 - across * across, 0.0));
    vec3 fill = mix(vec3(0.3, 0.32, 0.37), vec3(0.05, 0.06, 0.1), uNight) * mix(1.0, 0.72, uDusk);
    vec3 c = bark * fill * (0.45 + 0.55 * roundness) * (0.75 + 0.35 * clamp(across * dot(side, vec2(0.0, 1.0)) + 0.5, 0.0, 1.0));
    vec2 normal = normalize(side * across + 0.0001);
    vec3 sun = sunColour();
    c += sun * exp(-max(-best, 0.0) / 0.0026) * facingLight(normal, p) * mix(1.3, 0.45, uNight) * (1.0 - 0.6 * crack);
    return vec4(c, clamp(0.5 - best / px, 0.0, 1.0));
}

// One leaf. Returns colour and coverage; layered counts leaves already under this pixel.
vec4 leafAt(vec2 p, vec4 leaf, vec4 shape, float px, float layered) {
    vec2 d = rot(p - leaf.xy, -leaf.z);
    float len = leaf.w;
    if (d.x < -0.012 || d.x > len + 0.012 || abs(d.y) > len * 0.4) return vec4(0.0);
    float twist = shape.x;
    float seed = shape.y;
    float u = clamp(d.x / len, 0.0, 1.0);
    // A gentle curl along the midrib, and the width foreshortened by the leaf's twist.
    float curl = len * 0.1 * (u - 0.25) * (u - 0.25) * sign(sin(seed));
    float v = d.y - curl;
    float width = len * shape.w * pow(max(sin(PI * pow(u, 0.8)), 0.0), 0.72);
    width *= v > 0.0 ? 1.07 : 0.93;
    width *= 0.12 + 0.88 * abs(twist);
    width *= 1.0 + 0.04 * sin(u * 70.0 + seed);
    float dist = max(abs(v) - width, max(-d.x, d.x - len)) * 0.85;
    if (dist > px * 2.0) return vec4(0.0);
    float across = clamp(v / max(width, 0.0004), -1.0, 1.0);
    bool underside = twist < 0.0;
    // Veins: the midrib, and side veins curving toward the tip.
    float midrib = smoothstep(0.0024, 0.0, abs(v)) * (1.0 - u * 0.55);
    float veins = smoothstep(0.05, 0.0, abs(fract(u * 7.5 - abs(across) * 0.55 + seed) - 0.5) - 0.45) * smoothstep(1.0, 0.35, abs(across));
    // Colour: young leaves yellow-green, old ones deep green; the underside paler.
    float age = hash(vec2(seed, 3.3));
    vec3 top = mix(vec3(0.2, 0.3, 0.07), vec3(0.06, 0.12, 0.04), age);
    vec3 under = mix(vec3(0.34, 0.42, 0.16), vec3(0.2, 0.28, 0.12), age);
    vec3 albedo = underside ? under : top;
    albedo *= 0.85 + 0.3 * noise(d * 180.0 + seed);
    vec3 sun = sunColour();
    float day = 1.0 - uNight;
    vec3 fill = mix(vec3(0.36, 0.4, 0.46), vec3(0.05, 0.06, 0.1), uNight) * mix(1.0, 0.75, uDusk);
    vec3 c = albedo * fill;
    // Light through the leaf: strongest near the sun, dimmed by veins, and by every leaf in front.
    float near = exp(-length(p - uSun) * 1.6);
    float through = day * (0.5 + 0.6 * near) * (underside ? 1.1 : 0.85) * (1.0 - 0.45 * midrib - 0.3 * veins) * (layered > 0.5 ? 0.45 : 1.0);
    c += vec3(0.7, 0.86, 0.24) * sun * through * 0.6 * mix(0.75, 1.0, 1.0 - age);
    // A glint where the waxy top tilts toward the light as it flutters.
    float glint = underside ? 0.0 : pow(clamp(twist, 0.0, 1.0), 10.0) * smoothstep(0.3, 0.8, noise(d * 60.0 + seed)) * day;
    c += sun * glint * 0.35;
    vec2 normal = rot(vec2(0.0, sign(v)), leaf.z);
    c += sun * exp(-max(-dist, 0.0) / 0.0016) * facingLight(normal, p) * mix(0.8, 0.3, uNight);
    return vec4(c, clamp(0.5 - dist / px, 0.0, 1.0));
}

// The bulbul, in bird units with its feet at the origin, facing +x. A
// red-vented bulbul perches upright and slim: a rounded head with a short,
// bushy black tuft rather than a spike, a short stout beak, a breast that
// rounds into the belly, folded wingtips, and a long tail held down and back,
// about as long as the body, hanging below the branch.
// part: 0 feathers, 2 beak, 5 legs, 6 wings (flight or a stretch). eye: distance to the eye.
// feathered: distance to the soft, feathered outline only.
float bird(vec2 b, out float part, out float eye, out float feathered) {
    float fluff = uFluff;
    float lean = 1.08 + (uTilt - 0.5) * 0.6;
    float grow = 1.0 + 0.02 * uBreath + 0.15 * fluff;
    float body = ellipse(rot(b - vec2(-0.01, 0.4), -lean), vec2(0.32, 0.195) * grow);
    float chest = length(b - vec2(0.08, 0.43)) - 0.165 * grow;
    float belly = length(b - vec2(0.02, 0.28)) - 0.135 * grow;
    vec2 tailBase = vec2(-0.1, 0.22);
    vec2 tailTip = tailBase + rot(vec2(-0.25, -0.72), uTail);
    float tail = taper(b, tailBase, tailTip, 0.06, 0.072 + 0.018 * uPuff);
    float wingtip = taper(b, vec2(-0.02, 0.36), vec2(-0.17, 0.08), 0.068, 0.02);
    // The head turns on its neck in snaps; preening it dips into the breast; asleep it sinks into the shoulders.
    float headTurn = uHead - 0.75 * fluff - 1.45 * uPreen;
    vec2 neck = vec2(0.08, 0.585 - 0.1 * fluff - 0.05 * uPreen);
    vec2 hc = neck + rot(vec2(0.05, 0.14) * (1.0 - 0.5 * fluff), headTurn);
    float head = length(b - hc) - 0.148;
    vec2 hq = rot(b - hc, -headTurn);
    // The crest: a short bushy tuft on the crown, a few wisps at its tip.
    float crestLength = (0.12 + 0.07 * uCrest) * (1.0 - 0.65 * fluff) * (1.0 - 0.4 * uPreen);
    vec2 crestTip = vec2(-0.07, 0.085 + crestLength);
    float crest = taper(hq, vec2(-0.035, 0.085), crestTip, 0.07, 0.028);
    crest = min(crest, taper(hq, crestTip + vec2(-0.02, -0.03), crestTip + vec2(-0.06, 0.012), 0.011, 0.003));
    float upper = taper(hq, vec2(0.115, 0.018), vec2(0.27, -0.012), 0.03, 0.004);
    vec2 lowerTip = vec2(0.115, -0.014) + rot(vec2(0.135, -0.01), -uBeak);
    float lower = taper(hq, vec2(0.115, -0.014), lowerTip, 0.025, 0.004);
    float beak = min(upper, lower) + 0.3 * step(0.5, fluff);
    float throat = length(b - vec2(0.15, 0.49)) - 0.08 * (1.0 + 0.6 * uPuff);
    // Legs and toes curled round the branch.
    float legs = min(taper(b, vec2(0.0, 0.2), vec2(-0.01, 0.01), 0.016, 0.011), taper(b, vec2(0.06, 0.2), vec2(0.05, 0.01), 0.016, 0.011));
    legs = min(legs, taper(b, vec2(-0.08, -0.01), vec2(0.0, 0.015), 0.012, 0.011));
    legs = min(legs, taper(b, vec2(0.0, 0.015), vec2(0.13, -0.012), 0.012, 0.009));
    legs += uFly * 0.6 + fluff * 0.12;
    // In flight two wings beat from the shoulder; perched, one opens down and back in a stretch.
    vec2 shoulder = vec2(0.0, 0.45);
    float wing = taper(b, shoulder, shoulder + rot(vec2(-0.22, 0.66), uFlap), 0.15, 0.035);
    float farWing = taper(b, shoulder + vec2(0.05, 0.02), shoulder + vec2(0.05, 0.02) + rot(vec2(-0.14, 0.58), uFlap * 0.85 + 0.25), 0.13, 0.03);
    wing = min(wing, farWing) + (1.0 - uFly) * 0.7;
    float stretched = taper(b, vec2(-0.02, 0.42), vec2(-0.02, 0.42) + vec2(-0.2, -0.5) * (0.3 + 0.7 * uStretch), 0.1, 0.03) + (1.0 - smoothstep(0.0, 0.15, uStretch)) * 0.5;
    wing = min(wing, stretched);
    feathered = smin(body, chest, 0.06);
    feathered = smin(feathered, belly, 0.06);
    // A thick neck: the head blends broadly into the shoulders.
    feathered = smin(feathered, head, 0.11);
    feathered = smin(feathered, throat, 0.06);
    feathered = smin(feathered, wingtip, 0.04);
    feathered = smin(feathered, tail, 0.035);
    feathered = smin(feathered, crest, 0.035);
    feathered += (noise(b * 14.0 + uTime * vec2(1.4, 0.8) * (0.3 + uGust) * uMotion) - 0.5) * 0.014 * (0.4 + uGust + 0.6 * fluff) * smoothstep(-0.05, 0.0, feathered);
    float d = min(feathered, min(beak, min(legs, wing)));
    eye = length(hq - vec2(0.06, 0.035)) + fluff + uPreen;
    part = 0.0;
    if (beak <= d + 0.001) part = 2.0;
    if (legs <= d + 0.001) part = 5.0;
    if (wing <= d + 0.001 && (uFly > 0.5 || uStretch > 0.1)) part = 6.0;
    return d;
}

vec2 toBird(vec2 p) {
    vec2 b = (p - uBird) / SCALE;
    b.x *= uFacing;
    return b;
}

float birdShape(vec2 p) {
    float part;
    float eye;
    float feathered;
    return bird(toBird(p), part, eye, feathered) * SCALE;
}

// The bird's colour at a pixel, given its distance and surface normal.
vec3 plumage(vec2 p, vec2 b, float d, vec2 normal, float part, float eye) {
    float fluff = uFluff;
    // A black hood and crest down to the upper breast, a brown-grey body with
    // pale-fringed scale feathers, a paler belly, a small red vent, a dark tail with a pale tip.
    float hood = smoothstep(0.5, 0.6, b.y - 0.12 * b.x) * (1.0 - fluff * 0.5);
    float belly = smoothstep(-0.02, 0.14, b.x) * smoothstep(0.5, 0.36, b.y) * smoothstep(0.1, 0.22, b.y);
    vec2 ventAt = b - vec2(-0.07, 0.14);
    float vent = exp(-dot(ventAt, ventAt) / 0.0035);
    float tailDark = smoothstep(0.1, -0.05, b.y);
    vec3 albedo = vec3(0.22, 0.18, 0.14) * (0.88 + 0.24 * noise(b * 18.0));
    // Scale feathers: rows of scallops, each with a paler fringe.
    vec2 s = b * vec2(14.0, 16.0);
    s.x += floor(s.y) * 0.5;
    float scallop = smoothstep(0.09, 0.0, abs(length(fract(s) - vec2(0.5, 0.0)) - 0.52));
    albedo += vec3(0.13, 0.11, 0.09) * scallop * (1.0 - hood) * (1.0 - tailDark) * (1.0 - belly * 0.5);
    // The folded wing: primaries lying back along the body, each with a paler edge.
    vec2 wingAxis = normalize(vec2(-0.22, -0.4));
    vec2 w = b - vec2(0.0, 0.47);
    float wingAlong = dot(w, wingAxis);
    float wingAcross = dot(w, vec2(-wingAxis.y, wingAxis.x));
    float onWing = smoothstep(0.015, 0.0, abs(wingAcross + 0.02) - 0.075 * (1.0 - wingAlong / 0.6)) * smoothstep(0.0, 0.04, wingAlong) * smoothstep(0.48, 0.4, wingAlong) * (1.0 - fluff);
    float primaries = smoothstep(0.08, 0.0, abs(fract(wingAcross * 15.0 + wingAlong * 2.0) - 0.5) - 0.42);
    albedo = mix(albedo, vec3(0.15, 0.12, 0.095) + vec3(0.06, 0.05, 0.04) * primaries, onWing * 0.8);
    // Tail feathers, separated by fine lines, with a pale tip.
    vec2 tailBase = vec2(-0.1, 0.22);
    vec2 tailDir = normalize(rot(vec2(-0.25, -0.72), uTail));
    float tailAlong = dot(b - tailBase, tailDir) / 0.76;
    float tailAcross = dot(b - tailBase, vec2(-tailDir.y, tailDir.x));
    float tailLines = smoothstep(0.004, 0.0, abs(fract(tailAcross * 22.0) - 0.5) - 0.47);
    albedo = mix(albedo, vec3(0.09, 0.075, 0.065) * (1.0 - 0.4 * tailLines), tailDark);
    albedo = mix(albedo, vec3(0.3, 0.28, 0.25), smoothstep(0.9, 0.99, tailAlong) * tailDark);
    albedo = mix(albedo, vec3(0.34, 0.3, 0.25), belly);
    albedo = mix(albedo, vec3(0.032, 0.028, 0.028), hood);
    albedo = mix(albedo, vec3(0.7, 0.05, 0.035), vent * 0.92);
    float translucency = mix(0.35, 0.8, hood);
    if (part == 2.0) { albedo = vec3(0.03); translucency = 0.3; }
    if (part == 5.0) albedo = vec3(0.1, 0.09, 0.09);
    if (part == 6.0) { albedo = vec3(0.16, 0.13, 0.1); translucency = 1.0; }
    // Rounded by its interior distance: the sky lights what faces up and out.
    float inside = max(-d, 0.0);
    float depth = clamp(inside / (0.11 * SCALE), 0.0, 1.0);
    vec3 n3 = normalize(vec3(normal * (1.0 - depth * 0.85), 0.35 + depth));
    float skyLight = clamp(dot(n3, normalize(vec3(-0.1, 0.55, 0.83))) * 0.5 + 0.5, 0.0, 1.0);
    vec3 fill = mix(vec3(0.24, 0.26, 0.3), vec3(0.05, 0.06, 0.1), uNight) * mix(1.0, 0.72, uDusk);
    vec3 c = albedo * fill * (0.4 + 0.8 * skyLight);
    vec3 sun = sunColour();
    float strength = mix(1.0, 0.45, uNight);
    float facing = facingLight(normal, p);
    c += sun * exp(-inside / 0.0022) * facing * 1.3 * strength;
    c += sun * vec3(1.0, 0.6, 0.38) * exp(-inside / 0.0042) * translucency * mix(0.3, 0.12, hood) * strength;
    // The eye catches a point of light while it is open.
    c += vec3(0.95, 0.9, 0.8) * uEye * smoothstep(0.014, 0.005, eye) * mix(0.45, 0.1, uNight);
    return c;
}

void main() {
    vec2 p = vec2((gl_FragCoord.x - 0.5 * uRes.x) / uRes.y, gl_FragCoord.y / uRes.y);
    float px = 1.0 / uRes.y;
    vec3 c = skyAt(p);
    vec3 sun = sunColour();

    // Leaves behind the branch, the branch, then the leaves in front, darker where they overlap.
    float layered = 0.0;
    for (int pass = 0; pass < 2; pass++) {
        if (pass == 1) {
            vec4 branch = branchAt(p, px);
            c = mix(c, branch.rgb, branch.a);
            layered = max(layered, branch.a);
        }
        for (int i = 0; i < ${leaves}; i++) {
            if (i >= uLeafCount) break;
            vec4 shape = uLeafShape[i];
            if ((shape.z > 0.5) != (pass == 1)) continue;
            vec4 leaf = leafAt(p, uLeaves[i], shape, px, layered);
            c = mix(c, leaf.rgb, leaf.a);
            layered = max(layered, leaf.a);
        }
    }

    // The bird, with its normal from the distance field and a glowing fringe of feather tips.
    vec2 bc = uBird + vec2(0.0, 0.5 * SCALE);
    if (length(p - bc) < 1.3 * SCALE) {
        vec2 b = toBird(p);
        float part;
        float eye;
        float feathered;
        float d = bird(b, part, eye, feathered) * SCALE;
        float e = px;
        vec2 normal = normalize(vec2(birdShape(p + vec2(e, 0.0)) - birdShape(p - vec2(e, 0.0)), birdShape(p + vec2(0.0, e)) - birdShape(p - vec2(0.0, e))) + 0.00001);
        float facing = facingLight(normal, p);
        float strength = mix(1.0, 0.4, uNight);
        if (d < px * 2.0) {
            vec3 surface = plumage(p, b, d, normal, part, eye);
            float soft = part == 2.0 || part == 5.0 ? 1.0 : 1.6;
            c = mix(c, surface, clamp(0.5 - d / (px * soft), 0.0, 1.0));
        }
        // Feather tips just outside the outline catch the light, as fine radial streaks.
        float out_ = feathered * SCALE;
        if (out_ > -px && out_ < 0.012 * SCALE * 2.5) {
            float angle = atan(b.y - 0.45, b.x * 1.3);
            float barbs = smoothstep(0.35, 0.85, noise(vec2(angle * 70.0, out_ / SCALE * 6.0)) * 0.7 + noise(vec2(angle * 190.0, 1.0)) * 0.3);
            float reach = exp(-max(out_, 0.0) / (0.012 * SCALE));
            c += sun * barbs * reach * pow(facing, 1.5) * 0.55 * strength * (1.0 - uFly * 0.5);
        }
    }

    // Two leaves close to the lens, far out of focus, give the frame depth.
    for (int i = 0; i < 2; i++) {
        vec2 at = i == 0 ? vec2(-0.5 * uRes.x / uRes.y + 0.05, 0.0) : vec2(0.5 * uRes.x / uRes.y - 0.02, 0.99);
        float angle = (i == 0 ? 0.75 : -2.3) + sin(uTime * 0.9 + float(i) * 2.0) * 0.05 * (0.4 + uGust) * uMotion;
        vec2 d = rot(p - at, -angle);
        float len = i == 0 ? 0.44 : 0.34;
        float u = clamp(d.x / len, 0.0, 1.0);
        float width = len * 0.2 * pow(max(sin(PI * u), 0.0), 0.7);
        float dist = max(abs(d.y) - width, max(-d.x, d.x - len));
        float cover = smoothstep(0.04, -0.04, dist);
        vec3 near = mix(vec3(0.04, 0.07, 0.03), vec3(0.3, 0.42, 0.1) * sun, (1.0 - uNight) * 0.5);
        c = mix(c, near * mix(1.0, 0.3, uNight), cover * 0.93);
    }

    // Fireflies on a dark night.
    float flies = smoothstep(0.6, 0.92, uNight) * uMotion;
    if (flies > 0.001) {
        for (int i = 0; i < 9; i++) {
            float seed = float(i);
            vec2 home = vec2(mix(-0.8, 0.9, hash(vec2(seed, 1.3))), mix(0.18, 0.6, hash(vec2(seed, 7.1))));
            vec2 wander = vec2(noise(vec2(uTime * 0.15, seed * 3.1)), noise(vec2(seed * 5.3, uTime * 0.12))) - 0.5;
            vec2 at = p - home - wander * vec2(0.18, 0.1);
            float blink = pow(max(0.0, sin(uTime * (0.8 + hash(vec2(seed, 9.9))) * 1.4 + seed * 4.0)), 6.0);
            float dd = dot(at, at);
            c += vec3(0.78, 1.0, 0.42) * (exp(-dd / 0.000012) * 1.2 + exp(-dd / 0.0002) * 0.15) * blink * flies;
        }
    }

    // Light in the air: god rays fanning from the sun, and haze wrapping a little light over everything near it.
    vec2 fromSun = p - uSun;
    float rays = smoothstep(0.45, 1.0, noise(vec2(atan(fromSun.y, fromSun.x) * 9.0, uTime * 0.05))) * exp(-length(fromSun) * 1.4);
    c += sun * rays * 0.1 * (1.0 - uNight);
    c += sun * exp(-length(fromSun * vec2(1.0, 1.12)) * 3.0) * 0.12 * (1.0 - uNight);

    // A filmic finish: a soft shoulder on the highlights, warm highlights and cool shadows.
    c = max(c, 0.0);
    c = (c * (2.51 * c + 0.03)) / (c * (2.43 * c + 0.59) + 0.14) * 1.08;
    float lum = dot(c, vec3(0.299, 0.587, 0.114));
    c = mix(c * vec3(0.95, 0.98, 1.04), c * vec3(1.04, 1.0, 0.94), smoothstep(0.2, 0.75, lum));
    c *= uDim;
    vec2 uv = gl_FragCoord.xy / uRes - 0.5;
    c *= 1.0 - dot(uv, uv) * 0.32;
    c += (hash(gl_FragCoord.xy + fract(uTime * 7.0) * 61.0) - 0.5) * 0.014;
    outColor = vec4(c, 1.0);
}
`;
}
