<script setup lang="ts">
import * as THREE from 'three'

const canvas = ref<HTMLCanvasElement | null>(null)

let frame = 0
let renderer: THREE.WebGLRenderer | null = null
let resizeHandler: (() => void) | null = null
let pointerHandler: ((event: PointerEvent) => void) | null = null

let pointGeometry: THREE.BufferGeometry | null = null
let coreGeometry: THREE.BufferGeometry | null = null
let lineGeometry: THREE.BufferGeometry | null = null
let pointMaterial: THREE.PointsMaterial | null = null
let coreMaterial: THREE.PointsMaterial | null = null
let lineMaterial: THREE.LineBasicMaterial | null = null
let glowLineMaterial: THREE.LineBasicMaterial | null = null

const seededRandom = (() => {
  let seed = 128734
  return () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
})()

onMounted(() => {
  if (!canvas.value) return

  const mobile = window.innerWidth < 800
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(mobile ? 56 : 49, 1, 0.1, 100)
  camera.position.set(0, 0, mobile ? 7.1 : 8)

  renderer = new THREE.WebGLRenderer({
    canvas: canvas.value,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  })
  renderer.setClearColor(0x000000, 0)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.4 : 2))

  const group = new THREE.Group()
  group.position.set(mobile ? 1.1 : 2.15, mobile ? 0.25 : 0.08, 0)
  group.rotation.z = -0.06
  scene.add(group)

  const pointCount = mobile ? 105 : 190
  const basePoints: THREE.Vector3[] = []
  const pointPositions = new Float32Array(pointCount * 3)

  for (let i = 0; i < pointCount; i++) {
    const angle = seededRandom() * Math.PI * 2
    const radius = 0.6 + Math.pow(seededRandom(), 0.72) * (mobile ? 3.25 : 4.35)
    const point = new THREE.Vector3(
      Math.cos(angle) * radius * 1.28,
      Math.sin(angle) * radius * 0.72,
      (seededRandom() - 0.5) * 2
    )
    basePoints.push(point)
    pointPositions.set([point.x, point.y, point.z], i * 3)
  }

  const coreBase = [
    new THREE.Vector3(-1.55, 0.85, 0.25),
    new THREE.Vector3(0.05, 1.35, -0.15),
    new THREE.Vector3(1.6, 0.32, 0.1),
    new THREE.Vector3(0.7, -1.2, 0.35),
    new THREE.Vector3(-1.2, -1.05, -0.1)
  ]

  pointGeometry = new THREE.BufferGeometry()
  pointGeometry.setAttribute('position', new THREE.BufferAttribute(pointPositions, 3))
  pointMaterial = new THREE.PointsMaterial({
    color: 0xa7f3ff,
    size: mobile ? 0.08 : 0.072,
    sizeAttenuation: true,
    transparent: true,
    opacity: 1,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  })
  const points = new THREE.Points(pointGeometry, pointMaterial)
  group.add(points)

  coreGeometry = new THREE.BufferGeometry().setFromPoints(coreBase)
  coreMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: mobile ? 0.25 : 0.22,
    sizeAttenuation: true,
    transparent: true,
    opacity: 1,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  })
  const cores = new THREE.Points(coreGeometry, coreMaterial)
  group.add(cores)

  type Connection = [number, number]
  const connections: Connection[] = []
  const allBase = [...basePoints, ...coreBase]
  const coreOffset = pointCount

  for (let i = 0; i < pointCount; i++) {
    for (let j = i + 1; j < pointCount; j++) {
      const distance = basePoints[i].distanceTo(basePoints[j])
      if (distance < (mobile ? 1.02 : 1.14) && seededRandom() > 0.76) connections.push([i, j])
    }
  }

  coreBase.forEach((core, coreIndex) => {
    basePoints
      .map((point, index) => ({ index, distance: point.distanceTo(core) }))
      .filter(item => item.distance < 2.5)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, mobile ? 9 : 16)
      .forEach(item => connections.push([coreOffset + coreIndex, item.index]))
  })

  for (let i = 0; i < coreBase.length; i++) {
    connections.push([coreOffset + i, coreOffset + ((i + 1) % coreBase.length)])
    connections.push([coreOffset + i, coreOffset + ((i + 2) % coreBase.length)])
  }

  const linePositions = new Float32Array(connections.length * 6)
  lineGeometry = new THREE.BufferGeometry()
  lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3))

  glowLineMaterial = new THREE.LineBasicMaterial({
    color: 0x0b5cff,
    transparent: true,
    opacity: mobile ? 0.42 : 0.36,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  })
  const glowLines = new THREE.LineSegments(lineGeometry, glowLineMaterial)
  glowLines.scale.setScalar(1.01)
  group.add(glowLines)

  lineMaterial = new THREE.LineBasicMaterial({
    color: 0x7eeaff,
    transparent: true,
    opacity: mobile ? 0.8 : 0.74,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  })
  const lines = new THREE.LineSegments(lineGeometry, lineMaterial)
  group.add(lines)

  const pointer = new THREE.Vector2(2, 2)
  const targetRotation = new THREE.Vector2()
  const raycaster = new THREE.Raycaster()
  const interactionPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
  const pointerWorld = new THREE.Vector3(999, 999, 0)
  const pointerLocal = new THREE.Vector3(999, 999, 0)
  let pointerActive = false
  let hoverStrength = 0

  pointerHandler = (event: PointerEvent) => {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1
    targetRotation.y = pointer.x * (mobile ? 0.08 : 0.18)
    targetRotation.x = pointer.y * (mobile ? 0.04 : 0.09)
    pointerActive = true
  }
  window.addEventListener('pointermove', pointerHandler, { passive: true })

  resizeHandler = () => {
    if (!canvas.value || !renderer) return
    const rect = canvas.value.getBoundingClientRect()
    camera.aspect = rect.width / Math.max(rect.height, 1)
    camera.updateProjectionMatrix()
    renderer.setSize(rect.width, rect.height, false)
  }
  window.addEventListener('resize', resizeHandler)
  resizeHandler()

  const pointAttr = pointGeometry.getAttribute('position') as THREE.BufferAttribute
  const coreAttr = coreGeometry.getAttribute('position') as THREE.BufferAttribute
  const lineAttr = lineGeometry.getAttribute('position') as THREE.BufferAttribute
  const currentNodes = allBase.map(point => point.clone())
  const clock = new THREE.Clock()

  const render = () => {
    const t = clock.getElapsedTime()

    if (pointerActive) {
      raycaster.setFromCamera(pointer, camera)
      if (raycaster.ray.intersectPlane(interactionPlane, pointerWorld)) {
        pointerLocal.copy(pointerWorld)
        group.worldToLocal(pointerLocal)
      }
    }

    let nearestCoreDistance = Infinity

    for (let i = 0; i < pointCount; i++) {
      const base = basePoints[i]
      const phase = i * 0.37
      const waveX = prefersReducedMotion ? 0 : Math.sin(t * 0.42 + phase) * 0.045
      const waveY = prefersReducedMotion ? 0 : Math.cos(t * 0.5 + phase * 0.7) * 0.065
      const waveZ = prefersReducedMotion ? 0 : Math.sin(t * 0.32 + phase * 1.3) * 0.09

      let pushX = 0
      let pushY = 0
      let pushZ = 0
      if (pointerActive && !mobile) {
        const dx = base.x - pointerLocal.x
        const dy = base.y - pointerLocal.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        if (distance < 1.6) {
          const influence = (1 - distance / 1.6) ** 2
          const inv = distance > 0.001 ? 1 / distance : 0
          pushX = dx * inv * influence * 0.34
          pushY = dy * inv * influence * 0.34
          pushZ = influence * 0.45
        }
      }

      const x = base.x + waveX + pushX
      const y = base.y + waveY + pushY
      const z = base.z + waveZ + pushZ
      pointAttr.setXYZ(i, x, y, z)
      currentNodes[i].set(x, y, z)
    }
    pointAttr.needsUpdate = true

    for (let i = 0; i < coreBase.length; i++) {
      const base = coreBase[i]
      const pulse = prefersReducedMotion ? 0 : Math.sin(t * 0.8 + i * 1.2) * 0.06
      const x = base.x + Math.cos(t * 0.24 + i) * 0.035
      const y = base.y + pulse
      const z = base.z + Math.sin(t * 0.28 + i * 0.8) * 0.05
      coreAttr.setXYZ(i, x, y, z)
      currentNodes[coreOffset + i].set(x, y, z)
      if (pointerActive && !mobile) {
        nearestCoreDistance = Math.min(nearestCoreDistance, Math.hypot(x - pointerLocal.x, y - pointerLocal.y))
      }
    }
    coreAttr.needsUpdate = true

    connections.forEach(([aIndex, bIndex], index) => {
      const a = currentNodes[aIndex]
      const b = currentNodes[bIndex]
      const offset = index * 2
      lineAttr.setXYZ(offset, a.x, a.y, a.z)
      lineAttr.setXYZ(offset + 1, b.x, b.y, b.z)
    })
    lineAttr.needsUpdate = true

    const hovered = nearestCoreDistance < 1.05
    const targetHover = hovered ? 1 : 0
    hoverStrength += (targetHover - hoverStrength) * 0.12

    if (!prefersReducedMotion) {
      const idleY = Math.sin(t * 0.2) * 0.05
      const idleX = Math.cos(t * 0.17) * 0.024
      group.rotation.y += (targetRotation.y + idleY - group.rotation.y) * 0.026
      group.rotation.x += (targetRotation.x + idleX - group.rotation.x) * 0.026
      group.rotation.z = -0.06 + Math.sin(t * 0.18) * 0.02
      group.position.y = (mobile ? 0.25 : 0.08) + Math.sin(t * 0.31) * 0.07
    }

    if (coreMaterial) coreMaterial.size = (mobile ? 0.25 : 0.22) + hoverStrength * 0.12 + Math.sin(t * 1.6) * 0.018
    if (pointMaterial) pointMaterial.size = (mobile ? 0.08 : 0.072) + hoverStrength * 0.014
    if (lineMaterial) lineMaterial.opacity = (mobile ? 0.8 : 0.74) + hoverStrength * 0.18 + Math.sin(t * 0.8) * 0.05
    if (glowLineMaterial) glowLineMaterial.opacity = (mobile ? 0.42 : 0.36) + hoverStrength * 0.22

    renderer?.render(scene, camera)
    frame = requestAnimationFrame(render)
  }

  render()
})

onBeforeUnmount(() => {
  cancelAnimationFrame(frame)
  if (pointerHandler) window.removeEventListener('pointermove', pointerHandler)
  if (resizeHandler) window.removeEventListener('resize', resizeHandler)
  pointGeometry?.dispose()
  coreGeometry?.dispose()
  lineGeometry?.dispose()
  pointMaterial?.dispose()
  coreMaterial?.dispose()
  lineMaterial?.dispose()
  glowLineMaterial?.dispose()
  renderer?.dispose()
})
</script>

<template>
  <canvas ref="canvas" class="webgl-canvas" aria-hidden="true" />
</template>
