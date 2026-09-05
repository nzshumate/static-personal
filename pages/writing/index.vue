<script setup lang="ts">
import { articles, formatArticleDate } from '~/utils/writing'
usePageMeta('Writing', 'Notes on frontend architecture, AI, technical leadership, testing, and the craft of building software.')
</script>
<template>
  <EditorialPage>
    <PageHero label="02 / Writing" title="Thinking out loud. Carefully." description="Notes on building software, leading teams, and changing my mind when the evidence calls for it." note="Notes / Essays / Working ideas" />
    <section v-if="articles.length" class="article-list" aria-label="Published writing"><NuxtLink v-for="article in articles" :key="article.slug" :to="'/writing/' + article.slug" class="article-row"><span class="eyebrow">{{ formatArticleDate(article.date) }}</span><div><h2>{{ article.title }}</h2><p>{{ article.description }}</p><small>{{ article.readingMinutes }} min read</small></div><span aria-hidden="true">↗</span></NuxtLink></section>
    <section v-else class="writing-empty" aria-labelledby="writing-empty-title"><div class="empty-margin" aria-hidden="true">01<br><span>02</span><br><span>03</span></div><div><p class="eyebrow">The notebook is open</p><h2 id="writing-empty-title">Nothing published yet.<br>Plenty on my mind.</h2><p>Some ideas are worth slowing down and writing properly. This is where they’ll live.</p><span class="writing-cursor" aria-hidden="true" /></div></section>
    <section class="editorial-section writing-topics" aria-labelledby="topics-title"><div><p class="eyebrow">Recurring questions</p><h2 id="topics-title">The things I keep<br>coming back to.</h2></div><ul><li><span>01</span>Architecture that stays flexible</li><li><span>02</span>What AI changes about the work</li><li><span>03</span>Leading without becoming a bottleneck</li><li><span>04</span>Tests, tools, and useful feedback</li></ul></section>
    <NuxtLink to="/lab" class="next-page"><span><small>Ideas with code attached</small>Meanwhile, in the lab.</span><span aria-hidden="true">↗</span></NuxtLink>
  </EditorialPage>
</template>
