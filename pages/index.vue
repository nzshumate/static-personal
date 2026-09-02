<script setup lang="ts">
const disciplines = [
  ['01', 'Engineering', 'Modern frontend systems, product engineering, and maintainable software.'],
  ['02', 'Architecture', 'Technical direction that keeps teams fast without painting them into corners.'],
  ['03', 'AI & Automation', 'Practical agentic workflows and AI-assisted engineering that reduce friction.'],
  ['04', 'Leadership', 'Clear standards, strong ownership, and environments where engineers can do their best work.'],
  ['05', 'Product', 'Engineering decisions grounded in user value, business context, and shipping.']
]
const writing = [
  { title: 'AI-native software development', kicker: 'Field notes', text: 'What changes when agents become part of the engineering system instead of another autocomplete tool.' },
  { title: 'Architecture that preserves options', kicker: 'Engineering', text: 'How to make strong technical decisions without over-designing the future.' },
  { title: 'The lead is a force multiplier', kicker: 'Leadership', text: 'Why technical leadership is less about owning every answer and more about making the team better.' }
]
useSeoMeta({ title: 'Nathan Shumate — Software Engineer & Technical Leader', ogTitle: 'Nathan Shumate — Software Engineer & Technical Leader', description: 'Building software, systems, and teams. Writing about engineering, architecture, AI, and technical leadership.', ogDescription: 'Building software, systems, and teams.' })
</script>

<template>
<main>
  <section class="hero" id="top">
    <ClientOnly><WebGLHero /></ClientOnly><div class="hero-vignette" />
    <header class="site-header shell"><a class="brand" href="#top">NS</a><nav aria-label="Primary navigation"><a href="#work">Work</a><a href="#writing">Writing</a><a href="#about">About</a></nav></header>
    <div class="hero-content shell">
      <p class="eyebrow">Software engineer · Technical leader</p>
      <h1>I build software <span>and the teams that build it.</span></h1>
      <p class="hero-copy">I work at the intersection of engineering, architecture, product, and AI—building systems that ship and helping teams do their best work.</p>
      <div class="hero-actions"><a class="button button-primary" href="#work">Explore my work</a><a class="button button-ghost" href="#writing">Read my writing</a></div>
    </div>
    <div class="signal-row shell" aria-hidden="true"><span>Engineering</span><span>Architecture</span><span>AI</span><span>Leadership</span><span>Product</span></div>
  </section>
  <section id="work" class="section shell">
    <div class="section-heading"><p class="eyebrow">What I do</p><h2>Technical depth.<br>Product awareness.<br>Clear direction.</h2></div>
    <div class="discipline-grid"><article v-for="item in disciplines" :key="item[1]" class="discipline-card"><span class="index">{{ item[0] }}</span><h3>{{ item[1] }}</h3><p>{{ item[2] }}</p></article></div>
  </section>
  <section class="statement-band"><div class="shell statement-grid"><p class="eyebrow">Current focus</p><p class="statement-copy">I’m particularly interested in how AI changes the shape of engineering organizations: the tools we use, the systems we build, and the expectations we place on teams.</p></div></section>
  <section id="writing" class="section shell">
    <div class="section-heading split-heading"><div><p class="eyebrow">Writing</p><h2>Ideas I’m working through.</h2></div><p>Notes on software engineering, architecture, AI, product development, and technical leadership.</p></div>
    <div class="writing-grid"><article v-for="post in writing" :key="post.title" class="writing-card"><p class="card-kicker">{{ post.kicker }}</p><h3>{{ post.title }}</h3><p>{{ post.text }}</p><span class="read-more">Coming soon ↗</span></article></div>
  </section>
  <section id="about" class="section shell about-grid"><div><p class="eyebrow">About</p><h2>I like hard problems, small teams, and software that earns its complexity.</h2></div><div class="about-copy"><p>I’m a software engineer and technical leader focused on modern product development. My work spans frontend architecture, engineering systems, mobile, AI-assisted development, and technical direction.</p><p>This site is where I share the work, experiments, and ideas that don’t fit into a job title.</p><div class="social-links"><a href="https://github.com/nzshumate" target="_blank" rel="noreferrer">GitHub ↗</a></div></div></section>
  <footer class="site-footer shell"><span>© {{ new Date().getFullYear() }} Nathan Shumate</span><a href="#top">Back to top ↑</a></footer>
</main>
</template>
