Implementation effort used to put some friction in front of an unnecessary feature.

Not reliably. We have plenty of software proving that. But if an idea required several days of work, somebody was likely to ask whether it deserved them.

A generated implementation can arrive before that conversation. It works, or appears to. Tests accompany it. Rejecting the idea now feels like throwing something away.

We should get better at throwing it away.

The cost of creating a patch has very little to say about the cost of owning it. A cache still needs validity rules. An abstraction still needs to survive its next consumer. A dependency still has to be maintained. Cheap implementation can accept those obligations on our behalf unless review includes the decision to accept them.

In 2023 I wrote about shortcuts spreading because the next feature copied the available example. That problem has acquired a faster distribution channel. Once a questionable pattern enters the repository, tools can reproduce it with admirable consistency.

Keep the preferred approach discoverable. Inspect new machinery before it becomes precedent. Limit proposed work to what the team can actually review; a queue of unread patches is not delivered value.

And ask for smaller alternatives. Faster drafting makes comparison more affordable. It can help reveal that an existing capability already handles most of the requirement, or that a product decision would remove the need for a new subsystem.

The draft was cheap. We don't owe it a future.
