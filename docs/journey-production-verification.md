# Journey ambience and production verification

## Ambience

The Deep has small rising bubble columns with rim highlights and gentle lateral drift. The other landscapes have faint cirrus wisps, windblown snow, forest pollen, windborne sand, low swamp mist, and shoreline spray. Each ambient layer is a single GPU-animated point draw, and only the visible chapter updates. Mobile uses 60% of the ambient particle count. Particles fade at their loop boundaries.

## Measured geometry batching

`pnpm check:world` verifies unchanged triangle counts and world-space bounds, retained material identity, finite positions, and static mesh draw reduction:

| Model | Before | After |
| --- | ---: | ---: |
| Cabin | 270 | 36 |
| Palm | 38 | 4 |
| Mushroom | 40 | 5 |

These are per-model mesh draw counts, not a claimed whole-scene FPS improvement. The geometry detail, bloom, lighting, and resolution caps remain in place.

## Render lifecycle

- Hidden chapters do not animate; orbit no longer updates behind other chapters.
- Paused scenes stop requesting frames after camera/transition settling. Navigation, resize, and controls wake rendering.
- Hidden browser documents stop the render loop.
- Chapter lighting and CSS colors update only when progress changes.
- Shared geometry, materials, textures (including shader-uniform textures), and postprocessing resources are disposed on unmount.
- WebGL context loss disposes the renderer and exposes the existing readable HTML fallback. The user can reload to recreate WebGL.

## Verification

- Production build completed and all six route checks passed, including metadata, navigation, anchors, and WebGL isolation from editorial routes.
- Vue/TypeScript check and batching regression check passed.
- Browser review of the production build: bubbles, cabin, sky, shoreline, remaining chapter navigation, and a 390 × 844 mobile view.
- Pause/resume and navigating to another chapter while paused worked.
- Mobile navigation to Work removed the 3D canvas; returning home recreated it.
- Browser console was clean during the reviewed production flows.
- Reduced-motion behavior is retained in source; live OS preference emulation and forced GPU context loss were not available in the browser review. No synthetic FPS benchmark or cross-device performance claim is made.

The static deployment artifact is `.output/public`. This pass builds and verifies it locally; it does not publish a deployment.


## Final visual corrections

- Muted sand and blue-gray planets; axial spin and equatorial rings share the same tilt. Softer atmospheric band contrast.
- Shorter cabin chimney with rising, wind-carried smoke; terrain-positioned snow wisps.
- Snake body follows the terrain at every vertex, covered by a regression check at three animation poses.
- Scorpion patrol, defensive claw lift, and tail strike. Snout scutes conform to the alligator surface.
- Atlas close control uses a centered SVG instead of a font glyph.
- Typecheck, world geometry checks, static route checks, and production build pass. Mountain atmosphere, desert terrain contact, orbit, and atlas visually reviewed in the local browser.
