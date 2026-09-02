<script setup lang="ts">
const disciplines = [
  ['01', 'Engineering', 'Modern frontend systems, product engineering, and maintainable software.'],
  ['02', 'Architecture', 'Technical direction that keeps teams fast without painting them into corners.'],
  ['03', 'AI & Automation', 'Practical agentic workflows and AI-assisted engineering that reduce friction.'],
  ['04', 'Leadership', 'Clear standards, strong ownership, and environments where engineers can do their best work.'],
  ['05', 'Product', 'Engineering decisions grounded in user value, business context, and shipping.']
]

const roles = [
  ['</>', 'Engineer', '15+ years building modern web, mobile, and data-driven applications.'],
  ['◎', 'Leader', 'Leading engineering teams, driving technical strategy, and creating ownership.'],
  ['◇', 'Builder', 'Shipping products end-to-end and building systems that scale without needless complexity.'],
  ['✧', 'Explorer', 'Always learning—AI, automation, new platforms, and the future of software.'],
  ['>_', 'Thinker', 'Writing about engineering, leadership, architecture, and the ideas shaping our industry.']
]

const writing = [
  { title: 'AI-native software development', kicker: 'Field notes', text: 'What changes when agents become part of the engineering system instead of another autocomplete tool.' },
  { title: 'Architecture that preserves options', kicker: 'Engineering', text: 'How to make strong technical decisions without over-designing the future.' },
  { title: 'The lead is a force multiplier', kicker: 'Leadership', text: 'Why technical leadership is less about owning every answer and more about making the team better.' }
]

const year = new Date().getFullYear()

useSeoMeta({
  title: 'Nathan Shumate — Software Engineer & Technical Leader',
  ogTitle: 'Nathan Shumate — Software Engineer & Technical Leader',
  description: 'Building software, systems, and teams. Writing about engineering, architecture, AI, and technical leadership.',
  ogDescription: 'Building software, systems, and teams.'
})
</script>

<template>
  <main>
    <section id="top" class="hero">
      <ClientOnly><WebGLHero /></ClientOnly>
      <div class="hero-vignette" />

      <div class="network-labels" aria-hidden="true">
        <span class="network-label label-ai">AI & Automation <b>+</b></span>
        <span class="network-label label-architecture">Architecture <b>+</b></span>
        <span class="network-label label-engineering">Engineering <b>+</b></span>
        <span class="network-label label-product">Product <b>+</b></span>
        <span class="network-label label-leadership">Leadership <b>+</b></span>
      </div>

      <div class="explore-orbit" aria-hidden="true">
        <span>Move cursor<br>to explore</span>
      </div>

      <header class="site-header shell">
        <a class="brand-lockup" href="#top" aria-label="Nathan Shumate, back to top">
          <span class="brand-mark">NS</span>
          <span class="brand-copy"><strong>Nathan Shumate</strong><small>Software Engineer & Technical Leader</small></span>
        </a>
        <nav aria-label="Primary navigation">
          <a class="active" href="#top">Home</a>
          <a href="#work">Work</a>
          <a href="#writing">Writing</a>
          <a href="#experiments">Experiments</a>
          <a href="#about">About</a>
          <a class="contact-link" href="#contact">Contact <span>•</span></a>
        </nav>
      </header>

      <div class="hero-content shell">
        <p class="eyebrow">Engineering · Leadership · AI</p>
        <h1>I build software<br>and the teams<br>that <em>build it.</em></h1>
        <p class="hero-copy">I help teams ship high-quality products, explore emerging technology, and create leverage through automation and AI.</p>
        <div class="hero-actions">
          <a class="button button-primary" href="#work">Explore my work <span>→</span></a>
          <a class="button button-ghost" href="#writing">Read my writing</a>
        </div>
      </div>

      <div class="role-strip shell">
        <article v-for="role in roles" :key="role[1]" class="role-card">
          <span class="role-icon">{{ role[0] }}</span>
          <h3>{{ role[1] }}</h3>
          <p>{{ role[2] }}</p>
        </article>
      </div>

      <div class="scroll-rail" aria-hidden="true"><span>Scroll</span><i /><i /><i /><i /><i /></div>
    </section>

    <section id="work" class="section shell">
      <div class="section-heading"><p class="eyebrow">What I do</p><h2>Technical depth.<br>Product awareness.<br>Clear direction.</h2></div>
      <div class="discipline-grid">
        <article v-for="item in disciplines" :key="item[1]" class="discipline-card">
          <span class="index">{{ item[0] }}</span><h3>{{ item[1] }}</h3><p>{{ item[2] }}</p>
        </article>
      </div>
    </section>

    <section id="experiments" class="statement-band">
      <div class="shell statement-grid"><p class="eyebrow">Experiments</p><p class="statement-copy">I’m particularly interested in how AI changes the shape of engineering organizations: the tools we use, the systems we build, and the expectations we place on teams.</p></div>
    </section>

    <section id="writing" class="section shell">
      <div class="section-heading split-heading"><div><p class="eyebrow">Writing</p><h2>Ideas I’m working through.</h2></div><p>Notes on software engineering, architecture, AI, product development, and technical leadership.</p></div>
      <div class="writing-grid">
        <article v-for="post in writing" :key="post.title" class="writing-card">
          <p class="card-kicker">{{ post.kicker }}</p><h3>{{ post.title }}</h3><p>{{ post.text }}</p><span class="read-more">Coming soon ↗</span>
        </article>
      </div>
    </section>

    <section id="about" class="section shell about-grid">
      <div><p class="eyebrow">About</p><h2>I like hard problems, small teams, and software that earns its complexity.</h2></div>
      <div class="about-copy">
        <p>I’m a software engineer and technical leader focused on modern product development. My work spans frontend architecture, engineering systems, mobile, AI-assisted development, and technical direction.</p>
        <p>This site is where I share the work, experiments, and ideas that don’t fit into a job title.</p>
        <div class="social-links"><a href="https://github.com/nzshumate" target="_blank" rel="noreferrer">GitHub ↗</a></div>
      </div>
    </section>

    <footer id="contact" class="site-footer shell"><span>© {{ year }} Nathan Shumate</span><a href="#top">Back to top ↑</a></footer>
  </main>
</template>
