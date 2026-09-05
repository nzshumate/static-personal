# Site expansion verification

Validated locally on 2026-09-05 against the Nuxt dev server and a separately served static production build.

## Content and architecture

- Cinematic homepage retained. Its global header now links to real pages; the chapter dock remains independent.
- Work, Writing, Lab, About, and Contact are prerendered editorial routes.
- Work case studies are adapted from the repository's existing 2016 case studies, without new employer claims or metrics.
- The PII project URL and description were checked against its public GitHub repository.
- LinkedIn is the existing profile link from the original site.
- Writing ships with no published articles. A temporary Markdown article was built and visually checked, then removed before the final build.
- The fixture verified headings, inline code, fenced code, links, lists, blockquotes, reading time, metadata, and disabled raw HTML.

## Browser checks

- Global navigation from the homepage to all five routes, with return through the identity link.
- Navigation among all internal pages, correct active states, and browser back/forward behavior.
- Direct production loads of all five internal routes and the homepage.
- Mobile menu exposes Home and all five routes; selection closes it. Tab moves focus within the modal, Escape closes it, and focus returns to the trigger.
- All eight homepage chapter anchors, active indicators, the chapter picker, normal scrolling, and the Work escape link.
- Desktop at 1280px, laptop at 1024px, tablet at 768px, mobile at 390px. No horizontal document overflow on the internal routes at tested sizes.
- Production console checks returned no errors or warnings during navigation.
- Request logs for a direct Work load contained the common Nuxt entry and small editorial chunks, with no Three.js chunks. The build-manifest dependency check independently verifies this for every internal route.
- Article code blocks remain locally scrollable at mobile widths.
- Reduced-motion CSS and the homepage's preference-to-pause behavior were inspected in source. Live OS media-preference emulation is not exposed by the available browser control, so that particular browser scenario was not simulated. The existing pause/resume control was verified in the preceding cinematic pass.

## Automated checks

- `pnpm typecheck`: full Vue and TypeScript check.
- `pnpm build`: prerenders the six public routes and error documents.
- `pnpm check:site`: checks navigation destinations, one H1, metadata, homepage anchors, no em dashes in rendered copy, and no cinematic dependencies on internal routes.
- `git diff --check`: whitespace check.

The Three.js code is split into core, renderer, effects, and homepage chunks. The previous large-chunk warning is resolved. Nitro still reports unused imports in its own generated H3 adapter; this is an upstream build warning and does not affect the static output.
