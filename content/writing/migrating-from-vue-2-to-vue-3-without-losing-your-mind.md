A Vue 3 migration needs a stopping condition before it needs a branch.

“Everything is better” is not a stopping condition. “The existing workflows run on the new version, with the required dependencies and supported browsers” is something we can investigate.

It's January 2021. Vue 3 is released; an arbitrary Vue 2 application's dependencies may not be ready to move with it. I'd use the following sequence to find out whether a migration is sensible. The early stages should produce useful information even if the final answer is to wait.

### 1. Find the thing you can't replace

Start with the date picker, the table, the editor, or whichever third-party component sits in a critical workflow. Check its actual Vue 3-compatible release and the particular features the application uses.

A release announcement is a lead. Install the dependency in a small experiment and exercise the integration. Pay attention to wrappers that reach into undocumented behavior. They can have more migration work hidden in them than the screen they serve.

Record a concrete result for each essential dependency: works with the needed behavior, can be replaced at an understood cost, or blocks the upgrade. Leave unknowns visible. A spreadsheet full of green cells obtained by reading package descriptions will not improve the schedule.

If a dependency blocks the migration, consider replacing or isolating it while the application remains on Vue 2. That can be useful work independently of the upgrade. If replacement is disproportionate, waiting is a reasonable engineering decision.

**Move on when the critical dependencies have evidence behind them.**

### 2. Write down the behavior you're preserving

Choose the journeys that matter: direct entry to a route, a successful edit, a rejected edit, navigation with pending work, and whatever the product considers essential. Include browser requirements.

The list doesn't have to be an exhaustive test plan. It has to prevent “the homepage renders” from becoming the definition of success.

Check the existing behavior before changing the runtime. This distinguishes a regression from a bug that was already present. It also exposes assumptions people disagree about. A migration is an expensive place to discover that nobody knows what Cancel should do.

Where a behavior can be checked automatically, make the check useful at the boundary that matters. Keep manual verification explicit where automation is absent. A blank space in the evidence is preferable to an invented sense of coverage.

**Move on when someone other than the migration author can describe what must still work.**

### 3. Move a representative slice

Use a real route, a form, and a dependency from the inventory. A static component is too accommodating. The slice should expose both the framework changes and the application assumptions around them.

Inspect initialization, custom component `v-model`, event forwarding, and attribute fallthrough. Filters are removed in Vue 3, so find their uses and replace them appropriately. Consult the migration guide for the APIs the application actually uses rather than mechanically changing every familiar-looking pattern.

Keep the Options API where it works. Converting everything to Composition API at the same time creates another explanation for each failure. The same argument applies to redesigning the page and replacing the state model. Good ideas can wait their turn.

Verify the interaction. A wrapper may render perfectly and fail to report an edit, forward an event twice, or mishandle focus. Screenshots won't tell you all of that.

Build for production too. Serve the output under its intended path and enter a nested route directly. Development behavior is only part of the evidence.

**Move on when the slice works and the remaining work is describable. If it reveals a blocker, return to the inventory.**

### 4. Decide how ordinary development continues

The existing application still needs fixes. Decide how those changes reach the migration work, who resolves conflicts, and how often the migrated version is checked against current behavior.

An incremental plan needs a real boundary. A separately mounted area might be suitable; casually mixing framework runtimes in the same component tree is a different proposition. Explain what can be moved independently and how the pieces communicate.

For some applications, preparation on Vue 2 followed by a bounded migration branch may be clearer. For others, the cost of maintaining parallel work may justify a different schedule. There is no virtue in calling the plan incremental if every step depends on the whole application moving together.

Keep unrelated cleanup out of the effort. Otherwise its scope expands every time someone opens a file and remembers a grievance.

### 5. Rehearse the release and the return path

Identify the last deployable version and how to restore it. If service changes accompany the migration, check that the previous frontend remains compatible. A rollback button cannot negotiate with an API.

Run the important journeys against the release candidate. Resolve or explicitly account for the failures. Make sure another engineer can install, build, and deploy it through the supported process.

At that point, the version change means something concrete. The application still performs its job, the team can maintain it, and a failed rollout has an understood response.

That is enough for this migration. Refactoring every component into your preferred new syntax is a separate proposal, with its own estimate.
