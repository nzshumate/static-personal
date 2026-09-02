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
uniform float uPointScale;
attribute float aSize;
attribute float aGlow;
varying float vGlow;
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * uPointScale * uPixelRatio * (8.0 / max(2.5, -mv.z));
  vGlow = aGlow;
}`

const particleFragment = `
uniform vec3 uColor;
uniform float uOpacity;
varying float vGlow;
void main(){
  vec2 p = gl_PointCoord - .5;
  float d = length(p);
  float core = 1.0 - smoothstep(.015, .10, d);
  float halo = 1.0 - smoothstep(.08, .50, d);
  float alpha = (core * 1.45 + halo * (.28 + vGlow * .42)) * uOpacity;
  if(alpha < .015) discard;
  gl_FragColor = vec4(uColor, alpha);
}`

onMounted(async () => {
  await nextTick()
  const canvas = document.getElementById('webgl-hero-canvas') as HTMLCanvasElement | null
  if (!canvas) return

  const mobile = window.innerWidth < 800
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(mobile ? 58 : 46, 1, 0.1, 80)
  camera.position.z = mobile ? 9.5 : 10.5

  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' })
  renderer.setClearColor(0x000000, 0)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.15 : 1.55))
  renderer.outputColorSpace = THREE.SRGBColorSpace

  composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), mobile ? 0.55 : 0.9, 0.7, 0.08)
  bloom.threshold = 0
  bloom.strength = mobile ? 0.42 : 0.72
  bloom.radius = 0.78
  composer.addPass(bloom)

  const field = new THREE.Group()
  field.position.set(mobile ? 1.35 : 2.65, mobile ? 0.55 : 0.05, 0)
  scene.add(field)

  let seed = 92717
  const random = () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }

  const centers = [
    new THREE.Vector3(-1.45, 1.55, 0.05),
    new THREE.Vector3(1.25, 1.95, -0.25),
    new THREE.Vector3(2.35, 0.15, 0.1),
    new THREE.Vector3(0.85, -1.78, 0.05),
    new THREE.Vector3(-1.45, -1.5, -0.08)
  ]
  const palette = [
    new THREE.Color(0x3f64ff),
    new THREE.Color(0xe8efff),
    new THREE.Color(0x3e78ff),
    new THREE.Color(0xff8e57),
    new THREE.Color(0x5b75ff)
  ]
  const counts = mobile ? [82, 70, 78, 84, 78] : [235, 185, 220, 245, 215]
  let focused = -1
  const focusValues = [0, 0, 0, 0, 0]

  type ParticleCloud = {
    count: number
    center: THREE.Vector3
    base: Float32Array
    velocity: Float32Array
    phases: Float32Array
    geometry: THREE.BufferGeometry
    material: THREE.ShaderMaterial
    lines: Array<[number, number]>
    lineGeometry: THREE.BufferGeometry
    lineMaterial: THREE.LineBasicMaterial
  }
  const clouds: ParticleCloud[] = []

  const makeParticleMaterial = (color: THREE.Color, scale: number, opacity: number) => {
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: color },
        uOpacity: { value: opacity },
        uPixelRatio: { value: renderer!.getPixelRatio() },
        uPointScale: { value: scale }
      },
      vertexShader: particleVertex,
      fragmentShader: particleFragment,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
    disposables.push(material)
    return material
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
      const radius = Math.pow(random(), 1.1) * (ci === 3 ? 1.8 : 1.5)
      const curl = angle + radius * (ci % 2 ? 1.6 : -1.35)
      const x = center.x + Math.cos(curl) * radius * (0.55 + random() * 0.55)
      const y = center.y + Math.sin(curl) * radius * (0.42 + random() * 0.55)
      const z = (random() - .5) * 3.4 + Math.sin(angle * 2.1) * .22
      positions.set([x, y, z], i * 3)
      base.set([x, y, z], i * 3)
      phases[i] = random() * Math.PI * 2
      sizes[i] = mobile ? 5.4 + random() * 7 : 4 + random() * 8
      glows[i] = random() > .88 ? 1 : random() * .25
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
    geometry.setAttribute('aGlow', new THREE.BufferAttribute(glows, 1))
    const material = makeParticleMaterial(palette[ci], 1, ci === 3 ? .84 : .72)
    field.add(new THREE.Points(geometry, material))

    const lines: Array<[number, number]> = []
    for (let i = 0; i < count; i++) {
      let nearest = -1
      let nearestD = mobile ? .55 : .44
      const ix = base[i * 3], iy = base[i * 3 + 1], iz = base[i * 3 + 2]
      for (let j = i + 1; j < count; j++) {
        const dx = ix - base[j * 3], dy = iy - base[j * 3 + 1], dz = iz - base[j * 3 + 2]
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz)
        if (d < nearestD) { nearestD = d; nearest = j }
      }
      if (nearest >= 0 && random() > .18) lines.push([i, nearest])
    }
    const lineGeometry = new THREE.BufferGeometry()
    lineGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(lines.length * 6), 3))
    const lineMaterial = new THREE.LineBasicMaterial({ color: palette[ci], transparent: true, opacity: ci === 3 ? .12 : .075, blending: THREE.AdditiveBlending, depthWrite: false })
    disposables.push(geometry, lineGeometry, lineMaterial)
    field.add(new THREE.LineSegments(lineGeometry, lineMaterial))
    clouds.push({ count, center, base, velocity, phases, geometry, material, lines, lineGeometry, lineMaterial })
  })

  // Dense atmospheric field across the whole network. This is what gives the cursor burst its cinematic scale.
  const dustCount = mobile ? 380 : 1450
  const dustPositions = new Float32Array(dustCount * 3)
  const dustBase = new Float32Array(dustCount * 3)
  const dustVelocity = new Float32Array(dustCount * 3)
  const dustSizes = new Float32Array(dustCount)
  const dustGlows = new Float32Array(dustCount)
  const dustPhases = new Float32Array(dustCount)
  for (let i = 0; i < dustCount; i++) {
    const angle = random() * Math.PI * 2
    const radius = .7 + Math.pow(random(), .68) * 5.1
    const x = Math.cos(angle) * radius * .95
    const y = Math.sin(angle) * radius * .64
    const z = (random() - .5) * 5.8
    dustPositions.set([x, y, z], i * 3)
    dustBase.set([x, y, z], i * 3)
    dustSizes[i] = mobile ? 2.4 + random() * 3.4 : 1.8 + random() * 3.4
    dustGlows[i] = random() > .95 ? .9 : random() * .12
    dustPhases[i] = random() * Math.PI * 2
  }
  const dustGeometry = new THREE.BufferGeometry()
  dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3))
  dustGeometry.setAttribute('aSize', new THREE.BufferAttribute(dustSizes, 1))
  dustGeometry.setAttribute('aGlow', new THREE.BufferAttribute(dustGlows, 1))
  const dustMaterial = makeParticleMaterial(new THREE.Color(0x91a6d8), 1, .34)
  field.add(new THREE.Points(dustGeometry, dustMaterial))
  disposables.push(dustGeometry)

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
      if (previousPointerLocal.x < 100) pointerVelocity = Math.min(2.8, pointerVelocity * .4 + previousPointerLocal.distanceTo(pointerLocal) * 3.8)
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

  const scatterParticle = (x: number, y: number, z: number, velocity: Float32Array, offset: number, radius: number, force: number) => {
    if (!pointerActive || mobile) return
    const dx = x - pointerLocal.x
    const dy = y - pointerLocal.y
    const d = Math.sqrt(dx * dx + dy * dy)
    if (d >= radius || d < .001) return
    const falloff = Math.pow(1 - d / radius, 2)
    const impulse = force * falloff * (.45 + pointerVelocity)
    velocity[offset] += dx / d * impulse - dy / d * impulse * .22
    velocity[offset + 1] += dy / d * impulse + dx / d * impulse * .22
    velocity[offset + 2] += (z >= 0 ? 1 : -1) * impulse * .2
  }

  const render = () => {
    const now = performance.now()
    const dt = Math.min((now - last) / 16.667, 2)
    last = now
    const t = clock.getElapsedTime()
    pointerVelocity *= .91

    clouds.forEach((cloud, ci) => {
      focusValues[ci] += (((focused === ci) ? 1 : 0) - focusValues[ci]) * .075
      const focus = focusValues[ci]
      const attr = cloud.geometry.getAttribute('position') as THREE.BufferAttribute

      for (let i = 0; i < cloud.count; i++) {
        const o = i * 3
        const bx = cloud.base[o], by = cloud.base[o + 1], bz = cloud.base[o + 2]
        const phase = cloud.phases[i]
        let x = attr.getX(i), y = attr.getY(i), z = attr.getZ(i)

        const idleX = reducedMotion ? 0 : Math.sin(t * (.32 + ci * .018) + phase + by * .27) * (.055 + focus * .035)
        const idleY = reducedMotion ? 0 : Math.cos(t * (.27 + ci * .015) + phase * 1.12 + bx * .25) * (.05 + focus * .035)
        const idleZ = reducedMotion ? 0 : Math.sin(t * .35 + phase * .72) * (.08 + focus * .05)
        const targetX = bx + idleX
        const targetY = by + idleY
        const targetZ = bz + idleZ

        scatterParticle(x, y, z, cloud.velocity, o, 1.55, .075)
        cloud.velocity[o] += (targetX - x) * (.0055 + focus * .0015) * dt
        cloud.velocity[o + 1] += (targetY - y) * (.0055 + focus * .0015) * dt
        cloud.velocity[o + 2] += (targetZ - z) * .0048 * dt
        cloud.velocity[o] *= .948
        cloud.velocity[o + 1] *= .948
        cloud.velocity[o + 2] *= .948
        x += cloud.velocity[o] * dt
        y += cloud.velocity[o + 1] * dt
        z += cloud.velocity[o + 2] * dt
        attr.setXYZ(i, x, y, z)
      }
      attr.needsUpdate = true

      const lineAttr = cloud.lineGeometry.getAttribute('position') as THREE.BufferAttribute
      cloud.lines.forEach(([a, b], index) => {
        const o = index * 2
        lineAttr.setXYZ(o, attr.getX(a), attr.getY(a), attr.getZ(a))
        lineAttr.setXYZ(o + 1, attr.getX(b), attr.getY(b), attr.getZ(b))
      })
      lineAttr.needsUpdate = true
      cloud.material.uniforms.uOpacity.value = (ci === 3 ? .84 : .72) + focus * .18
      cloud.material.uniforms.uPointScale.value = 1 + focus * .26
      cloud.lineMaterial.opacity = (ci === 3 ? .12 : .075) + focus * .09
    })

    for (let i = 0; i < dustCount; i++) {
      const o = i * 3
      let x = dustAttr.getX(i), y = dustAttr.getY(i), z = dustAttr.getZ(i)
      const bx = dustBase[o], by = dustBase[o + 1], bz = dustBase[o + 2]
      const p = dustPhases[i]
      const driftX = reducedMotion ? 0 : Math.sin(t * .17 + p + by * .07) * .04
      const driftY = reducedMotion ? 0 : Math.cos(t * .145 + p * 1.2 + bx * .06) * .035
      const driftZ = reducedMotion ? 0 : Math.sin(t * .12 + p) * .06
      scatterParticle(x, y, z, dustVelocity, o, 1.9, .11)
      dustVelocity[o] += (bx + driftX - x) * .0028 * dt
      dustVelocity[o + 1] += (by + driftY - y) * .0028 * dt
      dustVelocity[o + 2] += (bz + driftZ - z) * .0022 * dt
      dustVelocity[o] *= .965
      dustVelocity[o + 1] *= .965
      dustVelocity[o + 2] *= .965
      dustAttr.setXYZ(i, x + dustVelocity[o] * dt, y + dustVelocity[o + 1] * dt, z + dustVelocity[o + 2] * dt)
    }
    dustAttr.needsUpdate = true

    if (!reducedMotion) {
      field.rotation.y += ((mobile ? 0 : px * .045) + Math.sin(t * .07) * .018 - field.rotation.y) * .018
      field.rotation.x += ((mobile ? 0 : py * .022) + Math.cos(t * .08) * .01 - field.rotation.x) * .018
      field.rotation.z = Math.sin(t * .055) * .008
      field.position.y = (mobile ? .55 : .05) + Math.sin(t * .13) * .045
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
