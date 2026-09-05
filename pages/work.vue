<script setup lang="ts">
usePageMeta('Work', 'Frontend architecture, technical leadership, AI, and the engineering decisions that make software easier to change.')
const practice = [
  { number: '01', title: 'Architecture that leaves room.', label: 'Frontend architecture', text: 'Good boundaries make it possible to change direction. I care about understandable systems, clear ownership, and abstractions that earn their place.', note: 'Optimize for the next decision, not the next framework.' },
  { number: '02', title: 'Clarity is part of the job.', label: 'Technical leadership', text: 'Give smart people the context to make good decisions. Remove obstacles. Make the tradeoffs visible. A team should get more capable, not more dependent on its lead.', note: 'Context before tickets. Trust before process.' },
  { number: '03', title: 'Change how the work gets done.', label: 'AI & automation', text: 'The interesting question is bigger than where to put a chatbot. I’m exploring how AI fits into building, reviewing, and maintaining software, with engineers still responsible for the result.', note: 'Faster feedback matters more than more output.' },
  { number: '04', title: 'Make the right thing easier.', label: 'Engineering quality & developer experience', text: 'Quality lives in everyday decisions: a useful test, a comprehensible interface, a workflow that catches mistakes early. The tools should support good judgment.', note: 'Less friction. More confidence.' }
]
const projects = [
  { title: 'An HR platform that connected the pieces.', category: 'Application architecture', year: '2016', stack: 'Laravel · Vue · API integrations', problem: 'A manufacturing company needed an intranet that could support HR management and an employment portal.', approach: 'I designed the database and application, connected third-party services, and built a workflow that turned web-form submissions into filled PDF documents stored through the Box API.', takeaway: 'The real engineering work was in the boundaries: data, documents, integrations, and the people moving between them.' },
  { title: 'Turning coordinates into delivery routes.', category: 'Geospatial engineering', year: '2016', stack: 'Mapbox · JavaScript · PHP', problem: 'An agricultural delivery operation needed to make useful routes out of GPS coordinates.', approach: 'I used Mapbox’s Geocoding and Directions tools to build a custom routing solution and support route analysis. The scope stayed grounded in what the project could actually support.', takeaway: 'A useful solution respects both the technical problem and the constraints around it.' },
  { title: 'A small validation with a real purpose.', category: 'Engineering correctness', year: '2016', stack: 'JavaScript · Form validation', problem: 'An existing shipping application needed to validate container identification codes before accepting a form.', approach: 'I implemented the ISO 6346 check-digit algorithm in JavaScript and connected it to the submission flow.', takeaway: 'Sometimes the right piece of engineering is a small, precise rule at exactly the right boundary.' }
]
</script>
<template>
  <EditorialPage>
    <PageHero label="01 / Work" title="Building software is the easy part." description="Understanding what to build, where to draw the boundaries, and how to keep a team moving. That’s the work I keep coming back to." note="Engineering / In practice" />
    <section class="editorial-section practice-section" aria-labelledby="practice-title">
      <div class="section-heading"><p class="eyebrow">How I work</p><h2 id="practice-title">Good software is a series<br>of considered decisions.</h2></div>
      <div class="practice-grid"><article v-for="item in practice" :key="item.number" class="practice-card"><span class="item-number">{{ item.number }}</span><p class="eyebrow">{{ item.label }}</p><h3>{{ item.title }}</h3><p>{{ item.text }}</p><p class="practice-note">{{ item.note }}</p></article></div>
    </section>
    <section class="editorial-section" aria-labelledby="projects-title">
      <div class="section-heading split-heading"><div><p class="eyebrow">Selected work / Archive</p><h2 id="projects-title">Real problems.<br>Useful software.</h2></div><p>A few earlier projects from my portfolio. Different tools, familiar questions about systems, constraints, and getting the details right.</p></div>
      <article v-for="(project, index) in projects" :key="project.title" class="case-study">
        <div class="case-meta"><span class="item-number">0{{ index + 1 }}</span><p>{{ project.category }}</p><span>{{ project.year }}</span></div>
        <div class="case-content"><h3>{{ project.title }}</h3><p class="case-stack">{{ project.stack }}</p><div class="case-columns"><div><h4>The problem</h4><p>{{ project.problem }}</p></div><div><h4>The approach</h4><p>{{ project.approach }}</p></div></div><p class="case-takeaway">{{ project.takeaway }}</p></div>
      </article>
    </section>
    <NuxtLink to="/lab" class="next-page"><span><small>For the less conventional ideas</small>Step into the lab.</span><span aria-hidden="true">↗</span></NuxtLink>
  </EditorialPage>
</template>
