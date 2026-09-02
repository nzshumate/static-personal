<script setup lang="ts">
import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'

let frame = 0
let renderer: THREE.WebGLRenderer | null = null
let composer: EffectComposer | null = null
let onResize: (() => void) | null = null
let onScroll: (() => void) | null = null
const disposables: Array<THREE.BufferGeometry | THREE.Material> = []

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
const pulse = (p: number, start: number, peak: number, end: number) => {
  if (p <= start || p >= end) return 0
  if (p < peak) return clamp01((p - start) / (peak - start))
  return clamp01(1 - (p - peak) / (end - peak))
}

onMounted(async () => {
  await nextTick()
  const canvas = document.getElementById('space-details-canvas') as HTMLCanvasElement | null
  if (!canvas) return

  const mobile = window.innerWidth < 800
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(mobile ? 58 : 48, 1, .1, 80)
  camera.position.z = 12

  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' })
  renderer.setClearColor(0x000000, 0)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1 : 1.4))
  renderer.outputColorSpace = THREE.SRGBColorSpace

  composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), mobile ? .25 : .5, .75, .06)
  bloom.threshold = .06
  bloom.radius = .7
  bloom.strength = mobile ? .25 : .5
  composer.addPass(bloom)

  scene.add(new THREE.AmbientLight(0x7180a8, 1.1))
  const key = new THREE.DirectionalLight(0xa8c5ff, 2.4)
  key.position.set(-4, 5, 8)
  scene.add(key)

  const metallic = (color: number, emissive = 0x000000) => {
    const mat = new THREE.MeshStandardMaterial({ color, metalness: .86, roughness: .34, emissive, emissiveIntensity: .45, transparent: true })
    disposables.push(mat)
    return mat
  }
  const glow = (color: number, opacity: number) => {
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false })
    disposables.push(mat)
    return mat
  }

  // Tiny alien saucer — a quick easter egg rather than a hero object.
  const saucer = new THREE.Group()
  const saucerBodyGeo = new THREE.CylinderGeometry(.46, .7, .16, 32)
  const saucerBody = new THREE.Mesh(saucerBodyGeo, metallic(0x8c9aad))
  saucerBody.rotation.x = Math.PI / 2
  saucer.add(saucerBody)
  const domeGeo = new THREE.SphereGeometry(.28, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2)
  const domeMat = new THREE.MeshPhysicalMaterial({ color: 0x7fd6e8, emissive: 0x315e78, emissiveIntensity: .7, transmission: .15, transparent: true, opacity: .82, roughness: .15 })
  disposables.push(domeMat)
  const dome = new THREE.Mesh(domeGeo, domeMat)
  dome.rotation.x = Math.PI
  dome.position.y = .11
  saucer.add(dome)
  const alienHeadGeo = new THREE.SphereGeometry(.11, 16, 12)
  const alienHead = new THREE.Mesh(alienHeadGeo, new THREE.MeshStandardMaterial({ color: 0x86ad88, roughness: .8 }))
  disposables.push(alienHead.material as THREE.Material)
  alienHead.scale.set(.8, 1.15, .8)
  alienHead.position.set(0, .16, .02)
  saucer.add(alienHead)
  const saucerGlowGeo = new THREE.RingGeometry(.44, .66, 48)
  const saucerGlow = new THREE.Mesh(saucerGlowGeo, glow(0x76d8ff, .45))
  saucerGlow.rotation.x = -Math.PI / 2
  saucerGlow.position.y = -.09
  saucer.add(saucerGlow)
  saucer.scale.setScalar(mobile ? .7 : .9)
  scene.add(saucer)
  disposables.push(saucerBodyGeo, domeGeo, alienHeadGeo, saucerGlowGeo)

  // Communications satellite.
  const satellite = new THREE.Group()
  const satBodyGeo = new THREE.BoxGeometry(.48, .36, .48)
  satellite.add(new THREE.Mesh(satBodyGeo, metallic(0xb1b8c8)))
  const panelGeo = new THREE.BoxGeometry(1.15, .05, .42)
  const panelMat = new THREE.MeshStandardMaterial({ color: 0x17356c, metalness: .35, roughness: .28, emissive: 0x0a1b3f, emissiveIntensity: .25, transparent: true })
  disposables.push(panelMat)
  const leftPanel = new THREE.Mesh(panelGeo, panelMat)
  const rightPanel = leftPanel.clone()
  leftPanel.position.x = -1.0
  rightPanel.position.x = 1.0
  satellite.add(leftPanel, rightPanel)
  const dishGeo = new THREE.ConeGeometry(.3, .18, 28, 1, true)
  const dish = new THREE.Mesh(dishGeo, metallic(0xd6d9df))
  dish.rotation.x = Math.PI / 2
  dish.position.z = .38
  satellite.add(dish)
  satellite.scale.setScalar(mobile ? .58 : .72)
  scene.add(satellite)
  disposables.push(satBodyGeo, panelGeo, dishGeo)

  // Deep-space probe with long antenna mast.
  const probe = new THREE.Group()
  const probeCoreGeo = new THREE.DodecahedronGeometry(.34, 0)
  probe.add(new THREE.Mesh(probeCoreGeo, metallic(0x9b8b72)))
  const mastGeo = new THREE.CylinderGeometry(.018, .018, 1.2, 8)
  const mast = new THREE.Mesh(mastGeo, metallic(0xc9c9c9))
  mast.rotation.z = Math.PI / 2
  mast.position.x = .7
  probe.add(mast)
  const probeDishGeo = new THREE.ConeGeometry(.24, .14, 24, 1, true)
  const probeDish = new THREE.Mesh(probeDishGeo, metallic(0xd9d4c8))
  probeDish.rotation.z = -Math.PI / 2
  probeDish.position.x = 1.28
  probe.add(probeDish)
  scene.add(probe)
  disposables.push(probeCoreGeo, mastGeo, probeDishGeo)

  // Asteroids add scale and foreground depth around the middle chapters.
  const asteroids: THREE.Mesh[] = []
  const asteroidMat = new THREE.MeshStandardMaterial({ color: 0x343844, roughness: .92, metalness: .08, transparent: true })
  disposables.push(asteroidMat)
  for (let i = 0; i < (mobile ? 5 : 11); i++) {
    const geo = new THREE.IcosahedronGeometry(.13 + (i % 4) * .045, 1)
    const asteroid = new THREE.Mesh(geo, asteroidMat.clone())
    ;(asteroid.material as THREE.Material).transparent = true
    asteroids.push(asteroid)
    scene.add(asteroid)
    disposables.push(geo, asteroid.material as THREE.Material)
  }

  // Three comet streaks, intentionally brief and placed between content beats.
  const cometMaterial = glow(0xd8edff, .8)
  const comets = [0, 1, 2].map(i => {
    const group = new THREE.Group()
    const headGeo = new THREE.SphereGeometry(.045 + i * .008, 12, 12)
    const head = new THREE.Mesh(headGeo, glow(i === 2 ? 0xffc6a6 : 0xe5f3ff, .9))
    group.add(head)
    const tailGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(-2.5 - i * .8, .5 + i * .12, -.5)])
    const tail = new THREE.Line(tailGeo, cometMaterial)
    group.add(tail)
    scene.add(group)
    disposables.push(headGeo, head.material as THREE.Material, tailGeo)
    return group
  })

  let targetScroll = 0
  let smoothScroll = 0
  onScroll = () => {
    const max = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1)
    targetScroll = window.scrollY / max
  }
  onResize = () => {
    if (!renderer || !composer) return
    const w = window.innerWidth, h = window.innerHeight
    camera.aspect = w / Math.max(h, 1)
    camera.updateProjectionMatrix()
    renderer.setSize(w, h, false)
    composer.setSize(w, h)
  }
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onResize)
  onScroll(); onResize()

  const clock = new THREE.Clock()
  const render = () => {
    const t = clock.getElapsedTime()
    smoothScroll += (targetScroll - smoothScroll) * (reduced ? 1 : .045)
    const p = smoothScroll

    const ufo = pulse(p, .09, .16, .235)
    saucer.visible = ufo > .002
    saucer.position.set(-9 + p * 58, 2.3 - Math.sin(p * 35) * .55, 1.8 - ufo * 3.4)
    saucer.rotation.set(.08, -.22 + Math.sin(t * 1.8) * .06, -.08 + Math.sin(t * 2.2) * .035)
    saucer.scale.setScalar((mobile ? .62 : .82) * (.78 + ufo * .45))
    saucer.children.forEach(child => { const m = (child as THREE.Mesh).material as THREE.Material & { opacity?: number }; if (m && 'opacity' in m) m.opacity = Math.min(m.opacity ?? 1, ufo) })

    const satA = pulse(p, .18, .31, .46)
    satellite.visible = satA > .002
    satellite.position.set(7.6 - p * 19, 3.2 - p * 4.2, -1.2 + satA * 2.2)
    satellite.rotation.set(.5 + t * .025, -1.0 + t * .06, .25 + Math.sin(t * .23) * .18)
    satellite.traverse(obj => { const m = (obj as THREE.Mesh).material as THREE.Material & { opacity?: number }; if (m?.transparent) m.opacity = satA })

    const probeA = pulse(p, .48, .61, .76)
    probe.visible = probeA > .002
    probe.position.set(-7.2 + p * 10.8, -1.6 + Math.sin(t * .18) * .25, -2.4 + probeA * 3.0)
    probe.rotation.set(.3, t * -.05, -.35)
    probe.traverse(obj => { const m = (obj as THREE.Mesh).material as THREE.Material & { opacity?: number }; if (m?.transparent) m.opacity = probeA })

    const asteroidA = pulse(p, .34, .5, .69)
    asteroids.forEach((a, i) => {
      a.visible = asteroidA > .002
      const angle = i * .9 + p * 4.8
      a.position.set(Math.cos(angle) * (4.8 + i * .26), Math.sin(angle * 1.3) * (2.2 + i * .08), -2.8 + (i % 5) * .9)
      a.rotation.x = t * (.08 + i * .009)
      a.rotation.y = t * (.055 + i * .013)
      ;(a.material as THREE.MeshStandardMaterial).opacity = asteroidA * (.2 + (i % 3) * .17)
    })

    const cometWindows = [[.24,.285,.34],[.57,.61,.655],[.79,.835,.89]]
    comets.forEach((c, i) => {
      const a = pulse(p, cometWindows[i][0], cometWindows[i][1], cometWindows[i][2])
      c.visible = a > .002
      const local = clamp01((p - cometWindows[i][0]) / (cometWindows[i][2] - cometWindows[i][0]))
      c.position.set(8 - local * 18, 4.2 - local * 7 + i * 1.2, -1.5 + i * .7)
      c.rotation.z = -.22 - i * .08
      c.scale.setScalar(.65 + a * .6)
      c.traverse(obj => { const m = (obj as THREE.Mesh).material as THREE.Material & { opacity?: number }; if (m && 'opacity' in m) m.opacity = a * .82 })
    })

    composer?.render()
    frame = requestAnimationFrame(render)
  }
  render()
})

onBeforeUnmount(() => {
  cancelAnimationFrame(frame)
  if (onResize) window.removeEventListener('resize', onResize)
  if (onScroll) window.removeEventListener('scroll', onScroll)
  disposables.forEach(item => item.dispose())
  composer?.dispose()
  renderer?.dispose()
})
</script>

<template>
  <canvas id="space-details-canvas" aria-hidden="true" style="position:fixed;inset:0;width:100vw;height:100vh;z-index:0;pointer-events:none" />
</template>
