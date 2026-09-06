<script setup lang="ts">
defineProps<{ cinematic?: boolean }>()
const year = new Date().getFullYear()
</script>
<template>
  <footer class="site-footer" :class="{ 'site-footer-cinematic': cinematic }">
    <div><NuxtLink to="/" :prefetch="false">Nathan Shumate</NuxtLink><p>Still curious. Still building.</p></div>
    <div class="footer-right"><a href="https://github.com/nzshumate" target="_blank" rel="noreferrer">GitHub ↗</a><NuxtLink to="/contact">Let’s connect ↗</NuxtLink><span>© {{ year }}</span></div>
  </footer>
</template>
