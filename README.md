# nathan-shumate.com

Personal site rebuilt with Nuxt 4, Vue 3, TypeScript, and Three.js.

## Development

```bash
pnpm install
pnpm dev
```

## Static build

```bash
pnpm generate
```

The generated static site is emitted to `.output/public` and can be deployed to Cloudflare Pages, Netlify, Vercel, or any static host.

## Site structure

- `/`: the cinematic scroll journey. Three.js is loaded only by this route.
- `/work`: engineering approach and selected historical work.
- `/writing`: published writing, with Markdown article routes at `/writing/:slug`.
- `/lab`: real public projects and experiments.
- `/about`: the person behind the site.
- `/contact`: established GitHub and LinkedIn links.

`SiteHeader` owns the shared global navigation. The homepage dock separately owns chapter navigation. Home links disable prefetch so visiting an editorial page does not speculatively download the cinematic renderer.

Internal pages share `EditorialPage`, `PageHero`, and `SiteFooter`. They have no canvas or WebGL dependency. Their entrance animation never blocks routing and is disabled by reduced-motion preferences.

### Writing

See [content/README.md](content/README.md) for the Markdown and JSON metadata convention. No articles are published initially. The static crawler generates routes for published articles linked by `/writing`.

### Validation

After `pnpm generate`, run `pnpm check:site` to validate prerendered routes, metadata, global links, homepage chapter anchors, the copy rule, and the absence of Three.js in internal-page dependency graphs.

The Work archive is grounded in the existing `case-studies/custom-hr-application.html`, `case-studies/mapbox-api.html`, and `case-studies/shipping-algorithm.html`. The Lab links to the public `nzshumate/pii-redaction-service` repository. No employer names, performance metrics, or unpublished articles were invented.
