<script setup lang="ts">
usePageMeta('Lab', 'Experiments in AI, developer tooling, and interactive experiences. Things Nathan Shumate is building and exploring.')
const revealed = ref(false)
</script>
<template>
  <EditorialPage>
    <PageHero label="03 / Lab" title="Make something. See what happens." description="Experiments, side projects, and questions that are better answered with working code." note="Curiosity / Applied" />
    <section class="lab-feature" aria-labelledby="pii-title">
      <div class="redaction-art"><div class="lab-art-top"><span class="eyebrow">Text → Entities → Redaction</span><span class="status-label">Illustration</span></div><div class="redaction-sample" :class="{ revealed }"><p>Hi, I’m <span class="redacted">John Doe</span>.</p><p>Reach me at</p><p><span class="redacted">john.doe@example.com</span>.</p></div><button :aria-pressed="revealed" @click="revealed = !revealed">{{ revealed ? 'Show redacted example' : 'Reveal sample text' }} <span aria-hidden="true">↔</span></button><p class="art-caption">Fictional sample. A visual illustration, not a live service.</p></div>
      <div class="lab-feature-copy"><p class="eyebrow">01 / Public project</p><h2 id="pii-title">PII Redaction<br>Service</h2><p>A NLP-enhanced microservice for detecting and redacting personally identifiable information from text.</p><p>Pattern matching and entity recognition, brought together behind an API. Built with Python, FastAPI, and spaCy.</p><a class="text-link" href="https://github.com/nzshumate/pii-redaction-service" target="_blank" rel="noreferrer">Explore the repository <span>↗</span></a></div>
    </section>
    <section class="lab-secondary editorial-section" aria-labelledby="journey-lab-title"><div class="journey-art" aria-hidden="true"><span /><i /><i /><i /></div><div><p class="eyebrow">02 / You’re inside this one</p><h2 id="journey-lab-title">A personal site.<br>A small world.</h2><p>Eight environments, one scroll journey. An experiment in bringing procedural landscapes, character animation, and a little personality to the browser.</p><p class="case-stack">Nuxt · TypeScript · Three.js</p><NuxtLink class="text-link" to="/" :prefetch="false">Take the journey <span>↗</span></NuxtLink></div></section>
    <section class="lab-open-slot"><span class="open-slot-mark" aria-hidden="true">+</span><div><p class="eyebrow">Room for the next question</p><h2>More experiments coming.</h2><p>Not every idea needs a roadmap. Some just need an afternoon.</p></div></section>
  </EditorialPage>
</template>
