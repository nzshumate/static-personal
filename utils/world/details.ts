export { makeSkier, makeBear, makeFox, makeFrog, makeSnake } from './actors'
import * as THREE from 'three'
import { textured } from './surfaces'
import { batchStaticGroup } from './batching'

export const metal = (color: number, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, metalness: 0.78, roughness: 0.28, fog: false, ...extra })

export const matte = (color: number, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, metalness: 0.04, roughness: 0.92, fog: true, ...extra })

export const emit = (color: number, intensity = 0.55) =>
  new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.4, metalness: 0.08, fog: false })

export type Tickable = {
  group: THREE.Group
  update: (time: number, reduced: boolean) => void
}

export const makeBird = (color: number): Tickable => {
  const group = new THREE.Group()
  const skin = matte(color)
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), skin)
  body.scale.set(1.6, 0.82, 0.78)
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.03, 7, 6), skin)
  head.position.set(0.09, 0.018, 0)
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.01, 0.042, 5), matte(0xc4a06a))
  beak.rotation.z = -Math.PI / 2
  beak.position.set(0.125, 0.016, 0)
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.09, 5), skin)
  tail.rotation.z = Math.PI / 2
  tail.position.set(-0.1, 0, 0)
  const leftPivot = new THREE.Group()
  const rightPivot = new THREE.Group()
  leftPivot.position.set(0.01, 0.02, 0.03)
  rightPivot.position.set(0.01, 0.02, -0.03)
  const wingGeo = new THREE.BufferGeometry()
  wingGeo.setAttribute('position', new THREE.Float32BufferAttribute([
    0.035,0,0, -0.065,0,0, -0.12,0.015,0.14,
    0.035,0,0, -0.12,0.015,0.14, -0.08,0.025,0.25,
    0.035,0,0, -0.08,0.025,0.25, 0.008,0.018,0.1
  ], 3))
  wingGeo.computeVertexNormals()
  const feathers = matte(color, { side: THREE.DoubleSide })
  const left = new THREE.Mesh(wingGeo, feathers)
  const right = new THREE.Mesh(wingGeo.clone().scale(1, 1, -1), feathers)
  leftPivot.add(left)
  rightPivot.add(right)
  group.add(body, head, beak, tail, leftPivot, rightPivot)
  group.scale.setScalar(3.1)
  group.userData = { leftPivot, rightPivot, phase: Math.random() * Math.PI * 2 }
  return {
    group,
    update: (time) => {
      const flap = Math.sin(time * 5.2 + group.userData.phase) * 0.42
      leftPivot.rotation.x = flap
      rightPivot.rotation.x = -flap
    }
  }
}

// Soft, irregular density lobes avoid the hard silhouette of stacked spheres.
export const makeCloud = (random: () => number) => {
  const group = new THREE.Group()
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 128
  const ctx = canvas.getContext('2d')!
  const gradient = ctx.createRadialGradient(64, 58, 6, 64, 64, 62)
  gradient.addColorStop(0, 'rgba(255,255,255,0.8)')
  gradient.addColorStop(0.38, 'rgba(242,248,255,0.6)')
  gradient.addColorStop(0.7, 'rgba(214,229,245,0.2)')
  gradient.addColorStop(1, 'rgba(205,224,246,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 128, 128)
  const pixels = ctx.getImageData(0, 0, 128, 128)
  const seed = random() * 40
  const hash = (x: number, y: number) => { const n = Math.sin(x * 127.1 + y * 311.7 + seed) * 43758.5453; return n - Math.floor(n) }
  const noise = (x: number, y: number) => {
    const ix = Math.floor(x), iy = Math.floor(y)
    let fx = x - ix, fy = y - iy
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy)
    const low = hash(ix, iy) * (1 - fx) + hash(ix + 1, iy) * fx
    const high = hash(ix, iy + 1) * (1 - fx) + hash(ix + 1, iy + 1) * fx
    return low * (1 - fy) + high * fy
  }
  for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
    const i = (y * 128 + x) * 4
    const density = noise(x * 0.08, y * 0.08) * 0.65 + noise(x * 0.21, y * 0.21) * 0.25 + noise(x * 0.53, y * 0.53) * 0.1
    pixels.data[i + 3]! *= Math.max(0, Math.min(1.8, (density - 0.2) * 2.5))
  }
  ctx.putImageData(pixels, 0, 0)
  const map = new THREE.CanvasTexture(canvas)
  map.colorSpace = THREE.SRGBColorSpace
  const width = 2.4 + random() * 2
  for (let i = 0; i < 9; i++) {
    const t = i / 8
    const puff = new THREE.Sprite(new THREE.SpriteMaterial({ map, color: i < 3 ? 0xbdcddd : 0xffffff, opacity: 0.42, depthWrite: false }))
    puff.position.set((t - 0.5) * width, Math.sin(t * Math.PI) * 0.35 + random() * 0.15, random() * 0.3)
    const size = 0.85 + Math.sin(t * Math.PI) * 0.65
    puff.scale.set(size * 1.8, size * 0.85, 1)
    group.add(puff)
  }
  return group
}

