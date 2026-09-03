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
  opacity: 0;
  animation: world-in 1.15s ease 0.08s forwards;
}

@keyframes world-in {
  to { opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  #world-canvas {
    opacity: 1;
    animation: none;
  }
}
</style>
