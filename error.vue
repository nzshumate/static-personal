<script setup lang="ts">
import type { NuxtError } from '#app'
defineProps<{ error: NuxtError }>()
</script>
<template><div class="editorial-page"><SiteHeader /><main id="main-content" class="editorial-main error-page"><p class="eyebrow">{{ error.statusCode }}</p><h1>{{ error.statusCode === 404 ? 'A little off the map.' : 'Something interrupted the journey.' }}</h1><p>{{ error.statusCode === 404 ? 'There isn’t a page at this address.' : 'Try again, or head back to familiar ground.' }}</p><button class="text-link" @click="clearError({ redirect: '/work' })">Find your way to Work →</button></main><SiteFooter /></div></template>
