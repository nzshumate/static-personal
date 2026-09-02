import * as THREE from 'three'
import { domeFragment, domeVertex, pointFragment, pointVertex, waterFragment, waterVertex } from './shaders'
import { makeRng, pulse } from './math'

export const Z_STEP = 26

export type BiomeSystem = {
  groups: THREE.Group[]
  update: (time: number, progress: number, reduced: boolean) => void
}

const metal = (color: number, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, metalness: 0.72, roughness: 0.32, ...extra })

const matte = (color: number, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, metalness: 0.04, roughness: 0.92, ...extra })

const softTexture = () => {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')!
  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128)
  gradient.addColorStop(0, 'rgba(255,255,255,0.72)')
  gradient.addColorStop(0.28, 'rgba(255,255,255,0.18)')
  gradient.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 256, 256)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

const addDome = (group: THREE.Group, zenith: number, horizon: number) => {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uZenith: { value: new THREE.Color(zenith) },
      uHorizon: { value: new THREE.Color(horizon) },
      uOpacity: { value: 1 }
    },
    vertexShader: domeVertex,
    fragmentShader: domeFragment,
    side: THREE.BackSide,
    depthWrite: false
  })
  group.add(new THREE.Mesh(new THREE.SphereGeometry(42, 48, 32), material))
}

