import { createFullscreenTriangle, fullscreenVertex, link, uniforms } from "./pond-gl";

/** Simulation texels per CSS pixel: ripples need far fewer texels than pixels. */
export const simScale = 0.36;
/** Simulation steps per second, independent of frame rate. */
const simStepsPerSecond = 120;
/** Drops that can land in one step. */
const maxDrops = 16;

// One step of a damped wave equation on the height field. Velocity follows
// the Laplacian (how much a texel sits below its neighbours), so a dent
// spreads outward as a ring. Edges absorb waves instead of reflecting them.
const simFragment = /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D uState;
uniform vec2 uSize;
uniform int uPushCount;
uniform vec4 uPushes[${maxDrops}];
out vec4 outState;

void main() {
    ivec2 c = ivec2(gl_FragCoord.xy);
    ivec2 last = ivec2(uSize) - 1;
    vec2 here = texelFetch(uState, c, 0).rg;
    float left = texelFetch(uState, clamp(c - ivec2(1, 0), ivec2(0), last), 0).r;
    float right = texelFetch(uState, clamp(c + ivec2(1, 0), ivec2(0), last), 0).r;
    float down = texelFetch(uState, clamp(c - ivec2(0, 1), ivec2(0), last), 0).r;
    float up = texelFetch(uState, clamp(c + ivec2(0, 1), ivec2(0), last), 0).r;

    float height = here.r;
    float velocity = here.g;
    float laplacian = left + right + down + up - 4.0 * height;
    velocity = (velocity + laplacian * 0.16) * 0.991;
    // A slow pull back to level, so pushes never pile up into a standing dent.
    height = (height + velocity) * 0.996;

    vec2 p = gl_FragCoord.xy;
    for (int i = 0; i < ${maxDrops}; i++) {
        if (i >= uPushCount) break;
        float r = length(p - uPushes[i].xy) / uPushes[i].z;
        if (r < 1.0) height += uPushes[i].w * (0.5 + 0.5 * cos(3.14159265 * r));
    }

    float edge = min(min(p.x, uSize.x - p.x), min(p.y, uSize.y - p.y));
    float absorb = mix(0.88, 1.0, smoothstep(0.0, 7.0, edge));
    outState = vec4(clamp(height * absorb, -3.0, 3.0), velocity * absorb, 0.0, 1.0);
}
`;

/**
 * GLSL that reads the ripple height at a point in CSS pixels. Needs
 * `uState`, `uSimSize` and `uCss` uniforms in the shader that includes it.
 */
export const glslRippleHeight = /* glsl */ `
float heightAt(vec2 css) {
    vec2 uv = vec2(css.x, uCss.y - css.y) * ${simScale.toFixed(3)} / uSimSize;
    return texture(uState, uv).r;
}
`;

export type Ripples = Readonly<{
    resize(cssWidth: number, cssHeight: number): void;
    /** A ripple at a point in CSS pixels; negative strength dents the surface. */
    drop(x: number, y: number, strength: number, radius?: number): void;
    /** Advances the surface by dt seconds. Leaves a framebuffer bound: rebind before drawing. */
    step(dt: number): void;
    /** The current height field (red) for sampling, or null before the first resize. */
    texture(): WebGLTexture | null;
    width(): number;
    height(): number;
    destroy(): void;
}>;

/**
 * The ripple simulation: two half-float textures stepped as a damped wave
 * equation. Without float render targets the surface stays flat and still
 * samples as zero. Returns null if the shader fails to build.
 */
export function createRipples(gl: WebGL2RenderingContext): Ripples | null {
    const canSimulate = gl.getExtension("EXT_color_buffer_float") !== null;
    const program = link(gl, fullscreenVertex, simFragment);
    if (!program) return null;
    const u = uniforms(gl, program, ["uState", "uSize", "uPushCount", "uPushes"]);
    const screen = createFullscreenTriangle(gl, [program]);

    type Target = { texture: WebGLTexture; framebuffer: WebGLFramebuffer | null };
    let targets: Target[] = [];
    let current = 0;
    let simWidth = 1;
    let simHeight = 1;
    let cssHeight = 1;
    let stepDebt = 0;
    const pending: Array<[number, number, number, number]> = [];

    function makeTarget(): Target {
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, simWidth, simHeight, 0, gl.RGBA, gl.HALF_FLOAT, null);
        let framebuffer: WebGLFramebuffer | null = null;
        if (canSimulate) {
            framebuffer = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
            gl.clearColor(0, 0, 0, 1);
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        }
        return { texture, framebuffer };
    }

    function disposeTargets() {
        for (const target of targets) {
            gl.deleteTexture(target.texture);
            if (target.framebuffer) gl.deleteFramebuffer(target.framebuffer);
        }
        targets = [];
    }

    return {
        resize(width, height) {
            cssHeight = height;
            disposeTargets();
            simWidth = Math.max(8, Math.round(width * simScale));
            simHeight = Math.max(8, Math.round(height * simScale));
            targets = [makeTarget(), makeTarget()];
            current = 0;
        },
        drop(x, y, strength, radius = 4) {
            if (pending.length < maxDrops) pending.push([x * simScale, (cssHeight - y) * simScale, radius, strength]);
        },
        step(dt) {
            if (!canSimulate || targets.length < 2) return;
            stepDebt = Math.min(stepDebt + dt * simStepsPerSecond, 4);
            const steps = Math.floor(stepDebt);
            if (steps <= 0) return;
            stepDebt -= steps;

            gl.useProgram(program);
            gl.bindVertexArray(screen.vao);
            gl.viewport(0, 0, simWidth, simHeight);
            gl.uniform2f(u.uSize, simWidth, simHeight);
            gl.uniform1i(u.uState, 0);
            gl.activeTexture(gl.TEXTURE0);
            for (let i = 0; i < steps; i++) {
                // Drops land on the first step only; later steps let them spread.
                const drops = i === 0 ? pending.splice(0, maxDrops) : [];
                gl.uniform1i(u.uPushCount, drops.length);
                if (drops.length > 0) gl.uniform4fv(u.uPushes, new Float32Array(drops.flat()));
                const next = 1 - current;
                gl.bindFramebuffer(gl.FRAMEBUFFER, targets[next].framebuffer);
                gl.bindTexture(gl.TEXTURE_2D, targets[current].texture);
                gl.drawArrays(gl.TRIANGLES, 0, 3);
                current = next;
            }
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        },
        texture: () => targets[current]?.texture ?? null,
        width: () => simWidth,
        height: () => simHeight,
        destroy() {
            disposeTargets();
            screen.destroy();
            gl.deleteProgram(program);
        },
    };
}
