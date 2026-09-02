<script setup lang="ts">
import * as THREE from 'three'

let frame = 0
let renderer: THREE.WebGLRenderer | null = null
let resizeHandler: (() => void) | null = null
let pointerHandler: ((event: PointerEvent) => void) | null = null
let focusHandler: ((event: Event) => void) | null = null
const disposables: Array<THREE.BufferGeometry | THREE.Material> = []

const vertexShader = `
uniform float uSize;
uniform float uPixelRatio;
attribute float aScale;
void main(){
  vec4 mvPosition=modelViewMatrix*vec4(position,1.0);
  gl_PointSize=uSize*aScale*uPixelRatio*(8.0/max(2.0,-mvPosition.z));
  gl_Position=projectionMatrix*mvPosition;
}`

const fragmentShader = `
uniform vec3 uColor;
uniform float uOpacity;
void main(){
  vec2 p=gl_PointCoord-vec2(.5);
  float d=length(p);
  float core=1.0-smoothstep(.02,.12,d);
  float halo=1.0-smoothstep(.08,.5,d);
  float a=(core*.82+halo*.48)*uOpacity;
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
  const camera = new THREE.PerspectiveCamera(mobile ? 58 : 46, 1, 0.1, 80)
  camera.position.z = mobile ? 9.2 : 10

  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' })
  renderer.setClearColor(0x000000, 0)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.15 : 1.6))
  renderer.outputColorSpace = THREE.SRGBColorSpace

  const field = new THREE.Group()
  field.position.set(mobile ? 1.45 : 2.9, mobile ? 0.55 : 0.02, 0)
  scene.add(field)

  let seed = 19349663
  const random = () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }

  const centers = [
    new THREE.Vector3(-1.55, 1.75, 0.15),
    new THREE.Vector3(1.38, 1.95, -0.2),
    new THREE.Vector3(2.35, 0.25, 0.1),
    new THREE.Vector3(0.75, -1.7, 0.1),
    new THREE.Vector3(-1.65, -1.35, -0.08)
  ]
  const colors = [
    new THREE.Color(0x426cff),
    new THREE.Color(0xe1e9ff),
    new THREE.Color(0x5d94ff),
    new THREE.Color(0xffa472),
    new THREE.Color(0x5575ff)
  ]
  const counts = mobile ? [58, 50, 55, 60, 56] : [165, 145, 160, 175, 155]
  let focused = -1
  const focusValues = [0, 0, 0, 0, 0]

  type Cluster = {
    base: Float32Array
    phases: Float32Array
    geometry: THREE.BufferGeometry
    material: THREE.ShaderMaterial
    lineGeometry: THREE.BufferGeometry
    lineMaterial: THREE.LineBasicMaterial
    connections: Array<[number, number]>
    beacons: THREE.Points
    beaconGeometry: THREE.BufferGeometry
    beaconMaterial: THREE.ShaderMaterial
    beaconIndices: number[]
  }
  const clusters: Cluster[] = []

  const pointMaterial = (color: THREE.Color, size: number, opacity: number) => {
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: color },
        uOpacity: { value: opacity },
        uSize: { value: size },
        uPixelRatio: { value: renderer?.getPixelRatio() ?? 1 }
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
    disposables.push(material)
    return material
  }

  centers.forEach((center, ci) => {
    const count = counts[ci]
    const base = new Float32Array(count * 3)
    const positions = new Float32Array(count * 3)
    const phases = new Float32Array(count)
    const scales = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      const angle = random() * Math.PI * 2
      const radius = Math.pow(random(), 0.88) * (ci === 3 ? 1.65 : 1.38)
      const curl = angle + radius * (ci % 2 ? 1.42 : -1.28)
      const x = center.x + Math.cos(curl) * radius * (0.64 + random() * 0.42)
      const y = center.y + Math.sin(curl) * radius * (0.48 + random() * 0.48)
      const z = (random() - 0.5) * 2.9 + Math.sin(angle * 2.15) * 0.22
      base.set([x, y, z], i * 3)
      positions.set([x, y, z], i * 3)
      phases[i] = random() * Math.PI * 2
      scales[i] = 0.35 + random() * 1.35
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1))
    const material = pointMaterial(colors[ci], mobile ? 12 : 11, ci === 3 ? 0.85 : 0.77)
    field.add(new THREE.Points(geometry, material))

    const connections: Array<[number, number]> = []
    for (let i = 0; i < count; i++) {
      const ix = base[i * 3], iy = base[i * 3 + 1], iz = base[i * 3 + 2]
      let nearest = -1
      let nearestD = mobile ? 0.62 : 0.5
      for (let j = i + 1; j < count; j++) {
        const dx = ix - base[j * 3], dy = iy - base[j * 3 + 1], dz = iz - base[j * 3 + 2]
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz)
        if (d < nearestD) { nearestD = d; nearest = j }
      }
      if (nearest >= 0 && random() > 0.08) connections.push([i, nearest])
    }

    const lineGeometry = new THREE.BufferGeometry()
    lineGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(connections.length * 6), 3))
    const lineMaterial = new THREE.LineBasicMaterial({
      color: colors[ci], transparent: true, opacity: ci === 3 ? 0.16 : 0.12,
      blending: THREE.AdditiveBlending, depthWrite: false
    })
    disposables.push(geometry, lineGeometry, lineMaterial)
    field.add(new THREE.LineSegments(lineGeometry, lineMaterial))

    const beaconIndices = Array.from({ length: mobile ? 3 : 8 }, () => Math.floor(random() * count))
    const beaconGeometry = new THREE.BufferGeometry()
    beaconGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(beaconIndices.length * 3), 3))
    beaconGeometry.setAttribute('aScale', new THREE.BufferAttribute(new Float32Array(beaconIndices.length).fill(1), 1))
    const beaconMaterial = pointMaterial(colors[ci].clone().lerp(new THREE.Color(0xffffff), 0.45), mobile ? 22 : 25, 0.9)
    const beacons = new THREE.Points(beaconGeometry, beaconMaterial)
    field.add(beacons)

    clusters.push({ base, phases, geometry, material, lineGeometry, lineMaterial, connections, beacons, beaconGeometry, beaconMaterial, beaconIndices })
  })

  const dustCount = mobile ? 240 : 760
  const dustBase = new Float32Array(dustCount * 3)
  const dustPositions = new Float32Array(dustCount * 3)
  const dustScales = new Float32Array(dustCount)
  const dustPhases = new Float32Array(dustCount)
  for (let i = 0; i < dustCount; i++) {
    const angle = random() * Math.PI * 2
    const radius = 1.2 + random() * 4.25
    const x = Math.cos(angle) * radius * 0.9
    const y = Math.sin(angle) * radius * 0.62
    const z = (random() - 0.5) * 5.2
    dustBase.set([x, y, z], i * 3)
    dustPositions.set([x, y, z], i * 3)
    dustScales[i] = 0.18 + random() * 0.85
    dustPhases[i] = random() * Math.PI * 2
  }
  const dustGeometry = new THREE.BufferGeometry()
  dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3))
  dustGeometry.setAttribute('aScale', new THREE.BufferAttribute(dustScales, 1))
  const dustMaterial = pointMaterial(new THREE.Color(0x8798c3), mobile ? 7 : 6, 0.29)
  field.add(new THREE.Points(dustGeometry, dustMaterial))
  disposables.push(dustGeometry)

  focusHandler = (event: Event) => { focused = Number((event as CustomEvent<number>).detail) }
  window.addEventListener('network-focus', focusHandler)

  const pointer = new THREE.Vector2(2, 2)
  const pointerWorld = new THREE.Vector3(999, 999, 0)
  const pointerLocal = new THREE.Vector3(999, 999, 0)
  const raycaster = new THREE.Raycaster()
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
  let pointerActive = false
  let px = 0
  let py = 0

  pointerHandler = (event: PointerEvent) => {
    pointer.x = event.clientX / window.innerWidth * 2 - 1
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1
    px = pointer.x
    py = pointer.y
    pointerActive = true
  }
  window.addEventListener('pointermove', pointerHandler, { passive: true })

  resizeHandler = () => {
    if (!renderer) return
    const rect = canvas.getBoundingClientRect()
    camera.aspect = rect.width / Math.max(rect.height, 1)
    camera.updateProjectionMatrix()
    renderer.setSize(rect.width, rect.height, false)
    const ratio = renderer.getPixelRatio()
    clusters.forEach(c => {
      c.material.uniforms.uPixelRatio.value = ratio
      c.beaconMaterial.uniforms.uPixelRatio.value = ratio
    })
    dustMaterial.uniforms.uPixelRatio.value = ratio
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
      focusValues[ci] += (((focused === ci) ? 1 : 0) - focusValues[ci]) * 0.08
      const focus = focusValues[ci]
      const attr = cluster.geometry.getAttribute('position') as THREE.BufferAttribute
      const lineAttr = cluster.lineGeometry.getAttribute('position') as THREE.BufferAttribute

      for (let i = 0; i < counts[ci]; i++) {
        const bx = cluster.base[i * 3], by = cluster.base[i * 3 + 1], bz = cluster.base[i * 3 + 2]
        const phase = cluster.phases[i]
        let x = bx, y = by, z = bz

        if (!reducedMotion) {
          const amp = 0.075 + focus * 0.095
          x += Math.sin(t * (0.38 + ci * 0.018) + phase + by * 0.3) * amp
          y += Math.cos(t * (0.31 + ci * 0.016) + phase * 1.12 + bx * 0.28) * amp * 0.92
          z += Math.sin(t * 0.42 + phase * 0.72) * (0.11 + focus * 0.12)
          if (focus > 0.01) {
            const center = centers[ci]
            const dx = x - center.x, dy = y - center.y
            x += -dy * focus * 0.045 * Math.sin(t * 0.9 + phase)
            y += dx * focus * 0.045 * Math.sin(t * 0.9 + phase)
          }
        }

        if (pointerActive && !mobile) {
          const dx = pointerLocal.x - x, dy = pointerLocal.y - y
          const d = Math.sqrt(dx * dx + dy * dy)
          if (d < 1.55) {
            const influence = (1 - d / 1.55) ** 2
            x += dx * influence * 0.06 - dy * influence * 0.17
            y += dy * influence * 0.06 + dx * influence * 0.17
            z += influence * 0.35
          }
        }
        attr.setXYZ(i, x, y, z)
      }
      attr.needsUpdate = true

      cluster.connections.forEach(([a, b], index) => {
        const o = index * 2
        lineAttr.setXYZ(o, attr.getX(a), attr.getY(a), attr.getZ(a))
        lineAttr.setXYZ(o + 1, attr.getX(b), attr.getY(b), attr.getZ(b))
      })
      lineAttr.needsUpdate = true

      const beaconAttr = cluster.beaconGeometry.getAttribute('position') as THREE.BufferAttribute
      cluster.beaconIndices.forEach((particleIndex, i) => {
        beaconAttr.setXYZ(i, attr.getX(particleIndex), attr.getY(particleIndex), attr.getZ(particleIndex))
      })
      beaconAttr.needsUpdate = true

      cluster.material.uniforms.uOpacity.value = (ci === 3 ? 0.82 : 0.74) + focus * 0.22
      cluster.material.uniforms.uSize.value = (mobile ? 12 : 11) + focus * 5
      cluster.beaconMaterial.uniforms.uSize.value = (mobile ? 22 : 25) + focus * 10
      cluster.lineMaterial.opacity = (ci === 3 ? 0.16 : 0.12) + focus * 0.22
    })

    for (let i = 0; i < dustCount; i++) {
      const p = dustPhases[i]
      const bx = dustBase[i * 3], by = dustBase[i * 3 + 1], bz = dustBase[i * 3 + 2]
      const m = reducedMotion ? 0 : 1
      dustAttr.setXYZ(i,
        bx + Math.sin(t * 0.17 + p + by * 0.08) * 0.075 * m,
        by + Math.cos(t * 0.145 + p * 1.2 + bx * 0.08) * 0.065 * m,
        bz + Math.sin(t * 0.13 + p) * 0.1 * m)
    }
    dustAttr.needsUpdate = true

    if (!reducedMotion) {
      field.rotation.y += ((mobile ? 0 : px * 0.09) + Math.sin(t * 0.09) * 0.028 - field.rotation.y) * 0.024
      field.rotation.x += ((mobile ? 0 : py * 0.044) + Math.cos(t * 0.08) * 0.015 - field.rotation.x) * 0.024
      field.rotation.z = Math.sin(t * 0.07) * 0.013
      field.position.y = (mobile ? 0.55 : 0.02) + Math.sin(t * 0.18) * 0.075
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
  if (focusHandler) window.removeEventListener('network-focus', focusHandler)
  disposables.forEach(item => item.dispose())
  renderer?.dispose()
})
</script>

<template>
  <canvas id="webgl-hero-canvas" aria-hidden="true" style="position:absolute;inset:0;width:100%;height:100%;z-index:1;opacity:1;pointer-events:none" />
</template>
