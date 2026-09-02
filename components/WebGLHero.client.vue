<script setup lang="ts">
import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'

let frame = 0
let renderer: THREE.WebGLRenderer | null = null
let composer: EffectComposer | null = null
let resizeHandler: (() => void) | null = null
let pointerHandler: ((event: PointerEvent) => void) | null = null
let focusHandler: ((event: Event) => void) | null = null

const disposables: Array<THREE.BufferGeometry | THREE.Material> = []

const vertexShader = `
uniform float uTime;
uniform float uPixelRatio;
uniform float uFocus;
uniform float uMotion;
uniform vec2 uMouse;
uniform float uPointScale;
attribute float aSeed;
attribute float aSize;
attribute float aTone;
varying float vTone;
varying float vPulse;
mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
vec3 flow(vec3 p,float seed){
  float t=uTime*uMotion;
  float s=seed*6.2831853;
  float radial=length(p.xy);
  float drift=t*(.18+.08*sin(s*1.7));
  float twist=sin(drift+s+p.z*.75)*(.09+uFocus*.11);
  p.xy=rot(twist)*p.xy;
  p.x+=sin(drift*1.15+s+p.y*1.7+p.z*.6)*(.12+uFocus*.08);
  p.y+=cos(drift*.93+s*1.31+p.x*1.45)*(.11+uFocus*.075);
  p.z+=sin(drift*.74+s*.83+radial*2.4)*(.18+uFocus*.13);
  vec2 delta=uMouse-p.xy;
  float d=max(length(delta),.001);
  float influence=smoothstep(1.9,.0,d);
  vec2 tangent=vec2(-delta.y,delta.x)/d;
  p.xy+=tangent*influence*(.16+.28*uFocus);
  p.xy+=delta*influence*.035;
  p.z+=influence*(.16+.25*uFocus);
  return p;
}
void main(){
  vec3 p=flow(position,aSeed);
  vec4 mv=modelViewMatrix*vec4(p,1.0);
  float pulse=.78+.22*sin(uTime*(.9+aSeed*.35)+aSeed*12.0);
  gl_PointSize=uPointScale*aSize*uPixelRatio*pulse*(12.0/max(2.0,-mv.z));
  gl_Position=projectionMatrix*mv;
  vTone=aTone;
  vPulse=pulse;
}`

const fragmentShader = `
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uOpacity;
varying float vTone;
varying float vPulse;
void main(){
  vec2 p=gl_PointCoord-.5;
  float d=length(p);
  float core=1.0-smoothstep(.0,.075,d);
  float inner=1.0-smoothstep(.04,.18,d);
  float glow=1.0-smoothstep(.12,.5,d);
  float alpha=(core*.88+inner*.36+glow*.19)*uOpacity*vPulse;
  if(alpha<.006)discard;
  vec3 color=mix(uColorA,uColorB,clamp(vTone+.22*core,0.0,1.0));
  color+=core*.45;
  gl_FragColor=vec4(color,alpha);
}`

const hazeVertexShader = `
uniform float uTime;
uniform float uMotion;
uniform float uFocus;
attribute float aSeed;
attribute float aSize;
varying float vAlpha;
mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
void main(){
  vec3 p=position;
  float t=uTime*uMotion;
  p.xy=rot(sin(t*.12+aSeed*7.0)*.16)*p.xy;
  p.x+=sin(t*.14+aSeed*11.0+p.y)*.13;
  p.y+=cos(t*.12+aSeed*9.0+p.x)*.12;
  vec4 mv=modelViewMatrix*vec4(p,1.0);
  gl_PointSize=aSize*(1.0+uFocus*.22)*(220.0/max(3.0,-mv.z));
  gl_Position=projectionMatrix*mv;
  vAlpha=.55+.45*sin(t*.35+aSeed*8.0);
}`

const hazeFragmentShader = `
uniform vec3 uColor;
uniform float uOpacity;
varying float vAlpha;
void main(){
  vec2 p=gl_PointCoord-.5;
  float d=length(p);
  float cloud=pow(max(0.0,1.0-d*2.0),2.6);
  float ring=1.0-smoothstep(.18,.5,d);
  float a=cloud*ring*uOpacity*vAlpha;
  if(a<.003)discard;
  gl_FragColor=vec4(uColor,a);
}`

