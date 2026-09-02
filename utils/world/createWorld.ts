import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { createEffects } from './effects'
import { createEnvironments } from './environments'
import { lerp, smoothstep } from './math'
import { createOcean } from './ocean'
import { createSpace } from './space'

export type WorldHandle = {
  dispose: () => void
}

const fogPalette = [
  new THREE.Color(0x02040a),
  new THREE.Color(0x16324a),
  new THREE.Color(0x6f8494),
  new THREE.Color(0x10241c),
  new THREE.Color(0x8a6236),
  new THREE.Color(0x16302a),
  new THREE.Color(0x2c5d66),
  new THREE.Color(0x03121f)
]

export const createWorld = async (canvas: HTMLCanvasElement): Promise<WorldHandle> => {
  const mobile = window.innerWidth < 800
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x02040a)
  scene.fog = new THREE.FogExp2(0x02040a, 0.012)

  const camera = new THREE.PerspectiveCamera(mobile ? 58 : 46, 1, 0.1, 160)
  camera.position.set(0, 0.35, 11)

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance'
  })
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 0.96
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.1 : 1.45))
  renderer.setClearColor(0x02040a, 1)

  const composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), mobile ? 0.16 : 0.28, 0.68, 0.22)
  composer.addPass(bloom)
  composer.addPass(new OutputPass())

  const space = createSpace(renderer, mobile)
  const environments = createEnvironments(renderer)
  const effects = createEffects(renderer, mobile)
  const ocean = createOcean(mobile)
  scene.add(space.group, environments.group, effects.group, ocean.group)

  const hemi = new THREE.HemisphereLight(0xb9d0ea, 0x141814, 0.55)
  scene.add(hemi)

  await environments.preload()

  let frame = 0
  let target = 0
  let progress = 0
  let pointerX = 0
  let pointerY = 0
  const pointer = new THREE.Vector2()
  const size = new THREE.Vector2()
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
    size.set(width, height)
  }

  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('pointermove', onPointer, { passive: true })
  window.addEventListener('resize', onResize)
  onScroll()
  onResize()

  const mixFog = (value: number) => {
    const scaled = value * (fogPalette.length - 1)
    const index = Math.min(fogPalette.length - 2, Math.floor(scaled))
    const mix = scaled - index
    return fogPalette[index].clone().lerp(fogPalette[index + 1], mix)
  }

  const render = () => {
    const time = clock.getElapsedTime()
    progress += (target - progress) * (reduced ? 1 : 0.045)
    pointer.x += (pointerX - pointer.x) * 0.04
    pointer.y += (pointerY - pointer.y) * 0.04

    const spaceAmount = 1 - smoothstep(0.08, 0.2, progress)
    const oceanAmount = smoothstep(0.82, 0.92, progress)
    space.setOpacity(spaceAmount)
    space.group.visible = spaceAmount > 0.02
    space.update(time, progress, reduced)
    environments.update(progress, pointer)
    effects.update(time, progress, reduced, renderer.getPixelRatio())
    ocean.update(time, progress, pointer, size, reduced)

    const fog = mixFog(progress)
    scene.background = fog
    ;(scene.fog as THREE.FogExp2).color.copy(fog)
    ;(scene.fog as THREE.FogExp2).density = 0.01 + oceanAmount * 0.028
    hemi.intensity = 0.55 - oceanAmount * 0.28
    renderer.toneMappingExposure = 0.96 + Math.sin(progress * Math.PI) * 0.04 - oceanAmount * 0.16
    bloom.strength = lerp(mobile ? 0.18 : 0.34, mobile ? 0.08 : 0.16, 1 - spaceAmount)
    bloom.strength = lerp(bloom.strength, mobile ? 0.14 : 0.22, oceanAmount)

    const camX = (reduced ? 0 : pointer.x * 0.22)
    const camY = 0.32 - progress * 1.05 - oceanAmount * 0.55 + (reduced ? 0 : pointer.y * 0.08)
    const camZ = 11 - progress * 1.4
    camera.position.x += (camX - camera.position.x) * 0.04
    camera.position.y += (camY - camera.position.y) * 0.04
    camera.position.z += (camZ - camera.position.z) * 0.04
    camera.rotation.z += ((reduced ? 0 : pointer.x * 0.012) - camera.rotation.z) * 0.03
    camera.rotation.x += ((-0.02 - progress * 0.04 - oceanAmount * 0.08) - camera.rotation.x) * 0.03

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
