import * as THREE from 'three'
import { atmosphereFragment, atmosphereVertex, planetFragment, planetVertex, pointFragment, pointVertex, sunFragment, sunVertex } from './shaders'
import { makeRng } from './math'

export type SpaceSystem = {
  group: THREE.Group
  update: (time: number, progress: number, reduced: boolean) => void
  setOpacity: (value: number) => void
}

const SUN_LIGHT = new THREE.Vector3(-0.62, 0.38, 0.68).normalize()

const addPlanet = (
  group: THREE.Group,
  options: {
    radius: number
    position: THREE.Vector3
    deep: number
    mid: number
    high: number
    bands: number
    clouds: number
    seed: number
    atmosphere: number
  }
) => {
  const geo = new THREE.SphereGeometry(options.radius, 96, 96)
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uDeep: { value: new THREE.Color(options.deep) },
      uMid: { value: new THREE.Color(options.mid) },
      uHigh: { value: new THREE.Color(options.high) },
      uLightDir: { value: SUN_LIGHT.clone() },
      uTime: { value: 0 },
      uSeed: { value: options.seed },
      uBands: { value: options.bands },
      uClouds: { value: options.clouds }
    },
    vertexShader: planetVertex,
    fragmentShader: planetFragment
  })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.copy(options.position)
  group.add(mesh)

  const atmoGeo = new THREE.SphereGeometry(options.radius * 1.034, 64, 64)
  const atmoMat = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(options.atmosphere) },
      uLightDir: { value: SUN_LIGHT.clone() }
    },
    vertexShader: atmosphereVertex,
    fragmentShader: atmosphereFragment,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide
  })
  const atmo = new THREE.Mesh(atmoGeo, atmoMat)
  atmo.position.copy(options.position)
  group.add(atmo)
  return { mesh, mat, atmo, geo, atmoGeo, atmoMat }
}