const lineVertexShader = `
uniform float uTime;
uniform float uFocus;
uniform float uMotion;
uniform vec2 uMouse;
attribute float aSeed;
varying float vAlpha;
mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
vec3 flow(vec3 p,float seed){
  float t=uTime*uMotion;
  float s=seed*6.2831853;
  float radial=length(p.xy);
  float drift=t*(.18+.08*sin(s*1.7));
  float twist=sin(drift+s+p.z*.75)*(.09+uFocus*.11);
  p.xy=rot(twist)*p.xy;
  p.x+=sin(drift*1.15+s+p.y*1.7+p.z*.6)*(.12+uFocus*.08);
  p.y+=cos(drift*.93+s*1.31+p.x*1.45)*(.11+uFocus*.075);
  p.z+=sin(drift*.74+s*.83+radial*2.4)*(.18+uFocus*.13);
  vec2 delta=uMouse-p.xy;
  float d=max(length(delta),.001);
  float influence=smoothstep(1.9,.0,d);
  vec2 tangent=vec2(-delta.y,delta.x)/d;
  p.xy+=tangent*influence*(.16+.28*uFocus);
  p.xy+=delta*influence*.035;
  p.z+=influence*(.16+.25*uFocus);
  return p;
}
void main(){
  vec3 p=flow(position,aSeed);
  gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);
  vAlpha=.55+.45*sin(uTime*.55+aSeed*9.0);
}`

const lineFragmentShader = `
uniform vec3 uColor;
uniform float uOpacity;
varying float vAlpha;
void main(){gl_FragColor=vec4(uColor,uOpacity*(.55+.45*vAlpha));}`

