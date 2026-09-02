<script setup lang="ts">
import * as THREE from 'three'

const canvas = ref<HTMLCanvasElement | null>(null)

let frame = 0
let renderer: THREE.WebGLRenderer | null = null
let resizeHandler: (() => void) | null = null
let pointerHandler: ((event: PointerEvent) => void) | null = null

const disposables: Array<THREE.BufferGeometry | THREE.Material> = []

onMounted(() => {
  if (!canvas.value) return

  const mobile = window.innerWidth < 800
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(mobile ? 58 : 48, 1, 0.1, 50)
  camera.position.set(0, 0, mobile ? 8 : 9)

  renderer = new THREE.WebGLRenderer({
    canvas: canvas.value,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  })
  renderer.setClearColor(0x000000, 0)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.35 : 1.8))

  const group = new THREE.Group()
  group.position.set(mobile ? 1.1 : 2.65, mobile ? 0.2 : 0.05, 0)
  group.rotation.z = -0.05
  scene.add(group)

  const baseNodes = [
    new THREE.Vector3(-2.45, 1.15, 0.15),
    new THREE.Vector3(-0.95, 1.7, -0.2),
    new THREE.Vector3(0.75, 1.2, 0.3),
    new THREE.Vector3(2.3, 0.25, -0.1),
    new THREE.Vector3(1.35, -1.35, 0.35),
    new THREE.Vector3(-0.45, -1.7, -0.15),
    new THREE.Vector3(-2.2, -0.85, 0.2),
    new THREE.Vector3(-3.25, 0.15, -0.3),
    new THREE.Vector3(3.15, 1.15, 0.15),
    new THREE.Vector3(3.15, -1.1, -0.2),
    new THREE.Vector3(0.15, 2.55, 0.1),
    new THREE.Vector3(0.2, -2.55, -0.25)
  ]

  const hubIndices = new Set([0, 2, 3, 4, 6])
  const currentNodes = baseNodes.map(node => node.clone())

  const edgePairs: Array<[number, number]> = [
    [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 0],
    [0, 2], [0, 6], [2, 4], [4, 6], [1, 10], [2, 10], [5, 11], [4, 11],
    [3, 8], [3, 9], [4, 9], [6, 7], [0, 7], [1, 5], [2, 5], [0, 4]
  ]

  const nodeGeometry = new THREE.SphereGeometry(1, mobile ? 10 : 14, mobile ? 8 : 10)
  const edgeGeometry = new THREE.CylinderGeometry(1, 1, 1, 6, 1, true)
  const pulseGeometry = new THREE.SphereGeometry(1, 10, 8)
  disposables.push(nodeGeometry, edgeGeometry, pulseGeometry)

  const hubMaterial = new THREE.MeshBasicMaterial({ color: 0xd9fbff, transparent: true, opacity: 0.98 })
  const nodeMaterial = new THREE.MeshBasicMaterial({ color: 0x74e8ff, transparent: true, opacity: 0.86 })
  const edgeMaterial = new THREE.MeshBasicMaterial({ color: 0x2f9cff, transparent: true, opacity: mobile ? 0.58 : 0.66 })
  const glowMaterial = new THREE.MeshBasicMaterial({ color: 0x1557ff, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false })
  const pulseMaterial = new THREE.MeshBasicMaterial({ color: 0xbdf7ff, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false })
  disposables.push(hubMaterial, nodeMaterial, edgeMaterial, glowMaterial, pulseMaterial)

  const nodeMeshes = baseNodes.map((node, index) => {
    const mesh = new THREE.Mesh(nodeGeometry, hubIndices.has(index) ? hubMaterial : nodeMaterial)
    mesh.position.copy(node)
    const baseScale = hubIndices.has(index) ? (mobile ? 0.13 : 0.16) : (mobile ? 0.065 : 0.075)
    mesh.scale.setScalar(baseScale)
    mesh.userData.baseScale = baseScale
    mesh.userData.index = index
    group.add(mesh)
    return mesh
  })

  const edgeMeshes: THREE.Mesh[] = []
  const glowMeshes: THREE.Mesh[] = []
  const yAxis = new THREE.Vector3(0, 1, 0)

  const updateEdgeMesh = (mesh: THREE.Mesh, a: THREE.Vector3, b: THREE.Vector3, radius: number) => {
    const direction = new THREE.Vector3().subVectors(b, a)
    const length = direction.length()
    const midpoint = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5)
    mesh.position.copy(midpoint)
    mesh.quaternion.setFromUnitVectors(yAxis, direction.normalize())
    mesh.scale.set(radius, length, radius)
  }

  edgePairs.forEach(([aIndex, bIndex]) => {
    const edge = new THREE.Mesh(edgeGeometry, edgeMaterial)
    updateEdgeMesh(edge, currentNodes[aIndex], currentNodes[bIndex], mobile ? 0.012 : 0.016)
    group.add(edge)
    edgeMeshes.push(edge)

    const glow = new THREE.Mesh(edgeGeometry, glowMaterial)
    updateEdgeMesh(glow, currentNodes[aIndex], currentNodes[bIndex], mobile ? 0.034 : 0.045)
    group.add(glow)
    glowMeshes.push(glow)
  })

  const pulseMeshes = edgePairs.slice(0, mobile ? 7 : 12).map((_, index) => {
    const mesh = new THREE.Mesh(pulseGeometry, pulseMaterial)
    mesh.scale.setScalar(mobile ? 0.045 : 0.055)
    mesh.userData.phase = index / (mobile ? 7 : 12)
    group.add(mesh)
    return mesh
  })

  const pointer = new THREE.Vector2(2, 2)
  const raycaster = new THREE.Raycaster()
  let hoveredNode: THREE.Mesh | null = null
  let pointerX = 0
  let pointerY = 0

  pointerHandler = (event: PointerEvent) => {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1
    pointerX = pointer.x
    pointerY = pointer.y
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

  const clock = new THREE.Clock()

  const render = () => {
    const t = clock.getElapsedTime()

    if (!mobile) {
      raycaster.setFromCamera(pointer, camera)
      const intersections = raycaster.intersectObjects(nodeMeshes, false)
      hoveredNode = (intersections[0]?.object as THREE.Mesh | undefined) ?? null
    }

    currentNodes.forEach((node, index) => {
      const base = baseNodes[index]
      const phase = index * 0.73
      const amplitude = reducedMotion ? 0 : hubIndices.has(index) ? 0.09 : 0.14
      node.set(
        base.x + Math.sin(t * 0.48 + phase) * amplitude,
        base.y + Math.cos(t * 0.42 + phase * 1.1) * amplitude * 0.8,
        base.z + Math.sin(t * 0.36 + phase * 1.4) * amplitude * 0.55
      )

      const mesh = nodeMeshes[index]
      mesh.position.copy(node)
      const baseScale = mesh.userData.baseScale as number
      const isHovered = hoveredNode === mesh
      const pulse = hubIndices.has(index) && !reducedMotion ? 1 + Math.sin(t * 1.8 + phase) * 0.1 : 1
      mesh.scale.setScalar(baseScale * pulse * (isHovered ? 1.85 : 1))
    })

    edgePairs.forEach(([aIndex, bIndex], index) => {
      updateEdgeMesh(edgeMeshes[index], currentNodes[aIndex], currentNodes[bIndex], mobile ? 0.012 : 0.016)
      updateEdgeMesh(glowMeshes[index], currentNodes[aIndex], currentNodes[bIndex], mobile ? 0.034 : 0.045)
    })

    pulseMeshes.forEach((mesh, index) => {
      const [aIndex, bIndex] = edgePairs[index]
      const progress = reducedMotion ? mesh.userData.phase : (t * 0.16 + mesh.userData.phase) % 1
      mesh.position.lerpVectors(currentNodes[aIndex], currentNodes[bIndex], progress)
      const scale = (mobile ? 0.045 : 0.055) * (1 + Math.sin((progress + t) * Math.PI * 2) * 0.22)
      mesh.scale.setScalar(scale)
    })

    const hoverBoost = hoveredNode ? 1 : 0
    edgeMaterial.opacity = (mobile ? 0.58 : 0.66) + hoverBoost * 0.22
    glowMaterial.opacity = 0.18 + hoverBoost * 0.16

    if (!reducedMotion) {
      group.rotation.y += ((mobile ? 0 : pointerX * 0.11) + Math.sin(t * 0.16) * 0.035 - group.rotation.y) * 0.035
      group.rotation.x += ((mobile ? 0 : pointerY * 0.055) + Math.cos(t * 0.14) * 0.018 - group.rotation.x) * 0.035
      group.position.y = (mobile ? 0.2 : 0.05) + Math.sin(t * 0.28) * 0.08
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
  <canvas ref="canvas" class="webgl-canvas" aria-hidden="true" />
</template>
