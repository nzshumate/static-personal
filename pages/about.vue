<script setup lang="ts">
usePageMeta('About', 'I’ve been building software for about 15 years. I still like it. A little about the engineer behind the site.')
</script>
<template>
  <EditorialPage>
    <PageHero label="04 / About" title="Still curious. Still building." description="I’ve been building software for about 15 years. I still like it." note="The person behind the pixels" />
    <section class="about-layout editorial-section" aria-labelledby="about-title">
      <aside class="about-aside"><div class="orbit-drawing" aria-hidden="true"><i /><i /><i /><span>NS</span></div><p class="eyebrow">Nathan Shumate</p><p>Software engineer.<br>Technical leader.<br>Person who keeps asking why.</p></aside>
      <div class="reading-copy"><h2 id="about-title">The tools change.<br>The interesting part stays.</h2><p>I build products, lead frontend teams, and spend a lot of time thinking about architecture. Not architecture as a diagram that nobody looks at again. Architecture as the decisions that make tomorrow’s work easier or harder.</p><p>The longer I do this, the less interested I am in cleverness for its own sake. I want to understand a system. I want the next person to understand it too. And I want us to be able to change our minds without rebuilding everything.</p><p>That carries into how I think about leadership. Give people context. Be clear about what matters. Help when something gets in the way. Then leave enough room for people to surprise you.</p><blockquote>Good architecture buys freedom.<br>Good leadership should do the same.</blockquote><p>AI has given me a new set of questions to obsess over. What should we automate? What still needs judgment? What changes when building software becomes a much faster part of solving the problem?</p><p>I don’t have all the answers. Working through those questions, preferably by building something, is a pretty good way to spend my time.</p></div>
    </section>
    <section class="editorial-section toolbox" aria-labelledby="tools-title"><div><p class="eyebrow">A few familiar tools</p><h2 id="tools-title">Tools, not an identity.</h2></div><div><p>I’m comfortable changing the stack when the problem calls for it. This site happens to bring a few favorites together.</p><ul class="tool-list"><li>Vue</li><li>TypeScript</li><li>Nuxt</li><li>Python</li><li>Three.js</li></ul></div></section>
    <NuxtLink to="/contact" class="next-page"><span><small>Have something interesting in mind?</small>Tell me about it.</span><span aria-hidden="true">↗</span></NuxtLink>
  </EditorialPage>
</template>
