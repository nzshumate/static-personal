import * as THREE from 'three'
import { skyboxFragment, skyboxVertex } from './shaders'
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
  { id: 'sky', start: 0.09, peak: 0.17, end: 0.25, yaw: 0.55, pitch: 0.1, exposure: 0.78, contrast: 1.08, tint: new THREE.Color(0xe4eef6) },
  { id: 'mountains', start: 0.21, peak: 0.3, end: 0.38, yaw: 1.15, pitch: 0.06, exposure: 0.72, contrast: 1.12, tint: new THREE.Color(0xdce4ec) },
  { id: 'forest', start: 0.34, peak: 0.43, end: 0.51, yaw: 0.72, pitch: 0.04, exposure: 0.56, contrast: 1.14, tint: new THREE.Color(0xc5d2c4) },
  { id: 'desert', start: 0.47, peak: 0.56, end: 0.64, yaw: 0.35, pitch: 0.08, exposure: 0.92, contrast: 1.08, tint: new THREE.Color(0xf6dfb6) },
  { id: 'beach', start: 0.73, peak: 0.8, end: 0.88, yaw: 2.4, pitch: 0.02, exposure: 0.7, contrast: 1.06, tint: new THREE.Color(0xd7e6ea) }
]

const texturePath: Record<string, string> = {
  sky: '/world/sky.jpg',
  mountains: '/world/mountains.jpg',
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
      uExposure: { value: 0.62 },
      uTint: { value: new THREE.Color(0xc5d8cc) },
      uTime: { value: 0 },
      uDepth: { value: 0 },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uPointer: { value: new THREE.Vector2() }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D uMap;
      uniform float uOpacity;
      uniform float uExposure;
      uniform vec3 uTint;
      varying vec2 vUv;
      void main() {
        vec2 uv = vUv;
        uv.x = mix(0.08, 0.92, uv.x);
        uv.y = mix(0.12, 0.88, uv.y);
        vec3 color = texture2D(uMap, uv).rgb * uExposure * uTint;
        gl_FragColor = vec4(color, uOpacity);
      }
    `,
    transparent: true,
    depthWrite: false,
    toneMapped: false
  })
  const swamp = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), swampMat)
  swamp.frustumCulled = false
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
      material.uniforms.uOpacity.value = Math.pow(amount, 0.72)
      mesh.visible = amount > 0.01
      mesh.rotation.y = layer.yaw + pointer.x * 0.045
      mesh.rotation.x = layer.pitch - pointer.y * 0.02
    })

    const swampAmount = pulse(progress, 0.6, 0.67, 0.76)
    swampMat.uniforms.uOpacity.value = swampAmount
    swamp.visible = swampAmount > 0.01
  }

  return { group, update, preload }
}
