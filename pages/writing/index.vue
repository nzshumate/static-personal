<script setup lang="ts">
import { articles, formatArticleDate } from '~/utils/writing'
prerenderRoutes(articles.map(article => '/writing/' + article.slug))
usePageMeta('Writing', 'Notes on frontend architecture, AI, technical leadership, testing, and the craft of building software.')
const route = useRoute()
const router = useRouter()
const search = ref('')
const selectedTag = ref('')
const page = ref(1)
const pageSize = 5
const results = ref<HTMLElement | null>(null)
const tags = [...new Set(articles.flatMap(article => article.tags))].sort()
const filtered = computed(() => {
  const terms = search.value.trim().toLowerCase().split(/\s+/).filter(Boolean)
  return articles.filter(article => {
    const text = `${article.title} ${article.description} ${article.tags.join(' ')} ${article.body}`.toLowerCase()
    return (!selectedTag.value || article.tags.includes(selectedTag.value)) && terms.every(term => text.includes(term))
  })
})
const pageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)))
const currentPage = computed(() => Math.min(page.value, pageCount.value))
const visible = computed(() => filtered.value.slice((currentPage.value - 1) * pageSize, currentPage.value * pageSize))
const queryString = (value: unknown) => typeof value === 'string' ? value : ''
function syncQuery() {
  search.value = queryString(route.query.q)
  selectedTag.value = queryString(route.query.tag)
  const requestedPage = Number(route.query.page)
  page.value = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1
}
// Static HTML starts with page one; apply URL filters after hydration.
onMounted(syncQuery)
watch(() => route.query, syncQuery)
function query() {
  return {
    ...(search.value.trim() ? { q: search.value } : {}),
    ...(selectedTag.value ? { tag: selectedTag.value } : {}),
    ...(currentPage.value > 1 ? { page: String(currentPage.value) } : {})
  }
}
function filterChanged() {
  page.value = 1
  router.replace({ path: '/writing', query: query() })
}
function chooseTag(tag: string) {
  selectedTag.value = tag
  filterChanged()
}
function clearFilters() {
  search.value = ''
  selectedTag.value = ''
  filterChanged()
}
async function goToPage(value: number) {
  page.value = Math.max(1, Math.min(value, pageCount.value))
  await router.push({ path: '/writing', query: query() })
  await nextTick()
  results.value?.focus({ preventScroll: true })
  results.value?.scrollIntoView({ block: 'start' })
}
</script>
<template>
  <EditorialPage>
    <PageHero label="02 / Writing" title="Thinking out loud. Carefully." description="Notes on building software, leading teams, and changing my mind when the evidence calls for it." note="Notes / Essays / Working ideas" />
    <section class="writing-browser" aria-label="Browse writing">
      <div class="writing-filters">
        <label class="writing-search">Search articles<input v-model="search" type="search" placeholder="Search titles, topics, or a phrase…" @input="filterChanged" /></label>
        <label class="writing-tag-filter">Filter by tag<select v-model="selectedTag" @change="filterChanged"><option value="">All tags</option><option v-for="tag in tags" :key="tag" :value="tag">{{ tag }}</option><option v-if="selectedTag && !tags.includes(selectedTag)" :value="selectedTag">{{ selectedTag }}</option></select></label>
        <button v-if="search || selectedTag" type="button" class="writing-clear" @click="clearFilters">Clear filters</button>
      </div>
      <div ref="results" class="writing-results" tabindex="-1">
        <p class="writing-result-count" role="status">{{ filtered.length }} {{ filtered.length === 1 ? 'article' : 'articles' }}<template v-if="filtered.length"> · Showing {{ (currentPage - 1) * pageSize + 1 }}–{{ Math.min(currentPage * pageSize, filtered.length) }}</template></p>
        <div v-if="visible.length" class="article-list" aria-label="Published writing">
          <article v-for="article in visible" :key="article.slug" class="article-row">
            <time class="eyebrow" :datetime="article.date">{{ formatArticleDate(article.date) }}</time>
            <div><h2><NuxtLink :to="'/writing/' + article.slug">{{ article.title }}</NuxtLink></h2><p>{{ article.description }}</p><small>{{ article.readingMinutes }} min read</small>
              <div class="article-tags" aria-label="Article tags"><button v-for="tag in article.tags" :key="tag" type="button" class="article-tag" :aria-pressed="selectedTag === tag" @click="chooseTag(tag)">{{ tag }}</button></div>
            </div><span aria-hidden="true">↗</span>
          </article>
        </div>
        <div v-else class="writing-no-results"><h2>No articles found.</h2><p>Try another search or clear your filters.</p><button type="button" class="writing-clear" @click="clearFilters">Show all articles</button></div>
      </div>
      <nav v-if="pageCount > 1" class="writing-pagination" aria-label="Article pages">
        <button type="button" :disabled="currentPage === 1" @click="goToPage(currentPage - 1)">Previous</button>
        <button v-for="number in pageCount" :key="number" type="button" :aria-label="'Page ' + number" :aria-current="currentPage === number ? 'page' : undefined" @click="goToPage(number)">{{ number }}</button>
        <button type="button" :disabled="currentPage === pageCount" @click="goToPage(currentPage + 1)">Next</button>
      </nav>
    </section>
    <NuxtLink to="/lab" class="next-page"><span><small>Ideas with code attached</small>Meanwhile, in the lab.</span><span aria-hidden="true">↗</span></NuxtLink>
  </EditorialPage>
</template>