export const makeCabin = () => {
  const group = new THREE.Group()
  const wall = textured(0x715037, 'wood')
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.91, 0.56, 0.64), wall)
  body.position.y = 0.28
  const sill = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.06, 0.8), matte(0x3a2416))
  sill.position.y = 0.03
  const roof = new THREE.Group()
  const gableShape = new THREE.Shape()
  gableShape.moveTo(-0.49, 0)
  gableShape.lineTo(0.49, 0)
  gableShape.lineTo(0, 0.34)
  gableShape.closePath()
  const gable = new THREE.Mesh(new THREE.ExtrudeGeometry(gableShape, { depth: 0.72, bevelEnabled: false }), wall)
  gable.position.set(0, 0.56, -0.36)
  roof.add(gable)
  const roofing = textured(0x3e4448, 'stone')
  const snow = matte(0xe4edf0, { roughness: 0.96 })
  for (const side of [-1, 1]) {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.045, 0.91), roofing)
    panel.position.set(side * 0.28, 0.735, 0)
    panel.rotation.z = -side * 0.55
    roof.add(panel)
    const snowcap = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.028, 0.87), snow)
    snowcap.position.copy(panel.position).y += 0.035
    snowcap.rotation.copy(panel.rotation)
    roof.add(snowcap)
  }
  const eaves = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.03, 0.86), matte(0x2a1810))
  eaves.position.y = 0.56
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.28, 0.03), matte(0x2a1810))
  door.position.set(0.2, 0.18, 0.37)
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 6), metal(0xc4a06a))
  knob.position.set(0.26, 0.18, 0.39)
  const window = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.16, 0.03), emit(0xff9a40, 1.25))
  window.position.set(-0.22, 0.3, 0.37)
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.2, 0.02), matte(0x2a1810))
  frame.position.set(-0.22, 0.3, 0.355)
  const porch = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.22), matte(0x4a301c))
  porch.position.set(0.2, 0.04, 0.48)
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.28, 0.16), matte(0x4a4038))
  chimney.position.set(-0.28, 0.84, -0.1)
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 0.22), matte(0x2a241c))
  cap.position.set(-0.28, 0.99, -0.1)
  const ember = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.04, 8), emit(0xff5520, 2.1))
  ember.position.set(-0.28, 0.98, -0.1)
  group.add(body, sill, roof, eaves, door, knob, frame, window, porch, chimney, cap, ember)
  // Interlocked rounded logs, with front openings cut around the door and window.
  const timber = textured(0x835b38, 'wood')
  const trim = matte(0xb69a70)
  const endGrain = matte(0xa08056)
  const log = (length: number, x: number, y: number, z: number, across: boolean) => {
    const course = new THREE.Mesh(new THREE.CylinderGeometry(0.041, 0.045, length, 12), timber)
    course.rotation.z = Math.PI / 2
    if (!across) course.rotation.y = Math.PI / 2
    course.position.set(x,y,z)
    group.add(course)
    for (const side of [-1,1]) {
      const end = new THREE.Mesh(new THREE.CircleGeometry(0.037, 12), endGrain)
      end.position.set(x + (across ? side*length/2 : 0), y, z + (across ? 0 : side*length/2))
      end.rotation.y = across ? side*Math.PI/2 : (side<0 ? Math.PI : 0)
      group.add(end)
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.021,0.024,12), timber)
      ring.position.copy(end.position)
      if(across)ring.position.x+=side*.001;else ring.position.z+=side*.001
      ring.rotation.copy(end.rotation);group.add(ring)
    }
  }
  for (let i=0;i<8;i++) {
    const y=.055+i*.071
    log(1.07+(i%2)*.025,0,y,-.34,true)
    for(const x of [-.47,.47])log(.83+(i%2)*.025,x,y+.018,0,false)
    const intervals: [number,number][] = y < .34 ? [[-.53,.105],[.295,.53]] : [[-.53,.53]]
    for(const [left,right] of intervals) {
      if(y>.19 && y<.41 && left<-.1) {
        if(left<-.34)log(-.34-left,(left-.34)/2,y,.34,true)
        if(right>-.1)log(right+.1,(right-.1)/2,y,.34,true)
      } else log(right-left,(left+right)/2,y,.34,true)
    }
  }
  // Uneven snow pillows soften the roof edge and expose the dark timber beneath.
  for(let i=0;i<12;i++)for(const side of [-1,1]) {
    const snowLip=new THREE.Mesh(new THREE.SphereGeometry(1,10,6),snow)
    snowLip.position.set(side*.565,.575,-.39+i*.072)
    snowLip.scale.set(.06,.018+(i%3)*.005,.052)
    group.add(snowLip)
    if(i%3===0) {
      const icicle=new THREE.Mesh(new THREE.ConeGeometry(.009,.055+(i%4)*.018,6),matte(0xcce2e9,{transparent:true,opacity:.75,roughness:.2}))
      icicle.rotation.z=Math.PI;icicle.position.copy(snowLip.position).y-=.038;group.add(icicle)
    }
  }
  for(let i=0;i<6;i++) {
    const stone=new THREE.Mesh(new THREE.IcosahedronGeometry(.095,1),textured(0x777773,'stone'))
    stone.scale.set(1,.42,.7);stone.position.set(-.45+i*.18,.01,.34);group.add(stone)
    const mortar=new THREE.Mesh(new THREE.BoxGeometry(.165,.008,.165),matte(0x82786a))
    mortar.position.set(-.28,.75+i*.04,-.1);group.add(mortar)
  }
  for(const x of [-.37,-.075]) {
    const shutter=new THREE.Mesh(new THREE.BoxGeometry(.045,.18,.025),timber)
    shutter.position.set(x,.3,.389);shutter.rotation.y=x<-.2?-.15:.15;group.add(shutter)
  }
  for (const horizontal of [true, false]) {
    const mullion = new THREE.Mesh(new THREE.BoxGeometry(horizontal ? 0.21 : 0.014, horizontal ? 0.014 : 0.17, 0.015), trim)
    mullion.position.set(-0.22, 0.3, 0.395)
    group.add(mullion)
  }
  const sillBoard = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.025, 0.085), trim)
  sillBoard.position.set(-0.22, 0.205, 0.39)
  group.add(sillBoard)
  for (let i = 0; i < 5; i++) {
    const tread = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.006, 0.012), timber)
    tread.position.set(0.2, 0.064, 0.39 + i * 0.042)
    group.add(tread)
  }
  group.userData = { window, chimney, ember }
  return batchStaticGroup(group)
}

