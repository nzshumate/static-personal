<script setup lang="ts">
defineProps<{ label: string; title: string; description?: string; note?: string }>()
</script>
<template>
  <section class="page-hero">
    <div class="page-hero-label"><p class="eyebrow"><span aria-hidden="true" />{{ label }}</p><span v-if="note" class="hero-note">{{ note }}</span></div>
    <h1>{{ title }}</h1><p v-if="description" class="page-intro">{{ description }}</p><slot />
  </section>
</template>
