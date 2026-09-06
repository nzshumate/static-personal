// Markdown bodies and JSON metadata stay local, versioned, and specific to writing routes.
export type Article = { slug: string; title: string; description: string; date: string; tags: string[]; readingMinutes: number; body: string }
type ArticleMetadata = { title: string; description: string; date: string; tags?: string[]; published: boolean }
const bodies = import.meta.glob('../content/writing/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
const metadata = import.meta.glob('../content/writing/*.json', { import: 'default', eager: true }) as Record<string, ArticleMetadata>
export const articles: Article[] = Object.entries(metadata).flatMap(([path, meta]) => {
  if (!meta.published) return []
  const body = bodies[path.replace(/\.json$/, '.md')]
  const slug = path.split('/').pop()!.replace(/\.json$/, '')
  if (!body?.trim() || !meta.title || !meta.description || !/^\d{4}-\d{2}-\d{2}$/.test(meta.date) || !Number.isFinite(Date.parse(meta.date)) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error('Invalid published article: ' + path)
  }
  return [{ slug, title: meta.title, description: meta.description, date: meta.date, tags: Array.isArray(meta.tags) ? meta.tags.filter(tag => typeof tag === 'string') : [], body, readingMinutes: Math.max(1, Math.ceil(body.trim().split(/\s+/).length / 220)) }]
}).sort((a, b) => b.date.localeCompare(a.date))
export const formatArticleDate = (date: string) => new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(date + 'T00:00:00Z'))