// Classic envelope: wide shoulder, tapered crown, cinched mouth, burner, and a slatted basket on four lines.
export const makeBalloon = (envelope: number): Tickable => {
  const group = new THREE.Group()
  const cloth = textured(envelope, 'cloth', { roughness: 0.8 })
  const cream = matte(0xf2e6c4, { roughness: 0.5 })
  const wicker = matte(0x6a4a2e)
  const darkWicker = matte(0x3e2a18)
  const ropeMat = matte(0x4a3828)
  const profile = [
    new THREE.Vector2(0.02, 0.58),
    new THREE.Vector2(0.16, 0.5),
    new THREE.Vector2(0.4, 0.28),
    new THREE.Vector2(0.49, 0.04),
    new THREE.Vector2(0.44, -0.16),
    new THREE.Vector2(0.26, -0.36),
    new THREE.Vector2(0.11, -0.48),
    new THREE.Vector2(0.065, -0.54)
  ]
  const curve = new THREE.SplineCurve([...profile].reverse())
  const smoothProfile = curve.getPoints(48)
  const bulb = new THREE.Group()
  for (let panel = 0; panel < 16; panel++) {
    const gore = new THREE.Mesh(new THREE.LatheGeometry(smoothProfile, 8, panel * Math.PI / 8, Math.PI / 8), panel % 4 === 0 ? cream : cloth)
    bulb.add(gore)
    const seamPoints = smoothProfile.map(p => new THREE.Vector3((p.x + 0.002) * Math.sin(panel * Math.PI / 8), p.y, (p.x + 0.002) * Math.cos(panel * Math.PI / 8)))
    const seam = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(seamPoints), 48, 0.002, 3, false), cream)
    bulb.add(seam)
  }
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.08, 0.045, 10), cream)
  crown.position.y = 0.58
  const valve = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.04, 6), metal(0x8a9098))
  valve.position.y = 0.61
  const burner = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.048, 0.07, 8), metal(0x6a7078))
  burner.position.y = -0.58
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.09, 6), emit(0xff7a30, 1.6))
  flame.position.y = -0.52
  const basket = new THREE.Group()
  const floor = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.03, 0.22), darkWicker)
  floor.position.y = -0.84
  const rim = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.025, 0.24), wicker)
  rim.position.y = -0.72
  basket.add(floor, rim)
  for (let i = 0; i < 4; i++) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.11, 0.016), i % 2 ? wicker : darkWicker)
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4
    wall.position.set(Math.cos(a) * 0.1, -0.78, Math.sin(a) * 0.1)
    wall.rotation.y = -a
    basket.add(wall)
  }
  const up = new THREE.Vector3(0, 1, 0)
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4
    const top = new THREE.Vector3(Math.cos(a) * 0.07, -0.53, Math.sin(a) * 0.07)
    const bot = new THREE.Vector3(Math.cos(a) * 0.1, -0.72, Math.sin(a) * 0.1)
    const span = bot.clone().sub(top)
    const line = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, span.length(), 5), ropeMat)
    line.position.copy(top).add(bot).multiplyScalar(0.5)
    line.quaternion.setFromUnitVectors(up, span.normalize())
    group.add(line)
  }
  group.add(bulb, crown, valve, burner, flame, basket)
  return {
    group,
    update: (time) => {
      group.rotation.z = Math.sin(time * 0.4) * 0.05
      flame.scale.setScalar(0.82 + Math.sin(time * 8.5) * 0.2)
    }
  }
}

export const makeYeti = () => {
  const group = new THREE.Group()
  const fur = matte(0x9aa6b0, { roughness: 1 })
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), fur)
  body.scale.set(0.9, 1.3, 0.75)
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), matte(0xe8e0d4))
  belly.position.set(0.1, -0.02, 0)
  belly.scale.set(0.7, 1, 0.8)
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 12), fur)
  head.position.set(0.04, 0.46, 0)
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), fur)
  hair.position.set(0.02, 0.6, 0)
  hair.scale.set(1.1, 0.55, 0.9)
  const brow = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.045, 0.07), fur)
  brow.position.set(0.12, 0.5, 0)
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.024, 8, 8), matte(0x1a1814))
  const eye2 = eye.clone()
  eye.position.set(0.16, 0.46, 0.055)
  eye2.position.set(0.16, 0.46, -0.055)
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 0.04), matte(0x3a2a22))
  mouth.position.set(0.18, 0.38, 0)
  const fang = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.04, 5), matte(0xf2f0ea))
  const fang2 = fang.clone()
  fang.position.set(0.2, 0.35, 0.018)
  fang2.position.set(0.2, 0.35, -0.018)
  const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.26, 5, 8), fur)
  const arm2 = arm.clone()
  arm.position.set(0.04, 0.14, 0.28)
  arm.rotation.z = 0.55
  arm2.position.set(0.04, 0.14, -0.28)
  arm2.rotation.z = 0.55
  const hand = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), fur)
  const hand2 = hand.clone()
  hand.position.set(0.16, 0.02, 0.34)
  hand2.position.set(0.16, 0.02, -0.34)
  const claw = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.05, 5), matte(0x2a241c))
  const claws = [claw, claw.clone(), claw.clone(), claw.clone()]
  claws[0]!.position.set(0.2, -0.01, 0.36)
  claws[1]!.position.set(0.2, -0.01, 0.32)
  claws[2]!.position.set(0.2, -0.01, -0.36)
  claws[3]!.position.set(0.2, -0.01, -0.32)
  claws.forEach((item) => {
    item.rotation.z = Math.PI
  })
  const foot = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), fur)
  const foot2 = foot.clone()
  foot.position.set(0.08, -0.36, 0.12)
  foot.scale.set(1.4, 0.5, 0.85)
  foot2.position.set(0.08, -0.36, -0.12)
  foot2.scale.copy(foot.scale)
  group.add(body, belly, head, hair, brow, eye, eye2, mouth, fang, fang2, arm, arm2, hand, hand2, ...claws, foot, foot2)
  return group
}

export const makeFirefly = (): Tickable => {
  const group = new THREE.Group()
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), emit(0xe8ff6a, 1.6))
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xc8ff7a, transparent: true, opacity: 0.28, depthWrite: false })
  )
  const tail = new THREE.Mesh(
    new THREE.ConeGeometry(0.03, 0.22, 6),
    new THREE.MeshBasicMaterial({ color: 0x9ae05a, transparent: true, opacity: 0.35, depthWrite: false })
  )
  tail.rotation.z = Math.PI / 2
  tail.position.x = -0.18
  tail.scale.set(1, 1.6, 1)
  tail.visible = false
  group.add(core, halo, tail)
  group.userData = { core, halo, tail, phase: Math.random() * Math.PI * 2, speed: 0.35 + Math.random() * 0.45 }
  return {
    group,
    update: (time) => {
      const flash = Math.pow(Math.max(0, Math.sin(time * 1.8 + group.userData.phase)), 10)
      const glow = 0.12 + flash * 0.88
      ;(halo.material as THREE.MeshBasicMaterial).opacity = 0.08 + flash * 0.45
      ;(tail.material as THREE.MeshBasicMaterial).opacity = 0.06 + flash * 0.55
      ;(core.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.25 + flash * 1.8
      group.scale.setScalar(0.23 + glow * 0.07)
    }
  }
}

