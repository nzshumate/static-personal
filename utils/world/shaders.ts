export const planetVertex = `
varying vec3 vNormalW;
varying vec3 vWorldPos;
void main() {
  vNormalW = normalize(mat3(modelMatrix) * normal);
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorldPos = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`

export const planetFragment = `
uniform vec3 uDeep;
uniform vec3 uMid;
uniform vec3 uHigh;
uniform vec3 uLightDir;
uniform float uTime;
uniform float uSeed;
uniform float uBands;
uniform float uClouds;
varying vec3 vNormalW;
varying vec3 vWorldPos;

float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float noise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
    mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y),
    f.z
  );
}

float fbm(vec3 p) {
  float value = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 5; i++) {
    value += amp * noise(p);
    p = p * 2.03 + vec3(1.7, 9.2, 4.1);
    amp *= 0.5;
  }
  return value;
}

void main() {
  vec3 n = normalize(vNormalW);
  vec3 view = normalize(cameraPosition - vWorldPos);
  float light = max(dot(n, normalize(uLightDir)), 0.0);
  float rim = pow(1.0 - max(dot(n, view), 0.0), 3.4);
  float lat = asin(clamp(n.y, -1.0, 1.0));
  vec3 p = n * (3.2 + uSeed) + vec3(uTime * 0.012, 0.0, uTime * 0.007);
  float terrain = fbm(p * 1.45);
  float fine = fbm(p * 5.4);
  float bands = 0.5 + 0.5 * sin(lat * uBands + fbm(p * 2.1) * 4.2);
  float land = smoothstep(0.46, 0.68, terrain + fine * 0.16);
  vec3 surface = mix(uDeep, uMid, land);
  surface = mix(surface, uHigh, pow(bands, 4.0) * 0.34 + smoothstep(0.78, 0.94, fine) * 0.18);
  float cloud = smoothstep(0.62, 0.84, fbm(p * 2.8 + 12.0)) * uClouds;
  surface = mix(surface, vec3(0.86, 0.9, 0.94), cloud * 0.55);
  surface *= 0.1 + light * 0.9;
  surface += uHigh * pow(rim, 2.0) * 0.22;
  gl_FragColor = vec4(surface, 1.0);
}
`

export const atmosphereVertex = `
varying vec3 vNormalW;
varying vec3 vWorldPos;
void main() {
  vNormalW = normalize(mat3(modelMatrix) * normal);
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorldPos = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`

export const atmosphereFragment = `
uniform vec3 uColor;
uniform vec3 uLightDir;
varying vec3 vNormalW;
varying vec3 vWorldPos;
void main() {
  vec3 n = normalize(vNormalW);
  vec3 view = normalize(cameraPosition - vWorldPos);
  float rim = pow(1.0 - max(dot(n, view), 0.0), 3.6);
  float day = 0.22 + 0.78 * max(dot(n, normalize(uLightDir)), 0.0);
  float alpha = rim * day * 0.82;
  gl_FragColor = vec4(uColor * alpha, alpha);
}
`

export const sunVertex = `
varying vec3 vNormal;
varying vec3 vView;
void main() {
  vNormal = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vView = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}
`

export const sunFragment = `
uniform float uTime;
varying vec3 vNormal;
varying vec3 vView;
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
void main() {
  float limb = pow(max(dot(normalize(vNormal), normalize(vView)), 0.0), 0.42);
  vec3 core = vec3(1.0, 0.93, 0.62);
  vec3 edge = vec3(1.0, 0.38, 0.08);
  vec3 color = mix(edge, core, limb);
  float gran = hash(floor(vNormal.xy * 48.0 + uTime * 0.15));
  color += (gran - 0.5) * 0.08 * limb;
  gl_FragColor = vec4(color, 1.0);
}
`

export const skyboxVertex = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

export const skyboxFragment = `
uniform sampler2D uMap;
uniform float uOpacity;
uniform float uExposure;
uniform float uContrast;
uniform vec3 uTint;
varying vec2 vUv;
void main() {
  vec3 color = texture2D(uMap, vUv).rgb;
  color *= uExposure;
  color = (color - 0.5) * uContrast + 0.5;
  color *= uTint;
  gl_FragColor = vec4(color, uOpacity);
}
`

export const plateVertex = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

export const plateFragment = `
uniform sampler2D uMap;
uniform float uOpacity;
uniform float uExposure;
uniform vec3 uTint;
varying vec2 vUv;
void main() {
  vec3 color = texture2D(uMap, vUv).rgb * uExposure * uTint;
  gl_FragColor = vec4(color, uOpacity);
}
`

export const oceanVertex = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

export const oceanFragment = `
uniform float uTime;
uniform float uDepth;
uniform float uOpacity;
uniform vec2 uResolution;
uniform vec2 uPointer;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  float depth = clamp(uDepth, 0.0, 1.0);
  vec3 shallow = vec3(0.03, 0.34, 0.42);
  vec3 mid = vec3(0.012, 0.11, 0.2);
  vec3 abyss = vec3(0.002, 0.016, 0.04);
  float falloff = smoothstep(0.08, 0.92, 1.0 - uv.y + depth * 0.55);
  vec3 color = mix(shallow, mid, smoothstep(0.05, 0.55, falloff));
  color = mix(color, abyss, smoothstep(0.45, 1.0, falloff + depth * 0.35));

  vec2 cUv = uv * vec2(uResolution.x / uResolution.y, 1.0);
  float caustic = 0.0;
  caustic += pow(max(sin((cUv.x + uTime * 0.07) * 18.0 + noise(cUv * 4.0 + uTime * 0.04) * 3.0), 0.0), 10.0);
  caustic += pow(max(sin((cUv.y - uTime * 0.05) * 14.0 + noise(cUv * 3.2 - uTime * 0.03) * 2.4), 0.0), 12.0);
  float nearSurface = (1.0 - depth) * smoothstep(0.55, 1.0, uv.y);
  color += vec3(0.1, 0.4, 0.44) * caustic * 0.28 * nearSurface;

  float ray = pow(max(1.0 - abs(uv.x - (0.58 + uPointer.x * 0.05)), 0.0), 5.2) * smoothstep(0.15, 0.95, uv.y);
  float ray2 = pow(max(1.0 - abs(uv.x - (0.36 + uPointer.x * 0.03)), 0.0), 7.0) * smoothstep(0.3, 1.0, uv.y);
  color += vec3(0.16, 0.46, 0.5) * (ray * 0.2 + ray2 * 0.1) * (1.0 - depth);

  float grain = (hash(uv * uResolution * 0.25 + uTime * 8.0) - 0.5) * 0.02;
  color += grain;

  float vignette = smoothstep(1.15, 0.35, length((uv - 0.5) * vec2(1.15, 1.0)));
  color *= 0.55 + vignette * 0.45;

  gl_FragColor = vec4(color, uOpacity);
}
`

export const pointVertex = `
uniform float uPixelRatio;
uniform float uSize;
attribute float aSize;
varying float vShade;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * uSize * uPixelRatio * (11.0 / max(2.2, -mv.z));
  vShade = aSize;
}
`

export const pointFragment = `
uniform vec3 uColor;
uniform float uOpacity;
varying float vShade;
void main() {
  vec2 q = gl_PointCoord - 0.5;
  float d = length(q);
  float core = 1.0 - smoothstep(0.02, 0.12, d);
  float halo = 1.0 - smoothstep(0.08, 0.5, d);
  float alpha = (core * 1.35 + halo * 0.2) * uOpacity;
  if (alpha < 0.01) discard;
  gl_FragColor = vec4(uColor * (0.75 + vShade * 0.12), alpha);
}
`
