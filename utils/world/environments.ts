import * as THREE from 'three'
import { plateFragment, plateVertex, skyboxFragment, skyboxVertex } from './shaders'
import { pulse } from './math'

export type EnvironmentLayer = {
  id: string
  start: number
  peak: number
  end: number
  yaw: number
  pitch: number
  exposure: number
  contrast: number
  tint: THREE.Color
}

export const environmentLayers: EnvironmentLayer[] = [
  { id: 'sky', start: 0.07, peak: 0.175, end: 0.3, yaw: 0.18, pitch: 0.08, exposure: 0.62, contrast: 1.12, tint: new THREE.Color(0xd7e4f2) },
  { id: 'mountains', start: 0.2, peak: 0.305, end: 0.42, yaw: 0.42, pitch: 0.04, exposure: 0.58, contrast: 1.16, tint: new THREE.Color(0xd5dce6) },
  { id: 'snow', start: 0.3, peak: 0.37, end: 0.46, yaw: 0.1, pitch: 0.02, exposure: 0.48, contrast: 1.1, tint: new THREE.Color(0xc9d6d4) },
  { id: 'forest', start: 0.38, peak: 0.455, end: 0.58, yaw: 0.22, pitch: 0.06, exposure: 0.42, contrast: 1.18, tint: new THREE.Color(0xb7c8b8) },
  { id: 'desert', start: 0.5, peak: 0.585, end: 0.7, yaw: -0.15, pitch: 0.05, exposure: 0.7, contrast: 1.14, tint: new THREE.Color(0xf0d3ae) },
  { id: 'beach', start: 0.72, peak: 0.83, end: 0.93, yaw: 0.08, pitch: 0.02, exposure: 0.56, contrast: 1.08, tint: new THREE.Color(0xcfe0e6) }
]

const texturePath: Record<string, string> = {
  sky: '/world/sky.jpg',
  mountains: '/world/mountains.jpg',
  snow: '/world/snow.jpg',
  forest: '/world/forest.jpg',
  desert: '/world/desert.jpg',
  beach: '/world/beach.jpg',
  swamp: '/world/swamp.jpg'
}

export type EnvironmentSystem = {
  group: THREE.Group
  update: (progress: number, pointer: THREE.Vector2) => void
  preload: () => Promise<void>
}

const loadTexture = (loader: THREE.TextureLoader, url: string) =>
  new Promise<THREE.Texture>((resolve, reject) => {
    loader.load(
      url,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace
        texture.minFilter = THREE.LinearFilter
        texture.magFilter = THREE.LinearFilter
        resolve(texture)
      },
      undefined,
      reject
    )
  })

export const createEnvironments = (renderer: THREE.WebGLRenderer): EnvironmentSystem => {
  const group = new THREE.Group()
  const loader = new THREE.TextureLoader()
  const spheres: Array<{
    layer: EnvironmentLayer
    mesh: THREE.Mesh
    material: THREE.ShaderMaterial
  }> = []

  const makeSkybox = (layer: EnvironmentLayer) => {
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: null },
        uOpacity: { value: 0 },
        uExposure: { value: layer.exposure },
        uContrast: { value: layer.contrast },
        uTint: { value: layer.tint.clone() }
      },
      vertexShader: skyboxVertex,
      fragmentShader: skyboxFragment,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
      toneMapped: false
    })
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(72, 64, 40), material)
    mesh.rotation.set(layer.pitch, layer.yaw, 0)
    mesh.visible = false
    group.add(mesh)
    spheres.push({ layer, mesh, material })
  }

  environmentLayers.forEach(makeSkybox)

  const swampMat = new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: null },
      uOpacity: { value: 0 },
      uExposure: { value: 0.42 },
      uTint: { value: new THREE.Color(0xb7cfc4) }
    },
    vertexShader: plateVertex,
    fragmentShader: plateFragment,
    transparent: true,
    depthWrite: false,
    toneMapped: false
  })
  const swamp = new THREE.Mesh(new THREE.PlaneGeometry(28, 18), swampMat)
  swamp.position.set(0, 0, -16)
  swamp.visible = false
  group.add(swamp)

  const preload = async () => {
    const entries = Object.entries(texturePath)
    const textures = await Promise.all(entries.map(([, url]) => loadTexture(loader, url)))
    const byId = Object.fromEntries(entries.map(([id], i) => [id, textures[i]]))
    spheres.forEach(({ layer, material }) => {
      material.uniforms.uMap.value = byId[layer.id]
    })
    swampMat.uniforms.uMap.value = byId.swamp
    renderer.initTexture(textures[0])
  }

  const update = (progress: number, pointer: THREE.Vector2) => {
    spheres.forEach(({ layer, mesh, material }) => {
      const amount = pulse(progress, layer.start, layer.peak, layer.end)
      material.uniforms.uOpacity.value = amount
      mesh.visible = amount > 0.01
      mesh.rotation.y = layer.yaw + pointer.x * 0.045
      mesh.rotation.x = layer.pitch - pointer.y * 0.02
    })

    const swampAmount = pulse(progress, 0.6, 0.71, 0.82)
    swampMat.uniforms.uOpacity.value = swampAmount
    swamp.visible = swampAmount > 0.01
    swamp.position.x = pointer.x * 0.35
    swamp.position.y = pointer.y * 0.18 + (progress - 0.71) * -1.4
    swamp.scale.setScalar(1.04 + swampAmount * 0.04)
  }

  return { group, update, preload }
}
