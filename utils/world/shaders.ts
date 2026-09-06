export const planetVertex = `
varying vec3 vNormalW;
varying vec3 vWorldPos;
varying vec3 vPlanetPos;
void main() {
  vPlanetPos = normalize(position);
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
varying vec3 vPlanetPos;

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
  vec3 local = normalize(vPlanetPos);
  float lat = asin(clamp(local.y, -1.0, 1.0));
  vec3 p = local * (2.0 + uSeed * 0.35);
  float terrain = fbm(p * 1.2);
  float fine = fbm(p * 8.4);
  float elevation = terrain + fine * 0.055;
  float land = smoothstep(0.505, 0.519, elevation);
  float shore = smoothstep(0.48, 0.508, elevation) * (1.0-land);
  vec3 surface = mix(uDeep, vec3(0.035,0.24,0.3), shore * 0.58);
  vec3 continent = mix(uMid * 0.65, uMid * 1.22, fine);
  float arid = smoothstep(0.42,0.65,fbm(p*2.8+4.0)) * (1.0-smoothstep(0.5,1.1,abs(lat)));
  continent = mix(continent, vec3(0.42,0.32,0.19), arid*0.65);
  float mountains = smoothstep(0.61,0.7,elevation) * smoothstep(0.4,0.7,fine);
  continent = mix(continent,vec3(0.65,0.66,0.62),mountains);
  surface = mix(surface, continent, land);
  float polar = smoothstep(1.12,1.4,abs(lat)+fbm(p*6.0)*0.17);
  surface = mix(surface, vec3(0.78,0.86,0.89), polar);
  vec3 cloudP = p*3.8 + vec3(uTime*0.007,12.0,uTime*0.002);
  float cloud = smoothstep(0.52,0.69,fbm(cloudP + vec3(sin(lat*7.0)*0.2,0,0))) * uClouds;
  surface *= 1.0-cloud*0.16;
  surface = mix(surface, vec3(0.86,0.9,0.94), cloud * 0.88);
  if(uClouds < 0.2) {
    float flow = fbm(p*3.0 + vec3(uTime*.001,0,0));
    float bands = 0.5 + 0.5*sin(lat*uBands*3.2 + flow*4.4 + sin(lat*27.0+flow*5.0)*.3);
    float filaments = 0.5 + 0.5*sin(lat*uBands*15.0 + flow*7.0);
    surface = mix(uDeep,uMid,.45+bands*.4);
    surface = mix(surface,uHigh,pow(bands,3.0)*0.2 + filaments*0.035);
    float longitude=atan(local.z,local.x);
    vec2 stormUV=vec2(sin(longitude-.7)*3.8,(lat+.24)*8.0);
    float stormRadius=length(stormUV);
    float storm=(1.0-smoothstep(.75,1.05,stormRadius));
    float whorl=.5+.5*sin(stormRadius*23.0+atan(stormUV.y,stormUV.x)*2.0+flow*3.0);
    surface=mix(surface,mix(uMid*.85,uHigh*.85,whorl),storm*.3);
    surface*=.9+fbm(p*24.0)*.2;
  }
  surface *= 0.025 + light * 1.12;
  vec3 halfway = normalize(view + normalize(uLightDir));
  surface += vec3(0.6,0.75,0.82)*pow(max(dot(n,halfway),0.0),90.0)*(1.0-land)*(1.0-cloud)*uClouds*0.42;
  float settlements = pow(smoothstep(0.72,0.88,noise(p*95.0)),3.0) * smoothstep(0.47,0.6,fbm(p*11.0));
  surface += vec3(1.0,0.57,0.19)*settlements*land*(1.0-smoothstep(0.0,0.18,light))*uClouds*0.65;
  surface += vec3(0.15,0.36,0.65)*rim*light*uClouds*0.32;
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
  float rim = pow(1.0 - abs(dot(n, view)), 3.6);
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
  gl_FragColor = vec4(color * 3.5, 1.0);
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

export const domeVertex = `
varying vec3 vDir;
void main() {
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

export const domeFragment = `
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uSunColor;
uniform vec3 uSunPos;
uniform float uOpacity;
varying vec3 vDir;
void main() {
  vec3 dir = normalize(vDir);
  float h = smoothstep(-0.18, 0.82, dir.y);
  vec3 color = mix(uHorizon, uZenith, h);
  vec3 sunDir = normalize(uSunPos);
  float sun = pow(max(dot(dir, sunDir), 0.0), 92.0);
  float glow = pow(max(dot(dir, sunDir), 0.0), 7.0);
  float haze = pow(max(1.0 - abs(dir.y), 0.0), 2.4);
  color += uSunColor * (sun * 1.55 + glow * 0.38);
  color += uHorizon * haze * 0.18;
  gl_FragColor = vec4(color, uOpacity);
}
`

export const terrainVertex = `
varying vec3 vWorldPos;
varying vec3 vNormalW;
varying float vHeight;
varying vec3 vLocalPos;
void main() {
  vHeight = position.y;
  vLocalPos = position;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorldPos = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`

export const terrainFragment = `
uniform vec3 uLow;
uniform vec3 uMid;
uniform vec3 uHigh;
uniform vec3 uLightDir;
uniform float uTime;
uniform float uSeed;
uniform float uRipple;
varying vec3 vWorldPos;
varying vec3 vNormalW;
varying float vHeight;
varying vec3 vLocalPos;

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
  float rim = pow(1.0 - max(dot(n, view), 0.0), 3.2);
  float slope = 1.0 - abs(n.y);
  vec3 p = vLocalPos * (0.22 + uSeed * 0.04);
  float grain = fbm(p * 1.6);
  float fine = fbm(p * 5.2);
  vec3 color = mix(uLow, uMid, smoothstep(-3.4, -1.6, vHeight) + grain * 0.18);
  color = mix(color, uHigh, smoothstep(-0.7, 1.1, vHeight) * (1.0 - slope * 0.72));
  color = mix(color, uLow, slope * 0.32 + fine * 0.08);
  // Wind ripples: fine, direction-biased ridges that soften with distance from the camera.
  float ripple = sin(vLocalPos.x * 5.5 + vLocalPos.z * 2.2 + fbm(p * 3.0) * 4.5) * 0.5 + 0.5;
  float near = 1.0 - smoothstep(6.0, 26.0, distance(cameraPosition, vWorldPos));
  color *= 1.0 - uRipple * ripple * near;
  float strata = sin(vLocalPos.y * 19.0 + grain * 8.0) * 0.5 + 0.5;
  color *= 0.82 + fine * 0.28 - slope * strata * 0.15;
  vec3 dpdx = dFdx(vWorldPos), dpdy = dFdy(vWorldPos);
  vec3 r1 = cross(dpdy, n), r2 = cross(n, dpdx);
  float det = dot(dpdx, r1);
  float relief = fine * 0.065 + ripple * uRipple * 0.035;
  vec3 bumpNormal = normalize(abs(det) * n - sign(det) * (dFdx(relief) * r1 + dFdy(relief) * r2));
  light = max(dot(bumpNormal, normalize(uLightDir)), 0.0);
  if (uSeed < 1.5) {
    float snow = smoothstep(-0.8, 0.8, vHeight + fine * 0.6) * smoothstep(0.42, 0.85, n.y);
    color = mix(color, uHigh * (0.92 + fine * 0.08), snow * 0.85);
  }
  color *= 0.26 + light * 0.78;
  color += uHigh * rim * 0.06;
  float aerial = 1.0 - exp(-distance(cameraPosition, vWorldPos) * 0.009);
  color = mix(color, mix(uMid, uHigh, 0.45), aerial * 0.45);
  gl_FragColor = vec4(color, 1.0);
}
`

export const waterVertex = `
uniform float uTime;
uniform float uAmp;
varying vec3 vWaterPos;
varying vec3 vWaterNormal;
varying float vWave;
void main() {
  vec3 p = position;
  float a = p.x * 0.85 + p.y * 0.32 + uTime * 0.65;
  float b = p.x * 0.38 - p.y * 1.3 - uTime * 0.48;
  float c = p.x * 2.8 + p.y * 1.9 + uTime * 0.9;
  vWave = (sin(a) + sin(b) * 0.45 + sin(c) * 0.12) * uAmp;
  p.z += vWave;
  float dx = (cos(a) * 0.85 + cos(b) * 0.171 + cos(c) * 0.336) * uAmp;
  float dy = (cos(a) * 0.32 - cos(b) * 0.585 + cos(c) * 0.228) * uAmp;
  vWaterNormal = normalize(mat3(modelMatrix) * vec3(-dx, -dy, 1.0));
  vec4 world = modelMatrix * vec4(p, 1.0);
  vWaterPos = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`

export const waterFragment = `
uniform vec3 uDeep;
uniform vec3 uShallow;
uniform float uOpacity;
varying vec3 vWaterPos;
varying vec3 vWaterNormal;
varying float vWave;
void main() {
  vec3 n = normalize(vWaterNormal);
  vec3 view = normalize(cameraPosition - vWaterPos);
  float fresnel = 0.02 + 0.98 * pow(1.0 - max(dot(n, view), 0.0), 5.0);
  vec3 halfDir = normalize(view + normalize(vec3(-0.58, 0.62, 0.52)));
  float glint = pow(max(dot(n, halfDir), 0.0), 180.0);
  vec3 color = mix(uDeep, uShallow, 0.28 + vWave * 0.55);
  color = mix(color, uShallow * 1.35 + vec3(0.08, 0.11, 0.13), fresnel * 0.7);
  color += vec3(1.0, 0.87, 0.68) * glint * 1.8;
  gl_FragColor = vec4(color, mix(uOpacity, 1.0, fresnel));
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
