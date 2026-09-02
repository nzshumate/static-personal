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
let glowLineMaterial: THREE.LineBasicMaterial | null = null
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
  const camera = new THREE.PerspectiveCamera(mobile ? 56 : 49, 1, 0.1, 100)
  camera.position.set(0, 0, mobile ? 7.2 : 8)

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
  group.position.set(mobile ? 1.15 : 2.25, mobile ? 0.25 : 0.1, 0)
  group.rotation.z = -0.08
  scene.add(group)

  const pointCount = mobile ? 115 : 210
  const positions = new Float32Array(pointCount * 3)
  const pointsData: THREE.Vector3[] = []

  for (let i = 0; i < pointCount; i++) {
    const angle = seededRandom() * Math.PI * 2
    const radius = 0.65 + Math.pow(seededRandom(), 0.72) * (mobile ? 3.45 : 4.55)
    const x = Math.cos(angle) * radius * 1.25
    const y = Math.sin(angle) * radius * 0.72
    const z = (seededRandom() - 0.5) * 2.2
    positions.set([x, y, z], i * 3)
    pointsData.push(new THREE.Vector3(x, y, z))
  }

  pointGeometry = new THREE.BufferGeometry()
  pointGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  pointMaterial = new THREE.PointsMaterial({
    color: 0x8befff,
    size: mobile ? 0.075 : 0.065,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.96,
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
    color: 0xe2fbff,
    size: mobile ? 0.23 : 0.2,
    sizeAttenuation: true,
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
      if (distance < (mobile ? 1.05 : 1.15) && seededRandom() > 0.78) addLine(pointsData[i], pointsData[j])
    }
  }

  corePoints.forEach((core) => {
    pointsData
      .map(point => ({ point, distance: point.distanceTo(core) }))
      .filter(item => item.distance < 2.4)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, mobile ? 9 : 14)
      .forEach(item => addLine(core, item.point))
  })

  for (let i = 0; i < corePoints.length; i++) {
    addLine(corePoints[i], corePoints[(i + 1) % corePoints.length])
    addLine(corePoints[i], corePoints[(i + 2) % corePoints.length])
  }

  lineGeometry = new THREE.BufferGeometry()
  lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(lines, 3))

  glowLineMaterial = new THREE.LineBasicMaterial({
    color: 0x0b5cff,
    transparent: true,
    opacity: mobile ? 0.34 : 0.28,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  })
  const glowLines = new THREE.LineSegments(lineGeometry, glowLineMaterial)
  glowLines.scale.setScalar(1.008)
  group.add(glowLines)

  lineMaterial = new THREE.LineBasicMaterial({
    color: 0x65dcff,
    transparent: true,
    opacity: mobile ? 0.72 : 0.62,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  })
  const lineSegments = new THREE.LineSegments(lineGeometry, lineMaterial)
  group.add(lineSegments)

  const targetRotation = new THREE.Vector2()
  onPointerMove = (event: PointerEvent) => {
    targetRotation.y = ((event.clientX / window.innerWidth) * 2 - 1) * 0.2
    targetRotation.x = (-(event.clientY / window.innerHeight) * 2 + 1) * 0.1
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
      const idleY = Math.sin(t * 0.22) * 0.055
      const idleX = Math.cos(t * 0.18) * 0.025
      group.rotation.y += (targetRotation.y + idleY - group.rotation.y) * 0.028
      group.rotation.x += (targetRotation.x + idleX - group.rotation.x) * 0.028
      group.rotation.z = -0.08 + Math.sin(t * 0.2) * 0.025
      group.position.y = (mobile ? 0.25 : 0.1) + Math.sin(t * 0.35) * 0.08
      points.rotation.y = t * 0.025
      if (coreMaterial) coreMaterial.size = (mobile ? 0.23 : 0.2) + Math.sin(t * 1.8) * 0.025
      if (lineMaterial) lineMaterial.opacity = (mobile ? 0.72 : 0.62) + Math.sin(t * 0.9) * 0.08
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
  glowLineMaterial?.dispose()
  renderer?.dispose()
})
</script>

<template>
  <canvas ref="canvas" class="webgl-canvas" aria-hidden="true" />
</template>
