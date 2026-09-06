Vite 2 is giving me a dangerous amount of hope about frontend tooling.

It came out in February. Development uses native ES modules, with esbuild doing dependency pre-bundling; the production build uses Rollup. The development loop and the release build don't have to perform the same job in the same way.

For an ordinary frontend, that is a promising alternative to maintaining a private collection of Webpack decisions.

I'd try the awkward parts first: asset imports, environment variables, and anything relying on a special loader. Then serve the production output where the application will actually live. A quick development server is insufficient compensation for a broken release.

But if those checks work, I'm happy to keep the configuration small. I don't feel a need to recreate the old one out of respect.

In 2019 I argued that build maintenance should count as work. It still counts. Getting rid of some of it also counts.

There will be unusual applications where Webpack remains the sensible choice. I expect a loader to find me again eventually.

Until then, I would like to lose this particular expertise through lack of practice.
