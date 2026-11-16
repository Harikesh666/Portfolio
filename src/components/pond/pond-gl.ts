/** Small WebGL2 helpers shared by the pond and the footer garden. */

/** Hashing, value noise and fractal noise, for any fragment shader that needs texture. */
export const glslNoise = /* glsl */ `
float hash(vec2 p) {
    p = fract(p * vec2(127.1, 311.7));
    p += dot(p, p + 34.53);
    return fract(p.x * p.y);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
        mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
        mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
        u.y
    );
}

float fbm(vec2 p) {
    float sum = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 4; i++) {
        sum += amp * noise(p);
        p *= 2.03;
        amp *= 0.5;
    }
    return sum;
}
`;

/** Vertex shader for a single triangle that covers the whole viewport. */
export const fullscreenVertex = /* glsl */ `#version 300 es
in vec2 aPosition;
void main() {
    gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        if (import.meta.env.DEV) console.warn("pond shader:", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

export function link(gl: WebGL2RenderingContext, vertexSource: string, fragmentSource: string) {
    const vertex = compile(gl, gl.VERTEX_SHADER, vertexSource);
    const fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
    const program = gl.createProgram();
    if (!vertex || !fragment || !program) return null;
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        if (import.meta.env.DEV) console.warn("pond program:", gl.getProgramInfoLog(program));
        return null;
    }
    return program;
}

export function uniforms(gl: WebGL2RenderingContext, program: WebGLProgram, names: readonly string[]) {
    return Object.fromEntries(names.map((name) => [name, gl.getUniformLocation(program, name)]));
}

/**
 * A vertex array holding one viewport-covering triangle, wired to the
 * `aPosition` attribute of each given program. Draw it with drawArrays(TRIANGLES, 0, 3).
 */
export function createFullscreenTriangle(gl: WebGL2RenderingContext, programs: readonly WebGLProgram[]) {
    const vao = gl.createVertexArray();
    const buffer = gl.createBuffer();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    for (const program of programs) {
        const location = gl.getAttribLocation(program, "aPosition");
        if (location >= 0) {
            gl.enableVertexAttribArray(location);
            gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
        }
    }
    gl.bindVertexArray(null);
    return {
        vao,
        destroy() {
            gl.deleteBuffer(buffer);
            gl.deleteVertexArray(vao);
        },
    };
}
