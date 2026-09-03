import * as THREE from 'three'

export const metal = (color: number, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, metalness: 0.78, roughness: 0.28, fog: false, ...extra })

export const matte = (color: number, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, metalness: 0.04, roughness: 0.92, fog: false, ...extra })

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
  const wingGeo = new THREE.ConeGeometry(0.042, 0.2, 6)
  const left = new THREE.Mesh(wingGeo, skin)
  left.rotation.x = -Math.PI / 2
  left.position.set(0, 0, 0.08)
  const right = new THREE.Mesh(wingGeo, skin)
  right.rotation.x = Math.PI / 2
  right.position.set(0, 0, -0.08)
  leftPivot.add(left)
  rightPivot.add(right)
  group.add(body, head, beak, tail, leftPivot, rightPivot)
  group.scale.setScalar(3.1)
  group.userData = { leftPivot, rightPivot, phase: Math.random() * Math.PI * 2 }
  return {
    group,
    update: (time) => {
      const flap = Math.sin(time * 11 + group.userData.phase) * 0.62
      leftPivot.rotation.x = flap
      rightPivot.rotation.x = -flap
    }
  }
}

// Three cloud families so the sky does not repeat one blob: flat stratus, towering cumulus, and thin wisps.
export const makeCloud = (random: () => number) => {
  const group = new THREE.Group()
  const lit = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.92, depthWrite: false })
  const shade = new THREE.MeshLambertMaterial({ color: 0xc5d0dc, transparent: true, opacity: 0.9, depthWrite: false })
  const kind = random()
  const puff = (x: number, y: number, z: number, r: number, sx: number, sy: number, dark = false) => {
    const ball = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), dark ? shade : lit)
    ball.position.set(x, y, z)
    ball.scale.set(sx, sy, 0.95)
    group.add(ball)
  }
  if (kind < 0.4) {
    // Stratus: a long low bank with a flat, shaded underside.
    const count = 5 + Math.floor(random() * 4)
    const width = 2 + random() * 1.6
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1)
      puff((t - 0.5) * width, (random() - 0.5) * 0.14, (random() - 0.5) * 0.4, 0.3 + random() * 0.18, 1.7 + random() * 0.6, 0.38 + random() * 0.12, random() > 0.6)
    }
    puff(0, -0.12, 0, 0.3, width * 0.9, 0.22, true)
  } else if (kind < 0.8) {
    // Cumulus: a wide base with a taller, brighter tower off center.
    const base = 3 + Math.floor(random() * 3)
    for (let i = 0; i < base; i++) {
      puff((random() - 0.5) * 1.5, (random() - 0.6) * 0.18, (random() - 0.5) * 0.5, 0.36 + random() * 0.2, 1.25 + random() * 0.35, 0.5 + random() * 0.15, i % 2 === 1)
    }
    const towerX = (random() - 0.5) * 0.8
    puff(towerX, 0.26, 0, 0.42 + random() * 0.14, 0.95, 0.9 + random() * 0.3)
    puff(towerX + 0.36, 0.14, 0.1, 0.3, 0.9, 0.75)
    puff(towerX - 0.3, 0.1, -0.08, 0.26, 0.85, 0.7)
  } else {
    // Wisps: two or three thin streaks, mostly translucent.
    const count = 2 + Math.floor(random() * 2)
    for (let i = 0; i < count; i++) {
      const streak = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 6), new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.45 + random() * 0.2, depthWrite: false }))
      streak.position.set((random() - 0.5) * 1.2, i * 0.14 - 0.1, (random() - 0.5) * 0.3)
      streak.scale.set(3.4 + random() * 1.6, 0.18 + random() * 0.08, 0.6)
      streak.rotation.z = (random() - 0.5) * 0.1
      group.add(streak)
    }
  }
  return group
}

