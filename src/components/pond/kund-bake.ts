import { createFullscreenTriangle, fullscreenVertex, link, uniforms } from "./pond-gl";

/**
 * The 3D model under Harikesh's photo of Makari Kund.
 *
 * The tank is modelled as a signed-distance scene, matched to the photo:
 * the water one unit below the eye, stepped banks on three sides rising to
 * the walls, a gap in the far wall for the temple stair, the pier, the
 * kiosk and the pillar. Beyond the wall the town and the trees stand on a
 * plane. From the photo's own camera, this bakes, once, what the live
 * scene needs to treat the photo as a place rather than a picture:
 *
 * - every pixel's depth and surface normal, and what it is (sky, town,
 *   stone or water),
 * - for every water pixel, where its reflection lands in the photo, so the
 *   water mirrors the real walls and temple and can bend them as it moves,
 * - the sun's shadows for the hour, so evening light rakes the real steps.
 *
 * Coordinates: X across the tank, Y up, z in depth; the eye is at the
 * origin. Frame units run 0 to 1 across (x) and down (y) the 2:1 photo.
 */

/** Eye level and the point the side shores run toward, measured on the photo. */
export const horizon = 0.366;
export const vanishX = 0.48;
/** The water: side shores at these X, and the far shore at this depth. */
export const tank = { left: -2.95, right: 2.64, far: 1 / (0.548 - horizon) };
/** How far the town and its lamps stand, as one plane beyond the wall. */
export const townDepth = 9;
/** The temple's finial in the photo, where its flag flies. */
export const finial = { x: 0.469, y: 0.179 };
/** Bake resolution: the photo's. */
export const bakeSize = { width: 1344, height: 672 };
const strips = 6;

const model = /* glsl */ `
const float HORIZON = ${horizon.toFixed(4)};
const float VANISH = ${vanishX.toFixed(4)};
const float L = ${tank.left.toFixed(3)};
const float R = ${tank.right.toFixed(3)};
const float F = ${tank.far.toFixed(4)};
const float TOWN = ${townDepth.toFixed(1)};
const float STEPS = 12.0;
const float RUN = 1.0 / 12.0;
const float RISE = 0.52 / 12.0;
const float WALL_TOP = 1.07;

float sdBox(vec3 p, vec3 b) {
    vec3 q = abs(p) - b;
    return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

float sdBox2(vec2 p, vec2 b) {
    vec2 q = abs(p) - b;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
}

// A staircase in profile: o runs outward from the first step, h up from its foot.
float stairs(float o, float h, float run, float rise, float count) {
    float k = clamp(floor(o / run), 0.0, count - 1.0);
    float d = 1e9;
    for (int i = -1; i <= 1; i++) {
        float j = clamp(k + float(i), 0.0, count - 1.0);
        vec2 q = vec2(j * run - o, h - (j + 1.0) * rise);
        d = min(d, length(max(q, 0.0)) + min(max(q.x, q.y), 0.0));
    }
    return d;
}

// The tank: banks, walls with the stair gap, the ground beyond, the pier, the kiosk and the pillar.
float tankAt(vec3 p) {
    float h = p.y + 1.0;
    float o = max(max(L - p.x, p.x - R), p.z - F);
    float d = stairs(o, h, RUN, RISE, STEPS);
    float wall = sdBox2(vec2(o - 1.15, h - 0.5), vec2(0.15, 0.57));
    wall = max(wall, -sdBox(p - vec3(-0.56, 0.2, F + 1.15), vec3(0.39, 1.2, 0.3)));
    d = min(d, wall);
    d = min(d, max(stairs(p.z - (F + 1.0), h - 0.52, 0.0375, 0.069, 8.0), abs(p.x + 0.56) - 0.39));
    d = min(d, sdBox2(vec2(o - 3.8, h - 0.5), vec2(2.5, 0.5)));
    d = min(d, sdBox(p - vec3(-1.305, -0.2, F + 0.96), vec3(0.355, 0.3, 0.14)));
    d = min(d, sdBox(p - vec3(3.65, -0.28, 3.9), vec3(0.75, 0.38, 0.5)));
    d = min(d, sdBox(p - vec3(0.0, -0.8, 3.18), vec3(0.018, 0.38, 0.018)));
    return d;
}

vec3 tankNormal(vec3 p) {
    vec2 e = vec2(1.0, -1.0) * 0.0008;
    return normalize(e.xyy * tankAt(p + e.xyy) + e.yyx * tankAt(p + e.yyx) + e.yxy * tankAt(p + e.yxy) + e.xxx * tankAt(p + e.xxx));
}

// Marches toward the tank; returns the distance, or a negative number on a miss.
float marchTank(vec3 ro, vec3 rd, float far) {
    float t = 0.01;
    for (int i = 0; i < 140; i++) {
        float d = tankAt(ro + rd * t);
        if (d < 0.0004 * max(t, 1.0)) return t;
        t += d;
        if (t > far) break;
    }
    return -1.0;
}

vec2 toFrame(vec3 p) {
    return vec2(VANISH + p.x / (2.0 * p.z), HORIZON - p.y / p.z);
}

// 0 to 1 split into two bytes, so a value keeps 16 bits in an RGBA8 texture.
vec2 pack16(float v) {
    float n = floor(clamp(v, 0.0, 1.0) * 65535.0 + 0.5);
    return vec2(floor(n / 256.0), mod(n, 256.0)) / 255.0;
}
`;

