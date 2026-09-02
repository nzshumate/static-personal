import * as THREE from 'three'
import { domeFragment, domeVertex, pointFragment, pointVertex, sunFragment, sunVertex, terrainFragment, terrainVertex, waterFragment, waterVertex } from './shaders'
import { makeRng, pulse } from './math'

export const Z_STEP = 26

export type BiomeSystem = {
  groups: THREE.Group[]
  update: (time: number, progress: number, reduced: boolean) => void
}

const LIGHT = new THREE.Vector3(-0.58, 0.62, 0.52).normalize()

const metal = (color: number, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, metalness: 0.78, roughness: 0.28, fog: false, ...extra })

const matte = (color: number, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, metalness: 0.04, roughness: 0.92, fog: false, ...extra })

const emit = (color: number, intensity = 0.55) =>
  new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.4, metalness: 0.08, fog: false })

const softTexture = () => {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')!
  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128)
  gradient.addColorStop(0, 'rgba(255,255,255,0.7)')
  gradient.addColorStop(0.3, 'rgba(255,255,255,0.16)')
  gradient.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 256, 256)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

const addDome = (group: THREE.Group, zenith: number, horizon: number, sunColor: number, sunPos: THREE.Vector3) => {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uZenith: { value: new THREE.Color(zenith) },
      uHorizon: { value: new THREE.Color(horizon) },
      uSunColor: { value: new THREE.Color(sunColor) },
      uSunPos: { value: sunPos.clone() },
      uOpacity: { value: 1 }
    },
    vertexShader: domeVertex,
    fragmentShader: domeFragment,
    side: THREE.BackSide,
    depthWrite: false
  })
  group.add(new THREE.Mesh(new THREE.SphereGeometry(42, 48, 32), material))
}

const addSprite = (group: THREE.Group, map: THREE.Texture, color: number, opacity: number, position: THREE.Vector3, scale: THREE.Vector2, additive = false) => {
  const material = new THREE.SpriteMaterial({
    map,
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending
  })
  const sprite = new THREE.Sprite(material)
  sprite.position.copy(position)
  sprite.scale.set(scale.x, scale.y, 1)
  group.add(sprite)
  return sprite
}

const addPoints = (
  group: THREE.Group,
  renderer: THREE.WebGLRenderer,
  count: number,
  color: number,
  size: number,
  place: (i: number) => THREE.Vector3
) => {
  const positions = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    const p = place(i)
    positions.set([p.x, p.y, p.z], i * 3)
    sizes[i] = 0.55 + Math.random() * 1.6
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: 0.62 },
      uPixelRatio: { value: renderer.getPixelRatio() },
      uSize: { value: size }
    },
    vertexShader: pointVertex,
    fragmentShader: pointFragment,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  })
  const points = new THREE.Points(geometry, material)
  group.add(points)
  return { points, material }
}

const displace = (geometry: THREE.PlaneGeometry, height: (x: number, z: number) => number) => {
  const pos = geometry.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < pos.count; i++) pos.setY(i, height(pos.getX(i), pos.getZ(i)))
  geometry.computeVertexNormals()
}

const addTerrain = (group: THREE.Group, geometry: THREE.PlaneGeometry, low: number, mid: number, high: number, seed: number) => {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uLow: { value: new THREE.Color(low) },
      uMid: { value: new THREE.Color(mid) },
      uHigh: { value: new THREE.Color(high) },
      uLightDir: { value: LIGHT.clone() },
      uTime: { value: 0 },
      uSeed: { value: seed }
    },
    vertexShader: terrainVertex,
    fragmentShader: terrainFragment
  })
  group.add(new THREE.Mesh(geometry, material))
  return material
}

const addStar = (group: THREE.Group, glow: THREE.Texture, position: THREE.Vector3, scale: number) => {
  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: sunVertex,
    fragmentShader: sunFragment
  })
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 48), material)
  mesh.position.copy(position)
  mesh.scale.setScalar(scale)
  const corona = addSprite(group, glow, 0xff9a4a, 0.3, position, new THREE.Vector2(scale * 4.2, scale * 4.2), true)
  group.add(mesh)
  return { mesh, material, corona }
}

const addMoon = (group: THREE.Group, glow: THREE.Texture, position: THREE.Vector3, scale: number, color = 0xd5e2ef) => {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 32), matte(color, { roughness: 1 }))
  mesh.position.copy(position)
  mesh.scale.setScalar(scale)
  group.add(mesh)
  addSprite(group, glow, color, 0.16, position, new THREE.Vector2(scale * 5.5, scale * 5.5), true)
  return mesh
}

const addWater = (deep: number, shallow: number, amp: number, opacity: number, width: number, depth: number, segs: number) => {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uAmp: { value: amp },
      uDeep: { value: new THREE.Color(deep) },
      uShallow: { value: new THREE.Color(shallow) },
      uOpacity: { value: opacity }
    },
    vertexShader: waterVertex,
    fragmentShader: waterFragment,
    transparent: true
  })
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, depth, segs, Math.floor(segs * 0.6)), material)
  mesh.rotation.x = -Math.PI / 2
  return { mesh, material }
}

