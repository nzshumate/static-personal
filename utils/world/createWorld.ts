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
  new THREE.Color(0x16324c),
  new THREE.Color(0x6f8294),
  new THREE.Color(0x0c1812),
  new THREE.Color(0x2a1c12),
  new THREE.Color(0x0c1816),
  new THREE.Color(0x163844),
  new THREE.Color(0x021018)
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
  scene.fog = new THREE.FogExp2(0x02040a, 0.014)

  const camera = new THREE.PerspectiveCamera(mobile ? 58 : 46, 1, 0.1, 180)
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
    space.setOpacity(1 - smoothstep(0.05, 0.16, progress))
    space.update(time, progress, reduced)
    biomes.update(time, progress, reduced)

    const stations = [space.group, ...biomes.groups]
    stations.forEach((group) => {
      const worldZ = journey.position.z + group.position.z
      group.visible = worldZ > -48 && worldZ < 22
    })

    const bg = mixColor(progress)
    scene.background = bg
    ;(scene.fog as THREE.FogExp2).color.copy(bg)
    ;(scene.fog as THREE.FogExp2).density = 0.012 + smoothstep(0.82, 1, progress) * 0.02
    hemi.intensity = 0.48 - smoothstep(0.82, 1, progress) * 0.2
    key.intensity = 1.9 - smoothstep(0.5, 0.72, progress) * 0.4 - smoothstep(0.82, 1, progress) * 0.8
    key.color.set(progress < 0.5 ? 0xffe6c4 : progress < 0.72 ? 0xc8e0d4 : 0x7ec8d4)
    renderer.toneMappingExposure = 0.98 - smoothstep(0.84, 1, progress) * 0.14
    bloom.strength = lerp(mobile ? 0.18 : 0.26, mobile ? 0.08 : 0.12, smoothstep(0.08, 0.22, progress))
    bloom.strength = lerp(bloom.strength, mobile ? 0.12 : 0.18, smoothstep(0.84, 1, progress))

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