const bakeFragment = /* glsl */ `#version 300 es
precision highp float;
uniform vec2 uSize;
uniform sampler2D uMask;
uniform vec3 uSun;
uniform int uShadows;
layout(location = 0) out vec4 outSurface;
layout(location = 1) out vec4 outDepth;
layout(location = 2) out vec4 outMirror;
${model}

// What a ray from the eye meets first: the tank, the water, or the town and trees beyond the wall.
void surfaceAt(vec2 frame, out vec3 p, out vec3 n, out float kind) {
    vec3 rd = vec3((frame.x - VANISH) * 2.0, HORIZON - frame.y, 1.0);
    vec3 dir = normalize(rd);
    // rd has z = 1, so its multiples are depths.
    float toWater = rd.y < 0.0 ? -1.0 / rd.y : 1e9;
    float wallZone = F + 1.35;
    float t = marchTank(vec3(0.0), dir, min(toWater, wallZone) / dir.z);
    if (texture(uMask, frame).r > 0.5) {
        p = rd * 40.0;
        n = -dir;
        kind = 0.0;
    } else if (t > 0.0) {
        p = dir * t;
        n = tankNormal(p);
        kind = 2.0;
    } else if (toWater < wallZone) {
        p = rd * toWater;
        n = vec3(0.0, 1.0, 0.0);
        kind = 3.0;
    } else {
        p = rd * TOWN;
        n = vec3(0.0, 0.0, -1.0);
        kind = 1.0;
    }
}

void main() {
    vec2 frame = gl_FragCoord.xy / uSize;
    vec3 p;
    vec3 n;
    float kind;
    surfaceAt(frame, p, n, kind);
    if (uShadows == 1) {
        // How much sun reaches this surface past the walls and steps.
        float lit = 1.0;
        if (kind >= 2.0) {
            float t = 0.02;
            for (int i = 0; i < 48; i++) {
                float d = tankAt(p + n * 0.004 + uSun * t);
                lit = min(lit, 12.0 * d / t);
                t += clamp(d, 0.01, 0.4);
                if (lit < 0.01 || t > 12.0) break;
            }
        }
        outSurface = vec4(clamp(lit, 0.0, 1.0), 0.0, 0.0, 1.0);
        outDepth = vec4(0.0);
        outMirror = vec4(0.0);
        return;
    }
    outSurface = vec4(n * 0.5 + 0.5, kind / 3.0);
    outDepth = vec4(pack16(p.z / 64.0), 0.0, 1.0);
    vec2 mirror = frame;
    if (kind == 3.0) {
        // The reflected ray: where it lands, seen from the eye, is what the water shows.
        vec3 rd = normalize(p);
        vec3 r = vec3(rd.x, -rd.y, rd.z);
        float hit = marchTank(p, r, (F + 1.35 - p.z) / max(r.z, 0.05));
        vec3 q = hit > 0.0 ? p + r * hit : p + r * max((TOWN - p.z) / max(r.z, 0.05), 0.0);
        mirror = toFrame(q);
    }
    outMirror = vec4(pack16(mirror.x), pack16(clamp(mirror.y, 0.001, 0.999)));
}
`;

