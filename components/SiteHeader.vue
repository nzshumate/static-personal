<script setup lang="ts">
const route = useRoute()
const menu = ref<HTMLDialogElement | null>(null)
const menuOpen = ref(false)
const links = [{ label: 'Work', to: '/work' }, { label: 'Writing', to: '/writing' }, { label: 'Lab', to: '/lab' }, { label: 'About', to: '/about' }, { label: 'Contact', to: '/contact' }]
const active = (to: string) => route.path === to || route.path.startsWith(to + '/')
watch(() => route.fullPath, () => menu.value?.close())
const showMenu = () => { menu.value?.showModal(); menuOpen.value = true }
</script>

<template>
  <header class="site-header" :class="{ 'site-header-cinematic': route.path === '/' }">
    <NuxtLink to="/" class="site-identity" aria-label="Nathan Shumate, home" :prefetch="false"><span class="site-monogram" aria-hidden="true">NS</span><span>Nathan Shumate<small>Engineer · Technical leader</small></span></NuxtLink>
    <nav class="site-desktop-nav" aria-label="Global navigation">
      <NuxtLink v-for="link in links" :key="link.to" :to="link.to" :aria-current="active(link.to) ? 'page' : undefined" :class="{ 'is-active': active(link.to) }">{{ link.label }}<span v-if="link.to === '/contact'" aria-hidden="true">↗</span></NuxtLink>
    </nav>
    <button class="site-menu-trigger" aria-haspopup="dialog" :aria-expanded="menuOpen" aria-controls="site-menu" @click="showMenu">Menu <span aria-hidden="true">☰</span></button>
    <dialog id="site-menu" ref="menu" class="site-mobile-menu" aria-labelledby="menu-title" @close="menuOpen = false" @click="($event.target === menu) && menu?.close()">
      <div class="mobile-menu-top"><p id="menu-title" class="eyebrow">Look around</p><button aria-label="Close menu" @click="menu?.close()">×</button></div>
      <nav aria-label="Mobile global navigation">
        <NuxtLink to="/" :prefetch="false" @click="menu?.close()"><span class="menu-index">00</span>Home<span aria-hidden="true">↗</span></NuxtLink>
        <NuxtLink v-for="(link, index) in links" :key="link.to" :to="link.to" :aria-current="active(link.to) ? 'page' : undefined" @click="menu?.close()"><span class="menu-index">0{{ index + 1 }}</span>{{ link.label }}<span aria-hidden="true">↗</span></NuxtLink>
      </nav>
      <p class="mobile-menu-note">Building things. Asking better questions.</p>
    </dialog>
  </header>
</template>