export const makeCactus = (random: () => number) => {
  const group = new THREE.Group()
  const skin = matte(0x2f6a34, { roughness: 0.85 })
  const h = 1.55 + random() * 0.7
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, h, 10), skin)
  trunk.position.y = h / 2
  const crown = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), skin)
  crown.position.y = h
  group.add(trunk, crown)
  const ribMaterial = matte(0x4c7950)
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2
    const rib = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.009, h * 0.95, 4), ribMaterial)
    rib.position.set(Math.cos(a) * 0.117, h * 0.49, Math.sin(a) * 0.117)
    group.add(rib)
  }
  const spines = new THREE.InstancedMesh(new THREE.ConeGeometry(0.004, 0.065, 4), matte(0xbcb697), 96)
  const spinePose = new THREE.Object3D()
  for (let i = 0; i < 96; i++) {
    const a = (i % 8) / 8 * Math.PI * 2
    const y = 0.08 + Math.floor(i / 8) / 12 * h
    spinePose.position.set(Math.cos(a) * 0.145, y, Math.sin(a) * 0.145)
    spinePose.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(Math.cos(a), 0.3, Math.sin(a)).normalize())
    spinePose.updateMatrix()
    spines.setMatrixAt(i, spinePose.matrix)
  }
  group.add(spines)
  const addArm = (side: number, height: number, length: number) => {
    const arm = new THREE.Group()
    const horiz = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, length, 8), skin)
    horiz.rotation.z = Math.PI / 2
    horiz.position.x = side * length * 0.5
    const up = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.07, 0.42 + random() * 0.2, 8), skin)
    up.position.set(side * length, 0.22, 0)
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 6), skin)
    tip.position.set(side * length, 0.42 + random() * 0.08, 0)
    arm.add(horiz, up, tip)
    const armSpines = new THREE.InstancedMesh(new THREE.ConeGeometry(0.003, 0.047, 4), matte(0xd0c7a7), 32)
    for (let j=0;j<32;j++) {
      const angle=(j%8)/8*Math.PI*2
      spinePose.position.set(side*length+Math.cos(angle)*0.08, 0.04+Math.floor(j/8)*0.105, Math.sin(angle)*0.08)
      spinePose.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), new THREE.Vector3(Math.cos(angle),0.35,Math.sin(angle)).normalize())
      spinePose.updateMatrix(); armSpines.setMatrixAt(j,spinePose.matrix)
    }
    arm.add(armSpines)
    arm.position.y = height
    group.add(arm)
  }
  addArm(1, 0.55 + random() * 0.25, 0.32 + random() * 0.08)
  addArm(-1, 0.38 + random() * 0.2, 0.26 + random() * 0.08)
  if (random() > 0.45) addArm(1, 0.95, 0.2)
  return group
}

export const setGroupOpacity = (group: THREE.Object3D, alpha: number) => {
  group.traverse((object) => {
    const mesh = object as THREE.Mesh
    if (!mesh.isMesh) return
    const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    list.forEach((material) => {
      material.transparent = true
      material.opacity = alpha
    })
  })
}

// A dry tangle: short twigs clustered on a loose spherical shell, never a solid ball.
export const makeTumbleweed = (random: () => number): Tickable => {
  const group = new THREE.Group()
  const shell = 0.3
  const dry = [matte(0x9a7a4a, { roughness: 1 }), matte(0x7c5f38, { roughness: 1 }), matte(0xb08f5c, { roughness: 1 })]
  const dir = new THREE.Vector3()
  for (let i = 0; i < 52; i++) {
    dir.set(random() - 0.5, random() - 0.5, random() - 0.5).normalize()
    const length = 0.16 + random() * 0.2
    const twig = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.004, length, 4), dry[i % 3])
    twig.position.copy(dir).multiplyScalar(shell * (0.62 + random() * 0.4))
    twig.rotation.set(random() * Math.PI, random() * Math.PI, random() * Math.PI)
    group.add(twig)
  }
  for (let i = 0; i < 9; i++) {
    dir.set(random() - 0.5, random() - 0.5, random() - 0.5).normalize()
    const arc = new THREE.Mesh(new THREE.TorusGeometry(shell * 0.85, 0.005, 4, 10, Math.PI * (0.5 + random() * 0.6)), dry[i % 3])
    arc.rotation.set(random() * Math.PI, random() * Math.PI, random() * Math.PI)
    group.add(arc)
  }
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(shell * 0.9, 12),
    new THREE.MeshBasicMaterial({ color: 0x3a2410, transparent: true, opacity: 0.22, depthWrite: false })
  )
  shadow.rotation.x = -Math.PI / 2
  group.userData = { shell, shadow }
  const wrapper = new THREE.Group()
  wrapper.add(group, shadow)
  return {
    group: wrapper,
    update: (time) => {
      // Roll matches ground travel; hops are short and irregular.
      const travel = time * 0.34
      group.rotation.z = -travel / shell
      group.rotation.x = Math.sin(time * 0.35) * 0.4
      const hop = Math.max(0, Math.sin(time * 1.9) * 0.6 + Math.sin(time * 3.1) * 0.4) * 0.18
      group.position.y = shell + hop
      shadow.position.y = 0.004
      shadow.scale.setScalar(1 - hop * 1.6)
      ;(shadow.material as THREE.MeshBasicMaterial).opacity = 0.22 - hop * 0.5
    }
  }
}

// Bald cypress parts for instancing: a flared, buttressed trunk with a ragged two-tier crown.
export const cypressGeometry = () => {
  const profile = [
    new THREE.Vector2(0.5, 0),
    new THREE.Vector2(0.34, 0.22),
    new THREE.Vector2(0.2, 0.55),
    new THREE.Vector2(0.13, 1.1),
    new THREE.Vector2(0.1, 2.4),
    new THREE.Vector2(0.075, 3.6),
    new THREE.Vector2(0.05, 4.4)
  ]
  return {
    trunk: new THREE.LatheGeometry(profile, 9),
    crown: new THREE.ConeGeometry(1.05, 2.1, 7),
    crownB: new THREE.ConeGeometry(0.62, 1.4, 6),
    knee: new THREE.ConeGeometry(0.055, 0.3, 5),
    moss: new THREE.CylinderGeometry(0.018, 0.006, 0.95, 4),
    ring: new THREE.RingGeometry(0.44, 0.82, 14)
  }
}

