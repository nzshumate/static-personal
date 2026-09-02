<script setup lang="ts">
const year = new Date().getFullYear()
const chapters = [
  { id:'top', n:'01', biome:'Orbit', kicker:'Engineering · Leadership · AI', title:'I build software\nand the teams\nthat build it.', copy:'I help teams turn hard technical decisions into software that ships, scales, and stays understandable.' },
  { id:'sky', n:'02', biome:'Sky', kicker:'Perspective', title:'Zoom out.\nThen decide.', copy:'Good engineering starts with seeing the system clearly: the product, the people, the constraints, and the path through them.' },
  { id:'mountains', n:'03', biome:'Mountains', kicker:'Architecture', title:'Clarity at\nhigher altitude.', copy:'I like architecture that creates leverage without creating ceremony — systems that stay legible as the terrain gets harder.' },
  { id:'forest', n:'04', biome:'Forest', kicker:'Leadership', title:'Strong teams\ngrow deliberately.', copy:'Direction matters. So do ownership, trust, standards, and enough room for engineers to make good decisions themselves.' },
  { id:'desert', n:'05', biome:'Desert', kicker:'AI & Automation', title:'Find leverage\nwhere others see friction.', copy:'I use automation and AI to remove repetition, shorten feedback loops, and let small teams operate with unusual force.' },
  { id:'swamp', n:'06', biome:'Swamp', kicker:'Product engineering', title:'Complexity is\npart of the landscape.', copy:'The job is not to avoid complexity. It is to understand which complexity is real, which is accidental, and which should never survive the next iteration.' },
  { id:'beach', n:'07', biome:'Shoreline', kicker:'Exploration', title:'Build. Learn.\nKeep moving.', copy:'This is where I explore new platforms, mobile, agents, developer experience, and whatever changes the shape of software next.' },
  { id:'contact', n:'08', biome:'The deep', kicker:'Contact', title:'Put a hard problem\nin front of me.', copy:'The best work usually starts with a problem that is still a little unclear.' }
]

useSeoMeta({
  title: 'Nathan Shumate — Software Engineer & Technical Leader',
  description: 'Software engineering, technical leadership, architecture, AI, automation, and experiments by Nathan Shumate.',
  ogTitle: 'Nathan Shumate — Software Engineer & Technical Leader',
  ogDescription: 'I build software and the teams that build it.'
})
</script>

<template>
  <main class="space-site journey-site">
    <ClientOnly><WorldJourney /></ClientOnly>
    <ClientOnly><PhotorealBackplates /></ClientOnly>
    <div class="grain" aria-hidden="true" />
    <div class="edge-fade journey-fade" aria-hidden="true" />

    <header class="floating-nav">
      <a class="identity" href="#top" aria-label="Nathan Shumate, back to top">
        <span class="identity-mark">NS</span>
        <span class="identity-copy"><strong>Nathan Shumate</strong><small>Engineer · Technical Leader</small></span>
      </a>
      <nav aria-label="Primary navigation">
        <a href="#top">Start</a><a href="#mountains">Work</a><a href="#desert">AI</a><a href="#beach">Explore</a><a class="nav-contact" href="#contact">Contact ↗</a>
      </nav>
    </header>

    <section v-for="(chapter,index) in chapters" :id="chapter.id" :key="chapter.id" class="scene journey-scene" :class="[`biome-${chapter.id}`, { 'scene-hero': index===0, 'scene-contact': index===chapters.length-1 }]">
      <div class="chapter-index">{{ chapter.n }} / 08 · {{ chapter.biome }}</div>
      <div class="journey-copy" :class="{ 'journey-copy-right': index % 2 === 1 }">
        <p class="scene-kicker">{{ chapter.kicker }}</p>
        <h1 v-if="index===0">I build software<br>and the teams<br>that <em>build it.</em></h1>
        <h2 v-else><template v-for="(line,li) in chapter.title.split('\n')" :key="line">{{ line }}<br v-if="li < chapter.title.split('\n').length-1"></template></h2>
        <p class="journey-body">{{ chapter.copy }}</p>
        <div v-if="index===0" class="journey-meta"><span>Software engineering</span><span>Technical leadership</span><span>AI & automation</span></div>
        <a v-if="index===chapters.length-1" class="journey-cta" href="https://github.com/nzshumate" target="_blank" rel="noreferrer">Start a conversation <span>↗</span></a>
      </div>
      <div class="biome-label" aria-hidden="true"><span>{{ chapter.biome }}</span><i /></div>
      <a v-if="index===0" class="scroll-cue" href="#sky"><span>Begin the descent</span><i>↓</i></a>
      <footer v-if="index===chapters.length-1"><span>© {{ year }} Nathan Shumate</span><a href="#top">Back to orbit ↑</a></footer>
    </section>
  </main>
</template>
