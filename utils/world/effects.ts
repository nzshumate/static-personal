import * as THREE from 'three'
import { makeRng, pulse } from './math'
import { pointFragment, pointVertex } from './shaders'

type ParticleField = {
  points: THREE.Points
  material: THREE.ShaderMaterial
  start: number
  peak: number
  end: number
  drift: THREE.Vector3
}

export type EffectsSystem = {
  group: THREE.Group
  update: (time: number, progress: number, reduced: boolean, pixelRatio: number) => void
}

const createField = (
  renderer: THREE.WebGLRenderer,
  random: () => number,
  count: number,
  color: number,
  size: number,
  spread: THREE.Vector3,
  origin: THREE.Vector3,
  window: [number, number, number],
  drift: THREE.Vector3
): ParticleField => {
  const positions = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    positions.set([
      origin.x + (random() - 0.5) * spread.x,
      origin.y + (random() - 0.5) * spread.y,
      origin.z + (random() - 0.5) * spread.z
    ], i * 3)
    sizes[i] = 0.55 + random() * 1.6
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: 0 },
      uPixelRatio: { value: renderer.getPixelRatio() },
      uSize: { value: size }
    },
    vertexShader: pointVertex,
    fragmentShader: pointFragment,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  })
  return {
    points: new THREE.Points(geometry, material),
    material,
    start: window[0],
    peak: window[1],
    end: window[2],
    drift
  }
}

export const createEffects = (renderer: THREE.WebGLRenderer, mobile: boolean): EffectsSystem => {
  const group = new THREE.Group()
  const random = makeRng(77191)
  const fields: ParticleField[] = [
    createField(renderer, random, mobile ? 180 : 420, 0xf4f7fb, 0.9, new THREE.Vector3(16, 12, 10), new THREE.Vector3(0, 1, -4), [0.22, 0.32, 0.44], new THREE.Vector3(0.12, -0.28, 0)),
    createField(renderer, random, mobile ? 40 : 90, 0xd7f59a, 0.55, new THREE.Vector3(12, 7, 8), new THREE.Vector3(0, -0.4, -3), [0.4, 0.46, 0.56], new THREE.Vector3(0.02, 0.04, 0)),
    createField(renderer, random, mobile ? 70 : 160, 0xf0c27a, 0.5, new THREE.Vector3(14, 8, 8), new THREE.Vector3(0, 0.2, -4), [0.52, 0.59, 0.7], new THREE.Vector3(0.18, 0.03, 0)),
    createField(renderer, random, mobile ? 80 : 180, 0xcfe6d8, 0.7, new THREE.Vector3(14, 7, 8), new THREE.Vector3(0, 0.1, -4), [0.62, 0.71, 0.82], new THREE.Vector3(0.04, 0.06, 0)),
    createField(renderer, random, mobile ? 60 : 140, 0xe8f6f8, 0.45, new THREE.Vector3(14, 6, 8), new THREE.Vector3(0, -0.6, -4), [0.74, 0.83, 0.92], new THREE.Vector3(0.08, 0.02, 0)),
    createField(renderer, random, mobile ? 280 : 780, 0xb8eef2, 0.62, new THREE.Vector3(16, 12, 12), new THREE.Vector3(0, -0.4, -5), [0.84, 0.94, 1.05], new THREE.Vector3(0.03, -0.16, 0))
  ]
  fields.forEach((field) => group.add(field.points))

  const birdGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-0.16, 0, 0),
    new THREE.Vector3(0, 0.05, 0),
    new THREE.Vector3(0.16, 0, 0)
  ])
  const birds: THREE.Line[] = []
  for (let i = 0; i < (mobile ? 6 : 10); i++) {
    const material = new THREE.LineBasicMaterial({ color: 0x1b242c, transparent: true, opacity: 0 })
    const bird = new THREE.Line(birdGeo, material)
    bird.position.set((i - 4) * 0.7, 1.8 + (i % 3) * 0.25, -6 - (i % 4) * 0.4)
    group.add(bird)
    birds.push(bird)
  }

  const planeCanvas = document.createElement('canvas')
  planeCanvas.width = 128
  planeCanvas.height = 128
  const pctx = planeCanvas.getContext('2d')!
  pctx.fillStyle = '#161b21'
  pctx.beginPath()
  pctx.ellipse(64, 64, 30, 2.4, 0, 0, Math.PI * 2)
  pctx.fill()
  pctx.beginPath()
  pctx.ellipse(70, 64, 7, 20, -0.12, 0, Math.PI * 2)
  pctx.fill()
  const planeTex = new THREE.CanvasTexture(planeCanvas)
  const planeMat = new THREE.SpriteMaterial({ map: planeTex, transparent: true, opacity: 0, depthWrite: false })
  const plane = new THREE.Sprite(planeMat)
  plane.scale.set(1.15, 1.15, 1)
  group.add(plane)

  const heliCanvas = document.createElement('canvas')
  heliCanvas.width = 128
  heliCanvas.height = 128
  const hctx = heliCanvas.getContext('2d')!
  hctx.fillStyle = '#1a2027'
  hctx.beginPath()
  hctx.ellipse(64, 70, 14, 6, 0, 0, Math.PI * 2)
  hctx.fill()
  hctx.strokeStyle = 'rgba(26,32,39,0.85)'
  hctx.lineWidth = 1.4
  hctx.beginPath()
  hctx.ellipse(64, 58, 22, 4, 0, 0, Math.PI * 2)
  hctx.stroke()
  const heliTex = new THREE.CanvasTexture(heliCanvas)
  const heliMat = new THREE.SpriteMaterial({ map: heliTex, transparent: true, opacity: 0, depthWrite: false })
  const heli = new THREE.Sprite(heliMat)
  heli.scale.set(0.85, 0.85, 1)
  group.add(heli)

  const update = (time: number, progress: number, reduced: boolean, pixelRatio: number) => {
    fields.forEach((field, index) => {
      const amount = pulse(progress, field.start, field.peak, field.end)
      field.material.uniforms.uOpacity.value = amount * (index === 1 ? 0.28 : 0.42)
      field.material.uniforms.uPixelRatio.value = pixelRatio
      field.points.visible = amount > 0.02
      if (!reduced && amount > 0) {
        field.points.position.x = Math.sin(time * 0.07 + index) * field.drift.x
        field.points.position.y = ((time * field.drift.y) % 2.4)
      }
    })

    const skyAmount = pulse(progress, 0.1, 0.18, 0.28)
    planeMat.opacity = skyAmount * 0.7
    heliMat.opacity = skyAmount * 0.45
    plane.visible = skyAmount > 0.04
    heli.visible = skyAmount > 0.04
    if (!reduced) {
      plane.position.set(-7 + ((time * 0.22) % 16), 2.15, -7)
      heli.position.set(5.5 - ((time * 0.16) % 13), 0.85, -6.2)
    }

    const birdAmount = pulse(progress, 0.12, 0.2, 0.3)
    birds.forEach((bird, i) => {
      const material = bird.material as THREE.LineBasicMaterial
      material.opacity = birdAmount * 0.55
      bird.visible = birdAmount > 0.04
      if (!reduced) {
        bird.position.x = -6 + ((time * 0.2 + i * 0.85) % 13)
        bird.position.y = 1.6 + (i % 4) * 0.22 + Math.sin(time * 0.9 + i) * 0.05
      }
    })
  }

  return { group, update }
}
