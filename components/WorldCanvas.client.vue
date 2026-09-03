<script setup lang="ts">
import { createWorld, type WorldHandle } from '~/utils/world/createWorld'

let world: WorldHandle | null = null

onMounted(async () => {
  await nextTick()
  const canvas = document.getElementById('world-canvas') as HTMLCanvasElement | null
  if (!canvas) return
  world = await createWorld(canvas)
})

onBeforeUnmount(() => {
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
  background: #02040a;
}
</style>