export const makeLilyPad = (random: () => number) => {
  const group = new THREE.Group()
  const pad = new THREE.Mesh(new THREE.CircleGeometry(0.18 + random() * 0.12, 14), matte(0x2f6a38, { side: THREE.DoubleSide }))
  pad.rotation.x = -Math.PI / 2
  const notch = new THREE.Mesh(new THREE.CircleGeometry(0.05, 8), matte(0x071c1c, { side: THREE.DoubleSide }))
  notch.rotation.x = -Math.PI / 2
  notch.position.set(0.14, 0.002, 0)
  group.add(pad, notch)
  if (random() > 0.55) {
    // Water lily: two rings of pointed petals opening around a yellow center.
    const bloom = new THREE.Group()
    const petalGeo = finShape([[0, 0], [0.028, 0.045], [0, 0.11], [-0.028, 0.045]])
    const outer = matte(0xf4dbe6, { side: THREE.DoubleSide, roughness: 0.6 })
    const inner = matte(0xfbeef4, { side: THREE.DoubleSide, roughness: 0.6 })
    for (let ring = 0; ring < 2; ring++) {
      const count = ring === 0 ? 8 : 6
      for (let i = 0; i < count; i++) {
        const petal = new THREE.Mesh(petalGeo, ring === 0 ? outer : inner)
        const a = (i / count) * Math.PI * 2 + ring * 0.4
        petal.position.set(Math.cos(a) * 0.012, 0.015 + ring * 0.01, Math.sin(a) * 0.012)
        petal.rotation.order = 'YXZ'
        petal.rotation.y = -a + Math.PI / 2
        petal.rotation.x = ring === 0 ? -0.95 : -0.55
        petal.scale.setScalar(ring === 0 ? 1 : 0.72)
        bloom.add(petal)
      }
    }
    const center = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), emit(0xf2c14a, 0.5))
    center.position.y = 0.035
    center.scale.y = 0.6
    bloom.add(center)
    bloom.position.set((random() - 0.5) * 0.06, 0.006, (random() - 0.5) * 0.06)
    bloom.rotation.y = random() * Math.PI
    group.add(bloom)
  }
  return group
}

// Great blue heron at rest: S-curved neck, dagger bill, folded wings, one leg planted in the shallows.
export const makeHeron = () => {
  const group = new THREE.Group()
  const plume = matte(0xb9c2c9, { roughness: 0.85 })
  const dark = matte(0x3f4b56, { roughness: 0.85 })
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), plume)
  body.scale.set(1.55, 0.85, 0.8)
  body.position.y = 0.42
  body.rotation.z = 0.18
  const wing = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), dark)
  wing.scale.set(1.5, 0.55, 0.35)
  wing.position.set(-0.02, 0.47, 0.06)
  wing.rotation.z = 0.2
  const wing2 = wing.clone()
  wing2.position.z = -0.06
  const tailFeathers = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.2, 5), dark)
  tailFeathers.rotation.z = Math.PI / 2 + 0.35
  tailFeathers.position.set(-0.2, 0.4, 0)
  const neckCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.12, 0.48, 0),
    new THREE.Vector3(0.2, 0.62, 0),
    new THREE.Vector3(0.17, 0.78, 0),
    new THREE.Vector3(0.24, 0.9, 0)
  ])
  const neck = new THREE.Mesh(new THREE.TubeGeometry(neckCurve, 12, 0.03, 7, false), plume)
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), plume)
  head.scale.set(1.35, 0.85, 0.8)
  head.position.set(0.27, 0.91, 0)
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), dark)
  cap.scale.set(1.6, 0.5, 0.7)
  cap.position.set(0.25, 0.94, 0)
  const crest = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.11, 5), dark)
  crest.rotation.z = Math.PI / 2 + 0.25
  crest.position.set(0.17, 0.95, 0)
  const bill = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.22, 6), matte(0xd6a24a, { roughness: 0.5 }))
  bill.rotation.z = -Math.PI / 2 - 0.08
  bill.position.set(0.42, 0.9, 0)
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.008, 6, 6), matte(0xf2c14a))
  eye.position.set(0.29, 0.92, 0.036)
  const legMat = matte(0x5a5148, { roughness: 0.9 })
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.009, 0.44, 5), legMat)
  leg.position.set(0.02, 0.2, 0.03)
  const leg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.009, 0.32, 5), legMat)
  leg2.position.set(-0.04, 0.3, -0.03)
  leg2.rotation.z = 0.5
  const ripple = new THREE.Mesh(
    new THREE.RingGeometry(0.05, 0.11, 14),
    new THREE.MeshBasicMaterial({ color: 0x0a1f1c, transparent: true, opacity: 0.5, depthWrite: false })
  )
  ripple.rotation.x = -Math.PI / 2
  ripple.position.set(0.02, 0.004, 0.03)
  group.add(body, wing, wing2, tailFeathers, neck, head, cap, crest, bill, eye, leg, leg2, ripple)
  return group
}

export const makePalm = (random: () => number) => {
  const group = new THREE.Group()
  const lean = 0.04 + random() * 0.04
  const h = 2.35
  const trunk = new THREE.Group()
  const wood = textured(0x8a6b48, 'wood')
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.13, h, 8), wood)
  shaft.position.y = h / 2
  trunk.add(shaft)
  const growthScar = matte(0x7a4a28)
  for (let i = 0; i < 17; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.126 - i * 0.0034, 0.008, 5, 12), growthScar)
    ring.rotation.x = Math.PI / 2
    ring.position.y = 0.13 + i * 0.13
    trunk.add(ring)
  }
  const crown = new THREE.Group()
  crown.position.y = h
  const leaf = matte(0x307743, { side: THREE.DoubleSide })
  for (let k = 0; k < 9; k++) {
    const frond = new THREE.Group()
    const length = 1.1 + random() * 0.35
    const spine = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0), new THREE.Vector3(length * 0.4, 0.18, 0), new THREE.Vector3(length, -0.5, 0)
    ])
    frond.add(new THREE.Mesh(new THREE.TubeGeometry(spine, 16, 0.009, 4, false), leaf))
    const vertices: number[] = []
    for (let i = 1; i < 15; i++) {
      const t = i / 15
      const p = spine.getPoint(t)
      const width = Math.sin(t * Math.PI) * 0.25
      for (const side of [-1, 1]) vertices.push(p.x - 0.045, p.y, 0, p.x + 0.13, p.y - 0.11, width * side, p.x + 0.045, p.y + 0.012, 0)
    }
    const blades = new THREE.BufferGeometry()
    blades.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
    blades.computeVertexNormals()
    frond.add(new THREE.Mesh(blades, leaf))
    frond.rotation.y = k / 9 * Math.PI * 2
    frond.rotation.z = (random() - 0.5) * 0.3
    crown.add(frond)
  }
  const nut = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), matte(0x5a3a1c))
  const nut2 = nut.clone()
  nut.position.set(0.04, -0.05, 0.03)
  nut2.position.set(-0.03, -0.04, -0.03)
  crown.add(nut, nut2)
  trunk.add(crown)
  trunk.rotation.z = lean
  group.add(trunk)
  return batchStaticGroup(group)
}

