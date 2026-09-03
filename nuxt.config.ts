export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  ssr: true,
  modules: ['@nuxtjs/google-fonts'],
  css: ['~/assets/css/main.css', '~/assets/css/journey.css'],
  googleFonts: {
    families: { Inter: [400, 500, 600, 700, 800], 'Space+Grotesk': [500, 600, 700] },
    display: 'swap', prefetch: true, preconnect: true
  },
  app: { head: { htmlAttrs: { lang: 'en' }, title: 'Nathan Shumate, software engineer', meta: [
    { name: 'description', content: 'Software engineering, technical leadership, architecture, and the ways AI is changing how we build.' },
    { name: 'theme-color', content: '#02040a' },
    { property: 'og:title', content: 'Nathan Shumate, software engineer' },
    { property: 'og:description', content: 'The way we build software is changing. Good.' },
    { property: 'og:type', content: 'website' }
  ] } },
  nitro: { preset: 'static' }
})