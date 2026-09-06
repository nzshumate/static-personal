<script setup lang="ts">
import MarkdownIt from 'markdown-it'
import { articles, formatArticleDate } from '~/utils/writing'
const route = useRoute()
const article = articles.find(item => item.slug === route.params.slug)
if (!article) throw createError({ statusCode: 404, statusMessage: 'Article not found' })
const markdown = new MarkdownIt({ html: false, linkify: true, typographer: false })
const body = markdown.render(article.body)
usePageMeta(article.title, article.description)
useSeoMeta({ ogType: 'article', articlePublishedTime: article.date, articleAuthor: ['Nathan Shumate'] })
</script>
<template>
  <EditorialPage>
    <article class="article-page"><NuxtLink class="text-link article-back" to="/writing">← All writing</NuxtLink><header><p class="eyebrow"><time :datetime="article.date">{{ formatArticleDate(article.date) }}</time><span> · {{ article.readingMinutes }} min read</span></p><h1>{{ article.title }}</h1><p class="page-intro">{{ article.description }}</p><p class="article-byline">By Nathan Shumate</p><div class="article-tags" aria-label="Article tags"><NuxtLink v-for="tag in article.tags" :key="tag" :to="{ path: '/writing', query: { tag } }" class="article-tag">{{ tag }}</NuxtLink></div></header><div class="article-prose" v-html="body" /><NuxtLink to="/writing" class="text-link">Back to the notebook →</NuxtLink></article>
  </EditorialPage>
</template>