export const makeLighthouse = () => {
  const group = new THREE.Group()
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 2.1, 12), matte(0xf0ece4))
  tower.position.y = 1.05
  const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.185, 0.22, 0.38, 12), matte(0xc4333d))
  stripe.position.y = 1.25
  const stripe2 = stripe.clone()
  stripe2.position.y = 0.55
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.22, 0.03), matte(0x2a1810))
  door.position.set(0, 0.18, 0.22)
  const window = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.03), emit(0xfff1c4, 0.7))
  window.position.set(0, 0.92, 0.2)
  const lantern = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.28, 10), emit(0xfff1c4, 1.5))
  lantern.position.y = 2.22
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.16, 8), matte(0x2a3038))
  cap.position.y = 2.42
  const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.04, 12), matte(0xd5d0c6))
  rail.position.y = 2.02
  const gallery = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.012, 6, 14), metal(0xc5ced6))
  gallery.rotation.x = Math.PI / 2
  gallery.position.y = 2.08
  const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 0), matte(0xc9ae7a))
  rock.scale.set(1.5, 0.45, 1.15)
  rock.position.y = 0.06
  group.add(tower, stripe, stripe2, door, window, lantern, cap, rail, gallery, rock)
  return group
}

export const makeSailboat = () => {
  const group = new THREE.Group()
  const hull = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 1.2, 5, 12), matte(0xf2f0ea))
  hull.rotation.z = Math.PI / 2
  hull.scale.set(1, 0.64, 0.86)
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.05, 0.3), matte(0xc4333d))
  stripe.position.y = 0.02
  const keel = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.22, 0.03), matte(0x5a4030))
  keel.position.set(0.04, -0.18, 0)
  const deck = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.04, 0.24), matte(0xd8c4a0))
  deck.position.y = 0.1
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 0.2), matte(0xe8e4dc))
  cabin.position.set(0.1, 0.2, 0)
  const hatch = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.02), emit(0x7ec8e8, 0.45))
  hatch.position.set(0.1, 0.22, 0.11)
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.02, 1.16, 6), matte(0xd8c4a0))
  mast.position.set(0.02, 0.68, 0)
  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.64, 5), matte(0xd8c4a0))
  boom.rotation.z = Math.PI / 2
  boom.position.set(0.34, 0.22, 0)
  const canvas = matte(0xf7f4ee, { side: THREE.DoubleSide, roughness: 0.85 })
  // Mainsail: luff up the mast, foot along the boom, leech bellied by wind.
  const mainShape = new THREE.Shape()
  mainShape.moveTo(0, 0)
  mainShape.lineTo(0, 0.98)
  mainShape.quadraticCurveTo(0.3, 0.6, 0.62, 0.02)
  mainShape.lineTo(0, 0)
  const sail = new THREE.Mesh(new THREE.ShapeGeometry(mainShape, 6), canvas)
  sail.position.set(0.035, 0.23, 0.012)
  // Jib: forestay from bow to masthead, clew back toward the mast.
  const jibShape = new THREE.Shape()
  jibShape.moveTo(0, 0)
  jibShape.lineTo(0.58, 0.9)
  jibShape.quadraticCurveTo(0.42, 0.42, 0.5, 0.04)
  jibShape.lineTo(0, 0)
  const jib = new THREE.Mesh(new THREE.ShapeGeometry(jibShape, 6), canvas)
  jib.position.set(-0.6, 0.14, -0.012)
  const stay = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 1.08, 4), matte(0xd8c4a0))
  stay.position.set(-0.29, 0.6, 0)
  stay.rotation.z = 0.56
  const flagShape = new THREE.Shape()
  flagShape.moveTo(0, 0)
  flagShape.lineTo(0.14, 0.03)
  flagShape.lineTo(0, 0.07)
  const flag = new THREE.Mesh(new THREE.ShapeGeometry(flagShape), matte(0xc4333d, { side: THREE.DoubleSide }))
  flag.position.set(0.03, 1.2, 0)
  const rudder = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.18, 0.02), matte(0x6a4a28))
  rudder.position.set(-0.62, -0.04, 0)
  const tiller = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.22, 5), matte(0x6a4a28))
  tiller.rotation.z = Math.PI / 2
  tiller.position.set(-0.48, 0.14, 0)
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.78, 18),
    new THREE.MeshBasicMaterial({ color: 0x062a34, transparent: true, opacity: 0.4, depthWrite: false })
  )
  shadow.rotation.x = -Math.PI / 2
  shadow.scale.set(1, 0.32, 1)
  shadow.position.y = -0.02
  group.add(hull, stripe, keel, deck, cabin, hatch, mast, boom, sail, jib, stay, flag, rudder, tiller, shadow)
  group.userData = { sail, flag }
  return group
}

export const makeUmbrella = () => {
  const group = new THREE.Group()
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.85, 6), metal(0xe8e4dc))
  pole.position.y = 0.42
  const canopy = new THREE.Mesh(new THREE.ConeGeometry(0.44, 0.18, 10, 1, true), matte(0xc4333d, { side: THREE.DoubleSide }))
  canopy.position.y = 0.78
  const stripe = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.12, 10, 1, true), matte(0xf2f0ea, { side: THREE.DoubleSide }))
  stripe.position.y = 0.82
  const trim = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.012, 6, 16), matte(0xf2f0ea))
  trim.rotation.x = Math.PI / 2
  trim.position.y = 0.7
  const chair = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.035, 0.72), matte(0xc4a06a))
  chair.position.set(0.32, 0.05, 0)
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.22, 0.035), matte(0xc4a06a))
  back.position.set(0.32, 0.14, -0.34)
  back.rotation.x = -0.35
  const towel = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.008, 0.4), matte(0x3a6aa8))
  towel.position.set(0.32, 0.075, 0.04)
  group.add(pole, canopy, stripe, trim, chair, back, towel)
  return group
}

export const makeCrab = () => {
  const group = new THREE.Group()
  const shell = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), matte(0xc45a28))
  shell.scale.set(1.35, 0.55, 1.05)
  const claw = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), matte(0xc45a28))
  const claw2 = claw.clone()
  claw.position.set(0.1, 0.01, 0.08)
  claw.scale.set(1.4, 0.6, 0.8)
  claw2.position.set(0.1, 0.01, -0.08)
  claw2.scale.copy(claw.scale)
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 6), matte(0x14110e))
  const eye2 = eye.clone()
  eye.position.set(0.06, 0.05, 0.03)
  eye2.position.set(0.06, 0.05, -0.03)
  group.add(shell, claw, claw2, eye, eye2)
  return group
}

