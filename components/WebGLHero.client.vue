<script setup lang="ts">
import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'

let frame = 0
let renderer: THREE.WebGLRenderer | null = null
let composer: EffectComposer | null = null
let resizeHandler: (() => void) | null = null
let pointerMoveHandler: ((event: PointerEvent) => void) | null = null
let pointerLeaveHandler: (() => void) | null = null
let focusHandler: ((event: Event) => void) | null = null
const disposables: Array<THREE.BufferGeometry | THREE.Material> = []

const particleVertex = `
uniform float uPixelRatio;
uniform float uScale;
attribute float aSize;
attribute float aGlow;
varying float vGlow;
void main(){
  vec4 mv=modelViewMatrix*vec4(position,1.0);
  gl_Position=projectionMatrix*mv;
  gl_PointSize=aSize*uScale*uPixelRatio*(8.0/max(2.5,-mv.z));
  vGlow=aGlow;
}`

const particleFragment = `
uniform vec3 uColor;
uniform float uOpacity;
varying float vGlow;
void main(){
  vec2 p=gl_PointCoord-.5;
  float d=length(p);
  float core=1.0-smoothstep(.015,.09,d);
  float halo=1.0-smoothstep(.08,.5,d);
  float a=(core*1.5+halo*(.16+vGlow*.52))*uOpacity;
  if(a<.01)discard;
  gl_FragColor=vec4(uColor,a);
}`