const birdPath = new THREE.BufferGeometry().setFromPoints([
  new THREE.Vector3(-0.2, 0, 0),
  new THREE.Vector3(0, 0.07, 0),
  new THREE.Vector3(0.2, 0, 0)
])

const addFlock = (group: THREE.Group, count: number, color: number) => {
  const birds: THREE.Line[] = []
  for (let i = 0; i < count; i++) {
    const bird = new THREE.Line(birdPath, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.72 }))
    group.add(bird)
    birds.push(bird)
  }
  return birds
}

export const createBiomes = (renderer: THREE.WebGLRenderer, mobile: boolean): BiomeSystem => {
  const random = makeRng(91337)
  const glow = softTexture()
  const groups: THREE.Group[] = []
  const tick: Array<(time: number, progress: number, reduced: boolean) => void> = []
  const dummy = new THREE.Object3D()

  const sky = new THREE.Group()
  addDome(sky, 0x0b1c3a, 0x8fb4d2, 0xffc878, new THREE.Vector3(-10, 6, -8))
  sky.add(new THREE.HemisphereLight(0xb7d4f0, 0x243044, 0.62))
  const skySun = addStar(sky, glow, new THREE.Vector3(-8.4, 3.4, -10), 0.42)
  addMoon(sky, glow, new THREE.Vector3(8.2, 3.8, -14), 0.22)
  addPoints(sky, renderer, mobile ? 80 : 160, 0xd5e4ff, 0.55, () =>
    new THREE.Vector3((random() - 0.5) * 28, 1.5 + random() * 10, -10 - random() * 16)
  )
  for (let i = 0; i < (mobile ? 22 : 40); i++) {
    addSprite(
      sky,
      glow,
      i % 3 ? 0xe8eef4 : 0xc5d2e0,
      0.1 + random() * 0.1,
      new THREE.Vector3((random() - 0.5) * 30, -0.4 + random() * 6.5, -3 - random() * 16),
      new THREE.Vector2(3.6 + random() * 5.2, 1.1 + random() * 1.6)
    )
  }
  const plane = new THREE.Group()
  const fuselage = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 1.7, 4, 8), metal(0xd5dee6))
  fuselage.rotation.z = Math.PI / 2
  const wing = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.035, 0.46), metal(0x9eb0c4))
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 0.04), metal(0x9eb0c4))
  tail.position.set(-0.72, 0.14, 0)
  plane.add(fuselage, wing, tail)
  sky.add(plane)
  const contrail = addSprite(sky, glow, 0xe8f2ff, 0.12, new THREE.Vector3(0, 0, 0), new THREE.Vector2(4.8, 0.22), true)
  const heli = new THREE.Group()
  const heliBody = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 14), metal(0x2a333d))
  heliBody.scale.set(1.45, 0.7, 0.78)
  const rotor = new THREE.Mesh(new THREE.BoxGeometry(2, 0.02, 0.07), metal(0xc5ced6))
  rotor.position.y = 0.36
  const skid = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.02, 0.04), metal(0x8a94a0))
  skid.position.y = -0.22
  heli.add(heliBody, rotor, skid)
  sky.add(heli)
  const balloon = new THREE.Group()
  balloon.add(new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 16), matte(0xc45a3a, { roughness: 0.5 })))
  balloon.add(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.16), matte(0x6a4a2e)))
  balloon.children[1].position.y = -0.56
  sky.add(balloon)
  const glider = new THREE.Group()
  glider.add(new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.025, 0.28), matte(0xc45a2a)))
  glider.add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), matte(0x2a241c)))
  glider.children[1].position.y = -0.12
  sky.add(glider)
  const weather = new THREE.Group()
  weather.add(new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), matte(0xf2f4f6)))
  weather.add(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.18, 0.05), metal(0x6a727a)))
  weather.children[1].position.y = -0.22
  sky.add(weather)
  const birds = addFlock(sky, 14, 0x1a222b)
  tick.push((time, _progress, reduced) => {
    skySun.material.uniforms.uTime.value = time
    skySun.corona.scale.setScalar(1.7 + Math.sin(time * 0.6) * 0.06)
    if (reduced) return
    const px = -10 + ((time * 0.4) % 22)
    plane.position.set(px, 2.35 + Math.sin(time * 0.4) * 0.1, -3.2)
    plane.rotation.z = Math.sin(time * 0.3) * 0.03
    contrail.position.set(px - 2.4, plane.position.y, -3.2)
    rotor.rotation.y = time * 16
    heli.position.set(8 - ((time * 0.26) % 18), 0.55 + Math.sin(time * 0.55) * 0.1, -2.1)
    balloon.position.set(3.2, 2.7 + Math.sin(time * 0.35) * 0.22, -6.2)
    balloon.rotation.z = Math.sin(time * 0.4) * 0.05
    glider.position.set(-2 + Math.sin(time * 0.18) * 5, 1.8 + Math.sin(time * 0.5) * 0.3, -4.4)
    glider.rotation.z = Math.sin(time * 0.5) * 0.12
    weather.position.set(6.2, 3.1 + Math.sin(time * 0.2) * 0.16, -8)
    birds.forEach((bird, i) => {
      bird.position.set(-8 + ((time * 0.22 + i * 0.65) % 17), 1.4 + (i % 4) * 0.3 + Math.sin(time + i) * 0.07, -3.2 - (i % 3))
    })
  })
  groups.push(sky)

  const mountains = new THREE.Group()
  addDome(mountains, 0x2a3a4c, 0xc5d2de, 0xffd7a0, new THREE.Vector3(8, 5, -10))
  mountains.add(new THREE.HemisphereLight(0xe4eaf0, 0x2a3038, 0.7))
  addMoon(mountains, glow, new THREE.Vector3(-7.6, 3.8, -12), 0.28)
  const ridge = new THREE.PlaneGeometry(38, 22, mobile ? 80 : 140, mobile ? 46 : 80)
  ridge.rotateX(-Math.PI / 2)
  displace(ridge, (x, z) => {
    const wave = Math.sin(x * 0.32) + Math.sin(x * 0.74 + 1.1) * 0.58 + Math.sin(x * 1.55 + z * 0.22) * 0.2
    const fall = Math.pow(Math.max(0, 1 - Math.abs(z) / 12), 1.12)
    return -3.35 + Math.max(0, wave + 1.2) * 2.65 * fall
  })
  const mountainMat = addTerrain(mountains, ridge, 0x4a5560, 0x8b95a1, 0xeef3f6, 1.2)
  for (let i = 0; i < 5; i++) {
    const peak = new THREE.Mesh(new THREE.ConeGeometry(1.4 + random() * 0.8, 3.2 + random() * 2.2, 5), matte(0x9aa4ae))
    peak.position.set(-12 + i * 5.4 + random(), -1.1, -9 - random() * 3)
    peak.rotation.y = random()
    mountains.add(peak)
  }
  for (let i = 0; i < 8; i++) {
    addSprite(mountains, glow, 0xdbe6ef, 0.07, new THREE.Vector3((random() - 0.5) * 16, -0.2 + random() * 3, -5 - random() * 8), new THREE.Vector2(5.4 + random() * 4, 1.5), true)
  }
  const snowField = addPoints(mountains, renderer, mobile ? 320 : 820, 0xf6f8fb, 0.88, () =>
    new THREE.Vector3((random() - 0.5) * 22, (random() - 0.5) * 10, -1 - random() * 12)
  )
  const cabin = new THREE.Group()
  cabin.add(new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.42, 0.52), matte(0x4a2e1c)))
  cabin.add(new THREE.Mesh(new THREE.ConeGeometry(0.52, 0.32, 4), matte(0x6a3a22)))
  cabin.children[1].position.y = 0.34
  cabin.children[1].rotation.y = Math.PI / 4
  cabin.position.set(-4.6, -2.15, -4.2)
  mountains.add(cabin)
  const smoke = addSprite(mountains, glow, 0xd8dee4, 0.16, new THREE.Vector3(-4.6, -1.55, -4.2), new THREE.Vector2(0.45, 0.7))
  const car = new THREE.Group()
  car.add(new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.2), metal(0xc45a3a)))
  mountains.add(car)
  const cable = new THREE.Mesh(new THREE.BoxGeometry(10, 0.012, 0.012), metal(0x9aa4ae))
  cable.position.set(1.2, 0.85, -6)
  cable.rotation.z = -0.22
  mountains.add(cable)
  const eagle = new THREE.Group()
  eagle.add(new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), matte(0x3a2a1c)))
  eagle.add(new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.02, 0.1), matte(0x2a2018)))
  mountains.add(eagle)
  const skier = new THREE.Group()
  skier.add(new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.3, 4, 8), matte(0xc4333d)))
  const ski = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.016, 0.045), metal(0x14181c))
  const ski2 = ski.clone()
  ski.position.set(0, -0.3, 0.08)
  ski2.position.set(0, -0.3, -0.08)
  skier.add(ski, ski2)
  mountains.add(skier)
  const yeti = new THREE.Group()
  const yetiBody = new THREE.Mesh(new THREE.SphereGeometry(0.34, 18, 14), matte(0xd8dce0))
  yetiBody.scale.set(0.75, 1.35, 0.6)
  const yetiHead = new THREE.Mesh(new THREE.SphereGeometry(0.19, 16, 12), matte(0xcfd4d8))
  yetiHead.position.y = 0.5
  yeti.add(yetiBody, yetiHead)
  mountains.add(yeti)
  tick.push((time, progress, reduced) => {
    mountainMat.uniforms.uTime.value = time
    snowField.points.position.y = -((time * 0.16) % 1.7)
    smoke.position.y = -1.55 + Math.sin(time * 0.8) * 0.08
    smoke.material.opacity = 0.1 + Math.sin(time * 0.9) * 0.05
    if (reduced) return
    skier.position.set(-6.2 + ((time * 0.36) % 14), -1.8 + Math.sin(time * 0.5) * 0.08, -2.2)
    skier.rotation.z = -0.18
    car.position.set(-3.2 + ((time * 0.12) % 8), 0.55 - ((time * 0.12) % 8) * 0.12, -5.8)
    eagle.position.set(-2 + Math.sin(time * 0.2) * 6, 2.1 + Math.sin(time * 0.4) * 0.25, -5)
    eagle.rotation.z = Math.sin(time * 0.8) * 0.15
    yeti.position.set(5.4, -1.32, -5)
    yeti.visible = pulse(progress, 0.24, 0.31, 0.38) > 0.08 && Math.sin(time * 0.22) > 0.12
  })
  groups.push(mountains)

  const forest = new THREE.Group()
  addDome(forest, 0x06140f, 0x163028, 0x8fe0a8, new THREE.Vector3(7, 8, -12))
  forest.add(new THREE.HemisphereLight(0x8fb59a, 0x08140f, 0.52))
  addMoon(forest, glow, new THREE.Vector3(6.8, 3.6, -11), 0.26, 0xcfe6d8)
  const floor = new THREE.PlaneGeometry(36, 22, mobile ? 40 : 70, mobile ? 24 : 40)
  floor.rotateX(-Math.PI / 2)
  displace(floor, (x, z) => -3.05 + Math.sin(x * 0.4) * 0.12 + Math.sin(z * 0.55) * 0.1)
  const forestFloor = addTerrain(forest, floor, 0x0c1810, 0x17301c, 0x2a4a28, 2.4)
  const treeCount = mobile ? 48 : 96
  const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.05, 0.12, 2.6, 6), matte(0x2a2118), treeCount)
  const canopies = new THREE.InstancedMesh(new THREE.SphereGeometry(0.72, 14, 10), matte(0x16351f), treeCount * 3)
  let canopyIndex = 0
  for (let i = 0; i < treeCount; i++) {
    const x = (random() - 0.5) * 24
    const z = -1.2 - random() * 14
    const s = 0.78 + random() * 1.55
    dummy.position.set(x, -1.85, z)
    dummy.scale.set(s, s, s)
    dummy.rotation.y = random() * Math.PI
    dummy.updateMatrix()
    trunks.setMatrixAt(i, dummy.matrix)
    for (let k = 0; k < 3; k++) {
      dummy.position.set(x + (k - 1) * 0.18 * s, -0.45 + k * 0.24 * s, z + (k % 2 ? 0.12 : -0.1) * s)
      dummy.scale.setScalar(s * (0.68 + k * 0.13))
      dummy.updateMatrix()
      canopies.setMatrixAt(canopyIndex++, dummy.matrix)
    }
  }
  forest.add(trunks, canopies)
  for (let i = 0; i < 8; i++) {
    addSprite(forest, glow, 0xb7d0c2, 0.05, new THREE.Vector3((random() - 0.5) * 14, -2 + random(), -3 - random() * 8), new THREE.Vector2(6 + random() * 5, 1.3))
  }
  const fireflies = addPoints(forest, renderer, mobile ? 110 : 240, 0xe8ff9a, 1.05, () =>
    new THREE.Vector3((random() - 0.5) * 16, -2 + random() * 4.2, -1.6 - random() * 10)
  )
  for (let i = 0; i < 7; i++) {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), emit(i % 2 ? 0xff6a4a : 0xf2c14a, 0.8))
    cap.position.set(-5 + i * 1.4, -2.82, -2.4 - (i % 3) * 0.6)
    forest.add(cap)
  }
  const camp = addSprite(forest, glow, 0xff8a3a, 0.28, new THREE.Vector3(1.6, -2.7, -3.1), new THREE.Vector2(0.9, 0.7), true)
  const deer = new THREE.Group()
  const deerBody = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), matte(0x3a2a1c))
  deerBody.scale.set(1.55, 0.82, 0.72)
  const neck = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.24, 3, 6), matte(0x3a2a1c))
  neck.position.set(0.2, 0.18, 0)
  neck.rotation.z = -0.58
  deer.add(deerBody, neck)
  deer.scale.setScalar(1.7)
  forest.add(deer)
  const fox = new THREE.Group()
  fox.add(new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), matte(0xc45a28)))
  fox.children[0].scale.set(1.6, 0.7, 0.7)
  fox.add(new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.16, 5), matte(0xc45a28)))
  fox.children[1].position.set(-0.2, 0.02, 0)
  fox.children[1].rotation.z = Math.PI / 2
  forest.add(fox)
  const owl = new THREE.Group()
  owl.add(new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), matte(0x1c1610)))
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8), emit(0xf0c14a, 1.2))
  const eye2 = eye.clone()
  eye.position.set(0.032, 0.02, 0.08)
  eye2.position.set(-0.032, 0.02, 0.08)
  owl.add(eye, eye2)
  forest.add(owl)
  tick.push((time, progress, reduced) => {
    forestFloor.uniforms.uTime.value = time
    fireflies.points.position.y = Math.sin(time * 0.35) * 0.1
    camp.material.opacity = 0.2 + Math.sin(time * 6) * 0.08
    if (reduced) return
    deer.position.set(-4 + Math.sin(time * 0.12) * 1.6, -2.4, -3.3)
    fox.position.set(2.4 + Math.sin(time * 0.2) * 1.1, -2.72, -2.8)
    owl.position.set(4.6, -0.15, -4.2)
    owl.visible = pulse(progress, 0.38, 0.44, 0.5) > 0.18 && Math.sin(time * 0.7) > -0.15
  })
  groups.push(forest)

  const desert = new THREE.Group()
  addDome(desert, 0x1a2438, 0xf0b46a, 0xff9a40, new THREE.Vector3(-9, 5, -8))
  desert.add(new THREE.HemisphereLight(0xffd7a0, 0x4a2a10, 0.85))
  const desertSun = addStar(desert, glow, new THREE.Vector3(-8.6, 3.2, -9), 0.55)
  addPoints(desert, renderer, mobile ? 60 : 140, 0xf2e0b4, 0.45, () =>
    new THREE.Vector3((random() - 0.5) * 28, 2 + random() * 8, -10 - random() * 14)
  )
  const dunes = new THREE.PlaneGeometry(38, 22, mobile ? 70 : 120, mobile ? 40 : 70)
  dunes.rotateX(-Math.PI / 2)
  displace(dunes, (x, z) => -2.7 + Math.sin(x * 0.36 + z * 0.16) * 0.82 + Math.sin(x * 0.14 - z * 0.28) * 0.48)
  const duneMat = addTerrain(desert, dunes, 0x8a4a22, 0xc48a48, 0xf0d08a, 3.1)
  for (let i = 0; i < 5; i++) {
    const cactus = new THREE.Group()
    cactus.add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.1 + random() * 0.5, 8), matte(0x2a4a28)))
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.38, 6), matte(0x2a4a28))
    arm.position.set(0.16, 0.12, 0)
    arm.rotation.z = 1.15
    cactus.add(arm)
    cactus.position.set(-7 + i * 3.2, -2.15, -4.4 - random() * 3)
    desert.add(cactus)
  }
  const oasis = addWater(0x0a3a40, 0x3aa8ae, 0.04, 0.88, 2.4, 1.6, 24)
  oasis.mesh.position.set(-1.2, -2.62, -5.4)
  desert.add(oasis.mesh)
  const pyramid = new THREE.Mesh(new THREE.ConeGeometry(1.35, 1.6, 4), matte(0xb8864c, { roughness: 1 }))
  pyramid.position.set(6.6, -1.55, -8.2)
  pyramid.rotation.y = 0.62
  desert.add(pyramid)
  const camel = new THREE.Group()
  camel.add(new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), matte(0x8a5a32)))
  camel.children[0].scale.set(1.7, 0.85, 0.8)
  const hump = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), matte(0x8a5a32))
  hump.position.set(0.02, 0.2, 0)
  camel.add(hump)
  desert.add(camel)
  const tumble = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4, 1), new THREE.MeshBasicMaterial({ color: 0x7a5a38, wireframe: true, transparent: true, opacity: 0.75 }))
  desert.add(tumble)
  const snake = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.62, 3, 6), matte(0x6a4a28))
  snake.rotation.z = Math.PI / 2
  desert.add(snake)
  const scorpion = new THREE.Group()
  scorpion.add(new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), matte(0x3a2414)))
  scorpion.add(new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.16, 5), matte(0x3a2414)))
  scorpion.children[1].position.set(0.12, 0.08, 0)
  scorpion.children[1].rotation.z = -1.1
  desert.add(scorpion)
  for (let i = 0; i < 7; i++) {
    addSprite(desert, glow, 0xf3c17e, 0.05, new THREE.Vector3((random() - 0.5) * 16, -0.2 + random() * 3, -4 - random() * 8), new THREE.Vector2(6.2, 2.1), true)
  }
  const sand = addPoints(desert, renderer, mobile ? 80 : 180, 0xf0d08a, 0.5, () =>
    new THREE.Vector3((random() - 0.5) * 18, -2.2 + random() * 2.4, -2 - random() * 10)
  )
  tick.push((time, _progress, reduced) => {
    desertSun.material.uniforms.uTime.value = time
    duneMat.uniforms.uTime.value = time
    oasis.material.uniforms.uTime.value = time
    sand.points.position.x = Math.sin(time * 0.15) * 0.4
    if (reduced) return
    tumble.position.set(-7.4 + ((time * 0.42) % 16), -2.45 + Math.abs(Math.sin(time * 1.5)) * 0.32, -2.6)
    tumble.rotation.z = time * 1.7
    snake.position.set(Math.sin(time * 0.18) * 4.2, -2.72, -3.1)
    camel.position.set(-3.2 + Math.sin(time * 0.08) * 2.2, -2.35, -3.8)
    scorpion.position.set(2.4 + Math.sin(time * 0.3) * 0.8, -2.68, -3.4)
  })
  groups.push(desert)

  const swamp = new THREE.Group()
  addDome(swamp, 0x071412, 0x1c332c, 0x8fbf88, new THREE.Vector3(6, 7, -10))
  swamp.add(new THREE.HemisphereLight(0x8fbfa8, 0x081412, 0.48))
  addMoon(swamp, glow, new THREE.Vector3(-6.4, 3.4, -12), 0.24, 0xc5e0d4)
  const swampWater = addWater(0x071c1c, 0x2c5648, 0.05, 0.9, 34, 22, mobile ? 50 : 90)
  swampWater.mesh.position.y = -2.88
  swamp.add(swampWater.mesh)
  const cypress = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.07, 0.22, 4.4, 7), matte(0x3d3228), mobile ? 22 : 44)
  for (let i = 0; i < cypress.count; i++) {
    dummy.position.set((random() - 0.5) * 22, -1.05, -2 - random() * 12)
    dummy.scale.set(0.8 + random() * 0.85, 0.85 + random() * 1.25, 0.8 + random() * 0.85)
    dummy.rotation.z = (random() - 0.5) * 0.1
    dummy.updateMatrix()
    cypress.setMatrixAt(i, dummy.matrix)
  }
  swamp.add(cypress)
  for (let i = 0; i < (mobile ? 10 : 18); i++) {
    addSprite(swamp, glow, 0x8fa392, 0.08, new THREE.Vector3((random() - 0.5) * 12, -0.3 + random() * 2.4, -3 - random() * 8), new THREE.Vector2(1.15, 3.4))
  }
  for (let i = 0; i < 8; i++) {
    addSprite(swamp, glow, 0xa8b8a8, 0.05, new THREE.Vector3((random() - 0.5) * 16, -1.8 + random(), -3 - random() * 8), new THREE.Vector2(6.2, 1.5))
  }
  const wisps = addPoints(swamp, renderer, mobile ? 40 : 90, 0xb8ff9a, 1.15, () =>
    new THREE.Vector3((random() - 0.5) * 14, -2.4 + random() * 3.2, -2 - random() * 9)
  )
  const boat = new THREE.Group()
  boat.add(new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.85, 4, 8), matte(0x4a3220)))
  boat.children[0].rotation.z = Math.PI / 2
  swamp.add(boat)
  const heron = new THREE.Group()
  heron.add(new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), matte(0xd5d8dc)))
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.18, 6), matte(0xc48a3a))
  beak.rotation.z = Math.PI / 2
  beak.position.x = 0.14
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.42, 5), matte(0xd5d8dc))
  leg.position.y = -0.28
  heron.add(beak, leg)
  swamp.add(heron)
  const gator = new THREE.Group()
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 8), emit(0xc4e36a, 1.1))
  const eyeR = eyeL.clone()
  eyeL.position.set(-0.09, 0, 0)
  eyeR.position.set(0.09, 0, 0)
  gator.add(eyeL, eyeR)
  swamp.add(gator)
  const flies: THREE.Mesh[] = []
  for (let i = 0; i < 6; i++) {
    const fly = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), emit(0x8fd4a0, 0.7))
    swamp.add(fly)
    flies.push(fly)
  }
  tick.push((time, progress, reduced) => {
    swampWater.material.uniforms.uTime.value = time
    wisps.points.position.y = Math.sin(time * 0.25) * 0.12
    if (reduced) return
    boat.position.set(-1.4 + Math.sin(time * 0.12) * 1.1, -2.72, -4.2)
    boat.rotation.z = Math.sin(time * 0.5) * 0.04
    heron.position.set(-2.8, -2.12 + Math.sin(time * 0.4) * 0.03, -2.7)
    gator.visible = pulse(progress, 0.62, 0.68, 0.74) > 0.15 && Math.sin(time * 0.3) > 0
    gator.position.set(3.2 + Math.sin(time * 0.08) * 0.45, -2.8, -3.5)
    flies.forEach((fly, i) => {
      fly.position.set(Math.sin(time * 0.7 + i) * 4, -1.6 + Math.sin(time * 1.2 + i) * 0.8, -3 - (i % 3))
    })
  })
  groups.push(swamp)

  const beach = new THREE.Group()
  addDome(beach, 0x16344c, 0xf0c090, 0xff8a40, new THREE.Vector3(-9, 3, -8))
  beach.add(new THREE.HemisphereLight(0xd8eef2, 0x243038, 0.62))
  const beachSun = addStar(beach, glow, new THREE.Vector3(-8.2, 1.6, -11), 0.48)
  const sand = new THREE.PlaneGeometry(36, 14, mobile ? 40 : 70, mobile ? 20 : 36)
  sand.rotateX(-Math.PI / 2)
  displace(sand, (x, z) => -3.12 + Math.sin(x * 0.5) * 0.08 + Math.max(0, z + 2) * 0.04)
  const sandMat = addTerrain(beach, sand, 0x8a6a3a, 0xc9ae7a, 0xe8d4a0, 4.2)
  const sea = addWater(0x0a4a5c, 0x3aa8ae, 0.09, 0.92, 38, 22, mobile ? 70 : 120)
  sea.mesh.position.set(0, -2.8, -10)
  beach.add(sea.mesh)
  const foam = new THREE.Mesh(
    new THREE.PlaneGeometry(26, 0.36),
    new THREE.MeshBasicMaterial({ color: 0xf4fbff, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false })
  )
  foam.rotation.x = -Math.PI / 2
  foam.position.set(0, -2.74, -3.05)
  beach.add(foam)
  for (let i = 0; i < 5; i++) {
    const palm = new THREE.Group()
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.09, 2.1, 7), matte(0x6a4a28))
    trunk.rotation.z = 0.18
    const frond = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8), matte(0x1c4a28))
    frond.scale.set(1.3, 0.35, 1.1)
    frond.position.set(0.22, 1.05, 0)
    palm.add(trunk, frond)
    palm.position.set(-8 + i * 2.1, -2.15, -1.6 - (i % 2) * 0.8)
    beach.add(palm)
  }
  const lightHouse = new THREE.Group()
  lightHouse.add(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 1.8, 10), matte(0xe8e4dc)))
  lightHouse.add(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.22, 8), emit(0xfff1c4, 1.4)))
  lightHouse.children[1].position.y = 1.02
  lightHouse.position.set(7.1, -2.15, -4.4)
  beach.add(lightHouse)
  const beam = addSprite(beach, glow, 0xfff1c4, 0.2, new THREE.Vector3(7.1, -1.1, -4.4), new THREE.Vector2(3.2, 0.45), true)
  const sail = new THREE.Group()
  sail.add(new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.78, 4, 8), matte(0xe8ebe8)))
  sail.children[0].rotation.z = Math.PI / 2
  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.46), matte(0xf3f6f8))
  cloth.position.set(0, 0.36, 0)
  sail.add(cloth)
  beach.add(sail)
  const umbrella = new THREE.Group()
  umbrella.add(new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.7, 6), matte(0xe8e4dc)))
  umbrella.add(new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.16, 8), matte(0xc4333d)))
  umbrella.children[1].position.y = 0.28
  umbrella.position.set(-2.6, -2.78, -2.2)
  beach.add(umbrella)
  const crab = new THREE.Group()
  crab.add(new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), matte(0xc45a28)))
  crab.scale.set(1.3, 0.55, 1)
  beach.add(crab)
  const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.16, 8), new THREE.MeshStandardMaterial({ color: 0x7ec8b8, transparent: true, opacity: 0.55, roughness: 0.15, metalness: 0.1, fog: false }))
  beach.add(bottle)
  const gulls = addFlock(beach, 8, 0xf0f3f6)
  tick.push((time, _progress, reduced) => {
    beachSun.material.uniforms.uTime.value = time
    sandMat.uniforms.uTime.value = time
    sea.material.uniforms.uTime.value = time
    foam.position.z = -3.05 + Math.sin(time * 0.7) * 0.2
    ;(foam.material as THREE.MeshBasicMaterial).opacity = 0.22 + Math.sin(time * 0.9) * 0.07
    beam.material.rotation = time * 0.35
    beam.scale.x = 2.6 + Math.sin(time * 0.8) * 0.4
    if (reduced) return
    sail.position.set(2.6 + Math.sin(time * 0.15) * 1.3, -2.52, -7.1)
    sail.rotation.z = Math.sin(time * 0.6) * 0.045
    bottle.position.set(-1.7, -3 + Math.sin(time * 0.8) * 0.02, -3.3)
    crab.position.set(-0.4 + Math.sin(time * 0.25) * 1.4, -3.02, -2.5)
    gulls.forEach((gull, i) => {
      gull.position.set(-6 + ((time * 0.2 + i) % 15), 1.15 + (i % 3) * 0.28, -5)
    })
  })
  groups.push(beach)

  const ocean = new THREE.Group()
  addDome(ocean, 0x01080e, 0x063040, 0x4aa8b4, new THREE.Vector3(0, 10, -6))
  ocean.add(new THREE.HemisphereLight(0x4aa8b4, 0x021018, 0.42))
  const veil = new THREE.Mesh(
    new THREE.PlaneGeometry(42, 26),
    new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragmentShader: `
        uniform float uTime; varying vec2 vUv;
        void main() {
          float d = 1.0 - vUv.y;
          vec3 top = vec3(0.02, 0.24, 0.3);
          vec3 deep = vec3(0.002, 0.018, 0.05);
          vec3 color = mix(top, deep, smoothstep(0.04, 1.0, d));
          float c = sin((vUv.x + uTime * 0.02) * 42.0) * sin((vUv.y - uTime * 0.015) * 34.0);
          color += vec3(0.05, 0.18, 0.2) * pow(max(c, 0.0), 10.0) * 0.24;
          float ray = pow(max(1.0 - abs(vUv.x - 0.58), 0.0), 6.0) * smoothstep(0.2, 1.0, vUv.y);
          color += vec3(0.12, 0.4, 0.44) * ray * 0.16;
          gl_FragColor = vec4(color, 0.93);
        }
      `,
      transparent: true,
      depthWrite: false
    })
  )
  veil.position.z = -11
  ocean.add(veil)
  const marine = addPoints(ocean, renderer, mobile ? 360 : 980, 0xb7eef2, 0.6, () =>
    new THREE.Vector3((random() - 0.5) * 20, (random() - 0.5) * 12, -1 - random() * 14)
  )
  const fish: THREE.Group[] = []
  for (let i = 0; i < (mobile ? 10 : 18); i++) {
    const item = new THREE.Group()
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), matte(i % 3 ? 0x0c2430 : 0x1d4a52))
    body.scale.set(1.65, 0.65, 0.42)
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.22, 5), body.material)
    tail.rotation.z = Math.PI / 2
    tail.position.x = -0.34
    item.add(body, tail)
    item.userData = { dir: i % 2 ? 1 : -1, speed: 0.16 + random() * 0.22, y: -2.5 + random() * 5, z: -2 - random() * 8, phase: random() * 10 }
    ocean.add(item)
    fish.push(item)
  }
  const jelly: THREE.Group[] = []
  for (let i = 0; i < 5; i++) {
    const item = new THREE.Group()
    const bell = new THREE.Mesh(
      new THREE.SphereGeometry(0.28 + i * 0.03, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: i % 2 ? 0x6fe3d8 : 0x7aa8ff, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
    )
    bell.rotation.x = Math.PI
    item.add(bell)
    ocean.add(item)
    jelly.push(item)
  }
  const whale = new THREE.Group()
  const whaleBody = new THREE.Mesh(new THREE.SphereGeometry(0.72, 20, 14), matte(0x16303a))
  whaleBody.scale.set(2.5, 0.7, 0.82)
  const fluke = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.7), matte(0x16303a))
  fluke.position.set(-1.7, 0, 0)
  whale.add(whaleBody, fluke)
  ocean.add(whale)
  const turtle = new THREE.Group()
  turtle.add(new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 10), matte(0x2a4a38)))
  turtle.children[0].scale.set(1.3, 0.45, 1)
  ocean.add(turtle)
  const angler = new THREE.Group()
  angler.add(new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), matte(0x0c1820)))
  angler.children[0].scale.set(1.4, 0.8, 0.7)
  const lure = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), emit(0xc8ff7a, 1.6))
  lure.position.set(0.22, 0.22, 0)
  angler.add(lure)
  ocean.add(angler)
  const wreck = new THREE.Group()
  wreck.add(new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.35, 0.55), matte(0x3a2a1c, { roughness: 1 })))
  wreck.add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.55, 0.4), matte(0x2a2018)))
  wreck.children[1].position.set(0.4, 0.3, 0)
  wreck.position.set(-5.2, -3.1, -7)
  wreck.rotation.z = -0.18
  ocean.add(wreck)
  const sub = new THREE.Group()
  sub.add(new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.74, 6, 10), metal(0x6a7a82)))
  sub.children[0].rotation.z = Math.PI / 2
  const tower = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.18), metal(0x5a686e))
  tower.position.y = 0.2
  const light = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), emit(0xffd27a, 1.3))
  light.position.set(0.42, 0, 0)
  sub.add(tower, light)
  ocean.add(sub)
  tick.push((time, progress, reduced) => {
    ;(veil.material as THREE.ShaderMaterial).uniforms.uTime.value = time
    marine.points.position.y = -((time * 0.08) % 1.2)
    if (reduced) return
    fish.forEach((item, i) => {
      const loop = ((time * item.userData.speed + item.userData.phase) % 16) - 8
      item.position.set(item.userData.dir * loop, item.userData.y + Math.sin(time * 0.35 + i) * 0.12, item.userData.z)
      item.rotation.y = item.userData.dir > 0 ? 0 : Math.PI
    })
    jelly.forEach((item, i) => {
      item.position.set(i % 2 ? 3.5 : -3.8, -0.4 + i * 0.55 + Math.sin(time * 0.3 + i) * 0.2, -4 - i)
      item.scale.y = 0.96 + Math.sin(time * 0.85 + i) * 0.05
    })
    whale.visible = pulse(progress, 0.88, 0.94, 1.02) > 0.12
    whale.position.set(-10 + ((time * 0.12) % 18), -2.15, -7)
    turtle.position.set(Math.sin(time * 0.14) * 4, -1.1 + Math.sin(time * 0.3) * 0.2, -4.6)
    angler.position.set(5.2, -2.6 + Math.sin(time * 0.25) * 0.15, -5.4)
    sub.position.set(4 - Math.sin(time * 0.12) * 2.2, -1.75, -5)
  })
  groups.push(ocean)

  groups.forEach((group, index) => {
    group.position.z = -(index + 1) * Z_STEP
  })

  return {
    groups,
    update: (time, progress, reduced) => {
      tick.forEach((fn) => fn(time, progress, reduced))
    }
  }
}
