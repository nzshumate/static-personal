import * as THREE from 'three'
import {
  makeBalloon,
  makeBear,
  makeBird,
  makeCabin,
  makeCactus,
  makeCloud,
  makeCrab,
  makeFirefly,
  makeFish,
  makeFox,
  makeFrog,
  makeJelly,
  makeLighthouse,
  makeLilyPad,
  makePalm,
  makeSailboat,
  makeShark,
  makeSkier,
  makeSnake,
  makeTumbleweed,
  makeUmbrella,
  makeYeti,
  matte,
  cypressGeometry,
  setGroupOpacity
} from './details'
import { lerp, makeRng, smoothstep } from './math'
import { domeFragment, domeVertex, pointFragment, pointVertex, sunFragment, sunVertex, terrainFragment, terrainVertex, waterFragment, waterVertex } from './shaders'

export const Z_STEP = 26

export type BiomeSystem = {
  groups: THREE.Group[]
  update: (time: number, progress: number, reduced: boolean) => void
}

const LIGHT = new THREE.Vector3(-0.58, 0.62, 0.52).normalize()

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

const addTerrain = (group: THREE.Group, geometry: THREE.PlaneGeometry, low: number, mid: number, high: number, seed: number, offsetZ = 0) => {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uLow: { value: new THREE.Color(low) },
      uMid: { value: new THREE.Color(mid) },
      uHigh: { value: new THREE.Color(high) },
      uLightDir: { value: LIGHT.clone() },
      uTime: { value: 0 },
      uSeed: { value: seed },
      uRipple: { value: 0 }
    },
    vertexShader: terrainVertex,
    fragmentShader: terrainFragment
  })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.z = offsetZ
  group.add(mesh)
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