const finShape = (points: Array<[number, number]>) => {
  const shape = new THREE.Shape()
  shape.moveTo(points[0]![0], points[0]![1])
  points.slice(1).forEach(([x, y]) => shape.lineTo(x, y))
  shape.lineTo(points[0]![0], points[0]![1])
  return new THREE.ShapeGeometry(shape)
}

// Body is a revolved profile flattened side-to-side: pointed snout, deep mid-body, narrow caudal peduncle.
export const makeFish = (color: number, variant = 0): Tickable => {
  const group = new THREE.Group()
  const skin = matte(color, { roughness: 0.34, metalness: 0.14 })
  const fin = new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.04, side: THREE.DoubleSide, transparent: true, opacity: 0.86, fog: false })
  const len = 0.62
  const deep = variant === 1 ? 0.13 : variant === 2 ? 0.085 : 0.105
  const profile: THREE.Vector2[] = []
  const steps = 16
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const r = deep * Math.pow(Math.sin(Math.PI * Math.min(0.999, t)), 0.55) * (1 - 0.48 * t) + 0.005
    profile.push(new THREE.Vector2(r, (0.5 - t) * len))
  }
  const body = new THREE.Mesh(new THREE.LatheGeometry(profile, 18), skin)
  body.rotation.z = -Math.PI / 2
  body.scale.set(1, 1, variant === 1 ? 0.42 : 0.52)
  const belly = new THREE.Mesh(new THREE.LatheGeometry(profile.map((p) => new THREE.Vector2(p.x * 0.92, p.y)), 18), matte(0xe8f0f2, { roughness: 0.4 }))
  belly.rotation.z = -Math.PI / 2
  belly.scale.set(0.98, 0.9, body.scale.z * 0.9)
  belly.position.y = -0.028
  const tail = new THREE.Group()
  const caudal = new THREE.Mesh(finShape([[0, 0], [-0.17, 0.14], [-0.12, 0.02], [-0.12, -0.02], [-0.17, -0.14]]), fin)
  tail.add(caudal)
  tail.position.x = -len / 2 + 0.01
  const dorsal = new THREE.Mesh(finShape([[0.1, 0], [-0.03, 0.12], [-0.13, 0.07], [-0.14, 0]]), fin)
  dorsal.position.set(0.02, deep * 0.72, 0)
  const anal = new THREE.Mesh(finShape([[0, 0], [-0.07, -0.07], [-0.1, 0]]), fin)
  anal.position.set(-0.1, -deep * 0.62, 0)
  const pecGeo = finShape([[0, 0], [-0.1, 0.03], [-0.09, -0.05]])
  const pec = new THREE.Mesh(pecGeo, fin)
  pec.position.set(0.1, -0.015, deep * 0.5)
  pec.rotation.set(0.5, 0.45, 0)
  const pec2 = new THREE.Mesh(pecGeo, fin)
  pec2.position.set(0.1, -0.015, -deep * 0.5)
  pec2.rotation.set(-0.5, -0.45, 0)
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.014, 7, 7), matte(0x0c1014))
  eye.position.set(0.21, 0.02, deep * 0.46)
  const eye2 = eye.clone()
  eye2.position.z = -deep * 0.46
  group.add(body, belly, tail, dorsal, anal, pec, pec2, eye, eye2)
  group.userData = { tail, body }
  return {
    group,
    update: (time) => {
      const beat = Math.sin(time * 5.5 + variant * 1.7)
      tail.rotation.y = beat * 0.42
      body.rotation.y = beat * 0.06
      pec.rotation.x = 0.5 + Math.sin(time * 2.2) * 0.2
      pec2.rotation.x = -0.5 - Math.sin(time * 2.2) * 0.2
    }
  }
}

