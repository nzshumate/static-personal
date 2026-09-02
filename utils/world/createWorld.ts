import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { createBiomes, Z_STEP } from './biomes'
import { lerp, smoothstep } from './math'
import { createSpace } from './space'

export type WorldHandle = {
  dispose: () => void
}

const backgrounds = [
  new THREE.Color(0x02040a),
  new THREE.Color(0x0b1c3a),
  new THREE.Color(0x2a3a4c),
  new THREE.Color(0x06140f),
  new THREE.Color(0x1a2438),
  new THREE.Color(0x071412),
  new THREE.Color(0x16344c),
  new THREE.Color(0x01080e)
]

const mixColor = (value: number) => {
  const scaled = value * (backgrounds.length - 1)
  const index = Math.min(backgrounds.length - 2, Math.floor(scaled))
  return backgrounds[index].clone().lerp(backgrounds[index + 1], scaled - index)
}

export const createWorld = async (canvas: HTMLCanvasElement): Promise<WorldHandle> => {
  const mobile = window.innerWidth < 800
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const scene = new THREE.Scene()
  scene.background = backgrounds[0].clone()

  const camera = new THREE.PerspectiveCamera(mobile ? 58 : 46, 1, 0.1, 240)
  camera.position.set(0, 0.35, 11)

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance'
  })
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 0.98
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.1 : 1.45))
  renderer.setClearColor(0x02040a, 1)

  const composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), mobile ? 0.12 : 0.2, 0.58, 0.24)
  composer.addPass(bloom)
  composer.addPass(new OutputPass())

  const journey = new THREE.Group()
  const space = createSpace(renderer, mobile)
  const biomes = createBiomes(renderer, mobile)
  journey.add(space.group, ...biomes.groups)
  scene.add(journey)

  const hemi = new THREE.HemisphereLight(0xb9d0ea, 0x141814, 0.45)
  const key = new THREE.DirectionalLight(0xffe6c4, 1.8)
  key.position.set(-7, 9, 6)
  scene.add(hemi, key)

  let frame = 0
  let target = 0
  let progress = 0
  let pointerX = 0
  let pointerY = 0
  const clock = new THREE.Clock()

  const onScroll = () => {
    const max = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1)
    target = window.scrollY / max
  }
  const onPointer = (event: PointerEvent) => {
    pointerX = event.clientX / window.innerWidth * 2 - 1
    pointerY = -(event.clientY / window.innerHeight) * 2 + 1
  }
  const onResize = () => {
    const width = window.innerWidth
    const height = Math.max(window.innerHeight, 1)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderer.setSize(width, height, false)
    composer.setSize(width, height)
  }

  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('pointermove', onPointer, { passive: true })
  window.addEventListener('resize', onResize)
  onScroll()
  onResize()

  const render = () => {
    const time = clock.getElapsedTime()
    const delta = target - progress
    progress += reduced || Math.abs(delta) > 0.22 ? delta : delta * 0.07
    const px = reduced ? 0 : pointerX
    const py = reduced ? 0 : pointerY

    const travel = progress * Z_STEP * 7
    journey.position.z = travel
    space.setOpacity(1 - smoothstep(0.03, 0.09, progress))
    space.update(time, progress, reduced)
    biomes.update(time, progress, reduced)

    const stations = [space.group, ...biomes.groups]
    const chapter = Math.min(stations.length - 1, Math.max(0, Math.round(progress * 7)))
    stations.forEach((group, index) => {
      group.visible = index === chapter
    })

    const bg = mixColor(progress)
    scene.background = bg
    hemi.intensity = 0.42 - smoothstep(0.82, 1, progress) * 0.16
    key.intensity = 2.05 - smoothstep(0.5, 0.72, progress) * 0.35 - smoothstep(0.82, 1, progress) * 0.7
    key.color.set(progress < 0.5 ? 0xffe6c4 : progress < 0.72 ? 0xc8e0d4 : 0x7ec8d4)
    renderer.toneMappingExposure = 1.02 - smoothstep(0.84, 1, progress) * 0.16
    bloom.strength = lerp(mobile ? 0.2 : 0.28, mobile ? 0.08 : 0.12, smoothstep(0.08, 0.22, progress))
    bloom.strength = lerp(bloom.strength, mobile ? 0.12 : 0.2, smoothstep(0.84, 1, progress))

    camera.position.x += (px * 0.24 - camera.position.x) * 0.04
    camera.position.y += (0.28 - progress * 0.9 - smoothstep(0.84, 1, progress) * 0.5 + py * 0.08 - camera.position.y) * 0.04
    camera.rotation.z += (px * 0.012 - camera.rotation.z) * 0.03
    camera.rotation.x += ((-0.02 - progress * 0.035) - camera.rotation.x) * 0.03

    composer.render()
    frame = requestAnimationFrame(render)
  }
  render()

  return {
    dispose: () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('pointermove', onPointer)
      window.removeEventListener('resize', onResize)
      composer.dispose()
      renderer.dispose()
    }
  }
}