export const makeCabin = () => {
  const group = new THREE.Group()
  const wall = matte(0x5a3820)
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.56, 0.72), wall)
  body.position.y = 0.28
  const sill = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.06, 0.8), matte(0x3a2416))
  sill.position.y = 0.03
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.78, 0.42, 4), matte(0x3a2214))
  roof.position.y = 0.76
  roof.rotation.y = Math.PI / 4
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
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.46, 0.16), matte(0x4a4038))
  chimney.position.set(-0.28, 0.92, -0.1)
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 0.22), matte(0x2a241c))
  cap.position.set(-0.28, 1.16, -0.1)
  const ember = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.04, 8), emit(0xff5520, 2.1))
  ember.position.set(-0.28, 1.12, -0.1)
  group.add(body, sill, roof, eaves, door, knob, frame, window, porch, chimney, cap, ember)
  group.userData = { window, chimney, ember }
  return group
}

// Classic envelope: wide shoulder, tapered crown, cinched mouth, burner, and a slatted basket on four lines.
export const makeBalloon = (envelope: number): Tickable => {
  const group = new THREE.Group()
  const cloth = matte(envelope, { roughness: 0.46 })
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
  const bulb = new THREE.Mesh(new THREE.LatheGeometry(profile, 22), cloth)
  const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.016, 6, 24), cream)
  stripe.rotation.x = Math.PI / 2
  stripe.position.y = 0.06
  const stripe2 = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.014, 6, 22), cream)
  stripe2.rotation.x = Math.PI / 2
  stripe2.position.y = -0.2
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.08, 0.045, 10), cream)
  crown.position.y = 0.58
  const valve = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.04, 6), metal(0x8a9098))
  valve.position.y = 0.61
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.014, 6, 16), cream)
  mouth.rotation.x = Math.PI / 2
  mouth.position.y = -0.53
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
  group.add(bulb, stripe, stripe2, crown, valve, mouth, burner, flame, basket)
  return {
    group,
    update: (time) => {
      group.rotation.z = Math.sin(time * 0.4) * 0.05
      flame.scale.setScalar(0.82 + Math.sin(time * 8.5) * 0.2)
    }
  }
}

export const makeSkier = (): Tickable => {
  const group = new THREE.Group()
  const jacket = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.2, 5, 8), matte(0xc4333d))
  jacket.position.y = 0.12
  const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.014, 6, 10), matte(0xf2f0ea))
  scarf.position.y = 0.24
  scarf.rotation.x = Math.PI / 2
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), matte(0xe8c4a8))
  head.position.y = 0.32
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.062, 10, 8, 0, Math.PI * 2, 0, Math.PI / 1.65), matte(0x1a222b))
  helmet.position.y = 0.34
  const goggles = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.022, 0.032), metal(0x7ec8e8, { roughness: 0.15 }))
  goggles.position.set(0.04, 0.32, 0)
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 6), matte(0xd4a888))
  nose.position.set(0.055, 0.31, 0)
  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.12), matte(0x2a333d))
  pack.position.set(-0.06, 0.14, 0)
  const hip = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), matte(0x1a222b))
  hip.position.y = -0.04
  const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.028, 0.11, 4, 6), matte(0x1a222b))
  const thigh2 = thigh.clone()
  thigh.position.set(0.04, -0.12, 0.05)
  thigh.rotation.z = 0.4
  thigh2.position.set(0.04, -0.12, -0.05)
  thigh2.rotation.z = 0.4
  const boot = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.04, 0.045), matte(0x14181c))
  const boot2 = boot.clone()
  boot.position.set(0.1, -0.22, 0.06)
  boot2.position.set(0.1, -0.22, -0.06)
  const skiMat = matte(0xe0b040, { roughness: 0.5 })
  const ski = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.024, 0.06), skiMat)
  const ski2 = ski.clone()
  ski.position.set(0.08, -0.25, 0.07)
  ski2.position.set(0.08, -0.25, -0.07)
  const tip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.024, 0.06), skiMat)
  tip.rotation.z = 0.55
  tip.position.set(0.55, -0.22, 0.07)
  const tip2 = tip.clone()
  tip2.position.z = -0.07
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.46, 5), metal(0xc5ced6))
  const pole2 = pole.clone()
  pole.position.set(0.14, 0.06, 0.13)
  pole.rotation.z = 0.5
  pole2.position.set(0.14, 0.06, -0.13)
  pole2.rotation.z = 0.5
  const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.02, 0.012, 8), metal(0xc5ced6))
  const basket2 = basket.clone()
  basket.position.set(0.28, -0.12, 0.16)
  basket2.position.set(0.28, -0.12, -0.16)
  const figure = new THREE.Group()
  figure.add(jacket, scarf, head, helmet, goggles, nose, pack, hip, thigh, thigh2, boot, boot2, ski, ski2, tip, tip2, pole, pole2, basket, basket2)
  // Origin sits at the ski base so the group can be placed directly on the snow surface.
  figure.position.y = 0.26
  group.add(figure)
  return {
    group,
    update: (time) => {
      figure.rotation.z = -0.22 + Math.sin(time * 3.2) * 0.04
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
  claws[0].position.set(0.2, -0.01, 0.36)
  claws[1].position.set(0.2, -0.01, 0.32)
  claws[2].position.set(0.2, -0.01, -0.36)
  claws[3].position.set(0.2, -0.01, -0.32)
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

export const makeBear = () => {
  const group = new THREE.Group()
  const fur = matte(0x4a2e1c)
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 12), fur)
  body.scale.set(1.45, 0.95, 0.95)
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), fur)
  head.position.set(0.26, 0.1, 0)
  const snout = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), matte(0x3a2418))
  snout.position.set(0.36, 0.06, 0)
  snout.scale.set(1.1, 0.7, 0.8)
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 6), matte(0x14110e))
  nose.position.set(0.42, 0.07, 0)
  const ear = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), fur)
  const ear2 = ear.clone()
  ear.position.set(0.22, 0.2, 0.08)
  ear2.position.set(0.22, 0.2, -0.08)
  const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.1, 4, 6), fur)
  const legs = [leg, leg.clone(), leg.clone(), leg.clone()]
  legs[0].position.set(0.12, -0.16, 0.08)
  legs[1].position.set(0.12, -0.16, -0.08)
  legs[2].position.set(-0.12, -0.16, 0.08)
  legs[3].position.set(-0.12, -0.16, -0.08)
  group.add(body, head, snout, nose, ear, ear2, ...legs)
  return group
}

