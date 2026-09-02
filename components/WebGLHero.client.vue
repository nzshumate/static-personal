<script setup lang="ts">
import * as THREE from 'three'

let frame = 0
let renderer: THREE.WebGLRenderer | null = null
let resizeHandler: (() => void) | null = null
let pointerHandler: ((event: PointerEvent) => void) | null = null
const disposables: Array<THREE.BufferGeometry | THREE.Material> = []

onMounted(async () => {
  await nextTick()
  const canvas = document.getElementById('webgl-hero-canvas') as HTMLCanvasElement | null
  if (!canvas) return

  const mobile = window.innerWidth < 800
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(mobile ? 56 : 48, 1, 0.1, 50)
  camera.position.z = mobile ? 8.5 : 9

  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' })
  renderer.setClearColor(0x000000, 0)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.25 : 1.75))
  renderer.outputColorSpace = THREE.SRGBColorSpace

  const field = new THREE.Group()
  field.position.set(mobile ? 1.2 : 2.75, mobile ? 0.65 : 0.1, 0)
  scene.add(field)

  let seed = 982451653
  const random = () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }

  const hubs = [
    new THREE.Vector3(-1.8, 1.2, 0.15),
    new THREE.Vector3(0.1, 1.55, -0.15),
    new THREE.Vector3(1.75, 0.65, 0.2),
    new THREE.Vector3(1.05, -1.25, -0.05),
    new THREE.Vector3(-1.25, -1.2, 0.2)
  ]

  const count = mobile ? 110 : 260
  const base = new Float32Array(count * 3)
  const positions = new Float32Array(count * 3)
  const phases = new Float32Array(count)

  for (let i = 0; i < count; i++) {
    const hub = hubs[Math.floor(random() * hubs.length)]
    const spread = 0.35 + random() * 1.45
    const angle = random() * Math.PI * 2
    const x = hub.x + Math.cos(angle) * spread * (0.7 + random() * 0.7)
    const y = hub.y + Math.sin(angle) * spread * (0.45 + random() * 0.55)
    const z = (random() - 0.5) * 2.1
    base.set([x, y, z], i * 3)
    positions.set([x, y, z], i * 3)
    phases[i] = random() * Math.PI * 2
  }

  const particleGeometry = new THREE.BufferGeometry()
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const particleMaterial = new THREE.PointsMaterial({
    color: 0x8defff,
    size: mobile ? 0.045 : 0.038,
    transparent: true,
    opacity: 0.72,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true
  })
  disposables.push(particleGeometry, particleMaterial)
  field.add(new THREE.Points(particleGeometry, particleMaterial))

  const hubGeometry = new THREE.BufferGeometry().setFromPoints(hubs)
  const hubMaterial = new THREE.PointsMaterial({
    color: 0xe8fdff,
    size: mobile ? 0.18 : 0.15,
    transparent: true,
    opacity: 0.92,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true
  })
  disposables.push(hubGeometry, hubMaterial)
  field.add(new THREE.Points(hubGeometry, hubMaterial))

  const connections: Array<[number, number]> = []
  for (let i = 0; i < count; i++) {
    let nearest = -1
    let nearestDistance = 0.72
    const ix = base[i * 3]
    const iy = base[i * 3 + 1]
    const iz = base[i * 3 + 2]
    for (let j = i + 1; j < count; j++) {
      const dx = ix - base[j * 3]
      const dy = iy - base[j * 3 + 1]
      const dz = iz - base[j * 3 + 2]
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz)
      if (d < nearestDistance) {
        nearestDistance = d
        nearest = j
      }
    }
    if (nearest >= 0 && random() > 0.28) connections.push([i, nearest])
  }

  const linePositions = new Float32Array(connections.length * 6)
  const lineGeometry = new THREE.BufferGeometry()
  lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3))
  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0x36b9e8,
    transparent: true,
    opacity: mobile ? 0.16 : 0.2,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  })
  disposables.push(lineGeometry, lineMaterial)
  field.add(new THREE.LineSegments(lineGeometry, lineMaterial))

  const hubLines: number[] = []
  for (let i = 0; i < hubs.length; i++) {
    const a = hubs[i]
    const b = hubs[(i + 1) % hubs.length]
    hubLines.push(a.x, a.y, a.z, b.x, b.y, b.z)
  }
  const hubLineGeometry = new THREE.BufferGeometry()
  hubLineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(hubLines, 3))
  const hubLineMaterial = new THREE.LineBasicMaterial({ color: 0x56d8ff, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false })
  disposables.push(hubLineGeometry, hubLineMaterial)
  field.add(new THREE.LineSegments(hubLineGeometry, hubLineMaterial))

  const pointer = new THREE.Vector2(2, 2)
  const pointerWorld = new THREE.Vector3(999, 999, 0)
  const pointerLocal = new THREE.Vector3(999, 999, 0)
  const raycaster = new THREE.Raycaster()
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
  let pointerActive = false
  let targetX = 0
  let targetY = 0

  pointerHandler = (event: PointerEvent) => {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1
    targetX = pointer.x
    targetY = pointer.y
    pointerActive = true
  }
  window.addEventListener('pointermove', pointerHandler, { passive: true })

  resizeHandler = () => {
    if (!renderer) return
    const rect = canvas.getBoundingClientRect()
    camera.aspect = rect.width / Math.max(rect.height, 1)
    camera.updateProjectionMatrix()
    renderer.setSize(rect.width, rect.height, false)
  }
  window.addEventListener('resize', resizeHandler)
  resizeHandler()

  const particleAttr = particleGeometry.getAttribute('position') as THREE.BufferAttribute
  const lineAttr = lineGeometry.getAttribute('position') as THREE.BufferAttribute
  const clock = new THREE.Clock()

  const render = () => {
    const t = clock.getElapsedTime()
    let proximity = 0

    if (pointerActive && !mobile) {
      raycaster.setFromCamera(pointer, camera)
      if (raycaster.ray.intersectPlane(plane, pointerWorld)) {
        pointerLocal.copy(pointerWorld)
        field.worldToLocal(pointerLocal)
      }
    }

    for (let i = 0; i < count; i++) {
      const bx = base[i * 3]
      const by = base[i * 3 + 1]
      const bz = base[i * 3 + 2]
      const phase = phases[i]
      let x = bx
      let y = by
      let z = bz

      if (!reducedMotion) {
        x += Math.sin(t * 0.28 + phase) * 0.035
        y += Math.cos(t * 0.34 + phase * 1.17) * 0.045
        z += Math.sin(t * 0.22 + phase * 0.81) * 0.06
      }

      if (pointerActive && !mobile) {
        const dx = pointerLocal.x - x
        const dy = pointerLocal.y - y
        const distance = Math.sqrt(dx * dx + dy * dy)
        if (distance < 1.25) {
          const influence = (1 - distance / 1.25) ** 2
          x += dx * influence * 0.11
          y += dy * influence * 0.11
          z += influence * 0.22
          proximity = Math.max(proximity, influence)
        }
      }

      particleAttr.setXYZ(i, x, y, z)
    }
    particleAttr.needsUpdate = true

    connections.forEach(([a, b], index) => {
      const offset = index * 2
      lineAttr.setXYZ(offset, particleAttr.getX(a), particleAttr.getY(a), particleAttr.getZ(a))
      lineAttr.setXYZ(offset + 1, particleAttr.getX(b), particleAttr.getY(b), particleAttr.getZ(b))
    })
    lineAttr.needsUpdate = true

    if (!reducedMotion) {
      field.rotation.y += ((mobile ? 0 : targetX * 0.07) + Math.sin(t * 0.12) * 0.018 - field.rotation.y) * 0.025
      field.rotation.x += ((mobile ? 0 : targetY * 0.035) + Math.cos(t * 0.1) * 0.01 - field.rotation.x) * 0.025
      field.position.y = (mobile ? 0.65 : 0.1) + Math.sin(t * 0.2) * 0.045
    }

    particleMaterial.opacity = 0.7 + proximity * 0.22
    particleMaterial.size = (mobile ? 0.045 : 0.038) + proximity * 0.012
    lineMaterial.opacity = (mobile ? 0.16 : 0.2) + proximity * 0.2
    hubMaterial.size = (mobile ? 0.18 : 0.15) + Math.sin(t * 1.1) * 0.008 + proximity * 0.04

    renderer?.render(scene, camera)
    frame = requestAnimationFrame(render)
  }

  render()
})

onBeforeUnmount(() => {
  cancelAnimationFrame(frame)
  if (pointerHandler) window.removeEventListener('pointermove', pointerHandler)
  if (resizeHandler) window.removeEventListener('resize', resizeHandler)
  disposables.forEach(item => item.dispose())
  renderer?.dispose()
})
</script>

<template>
  <canvas
    id="webgl-hero-canvas"
    aria-hidden="true"
    style="position:absolute;inset:0;width:100%;height:100%;z-index:1;opacity:1;pointer-events:none"
  />
</template>