const addSprite = (group: THREE.Group, map: THREE.Texture, color: number, opacity: number, position: THREE.Vector3, scale: THREE.Vector2) => {
  const material = new THREE.SpriteMaterial({
    map,
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.NormalBlending
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
    sizes[i] = 0.6 + Math.random() * 1.5
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: 0.55 },
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

const displace = (geometry: THREE.PlaneGeometry, height: (x: number, z: number) => number, colorAt: (y: number) => THREE.Color) => {
  const pos = geometry.attributes.position as THREE.BufferAttribute
  const colors = new Float32Array(pos.count * 3)
  for (let i = 0; i < pos.count; i++) {
    const y = height(pos.getX(i), pos.getZ(i))
    pos.setY(i, y)
    const c = colorAt(y)
    colors.set([c.r, c.g, c.b], i * 3)
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
}

export const createBiomes = (renderer: THREE.WebGLRenderer, mobile: boolean): BiomeSystem => {
  const random = makeRng(91337)
  const soft = softTexture()
  const groups: THREE.Group[] = []
  const tick: Array<(time: number, progress: number, reduced: boolean) => void> = []

  const sky = new THREE.Group()
  addDome(sky, 0x163a68, 0xb7cfe0)
  sky.add(new THREE.HemisphereLight(0xcfe6ff, 0x2a3340, 0.7))
  for (let i = 0; i < (mobile ? 18 : 36); i++) {
    addSprite(
      sky,
      soft,
      0xf2f5f8,
      0.14 + random() * 0.12,
      new THREE.Vector3((random() - 0.5) * 28, -0.2 + random() * 7, -4 - random() * 14),
      new THREE.Vector2(3.2 + random() * 4.5, 1 + random() * 1.5)
    )
  }
  const plane = new THREE.Group()
  plane.add(new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 1.5, 4, 8), metal(0xd5dee6)))
  plane.children[0].rotation.z = Math.PI / 2
  plane.add(new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.04, 0.42), metal(0x9eb0c4)))
  sky.add(plane)
  const heli = new THREE.Group()
  const heliBody = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 14), metal(0x2a333d))
  heliBody.scale.set(1.4, 0.72, 0.78)
  const rotor = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.02, 0.06), metal(0xc5ced6))
  rotor.position.y = 0.34
  heli.add(heliBody, rotor)
  sky.add(heli)
  const balloon = new THREE.Group()
  balloon.add(new THREE.Mesh(new THREE.SphereGeometry(0.38, 24, 16), matte(0xc45a3a, { roughness: 0.55 })))
  balloon.add(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.16), matte(0x6a4a2e)))
  balloon.children[1].position.y = -0.52
  sky.add(balloon)
  const birds: THREE.Line[] = []
  const birdGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-0.18, 0, 0),
    new THREE.Vector3(0, 0.06, 0),
    new THREE.Vector3(0.18, 0, 0)
  ])
  for (let i = 0; i < 12; i++) {
    const bird = new THREE.Line(birdGeo, new THREE.LineBasicMaterial({ color: 0x1a222b, transparent: true, opacity: 0.7 }))
    sky.add(bird)
    birds.push(bird)
  }
  tick.push((time, _progress, reduced) => {
    if (reduced) return
    plane.position.set(-9 + ((time * 0.42) % 20), 2.2 + Math.sin(time * 0.4) * 0.12, -3)
    plane.rotation.z = Math.sin(time * 0.3) * 0.03
    rotor.rotation.y = time * 16
    heli.position.set(7 - ((time * 0.28) % 16), 0.4 + Math.sin(time * 0.55) * 0.1, -2)
    balloon.position.set(3.4, 2.6 + Math.sin(time * 0.35) * 0.2, -6)
    balloon.rotation.z = Math.sin(time * 0.4) * 0.04
    birds.forEach((bird, i) => {
      bird.position.set(-7 + ((time * 0.2 + i * 0.7) % 15), 1.5 + (i % 4) * 0.28 + Math.sin(time + i) * 0.06, -3 - (i % 3))
    })
  })
  groups.push(sky)

  const mountains = new THREE.Group()
  addDome(mountains, 0x6f8498, 0xd5e0ea)
  mountains.add(new THREE.HemisphereLight(0xe8eef4, 0x3a4048, 0.75))
  const terrainGeo = new THREE.PlaneGeometry(36, 20, mobile ? 70 : 120, mobile ? 40 : 70)
  terrainGeo.rotateX(-Math.PI / 2)
  const rock = new THREE.Color(0x8b95a1)
  const snow = new THREE.Color(0xeef3f6)
  displace(
    terrainGeo,
    (x, z) => {
      const ridge = Math.sin(x * 0.34) + Math.sin(x * 0.78 + 1.1) * 0.55 + Math.sin(x * 1.6 + z * 0.2) * 0.18
      const fall = Math.pow(Math.max(0, 1 - Math.abs(z) / 11), 1.15)
      return -3.4 + Math.max(0, ridge + 1.15) * 2.5 * fall
    },
    (y) => (y > -0.35 ? snow : rock)
  )
  mountains.add(new THREE.Mesh(terrainGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96, metalness: 0 })))
  for (let i = 0; i < 8; i++) {
    addSprite(mountains, soft, 0xdbe6ef, 0.06, new THREE.Vector3((random() - 0.5) * 16, -0.4 + random() * 3, -5 - random() * 7), new THREE.Vector2(5 + random() * 4, 1.4))
  }
  const snowField = addPoints(mountains, renderer, mobile ? 280 : 700, 0xf6f8fb, 0.85, () =>
    new THREE.Vector3((random() - 0.5) * 22, (random() - 0.5) * 10, -1 - random() * 12)
  )
  const skier = new THREE.Group()
  skier.add(new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.28, 4, 8), matte(0xc4333d)))
  const ski = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.016, 0.045), metal(0x14181c))
  const ski2 = ski.clone()
  ski.position.set(0, -0.28, 0.08)
  ski2.position.set(0, -0.28, -0.08)
  skier.add(ski, ski2)
  mountains.add(skier)
  const yeti = new THREE.Group()
  const yetiBody = new THREE.Mesh(new THREE.SphereGeometry(0.32, 18, 14), matte(0xd8dce0))
  yetiBody.scale.set(0.75, 1.35, 0.6)
  const yetiHead = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 12), matte(0xcfd4d8))
  yetiHead.position.y = 0.48
  yeti.add(yetiBody, yetiHead)
  yeti.position.set(5.2, -1.35, -5)
  mountains.add(yeti)
  tick.push((time, progress, reduced) => {
    snowField.points.position.y = -((time * 0.14) % 1.6)
    if (reduced) return
    skier.position.set(-6 + ((time * 0.34) % 13), -1.85 + Math.sin(time * 0.5) * 0.08, -2.1)
    skier.rotation.z = -0.16
    yeti.visible = pulse(progress, 0.24, 0.31, 0.38) > 0.08 && Math.sin(time * 0.22) > 0.15
  })
  groups.push(mountains)

  const forest = new THREE.Group()
  addDome(forest, 0x0c1c16, 0x1c3328)
  forest.add(new THREE.HemisphereLight(0x8fb59a, 0x0a140f, 0.55))
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(34, 20), matte(0x142018))
  ground.rotation.x = -Math.PI / 2
  ground.position.y = -3.05
  forest.add(ground)
  const treeCount = mobile ? 42 : 86
  const dummy = new THREE.Object3D()
  const trunkGeo = new THREE.CylinderGeometry(0.05, 0.11, 2.4, 6)
  const trunks = new THREE.InstancedMesh(trunkGeo, matte(0x2a2118), treeCount)
  const canopyGeo = new THREE.SphereGeometry(0.7, 16, 12)
  const canopies = new THREE.InstancedMesh(canopyGeo, matte(0x16351f), treeCount * 3)
  let canopyIndex = 0
  for (let i = 0; i < treeCount; i++) {
    const x = (random() - 0.5) * 24
    const z = -1.5 - random() * 14
    const s = 0.75 + random() * 1.5
    dummy.position.set(x, -1.9, z)
    dummy.scale.set(s, s, s)
    dummy.rotation.y = random() * Math.PI
    dummy.updateMatrix()
    trunks.setMatrixAt(i, dummy.matrix)
    for (let k = 0; k < 3; k++) {
      dummy.position.set(x + (k - 1) * 0.18 * s, -0.55 + k * 0.22 * s, z + (k % 2 ? 0.12 : -0.1) * s)
      dummy.scale.setScalar(s * (0.7 + k * 0.12))
      dummy.updateMatrix()
      canopies.setMatrixAt(canopyIndex++, dummy.matrix)
    }
  }
  forest.add(trunks, canopies)
  for (let i = 0; i < 7; i++) {
    addSprite(forest, soft, 0xb7d0c2, 0.05, new THREE.Vector3((random() - 0.5) * 14, -2.2 + random(), -3 - random() * 8), new THREE.Vector2(6 + random() * 5, 1.2))
  }
  const fireflies = addPoints(forest, renderer, mobile ? 50 : 110, 0xd8ff9a, 0.5, () =>
    new THREE.Vector3((random() - 0.5) * 16, -2 + random() * 4, -2 - random() * 10)
  )
  const deer = new THREE.Group()
  deer.add(new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), matte(0x3a2a1c)))
  deer.children[0].scale.set(1.5, 0.8, 0.7)
  const neck = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.22, 3, 6), matte(0x3a2a1c))
  neck.position.set(0.18, 0.16, 0)
  neck.rotation.z = -0.6
  deer.add(neck)
  deer.position.set(-3.2, -2.55, -3.4)
  forest.add(deer)
  const owl = new THREE.Group()
  owl.add(new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), matte(0x1c1610)))
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 8), new THREE.MeshBasicMaterial({ color: 0xf0c14a }))
  const eye2 = eye.clone()
  eye.position.set(0.03, 0.02, 0.07)
  eye2.position.set(-0.03, 0.02, 0.07)
  owl.add(eye, eye2)
  owl.position.set(4.6, -0.2, -4.2)
  forest.add(owl)
  tick.push((time, progress, reduced) => {
    fireflies.points.position.y = Math.sin(time * 0.35) * 0.08
    if (reduced) return
    deer.position.x = -4 + Math.sin(time * 0.12) * 1.4
    owl.visible = pulse(progress, 0.38, 0.44, 0.5) > 0.2 && Math.sin(time * 0.7) > -0.2
  })
  groups.push(forest)

  const desert = new THREE.Group()
  addDome(desert, 0x1b2c44, 0xe0b56a)
  desert.add(new THREE.HemisphereLight(0xffd7a0, 0x4a3018, 0.8))
  const duneGeo = new THREE.PlaneGeometry(36, 20, mobile ? 60 : 110, mobile ? 34 : 64)
  duneGeo.rotateX(-Math.PI / 2)
  const sandA = new THREE.Color(0xc48a48)
  const sandB = new THREE.Color(0xe8c07a)
  displace(
    duneGeo,
    (x, z) => -3.35 + Math.sin(x * 0.38 + z * 0.16) * 0.55 + Math.sin(x * 0.14 - z * 0.3) * 0.32,
    (y) => (y > -3.15 ? sandB : sandA)
  )
  desert.add(new THREE.Mesh(duneGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 })))
  for (let i = 0; i < 6; i++) {
    const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45 + random() * 0.5, 1), matte(0x8a5a36))
    rock.position.set(-8 + i * 2.8, -2.7, -5 - random() * 4)
    rock.rotation.set(random(), random(), random())
    rock.scale.set(1 + random(), 0.45 + random() * 0.4, 0.8 + random())
    desert.add(rock)
  }
  for (let i = 0; i < 6; i++) {
    addSprite(desert, soft, 0xf3c17e, 0.04, new THREE.Vector3((random() - 0.5) * 16, -0.4 + random() * 3, -4 - random() * 8), new THREE.Vector2(6, 2))
  }
  const tumble = new THREE.Mesh(new THREE.IcosahedronGeometry(0.38, 1), new THREE.MeshBasicMaterial({ color: 0x7a5a38, wireframe: true, transparent: true, opacity: 0.7 }))
  desert.add(tumble)
  const pyramid = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.1, 4), matte(0xb8864c))
  pyramid.position.set(6.4, -2.2, -8)
  pyramid.rotation.y = 0.6
  desert.add(pyramid)
  const snake = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.55, 3, 6), matte(0x6a4a28))
  snake.rotation.z = Math.PI / 2
  desert.add(snake)
  tick.push((time, _progress, reduced) => {
    if (reduced) return
    tumble.position.set(-7 + ((time * 0.4) % 15), -2.55 + Math.abs(Math.sin(time * 1.5)) * 0.35, -2.8)
    tumble.rotation.z = time * 1.6
    snake.position.set(Math.sin(time * 0.18) * 4, -2.85, -3.2)
  })
  groups.push(desert)

  const swamp = new THREE.Group()
  addDome(swamp, 0x0b1a18, 0x243c32)
  swamp.add(new THREE.HemisphereLight(0x8fbfa8, 0x0a1614, 0.5))
  const waterGeo = new THREE.PlaneGeometry(32, 20, 80, 50)
  const waterMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uAmp: { value: 0.05 },
      uDeep: { value: new THREE.Color(0x071c1c) },
      uShallow: { value: new THREE.Color(0x2c5648) },
      uOpacity: { value: 0.9 }
    },
    vertexShader: waterVertex,
    fragmentShader: waterFragment,
    transparent: true
  })
  const water = new THREE.Mesh(waterGeo, waterMat)
  water.rotation.x = -Math.PI / 2
  water.position.y = -2.9
  swamp.add(water)
  const cypress = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.07, 0.2, 4.2, 7), matte(0x3d3228), mobile ? 20 : 40)
  for (let i = 0; i < cypress.count; i++) {
    dummy.position.set((random() - 0.5) * 22, -1.1, -2 - random() * 12)
    dummy.scale.set(0.8 + random() * 0.8, 0.85 + random() * 1.2, 0.8 + random() * 0.8)
    dummy.rotation.z = (random() - 0.5) * 0.1
    dummy.updateMatrix()
    cypress.setMatrixAt(i, dummy.matrix)
  }
  swamp.add(cypress)
  for (let i = 0; i < (mobile ? 8 : 16); i++) {
    addSprite(swamp, soft, 0x8fa392, 0.07, new THREE.Vector3((random() - 0.5) * 12, -0.4 + random() * 2.2, -3 - random() * 8), new THREE.Vector2(1.2, 3.2))
  }
  for (let i = 0; i < 8; i++) {
    addSprite(swamp, soft, 0xa8b8a8, 0.045, new THREE.Vector3((random() - 0.5) * 16, -2 + random(), -3 - random() * 8), new THREE.Vector2(6, 1.4))
  }
  const heron = new THREE.Group()
  heron.add(new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), matte(0xd5d8dc)))
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.16, 6), matte(0xc48a3a))
  beak.rotation.z = Math.PI / 2
  beak.position.x = 0.12
  heron.add(beak)
  heron.position.set(-2.6, -2.15, -2.8)
  swamp.add(heron)
  const gator = new THREE.Group()
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), new THREE.MeshBasicMaterial({ color: 0xc4e36a }))
  const eyeR = eyeL.clone()
  eyeL.position.set(-0.08, 0, 0)
  eyeR.position.set(0.08, 0, 0)
  gator.add(eyeL, eyeR)
  gator.position.set(3.4, -2.82, -3.6)
  swamp.add(gator)
  tick.push((time, progress, reduced) => {
    waterMat.uniforms.uTime.value = time
    if (reduced) return
    heron.position.y = -2.15 + Math.sin(time * 0.4) * 0.03
    gator.visible = pulse(progress, 0.62, 0.68, 0.74) > 0.15 && Math.sin(time * 0.3) > 0
    gator.position.x = 3.2 + Math.sin(time * 0.08) * 0.4
  })
  groups.push(swamp)

  const beach = new THREE.Group()
  addDome(beach, 0x2a5a72, 0xc5d6dc)
  beach.add(new THREE.HemisphereLight(0xd8eef2, 0x243038, 0.7))
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(34, 12), matte(0xc9ae7a))
  sand.rotation.x = -Math.PI / 2
  sand.position.set(0, -3.15, -2.4)
  beach.add(sand)
  const seaMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uAmp: { value: 0.09 },
      uDeep: { value: new THREE.Color(0x0a4a5c) },
      uShallow: { value: new THREE.Color(0x3aa8ae) },
      uOpacity: { value: 0.92 }
    },
    vertexShader: waterVertex,
    fragmentShader: waterFragment,
    transparent: true
  })
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(36, 20, mobile ? 70 : 120, mobile ? 40 : 70), seaMat)
  sea.rotation.x = -Math.PI / 2
  sea.position.set(0, -2.82, -10)
  beach.add(sea)
  const foam = new THREE.Mesh(new THREE.PlaneGeometry(26, 0.32), new THREE.MeshBasicMaterial({ color: 0xf4fbff, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending }))
  foam.rotation.x = -Math.PI / 2
  foam.position.set(0, -2.76, -3.1)
  beach.add(foam)
  const boat = new THREE.Group()
  boat.add(new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.7, 4, 8), matte(0xe8ebe8)))
  boat.children[0].rotation.z = Math.PI / 2
  const sail = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.42), matte(0xf3f6f8))
  sail.position.set(0, 0.32, 0)
  boat.add(sail)
  beach.add(boat)
  const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.16, 8), new THREE.MeshStandardMaterial({ color: 0x7ec8b8, transparent: true, opacity: 0.55, roughness: 0.15, metalness: 0.1 }))
  beach.add(bottle)
  const gulls: THREE.Line[] = []
  for (let i = 0; i < 7; i++) {
    const gull = new THREE.Line(birdGeo, new THREE.LineBasicMaterial({ color: 0xf0f3f6, transparent: true, opacity: 0.7 }))
    beach.add(gull)
    gulls.push(gull)
  }
  tick.push((time, _progress, reduced) => {
    seaMat.uniforms.uTime.value = time
    foam.position.z = -3.1 + Math.sin(time * 0.7) * 0.18
    ;(foam.material as THREE.MeshBasicMaterial).opacity = 0.22 + Math.sin(time * 0.9) * 0.06
    if (reduced) return
    boat.position.set(2.4 + Math.sin(time * 0.15) * 1.2, -2.55, -7.2)
    boat.rotation.z = Math.sin(time * 0.6) * 0.04
    bottle.position.set(-1.8, -3.02 + Math.sin(time * 0.8) * 0.02, -3.4)
    gulls.forEach((gull, i) => {
      gull.position.set(-6 + ((time * 0.18 + i) % 14), 1.1 + (i % 3) * 0.25, -5)
    })
  })
  groups.push(beach)

  const ocean = new THREE.Group()
  addDome(ocean, 0x021018, 0x063040)
  ocean.add(new THREE.HemisphereLight(0x4aa8b4, 0x021018, 0.45))
  const veil = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 24),
    new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragmentShader: `
        uniform float uTime; varying vec2 vUv;
        void main() {
          float d = 1.0 - vUv.y;
          vec3 top = vec3(0.02, 0.22, 0.28);
          vec3 deep = vec3(0.002, 0.02, 0.05);
          vec3 color = mix(top, deep, smoothstep(0.05, 1.0, d));
          float c = sin((vUv.x + uTime * 0.02) * 40.0) * sin((vUv.y - uTime * 0.015) * 32.0);
          color += vec3(0.04, 0.16, 0.18) * pow(max(c, 0.0), 10.0) * 0.22;
          gl_FragColor = vec4(color, 0.92);
        }
      `,
      transparent: true,
      depthWrite: false
    })
  )
  veil.position.z = -10
  ocean.add(veil)
  const marine = addPoints(ocean, renderer, mobile ? 320 : 900, 0xb7eef2, 0.58, () =>
    new THREE.Vector3((random() - 0.5) * 20, (random() - 0.5) * 12, -1 - random() * 14)
  )
  const fish: THREE.Group[] = []
  for (let i = 0; i < (mobile ? 8 : 16); i++) {
    const item = new THREE.Group()
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), matte(i % 3 ? 0x0c2430 : 0x1d4a52))
    body.scale.set(1.6, 0.65, 0.42)
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.22, 5), body.material)
    tail.rotation.z = Math.PI / 2
    tail.position.x = -0.34
    item.add(body, tail)
    item.userData = { dir: i % 2 ? 1 : -1, speed: 0.16 + random() * 0.22, y: -2.5 + random() * 5, z: -2 - random() * 8, phase: random() * 10 }
    ocean.add(item)
    fish.push(item)
  }
  const jelly: THREE.Group[] = []
  for (let i = 0; i < 4; i++) {
    const item = new THREE.Group()
    const bell = new THREE.Mesh(
      new THREE.SphereGeometry(0.28 + i * 0.03, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: i % 2 ? 0x6fe3d8 : 0x7aa8ff, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
    )
    bell.rotation.x = Math.PI
    item.add(bell)
    item.position.set(i % 2 ? 3.6 : -3.8, -0.6 + i * 0.7, -4 - i)
    ocean.add(item)
    jelly.push(item)
  }
  const whale = new THREE.Group()
  const whaleBody = new THREE.Mesh(new THREE.SphereGeometry(0.7, 20, 14), matte(0x16303a))
  whaleBody.scale.set(2.4, 0.7, 0.8)
  whale.add(whaleBody)
  whale.position.set(-8, -2.2, -7)
  ocean.add(whale)
  const sub = new THREE.Group()
  sub.add(new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.7, 6, 10), metal(0x6a7a82)))
  sub.children[0].rotation.z = Math.PI / 2
  const tower = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.18), metal(0x5a686e))
  tower.position.y = 0.2
  sub.add(tower)
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
      item.position.y += Math.sin(time * 0.3 + i) * 0.0014
      item.scale.y = 0.96 + Math.sin(time * 0.85 + i) * 0.04
    })
    whale.visible = pulse(progress, 0.88, 0.94, 1.02) > 0.12
    whale.position.x = -10 + ((time * 0.12) % 18)
    sub.position.set(4 - Math.sin(time * 0.12) * 2, -1.8, -5)
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
