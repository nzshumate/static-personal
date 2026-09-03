import * as THREE from 'three'

export const metal = (color: number, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, metalness: 0.78, roughness: 0.28, fog: false, ...extra })

export const matte = (color: number, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, metalness: 0.04, roughness: 0.92, fog: false, ...extra })

export const emit = (color: number, intensity = 0.55) =>
  new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.4, metalness: 0.08, fog: false })

const basic = (color: number, extra: THREE.MeshBasicMaterialParameters = {}) =>
  new THREE.MeshBasicMaterial({ color, ...extra })

export type Tickable = {
  group: THREE.Group
  update: (time: number, reduced: boolean) => void
}

export const makeBird = (color: number): Tickable => {
  const group = new THREE.Group()
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), matte(color))
  body.scale.set(1.6, 0.7, 0.7)
  const left = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.018, 0.08), matte(color))
  const right = left.clone()
  left.position.set(-0.12, 0.01, 0)
  right.position.set(0.12, 0.01, 0)
  group.add(body, left, right)
  group.scale.setScalar(1.8)
  group.userData = { left, right, phase: Math.random() * Math.PI * 2 }
  return {
    group,
    update: (time) => {
      const flap = Math.sin(time * 11 + group.userData.phase) * 0.7
      left.rotation.z = flap
      right.rotation.z = -flap
    }
  }
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
  const jacket = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.22, 5, 8), matte(0xc4333d))
  jacket.position.y = 0.08
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), matte(0xe8c4a8))
  head.position.y = 0.28
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8, 0, Math.PI * 2, 0, Math.PI / 1.7), matte(0x1a222b))
  helmet.position.y = 0.3
  const goggles = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 0.03), metal(0x7ec8e8, { roughness: 0.15 }))
  goggles.position.set(0.04, 0.28, 0)
  const hip = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), matte(0x1a222b))
  hip.position.y = -0.08
  const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.12, 4, 6), matte(0x1a222b))
  thigh.position.set(0.03, -0.16, 0)
  thigh.rotation.z = 0.35
  const boot = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.045), matte(0x14181c))
  boot.position.set(0.08, -0.26, 0.06)
  const boot2 = boot.clone()
  boot2.position.z = -0.06
  const ski = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.018, 0.05), metal(0x14181c))
  const ski2 = ski.clone()
  ski.position.set(0.06, -0.29, 0.07)
  ski2.position.set(0.06, -0.29, -0.07)
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.42, 5), metal(0xc5ced6))
  pole.position.set(0.12, 0.02, 0.12)
  pole.rotation.z = 0.45
  const pole2 = pole.clone()
  pole2.position.z = -0.12
  group.add(jacket, head, helmet, goggles, hip, thigh, boot, boot2, ski, ski2, pole, pole2)
  group.rotation.y = Math.PI / 2
  return {
    group,
    update: (time) => {
      group.rotation.z = -0.2 + Math.sin(time * 3) * 0.04
    }
  }
}

export const makeYeti = () => {
  const group = new THREE.Group()
  const fur = matte(0xb7c0c8, { roughness: 1 })
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), fur)
  body.scale.set(0.85, 1.25, 0.7)
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), matte(0xf6f3ea))
  belly.position.set(0.08, -0.04, 0)
  belly.scale.set(0.7, 1, 0.8)
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 12), fur)
  head.position.y = 0.42
  const brow = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 0.06), fur)
  brow.position.set(0.08, 0.46, 0)
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), matte(0x1a1814))
  const eye2 = eye.clone()
  eye.position.set(0.12, 0.43, 0.05)
  eye2.position.set(0.12, 0.43, -0.05)
  const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.22, 5, 8), fur)
  const arm2 = arm.clone()
  arm.position.set(0.02, 0.12, 0.24)
  arm.rotation.z = 0.4
  arm2.position.set(0.02, 0.12, -0.24)
  arm2.rotation.z = 0.4
  const foot = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), fur)
  const foot2 = foot.clone()
  foot.position.set(0.06, -0.32, 0.1)
  foot.scale.set(1.3, 0.55, 0.8)
  foot2.position.set(0.06, -0.32, -0.1)
  foot2.scale.copy(foot.scale)
  group.add(body, belly, head, brow, eye, eye2, arm, arm2, foot, foot2)
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
  const lean = 0.12 + random() * 0.16
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.09, 2.35, 8), matte(0x8a5a32))
  trunk.rotation.z = lean
  trunk.position.set(Math.sin(lean) * 0.6, 0, 0)
  group.add(trunk)
  const top = new THREE.Vector3(Math.sin(lean) * 1.15, 1.12, 0)
  for (let k = 0; k < 7; k++) {
    const frond = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.03, 0.16), matte(0x1c5a2c))
    const angle = (k / 7) * Math.PI * 2
    frond.position.copy(top)
    frond.rotation.z = -0.55
    frond.rotation.y = angle
    frond.translateX(0.32)
    group.add(frond)
  }
  const nut = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), matte(0x5a3a1c))
  nut.position.copy(top)
  nut.position.y -= 0.08
  group.add(nut)
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
  const lantern = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.28, 10), emit(0xfff1c4, 1.5))
  lantern.position.y = 2.22
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.16, 8), matte(0x2a3038))
  cap.position.y = 2.42
  const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.04, 12), matte(0xd5d0c6))
  rail.position.y = 2.02
  const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 0), matte(0x6a6560))
  rock.scale.set(1.4, 0.55, 1.1)
  rock.position.y = 0.08
  group.add(tower, stripe, stripe2, lantern, cap, rail, rock)
  return group
}

