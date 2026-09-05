import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { createBiomes, Z_STEP } from './biomes'
import { lerp, smoothstep } from './math'
import { readJourneyProgress } from './journey'
import { createSpace } from './space'

export type WorldHandle = {
  setPaused: (value: boolean) => void
  setExploring: (value: boolean) => void
  dispose: () => void
}

const fogColors = [0x02040a, 0xa9c7d8, 0xabbac7, 0x102b26, 0xb89970, 0x162c29, 0xc3b9a4, 0x031018]
const lightPositions = [[-7,9,6], [-7,9,6], [7,9,6], [6,9,3], [-8,7,5], [-6,6,4], [-9,5,4], [-5,8,4]]

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

// Average on-screen tone per station, used for the atmospheric dip between scenes.
const veils = [
  new THREE.Color(0x02040a),
  new THREE.Color(0x5f7d9c),
  new THREE.Color(0x7d8994),
  new THREE.Color(0x0a1a12),
  new THREE.Color(0xa8784a),
  new THREE.Color(0x0c1c18),
  new THREE.Color(0x8c7f6c),
  new THREE.Color(0x031018)
]

const mixColor = (palette: THREE.Color[], value: number) => {
  const scaled = value * (palette.length - 1)
  const index = Math.min(palette.length - 2, Math.floor(scaled))
  return palette[index]!.clone().lerp(palette[index + 1]!, scaled - index)
}

export const createWorld = async (canvas: HTMLCanvasElement): Promise<WorldHandle> => {
  const mobile = window.innerWidth < 800
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const scene = new THREE.Scene()
  scene.background = backgrounds[0]!.clone()
  const fog = new THREE.Fog(0x061218, 14, 42)
  scene.fog = fog

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
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.5 : 2))
  renderer.setClearColor(0x02040a, 1)

  const pmrem = new THREE.PMREMGenerator(renderer)
  const studio = new RoomEnvironment()
  const reflections = pmrem.fromScene(studio, 0.025)
  scene.environment = reflections.texture
  scene.environmentIntensity = 0.32
  studio.dispose()
  pmrem.dispose()

  const composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), mobile ? 0.12 : 0.2, 0.45, 0.85)
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

  let paused = reduced
  let exploring = false
  let animationTime = 12
  let frame = 0
  let target = 0
  let progress = 0
  let pointerX = 0
  let pointerY = 0
  let intro = 0
  let lastElapsed = 0
  const stage = canvas.closest('main') as HTMLElement | null
  const clock = new THREE.Clock()

  const onScroll = () => {
    target = readJourneyProgress()
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
    onScroll()
  }

  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('pointermove', onPointer, { passive: true })
  window.addEventListener('resize', onResize)
  onScroll()
  onResize()

  const render = () => {
    const elapsed = clock.getElapsedTime()
    const dt = Math.min(0.05, Math.max(0, elapsed - lastElapsed))
    lastElapsed = elapsed
    const cameraEase = 1 - Math.exp(-dt * 1.8)
    if (!paused) animationTime += dt
    const time = animationTime
    const delta = target - progress
    progress += reduced || Math.abs(delta) > 1 / 14 ? delta : delta * (1 - Math.exp(-dt * 3.4))
    const px = reduced || paused ? 0 : pointerX
    const py = reduced || paused ? 0 : pointerY

    const station = Math.round(progress * 7)
    // Keep each landscape composed; only a small dolly is needed between transitions.
    journey.position.z = station * Z_STEP + (progress * 7 - station) * 2.4
    space.setOpacity(1 - smoothstep(0.04, 0.12, progress))
    space.update(time, progress, false)
    biomes.update(time, progress, false)

    const stations = [space.group, ...biomes.groups]
    const scaled = progress * 7
    const chapter = Math.min(stations.length - 1, Math.max(0, Math.round(scaled)))
    stations.forEach((group, index) => {
      group.visible = index === chapter
    })

    // Travel between scenes passes through a brief atmospheric haze rather than a hard cut.
    const boundary = Math.abs(scaled - chapter)
    const haze = smoothstep(0.3, 0.5, boundary)
    intro = reduced ? 1 : smoothstep(0, 1.2, elapsed)
    canvas.style.opacity = (intro * (1 - haze * 0.82)).toFixed(3)
    if (stage) stage.style.background = `#${mixColor(veils, progress).getHexString()}`

    scene.background = mixColor(backgrounds, progress)
    fog.color.setHex(fogColors[chapter]!)
    fog.near = chapter === 7 ? 10 : 14
    fog.far = chapter === 7 ? 34 : 42
    hemi.intensity = 0.42 - smoothstep(0.82, 1, progress) * 0.16
    key.intensity = lerp(1.65, 0.32, smoothstep(0.82, 1, progress))
    key.position.fromArray(lightPositions[chapter]!)
    key.color.set(progress < 0.5 ? 0xffe6c4 : progress < 0.72 ? 0xc8e0d4 : 0x7ec8d4)
    renderer.toneMappingExposure = 1.02 - smoothstep(0.84, 1, progress) * 0.16
    bloom.strength = lerp(mobile ? 0.2 : 0.28, mobile ? 0.08 : 0.12, smoothstep(0.08, 0.22, progress))
    bloom.strength = lerp(bloom.strength, mobile ? 0.12 : 0.2, smoothstep(0.84, 1, progress))

    camera.position.x += (px * (exploring ? 0.65 : 0.14) - camera.position.x) * cameraEase
    camera.position.y += (0.28 - progress * 0.9 - smoothstep(0.84, 1, progress) * 0.5 + py * (exploring ? 0.25 : 0.05) - camera.position.y) * cameraEase
    camera.rotation.z += (px * 0.008 - camera.rotation.z) * cameraEase
    camera.rotation.x += ((-0.02 - progress * 0.035) - camera.rotation.x) * cameraEase

    composer.render()
    frame = requestAnimationFrame(render)
  }
  const onVisibility = () => {
    cancelAnimationFrame(frame)
    if (!document.hidden) { lastElapsed = clock.getElapsedTime(); render() }
  }
  document.addEventListener('visibilitychange', onVisibility)
  render()

  return {
    setPaused: (value) => { paused = value },
    setExploring: (value) => { exploring = value },
    dispose: () => {
      document.removeEventListener('visibilitychange', onVisibility)
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('pointermove', onPointer)
      window.removeEventListener('resize', onResize)
      journey.traverse((object) => {
        const mesh = object as THREE.Mesh
        if (mesh.geometry) mesh.geometry.dispose()
        const material = mesh.material
        if (!material) return
        const list = Array.isArray(material) ? material : [material]
        list.forEach((item) => {
          Object.values(item).forEach((value) => {
            if (value && typeof value === 'object' && 'dispose' in value && typeof value.dispose === 'function') value.dispose()
          })
          item.dispose()
        })
      })
      reflections.dispose()
      bloom.dispose()
      composer.dispose()
      renderer.dispose()
    }
  }
}