export const createSpace = (renderer: THREE.WebGLRenderer, mobile: boolean): SpaceSystem => {
  const group = new THREE.Group()
  const random = makeRng(42071)
  const count = mobile ? 2200 : 5600
  const positions = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const colors = new Float32Array(count * 3)
  const starColors = [
    new THREE.Color(0xc6d4ee),
    new THREE.Color(0xfff1d2),
    new THREE.Color(0x8ea6ff),
    new THREE.Color(0xf0d0b4)
  ]

  for (let i = 0; i < count; i++) {
    const band = random() < 0.62
    let x: number, y: number, z: number
    if (band) {
      const along = (random() - 0.5) * 46
      const spread = Math.pow(random(), 1.65) * 4.8
      const angle = random() * Math.PI * 2
      x = along
      y = Math.cos(angle) * spread * 0.38 - along * 0.18
      z = Math.sin(angle) * spread - 8 - random() * 28
    } else {
      x = (random() - 0.5) * 52
      y = (random() - 0.5) * 28
      z = -random() * 42
    }
    positions.set([x, y, z], i * 3)
    const bright = random()
    sizes[i] = bright > 0.987 ? 2.6 + random() * 3.2 : 0.45 + random() * 1.35
    const color = starColors[Math.floor(random() * starColors.length)]
    colors.set([color.r, color.g, color.b], i * 3)
  }

  const starGeo = new THREE.BufferGeometry()
  starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  starGeo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
  starGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  const starMat = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(0xd5def0) },
      uOpacity: { value: 0.92 },
      uPixelRatio: { value: renderer.getPixelRatio() },
      uSize: { value: 1 }
    },
    vertexShader: pointVertex,
    fragmentShader: pointFragment,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  })
  const stars = new THREE.Points(starGeo, starMat)
  group.add(stars)

  const dustCanvas = document.createElement('canvas')
  dustCanvas.width = 256
  dustCanvas.height = 256
  const ctx = dustCanvas.getContext('2d')!
  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128)
  gradient.addColorStop(0, 'rgba(255,255,255,0.55)')
  gradient.addColorStop(0.35, 'rgba(255,255,255,0.12)')
  gradient.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 256, 256)
  const dustTex = new THREE.CanvasTexture(dustCanvas)
  dustTex.colorSpace = THREE.SRGBColorSpace

  const milkyWay = new THREE.Group()
  for (let i = 0; i < (mobile ? 6 : 10); i++) {
    const material = new THREE.SpriteMaterial({
      map: dustTex,
      color: i % 3 === 0 ? 0xb7c4e4 : 0x7f8eb8,
      transparent: true,
      opacity: 0.045 + random() * 0.03,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
    const sprite = new THREE.Sprite(material)
    sprite.position.set((random() - 0.5) * 18, (random() - 0.5) * 3.2 - 0.8, -12 - random() * 16)
    sprite.scale.set(8 + random() * 10, 1.6 + random() * 1.4, 1)
    milkyWay.add(sprite)
  }
  milkyWay.rotation.z = -0.32
  group.add(milkyWay)

  const sunGeo = new THREE.SphereGeometry(1.18, 64, 64)
  const sunMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: sunVertex,
    fragmentShader: sunFragment
  })
  const sun = new THREE.Mesh(sunGeo, sunMat)
  sun.position.set(-6.2, 2.15, -6)
  group.add(sun)

  const coronaMat = new THREE.SpriteMaterial({
    map: dustTex,
    color: 0xff9a4a,
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  })
  const corona = new THREE.Sprite(coronaMat)
  corona.position.copy(sun.position)
  corona.scale.set(4.8, 4.8, 1)
  group.add(corona)

  const earth = addPlanet(group, {
    radius: mobile ? 1.55 : 2.05,
    position: new THREE.Vector3(4.4, 0.15, -7.2),
    deep: 0x07122c,
    mid: 0x1d4a86,
    high: 0xb7c9e8,
    bands: 11,
    clouds: 0.72,
    seed: 1.4,
    atmosphere: 0x7aa7ff
  })

  const giant = addPlanet(group, {
    radius: mobile ? 0.72 : 0.95,
    position: new THREE.Vector3(-3.1, -1.7, -16),
    deep: 0x2a120c,
    mid: 0x8a3a22,
    high: 0xffb07a,
    bands: 9,
    clouds: 0.1,
    seed: 5.8,
    atmosphere: 0xff7a55
  })

  const ice = addPlanet(group, {
    radius: 0.38,
    position: new THREE.Vector3(6.6, 2.4, -13),
    deep: 0x1a2438,
    mid: 0x6b7c93,
    high: 0xd5e2ef,
    bands: 7,
    clouds: 0.05,
    seed: 3.1,
    atmosphere: 0xa8c4e0
  })

  const satellite = new THREE.Group()
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xc4cad3, metalness: 0.82, roughness: 0.28 })
  const panelMat = new THREE.MeshStandardMaterial({ color: 0x12315c, metalness: 0.35, roughness: 0.22, emissive: 0x061428, emissiveIntensity: 0.35 })
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.3, 0.42), bodyMat)
  const dish = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), bodyMat)
  dish.rotation.x = Math.PI / 2
  dish.position.z = 0.28
  const left = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.03, 0.38), panelMat)
  const right = left.clone()
  left.position.x = -0.86
  right.position.x = 0.86
  satellite.add(body, dish, left, right)
  satellite.scale.setScalar(mobile ? 0.62 : 0.78)
  group.add(satellite)

  const ufo = new THREE.Group()
  const hull = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 24, 16),
    new THREE.MeshStandardMaterial({ color: 0x9aa6b4, metalness: 0.88, roughness: 0.18 })
  )
  hull.scale.set(1.7, 0.38, 1.7)
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshPhysicalMaterial({ color: 0x7fe7e2, roughness: 0.12, metalness: 0.1, transparent: true, opacity: 0.7, emissive: 0x1c4d52, emissiveIntensity: 0.45 })
  )
  dome.position.y = 0.05
  ufo.add(hull, dome)
  ufo.scale.setScalar(mobile ? 0.45 : 0.55)
  group.add(ufo)

  const key = new THREE.DirectionalLight(0xffe7c4, 2.4)
  key.position.copy(sun.position)
  group.add(key)
  group.add(new THREE.AmbientLight(0x6b7a99, 0.28))

  const setOpacity = (value: number) => {
    group.visible = value > 0.01
    starMat.uniforms.uOpacity.value = 0.18 + value * 0.74
    coronaMat.opacity = 0.08 + value * 0.26
    milkyWay.children.forEach((child, i) => {
      const material = (child as THREE.Sprite).material
      material.opacity = value * (0.03 + (i % 3) * 0.012)
    })
    satellite.visible = value > 0.2
    ufo.visible = value > 0.25
  }

  const update = (time: number, progress: number, reduced: boolean) => {
    sunMat.uniforms.uTime.value = time
    earth.mat.uniforms.uTime.value = time
    giant.mat.uniforms.uTime.value = time * 0.7
    ice.mat.uniforms.uTime.value = time * 0.5
    corona.scale.setScalar(4.6 + Math.sin(time * 0.7) * 0.18)
    if (reduced) return
    earth.mesh.rotation.y = time * 0.026
    earth.atmo.rotation.copy(earth.mesh.rotation)
    giant.mesh.rotation.y = -time * 0.014
    ice.mesh.rotation.y = time * 0.04
    satellite.position.set(5.4 - progress * 9, 1.15 + Math.sin(time * 0.22) * 0.18, -1.2)
    satellite.rotation.set(0.4, time * 0.08, 0.18 + Math.sin(time * 0.2) * 0.12)
    const ufoGate = progress > 0.06 && progress < 0.16
    ufo.visible = ufoGate
    if (ufoGate) {
      const local = (progress - 0.06) / 0.1
      ufo.position.set(-8 + local * 18, 2.1 + Math.sin(time * 1.4) * 0.16, -2.2)
      ufo.rotation.z = Math.sin(time * 1.1) * 0.05
    }
    stars.rotation.z = Math.sin(time * 0.02) * 0.01
  }

  return { group, update, setOpacity }
}
