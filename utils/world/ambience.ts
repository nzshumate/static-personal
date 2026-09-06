import * as THREE from 'three'
import { makeRng } from './math'

type AmbienceKind = 'cirrus' | 'snow' | 'pollen' | 'sand' | 'mist' | 'spray' | 'bubbles'
const settings = {
  cirrus: { count: 7, color: 0xe3edf1, size: 2.8, opacity: .035, floor: 2, height: 3, speed: .014, wind: 1.4 },
  snow: { count: 48, color: 0xe8f2f6, size: .085, opacity: .5, floor: -1, height: 5, speed: .035, wind: 1.1 },
  pollen: { count: 22, color: 0xf4d9a2, size: .022, opacity: .4, floor: -2.6, height: 4.5, speed: .019, wind: .5 },
  sand: { count: 32, color: 0xe4bc82, size: .025, opacity: .3, floor: -2.6, height: 1.1, speed: .03, wind: 2.3 },
  mist: { count: 8, color: 0xb7cdc1, size: 2.1, opacity: .035, floor: -2.65, height: .3, speed: .012, wind: .65 },
  spray: { count: 24, color: 0xe0e8dc, size: .025, opacity: .32, floor: -3, height: 1.5, speed: .035, wind: 1.8 },
  bubbles: { count: 38, color: 0xaacbd1, size: .16, opacity: .46, floor: -6.5, height: 12, speed: .027, wind: .22 }
} satisfies Record<AmbienceKind, { count: number; color: number; size: number; opacity: number; floor: number; height: number; speed: number; wind: number }>

// One draw call per visible biome; positions animate in the vertex shader.
export const createAmbience = (group: THREE.Group, kind: AmbienceKind, mobile: boolean, groundAt?: (x: number,z: number) => number) => {
  const config = settings[kind], random = makeRng(527 + Object.keys(settings).indexOf(kind) * 139)
  const count = Math.ceil(config.count * (mobile ? .6 : 1))
  const positions: number[] = [], seeds: number[] = []
  for (let i = 0; i < count; i++) {
    const column = (i % 5) / 4
    positions.push(kind === 'bubbles' ? (column - .5) * (mobile ? 6 : 14) + (random() - .5) * .8 : (random() - .5) * 20, 0, -1.5 - random() * 12)
    if(kind === 'snow') {
      const x=(random()-.5)*14,z=-1+random()*7
      positions.splice(positions.length-3,3,x,(groundAt?.(x,z) ?? 0)+.35,z)
    }
    seeds.push(random(), .45 + random() * .8)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('aSeed', new THREE.Float32BufferAttribute(seeds, 2))
  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 12 }, uViewport: { value: 720 }, uColor: { value: new THREE.Color(config.color) } },
    vertexShader: `
      attribute vec2 aSeed;
      uniform float uTime; uniform float uViewport;
      varying float vLife; varying float vSeed;
      void main() {
        float life=fract(aSeed.x+uTime*${config.speed}*(.65+aSeed.y*.35));
        vec3 p=position;
        p.y=${config.floor.toFixed(2)}+${config.height.toFixed(2)}*${kind === 'snow' ? '(1.0-life)' : 'life'};
        ${kind === 'snow' ? 'p.y=position.y+.3*(1.0-life);' : ''}
        p.x+=sin(uTime*.23+aSeed.x*31.0)*${config.wind.toFixed(2)};
        p.z+=sin(uTime*.17+aSeed.x*17.0)*.18;
        vec4 mv=modelViewMatrix*vec4(p,1.0);
        gl_Position=projectionMatrix*mv;
        gl_PointSize=clamp(${config.size.toFixed(3)}*aSeed.y*uViewport/-mv.z,1.0,220.0);
        ${kind === 'snow' ? 'if(aSeed.x>.65) gl_PointSize=clamp(1.8*aSeed.y*uViewport/-mv.z,1.0,220.0);' : ''}
        vLife=smoothstep(0.0,.12,life)*(1.0-smoothstep(.82,1.0,life));vSeed=aSeed.x;
      }`,
    fragmentShader: `
      uniform vec3 uColor; varying float vLife; varying float vSeed;
      void main() {
        vec2 p=gl_PointCoord-.5;
        ${kind === 'cirrus' || kind === 'mist' ? 'p.y*=5.0;' : ''}
        ${kind === 'snow' ? 'if(vSeed>.65) p.y*=6.0;' : ''}
        float r=length(p), alpha;
        ${kind === 'bubbles' ? `
          float rim=exp(-pow((r-.37)/.035,2.0));
          float glint=exp(-length((p-vec2(-.18,-.23))*vec2(20.0,28.0)));
          alpha=rim*(.23+max(0.0,-p.x-p.y)*.7)+glint*.9;
        ` : 'alpha=exp(-r*r*24.0);'}
        alpha*=vLife*${config.opacity.toFixed(3)};
        ${kind === 'snow' ? 'if(vSeed>.65) alpha*=.35;' : ''}
        if(alpha<.003) discard;
        gl_FragColor=vec4(uColor,alpha);
      }`,
    transparent: true, depthWrite: false,
    blending: kind === 'cirrus' || kind === 'mist' ? THREE.NormalBlending : THREE.AdditiveBlending
  })
  const particles = new THREE.Points(geometry, material)
  // Shader displacement exceeds the static seed bounds.
  particles.frustumCulled = false
  group.add(particles)
  return {
    update: (time: number) => { material.uniforms.uTime!.value = time },
    resize: (height: number) => { material.uniforms.uViewport!.value = height }
  }
}
