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

export const makeCloud = (random: () => number) => {
  const group = new THREE.Group()
  const lit = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.92, depthWrite: false })
  const shade = new THREE.MeshLambertMaterial({ color: 0xc5d0dc, transparent: true, opacity: 0.9, depthWrite: false })
  const count = 4 + Math.floor(random() * 3)
  for (let i = 0; i < count; i++) {
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.38 + random() * 0.28, 12, 8), i % 2 ? shade : lit)
    ball.position.set((random() - 0.5) * 1.6, (random() - 0.4) * 0.32, (random() - 0.5) * 0.55)
    ball.scale.set(1.35 + random() * 0.45, 0.48 + random() * 0.18, 0.95)
    group.add(ball)
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

export const makeBalloon = (envelope: number): Tickable => {
  const group = new THREE.Group()
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.48, 24, 18), matte(envelope, { roughness: 0.45 }))
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.03, 8, 20), matte(0xf2e6c4))
  band.rotation.x = Math.PI / 2
  band.position.y = -0.08
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 0.18, 10), matte(envelope))
  neck.position.y = -0.48
  const basket = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.18), matte(0x6a4a2e))
  basket.position.y = -0.72
  const ropeL = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.22, 5), matte(0x4a3828))
  const ropeR = ropeL.clone()
  ropeL.position.set(-0.06, -0.58, 0)
  ropeR.position.set(0.06, -0.58, 0)
  group.add(bulb, band, neck, basket, ropeL, ropeR)
  return {
    group,
    update: (time) => {
      group.rotation.z = Math.sin(time * 0.4) * 0.05
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
  const ski = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.018, 0.055), metal(0x1c2430))
  const ski2 = ski.clone()
  ski.position.set(0.08, -0.25, 0.07)
  ski2.position.set(0.08, -0.25, -0.07)
  const tip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.018, 0.05), metal(0x1c2430))
  tip.rotation.z = 0.7
  tip.position.set(0.5, -0.2, 0.07)
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
  group.add(jacket, scarf, head, helmet, goggles, nose, pack, hip, thigh, thigh2, boot, boot2, ski, ski2, tip, tip2, pole, pole2, basket, basket2)
  group.rotation.y = Math.PI / 2
  return {
    group,
    update: (time) => {
      group.rotation.z = -0.28 + Math.sin(time * 3.2) * 0.05
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

export const makeSnake = (): Tickable => {
  const group = new THREE.Group()
  const parts: THREE.Mesh[] = []
  for (let i = 0; i < 12; i++) {
    const r = i === 0 ? 0.045 : 0.028 - i * 0.0012
    const seg = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), matte(i % 2 ? 0x6a4a28 : 0x8a6230))
    group.add(seg)
    parts.push(seg)
  }
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.008, 6, 6), emit(0xc4e36a, 0.8))
  const eye2 = eye.clone()
  group.add(eye, eye2)
  group.userData = { parts, eye, eye2 }
  return {
    group,
    update: (time) => {
      parts.forEach((seg, i) => {
        const t = time * 1.4 - i * 0.28
        seg.position.set(i * 0.07, Math.sin(t) * 0.025, Math.cos(t * 0.7) * 0.02)
      })
      const head = parts[0].position
      eye.position.set(head.x + 0.03, head.y + 0.015, head.z + 0.018)
      eye2.position.set(head.x + 0.03, head.y + 0.015, head.z - 0.018)
    }
  }
}

export const makeTumbleweed = (): Tickable => {
  const group = new THREE.Group()
  const twig = matte(0x7a5a38, { roughness: 1 })
  for (let i = 0; i < 14; i++) {
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.008, 0.55 + (i % 4) * 0.08, 5), twig)
    stick.rotation.set((i * 0.7) % Math.PI, i * 0.9, i * 0.45)
    group.add(stick)
  }
  const knot = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12, 0), twig)
  group.add(knot)
  return {
    group,
    update: (time) => {
      group.rotation.z = time * 1.8
      group.rotation.x = time * 0.7
    }
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
  group.add(pad)
  if (random() > 0.55) {
    const bloom = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), matte(0xf2d6e4))
    bloom.position.y = 0.03
    group.add(bloom)
  }
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
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.022, 1.12, 6), matte(0xd8c4a0))
  mast.position.set(0.02, 0.66, 0)
  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.62, 5), matte(0xd8c4a0))
  boom.rotation.z = Math.PI / 2
  boom.position.set(0.26, 0.2, 0)
  const sail = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.82), matte(0xf7f4ee, { side: THREE.DoubleSide }))
  sail.position.set(0.26, 0.58, 0.012)
  const jib = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.48), matte(0xf7f4ee, { side: THREE.DoubleSide }))
  jib.position.set(-0.24, 0.5, 0.012)
  const stay = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 1.05, 4), matte(0xd8c4a0))
  stay.position.set(-0.22, 0.62, 0)
  stay.rotation.z = 0.42
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.08), matte(0xc4333d, { side: THREE.DoubleSide }))
  flag.position.set(0.09, 1.18, 0)
  const rudder = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.18, 0.02), matte(0x6a4a28))
  rudder.position.set(-0.62, -0.04, 0)
  const tiller = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.22, 5), matte(0x6a4a28))
  tiller.rotation.z = Math.PI / 2
  tiller.position.set(-0.48, 0.14, 0)
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.01, 6, 10), matte(0xc4333d))
  ring.position.set(0.28, 0.16, 0.12)
  group.add(hull, stripe, keel, deck, cabin, hatch, mast, boom, sail, jib, stay, flag, rudder, tiller, ring)
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

