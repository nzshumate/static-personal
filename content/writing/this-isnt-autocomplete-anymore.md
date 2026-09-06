If I were choosing the next investment in an engineering team's AI workflow, I would start by examining the changes already waiting to ship.

Some may be waiting for implementation. Others are waiting for a product decision, an interface agreement, a reviewer, or a check nobody quite trusts. Those are different constraints. More generation capacity is directly useful for only some of them.

This is where my thinking has moved since April 2023. I treated AI coding as bounded assistance with relatively small jobs. I still want clear bounds and accountable acceptance. I underestimated how much repository work a tool could attempt within them.

That change deserves an organizational response, not merely a new subscription and an expectation that everyone will become faster.

An agent can read the code, edit it, and run checks. The result can be useful. It can also join a queue designed around assumptions about implementation cost that are no longer as dependable. The patch arrives sooner; nothing else moves.

### Choose the investment from the wait

Consider three teams.

The first has clear tasks and reliable checks, but routine implementation consumes substantial attention. Delegating a bounded portion of that work is a reasonable experiment. Keep the acceptance standard and observe how much correction remains. If the result saves effort without adding a maintenance burden, expand from evidence.

The second spends most of its time resolving requirements after implementation begins. Its first useful investment may be earlier product and engineering agreement. Fast prototypes can help expose missing decisions, but they can't settle those decisions simply by looking finished. Give somebody the authority to resolve the ambiguity.

The third produces changes promptly and waits for a small number of reviewers. More patches may make its situation worse. Reduce work in progress, improve the evidence attached to a change, and distribute understanding of the difficult areas. Then see whether more implementation capacity is useful.

These aren't categories a team joins forever. Follow real work often enough to notice when the constraint moves. An improvement to one stage can reveal the next wait.

This also gives leaders a more concrete way to discuss value. Did the accepted change reach users sooner? How much correction did it require? What obligations did it add? A tool can be impressive while the workflow around it remains a poor investment.

### Make acceptance less dependent on memory

A clear task needs an intended behavior and the constraints that would be expensive to guess. A useful result needs evidence. Both should remain understandable outside the conversation that produced the patch.

Keep the repository's setup and verification instructions current. Make the preferred patterns discoverable. Record important boundaries where a person or tool working in the code will encounter them. This work is mundane enough to be deferred and important enough to limit everything that follows.

Acceptance should reflect risk. A routine reversible change can take a lighter path than a change to a critical operation. Focus human attention on the choices whose consequences require judgment. Applying identical ceremony everywhere spends that attention indiscriminately.

The evidence needs some independence from the proposal. An implementation and its tests can share the same mistaken assumption. Compare them with the intended behavior. Inspect a sensitive contract directly. Use the test result for what it establishes, not as a general certificate of correctness.

And make rejection cheap. A generated draft isn't an obligation. If it adds machinery the feature doesn't need, compare a smaller approach or discard it. We should become less attached to implementation as the cost of trying an alternative falls.

The personnel decisions follow from this work. Engineers need time to learn how to evaluate delegated changes, and developing engineers need contact with implementation and failure sufficient to build judgment. Increasing throughput while hollowing out that understanding would be a poor long-term trade.

I wouldn't impose a tool-usage target. It would reward a means rather than an outcome and make it harder for people to choose direct implementation when that is appropriate. Ask teams to show useful results and the corrections required to get them.

The same applies to claims about reducing headcount. A demonstration of faster drafting does not tell us how much product work, review, integration, and ongoing ownership the organization requires. Examine the actual workflow before converting a technical capability into a staffing assumption.

I am much more convinced than I was in 2023 that this changes engineering work. I remain unconvinced by plans that mention generation speed and skip the rest of delivery.

For the next investment, I would fund a bounded workflow, measure the complete result, and repair the constraint it exposes. That might mean better task definitions, a faster verification path, or more people able to accept a change safely. It might mean expanding agent use where the supporting conditions already exist.

The decision should have a reason specific enough that we can later discover it was wrong. That would be more useful than another confident prediction about the profession.
