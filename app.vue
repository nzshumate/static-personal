<script setup lang="ts">
const route = useRoute()
</script>
<template>
  <div>
    <a class="site-skip" :href="route.path === '/' ? '#top' : '#main-content'">Skip to content</a>
    <SiteHeader />
    <NuxtPage />
  </div>
</template>
