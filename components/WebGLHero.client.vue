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
  const camera = new THREE.PerspectiveCamera(mobile ? 58 : 47, 1, 0.1, 60)
  camera.position.z = mobile ? 9 : 9.5

  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' })
  renderer.setClearColor(0x000000, 0)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.2 : 1.65))
  renderer.outputColorSpace = THREE.SRGBColorSpace

  const field = new THREE.Group()
  field.position.set(mobile ? 1.35 : 2.9, mobile ? 0.55 : 0.05, 0)
  scene.add(field)

  let seed = 19349663
  const random = () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }

  // Five softly defined regions arranged around an open center, matching the original concept.
  const centers = [
    new THREE.Vector3(-1.55, 1.75, 0.1),
    new THREE.Vector3(1.35, 2.0, -0.15),
    new THREE.Vector3(2.35, 0.25, 0.15),
    new THREE.Vector3(0.75, -1.75, 0.05),
    new THREE.Vector3(-1.65, -1.4, -0.1)
  ]
  const colors = [0x477dff, 0xddeaff, 0x4c9cff, 0xffc8a6, 0x4386ff]
  const counts = mobile ? [45, 38, 42, 44, 41] : [130, 105, 125, 135, 120]

  type Cluster = {
    base: Float32Array
    phases: Float32Array
    geometry: THREE.BufferGeometry
    material: THREE.PointsMaterial
    connections: Array<[number, number]>
    lineGeometry: THREE.BufferGeometry
    lineMaterial: THREE.LineBasicMaterial
  }
  const clusters: Cluster[] = []

  centers.forEach((center, clusterIndex) => {
    const count = counts[clusterIndex]
    const base = new Float32Array(count * 3)
    const positions = new Float32Array(count * 3)
    const phases = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      const angle = random() * Math.PI * 2
      const radius = Math.pow(random(), 0.7) * (clusterIndex === 3 ? 1.65 : 1.35)
      const curl = angle + radius * (clusterIndex % 2 ? 1.1 : -1.15)
      const x = center.x + Math.cos(curl) * radius * (0.65 + random() * 0.45)
      const y = center.y + Math.sin(curl) * radius * (0.5 + random() * 0.5)
      const z = (random() - 0.5) * 2.6 + Math.sin(angle * 2) * 0.18
      base.set([x, y, z], i * 3)
      positions.set([x, y, z], i * 3)
      phases[i] = random() * Math.PI * 2
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const material = new THREE.PointsMaterial({
      color: colors[clusterIndex], size: mobile ? 0.042 : 0.032, transparent: true,
      opacity: clusterIndex === 3 ? 0.72 : 0.66, blending: THREE.AdditiveBlending,
      depthWrite: false, sizeAttenuation: true
    })
    field.add(new THREE.Points(geometry, material))

    const connections: Array<[number, number]> = []
    for (let i = 0; i < count; i++) {
      let best = -1
      let bestD = mobile ? 0.62 : 0.48
      const ix = base[i * 3], iy = base[i * 3 + 1], iz = base[i * 3 + 2]
      for (let j = i + 1; j < count; j++) {
        const dx = ix - base[j * 3], dy = iy - base[j * 3 + 1], dz = iz - base[j * 3 + 2]
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz)
        if (d < bestD) { bestD = d; best = j }
      }
      if (best >= 0 && random() > 0.18) connections.push([i, best])
    }

    const lineGeometry = new THREE.BufferGeometry()
    lineGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(connections.length * 6), 3))
    const lineMaterial = new THREE.LineBasicMaterial({
      color: colors[clusterIndex], transparent: true, opacity: mobile ? 0.11 : 0.14,
      blending: THREE.AdditiveBlending, depthWrite: false
    })
    field.add(new THREE.LineSegments(lineGeometry, lineMaterial))
    disposables.push(geometry, material, lineGeometry, lineMaterial)
    clusters.push({ base, phases, geometry, material, connections, lineGeometry, lineMaterial })
  })

  // A broad dust layer gives the field depth instead of reading as five diagrams.
  const dustCount = mobile ? 160 : 520
  const dustPositions = new Float32Array(dustCount * 3)
  const dustBase = new Float32Array(dustCount * 3)
  const dustPhases = new Float32Array(dustCount)
  for (let i = 0; i < dustCount; i++) {
    const angle = random() * Math.PI * 2
    const radius = 1.5 + random() * 3.6
    const x = Math.cos(angle) * radius * 0.85
    const y = Math.sin(angle) * radius * 0.62
    const z = (random() - 0.5) * 4.5
    dustBase.set([x, y, z], i * 3)
    dustPositions.set([x, y, z], i * 3)
    dustPhases[i] = random() * Math.PI * 2
  }
  const dustGeometry = new THREE.BufferGeometry()
  dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3))
  const dustMaterial = new THREE.PointsMaterial({ color: 0x86a7d7, size: mobile ? 0.026 : 0.018, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false })
  field.add(new THREE.Points(dustGeometry, dustMaterial))
  disposables.push(dustGeometry, dustMaterial)

  const pointer = new THREE.Vector2(2, 2)
  const pointerWorld = new THREE.Vector3(999, 999, 0)
  const pointerLocal = new THREE.Vector3(999, 999, 0)
  const raycaster = new THREE.Raycaster()
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
  let pointerActive = false
  let px = 0, py = 0

  pointerHandler = (event: PointerEvent) => {
    pointer.x = event.clientX / window.innerWidth * 2 - 1
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1
    px = pointer.x; py = pointer.y; pointerActive = true
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

  const dustAttr = dustGeometry.getAttribute('position') as THREE.BufferAttribute
  const clock = new THREE.Clock()

  const render = () => {
    const t = clock.getElapsedTime()
    if (pointerActive && !mobile) {
      raycaster.setFromCamera(pointer, camera)
      if (raycaster.ray.intersectPlane(plane, pointerWorld)) {
        pointerLocal.copy(pointerWorld)
        field.worldToLocal(pointerLocal)
      }
    }

    clusters.forEach((cluster, ci) => {
      const attr = cluster.geometry.getAttribute('position') as THREE.BufferAttribute
      let localInfluence = 0
      const count = counts[ci]
      for (let i = 0; i < count; i++) {
        const bx = cluster.base[i * 3], by = cluster.base[i * 3 + 1], bz = cluster.base[i * 3 + 2]
        const phase = cluster.phases[i]
        let x = bx, y = by, z = bz
        if (!reducedMotion) {
          // Layered orbital/curl motion makes each cloud breathe and flow.
          x += Math.sin(t * (0.34 + ci * 0.018) + phase + by * 0.32) * 0.075
          y += Math.cos(t * (0.29 + ci * 0.015) + phase * 1.13 + bx * 0.28) * 0.07
          z += Math.sin(t * 0.38 + phase * 0.7) * 0.11
        }
        if (pointerActive && !mobile) {
          const dx = pointerLocal.x - x, dy = pointerLocal.y - y
          const d = Math.sqrt(dx * dx + dy * dy)
          if (d < 1.55) {
            const influence = (1 - d / 1.55) ** 2
            // Tangential motion creates a visible wake around the cursor.
            x += dx * influence * 0.08 - dy * influence * 0.16
            y += dy * influence * 0.08 + dx * influence * 0.16
            z += influence * 0.34
            localInfluence = Math.max(localInfluence, influence)
          }
        }
        attr.setXYZ(i, x, y, z)
      }
      attr.needsUpdate = true

      const lineAttr = cluster.lineGeometry.getAttribute('position') as THREE.BufferAttribute
      cluster.connections.forEach(([a, b], index) => {
        const o = index * 2
        lineAttr.setXYZ(o, attr.getX(a), attr.getY(a), attr.getZ(a))
        lineAttr.setXYZ(o + 1, attr.getX(b), attr.getY(b), attr.getZ(b))
      })
      lineAttr.needsUpdate = true
      cluster.material.opacity = (ci === 3 ? 0.72 : 0.66) + localInfluence * 0.24
      cluster.material.size = (mobile ? 0.042 : 0.032) + localInfluence * 0.018
      cluster.lineMaterial.opacity = (mobile ? 0.11 : 0.14) + localInfluence * 0.24
    })

    for (let i = 0; i < dustCount; i++) {
      const phase = dustPhases[i]
      const bx = dustBase[i * 3], by = dustBase[i * 3 + 1], bz = dustBase[i * 3 + 2]
      const drift = reducedMotion ? 0 : 1
      dustAttr.setXYZ(i,
        bx + Math.sin(t * 0.16 + phase) * 0.06 * drift,
        by + Math.cos(t * 0.14 + phase * 1.2) * 0.05 * drift,
        bz + Math.sin(t * 0.11 + phase) * 0.08 * drift)
    }
    dustAttr.needsUpdate = true

    if (!reducedMotion) {
      field.rotation.y += ((mobile ? 0 : px * 0.095) + Math.sin(t * 0.09) * 0.025 - field.rotation.y) * 0.022
      field.rotation.x += ((mobile ? 0 : py * 0.045) + Math.cos(t * 0.08) * 0.015 - field.rotation.x) * 0.022
      field.rotation.z = Math.sin(t * 0.075) * 0.012
      field.position.y = (mobile ? 0.55 : 0.05) + Math.sin(t * 0.18) * 0.07
    }

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
  <canvas id="webgl-hero-canvas" aria-hidden="true" style="position:absolute;inset:0;width:100%;height:100%;z-index:1;opacity:1;pointer-events:none" />
</template>