export const createBiomes = (renderer: THREE.WebGLRenderer, mobile: boolean): BiomeSystem => {
  const random = makeRng(91337)
  const glow = softTexture()
  const groups: THREE.Group[] = []
  const tick: Array<(time: number, progress: number, reduced: boolean) => void> = []
  const dummy = new THREE.Object3D()

  const sky = new THREE.Group()
  addDome(sky, 0x10346a, 0x9cc6e6, 0xffc878, new THREE.Vector3(-10, 6, -8))
  sky.add(new THREE.HemisphereLight(0xb7d4f0, 0x243044, 0.62))
  const skyFill = new THREE.DirectionalLight(0xe8f0f8, 0.9)
  skyFill.position.set(-6, 8, 4)
  sky.add(skyFill)
  const skySun = addStar(sky, glow, new THREE.Vector3(-8.4, 3.4, -10), 0.42)
  const clouds: THREE.Group[] = []
  for (let i = 0; i < (mobile ? 7 : 11); i++) {
    const cloud = makeCloud(random)
    const depth = random()
    cloud.position.set(-11 + random() * 16 - depth * 3, -0.4 + random() * 3.6 + depth * 0.8, -4 - depth * 14)
    cloud.scale.setScalar(0.9 + depth * 1.6)
    cloud.userData.homeX = cloud.position.x
    cloud.userData.drift = 0.12 + random() * 0.18
    sky.add(cloud)
    clouds.push(cloud)
  }
  const balloons = [makeBalloon(0xc45a3a), makeBalloon(0x3a6aa8), makeBalloon(0xd4a24a)]
  balloons.forEach((item, i) => {
    item.group.scale.setScalar([1.35, 0.85, 0.55][i])
    sky.add(item.group)
  })
  const birds = Array.from({ length: mobile ? 5 : 7 }, () => makeBird(0x1a222b))
  birds.forEach((item) => {
    item.group.scale.setScalar(2)
    sky.add(item.group)
  })
  tick.push((time, _progress, reduced) => {
    skySun.material.uniforms.uTime.value = time
    skySun.corona.scale.setScalar(1.7 + Math.sin(time * 0.6) * 0.06)
    if (reduced) return
    balloons[0].group.position.set(-3.2, 1.2 + Math.sin(time * 0.22) * 0.16, -3.6)
    balloons[1].group.position.set(-6.4, 2.3 + Math.sin(time * 0.18 + 1) * 0.12, -8.5)
    balloons[2].group.position.set(1.6, 2.9 + Math.sin(time * 0.16 + 2) * 0.1, -13)
    balloons.forEach((item) => item.update(time, reduced))
    clouds.forEach((cloud, i) => {
      cloud.position.x = cloud.userData.homeX + Math.sin(time * 0.05 + i) * cloud.userData.drift
    })
    birds.forEach((item, i) => {
      const t = ((time * 0.055 + i * 0.05) % 1)
      item.group.position.set(-15 + t * 30, -1.1 + i * 0.16 + Math.sin(t * Math.PI) * 1.4, -5.5 - (i % 3) * 0.5)
      item.update(time, reduced)
    })
  })
  groups.push(sky)

  const mountains = new THREE.Group()
  addDome(mountains, 0x2a3a4c, 0xc5d2de, 0xffd7a0, new THREE.Vector3(8, 5, -10))
  mountains.add(new THREE.HemisphereLight(0xe4eaf0, 0x2a3038, 0.7))
  const cabinX = 1.1
  const cabinZ = 3.4
  const slopeHeight = (x: number, z: number) => {
    const wave = Math.sin(x * 0.32) + Math.sin(x * 0.74 + 1.1) * 0.58 + Math.sin(x * 1.55 + z * 0.22) * 0.2
    const fall = Math.pow(Math.max(0, 1 - Math.abs(z) / 12), 1.12)
    return -3.35 + Math.max(0, wave + 1.2) * 2.65 * fall
  }
  // A bench is cut into the face so the cabin has level ground to stand on.
  const shelfY = slopeHeight(cabinX, cabinZ) - 0.28
  const ridgeHeight = (x: number, z: number) => {
    const natural = slopeHeight(x, z)
    const d = Math.hypot((x - cabinX) * 0.8, (z - cabinZ) * 1.25)
    return lerp(natural, shelfY, 1 - smoothstep(1.15, 2.5, d))
  }
  const ridge = new THREE.PlaneGeometry(38, 22, mobile ? 80 : 140, mobile ? 46 : 80)
  ridge.rotateX(-Math.PI / 2)
  displace(ridge, ridgeHeight)
  const mountainMat = addTerrain(mountains, ridge, 0x4a5560, 0x8b95a1, 0xeef3f6, 1.2)
  // Distant range, lighter and lower contrast, so the near ridge has something to sit against.
  const farRange = new THREE.PlaneGeometry(70, 18, mobile ? 50 : 90, 20)
  farRange.rotateX(-Math.PI / 2)
  displace(farRange, (x, z) => {
    const wave = Math.sin(x * 0.21 + 0.6) + Math.sin(x * 0.47 + 2.1) * 0.55 + Math.sin(x * 1.1) * 0.15
    const fall = Math.max(0, 1 - Math.abs(z) / 9)
    return -2.3 + Math.max(0, wave + 1.05) * 2.2 * fall
  })
  const farMat = addTerrain(mountains, farRange, 0x8b97a3, 0xb7c2cc, 0xe4e9ee, 0.7, -20)
  farMat.uniforms.uLightDir.value.set(-0.4, 0.75, 0.4).normalize()
  for (let i = 0; i < 8; i++) {
    addSprite(mountains, glow, 0xdbe6ef, 0.07, new THREE.Vector3((random() - 0.5) * 16, -0.2 + random() * 3, -5 - random() * 8), new THREE.Vector2(5.4 + random() * 4, 1.5), true)
  }
  const snowField = addPoints(mountains, renderer, mobile ? 260 : 600, 0xf6f8fb, 0.88, () =>
    new THREE.Vector3((random() - 0.5) * 22, (random() - 0.5) * 10, -1 - random() * 12)
  )
  const cabin = makeCabin()
  cabin.position.set(cabinX, shelfY - 0.02, cabinZ)
  cabin.scale.setScalar(1.35)
  cabin.rotation.y = 0.22
  mountains.add(cabin)
  const cabinShadow = new THREE.Mesh(
    new THREE.CircleGeometry(1.05, 20),
    new THREE.MeshBasicMaterial({ color: 0x3a4652, transparent: true, opacity: 0.34, depthWrite: false })
  )
  cabinShadow.rotation.x = -Math.PI / 2
  cabinShadow.scale.set(1.35, 1, 1)
  cabinShadow.position.set(cabinX + 0.1, shelfY + 0.012, cabinZ + 0.05)
  mountains.add(cabinShadow)
  const path = new THREE.Mesh(
    new THREE.PlaneGeometry(0.34, 2.8),
    new THREE.MeshBasicMaterial({ color: 0x5c6874, transparent: true, opacity: 0.16, depthWrite: false })
  )
  path.rotation.x = -Math.PI / 2
  path.rotation.z = 0.35
  path.position.set(cabinX + 0.9, shelfY + 0.01, cabinZ + 1.5)
  mountains.add(path)
  const fire = addSprite(cabin, glow, 0xff7a2a, 0.55, new THREE.Vector3(-0.22, 0.32, 0.42), new THREE.Vector2(0.32, 0.26), true)
  const chimneyFire = addSprite(cabin, glow, 0xff5520, 0.5, new THREE.Vector3(-0.28, 1.2, -0.1), new THREE.Vector2(0.22, 0.18), true)
  const smoke = addSprite(cabin, glow, 0xb8c0c6, 0.55, new THREE.Vector3(-0.28, 1.55, -0.1), new THREE.Vector2(0.55, 1.15))
  const smoke2 = addSprite(cabin, glow, 0xa8b0b6, 0.4, new THREE.Vector3(-0.18, 2.05, -0.04), new THREE.Vector2(0.48, 0.95))
  const smoke3 = addSprite(cabin, glow, 0x9aa2a8, 0.28, new THREE.Vector3(-0.08, 2.5, 0.02), new THREE.Vector2(0.4, 0.8))
  const hearth = new THREE.PointLight(0xff7a2a, 1.4, 4.5)
  hearth.position.set(-0.2, 0.35, 0.4)
  cabin.add(hearth)
  const skier = makeSkier()
  mountains.add(skier.group)
  const skierShadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.34, 12),
    new THREE.MeshBasicMaterial({ color: 0x3a4652, transparent: true, opacity: 0.3, depthWrite: false })
  )
  skierShadow.rotation.x = -Math.PI / 2
  skierShadow.scale.set(1.1, 0.55, 1)
  mountains.add(skierShadow)
  const yeti = makeYeti()
  const yetiX = 7.4
  const yetiZ = -4.6
  yeti.position.set(yetiX, ridgeHeight(yetiX, yetiZ) + 0.32, yetiZ)
  yeti.scale.setScalar(1.25)
  yeti.rotation.y = -1.25
  mountains.add(yeti)
  tick.push((time, _progress, reduced) => {
    mountainMat.uniforms.uTime.value = time
    snowField.points.position.y = -((time * 0.16) % 1.7)
    const window = cabin.userData.window as THREE.Mesh
    const ember = cabin.userData.ember as THREE.Mesh
    const flicker = Math.abs(Math.sin(time * 9))
    ;(window.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.75 + flicker * 1.25
    ;(ember.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.2 + flicker * 1.4
    hearth.intensity = 1.1 + flicker * 0.9
    fire.material.opacity = 0.32 + flicker * 0.4
    fire.scale.set(0.28 + Math.sin(time * 11) * 0.05, 0.24 + Math.sin(time * 13) * 0.06, 1)
    chimneyFire.material.opacity = 0.28 + flicker * 0.38
    chimneyFire.scale.set(0.18 + Math.sin(time * 12) * 0.04, 0.16 + Math.sin(time * 15) * 0.05, 1)
    smoke.position.y = 1.55 + Math.sin(time * 0.8) * 0.12
    smoke.material.opacity = 0.38 + Math.sin(time * 0.9) * 0.12
    smoke2.position.y = 2.05 + Math.sin(time * 0.7 + 1) * 0.16
    smoke2.material.opacity = 0.22 + Math.sin(time * 0.8 + 0.6) * 0.1
    smoke3.position.y = 2.5 + Math.sin(time * 0.6 + 1.7) * 0.18
    smoke3.material.opacity = 0.12 + Math.sin(time * 0.7 + 1.1) * 0.08
    if (reduced) return
    // Long diagonal run down the right face toward the camera; fades in and out at the loop ends.
    const t = (time * 0.055) % 1
    const sx = 3 + t * 3.2
    const sz = 0.6 + t * 3.2 + Math.sin(t * Math.PI * 4) * 0.35
    const sy = ridgeHeight(sx, sz)
    skier.group.scale.setScalar(0.82)
    skier.group.position.set(sx, sy + 0.01, sz)
    skier.group.rotation.y = -Math.PI / 4 + Math.cos(t * Math.PI * 4) * 0.35
    const alpha = smoothstep(0, 0.08, t) * (1 - smoothstep(0.9, 1, t))
    setGroupOpacity(skier.group, alpha)
    skierShadow.position.set(sx, sy + 0.012, sz)
    ;(skierShadow.material as THREE.MeshBasicMaterial).opacity = 0.3 * alpha
    skier.update(time, reduced)
    yeti.rotation.y = -1.25 + Math.sin(time * 0.2) * 0.1
  })
  groups.push(mountains)

  const forest = new THREE.Group()
  addDome(forest, 0x06140f, 0x163028, 0x8fe0a8, new THREE.Vector3(7, 8, -12))
  forest.add(new THREE.HemisphereLight(0x8fb59a, 0x08140f, 0.72))
  const forestMoon = new THREE.DirectionalLight(0xcfe6d8, 0.85)
  forestMoon.position.set(6.8, 5.2, 2)
  forest.add(forestMoon)
  addMoon(forest, glow, new THREE.Vector3(6.8, 3.6, -11), 0.26, 0xcfe6d8)
  const floor = new THREE.PlaneGeometry(36, 22, mobile ? 40 : 70, mobile ? 24 : 40)
  floor.rotateX(-Math.PI / 2)
  displace(floor, (x, z) => -3.05 + Math.sin(x * 0.4) * 0.12 + Math.sin(z * 0.55) * 0.1)
  const forestFloor = addTerrain(forest, floor, 0x0c1810, 0x17301c, 0x2a4a28, 2.4)
  const forestFloorY = (x: number, z: number) => -3.05 + Math.sin(x * 0.4) * 0.12 + Math.sin(z * 0.55) * 0.1
  const treeCount = mobile ? 44 : 84
  const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.05, 0.14, 2.6, 6), matte(0x3a2c1c), treeCount)
  const canopies = new THREE.InstancedMesh(new THREE.SphereGeometry(0.72, 14, 10), matte(0x1c4a28, { roughness: 0.86 }), treeCount * 3)
  let canopyIndex = 0
  for (let i = 0; i < treeCount; i++) {
    const x = (random() - 0.5) * 24
    const z = -1.2 - random() * 14
    const s = 0.78 + random() * 1.55
    const lean = (random() - 0.5) * 0.09
    const floorY = forestFloorY(x, z)
    dummy.position.set(x, floorY + 1.3 * s - 0.1, z)
    dummy.scale.set(s * (0.85 + random() * 0.4), s, s * (0.85 + random() * 0.4))
    dummy.rotation.set(lean, random() * Math.PI, lean * 0.6)
    dummy.updateMatrix()
    trunks.setMatrixAt(i, dummy.matrix)
    const lobes = 2 + Math.round(random())
    for (let k = 0; k < 3; k++) {
      const spread = (random() - 0.5) * 0.5 * s
      const lift = 2.4 * s + k * 0.22 * s + random() * 0.2 * s
      dummy.position.set(x + spread, floorY + lift, z + (random() - 0.5) * 0.5 * s)
      const lobeScale = k < lobes ? s * (0.6 + random() * 0.32) : 0.0001
      dummy.scale.set(lobeScale * (0.9 + random() * 0.3), lobeScale * (0.8 + random() * 0.3), lobeScale)
      dummy.rotation.set(0, random() * Math.PI, 0)
      dummy.updateMatrix()
      canopies.setMatrixAt(canopyIndex++, dummy.matrix)
    }
  }
  forest.add(trunks, canopies)
  const fernCount = mobile ? 40 : 90
  const ferns = new THREE.InstancedMesh(new THREE.ConeGeometry(0.34, 0.42, 5), matte(0x1e4a26, { roughness: 1 }), fernCount)
  for (let i = 0; i < fernCount; i++) {
    const x = (random() - 0.5) * 22
    const z = -1 - random() * 8
    const s = 0.5 + random() * 0.9
    dummy.position.set(x, forestFloorY(x, z) + 0.18 * s, z)
    dummy.scale.set(s * (1 + random() * 0.5), s, s)
    dummy.rotation.set((random() - 0.5) * 0.3, random() * Math.PI, (random() - 0.5) * 0.3)
    dummy.updateMatrix()
    ferns.setMatrixAt(i, dummy.matrix)
  }
  forest.add(ferns)
  const rocks = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.22, 0), matte(0x3a4a3c, { roughness: 1 }), mobile ? 8 : 16)
  for (let i = 0; i < rocks.count; i++) {
    const x = (random() - 0.5) * 20
    const z = -1.4 - random() * 6
    const s = 0.5 + random() * 1.2
    dummy.position.set(x, forestFloorY(x, z) + 0.06 * s, z)
    dummy.scale.set(s * (1 + random() * 0.6), s * 0.55, s)
    dummy.rotation.set(random() * Math.PI, random() * Math.PI, 0)
    dummy.updateMatrix()
    rocks.setMatrixAt(i, dummy.matrix)
  }
  forest.add(rocks)
  for (let i = 0; i < 8; i++) {
    addSprite(forest, glow, 0xb7d0c2, 0.05, new THREE.Vector3((random() - 0.5) * 14, -2 + random(), -3 - random() * 8), new THREE.Vector2(6 + random() * 5, 1.3))
  }
  const bugs = Array.from({ length: mobile ? 9 : 14 }, () => makeFirefly())
  bugs.forEach((item) => forest.add(item.group))
  for (let i = 0; i < 7; i++) {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({
      color: i % 2 ? 0xff6a4a : 0xf2c14a,
      emissive: i % 2 ? 0xff6a4a : 0xf2c14a,
      emissiveIntensity: 0.8,
      roughness: 0.4,
      fog: false
    }))
    cap.position.set(-5 + i * 1.4, -2.82, -2.4 - (i % 3) * 0.6)
    forest.add(cap)
  }
  const camp = addSprite(forest, glow, 0xff8a3a, 0.28, new THREE.Vector3(1.6, -2.7, -3.1), new THREE.Vector2(0.9, 0.7), true)
  const bear = makeBear()
  bear.scale.setScalar(1.9)
  forest.add(bear)
  const fox = makeFox()
  fox.scale.setScalar(2)
  forest.add(fox)
  tick.push((time, _progress, reduced) => {
    forestFloor.uniforms.uTime.value = time
    camp.material.opacity = 0.2 + Math.sin(time * 6) * 0.08
    if (reduced) return
    bear.position.set(-3.6 + Math.sin(time * 0.1) * 1.1, -2.55, -3.1)
    fox.position.set(2.6 + Math.sin(time * 0.22) * 1.2, -2.68, -2.6)
    bugs.forEach((item, i) => {
      item.group.position.set(Math.sin(time * item.group.userData.speed + i) * 5.5, -1.6 + Math.sin(time * 0.8 + i) * 1.1, -2.2 - (i % 5) * 1.1)
      item.update(time, reduced)
    })
  })
  groups.push(forest)

  const desert = new THREE.Group()
  addDome(desert, 0x1a2438, 0xf0b46a, 0xff9a40, new THREE.Vector3(-9, 5, -8))
  desert.add(new THREE.HemisphereLight(0xffd7a0, 0x4a2a10, 0.85))
  const desertSun = addStar(desert, glow, new THREE.Vector3(-8.6, 3.2, -9), 0.55)
  const duneHeight = (x: number, z: number) => -2.7 + Math.sin(x * 0.36 + z * 0.16) * 0.82 + Math.sin(x * 0.14 - z * 0.28) * 0.48
  const dunes = new THREE.PlaneGeometry(38, 22, mobile ? 70 : 120, mobile ? 40 : 70)
  dunes.rotateX(-Math.PI / 2)
  displace(dunes, duneHeight)
  const duneMat = addTerrain(desert, dunes, 0x8a4a22, 0xc48a48, 0xf0d08a, 3.1)
  duneMat.uniforms.uRipple.value = 0.11
  const cactusSpots = [
    [-7.4, -3.2, 1.05],
    [-5.9, -5.6, 0.8],
    [-2.1, -4.1, 0.95],
    [1.8, -6.4, 0.7]
  ]
  cactusSpots.forEach(([x, z, s]) => {
    const cactus = makeCactus(random)
    cactus.position.set(x, duneHeight(x, z) - 0.04, z)
    cactus.scale.setScalar(s)
    cactus.rotation.y = random() * Math.PI
    desert.add(cactus)
  })
  const stones = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.09, 0), matte(0x7a5a3a, { roughness: 1 }), mobile ? 14 : 28)
  for (let i = 0; i < stones.count; i++) {
    const x = (random() - 0.5) * 20
    const z = -1.5 - random() * 6
    const s = 0.5 + random() * 1.1
    dummy.position.set(x, duneHeight(x, z) + 0.04 * s, z)
    dummy.scale.set(s * (1 + random() * 0.6), s * 0.6, s)
    dummy.rotation.set(random() * Math.PI, random() * Math.PI, 0)
    dummy.updateMatrix()
    stones.setMatrixAt(i, dummy.matrix)
  }
  desert.add(stones)
  const pyramid = new THREE.Mesh(new THREE.ConeGeometry(1.35, 1.6, 4), matte(0xb8864c, { roughness: 1 }))
  pyramid.position.set(6.6, duneHeight(6.6, -8.2) + 0.72, -8.2)
  pyramid.rotation.y = 0.62
  desert.add(pyramid)
  const snake = makeSnake()
  snake.group.scale.setScalar(1.9)
  desert.add(snake.group)
  const tumble = makeTumbleweed(random)
  tumble.group.scale.setScalar(1.5)
  desert.add(tumble.group)
  for (let i = 0; i < 5; i++) {
    addSprite(desert, glow, 0xf3c17e, 0.05, new THREE.Vector3((random() - 0.5) * 16, -0.2 + random() * 3, -4 - random() * 8), new THREE.Vector2(6.2, 2.1), true)
  }
  const dust = addPoints(desert, renderer, mobile ? 60 : 140, 0xf0d08a, 0.9, () =>
    new THREE.Vector3((random() - 0.5) * 24, -2.6 + random() * 1.4, -1 - random() * 9)
  )
  dust.material.uniforms.uOpacity.value = 0.22
  tick.push((time, _progress, reduced) => {
    desertSun.material.uniforms.uTime.value = time
    duneMat.uniforms.uTime.value = time
    if (reduced) return
    dust.points.position.x = (time * 0.6) % 4
    // Tumbleweed enters and exits off frame; height follows the dune under it.
    const tx = -13 + ((time * 0.34 * 1.5) % 26)
    tumble.group.position.set(tx, duneHeight(tx, -2.3), -2.3)
    tumble.update(time, reduced)
    // The snake crosses slowly, head first, hugging the dune surface.
    const sx = -9 + ((time * 0.11) % 17)
    snake.group.position.set(sx, duneHeight(sx, -2.6) + 0.01, -2.6)
    snake.group.rotation.x = -Math.atan2(duneHeight(sx, -2.3) - duneHeight(sx, -2.9), 0.6) * 0.6
    snake.group.rotation.z = Math.atan2(duneHeight(sx + 0.3, -2.6) - duneHeight(sx - 0.3, -2.6), 0.6)
    snake.update(time, reduced)
  })
  groups.push(desert)

  const swamp = new THREE.Group()
  addDome(swamp, 0x071412, 0x1c332c, 0x8fbf88, new THREE.Vector3(6, 7, -10))
  swamp.add(new THREE.HemisphereLight(0x8fbfa8, 0x081412, 0.48))
  addMoon(swamp, glow, new THREE.Vector3(-6.4, 3.4, -12), 0.24, 0xc5e0d4)
  const swampWater = addWater(0x071c1c, 0x2c5648, 0.05, 0.9, 34, 22, mobile ? 50 : 90)
  swampWater.mesh.position.y = -2.88
  swamp.add(swampWater.mesh)
  const waterY = -2.88
  const cypressCount = mobile ? 16 : 30
  const parts = cypressGeometry()
  const bark = matte(0x2e2620, { roughness: 0.95 })
  const foliage = matte(0x18341f, { roughness: 1 })
  const cypress = new THREE.InstancedMesh(parts.trunk, bark, cypressCount)
  const crowns = new THREE.InstancedMesh(parts.crown, foliage, cypressCount)
  const crownsB = new THREE.InstancedMesh(parts.crownB, matte(0x1f3f25, { roughness: 1 }), cypressCount)
  const knees = new THREE.InstancedMesh(parts.knee, bark, cypressCount * 3)
  const mossStrands = new THREE.InstancedMesh(parts.moss, matte(0x5f6f5a, { roughness: 1 }), cypressCount * 2)
  const rings = new THREE.InstancedMesh(
    parts.ring,
    new THREE.MeshBasicMaterial({ color: 0x03100f, transparent: true, opacity: 0.55, depthWrite: false }),
    cypressCount
  )
  // Trees cluster in loose stands, with a few standing alone in open water.
  const stands = [[-7, -6], [-2.5, -9.5], [4.2, -5], [8, -10]]
  for (let i = 0; i < cypressCount; i++) {
    const stand = stands[i % stands.length]
    const lone = random() > 0.8
    const x = lone ? (random() - 0.5) * 22 : stand[0] + (random() - 0.5) * 5.5
    const z = lone ? -3 - random() * 11 : stand[1] + (random() - 0.5) * 4.5
    const depth = Math.min(1, Math.max(0, (-z - 3) / 12))
    const s = 0.7 + random() * 0.5 + depth * 0.45
    const baseY = waterY - 0.3 * s
    dummy.position.set(x, baseY, z)
    dummy.scale.set(s, s, s)
    dummy.rotation.set(0, random() * Math.PI, (random() - 0.5) * 0.06)
    dummy.updateMatrix()
    cypress.setMatrixAt(i, dummy.matrix)
    const crownY = baseY + 4.4 * s
    dummy.position.set(x + (random() - 0.5) * 0.3 * s, crownY - 0.4 * s, z)
    dummy.scale.set(s * (0.85 + random() * 0.4), s * (0.9 + random() * 0.5), s)
    dummy.rotation.set((random() - 0.5) * 0.12, random() * Math.PI, (random() - 0.5) * 0.12)
    dummy.updateMatrix()
    crowns.setMatrixAt(i, dummy.matrix)
    dummy.position.set(x + (random() - 0.5) * 0.9 * s, crownY - 1.3 * s, z + (random() - 0.5) * 0.6 * s)
    dummy.scale.set(s * (0.8 + random() * 0.5), s * (0.7 + random() * 0.5), s)
    dummy.rotation.set((random() - 0.5) * 0.3, random() * Math.PI, (random() - 0.5) * 0.3)
    dummy.updateMatrix()
    crownsB.setMatrixAt(i, dummy.matrix)
    for (let k = 0; k < 3; k++) {
      const a = random() * Math.PI * 2
      const r = (0.55 + random() * 0.5) * s
      dummy.position.set(x + Math.cos(a) * r, waterY + 0.06 * s, z + Math.sin(a) * r)
      dummy.scale.set(s, s * (0.5 + random() * 0.8), s)
      dummy.rotation.set((random() - 0.5) * 0.3, 0, (random() - 0.5) * 0.3)
      dummy.updateMatrix()
      knees.setMatrixAt(i * 3 + k, dummy.matrix)
    }
    for (let k = 0; k < 2; k++) {
      const a = random() * Math.PI * 2
      dummy.position.set(x + Math.cos(a) * 0.5 * s, crownY - 1.65 * s, z + Math.sin(a) * 0.5 * s)
      dummy.scale.set(s, s * (0.7 + random() * 0.7), s)
      dummy.rotation.set((random() - 0.5) * 0.1, 0, (random() - 0.5) * 0.1)
      dummy.updateMatrix()
      mossStrands.setMatrixAt(i * 2 + k, dummy.matrix)
    }
    dummy.position.set(x, waterY + 0.008, z)
    dummy.scale.set(s, s, s)
    dummy.rotation.set(-Math.PI / 2, 0, 0)
    dummy.updateMatrix()
    rings.setMatrixAt(i, dummy.matrix)
  }
  swamp.add(cypress, crowns, crownsB, knees, mossStrands, rings)
  const reedCount = mobile ? 36 : 84
  const reeds = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.01, 0.022, 1, 4), matte(0x4d5c2e, { roughness: 1 }), reedCount)
  const reedBeds = [[-6.2, -2.4], [-4.6, -3.1], [3.6, -2.2], [6.4, -3.4], [0.8, -2.8]]
  for (let i = 0; i < reedCount; i++) {
    const bed = reedBeds[i % reedBeds.length]
    const h = 0.55 + random() * 0.7
    dummy.position.set(bed[0] + (random() - 0.5) * 1.6, waterY + h / 2 - 0.08, bed[1] + (random() - 0.5) * 1)
    dummy.scale.set(1, h, 1)
    dummy.rotation.set((random() - 0.5) * 0.2, 0, (random() - 0.5) * 0.2)
    dummy.updateMatrix()
    reeds.setMatrixAt(i, dummy.matrix)
  }
  swamp.add(reeds)
  const duckweed = addPoints(swamp, renderer, mobile ? 60 : 140, 0x6f8f3a, 0.55, () =>
    new THREE.Vector3((random() - 0.5) * 16, waterY + 0.01, -1.5 - random() * 7)
  )
  duckweed.material.blending = THREE.NormalBlending
  duckweed.material.uniforms.uOpacity.value = 0.7
  for (let i = 0; i < (mobile ? 10 : 18); i++) {
    addSprite(swamp, glow, 0x8fa392, 0.08, new THREE.Vector3((random() - 0.5) * 12, -0.3 + random() * 2.4, -3 - random() * 8), new THREE.Vector2(1.15, 3.4))
  }
  const wisps = addPoints(swamp, renderer, mobile ? 40 : 90, 0xb8ff9a, 1.15, () =>
    new THREE.Vector3((random() - 0.5) * 14, -2.4 + random() * 3.2, -2 - random() * 9)
  )
  const pads: THREE.Group[] = []
  for (let i = 0; i < (mobile ? 8 : 14); i++) {
    const pad = makeLilyPad(random)
    pad.scale.setScalar(1.8)
    pad.position.set((random() - 0.5) * 8, -2.84, -1.8 - random() * 4)
    pad.rotation.y = random() * Math.PI
    swamp.add(pad)
    pads.push(pad)
  }
  const frogs = [makeFrog(), makeFrog(), makeFrog()]
  frogs.forEach((frog, i) => {
    frog.scale.setScalar(2.2)
    frog.position.copy(pads[i].position)
    frog.position.y += 0.08
    swamp.add(frog)
  })
  const boat = new THREE.Group()
  boat.add(new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.9, 4, 10), matte(0x4a3220)))
  boat.children[0].rotation.z = Math.PI / 2
  const bench = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.04, 0.16), matte(0x6a4a28))
  bench.position.y = 0.08
  boat.add(bench)
  swamp.add(boat)
  const heron = new THREE.Group()
  heron.add(new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), matte(0xd5d8dc)))
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.18, 6), matte(0xc48a3a))
  beak.rotation.z = Math.PI / 2
  beak.position.x = 0.14
  const neck = new THREE.Mesh(new THREE.CapsuleGeometry(0.02, 0.18, 3, 5), matte(0xd5d8dc))
  neck.position.set(0.04, 0.1, 0)
  neck.rotation.z = -0.4
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.42, 5), matte(0xd5d8dc))
  leg.position.y = -0.28
  heron.add(beak, neck, leg)
  swamp.add(heron)
  const gator = new THREE.Group()
  const gatorBody = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), matte(0x2a4a28))
  gatorBody.scale.set(2.1, 0.45, 0.7)
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 8), new THREE.MeshStandardMaterial({ color: 0xc4e36a, emissive: 0xc4e36a, emissiveIntensity: 1.1, fog: false }))
  const eyeR = eyeL.clone()
  eyeL.position.set(0.22, 0.06, 0.06)
  eyeR.position.set(0.22, 0.06, -0.06)
  gator.add(gatorBody, eyeL, eyeR)
  swamp.add(gator)
  tick.push((time, _progress, reduced) => {
    swampWater.material.uniforms.uTime.value = time
    wisps.points.position.y = Math.sin(time * 0.25) * 0.12
    if (reduced) return
    pads.forEach((pad, i) => {
      pad.position.y = -2.84 + Math.sin(time * 0.6 + i) * 0.012
    })
    frogs.forEach((frog, i) => {
      frog.position.y = pads[i].position.y + 0.05
      frog.rotation.y = Math.sin(time * 0.2 + i) * 0.4
    })
    boat.position.set(-1.4 + Math.sin(time * 0.12) * 1.1, -2.72, -4.2)
    boat.rotation.z = Math.sin(time * 0.5) * 0.04
    heron.position.set(-2.8, -2.12 + Math.sin(time * 0.4) * 0.03, -2.7)
    gator.position.set(3.2 + Math.sin(time * 0.08) * 0.45, -2.9 + Math.sin(time * 0.3) * 0.02, -3.5)
  })
  groups.push(swamp)

  const beach = new THREE.Group()
  addDome(beach, 0x16344c, 0xf0c090, 0xff8a40, new THREE.Vector3(-9, 3, -8))
  beach.add(new THREE.HemisphereLight(0xd8eef2, 0x243038, 0.62))
  const beachSun = addStar(beach, glow, new THREE.Vector3(-8.2, 1.6, -11), 0.48)
  const shore = new THREE.PlaneGeometry(36, 18, mobile ? 40 : 70, mobile ? 20 : 36)
  shore.rotateX(-Math.PI / 2)
  displace(shore, (x, z) => -3.12 + Math.sin(x * 0.5) * 0.08 + Math.max(0, z + 2) * 0.04)
  const sandMat = addTerrain(beach, shore, 0x8a6a3a, 0xc9ae7a, 0xe8d4a0, 4.2)
  sandMat.uniforms.uRipple.value = 0.05
  const sea = addWater(0x0a4a5c, 0x3aa8ae, 0.09, 0.92, 38, 10, mobile ? 70 : 120)
  sea.mesh.position.set(0, -3.08, -16.8)
  beach.add(sea.mesh)
  // Wet sand: a darker, slightly glossy band the swash keeps reaching.
  const wetSand = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 2.4),
    new THREE.MeshStandardMaterial({ color: 0x8e7350, roughness: 0.32, metalness: 0.05, transparent: true, opacity: 0.85, fog: false })
  )
  wetSand.rotation.x = -Math.PI / 2
  wetSand.position.set(0, -3.1, -10.3)
  beach.add(wetSand)
  const foam = new THREE.Mesh(
    new THREE.PlaneGeometry(28, 0.5),
    new THREE.MeshBasicMaterial({ color: 0xf4fbff, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false })
  )
  foam.rotation.x = -Math.PI / 2
  foam.position.set(0, -3.04, -10.4)
  beach.add(foam)
  const foam2 = foam.clone()
  foam2.material = (foam.material as THREE.MeshBasicMaterial).clone()
  foam2.scale.set(0.7, 0.6, 1)
  beach.add(foam2)
  const palms: THREE.Group[] = []
  const palmSpots = [
    [3.2, 1.9, 1.05],
    [4.6, 1.2, 0.9],
    [6.3, 2.3, 1.15]
  ]
  palmSpots.forEach(([x, z, s]) => {
    const palm = makePalm(random)
    palm.position.set(x, -3.12, z)
    palm.scale.setScalar(s)
    beach.add(palm)
    palms.push(palm)
  })
  const lightHouse = makeLighthouse()
  lightHouse.position.set(-7.6, -3.12, -7.8)
  lightHouse.scale.setScalar(1.1)
  beach.add(lightHouse)
  const beam = addSprite(beach, glow, 0xfff1c4, 0.2, new THREE.Vector3(-7.6, -0.45, -7.8), new THREE.Vector2(3.4, 0.4), true)
  const sail = makeSailboat()
  sail.scale.setScalar(1.6)
  beach.add(sail)
  const umbrella = makeUmbrella()
  umbrella.position.set(2.1, -3.12, 0.6)
  umbrella.rotation.y = -0.4
  beach.add(umbrella)
  const crab = makeCrab()
  beach.add(crab)
  const gulls = Array.from({ length: 4 }, () => makeBird(0xf0f3f6))
  gulls.forEach((item) => {
    item.group.scale.setScalar(1.6)
    beach.add(item.group)
  })
  tick.push((time, _progress, reduced) => {
    beachSun.material.uniforms.uTime.value = time
    sandMat.uniforms.uTime.value = time
    sea.material.uniforms.uTime.value = time
    // Swash: the foam line runs up the sand and drains back, the second line trailing it.
    const swash = Math.sin(time * 0.55)
    foam.position.z = -10.4 + swash * 0.55
    ;(foam.material as THREE.MeshBasicMaterial).opacity = 0.14 + Math.max(0, swash) * 0.2
    foam2.position.z = -10.9 + Math.sin(time * 0.55 - 0.9) * 0.4
    ;(foam2.material as THREE.MeshBasicMaterial).opacity = 0.08 + Math.max(0, Math.sin(time * 0.55 - 0.9)) * 0.1
    wetSand.position.z = -10.1 + swash * 0.3
    beam.material.rotation = time * 0.35
    beam.scale.x = 2.6 + Math.sin(time * 0.8) * 0.4
    palms.forEach((palm, i) => {
      palm.rotation.z = Math.sin(time * 0.35 + i) * 0.025
    })
    if (reduced) return
    sail.position.set(2.8 + Math.sin(time * 0.12) * 1.4, -2.9, -13.8)
    sail.rotation.z = Math.sin(time * 0.6) * 0.04
    if (sail.userData.flag) sail.userData.flag.rotation.y = Math.sin(time * 3.2) * 0.25
    crab.position.set(1.4 + Math.sin(time * 0.25) * 0.7, -3.08, -4.8)
    gulls.forEach((item, i) => {
      const t = ((time * 0.06 + i * 0.22) % 1)
      item.group.position.set(-16 + t * 32, 0.9 + i * 0.22 + Math.sin(t * Math.PI * 2) * 0.25, -7 - (i % 2) * 1.2)
      item.update(time, reduced)
    })
  })
  groups.push(beach)

  const ocean = new THREE.Group()
  addDome(ocean, 0x01080e, 0x063040, 0x4aa8b4, new THREE.Vector3(0, 10, -6))
  ocean.add(new THREE.HemisphereLight(0x4aa8b4, 0x021018, 0.7))
  ocean.add(new THREE.DirectionalLight(0x8fd4dc, 0.85))
  const veil = new THREE.Mesh(
    new THREE.PlaneGeometry(42, 26),
    new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragmentShader: `
        uniform float uTime; varying vec2 vUv;
        void main() {
          float d = 1.0 - vUv.y;
          vec3 top = vec3(0.04, 0.32, 0.38);
          vec3 deep = vec3(0.008, 0.04, 0.08);
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
  const marine = addPoints(ocean, renderer, mobile ? 180 : 420, 0xb7eef2, 0.5, () =>
    new THREE.Vector3((random() - 0.5) * 20, (random() - 0.5) * 12, -1 - random() * 14)
  )
  marine.material.uniforms.uOpacity.value = 0.38
  const fishColors = [0x3aa8ae, 0x7ec8d4, 0xf2b24a, 0x6f9ae0]
  const fish = Array.from({ length: mobile ? 8 : 12 }, (_, i) => {
    const item = makeFish(fishColors[i % fishColors.length], i % 3)
    const depth = random()
    item.group.userData = {
      ...item.group.userData,
      dir: i % 3 ? 1 : -1,
      speed: 0.09 + random() * 0.12,
      y: -2.4 + random() * 3.2 + depth,
      z: -2 - depth * 8,
      span: 10 + depth * 7,
      wander: 0.6 + random() * 1.4,
      phase: random() * 10
    }
    item.group.scale.setScalar((0.8 + random() * 0.3) * (1 - depth * 0.25))
    ocean.add(item.group)
    return item
  })
  const jelly = [makeJelly(0x6fe3d8), makeJelly(0x7aa8ff), makeJelly(0x9ad4ff)]
  jelly.forEach((item) => ocean.add(item.group))
  const shark = makeShark()
  ocean.add(shark.group)
  tick.push((time, _progress, reduced) => {
    ;(veil.material as THREE.ShaderMaterial).uniforms.uTime.value = time
    marine.points.position.y = -((time * 0.08) % 1.2)
    if (reduced) return
    fish.forEach((item, i) => {
      // Each fish follows a slow wandering path; heading comes from where it is going, not a fixed facing.
      const data = item.group.userData
      const pathAt = (t: number) => {
        const loop = ((t * data.speed + data.phase) % (data.span * 2)) - data.span
        return new THREE.Vector3(
          data.dir * loop,
          data.y + Math.sin(t * 0.3 + i) * 0.22,
          data.z + Math.sin(t * 0.22 + i * 1.3) * data.wander
        )
      }
      const here = pathAt(time)
      const ahead = pathAt(time + 0.5)
      item.group.position.copy(here)
      item.group.rotation.y = Math.atan2(ahead.x - here.x, ahead.z - here.z) - Math.PI / 2
      item.group.rotation.z = (ahead.y - here.y) * 1.5
      item.update(time, reduced)
    })
    jelly.forEach((item, i) => {
      item.group.position.set([-4.6, -2.2, -6.2][i], 0.4 + i * 0.6 + Math.sin(time * 0.25 + i) * 0.16, -5 - i * 1.1)
      item.update(time, reduced)
    })
    // The shark cruises a long lazy line that starts and ends off frame, steering into its own turns.
    const sharkAt = (t: number) => {
      const x = -19 + ((t * 0.55) % 46)
      return new THREE.Vector3(x, -0.7 + Math.sin(t * 0.21) * 0.35, -5.6 + Math.sin(t * 0.13 + 1) * 1.6)
    }
    const sharkHere = sharkAt(time)
    const sharkAhead = sharkAt(time + 0.6)
    shark.group.position.copy(sharkHere)
    shark.group.rotation.y = Math.atan2(sharkAhead.x - sharkHere.x, sharkAhead.z - sharkHere.z) - Math.PI / 2
    shark.group.rotation.z = (sharkAhead.y - sharkHere.y) * 1.2
    shark.update(time, reduced)
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
