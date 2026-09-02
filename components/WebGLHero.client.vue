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
const disposables: Array<THREE.BufferGeometry | THREE.Material | THREE.Texture> = []

const particleVertex = `
uniform float uPixelRatio;
uniform float uScale;
attribute float aSize;
attribute float aGlow;
varying float vGlow;
void main(){
  vec4 mv=modelViewMatrix*vec4(position,1.0);
  gl_Position=projectionMatrix*mv;
  gl_PointSize=aSize*uScale*uPixelRatio*(9.0/max(2.5,-mv.z));
  vGlow=aGlow;
}`

const particleFragment = `
uniform vec3 uColor;
uniform float uOpacity;
varying float vGlow;
void main(){
  vec2 p=gl_PointCoord-.5;
  float d=length(p);
  float core=1.0-smoothstep(.015,.085,d);
  float halo=1.0-smoothstep(.07,.5,d);
  float a=(core*1.65+halo*(.26+vGlow*.74))*uOpacity;
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
  camera.position.z = mobile ? 9.6 : 10.6

  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' })
  renderer.setClearColor(0x000000, 0)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.1 : 1.5))
  renderer.outputColorSpace = THREE.SRGBColorSpace

  composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.9, 0.9, 0.01)
  bloom.strength = mobile ? 0.48 : 0.78
  bloom.radius = 0.92
  bloom.threshold = 0
  composer.addPass(bloom)

  const field = new THREE.Group()
  field.position.set(mobile ? 1.35 : 2.68, mobile ? 0.55 : 0.03, 0)
  scene.add(field)

  let seed = 91873
  const random = () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }

  const centers = [
    new THREE.Vector3(-1.55, 1.55, 0.0),
    new THREE.Vector3(1.32, 1.92, -0.25),
    new THREE.Vector3(2.28, 0.2, 0.05),
    new THREE.Vector3(0.88, -1.72, 0.05),
    new THREE.Vector3(-1.42, -1.48, -0.08)
  ]
  const palette = [
    new THREE.Color(0x4969ff),
    new THREE.Color(0xeef3ff),
    new THREE.Color(0x4b82ff),
    new THREE.Color(0xff9565),
    new THREE.Color(0x687fff)
  ]
  const counts = mobile ? [70, 58, 66, 72, 66] : [185, 155, 175, 195, 170]
  const focusValues = [0, 0, 0, 0, 0]
  let focused = -1

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

  const nebulaCanvas = document.createElement('canvas')
  nebulaCanvas.width = 256
  nebulaCanvas.height = 256
  const ctx = nebulaCanvas.getContext('2d')!
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128)
  g.addColorStop(0, 'rgba(255,255,255,.9)')
  g.addColorStop(.12, 'rgba(255,255,255,.5)')
  g.addColorStop(.38, 'rgba(255,255,255,.16)')
  g.addColorStop(.7, 'rgba(255,255,255,.045)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 256, 256)
  const nebulaTexture = new THREE.CanvasTexture(nebulaCanvas)
  nebulaTexture.colorSpace = THREE.SRGBColorSpace
  disposables.push(nebulaTexture)

  type Nebula = { sprite: THREE.Sprite; material: THREE.SpriteMaterial; baseScale: THREE.Vector3; phase: number; cluster: number }
  const nebulae: Nebula[] = []

  centers.forEach((center, ci) => {
    const layers = mobile ? 2 : 5
    for (let n = 0; n < layers; n++) {
      const color = palette[ci].clone().lerp(new THREE.Color(0xffffff), n % 3 === 0 ? 0.18 : 0.03)
      const material = new THREE.SpriteMaterial({ map: nebulaTexture, color, transparent: true, opacity: mobile ? 0.07 : 0.095 + random() * 0.055, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false })
      const sprite = new THREE.Sprite(material)
      sprite.position.copy(center).add(new THREE.Vector3((random() - 0.5) * 1.5, (random() - 0.5) * 1.15, -0.7 - random() * 1.7))
      const sx = 2.4 + random() * 2.4
      const sy = sx * (0.55 + random() * 0.45)
      sprite.scale.set(sx, sy, 1)
      sprite.material.rotation = random() * Math.PI
      field.add(sprite)
      nebulae.push({ sprite, material, baseScale: sprite.scale.clone(), phase: random() * Math.PI * 2, cluster: ci })
      disposables.push(material)
    }
  })

  for (let i = 0; i < (mobile ? 2 : 7); i++) {
    const material = new THREE.SpriteMaterial({ map: nebulaTexture, color: i % 3 === 2 ? 0xa3b6ff : 0x5c73cf, transparent: true, opacity: mobile ? 0.025 : 0.035 + random() * 0.025, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false })
    const sprite = new THREE.Sprite(material)
    sprite.position.set((random() - .5) * 4.8, (random() - .5) * 3.5, -2.2 - random() * 1.8)
    const sx = 4 + random() * 4
    sprite.scale.set(sx, sx * (.35 + random() * .35), 1)
    sprite.material.rotation = random() * Math.PI
    field.add(sprite)
    nebulae.push({ sprite, material, baseScale: sprite.scale.clone(), phase: random() * Math.PI * 2, cluster: -1 })
    disposables.push(material)
  }

  type Cloud = {
    count: number
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
      const ring = Math.pow(random(), .84) * (ci === 3 ? 1.8 : 1.52)
      const twist = angle + ring * (ci % 2 ? 1.85 : -1.58)
      const x = center.x + Math.cos(twist) * ring * (.5 + random() * .55)
      const y = center.y + Math.sin(twist) * ring * (.38 + random() * .52)
      const z = (random() - .5) * 3.8 + Math.sin(angle * 2.1) * .32
      positions.set([x, y, z], i * 3)
      base.set([x, y, z], i * 3)
      phases[i] = random() * Math.PI * 2
      sizes[i] = mobile ? 2.3 + random() * 4.2 : 1.5 + random() * 4.4
      glows[i] = random() > .9 ? .8 + random() * .8 : random() * .16
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
    geometry.setAttribute('aGlow', new THREE.BufferAttribute(glows, 1))
    const material = makePointMaterial(palette[ci], ci === 3 ? .8 : .68)
    field.add(new THREE.Points(geometry, material))

    const links: Array<[number, number]> = []
    for (let i = 0; i < count; i++) {
      if (random() > .2) continue
      let nearest = -1
      let nearestD = .42
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
    const linkMaterial = new THREE.LineBasicMaterial({ color: palette[ci], transparent: true, opacity: ci === 3 ? .07 : .04, blending: THREE.AdditiveBlending, depthWrite: false })
    field.add(new THREE.LineSegments(linkGeometry, linkMaterial))

    const trailIndices = Array.from({ length: mobile ? 18 : 70 }, () => Math.floor(random() * count))
    const trailGeometry = new THREE.BufferGeometry()
    trailGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(trailIndices.length * 6), 3))
    const trailMaterial = new THREE.LineBasicMaterial({ color: palette[ci].clone().lerp(new THREE.Color(0xffffff), .35), transparent: true, opacity: .035, blending: THREE.AdditiveBlending, depthWrite: false })
    field.add(new THREE.LineSegments(trailGeometry, trailMaterial))

    disposables.push(geometry, linkGeometry, linkMaterial, trailGeometry, trailMaterial)
    clouds.push({ count, base, velocity, phases, geometry, material, links, linkGeometry, linkMaterial, trailIndices, trailGeometry, trailMaterial })
  })

  const dustCount = mobile ? 520 : 2300
  const dustPositions = new Float32Array(dustCount * 3)
  const dustBase = new Float32Array(dustCount * 3)
  const dustVelocity = new Float32Array(dustCount * 3)
  const dustPhases = new Float32Array(dustCount)
  const dustSizes = new Float32Array(dustCount)
  const dustGlows = new Float32Array(dustCount)
  for (let i = 0; i < dustCount; i++) {
    const useCluster = random() < .74
    let x: number, y: number, z: number
    if (useCluster) {
      const ci = Math.floor(random() * centers.length)
      const c = centers[ci]
      const angle = random() * Math.PI * 2
      const r = Math.pow(random(), .72) * 2.1
      x = c.x + Math.cos(angle) * r * (.55 + random() * .65)
      y = c.y + Math.sin(angle) * r * (.35 + random() * .55)
      z = (random() - .5) * 5.2
    } else {
      const angle = random() * Math.PI * 2
      const r = .3 + Math.pow(random(), .62) * 5.5
      x = Math.cos(angle) * r * .98
      y = Math.sin(angle) * r * .64
      z = (random() - .5) * 6.2
    }
    dustPositions.set([x, y, z], i * 3)
    dustBase.set([x, y, z], i * 3)
    dustPhases[i] = random() * Math.PI * 2
    const bright = random()
    dustSizes[i] = bright > .965 ? 4.2 + random() * 4.8 : mobile ? .9 + random() * 2.4 : .65 + random() * 2.1
    dustGlows[i] = bright > .965 ? 1.7 : bright > .88 ? .55 : .08 + random() * .14
  }
  const dustGeometry = new THREE.BufferGeometry()
  dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3))
  dustGeometry.setAttribute('aSize', new THREE.BufferAttribute(dustSizes, 1))
  dustGeometry.setAttribute('aGlow', new THREE.BufferAttribute(dustGlows, 1))
  const dustMaterial = makePointMaterial(new THREE.Color(0xc5d3ff), .48)
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
      if (previousPointerLocal.x < 100) pointerVelocity = Math.min(1.6, pointerVelocity * .45 + previousPointerLocal.distanceTo(pointerLocal) * 2.2)
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
    if (d >= radius || d < .001) return
    const falloff = Math.pow(1 - d / radius, 2.35)
    const impulse = force * falloff * (.3 + pointerVelocity * .75)
    const nx = dx / d, ny = dy / d
    velocity[o] += nx * impulse - ny * impulse * .07
    velocity[o + 1] += ny * impulse + nx * impulse * .07
    velocity[o + 2] += (z >= 0 ? 1 : -1) * impulse * .08
  }

  const render = () => {
    const now = performance.now()
    const dt = Math.min((now - last) / 16.667, 2)
    last = now
    const t = clock.getElapsedTime()
    pointerVelocity *= .86

    clouds.forEach((cloud, ci) => {
      focusValues[ci] += (((focused === ci) ? 1 : 0) - focusValues[ci]) * .075
      const focus = focusValues[ci]
      const attr = cloud.geometry.getAttribute('position') as THREE.BufferAttribute

      for (let i = 0; i < cloud.count; i++) {
        const o = i * 3
        const bx = cloud.base[o], by = cloud.base[o + 1], bz = cloud.base[o + 2]
        const p = cloud.phases[i]
        let x = attr.getX(i), y = attr.getY(i), z = attr.getZ(i)
        const tx = bx + (reducedMotion ? 0 : Math.sin(t * (.28 + ci * .016) + p + by * .22) * (.045 + focus * .025))
        const ty = by + (reducedMotion ? 0 : Math.cos(t * (.24 + ci * .014) + p * 1.13 + bx * .21) * (.04 + focus * .025))
        const tz = bz + (reducedMotion ? 0 : Math.sin(t * .31 + p * .74) * (.07 + focus * .04))
        scatter(x, y, z, cloud.velocity, o, 1.35, .055)
        cloud.velocity[o] += (tx - x) * .0058 * dt
        cloud.velocity[o + 1] += (ty - y) * .0058 * dt
        cloud.velocity[o + 2] += (tz - z) * .0052 * dt
        cloud.velocity[o] *= .95
        cloud.velocity[o + 1] *= .95
        cloud.velocity[o + 2] *= .95
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
      cloud.trailIndices.forEach((pi, idx) => {
        const po = pi * 3
        const x = attr.getX(pi), y = attr.getY(pi), z = attr.getZ(pi)
        const len = 1.8 + Math.min(1.1, Math.hypot(cloud.velocity[po], cloud.velocity[po + 1]) * 7) * 2.2
        const o = idx * 2
        trailAttr.setXYZ(o, x, y, z)
        trailAttr.setXYZ(o + 1, x - cloud.velocity[po] * len, y - cloud.velocity[po + 1] * len, z - cloud.velocity[po + 2] * len)
      })
      trailAttr.needsUpdate = true
      cloud.material.uniforms.uOpacity.value = (ci === 3 ? .8 : .68) + focus * .18
      cloud.material.uniforms.uScale.value = 1 + focus * .2
      cloud.linkMaterial.opacity = (ci === 3 ? .07 : .04) + focus * .04
      cloud.trailMaterial.opacity = .015 + Math.min(.1, pointerVelocity * .045) + focus * .02
    })

    for (let i = 0; i < dustCount; i++) {
      const o = i * 3
      const p = dustPhases[i]
      let x = dustAttr.getX(i), y = dustAttr.getY(i), z = dustAttr.getZ(i)
      const bx = dustBase[o], by = dustBase[o + 1], bz = dustBase[o + 2]
      const tx = bx + (reducedMotion ? 0 : Math.sin(t * .105 + p + by * .04) * .055)
      const ty = by + (reducedMotion ? 0 : Math.cos(t * .09 + p * 1.2 + bx * .04) * .05)
      const tz = bz + (reducedMotion ? 0 : Math.sin(t * .08 + p) * .075)
      scatter(x, y, z, dustVelocity, o, 1.55, .04)
      dustVelocity[o] += (tx - x) * .0038 * dt
      dustVelocity[o + 1] += (ty - y) * .0038 * dt
      dustVelocity[o + 2] += (tz - z) * .0034 * dt
      dustVelocity[o] *= .955
      dustVelocity[o + 1] *= .955
      dustVelocity[o + 2] *= .955
      x += dustVelocity[o] * dt
      y += dustVelocity[o + 1] * dt
      z += dustVelocity[o + 2] * dt
      dustAttr.setXYZ(i, x, y, z)
    }
    dustAttr.needsUpdate = true
    dustMaterial.uniforms.uOpacity.value = .48 + Math.min(.07, pointerVelocity * .02)

    nebulae.forEach((n, i) => {
      const focus = n.cluster >= 0 ? focusValues[n.cluster] : 0
      const breathe = reducedMotion ? 1 : 1 + Math.sin(t * .17 + n.phase) * .045
      const active = 1 + focus * .12
      n.sprite.scale.set(n.baseScale.x * breathe * active, n.baseScale.y * breathe * active, 1)
      n.material.opacity = (n.cluster < 0 ? .045 : .1) + focus * .055 + Math.sin(t * .13 + i) * .008
      if (!reducedMotion) n.material.rotation += .00018 * (i % 2 ? 1 : -1)
    })

    if (!reducedMotion) {
      field.rotation.y += ((mobile ? 0 : px * .055) + Math.sin(t * .07) * .018 - field.rotation.y) * .018
      field.rotation.x += ((mobile ? 0 : py * .025) + Math.cos(t * .06) * .012 - field.rotation.x) * .018
      field.position.y = (mobile ? .55 : .03) + Math.sin(t * .16) * .045
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
