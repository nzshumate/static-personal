# Adding writing

Create a matched pair in `content/writing/`:

- `your-article-slug.md`: Markdown body (start with prose or an H2; the template supplies the H1).
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

The site includes 29 revised archive essays. `date` is displayed as the publication date and used for article publication metadata. `tags` is an array of strings displayed on both index and article pages. The internal `writtenOn` field is retained as editorial provenance and is not displayed.

The writing index shows five articles per page, with full-text search and tag filtering. Search, tag and page are reflected in URL query parameters. The static build explicitly includes every published article regardless of pagination.

Historical checks and editorial provenance are retained in `docs/writing-archive/manifest.json`.
