<script setup lang="ts">
const capabilities = [
  { n: '01', title: 'Engineering', copy: 'Modern product engineering across web, mobile, testing, design systems, and developer experience.' },
  { n: '02', title: 'Architecture', copy: 'Technical direction that keeps systems understandable, adaptable, and fast enough to keep shipping.' },
  { n: '03', title: 'AI & Automation', copy: 'Agentic workflows and practical automation that compound the leverage of an engineering team.' },
  { n: '04', title: 'Leadership', copy: 'Clear standards, strong ownership, and teams that can make good decisions without waiting for permission.' }
]

const notes = [
  ['AI-native engineering', 'What changes when agents become part of the engineering system instead of another autocomplete tool.'],
  ['Architecture that preserves options', 'How to make strong technical decisions without over-designing the future.'],
  ['The lead is a force multiplier', 'Why technical leadership is less about owning every answer and more about making the team better.']
]

const year = new Date().getFullYear()

useSeoMeta({
  title: 'Nathan Shumate — Software Engineer & Technical Leader',
  description: 'Software engineering, technical leadership, architecture, AI, automation, and experiments by Nathan Shumate.',
  ogTitle: 'Nathan Shumate — Software Engineer & Technical Leader',
  ogDescription: 'I build software and the teams that build it.'
})
</script>

<template>
  <main class="space-site">
    <ClientOnly><WebGLHero /></ClientOnly>
    <ClientOnly><SpaceDetails /></ClientOnly>
    <div class="grain" aria-hidden="true" />
    <div class="edge-fade" aria-hidden="true" />

    <header class="floating-nav">
      <a class="identity" href="#top" aria-label="Nathan Shumate, back to top">
        <span class="identity-mark">NS</span>
        <span class="identity-copy"><strong>Nathan Shumate</strong><small>Engineer · Technical Leader</small></span>
      </a>
      <nav aria-label="Primary navigation">
        <a href="#work">Work</a>
        <a href="#thinking">Thinking</a>
        <a href="#about">About</a>
        <a class="nav-contact" href="#contact">Contact ↗</a>
      </nav>
    </header>

    <section id="top" class="scene scene-hero">
      <div class="hero-index">01 / 05</div>
      <div class="hero-lockup">
        <p class="scene-kicker">Engineering · Leadership · AI</p>
        <h1>I build software<br>and the teams<br>that <em>build it.</em></h1>
        <p class="hero-intro">I help teams turn hard technical decisions into software that ships, scales, and stays understandable.</p>
      </div>
      <div class="hero-aside">
        <span class="signal-dot" />
        <p>Software engineer and technical leader working across product engineering, architecture, AI, and automation.</p>
      </div>
      <a class="scroll-cue" href="#work"><span>Scroll to enter</span><i>↓</i></a>
    </section>

    <section id="work" class="scene scene-statement">
      <div class="chapter-index">02 / 05</div>
      <div class="statement-wrap">
        <p class="scene-kicker">The work</p>
        <h2>The hard part is rarely<br><em>just the code.</em></h2>
        <p class="statement-copy">The real work is choosing what matters, making the architecture legible, creating enough structure for a team to move quickly, and knowing when complexity has actually earned its place.</p>
      </div>
      <div class="chapter-note">Move through the field</div>
    </section>

    <section class="scene scene-capabilities">
      <div class="capability-heading">
        <p class="scene-kicker">How I work</p>
        <p>Technical depth without losing sight of the product.</p>
      </div>
      <div class="capability-list">
        <article v-for="item in capabilities" :key="item.title" class="capability-row">
          <span>{{ item.n }}</span>
          <h3>{{ item.title }}</h3>
          <p>{{ item.copy }}</p>
          <b>↗</b>
        </article>
      </div>
    </section>

    <section id="thinking" class="scene scene-thinking">
      <div class="chapter-index">03 / 05</div>
      <div class="thinking-panel">
        <p class="scene-kicker">Current orbit</p>
        <h2>AI changes the shape<br>of engineering teams.</h2>
        <p>I’m interested in what happens after the novelty: how agents change workflows, ownership, testing, architecture, and the amount of leverage a small team can create.</p>
        <div class="thinking-tags"><span>Agents</span><span>Automation</span><span>Architecture</span><span>Developer Experience</span></div>
      </div>
    </section>

    <section class="scene scene-notes">
      <div class="notes-heading">
        <p class="scene-kicker">Notes from the work</p>
        <h2>Ideas I’m<br>working through.</h2>
      </div>
      <div class="notes-list">
        <article v-for="(note, index) in notes" :key="note[0]" class="note-row">
          <span>0{{ index + 1 }}</span>
          <div><h3>{{ note[0] }}</h3><p>{{ note[1] }}</p></div>
          <em>Coming soon</em>
        </article>
      </div>
    </section>

    <section id="about" class="scene scene-about">
      <div class="chapter-index">04 / 05</div>
      <div class="about-title"><p class="scene-kicker">About</p><h2>Build things.<br>Make teams better.<br>Keep learning.</h2></div>
      <div class="about-copy">
        <p>I’m a software engineer and technical leader focused on modern product development. My work spans frontend architecture, mobile, engineering systems, AI-assisted development, and technical direction.</p>
        <p>This site is where I share the work, experiments, and ideas that don’t fit neatly into a job title.</p>
        <a href="https://github.com/nzshumate" target="_blank" rel="noreferrer">GitHub ↗</a>
      </div>
    </section>

    <section id="contact" class="scene scene-contact">
      <div class="chapter-index">05 / 05</div>
      <div class="contact-lockup">
        <p class="scene-kicker">Contact</p>
        <h2>Put a hard problem<br>in front of me.</h2>
        <a href="https://github.com/nzshumate" target="_blank" rel="noreferrer">Start a conversation <span>↗</span></a>
      </div>
      <footer><span>© {{ year }} Nathan Shumate</span><a href="#top">Return to orbit ↑</a></footer>
    </section>
  </main>
</template>
