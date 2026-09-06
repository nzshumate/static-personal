import assert from 'node:assert/strict'
import { readFile, stat } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const root = resolve('.output/public')
const manifest = (await import(pathToFileURL(resolve('node_modules/.cache/nuxt/.nuxt/dist/server/client.manifest.mjs')))).default
const routes = ['/', '/work', '/writing', '/lab', '/about', '/contact']
const dependencies = (key, found = new Set()) => {
  if (found.has(key)) return found
  found.add(key)
  for (const child of manifest[key]?.imports || []) dependencies(child, found)
  return found
}
const results = []
for (const route of routes) {
  const html = await readFile(resolve(root, '.' + route, 'index.html'), 'utf8')
  const nav = html.match(/<nav[^>]*aria-label="Global navigation"[^>]*>(.*?)<\/nav>/s)?.[1]
  assert(nav, `${route}: global navigation missing`)
  for (const target of routes.slice(1)) assert(nav.includes(`href="${target}"`), `${route}: missing ${target}`)
  assert(!/href="#/.test(nav), `${route}: global navigation contains chapter anchors`)
  assert.equal((html.match(/<h1(?:\s|>)/g) || []).length, 1, `${route}: needs exactly one H1`)
  assert(/name="description" content="[^"]+"/.test(html), `${route}: description missing`)
  assert(/property="og:title" content="[^"]+"/.test(html), `${route}: OG metadata missing`)
  const visible = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, '')
  assert(!visible.includes('—'), `${route}: em dash in user-facing copy`)
  if (route === '/') {
    assert(html.includes('View my work'), 'Homepage escape link missing')
    for (const chapter of ['top','sky','mountains','forest','desert','swamp','beach','contact']) assert(html.includes(`href="#${chapter}"`), `Missing chapter ${chapter}`)
  } else {
    const key = route === '/writing' ? 'pages/writing/index.vue' : `pages${route}.vue`
    const graph = [...dependencies(key)]
    assert(!graph.some(k => /three|pages\/index.vue/.test(manifest[k]?.name || k)), `${route}: cinematic code in static dependency graph`)
    assert(!html.includes('id="world-canvas"'), `${route}: WebGL canvas found`)
    assert(nav.includes('aria-current="page"'), `${route}: active state missing`)
    const bytes = (await Promise.all(graph.filter(k => manifest[k]?.resourceType === 'script').map(k => stat(resolve(root, '_nuxt', manifest[k].file)).then(s => s.size)))).reduce((a,b)=>a+b,0)
    results.push({ route, initialJsKB: Math.round(bytes / 1024), webgl: false })
  }
}
console.log('PASS: 6 prerendered routes, shared navigation, metadata, chapter anchors, copy, and WebGL isolation.')
console.table(results)