/** Where the sun stands at an hour of the light curve: from the left, low in the evening. */
export function sunAt(hour: number): [number, number, number] {
    const day = Math.min(1, Math.max(0, (hour - 6) / 13));
    const azimuth = 1.05 - (day - 0.5) * 1.4;
    const elevation = Math.max(0.1, Math.sin(Math.PI * day) * 0.85);
    const length = Math.hypot(Math.sin(azimuth), Math.tan(elevation), Math.cos(azimuth));
    return [-Math.sin(azimuth) / length, Math.tan(elevation) / length, -Math.cos(azimuth) / length];
}

export type KundBake = Readonly<{
    /** Normal (RGB) and kind (A: sky 0, town 1/3, stone 2/3, water 1). */
    surface: WebGLTexture;
    /** Depth, 16 bits in RG. */
    depth: WebGLTexture;
    /** Where each water pixel's reflection lands in the photo, 16 bits per axis. */
    mirror: WebGLTexture;
    /** Sunlight past the walls, for the hour last baked. */
    shadow: WebGLTexture;
    /** Re-bakes the shadows for a new sun. */
    shadows: (sun: readonly [number, number, number]) => Promise<void>;
    destroy: () => void;
}>;

const nextFrame = () => new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));

/**
 * Bakes the model's view of the photo on this GL context, a strip per
 * frame so the page never stalls. The mask texture tells it where the sky is.
 */
export async function bakeKund(gl: WebGL2RenderingContext, maskTexture: WebGLTexture, sun: readonly [number, number, number]): Promise<KundBake | null> {
    const program = link(gl, fullscreenVertex, bakeFragment);
    if (!program) return null;
    const { width, height } = bakeSize;
    const make = (smooth: boolean) => {
        const handle = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, handle);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        const filter = smooth ? gl.LINEAR : gl.NEAREST;
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        return handle;
    };
    // Packed values must never be blended between texels, so those textures are read nearest.
    const surface = make(true);
    const depth = make(false);
    const mirror = make(false);
    const shadow = make(true);
    const spare = [make(false), make(false)];
    const target = (attachments: readonly WebGLTexture[]) => {
        const framebuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        attachments.forEach((texture, index) => gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + index, gl.TEXTURE_2D, texture, 0));
        gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1, gl.COLOR_ATTACHMENT2]);
        return framebuffer;
    };
    const views = target([surface, depth, mirror]);
    const shade = target([shadow, spare[0], spare[1]]);
    const triangle = createFullscreenTriangle(gl, [program]);
    const u = uniforms(gl, program, ["uSize", "uMask", "uSun", "uShadows"]);
    const textures = [surface, depth, mirror, shadow, ...spare];
    const destroy = () => {
        gl.deleteFramebuffer(views);
        gl.deleteFramebuffer(shade);
        triangle.destroy();
        gl.deleteProgram(program);
        textures.forEach((texture) => gl.deleteTexture(texture));
    };

    async function draw(framebuffer: WebGLFramebuffer | null, shadows: boolean, light: readonly [number, number, number]) {
        for (let strip = 0; strip < strips; strip++) {
            const y0 = Math.floor((strip * height) / strips);
            const y1 = Math.floor(((strip + 1) * height) / strips);
            gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
            gl.viewport(0, 0, width, height);
            gl.enable(gl.SCISSOR_TEST);
            gl.scissor(0, y0, width, y1 - y0);
            gl.useProgram(program);
            gl.bindVertexArray(triangle.vao);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, maskTexture);
            gl.uniform1i(u.uMask, 0);
            gl.uniform2f(u.uSize, width, height);
            gl.uniform3f(u.uSun, light[0], light[1], light[2]);
            gl.uniform1i(u.uShadows, shadows ? 1 : 0);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
            gl.disable(gl.SCISSOR_TEST);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            await nextFrame();
        }
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, views);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        destroy();
        return null;
    }
    await draw(views, false, sun);
    await draw(shade, true, sun);
    return {
        surface,
        depth,
        mirror,
        shadow,
        shadows: (light) => draw(shade, true, light),
        destroy,
    };
}