// Revolved shark profile: blunt-pointed snout, deep chest, long taper to a narrow peduncle and a heterocercal tail.
export const makeShark = (): Tickable => {
  const group = new THREE.Group()
  const skin = matte(0x56656f, { roughness: 0.42, metalness: 0.1 })
  const fin = matte(0x4a5862, { roughness: 0.5, side: THREE.DoubleSide })
  const len = 2.1
  const deep = 0.27
  const profile: THREE.Vector2[] = []
  const steps = 20
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const bulge = Math.pow(Math.sin(Math.PI * Math.min(0.999, Math.pow(t, 0.8))), 0.6)
    const r = deep * bulge * (1 - 0.55 * t) + 0.012
    profile.push(new THREE.Vector2(r, (0.5 - t) * len))
  }
  const body = new THREE.Mesh(new THREE.LatheGeometry([...profile].reverse(), 32), skin)
  body.rotation.z = -Math.PI / 2
  body.scale.set(1, 1, 0.82)
  const belly = new THREE.Mesh(new THREE.LatheGeometry([...profile].reverse().map((p) => new THREE.Vector2(p.x * 0.9, p.y)), 32), matte(0xd9e2e6, { roughness: 0.45 }))
  belly.rotation.z = -Math.PI / 2
  belly.scale.set(0.97, 0.86, 0.76)
  belly.position.y = -0.07
  const dorsal = new THREE.Mesh(finShape([[0.16, 0], [-0.02, 0.46], [-0.14, 0.4], [-0.3, 0]]), fin)
  dorsal.position.set(0.12, deep * 0.78, 0)
  const dorsal2 = new THREE.Mesh(finShape([[0.06, 0], [-0.03, 0.14], [-0.12, 0]]), fin)
  dorsal2.position.set(-0.62, deep * 0.36, 0)
  const pelvic = new THREE.Mesh(finShape([[0.06, 0], [-0.04, -0.1], [-0.12, 0]]), fin)
  pelvic.position.set(-0.5, -deep * 0.34, 0)
  const pecGeo = finShape([[0.08, 0], [-0.28, -0.1], [-0.42, -0.02], [-0.14, 0.04]])
  const pec = new THREE.Mesh(pecGeo, fin)
  pec.position.set(0.32, -0.1, deep * 0.7)
  pec.rotation.set(0.75, 0.5, -0.15)
  const pec2 = new THREE.Mesh(pecGeo, fin)
  pec2.position.set(0.32, -0.1, -deep * 0.7)
  pec2.rotation.set(-0.75, -0.5, -0.15)
  const tail = new THREE.Group()
  const caudal = new THREE.Mesh(finShape([[0.02, 0], [-0.36, 0.5], [-0.26, 0.12], [-0.22, 0.02], [-0.26, -0.22], [0, -0.03]]), fin)
  tail.add(caudal)
  tail.position.x = -len / 2 + 0.03
  const gills: THREE.Mesh[] = []
  for (let i = 0; i < 4; i++) {
    const slit = new THREE.Mesh(new THREE.PlaneGeometry(0.012, 0.13), matte(0x2a343c, { side: THREE.DoubleSide }))
    slit.position.set(0.58 - i * 0.06, 0.02, deep * 0.8)
    slit.rotation.set(0, 0.4, -0.18)
    gills.push(slit)
    const slit2 = slit.clone()
    slit2.position.z = -deep * 0.8
    slit2.rotation.set(0, -0.4, -0.18)
    gills.push(slit2)
  }
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.026, 7, 7), matte(0x0c1014))
  eye.position.set(0.8, 0.05, deep * 0.62)
  const eye2 = eye.clone()
  eye2.position.z = -deep * 0.62
  group.add(body, belly, dorsal, dorsal2, pelvic, pec, pec2, tail, ...gills, eye, eye2)
  group.scale.setScalar(1.12)
  group.updateMatrixWorld(true)
  const swimmers: Array<{ mesh: THREE.Mesh; rest: Float32Array }> = []
  // Bake the rest pose into one coordinate system, so fins follow the same wave as the body.
  const inverse = group.matrixWorld.clone().invert()
  const restGeometries = new Set<THREE.BufferGeometry>()
  const meshes: THREE.Mesh[] = []
  group.traverse(object => { if (object instanceof THREE.Mesh) meshes.push(object) })
  meshes.forEach(mesh => {
    restGeometries.add(mesh.geometry)
    const geometry = mesh.geometry.clone()
    geometry.applyMatrix4(inverse.clone().multiply(mesh.matrixWorld))
    mesh.geometry = geometry
    group.attach(mesh)
    mesh.position.set(0, 0, 0)
    mesh.rotation.set(0, 0, 0)
    mesh.scale.set(1, 1, 1)
    swimmers.push({ mesh, rest: new Float32Array(geometry.attributes.position!.array) })
  })
  restGeometries.forEach(geometry => geometry.dispose())
  return {
    group,
    update: (time) => {
      swimmers.forEach(({mesh, rest}) => {
        const position = mesh.geometry.attributes.position as THREE.BufferAttribute
        for (let i = 0; i < position.count; i++) {
          const x = rest[i * 3]
          const weight = Math.max(0, Math.min(1, (0.65 - x!) / 1.9))
          position.setZ(i, rest[i * 3 + 2]! + Math.sin(time * 1.8 + x! * 2.3) * weight * weight * 0.19)
        }
        position.needsUpdate = true
        mesh.geometry.computeVertexNormals()
      })
    }
  }
}

// Pearl translucency, radial bell structure and fine trailing tentacles.
export const makeJelly = (color: number): Tickable => {
  const group = new THREE.Group()
  const uniforms = { uTime: { value: 0 }, uColor: { value: new THREE.Color(color) } }
  const shellMaterial = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    vertexShader: `
      uniform float uTime;
      varying vec3 vNormalW;
      varying vec3 vWorld;
      varying vec3 vLocal;
      void main() {
        vLocal = position;
        vNormalW = normalize(mat3(modelMatrix) * normal);
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      varying vec3 vNormalW;
      varying vec3 vWorld;
      varying vec3 vLocal;
      void main() {
        float facing = abs(dot(normalize(vNormalW), normalize(cameraPosition - vWorld)));
        float edge = pow(1.0 - facing, 2.4);
        float ribs = pow(0.5 + 0.5 * cos(atan(vLocal.z, vLocal.x) * 16.0), 18.0);
        float lip = exp(-abs(vLocal.y + 0.025) * 90.0);
        float alpha = 0.075 + edge * 0.36 + ribs * 0.045 + lip * 0.12;
        gl_FragColor = vec4(uColor * (0.65 + edge * 0.7 + lip * 0.2), alpha);
      }
    `
  })
  const profile = new THREE.SplineCurve([
    new THREE.Vector2(0.23, -0.06), new THREE.Vector2(0.31, -0.025),
    new THREE.Vector2(0.28, 0.08), new THREE.Vector2(0.19, 0.22),
    new THREE.Vector2(0.08, 0.285), new THREE.Vector2(0, 0.3)
  ]).getPoints(40)
  const bell = new THREE.Mesh(new THREE.LatheGeometry(profile, 64), shellMaterial)
  group.add(bell)
  const tissue = new THREE.MeshBasicMaterial({ color: 0xcdbba3, transparent: true, opacity: 0.22, depthWrite: false })
  for (let i = 0; i < 4; i++) {
    const organ = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.01, 6, 20), tissue)
    organ.rotation.x = Math.PI / 2
    organ.position.set(Math.cos(i * Math.PI / 2) * 0.065, 0.1, Math.sin(i * Math.PI / 2) * 0.065)
    group.add(organ)
  }
  const strandMaterial = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    vertexShader: `
      uniform float uTime;
      varying float vDepth;
      void main() {
        vec3 p = position;
        float depth = max(0.0, -p.y);
        p.x += sin(depth * 5.0 - uTime * 1.1 + p.z * 14.0) * depth * 0.055;
        p.z += sin(depth * 4.0 - uTime * 0.8 + p.x * 9.0) * depth * 0.045;
        vDepth = depth;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      varying float vDepth;
      void main() { gl_FragColor = vec4(uColor * 0.9, 0.36 * (1.0 - smoothstep(0.6, 1.5, vDepth))); }
    `
  })
  for (let i = 0; i < 18; i++) {
    const angle = i / 18 * Math.PI * 2
    const length = 0.8 + (Math.sin(i * 12.7) * 0.5 + 0.5) * 0.6
    const points = Array.from({length: 12}, (_, j) => {
      const t = j / 11
      return new THREE.Vector3(Math.cos(angle) * (0.24 + t * 0.07) + Math.sin(t * 6 + i) * t * 0.045, -0.045 - t * length, Math.sin(angle) * (0.24 + t * 0.07))
    })
    group.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 30, i % 4 ? 0.005 : 0.008, 4, false), strandMaterial))
  }
  return {
    group,
    update: (time) => {
      uniforms.uTime.value = time
      const pulse = Math.sin(time * 1.35)
      bell.scale.set(1 - pulse * 0.045, 1 + pulse * 0.07, 1 - pulse * 0.045)
    }
  }
}
