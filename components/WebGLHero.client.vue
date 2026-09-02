<script setup lang="ts">
import * as THREE from 'three'

const canvas = ref<HTMLCanvasElement | null>(null)
const debugStatus = ref('waiting for client mount')
const frameCount = ref(0)

let frame = 0
let renderer: THREE.WebGLRenderer | null = null
let resizeHandler: (() => void) | null = null
let pointerHandler: ((event: PointerEvent) => void) | null = null
let contextLostHandler: ((event: Event) => void) | null = null
let contextRestoredHandler: (() => void) | null = null

const disposables: Array<THREE.BufferGeometry | THREE.Material> = []

onMounted(() => {
  const el = canvas.value
  if (!el) {
    debugStatus.value = 'ERROR: canvas ref missing'
    return
  }

  contextLostHandler = (event: Event) => {
    event.preventDefault()
    debugStatus.value = 'ERROR: WebGL context lost'
  }
  contextRestoredHandler = () => {
    debugStatus.value = 'WebGL context restored — reload page'
  }
  el.addEventListener('webglcontextlost', contextLostHandler)
  el.addEventListener('webglcontextrestored', contextRestoredHandler)

  try {
    const mobile = window.innerWidth < 800
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(mobile ? 58 : 48, 1, 0.1, 50)
    camera.position.set(0, 0, 9)

    renderer = new THREE.WebGLRenderer({
      canvas: el,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    })
    renderer.setClearColor(0x000000, 0)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.25 : 1.5))

    const gl = renderer.getContext()
    const webglVersion = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext ? 'WebGL2' : 'WebGL1'
    debugStatus.value = `renderer initialized • ${webglVersion}`

    // Deliberately obvious diagnostic object. If this rotates, the renderer/canvas path is healthy.
    const testGeometry = new THREE.BoxGeometry(1.45, 1.45, 1.45)
    const testMaterial = new THREE.MeshBasicMaterial({
      color: 0xff2bd6,
      wireframe: true,
      transparent: false
    })
    disposables.push(testGeometry, testMaterial)
    const testCube = new THREE.Mesh(testGeometry, testMaterial)
    testCube.position.set(mobile ? 1.8 : 3.0, 0.1, 0)
    scene.add(testCube)

    const group = new THREE.Group()
    group.position.set(mobile ? 0.85 : 2.15, mobile ? -0.65 : -0.1, 0)
    scene.add(group)

    const baseNodes = [
      new THREE.Vector3(-2.6, 1.2, 0.15),
      new THREE.Vector3(-1.0, 1.8, -0.2),
      new THREE.Vector3(0.8, 1.25, 0.3),
      new THREE.Vector3(2.4, 0.2, -0.1),
      new THREE.Vector3(1.45, -1.4, 0.35),
      new THREE.Vector3(-0.5, -1.75, -0.15),
      new THREE.Vector3(-2.3, -0.9, 0.2),
      new THREE.Vector3(-3.3, 0.1, -0.25)
    ]
    const hubIndices = new Set([0, 2, 3, 4, 6])
    const currentNodes = baseNodes.map(node => node.clone())
    const edgePairs: Array<[number, number]> = [
      [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 0],
      [0, 2], [2, 4], [4, 6], [1, 5], [2, 5], [0, 4]
    ]

    const nodeGeometry = new THREE.SphereGeometry(1, mobile ? 8 : 12, mobile ? 6 : 8)
    const edgeGeometry = new THREE.CylinderGeometry(1, 1, 1, 6, 1, true)
    disposables.push(nodeGeometry, edgeGeometry)

    const hubMaterial = new THREE.MeshBasicMaterial({ color: 0xdffcff })
    const nodeMaterial = new THREE.MeshBasicMaterial({ color: 0x70e8ff })
    const edgeMaterial = new THREE.MeshBasicMaterial({ color: 0x3ea6ff, transparent: true, opacity: 0.95 })
    disposables.push(hubMaterial, nodeMaterial, edgeMaterial)

    const nodeMeshes = baseNodes.map((node, index) => {
      const mesh = new THREE.Mesh(nodeGeometry, hubIndices.has(index) ? hubMaterial : nodeMaterial)
      const baseScale = hubIndices.has(index) ? (mobile ? 0.14 : 0.18) : (mobile ? 0.08 : 0.1)
      mesh.position.copy(node)
      mesh.scale.setScalar(baseScale)
      mesh.userData.baseScale = baseScale
      group.add(mesh)
      return mesh
    })

    const yAxis = new THREE.Vector3(0, 1, 0)
    const direction = new THREE.Vector3()
    const midpoint = new THREE.Vector3()
    const updateEdge = (mesh: THREE.Mesh, a: THREE.Vector3, b: THREE.Vector3) => {
      direction.subVectors(b, a)
      const length = direction.length()
      midpoint.addVectors(a, b).multiplyScalar(0.5)
      mesh.position.copy(midpoint)
      mesh.quaternion.setFromUnitVectors(yAxis, direction.normalize())
      mesh.scale.set(mobile ? 0.018 : 0.026, length, mobile ? 0.018 : 0.026)
    }

    const edgeMeshes = edgePairs.map(([a, b]) => {
      const mesh = new THREE.Mesh(edgeGeometry, edgeMaterial)
      updateEdge(mesh, currentNodes[a], currentNodes[b])
      group.add(mesh)
      return mesh
    })

    let pointerX = 0
    let pointerY = 0
    pointerHandler = (event: PointerEvent) => {
      pointerX = (event.clientX / window.innerWidth) * 2 - 1
      pointerY = -(event.clientY / window.innerHeight) * 2 + 1
    }
    window.addEventListener('pointermove', pointerHandler, { passive: true })

    resizeHandler = () => {
      if (!renderer || !canvas.value) return
      const rect = canvas.value.getBoundingClientRect()
      const width = Math.max(rect.width, 1)
      const height = Math.max(rect.height, 1)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height, false)
      debugStatus.value = `rendering • ${webglVersion} • ${Math.round(width)}×${Math.round(height)}`
    }
    window.addEventListener('resize', resizeHandler)
    resizeHandler()

    const clock = new THREE.Clock()
    const render = () => {
      const t = clock.getElapsedTime()

      if (!reducedMotion) {
        testCube.rotation.x = t * 0.55
        testCube.rotation.y = t * 0.8

        currentNodes.forEach((node, index) => {
          const base = baseNodes[index]
          const phase = index * 0.78
          const amplitude = hubIndices.has(index) ? 0.1 : 0.16
          node.set(
            base.x + Math.sin(t * 0.6 + phase) * amplitude,
            base.y + Math.cos(t * 0.5 + phase) * amplitude * 0.75,
            base.z + Math.sin(t * 0.4 + phase) * amplitude * 0.5
          )
          const mesh = nodeMeshes[index]
          mesh.position.copy(node)
          const pulse = hubIndices.has(index) ? 1 + Math.sin(t * 2 + phase) * 0.16 : 1
          mesh.scale.setScalar((mesh.userData.baseScale as number) * pulse)
        })

        edgePairs.forEach(([a, b], index) => updateEdge(edgeMeshes[index], currentNodes[a], currentNodes[b]))
        group.rotation.y += (pointerX * 0.14 + Math.sin(t * 0.18) * 0.04 - group.rotation.y) * 0.04
        group.rotation.x += (pointerY * 0.07 - group.rotation.x) * 0.04
      }

      renderer?.render(scene, camera)
      frameCount.value += 1
      if (frameCount.value % 120 === 0) {
        debugStatus.value = `rendering • ${webglVersion} • frame ${frameCount.value}`
      }
      frame = requestAnimationFrame(render)
    }

    render()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    debugStatus.value = `ERROR: ${message}`
    console.error('WebGLHero initialization failed', error)
  }
})

onBeforeUnmount(() => {
  cancelAnimationFrame(frame)
  if (pointerHandler) window.removeEventListener('pointermove', pointerHandler)
  if (resizeHandler) window.removeEventListener('resize', resizeHandler)
  if (canvas.value && contextLostHandler) canvas.value.removeEventListener('webglcontextlost', contextLostHandler)
  if (canvas.value && contextRestoredHandler) canvas.value.removeEventListener('webglcontextrestored', contextRestoredHandler)
  disposables.forEach(item => item.dispose())
  renderer?.dispose()
})
</script>

<template>
  <div class="webgl-debug-root" aria-hidden="true">
    <canvas
      ref="canvas"
      style="position:absolute;inset:0;width:100%;height:100%;z-index:1;opacity:1;pointer-events:none"
    />
    <div
      style="position:absolute;right:16px;bottom:68px;z-index:8;padding:8px 10px;border:1px solid rgba(103,232,249,.55);border-radius:8px;background:rgba(0,0,0,.8);color:#a7f3ff;font:600 11px/1.3 ui-monospace,SFMono-Regular,Menlo,monospace;pointer-events:none"
    >
      {{ debugStatus }}
    </div>
  </div>
</template>
