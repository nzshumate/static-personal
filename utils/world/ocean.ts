import * as THREE from 'three'
import { oceanFragment, oceanVertex } from './shaders'
import { pulse, smoothstep } from './math'

export type OceanSystem = {
  group: THREE.Group
  update: (time: number, progress: number, pointer: THREE.Vector2, size: THREE.Vector2, reduced: boolean) => void
}

export const createOcean = (mobile: boolean): OceanSystem => {
  const group = new THREE.Group()
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uDepth: { value: 0 },
      uOpacity: { value: 0 },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uPointer: { value: new THREE.Vector2() }
    },
    vertexShader: oceanVertex,
    fragmentShader: oceanFragment,
    transparent: true,
    depthWrite: false,
    toneMapped: false
  })
  const volume = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material)
  volume.frustumCulled = false
  group.add(volume)

  const fish: THREE.Group[] = []
  const bodyGeo = new THREE.PlaneGeometry(0.42, 0.12)
  const tailGeo = new THREE.PlaneGeometry(0.16, 0.1)
  for (let i = 0; i < (mobile ? 5 : 9); i++) {
    const tint = new THREE.MeshBasicMaterial({
      color: i % 3 === 0 ? 0x0b1c22 : 0x061318,
      transparent: true,
      opacity: 0,
      depthWrite: false
    })
    const body = new THREE.Mesh(bodyGeo, tint)
    const tail = new THREE.Mesh(tailGeo, tint)
    tail.position.x = -0.26
    tail.rotation.z = 0.4
    const item = new THREE.Group()
    item.add(body, tail)
    item.userData = {
      dir: i % 2 ? 1 : -1,
      speed: 0.12 + (i % 4) * 0.04,
      y: -1.2 + (i % 5) * 0.45,
      z: -4 - (i % 3) * 0.8,
      phase: i * 1.3
    }
    group.add(item)
    fish.push(item)
  }

  const jelly: THREE.Group[] = []
  for (let i = 0; i < (mobile ? 2 : 3); i++) {
    const item = new THREE.Group()
    const bell = new THREE.Mesh(
      new THREE.SphereGeometry(0.22 + i * 0.04, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshBasicMaterial({
        color: i % 2 ? 0x6fe3d8 : 0x7aa8ff,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    )
    bell.rotation.x = Math.PI
    item.add(bell)
    for (let t = 0; t < 5; t++) {
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3((t - 2) * 0.05, -0.04, 0),
          new THREE.Vector3((t - 2) * 0.04, -0.85, 0.02)
        ]),
        new THREE.LineBasicMaterial({
          color: i % 2 ? 0x6fe3d8 : 0x7aa8ff,
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending
        })
      )
      item.add(line)
    }
    item.position.set(i % 2 ? 3.4 : -3.6, -0.4 + i * 0.7, -5 - i)
    group.add(item)
    jelly.push(item)
  }

  const update = (time: number, progress: number, pointer: THREE.Vector2, size: THREE.Vector2, reduced: boolean) => {
    const amount = smoothstep(0.82, 0.9, progress)
    const depth = smoothstep(0.86, 1, progress)
    material.uniforms.uTime.value = time
    material.uniforms.uDepth.value = depth
    material.uniforms.uOpacity.value = amount * 0.92
    material.uniforms.uResolution.value.copy(size)
    material.uniforms.uPointer.value.copy(pointer)
    volume.visible = amount > 0.02

    const fauna = pulse(progress, 0.86, 0.93, 1.02)
    fish.forEach((item, i) => {
      const dir = item.userData.dir as number
      item.visible = fauna > 0.05
      item.children.forEach((child) => {
        const mesh = child as THREE.Mesh
        const mat = mesh.material as THREE.MeshBasicMaterial
        mat.opacity = fauna * 0.22
      })
      if (!reduced) {
        const loop = ((time * item.userData.speed + item.userData.phase) % 16) - 8
        item.position.set(dir * loop, item.userData.y + Math.sin(time * 0.35 + i) * 0.1, item.userData.z)
        item.rotation.y = dir > 0 ? 0 : Math.PI
      }
    })

    jelly.forEach((item, i) => {
      item.visible = fauna > 0.08
      item.traverse((child) => {
        const mat = (child as THREE.Mesh).material as THREE.Material & { opacity?: number }
        if (mat && 'opacity' in mat) mat.opacity = fauna * (child instanceof THREE.Line ? 0.12 : 0.2)
      })
      if (!reduced) {
        item.position.y += Math.sin(time * 0.28 + i) * 0.0012
        item.scale.y = 0.96 + Math.sin(time * 0.8 + i) * 0.04
      }
    })
  }

  return { group, update }
}