onMounted(async () => {
  await nextTick()
  const canvas = document.getElementById('webgl-hero-canvas') as HTMLCanvasElement | null
  if (!canvas) return

  const mobile = window.innerWidth < 800
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(mobile ? 58 : 45, 1, 0.1, 80)
  camera.position.z = mobile ? 9.4 : 10.4

  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' })
  renderer.setClearColor(0x000000, 0)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.15 : 1.5))
  renderer.outputColorSpace = THREE.SRGBColorSpace

  if (!mobile) {
    composer = new EffectComposer(renderer)
    composer.addPass(new RenderPass(scene, camera))
    const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), .72, .52, .16)
    bloom.threshold = .06
    bloom.strength = .78
    bloom.radius = .58
    composer.addPass(bloom)
  }

  const field = new THREE.Group()
  field.position.set(mobile ? 1.35 : 2.82, mobile ? .48 : .04, 0)
  field.rotation.z = -.035
  scene.add(field)

  let seed = 83492791
  const random = () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }

  const centers = [
    new THREE.Vector3(-1.55, 1.72, .12),
    new THREE.Vector3(1.18, 1.95, -.16),
    new THREE.Vector3(2.15, .25, .1),
    new THREE.Vector3(.72, -1.62, .08),
    new THREE.Vector3(-1.68, -1.28, -.06)
  ]

  const palettes = [
    [new THREE.Color(0x244cff), new THREE.Color(0x9fd4ff)],
    [new THREE.Color(0xb9c8ff), new THREE.Color(0xffffff)],
    [new THREE.Color(0x2764ff), new THREE.Color(0x91dcff)],
    [new THREE.Color(0xff6f45), new THREE.Color(0xffd8b8)],
    [new THREE.Color(0x3455ff), new THREE.Color(0xa7b8ff)]
  ]
  const counts = mobile ? [95, 75, 90, 95, 90] : [340, 280, 320, 355, 330]
  let focused = -1
  const focusValues = [0, 0, 0, 0, 0]

  type Cluster = {
    group: THREE.Group
    pointsMaterial: THREE.ShaderMaterial
    hazeMaterial: THREE.ShaderMaterial
    lineMaterial: THREE.ShaderMaterial
  }
  const clusters: Cluster[] = []

  centers.forEach((center, ci) => {
    const cluster = new THREE.Group()
    cluster.position.copy(center)
    field.add(cluster)

    const count = counts[ci]
    const positions = new Float32Array(count * 3)
    const seeds = new Float32Array(count)
    const sizes = new Float32Array(count)
    const tones = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      const a = random() * Math.PI * 2
      const radial = Math.pow(random(), .92) * (ci === 3 ? 1.62 : 1.45)
      const spiral = a + radial * (ci % 2 ? 1.8 : -1.65)
      const shell = .48 + random() * .62
      const x = Math.cos(spiral) * radial * shell
      const y = Math.sin(spiral) * radial * (.46 + random() * .42)
      const z = (random() - .5) * 2.7 + Math.sin(a * 2.0) * .22
      positions.set([x, y, z], i * 3)
      seeds[i] = random()
      sizes[i] = .34 + Math.pow(random(), 2.2) * 1.85
      tones[i] = random()
    }

    const pointGeometry = new THREE.BufferGeometry()
    pointGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    pointGeometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1))
    pointGeometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
    pointGeometry.setAttribute('aTone', new THREE.BufferAttribute(tones, 1))

    const sharedUniforms = {
      uTime: { value: 0 },
      uPixelRatio: { value: renderer.getPixelRatio() },
      uFocus: { value: 0 },
      uMotion: { value: reducedMotion ? 0 : 1 },
      uMouse: { value: new THREE.Vector2(99, 99) }
    }

    const pointsMaterial = new THREE.ShaderMaterial({
      uniforms: {
        ...sharedUniforms,
        uPointScale: { value: mobile ? 8.5 : 8.1 },
        uColorA: { value: palettes[ci][0] },
        uColorB: { value: palettes[ci][1] },
        uOpacity: { value: ci === 3 ? .72 : .62 }
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
    cluster.add(new THREE.Points(pointGeometry, pointsMaterial))

    const hazeCount = mobile ? 12 : 28
    const hazePositions = new Float32Array(hazeCount * 3)
    const hazeSeeds = new Float32Array(hazeCount)
    const hazeSizes = new Float32Array(hazeCount)
    for (let i = 0; i < hazeCount; i++) {
      const a = random() * Math.PI * 2
      const r = random() * 1.2
      hazePositions.set([Math.cos(a) * r, Math.sin(a) * r * .72, (random() - .5) * 1.4], i * 3)
      hazeSeeds[i] = random()
      hazeSizes[i] = .7 + random() * 1.4
    }
    const hazeGeometry = new THREE.BufferGeometry()
    hazeGeometry.setAttribute('position', new THREE.BufferAttribute(hazePositions, 3))
    hazeGeometry.setAttribute('aSeed', new THREE.BufferAttribute(hazeSeeds, 1))
    hazeGeometry.setAttribute('aSize', new THREE.BufferAttribute(hazeSizes, 1))
    const hazeMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: sharedUniforms.uTime,
        uMotion: sharedUniforms.uMotion,
        uFocus: sharedUniforms.uFocus,
        uColor: { value: palettes[ci][0].clone().lerp(palettes[ci][1], .42) },
        uOpacity: { value: ci === 3 ? .09 : .065 }
      },
      vertexShader: hazeVertexShader,
      fragmentShader: hazeFragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
    cluster.add(new THREE.Points(hazeGeometry, hazeMaterial))

    const connections: Array<[number, number]> = []
    for (let i = 0; i < count; i++) {
      if (random() > .58) continue
      let best = -1
      let bestD = .34 + random() * .18
      const ix = positions[i * 3], iy = positions[i * 3 + 1], iz = positions[i * 3 + 2]
      for (let j = i + 1; j < Math.min(count, i + 36); j++) {
        const dx = ix - positions[j * 3], dy = iy - positions[j * 3 + 1], dz = iz - positions[j * 3 + 2]
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz)
        if (d < bestD) { bestD = d; best = j }
      }
      if (best >= 0) connections.push([i, best])
    }

    const linePositions = new Float32Array(connections.length * 6)
    const lineSeeds = new Float32Array(connections.length * 2)
    connections.forEach(([a, b], index) => {
      linePositions.set([positions[a * 3], positions[a * 3 + 1], positions[a * 3 + 2]], index * 6)
      linePositions.set([positions[b * 3], positions[b * 3 + 1], positions[b * 3 + 2]], index * 6 + 3)
      lineSeeds[index * 2] = seeds[a]
      lineSeeds[index * 2 + 1] = seeds[b]
    })
    const lineGeometry = new THREE.BufferGeometry()
    lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3))
    lineGeometry.setAttribute('aSeed', new THREE.BufferAttribute(lineSeeds, 1))
    const lineMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: sharedUniforms.uTime,
        uFocus: sharedUniforms.uFocus,
        uMotion: sharedUniforms.uMotion,
        uMouse: sharedUniforms.uMouse,
        uColor: { value: palettes[ci][1] },
        uOpacity: { value: ci === 3 ? .12 : .085 }
      },
      vertexShader: lineVertexShader,
      fragmentShader: lineFragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
    cluster.add(new THREE.LineSegments(lineGeometry, lineMaterial))

    disposables.push(pointGeometry, pointsMaterial, hazeGeometry, hazeMaterial, lineGeometry, lineMaterial)
    clusters.push({ group: cluster, pointsMaterial, hazeMaterial, lineMaterial })
  })

  const dustCount = mobile ? 260 : 900
  const dustGeometry = new THREE.BufferGeometry()
  const dustPositions = new Float32Array(dustCount * 3)
  for (let i = 0; i < dustCount; i++) {
    const angle = random() * Math.PI * 2
    const radius = 1.0 + random() * 4.7
    dustPositions.set([Math.cos(angle) * radius * .92, Math.sin(angle) * radius * .63, (random() - .5) * 5.8], i * 3)
  }
  dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3))
  const dustMaterial = new THREE.PointsMaterial({ color: 0x7894c8, size: mobile ? .018 : .014, transparent: true, opacity: .28, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true })
  field.add(new THREE.Points(dustGeometry, dustMaterial))
  disposables.push(dustGeometry, dustMaterial)

  focusHandler = (event: Event) => {
    const value = Number((event as CustomEvent<number>).detail)
    focused = Number.isFinite(value) ? value : -1
  }
  window.addEventListener('network-focus', focusHandler)

  const pointer = new THREE.Vector2(2, 2)
  const pointerWorld = new THREE.Vector3(99, 99, 0)
  const raycaster = new THREE.Raycaster()
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
  let px = 0
  let py = 0

  pointerHandler = (event: PointerEvent) => {
    pointer.x = event.clientX / window.innerWidth * 2 - 1
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1
    px = pointer.x
    py = pointer.y
  }
  window.addEventListener('pointermove', pointerHandler, { passive: true })

  resizeHandler = () => {
    if (!renderer) return
    const rect = canvas.getBoundingClientRect()
    camera.aspect = rect.width / Math.max(rect.height, 1)
    camera.updateProjectionMatrix()
    renderer.setSize(rect.width, rect.height, false)
    composer?.setSize(rect.width, rect.height)
    const ratio = renderer.getPixelRatio()
    clusters.forEach(c => { c.pointsMaterial.uniforms.uPixelRatio.value = ratio })
  }
  window.addEventListener('resize', resizeHandler)
  resizeHandler()

  const clock = new THREE.Clock()
  const pointerInField = new THREE.Vector3()
  const localMouse = new THREE.Vector3()

  const render = () => {
    const t = clock.getElapsedTime()
    raycaster.setFromCamera(pointer, camera)
    if (raycaster.ray.intersectPlane(plane, pointerInField)) field.worldToLocal(pointerInField)

    clusters.forEach((cluster, ci) => {
      const target = focused === ci ? 1 : 0
      focusValues[ci] += (target - focusValues[ci]) * .075
      const focus = focusValues[ci]
      localMouse.copy(pointerInField).sub(cluster.group.position)

      cluster.pointsMaterial.uniforms.uTime.value = t
      cluster.pointsMaterial.uniforms.uFocus.value = focus
      cluster.pointsMaterial.uniforms.uMouse.value.set(localMouse.x, localMouse.y)
      cluster.pointsMaterial.uniforms.uPointScale.value = (mobile ? 8.5 : 8.1) + focus * 2.8
      cluster.pointsMaterial.uniforms.uOpacity.value = (ci === 3 ? .72 : .62) + focus * .2

      cluster.hazeMaterial.uniforms.uTime.value = t
      cluster.hazeMaterial.uniforms.uFocus.value = focus
      cluster.hazeMaterial.uniforms.uOpacity.value = (ci === 3 ? .09 : .065) + focus * .055

      cluster.lineMaterial.uniforms.uTime.value = t
      cluster.lineMaterial.uniforms.uFocus.value = focus
      cluster.lineMaterial.uniforms.uMouse.value.set(localMouse.x, localMouse.y)
      cluster.lineMaterial.uniforms.uOpacity.value = (ci === 3 ? .12 : .085) + focus * .13

      if (!reducedMotion) {
        cluster.group.rotation.z = Math.sin(t * (.055 + ci * .006) + ci) * .06
        cluster.group.rotation.y = Math.sin(t * (.07 + ci * .004) + ci * .8) * .08
        const breathing = 1 + Math.sin(t * .23 + ci * 1.7) * .025 + focus * .04
        cluster.group.scale.setScalar(breathing)
      }
    })

    if (!reducedMotion) {
      field.rotation.y += ((mobile ? 0 : px * .065) + Math.sin(t * .075) * .02 - field.rotation.y) * .018
      field.rotation.x += ((mobile ? 0 : py * .028) + Math.cos(t * .065) * .012 - field.rotation.x) * .018
      field.position.y = (mobile ? .48 : .04) + Math.sin(t * .14) * .05
    }

    if (composer) composer.render()
    else renderer?.render(scene, camera)
    frame = requestAnimationFrame(render)
  }

  render()
})

onBeforeUnmount(() => {
  cancelAnimationFrame(frame)
  if (pointerHandler) window.removeEventListener('pointermove', pointerHandler)
  if (resizeHandler) window.removeEventListener('resize', resizeHandler)
  if (focusHandler) window.removeEventListener('network-focus', focusHandler)
  disposables.forEach(item => item.dispose())
  composer?.dispose()
  renderer?.dispose()
})
</script>

<template>
  <canvas id="webgl-hero-canvas" aria-hidden="true" style="position:absolute;inset:0;width:100%;height:100%;z-index:1;opacity:1;pointer-events:none" />
</template>