export const makeSailboat = () => {
  const group = new THREE.Group()
  const hull = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.9, 5, 10), matte(0xe8ebe8))
  hull.rotation.z = Math.PI / 2
  hull.scale.set(1, 0.7, 0.85)
  const keel = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 0.16), matte(0xc45a3a))
  keel.position.y = -0.06
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.018, 0.7, 6), matte(0xd8c4a0))
  mast.position.y = 0.38
  const sail = new THREE.Mesh(new THREE.PlaneGeometry(0.38, 0.55), matte(0xf7f4ee, { side: THREE.DoubleSide }))
  sail.position.set(0.16, 0.36, 0)
  const jib = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.32), matte(0xf7f4ee, { side: THREE.DoubleSide }))
  jib.position.set(-0.18, 0.28, 0)
  group.add(hull, keel, mast, sail, jib)
  return group
}

export const makeUmbrella = () => {
  const group = new THREE.Group()
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.85, 6), metal(0xe8e4dc))
  pole.position.y = 0.42
  const canopy = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.18, 10, 1, true), matte(0xc4333d, { side: THREE.DoubleSide }))
  canopy.position.y = 0.78
  const trim = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.012, 6, 16), matte(0xf2f0ea))
  trim.rotation.x = Math.PI / 2
  trim.position.y = 0.7
  const chair = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.04, 0.7), matte(0xc4a06a))
  chair.position.set(0.28, 0.04, 0)
  group.add(pole, canopy, trim, chair)
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
  const skin = basic(color)
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 8), skin)
  body.scale.set(1.7, 0.7, 0.48)
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.14, 7), skin)
  nose.rotation.z = -Math.PI / 2
  nose.position.x = 0.3
  const tail = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.2), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }))
  tail.position.x = -0.34
  tail.rotation.y = Math.PI / 2
  const fin = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.12, 4), skin)
  fin.position.set(0.02, 0.12, 0)
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 6), basic(0xf2f6f8))
  eye.position.set(0.16, 0.03, 0.08)
  group.add(body, nose, tail, fin, eye)
  group.userData = { tail }
  return {
    group,
    update: (time) => {
      tail.rotation.y = Math.PI / 2 + Math.sin(time * 8) * 0.2
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

export const makeKelp = (random: () => number): Tickable => {
  const group = new THREE.Group()
  const segs: THREE.Mesh[] = []
  const h = 1.6 + random() * 1.4
  const count = 7
  for (let i = 0; i < count; i++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.18, h / count, 0.04), new THREE.MeshBasicMaterial({ color: 0x2a8a4a }))
    blade.position.y = (i + 0.5) * (h / count)
    group.add(blade)
    segs.push(blade)
  }
  group.userData = { segs, phase: random() * 10 }
  return {
    group,
    update: (time) => {
      segs.forEach((blade, i) => {
        blade.rotation.z = Math.sin(time * 0.7 + group.userData.phase + i * 0.35) * 0.18 * (i / segs.length)
      })
    }
  }
}