export const makeFox = () => {
  const group = new THREE.Group()
  const coat = matte(0xc45a28)
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), coat)
  body.scale.set(1.7, 0.85, 0.75)
  const chest = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), matte(0xf2e6d4))
  chest.position.set(0.1, -0.01, 0)
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), coat)
  head.position.set(0.2, 0.08, 0)
  const ear = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.08, 5), coat)
  const ear2 = ear.clone()
  ear.position.set(0.18, 0.16, 0.04)
  ear2.position.set(0.18, 0.16, -0.04)
  const snout = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.08, 5), matte(0x3a2418))
  snout.rotation.z = -Math.PI / 2
  snout.position.set(0.28, 0.05, 0)
  const tail = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), coat)
  tail.scale.set(1.8, 0.45, 0.45)
  tail.position.set(-0.22, 0.04, 0)
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), matte(0xf2e6d4))
  tip.position.set(-0.36, 0.05, 0)
  const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.08, 3, 5), matte(0x3a2418))
  const legs = [leg, leg.clone(), leg.clone(), leg.clone()]
  legs[0].position.set(0.1, -0.1, 0.04)
  legs[1].position.set(0.1, -0.1, -0.04)
  legs[2].position.set(-0.08, -0.1, 0.04)
  legs[3].position.set(-0.08, -0.1, -0.04)
  group.add(body, chest, head, ear, ear2, snout, tail, tip, ...legs)
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
  group.add(core, halo, tail)
  group.userData = { core, halo, tail, phase: Math.random() * Math.PI * 2, speed: 0.35 + Math.random() * 0.45 }
  return {
    group,
    update: (time) => {
      const flash = Math.pow(Math.max(0, Math.sin(time * 7.5 + group.userData.phase)), 10)
      const glow = 0.12 + flash * 0.88
      ;(halo.material as THREE.MeshBasicMaterial).opacity = 0.08 + flash * 0.45
      ;(tail.material as THREE.MeshBasicMaterial).opacity = 0.06 + flash * 0.55
      ;(core.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.25 + flash * 1.8
      group.scale.setScalar(0.85 + glow * 0.25)
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

// Segments overlap so the body reads as one continuous, tapering form lying on the sand.
export const makeSnake = (): Tickable => {
  const group = new THREE.Group()
  const count = 28
  const spacing = 0.042
  const parts: THREE.Mesh[] = []
  const radii: number[] = []
  for (let i = 0; i < count; i++) {
    const taper = Math.pow(1 - i / count, 0.75)
    const r = i === 0 ? 0.05 : 0.012 + 0.036 * taper
    const band = Math.floor(i / 3) % 2
    const seg = new THREE.Mesh(new THREE.SphereGeometry(r, 9, 7), matte(band ? 0x5c4326 : 0x8a6a36, { roughness: 0.75 }))
    if (i === 0) seg.scale.set(1.35, 0.7, 1.15)
    group.add(seg)
    parts.push(seg)
    radii.push(r)
  }
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.007, 6, 6), matte(0x14110e))
  const eye2 = eye.clone()
  group.add(eye, eye2)
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(count * spacing * 1.05, 0.34),
    new THREE.MeshBasicMaterial({ color: 0x2a1a0c, transparent: true, opacity: 0.28, depthWrite: false })
  )
  shadow.rotation.x = -Math.PI / 2
  shadow.position.set(-count * spacing * 0.5, 0.004, 0)
  group.add(shadow)
  return {
    group,
    update: (time) => {
      const phase = time * 2.4
      parts.forEach((seg, i) => {
        const amp = 0.1 * Math.min(1, 0.3 + i / 6)
        seg.position.set(-i * spacing, radii[i] * (i === 0 ? 0.7 : 1), Math.sin(phase - i * 0.46) * amp)
      })
      const head = parts[0].position
      const next = parts[1].position
      parts[0].rotation.y = Math.atan2(head.z - next.z, spacing) * 0.8
      eye.position.set(head.x + 0.028, head.y + 0.012, head.z + 0.03)
      eye2.position.set(head.x + 0.028, head.y + 0.012, head.z - 0.03)
    }
  }
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

export const makeFrog = () => {
  const group = new THREE.Group()
  const skin = matte(0x3a7a38)
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), skin)
  body.scale.set(1.2, 0.75, 1)
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), skin)
  head.position.set(0.07, 0.03, 0)
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 8), matte(0xf2f0dc))
  const eye2 = eye.clone()
  eye.position.set(0.09, 0.07, 0.03)
  eye2.position.set(0.09, 0.07, -0.03)
  const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.008, 6, 6), matte(0x14110e))
  const pupil2 = pupil.clone()
  pupil.position.copy(eye.position).add(new THREE.Vector3(0.01, 0.004, 0))
  pupil2.position.copy(eye2.position).add(new THREE.Vector3(0.01, 0.004, 0))
  const leg = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6), skin)
  const leg2 = leg.clone()
  leg.position.set(-0.04, -0.03, 0.05)
  leg2.position.set(-0.04, -0.03, -0.05)
  group.add(body, head, eye, eye2, pupil, pupil2, leg, leg2)
  return group
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
  const wood = matte(0x8a5a32)
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.13, h, 8), wood)
  shaft.position.y = h / 2
  trunk.add(shaft)
  for (let i = 0; i < 6; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.075 + i * 0.006, 0.014, 5, 8), matte(0x7a4a28))
    ring.rotation.x = Math.PI / 2
    ring.position.y = 0.28 + i * 0.34
    trunk.add(ring)
  }
  const crown = new THREE.Group()
  crown.position.y = h
  const leaf = matte(0x1c5a2c)
  for (let k = 0; k < 9; k++) {
    const frond = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.04, 0.18), leaf)
    frond.geometry.translate(0.52, 0, 0)
    frond.rotation.order = 'YZX'
    frond.rotation.y = (k / 9) * Math.PI * 2
    frond.rotation.z = -0.62
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
  return group
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
  shape.moveTo(points[0][0], points[0][1])
  points.slice(1).forEach(([x, y]) => shape.lineTo(x, y))
  shape.lineTo(points[0][0], points[0][1])
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
  const body = new THREE.Mesh(new THREE.LatheGeometry(profile, 20), skin)
  body.rotation.z = -Math.PI / 2
  body.scale.set(1, 1, 0.82)
  const belly = new THREE.Mesh(new THREE.LatheGeometry(profile.map((p) => new THREE.Vector2(p.x * 0.9, p.y)), 20), matte(0xd9e2e6, { roughness: 0.45 }))
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
  group.scale.setScalar(1.45)
  group.userData = { tail, body }
  return {
    group,
    update: (time) => {
      const beat = Math.sin(time * 2.1)
      tail.rotation.y = beat * 0.3
      body.rotation.y = beat * 0.04
      belly.rotation.y = beat * 0.04
    }
  }
}

