export type WaterTheme = Readonly<{
    deep: readonly [number, number, number];
    shallow: readonly [number, number, number];
    light: readonly [number, number, number];
    lightStrength: number;
}>;

export const waterThemes: Record<"light" | "dark", WaterTheme> = {
    light: {
        deep: [0.4, 0.56, 0.55],
        shallow: [0.62, 0.75, 0.73],
        light: [0.97, 1, 0.98],
        lightStrength: 0.42,
    },
    dark: {
        deep: [0.05, 0.12, 0.13],
        shallow: [0.11, 0.23, 0.24],
        light: [0.58, 0.84, 0.82],
        lightStrength: 0.3,
    },
};

const vertexSource = `
attribute vec2 aPosition;
void main() {
    gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

// Caustics without textures: the edges between drifting cells (the gap
// between the nearest and second-nearest cell point) form a mesh of soft
// bright lines; a noise warp bends them and a slow noise field gathers the
// light into patches, like sun through a moving surface.
const fragmentSource = `
precision mediump float;
uniform vec2 uResolution;
uniform float uPixelRatio;
uniform float uTime;
uniform vec3 uDeep;
uniform vec3 uShallow;
uniform vec3 uLight;
uniform float uLightStrength;

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

float caustic(vec2 p, float t) {
    vec2 warp = vec2(noise(p * 0.6 + t * 0.1), noise(p * 0.6 - t * 0.08 + 4.0)) * 1.15;
    float edge = cellEdge(p + warp, t);
    // Wide, soft lines that thin toward their middles, not a crisp grid.
    return pow(1.0 - smoothstep(0.0, 0.24, edge), 2.2);
}

void main() {
    vec2 uv = gl_FragCoord.xy / uResolution;
    vec2 p = gl_FragCoord.xy / (78.0 * uPixelRatio);
    float depth = smoothstep(0.0, 1.0, 0.5 + 0.5 * noise(p * 0.3 + uTime * 0.015));
    vec3 color = mix(uDeep, uShallow, depth);

    // Light gathers in drifting patches instead of covering the floor evenly.
    float patch = smoothstep(0.2, 0.85, noise(p * 0.22 + vec2(uTime * 0.025, -uTime * 0.018)));
    float light = caustic(p, uTime) * (0.35 + 0.65 * patch);
    light += caustic(p * 1.85 + 4.1, uTime * 1.1) * 0.22 * patch;
    color = mix(color, uLight, clamp(light * uLightStrength, 0.0, 1.0));

    // A faint sandy floor and darker, deeper edges.
    float sand = noise(gl_FragCoord.xy / (2.2 * uPixelRatio)) - 0.5;
    color += sand * 0.025;
    vec2 fromEdge = min(uv, 1.0 - uv);
    float rim = smoothstep(0.0, 0.32, min(fromEdge.x * 1.4, fromEdge.y * 2.2));
    color *= mix(0.78, 1.0, rim);

    float grain = (hash(gl_FragCoord.xy + fract(uTime) * 61.0) - 0.5) * 0.03;
    gl_FragColor = vec4(color + grain, 1.0);
}
`;

function compile(gl: WebGLRenderingContext, type: number, source: string) {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

export type Water = Readonly<{
    render(time: number, theme: WaterTheme): void;
    resize(width: number, height: number, pixelRatio: number): void;
    destroy(): void;
}>;

/** Returns null when WebGL is unavailable; the pond then keeps its CSS water. */
export function createWater(canvas: HTMLCanvasElement): Water | null {
    const gl = canvas.getContext("webgl", {
        alpha: false,
        antialias: false,
        premultipliedAlpha: false,
        powerPreference: "low-power",
    });
    if (!gl) return null;

    const vertex = compile(gl, gl.VERTEX_SHADER, vertexSource);
    const fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
    const program = gl.createProgram();
    if (!vertex || !fragment || !program) return null;
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
    gl.useProgram(program);

    // One triangle that covers the viewport.
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "aPosition");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const uniform = (name: string) => gl.getUniformLocation(program, name);
    const uResolution = uniform("uResolution");
    const uPixelRatio = uniform("uPixelRatio");
    const uTime = uniform("uTime");
    const uDeep = uniform("uDeep");
    const uShallow = uniform("uShallow");
    const uLight = uniform("uLight");
    const uLightStrength = uniform("uLightStrength");

    return {
        render(time, theme) {
            gl.uniform1f(uTime, time);
            gl.uniform3fv(uDeep, theme.deep);
            gl.uniform3fv(uShallow, theme.shallow);
            gl.uniform3fv(uLight, theme.light);
            gl.uniform1f(uLightStrength, theme.lightStrength);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
        },
        resize(width, height, pixelRatio) {
            gl.viewport(0, 0, width, height);
            gl.uniform2f(uResolution, width, height);
            gl.uniform1f(uPixelRatio, pixelRatio);
        },
        destroy() {
            gl.deleteProgram(program);
            gl.deleteShader(vertex);
            gl.deleteShader(fragment);
            gl.deleteBuffer(buffer);
        },
    };
}
