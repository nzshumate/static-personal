<script setup lang="ts">
import { readJourneyProgress } from '~/utils/world/journey'
const activeChapter = ref(0)
const journeyProgress = ref(0)
const cinema = ref(false)
const paused = ref(false)
const worldState = ref('loading')
const atlas = ref<HTMLDialogElement | null>(null)
const atlasOpen = ref(false)
const chapterColors = ['#a5b9e7', '#b6d9ee', '#d3e3e8', '#a5cf9d', '#e7b581', '#b5cf8f', '#9fdfd6', '#8ed0e1']
const chapterNotes = ['A little distance changes everything.', 'Room to see what comes next.', 'Built to weather the unknown.', 'Great things grow together.', 'New terrain. New possibilities.', 'Find a path through the tangled parts.', 'Leave room for curiosity.', 'There is always more to discover.']
const goToChapter = (index: number) => {
  const chapter = chapters[Math.max(0, Math.min(chapters.length - 1, index))]!
  document.getElementById(chapter.id)?.scrollIntoView({ behavior: 'instant' })
  syncChapter()
  history.replaceState(null, '', '#' + chapter.id)
  atlas.value?.close()
}
const openAtlas = () => { atlas.value?.showModal(); atlasOpen.value = true }
const onKey = (event: KeyboardEvent) => {
  if (event.key === 'Escape') cinema.value = false
  if (!cinema.value || atlasOpen.value || /INPUT|TEXTAREA|SELECT/.test((event.target as HTMLElement)?.tagName)) return
  if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
    event.preventDefault()
    goToChapter(activeChapter.value + (event.key === 'ArrowRight' ? 1 : -1))
  }
}
const toggleMotion = () => {
  paused.value = !paused.value
  try { localStorage.setItem('journey-paused', String(paused.value)) } catch {}
}
const chapters = [
  {
    id: 'top',
    biome: 'Orbit',
    kicker: 'Engineering · Leadership · AI',
    title: 'The way we build software is changing.\nGood.',
    copy: 'I build products, lead frontend teams, obsess over architecture, and spend an unreasonable amount of time figuring out what AI means for all of the above.'
  },
  {
    id: 'sky',
    biome: 'Sky',
    kicker: 'Perspective',
    title: 'The code is the easy part.',
    copy: 'Understanding what we should build, why we’re building it, and how to avoid making everyone hate us six months from now. That’s the interesting part.'
  },
  {
    id: 'mountains',
    biome: 'Mountains',
    kicker: 'Architecture',
    title: 'Good architecture buys freedom.',
    copy: 'Not more abstractions. Not another framework. Just good boundaries, understandable systems, and the ability to change direction without setting everything on fire.'
  },
  {
    id: 'forest',
    biome: 'Forest',
    kicker: 'Leadership',
    title: 'Hire smart people.\nGive them context.\nGet out of the way.',
    copy: 'Leadership should create clarity and remove obstacles, not turn senior engineers into ticket-taking machines.'
  },
  {
    id: 'desert',
    biome: 'Desert',
    kicker: 'AI & Automation',
    title: 'AI changed the game.',
    copy: 'I’m not trying to put a chatbot on every screen. I care about what happens when AI becomes part of how the work itself gets done.'
  },
  {
    id: 'swamp',
    biome: 'Swamp',
    kicker: 'Product engineering',
    title: 'Complexity happens.',
    copy: 'Some comes from the problem. Some comes from decisions we regret. Knowing the difference is half the job.'
  },
  {
    id: 'beach',
    biome: 'Shoreline',
    kicker: 'Exploration',
    title: 'I still like building things.',
    copy: 'Web apps, mobile, agents, developer tools, weird experiments. Curiosity has carried my career further than any particular framework ever has.'
  },
  {
    id: 'contact',
    biome: 'The Deep',
    kicker: 'Contact',
    title: 'Tell me the hard problem.',
    copy: 'Those are usually the fun ones.'
  }
]

useSeoMeta({
  title: 'Nathan Shumate | Software Engineer & Technical Leader',
  description: 'Software engineering, technical leadership, architecture, and the ways AI is changing how we build.',
  ogTitle: 'Nathan Shumate | Software Engineer & Technical Leader',
  ogDescription: 'The way we build software is changing. Good.'
})

const syncChapter = () => {
  journeyProgress.value = readJourneyProgress()
  activeChapter.value = Math.round(journeyProgress.value * (chapters.length - 1))
}

onMounted(() => {
  paused.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  try { if (localStorage.getItem('journey-paused') === 'true') paused.value = true } catch {}
  syncChapter()
  window.addEventListener('keydown', onKey)
  window.addEventListener('scroll', syncChapter, { passive: true })
  window.addEventListener('resize', syncChapter)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('scroll', syncChapter)
  window.removeEventListener('resize', syncChapter)
})
</script>

