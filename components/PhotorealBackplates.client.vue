<script setup lang="ts">
const layers = [
  { id: 'sky', start: .095, peak: .17, end: .265 },
  { id: 'mountain', start: .205, peak: .305, end: .405 },
  { id: 'forest', start: .33, peak: .445, end: .55 },
  { id: 'desert', start: .47, peak: .575, end: .675 },
  { id: 'swamp', start: .60, peak: .705, end: .805 },
  { id: 'beach', start: .73, peak: .845, end: .93 }
]

let onScroll: (() => void) | null = null
let frame = 0

const clamp = (v:number) => Math.max(0, Math.min(1, v))
const smooth = (a:number,b:number,v:number) => {
  const t = clamp((v-a)/(b-a))
  return t*t*(3-2*t)
}
const pulse = (v:number,a:number,b:number,c:number) => v <= a || v >= c ? 0 : v < b ? smooth(a,b,v) : 1-smooth(b,c,v)

onMounted(() => {
  const root = document.getElementById('photoreal-backplates')
  if (!root) return
  let target = 0
  let current = 0
  onScroll = () => {
    const max = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1)
    target = window.scrollY / max
  }
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()

  const tick = () => {
    current += (target-current) * .055
    layers.forEach(layer => {
      const el = root.querySelector<HTMLElement>(`[data-backplate="${layer.id}"]`)
      if (!el) return
      const amount = pulse(current, layer.start, layer.peak, layer.end)
      el.style.opacity = String(amount)
      const drift = (current-layer.peak) * 24
      el.style.transform = `scale(1.055) translate3d(${drift*.18}px, ${drift}px, 0)`
    })
    const atmosphere = root.querySelector<HTMLElement>('.backplate-atmosphere')
    if (atmosphere) atmosphere.style.opacity = String(smooth(.12,.92,current) * .42)
    frame = requestAnimationFrame(tick)
  }
  tick()
})

onBeforeUnmount(() => {
  cancelAnimationFrame(frame)
  if (onScroll) window.removeEventListener('scroll', onScroll)
})
</script>

<template>
  <div id="photoreal-backplates" class="photoreal-backplates" aria-hidden="true">
    <div data-backplate="sky" class="photo-backplate photo-sky" />
    <div data-backplate="mountain" class="photo-backplate photo-mountain" />
    <div data-backplate="forest" class="photo-backplate photo-forest" />
    <div data-backplate="desert" class="photo-backplate photo-desert" />
    <div data-backplate="swamp" class="photo-backplate photo-swamp" />
    <div data-backplate="beach" class="photo-backplate photo-beach" />
    <div class="backplate-atmosphere" />
    <div class="backplate-vignette" />
  </div>
</template>
