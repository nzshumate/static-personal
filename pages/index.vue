<script setup lang="ts">
const year = new Date().getFullYear()
const activeChapter = ref(0)
const chapters = [
  {
    id: 'top',
    biome: 'Orbit',
    kicker: 'Engineering · Leadership · AI',
    title: 'I’ve been building software for 15 years.\nIt’s somehow getting interesting again.',
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
  title: 'Nathan Shumate, software engineer',
  description: 'Software engineering, technical leadership, architecture, and the ways AI is changing how we build.',
  ogTitle: 'Nathan Shumate, software engineer',
  ogDescription: 'I’ve been building software for 15 years. It’s somehow getting interesting again.'
})

const syncChapter = () => {
  const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
  activeChapter.value = Math.min(chapters.length - 1, Math.max(0, Math.round((window.scrollY / max) * 7)))
}

onMounted(() => {
  syncChapter()
  window.addEventListener('scroll', syncChapter, { passive: true })
  window.addEventListener('resize', syncChapter)
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', syncChapter)
  window.removeEventListener('resize', syncChapter)
})
</script>

<template>
  <main class="space-site journey-site">
    <ClientOnly>
      <WorldCanvas />
    </ClientOnly>
    <div class="grain" aria-hidden="true" />
    <div class="edge-fade journey-fade" aria-hidden="true" />

    <nav class="journey-nav" aria-label="Chapters">
      <ol>
        <li v-for="(chapter, index) in chapters" :key="chapter.id">
          <a
            :href="'#' + chapter.id"
            :class="{ current: activeChapter === index }"
            :aria-current="activeChapter === index ? 'location' : undefined"
          >
            <span class="journey-nav-name">{{ chapter.biome }}</span>
            <span class="journey-nav-mark" aria-hidden="true" />
          </a>
        </li>
      </ol>
    </nav>

    <header class="floating-nav">
      <a class="identity" href="#top" aria-label="Nathan Shumate, back to top">
        <span class="identity-mark">NS</span>
        <span class="identity-copy">
          <strong>Nathan Shumate</strong>
          <small>Engineer · Technical Leader</small>
        </span>
      </a>
      <nav aria-label="Primary navigation">
        <a href="#top">Start</a>
        <a href="#mountains">Work</a>
        <a href="#desert">AI</a>
        <a href="#beach">Explore</a>
        <a class="nav-contact" href="#contact">Contact</a>
      </nav>
    </header>

    <section
      v-for="(chapter, index) in chapters"
      :id="chapter.id"
      :key="chapter.id"
      class="scene journey-scene"
      :class="[`biome-${chapter.id}`, { 'scene-hero': index === 0, 'scene-contact': index === chapters.length - 1 }]"
    >
      <div class="journey-copy" :class="{ 'journey-copy-right': index % 2 === 1 }">
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
        <a
          v-if="index === chapters.length - 1"
          class="journey-cta"
          href="https://github.com/nzshumate"
          target="_blank"
          rel="noreferrer"
        >GitHub <span>↗</span></a>
      </div>
      <a v-if="index === 0" class="scroll-cue" href="#sky"><span>Scroll</span><i>↓</i></a>
      <footer v-if="index === chapters.length - 1">
        <span>© {{ year }} Nathan Shumate</span>
        <a href="#top">Back to orbit ↑</a>
      </footer>
    </section>
  </main>
</template>