// Bell is a revolved cap with a rim and a glowing core; oral arms hang thick under the mouth, tentacles drape from the edge.
export const makeJelly = (color: number): Tickable => {
  const group = new THREE.Group()
  const glass = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide })
  const inner = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.42, depthWrite: false })
  const strandMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.34, depthWrite: false })
  const bell = new THREE.Group()
  const shell = new THREE.Mesh(new THREE.LatheGeometry([
    new THREE.Vector2(0.01, 0.22),
    new THREE.Vector2(0.14, 0.18),
    new THREE.Vector2(0.24, 0.08),
    new THREE.Vector2(0.27, -0.01),
    new THREE.Vector2(0.22, -0.05),
    new THREE.Vector2(0.16, -0.04)
  ], 20), glass)
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), emit(color, 0.55))
  core.scale.set(1, 0.7, 1)
  core.position.y = 0.06
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(0.22, 0.018, 6, 20),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.4, depthWrite: false })
  )
  rim.rotation.x = Math.PI / 2
  rim.position.y = -0.04
  bell.add(shell, core, rim)
  const arms: THREE.Group[] = []
  const armCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.03, -0.1, 0.01),
    new THREE.Vector3(-0.02, -0.2, 0.02),
    new THREE.Vector3(0.02, -0.28, 0)
  ])
  const armGeo = new THREE.TubeGeometry(armCurve, 8, 0.018, 5, false)
  for (let i = 0; i < 4; i++) {
    const arm = new THREE.Group()
    const mesh = new THREE.Mesh(armGeo, inner)
    const a = (i / 4) * Math.PI * 2
    arm.position.set(Math.cos(a) * 0.04, -0.02, Math.sin(a) * 0.04)
    arm.rotation.y = -a
    arm.add(mesh)
    group.add(arm)
    arms.push(arm)
  }
  const tentacles: THREE.Group[] = []
  const tentCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.04, -0.22, 0.02),
    new THREE.Vector3(-0.03, -0.48, 0.03),
    new THREE.Vector3(0.05, -0.78, 0)
  ])
  const tentGeo = new THREE.TubeGeometry(tentCurve, 10, 0.007, 4, false)
  for (let i = 0; i < 8; i++) {
    const tent = new THREE.Group()
    const mesh = new THREE.Mesh(tentGeo, strandMat)
    const a = (i / 8) * Math.PI * 2
    tent.position.set(Math.cos(a) * 0.2, -0.04, Math.sin(a) * 0.2)
    tent.rotation.y = -a
    tent.add(mesh)
    group.add(tent)
    tentacles.push(tent)
  }
  group.add(bell)
  return {
    group,
    update: (time) => {
      const pulse = 0.94 + Math.sin(time * 1.1) * 0.08
      bell.scale.set(pulse, 0.88 + Math.sin(time * 1.1) * 0.12, pulse)
      arms.forEach((arm, i) => {
        arm.rotation.z = Math.sin(time * 1.4 + i) * 0.22
      })
      tentacles.forEach((tent, i) => {
        tent.rotation.z = Math.sin(time * 1.5 + i * 0.7) * 0.28
        tent.rotation.x = Math.sin(time * 1.1 + i) * 0.12
      })
    }
  }
}

