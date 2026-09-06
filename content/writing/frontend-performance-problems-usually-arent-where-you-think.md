The report is slow. Somebody proposes replacing the table.

Before agreeing, I'd like to know what the table is doing during the wait. It may be rendering too much. It may also be sitting patiently while the rest of the application decides to send the request.

Let's work through a hypothetical report screen. The purpose of the exercise is to locate the delay, not to produce an impressive benchmark number.

### Establish the symptom

“Slow” needs a little more detail. Is the first visit slow? Does selecting a filter stall the interface? Does the report appear quickly but ignore input for a while afterward?

Choose one user action and a useful endpoint. For opening the report, that might be the point where the expected data is visible and the screen can be used. For filtering, it might be the updated result appearing after the selection.

Record the conditions. Use a device and connection relevant to the people affected. A fast development laptop can make unnecessary work seem harmless. Check whether the cache is warm. First visits and repeat visits are different experiences, and the product may care about both.

Field information can tell us whether the problem is common and whom it affects. A controlled recording can help explain a particular occurrence. Keep those roles distinct.

### Put the waits in order

Suppose the application requests the account, then discovers the report identifier, then requests the report, transforms the response, and finally renders it.

Look at when each step begins. Was the identifier actually unavailable until the account request finished? Did the implementation serialize work that could have started independently? Has a component's mounting order accidentally become the network schedule?

A redundant dependency in that sequence may dominate the experience. Faster row rendering would still leave most of the wait intact.

Inspect the response itself. A slow service, a large payload, and browser work after delivery call for different changes. It matters whether the time is spent waiting for bytes or processing bytes that have already arrived.

This is also where frontend performance can require a service conversation. If the screen needs a small summary and the API sends the full record collection, a better contract may save more work than a clever client-side transformation. The browser profiler can't make that agreement for the teams.

### Find the work after the response

If the data arrives promptly, follow what happens next. Is it sorted several times? Does each consumer build its own derived version? Is the screen rendering records the person cannot currently see?

Reducing the amount of work is a good first option. Fetch the needed fields. Compute a derived result in an appropriate shared place. Consider whether pagination fits the task before implementing a large interactive list.

Virtualization can help a genuinely large list. It also brings behavior to verify, including focus and navigation. A smaller DOM is useful, but the person still has to operate the control.

Caching deserves the same discipline. State the acceptable age of the result and what makes it invalid. A fast stale report may be acceptable in one workflow and misleading in another. “The cache fixed it” needs the rest of that sentence.

### Investigate the interaction separately

A good initial load does not establish good responsiveness. Since March, INP has replaced FID as a Core Web Vital, giving teams another reason to examine what happens across interactions.

Record the slow interaction. Look for main-thread work occupying the interval. The event handler may be responsible, or it may be waiting behind work begun elsewhere. A button can display the symptom without causing it.

If a synchronous operation is expensive, decide whether it can be reduced, divided, or moved appropriately. If the application rerenders far more than changed, inspect the data dependencies. Adding memoization everywhere before understanding the cause gives the codebase another system to maintain.

A prompt visual acknowledgment can help people understand that work has begun. It doesn't establish that the task finishes soon enough. Check both when both matter.

### Change something you can explain

Once the cause is identified, make a focused change and repeat the scenario under comparable conditions. Keep the useful result tied to the actual intervention. If several unrelated optimizations land together, the team learns less about what was necessary.

Choose a proportionate regression check. A payload budget may protect one improvement; monitoring a representative interaction may protect another. There is no requirement to create a permanent performance laboratory for a small fix. There is a requirement to leave enough context that the next feature doesn't casually restore the cost.

If the table really is the problem, the evidence should now explain why and help compare alternatives. If it wasn't, we've avoided changing a working component while leaving the delay intact.

The resulting change might be surprisingly small. Removing one dependency between requests can look unimpressive in a diff. That is a perfectly acceptable outcome for performance work.
