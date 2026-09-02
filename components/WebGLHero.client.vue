<script setup lang="ts">
import * as THREE from 'three'

const canvas = ref<HTMLCanvasElement | null>(null)

let frame = 0
let renderer: THREE.WebGLRenderer | null = null
let pointGeometry: THREE.BufferGeometry | null = null
let pointMaterial: THREE.PointsMaterial | null = null
let coreGeometry: THREE.BufferGeometry | null = null
let coreMaterial: THREE.PointsMaterial | null = null
let lineGeometry: THREE.BufferGeometry | null = null
let lineMaterial: THREE.LineBasicMaterial | null = null
let onPointerMove: ((event: PointerEvent) => void) | null = null
let resize: (() => void) | null = null

const seededRandom = (() => {
  let seed = 128734
  return () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
})()

onMounted(() => {
  if (!canvas.value) return

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const mobile = window.innerWidth < 800
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(mobile ? 56 : 50, 1, 0.1, 100)
  camera.position.set(0, 0, mobile ? 7.4 : 8.2)

  renderer = new THREE.WebGLRenderer({
    canvas: canvas.value,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.35 : 1.75))

  const group = new THREE.Group()
  group.position.set(mobile ? 1.15 : 2.15, mobile ? 0.35 : 0.15, 0)
  group.rotation.z = -0.08
  scene.add(group)

  const pointCount = mobile ? 130 : 230
  const positions = new Float32Array(pointCount * 3)
  const pointsData: THREE.Vector3[] = []

  for (let i = 0; i < pointCount; i++) {
    const angle = seededRandom() * Math.PI * 2
    const radius = 0.8 + Math.pow(seededRandom(), 0.72) * (mobile ? 3.6 : 4.8)
    const x = Math.cos(angle) * radius * 1.28
    const y = Math.sin(angle) * radius * 0.72
    const z = (seededRandom() - 0.5) * 2.8
    positions.set([x, y, z], i * 3)
    pointsData.push(new THREE.Vector3(x, y, z))
  }

  pointGeometry = new THREE.BufferGeometry()
  pointGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  pointMaterial = new THREE.PointsMaterial({
    color: 0x78e7ff,
    size: mobile ? 0.048 : 0.043,
    transparent: true,
    opacity: 0.92,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  })

  const points = new THREE.Points(pointGeometry, pointMaterial)
  group.add(points)

  const corePoints = [
    new THREE.Vector3(-1.55, 0.9, 0.3),
    new THREE.Vector3(0.1, 1.35, -0.2),
    new THREE.Vector3(1.65, 0.3, 0.15),
    new THREE.Vector3(0.7, -1.25, 0.45),
    new THREE.Vector3(-1.25, -1.1, -0.15)
  ]

  coreGeometry = new THREE.BufferGeometry().setFromPoints(corePoints)
  coreMaterial = new THREE.PointsMaterial({
    color: 0xc9f7ff,
    size: mobile ? 0.14 : 0.12,
    transparent: true,
    opacity: 1,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  })
  group.add(new THREE.Points(coreGeometry, coreMaterial))

  const lines: number[] = []
  const addLine = (a: THREE.Vector3, b: THREE.Vector3) => {
    lines.push(a.x, a.y, a.z, b.x, b.y, b.z)
  }

  for (let i = 0; i < pointCount; i++) {
    for (let j = i + 1; j < pointCount; j++) {
      const distance = pointsData[i].distanceTo(pointsData[j])
      if (distance < (mobile ? 0.95 : 1.08) && seededRandom() > 0.82) addLine(pointsData[i], pointsData[j])
    }
  }

  corePoints.forEach((core) => {
    pointsData
      .map(point => ({ point, distance: point.distanceTo(core) }))
      .filter(item => item.distance < 2.25)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, mobile ? 7 : 11)
      .forEach(item => addLine(core, item.point))
  })

  for (let i = 0; i < corePoints.length; i++) {
    addLine(corePoints[i], corePoints[(i + 1) % corePoints.length])
  }

  lineGeometry = new THREE.BufferGeometry()
  lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(lines, 3))
  lineMaterial = new THREE.LineBasicMaterial({
    color: 0x3b82f6,
    transparent: true,
    opacity: mobile ? 0.42 : 0.34,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  })
  group.add(new THREE.LineSegments(lineGeometry, lineMaterial))

  const targetRotation = new THREE.Vector2()

  onPointerMove = (event: PointerEvent) => {
    targetRotation.y = ((event.clientX / window.innerWidth) * 2 - 1) * 0.12
    targetRotation.x = (-(event.clientY / window.innerHeight) * 2 + 1) * 0.06
  }

  resize = () => {
    if (!canvas.value || !renderer) return
    const rect = canvas.value.getBoundingClientRect()
    camera.aspect = rect.width / Math.max(rect.height, 1)
    camera.updateProjectionMatrix()
    renderer.setSize(rect.width, rect.height, false)
  }

  window.addEventListener('pointermove', onPointerMove, { passive: true })
  window.addEventListener('resize', resize)
  resize()

  const clock = new THREE.Clock()
  const render = () => {
    const t = clock.getElapsedTime()
    if (!prefersReducedMotion) {
      group.rotation.y += (targetRotation.y - group.rotation.y) * 0.018
      group.rotation.x += (targetRotation.x - group.rotation.x) * 0.018
      group.rotation.z = -0.08 + Math.sin(t * 0.16) * 0.018
      points.rotation.y = t * 0.012
      if (coreMaterial) coreMaterial.size = (mobile ? 0.14 : 0.12) + Math.sin(t * 1.4) * 0.012
    }
    renderer?.render(scene, camera)
    frame = requestAnimationFrame(render)
  }

  render()
})

onBeforeUnmount(() => {
  cancelAnimationFrame(frame)
  if (onPointerMove) window.removeEventListener('pointermove', onPointerMove)
  if (resize) window.removeEventListener('resize', resize)
  pointGeometry?.dispose()
  pointMaterial?.dispose()
  coreGeometry?.dispose()
  coreMaterial?.dispose()
  lineGeometry?.dispose()
  lineMaterial?.dispose()
  renderer?.dispose()
})
</script>

<template>
  <canvas ref="canvas" class="webgl-canvas" aria-hidden="true" />
</template>