export const makeBottle = () => {
  const group = new THREE.Group()
  const glass = new THREE.MeshStandardMaterial({ color: 0x7ec8b8, transparent: true, opacity: 0.5, roughness: 0.12, metalness: 0.08, fog: false })
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.14, 8), glass)
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.022, 0.06, 8), glass)
  neck.position.y = 0.09
  const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.02, 8), matte(0x8a5a32))
  cork.position.y = 0.13
  group.add(body, neck, cork)
  group.rotation.z = 1.15
  return group
}

export const makeFish = (color: number): Tickable => {
  const group = new THREE.Group()
  const skin = matte(color, { roughness: 0.45 })
  const fin = matte(color, { roughness: 0.5, side: THREE.DoubleSide })
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), skin)
  body.scale.set(1.8, 0.78, 0.55)
  const stripe = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), matte(0xf2f6f8, { roughness: 0.4 }))
  stripe.scale.set(1.15, 0.32, 0.2)
  stripe.position.set(0.02, 0.02, 0.09)
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.018, 6, 12), matte(0xf2b24a))
  band.rotation.y = Math.PI / 2
  band.position.x = 0.04
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.18, 7), skin)
  nose.rotation.z = -Math.PI / 2
  nose.position.x = 0.34
  const tail = new THREE.Group()
  const fluke = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.16, 5), skin)
  const fluke2 = fluke.clone()
  fluke.position.set(-0.08, 0.07, 0)
  fluke.rotation.z = 2.2
  fluke2.position.set(-0.08, -0.07, 0)
  fluke2.rotation.z = -2.2
  tail.position.x = -0.3
  tail.add(fluke, fluke2)
  const dorsal = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 5), skin)
  dorsal.position.set(0.02, 0.16, 0)
  const anal = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.1, 5), skin)
  anal.position.set(-0.06, -0.12, 0)
  anal.rotation.z = Math.PI
  const pec = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.07), fin)
  pec.position.set(0.06, -0.02, 0.11)
  pec.rotation.x = 0.7
  const pec2 = pec.clone()
  pec2.position.z = -0.11
  pec2.rotation.x = -0.7
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.024, 6, 6), matte(0xf2f6f8))
  eye.position.set(0.2, 0.045, 0.085)
  const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.01, 6, 6), matte(0x14181c))
  pupil.position.set(0.218, 0.045, 0.095)
  group.add(body, stripe, band, nose, tail, dorsal, anal, pec, pec2, eye, pupil)
  group.userData = { tail }
  return {
    group,
    update: (time) => {
      tail.rotation.y = Math.sin(time * 8) * 0.38
    }
  }
}

export const makeShark = (): Tickable => {
  const group = new THREE.Group()
  const skin = matte(0x5a6a76, { roughness: 0.55 })
  const belly = matte(0xd5dee2, { roughness: 0.5 })
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.36, 14, 10), skin)
  body.scale.set(2.55, 0.72, 0.78)
  const underside = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), belly)
  underside.scale.set(2.3, 0.36, 0.52)
  underside.position.y = -0.1
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.48, 8), skin)
  nose.rotation.z = -Math.PI / 2
  nose.position.x = 0.92
  const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, 0.12), matte(0xf2f0ea))
  jaw.position.set(0.78, -0.08, 0)
  const gill = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.1, 0.08), matte(0x2a343c))
  const gill2 = gill.clone()
  const gill3 = gill.clone()
  gill.position.set(0.42, 0.02, 0.16)
  gill2.position.set(0.36, 0.02, 0.16)
  gill3.position.set(0.3, 0.02, 0.16)
  const tail = new THREE.Group()
  const upper = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.42, 5), skin)
  upper.position.set(-0.12, 0.16, 0)
  upper.rotation.z = 2.05
  const lower = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.24, 5), skin)
  lower.position.set(-0.1, -0.1, 0)
  lower.rotation.z = -2.15
  tail.position.x = -0.92
  tail.add(upper, lower)
  const dorsal = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.38, 5), skin)
  dorsal.position.set(0.08, 0.34, 0)
  const rearFin = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 5), skin)
  rearFin.position.set(-0.45, 0.2, 0)
  const pec = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.03, 0.14), skin)
  pec.position.set(0.12, -0.08, 0.26)
  pec.rotation.z = -0.28
  const pec2 = pec.clone()
  pec2.position.z = -0.26
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.036, 6, 6), matte(0xf2f6f8))
  eye.position.set(0.62, 0.07, 0.18)
  const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.016, 6, 6), matte(0x14181c))
  pupil.position.set(0.64, 0.07, 0.2)
  group.add(body, underside, nose, jaw, gill, gill2, gill3, tail, dorsal, rearFin, pec, pec2, eye, pupil)
  group.scale.setScalar(1.55)
  group.userData = { tail }
  return {
    group,
    update: (time) => {
      tail.rotation.y = Math.sin(time * 3.2) * 0.22
    }
  }
}

export const makeJelly = (color: number): Tickable => {
  const group = new THREE.Group()
  const bell = new THREE.Mesh(
    new THREE.SphereGeometry(0.26, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide })
  )
  group.add(bell)
  const tentacles: THREE.Mesh[] = []
  for (let i = 0; i < 6; i++) {
    const strand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.01, 0.005, 0.72, 5),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.32, depthWrite: false })
    )
    const a = (i / 6) * Math.PI * 2
    strand.position.set(Math.cos(a) * 0.1, -0.36, Math.sin(a) * 0.1)
    group.add(strand)
    tentacles.push(strand)
  }
  group.userData = { tentacles, bell }
  return {
    group,
    update: (time) => {
      const pulse = 0.94 + Math.sin(time * 1.1) * 0.08
      bell.scale.set(pulse, 0.9 + Math.sin(time * 1.1) * 0.1, pulse)
      tentacles.forEach((strand, i) => {
        strand.rotation.z = Math.sin(time * 1.6 + i) * 0.18
      })
    }
  }
}

