# Adding writing

Create a matched pair in `content/writing/`:

- `your-article-slug.md`: Markdown body (start with an H2; the template supplies the H1).
- `your-article-slug.json`: metadata, using the example below.

```json
{
  "title": "Your actual article title",
  "description": "A concise description of the article.",
  "date": "2026-09-05",
  "published": false
}
```

Set `published` to `true` only when ready to publish. Draft metadata is excluded from the index and routes. Published articles require a nonempty body, title, description, and an ISO date. Use lowercase hyphenated slugs. Reading time is calculated from the Markdown word count at 220 words per minute, rounded up.

Headings, fenced code blocks, links, images, lists, and blockquotes are supported. Raw HTML is disabled. Put local images in `public/images/writing/` and reference them with `/images/writing/name.jpg`; supply meaningful alt text.

`/writing` lists published files automatically. Nuxt's static crawler follows those links to prerender `/writing/your-article-slug`. No database, CMS, or server is required. Run `pnpm generate` and check the output before deployment.

No sample articles are published with this implementation.
