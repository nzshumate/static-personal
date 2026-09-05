<script setup lang="ts">
usePageMeta('Contact', 'Tell me the hard problem. Connect with Nathan Shumate on GitHub or LinkedIn.')
</script>
<template>
  <EditorialPage>
    <PageHero label="05 / Contact" title="Tell me the hard problem." description="Those are usually the fun ones." note="Start a conversation" />
    <section class="contact-layout" aria-label="Contact links"><p>Something you’re building. A system that needs a fresh perspective. An idea you can’t quite leave alone.<br><br>I’m interested.</p><div class="contact-links"><a href="https://github.com/nzshumate" target="_blank" rel="noreferrer"><span><small>Code & experiments</small>GitHub</span><span aria-hidden="true">↗</span></a><a href="https://www.linkedin.com/in/nathan-shumate-996472116" target="_blank" rel="noreferrer"><span><small>Connect professionally</small>LinkedIn</span><span aria-hidden="true">↗</span></a></div></section>
    <div class="contact-endnote"><span aria-hidden="true">↳</span><p>Or take the scenic route.<br><NuxtLink to="/" :prefetch="false">Back to the journey →</NuxtLink></p></div>
  </EditorialPage>
</template>
