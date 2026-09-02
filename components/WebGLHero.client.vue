<script setup lang="ts">
import * as THREE from 'three'

const canvas = ref<HTMLCanvasElement | null>(null)

let frame = 0
let renderer: THREE.WebGLRenderer | null = null
let pointGeometry: THREE.BufferGeometry | null = null
let pointMaterial: THREE.PointsMaterial | null = null
let lineGeometry: THREE.BufferGeometry | null = null
let lineMaterial: THREE.LineBasicMaterial | null = null
let onPointerMove: ((event: PointerEvent) => void) | null = null
let resize: (() => void) | null = null

onMounted(() => {
  if (!canvas.value) return

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 100)
  camera.position.set(0, 0, 8)

  renderer = new THREE.WebGLRenderer({
    canvas: canvas.value,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75))

  const group = new THREE.Group()
  scene.add(group)

  const pointCount = window.innerWidth < 720 ? 85 : 150
  const positions = new Float32Array(pointCount * 3)
  const pointsData: THREE.Vector3[] = []

  for (let i = 0; i < pointCount; i++) {
    const angle = Math.random() * Math.PI * 2
    const radius = 1.4 + Math.pow(Math.random(), 0.7) * 3.4
    const x = Math.cos(angle) * radius * 1.35
    const y = Math.sin(angle) * radius * 0.7
    const z = (Math.random() - 0.5) * 2.6
    positions.set([x, y, z], i * 3)
    pointsData.push(new THREE.Vector3(x, y, z))
  }

  pointGeometry = new THREE.BufferGeometry()
  pointGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  pointMaterial = new THREE.PointsMaterial({
    color: 0x67e8f9,
    size: 0.035,
    transparent: true,
    opacity: 0.82,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  })

  const points = new THREE.Points(pointGeometry, pointMaterial)
  group.add(points)

  const lines: number[] = []
  for (let i = 0; i < pointCount; i++) {
    for (let j = i + 1; j < pointCount; j++) {
      if (pointsData[i].distanceTo(pointsData[j]) < 1.25 && Math.random() > 0.72) {
        lines.push(
          pointsData[i].x, pointsData[i].y, pointsData[i].z,
          pointsData[j].x, pointsData[j].y, pointsData[j].z
        )
      }
    }
  }

  lineGeometry = new THREE.BufferGeometry()
  lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(lines, 3))
  lineMaterial = new THREE.LineBasicMaterial({
    color: 0x2563eb,
    transparent: true,
    opacity: 0.22,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  })
  group.add(new THREE.LineSegments(lineGeometry, lineMaterial))

  const targetRotation = new THREE.Vector2()

  onPointerMove = (event: PointerEvent) => {
    targetRotation.y = ((event.clientX / window.innerWidth) * 2 - 1) * 0.16
    targetRotation.x = (-(event.clientY / window.innerHeight) * 2 + 1) * 0.08
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
      group.rotation.y += (targetRotation.y - group.rotation.y) * 0.025
      group.rotation.x += (targetRotation.x - group.rotation.x) * 0.025
      group.rotation.z = Math.sin(t * 0.12) * 0.025
      points.rotation.y = t * 0.018
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
  lineGeometry?.dispose()
  lineMaterial?.dispose()
  renderer?.dispose()
})
</script>

<template>
  <canvas ref="canvas" class="webgl-canvas" aria-hidden="true" />
</template>