<template>
  <main class="space-site journey-site" :class="{ 'cinema-mode': cinema }" :style="{ '--chapter-accent': chapterColors[activeChapter] }">

    <ClientOnly>
      <WorldCanvas :paused="paused" :exploring="cinema" @ready="worldState = 'ready'" @unavailable="worldState = 'unavailable'" />
    </ClientOnly>
    <div class="grain" aria-hidden="true" />
    <div class="edge-fade journey-fade" aria-hidden="true" />



    <section
      v-for="(chapter, index) in chapters"
      :id="chapter.id"
      :key="chapter.id"
      class="scene journey-scene"
      :class="[`biome-${chapter.id}`, { 'scene-hero': index === 0, 'scene-contact': index === chapters.length - 1 }]"
    >
      <div class="journey-copy" :class="{ 'journey-copy-right': index % 2 === 1 }" :inert="cinema">
        <p class="chapter-label"><span>{{ String(index + 1).padStart(2, '0') }}</span><span class="chapter-rule" /> {{ chapter.biome }}</p>
        <p class="scene-kicker">{{ chapter.kicker }}</p>
        <h1 v-if="index === 0">
          <template v-for="(line, li) in chapter.title.split('\n')" :key="line">
            {{ line }}<br v-if="li < chapter.title.split('\n').length - 1">
          </template>
        </h1>
        <h2 v-else>
          <template v-for="(line, li) in chapter.title.split('\n')" :key="line">
            {{ line }}<br v-if="li < chapter.title.split('\n').length - 1">
          </template>
        </h2>
        <p class="journey-body">{{ chapter.copy }}</p>
        <NuxtLink v-if="index === 0" to="/work" class="home-work-link">View my work <span aria-hidden="true">→</span></NuxtLink>
        <a
          v-if="index === chapters.length - 1"
          class="journey-cta"
          href="https://github.com/nzshumate"
          target="_blank"
          rel="noreferrer"
        >GitHub <span>↗</span></a>
      </div>
      <a v-if="index === 0" class="scroll-cue" href="#sky" :inert="cinema"><span>Eight worlds. One curious mind.</span><i>↓</i></a>
      <SiteFooter v-if="index === chapters.length - 1" cinematic />
    </section>
    <div v-if="worldState !== 'ready'" class="world-status" role="status">{{ worldState === 'loading' ? 'Preparing the journey' : 'Reading mode · 3D unavailable on this device' }}<span v-if="worldState === 'loading'" class="loading-line" /></div>

    <div class="cinema-caption" :aria-hidden="!cinema">
      <p class="scene-kicker">World {{ String(activeChapter + 1).padStart(2, '0') }} / 08</p>
      <h2>{{ chapters[activeChapter]?.biome }}</h2>
      <p>{{ chapterNotes[activeChapter] }}</p>
    </div>

    <div class="journey-dock" aria-label="Journey controls">
      <button class="dock-location dock-atlas" aria-haspopup="dialog" :aria-expanded="atlasOpen" aria-label="Choose a world" @click="openAtlas"><span class="live-dot" aria-hidden="true" /><span>{{ String(activeChapter + 1).padStart(2, '0') }}</span><strong>{{ chapters[activeChapter]?.biome }}</strong><span class="dock-atlas-icon" aria-hidden="true">⊞</span></button>
      <nav class="chapter-track" aria-label="Chapters">
        <a v-for="(chapter, index) in chapters" :key="chapter.id" :href="'#' + chapter.id" @click.prevent="goToChapter(index)" :aria-label="chapter.biome" :aria-current="activeChapter === index ? 'location' : undefined" :class="{ current: activeChapter === index, visited: activeChapter > index }"><span /></a>
      </nav>
      <div class="dock-actions">
        <button :aria-pressed="cinema" @click="cinema = !cinema"><span aria-hidden="true">{{ cinema ? '↙' : '⤢' }}</span> {{ cinema ? 'Read the story' : 'View the world' }}</button>
        <button class="motion-control" :aria-label="paused ? 'Resume scene motion' : 'Pause scene motion'" :title="paused ? 'Resume motion' : 'Pause motion'" :aria-pressed="paused" @click="toggleMotion">{{ paused ? '▶' : 'Ⅱ' }}</button>
      </div>
    </div>
    <div class="journey-progress" aria-hidden="true"><span :style="{ transform: `scaleX(${journeyProgress})` }" /></div>
    <div v-if="cinema" class="cinema-navigation">
      <button :disabled="activeChapter === 0" aria-label="Previous world" @click="goToChapter(activeChapter - 1)">←</button>
      <span>Scroll to travel <span class="keyboard-hint">· or use ← →</span></span>
      <button :disabled="activeChapter === chapters.length - 1" aria-label="Next world" @click="goToChapter(activeChapter + 1)">→</button>
    </div>

    <dialog ref="atlas" class="world-atlas" aria-labelledby="atlas-title" @close="atlasOpen = false" @click="($event.target === atlas) && atlas?.close()">
      <div class="atlas-panel">
        <div class="atlas-heading"><div><p class="scene-kicker">Choose your perspective</p><h2 id="atlas-title">A world of possibilities.</h2></div><button class="atlas-close" aria-label="Close worlds" @click="atlas?.close()">×</button></div>
        <div class="atlas-grid">
          <button v-for="(chapter, index) in chapters" :key="chapter.id" :class="['atlas-card', 'atlas-' + chapter.id, { selected: activeChapter === index }]" :style="{ '--card-accent': chapterColors[index] }" :aria-label="`Visit ${chapter.biome}`" @click="goToChapter(index)">
            <div class="atlas-landscape" aria-hidden="true"><i /><i /><i /></div>
            <span class="atlas-number">{{ String(index + 1).padStart(2, '0') }} <span v-if="activeChapter === index">You are here</span></span>
            <span class="atlas-card-title">{{ chapter.biome }} <span>↗</span></span><span class="atlas-kicker">{{ chapter.kicker }}</span>
          </button>
        </div>
        <p class="atlas-footnote">An exploration of engineering, leadership, and the things that keep me curious.</p>
      </div>
    </dialog>
  </main>
</template>
