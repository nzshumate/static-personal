<script setup lang="ts">
import { createWorld, type WorldHandle } from '~/utils/world/createWorld'

const props = defineProps<{ paused: boolean; exploring: boolean }>()
const emit = defineEmits<{ ready: []; unavailable: [] }>()
let world: WorldHandle | null = null
let disposed = false
let canvasElement: HTMLCanvasElement | null = null
const onContextLost = (event: Event) => {
  event.preventDefault()
  world?.dispose()
  world = null
  emit('unavailable')
}
watch(() => props.paused, value => world?.setPaused(value))
watch(() => props.exploring, value => world?.setExploring(value))

onMounted(async () => {
  await nextTick()
  const canvas = document.getElementById('world-canvas') as HTMLCanvasElement | null
  if (!canvas) return
  canvasElement = canvas
  canvas.addEventListener('webglcontextlost', onContextLost)
  try {
    const handle = await createWorld(canvas)
    if (disposed) { handle.dispose(); return }
    world = handle
    world.setPaused(props.paused)
    world.setExploring(props.exploring)
    emit('ready')
  } catch (error) {
    console.warn('The 3D journey could not initialize.', error)
    emit('unavailable')
  }
})

onBeforeUnmount(() => {
  disposed = true
  canvasElement?.removeEventListener('webglcontextlost', onContextLost)
  world?.dispose()
  world = null
})
</script>

<template>
  <canvas id="world-canvas" aria-hidden="true" role="presentation" />
</template>

<style scoped>
#world-canvas {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  z-index: 0;
  pointer-events: none;
  opacity: 0;
}
</style>