onMounted(async () => {
  await nextTick()
  const canvas = document.getElementById('webgl-hero-canvas') as HTMLCanvasElement | null
  if (!canvas) return

  const mobile = window.innerWidth < 800
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(mobile ? 58 : 46, 1, 0.1, 90)
  camera.position.z = mobile ? 9.5 : 10.5

  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' })
  renderer.setClearColor(0x000000, 0)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.1 : 1.5))
  renderer.outputColorSpace = THREE.SRGBColorSpace

  composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), mobile ? 0.45 : 0.78, 0.88, 0.03)
  bloom.strength = mobile ? 0.34 : 0.62
  bloom.radius = 0.95
  bloom.threshold = 0
  composer.addPass(bloom)

  const field = new THREE.Group()
  field.position.set(mobile ? 1.35 : 2.72, mobile ? 0.55 : 0.03, 0)
  scene.add(field)

  let seed = 73129
  const random = () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }

  const centers = [
    new THREE.Vector3(-1.55, 1.55, 0.0),
    new THREE.Vector3(1.3, 1.9, -0.25),
    new THREE.Vector3(2.28, 0.2, 0.05),
    new THREE.Vector3(0.85, -1.72, 0.05),
    new THREE.Vector3(-1.42, -1.48, -0.08)
  ]
  const palette = [
    new THREE.Color(0x4f6fff),
    new THREE.Color(0xf2f5ff),
    new THREE.Color(0x4c84ff),
    new THREE.Color(0xff9867),
    new THREE.Color(0x6982ff)
  ]
  const counts = mobile ? [70, 58, 66, 72, 66] : [185, 155, 175, 195, 170]
  const focusValues = [0, 0, 0, 0, 0]
  let focused = -1

  type Cloud = {
    count: number
    center: THREE.Vector3
    base: Float32Array
    velocity: Float32Array
    phases: Float32Array
    geometry: THREE.BufferGeometry
    material: THREE.ShaderMaterial
    links: Array<[number, number]>
    linkGeometry: THREE.BufferGeometry
    linkMaterial: THREE.LineBasicMaterial
    trailIndices: number[]
    trailGeometry: THREE.BufferGeometry
    trailMaterial: THREE.LineBasicMaterial
  }
  const clouds: Cloud[] = []

  const makePointMaterial = (color: THREE.Color, opacity: number) => {
    const m = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: color },
        uOpacity: { value: opacity },
        uPixelRatio: { value: renderer!.getPixelRatio() },
        uScale: { value: 1 }
      },
      vertexShader: particleVertex,
      fragmentShader: particleFragment,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
    disposables.push(m)
    return m
  }

  centers.forEach((center, ci) => {
    const count = counts[ci]
    const positions = new Float32Array(count * 3)
    const base = new Float32Array(count * 3)
    const velocity = new Float32Array(count * 3)
    const phases = new Float32Array(count)
    const sizes = new Float32Array(count)
    const glows = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      const angle = random() * Math.PI * 2
      const ring = Math.pow(random(), 0.8) * (ci === 3 ? 1.85 : 1.55)
      const twist = angle + ring * (ci % 2 ? 1.85 : -1.6)
      const vertical = Math.sin(angle * 1.7 + ci) * 0.18
      const x = center.x + Math.cos(twist) * ring * (0.5 + random() * 0.55)
      const y = center.y + Math.sin(twist) * ring * (0.38 + random() * 0.52) + vertical
      const z = (random() - 0.5) * 3.8 + Math.sin(angle * 2.1) * 0.32
      positions.set([x, y, z], i * 3)
      base.set([x, y, z], i * 3)
      phases[i] = random() * Math.PI * 2
      sizes[i] = mobile ? 2.5 + random() * 4.6 : 1.7 + random() * 4.8
      glows[i] = random() > 0.94 ? 1 : random() * 0.16
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
    geometry.setAttribute('aGlow', new THREE.BufferAttribute(glows, 1))
    const material = makePointMaterial(palette[ci], ci === 3 ? 0.8 : 0.66)
    field.add(new THREE.Points(geometry, material))

    // Keep only a few structural links so the composition reads as a field, not molecules.
    const links: Array<[number, number]> = []
    for (let i = 0; i < count; i++) {
      if (random() > 0.18) continue
      let nearest = -1
      let nearestD = 0.42
      const ix = base[i * 3], iy = base[i * 3 + 1], iz = base[i * 3 + 2]
      for (let j = i + 1; j < count; j++) {
        const dx = ix - base[j * 3], dy = iy - base[j * 3 + 1], dz = iz - base[j * 3 + 2]
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz)
        if (d < nearestD) { nearestD = d; nearest = j }
      }
      if (nearest >= 0) links.push([i, nearest])
    }
    const linkGeometry = new THREE.BufferGeometry()
    linkGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(links.length * 6), 3))
    const linkMaterial = new THREE.LineBasicMaterial({
      color: palette[ci], transparent: true, opacity: ci === 3 ? 0.075 : 0.045,
      blending: THREE.AdditiveBlending, depthWrite: false
    })
    field.add(new THREE.LineSegments(linkGeometry, linkMaterial))

    // Trails are velocity vectors. During scatter these become the starburst streaks.
    const trailIndices = Array.from({ length: mobile ? 24 : 78 }, () => Math.floor(random() * count))
    const trailGeometry = new THREE.BufferGeometry()
    trailGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(trailIndices.length * 6), 3))
    const trailMaterial = new THREE.LineBasicMaterial({
      color: palette[ci].clone().lerp(new THREE.Color(0xffffff), 0.32),
      transparent: true, opacity: 0.05, blending: THREE.AdditiveBlending, depthWrite: false
    })
    field.add(new THREE.LineSegments(trailGeometry, trailMaterial))

    disposables.push(geometry, linkGeometry, linkMaterial, trailGeometry, trailMaterial)
    clouds.push({ count, center, base, velocity, phases, geometry, material, links, linkGeometry, linkMaterial, trailIndices, trailGeometry, trailMaterial })
  })

  // Long wispy streamlines tie the five regions together into one organism.
  const streams: THREE.Line[] = []
  for (let s = 0; s < (mobile ? 5 : 12); s++) {
    const start = centers[Math.floor(random() * centers.length)]
    let end = centers[Math.floor(random() * centers.length)]
    if (end === start) end = centers[(centers.indexOf(start) + 2) % centers.length]
    const mid = start.clone().lerp(end, 0.5)
    mid.x += (random() - 0.5) * 1.7
    mid.y += (random() - 0.5) * 1.5
    mid.z += (random() - 0.5) * 2.2
    const curve = new THREE.CatmullRomCurve3([
      start.clone().add(new THREE.Vector3((random() - .5) * .7, (random() - .5) * .7, (random() - .5) * .6)),
      mid,
      end.clone().add(new THREE.Vector3((random() - .5) * .7, (random() - .5) * .7, (random() - .5) * .6))
    ])
    const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(72))
    const material = new THREE.LineBasicMaterial({
      color: s % 4 === 3 ? 0xffb08a : 0x7089ff,
      transparent: true, opacity: 0.035 + random() * 0.035,
      blending: THREE.AdditiveBlending, depthWrite: false
    })
    const line = new THREE.Line(geometry, material)
    line.userData.phase = random() * Math.PI * 2
    field.add(line)
    streams.push(line)
    disposables.push(geometry, material)
  }

  // Fine dust gives depth and creates the large-scale cursor explosion.
  const dustCount = mobile ? 360 : 1650
  const dustPositions = new Float32Array(dustCount * 3)
  const dustBase = new Float32Array(dustCount * 3)
  const dustVelocity = new Float32Array(dustCount * 3)
  const dustPhases = new Float32Array(dustCount)
  const dustSizes = new Float32Array(dustCount)
  const dustGlows = new Float32Array(dustCount)
  for (let i = 0; i < dustCount; i++) {
    const angle = random() * Math.PI * 2
    const radius = 0.35 + Math.pow(random(), 0.62) * 5.45
    const x = Math.cos(angle) * radius * 0.98
    const y = Math.sin(angle) * radius * 0.63
    const z = (random() - 0.5) * 6.3
    dustPositions.set([x, y, z], i * 3)
    dustBase.set([x, y, z], i * 3)
    dustPhases[i] = random() * Math.PI * 2
    dustSizes[i] = mobile ? 1.2 + random() * 2.6 : 0.8 + random() * 2.4
    dustGlows[i] = random() > 0.985 ? 0.9 : random() * 0.08
  }
  const dustGeometry = new THREE.BufferGeometry()
  dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3))
  dustGeometry.setAttribute('aSize', new THREE.BufferAttribute(dustSizes, 1))
  dustGeometry.setAttribute('aGlow', new THREE.BufferAttribute(dustGlows, 1))
  const dustMaterial = makePointMaterial(new THREE.Color(0x9fb2df), 0.27)
  field.add(new THREE.Points(dustGeometry, dustMaterial))

  const dustTrailCount = mobile ? 0 : 320
  const dustTrailIndices = Array.from({ length: dustTrailCount }, () => Math.floor(random() * dustCount))
  const dustTrailGeometry = new THREE.BufferGeometry()
  dustTrailGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(dustTrailCount * 6), 3))
  const dustTrailMaterial = new THREE.LineBasicMaterial({ color: 0xc9d5ff, transparent: true, opacity: 0.025, blending: THREE.AdditiveBlending, depthWrite: false })
  if (!mobile) field.add(new THREE.LineSegments(dustTrailGeometry, dustTrailMaterial))
  disposables.push(dustGeometry, dustTrailGeometry, dustTrailMaterial)

  const pointer = new THREE.Vector2(2, 2)
  const pointerWorld = new THREE.Vector3(999, 999, 0)
  const pointerLocal = new THREE.Vector3(999, 999, 0)
  const previousPointerLocal = new THREE.Vector3(999, 999, 0)
  const raycaster = new THREE.Raycaster()
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
  let pointerActive = false
  let pointerVelocity = 0
  let px = 0
  let py = 0

  const projectPointer = () => {
    raycaster.setFromCamera(pointer, camera)
    if (raycaster.ray.intersectPlane(plane, pointerWorld)) {
      previousPointerLocal.copy(pointerLocal)
      pointerLocal.copy(pointerWorld)
      field.worldToLocal(pointerLocal)
      if (previousPointerLocal.x < 100) {
        pointerVelocity = Math.min(3.4, pointerVelocity * 0.35 + previousPointerLocal.distanceTo(pointerLocal) * 4.5)
      }
    }
  }

  pointerMoveHandler = (event: PointerEvent) => {
    pointer.x = event.clientX / window.innerWidth * 2 - 1
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1
    px = pointer.x
    py = pointer.y
    pointerActive = true
    if (!mobile) projectPointer()
  }
  pointerLeaveHandler = () => { pointerActive = false }
  window.addEventListener('pointermove', pointerMoveHandler, { passive: true })
  window.addEventListener('pointerleave', pointerLeaveHandler, { passive: true })

  focusHandler = (event: Event) => { focused = Number((event as CustomEvent<number>).detail) }
  window.addEventListener('network-focus', focusHandler)

  resizeHandler = () => {
    if (!renderer || !composer) return
    const rect = canvas.getBoundingClientRect()
    camera.aspect = rect.width / Math.max(rect.height, 1)
    camera.updateProjectionMatrix()
    renderer.setSize(rect.width, rect.height, false)
    composer.setSize(rect.width, rect.height)
    const ratio = renderer.getPixelRatio()
    clouds.forEach(c => { c.material.uniforms.uPixelRatio.value = ratio })
    dustMaterial.uniforms.uPixelRatio.value = ratio
  }
  window.addEventListener('resize', resizeHandler)
  resizeHandler()

  const dustAttr = dustGeometry.getAttribute('position') as THREE.BufferAttribute
  const clock = new THREE.Clock()
  let last = performance.now()

  const scatter = (x: number, y: number, z: number, velocity: Float32Array, o: number, radius: number, force: number) => {
    if (!pointerActive || mobile) return
    const dx = x - pointerLocal.x
    const dy = y - pointerLocal.y
    const d = Math.sqrt(dx * dx + dy * dy)
    if (d >= radius || d < 0.001) return
    const falloff = Math.pow(1 - d / radius, 2.2)
    const speedBoost = 0.6 + pointerVelocity * 1.35
    const impulse = force * falloff * speedBoost
    const nx = dx / d
    const ny = dy / d
    // Mostly radial, with a slight tangent so the explosion has fluid character.
    velocity[o] += nx * impulse - ny * impulse * 0.14
    velocity[o + 1] += ny * impulse + nx * impulse * 0.14
    velocity[o + 2] += (z >= 0 ? 1 : -1) * impulse * 0.16
  }

  const render = () => {
    const now = performance.now()
    const dt = Math.min((now - last) / 16.667, 2)
    last = now
    const t = clock.getElapsedTime()
    pointerVelocity *= 0.9

    clouds.forEach((cloud, ci) => {
      focusValues[ci] += (((focused === ci) ? 1 : 0) - focusValues[ci]) * 0.075
      const focus = focusValues[ci]
      const attr = cloud.geometry.getAttribute('position') as THREE.BufferAttribute

      for (let i = 0; i < cloud.count; i++) {
        const o = i * 3
        const bx = cloud.base[o], by = cloud.base[o + 1], bz = cloud.base[o + 2]
        const phase = cloud.phases[i]
        let x = attr.getX(i), y = attr.getY(i), z = attr.getZ(i)

        const idleX = reducedMotion ? 0 : Math.sin(t * (0.28 + ci * 0.017) + phase + by * 0.22) * (0.045 + focus * 0.025)
        const idleY = reducedMotion ? 0 : Math.cos(t * (0.24 + ci * 0.015) + phase * 1.13 + bx * 0.21) * (0.04 + focus * 0.025)
        const idleZ = reducedMotion ? 0 : Math.sin(t * 0.31 + phase * 0.74) * (0.07 + focus * 0.04)
        const tx = bx + idleX, ty = by + idleY, tz = bz + idleZ

        scatter(x, y, z, cloud.velocity, o, 1.7, 0.11)
        cloud.velocity[o] += (tx - x) * (0.0048 + focus * 0.0013) * dt
        cloud.velocity[o + 1] += (ty - y) * (0.0048 + focus * 0.0013) * dt
        cloud.velocity[o + 2] += (tz - z) * 0.0042 * dt
        cloud.velocity[o] *= 0.955
        cloud.velocity[o + 1] *= 0.955
        cloud.velocity[o + 2] *= 0.955
        x += cloud.velocity[o] * dt
        y += cloud.velocity[o + 1] * dt
        z += cloud.velocity[o + 2] * dt
        attr.setXYZ(i, x, y, z)
      }
      attr.needsUpdate = true

      const linkAttr = cloud.linkGeometry.getAttribute('position') as THREE.BufferAttribute
      cloud.links.forEach(([a, b], idx) => {
        const o = idx * 2
        linkAttr.setXYZ(o, attr.getX(a), attr.getY(a), attr.getZ(a))
        linkAttr.setXYZ(o + 1, attr.getX(b), attr.getY(b), attr.getZ(b))
      })
      linkAttr.needsUpdate = true

      const trailAttr = cloud.trailGeometry.getAttribute('position') as THREE.BufferAttribute
      cloud.trailIndices.forEach((particleIndex, idx) => {
        const po = particleIndex * 3
        const x = attr.getX(particleIndex), y = attr.getY(particleIndex), z = attr.getZ(particleIndex)
        const speed = Math.min(1.8, Math.hypot(cloud.velocity[po], cloud.velocity[po + 1], cloud.velocity[po + 2]) * 8)
        const len = 2.2 + speed * 3.2
        const o = idx * 2
        trailAttr.setXYZ(o, x, y, z)
        trailAttr.setXYZ(o + 1, x - cloud.velocity[po] * len, y - cloud.velocity[po + 1] * len, z - cloud.velocity[po + 2] * len)
      })
      trailAttr.needsUpdate = true

      cloud.material.uniforms.uOpacity.value = (ci === 3 ? 0.8 : 0.66) + focus * 0.16
      cloud.material.uniforms.uScale.value = 1 + focus * 0.22
      cloud.linkMaterial.opacity = (ci === 3 ? 0.075 : 0.045) + focus * 0.045
      cloud.trailMaterial.opacity = 0.03 + Math.min(0.22, pointerVelocity * 0.085) + focus * 0.03
    })

    for (let i = 0; i < dustCount; i++) {
      const o = i * 3
      const p = dustPhases[i]
      let x = dustAttr.getX(i), y = dustAttr.getY(i), z = dustAttr.getZ(i)
      const bx = dustBase[o], by = dustBase[o + 1], bz = dustBase[o + 2]
      const tx = bx + (reducedMotion ? 0 : Math.sin(t * 0.12 + p + by * 0.05) * 0.05)
      const ty = by + (reducedMotion ? 0 : Math.cos(t * 0.105 + p * 1.2 + bx * 0.05) * 0.045)
      const tz = bz + (reducedMotion ? 0 : Math.sin(t * 0.09 + p) * 0.07)

      scatter(x, y, z, dustVelocity, o, 2.05, 0.082)
      dustVelocity[o] += (tx - x) * 0.003 * dt
      dustVelocity[o + 1] += (ty - y) * 0.003 * dt
      dustVelocity[o + 2] += (tz - z) * 0.0028 * dt
      dustVelocity[o] *= 0.96
      dustVelocity[o + 1] *= 0.96
      dustVelocity[o + 2] *= 0.96
      x += dustVelocity[o] * dt
      y += dustVelocity[o + 1] * dt
      z += dustVelocity[o + 2] * dt
      dustAttr.setXYZ(i, x, y, z)
    }
    dustAttr.needsUpdate = true

    if (!mobile) {
      const dta = dustTrailGeometry.getAttribute('position') as THREE.BufferAttribute
      dustTrailIndices.forEach((particleIndex, idx) => {
        const po = particleIndex * 3
        const x = dustAttr.getX(particleIndex), y = dustAttr.getY(particleIndex), z = dustAttr.getZ(particleIndex)
        const len = 3.2
        const o = idx * 2
        dta.setXYZ(o, x, y, z)
        dta.setXYZ(o + 1, x - dustVelocity[po] * len, y - dustVelocity[po + 1] * len, z - dustVelocity[po + 2] * len)
      })
      dta.needsUpdate = true
      dustTrailMaterial.opacity = 0.012 + Math.min(0.22, pointerVelocity * 0.085)
    }

    streams.forEach((line, i) => {
      if (!reducedMotion) {
        line.rotation.z = Math.sin(t * 0.08 + line.userData.phase) * 0.035
        line.rotation.y = Math.cos(t * 0.07 + i) * 0.025
      }
      ;(line.material as THREE.LineBasicMaterial).opacity = 0.025 + (Math.sin(t * 0.45 + line.userData.phase) + 1) * 0.018
    })

    if (!reducedMotion) {
      field.rotation.y += ((mobile ? 0 : px * 0.055) + Math.sin(t * 0.07) * 0.018 - field.rotation.y) * 0.018
      field.rotation.x += ((mobile ? 0 : py * 0.025) + Math.cos(t * 0.06) * 0.012 - field.rotation.x) * 0.018
      field.position.y = (mobile ? 0.55 : 0.03) + Math.sin(t * 0.16) * 0.045
    }

    composer?.render()
    frame = requestAnimationFrame(render)
  }
  render()
})

onBeforeUnmount(() => {
  cancelAnimationFrame(frame)
  if (pointerMoveHandler) window.removeEventListener('pointermove', pointerMoveHandler)
  if (pointerLeaveHandler) window.removeEventListener('pointerleave', pointerLeaveHandler)
  if (focusHandler) window.removeEventListener('network-focus', focusHandler)
  if (resizeHandler) window.removeEventListener('resize', resizeHandler)
  disposables.forEach(item => item.dispose())
  composer?.dispose()
  renderer?.dispose()
})
</script>

<template>
  <canvas id="webgl-hero-canvas" aria-hidden="true" style="position:absolute;inset:0;width:100%;height:100%;z-index:1;opacity:1;pointer-events:none" />
</template>
